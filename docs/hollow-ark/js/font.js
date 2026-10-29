'use strict';
// Built-in 5x7 pixel font. It lives in code (not a font file) so text looks identical on every OS and works offline.
(function (HA) {
  const G = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    B: '####.|#...#|#...#|####.|#...#|#...#|####.',
    C: '.###.|#...#|#....|#....|#....|#...#|.###.',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
    E: '#####|#....|#....|####.|#....|#....|#####',
    F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
    H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    I: '###|.#.|.#.|.#.|.#.|.#.|###',
    J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
    K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
    O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....',
    Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.',
    T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
    X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    Z: '#####|....#|...#.|..#..|.#...|#....|#####',
    0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    1: '.#.|##.|.#.|.#.|.#.|.#.|###',
    2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
    3: '####.|....#|....#|.###.|....#|....#|####.',
    4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    5: '#####|#....|####.|....#|....#|#...#|.###.',
    6: '.###.|#....|#....|####.|#...#|#...#|.###.',
    7: '#####|....#|...#.|..#..|..#..|..#..|..#..',
    8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    9: '.###.|#...#|#...#|.####|....#|....#|.###.',
    ' ': '...|...|...|...|...|...|...',
    '.': '.|.|.|.|.|.|#',
    ',': '..|..|..|..|##|.#|#.',
    '!': '#|#|#|#|#|.|#',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
    ':': '.|.|#|.|.|#|.',
    ';': '..|..|.#|..|..|.#|#.',
    "'": '#|#|.|.|.|.|.',
    '"': '#.#|#.#|...|...|...|...|...',
    '-': '....|....|....|####|....|....|....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
    '(': '.#|#.|#.|#.|#.|#.|.#',
    ')': '#.|.#|.#|.#|.#|.#|#.',
    '[': '##|#.|#.|#.|#.|#.|##',
    ']': '##|.#|.#|.#|.#|.#|##',
    '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
    '<': '...#|..#.|.#..|#...|.#..|..#.|...#',
    '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
    '=': '....|....|####|....|####|....|....',
    _: '.....|.....|.....|.....|.....|.....|#####',
    '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.',
    '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
    '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
    '×': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#', // ×
    '·': '.|.|.|#|.|.|.', // ·
    '—': '......|......|......|######|......|......|......', // em dash
    '←': '.....|..#..|.#...|#####|.#...|..#..|.....', // ←
    '→': '.....|..#..|...#.|#####|...#.|..#..|.....', // →
    '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|.....', // ↑
    '↓': '.....|..#..|..#..|..#..|#.#.#|.###.|..#..', // ↓
    '♥': '.....|.#.#.|#####|#####|.###.|..#..|.....', // ♥
    '…': '.....|.....|.....|.....|.....|.....|#.#.#', // …
    '□': '.....|#####|#...#|#...#|#...#|#####|.....', // PlayStation square
    '△': '.....|..#..|.#.#.|.#.#.|#...#|#####|.....', // PlayStation triangle
    '○': '.....|.###.|#...#|#...#|#...#|.###.|.....', // PlayStation circle
  };

  const glyphs = {};
  for (const ch of Object.keys(G)) {
    const rows = G[ch].split('|');
    glyphs[ch] = { w: rows[0].length, rows };
  }

  const cache = new Map();
  function glyphImage(ch, color) {
    let byColor = cache.get(color);
    if (!byColor) cache.set(color, (byColor = new Map()));
    let img = byColor.get(ch);
    if (img) return img;
    const g = glyphs[ch];
    img = document.createElement('canvas');
    img.width = g.w;
    img.height = 7;
    const c = img.getContext('2d');
    c.fillStyle = color;
    g.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') c.fillRect(x, y, 1, 1);
    });
    byColor.set(ch, img);
    return img;
  }

  const norm = (ch) => {
    const up = ch.toUpperCase();
    return glyphs[up] ? up : '?';
  };

  // Text can carry {action} tokens, drawn as the right key or controller button for the device in use.
  const TOKEN = /\{(\w+)\}/g;
  function segments(str) {
    const out = [];
    let last = 0;
    String(str).replace(TOKEN, (m, action, i) => {
      if (i > last) out.push({ text: str.slice(last, i) });
      out.push({ action });
      last = i + m.length;
      return m;
    });
    if (last < str.length) out.push({ text: str.slice(last) });
    return out;
  }

  function measure(str, scale = 1) {
    let w = 0;
    for (const seg of segments(String(str))) {
      if (seg.action) w += HA.input.promptWidth(seg.action) + 1;
      else for (const ch of seg.text) w += glyphs[norm(ch)].w + 1;
    }
    return Math.max(0, w - 1) * scale;
  }

  // draw(ctx, text, x, y, color, { align, shadow, scale })
  function draw(ctx, str, x, y, color = '#eef4f6', opts = {}) {
    str = String(str);
    const scale = opts.scale || 1;
    const w = measure(str, scale);
    let cx = Math.round(opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x);
    y = Math.round(y);
    const shadow = opts.shadow === undefined ? '#05060d' : opts.shadow;
    for (const seg of segments(str)) {
      if (seg.action) {
        HA.input.drawPrompt(ctx, seg.action, cx, y - 1);
        cx += (HA.input.promptWidth(seg.action) + 1) * scale;
        continue;
      }
      for (const raw of seg.text) {
        const ch = norm(raw);
        const g = glyphs[ch];
        if (ch !== ' ') {
          if (shadow) ctx.drawImage(glyphImage(ch, shadow), cx, y + scale, g.w * scale, 7 * scale);
          ctx.drawImage(glyphImage(ch, color), cx, y, g.w * scale, 7 * scale);
        }
        cx += (g.w + 1) * scale;
      }
    }
    return w;
  }

  HA.font = { height: 7, draw, measure, hasGlyph: (ch) => !!glyphs[ch.toUpperCase()] };
})(window.HA);
