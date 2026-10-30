'use strict';
// Scenes: conversations, cutscenes and choices, written as generator functions that yield steps.
//   yield { say: 'GASKET', text: '...' }      a line of dialogue (wraps into pages; Confirm or Fire to go on)
//   yield { wait: 30 }                         pause for frames
//   yield { until: () => done }                wait for something (the player may move if control is on)
//   yield { choice: {...} }                    pick an option; permanent ones show what's gained and lost first
//   yield { card: ['LINE', ...], hold: 120 }   white text on black, full screen
//         (with space: 'in' | true | 'out' and ark: { x, y, s }, the Ark drifts among stars behind the text;
//         ark.turn swings it round by that angle, and world: { x, y, r } puts the new world in the sky)
//   yield { fade: 'out' | 'in' }               fade the screen to black or back
//   yield { walk: actor, x: 120, speed: 1 }    move a person or machine to an x position
// Any other side effect (sound, shake, setting a flag) is plain code between the yields.
// Every scene can be skipped from the pause menu; skipping stops at choices, which are never made for you.
(function (HA) {
  const W = HA.VIEW_W;
  const H = HA.VIEW_H;
  const BOX = { x: 8, y: 128, w: 304, h: 46, top: 22 };
  const LINE_CHARS = 48;
  const LINES = 3;
  const SPEED = { slow: 0.5, normal: 1, fast: 3, instant: 999 };
  const NONE = { held: {}, pressed: {}, released: {} };

  function run(world, gen, opts = {}) {
    const scene = { it: gen(world), step: null, result: undefined, control: false, showHud: false, skippable: opts.skippable !== false, skipping: false, name: opts.name || '' };
    world.scene = scene;
    HA.audio.charge(0);
    advance(world, scene);
  }

  function advance(world, scene) {
    for (let guard = 0; guard < 500; guard++) {
      const r = scene.it.next(scene.result);
      scene.result = undefined;
      if (r.done) {
        if (world.scene === scene) world.scene = null;
        return;
      }
      const step = r.value || {};
      if (step.control !== undefined) scene.control = step.control;
      if (step.hud !== undefined) scene.showHud = step.hud;
      if (!begin(world, scene, step)) continue; // steps that finish at once
      scene.step = step;
      return;
    }
  }

  // Set a step up. Returns false when it is already finished.
  function begin(world, scene, step) {
    if (step.say !== undefined) {
      HA.save.addTalk(world.state, step.say, step.text);
      if (scene.skipping) return false;
      step.pages = paginate(step.text);
      step.page = 0;
      step.shown = 0;
      return true;
    }
    if (step.wait !== undefined) {
      step.left = step.wait;
      return !scene.skipping && step.left > 0;
    }
    if (step.until) return !step.until();
    if (step.choice) {
      scene.skipping = false;
      step.sel = 0;
      step.confirming = false;
      step.csel = 1;
      return true;
    }
    if (step.card) {
      if (scene.skipping) return false;
      step.t = 0;
      world.card = step;
      return true;
    }
    if (step.fade) {
      world.holdFade = step.fade === 'out';
      if (scene.skipping) {
        world.fade = step.fade === 'out' ? 1 : 0;
        return false;
      }
      return true;
    }
    if (step.walk) {
      if (scene.skipping) {
        step.walk.x = step.x;
        return false;
      }
      return true;
    }
    return false;
  }

  function paginate(text, width = LINE_CHARS, perPage = LINES) {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const next = line ? line + ' ' + w : w;
      if (next.length > width && line) {
        lines.push(line);
        line = w;
      } else line = next;
    }
    if (line) lines.push(line);
    const pages = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    return pages;
  }

  const pageLength = (page) => page.reduce((n, l) => n + l.length, 0);

  // Runs the current step. Returns the input the hero gets this frame: none while a scene has the controls.
  function update(world, input) {
    const scene = world.scene;
    if (!scene) return input;
    const step = scene.step;
    let done = false;
    const go = input.pressed.confirm || input.pressed.fire || input.pressed.jump;

    if (scene.skipping && step && !step.choice && !(step.until && !step.until())) done = true;
    else if (step && step.say !== undefined) {
      const page = step.pages[step.page];
      const len = pageLength(page);
      if (step.shown < len) {
        const before = Math.floor(step.shown);
        step.shown = Math.min(len, step.shown + (SPEED[HA.settings.textSpeed] || 1));
        if (Math.floor(step.shown) > before && Math.floor(step.shown) % 3 === 0) HA.audio.play('blip', step.say);
        if (go && step.shown > 1) step.shown = len;
      } else if (go) {
        HA.audio.play('menuMove');
        if (step.page < step.pages.length - 1) {
          step.page++;
          step.shown = 0;
        } else done = true;
      }
    } else if (step && step.wait !== undefined) {
      if (--step.left <= 0) done = true;
    } else if (step && step.until) {
      if (step.until()) done = true;
    } else if (step && step.choice) {
      done = updateChoice(world, scene, step, input);
    } else if (step && step.card) {
      step.t++;
      world.cardClock = (world.cardClock || 0) + 1;
      if (step.t > (step.hold || 150) || (go && step.t > 20 && step.skippable !== false)) {
        done = true;
        world.card = null;
      }
    } else if (step && step.fade) {
      const target = step.fade === 'out' ? 1 : 0;
      world.fade = HA.approach(world.fade, target, 1 / (step.frames || 20));
      if (world.fade === target) done = true;
    } else if (step && step.walk) {
      const a = step.walk;
      const d = step.x - a.x;
      a.facing = Math.sign(d) || a.facing;
      a.walking = Math.abs(d) > 0.5;
      a.x += HA.clamp(d, -(step.speed || 1), step.speed || 1);
      if (!a.walking) done = true;
    } else done = true;

    if (done) {
      if (step && step.walk) step.walk.walking = false;
      if (step && step.card) world.card = null;
      scene.step = null;
      advance(world, scene);
    }
    return scene.control && world.scene === scene ? input : NONE;
  }

  function updateChoice(world, scene, step, input) {
    const c = step.choice;
    if (!step.confirming) {
      if (input.pressed.up || input.pressed.down) {
        step.sel = (step.sel + (input.pressed.up ? -1 : 1) + c.options.length) % c.options.length;
        HA.audio.play('menuMove');
      }
      if (input.pressed.confirm || input.pressed.jump) {
        HA.audio.play('menuOk');
        if (c.options[step.sel].confirm) {
          step.confirming = true;
          step.csel = 1; // the safe answer is picked first
          return false;
        }
        scene.result = step.sel;
        return true;
      }
      return false;
    }
    if (input.pressed.up || input.pressed.down) {
      step.csel = 1 - step.csel;
      HA.audio.play('menuMove');
    }
    if (input.pressed.back && !input.pressed.confirm) {
      step.confirming = false;
      HA.audio.play('menuBack');
      return false;
    }
    if (input.pressed.confirm || input.pressed.jump) {
      if (step.csel === 0) {
        HA.audio.play('choice');
        scene.result = step.sel;
        return true;
      }
      step.confirming = false;
      HA.audio.play('menuBack');
    }
    return false;
  }

  function skip(world) {
    if (!world.scene || !world.scene.skippable) return;
    world.scene.skipping = true;
  }

  // ---- Drawing ----
  function panel(g, x, y, w, h, edge = '#3a4258') {
    g.fillStyle = 'rgba(5,6,13,0.94)';
    g.fillRect(x, y, w, h);
    g.fillStyle = edge;
    g.fillRect(x, y, w, 1);
    g.fillRect(x, y + h - 1, w, 1);
    g.fillRect(x, y, 1, h);
    g.fillRect(x + w - 1, y, 1, h);
  }

  function draw(world, g, quiet) {
    const scene = world.scene;
    if (!scene) return;
    // Letterbox bars while a cutscene holds the controls.
    if (!scene.control) {
      g.fillStyle = '#05060d';
      g.fillRect(0, 0, W, 10);
      g.fillRect(0, H - 4, W, 4);
    }
    const step = scene.step;
    if (quiet) return;
    if (step && step.say !== undefined) drawSay(world, g, step);
    if (step && step.choice) drawChoice(world, g, step);
  }

  // The box sits at the bottom of the screen, unless the hero (and so whoever they're with) would be
  // under it, as on the floor of a one-screen-high room: then it moves to the top. With the hero out of the
  // picture (asleep in a pod), the people talking are on the floor too if the room is only a screen high.
  function boxY(world) {
    const p = world.player;
    if (p.hidden) return world.room.ph <= H + 8 ? BOX.top : BOX.y;
    return p.y + p.h - world.cam.y > BOX.y - 4 ? BOX.top : BOX.y;
  }

  function drawSay(world, g, step) {
    const page = step.pages[step.page];
    const y = boxY(world);
    panel(g, BOX.x, y, BOX.w, BOX.h);
    if (step.say) {
      const nw = HA.font.measure(step.say) + 10;
      panel(g, BOX.x + 6, y - 9, nw, 12, '#ffb84d');
      HA.font.draw(g, step.say, BOX.x + 11, y - 6, '#ffb84d');
    }
    let left = Math.floor(step.shown);
    page.forEach((line, i) => {
      const part = line.slice(0, Math.max(0, left));
      left -= line.length;
      HA.font.draw(g, part, BOX.x + 8, y + 8 + i * 11, step.color || '#eef4f6');
    });
    if (step.shown >= pageLength(page) && Math.floor(world.time / 20) % 2) {
      g.fillStyle = '#ffb84d';
      g.fillRect(BOX.x + BOX.w - 12, y + BOX.h - 8, 5, 2);
      g.fillRect(BOX.x + BOX.w - 11, y + BOX.h - 6, 3, 1);
    }
  }

  function drawChoice(world, g, step) {
    const c = step.choice;
    const pw = 236;
    const ph = 22 + c.options.length * 12;
    const px = W / 2 - pw / 2;
    const py = 124 - (c.options.length - 2) * 6;
    panel(g, px, py, pw, ph, '#ffb84d');
    HA.font.draw(g, c.prompt, W / 2, py + 7, '#ffb84d', { align: 'center' });
    c.options.forEach((o, i) => {
      const sel = i === step.sel && !step.confirming;
      HA.font.draw(g, (sel ? '> ' : '  ') + o.label, px + 16, py + 21 + i * 12, sel ? '#fff0a8' : '#9fb6c8');
    });
    if (!step.confirming) return;
    // Before any permanent choice: what is gained, what is lost for good, and a confirmation.
    const o = c.options[step.sel].confirm;
    const cw = 264;
    const ch = 86;
    const cx = W / 2 - cw / 2;
    const cy = 40;
    panel(g, cx, cy, cw, ch, '#ffb84d');
    HA.font.draw(g, o.title, W / 2, cy + 8, '#fff0a8', { align: 'center' });
    HA.font.draw(g, 'GAIN:', cx + 12, cy + 24, '#7ad1a0');
    HA.font.draw(g, o.gain, cx + 50, cy + 24, '#eef4f6');
    HA.font.draw(g, 'LOSE:', cx + 12, cy + 36, '#ff8a8a');
    HA.font.draw(g, o.lose, cx + 50, cy + 36, '#eef4f6');
    HA.font.draw(g, o.note || "THIS CAN'T BE UNDONE.", W / 2, cy + 50, o.note ? '#ff8a8a' : '#9fb6c8', { align: 'center' });
    ['YES', 'NOT YET'].forEach((label, i) => {
      const sel = step.csel === i;
      HA.font.draw(g, sel ? '> ' + label + ' <' : label, W / 2, cy + 62 + i * 11, sel ? '#fff0a8' : '#6c7894', { align: 'center' });
    });
  }

  // Full-screen cards sit above everything, fade included.
  function drawCard(world, g, quiet) {
    const card = world.card;
    if (!card) return;
    const hold = card.hold || 150;
    const a = Math.min(1, card.t / 20, (hold - card.t) / 20);
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    if (card.space) drawSpace(world, g, card, hold);
    if (quiet) return;
    g.globalAlpha = Math.max(0, a);
    const lines = card.card;
    const top = card.top !== undefined ? card.top : H / 2 - (lines.length * 12) / 2;
    lines.forEach((line, i) => {
      const color = Array.isArray(line) ? line[1] : i === 0 && card.title ? '#ffb84d' : '#eef4f6';
      HA.font.draw(g, Array.isArray(line) ? line[0] : line, W / 2, top + i * 12, color, { align: 'center' });
    });
    g.globalAlpha = 1;
  }

  // Behind the opening cards: stars, and the Ark far off among them, drifting on.
  function drawSpace(world, g, card, hold) {
    const t = world.cardClock || 0;
    const fadeIn = card.space === 'in' ? Math.min(1, card.t / 45) : 1;
    const fadeOut = card.space === 'out' ? HA.clamp((hold - card.t) / 30, 0, 1) : 1;
    g.globalAlpha = Math.min(fadeIn, fadeOut);
    HA.art.drawStars(g, W, H, t, 0.5);
    if (card.world) drawWorldDisc(g, card.world);
    if (card.ark) {
      const ax = card.ark.x + t * 0.02 * card.ark.s;
      if (card.ark.turn) {
        // Homecoming: the Ark swings its nose round toward the world, slowly
        const k = Math.min(1, card.t / 220);
        const cx = ax + 30 * card.ark.s;
        const cy = card.ark.y + 12 * card.ark.s;
        g.save();
        g.translate(cx, cy);
        g.rotate(card.ark.turn * k * k * (3 - 2 * k));
        g.translate(-cx, -cy);
        HA.art.drawArk(g, ax, card.ark.y, card.ark.s, t, card.ark);
        g.restore();
      } else HA.art.drawArk(g, ax, card.ark.y, card.ark.s, t, card.ark);
    }
    g.globalAlpha = 1;
  }

  // The new world, pale and dark, as it looks from the Ark.
  function drawWorldDisc(g, w) {
    for (let dy = -w.r; dy <= w.r; dy++) {
      const half = Math.floor(Math.sqrt(w.r * w.r - dy * dy));
      g.fillStyle = dy < -w.r / 3 ? '#b8c4cc' : dy < w.r / 3 ? '#94a2ae' : '#6c7a88';
      g.fillRect(w.x - half, w.y + dy, half * 2 + 1, 1);
    }
    g.fillStyle = '#5a6878';
    g.fillRect(w.x - Math.floor(w.r / 2), w.y + 2, Math.floor(w.r / 2), 1);
    g.fillRect(w.x + 2, w.y - Math.floor(w.r / 3), Math.floor(w.r / 2), 1);
  }

  HA.scenes = { run, update, draw, drawCard, skip, paginate, active: (w) => !!(w && w.scene) };
})(window.HA);
