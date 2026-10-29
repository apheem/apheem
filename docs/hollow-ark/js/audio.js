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
  };

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

  // ---- Music: the Ark's theme, A minor, Am F G E ----
  const midi = (name) => {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return 12 * (Number(m[3]) + 1) + base + (m[2] ? 1 : 0);
  };
  const freq = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const CHORDS = [
    { root: midi('A2'), third: 3 },
    { root: midi('F2'), third: 4 },
    { root: midi('G2'), third: 4 },
    { root: midi('E2'), third: 4 },
  ];
  // [step, note, length in steps], one 16-step bar per chord
  const LEAD = [
    [[0, 'E5', 4], [4, 'D5', 2], [6, 'C5', 2], [8, 'B4', 4], [12, 'C5', 4]],
    [[0, 'A4', 8], [8, 'C5', 4], [12, 'F5', 4]],
    [[0, 'D5', 4], [4, 'E5', 2], [6, 'D5', 2], [8, 'B4', 4], [12, 'G4', 4]],
    [[0, 'G#4', 8], [8, 'B4', 4], [12, 'E5', 4]],
  ];
  const BPM = 92;
  const STEP_TIME = 60 / BPM / 4;
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  let musicOn = false;
  let paused = false;
  let step = 0;
  let nextTime = 0;
  let timer = null;

  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16) % 8;
    const inBar = s % 16;
    const chord = CHORDS[bar % 4];
    const full = bar >= 4;
    const bus = musicBus;
    // bass
    const bass = { 0: [0, 3], 6: [0, 2], 8: [7, 2], 10: [12, 2], 12: [0, 3], 15: [7, 1] }[inBar];
    if (bass) tone({ wave: 'triangle', f: freq(chord.root + bass[0]), dur: bass[1] * STEP_TIME * 0.95, vol: 0.32, bus, delay: t - ctx.currentTime });
    // arpeggio
    const tones = [12, 12 + chord.third, 19, 24];
    const n = chord.root + 12 + tones[ARP[inBar % 8]];
    tone({ wave: 0.125, f: freq(n), dur: STEP_TIME * 0.8, vol: full ? 0.05 : 0.07, bus, delay: t - ctx.currentTime });
    // lead on the second half of the loop
    if (full) {
      for (const [at, note, len] of LEAD[bar % 4]) {
        if (at === inBar) tone({ wave: 0.25, f: freq(midi(note)), dur: len * STEP_TIME * 0.92, vol: 0.09, attack: 0.01, bus, delay: t - ctx.currentTime });
      }
      if (inBar % 4 === 2) noise({ f: 7000, dur: 0.03, vol: 0.04, q: 1, bus, delay: t - ctx.currentTime });
      if (inBar === 0 || inBar === 10) tone({ wave: 'sine', f: 130, f2: 40, dur: 0.12, vol: 0.28, bus, delay: t - ctx.currentTime });
    }
  }

  function pump() {
    if (!live()) return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step = (step + 1) % 128;
      nextTime += STEP_TIME;
    }
  }

  function startMusic() {
    if (musicOn) return;
    musicOn = true;
    step = 0;
    nextTime = 0;
    timer = setInterval(pump, 30);
  }

  function setPaused(p) {
    paused = p;
    applyVolumes();
  }

  HA.audio = { init, unlock, play, charge, startMusic, setPaused, applyVolumes, get ready() { return live(); } };
})(window.HA);
