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

  // A Warden on foot: the Steward's collectors.
  const WALKER_TOP = [
    '...000000...',
    '..0KKLLKK0..',
    '.0KLkkkkLK0.',
    '.0Lk0rRr0K0.',
    '.0Lkkkkkk0..',
    '..0KKKKKK0..',
    '.0KLLLLLLK0.',
    '0KLkKKKKkLK0',
    '0Kk0KooK0kK0',
    '0K00KKKK00K0',
    '.0..0kk0..0.',
    '....0KK0....',
  ];
  enemies.walker = [
    sprite(WALKER_TOP.concat(['...0K00K0...', '...0k00k0...', '...0k00k0...', '..0KK00KK0..', '..0kk00kk0..', '..000..000..'])),
    sprite(WALKER_TOP.concat(['...0K00K0...', '..0k0..0k0..', '..0k0..0k0..', '.0KK0..0KK0.', '.0kk0..0kk0.', '.000....000.'])),
  ];

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

  // ---- The Hullfolk: small, pale, big-eyed, hooded against the cold of the walls ----
  // Template letters: H hood, e skin, E skin shade, x eyes, C cloth, c cloth shade, D lower cloth, G goggles, A apron
  const ADULT = [
    '..00000..',
    '.0HHHHH0.',
    '0HHeeeee0',
    '0Hexexee0',
    '0Hexexee0',
    '0HHeeeEe0',
    '.0CCCCC0.',
    '0CcCCCCC0',
    '0CcCCCcC0',
    '.0CCCCC0.',
    '.0DDDDD0.',
    '.0DD0DD0.',
    '.00..00..',
  ];
  const ADULT_WALK = ['.0DD0DD0.', '0DD0..0D0', '00....00.'];
  const CHILD = [
    '..0000..',
    '.0HHHH0.',
    '0Heeeee0',
    '0Hexexe0',
    '0Hexexe0',
    '.0eeEe0.',
    '.0CCCC0.',
    '0CcCCC0.',
    '.0CCCC0.',
    '.0D00D0.',
    '.00..00.',
  ];
  const CHILD_WALK = ['.0D0.0D0', '.00...00'];

  function personSprite(rows, colors) {
    const base = Object.assign({ 0: '#10121c', e: '#e9e4d8', E: '#bfb6a6', x: '#10121c' }, colors);
    const img = canvas(rows[0].length, rows.length);
    const c = img.getContext('2d');
    rows.forEach((row, y) => {
      if (row.length !== rows[0].length) throw new Error('Person row width mismatch');
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        c.fillStyle = base[ch] || PAL[ch];
        c.fillRect(x, y, 1, 1);
      }
    });
    return { img, white: tinted(img, '#ffffff'), w: img.width, h: img.height };
  }

  function person(colors, child, extra) {
    let rows = (child ? CHILD : ADULT).slice();
    if (extra) rows = extra(rows);
    const walkRows = rows.slice(0, rows.length - (child ? 2 : 3)).concat(child ? CHILD_WALK : ADULT_WALK);
    const blinkRows = rows.map((r) => r.replace(/x/g, 'e'));
    const kneelRows = rows.slice(0, rows.length - 3).concat(['0DDDDDDD0', '.0000000.']);
    return {
      idle: personSprite(rows, colors),
      blink: personSprite(blinkRows, colors),
      walk: personSprite(walkRows, colors),
      kneel: child ? null : personSprite(kneelRows, colors),
      h: rows.length,
    };
  }
  const goggles = (rows) => rows.map((r, i) => (i === 1 ? '.0HGGGH0.' : r));
  const apron = (rows) => rows.map((r, i) => (i === 7 ? '0CcAAACC0' : i === 8 ? '0CcAAAcC0' : r));
  const people = {
    gasket: person({ H: '#8a8f99', C: '#7a3a3a', c: '#5a2a2a', D: '#4a3a2e' }),
    wick: person({ H: '#a85a4a', C: '#5a6a3a', c: '#3d4a28', D: '#4a3a2e' }),
    solder: person({ H: '#4a3a2e', C: '#5f7f6a', c: '#3d5a4a', D: '#2b2420', G: '#5fd4e8', A: '#7a5a3a' }, false, (r) => apron(goggles(r))),
    shim: person({ H: '#c9a070', C: '#3d5a8a', c: '#2a3d5e', D: '#4a3a2e' }, true),
    tamp: person({ H: '#5a6a3a', C: '#7a5a3a', c: '#5a4028', D: '#2b2420' }),
    brine: person({ H: '#3d5a8a', C: '#a85a4a', c: '#7a3a3a', D: '#4a3a2e' }),
  };

  HA.art = {
    PAL,
    canvas,
    sprite,
    hero,
    guns,
    enemies,
    items,
    icons,
    people,
    tinted,
  };
})(window.HA);
