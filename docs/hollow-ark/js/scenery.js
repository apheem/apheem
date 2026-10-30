'use strict';
// Room backgrounds and tiles, drawn in code once per room, plus the props that move or change
// (terminals, doors, the cage, fires). Each area has its own limited palette, so every deck is
// recognisable from a single screenshot.
(function (HA) {
  const { canvas } = HA.art;

  const THEMES = {
    cryo: {
      bg: '#0a0d18',
      panel: '#0d1120',
      panelEdge: '#10152a',
      panelMark: '#121a30',
      conduit: ['#121a2e', '#18223b', '#1c2742'],
      light: 'rgba(95,212,232,0.18)',
      lamp: '#5fd4e8',
      tile: { deep: '#141827', deep2: '#171c2d', face: '#262e44', inner: '#323b56', speck: '#46526e', lip: '#b8f4ff', lip2: '#5f8fae', under: '#0d101b', left: '#4a5674', right: '#181d2d' },
      walk: ['#c9d6e8', '#6c7894', '#3a4258', '#262c3e'],
      edge: 'rgba(2,3,8,0.55)',
    },
    warrens: {
      bg: '#120c09',
      panel: '#1a120c',
      panelEdge: '#22170f',
      panelMark: '#2a1c12',
      conduit: ['#24180f', '#3a2616', '#4a3018'],
      light: 'rgba(255,184,77,0.16)',
      lamp: '#ffb84d',
      tile: { deep: '#1c130d', deep2: '#221710', face: '#3a2818', inner: '#4a3420', speck: '#6a4a2a', lip: '#ffcf8a', lip2: '#a8743a', under: '#100a06', left: '#5a4028', right: '#24180e' },
      walk: ['#d9b07a', '#8a6a40', '#5a4028', '#3a2818'],
      edge: 'rgba(10,5,2,0.6)',
    },
    lockup: {
      bg: '#0b080c',
      panel: '#110d12',
      panelEdge: '#171218',
      panelMark: '#1d151d',
      conduit: ['#1a1218', '#2a1820', '#3a1c26'],
      light: 'rgba(232,67,79,0.16)',
      lamp: '#e8434f',
      tile: { deep: '#120e13', deep2: '#161118', face: '#24202a', inner: '#302a36', speck: '#4a3a48', lip: '#ff8a8a', lip2: '#a83a44', under: '#08060a', left: '#3a3040', right: '#16121a' },
      walk: ['#a9b6cc', '#6c7894', '#3a3040', '#24202a'],
      edge: 'rgba(8,2,4,0.62)',
    },
    // The Gardens: deep greens, warm white grow-lights, and the Bloom's pink and violet creeping through.
    gardens: {
      bg: '#07100b',
      panel: '#0b1710',
      panelEdge: '#0f1f15',
      panelMark: '#13281a',
      conduit: ['#0f1f17', '#183224', '#203f2c'],
      light: 'rgba(255,244,214,0.17)',
      lamp: '#fff4d6',
      tile: { deep: '#0d1911', deep2: '#101f15', face: '#1e3828', inner: '#284a33', speck: '#3c6a46', lip: '#a8e6a0', lip2: '#4f9a5a', under: '#060e09', left: '#376a46', right: '#13281b' },
      walk: ['#c8e0b0', '#6a8a5a', '#3a5a3a', '#243a26'],
      edge: 'rgba(2,8,4,0.55)',
    },
  };

  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  };

  const cache = new Map();
  function layers(def, room) {
    if (cache.has(def.id)) return cache.get(def.id);
    const theme = THEMES[HA.rooms.AREAS[def.area].theme];
    const out = { bg: buildBackground(def, room, theme), tiles: buildTiles(room, theme), theme, vignette: buildVignette(theme) };
    cache.set(def.id, out);
    return out;
  }

  function buildBackground(def, room, T) {
    const W = room.pw;
    const H = room.ph;
    const img = canvas(W, H);
    const g = img.getContext('2d');
    const rnd = HA.seeded(hash(def.id));
    g.fillStyle = T.bg;
    g.fillRect(0, 0, W, H);
    // wall panels
    for (let y = 0; y < H; y += 24) {
      for (let x = (y / 24) % 2 ? -16 : 0; x < W; x += 32) {
        g.fillStyle = T.panel;
        g.fillRect(x + 1, y + 1, 30, 22);
        g.fillStyle = T.panelEdge;
        g.fillRect(x + 1, y + 1, 30, 1);
        if (rnd() < 0.18) {
          g.fillStyle = T.panelMark;
          g.fillRect(x + 6, y + 8, 18, 2);
          g.fillRect(x + 6, y + 12, 12, 2);
        }
      }
    }
    // conduits
    for (let py = 40 + Math.floor(rnd() * 20); py < H - 24; py += 120 + Math.floor(rnd() * 60)) {
      g.fillStyle = T.conduit[0];
      g.fillRect(0, py, W, 6);
      g.fillStyle = T.conduit[1];
      g.fillRect(0, py, W, 1);
      for (let x = 12; x < W; x += 56) {
        g.fillStyle = T.conduit[2];
        g.fillRect(x, py - 1, 4, 8);
      }
    }
    // ceiling lights
    for (let x = 40; x < W; x += 96) {
      for (let ly = 24; ly < H - 40; ly += 136) {
        if (room.tile(Math.floor(x / 8), Math.floor(ly / 8)) !== HA.room.EMPTY) continue;
        const grad = g.createRadialGradient(x, ly + 2, 0, x, ly + 2, 26);
        grad.addColorStop(0, T.light);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(x - 26, ly - 24, 52, 52);
        g.fillStyle = T.lamp;
        g.fillRect(x - 4, ly, 8, 1);
      }
    }
    for (const s of def.scenery || []) PROPS[s.kind] && PROPS[s.kind](g, s, rnd, T, room);
    return img;
  }

  // ---- Static props painted into a room's background ----
  const PROPS = {
    pods(g, s, rnd) {
      for (let i = 0; i < s.n; i++) {
        const px = s.x * 8 + i * 18;
        const py = s.y * 8;
        g.fillStyle = '#1a2238';
        g.fillRect(px, py, 14, 30);
        const broken = rnd() < 0.2;
        g.fillStyle = broken ? '#0c1120' : '#1d3b52';
        g.fillRect(px + 2, py + 3, 10, 22);
        if (!broken) {
          g.fillStyle = '#3f6f8a';
          g.fillRect(px + 3, py + 4, 2, 12);
          g.fillStyle = '#2a4d64';
          g.fillRect(px + 5, py + 10, 5, 9);
        } else {
          g.fillStyle = '#3f6f8a';
          g.fillRect(px + 2, py + 22, 3, 2);
          g.fillRect(px + 9, py + 3, 3, 2);
        }
        g.fillStyle = broken ? '#e8434f' : '#5fd4e8';
        g.fillRect(px + 6, py + 27, 2, 1);
      }
    },
    podwall(g, s, rnd) {
      for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) PROPS.pods(g, { x: s.x + c * 2.25, y: s.y + r * 4.2, n: 1 }, rnd);
    },
    window(g, s, rnd) {
      const wx = s.x * 8;
      const wy = s.y * 8;
      g.fillStyle = '#1c2540';
      g.fillRect(wx - 3, wy - 3, 62, 36);
      g.fillStyle = '#02030a';
      g.fillRect(wx, wy, 56, 30);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = rnd() < 0.2 ? '#ffffff' : rnd() < 0.5 ? '#8aa0c8' : '#3b4a72';
        g.fillRect(wx + Math.floor(rnd() * 56), wy + Math.floor(rnd() * 30), 1, 1);
      }
      g.fillStyle = '#26314f';
      g.fillRect(wx + 27, wy, 2, 30);
    },
    pipes(g, s, rnd, T, room) {
      for (const dy of [0, 10]) {
        const y = s.y * 8 + dy;
        g.fillStyle = '#1b2a3a';
        g.fillRect(0, y, room.pw, 5);
        g.fillStyle = '#2b4258';
        g.fillRect(0, y, room.pw, 1);
        for (let x = 20; x < room.pw; x += 70) {
          g.fillStyle = '#35506a';
          g.fillRect(x, y - 1, 3, 7);
          if (rnd() < 0.4) {
            g.fillStyle = '#5fd4e8';
            g.fillRect(x + 1, y + 6, 1, 3 + Math.floor(rnd() * 6));
          }
        }
      }
    },
    bloom(g, s, rnd) {
      for (let i = 0; i < s.n; i++) {
        const x = s.x * 8 + Math.floor((rnd() - 0.5) * 90);
        const y = s.y * 8 + Math.floor((rnd() - 0.5) * 40);
        const r = rnd();
        g.fillStyle = r < 0.55 ? '#2a1238' : r < 0.85 ? '#3d1850' : '#6a2a86';
        g.fillRect(x, y, r < 0.85 ? 2 : 1, r < 0.85 ? 2 : 1);
      }
    },
    scrawl(g, s, rnd, T) {
      // Hullfolk writing on the walls: scratched, uneven, faded.
      g.globalAlpha = 0.5;
      HA.font.draw(g, s.text, s.x * 8, s.y * 8, T === THEMES.warrens ? '#c98a4a' : '#7d6a5a', { shadow: null });
      g.globalAlpha = 1;
    },
    lanterns(g, s, rnd, T, room) {
      for (let x = 30; x < room.pw - 20; x += (s.every || 10) * 8) {
        const y = s.y * 8;
        if (room.tile(Math.floor(x / 8), Math.floor(y / 8)) !== HA.room.EMPTY) continue;
        g.fillStyle = '#3a2616';
        g.fillRect(x, y - 6, 1, 6);
        const grad = g.createRadialGradient(x, y + 3, 0, x, y + 3, 30);
        grad.addColorStop(0, 'rgba(255,184,77,0.22)');
        grad.addColorStop(1, 'rgba(255,184,77,0)');
        g.fillStyle = grad;
        g.fillRect(x - 30, y - 27, 60, 60);
        g.fillStyle = '#10121c';
        g.fillRect(x - 2, y, 5, 6);
        g.fillStyle = '#ffb84d';
        g.fillRect(x - 1, y + 1, 3, 4);
        g.fillStyle = '#fff0a8';
        g.fillRect(x, y + 2, 1, 2);
      }
    },
    homes(g, s) {
      // Round doorways cut into the wall, with patched curtains.
      for (const [hx, hy] of s.at) {
        const x = hx * 8;
        const y = hy * 8;
        g.fillStyle = '#0a0604';
        g.fillRect(x - 6, y - 14, 12, 18);
        g.fillRect(x - 4, y - 16, 8, 2);
        g.fillStyle = '#4a3018';
        g.fillRect(x - 7, y - 15, 1, 19);
        g.fillRect(x + 6, y - 15, 1, 19);
        g.fillRect(x - 5, y - 17, 10, 1);
        g.fillStyle = '#7a3a3a';
        g.fillRect(x - 6, y - 14, 3, 12);
        g.fillStyle = '#5a6a3a';
        g.fillRect(x + 3, y - 14, 3, 9);
      }
    },
    workbench(g, s) {
      const x = s.x * 8;
      const y = s.y * 8 + 8;
      g.fillStyle = '#10121c';
      g.fillRect(x - 12, y - 10, 26, 10);
      g.fillStyle = '#5a4028';
      g.fillRect(x - 11, y - 9, 24, 3);
      g.fillStyle = '#3a2818';
      g.fillRect(x - 10, y - 6, 2, 6);
      g.fillRect(x + 10, y - 6, 2, 6);
      g.fillStyle = '#6c7894';
      g.fillRect(x - 6, y - 12, 5, 3);
      g.fillStyle = '#a9b6cc';
      g.fillRect(x + 2, y - 13, 2, 4);
      g.fillStyle = '#5fd4e8';
      g.fillRect(x + 7, y - 11, 2, 2);
    },
    hazard(g, s) {
      for (let x = 0; x < s.w * 8; x += 8) {
        g.fillStyle = (x / 8) % 2 ? '#3a2a10' : '#151018';
        g.fillRect(s.x * 8 + x, s.y * 8, 8, s.h * 8 > 8 ? s.h * 8 : 3);
      }
    },
    cells(g, s) {
      for (let i = 0; i < s.n; i++) {
        const x = s.x * 8 + i * 40;
        const y = s.y * 8;
        g.fillStyle = '#08060a';
        g.fillRect(x, y, 30, 34);
        g.fillStyle = '#3a3040';
        for (let b = 2; b < 30; b += 5) g.fillRect(x + b, y, 1, 34);
        g.fillRect(x, y, 30, 2);
        g.fillStyle = '#e8434f';
        g.fillRect(x + 13, y + 3, 3, 1);
      }
    },
    chains(g, s) {
      const x = s.x * 8;
      for (const dx of [-6, 6]) {
        for (let y = s.y * 8 - 8; y < s.y * 8 + 30; y += 4) {
          g.fillStyle = '#3a3040';
          g.fillRect(x + dx, y, 2, 3);
        }
      }
    },
    vent(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      g.fillStyle = '#05060d';
      g.fillRect(x - 1, y, 10, 14);
      g.fillStyle = '#3a4258';
      for (let i = 0; i < 4; i++) g.fillRect(x - 1, y + 1 + i * 4, 10, 1);
    },
    fire() {},

    // ---- The Gardens ----
    // Warm light falling in from the dome, in long slanted beams.
    shafts(g, s, rnd, T, room) {
      for (let i = 0; i < s.n; i++) {
        const x = (s.x + i * s.every) * 8;
        g.fillStyle = 'rgba(255,244,214,0.035)';
        for (let y = 0; y < room.ph; y += 2) {
          const dx = Math.floor(y * 0.35);
          g.fillRect(x + dx, y, 22, 2);
          if (y % 6 === 0) g.fillRect(x + dx + 6, y, 10, 2);
        }
      }
    },
    // Crops growing up from a floor: stalks and leaves, now and then a pink Bloom head among them.
    plants(g, s, rnd) {
      const base = s.y * 8;
      for (let x = s.x0 * 8; x < (s.x1 + 1) * 8; x += 3 + Math.floor(rnd() * 3)) {
        const h = 4 + Math.floor(rnd() * (s.tall || 16));
        g.fillStyle = '#1f3a28';
        g.fillRect(x, base - h, 1, h);
        for (let ly = base - h + 2; ly < base - 2; ly += 4 + Math.floor(rnd() * 3)) {
          g.fillStyle = rnd() < 0.5 ? '#2f5a3a' : '#3f7a4a';
          g.fillRect(rnd() < 0.5 ? x - 2 : x + 1, ly, 2, 1);
        }
        const bloom = rnd() < (s.bloom || 0);
        g.fillStyle = bloom ? '#b04ad0' : rnd() < 0.3 ? '#c8d880' : '#4f9a5a';
        g.fillRect(x - 1, base - h - 1, 3, 2);
        if (bloom) {
          g.fillStyle = '#f27ad8';
          g.fillRect(x, base - h - 1, 1, 1);
        }
      }
    },
    // Vines hanging from a ceiling.
    vines(g, s, rnd) {
      for (let i = 0; i < s.n; i++) {
        const x = Math.floor((s.x0 + rnd() * (s.x1 - s.x0)) * 8);
        const len = 10 + Math.floor(rnd() * 40);
        for (let y = 0; y < len; y++) {
          g.fillStyle = y % 5 === 4 ? '#3f7a4a' : '#1f3a28';
          g.fillRect(x + (Math.floor(y / 6) % 2), s.y * 8 + y, 1, 1);
        }
        if (rnd() < 0.3) {
          g.fillStyle = '#b04ad0';
          g.fillRect(x, s.y * 8 + len, 2, 2);
        }
      }
    },
    // A planter trough along the top of a ledge, with its crop.
    beds(g, s, rnd) {
      const y = s.y * 8;
      const x0 = s.x0 * 8;
      const w = (s.x1 - s.x0 + 1) * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x0, y - 4, w, 4);
      g.fillStyle = '#3a2818';
      g.fillRect(x0 + 1, y - 3, w - 2, 3);
      g.fillStyle = '#5a4028';
      g.fillRect(x0 + 1, y - 4, w - 2, 1);
      PROPS.plants(g, { x0: s.x0, x1: s.x1, y: s.y - 0.5, tall: 10, bloom: s.bloom ? 0.4 : 0.1 }, rnd);
    },
    // The dome: glass panes over the stars, with the ribs that hold them.
    dome(g, s, rnd, T, room) {
      const y0 = s.y * 8;
      const h = s.h * 8;
      const x1 = s.x1 ? s.x1 * 8 : room.pw;
      g.fillStyle = '#03050c';
      g.fillRect(0, y0, x1, h);
      for (let i = 0; i < (x1 * h) / 300; i++) {
        g.fillStyle = rnd() < 0.15 ? '#ffffff' : rnd() < 0.5 ? '#8aa0c8' : '#3b4a72';
        g.fillRect(Math.floor(rnd() * x1), y0 + Math.floor(rnd() * h), 1, 1);
      }
      g.fillStyle = 'rgba(159,216,232,0.06)';
      g.fillRect(0, y0, x1, h);
      g.fillStyle = '#1a2e24';
      for (let x = 0; x < x1; x += 40) g.fillRect(x, y0, 2, h);
      g.fillRect(0, y0 + h - 2, x1, 2);
      g.fillStyle = 'rgba(216,244,255,0.12)';
      for (let x = 6; x < x1; x += 40) g.fillRect(x, y0 + 2, 1, h - 6);
    },
    valves(g, s) {
      for (const [vx, vy] of s.at) {
        const x = vx * 8;
        const y = vy * 8;
        g.fillStyle = '#10121c';
        g.fillRect(x - 5, y - 5, 11, 11);
        g.fillStyle = '#a85a4a';
        g.fillRect(x - 4, y - 4, 9, 9);
        g.fillStyle = '#10121c';
        g.fillRect(x - 2, y - 2, 5, 5);
        g.fillStyle = '#c87a5a';
        g.fillRect(x, y - 4, 1, 9);
        g.fillRect(x - 4, y, 9, 1);
      }
    },
    // The Garden Lift's shaft: two cables from the ceiling down to the car.
    liftshaft(g, s) {
      const x = s.x * 8;
      for (const dx of [-6, 13]) {
        g.fillStyle = '#10121c';
        g.fillRect(x + dx, 0, 3, s.y * 8 - 20);
        g.fillStyle = '#3a4258';
        g.fillRect(x + dx + 1, 0, 1, s.y * 8 - 20);
      }
      g.fillStyle = '#16241b';
      g.fillRect(x - 10, 24, 28, s.y * 8 - 44);
    },
    // The ceiling rail the Pruner climbs to.
    rails(g, s) {
      const y = s.y * 8;
      g.fillStyle = '#10121c';
      g.fillRect(s.x0 * 8, y, (s.x1 - s.x0 + 1) * 8, 4);
      g.fillStyle = '#6c7894';
      g.fillRect(s.x0 * 8, y, (s.x1 - s.x0 + 1) * 8, 1);
      for (let x = s.x0 * 8; x < (s.x1 + 1) * 8; x += 24) {
        g.fillStyle = '#3a4258';
        g.fillRect(x, y - 8, 2, 8);
      }
    },
    // Clippings on a floor where something has been cutting.
    cuttings(g, s, rnd) {
      for (let x = s.x0 * 8; x < (s.x1 + 1) * 8; x += 2 + Math.floor(rnd() * 6)) {
        g.fillStyle = rnd() < 0.2 ? '#b04ad0' : rnd() < 0.5 ? '#3f7a4a' : '#2f5a3a';
        g.fillRect(x, s.y * 8 - 1, 2, 1);
      }
    },
    // The Seed Vault's shelves of sealed canisters.
    canisters(g, s, rnd) {
      for (let r = 0; r < s.rows; r++) {
        const y = (s.y + r * 3.4) * 8;
        g.fillStyle = '#3a4258';
        g.fillRect(s.x0 * 8, y + 14, (s.x1 - s.x0) * 8, 2);
        for (let x = s.x0 * 8 + 2; x < s.x1 * 8 - 6; x += 7) {
          g.fillStyle = '#10121c';
          g.fillRect(x, y + 3, 6, 11);
          g.fillStyle = rnd() < 0.5 ? '#b8c4c8' : '#a9b6cc';
          g.fillRect(x + 1, y + 4, 4, 9);
          g.fillStyle = ['#7ad1a0', '#ffb84d', '#c8d880', '#a85a4a'][Math.floor(rnd() * 4)];
          g.fillRect(x + 1, y + 7, 4, 2);
        }
      }
    },
    // Tall tanks of the Bloom, pink and glowing. They bubble (drawn live, below).
    vats(g, s) {
      for (const vx of s.at) {
        const x = vx * 8;
        const y = s.y * 8;
        const h = (19 - s.y) * 8;
        g.fillStyle = '#10121c';
        g.fillRect(x - 1, y - 1, 42, h + 1);
        g.fillStyle = '#2a1238';
        g.fillRect(x, y, 40, h);
        g.fillStyle = '#5c2479';
        g.fillRect(x + 2, y + 10, 36, h - 12);
        g.fillStyle = '#b04ad0';
        g.fillRect(x + 2, y + 10, 36, 2);
        g.fillStyle = 'rgba(216,244,255,0.15)';
        g.fillRect(x + 4, y + 2, 3, h - 6);
        g.fillStyle = '#3a4258';
        g.fillRect(x - 1, y - 4, 42, 3);
        g.fillRect(x + 6, y + h - 6, 28, 2);
      }
    },
    // The Gardener's gallery, behind the glass: clean white tiles, a bench, and her own door out.
    gallery(g, s) {
      const x0 = s.x0 * 8;
      const y = s.y * 8;
      const w = (s.x1 - s.x0 + 1) * 8;
      g.fillStyle = '#1c2a24';
      g.fillRect(x0, y, w, 48);
      g.fillStyle = '#24362e';
      for (let x = x0; x < x0 + w; x += 8) for (let yy = y; yy < y + 48; yy += 8) g.fillRect(x + 1, yy + 1, 6, 6);
      g.fillStyle = '#10121c';
      g.fillRect(x0 + w - 12, y + 18, 10, 30);
      g.fillStyle = '#05060d';
      g.fillRect(x0 + w - 11, y + 19, 8, 29);
      g.fillStyle = '#3a4258';
      g.fillRect(x0 + 10, y + 36, 20, 3);
      g.fillRect(x0 + 12, y + 39, 2, 9);
      g.fillRect(x0 + 26, y + 39, 2, 9);
      g.fillStyle = '#b04ad0';
      g.fillRect(x0 + 14, y + 33, 3, 3);
      g.fillStyle = '#7ad1a0';
      g.fillRect(x0 + 21, y + 32, 2, 4);
    },
  };

  // ---- Tiles ----
  function buildTiles(room, T) {
    const img = canvas(room.pw, room.ph);
    const g = img.getContext('2d');
    const P = T.tile;
    const solid = (tx, ty) => room.tile(tx, ty) === HA.room.SOLID;
    for (let ty = 0; ty < room.h; ty++) {
      for (let tx = 0; tx < room.w; tx++) {
        const t = room.tile(tx, ty);
        const x = tx * 8;
        const y = ty * 8;
        if (t === HA.room.SOLID) {
          const up = solid(tx, ty - 1);
          const down = solid(tx, ty + 1);
          const left = solid(tx - 1, ty);
          const right = solid(tx + 1, ty);
          if (up && down && left && right) {
            g.fillStyle = P.deep;
            g.fillRect(x, y, 8, 8);
            if ((tx + ty) % 2 === 0) {
              g.fillStyle = P.deep2;
              g.fillRect(x + 2, y + 2, 4, 4);
            }
            continue;
          }
          g.fillStyle = P.face;
          g.fillRect(x, y, 8, 8);
          g.fillStyle = P.inner;
          g.fillRect(x + 1, y + 1, 6, 6);
          g.fillStyle = P.speck;
          if ((tx + ty) % 3 === 0) {
            g.fillRect(x + 1, y + 2, 1, 1);
            g.fillRect(x + 6, y + 5, 1, 1);
          }
          if (!up) {
            g.fillStyle = P.lip;
            g.fillRect(x, y, 8, 1);
            g.fillStyle = P.lip2;
            g.fillRect(x, y + 1, 8, 1);
          }
          if (!down) {
            g.fillStyle = P.under;
            g.fillRect(x, y + 7, 8, 1);
          }
          if (!left) {
            g.fillStyle = P.left;
            g.fillRect(x, y + (up ? 0 : 1), 1, up ? 8 : 7);
          }
          if (!right) {
            g.fillStyle = P.right;
            g.fillRect(x + 7, y + (up ? 0 : 1), 1, up ? 8 : 7);
          }
        } else if (t === HA.room.ONEWAY) {
          const [a, b, c, d] = T.walk;
          g.fillStyle = a;
          g.fillRect(x, y, 8, 1);
          g.fillStyle = b;
          g.fillRect(x, y + 1, 8, 1);
          g.fillStyle = c;
          g.fillRect(x, y + 2, 8, 1);
          g.fillStyle = d;
          g.fillRect(x + 1, y + 3, 1, 2);
          g.fillRect(x + 5, y + 3, 1, 2);
        } else if (t === HA.room.THORNS) {
          g.fillStyle = '#2a0f36';
          g.fillRect(x, y + 5, 8, 3);
          for (const sx of [1, 5]) {
            g.fillStyle = '#b04ad0';
            g.fillRect(x + sx, y + 2, 2, 3);
            g.fillStyle = '#f27ad8';
            g.fillRect(x + sx, y, 1, 3);
            g.fillStyle = '#5c2479';
            g.fillRect(x + sx - 1, y + 4, 4, 1);
          }
        }
      }
    }
    return img;
  }

  function buildVignette(T) {
    const img = canvas(HA.VIEW_W, HA.VIEW_H);
    const g = img.getContext('2d');
    const grad = g.createRadialGradient(160, 90, 70, 160, 90, 200);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, T.edge);
    g.fillStyle = grad;
    g.fillRect(0, 0, HA.VIEW_W, HA.VIEW_H);
    return img;
  }

  // ---- Props drawn every frame ----
  function drawBack(g, world, cam) {
    const hiding = world.npcs.filter((n) => n.state === 'hidden').length;
    for (const s of world.def.scenery || []) {
      if (s.kind === 'fire') drawFire(g, world, s, cam);
      if (s.kind === 'homes' && hiding) drawWatchers(g, world, s, cam, hiding);
      if (s.kind === 'vats') drawBubbles(g, world, s, cam);
    }
    if (world.def.cradles) drawCradles(g, world, world.def.cradles, cam);
    if (world.heroPod) drawPod(g, world, world.heroPod, cam);
    if (world.maraPod) drawPod(g, world, world.maraPod, cam);
  }

  function drawFire(g, world, s, cam) {
    const x = Math.round(s.x * 8 - cam.x);
    const y = Math.round(s.y * 8 + 8 - cam.y);
    const night = (world.state.flags.night && !world.state.flags.reunion) || world.nightScene;
    const glow = g.createRadialGradient(x, y - 4, 0, x, y - 4, night ? 24 : 40);
    glow.addColorStop(0, 'rgba(255,155,61,0.28)');
    glow.addColorStop(1, 'rgba(255,155,61,0)');
    g.fillStyle = glow;
    g.fillRect(x - 40, y - 44, 80, 80);
    g.fillStyle = '#3a2818';
    g.fillRect(x - 6, y - 2, 12, 2);
    if (night && world.state.flags.raid && !world.nightScene) return; // the fire went out in the raid
    const f = world.time;
    for (let i = 0; i < 4; i++) {
      const h = 3 + ((f / 4 + i * 7) % 5);
      g.fillStyle = i % 2 ? '#ff9b3d' : '#ffb84d';
      g.fillRect(x - 4 + i * 2, y - 2 - h, 2, h);
    }
    g.fillStyle = '#fff0a8';
    g.fillRect(x - 1, y - 4 - (f % 8 < 4 ? 1 : 0), 2, 2);
  }

  // Hullfolk who are hiding watch from their doorways, and duck back when the hero comes close.
  function drawWatchers(g, world, s, cam, hiding) {
    const p = world.player;
    s.at.forEach(([hx, hy], i) => {
      if (i >= hiding + 2) return;
      const x = hx * 8;
      const y = hy * 8;
      if (Math.abs(p.x + 4 - x) < 40 && Math.abs(p.y - y) < 40) return;
      if (Math.floor((world.time + i * 37) / 9) % 23 === 0) return; // blink
      g.fillStyle = '#e9e4d8';
      g.fillRect(Math.round(x - 2 - cam.x), Math.round(y - 8 - cam.y), 1, 2);
      g.fillRect(Math.round(x + 1 - cam.x), Math.round(y - 8 - cam.y), 1, 2);
    });
  }

  // The pod the hero wakes in. Before the thaw it hangs from the rack's clamps, frosted over. It falls, the
  // lid blows off, and from then on it lies open under the empty clamps, the lid on the deck beside it.
  // Mara's pod (steady) hangs beside it all game, its light a calm cyan.
  function drawPod(g, world, pod, cam) {
    const x = Math.round(pod.x - cam.x);
    const y = Math.round(pod.y - cam.y);
    const cy = Math.round(pod.ceil - cam.y);
    const holding = pod.state === 'hanging';
    // the clamps: a bar under the ceiling and two arms that grip, then hang open
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, cy, 16, 3);
    g.fillStyle = '#3a4258';
    g.fillRect(x, cy, 14, 2);
    const spread = holding ? 0 : 2;
    g.fillStyle = '#6c7894';
    g.fillRect(x + 1 - spread, cy + 2, 2, 4);
    g.fillRect(x + 11 + spread, cy + 2, 2, 4);
    if (!holding && world.time % 131 < 3) {
      g.fillStyle = world.time % 2 ? '#fff0a8' : '#ffb84d';
      g.fillRect(x + 6 + (world.time % 3), cy + 3, 1, 1);
    }
    // the pod
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 14, 23);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 1, y + 1, 12, 21);
    g.fillStyle = '#6c7894';
    g.fillRect(x + 1, y + 1, 12, 1);
    if (pod.state !== 'open') {
      g.fillStyle = '#9fd8e8';
      g.fillRect(x + 3, y + 3, 8, 15);
      g.fillStyle = '#d8f4ff';
      g.fillRect(x + 4, y + 4, 2, 9);
      g.fillStyle = '#5fa8c0';
      g.fillRect(x + 7, y + 10, 3, 6);
      if (pod.state === 'landed') {
        // cracked in the fall
        g.fillStyle = '#eef4f6';
        for (const [cx, cyy] of [[8, 5], [7, 6], [7, 7], [6, 8], [9, 8], [10, 9], [5, 9], [4, 11]]) g.fillRect(x + cx, y + cyy, 1, 1);
      }
    } else {
      g.fillStyle = '#05060d';
      g.fillRect(x + 3, y + 3, 8, 15);
      g.fillStyle = '#1d3b52';
      g.fillRect(x + 3, y + 3, 1, 15);
    }
    g.fillStyle = Math.floor(world.time / 30) % 2 && pod.state !== 'open' && !pod.steady ? '#e8434f' : '#5fd4e8';
    g.fillRect(x + 6, y + 19, 2, 1);
    // the lid: flying, then lying on the deck
    const lid = pod.lid;
    if (lid) {
      const lx = Math.round(lid.x - cam.x);
      const ly = Math.round(lid.y - cam.y);
      if (lid.flat) {
        g.fillStyle = '#10121c';
        g.fillRect(lx, ly, 17, 3);
        g.fillStyle = '#9fd8e8';
        g.fillRect(lx + 1, ly + 1, 15, 1);
        g.fillStyle = '#d8f4ff';
        g.fillRect(lx + 3, ly + 1, 4, 1);
      } else {
        g.fillStyle = '#10121c';
        g.fillRect(lx, ly, 10, 17);
        g.fillStyle = '#9fd8e8';
        g.fillRect(lx + 1, ly + 1, 8, 15);
        g.fillStyle = '#d8f4ff';
        g.fillRect(lx + 2, ly + 2, 2, 9);
      }
    }
  }

  // Bubbles rising in the Bloom vats.
  function drawBubbles(g, world, s, cam) {
    for (const vx of s.at) {
      const top = s.y * 8 + 12;
      const h = (19 - s.y) * 8 - 14;
      for (let i = 0; i < 5; i++) {
        const t = (world.time * 0.4 + i * 37 + vx * 13) % h;
        const x = Math.round(vx * 8 + 6 + ((i * 7 + vx * 3) % 28) - cam.x);
        const y = Math.round(top + h - t - cam.y);
        g.fillStyle = i % 2 ? '#f27ad8' : '#ffc2dc';
        g.fillRect(x, y, i % 3 ? 1 : 2, i % 3 ? 1 : 2);
      }
    }
  }

  // The cradles where the taken sleep: two racks of six along the back wall of the Root Cellar.
  // Shut, they're frosted, with a sleeper inside and the Bloom pink at the seams. Once opened they lie empty,
  // except the ones whose sleepers didn't wake (if the Pruner was finished). The last is Sorrel's, empty all along.
  const DARK = [2, 4, 7, 9];
  function cradleSpot(c, i) {
    return { x: c.x * 8 + (i % 6) * 34, y: c.y * 8 + Math.floor(i / 6) * 24 };
  }
  function drawCradles(g, world, c, cam) {
    const s = world.state;
    const open = !!s.flags.cradles;
    const opening = world.cradlesOpening || 0; // during the wake scene, how many have opened so far
    for (let i = 0; i < c.n; i++) {
      const { x: px, y: py } = cradleSpot(c, i);
      const x = Math.round(px - cam.x);
      const y = Math.round(py - cam.y);
      const sorrel = i === c.n - 1;
      const dark = s.wardens.pruner === 'salvage' && DARK.includes(i);
      const isOpen = !sorrel && !dark && (open || i < opening);
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 1, 30, 13);
      g.fillStyle = '#3a4258';
      g.fillRect(x, y, 28, 11);
      g.fillStyle = '#6c7894';
      g.fillRect(x, y + 10, 28, 1);
      g.fillRect(x + 4, y + 11, 2, 6);
      g.fillRect(x + 22, y + 11, 2, 6);
      if (isOpen) {
        g.fillStyle = '#05060d';
        g.fillRect(x + 2, y + 2, 24, 7);
        g.fillStyle = '#1d3b52';
        g.fillRect(x + 2, y + 2, 24, 1);
        continue;
      }
      g.fillStyle = sorrel ? '#123247' : dark && (open || opening) ? '#2a3046' : '#9fd8e8';
      g.fillRect(x + 2, y + 2, 24, 7);
      if (!sorrel) {
        // the sleeper under the frost
        g.fillStyle = dark && (open || opening) ? '#1a1e2c' : '#6f9fb4';
        g.fillRect(x + 5, y + 4, 4, 3);
        g.fillRect(x + 9, y + 4, 13, 4);
        g.fillStyle = '#d8f4ff';
        g.fillRect(x + 3, y + 2, 6, 1);
        // the Bloom, pink at the seams
        if (!(dark && (open || opening))) {
          g.fillStyle = Math.floor((world.time + i * 23) / 40) % 2 ? '#f27ad8' : '#b04ad0';
          g.fillRect(x + 1, y + 1, 1, 9);
          g.fillRect(x + 26, y + 1, 1, 9);
          g.fillRect(x + 2, y + 1, 4 + (i % 4) * 3, 1);
        }
      } else {
        // Sorrel's name card
        g.fillStyle = '#e9e4d8';
        g.fillRect(x + 10, y + 4, 8, 3);
        g.fillStyle = '#6c7894';
        g.fillRect(x + 11, y + 5, 6, 1);
      }
      const lit = sorrel ? null : dark && (open || opening) ? '#e8434f' : Math.floor((world.time + i * 11) / 30) % 2 ? '#5fd4e8' : '#3f8fa8';
      if (lit) {
        g.fillStyle = lit;
        g.fillRect(x + 13, y + 10, 2, 1);
      }
    }
  }

  // The Garden Lift's car: a cage on its cables, the lamp red while it's locked and green once it will run.
  function drawLift(g, world, l, cam) {
    const x = Math.round(l.x - cam.x);
    const y = Math.round(l.y - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 24, 22);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 1, y + 1, 22, 2);
    g.fillRect(x + 1, y + 19, 22, 3);
    g.fillStyle = '#6c7894';
    for (let b = 2; b < 23; b += 4) g.fillRect(x + b, y + 3, 1, 16);
    g.fillStyle = '#a9b6cc';
    g.fillRect(x + 1, y + 1, 22, 1);
    g.fillStyle = world.state.flags.cradles ? '#7ad1a0' : '#e8434f';
    g.fillRect(x + 11, y + 5, 2, 2);
  }

  // Thick glass: the Gardener's gallery is behind it. Nothing gets through.
  function drawGlass(g, world, cam) {
    for (const c of world.glass) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      g.fillStyle = 'rgba(159,216,232,0.22)';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = 'rgba(216,244,255,0.5)';
      if ((c.tx + c.ty) % 3 === 0) g.fillRect(x + 2, y + 1, 1, 5);
      g.fillStyle = '#6c7894';
      g.fillRect(x, y, 1, 8);
    }
  }

  function drawTerminal(g, world, l, cam) {
    const x = Math.round(l.x - cam.x);
    const y = Math.round(l.y - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 10, 12);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 1, y + 1, 8, 10);
    g.fillStyle = l.read ? '#123247' : '#0e3a2c';
    g.fillRect(x + 2, y + 2, 6, 5);
    g.fillStyle = l.read ? '#5fd4e8' : '#7ad1a0';
    for (let i = 0; i < 3; i++) if ((world.time / 20 + i) % 4 > 1) g.fillRect(x + 3, y + 3 + i * 1.5, 1 + ((i * 3) % 4), 1);
    // A glint on everything that can be used, so nothing hides in an unmarked pixel.
    if (!l.read && Math.floor(world.time / 16) % 4 === 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(x + 8, y + 1, 1, 1);
    }
  }

  function drawDoor(g, world, d, cam) {
    for (const c of d.cells) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      g.fillStyle = '#10121c';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = '#3a3040';
      g.fillRect(x + 1, y, 6, 8);
      g.fillStyle = (c.ty + Math.floor(world.time / 30)) % 2 ? '#ffb84d' : '#3a2a10';
      g.fillRect(x + 1, y + 3, 6, 2);
    }
  }

  function drawCage(g, world, cage, cam) {
    const x = Math.round(cage.x - cam.x);
    const y = Math.round(cage.y - cam.y);
    g.fillStyle = '#3a3040';
    g.fillRect(x + 11, y - 30, 2, 30);
    if (cage.shim && !cage.open) {
      const spr = HA.art.people.shim.idle;
      g.drawImage(spr.img, x + 8, y + 22 - spr.h - 1);
    }
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 24, 2);
    g.fillRect(x, y + 20, 24, 2);
    g.fillStyle = '#6c7894';
    for (let b = 1; b < 24; b += 4) if (!(cage.open && b > 8 && b < 16)) g.fillRect(x + b, y + 1, 1, 20);
    g.fillStyle = '#a9b6cc';
    g.fillRect(x, y, 24, 1);
    g.fillStyle = cage.open ? '#3a4258' : '#e8434f';
    g.fillRect(x + 10, y + 9, 4, 3);
  }

  function drawLight(g, world) {
    const f = world.state.flags;
    g.drawImage(world.layers.vignette, 0, 0);
    if (world.def.area === 'warrens' && f.night && !f.reunion) {
      g.fillStyle = 'rgba(4,3,8,0.35)';
      g.fillRect(0, 0, HA.VIEW_W, HA.VIEW_H);
    }
    // The night after the reunion: dark everywhere but around the fire.
    const fire = world.nightScene && (world.def.scenery || []).find((s) => s.kind === 'fire');
    if (fire) {
      const x = Math.round(fire.x * 8 - world.cam.x);
      const y = Math.round(fire.y * 8 + 4 - world.cam.y);
      const dark = g.createRadialGradient(x, y, 18, x, y, 120);
      dark.addColorStop(0, 'rgba(4,3,8,0)');
      dark.addColorStop(1, 'rgba(4,3,8,0.6)');
      g.fillStyle = dark;
      g.fillRect(0, 0, HA.VIEW_W, HA.VIEW_H);
    }
  }

  HA.scenery = { THEMES, layers, drawBack, drawTerminal, drawDoor, drawCage, drawLight, drawLift, drawGlass, cradleSpot };
})(window.HA);
