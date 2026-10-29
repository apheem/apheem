'use strict';
// All art is drawn in code from small pixel maps. Placeholder art for the feel prototype.
(function (HA) {
  const PAL = {
    0: '#10121c', // ink outline
    w: '#eef4f6', // suit white
    s: '#9fb6c8', // suit shade
    d: '#5a6b87', // deep shade
    v: '#ffb84d', // visor amber
    y: '#fff0a8', // highlight
    b: '#2f5fb3', // accent blue
    n: '#1c2c5a', // navy
    p: '#b04ad0', // bloom purple
    P: '#f27ad8', // bloom pink
    m: '#5c2479', // bloom dark
    g: '#7ad1a0', // green
    r: '#e8434f', // red
    R: '#ff8a8a', // light red
    o: '#ff9b3d', // orange
    c: '#5fd4e8', // cyan
    C: '#b8f4ff', // light cyan
    k: '#3a4258', // metal dark
    K: '#6c7894', // metal mid
    L: '#a9b6cc', // metal light
    W: '#ffffff',
  };

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function paint(rows) {
    const h = rows.length;
    const w = rows[0].length;
    const img = canvas(w, h);
    const c = img.getContext('2d');
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error('Sprite row width mismatch: ' + rows.join('/'));
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        c.fillStyle = PAL[ch];
        c.fillRect(x, y, 1, 1);
      }
    }
    return img;
  }

  function tinted(img, color) {
    const out = canvas(img.width, img.height);
    const c = out.getContext('2d');
    c.drawImage(img, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, img.width, img.height);
    return out;
  }

  // A sprite carries its normal image plus a white silhouette for hit flashes.
  function sprite(rows) {
    const img = paint(rows);
    return { img, white: tinted(img, '#ffffff'), w: img.width, h: img.height };
  }

  // ---- Hero: the Late Waker (placeholder until the protagonist is picked) ----
  const HEAD = [
    '....0000....',
    '..00wwww00..',
    '.0wwwwwwww0.',
    '.0wwwsvvvv0.',
    '.0wwsvyyvv0.',
    '.0swsvvvvv0.',
    '.0sswwwwww0.',
    '..00000000..',
  ];
  const TORSO = ['...0bwwb0...', '..0swwwws0..', '..0sbbbbs0..', '..00swws00..'];
  const LEGS = {
    idle: ['...0wd0wd0..', '...0wd0wd0..', '..0nnd0nnd0.', '..0000.0000.'],
    strideA: ['..0wd0.0wd0.', '.0wd0...0wd0', '.0nn0..0nnd0', '.0000..00000'],
    strideB: ['..0dd0.0ws0.', '.0dd0...0ws0', '.0nn0..0nnd0', '.0000..00000'],
    jump: ['...0wwdd0...', '...0nnnd0...', '....0000....', '............'],
    fall: ['...0wd0wd0..', '..0wd0.0wd0.', '..0nn0.0nn0.', '..000...000.'],
  };
  const hero = {
    idle: sprite([...HEAD, ...TORSO, ...LEGS.idle]),
    runA: sprite([...HEAD, ...TORSO, ...LEGS.strideA]),
    runB: sprite([...HEAD, ...TORSO, ...LEGS.strideB]),
    jump: sprite([...HEAD, ...TORSO, ...LEGS.jump]),
    fall: sprite([...HEAD, ...TORSO, ...LEGS.fall]),
  };

  // Guns point right; the grip sits at the left edge, row 2.
  const guns = {
    pistol: sprite(['000000.', '0LLLLL0', '0K0000.', '00.....']),
    cannon: sprite(['.0000000.', '0KKLLLLL0', '0kKKKKKK0', '0k0000000', '00.......']),
    coil: sprite(['.000000.', '0bcCCcc0', '0bbbbbb0', '0b00000.', '00......']),
  };

  // ---- Enemies ----
  const enemies = {
    crawler: [
      sprite([
        '....0000....',
        '..00pPPp00..',
        '.0pPpppPpW0.',
        '0pppmpppp000',
        '0PpppPpppPp0',
        '.0mmmmmmmm0.',
        '.0.0..0..0..',
        '............',
      ]),
      sprite([
        '............',
        '....0000....',
        '..00pPPp00..',
        '.0pPpppPpW0.',
        '0pppmpppp000',
        '0PpppPpppPp0',
        '.0mmmmmmmm0.',
        '..0..0..0.0.',
      ]),
    ],
    drifter: [
      sprite([
        '...0000...',
        '..0PPPP0..',
        '.0PpPPpP0.',
        '0PPpWWpPP0',
        '0PpWrrWpP0',
        '0PPpWWpPP0',
        '.0PpPPpP0.',
        '..0pmmp0..',
        '..0m0.m0..',
        '...0..0...',
      ]),
      sprite([
        '...0000...',
        '..0PPPP0..',
        '.0PpPPpP0.',
        '0PPpWWpPP0',
        '0PpWrrWpP0',
        '0PPpWWpPP0',
        '.0PpPPpP0.',
        '..0pmmp0..',
        '.0m0..0m0.',
        '..0....0..',
      ]),
    ],
    warden: [
      sprite([
        '....000000....',
        '..00KKLLKK00..',
        '.0KLLLLLLLLK0.',
        '0KLkkkkkkkkLK0',
        '0Kk0rrRRrr0kK0',
        '0Kk0rrRRrr0kK0',
        '0KLkkkkkkkkLK0',
        '.0KKKKKKKKKK0.',
        '..0kK0000Kk0..',
        '..0k0....0k0..',
        '...c......c...',
        '..............',
      ]),
      sprite([
        '....000000....',
        '..00KKLLKK00..',
        '.0KLLLLLLLLK0.',
        '0KLkkkkkkkkLK0',
        '0Kk0rrRRrr0kK0',
        '0Kk0rrRRrr0kK0',
        '0KLkkkkkkkkLK0',
        '.0KKKKKKKKKK0.',
        '..0kK0000Kk0..',
        '..0k0....0k0..',
        '..cCc....cCc..',
        '...c......c...',
      ]),
    ],
  };

  // ---- Pickups and HUD icons ----
  const items = {
    shardSmall: [sprite(['.y.', 'yoy', '.y.']), sprite(['.o.', 'oyo', '.o.'])],
    shardBig: [sprite(['..y..', '.yyo.', 'yyooo', '.ooo.', '..o..']), sprite(['..o..', '.oyy.', 'ooyyy', '.yyy.', '..y..'])],
    heart: sprite(['.00.00.', '0RR0rr0', '0RrrrR0', '0rrrrr0', '.0rrr0.', '..0r0..', '...0...']),
    capsule: sprite([
      '..0000..',
      '.0CCCC0.',
      '0CW..cC0',
      '0C.rr.c0',
      '0CrRrrc0',
      '0Crrrrc0',
      '0C.rr.c0',
      '0Cc..cc0',
      '.0KKKK0.',
      '..0000..',
    ]),
  };
  const icons = {
    pistol: sprite(['............', '.00000000...', '.0LLLLLLL0..', '.0KKK00000..', '.0K0........', '.00.........', '............']),
    cannon: sprite(['............', '.0000000000.', '0KKLLLLLLLL0', '0kKKKKKKKK0.', '0k0000000...', '00..........', '............']),
    coil: sprite(['............', '.000000000..', '0bcCCcCcc0..', '0bbbbbbbb0..', '0b0000000...', '00..........', '............']),
  };

  // ---- Room layers (drawn once when the room loads) ----
  function buildRoomLayers(room) {
    const W = room.w * 8;
    const H = room.h * 8;
    return { bg: buildBackground(room, W, H), tiles: buildTiles(room, W, H) };
  }

  function buildBackground(room, W, H) {
    const img = canvas(W, H);
    const g = img.getContext('2d');
    const rnd = HA.seeded(7);
    g.fillStyle = '#0a0d18';
    g.fillRect(0, 0, W, H);
    // wall panels
    for (let y = 0; y < H; y += 24) {
      for (let x = (y / 24) % 2 ? -16 : 0; x < W; x += 32) {
        g.fillStyle = '#0d1120';
        g.fillRect(x + 1, y + 1, 30, 22);
        g.fillStyle = '#10152a';
        g.fillRect(x + 1, y + 1, 30, 1);
        if (rnd() < 0.18) {
          g.fillStyle = '#121a30';
          g.fillRect(x + 6, y + 8, 18, 2);
          g.fillRect(x + 6, y + 12, 12, 2);
        }
      }
    }
    // conduits
    for (const py of [44, 196, 284]) {
      g.fillStyle = '#121a2e';
      g.fillRect(0, py, W, 6);
      g.fillStyle = '#18223b';
      g.fillRect(0, py, W, 1);
      for (let x = 12; x < W; x += 56) {
        g.fillStyle = '#1c2742';
        g.fillRect(x, py - 1, 4, 8);
      }
    }
    // windows onto space, one showing the world the Ark never reached
    for (const [wx, wy, planet] of [
      [72, 52, false],
      [264, 60, false],
      [472, 48, true],
    ]) {
      g.fillStyle = '#1c2540';
      g.fillRect(wx - 3, wy - 3, 62, 36);
      g.fillStyle = '#02030a';
      g.fillRect(wx, wy, 56, 30);
      for (let i = 0; i < 26; i++) {
        g.fillStyle = rnd() < 0.2 ? '#ffffff' : rnd() < 0.5 ? '#8aa0c8' : '#3b4a72';
        g.fillRect(wx + Math.floor(rnd() * 56), wy + Math.floor(rnd() * 30), 1, 1);
      }
      if (planet) {
        g.save();
        g.beginPath();
        g.rect(wx, wy, 56, 30);
        g.clip();
        g.fillStyle = '#1d4b5e';
        g.beginPath();
        g.arc(wx + 44, wy + 40, 22, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2f7f7a';
        g.beginPath();
        g.arc(wx + 40, wy + 38, 15, Math.PI, Math.PI * 1.7);
        g.fill();
        g.restore();
      }
      g.fillStyle = '#26314f';
      g.fillRect(wx + 27, wy, 2, 30);
    }
    // cryo pods near the start, one broken open
    for (let i = 0; i < 6; i++) {
      const px = 40 + i * 18;
      const py = 306;
      g.fillStyle = '#1a2238';
      g.fillRect(px, py, 14, 30);
      g.fillStyle = i === 2 ? '#0c1120' : '#1d3b52';
      g.fillRect(px + 2, py + 3, 10, 22);
      if (i !== 2) {
        g.fillStyle = '#3f6f8a';
        g.fillRect(px + 3, py + 4, 2, 12);
        g.fillStyle = '#2a4d64';
        g.fillRect(px + 5, py + 10, 5, 9);
      } else {
        g.fillStyle = '#3f6f8a';
        g.fillRect(px + 2, py + 22, 3, 2);
        g.fillRect(px + 9, py + 3, 3, 2);
      }
      g.fillStyle = i === 2 ? '#e8434f' : '#5fd4e8';
      g.fillRect(px + 6, py + 27, 2, 1);
    }
    // Bloom growth creeping over the walls
    for (const [bx, by, n] of [
      [270, 330, 40],
      [300, 250, 18],
      [40, 120, 26],
      [560, 90, 14],
    ]) {
      for (let i = 0; i < n; i++) {
        const x = bx + Math.floor((rnd() - 0.5) * 70);
        const y = by + Math.floor((rnd() - 0.5) * 36);
        const r = rnd();
        g.fillStyle = r < 0.55 ? '#2a1238' : r < 0.85 ? '#3d1850' : '#6a2a86';
        g.fillRect(x, y, r < 0.85 ? 2 : 1, r < 0.85 ? 2 : 1);
      }
    }
    // ceiling lights
    for (let x = 40; x < W; x += 96) {
      for (const ly of [16, 144]) {
        const grad = g.createRadialGradient(x, ly + 2, 0, x, ly + 2, 26);
        grad.addColorStop(0, 'rgba(95,212,232,0.18)');
        grad.addColorStop(1, 'rgba(95,212,232,0)');
        g.fillStyle = grad;
        g.fillRect(x - 26, ly - 24, 52, 52);
        g.fillStyle = '#5fd4e8';
        g.fillRect(x - 4, ly, 8, 1);
      }
    }
    // hazard stripes behind the thorn pit
    for (let x = 264; x < 360; x += 8) {
      g.fillStyle = (x / 8) % 2 ? '#3a2a10' : '#151018';
      g.fillRect(x, 322, 8, 4);
    }
    return img;
  }

  const isSolidTile = (t) => t === 1;
  function buildTiles(room, W, H) {
    const img = canvas(W, H);
    const g = img.getContext('2d');
    const solid = (tx, ty) => isSolidTile(room.tile(tx, ty));
    for (let ty = 0; ty < room.h; ty++) {
      for (let tx = 0; tx < room.w; tx++) {
        const t = room.tile(tx, ty);
        const x = tx * 8;
        const y = ty * 8;
        if (t === 1) {
          const up = solid(tx, ty - 1);
          const down = solid(tx, ty + 1);
          const left = solid(tx - 1, ty);
          const right = solid(tx + 1, ty);
          if (up && down && left && right) {
            g.fillStyle = '#141827';
            g.fillRect(x, y, 8, 8);
            if ((tx + ty) % 2 === 0) {
              g.fillStyle = '#171c2d';
              g.fillRect(x + 2, y + 2, 4, 4);
            }
            continue;
          }
          g.fillStyle = '#262e44';
          g.fillRect(x, y, 8, 8);
          g.fillStyle = '#323b56';
          g.fillRect(x + 1, y + 1, 6, 6);
          g.fillStyle = '#46526e';
          if ((tx + ty) % 3 === 0) {
            g.fillRect(x + 1, y + 2, 1, 1);
            g.fillRect(x + 6, y + 5, 1, 1);
          }
          if (!up) {
            g.fillStyle = '#b8f4ff';
            g.fillRect(x, y, 8, 1);
            g.fillStyle = '#5f8fae';
            g.fillRect(x, y + 1, 8, 1);
          }
          if (!down) {
            g.fillStyle = '#0d101b';
            g.fillRect(x, y + 7, 8, 1);
          }
          if (!left) {
            g.fillStyle = '#4a5674';
            g.fillRect(x, y + (up ? 0 : 1), 1, up ? 8 : 7);
          }
          if (!right) {
            g.fillStyle = '#181d2d';
            g.fillRect(x + 7, y + (up ? 0 : 1), 1, up ? 8 : 7);
          }
        } else if (t === 2) {
          g.fillStyle = '#c9d6e8';
          g.fillRect(x, y, 8, 1);
          g.fillStyle = '#6c7894';
          g.fillRect(x, y + 1, 8, 1);
          g.fillStyle = '#3a4258';
          g.fillRect(x, y + 2, 8, 1);
          g.fillStyle = '#262c3e';
          g.fillRect(x + 1, y + 3, 1, 2);
          g.fillRect(x + 5, y + 3, 1, 2);
        } else if (t === 3) {
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

  function buildVignette() {
    const img = canvas(HA.VIEW_W, HA.VIEW_H);
    const g = img.getContext('2d');
    const grad = g.createRadialGradient(160, 90, 70, 160, 90, 200);
    grad.addColorStop(0, 'rgba(2,3,8,0)');
    grad.addColorStop(1, 'rgba(2,3,8,0.55)');
    g.fillStyle = grad;
    g.fillRect(0, 0, HA.VIEW_W, HA.VIEW_H);
    return img;
  }

  HA.art = {
    PAL,
    canvas,
    sprite,
    hero,
    guns,
    enemies,
    items,
    icons,
    buildRoomLayers,
    vignette: buildVignette(),
  };
})(window.HA);
