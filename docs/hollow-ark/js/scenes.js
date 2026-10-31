'use strict';
// Scenes: conversations, cutscenes and choices, written as generator functions that yield steps.
//   yield { say: 'GASKET', text: '...' }      a line of dialogue (wraps into pages; Confirm or Fire to go on)
//   yield { wait: 30 }                         pause for frames
//   yield { until: () => done }                wait for something (the player may move if control is on)
//   yield { choice: {...} }                    pick an option; permanent ones show what's gained and lost first
//   yield { card: ['LINE', ...], hold: 120 }   white text on black, full screen
//         (press: true waits for Confirm instead of a hold, and skipping a scene doesn't pass it)
//         (with space: 'in' | true | 'out' and ark: { x, y, s }, the Ark drifts among stars behind the text;
//         ark.turn swings it round by that angle, and world: { x, y, r } puts the new world in the sky)
//         (pic: 'name' puts one of pictures.js's scenes behind the text, which then sits under it)
//   yield { dream: 'name', clarity: 0.3 }      the hero dreams: a picture fills the screen, washed and broken up
//                                              less as clarity nears 1, and what's said shows over it
//   yield { dream: false }                     the dream fades and the scene goes on (it's over a black screen)
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
  const PRESS_AFTER = 45; // a card that waits for a press takes one only after this many frames, so it can't be mashed past
  const DREAM_FADE = 50; // frames for a dream to come and to go
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
        world.dream = null; // a dream never outlasts its scene
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
    if (step.dream !== undefined) {
      if (step.dream) {
        world.dream = { name: step.dream, clarity: step.clarity === undefined ? 0.5 : step.clarity, t: 0, out: 0 };
        return false;
      }
      if (!world.dream || scene.skipping) {
        world.dream = null;
        return false;
      }
      world.dream.out = 1;
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
        const a = step.walk;
        for (let i = 0; i < 4000 && walkStep(world, a, step.x, 1); i++);
        a.y = a.homeY !== undefined && walksOnFloor(world, a) ? a.homeY : a.y;
        return false;
      }
      return true;
    }
    return false;
  }

  // One frame of a walk: a person keeps to the floor, down and up its steps (story.js), and a machine just
  // moves. Returns whether there's more to walk (or to drop, off a step).
  const walksOnFloor = (world, a) => !!(world.npcs && world.npcs.includes(a) && !a.fly);
  function walkStep(world, a, x, speed) {
    const d = x - a.x;
    a.facing = Math.sign(d) || a.facing;
    if (!walksOnFloor(world, a)) {
      a.x += HA.clamp(d, -speed, speed);
      return Math.abs(x - a.x) > 0.5;
    }
    const was = a.x;
    if (Math.abs(d) > 0.5) {
      a.x += HA.clamp(d, -speed, speed);
      if (!HA.story.keepToFloor(world, a, Math.sign(d))) a.x = was;
    }
    a.y = HA.approach(a.y, a.homeY, 2);
    const falling = Math.abs(a.y - a.homeY) > 0.5;
    return falling || (a.x !== was && Math.abs(x - a.x) > 0.5);
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
    if (world.dream) {
      world.dream.t++;
      if (world.dream.out) world.dream.out++;
    }

    if (scene.skipping && step && !step.choice && !step.press && !(step.until && !step.until())) done = true;
    else if (step && step.say !== undefined) {
      const page = step.pages[step.page];
      const len = pageLength(page);
      if (step.shown < len) {
        const before = Math.floor(step.shown);
        step.shown = Math.min(len, step.shown + (SPEED[HA.settings.textSpeed] || 1));
        if (Math.floor(step.shown) > before && Math.floor(step.shown) % 3 === 0) HA.audio.play('blip', step.voice || step.say);
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
      // A card that asks for a press (the ending's results) waits for one, however long, and skipping passes it by.
      if (step.press ? go && step.t > PRESS_AFTER : step.t > (step.hold || 150) || (go && step.t > 20 && step.skippable !== false)) {
        done = true;
        world.card = null;
      }
    } else if (step && step.dream === false) {
      if (!world.dream || world.dream.out > DREAM_FADE) {
        world.dream = null;
        done = true;
      }
    } else if (step && step.fade) {
      const target = step.fade === 'out' ? 1 : 0;
      world.fade = HA.approach(world.fade, target, 1 / (step.frames || 20));
      if (world.fade === target) done = true;
    } else if (step && step.walk) {
      const a = step.walk;
      const d = step.x - a.x;
      a.facing = Math.sign(d) || a.facing;
      a.walking = walkStep(world, a, step.x, step.speed || 1);
      if (!a.walking) done = true;
    } else done = true;

    if (done) {
      if (step && step.walk) step.walk.walking = false;
      if (step && step.card) world.card = null;
      if (step && step.dream === false) world.dream = null;
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
    if (quiet || world.dream) return; // a dream's lines are drawn over it (drawCard)
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

  // Who is saying a line, if they're in the room: the person of that name (the first one out, if there are
  // several), or the hero for their own lines.
  function speakerOf(world, step) {
    if (!step.say) return world.player && !world.player.hidden && !world.player.dead ? world.player : null;
    const people = (world.npcs || []).filter((n) => n.name === step.say && n.state !== 'gone');
    return people.find((n) => n.state === 'out') || people[0] || null;
  }

  // A marker bobbing over whoever is talking. Someone still hiding in their home speaks from its doorway. If
  // they're off the screen, it points their way from its edge.
  function drawSpeaker(world, g, who) {
    const c = world.cam;
    const bob = Math.floor(world.time / 12) % 2;
    const cx = Math.round(who.x + who.w / 2 - c.x);
    const cy = Math.round(who.y - c.y - 7 + bob);
    const color = who === world.player ? '#9fd8e8' : '#ffb84d';
    if (cx < 4 || cx > W - 4) {
      const y = HA.clamp(Math.round(who.y + who.h / 2 - c.y), 16, H - 12);
      // a triangle whose tip is toward the edge, the way they are
      const d = cx > W - 4 ? 1 : -1;
      const base = d > 0 ? W - 8 - bob : 7 + bob;
      g.fillStyle = '#05060d';
      for (let i = -1; i < 5; i++) g.fillRect(base + d * i, y - 5 + Math.max(0, i), 1, 11 - Math.max(0, i) * 2);
      g.fillStyle = color;
      for (let i = 0; i < 4; i++) g.fillRect(base + d * i, y - 3 + i, 1, 7 - i * 2);
      return;
    }
    if (cy < 6 || cy > H - 4) return;
    g.fillStyle = '#05060d';
    g.fillRect(cx - 4, cy - 1, 9, 2);
    g.fillRect(cx - 3, cy + 1, 7, 2);
    g.fillRect(cx - 2, cy + 3, 5, 1);
    g.fillStyle = color;
    g.fillRect(cx - 3, cy - 1, 7, 1);
    g.fillRect(cx - 2, cy, 5, 1);
    g.fillRect(cx - 1, cy + 1, 3, 1);
    g.fillRect(cx, cy + 2, 1, 1);
  }

  function drawSay(world, g, step, y = boxY(world)) {
    const page = step.pages[step.page];
    const who = speakerOf(world, step);
    panel(g, BOX.x, y, BOX.w, BOX.h);
    if (who && !world.dream && !world.card) drawSpeaker(world, g, who);
    if (step.say) {
      const name = who && who.state === 'hidden' ? step.say + ', IN THE WALLS' : step.say;
      const nw = HA.font.measure(name) + 10;
      panel(g, BOX.x + 6, y - 9, nw, 12, '#ffb84d');
      HA.font.draw(g, name, BOX.x + 11, y - 6, '#ffb84d');
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
    // Before any permanent choice: what is gained, what is lost for good, and a confirmation. Each line wraps
    // inside the box, and the box grows to fit.
    const L = confirmLayout(c.options[step.sel].confirm);
    panel(g, L.x, L.y, L.w, L.h, '#ffb84d');
    for (const t of L.texts) HA.font.draw(g, t.text, t.x, t.y, t.color, t.center ? { align: 'center' } : {});
    ['YES', 'NOT YET'].forEach((label, i) => {
      const sel = step.csel === i;
      HA.font.draw(g, sel ? '> ' + label + ' <' : label, W / 2, L.yes + i * 11, sel ? '#fff0a8' : '#6c7894', { align: 'center' });
    });
  }

  // Splits text into lines no wider than w pixels.
  function wrapPx(text, w) {
    const lines = [];
    let line = '';
    for (const word of String(text).split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (line && HA.font.measure(next) > w) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  // Where everything in a confirm box goes: the title, GAIN and LOSE with their text beside them, the note,
  // then YES and NOT YET.
  function confirmLayout(o) {
    const w = 264;
    const x = W / 2 - w / 2;
    const y = 40;
    const texts = [];
    let at = y + 8;
    for (const line of wrapPx(o.title, w - 16)) {
      texts.push({ text: line, x: W / 2, y: at, color: '#fff0a8', center: true });
      at += 10;
    }
    at += 6;
    for (const [label, color, text] of [['GAIN:', '#7ad1a0', o.gain], ['LOSE:', '#ff8a8a', o.lose]]) {
      texts.push({ text: label, x: x + 12, y: at, color });
      for (const line of wrapPx(text, w - 62)) {
        texts.push({ text: line, x: x + 50, y: at, color: '#eef4f6' });
        at += 10;
      }
      at += 2;
    }
    at += 2;
    for (const line of wrapPx(o.note || "THIS CAN'T BE UNDONE.", w - 16)) {
      texts.push({ text: line, x: W / 2, y: at, color: o.note ? '#ff8a8a' : '#9fb6c8', center: true });
      at += 10;
    }
    at += 2;
    return { x, y, w, h: at + 24 - y, texts, yes: at };
  }

  // A dream fills the screen, over the room and its fade, and what's said in it shows over that.
  function drawDream(world, g, quiet) {
    const d = world.dream;
    const a = Math.max(0, Math.min(1, d.t / DREAM_FADE, 1 - d.out / DREAM_FADE));
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    HA.pictures.dream(g, d.name, d.clarity, d.t, a);
    const step = world.scene && world.scene.step;
    if (!quiet && step && step.say !== undefined) drawSay(world, g, step, BOX.y);
  }

  // Full-screen cards sit above everything, fade included.
  function drawCard(world, g, quiet) {
    if (world.dream) drawDream(world, g, quiet);
    const card = world.card;
    if (!card) return;
    const hold = card.press ? Infinity : card.hold || 150;
    const a = Math.min(1, card.t / 20, (hold - card.t) / 20);
    g.fillStyle = '#05060d';
    g.fillRect(0, 0, W, H);
    if (card.space) drawSpace(world, g, card, hold);
    if (card.pic) drawPic(world, g, card, hold);
    if (quiet) return;
    g.globalAlpha = Math.max(0, a);
    const lines = card.card;
    const gap = card.gap || 12;
    const below = HA.pictures.GROUND + 4; // under a picture, the text sits in the dark band below the ground
    const top = card.top !== undefined ? card.top : card.pic ? below + (H - below) / 2 - ((lines.length - 1) * gap) / 2 - 3 : H / 2 - (lines.length * gap) / 2;
    lines.forEach((line, i) => {
      // A pair of columns ({ a, b }) meets in the middle: a name, and its value.
      if (line && line.a !== undefined) {
        HA.font.draw(g, line.a, W / 2 - 6, top + i * gap, '#9fb6c8', { align: 'right' });
        HA.font.draw(g, line.b, W / 2 + 6, top + i * gap, '#eef4f6');
        return;
      }
      const color = Array.isArray(line) ? line[1] : i === 0 && card.title ? '#ffb84d' : '#eef4f6';
      HA.font.draw(g, Array.isArray(line) ? line[0] : line, W / 2, top + i * gap, color, { align: 'center' });
    });
    if (card.press && card.t > PRESS_AFTER) HA.font.draw(g, '{confirm} CONTINUE', W - 8, H - 14, '#6c7894', { align: 'right' });
    g.globalAlpha = 1;
  }

  // Behind an epilogue card: its picture, fading in and out with the card, and a dark band under it for the text.
  function drawPic(world, g, card, hold) {
    g.globalAlpha = HA.clamp(Math.min(card.t / 30, (hold - card.t) / 30), 0, 1);
    HA.pictures.draw(g, card.pic, world.cardClock || 0, card.picOpts || {});
    g.globalAlpha = 1;
    g.fillStyle = '#05060d';
    g.fillRect(0, HA.pictures.GROUND + 4, W, H - HA.pictures.GROUND - 4);
    g.fillStyle = 'rgba(5,6,13,0.6)';
    g.fillRect(0, HA.pictures.GROUND, W, 4);
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

  HA.scenes = { run, update, draw, drawCard, skip, paginate, confirmLayout, active: (w) => !!(w && w.scene) };
})(window.HA);
