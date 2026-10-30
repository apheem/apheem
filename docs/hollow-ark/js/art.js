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
    q: '#ffc2dc', // bloom pale pink
    h: '#d8cfc0', // skin
    u: '#2e2a3e', // the Steward's uniform
    U: '#4a4060', // uniform light
    G: '#3f7a4a', // leaf green
    t: '#1f3a28', // leaf dark
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
    return { img, white: tinted(img, '#ffffff'), pink: tinted(img, '#f27ad8'), w: img.width, h: img.height };
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
  function heroSet(head, torso) {
    return {
      idle: sprite([...head, ...torso, ...LEGS.idle]),
      runA: sprite([...head, ...torso, ...LEGS.strideA]),
      runB: sprite([...head, ...torso, ...LEGS.strideB]),
      jump: sprite([...head, ...torso, ...LEGS.jump]),
      fall: sprite([...head, ...torso, ...LEGS.fall]),
      // on one knee, getting up (after the thaw)
      kneel: sprite(['............', '............', ...head, ...torso.slice(0, 3), '..0wwwwdd0..', '.0nnnnnnd00.', '.000000000..']),
    };
  }
  const hero = heroSet(HEAD, TORSO);
  // The Bloom changes the suit (see bloom.js): at 3 a pink visor and veins, at 5 a thorn through the rear
  // shoulder, at 7 eyes that glow through the visor.
  const swap = (rows, map) => rows.map((r) => r.replace(/./g, (c) => map[c] || c));
  const veins = (rows) => rows.map((r, i) => (i === 6 ? '.0sswpwwww0.' : r));
  const veinTorso = (rows) => rows.map((r, i) => (i === 0 ? '...0bwpb0...' : i === 1 ? '..0swpwws0..' : r));
  const thorn = (rows) => rows.map((r, i) => (i === 5 ? 'P' + r.slice(1) : i === 6 ? '.P' + r.slice(2) : i === 7 ? '.mP' + r.slice(3) : r));
  const HEAD3 = veins(swap(HEAD, { v: 'P', y: 'q' }));
  const heroStages = {
    0: hero,
    3: heroSet(HEAD3, veinTorso(TORSO)),
    5: heroSet(thorn(HEAD3), veinTorso(TORSO)),
    7: heroSet(thorn(veins(swap(HEAD, { v: 'm', y: 'W' }))), veinTorso(TORSO)),
  };
  const heroFor = (stage) => heroStages[stage] || hero;

  // Guns point right; the grip sits at the left edge, row 2.
  const guns = {
    scatter: sprite(['.000000.', '0kKKKKK0', '0kG0000.', '00......']),
    lancets: sprite(['..0.0..', '00L0L00', '0hhLLL0', '00000..']),
    thorn: sprite(['......00', '000PPPq0', '0mpPPP0.', '00000...']),
    pistol: sprite(['000000.', '0LLLLL0', '0K0000.', '00.....']),
    repeater: sprite(['0000000.', '0LLLLLL0', '0kK00000', '0K0LLLL0', '00.0000.']),
    cannon: sprite(['.0000000.', '0KKLLLLL0', '0kKKKKKK0', '0k0000000', '00.......']),
    coil: sprite(['.000000.', '0bcCCcc0', '0bbbbbb0', '0b00000.', '00......']),
    harpoon: sprite(['.0000000.', '0kKKKKKLW', '0k0000000', '00.......']),
    charges: sprite(['.0000000.', '0kLLLLLr0', '0kKKKKKr0', '0K0000000', '00.......']),
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

  // The Gardens. A Warden picker: a lens on a long neck, a picking arm (drawn in code), and stilts.
  const PICKER_TOP = [
    '....0000....',
    '...0KLLK0...',
    '..0KkkkkK0..',
    '..0k0rR0k0..',
    '..0KkkkkK0..',
    '...0KKKK0...',
    '....0kk0....',
    '...0KLLK0...',
    '..0KLkkLK0..',
    '..0Kk00kK0..',
    '..0KkGGkK0..',
    '..0KLkkLK0..',
    '...0KKKK0...',
    '....0kk0....',
    '...0k00k0...',
  ];
  enemies.picker = [
    sprite(PICKER_TOP.concat(['...0k00k0...', '..0k0..0k0..', '..0k0..0k0..', '..0k0..0k0..', '.0k0....0k0.', '.0k0....0k0.', '.0k0....0k0.', '.0K0....0K0.', '0kK0....0Kk0', '0000....0000', '............'])),
    sprite(PICKER_TOP.concat(['...0k00k0...', '...0k00k0...', '..0k0..0k0..', '..0k0..0k0..', '..0k0..0k0..', '.0k0....0k0.', '.0k0....0k0.', '.0K0....0K0.', '.0kK0..0Kk0.', '.0000..0000.', '............'])),
  ];
  // The Bloomsworn: a soldier in the Steward's colours, the Bloom pushing through the cloth.
  const SWORN_TOP = ['....0000....', '...0uuuu0...', '..0uUUUUu0..', '..0hPhhPh0..', '..0hhhhhh0..', '...0hphh0...', '..0uuuuuu0..', '.0uuPuuuuu0.', '0uPpuUUuuuu0', '0u0uuUUuu0u0', '0h0uuuuuu0h0', '.0.0uuuu0.0.'];
  enemies.bloomsworn = [
    sprite(SWORN_TOP.concat(['...0uu0uu0..', '...0uu0uu0..', '..0Uu0.0uU0.', '..000..000..'])),
    sprite(SWORN_TOP.concat(['..0uu0.0uu0.', '.0uu0...0uu0', '.0Uu0...0uU0', '.000.....000'])),
  ];
  enemies.bloomswornStagger = sprite([
    '............',
    '............',
    '....0000....',
    '...0uuuu0...',
    '..0uUUUUu0..',
    '..0hhhhhh0..',
    '..0hPhhPh0..',
    '..0uuuuuu0..',
    '.0uuPpuuuu0.',
    '0uPpuUUuuuu0',
    '0h0uuUUuu0h0',
    '.0.0uuuu0.0.',
    '...0uu0uu0..',
    '..0Uu0.0uU0.',
    '..0uu0..0u0.',
    '..000...000.',
  ]);

  // The Cargo Labyrinth: Bloom rats (pink growths on grey fur), cargo drones on their rotors, and the
  // stack-crawlers that hang under the containers in hazard stripes.
  enemies.rat = [
    sprite(['.......0.0.', '...00000K0.', '..0kKKKkKP0', '00kkkkkkKK0', '0.0kmk0k00.', '...0.0.0...']),
    sprite(['.......0.0.', '...00000K0.', '..0kKKKkKP0', '00kkkkkkKK0', '0.0kmk0k00.', '..0.0...0..']),
  ];
  enemies.drone = [
    sprite(['.0000....0000.', '..00......00..', '...00000000...', '..0KLLLLLLK0..', '..0Kkkvvkkk0..', '..0KKKKKKKK0..', '...0k0..0k0...', '...00....00...']),
    sprite(['..0000..0000..', '...00....00...', '...00000000...', '..0KLLLLLLK0..', '..0Kkkvvkkk0..', '..0KKKKKKKK0..', '...0k0..0k0...', '...00....00...']),
  ];
  enemies.dropper = [
    sprite(['...000000...', '..0v0vv0v0..', '.0vv0vv0vv0.', '.0kkkkkkkk0.', '0kkkkkkkkRk0', '0kkkkkkkkkk0', '.0k0k00k0k0.', '.0.0....0.0.']),
    sprite(['............', '...000000...', '..0v0vv0v0..', '.0vv0vv0vv0.', '.0kkkkkkkk0.', '0kkkkkkkkRk0', '0kkkkkkkkkk0', '..0k0k0k0k..']),
  ];

  // ---- Pickups and HUD icons ----
  const items = {
    shardSmall: [sprite(['.y.', 'yoy', '.y.']), sprite(['.o.', 'oyo', '.o.'])],
    shardBig: [sprite(['..y..', '.yyo.', 'yyooo', '.ooo.', '..o..']), sprite(['..o..', '.oyy.', 'ooyyy', '.yyy.', '..y..'])],
    heart: sprite(['.00.00.', '0RR0rr0', '0RrrrR0', '0rrrrr0', '.0rrr0.', '..0r0..', '...0...']),
    bulb: sprite(['...00...', '..0GG0..', '..0G0...', '.00PP00.', '0PPqPPP0', '0PpPPPp0', '0pPPPpP0', '.0pmmp0.', '..0000..']),
    bulbIcon: sprite(['..0G0..', '.0PPP0.', '0PqPPp0', '0pPPpP0', '.0mmp0.', '..000..']),
    lantern: sprite(['..000..', '.0K.K0.', '0KKKKK0', '0oyyyo0', '0oyWyo0', '0oyyyo0', '0KKKKK0', '.00000.']),
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
    scatter: sprite(['............', '.00000000...', '0kKKKKKKK0..', '0kGGkkkkK0..', '0k0000000...', '00..........', '............']),
    lancets: sprite(['............', '..0..0..0...', '.0L00L00L0..', '.0L00L00L0..', '0hhhhhhhhh0.', '.000000000..', '............']),
    thorn: sprite(['..........0.', '.000000000q0', '0mpPPPPPPP0.', '0mm0000000..', '0m0.........', '00..........', '............']),
    pistol: sprite(['............', '.00000000...', '.0LLLLLLL0..', '.0KKK00000..', '.0K0........', '.00.........', '............']),
    repeater: sprite(['.000000000..', '.0LLLLLLLL0.', '.0KKK000000.', '.0K0LLLLLL0.', '.0K0000000..', '.00.........', '............']),
    cannon: sprite(['............', '.0000000000.', '0KKLLLLLLLL0', '0kKKKKKKKK0.', '0k0000000...', '00..........', '............']),
    coil: sprite(['............', '.000000000..', '0bcCCcCcc0..', '0bbbbbbbb0..', '0b0000000...', '00..........', '............']),
    harpoon: sprite(['............', '.........0..', '.00000000L0.', '0kKKKKKKKLW0', '0k0000000L0.', '00.......0..', '............']),
    charges: sprite(['............', '.000000000..', '0KLLLLLLLr0.', '0kKKKKKKKr0.', '0k0000000...', '00..........', '............']),
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
    const kneelRows = rows.slice(0, rows.length - 3).concat(child ? ['0DDDDDD0', '.000000.'] : ['0DDDDDDD0', '.0000000.']);
    return {
      idle: personSprite(rows, colors),
      blink: personSprite(blinkRows, colors),
      walk: personSprite(walkRows, colors),
      kneel: personSprite(kneelRows, colors),
      sleep: personSprite(kneelRows.map((r) => r.replace(/x/g, 'e')), colors),
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
    // The Gardener, Hester Vale: a clean white hood and a green coat.
    gardener: person({ H: '#e8e0d0', C: '#3f7a4a', c: '#2a5a34', D: '#1f3a28', e: '#efe6d4' }),
    // The taken, woken from the cradles: pale, in the thin grey shifts the Gardens put them in.
    woken1: person({ H: '#8a8f99', C: '#a9b6c4', c: '#7d8a99', D: '#6c7894' }),
    woken2: person({ H: '#5a4028', C: '#b8b0a0', c: '#8a8270', D: '#6c6458' }),
    woken3: person({ H: '#a85a4a', C: '#a8a0b8', c: '#7d7590', D: '#625a76' }),
    woken4: person({ H: '#c9a070', C: '#b4c0a8', c: '#88947c', D: '#6a7660' }),
    // The Purser: the Steward's colours, buttoned up, a clerk's grey hood.
    purser: person({ H: '#6c7894', C: '#2e2a3e', c: '#4a4060', D: '#2e2a3e', e: '#e6dccc' }),
    // The deserter, Flux: a Bloomsworn in the Steward's uniform, the Bloom pinking his skin.
    flux: person({ H: '#2e2a3e', C: '#4a4060', c: '#2e2a3e', D: '#2e2a3e', e: '#e8c8d8', E: '#c890b0' }, false, (r) => r.map((row, i) => (i === 7 ? '0CcPCCCC0' : row))),
  };

  // ---- The Ark seen from outside, for the title and the opening. Rectangles, so it draws at any whole-number scale. ----
  // It flies right: dead engines at the back, the habitat drum and the garden dome in the middle, the ring,
  // then the command tower forward. Most windows are dark. Something pink glows under the dome.
  // opts: alarm (the cryo window blinks red), drive (the stern drive burns), broken (0-1, coming apart).
  function drawArk(g, x, y, s, t, opts = {}) {
    x = Math.round(x);
    y = Math.round(y);
    if (opts.broken > 0) {
      // Three pieces drift apart: the stern, the habitat and ring, and the tower and nose.
      const k = opts.broken;
      const pieces = [
        [-12, 18, -9 * k, 5 * k],
        [18, 35, 2 * k, -4 * k],
        [53, 22, 11 * k, 6 * k],
      ];
      for (const [from, w, dx, dy] of pieces) {
        g.save();
        g.beginPath();
        g.rect(x + from * s, y - 2 * s, w * s, 28 * s);
        g.clip();
        g.translate(Math.round(dx * s), Math.round(dy * s));
        drawArk(g, x, y, s, t, Object.assign({}, opts, { broken: 0, drive: false }));
        g.restore();
      }
      g.fillStyle = '#6c7894';
      if (k < 1) for (let i = 0; i < 6; i++) g.fillRect(x + (18 + ((i * 13 + t) % 40)) * s, y + (6 + ((i * 7) % 14)) * s, s, s);
      return;
    }
    const r = (rx, ry, w, h, c) => {
      g.fillStyle = c;
      g.fillRect(x + rx * s, y + ry * s, w * s, h * s);
    };
    const D = '#161b2b';
    const E = '#262e44';
    const F = '#0b0e18';
    // engines, cold
    r(0, 8, 9, 9, D);
    r(0, 8, 9, 1, E);
    r(0, 16, 9, 1, F);
    r(-3, 9, 3, 3, '#2a3146');
    r(-3, 13, 3, 3, '#2a3146');
    r(-4, 10, 1, 1, t % 240 < 4 ? '#5fd4e8' : '#1d3b52');
    if (opts.drive) {
      // lit for the first time since year 38
      const len = 6 + (t % 6 < 3 ? 1 : 0) + Math.min(10, Math.floor(opts.drive * 10));
      r(-3 - len, 9, len, 7, '#ff9b3d');
      r(-3 - len + 2, 10, len - 2, 5, '#ffb84d');
      r(-3 - Math.ceil(len / 2), 11, Math.ceil(len / 2), 3, '#fff0a8');
    }
    // the spine and its ribs
    r(9, 11, 59, 3, D);
    r(9, 11, 59, 1, E);
    for (let i = 10; i < 66; i += 4) r(i, 14, 1, 1, F);
    // habitat drum, two rows of windows
    r(18, 5, 28, 14, D);
    r(18, 5, 28, 1, E);
    r(18, 18, 28, 1, F);
    for (let i = 25; i < 46; i += 7) r(i, 6, 1, 12, F);
    for (let i = 0; i < 9; i++) {
      for (let row = 0; row < 2; row++) {
        const lit = (i * 5 + row * 7 + Math.floor(t / 70)) % 11 === 0;
        r(20 + i * 3, 9 + row * 5, 1, 1, lit ? '#ffb84d' : '#2a3a5a');
      }
    }
    // the cryo deck's windows, one blinking red during the emergency thaw
    for (let i = 11; i < 17; i += 2) r(i, 12, 1, 1, '#2a3a5a');
    if (opts.alarm && Math.floor(t / 14) % 2) r(13, 12, 1, 1, '#e8434f');
    // the garden dome
    r(23, 2, 18, 3, '#17292d');
    r(25, 1, 14, 1, '#17292d');
    r(28, 0, 8, 1, '#17292d');
    r(25, 1, 5, 1, '#24403f');
    r(29, 3, 1, 1, Math.floor(t / 50) % 3 ? '#b04ad0' : '#f27ad8');
    r(34, 2, 1, 1, '#5c2479');
    // the ring, edge on
    r(47, 5, 5, 14, D);
    r(48, 2, 3, 20, D);
    r(48, 2, 1, 20, E);
    r(47, 5, 1, 14, E);
    r(49, 1, 1, 1, Math.floor(t / 40) % 2 ? '#5fd4e8' : '#1d3b52');
    r(49, 22, 1, 1, Math.floor(t / 40) % 2 ? '#1d3b52' : '#5fd4e8');
    // command tower, beacon on top
    r(56, 7, 8, 4, D);
    r(56, 7, 8, 1, E);
    r(59, 4, 2, 3, D);
    r(59, 3, 1, 1, Math.floor(t / 30) % 2 ? '#e8434f' : '#3a1520');
    r(58, 9, 1, 1, '#ffb84d');
    // nose
    r(68, 11, 3, 3, D);
    r(71, 12, 2, 1, D);
  }

  // Stars drifting past, in three depths. Shared by the title and the opening.
  const STARS = (() => {
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd(), z: rnd() }));
  })();
  function drawStars(g, w, h, t, speed = 1) {
    g.fillStyle = '#04050b';
    g.fillRect(0, 0, w, h);
    for (const s of STARS) {
      const x = (((s.x * w - t * (0.05 + s.z * 0.2) * speed) % w) + w) % w;
      g.fillStyle = s.z > 0.8 ? '#ffffff' : s.z > 0.4 ? '#8aa0c8' : '#3b4a72';
      g.fillRect(Math.floor(x), Math.floor(s.y * h), 1, 1);
    }
  }

  HA.art = {
    PAL,
    canvas,
    drawArk,
    drawStars,
    sprite,
    hero,
    heroFor,
    guns,
    enemies,
    items,
    icons,
    people,
    tinted,
  };
})(window.HA);
