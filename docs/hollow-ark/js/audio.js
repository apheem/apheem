'use strict';
// Chiptune-style sound effects and music, synthesized live with Web Audio. No audio files to load.
(function (HA) {
  let ctx = null;
  let master;
  let musicBus;
  let sfxBus;
  let noiseBuffer;
  const pulse = {};
  const lastPlayed = {};
  let paused = false;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // Pulse waves at the classic duty cycles.
    for (const duty of [0.125, 0.25, 0.5]) {
      const n = 48;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
      pulse[duty] = ctx.createPeriodicWave(real, imag);
    }
    applyVolumes();
    return ctx;
  }

  function applyVolumes() {
    if (!ctx) return;
    const m = HA.settings.music / 10;
    const s = HA.settings.sfx / 10;
    musicBus.gain.value = m * m * (paused ? 0.35 : 1) * 0.55;
    sfxBus.gain.value = s * s * 0.8;
  }

  // Browsers only allow sound after the player presses something; every input calls this.
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  const live = () => ctx && ctx.state === 'running';

  function tone(o) {
    if (!live()) return;
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    if (typeof o.wave === 'number') osc.setPeriodicWave(pulse[o.wave]);
    else osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g);
    g.connect(o.bus || sfxBus);
    osc.start(t);
    osc.stop(t + o.dur + 0.03);
  }

  function noise(o) {
    if (!live()) return;
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter || 'bandpass';
    filter.frequency.setValueAtTime(o.f, t);
    if (o.f2) filter.frequency.exponentialRampToValueAtTime(Math.max(30, o.f2), t + o.dur);
    filter.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.03);
  }

  const SFX = {
    jump: () => tone({ wave: 0.25, f: 190, f2: 420, dur: 0.09, vol: 0.12 }),
    land: () => noise({ f: 260, f2: 120, dur: 0.06, vol: 0.18, filter: 'lowpass' }),
    pistol: (lv) => {
      tone({ wave: 0.25, f: 1100 + lv * 120, f2: 420, dur: 0.06, vol: 0.1 });
      if (lv === 3) tone({ wave: 0.125, f: 1500, f2: 700, dur: 0.05, vol: 0.06, delay: 0.01 });
    },
    cannon: (lv) => {
      noise({ f: 900 + lv * 300, f2: 300, dur: 0.05, vol: 0.16, q: 0.8 });
      tone({ wave: 0.5, f: 150 + lv * 25, f2: 70, dur: 0.05, vol: 0.08 });
    },
    empty: () => tone({ wave: 0.125, f: 2200, dur: 0.02, vol: 0.05 }),
    coilSpark: () => noise({ f: 3000, f2: 1200, dur: 0.07, vol: 0.12, q: 4 }),
    coilBeam: (lv) => {
      noise({ f: 4000, f2: 400, dur: 0.22 + lv * 0.06, vol: 0.22, q: 2 });
      tone({ wave: 0.125, f: 1600, f2: 120, dur: 0.18 + lv * 0.05, vol: 0.12 });
    },
    coilReady: () => tone({ wave: 0.25, f: 1760, dur: 0.06, vol: 0.06 }),
    hit: () => tone({ wave: 0.5, f: 320, f2: 140, dur: 0.05, vol: 0.09 }),
    wall: () => noise({ f: 1800, dur: 0.03, vol: 0.06, q: 3 }),
    kill: () => {
      noise({ f: 1400, f2: 90, dur: 0.24, vol: 0.22, filter: 'lowpass' });
      tone({ wave: 0.5, f: 240, f2: 50, dur: 0.18, vol: 0.1 });
    },
    crate: () => noise({ f: 600, f2: 120, dur: 0.16, vol: 0.2, filter: 'lowpass' }),
    shard: (combo) => tone({ wave: 'triangle', f: 990 * Math.pow(2, Math.min(combo, 12) / 12), dur: 0.05, vol: 0.12 }),
    heart: () => [0, 0.06].forEach((d, i) => tone({ wave: 0.25, f: [880, 1320][i], dur: 0.08, vol: 0.09, delay: d })),
    levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone({ wave: 0.25, f, dur: 0.09, vol: 0.1, delay: i * 0.055 })),
    levelDown: () => [784, 622, 466].forEach((f, i) => tone({ wave: 0.5, f, dur: 0.1, vol: 0.09, delay: i * 0.07 })),
    hurt: () => {
      tone({ wave: 0.5, f: 220, f2: 70, dur: 0.18, vol: 0.14 });
      noise({ f: 700, f2: 150, dur: 0.14, vol: 0.12 });
    },
    die: () => {
      noise({ f: 1200, f2: 60, dur: 0.7, vol: 0.25, filter: 'lowpass' });
      [440, 349, 262, 196].forEach((f, i) => tone({ wave: 0.5, f, dur: 0.16, vol: 0.09, delay: i * 0.12 }));
    },
    orb: () => tone({ wave: 'sine', f: 520, f2: 260, dur: 0.16, vol: 0.1 }),
    telegraph: () => tone({ wave: 0.125, f: 300, f2: 900, dur: 0.3, vol: 0.05 }),
    pickup: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone({ wave: 0.25, f, dur: 0.12, vol: 0.1, delay: i * 0.07 })),
    rest: () => [262, 330, 392, 523].forEach((f, i) => tone({ wave: 'triangle', f, dur: 0.3, vol: 0.14, delay: i * 0.09 })),
    switch: () => tone({ wave: 0.25, f: 660, f2: 880, dur: 0.05, vol: 0.08 }),
    menuMove: () => tone({ wave: 0.25, f: 740, dur: 0.035, vol: 0.07 }),
    menuOk: () => [880, 1320].forEach((f, i) => tone({ wave: 0.25, f, dur: 0.05, vol: 0.08, delay: i * 0.045 })),
    menuBack: () => tone({ wave: 0.25, f: 520, f2: 330, dur: 0.06, vol: 0.08 }),
    // Story and the world
    blip: (who) => tone({ wave: 0.5, f: VOICE[who] || 440, dur: 0.025, vol: 0.035 }),
    lead: () => [523, 784].forEach((f, i) => tone({ wave: 'triangle', f, dur: 0.18, vol: 0.12, delay: i * 0.1 })),
    terminal: () => [1200, 1600, 1200].forEach((f, i) => tone({ wave: 0.125, f, dur: 0.04, vol: 0.05, delay: i * 0.05 })),
    hiss: () => noise({ f: 5000, f2: 2000, dur: 0.4, vol: 0.12, q: 0.6, filter: 'highpass' }),
    podOpen: () => {
      noise({ f: 3000, f2: 400, dur: 0.6, vol: 0.18, q: 0.7 });
      tone({ wave: 0.5, f: 110, f2: 55, dur: 0.3, vol: 0.12 });
    },
    gasp: () => tone({ wave: 0.25, f: 900, f2: 1500, dur: 0.08, vol: 0.06 }),
    clamp: () => {
      noise({ f: 2200, dur: 0.07, vol: 0.13, q: 6 });
      tone({ wave: 0.125, f: 420, f2: 170, dur: 0.14, vol: 0.06 });
    },
    crash: () => {
      noise({ f: 240, f2: 50, dur: 0.4, vol: 0.36, filter: 'lowpass' });
      tone({ wave: 0.5, f: 95, f2: 40, dur: 0.25, vol: 0.14 });
      noise({ f: 6500, dur: 0.22, vol: 0.07, q: 2, delay: 0.03 });
    },
    vent: () => noise({ f: 900, f2: 300, dur: 0.18, vol: 0.12 }),
    harpoon: () => {
      noise({ f: 1800, f2: 600, dur: 0.1, vol: 0.12, q: 1.5 });
      tone({ wave: 0.5, f: 220, f2: 520, dur: 0.08, vol: 0.06 });
    },
    intercom: () => {
      noise({ f: 2600, f2: 1400, dur: 0.14, vol: 0.07, q: 2 });
      tone({ wave: 0.125, f: 1180, dur: 0.05, vol: 0.04, delay: 0.12 });
    },
    rumble: () => noise({ f: 160, f2: 60, dur: 0.9, vol: 0.4, filter: 'lowpass' }),
    blast: () => {
      noise({ f: 1800, f2: 60, dur: 0.8, vol: 0.4, filter: 'lowpass' });
      tone({ wave: 0.5, f: 90, f2: 30, dur: 0.5, vol: 0.2 });
    },
    doorShut: () => {
      noise({ f: 400, f2: 80, dur: 0.25, vol: 0.3, filter: 'lowpass' });
      tone({ wave: 0.5, f: 70, dur: 0.12, vol: 0.14 });
    },
    alarm: () => [0, 0.25].forEach((d) => tone({ wave: 0.5, f: 620, f2: 480, dur: 0.22, vol: 0.05, delay: d })),
    grab: () => {
      tone({ wave: 0.5, f: 200, f2: 90, dur: 0.12, vol: 0.12 });
      noise({ f: 1200, dur: 0.06, vol: 0.12, q: 2 });
    },
    stomp: () => noise({ f: 140, f2: 50, dur: 0.12, vol: 0.22, filter: 'lowpass' }),
    swipe: () => noise({ f: 2400, f2: 500, dur: 0.14, vol: 0.18, q: 1.5 }),
    slam: () => {
      noise({ f: 300, f2: 40, dur: 0.5, vol: 0.4, filter: 'lowpass' });
      tone({ wave: 0.5, f: 80, f2: 35, dur: 0.3, vol: 0.18 });
    },
    bossHit: () => tone({ wave: 0.5, f: 180, f2: 110, dur: 0.04, vol: 0.07 }),
    roar: () => {
      tone({ wave: 0.5, f: 140, f2: 70, dur: 0.6, vol: 0.14 });
      tone({ wave: 0.25, f: 147, f2: 72, dur: 0.6, vol: 0.1 });
      noise({ f: 700, f2: 200, dur: 0.6, vol: 0.12 });
    },
    summon: () => [300, 450, 675].forEach((f, i) => tone({ wave: 0.125, f, dur: 0.12, vol: 0.07, delay: i * 0.06 })),
    boom: () => {
      noise({ f: 900, f2: 50, dur: 0.45, vol: 0.32, filter: 'lowpass' });
      tone({ wave: 0.5, f: 120, f2: 40, dur: 0.3, vol: 0.12 });
    },
    unlock: () => [660, 880, 1320].forEach((f, i) => tone({ wave: 'triangle', f, dur: 0.14, vol: 0.1, delay: i * 0.09 })),
    cage: () => {
      noise({ f: 2500, f2: 800, dur: 0.2, vol: 0.14, q: 3 });
      tone({ wave: 0.25, f: 300, f2: 200, dur: 0.15, vol: 0.08 });
    },
    salvage: () => {
      noise({ f: 3000, f2: 100, dur: 0.7, vol: 0.3, q: 1 });
      [392, 330, 262, 196].forEach((f, i) => tone({ wave: 0.5, f, dur: 0.18, vol: 0.08, delay: 0.2 + i * 0.1 }));
    },
    choice: () => tone({ wave: 'triangle', f: 220, dur: 0.5, vol: 0.14 }),
  };
  // Each speaker's text blips at its own pitch.
  const VOICE = { 'OLD GASKET': 260, WICK: 420, SOLDER: 340, SHIM: 620, TAMP: 300, BRINE: 380, 'THE BAILIFF': 120, INTERCOM: 190, 'POD 0418': 900, '': 520 };

  function play(name, arg) {
    if (!live() || !SFX[name]) return;
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.025) return;
    lastPlayed[name] = now;
    SFX[name](arg);
  }

  // A held tone for the Arc Coil charge; its pitch follows the charge.
  let chargeOsc = null;
  let chargeGain = null;
  function charge(amount) {
    if (!live()) return;
    if (amount <= 0) {
      if (chargeOsc) {
        chargeGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
        chargeOsc.stop(ctx.currentTime + 0.1);
        chargeOsc = null;
      }
      return;
    }
    if (!chargeOsc) {
      chargeOsc = ctx.createOscillator();
      chargeOsc.setPeriodicWave(pulse[0.125]);
      chargeGain = ctx.createGain();
      chargeGain.gain.value = 0.0001;
      chargeOsc.connect(chargeGain);
      chargeGain.connect(sfxBus);
      chargeOsc.start();
    }
    chargeOsc.frequency.setTargetAtTime(180 + amount * 900, ctx.currentTime, 0.03);
    chargeGain.gain.setTargetAtTime(0.025 + amount * 0.03, ctx.currentTime, 0.03);
  }

  function setPaused(p) {
    paused = p;
    applyVolumes();
  }

  HA.audio = {
    init,
    unlock,
    play,
    charge,
    setPaused,
    applyVolumes,
    tone,
    noise,
    get ready() {
      return live();
    },
    get ctx() {
      return ctx;
    },
    get musicBus() {
      return musicBus;
    },
  };
})(window.HA);
