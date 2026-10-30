'use strict';
// Music: every area has its own track, written here as note patterns and played live on chiptune voices.
// The Ark's main theme (the lead first heard on the Cryo Deck) comes back in each track in a different
// mood: warm and lilting in the Warrens, bare in grief, and loud in the boss fight. Some moments have
// no music at all on purpose. Tracks crossfade when the player changes area.
(function (HA) {
  const A = HA.audio;
  const midi = (name) => {
    if (typeof name === 'number') return name;
    const m = /^([A-G])(#|b)?(\d)$/.exec(name);
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return 12 * (Number(m[3]) + 1) + base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  };
  const freq = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

  // ---- The tracks. play(step, out) is called for every step; out.note / out.drum schedule sounds. ----
  const THEME = [
    [[0, 'E5', 4], [4, 'D5', 2], [6, 'C5', 2], [8, 'B4', 4], [12, 'C5', 4]],
    [[0, 'A4', 8], [8, 'C5', 4], [12, 'F5', 4]],
    [[0, 'D5', 4], [4, 'E5', 2], [6, 'D5', 2], [8, 'B4', 4], [12, 'G4', 4]],
    [[0, 'G#4', 8], [8, 'B4', 4], [12, 'E5', 4]],
  ];
  const transpose = (bars, by) => bars.map((bar) => bar.map(([s, n, l]) => [s, midi(n) + by, l]));
  const CRYO_CHORDS = [
    { root: midi('A2'), third: 3 },
    { root: midi('F2'), third: 4 },
    { root: midi('G2'), third: 4 },
    { root: midi('E2'), third: 4 },
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

  const TRACKS = {
    // Cryo Deck: the Ark's theme, A minor, cold and alone. (Unchanged from the Phase 1 prototype.)
    cryo: {
      step: 60 / 92 / 4,
      steps: 128,
      play(s, out) {
        const bar = Math.floor(s / 16) % 8;
        const at = s % 16;
        const chord = CRYO_CHORDS[bar % 4];
        const full = bar >= 4;
        const bass = { 0: [0, 3], 6: [0, 2], 8: [7, 2], 10: [12, 2], 12: [0, 3], 15: [7, 1] }[at];
        if (bass) out.note(0, 'triangle', chord.root + bass[0], bass[1] * 1.03, 0.32);
        const tones = [12, 12 + chord.third, 19, 24];
        out.note(0, 0.125, chord.root + 12 + tones[ARP[at % 8]], 0.87, full ? 0.05 : 0.07);
        if (full) {
          for (const [st, n, len] of THEME[bar % 4]) if (st === at) out.note(0, 0.25, n, len, 0.09, 0.01);
          if (at % 4 === 2) out.drum(0, 'hat', 0.04);
          if (at === 0 || at === 10) out.drum(0, 'kick', 0.28);
        }
      },
    },

    // Title: the same theme, slow, on soft voices, with sustained chords.
    title: {
      step: 60 / 70 / 4,
      steps: 128,
      fadeIn: 2,
      play(s, out) {
        const bar = Math.floor(s / 16) % 8;
        const at = s % 16;
        const c = CRYO_CHORDS[bar % 4];
        if (at === 0) for (const iv of [12, 12 + c.third, 19]) out.note(0, 'triangle', c.root + iv, 15, 0.045, 0.4);
        if (at === 0 || at === 8) out.note(0, 'sine', c.root, 7.5, 0.22, 0.05);
        if (at % 4 === 0) out.note(0, 0.125, c.root + 24 + [0, c.third, 7, 12][at / 4], 1.5, 0.025);
        if (bar >= 4) for (const [st, n, len] of THEME[bar % 4]) if (st === at) out.note(0, 'triangle', n, len, 0.11, 0.03);
      },
    },

    // The Warrens: the theme in D major, in a lilting 6/8, with a hand drum. Home.
    warrens: {
      step: 0.3,
      steps: 96,
      play(s, out) {
        const bar = Math.floor(s / 6) % 16;
        const at = s % 6;
        const c = W_CHORDS[bar % 8];
        if (at === 0) out.note(0, 'triangle', c.root, 2.8, 0.28);
        if (at === 3) out.note(0, 'triangle', c.root + 7, 2.8, 0.2);
        out.note(0, 0.25, c.root + 12 + [12, 12 + c.third, 19, 24, 19, 12 + c.third][at], 0.9, 0.035);
        if (at === 0) out.drum(0, 'hand', 0.26);
        if (at === 3) out.drum(0, 'hand', 0.14);
        if (at !== 0 && at !== 3) out.drum(0, 'shaker', 0.018);
        if (bar < 8) {
          if (at === 0 && bar % 2 === 0) out.note(0, 'triangle', c.root + 31, 2, 0.04);
          if (at === 4) out.note(0, 'triangle', c.root + 24 + c.third, 1.5, 0.03);
        } else {
          for (const [st, n, len] of W_THEME[bar % 8]) {
            if (st !== at) continue;
            out.note(0, 0.25, n, len, 0.075, 0.02);
            out.note(0, 0.125, n, len, 0.025, 0.02, 0.5); // a soft echo half a step behind
          }
        }
      },
    },

    // The Warrens after the Bailiff's core was torn out: the same song, in D minor, nearly silent.
    warrensHush: {
      step: 0.42,
      steps: 96,
      play(s, out) {
        const bar = Math.floor(s / 6) % 16;
        const at = s % 6;
        const c = HUSH_CHORDS[bar % 8];
        if (at === 0) out.note(0, 'triangle', c.root, 5.5, 0.2, 0.05);
        if (at % 2 === 0) out.note(0, 0.25, c.root + 12 + [12, 12 + c.third, 19][at / 2], 1.6, 0.025);
        if (bar >= 8 && bar < 12) for (const [st, n, len] of HUSH_THEME[bar - 8]) if (st === at) out.note(0, 'triangle', n, len, 0.07, 0.05);
      },
    },

    // The way down into the walls: the Warrens song half-remembered, slower, with long gaps. Same key and
    // 6/8 as the village. The chords darken once (G minor) before turning home, and in the second half a
    // hand drum comes up from below, as if the village were just out of sight.
    warrensEdge: {
      step: 0.36,
      steps: 96,
      play(s, out) {
        const bar = Math.floor(s / 6) % 16;
        const at = s % 6;
        const c = EDGE_CHORDS[bar];
        if (at === 0) {
          out.note(0, 'triangle', c.root, 5.5, 0.2, 0.02);
          for (const iv of [12 + c.third, 19]) out.note(0, 'sine', c.root + iv, 6, 0.028, 0.3);
        }
        if (at === 3) out.note(0, 'triangle', c.root + 7, 2.5, 0.08, 0.02);
        for (const [st, n, len] of EDGE_THEME[bar] || []) {
          if (st !== at) continue;
          out.note(0, 'triangle', n, len, 0.065, 0.03);
          out.note(0, 0.125, n, len, 0.016, 0.03, 1.5); // the echo off the walls
        }
        if (bar >= 8) {
          if (at === 0) out.drum(0, 'hand', 0.06 + (bar - 8) * 0.006);
          if (at === 3) out.drum(0, 'hand', 0.03);
        }
        if ((bar === 0 && at === 4) || (bar === 4 && at === 2) || (bar === 9 && at === 5) || (bar === 13 && at === 1)) out.drum(0, 'drip', 0.035);
      },
    },

    // The Warden Lockup: E Phrygian, a pulse like a machine's, metal on metal.
    lockup: {
      step: 60 / 100 / 4,
      steps: 64,
      play(s, out) {
        const bar = Math.floor(s / 16);
        const at = s % 16;
        if (at % 2 === 0) out.note(0, 'triangle', (bar % 2 === 1 && at >= 12) ? 'F2' : 'E2', 1.5, 0.24);
        if (at === 0 || at === 8) out.drum(0, 'kick', 0.18);
        if (at === 4 || at === 12) out.drum(0, 'clank', 0.08);
        if (s === 0) out.note(0, 'triangle', 'E3', 30, 0.05, 0.4);
        if (s === 32) out.note(0, 'triangle', 'F3', 14, 0.05, 0.4);
        if (at === 0 && bar % 2 === 0) {
          out.note(0, 0.125, 'B5', 2, 0.04);
          out.note(0, 0.125, 'B5', 2, 0.015, 0, 6);
        }
      },
    },

    // The Bailiff: E minor, 140 BPM. Layer 1 drums and bass; layer 2 adds the arpeggio; layer 3 brings
    // in the main theme, loud, for the last third of the fight.
    boss: {
      step: 60 / 140 / 4,
      steps: 64,
      layers: 3,
      fadeIn: 0.1,
      play(s, out) {
        const bar = Math.floor(s / 16) % 4;
        const at = s % 16;
        const c = BOSS_CHORDS[bar];
        if (at % 2 === 0) out.note(0, 'triangle', c.root + [0, 0, 12, 0, 0, 12, 0, 7][at / 2], 1.6, 0.3);
        if (at === 0 || at === 8) out.drum(0, 'kick', 0.32);
        if (at === 4 || at === 12) out.drum(0, 'snare', 0.15);
        if (at % 2 === 1) out.drum(0, 'hat', 0.03);
        out.note(1, 0.125, c.root + 24 + [0, c.third, 7, 12, 7, c.third, 0, 7][at % 8], 0.9, 0.045);
        if (at === 6 || at === 14) out.drum(1, 'kick', 0.2);
        for (const [st, n, len] of BOSS_THEME[bar]) {
          if (st !== at) continue;
          out.note(2, 0.5, n, len, 0.07, 0.005);
          out.note(2, 0.125, n + 12, len, 0.025, 0.005);
        }
      },
    },
  };
  const chord = (name, third) => ({ root: midi(name), third });

  // The Gardens: a waltz in F major on soft pulse voices, the Ark's theme high above it. Near the vats a
  // second layer comes in: the same melody doubled a little out of tune, souring it.
  TRACKS.gardens = {
    step: 60 / 132 / 2,
    steps: 96,
    layers: 2,
    play(s, out) {
      const bar = Math.floor(s / 6) % 16;
      const at = s % 6;
      const c = G_CHORDS[bar % 8];
      // oom, pah, pah
      if (at === 0) out.note(0, 'triangle', c.root, 1.8, 0.26);
      if (at === 2 || at === 4) for (const iv of [12 + c.third, 19]) out.note(0, 0.25, c.root + iv, 1.4, 0.03);
      if (at === 0) out.drum(0, 'hand', 0.12);
      if (at === 3) out.drum(0, 'shaker', 0.012);
      if (bar < 8) {
        if (at % 2 === 1) out.note(0, 0.125, c.root + 24 + [12, 12 + c.third, 19][(at - 1) / 2], 0.8, 0.02);
      } else {
        for (const [st, n, len] of G_THEME[bar % 8]) {
          if (st !== at) continue;
          out.note(0, 0.25, n, len, 0.06, 0.02);
          out.note(1, 0.5, midi(n) + 0.42, len, 0.03, 0.04); // the sour double
          out.note(1, 'sine', midi(n) - 11.6, len, 0.02, 0.1);
        }
      }
    },
  };

  // The Pruner: the waltz turned hard and fast, in D minor, with shears for a snare. The second half brings
  // the Ark's theme in over the top.
  TRACKS.pruner = {
    step: 60 / 188 / 2,
    steps: 48,
    layers: 2,
    fadeIn: 0.1,
    play(s, out) {
      const bar = Math.floor(s / 6) % 8;
      const at = s % 6;
      const c = P_CHORDS[bar % 4];
      if (at === 0) {
        out.note(0, 'triangle', c.root, 1.6, 0.32);
        out.drum(0, 'kick', 0.3);
      }
      if (at === 2 || at === 4) {
        out.note(0, 0.25, c.root + 12 + c.third, 0.8, 0.05);
        out.drum(0, 'clank', 0.07);
      }
      if (at % 2 === 1) out.drum(0, 'hat', 0.025);
      out.note(0, 0.125, c.root + 24 + [0, 7, c.third, 12, 7, c.third][at], 0.7, 0.03);
      for (const [st, n, len] of P_THEME[bar]) {
        if (st !== at) continue;
        out.note(1, 0.5, n, len, 0.065, 0.005);
        out.note(1, 0.125, midi(n) + 12, len, 0.02, 0.005);
      }
    },
  };

  // Wick: the Warrens' song, broken and detuned, with a heartbeat for a drum. Later phases add the melody.
  TRACKS.wick = {
    step: 0.34,
    steps: 96,
    layers: 3,
    fadeIn: 0.2,
    play(s, out) {
      const bar = Math.floor(s / 6) % 16;
      const at = s % 6;
      const c = HUSH_CHORDS[bar % 8];
      // the heartbeat: lub-dub, then a rest
      if (at === 0) out.drum(0, 'kick', 0.3);
      if (at === 1) out.drum(0, 'kick', 0.18);
      if (at === 0) out.note(0, 'triangle', c.root - 0.3, 5.5, 0.18, 0.05);
      if (at % 2 === 0) out.note(1, 0.25, c.root + 12 + [12, 12 + c.third, 19][at / 2] + (bar % 3 === 2 ? 0.5 : 0), 1.5, 0.03);
      for (const [st, n, len] of W_THEME[bar % 8]) {
        if (st !== at) continue;
        out.note(2, 0.25, midi(n) - 0.35, len, 0.05, 0.03);
        out.note(2, 'sine', midi(n) + 0.3, len, 0.025, 0.06, 0.25);
      }
    },
  };
  const W_CHORDS = [chord('D3', 4), chord('D3', 4), chord('B2', 3), chord('B2', 3), chord('G2', 4), chord('A2', 4), chord('A2', 4), chord('A2', 4)];
  const W_THEME = [
    [[0, 'A5', 2], [2, 'G5', 1], [3, 'F#5', 2], [5, 'E5', 1]],
    [[0, 'F#5', 6]],
    [[0, 'D5', 3], [3, 'F#5', 3]],
    [[0, 'B5', 6]],
    [[0, 'G5', 2], [2, 'A5', 1], [3, 'G5', 2], [5, 'E5', 1]],
    [[0, 'C#5', 6]],
    [[0, 'C#5', 3], [3, 'E5', 3]],
    [[0, 'A5', 6]],
  ];
  const EDGE_CHORDS = [chord('D3', 4), chord('D3', 4), chord('B2', 3), chord('B2', 3), chord('G2', 4), chord('G2', 4), chord('A2', 4), chord('A2', 4),
    chord('D3', 4), chord('D3', 4), chord('B2', 3), chord('B2', 3), chord('G2', 4), chord('G2', 3), chord('A2', 4), chord('A2', 4)];
  // Bars of the Warrens melody, with rests between; bar 13 is the G minor turn.
  const EDGE_THEME = {
    1: [[0, 'A5', 2], [2, 'G5', 1], [3, 'F#5', 3]],
    2: [[0, 'F#5', 6]],
    5: [[0, 'G5', 2], [2, 'A5', 1], [3, 'G5', 2], [5, 'E5', 1]],
    6: [[0, 'C#5', 6]],
    9: [[0, 'A5', 2], [2, 'G5', 1], [3, 'F#5', 2], [5, 'E5', 1]],
    10: [[0, 'F#5', 3], [3, 'D5', 3]],
    11: [[0, 'B5', 6]],
    12: [[0, 'G5', 2], [2, 'A5', 1], [3, 'G5', 2], [5, 'D5', 1]],
    13: [[0, 'Bb4', 6]],
    14: [[0, 'A4', 3], [3, 'C#5', 3]],
    15: [[0, 'E5', 6]],
  };
  const HUSH_CHORDS = [chord('D3', 3), chord('D3', 3), chord('Bb2', 4), chord('Bb2', 4), chord('G2', 3), chord('A2', 4), chord('A2', 4), chord('A2', 4)];
  const HUSH_THEME = [[[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 2]], [[0, 'E5', 6]], [[0, 'D5', 3], [3, 'F5', 3]], [[0, 'Bb5', 6]]];
  const BOSS_CHORDS = [chord('E2', 3), chord('C2', 4), chord('D2', 4), chord('B1', 4)];
  const G_CHORDS = [chord('F2', 4), chord('D2', 3), chord('Bb1', 4), chord('C2', 4), chord('F2', 4), chord('A1', 3), chord('G1', 3), chord('C2', 4)];
  // The Ark's theme as a waltz, in F, an octave up.
  const G_THEME = [
    [[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 2], [5, 'E5', 1]],
    [[0, 'F5', 3], [3, 'C5', 3]],
    [[0, 'D5', 2], [2, 'E5', 1], [3, 'F5', 2], [5, 'A5', 1]],
    [[0, 'G5', 6]],
    [[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 2], [5, 'E5', 1]],
    [[0, 'D5', 3], [3, 'F5', 3]],
    [[0, 'Bb5', 2], [2, 'A5', 1], [3, 'G5', 2], [5, 'E5', 1]],
    [[0, 'F5', 6]],
  ];
  const P_CHORDS = [chord('D2', 3), chord('Bb1', 4), chord('G1', 3), chord('A1', 4)];
  const P_THEME = [
    [[0, 'A5', 2], [2, 'G5', 1], [3, 'F5', 2], [5, 'E5', 1]],
    [[0, 'F5', 3], [3, 'D5', 3]],
    [[0, 'Bb5', 2], [2, 'A5', 1], [3, 'G5', 2], [5, 'D5', 1]],
    [[0, 'C#5', 6]],
    [[0, 'A5', 2], [2, 'Bb5', 1], [3, 'A5', 2], [5, 'G5', 1]],
    [[0, 'F5', 3], [3, 'E5', 3]],
    [[0, 'D5', 2], [2, 'E5', 1], [3, 'F5', 2], [5, 'G5', 1]],
    [[0, 'A5', 6]],
  ];
  const BOSS_THEME = transpose(THEME, 7);

  // The Cargo Labyrinth: D Dorian, minimal and mechanical. A clock ticks and tocks under a bass ostinato, and the
  // Ark's theme turns up in pieces, each note in a different octave, like crates stacked anyhow.
  const C_THEME = transpose(THEME, 5);
  const C_OCTAVE = [0, 12, -12, 0, 12, 0, -12, 12, 0, -12, 12, 0];
  const C_CHORDS = [chord('D2', 3), chord('D2', 3), chord('G2', 4), chord('G2', 4), chord('C2', 4), chord('C2', 4), chord('A1', 3), chord('G2', 4)];
  TRACKS.cargo = {
    step: 60 / 96 / 4,
    steps: 128,
    play(s, out) {
      const bar = Math.floor(s / 16) % 8;
      const at = s % 16;
      const c = C_CHORDS[bar];
      // the clock: tick, tock
      if (at % 4 === 0) out.drum(0, at % 8 ? 'clank' : 'hat', at % 8 ? 0.035 : 0.05);
      // the ostinato: root, fifth, seventh, octave
      if (at % 4 === 0) out.note(0, 'triangle', c.root + [0, 7, 10, 12][at / 4], 1.6, 0.24);
      if (at === 10) out.note(0, 'triangle', c.root + 7, 1, 0.14);
      if (at === 0) out.note(0, 0.25, c.root + 24 + c.third, 12, 0.02, 0.3);
      // the theme in pieces: only every other note of a bar, each in its own octave
      if (bar % 2 === 1 || bar >= 4) {
        themeAt(C_THEME[bar % 4], at, (n, len, i) => {
          if (i % 2 && bar < 4) return;
          out.note(0, 0.125, midi(n) + C_OCTAVE[(bar * 3 + i) % C_OCTAVE.length], len, 0.05, 0.004);
        });
      }
    },
  };
  // Plays the notes of one theme bar that start at this step, with their index in the bar.
  function themeAt(bar, at, fn) {
    bar.forEach(([st, n, len], i) => st === at && fn(n, len, i));
  }

  // The Lifeboat Dock: nothing but the hum of the boat's cradle, and now and then a ping from its systems.
  TRACKS.dock = {
    step: 0.5,
    steps: 32,
    fadeIn: 2,
    play(s, out) {
      if (s % 16 === 0) {
        out.note(0, 'sine', 'D2', 16, 0.16, 1.2);
        out.note(0, 'sine', midi('A2') + 0.08, 16, 0.07, 1.6);
      }
      if (s === 6 || s === 23) out.note(0, 'sine', s === 6 ? 'A5' : 'E6', 1.5, 0.025, 0.01);
    },
  };

  // The Cold Store: a thin high drone, and the theme so slowly it barely moves, frozen in place.
  TRACKS.coldStore = {
    step: 0.42,
    steps: 64,
    fadeIn: 2,
    play(s, out) {
      if (s % 32 === 0) {
        out.note(0, 'sine', 'D5', 32, 0.03, 2);
        out.note(0, 'sine', midi('A5') + 0.1, 32, 0.018, 2.5);
        out.note(0, 'triangle', 'D2', 32, 0.12, 1.5);
      }
      const notes = { 4: ['A5', 6], 12: ['G5', 3], 16: ['F5', 6], 28: ['E5', 10], 40: ['D5', 6], 48: ['F5', 4], 52: ['E5', 10] };
      if (notes[s]) out.note(0, 'triangle', notes[s][0], notes[s][1], 0.05, 0.08);
    },
  };

  // The Tallyman: the Labyrinth's clock gone hard and fast, counting in threes like its drops. Layer 2 adds the
  // stamp of its audit; layer 3 brings the Ark's theme in whole, high over everything.
  const T_CHORDS = [chord('D2', 3), chord('Bb1', 4), chord('C2', 4), chord('A1', 4)];
  TRACKS.tallyman = {
    step: 60 / 150 / 4,
    steps: 64,
    layers: 3,
    fadeIn: 0.1,
    play(s, out) {
      const bar = Math.floor(s / 16) % 4;
      const at = s % 16;
      const c = T_CHORDS[bar];
      // one, two, three ... and a breath
      if (at === 0 || at === 4 || at === 8) out.drum(0, 'kick', 0.3);
      if (at === 0 || at === 4 || at === 8) out.note(0, 'triangle', c.root + [0, 0, 7][at / 4], 1.8, 0.3);
      if (at % 2 === 1) out.drum(0, 'hat', 0.025);
      if (at === 12) out.drum(0, 'clank', 0.1);
      out.note(1, 0.125, c.root + 24 + [0, 7, c.third, 12][at % 4], 0.8, 0.035);
      if (at === 12 || at === 14) out.drum(1, 'snare', 0.13);
      for (const [st, n, len] of C_THEME[bar]) {
        if (st !== at) continue;
        out.note(2, 0.5, n, len, 0.06, 0.005);
        out.note(2, 0.125, midi(n) + 12, len, 0.02, 0.005);
      }
    },
  };

  // ---- The player: one track at a time, crossfading, with layers that fade in and out ----
  let current = null;
  const fading = [];
  let wanted = null;
  let layerCount = 1;

  function play(id) {
    if (id && !TRACKS[id]) id = null;
    if (id !== wanted) layerCount = 1;
    wanted = id;
  }

  function setLayers(n) {
    layerCount = n;
    if (!current || !A.ready) return;
    const now = A.ctx.currentTime;
    current.layers.forEach((g, i) => g.gain.setTargetAtTime(i < n ? 1 : 0, now, 0.35));
  }

  function start(id) {
    const ctx = A.ctx;
    const track = TRACKS[id];
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, ctx.currentTime + (track.fadeIn !== undefined ? track.fadeIn : 0.8));
    gain.connect(A.musicBus);
    const layers = [];
    for (let i = 0; i < (track.layers || 1); i++) {
      const g = ctx.createGain();
      g.gain.value = i < layerCount ? 1 : 0;
      g.connect(gain);
      layers.push(g);
    }
    return { id, track, gain, layers, step: 0, nextTime: ctx.currentTime + 0.06 };
  }

  function stop(p) {
    const now = A.ctx.currentTime;
    p.gain.gain.cancelScheduledValues(now);
    p.gain.gain.setValueAtTime(p.gain.gain.value, now);
    p.gain.gain.linearRampToValueAtTime(0.0001, now + 1.2);
    p.endTime = now + 1.3;
    fading.push(p);
  }

  function schedule(p, horizon) {
    const ctx = A.ctx;
    if (p.nextTime < ctx.currentTime) p.nextTime = ctx.currentTime + 0.03;
    while (p.nextTime < horizon && (!p.endTime || p.nextTime < p.endTime)) {
      const t = p.nextTime;
      const dt = p.track.step;
      const out = {
        note(layer, wave, n, len, vol, attack, offset = 0) {
          A.tone({ wave, f: freq(n), dur: len * dt * 0.92, vol, attack: attack || 0.004, bus: p.layers[layer], delay: t + offset * dt - ctx.currentTime });
          // At Bloom 7 a voice that isn't the hero's sings along, slightly flat (see bloom.js).
          if (music.bloomVoice && vol >= 0.05 && midi(n) > 60) A.tone({ wave: 'sine', f: freq(midi(n) - 0.45), dur: len * dt * 0.95, vol: vol * 0.45, attack: 0.08, bus: p.layers[layer], delay: t + (offset + 0.2) * dt - ctx.currentTime });
        },
        drum(layer, kind, vol) {
          drum(p.layers[layer], kind, vol, t - ctx.currentTime);
        },
      };
      p.track.play(p.step, out);
      p.step = (p.step + 1) % p.track.steps;
      p.nextTime += dt;
    }
  }

  function drum(bus, kind, vol, delay) {
    if (kind === 'kick') A.tone({ wave: 'sine', f: 130, f2: 40, dur: 0.12, vol, bus, delay });
    else if (kind === 'snare') A.noise({ f: 1800, f2: 900, dur: 0.1, vol, q: 0.7, bus, delay });
    else if (kind === 'hat') A.noise({ f: 7000, dur: 0.03, vol, q: 1, bus, delay });
    else if (kind === 'hand') A.noise({ f: 420, f2: 150, dur: 0.14, vol, filter: 'lowpass', bus, delay });
    else if (kind === 'shaker') A.noise({ f: 6000, dur: 0.05, vol, q: 0.8, filter: 'highpass', bus, delay });
    else if (kind === 'clank') {
      A.noise({ f: 2500, dur: 0.08, vol, q: 8, bus, delay });
      A.tone({ wave: 0.125, f: 1900, dur: 0.05, vol: vol * 0.3, bus, delay });
    } else if (kind === 'drip') A.tone({ wave: 'sine', f: 1900, f2: 1100, dur: 0.06, vol, bus, delay });
  }

  function pump() {
    if (!A.ready) return;
    const now = A.ctx.currentTime;
    if ((current ? current.id : null) !== wanted) {
      if (current) stop(current);
      current = wanted ? start(wanted) : null;
    }
    const horizon = now + 0.15;
    if (current) schedule(current, horizon);
    for (let i = fading.length - 1; i >= 0; i--) {
      const p = fading[i];
      if (now > p.endTime) {
        p.gain.disconnect();
        fading.splice(i, 1);
      } else schedule(p, horizon);
    }
  }
  setInterval(pump, 30);

  const music = { TRACKS, play, setLayers, bloomVoice: false, get playing() { return wanted; } };
  HA.music = music;
})(window.HA);
