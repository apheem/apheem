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
    // The Cargo Labyrinth: rust and hazard yellow under cold white strip-lights, and the containers' colours.
    cargo: {
      bg: '#0c0b0c',
      panel: '#131112',
      panelEdge: '#191617',
      panelMark: '#211b19',
      conduit: ['#1d1512', '#2e1f17', '#3d281b'],
      light: 'rgba(214,236,255,0.15)',
      lamp: '#d6ecff',
      tile: { deep: '#15110f', deep2: '#1a1512', face: '#3a2a20', inner: '#4a3526', speck: '#6a4a30', lip: '#ffb84d', lip2: '#a8643a', under: '#0b0807', left: '#5a3e2a', right: '#22170f' },
      walk: ['#ffd84d', '#8a6a2a', '#3a2a18', '#2a1e12'],
      edge: 'rgba(4,3,2,0.6)',
      stripLights: true,
    },
    // The Flooded Ballast: dark teal water and wet walls, rust, and sodium-orange work lamps.
    ballast: {
      bg: '#050b0b',
      panel: '#091211',
      panelEdge: '#0d1817',
      panelMark: '#112120',
      conduit: ['#1c1410', '#2e1d14', '#46291a'],
      light: 'rgba(255,150,60,0.17)',
      lamp: '#ff9b3d',
      tile: { deep: '#0e1413', deep2: '#111917', face: '#2a2620', inner: '#38302a', speck: '#5a4030', lip: '#ff9b3d', lip2: '#8a4a26', under: '#060909', left: '#4a3626', right: '#141210' },
      walk: ['#c98a4a', '#7a5030', '#3a2a1c', '#2a1e14'],
      edge: 'rgba(1,4,4,0.62)',
    },
    // The Engine Spine: steel grey and soot, lit white-orange by the reactor up its middle, steam everywhere.
    // Its thorns are hot grilles.
    spine: {
      bg: '#0b0a0c',
      panel: '#121114',
      panelEdge: '#18161a',
      panelMark: '#201c1f',
      conduit: ['#1e1a1c', '#33282a', '#4a3226'],
      light: 'rgba(255,176,112,0.16)',
      lamp: '#ffb070',
      tile: { deep: '#141317', deep2: '#18171c', face: '#34343c', inner: '#44444e', speck: '#5e5e6a', lip: '#ffb070', lip2: '#9a5a32', under: '#08080a', left: '#585864', right: '#1c1c22' },
      walk: ['#c9d0d8', '#7a8090', '#3e4250', '#2a2c36'],
      edge: 'rgba(6,3,2,0.6)',
      heat: true,
    },
    // The Command Tower: cold marble and brass, and the deep blue night through tall windows.
    tower: {
      bg: '#0b0d14',
      panel: '#11141d',
      panelEdge: '#181c28',
      panelMark: '#1e2230',
      conduit: ['#1c1a16', '#3a3222', '#6a5630'],
      light: 'rgba(232,220,192,0.15)',
      lamp: '#e8dcc0',
      tile: { deep: '#15161c', deep2: '#191a21', face: '#8a8c96', inner: '#b4b4bc', speck: '#d8d6dc', lip: '#ffd88a', lip2: '#a87a3a', under: '#0a0a10', left: '#c8c8d0', right: '#4a4a56' },
      walk: ['#ffd88a', '#a87a3a', '#5a4428', '#3a2c1a'],
      edge: 'rgba(2,3,10,0.6)',
      marble: true,
    },
    // The Dreaming Deck: black, with the ship's courses drawn over it in cyan. Its thorns are static.
    deck: {
      bg: '#030509',
      edge: 'rgba(0,1,4,0.62)',
      tile: { deep: '#05070c', deep2: '#070a10', face: '#0c1219', inner: '#0e151d', speck: '#1a3a48', lip: '#5fd4e8', lip2: '#1a4a58', under: '#020305', left: '#1a3a48', right: '#05080c' },
      walk: ['#b8f4ff', '#5fd4e8', '#1a4a58', '#0e2a34'],
      plain: true,
      static: true,
    },
    // The memory halls: earlier decks as the Navigator remembers them, washed out like an old photograph, the
    // screen's edges going white instead of dark.
    memory: {
      bg: '#1e232c',
      edge: 'rgba(226,240,248,0.24)',
      tile: { deep: '#2a303a', deep2: '#2e343e', face: '#58606e', inner: '#6a7280', speck: '#8a92a0', lip: '#f0f8fc', lip2: '#b0c0cc', under: '#20262e', left: '#7a8290', right: '#3a404a' },
      walk: ['#f0f8fc', '#b0c0cc', '#6a7280', '#4a525e'],
      plain: true,
      static: true,
    },
  };
  // Container colours: rust, teal, olive, ochre, slate and plum, each with a lit top edge and a dark rib.
  const CONTAINERS = [
    ['#6e3424', '#8e4a34', '#4a2218'],
    ['#2a4f5c', '#3c6a78', '#1a343e'],
    ['#55552a', '#70703a', '#38381a'],
    ['#7a4f22', '#9a6a32', '#523416'],
    ['#343f5c', '#4a5878', '#222a3e'],
    ['#4f2840', '#6a3a56', '#341a2a'],
  ];
  const HAZARD = ['#c9a227', '#ffd84d', '#7a6214'];

  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    return h >>> 0;
  };

  const cache = new Map();
  function layers(def, room) {
    if (cache.has(def.id)) return cache.get(def.id);
    const theme = THEMES[def.theme || HA.rooms.AREAS[def.area].theme]; // a room can dress as another deck
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
    // A plain room (the Dreaming Deck) has no walls to speak of: its props draw everything.
    if (T.plain) {
      for (const s of def.scenery || []) PROPS[s.kind] && PROPS[s.kind](g, s, rnd, T, room);
      return img;
    }
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
        if (T.stripLights) {
          // a long cold tube, and its light falling in a cone
          const cone = g.createLinearGradient(0, ly, 0, ly + 44);
          cone.addColorStop(0, T.light);
          cone.addColorStop(1, 'rgba(0,0,0,0)');
          g.fillStyle = cone;
          g.beginPath();
          g.moveTo(x - 10, ly + 1);
          g.lineTo(x + 10, ly + 1);
          g.lineTo(x + 26, ly + 44);
          g.lineTo(x - 26, ly + 44);
          g.fill();
          g.fillStyle = '#10121c';
          g.fillRect(x - 11, ly - 1, 22, 3);
          g.fillStyle = T.lamp;
          g.fillRect(x - 10, ly, 20, 1);
          continue;
        }
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
    // The Garden Lift's shaft: two cables from the ceiling down to the car. The Warrens' stop has its own colour.
    liftshaft(g, s) {
      const x = s.x * 8;
      for (const dx of [-6, 13]) {
        g.fillStyle = '#10121c';
        g.fillRect(x + dx, 0, 3, s.y * 8 - 20);
        g.fillStyle = '#3a4258';
        g.fillRect(x + dx + 1, 0, 1, s.y * 8 - 20);
      }
      g.fillStyle = s.color || '#16241b';
      g.fillRect(x - 10, 24, 28, s.y * 8 - 44);
    },
    // The old crew's keel tram, dead at its platform: a cable car under its cable, which runs off east into the
    // dark of the keel tunnel.
    tram(g, s) {
      const x = s.x * 8;
      const y = s.y * 8 + 8;
      g.fillStyle = '#05060d';
      g.fillRect(s.tunnel * 8, y - 52, (s.x1 - s.tunnel) * 8, 52);
      g.fillStyle = '#3a2818';
      g.fillRect(s.tunnel * 8 - 3, y - 55, 3, 55);
      g.fillRect(s.tunnel * 8 - 3, y - 55, (s.x1 - s.tunnel) * 8 + 3, 3);
      // the cable, from its wheel on the platform wall into the tunnel
      g.fillStyle = '#10121c';
      g.fillRect(x - 24, y - 44, s.x1 * 8 - x + 24, 2);
      g.fillStyle = '#6c7894';
      g.fillRect(x - 24, y - 44, s.x1 * 8 - x + 24, 1);
      g.fillStyle = '#10121c';
      g.fillRect(x - 31, y - 51, 15, 15);
      g.fillStyle = '#3a4258';
      g.fillRect(x - 30, y - 50, 13, 13);
      g.fillStyle = '#10121c';
      g.fillRect(x - 26, y - 46, 5, 5);
      g.fillStyle = '#a8743a';
      g.fillRect(x - 25, y - 45, 3, 3);
      // the car
      g.fillStyle = '#10121c';
      g.fillRect(x - 1, y - 37, 66, 35);
      g.fillStyle = '#5a4028';
      g.fillRect(x, y - 36, 64, 33);
      g.fillStyle = '#8a5a2b';
      g.fillRect(x, y - 36, 64, 2);
      g.fillStyle = '#3a2818';
      g.fillRect(x, y - 12, 64, 2);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = '#10121c';
        g.fillRect(x + 5 + i * 15, y - 31, 11, 13);
        g.fillStyle = '#1a2a30';
        g.fillRect(x + 6 + i * 15, y - 30, 9, 11);
        g.fillStyle = 'rgba(216,244,255,0.18)';
        g.fillRect(x + 7 + i * 15, y - 29, 2, 6);
      }
      // the hanger up to the cable, and the dead lamp on the nose
      g.fillStyle = '#3a4258';
      g.fillRect(x + 30, y - 44, 4, 8);
      g.fillStyle = '#10121c';
      g.fillRect(x + 62, y - 24, 4, 4);
      g.fillStyle = '#3a2a10';
      g.fillRect(x + 63, y - 23, 2, 2);
      g.fillStyle = '#c98a4a';
      g.globalAlpha = 0.6;
      HA.font.draw(g, 'KEEL LINE', x + 9, y - 9, '#c98a4a', { shadow: null });
      g.globalAlpha = 1;
      // the platform's edge, and the car's wheels on the track bed below it
      g.fillStyle = '#10121c';
      for (const wx of [8, 50]) g.fillRect(x + wx, y - 3, 6, 3);
    },
    // Solder's chalk: quick white letters, the way she marks a route.
    chalk(g, s) {
      g.globalAlpha = 0.7;
      HA.font.draw(g, s.text, s.x * 8, s.y * 8, '#e6e2d6', { shadow: null });
      g.globalAlpha = 1;
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
    // ---- The Cargo Labyrinth ----
    // Stacks of containers far back in the dark, for depth. y is the floor row they stand on.
    stacks(g, s, rnd) {
      for (let x = s.x0 * 8; x < s.x1 * 8 - 32; x += 34 + Math.floor(rnd() * 8)) {
        const n = 1 + Math.floor(rnd() * (s.h || 3));
        for (let i = 0; i < n; i++) {
          const y = s.y * 8 - (i + 1) * 17;
          const C = CONTAINERS[Math.floor(rnd() * CONTAINERS.length)];
          g.globalAlpha = 0.3;
          g.fillStyle = C[0];
          g.fillRect(x, y, 32, 16);
          g.fillStyle = C[2];
          for (let r = 3; r < 32; r += 3) g.fillRect(x + r, y + 2, 1, 13);
          g.fillStyle = C[1];
          g.fillRect(x, y, 32, 1);
          g.globalAlpha = 1;
        }
      }
    },
    // The gantry rail a crane runs on, under the ceiling, with hazard stripes at its stops.
    cranerail(g, s) {
      const y = s.y * 8;
      const x0 = s.x0 * 8;
      const w = (s.x1 - s.x0 + 1) * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x0, y, w, 5);
      g.fillStyle = '#5a4a3a';
      g.fillRect(x0, y + 1, w, 2);
      g.fillStyle = '#8a6a4a';
      g.fillRect(x0, y + 1, w, 1);
      for (let x = x0; x < x0 + w; x += 32) {
        g.fillStyle = '#3a2a20';
        g.fillRect(x + 2, y - 8, 2, 8);
      }
      for (const ex of [x0, x0 + w - 6]) {
        for (let i = 0; i < 6; i += 2) {
          g.fillStyle = HAZARD[1];
          g.fillRect(ex + i, y - 1, 1, 7);
        }
      }
    },
    // Tall shelving in the Long Aisle, boxes on every shelf.
    shelves(g, s, rnd) {
      for (let x = s.x0 * 8; x < s.x1 * 8; x += 56) {
        const top = (s.y - s.h) * 8;
        g.fillStyle = '#1a1412';
        g.fillRect(x, top, 3, s.h * 8);
        g.fillRect(x + 45, top, 3, s.h * 8);
        for (let y = top + 6; y < s.y * 8; y += 18) {
          g.fillStyle = '#2a201a';
          g.fillRect(x, y, 48, 2);
          for (let bx = x + 4; bx < x + 44; bx += 7 + Math.floor(rnd() * 4)) {
            if (rnd() < 0.25) continue;
            const h = 5 + Math.floor(rnd() * 8);
            g.fillStyle = rnd() < 0.5 ? '#3a2c20' : '#2e2620';
            g.fillRect(bx, y - h, 6, h);
            g.fillStyle = '#4a3a2a';
            g.fillRect(bx, y - h, 6, 1);
          }
        }
      }
    },
    // Sorting machinery on the back wall: hoppers with chutes running down from them.
    chutes(g, s, rnd) {
      for (const [cx, cy, len] of s.at) {
        const x = cx * 8;
        const y = cy * 8;
        g.fillStyle = '#1d1512';
        g.fillRect(x - 10, y, 28, 10);
        g.fillStyle = '#2e1f17';
        g.fillRect(x - 8, y + 2, 24, 6);
        g.fillStyle = '#1a1210';
        g.fillRect(x, y + 10, 8, len * 8);
        g.fillStyle = '#3d281b';
        g.fillRect(x + 1, y + 10, 1, len * 8);
        g.fillStyle = HAZARD[0];
        g.fillRect(x - 10, y, 28, 1);
        if (rnd() < 0.5) g.fillRect(x + 2, y + 4, 4, 2);
      }
    },
    // The Armory's racks: hooks and outlines where the guns used to hang.
    racks(g, s, rnd) {
      for (let x = s.x0 * 8; x < s.x1 * 8; x += 40) {
        const y = s.y * 8;
        g.fillStyle = '#1a1412';
        g.fillRect(x, y, 34, 30);
        g.fillStyle = '#2a201a';
        g.fillRect(x + 1, y + 1, 32, 28);
        for (let r = 0; r < 3; r++) {
          g.fillStyle = '#3a2c20';
          g.fillRect(x + 3, y + 7 + r * 9, 28, 1);
          if (rnd() < 0.3) {
            g.fillStyle = '#4a4a52';
            g.fillRect(x + 6, y + 4 + r * 9, 18, 2);
          } else {
            g.fillStyle = '#211a16';
            g.fillRect(x + 6, y + 4 + r * 9, 18, 2);
          }
        }
      }
    },
    // The Purser's desk: a lamp, a ledger and a cup, and the Steward's lists pinned up behind it.
    desk(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x, y - 10, 36, 10);
      g.fillStyle = '#4a3020';
      g.fillRect(x + 1, y - 9, 34, 3);
      g.fillStyle = '#3a2418';
      g.fillRect(x + 2, y - 6, 3, 6);
      g.fillRect(x + 31, y - 6, 3, 6);
      g.fillStyle = '#e6e2d6';
      g.fillRect(x + 8, y - 11, 9, 2);
      g.fillStyle = '#6c7894';
      g.fillRect(x + 25, y - 14, 1, 5);
      g.fillStyle = '#fff0a8';
      g.fillRect(x + 23, y - 15, 5, 2);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = i % 2 ? '#d8cfc0' : '#e6e2d6';
        g.fillRect(x + 2 + i * 9, y - 40, 7, 10);
        g.fillStyle = '#6c7894';
        for (let l = 0; l < 4; l++) g.fillRect(x + 3 + i * 9, y - 38 + l * 2, 5, 1);
      }
    },
    // Frost on the Cold Store's walls, and icicles from every ceiling.
    frost(g, s, rnd, T, room) {
      for (let i = 0; i < (s.n || 80); i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(216,244,255,0.12)' : 'rgba(159,216,232,0.1)';
        g.fillRect(Math.floor(rnd() * room.pw), Math.floor(rnd() * room.ph), 2 + Math.floor(rnd() * 6), 1);
      }
      for (let tx = 1; tx < room.w - 1; tx++) {
        for (let ty = 1; ty < room.h - 1; ty++) {
          if (room.tile(tx, ty) !== HA.room.EMPTY || room.tile(tx, ty - 1) !== HA.room.SOLID || rnd() < 0.55) continue;
          const len = 2 + Math.floor(rnd() * 5);
          g.fillStyle = '#9fd8e8';
          g.fillRect(tx * 8 + Math.floor(rnd() * 6), ty * 8, 1, len);
        }
      }
    },
    // The Lifeboat Dock's empty cradles, and the hull doors under them.
    berths(g, s) {
      for (const bx of s.at) {
        const x = bx * 8;
        const y = s.y * 8;
        g.fillStyle = '#1a1412';
        g.fillRect(x, y - 3, 48, 3);
        g.fillRect(x + 4, y - 14, 3, 11);
        g.fillRect(x + 41, y - 14, 3, 11);
        g.fillStyle = HAZARD[2];
        for (let i = 0; i < 48; i += 6) g.fillRect(x + i, y - 3, 3, 1);
      }
    },
    // The last boat: a short-range lifeboat, nose to the hull doors, its canopy dark over the pilot's seat.
    boat(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x, y - 22, 56, 18);
      g.fillRect(x + 56, y - 18, 6, 10);
      g.fillStyle = '#a9b6cc';
      g.fillRect(x + 1, y - 21, 54, 16);
      g.fillStyle = '#6c7894';
      g.fillRect(x + 1, y - 10, 54, 5);
      g.fillStyle = '#e8434f';
      g.fillRect(x + 4, y - 13, 28, 1);
      g.fillStyle = '#1d3b52';
      g.fillRect(x + 36, y - 19, 16, 6);
      g.fillStyle = '#5fd4e8';
      g.fillRect(x + 37, y - 19, 4, 1);
      g.fillStyle = '#3a4258';
      g.fillRect(x + 6, y - 4, 10, 4);
      g.fillRect(x + 40, y - 4, 10, 4);
      HA.font.draw(g, 'LB-7', x + 8, y - 20, '#3a4258', { shadow: null });
    },
    // Big stencilled deck numbers, half worn away.
    stencil(g, s) {
      g.globalAlpha = 0.35;
      HA.font.draw(g, s.text, s.x * 8, s.y * 8, HAZARD[0], { shadow: null });
      g.globalAlpha = 1;
    },

    // ---- The Flooded Ballast ----
    // A great riveted tank behind the walkways, with a level gauge down its side.
    tanks(g, s, rnd) {
      for (const [x0, y0, x1, y1, n] of s.at) {
        const x = x0 * 8;
        const y = y0 * 8;
        const w = (x1 - x0 + 1) * 8;
        const h = (y1 - y0 + 1) * 8;
        g.fillStyle = '#0c1615';
        g.fillRect(x + 4, y, w - 8, h);
        g.fillRect(x, y + 4, w, h - 8);
        g.fillStyle = '#132220';
        g.fillRect(x + 5, y + 1, w - 10, 2);
        for (let ry = y + 10; ry < y + h - 6; ry += 16) {
          g.fillStyle = '#16282a';
          g.fillRect(x + 2, ry, w - 4, 1);
          for (let rx = x + 6; rx < x + w - 4; rx += 8) {
            g.fillStyle = '#1e3432';
            g.fillRect(rx, ry - 2, 1, 1);
          }
        }
        // the gauge: a glass tube, and how full the tank still is
        const gx = x + w - 10;
        const level = y + 8 + Math.floor((h - 16) * (0.2 + rnd() * 0.5));
        g.fillStyle = '#05060d';
        g.fillRect(gx, y + 8, 4, h - 16);
        g.fillStyle = '#2a6a64';
        g.fillRect(gx + 1, level, 2, y + h - 8 - level);
        g.globalAlpha = 0.35;
        HA.font.draw(g, 'TANK ' + n, x + 8, y + 8, '#c98a4a', { shadow: null });
        g.globalAlpha = 1;
      }
    },
    // Pump housings along a wall, each with its number stencilled on.
    pumps(g, s) {
      for (const [px, py, n] of s.at) {
        const x = px * 8;
        const y = py * 8 + 8;
        g.fillStyle = '#10121c';
        g.fillRect(x - 13, y - 34, 27, 34);
        g.fillStyle = '#3a2a20';
        g.fillRect(x - 12, y - 33, 25, 32);
        g.fillStyle = '#5a3a26';
        g.fillRect(x - 12, y - 33, 25, 2);
        g.fillStyle = '#241812';
        for (let i = 0; i < 4; i++) g.fillRect(x - 9 + i * 6, y - 26, 3, 14);
        g.fillStyle = '#10121c';
        g.fillRect(x - 3, y - 46, 7, 13);
        g.fillStyle = '#46291a';
        g.fillRect(x - 2, y - 46, 5, 12);
        g.globalAlpha = 0.6;
        HA.font.draw(g, 'PUMP ' + n, x - 11, y - 9, '#ffb84d', { shadow: null });
        g.globalAlpha = 1;
      }
    },
    // The Valve Hall's nine wheels, numbered, each over an outlet.
    valvewall(g, s) {
      for (let i = 0; i < 9; i++) {
        const x = (s.x0 + (i % 3) * s.dx) * 8;
        const y = (s.y + Math.floor(i / 3) * s.dy) * 8;
        g.fillStyle = '#10121c';
        g.fillRect(x - 9, y - 9, 19, 19);
        g.fillStyle = '#7a3a26';
        g.fillRect(x - 8, y - 8, 17, 17);
        g.fillStyle = '#10121c';
        g.fillRect(x - 6, y - 6, 13, 13);
        g.fillStyle = '#a85a3a';
        g.fillRect(x, y - 8, 1, 17);
        g.fillRect(x - 8, y, 17, 1);
        g.fillRect(x - 6, y - 6, 1, 1);
        g.fillRect(x + 6, y + 6, 1, 1);
        g.fillStyle = '#05060d';
        g.fillRect(x - 4, y + 12, 9, 6);
        g.globalAlpha = 0.55;
        HA.font.draw(g, String(i + 1), x - 1, y - 18, '#ffb84d', { shadow: null });
        g.globalAlpha = 1;
      }
    },
    // The ribs of a long round culvert, every few tiles.
    culvert(g, s, rnd, T, room) {
      for (let x = (s.x0 || 0) * 8; x < ((s.x1 || room.w) * 8); x += 40) {
        g.fillStyle = '#121a19';
        g.fillRect(x, 0, 6, room.ph);
        g.fillStyle = '#1a2624';
        g.fillRect(x, 0, 1, room.ph);
        for (let y = 12; y < room.ph; y += 20) {
          g.fillStyle = '#26302c';
          g.fillRect(x + 2, y, 2, 2);
        }
      }
    },
    // Rust weeping down a wall from a seam.
    rust(g, s, rnd, T, room) {
      for (let i = 0; i < (s.n || 20); i++) {
        const x = Math.floor(rnd() * room.pw);
        const y = Math.floor(rnd() * room.ph * 0.7);
        const len = 8 + Math.floor(rnd() * 30);
        g.fillStyle = rnd() < 0.5 ? 'rgba(138,74,38,0.35)' : 'rgba(90,48,26,0.4)';
        g.fillRect(x, y, 1 + Math.floor(rnd() * 2), len);
      }
    },
    // Odell's workshop: his bench, tools on a board, and a sign on the door frame.
    workshop(g, s) {
      const x = s.x * 8;
      const y = s.y * 8 + 8;
      g.fillStyle = '#10121c';
      g.fillRect(x - 20, y - 10, 42, 10);
      g.fillStyle = '#4a3626';
      g.fillRect(x - 19, y - 9, 40, 3);
      g.fillStyle = '#2a1e14';
      g.fillRect(x - 17, y - 6, 2, 6);
      g.fillRect(x + 17, y - 6, 2, 6);
      g.fillStyle = '#10121c';
      g.fillRect(x - 18, y - 42, 38, 22);
      g.fillStyle = '#2a2620';
      g.fillRect(x - 17, y - 41, 36, 20);
      const tools = ['#a9b6cc', '#6c7894', '#c98a4a', '#a9b6cc', '#6c7894'];
      tools.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(x - 14 + i * 7, y - 38, 2, 10 + (i % 2) * 4);
      });
      g.fillStyle = '#6c7894';
      g.fillRect(x - 8, y - 13, 6, 3);
      g.fillStyle = '#ffb84d';
      g.fillRect(x + 6, y - 12, 2, 2);
    },
    // The keel tram's winch house: the empty mount where a motor belongs, and the cable drum.
    winch(g, s) {
      const x = s.x * 8;
      const y = s.y * 8 + 8;
      g.fillStyle = '#10121c';
      g.fillRect(x - 18, y - 40, 37, 40);
      g.fillStyle = '#2a2620';
      g.fillRect(x - 17, y - 39, 35, 38);
      g.fillStyle = '#10121c';
      g.fillRect(x - 12, y - 34, 24, 24);
      g.fillStyle = '#3a4258';
      g.fillRect(x - 11, y - 33, 22, 22);
      g.fillStyle = '#10121c';
      g.fillRect(x - 3, y - 25, 7, 7);
      g.fillStyle = '#6c7894';
      for (let i = 0; i < 5; i++) g.fillRect(x - 11, y - 31 + i * 4, 22, 1);
      g.globalAlpha = 0.5;
      HA.font.draw(g, 'WINCH', x - 10, y - 48, '#c98a4a', { shadow: null });
      g.globalAlpha = 1;
    },

    // ---- The Engine Spine ----
    // The reactor up the middle of the Spine: a casing banded every few metres, its core glowing through.
    reactor(g, s, rnd, T, room) {
      const x = s.x * 8;
      const H = room.ph;
      g.fillStyle = '#10121c';
      g.fillRect(x - 2, 0, 36, H);
      g.fillStyle = '#221e20';
      g.fillRect(x, 0, 32, H);
      g.fillStyle = '#3a2218';
      g.fillRect(x + 8, 0, 16, H);
      const core = g.createLinearGradient(x + 8, 0, x + 24, 0);
      core.addColorStop(0, 'rgba(255,143,74,0)');
      core.addColorStop(0.5, 'rgba(255,214,160,0.4)');
      core.addColorStop(1, 'rgba(255,143,74,0)');
      g.fillStyle = core;
      g.fillRect(x + 8, 0, 16, H);
      g.fillStyle = 'rgba(255,240,200,0.5)';
      g.fillRect(x + 15, 0, 2, H);
      for (let y = 10 + Math.floor(rnd() * 20); y < H; y += 56) {
        g.fillStyle = '#10121c';
        g.fillRect(x - 2, y, 36, 6);
        g.fillStyle = '#4a4a56';
        g.fillRect(x - 1, y + 1, 34, 2);
        g.fillStyle = '#ffb070';
        g.fillRect(x + 4, y + 4, 2, 1);
        g.fillRect(x + 26, y + 4, 2, 1);
      }
    },
    // Boilers: riveted tanks with a gauge, sitting on their feet (each at [x, y], the tile under its middle).
    boilers(g, s) {
      for (const [bx, by] of s.at) {
        const x = bx * 8 - 22;
        const y = by * 8 - 34;
        g.fillStyle = '#10121c';
        g.fillRect(x, y + 2, 44, 30);
        g.fillRect(x + 2, y, 40, 34);
        g.fillStyle = '#3a3036';
        g.fillRect(x + 2, y + 2, 40, 30);
        g.fillStyle = '#4a4048';
        g.fillRect(x + 3, y + 3, 38, 3);
        g.fillStyle = '#2a2428';
        for (let i = 8; i < 40; i += 8) g.fillRect(x + i, y + 4, 1, 26);
        g.fillStyle = '#6a5a5e';
        for (let i = 5; i < 40; i += 8) g.fillRect(x + i, y + 8, 1, 1);
        // the gauge
        g.fillStyle = '#10121c';
        g.fillRect(x + 16, y + 10, 12, 12);
        g.fillStyle = '#d8cfc0';
        g.fillRect(x + 17, y + 11, 10, 10);
        g.fillStyle = '#e8434f';
        g.fillRect(x + 22, y + 13, 1, 5);
        g.fillRect(x + 23, y + 13, 2, 1);
        // feet
        g.fillStyle = '#10121c';
        g.fillRect(x + 6, y + 32, 4, 2);
        g.fillRect(x + 34, y + 32, 4, 2);
      }
    },
    // The crew's lift shaft: two rails and their cross-ties, from row y0 down to row y1, either side of column x.
    shaft(g, s) {
      const x = s.x * 8 + 4;
      const y0 = s.y0 * 8;
      const y1 = (s.y1 + 1) * 8;
      for (const dx of [-14, 11]) {
        g.fillStyle = '#10121c';
        g.fillRect(x + dx, y0, 3, y1 - y0);
        g.fillStyle = '#5a4028';
        g.fillRect(x + dx + 1, y0, 1, y1 - y0);
      }
      g.fillStyle = '#2a1e14';
      for (let y = y0 + 6; y < y1; y += 12) g.fillRect(x - 12, y, 23, 1);
    },
    // A bulkhead into the Gardens, sealed, with the Bloom grown thick through its seams.
    bulkhead(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x, y, 30, 52);
      g.fillStyle = '#3a3a44';
      g.fillRect(x + 1, y + 1, 28, 50);
      for (let i = 0; i < 28; i += 6) {
        g.fillStyle = HAZARD[1];
        g.fillRect(x + 1 + i, y + 1, 3, 3);
        g.fillRect(x + 1 + i, y + 47, 3, 3);
      }
      g.fillStyle = '#10121c';
      g.fillRect(x + 14, y + 4, 2, 44);
      // the Bloom, pushing out through the seam and over the plates
      const B = ['#5c2479', '#b04ad0', '#f27ad8'];
      for (let i = 0; i < 40; i++) {
        const by = y + 4 + ((i * 17) % 44);
        const bx = x + 10 + ((i * 7) % 12);
        g.fillStyle = B[i % 3];
        g.fillRect(bx, by, 2 + (i % 3), 2);
      }
      g.globalAlpha = 0.6;
      HA.font.draw(g, 'GARDENS', x + 34, y + 18, '#a9b6cc', { shadow: null });
      HA.font.draw(g, 'SEALED', x + 34, y + 27, '#e8434f', { shadow: null });
      g.globalAlpha = 1;
    },
    // The old crew's bunks, three high, at the top of the Spine.
    bunks(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      for (let i = 0; i < 3; i++) {
        const bx = x + i * 26;
        g.fillStyle = '#10121c';
        g.fillRect(bx, y - 4, 2, 52);
        g.fillRect(bx + 22, y - 4, 2, 52);
        for (const ly of [y + 6, y + 22, y + 38]) {
          g.fillStyle = '#10121c';
          g.fillRect(bx, ly, 24, 4);
          g.fillStyle = '#4a3a2e';
          g.fillRect(bx + 2, ly, 20, 2);
          g.fillStyle = '#7a5a3a';
          g.fillRect(bx + 3, ly - 2, 7, 2);
        }
      }
    },
    // The line phone the crew strung along the keel tram's cable, down to the Warrens.
    phone(g, s) {
      const x = s.x * 8;
      const y = s.y * 8 - 6;
      g.fillStyle = '#10121c';
      g.fillRect(x - 4, y - 12, 10, 14);
      g.fillStyle = '#5a4028';
      g.fillRect(x - 3, y - 11, 8, 12);
      g.fillStyle = '#10121c';
      g.fillRect(x - 6, y - 10, 2, 8);
      g.fillStyle = '#a8743a';
      g.fillRect(x - 1, y - 8, 4, 1);
      g.fillRect(x - 1, y - 5, 4, 1);
      g.fillStyle = '#3a2818';
      g.fillRect(x + 1, y + 2, 1, 6);
      g.fillRect(x + 1, -8, 1, y - 4);
    },
    // An intercom speaker on the wall.
    intercom(g, s) {
      const x = s.x * 8;
      const y = s.y * 8;
      g.fillStyle = '#10121c';
      g.fillRect(x - 6, y - 6, 13, 13);
      g.fillStyle = '#3a4258';
      g.fillRect(x - 5, y - 5, 11, 11);
      g.fillStyle = '#10121c';
      for (let i = -3; i <= 3; i += 2) g.fillRect(x - 3, y + i, 7, 1);
    },

    // The Gardener's gallery, behind the glass: clean white tiles, a bench, and her own door out.
    // ---- The Command Tower ----
    // Tall arched windows onto the night, in brass frames (every so many pixels, from a start, s.h tiles tall).
    tallwindows(g, s, rnd, T, room) {
      const h = (s.h || 10) * 8;
      const y = s.y * 8;
      for (let x = s.from; x < room.pw - 24; x += s.every) {
        g.fillStyle = '#6a5630';
        g.fillRect(x - 2, y - 2, 28, h + 4);
        g.fillStyle = '#0a1430';
        g.fillRect(x, y + 6, 24, h - 6);
        g.fillRect(x + 2, y + 2, 20, 4);
        g.fillRect(x + 6, y, 12, 2);
        const night = g.createLinearGradient(0, y, 0, y + h);
        night.addColorStop(0, 'rgba(4,6,16,0.7)');
        night.addColorStop(1, 'rgba(40,64,128,0.25)');
        g.fillStyle = night;
        g.fillRect(x, y + 2, 24, h - 2);
        for (let i = 0; i < 9; i++) {
          g.fillStyle = rnd() < 0.2 ? '#ffffff' : '#5a6a9a';
          g.fillRect(x + 1 + Math.floor(rnd() * 22), y + 3 + Math.floor(rnd() * (h - 6)), 1, 1);
        }
        g.fillStyle = 'rgba(120,150,220,0.08)';
        g.fillRect(x, y + 2, 24, h - 2);
        g.fillStyle = '#6a5630';
        g.fillRect(x + 11, y, 2, h);
        g.fillRect(x, y + Math.floor(h / 2), 24, 1);
        g.fillStyle = '#ffd88a';
        g.fillRect(x - 2, y + h + 1, 28, 1);
      }
    },
    // The Steward's banners: his colours, with a key worked on them in brass.
    banners(g, s) {
      for (const bx of s.at) {
        const x = bx * 8;
        g.fillStyle = '#10121c';
        g.fillRect(x - 1, 15, 18, 2);
        g.fillStyle = '#2e2a3e';
        g.fillRect(x, 17, 16, 36);
        g.fillStyle = '#4a4060';
        g.fillRect(x + 1, 17, 1, 36);
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#2e2a3e' : '#4a4060';
          g.fillRect(x + i * 2, 53, 2, 3 - (i % 2));
        }
        g.fillStyle = '#c9a050';
        g.fillRect(x + 7, 24, 2, 14);
        g.fillRect(x + 5, 22, 6, 4);
        g.fillRect(x + 9, 33, 3, 1);
        g.fillRect(x + 9, 36, 2, 1);
        g.fillStyle = '#2e2a3e';
        g.fillRect(x + 7, 23, 2, 2);
      }
    },
    // The Observation Dome: glass from wall to wall, the stars, the bow below, and the new world: a pale dot, dark.
    domeglass(g, s, rnd, T, room) {
      const W = room.pw;
      const top = 16;
      const bottom = 15 * 8;
      g.fillStyle = '#03050c';
      g.fillRect(16, top, W - 32, bottom - top);
      for (let i = 0; i < 220; i++) {
        const r = rnd();
        g.fillStyle = r < 0.12 ? '#ffffff' : r < 0.45 ? '#8aa0c8' : '#3b4a72';
        g.fillRect(16 + Math.floor(rnd() * (W - 32)), top + Math.floor(rnd() * (bottom - top)), 1, 1);
      }
      // the world, low over the bow: pale, and no lights on it anywhere
      const wx = 236;
      const wy = 96;
      for (let dy = -6; dy <= 6; dy++) {
        const half = Math.floor(Math.sqrt(36 - dy * dy));
        g.fillStyle = dy < -2 ? '#b8c4cc' : dy < 2 ? '#94a2ae' : '#6c7a88';
        g.fillRect(wx - half, wy + dy, half * 2 + 1, 1);
      }
      g.fillStyle = '#5a6878';
      g.fillRect(wx - 4, wy + 1, 3, 1);
      g.fillRect(wx + 1, wy - 2, 4, 1);
      g.fillStyle = 'rgba(200,220,232,0.1)';
      g.fillRect(wx - 9, wy - 9, 19, 19);
      // the bow below the glass
      g.fillStyle = '#10121c';
      g.beginPath();
      g.moveTo(16, bottom);
      g.lineTo(W - 16, bottom);
      g.lineTo(W - 16, bottom - 6);
      g.lineTo(150, bottom - 14);
      g.lineTo(16, bottom - 18);
      g.fill();
      g.fillStyle = '#3a4258';
      g.fillRect(40, bottom - 17, 1, 1);
      g.fillRect(120, bottom - 15, 1, 1);
      // the dome's brass ribs
      g.strokeStyle = '#6a5630';
      g.lineWidth = 2;
      for (const k of [0.18, 0.5, 0.82]) {
        g.beginPath();
        g.moveTo(16 + (W - 32) * k, bottom);
        g.quadraticCurveTo(16 + (W - 32) * (0.5 + (k - 0.5) * 0.4), top - 30, W / 2, top);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(16, bottom - 40);
      g.quadraticCurveTo(W / 2, top + 20, W - 16, bottom - 40);
      g.stroke();
      g.fillStyle = 'rgba(184,244,255,0.05)';
      g.fillRect(16, top, W - 32, bottom - top);
    },
    // Planters of the Gardener's Bloom: pink stalks and caps standing up out of each bed.
    planters(g, s, rnd) {
      for (const [px, py] of s.at) {
        const x = px * 8;
        const y = py * 8;
        for (let i = 0; i < 7; i++) {
          const sx = x + 2 + Math.floor(rnd() * 28);
          const h = 6 + Math.floor(rnd() * 14);
          g.fillStyle = '#5c2479';
          g.fillRect(sx, y - h, 1, h);
          g.fillStyle = rnd() < 0.5 ? '#f27ad8' : '#b04ad0';
          g.fillRect(sx - 1, y - h - 2, 3, 2);
        }
      }
    },
    // The Helm's great viewport: the night, the stars and the world, behind brass mullions.
    viewport(g, s, rnd) {
      const x0 = s.x0 * 8;
      const x1 = s.x1 * 8;
      const y0 = 24;
      const y1 = 14 * 8;
      g.fillStyle = '#6a5630';
      g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
      g.fillStyle = '#03050c';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = rnd() < 0.15 ? '#ffffff' : rnd() < 0.5 ? '#8aa0c8' : '#3b4a72';
        g.fillRect(x0 + Math.floor(rnd() * (x1 - x0)), y0 + Math.floor(rnd() * (y1 - y0)), 1, 1);
      }
      const wx = x0 + Math.floor((x1 - x0) * 0.62);
      const wy = y0 + 46;
      for (let dy = -4; dy <= 4; dy++) {
        const half = Math.floor(Math.sqrt(16 - dy * dy));
        g.fillStyle = dy < 0 ? '#b8c4cc' : '#7a8896';
        g.fillRect(wx - half, wy + dy, half * 2 + 1, 1);
      }
      g.fillStyle = '#6a5630';
      for (let x = x0 + 40; x < x1; x += 40) g.fillRect(x, y0, 2, y1 - y0);
      g.fillRect(x0, y0 + 40, x1 - x0, 1);
    },
    // The bridge's consoles: a lit screen standing on each (the console itself is in the map).
    consoles(g, s) {
      for (const cx of s.at) {
        const x = cx * 8;
        const y = 17 * 8;
        g.fillStyle = '#10121c';
        g.fillRect(x + 2, y - 12, 20, 12);
        g.fillStyle = '#1a3a48';
        g.fillRect(x + 4, y - 10, 16, 7);
        g.fillStyle = '#5fd4e8';
        g.fillRect(x + 5, y - 9, 8, 1);
        g.fillRect(x + 5, y - 7, 12, 1);
        g.fillRect(x + 5, y - 5, 5, 1);
      }
    },
    // The Dreaming Deck: faint stars, and the ship's courses in cyan, the loop it flew and the corrections it
    // turned down. The Sphere has its ribs; the Quiet has one round window, with the world in it, closer now.
    courselines(g, s, rnd, T, room) {
      const W = room.pw;
      const H = room.ph;
      for (let i = 0; i < W / 3; i++) {
        g.fillStyle = rnd() < 0.15 ? '#2e4a58' : '#122028';
        g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1);
      }
      const dotted = (cx, cy, rx, ry, tilt, color, every) => {
        g.fillStyle = color;
        const n = Math.ceil((rx + ry) * 2);
        for (let i = 0; i < n; i += every) {
          const a = (i / n) * Math.PI * 2;
          const ex = Math.cos(a) * rx;
          const ey = Math.sin(a) * ry;
          g.fillRect(Math.round(cx + ex * Math.cos(tilt) - ey * Math.sin(tilt)), Math.round(cy + ex * Math.sin(tilt) + ey * Math.cos(tilt)), 1, 1);
        }
      };
      if (s.sphere) {
        // the sphere's ribs, and the floor ring
        for (const r of [60, 100, 140]) dotted(W / 2, 76, r, r * 0.42, 0, 'rgba(95,212,232,0.18)', 2);
        for (const r of [30, 70, 110]) dotted(W / 2, 76, r * 0.3, 70, 0, 'rgba(95,212,232,0.1)', 3);
        g.fillStyle = 'rgba(95,212,232,0.12)';
        g.fillRect(16, 19 * 8 - 1, W - 32, 1);
        return;
      }
      if (s.quiet) {
        // one round window: the stars, and the world, bigger than it has ever looked
        const cx = W / 2;
        const cy = 56;
        g.fillStyle = '#10121c';
        g.beginPath();
        g.arc(cx, cy, 34, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#03050c';
        g.beginPath();
        g.arc(cx, cy, 31, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 50; i++) {
          const a = rnd() * Math.PI * 2;
          const r = rnd() * 30;
          g.fillStyle = rnd() < 0.2 ? '#ffffff' : '#6c7894';
          g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
        }
        for (let dy = -11; dy <= 11; dy++) {
          const half = Math.floor(Math.sqrt(121 - dy * dy));
          g.fillStyle = dy < -4 ? '#c8d4dc' : dy < 4 ? '#a2b0bc' : '#7a8898';
          g.fillRect(cx + 6 - half, cy + 4 + dy, half * 2 + 1, 1);
        }
        g.fillStyle = '#6a7a8a';
        g.fillRect(cx + 1, cy + 5, 5, 1);
        g.fillRect(cx + 8, cy, 4, 1);
        g.strokeStyle = '#1a4a58';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, 32, 0, Math.PI * 2);
        g.stroke();
        return;
      }
      // the loop the ship has flown since year 38, and three courses in that it turned down
      dotted(W * 0.55, 70, W * 0.36, 34, 0.05, 'rgba(95,212,232,0.35)', 2);
      dotted(W * 0.55, 70, W * 0.36 + 6, 40, 0.05, 'rgba(95,212,232,0.1)', 3);
      for (let i = 0; i < 3; i++) {
        const y0 = 96 + i * 12;
        g.fillStyle = 'rgba(95,212,232,0.22)';
        for (let x = 40 + i * 30; x < W - 30; x += 3) g.fillRect(x, Math.round(y0 + (x - 40) * 0.08), 1, 1);
        g.globalAlpha = 0.4;
        HA.font.draw(g, 'COURSE ' + (i + 1) + ' · REJECTED', 40 + i * 30, y0 - 9, '#5fd4e8', { shadow: null });
        g.globalAlpha = 1;
      }
    },
    // The memory halls: an earlier deck as the Navigator remembers it, pale, with a haze over the top of it.
    memory(g, s, rnd, T, room) {
      const W = room.pw;
      const H = room.ph;
      const FLOOR = 19 * 8;
      const pale = (a) => 'rgba(226,240,248,' + a + ')';
      // someone standing, head up, as the Navigator saw them
      const figure = (x, a) => {
        g.fillStyle = pale(a);
        g.fillRect(x - 2, FLOOR - 19, 4, 4);
        g.fillRect(x - 3, FLOOR - 14, 6, 8);
        g.fillRect(x - 3, FLOOR - 6, 2, 6);
        g.fillRect(x + 1, FLOOR - 6, 2, 6);
      };
      const year = { cryo: 'YEAR 0', gardens: 'YEAR 151', helm: 'YEAR 290' }[s.of];
      if (s.of === 'cryo') {
        // the pod racks, every pod still shut, and the first crew among them, singing
        for (let x = 20; x < W - 30; x += 24) {
          if (rnd() < 0.12) continue;
          for (const y of [26, 62]) {
            // a pod: rounded ends, a frosted window, someone asleep behind it
            g.fillStyle = pale(0.1);
            g.fillRect(x + 1, y, 12, 28);
            g.fillRect(x, y + 1, 14, 26);
            g.fillStyle = pale(0.16);
            g.fillRect(x + 3, y + 3, 8, 18);
            g.fillStyle = 'rgba(30,35,44,0.45)';
            g.fillRect(x + 5, y + 5, 4, 3);
            g.fillRect(x + 4, y + 9, 6, 9);
            g.fillStyle = 'rgba(184,244,255,0.4)';
            g.fillRect(x + 6, y + 24, 2, 1);
          }
        }
        for (const x of [70, 118, 260, 300, 420, 452, 540]) figure(x, 0.16);
        // their song, as the Navigator kept it: notes rising
        g.fillStyle = pale(0.2);
        for (let i = 0; i < 16; i++) g.fillRect(60 + Math.floor(rnd() * (W - 120)), 20 + Math.floor(rnd() * 90), 2, 2);
      } else if (s.of === 'gardens') {
        // grow-lights, the cradles hanging under them, and the beds
        for (let x = 24; x < W - 24; x += 48) {
          g.fillStyle = 'rgba(255,248,220,0.22)';
          g.fillRect(x, 22, 30, 2);
          const glow = g.createLinearGradient(0, 24, 0, 90);
          glow.addColorStop(0, 'rgba(255,248,220,0.09)');
          glow.addColorStop(1, 'rgba(255,248,220,0)');
          g.fillStyle = glow;
          g.fillRect(x - 6, 24, 42, 66);
          if (rnd() < 0.6) {
            g.fillStyle = pale(0.12);
            g.fillRect(x + 14, 24, 1, 20);
            g.fillRect(x + 9, 44, 11, 14);
          }
        }
        for (let i = 0; i < W / 5; i++) {
          const x = Math.floor(rnd() * W);
          const h = 8 + Math.floor(rnd() * 26);
          g.fillStyle = 'rgba(200,232,200,0.13)';
          g.fillRect(x, 120 - h, 1, h);
          if (rnd() < 0.18) {
            // the first of the Bloom, pink even in a memory
            g.fillStyle = 'rgba(242,122,216,0.3)';
            g.fillRect(x - 1, 118 - h, 3, 2);
          }
        }
        figure(330, 0.16);
      } else {
        // the Helm: tall windows full of night, his banners, and a man at the top of the dais
        for (let x = 30; x < W - 40; x += 90) {
          g.fillStyle = pale(0.1);
          g.fillRect(x, 20, 30, 92);
          g.fillStyle = 'rgba(20,30,52,0.5)';
          g.fillRect(x + 2, 22, 26, 88);
          for (let i = 0; i < 10; i++) {
            g.fillStyle = pale(0.35);
            g.fillRect(x + 3 + Math.floor(rnd() * 24), 24 + Math.floor(rnd() * 84), 1, 1);
          }
        }
        for (const x of [80, 250, 430]) {
          g.fillStyle = pale(0.12);
          g.fillRect(x, 20, 14, 34);
          g.fillStyle = 'rgba(232,220,192,0.2)';
          g.fillRect(x + 5, 26, 4, 4);
        }
        figure(600, 0.2);
        figure(612, 0.1);
      }
      g.globalAlpha = 0.18;
      HA.font.draw(g, year, 24, 14, '#ffffff', { shadow: null });
      g.globalAlpha = 1;
      const haze = g.createLinearGradient(0, 0, 0, H);
      haze.addColorStop(0, 'rgba(232,244,250,0.18)');
      haze.addColorStop(0.55, 'rgba(232,244,250,0.03)');
      haze.addColorStop(1, 'rgba(232,244,250,0)');
      g.fillStyle = haze;
      g.fillRect(0, 0, W, H);
    },
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
  // One 8px cell of a stacked cargo container. Containers are 4 cells wide and 2 tall, staggered a little
  // row by row, so a wall of them reads as a stack and not a grid. A lit top edge marks where to stand.
  function containerCell(g, x, y, tx, ty, isCargo, open, palette) {
    const cy = Math.floor(ty / 2);
    const shift = (cy % 2) * 2;
    const cx = Math.floor((tx + shift) / 4);
    const C = palette || CONTAINERS[hash(cx + ',' + cy) % CONTAINERS.length];
    const top = ty % 2 === 0 || !isCargo(tx, ty - 1);
    const bottom = ty % 2 === 1 || !isCargo(tx, ty + 1);
    const left = (tx + shift) % 4 === 0 || !isCargo(tx - 1, ty);
    const right = (tx + shift) % 4 === 3 || !isCargo(tx + 1, ty);
    g.fillStyle = C[0];
    g.fillRect(x, y, 8, 8);
    g.fillStyle = C[2];
    for (let rx = 2; rx < 8; rx += 3) g.fillRect(x + rx, y + (top ? 2 : 0), 1, 8 - (top ? 2 : 0) - (bottom ? 1 : 0));
    if (top) {
      g.fillStyle = open(tx, ty - 1) ? (palette ? palette[1] : '#c9a07a') : C[1];
      g.fillRect(x, y, 8, 1);
    }
    g.fillStyle = '#0b0807';
    if (bottom) g.fillRect(x, y + 7, 8, 1);
    if (left) g.fillRect(x, y, 1, 8);
    if (right) {
      g.fillStyle = C[2];
      g.fillRect(x + 7, y, 1, 8);
      // the door end of a container: its locking bars
      if (isCargo(tx - 1, ty)) {
        g.fillStyle = C[1];
        g.fillRect(x + 4, y + (top ? 2 : 0), 1, top && bottom ? 4 : 6);
      }
    }
  }

  function buildTiles(room, T) {
    const img = canvas(room.pw, room.ph);
    const g = img.getContext('2d');
    const P = T.tile;
    const solid = (tx, ty) => room.tile(tx, ty) === HA.room.SOLID;
    const isCargo = (tx, ty) => tx >= 0 && ty >= 0 && tx < room.w && ty < room.h && room.cargo[ty * room.w + tx] === 1;
    const open = (tx, ty) => room.tile(tx, ty) === HA.room.EMPTY;
    for (let ty = 0; ty < room.h; ty++) {
      for (let tx = 0; tx < room.w; tx++) {
        const t = room.tile(tx, ty);
        const x = tx * 8;
        const y = ty * 8;
        if (isCargo(tx, ty)) {
          containerCell(g, x, y, tx, ty, isCargo, open);
          continue;
        }
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
          if (T.marble && (tx * 7 + ty * 3) % 5 === 0) {
            // a grey vein through the marble
            g.fillStyle = P.face;
            g.fillRect(x + 1, y + 5, 2, 1);
            g.fillRect(x + 3, y + 4, 2, 1);
            g.fillRect(x + 5, y + 3, 2, 1);
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
        } else if (t === HA.room.THORNS && T.static) {
          // static: a memory breaking up where the floor should be
          g.fillStyle = T === THEMES.memory ? '#3a4a56' : '#0a1a22';
          g.fillRect(x, y + 4, 8, 4);
          for (let i = 0; i < 7; i++) {
            const k = (tx * 13 + ty * 7 + i * 5) % 8;
            g.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#b8f4ff' : '#5fd4e8';
            g.fillRect(x + k, y + 1 + ((i * 3 + tx) % 6), 1 + (i % 2), 1);
          }
        } else if (t === HA.room.THORNS && T.heat) {
          // a grille over the heat, its bars glowing
          g.fillStyle = '#3a1a10';
          g.fillRect(x, y + 3, 8, 5);
          g.fillStyle = '#e8434f';
          g.fillRect(x, y + 6, 8, 1);
          for (const sx of [0, 3, 6]) {
            g.fillStyle = '#ff9b3d';
            g.fillRect(x + sx, y + 2, 2, 5);
            g.fillStyle = '#fff0a8';
            g.fillRect(x + sx, y + 2, 2, 1);
          }
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
      if (s.kind === 'odell') drawOdell(g, world, s, cam);
      if (s.kind === 'toolbag' && !world.state.flags.toolbag) drawToolbag(g, s, cam);
      if (s.kind === 'motor' && !world.state.flags.siltDown && HA.story.drawMotor) HA.story.drawMotor(g, Math.round(s.x * 8 - cam.x), Math.round(s.y * 8 + 1 - cam.y));
      if (s.kind === 'boots' && !world.state.abilities.boots) drawBoots(g, s, cam);
      // Solder's tools at the Crew Camp: only if she came up with the crew (story/bench.js).
      if (s.kind === 'campBench' && world.state.people.solder === 'alive') {
        g.save();
        g.translate(-Math.round(cam.x), -Math.round(cam.y));
        PROPS.workbench(g, s);
        g.restore();
      }
      // The keel tram: at the Ballast's station until it leaves, and at the Spine Foot once the climbers come in on it.
      const tram = s.at === 'spine' ? !!world.state.flags.crewCame : !world.state.flags.tram || (world.tramGo || 0) > 0;
      if (s.kind === 'tramcar' && tram) drawTramCar(g, world, s, cam);
    }
    if (world.def.cradles) drawCradles(g, world, world.def.cradles, cam);
    if (world.heroPod) drawPod(g, world, world.heroPod, cam);
    if (world.maraPod) drawPod(g, world, world.maraPod, cam);
  }

  function drawFire(g, world, s, cam) {
    const x = Math.round(s.x * 8 - cam.x);
    const y = Math.round(s.y * 8 + 8 - cam.y);
    // Wick's lantern, hung on a hook by the fire where she'd have seen it.
    if (world.state.flags.lanternWith === 'fire') {
      g.fillStyle = '#3a2616';
      g.fillRect(x - 12, y - 22, 1, 10);
      g.fillRect(x - 12, y - 22, 3, 1);
      miniLantern(g, x - 13, y - 12);
    }
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

  // A lantern small enough to hang from a belt or a child's hand, with its own glow.
  function miniLantern(g, x, y) {
    const glow = g.createRadialGradient(x + 1, y + 3, 0, x + 1, y + 3, 14);
    glow.addColorStop(0, 'rgba(255,184,77,0.3)');
    glow.addColorStop(1, 'rgba(255,184,77,0)');
    g.fillStyle = glow;
    g.fillRect(x - 13, y - 11, 28, 28);
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y, 5, 6);
    g.fillStyle = '#6c7894';
    g.fillRect(x, y - 1, 3, 1);
    g.fillStyle = '#ffb84d';
    g.fillRect(x, y + 1, 3, 4);
    g.fillStyle = '#fff0a8';
    g.fillRect(x + 1, y + 2, 1, 2);
  }

  // Lifts and hatches between rooms. A lift is a cage on its cables, its lamp red while it's locked and green once
  // it will run. A floor hatch is a plate in the floor, then a hole with a ladder's top once it's open. Its other
  // end is a ladder up through the ceiling.
  function drawLink(g, world, l, cam) {
    if (l.legend.type === 'lift') return drawLift(g, world, l, cam);
    const x = Math.round(l.tx * 8 - 4 - cam.x);
    if (l.legend.up) {
      const foot = Math.round(l.ty * 8 + 8 - cam.y);
      g.fillStyle = '#10121c';
      g.fillRect(x + 2, -1, 2, foot + 1);
      g.fillRect(x + 12, -1, 2, foot + 1);
      g.fillStyle = '#6c7894';
      g.fillRect(x + 3, -1, 1, foot + 1);
      g.fillRect(x + 13, -1, 1, foot + 1);
      for (let y = foot - 4; y > -8; y -= 6) g.fillRect(x + 3, y, 11, 1);
      return;
    }
    const y = Math.round(l.ty * 8 + 8 - cam.y);
    if (l.legend.open(world.state)) {
      g.fillStyle = '#05060d';
      g.fillRect(x, y, 16, 4);
      g.fillStyle = '#6c7894';
      g.fillRect(x + 3, y, 1, 4);
      g.fillRect(x + 12, y, 1, 4);
      g.fillRect(x + 3, y + 2, 10, 1);
      return;
    }
    g.fillStyle = '#10121c';
    g.fillRect(x, y, 16, 3);
    g.fillStyle = '#5a4028';
    g.fillRect(x + 1, y, 14, 2);
    g.fillStyle = '#a8743a';
    g.fillRect(x + 2, y, 1, 1);
    g.fillRect(x + 13, y, 1, 1);
    g.fillRect(x + 6, y, 4, 1);
  }

  // A lift car: the old crew's grey cage, the Hullfolk's own (the crew's lift up the Spine, patched in brown, which
  // rises into place as they finish it), or the great Tower Lift.
  function drawLift(g, world, l, cam) {
    const big = l.legend.big;
    const w = big ? 40 : 24;
    const h = big ? 30 : 22;
    const x = Math.round(l.x - (big ? 8 : 0) - cam.x);
    const y = Math.round(l.y - (big ? 8 : 0) + (l.rise || 0) - cam.y);
    const crew = l.legend.crew;
    g.fillStyle = '#10121c';
    g.fillRect(x, y, w, h);
    g.fillStyle = crew ? '#5a4028' : '#3a4258';
    g.fillRect(x + 1, y + 1, w - 2, 2);
    g.fillRect(x + 1, y + h - 3, w - 2, 3);
    g.fillStyle = crew ? '#a8743a' : '#6c7894';
    for (let b = 2; b < w - 1; b += 4) g.fillRect(x + b, y + 3, 1, h - 6);
    g.fillStyle = crew ? '#c98a4a' : '#a9b6cc';
    g.fillRect(x + 1, y + 1, w - 2, 1);
    if (crew) {
      // patched: a plate bolted across, and the cable it hangs from
      g.fillStyle = '#7a5a3a';
      g.fillRect(x + 4, y + 9, 9, 5);
      g.fillStyle = '#10121c';
      g.fillRect(x + 11, y - 40, 2, 40);
    }
    const lit = l.legend.lit ? l.legend.lit(world.state) : world.state.flags.cradles;
    g.fillStyle = lit ? '#7ad1a0' : '#e8434f';
    g.fillRect(x + w / 2 - 1, y + 5, 2, 2);
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

  // Chief Engineer Odell, frozen at the dead terminal where he came to make his complaint. His pack stays on his
  // back until someone needs it more than he does.
  function drawOdell(g, world, s, cam) {
    const x = Math.round(s.x * 8 - cam.x);
    const y = Math.round(s.y * 8 - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x + 9, y - 18, 11, 18);
    g.fillStyle = '#3a4258';
    g.fillRect(x + 10, y - 17, 9, 16);
    g.fillStyle = '#05060d';
    g.fillRect(x + 11, y - 15, 7, 5);
    g.fillStyle = '#1a1412';
    g.fillRect(x - 5, y - 8, 9, 8);
    g.fillStyle = '#5a6b87';
    g.fillRect(x - 1, y - 7, 8, 3);
    g.fillRect(x + 5, y - 5, 2, 5);
    g.fillStyle = '#8a9aa8';
    g.fillRect(x - 3, y - 17, 7, 11);
    g.fillRect(x + 3, y - 14, 7, 2);
    g.fillStyle = '#c8dce8';
    g.fillRect(x - 1, y - 22, 5, 5);
    g.fillStyle = '#10121c';
    g.fillRect(x + 2, y - 20, 1, 1);
    if (!world.state.flags.odellPack) {
      g.fillStyle = '#10121c';
      g.fillRect(x - 7, y - 17, 5, 9);
      g.fillStyle = '#6c7894';
      g.fillRect(x - 6, y - 16, 3, 7);
      g.fillStyle = '#ffb84d';
      g.fillRect(x - 6, y - 9, 3, 1);
    }
    g.fillStyle = '#eef4f6';
    for (const [fx, fy] of [[-2, -17], [1, -12], [3, -21], [-4, -10], [6, -14], [0, -6]]) g.fillRect(x + fx, y + fy, 1, 1);
    if (!world.state.flags.odell && Math.floor(world.time / 16) % 4 === 0) {
      g.fillStyle = '#ffffff';
      g.fillRect(x + 18, y - 17, 1, 1);
    }
  }

  // Solder's toolbag, where she left it by the grate, a wrench sticking out.
  function drawToolbag(g, s, cam) {
    const x = Math.round(s.x * 8 - cam.x);
    const y = Math.round(s.y * 8 - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 7, 12, 7);
    g.fillStyle = '#7a5a3a';
    g.fillRect(x, y - 6, 10, 6);
    g.fillStyle = '#a8743a';
    g.fillRect(x, y - 6, 10, 1);
    g.fillStyle = '#a9b6cc';
    g.fillRect(x + 7, y - 10, 1, 4);
    g.fillRect(x + 6, y - 11, 3, 1);
    g.fillStyle = '#5fd4e8';
    g.fillRect(x + 2, y - 4, 2, 1);
  }

  // Odell's pressure boots, in their box on the bench.
  function drawBoots(g, s, cam) {
    const x = Math.round(s.x * 8 - cam.x);
    const y = Math.round(s.y * 8 + 8 - cam.y);
    g.fillStyle = '#10121c';
    g.fillRect(x - 6, y - 8, 14, 8);
    g.fillStyle = '#5a4028';
    g.fillRect(x - 5, y - 7, 12, 6);
    g.fillStyle = '#10121c';
    g.fillRect(x - 4, y - 13, 4, 6);
    g.fillRect(x + 2, y - 13, 4, 6);
    g.fillStyle = '#ffb84d';
    g.fillRect(x - 3, y - 12, 2, 4);
    g.fillRect(x + 3, y - 12, 2, 4);
    g.fillStyle = '#6c7894';
    g.fillRect(x - 4, y - 9, 4, 1);
    g.fillRect(x + 2, y - 9, 4, 1);
  }

  // The keel tram's car at the Ballast stop. Once the winch turns, it shudders and rolls off west.
  function drawTramCar(g, world, s, cam) {
    const t = Math.max(0, (world.tramGo || 0) - 40);
    const dx = -Math.round(t * t * 0.012);
    const shake = world.tramGo > 0 && world.tramGo < 60 ? (world.time % 4 < 2 ? 1 : -1) : 0;
    const x = Math.round(s.x * 8 + dx + shake - cam.x);
    const y = Math.round(s.y * 8 + 8 - cam.y);
    const w = 72;
    if (x + w < s.tunnel * 8 - cam.x) return;
    g.save();
    g.beginPath();
    g.rect(Math.round(s.tunnel * 8 - cam.x), 0, HA.VIEW_W * 2, HA.VIEW_H);
    g.clip();
    g.fillStyle = '#10121c';
    g.fillRect(x - 1, y - 37, w + 2, 35);
    g.fillStyle = '#5a4028';
    g.fillRect(x, y - 36, w, 33);
    g.fillStyle = '#8a5a2b';
    g.fillRect(x, y - 36, w, 2);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#10121c';
      g.fillRect(x + 6 + i * 16, y - 31, 11, 13);
      g.fillStyle = world.tramRider && i === 0 ? '#3a2818' : '#1a2a30';
      g.fillRect(x + 7 + i * 16, y - 30, 9, 11);
    }
    g.fillStyle = (world.tramGo || 0) > 0 ? '#ffd84d' : '#3a2a10';
    g.fillRect(x + 1, y - 23, 3, 3);
    g.fillStyle = '#10121c';
    for (const wx of [8, 56]) g.fillRect(x + wx, y - 3, 6, 3);
    g.restore();
  }

  // ---- The Cargo Labyrinth's moving parts ----
  const inDoor = (d) => {
    const set = new Set(d.cells.map((c) => c.tx + ',' + c.ty));
    return (tx, ty) => set.has(tx + ',' + ty);
  };

  // A crane's stack: hazard-yellow containers with a lifting ring on top.
  function drawStack(g, world, d, cam) {
    const isIn = inDoor(d);
    for (const c of d.cells) containerCell(g, c.tx * 8 - cam.x, c.ty * 8 - cam.y, c.tx, c.ty, isIn, () => true, HAZARD);
    const xs = d.cells.map((c) => c.tx);
    const top = Math.min(...d.cells.map((c) => c.ty));
    const mx = ((Math.min(...xs) + Math.max(...xs) + 1) / 2) * 8 - cam.x;
    g.fillStyle = '#10121c';
    g.fillRect(mx - 3, top * 8 - 4 - cam.y, 6, 4);
    g.fillStyle = '#a9b6cc';
    g.fillRect(mx - 2, top * 8 - 3 - cam.y, 4, 2);
  }

  // The stack on its way between slots, hanging from the crane's cable.
  function drawCraneMove(g, world, m, cam) {
    const k = m.t / m.frames;
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = Math.round(m.from.x + (m.to.x - m.from.x) * e - cam.x);
    const y = Math.round(m.from.y + (m.to.y - m.from.y) * e - cam.y);
    g.fillStyle = '#6c7894';
    g.fillRect(x + m.from.w / 2, -2, 1, y + 2);
    const cells = (tx, ty) => tx >= 0 && ty >= 0 && tx < m.from.w / 8 && ty < m.from.h / 8;
    for (let ty = 0; ty < m.from.h / 8; ty++) for (let tx = 0; tx < m.from.w / 8; tx++) containerCell(g, x + tx * 8, y + ty * 8, tx, ty, cells, () => true, HAZARD);
  }

  // A crane switch on the wall: a lever, up or down, and a lamp that blinks while the crane moves.
  function drawSwitch(g, world, sw, cam) {
    const x = Math.round(sw.x - cam.x);
    const y = Math.round(sw.y - cam.y);
    const on = !!world.state.flags[sw.legend.crane];
    g.fillStyle = '#10121c';
    g.fillRect(x, y + 2, 8, 12);
    g.fillStyle = HAZARD[0];
    g.fillRect(x + 1, y + 3, 6, 10);
    g.fillStyle = '#10121c';
    g.fillRect(x + 3, y + 5, 2, 6);
    g.fillStyle = '#a9b6cc';
    g.fillRect(x + 2, on ? y + 9 : y + 4, 4, 2);
    const busy = world.craneMove && world.craneMove.flag === sw.legend.crane;
    g.fillStyle = busy && Math.floor(world.time / 6) % 2 ? '#fff0a8' : on ? '#7ad1a0' : '#e8434f';
    g.fillRect(x + 3, y, 2, 2);
  }

  // Conveyor belts: a dark band along the floor's top with chevrons running the way it carries.
  function drawBelts(g, world, cam) {
    const shift = Math.floor(world.time * 0.6) % 6;
    for (const b of world.room.belts) {
      const y = b.y * 8 - cam.y;
      for (let tx = b.x0; tx <= b.x1; tx++) {
        const x = tx * 8 - cam.x;
        if (x < -8 || x > HA.VIEW_W) continue;
        g.fillStyle = '#10121c';
        g.fillRect(x, y, 8, 3);
        g.fillStyle = '#3a3a40';
        g.fillRect(x, y + 1, 8, 1);
      }
      g.fillStyle = HAZARD[1];
      for (let px = b.x0 * 8 + (b.dir > 0 ? shift : 5 - shift); px < (b.x1 + 1) * 8 - 1; px += 6) {
        g.fillRect(px - cam.x, y + 1, 1, 1);
        g.fillRect(px - cam.x - b.dir, y, 1, 1);
        g.fillRect(px - cam.x - b.dir, y + 2, 1, 1);
      }
      for (const ex of [b.x0 * 8, (b.x1 + 1) * 8 - 3]) {
        g.fillStyle = '#6c7894';
        g.fillRect(ex - cam.x, y, 3, 3);
      }
    }
  }

  // A cracked wall: hull plates split by a dark crack, or (the Cold Store's door) a slab of ice.
  function drawCracked(g, world, d, cam) {
    const ice = d.legend.ice;
    for (const c of d.cells) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      g.fillStyle = ice ? '#5f8fae' : '#10121c';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = ice ? ((c.tx + c.ty) % 2 ? '#9fd8e8' : '#b8e4f0') : (c.tx + c.ty) % 2 ? '#3a2a20' : '#4a3526';
      g.fillRect(x + 1, y + 1, 6, 6);
      g.fillStyle = ice ? '#ffffff' : '#0b0807';
      const k = (c.tx * 7 + c.ty * 3) % 4;
      g.fillRect(x + 1 + k, y + 1, 1, 3);
      g.fillRect(x + 2 + k, y + 3, 1, 3);
      g.fillRect(x + 1 + ((k + 2) % 4), y + 5, 2, 1);
    }
  }

  // The Vault's door: thick plates and a wheel, its lamp red until the Tallyman's lock lets go.
  function drawVaultDoor(g, world, d, cam) {
    for (const c of d.cells) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      g.fillStyle = '#10121c';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = '#4a4a52';
      g.fillRect(x + 1, y, 6, 8);
      g.fillStyle = '#6c7894';
      g.fillRect(x + 1, y, 1, 8);
    }
    const b = { x: Math.min(...d.cells.map((c) => c.tx)) * 8, y: Math.min(...d.cells.map((c) => c.ty)) * 8, h: d.cells.length * 8 };
    const cx = Math.round(b.x + 4 - cam.x);
    const cy = Math.round(b.y + b.h / 2 - cam.y);
    g.fillStyle = '#a9b6cc';
    g.fillRect(cx - 3, cy - 3, 7, 7);
    g.fillStyle = '#10121c';
    g.fillRect(cx - 2, cy - 2, 5, 5);
    g.fillStyle = '#a9b6cc';
    g.fillRect(cx, cy - 2, 1, 5);
    g.fillRect(cx - 2, cy, 5, 1);
    g.fillStyle = Math.floor(world.time / 20) % 2 ? '#e8434f' : '#3a1520';
    g.fillRect(cx, cy - 8, 1, 2);
  }

  // The cave-in at the Warrens' west end, if the gate fell: hull plates, beams and the village's own patchwork,
  // heaped where the hall came down. Its top edge is ragged.
  function drawRubble(g, world, d, cam) {
    const at = new Set(d.cells.map((c) => c.tx + ',' + c.ty));
    for (const c of d.cells) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      const k = (c.tx * 13 + c.ty * 7) % 5;
      const top = !at.has(c.tx + ',' + (c.ty - 1));
      g.fillStyle = '#0b0807';
      g.fillRect(x, y + (top ? k % 3 : 0), 8, 8 - (top ? k % 3 : 0));
      g.fillStyle = k < 2 ? '#3a4258' : k < 4 ? '#4a3526' : '#5a4028';
      g.fillRect(x + 1, y + 1 + (top ? k % 3 : 0), 6, 5 - (top ? k % 3 : 0));
      g.fillStyle = k < 2 ? '#6c7894' : '#a8743a';
      g.fillRect(x + 1 + k, y + 2 + (top ? k % 3 : 0), 2, 1);
      // a beam, end on, every few cells
      if (k === 3 && !top) {
        g.fillStyle = '#10121c';
        g.fillRect(x + 2, y + 3, 4, 4);
        g.fillStyle = '#5a6b87';
        g.fillRect(x + 3, y + 4, 2, 2);
      }
    }
  }

  // The deep walls' door in the Way Down: boards the Hullfolk nailed across it from their side.
  function drawPlanks(g, world, d, cam) {
    for (const c of d.cells) {
      const x = c.tx * 8 - cam.x;
      const y = c.ty * 8 - cam.y;
      g.fillStyle = '#10121c';
      g.fillRect(x, y, 8, 8);
      g.fillStyle = c.ty % 2 ? '#5a4028' : '#4a3420';
      g.fillRect(x, y + 1, 8, 6);
      g.fillStyle = '#a8743a';
      g.fillRect(x + 1, y + 3, 1, 1);
      g.fillRect(x + 6, y + 3, 1, 1);
    }
  }

  function drawDoor(g, world, d, cam) {
    if (d.legend.crane) return drawStack(g, world, d, cam);
    if (d.legend.cracked) return drawCracked(g, world, d, cam);
    if (d.legend.vault) return drawVaultDoor(g, world, d, cam);
    if (d.legend.rubble) return drawRubble(g, world, d, cam);
    if (d.legend.planks) return drawPlanks(g, world, d, cam);
    // Solder's gate, the one that opens from the Hullfolk's side: patched plates, rivets, and a wheel.
    if (d.legend.kept && d.legend.kept(world.state)) {
      for (const c of d.cells) {
        const x = c.tx * 8 - cam.x;
        const y = c.ty * 8 - cam.y;
        g.fillStyle = '#10121c';
        g.fillRect(x, y, 8, 8);
        g.fillStyle = (c.tx + c.ty) % 2 ? '#5a4028' : '#4a3420';
        g.fillRect(x + 1, y, 6, 8);
        g.fillStyle = '#a8743a';
        g.fillRect(x + 1, y + 1, 1, 1);
        g.fillRect(x + 6, y + 6, 1, 1);
      }
      const xs = d.cells.map((c) => c.tx);
      const ys = d.cells.map((c) => c.ty);
      const wx = Math.min(...xs) * 8 - cam.x;
      const wy = ((Math.min(...ys) + Math.max(...ys) + 1) / 2) * 8 - cam.y;
      g.fillStyle = '#a9b6cc';
      g.fillRect(wx - 1, wy - 4, 1, 8);
      g.fillRect(wx - 3, wy - 1, 5, 1);
      g.fillStyle = '#6c7894';
      g.fillRect(wx - 3, wy - 3, 1, 5);
      return;
    }
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

  HA.scenery = { THEMES, layers, drawBack, drawTerminal, drawDoor, drawCage, drawLight, drawLink, drawGlass, drawSwitch, drawBelts, drawCraneMove, cradleSpot, miniLantern };
})(window.HA);
