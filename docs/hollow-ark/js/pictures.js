'use strict';
// Pictures: small scenes drawn in code, shown behind full-screen cards. An epilogue card with { pic: 'name' }
// shows one over its text, and the hero's dreams (yield { dream: 'name', clarity } in scenes.js) show one
// behind what's said in them: washed blue, broken up and dim on the first night, clearer each night after.
// Like the rest of the art they're placeholders. People in the dreams are silhouettes: no faces, no names.
//   HA.pictures.draw(g, name, t, opts)          the picture, full screen (320x180)
//   HA.pictures.dream(g, name, clarity, t, a)   the same picture as a dream, clarity 0 (lost) to 1 (clear)
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const GROUND = 116; // where the epilogue's pictures put the ground; the card's text sits under it

  // ---- Drawing helpers ----
  function rect(g, x, y, w, h, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  function seeded(seed) {
    return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  }
  // A sky in flat bands, top colour first, like the game's other backdrops.
  function sky(g, cols, h = H) {
    const band = Math.ceil(h / cols.length);
    cols.forEach((c, i) => rect(g, 0, i * band, W, band, c));
  }
  function stars(g, n, seed, maxY, t = 0) {
    const r = seeded(seed);
    for (let i = 0; i < n; i++) {
      const x = Math.floor(r() * W);
      const y = Math.floor(r() * maxY);
      const tw = r();
      if (Math.floor(t / 20 + tw * 10) % 9 === 0) continue;
      rect(g, x, y, 1, 1, tw > 0.8 ? '#ffffff' : tw > 0.4 ? '#8aa0c8' : '#3b4a72');
    }
  }
  // Rolling ground from y down, in one colour.
  function hills(g, y, amp, c, seed, freq = 0.02) {
    g.fillStyle = c;
    for (let x = 0; x < W; x++) {
      const top = Math.round(y - amp * (Math.sin(x * freq + seed) + 0.5 * Math.sin(x * freq * 2.3 + seed * 2)));
      g.fillRect(x, top, 1, H - top);
    }
  }
  // Grass blades along a line, leaning in the wind.
  function grass(g, y, c, seed, t, tall = 3) {
    const r = seeded(seed);
    g.fillStyle = c;
    for (let x = 0; x < W; x += 2) {
      const h = 1 + Math.floor(r() * tall);
      const lean = Math.sin(t * 0.03 + x * 0.1) > 0.6 ? 1 : 0;
      g.fillRect(x + lean, y - h, 1, h);
    }
  }
  // One of the game's own sprites, scaled, standing with its feet at (x, y).
  function spr(g, s, x, y, scale = 2, flip = false) {
    if (!s) return;
    g.save();
    g.imageSmoothingEnabled = false;
    g.translate(Math.round(x), Math.round(y - s.h * scale));
    if (flip) {
      g.translate(s.w * scale, 0);
      g.scale(-1, 1);
    }
    g.drawImage(s.img, 0, 0, s.w * scale, s.h * scale);
    g.restore();
  }
  const person = (id, frame = 'idle') => HA.art.people[id] && HA.art.people[id][frame];
  // A person as a shape, h pixels tall with their feet at (x, y). o: child, hair (a tail behind), coat, arm (raised
  // toward the glass), sit, rim (a light's colour along the side facing it: rimSide -1 left, 1 right).
  function sil(g, x, y, h, c, o = {}) {
    if (o.rim) {
      g.save();
      g.translate(o.rimSide || -1, 0);
      sil(g, x, y, h, o.rim, Object.assign({}, o, { rim: null }));
      g.restore();
    }
    const hs = Math.max(2, Math.round(h * (o.child ? 0.26 : 0.2)));
    const bw = Math.max(3, Math.round(h * 0.3));
    const top = y - h;
    rect(g, x - hs / 2, top, hs, hs, c);
    if (o.hair) rect(g, x - hs / 2 - (o.facing < 0 ? -hs : 2), top + 1, 2, Math.max(2, hs - 1), c);
    const by = top + hs;
    const body = Math.round(h * (o.coat ? 0.58 : o.sit ? 0.4 : 0.42));
    rect(g, x - bw / 2, by, bw, body, c);
    if (o.coat) rect(g, x - bw / 2 - 1, by + body - 3, bw + 2, 3, c);
    if (o.arm) rect(g, x + (o.facing < 0 ? -bw / 2 - Math.round(h * 0.25) : bw / 2), by + 2, Math.round(h * 0.25), 2, c);
    if (o.sit) return;
    const legs = y - (by + body);
    if (legs > 0) {
      rect(g, x - bw / 2, by + body, Math.max(1, Math.floor(bw / 2) - 1), legs, c);
      rect(g, x + 1, by + body, Math.max(1, Math.floor(bw / 2) - 1), legs, c);
    }
  }
  // A cryo pod, 14x23 at scale 1, top-left at (x, y). o: glass ('asleep', 'open', 'pink'), frost (0-1), light.
  function pod(g, x, y, s, o = {}) {
    rect(g, x, y, 14 * s, 23 * s, '#10121c');
    rect(g, x + s, y + s, 12 * s, 21 * s, o.shell || '#3a4258');
    rect(g, x + s, y + s, 12 * s, s, '#6c7894');
    const gx = x + 3 * s;
    const gy = y + 3 * s;
    if (o.glass === 'open') rect(g, gx, gy, 8 * s, 15 * s, '#05060d');
    else {
      rect(g, gx, gy, 8 * s, 15 * s, o.glass === 'pink' ? '#8a5a7a' : '#9fd8e8');
      rect(g, gx + s, gy + s, 2 * s, 9 * s, '#d8f4ff');
      rect(g, gx + 4 * s, gy + 7 * s, 3 * s, 6 * s, o.glass === 'pink' ? '#6a3a5a' : '#5fa8c0');
    }
    if (o.frost) rect(g, gx, gy + 15 * s * (1 - o.frost), 8 * s, 15 * s * o.frost, 'rgba(238,244,246,0.55)');
    if (o.glass === 'pink') {
      const r = seeded(x + y);
      for (let i = 0; i < 9 * s; i++) rect(g, gx + Math.floor(r() * 8 * s), gy + Math.floor(r() * 15 * s), s, s, r() > 0.5 ? '#f27ad8' : '#c050a0');
    }
    if (o.light) rect(g, x + 6 * s, y + 20 * s, 2 * s, s, o.light);
  }
  function lantern(g, x, y) {
    HA.scenery.miniLantern(g, x, y);
  }
  function fire(g, x, y, t) {
    const glow = g.createRadialGradient(x, y - 4, 0, x, y - 4, 40);
    glow.addColorStop(0, 'rgba(255,140,60,0.35)');
    glow.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = glow;
    g.fillRect(x - 40, y - 44, 80, 80);
    rect(g, x - 6, y - 2, 12, 2, '#4a3a2e');
    for (let i = 0; i < 5; i++) {
      const h = 4 + ((t / 4 + i * 7) % 6);
      rect(g, x - 4 + i * 2, y - 2 - h, 2, h, i % 2 ? '#ffb84d' : '#ff6a3a');
    }
    rect(g, x - 1, y - 9 - (Math.floor(t / 6) % 3), 2, 2, '#fff0a8');
  }
  // A freed Warden: tall, square-shouldered, its eyes the counts' cyan (or red, counting for a new holder).
  function warden(g, x, y, h, eye = '#5fd4e8') {
    rect(g, x - h * 0.22, y - h, h * 0.44, h * 0.3, '#3a4258');
    rect(g, x - h * 0.12, y - h + h * 0.1, h * 0.24, 2, eye);
    rect(g, x - h * 0.3, y - h * 0.68, h * 0.6, h * 0.38, '#2a3044');
    rect(g, x - h * 0.2, y - h * 0.3, h * 0.12, h * 0.3, '#2a3044');
    rect(g, x + h * 0.08, y - h * 0.3, h * 0.12, h * 0.3, '#2a3044');
  }
  function arkSmall(g, x, y, t, opts) {
    HA.art.drawArk(g, x, y, 1, t, opts || {});
  }
  // The new world's sky by day, by dusk, by night, and burning.
  const DAWN = ['#1a2340', '#2a3558', '#4a4a6a', '#8a6a7a', '#d89a7a', '#f2c88a'];
  const DAY = ['#3a5a8a', '#4a6a9a', '#5a7aa8', '#7a96b8', '#9ab0c4', '#b8c8d0'];
  const DUSK = ['#141a30', '#1f2846', '#2e3658', '#4a4466', '#6a5068', '#8a6070'];
  const NIGHT = ['#04050b', '#070a16', '#0b1020', '#10162a', '#141c34', '#1a2440'];
  const BURN = ['#1a1014', '#2a1418', '#4a1e1a', '#7a2e1e', '#a8461e', '#c8642a'];

  // ---- The dreams (Mara's thread; see STORYBOARD.md, "Mara, and the dreams") ----
  const DREAMS = {
    // The first night: two pods in the dark, one closed with a small shape inside, an adult with a hand on its glass.
    pods(g, t) {
      rect(g, 0, 0, W, H, '#05060d');
      for (let i = 0; i < 6; i++) rect(g, 20 + i * 52, 20, 2, 110, '#10121c');
      rect(g, 0, 128, W, 2, '#1a1e2c');
      pod(g, 104, 34, 4, { glass: 'asleep', frost: 0.5 + 0.1 * Math.sin(t * 0.02), light: '#5fd4e8' });
      sil(g, 132, 100, 26, '#2a5a74', { child: true, hair: true });
      pod(g, 184, 34, 4, { glass: 'open' });
      sil(g, 172, 128, 44, '#0b0d14', { arm: true, facing: -1, rim: '#5fa8c0' });
    },
    // The second night: a small room, a lamp, a child writing at the table, someone on the bunk listening.
    list(g, t) {
      rect(g, 0, 0, W, H, '#1c2236');
      // the window: no stars, only the haze of a city's lights
      rect(g, 40, 22, 70, 50, '#10121c');
      rect(g, 43, 25, 64, 44, '#2a2e3e');
      const r = seeded(9);
      for (let i = 0; i < 40; i++) rect(g, 44 + Math.floor(r() * 62), 50 + Math.floor(r() * 18), 1, 1, r() > 0.7 ? '#ffb84d' : '#6c7894');
      rect(g, 74, 25, 2, 44, '#10121c');
      rect(g, 0, 118, W, 62, '#0b0e18');
      // the table and the lamp
      rect(g, 120, 96, 90, 4, '#4a3a2e');
      rect(g, 126, 100, 3, 18, '#3a2e24');
      rect(g, 200, 100, 3, 18, '#3a2e24');
      const glow = g.createRadialGradient(190, 84, 0, 190, 84, 70);
      glow.addColorStop(0, 'rgba(255,200,120,0.55)');
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = glow;
      g.fillRect(130, 24, 120, 120);
      rect(g, 186, 82, 8, 6, '#ffb84d');
      rect(g, 189, 88, 2, 8, '#6c7894');
      rect(g, 150, 93, 14, 3, '#eef4f6');
      if (Math.floor(t / 10) % 4) rect(g, 155 + (Math.floor(t / 10) % 8), 93, 1, 1, '#10121c');
      sil(g, 160, 118, 24, '#07080e', { child: true, hair: true, sit: true, rim: '#c89a60', rimSide: 1 });
      rect(g, 154, 108, 12, 10, '#07080e');
      // the bunk
      rect(g, 228, 98, 70, 6, '#2a3044');
      rect(g, 228, 104, 4, 14, '#1a1e2c');
      rect(g, 294, 104, 4, 14, '#1a1e2c');
      sil(g, 252, 98, 34, '#07080e', { sit: true, rim: '#8a6a50' });
    },
    // The third night: rain on the kitchen window, two tickets on the table, three people around it.
    tickets(g, t) {
      rect(g, 0, 0, W, H, '#20263a');
      rect(g, 214, 18, 72, 56, '#10121c');
      rect(g, 217, 21, 66, 50, '#2e3446');
      for (let i = 0; i < 14; i++) {
        const x = 218 + ((i * 23) % 64);
        const y = 21 + ((t * 2 + i * 37) % 48);
        rect(g, x, y, 1, 3, '#6c7894');
      }
      rect(g, 249, 21, 2, 50, '#10121c');
      rect(g, 0, 118, W, 62, '#0d1018');
      const glow = g.createRadialGradient(150, 70, 0, 150, 70, 80);
      glow.addColorStop(0, 'rgba(255,214,160,0.5)');
      glow.addColorStop(1, 'rgba(255,214,160,0)');
      g.fillStyle = glow;
      g.fillRect(70, 0, 160, 140);
      rect(g, 146, 22, 8, 4, '#ffd9a0');
      rect(g, 149, 10, 2, 12, '#3a4258');
      rect(g, 96, 92, 120, 4, '#4a3a2e');
      rect(g, 100, 96, 3, 22, '#3a2e24');
      rect(g, 208, 96, 3, 22, '#3a2e24');
      const pulse = Math.floor(t / 30) % 2 ? '#fff0a8' : '#eef4f6';
      rect(g, 136, 89, 12, 3, pulse);
      rect(g, 152, 89, 12, 3, pulse);
      sil(g, 76, 118, 50, '#07080e', { coat: true, facing: 1, rim: '#c8a070', rimSide: 1 });
      sil(g, 120, 118, 24, '#07080e', { child: true, hair: true, sit: true, rim: '#c8a070', rimSide: 1 });
      rect(g, 114, 108, 12, 10, '#07080e');
      sil(g, 190, 118, 40, '#07080e', { sit: true, rim: '#c8a070' });
      rect(g, 182, 104, 16, 14, '#07080e');
    },
    // The fourth night: boarding day, clear. The new cryo bay lit white, crew in white, rows of open pods, and in front
    // a small one closed with her inside, frost climbing the glass, and a hand on it.
    boarding(g, t) {
      rect(g, 0, 0, W, H, '#c8d0d8');
      rect(g, 0, 0, W, 12, '#e8eef2');
      for (let i = 0; i < 8; i++) rect(g, i * 44, 12, 2, 106, '#aab4c0');
      rect(g, 0, 118, W, 62, '#9aa4b0');
      for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) pod(g, 8 + i * 36 + row * 18, 40 + row * 18, 1, { glass: row ? 'asleep' : 'open', shell: '#8a94a4', frost: row ? 0.6 : 0 });
      sil(g, 40, 118, 40, '#eef4f6');
      sil(g, 288, 118, 40, '#eef4f6', { arm: true, facing: -1 });
      const frost = Math.min(1, 0.2 + t / 600);
      pod(g, 122, 26, 4, { glass: 'asleep', shell: '#6c7894', frost, light: '#5fd4e8' });
      sil(g, 150, 94, 26, '#3a5a74', { child: true, hair: true });
      sil(g, 210, 118, 46, '#2a3044', { arm: true, facing: -1 });
    },
  };

  // ---- The epilogue (endings.js puts one behind a card with pic: 'name'; v is the variant) ----
  const EPILOGUE = {
    // Shim on the ground, not a floor. Burning on the sleds' world; with his mother's lantern on the truth path.
    shim(g, t, v) {
      sky(g, v.burning ? BURN : DAWN, GROUND);
      if (v.burning) for (let i = 0; i < 4; i++) rect(g, 30 + i * 80, 40 + (i % 2) * 12 - ((t / 3 + i * 20) % 40), 3, 6, '#3a2a2a');
      else rect(g, 236, 70, 20, 4, '#fff0a8');
      hills(g, GROUND - 6, 4, v.burning ? '#2a1a14' : '#2a3a2a', 1);
      rect(g, 0, GROUND, W, H - GROUND, v.burning ? '#1a1210' : '#1e2a1e');
      grass(g, GROUND, v.burning ? '#3a2a1a' : '#4a6a3a', 2, t);
      spr(g, person('shim'), 150, GROUND, 3);
      if (v.lantern) lantern(g, 172, GROUND - 16);
    },
    // Old Gasket, sitting on the ground, breathing out; or by the fire, counting them at lights-out.
    gasket(g, t, v) {
      if (v.fire) {
        sky(g, NIGHT, GROUND);
        stars(g, 40, 5, GROUND - 30, t);
        rect(g, 0, GROUND, W, H - GROUND, '#0d1010');
        fire(g, 160, GROUND, t);
        spr(g, person('gasket', 'kneel'), 112, GROUND, 2);
        for (let i = 0; i < 5; i++) spr(g, person(i % 2 ? 'tamp' : 'brine', 'sleep'), 190 + i * 22, GROUND, 2);
        return;
      }
      sky(g, DAY, GROUND);
      hills(g, GROUND - 10, 6, '#3a5a3a', 4);
      rect(g, 0, GROUND, W, H - GROUND, '#2a3a2a');
      grass(g, GROUND, '#4a6a3a', 6, t);
      spr(g, person('gasket', 'kneel'), 150, GROUND, 3);
      const k = (t % 120) / 120;
      if (k < 0.5) rect(g, 178 + k * 20, GROUND - 32 - k * 6, 3 + k * 6, 2, 'rgba(238,244,246,' + (0.6 - k) + ')');
    },
    // Solder's gate: two posts and a gate that stands open both ways, a few roofs behind. Shut and one-sided in Dominion.
    gate(g, t, v) {
      sky(g, v.shut ? NIGHT : DAWN, GROUND);
      if (!v.shut) for (let i = 0; i < 5; i++) rect(g, 30 + i * 60, GROUND - 22, 30, 22, '#3a2e24');
      else rect(g, 0, 20, W, GROUND - 20, '#1a1e2c');
      rect(g, 0, GROUND, W, H - GROUND, v.shut ? '#10121c' : '#2a3020');
      rect(g, 128, GROUND - 46, 6, 46, '#6c7894');
      rect(g, 186, GROUND - 46, 6, 46, '#6c7894');
      rect(g, 128, GROUND - 48, 64, 3, '#a9b6cc');
      if (v.shut) for (let i = 0; i < 6; i++) rect(g, 136 + i * 9, GROUND - 44, 3, 44, '#3a4258');
      else {
        for (let i = 0; i < 3; i++) rect(g, 108 + i * 6, GROUND - 40, 2, 38, '#3a4258');
        for (let i = 0; i < 3; i++) rect(g, 196 + i * 6, GROUND - 40, 2, 38, '#3a4258');
      }
      spr(g, person('solder'), v.shut ? 214 : 158, GROUND, 2);
    },
    // The village coming down the hill with its lanterns; or the sleds, half buried, the few left beside them.
    warrens(g, t, v) {
      if (v.sleds) {
        sky(g, BURN, GROUND);
        rect(g, 0, GROUND, W, H - GROUND, '#1a1210');
        for (let i = 0; i < 4; i++) {
          rect(g, 40 + i * 70, GROUND - 10, 40, 10, '#3a4258');
          rect(g, 44 + i * 70, GROUND - 14, 30, 4, '#6c7894');
        }
        const n = v.few ? 3 : 8;
        for (let i = 0; i < n; i++) spr(g, person(['tamp', 'brine', 'woken1', 'woken2', 'woken3'][i % 5]), 60 + i * 26, GROUND, 2);
        return;
      }
      sky(g, DUSK, GROUND);
      stars(g, 30, 8, 50, t);
      hills(g, GROUND - 4, 22, '#1e2a24', 2, 0.012);
      rect(g, 0, GROUND, W, H - GROUND, '#141c18');
      for (let i = 0; i < 12; i++) {
        const x = 30 + i * 22 + ((t * 0.1) % 22);
        const y = GROUND - 10 - Math.max(0, 30 - i * 4);
        sil(g, x, y + 10, 9, '#10121c');
        if (i % 2 === 0) rect(g, x + 4, y + 2, 2, 2, '#ffb84d');
      }
    },
    // The freed Wardens in the grass, remembering their names; or rows of them, red-eyed, for the new holder.
    wardens(g, t, v) {
      if (v.holder) {
        sky(g, NIGHT, GROUND);
        rect(g, 0, 10, W, GROUND - 10, '#10121c');
        rect(g, 0, GROUND, W, H - GROUND, '#0b0d14');
        for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) warden(g, 30 + i * 38 + row * 19, GROUND - row * 14, 34 - row * 8, Math.floor(t / 40 + i) % 5 ? '#ff4a4a' : '#7a2a2a');
        return;
      }
      sky(g, DUSK, GROUND);
      stars(g, 40, 12, 60, t);
      rect(g, 0, GROUND, W, H - GROUND, '#1a241e');
      grass(g, GROUND, '#2e4a32', 13, t, 4);
      const n = v.n || 3;
      for (let i = 0; i < n; i++) warden(g, 160 + (i - (n - 1) / 2) * 56, GROUND, 48);
    },
    // The pods open in the grass under a real sky; fall like seeds; or stay asleep in the dark stacks.
    sleepers(g, t, v) {
      if (v.dark) {
        rect(g, 0, 0, W, H, '#05060d');
        for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) pod(g, 4 + i * 26 + (row % 2) * 13, 6 + row * 36, 1, { glass: 'asleep', light: '#3b4a72' });
        pod(g, 140, 50, 2, { glass: 'asleep', light: '#5fd4e8', frost: 0.8 });
        return;
      }
      if (v.falling) {
        sky(g, DUSK, GROUND);
        stars(g, 30, 14, 60, t);
        hills(g, GROUND, 8, '#1e2a24', 5);
        for (let i = 0; i < 9; i++) {
          const x = 20 + i * 34 + ((t * 0.4 + i * 30) % 40);
          const y = ((t * 0.8 + i * 23) % (GROUND + 20)) - 20;
          rect(g, x - 1, y - 12, 1, 10, 'rgba(255,184,77,0.5)');
          rect(g, x - 2, y, 4, 6, '#a9b6cc');
        }
        return;
      }
      sky(g, DAY, GROUND);
      hills(g, GROUND - 8, 6, '#3a5a3a', 7);
      rect(g, 0, GROUND, W, H - GROUND, '#2a3a2a');
      for (let i = 0; i < 7; i++) {
        const x = 20 + i * 42;
        g.save();
        g.translate(x + 7, GROUND - 4);
        g.rotate(Math.PI / 2);
        pod(g, -7, -12, 1, { glass: i % 3 ? 'open' : 'asleep' });
        g.restore();
        if (i % 3) sil(g, x + 24, GROUND, 14, '#1e2a1e');
      }
      grass(g, GROUND, '#4a6a3a', 9, t);
    },
    // Mara under the sky. With the hero there (their suit, her small shape beside it); alone, looking up at a moving
    // star that is the Ark; in the tall grass by her open pod; or still in 0418, pink on the glass.
    mara(g, t, v) {
      if (v.pink) {
        rect(g, 0, 0, W, H, '#0b0810');
        pod(g, 128, 8, 3, { glass: 'pink', light: '#f27ad8' });
        if (v.hero) spr(g, HA.art.heroFor(7).idle, 196, GROUND, 2, true);
        return;
      }
      sky(g, v.night ? NIGHT : DAWN, GROUND);
      stars(g, v.night ? 70 : 20, 21, GROUND - 40, t);
      if (v.alone) arkSmall(g, 60 + t * 0.02, 30, t);
      hills(g, GROUND - 6, 5, '#1e2a24', 3);
      rect(g, 0, GROUND, W, H - GROUND, '#16201a');
      if (v.grass) {
        for (let x = 0; x < W; x += 2) rect(g, x, GROUND - 6 - (x % 7), 1, 6 + (x % 7), '#3a5a3a');
        pod(g, 100, GROUND - 26, 1, { glass: 'open' });
      }
      if (v.hero) spr(g, HA.art.hero.idle, 140, GROUND, 2, true);
      spr(g, person('mara'), v.hero ? 166 : 152, GROUND, 2, !v.hero);
      if (v.list) rect(g, 184, GROUND - 12, 4, 3, '#eef4f6');
    },
    // The Navigator: a cyan lamp in a schoolroom, humming; or its core gone dark and quiet.
    navigator(g, t, v) {
      rect(g, 0, 0, W, H, v.school ? '#2a2420' : '#05060d');
      const a = 0.25 + 0.1 * Math.sin(t * 0.04);
      const glow = g.createRadialGradient(160, 60, 0, 160, 60, v.school ? 90 : 50);
      glow.addColorStop(0, 'rgba(184,244,255,' + a + ')');
      glow.addColorStop(1, 'rgba(184,244,255,0)');
      g.fillStyle = glow;
      g.fillRect(40, 0, 240, 140);
      rect(g, 154, 52, 12, 12, v.school ? '#b8f4ff' : '#3b4a72');
      rect(g, 158, 64, 4, 10, '#6c7894');
      if (!v.school) return;
      rect(g, 0, GROUND, W, H - GROUND, '#1a1410');
      for (let i = 0; i < 6; i++) spr(g, person(i % 2 ? 'shim' : 'woken4', 'kneel'), 70 + i * 36, GROUND, 2, i > 2);
    },
    // The deserter's boat on the new world, the hero alone beside it, the Ark a moving star.
    boat(g, t) {
      sky(g, DUSK, GROUND);
      stars(g, 40, 31, 70, t);
      arkSmall(g, 220 + t * 0.02, 26, t);
      rect(g, 0, GROUND, W, H - GROUND, '#16201a');
      grass(g, GROUND, '#2e4a32', 33, t);
      rect(g, 60, GROUND - 14, 60, 14, '#3a4258');
      rect(g, 66, GROUND - 20, 40, 6, '#6c7894');
      rect(g, 72, GROUND - 18, 8, 3, '#5fd4e8');
      spr(g, HA.art.hero.idle, 170, GROUND, 2);
    },
    // The seed vault's box open in a ploughed field, and the first rows coming up green, two of them planting.
    seeds(g, t) {
      sky(g, DAY, GROUND);
      hills(g, GROUND - 10, 6, '#3a5a3a', 11);
      rect(g, 0, GROUND, W, H - GROUND, '#2e2418');
      for (let x = 8; x < W; x += 9) {
        const grown = 2 + ((x * 7) % 4);
        rect(g, x, GROUND - grown, 1, grown, '#5a8a3a');
        rect(g, x - 1, GROUND - grown, 3, 1, Math.floor(t / 30 + x) % 9 ? '#7ab04a' : '#9ad06a');
      }
      rect(g, 40, GROUND - 14, 26, 14, '#5a4a3a');
      rect(g, 38, GROUND - 18, 30, 3, '#7a6a52');
      rect(g, 44, GROUND - 10, 18, 2, '#a9b6cc');
      spr(g, person('woken2', 'kneel'), 150, GROUND, 2);
      spr(g, person('tamp', 'kneel'), 200, GROUND, 2, true);
    },
    // Dunn and his girl on the hillside at night, the sky full, one star brighter than the rest.
    star(g, t) {
      sky(g, NIGHT, GROUND);
      stars(g, 90, 41, GROUND - 30, t);
      const k = 0.6 + 0.4 * Math.sin(t * 0.06);
      rect(g, 236, 26, 3, 3, '#fff0a8');
      rect(g, 234, 27, 7, 1, 'rgba(255,240,168,' + k + ')');
      rect(g, 237, 24, 1, 7, 'rgba(255,240,168,' + k + ')');
      hills(g, GROUND - 4, 8, '#141c18', 6);
      rect(g, 0, GROUND, W, H - GROUND, '#10160f');
      spr(g, person('woken3'), 150, GROUND, 2);
      sil(g, 174, GROUND, 18, '#4a5a6a', { child: true, arm: true, rim: '#8a9aaa', rimSide: 1 });
    },
    // The Cold Store: Odell at his terminal, still waiting, and his boots set down beside him in their box.
    odell(g, t) {
      rect(g, 0, 0, W, H, '#0b1018');
      for (let i = 0; i < 40; i++) rect(g, (i * 37) % W, (i * 53) % GROUND, 1, 1, '#2a3a4a');
      rect(g, 0, GROUND, W, H - GROUND, '#141c26');
      rect(g, 180, GROUND - 40, 34, 26, '#1a2230');
      rect(g, 183, GROUND - 37, 28, 18, Math.floor(t / 50) % 2 ? '#b8f4ff' : '#8ad0e0');
      rect(g, 186, GROUND - 33, 18, 1, '#10121c');
      rect(g, 186, GROUND - 29, 12, 1, '#10121c');
      rect(g, 194, GROUND - 14, 4, 14, '#3a4258');
      rect(g, 160, GROUND - 12, 18, 3, '#3a4258');
      rect(g, 162, GROUND - 9, 2, 9, '#3a4258');
      rect(g, 174, GROUND - 9, 2, 9, '#3a4258');
      sil(g, 169, GROUND - 12, 30, '#3a4656', { sit: true, rim: '#7a8aa0', rimSide: 1 });
      rect(g, 120, GROUND - 8, 22, 8, '#5a4a3a');
      rect(g, 122, GROUND - 14, 7, 6, '#6c7894');
      rect(g, 132, GROUND - 14, 7, 6, '#6c7894');
      rect(g, 122, GROUND - 9, 9, 2, '#3a4258');
      rect(g, 132, GROUND - 9, 9, 2, '#3a4258');
    },
    // Shim at the bottom of a shaft in the Warrens, looking up.
    shaft(g, t) {
      rect(g, 0, 0, W, H, '#0b0d14');
      rect(g, 136, 0, 48, GROUND, '#141828');
      for (let y = 0; y < GROUND; y += 12) rect(g, 136, y, 48, 1, '#1a1e2c');
      rect(g, 152, 0, 16, 8, '#2a3044');
      rect(g, 0, GROUND, W, H - GROUND, '#10121c');
      spr(g, person('shim'), 154, GROUND, 2);
      lantern(g, 120, GROUND - 10);
    },
  };

  function draw(g, name, t = 0, opts = {}) {
    const f = DREAMS[name] || EPILOGUE[name];
    if (!f) return;
    g.save();
    f(g, t, opts);
    g.restore();
  }

  // The same picture as a dream: drawn to a buffer, then washed toward the dream's blue, dimmed, broken into
  // static and wavering by line. All of that fades as clarity rises.
  let buf = null;
  function dream(g, name, clarity, t, alpha = 1) {
    if (!buf) buf = HA.art.canvas(W, H);
    const b = buf.getContext('2d');
    b.clearRect(0, 0, W, H);
    draw(b, name, t);
    const img = b.getImageData(0, 0, W, H);
    const src = new Uint8ClampedArray(img.data);
    const d = img.data;
    const wash = 0.85 - 0.6 * clarity;
    const dim = 0.7 + 0.35 * clarity;
    const lost = (1 - clarity) * 0.42;
    const waver = clarity < 0.7 ? (0.7 - clarity) * 5 : 0;
    const frame = Math.floor(t / 5);
    for (let y = 0; y < H; y++) {
      const shift = waver ? Math.round(Math.sin(y * 0.25 + t * 0.06) * waver) : 0;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const sx = Math.min(W - 1, Math.max(0, x - shift));
        const j = (y * W + sx) * 4;
        const h = ((((x * 73856093) ^ (y * 19349663) ^ (frame * 83492791)) >>> 0) % 1000) / 1000;
        // the edges darken toward black, less so as the dream clears
        const dx = (x - W / 2) / (W / 2);
        const dy = (y - H / 2) / (H / 2);
        const edge = Math.max(0, 1 - (dx * dx + dy * dy) * (0.7 - 0.45 * clarity));
        if (h < lost) {
          d[i] = 6;
          d[i + 1] = 8;
          d[i + 2] = 16;
          continue;
        }
        const r = src[j];
        const gg = src[j + 1];
        const bb = src[j + 2];
        const lum = 0.3 * r + 0.59 * gg + 0.11 * bb;
        const k = dim * edge;
        d[i] = (r * (1 - wash) + lum * 0.7 * wash) * k;
        d[i + 1] = (gg * (1 - wash) + lum * 0.85 * wash) * k;
        d[i + 2] = (bb * (1 - wash) + lum * 1.15 * wash) * k;
      }
    }
    b.putImageData(img, 0, 0);
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(buf, 0, 0);
    g.restore();
  }

  HA.pictures = { draw, dream, GROUND, names: () => Object.keys(DREAMS).concat(Object.keys(EPILOGUE)) };
})(window.HA);
