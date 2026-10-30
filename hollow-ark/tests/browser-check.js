'use strict';
// Plays the browser build in Chromium, Firefox and WebKit (Safari's engine), both from a web server
// (like GitHub Pages) and straight from disk (like a downloaded folder). Exits non-zero on any failure.
// Each run plays by hand-held keys first (move, jump, fire), then runs the story so far quickly through the
// game's debug helpers: rooms, saving, the raid, the boss, the choice, the reunion and the night after it,
// and continuing a save, then the Hydroponic Gardens (a bulb, the cradles, the Pruner and its choice, the
// taken waking, Wick's fight and the Gardener's offer), the Warrens return (the lift home, telling Shim,
// the broadcast, the pistol, the night Solder leaves, her gate, the hatch to the sump), and the Cargo Labyrinth
// (the cranes, the harpoon, the deserter, Odell, the Tallyman, the Breach Charges, travel between pods, and the
// Purser's boat to the Deserter ending). Then it loads a Phase 2 save to check it upgrades, and plays all five
// endings.
//   node browser-check.js [chromium firefox webkit]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const playwright = require('playwright');

const GAME = path.resolve(__dirname, '..', '..', 'docs', 'hollow-ark');
const OUT = path.join(__dirname, 'screenshots');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.join(GAME, rel);
      if (!file.startsWith(GAME) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function play(browserType, url, label) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const wait = (ms) => page.waitForTimeout(ms);
  const get = (expr, arg) => page.evaluate(expr, arg);
  const shot = (name) => page.screenshot({ path: path.join(OUT, `${browserType.name()}-${label}-${name}.png`) });
  const problems = [];
  const expect = (ok, what) => ok || problems.push(what);
  fs.mkdirSync(OUT, { recursive: true });
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    expect(await get(() => !!HA.debug.world.scene && HA.debug.world.heroPod.state === 'hanging'), 'a new game should open on the wake-up scene, the pod hanging in its clamps');
    await get(() => HA.debug.skipScene());
    await page.waitForFunction(() => !HA.debug.world.scene, null, { timeout: 5000 });
    expect(await get(() => HA.debug.world.state.flags.woke && HA.debug.world.heroPod.state === 'open' && HA.debug.world.heroPod.lid.flat), 'skipping the opening should leave the pod open on the floor');

    // ---- By hand: real key presses ----
    const start = await get(() => ({ x: HA.debug.world.player.x, y: HA.debug.world.player.y }));
    await page.keyboard.down('ArrowRight');
    await wait(500);
    await page.keyboard.up('ArrowRight');
    const moved = (await get(() => HA.debug.world.player.x)) - start.x;
    expect(moved >= 20, `hero barely moved (${moved.toFixed(1)}px)`);
    await wait(300);
    const groundY = await get(() => HA.debug.world.player.y);
    await page.keyboard.down('KeyZ');
    let top = groundY;
    for (let i = 0; i < 12; i++) {
      await wait(30);
      top = Math.min(top, await get(() => HA.debug.world.player.y));
    }
    await page.keyboard.up('KeyZ');
    expect(groundY - top >= 20, `jump too low (${(groundY - top).toFixed(1)}px)`);
    await wait(400);
    // Pick up the Rivet Pistol, then fire it. A shot can hit a nearby wall within a frame, so check the
    // weapon fired (its cooldown started), watching every frame: headless browsers on CI skip some.
    await get(() => {
      HA.debug.goto('cryo-bay', 44, 15);
      HA.debug.step(10);
    });
    expect(await get(() => HA.debug.world.player.weapons.some((w) => w.id === 'pistol')), 'the Rivet Pistol was not picked up');
    await page.keyboard.press('KeyX');
    const fired = await page
      .waitForFunction(() => HA.debug.world.player.cooldown > 0 || HA.debug.world.shots.length > 0, null, { timeout: 3000, polling: 'raf' })
      .then(() => true, () => false);
    expect(fired, 'fire did not shoot');
    await shot('cryo-bay');

    // ---- The slice, fast-forwarded with the debug helpers ----
    const r = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      const talkThrough = () => {
        for (let i = 0; i < 400 && w().scene; i++) {
          HA.debug.skipScene();
          HA.debug.step(1);
        }
      };
      // Mara's pod hangs beside the hero's, and its plate can be read from the deck.
      HA.debug.goto('cryo-bay', 2, 18);
      HA.debug.step(2);
      HA.debug.step(2, { up: true });
      out.maraScene = !!w().scene && w().scene.name === 'mara';
      talkThrough();
      out.mara = !!w().state.flags.mara && w().state.journal.story.some((t) => /MARA/.test(t));
      // The thruster pack (Phase 3.3) burns on a second press of Jump in the air, and lifts the hero higher.
      const climb = (pack) => {
        HA.debug.goto('cryo-bay', 50, 18);
        w().player.abilities.thruster = pack;
        HA.debug.step(10);
        const y0 = w().player.y;
        let top = y0;
        for (let f = 0; f < 90; f++) {
          HA.debug.step(1, { jump: f < 10 || (f > 13 && f < 80) });
          top = Math.min(top, w().player.y);
        }
        HA.debug.step(60);
        w().player.abilities.thruster = null;
        return y0 - top;
      };
      out.jumpOnly = climb(null);
      out.jumpThrust = climb('odell');
      // Walk out of the Cryo Bay into the next room; that autosaves.
      HA.debug.goto('cryo-bay', 76, 18);
      HA.debug.step(60, { right: true });
      out.roomAfterWalk = w().def.id;
      out.savedAfterWalk = HA.save.exists();
      // The Arc Coil's hum stops when another weapon is picked up mid-charge.
      let hum = 0;
      const realCharge = HA.audio.charge;
      HA.audio.charge = (a) => (hum = a);
      HA.debug.goto('pod-stacks', 35, 24);
      HA.debug.step(5);
      HA.debug.step(30, { fire: true });
      out.humWhileCharging = hum;
      w().pickups.push({ kind: 'weapon', id: 'cannon', key: 'test', x: w().player.x, y: w().player.y, w: 12, h: 10, life: Infinity, t: 0, message: '' });
      HA.debug.step(3, { fire: true });
      out.humAfterPickup = hum;
      HA.audio.charge = realCharge;
      // Rest pods heal and save.
      HA.debug.goto('thaw-corridor', 8, 18);
      w().player.hp = 3;
      HA.debug.step(2);
      HA.debug.step(2, { up: true });
      HA.debug.step(5);
      out.rested = !!w().state.rest && w().player.hp === w().player.maxHp;
      // Meeting the Hullfolk, then the raid that starts when the hero rests in the Warrens.
      HA.debug.goto('warrens', 4, 18);
      HA.debug.step(5);
      out.meetScene = !!w().scene;
      talkThrough();
      out.met = !!w().state.flags.metHullfolk;
      HA.debug.goto('warrens', 100, 18);
      HA.debug.step(2);
      HA.debug.step(2, { up: true });
      talkThrough();
      out.raid = !!w().state.flags.raid;
      const collectors = w().enemies.filter((e) => e.collector && !e.dead);
      out.collectors = collectors.length;
      for (const e of collectors) w().hurtEnemy(e, 99, 1);
      HA.debug.step(5);
      talkThrough();
      out.raidDone = !!w().state.flags.raidDone;
      out.lead = w().state.lead;
      // The Steward speaks for the first time, over the Lockup's intercom.
      HA.debug.goto('lockup', 1, 18);
      HA.debug.step(3);
      out.intercomScene = !!w().scene && w().scene.name === 'intercom';
      talkThrough();
      out.intercom = !!w().state.flags.intercom;
      // The Bailiff: the door shuts, the fight starts, and defeat leads to the choice.
      HA.debug.goto('arena', 8, 18);
      HA.debug.step(5);
      talkThrough();
      out.bossFighting = !!(w().boss && w().boss.fighting);
      out.doorShut = w().doors.every((d) => !d.open);
      HA.debug.step(240);
      w().hurtEnemy(w().boss, 999, 1);
      talkThrough();
      const step = w().scene && w().scene.step;
      out.atChoice = !!(step && step.choice);
      // Pick SALVAGE: down, confirm, then YES on the gain-and-loss screen (which starts on NOT YET).
      HA.debug.step(1, { down: true });
      HA.debug.step(1);
      HA.debug.step(1, { confirm: true });
      HA.debug.step(1);
      out.confirmShown = !!(w().scene && w().scene.step && w().scene.step.confirming);
      HA.debug.step(1, { up: true });
      HA.debug.step(1);
      HA.debug.step(1, { confirm: true });
      talkThrough();
      const s = w().state;
      out.choice = s.wardens.bailiff;
      out.oldChoiceFlag = s.flags.choice;
      out.maxHp = w().player.maxHp;
      out.room = w().def.id;
      out.homeDone = !!s.flags.homeDone && !!s.flags.goodbye;
      out.leadAfter = s.lead;
      out.restAtWarrens = !!s.rest && s.rest.room === 'warrens';
      out.wickInWarrens = w().npcs.some((n) => n.id === 'wick' && n.state !== 'gone');
      out.journal = { story: s.journal.story.length, choices: s.journal.choices.length, talk: s.journal.talk.length };
      // The morning after: Wick waits in the Bailiff's Hall, joins the hero, and walks with them into the Gardens.
      HA.debug.goto('arena', 22, 18);
      HA.debug.step(2);
      out.wickInHall = w().npcs.some((n) => n.id === 'wick');
      out.eastOpen = w().doors.some((d) => d.id === 'east' && d.open);
      HA.debug.step(60, { right: true });
      out.joinScene = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(150, { right: true });
      out.gardensRoom = w().def.id;
      out.gardens = !!w().state.flags.gardens;
      out.wickFollows = w().npcs.some((n) => n.id === 'wick' && n.follow);
      return out;
    });
    expect(r.roomAfterWalk === 'thaw-corridor', `walking off the Cryo Bay's edge led to ${r.roomAfterWalk}`);
    expect(r.savedAfterWalk, 'changing rooms did not save');
    expect(r.humWhileCharging > 0 && r.humAfterPickup === 0, `the Arc Coil hum kept going after a pickup (${r.humWhileCharging} then ${r.humAfterPickup})`);
    expect(r.rested, 'the rest pod did not heal and save');
    expect(r.meetScene && r.met, 'meeting the Hullfolk did not play');
    expect(r.raid && r.collectors === 2 && r.raidDone, `the raid did not play through (${JSON.stringify(r)})`);
    expect(/BROKEN GATE/.test(r.lead), `wrong lead after the raid: ${r.lead}`);
    expect(r.bossFighting && r.doorShut, 'the Bailiff fight did not start with the door shut');
    expect(r.atChoice && r.confirmShown, 'the choice and its gain-and-loss screen did not appear');
    expect(r.choice === 'salvage' && r.maxHp === 16, `salvaging the core did not give +4 max health (${r.choice}, ${r.maxHp})`);
    expect(r.oldChoiceFlag === undefined, 'the Bailiff\'s fate should live in wardens.bailiff, not flags.choice');
    expect(r.room === 'warrens' && r.homeDone && r.restAtWarrens, `the reunion and the night after it did not play (${JSON.stringify(r)})`);
    expect(r.leadAfter === 'FIND THE TAKEN IN THE GARDENS', `wrong lead after the reunion: ${r.leadAfter}`);
    expect(!r.wickInWarrens && r.wickInHall, 'Wick should have gone ahead to the Bailiff\'s Hall');
    expect(r.eastOpen && r.joinScene === 'wickJoins', `the Hall's east door should be open, and Wick should join the hero (${r.joinScene})`);
    expect(r.gardensRoom === 'root-cellar' && r.gardens && r.wickFollows, `Wick should walk into the Root Cellar with the hero (${JSON.stringify(r)})`);
    expect(r.maraScene && r.mara, "Mara's pod could not be read, or didn't reach the journal");
    expect(r.intercomScene && r.intercom, 'the Steward did not speak over the Lockup intercom');
    expect(r.jumpThrust > r.jumpOnly + 30, `the thruster pack did not lift the hero (jump ${r.jumpOnly}px, with thrust ${r.jumpThrust}px)`);
    expect(r.journal.story >= 8 && r.journal.choices === 1 && r.journal.talk > 30, `the journal is missing entries (${JSON.stringify(r.journal)})`);
    await shot('reunion');

    // ---- Map and journal open and close by key ----
    await page.keyboard.press('Tab');
    await wait(150);
    expect(await get(() => !!(HA.ui.stack.length && HA.ui.stack[0].screen)), 'Tab did not open the map');
    await shot('map');
    await page.keyboard.press('KeyE');
    await wait(150);
    await shot('journal');
    await page.keyboard.press('Escape');
    await wait(150);
    expect(await get(() => HA.ui.stack.length === 0), 'Escape did not close the map');

    // ---- Menus also answer to the mouse: click MAP in the pause menu, then right-click back out ----
    await page.keyboard.press('Escape');
    await wait(150);
    const at = await get(() => {
      const r = HA.ui.stack[0].items.find((it) => it.label === 'MAP').rect;
      const v = HA.display.view;
      const dpr = window.devicePixelRatio || 1;
      return { x: (v.ox + (r.x + r.w / 2) * v.s) / dpr, y: (v.oy + (r.y + r.h / 2) * v.s) / dpr };
    });
    await page.mouse.click(at.x, at.y);
    await wait(150);
    expect(await get(() => HA.ui.stack.length === 2 && !!HA.ui.stack[1].screen), 'clicking MAP in the pause menu did not open the map');
    await page.mouse.click(at.x, at.y, { button: 'right' });
    await wait(150);
    await page.mouse.click(at.x, at.y, { button: 'right' });
    await wait(150);
    expect(await get(() => HA.ui.stack.length === 0), 'right-clicking did not back out of the map and the pause menu');

    // ---- Continue: reload the page and pick up the save ----
    await page.reload();
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    expect(await get(() => HA.ui.stack[0].items[0].label === 'CONTINUE'), 'the title screen did not offer CONTINUE');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    const back = await get(() => ({ room: HA.debug.world.def.id, maxHp: HA.debug.world.player.maxHp, choice: HA.debug.world.state.wardens.bailiff }));
    expect(back.room === 'root-cellar' && back.maxHp === 16 && back.choice === 'salvage', `continuing lost progress (${JSON.stringify(back)})`);

    // ---- The Hydroponic Gardens (Phase 3.1), from the continued save, fast-forwarded ----
    const gd = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      let s = w().state;
      let p = w().player;
      // (An ending returns to the title, where there's no world left to step.)
      const talkThrough = () => {
        for (let i = 0; i < 4000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
          HA.debug.skipScene();
          HA.debug.step(1);
        }
      };
      // Pick the option at index i, then YES on its gain-and-loss screen if it has one.
      const choose = (window.choose = (i) => {
        for (let k = 0; k < i; k++) {
          HA.debug.step(1, { down: true });
          HA.debug.step(1);
        }
        const asks = !!w().scene.step.choice.options[i].confirm;
        const lose = asks && w().scene.step.choice.options[i].confirm.lose;
        HA.debug.step(1, { confirm: true });
        HA.debug.step(1);
        if (asks) {
          HA.debug.step(1, { up: true });
          HA.debug.step(1);
          HA.debug.step(1, { confirm: true });
        }
        talkThrough();
        return lose;
      });
      window.talkThrough = talkThrough;
      w().assist.invincible = true;
      // A Bloom bulb on the cellar's loft: picked up, then eaten only on its own button, asking the first time.
      HA.debug.goto('root-cellar', 30, 12);
      HA.debug.step(30);
      out.bulbs = s.bulbs;
      p.hp = 4;
      HA.debug.step(2, { item: true });
      out.bulbAsks = !!(w().scene && w().scene.step && w().scene.step.choice);
      choose(0);
      out.ate = { bloom: s.bloom, bulbs: s.bulbs, healed: p.hp === p.maxHp, rush: p.rush > 0 };
      // The cradles: Wick stays with them, and the lead goes up to the Warden that holds the seals.
      HA.debug.goto('root-cellar', 48, 18);
      HA.debug.step(5);
      out.cradleScene = w().scene && w().scene.name;
      talkThrough();
      out.lead1 = s.lead;
      // The Scatter Launcher, on the Terraces.
      HA.debug.goto('terraces', 4, 32);
      HA.debug.step(20);
      out.scatter = p.weapons.some((x) => x.id === 'scatter');
      HA.debug.step(2, { fire: true });
      out.grenade = w().shots.some((x) => x.kind === 'grenade');
      // The Pruner: the doors shut, it fights, and then it asks to be finished (choice 2). Release it.
      HA.debug.goto('seal-room', 84, 18);
      HA.debug.step(5);
      talkThrough();
      out.prunerFighting = !!(w().boss && w().boss.fighting && w().boss.type === 'pruner');
      out.hallShut = w().doors.every((d) => !d.open);
      HA.debug.step(200);
      // Shots still flying after the hero falls can't finish a boss.
      const hp0 = w().boss.hp;
      p.dead = true;
      w().hurtEnemy(w().boss, 999, 1);
      out.deadCantWin = w().boss.hp === hp0 && !w().scene;
      p.dead = false;
      w().hurtEnemy(w().boss, 999, 1);
      talkThrough();
      out.prunerChoice = !!(w().scene && w().scene.step && w().scene.step.choice);
      out.prunerLose = choose(0);
      out.pruner = s.wardens.pruner;
      out.mercy = s.mercy;
      // Down the Dome Stair: its shutter opens back into the Terraces.
      HA.debug.goto('dome-stair', 12, 64);
      HA.debug.step(140, { left: true });
      out.shortcut = w().def.id;
      // Back at the cradles they open; eleven wake and go home; Wick is gone and her lantern is on the floor.
      HA.debug.goto('root-cellar', 40, 18);
      HA.debug.step(5);
      out.wakeScene = w().scene && w().scene.name;
      // Quit to the title as soon as the cradles open, then continue: what the scene decided is kept.
      for (let i = 0; i < 2000 && !s.flags.cradles; i++) HA.debug.step(1, i % 20 === 0 ? { confirm: true } : {});
      HA.ui.toTitle();
      HA.ui.continueGame();
      s = w().state;
      p = w().player;
      w().assist.invincible = true;
      talkThrough();
      out.takenHome = s.takenHome;
      out.lantern = !!s.flags.lantern;
      out.lead2 = s.lead;
      out.wakeReplayed = !!w().scene;
      // Until Wick is found, the hero won't go home: not by the lift, and not on foot through the Lockup.
      HA.debug.goto('garden-lift', 10, 18);
      HA.debug.step(20);
      HA.debug.step(2, { up: true });
      out.liftRefusal = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      HA.debug.goto('lockup', 2, 18);
      HA.debug.step(60, { left: true });
      out.heldNote = w().toastText;
      out.held = w().def.id === 'lockup';
      // The vats: the seal is open now. Wick's fight, her collapse at a quarter health, and her lancets.
      HA.debug.goto('garden-lift', 30, 41);
      HA.debug.step(3);
      out.vatSeal = w().doors.find((d) => d.id === 'vats').open;
      HA.debug.goto('vat-house', 8, 18);
      HA.debug.step(5);
      talkThrough();
      out.wickFighting = !!(w().boss && w().boss.fighting && w().boss.type === 'wick');
      HA.debug.step(200);
      w().hurtEnemy(w().boss, 999, 1);
      out.wickHp = w().boss.hp;
      talkThrough();
      out.offer = !!(w().scene && w().scene.step && w().scene.step.choice);
      out.wick = s.people.wick;
      out.lancets = p.weapons.some((x) => x.id === 'lancets');
      choose(0); // keep them: the Gardener will ask again in the Tower
      out.kept = { lancets: p.weapons.some((x) => x.id === 'lancets'), thorn: p.weapons.some((x) => x.id === 'thorn'), offered: !!s.flags.thornOffered };
      out.music = HA.music.playing;
      out.lead3 = s.lead;
      // The Seed Vault's hatch: the grapple (Phase 3.3) bites its ring and tears it open.
      HA.debug.goto('garden-lift', 8, 41);
      HA.debug.step(20); // skipped scenes end in a few frames, so let the hit-stop from Wick's fall run out
      p.facing = -1;
      p.abilities.grapple = true;
      out.hatchPulled = HA.abilities.fireGrapple(w(), p, { held: {}, pressed: {}, released: {} });
      HA.debug.step(3);
      out.hatchOpen = w().doors.find((d) => d.id === 'vault').open;
      p.abilities.grapple = false;
      out.choices = s.journal.choices.length;
      w().assist.invincible = false;
      return out;
    });
    expect(gd.bulbs === 1 && gd.bulbAsks && gd.ate.bloom === 1 && gd.ate.bulbs === 0 && gd.ate.healed && gd.ate.rush, `the Bloom bulb was not picked up, asked about, and eaten (${JSON.stringify(gd)})`);
    expect(gd.cradleScene === 'cradles' && gd.lead1 === 'FIND THE WARDEN THAT HOLDS THE SEALS', `the cradles scene did not play (${gd.cradleScene}, ${gd.lead1})`);
    expect(gd.scatter && gd.grenade, 'the Scatter Launcher was not picked up, or threw no grenade');
    expect(gd.prunerFighting && gd.hallShut && gd.prunerChoice, `the Pruner fight and its choice did not play (${JSON.stringify(gd)})`);
    expect(gd.pruner === 'release' && /LAUNCHER/.test(gd.prunerLose) && gd.mercy === 0, `releasing the Pruner went wrong (${gd.pruner}, ${gd.prunerLose}, mercy ${gd.mercy})`);
    expect(gd.shortcut === 'terraces', `the Dome Stair's shutter did not open into the Terraces (${gd.shortcut})`);
    expect(gd.wakeScene === 'wake' && gd.takenHome === 11 && gd.lantern && gd.lead2 === 'FIND WICK IN THE VATS' && !gd.wakeReplayed, `the taken did not wake and go home, or quitting mid-scene lost it (${JSON.stringify(gd)})`);
    expect(gd.deadCantWin, 'a shot landing after the hero fell finished the Pruner');
    expect(gd.vatSeal && gd.wickFighting && gd.wickHp === 40 && gd.offer, `Wick's fight did not end in her collapse and the Gardener's offer (${JSON.stringify(gd)})`);
    expect(gd.wick === 'dead' && gd.lancets && gd.kept.lancets && !gd.kept.thorn && gd.kept.offered, `Wick's lancets were not given, or keeping them went wrong (${JSON.stringify(gd)})`);
    expect(gd.music === null && /GARDEN LIFT/.test(gd.lead3), `after Wick, the Gardens should be silent with the lead home (${gd.music}, ${gd.lead3})`);
    expect(gd.liftRefusal === 'NOT WITHOUT WICK.' && gd.heldNote === 'NOT WITHOUT WICK.' && gd.held, `before Wick, the way home should be held (${gd.liftRefusal} / ${gd.heldNote})`);
    expect(gd.hatchPulled && gd.hatchOpen, `the grapple did not tear the Seed Vault hatch open (${gd.hatchPulled}, ${gd.hatchOpen})`);
    expect(gd.choices === 3, `the journal should list three choices by now (${gd.choices})`);
    await shot('gardens');

    // ---- The Warrens return (Phase 3.2): home by the lift, Shim, the broadcast, the pistol, the night ----
    const wr = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      const s = w().state;
      const p = w().player;
      const { talkThrough, choose } = window;
      const talkTo = (id) => {
        const n = w().npcs.find((x) => x.id === id);
        p.x = n.x + 12;
        HA.debug.step(3);
        HA.debug.step(1, { up: true });
        return w().scene && w().scene.name;
      };
      w().assist.invincible = true;
      // The Garden Lift takes the hero home. The woken are there already; Gasket sees the lantern.
      HA.debug.goto('garden-lift', 10, 18);
      HA.debug.step(3);
      HA.debug.step(2, { up: true });
      talkThrough(); // the ride down, and the arrival scene it leads into
      out.room = w().def.id;
      out.arrival = !!s.flags.homeAgain && s.journal.story.some((t) => /SAW WICK'S LANTERN/.test(t));
      out.woken = w().npcs.filter((n) => n.id === 'woken').length;
      talkThrough();
      out.lead1 = s.lead;
      out.music1 = HA.music.playing;
      // Choice 4: tell Shim everything. He keeps her lantern.
      out.tellScene = talkTo('shim');
      talkThrough();
      out.tellLose = choose(0);
      const shim = w().npcs.find((n) => n.id === 'shim');
      out.told = { told: s.toldShim, heroHas: !!s.flags.lantern, with: s.flags.lanternWith, shimHolds: !!shim.lantern };
      // Gasket's grief, then the Steward over the old speakers, and Solder's plan.
      out.griefScene = talkTo('gasket');
      talkThrough();
      out.broadcast = !!s.flags.broadcastHeard;
      out.lead2 = s.lead;
      // Choice 5, at Solder's bench: the pistol becomes the Rivet Repeater.
      out.pistolScene = talkTo('solder');
      talkThrough();
      out.pistolLose = choose(1);
      out.gun = p.weapons.map((x) => x.id);
      w().player.wi = p.weapons.findIndex((x) => x.id === 'repeater');
      HA.debug.step(2, { fire: true });
      out.twin = w().shots.filter((x) => x.owner === 'player' && x.kind === 'bolt').length;
      // Resting starts the night: Solder builds the gate, opens the hatch and goes.
      const pod = w().pods[0];
      p.x = pod.x + 4;
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      out.night = w().scene && w().scene.name;
      talkThrough();
      out.morning = { lead: s.lead, newGate: !!s.flags.newGate, hatch: !!s.flags.hatch, planned: !!s.flags.climbPlanned, solderGone: !w().npcs.some((n) => n.id === 'solder' && n.state !== 'gone'), name: HA.story.callName(s) };
      // The new gate stays shut until the hero comes near it, then lets them through to the Lockup.
      const gate = w().doors.find((d) => d.id === 'gate');
      out.gateShut = !gate.open;
      HA.debug.step(160, { right: true });
      out.gateOpened = w().def.id === 'lockup';
      // Down the floor hatch to the sump and the dead keel tram. The Labyrinth waits; the ladder goes back up.
      HA.debug.goto('warrens', 78, 18);
      HA.debug.step(3);
      out.hatchPrompt = w().near && w().near.label;
      HA.debug.step(1, { down: true });
      talkThrough();
      HA.debug.step(5);
      out.sump = w().def.id;
      HA.debug.goto('sump', 3, 18);
      HA.debug.step(60, { left: true });
      out.sumpWest = w().def.id;
      HA.debug.goto('sump', 38, 18);
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      talkThrough();
      HA.debug.step(5);
      out.ladderUp = [w().def.id, Math.round(p.x / 8)];
      // The lift runs back up to the Gardens, whose music is back now the hero has been home.
      HA.debug.goto('warrens', 65, 18);
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      talkThrough();
      HA.debug.step(5);
      out.liftUp = w().def.id;
      out.music2 = HA.music.playing;
      out.choices = s.journal.choices.length;
      w().assist.invincible = false;
      return out;
    });
    expect(wr.room === 'warrens' && wr.arrival && wr.woken === 11 && wr.lead1 === 'TELL SHIM' && wr.music1 === 'warrensHush', `the lift home did not bring the hero back to the woken and Gasket (${JSON.stringify(wr)})`);
    expect(wr.tellScene === 'tellShim' && wr.tellLose === 'HIS HOPE' && wr.told.told === 'truth' && !wr.told.heroHas && wr.told.with === 'shim' && wr.told.shimHolds, `telling Shim everything went wrong (${JSON.stringify(wr.told)})`);
    expect(wr.griefScene === 'grief' && wr.broadcast && wr.lead2 === 'TALK TO SOLDER BEFORE SHE GOES', `Gasket's grief and the broadcast did not play (${JSON.stringify(wr)})`);
    expect(wr.pistolScene === 'pistol' && /FALLS/.test(wr.pistolLose) && wr.gun.includes('repeater') && !wr.gun.includes('pistol') && wr.twin === 2, `the pistol did not become the Repeater (${JSON.stringify(wr)})`);
    expect(wr.night === 'solderLeaves' && wr.morning.newGate && wr.morning.hatch && wr.morning.planned && wr.morning.solderGone && wr.morning.lead === 'FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH', `the night Solder leaves did not play out (${JSON.stringify(wr.morning)})`);
    expect(wr.gateShut && wr.gateOpened, `the new gate should be shut, and open as the hero comes near (${wr.gateShut}, ${wr.gateOpened})`);
    expect(/CLIMB DOWN/.test(wr.hatchPrompt) && wr.sump === 'sump' && wr.sumpWest === 'hatch-drop' && wr.ladderUp[0] === 'warrens' && wr.ladderUp[1] === 78, `the hatch to the sump went wrong (${JSON.stringify(wr)})`);
    expect(wr.liftUp === 'garden-lift' && wr.music2 === 'gardens' && wr.choices === 5, `the lift back up, the Gardens' music or the journal went wrong (${JSON.stringify(wr)})`);
    await shot('warrens-return');

    // ---- The Cargo Labyrinth (Phase 3.3): the cranes, the harpoon, the deserter, Odell, the Tallyman, the boat ----
    const cl = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      const s = w().state;
      const p = w().player;
      const { talkThrough, choose } = window;
      const at = (room, tx, ty) => {
        HA.debug.goto(room, tx, ty);
        HA.debug.step(5);
        return w().near && w().near.label;
      };
      w().assist.invincible = true;
      // West out of the sump, into the Labyrinth.
      HA.debug.goto('sump', 4, 18);
      HA.debug.step(60, { left: true });
      HA.debug.step(20);
      talkThrough();
      out.into = { room: w().def.id, cargo: !!s.flags.cargo, music: HA.music.playing };
      // The Stacks: crane A's switch from below drops its stack into the hole, opening the corridor; crane B's
      // switch in the pocket hoists the other stack out of the way out.
      out.switchPrompt = at('stacks', 28, 41);
      HA.debug.step(1, { up: true });
      out.craneMoving = !!w().craneMove;
      HA.debug.step(70);
      out.cranes = { a: !!s.flags.craneA, corridor: w().room.tile(37, 12) === 0, hole: w().room.tile(37, 16) !== 0 };
      at('stacks', 49, 41);
      HA.debug.step(1, { up: true });
      HA.debug.step(70);
      out.cranes.b = !!s.flags.craneB;
      out.cranes.wayOut = w().room.tile(60, 40) === 0;
      // The Sorting Floor: Solder's chalk stops, and the belts carry the hero toward the chute.
      at('sorting-floor', 3, 64);
      HA.debug.step(10);
      out.chalk = w().scene && w().scene.name;
      talkThrough();
      const x0 = p.x;
      HA.debug.step(30);
      out.belt = p.x - x0;
      // The Armory: the Grapple Harpoon, and a ring to pull up on.
      at('armory', 28, 18);
      HA.debug.step(40, { right: true });
      out.harpoon = p.weapons.some((x) => x.id === 'harpoon') && !!s.abilities.grapple;
      p.wi = p.weapons.findIndex((x) => x.id === 'harpoon');
      at('armory', 24, 18);
      HA.debug.step(2, { up: true, fire: true });
      HA.debug.step(30);
      out.hung = !!(p.grapple && p.grapple.phase === 'hang');
      HA.debug.step(10, { down: true });
      // The Lifeboat Dock: the deserter, shaking. Choice 6: let him fly home.
      at('lifeboat-dock', 3, 18);
      HA.debug.step(80, { right: true });
      out.deserter = w().scene && w().scene.name;
      talkThrough();
      out.deserterLose = choose(0);
      out.fluxFate = { flux: s.people.flux, coldOpen: !!s.flags.coldOpen, thruster: s.abilities.thruster, lead: s.lead };
      // The Purser's boat: not yet.
      const purser = w().npcs.find((n) => n.id === 'purser');
      p.x = purser.x + 12;
      p.y = purser.y + purser.h - p.h;
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.boat = w().scene && w().scene.step.choice.options.map((o) => o.label).join('/');
      choose(0);
      // The Cold Store, past the melted ice: Odell, still waiting, and his pack.
      out.ice = (at('hatch-drop', 8, 38), w().doors.find((d) => d.id === 'ice').open);
      out.odellPrompt = at('cold-store', 7, 11);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.odell = { thruster: s.abilities.thruster, lead: s.lead, music: HA.music.playing };
      // Its old lift runs up to the Coolant Hall once called from below.
      at('cold-store', 10, 38);
      HA.debug.step(1, { up: true });
      talkThrough();
      HA.debug.step(5);
      out.coldLift = w().def.id;
      // The rest pod at the top of the Sorting Floor, then the Tallyman.
      at('sorting-floor', 33, 18);
      HA.debug.step(1, { up: true });
      HA.debug.step(20);
      HA.debug.goto('tally-yard', 4, 18);
      HA.debug.step(40, { right: true });
      out.tallyIntro = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(10);
      const b = w().boss;
      out.fight = { fighting: b.fighting, music: HA.music.playing };
      for (let i = 0; i < 40 && b.state !== 'open'; i++) HA.debug.step(20);
      out.fight.opened = b.state === 'open' && w().hooks.includes(b.core);
      // Its hold hangs open: the harpoon bites the core's ring and winches the hero up into it.
      p.wi = p.weapons.findIndex((x) => x.id === 'harpoon');
      Object.assign(p, { x: b.x + b.w / 2 - 4, y: 19 * 8 - 14, vx: 0, vy: 0 });
      HA.debug.step(2);
      const hp0 = b.hp;
      HA.debug.step(2, { up: true, fire: true });
      HA.debug.step(40);
      out.fight.struck = hp0 - b.hp;
      b.hp = 1;
      b.state = 'open';
      HA.bosses.tallyman.hurt(w(), b, 5, 1);
      HA.debug.step(10);
      out.fight.after = w().scene && w().scene.name;
      talkThrough();
      // Choice 8: let it finish its count. (This run tore out the Bailiff's core, so the true ending is already
      // closed and the core's screen doesn't name it; with the other two free, it would.)
      out.coreLose = w().scene.step.choice.options[1].confirm.lose;
      out.tallyLose = choose(0);
      out.tally = { fate: s.wardens.tallyman, vault: w().doors.find((d) => d.id === 'vault').open, said: s.journal.talk.some((t) => /LOCATION: BALLAST/.test(t.text)) };
      // The Vault's Breach Charges, and the cracked wall at the foot of the Sorting Floor.
      HA.debug.goto('vault', 26, 18);
      HA.debug.step(60, { right: true });
      const charges = p.weapons.find((x) => x.id === 'charges');
      out.charges = charges && charges.ammo;
      p.wi = p.weapons.indexOf(charges);
      HA.debug.goto('sorting-floor', 8, 86);
      p.facing = -1;
      HA.debug.step(5);
      HA.debug.step(2, { fire: true });
      HA.debug.step(60);
      out.wall = !!s.flags.aisleWall;
      HA.debug.step(100, { left: true });
      out.aisle = w().def.id;
      // The Drain: Solder's toolbag by the grate, and the grate down to the Ballast (Phase 3.4).
      at('drain', 19, 18);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.toolbag = s.lead;
      at('drain', 14, 18);
      HA.debug.step(1, { down: true });
      talkThrough();
      HA.debug.step(5);
      out.grate = w().def.id;
      // Travel: at a pod, the map rings the others; picking one goes there.
      s.rested.warrens = true;
      at('pursers-office', 8, 18);
      HA.debug.step(1, { up: true });
      HA.debug.step(100);
      out.podPrompt = w().near && w().near.label;
      HA.debug.step(1, { map: true });
      HA.debug.step(2);
      const scr = HA.ui.stack.length && HA.ui.stack[HA.ui.stack.length - 1].screen;
      out.travel = scr && scr.travel && scr.pods.map((x) => x.room).join('/');
      const pod = scr.pods.find((x) => x.room === 'warrens');
      scr.cursor.x = pod.x;
      scr.cursor.y = pod.y;
      HA.debug.step(1, { confirm: true });
      HA.debug.step(120);
      out.travelled = w().def.id;
      // Home: the deserter was Flux, Shim's father. He's by the fire.
      for (let i = 0; i < 3; i++) {
        HA.debug.step(30);
        talkThrough();
      }
      out.flux = w().npcs.some((n) => n.id === 'flux') && s.flags.fluxHome;
      // The Purser's boat, taken this time: the Deserter ending, played to the title.
      HA.debug.goto('lifeboat-dock', 16, 38);
      const purser2 = w().npcs.find((n) => n.id === 'purser');
      p.x = purser2.x + 12;
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.boatLose = w().scene.step.choice.options[1].confirm;
      choose(1);
      for (let i = 0; i < 400 && HA.ui.mode === 'play'; i++) {
        HA.debug.step(22);
        if (HA.ui.mode === 'play') HA.debug.step(1, { confirm: true });
      }
      out.ending = { mode: HA.ui.mode, seen: HA.save.endings() };
      return out;
    });
    expect(cl.into.room === 'hatch-drop' && cl.into.cargo && cl.into.music === 'cargo', `the sump did not lead into the Labyrinth (${JSON.stringify(cl.into)})`);
    expect(/SWITCH/.test(cl.switchPrompt) && cl.craneMoving && cl.cranes.a && cl.cranes.corridor && cl.cranes.hole && cl.cranes.b && cl.cranes.wayOut, `the Stacks' cranes did not move their stacks (${JSON.stringify(cl.cranes)})`);
    expect(cl.chalk === 'chalkStops' && cl.belt > 10, `the Sorting Floor's chalk or belts went wrong (${cl.chalk}, ${cl.belt})`);
    expect(cl.harpoon && cl.hung, `the Grapple Harpoon did not pull the hero up to the Armory's ring (${cl.harpoon}, ${cl.hung})`);
    expect(cl.deserter === 'deserter' && /BLOOMFIRE/.test(cl.deserterLose) && cl.fluxFate.flux === 'home' && cl.fluxFate.coldOpen && !cl.fluxFate.thruster && /COLD STORE/.test(cl.fluxFate.lead), `choice 6 went wrong (${JSON.stringify(cl)})`);
    expect(cl.boat === 'STAY/TAKE THE BOAT', `the Purser did not offer the boat (${cl.boat})`);
    expect(cl.ice && /READ/.test(cl.odellPrompt) && cl.odell.thruster === 'odell' && /TALLYMAN/.test(cl.odell.lead) && cl.odell.music === 'coldStore' && cl.coldLift === 'coolant-hall', `Odell, his pack or the cold lift went wrong (${JSON.stringify(cl)})`);
    expect(cl.tallyIntro === 'tallyIntro' && cl.fight.fighting && cl.fight.music === 'tallyman' && cl.fight.opened && cl.fight.struck === 40 && cl.fight.after === 'tallymanDefeated', `the Tallyman's fight went wrong (${JSON.stringify(cl.fight)})`);
    expect(/CHARGES HOLD 3/.test(cl.tallyLose) && cl.coreLose === 'WHAT IT KNOWS, FOR GOOD' && cl.tally.fate === 'release' && cl.tally.vault && cl.tally.said, `choice 8 went wrong (${JSON.stringify(cl.tally)}, ${cl.coreLose})`);
    expect(cl.charges === 3 && cl.wall && cl.aisle === 'long-aisle', `the Breach Charges did not open the cracked wall (${cl.charges}, ${cl.wall}, ${cl.aisle})`);
    expect(/BALLAST/.test(cl.toolbag) && cl.grate === 'ballast-intake', `the Drain went wrong (${cl.toolbag}, ${cl.grate})`);
    expect(/TRAVEL/.test(cl.podPrompt) && /warrens/.test(cl.travel) && cl.travelled === 'warrens' && cl.flux, `travel between pods, or Flux at home, went wrong (${JSON.stringify(cl)})`);
    expect(cl.boatLose.lose === 'EVERYONE ELSE, AND MARA' && /ENDS HERE/.test(cl.boatLose.note) && cl.ending.mode === 'title' && cl.ending.seen.includes('deserter'), `taking the boat did not play the Deserter ending to the title (${JSON.stringify(cl.ending)})`);
    await shot('labyrinth');

    // ---- The Flooded Ballast (Phase 3.4), from a save at the Drain's grate with the Labyrinth behind it ----
    await get(() => {
      const s = HA.save.newState();
      Object.assign(s.flags, { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, reunion: true, homeDone: true, goodbye: true, gardens: true, cradlesSeen: true, prunerDown: true, cradles: true, wickFought: true, wickDead: true, thornOffered: true, gardenerGone: true, homeAgain: true, broadcastHeard: true, pistolDone: true, pistolGiven: true, newGate: true, hatch: true, solderLeft: true, climbPlanned: true, lanternWith: 'shim', cargo: true, chalkStops: true, deserterMet: true, coldOpen: true, odell: true, odellPack: true, tallySeen: true, tallyDown: true, aisleWall: true, toolbag: true });
      Object.assign(s.wardens, { bailiff: 'release', pruner: 'release', tallyman: 'release' });
      Object.assign(s.people, { wick: 'dead', flux: 'home' });
      Object.assign(s.abilities, { thruster: 'odell', grapple: true });
      Object.assign(s, { toldShim: 'truth', mercy: 6, takenHome: 11, room: 'drain', x: 14 * 8, y: 19 * 8 - 14, facing: 1, fresh: false, lead: 'FOLLOW SOLDER DOWN THE DRAIN, TO THE BALLAST' });
      s.weapons = ['cannon', 'harpoon', 'charges'].map((id) => HA.weapons.make(id));
      localStorage.setItem('hollow-ark.save.v1', JSON.stringify(s));
    });
    await page.reload();
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    const bl = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      const s = w().state;
      const p = w().player;
      const talkThrough = () => {
        for (let i = 0; i < 6000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
          HA.debug.skipScene();
          HA.debug.step(1);
        }
      };
      // (The page was reloaded, so the helpers from the Gardens are gone.)
      const choose = (i) => {
        for (let k = 0; k < i; k++) {
          HA.debug.step(1, { down: true });
          HA.debug.step(1);
        }
        const asks = !!w().scene.step.choice.options[i].confirm;
        HA.debug.step(1, { confirm: true });
        HA.debug.step(1);
        if (asks) {
          HA.debug.step(1, { up: true });
          HA.debug.step(1);
          HA.debug.step(1, { confirm: true });
        }
        talkThrough();
      };
      const solder = () => HA.story.npcOf(w(), 'solder');
      // Walk on, jumping out of pools, and waiting whenever Solder falls behind.
      const pace = (i) => HA.debug.step(1, solder() && p.x - solder().x > 60 ? {} : { right: true, jump: i % 30 < 10 });
      w().assist.invincible = true;
      // Down the grate, into the Ballast.
      HA.debug.step(5);
      HA.debug.step(1, { down: true });
      talkThrough();
      HA.debug.step(10);
      out.into = { room: w().def.id, area: w().area.name, music: HA.music.playing, lead: s.lead };
      // 1. Solder, with the motor: the toolbag back, the Foam Sprayer, and the walk begins.
      HA.debug.goto('pump-gallery', 4, 18);
      HA.debug.step(5);
      talkThrough();
      out.found = { foam: p.weapons.some((x) => x.id === 'foam'), back: !!s.flags.toolbagBack, walk: !!s.flags.solderWalk };
      // 2. The walk along the Tank Farm, and Solder's goodbye at the workshop door.
      HA.debug.goto('tank-farm', 2, 41);
      HA.debug.step(5);
      const barks = new Set();
      for (let i = 0; i < 1500 && !(w().scene && w().scene.name === 'workshopDoor'); i++) {
        HA.debug.step(1, solder() && p.x - solder().x > 120 ? {} : { right: true });
        for (const b of w().barks) barks.add(b.text);
      }
      out.walk = { barks: barks.size, door: w().scene && w().scene.name };
      talkThrough();
      // Odell's Workshop: foam sets on the silt; stepping into the silt throws the hero back; the boots.
      HA.debug.goto('odell-workshop', 6, 18);
      HA.debug.step(5);
      p.wi = p.weapons.findIndex((x) => x.id === 'foam');
      HA.debug.step(1, { right: true });
      HA.debug.step(2, { fire: true });
      HA.debug.step(30);
      out.foam = (w().foam || []).length && w().room.tile(10, 19) === HA.room.FOAM;
      HA.debug.step(80, { right: true });
      out.thrown = p.x < 13 * 8;
      HA.debug.goto('odell-workshop', 36, 18);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.boots = s.abilities.boots;
      // In the boots the hero sinks to the bottom of the Tank Farm's east tank.
      HA.debug.goto('tank-farm', 52, 41);
      HA.debug.step(5);
      HA.debug.step(1, { down: true, jump: true });
      HA.debug.step(200);
      out.sank = p.y > 55 * 8;
      // The Silt Mother: her moves run, she's only hurt out of the water, she drains the tank, and she falls.
      HA.debug.goto('silt-tank', 4, 18);
      HA.debug.step(5);
      talkThrough();
      const b = w().boss;
      out.fighting = b && b.fighting && HA.music.playing === 'siltMother';
      const states = new Set();
      for (let i = 0; i < 1200; i++) {
        HA.debug.step(1);
        states.add(b.state);
      }
      out.states = [...states].sort().join(',');
      b.ghost = true;
      const hp = b.hp;
      HA.bosses.siltMother.hurt(w(), b, 10, 1);
      out.underwater = b.hp === hp;
      const hurtWhenOut = (to) => {
        for (let i = 0; i < 5000 && b.hp > to; i++) {
          HA.debug.step(1);
          if (!b.ghost && b.state !== 'drain') HA.bosses.siltMother.hurt(w(), b, 6, 1);
        }
      };
      hurtWhenOut(140);
      HA.debug.step(200);
      out.drained = b.phase === 2 && w().room.tile(40, 15) === HA.room.EMPTY;
      hurtWhenOut(0);
      out.defeated = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(30); // past the hit-stop of her last blow, which the skipped scene outran
      out.after = { down: !!s.flags.siltDown, raid: s.warrensRaid, withHer: !!s.flags.solderWith, solder: !!solder(), gates: w().doors.every((d) => d.open) };
      // 3. The flood. The first time, the water is let catch her, and she's pulled back to the Valve Hall.
      HA.debug.goto('valve-hall', 8, 41);
      HA.debug.step(5);
      for (let i = 0; i < 400 && !(w().scene && w().scene.name === 'flood'); i++) pace(i);
      talkThrough();
      out.flood = { flooding: !!s.flags.flooding, music: HA.music.playing, doors: w().doors.map((d) => d.id + (d.open ? '+' : '-')).join(' ') };
      w().floodLevel = solder().y + w().def.gy * 8 - 8;
      for (let i = 0; i < 300 && !(w().scene && w().scene.name === 'floodFail'); i++) HA.debug.step(1);
      out.failed = w().scene && w().scene.name;
      talkThrough();
      out.retry = { room: w().def.id, flooding: !!s.flags.flooding, solder: !!solder() };
      // Then up the culvert, keeping her close, to the hatch.
      for (let i = 0; i < 600 && !(w().scene && w().scene.name === 'flood'); i++) pace(i);
      talkThrough();
      const rooms = [];
      let under = 0;
      for (let i = 0; i < 6000 && !(w().scene && w().scene.name === 'jammed'); i++) {
        pace(i);
        if (!rooms.includes(w().def.id)) rooms.push(w().def.id);
        if (solder()) under = Math.max(under, solder().under || 0);
        if (w().scene && w().scene.name === 'floodFail') break;
      }
      out.culvert = { rooms: rooms.join('/'), under, scene: w().scene && w().scene.name };
      // 4. Choice 9: eat the Bloom on the hatch.
      talkThrough();
      const opts = w().scene && w().scene.step && w().scene.step.choice && w().scene.step.choice.options;
      out.nine = opts && opts.map((o) => o.label).join('/');
      out.bloomLose = opts && opts[1].confirm.lose;
      const bloom = s.bloom;
      choose(1);
      out.choice = { solder: s.people.solder, by: s.flags.solderBy, bloom: s.bloom - bloom, room: w().def.id, flooded: !!s.flags.flooded, flooding: !!s.flags.flooding, charges: p.weapons.some((x) => x.id === 'charges') };
      // 5. The tram, and the ballast control log.
      HA.debug.goto('tram-station', 33, 18);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.tram = { tram: !!s.flags.tram, lead: s.lead };
      HA.debug.goto('tram-station', 10, 8);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      out.log = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      // Home: the gate held, with the pistol on it.
      HA.debug.goto('warrens', 40, 18);
      for (let i = 0; i < 4; i++) {
        HA.debug.step(40);
        talkThrough();
      }
      out.home = { raidSeen: !!s.flags.raidSeen, story: s.journal.story.some((t) => /GATE HELD/.test(t)), solder: w().npcs.some((n) => n.id === 'solder' && n.state === 'out') };
      return out;
    });
    expect(bl.into.room === 'ballast-intake' && bl.into.area === 'FLOODED BALLAST' && bl.into.music === 'ballast' && /SOLDER/.test(bl.into.lead), `the Drain's grate did not lead into the Ballast (${JSON.stringify(bl.into)})`);
    expect(bl.found.foam && bl.found.back && bl.found.walk && bl.walk.barks >= 6 && bl.walk.door === 'workshopDoor', `finding Solder, or the walk, went wrong (${JSON.stringify(bl.found)}, ${JSON.stringify(bl.walk)})`);
    expect(bl.foam && bl.thrown && bl.boots && bl.sank, `the Foam Sprayer, the silt or the boots went wrong (${bl.foam}, ${bl.thrown}, ${bl.boots}, ${bl.sank})`);
    expect(bl.fighting && /bite/.test(bl.states) && /lash/.test(bl.states) && /spit/.test(bl.states) && bl.underwater && bl.drained && bl.defeated === 'siltMotherDefeated', `the Silt Mother's fight went wrong (${JSON.stringify(bl)})`);
    expect(bl.after.down && bl.after.raid === 'held' && bl.after.withHer && bl.after.solder && bl.after.gates, `after the Silt Mother, Solder or the raid went wrong (${JSON.stringify(bl.after)})`);
    expect(bl.flood.flooding && bl.flood.music === 'flood' && /hallWest- culvert\+/.test(bl.flood.doors) && bl.failed === 'floodFail' && bl.retry.room === 'valve-hall' && !bl.retry.flooding && bl.retry.solder, `the flood, or its retry, went wrong (${JSON.stringify(bl.flood)}, ${bl.failed}, ${JSON.stringify(bl.retry)})`);
    expect(bl.culvert.rooms === 'valve-hall/long-culvert/jammed-hatch' && bl.culvert.under === 0 && bl.culvert.scene === 'jammed', `the escape up the culvert went wrong (${JSON.stringify(bl.culvert)})`);
    expect(bl.nine === 'BLOW THE BEAM/EAT THE BLOOM ON THE HATCH/LEAVE HER' && /BLOOM GROWS/.test(bl.bloomLose) && bl.choice.solder === 'alive' && bl.choice.by === 'bloom' && bl.choice.bloom === 2 && bl.choice.room === 'tram-station' && bl.choice.flooded && !bl.choice.flooding && bl.choice.charges, `choice 9 went wrong (${JSON.stringify(bl.choice)})`);
    expect(bl.tram.tram && /ENGINE SPINE/.test(bl.tram.lead) && /NAVIGATOR AUTHORITY/.test(bl.log), `the tram, or the valves log, went wrong (${JSON.stringify(bl.tram)}, ${bl.log})`);
    expect(bl.home.raidSeen && bl.home.story && bl.home.solder, `home after the raid went wrong (${JSON.stringify(bl.home)})`);
    await shot('ballast');

    // ---- The Engine Spine (Phase 3.5), from a save at the tram station once the tram has gone for the climbers ----
    await get(() => {
      const s = HA.save.newState();
      Object.assign(s.flags, { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, reunion: true, homeDone: true, goodbye: true, gardens: true, cradlesSeen: true, prunerDown: true, cradles: true, wickFought: true, wickDead: true, thornOffered: true, gardenerGone: true, homeAgain: true, broadcastHeard: true, pistolDone: true, pistolGiven: true, newGate: true, hatch: true, solderLeft: true, climbPlanned: true, lanternWith: 'fire', cargo: true, chalkStops: true, deserterMet: true, deserterOffered: true, coldOpen: true, odell: true, odellPack: true, tallySeen: true, tallyDown: true, aisleWall: true, toolbag: true, ballast: true, solderFound: true, toolbagBack: true, siltSeen: true, siltDown: true, floodSeen: true, flooded: true, hatchOpen: true, tram: true, raidSeen: true });
      Object.assign(s.wardens, { bailiff: 'release', pruner: 'release', tallyman: 'release' });
      Object.assign(s.people, { wick: 'dead', flux: 'home', solder: 'alive' });
      Object.assign(s.abilities, { thruster: 'odell', grapple: true, boots: true });
      Object.assign(s, { toldShim: 'lie', warrensRaid: 'held', mercy: 6, takenHome: 11, room: 'tram-station', x: 34 * 8, y: 19 * 8 - 14, facing: 1, fresh: false, lead: 'FOLLOW THE KEEL LINE EAST TO THE FOOT OF THE ENGINE SPINE' });
      s.weapons = ['cannon', 'harpoon', 'foam', 'lancets'].map((id) => HA.weapons.make(id));
      localStorage.setItem('hollow-ark.save.v1', JSON.stringify(s));
    });
    await page.reload();
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    const sp = await get(() => {
      const out = {};
      const w = () => HA.debug.world;
      const s = w().state;
      const p = w().player;
      const talkThrough = () => {
        for (let i = 0; i < 6000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
          HA.debug.skipScene();
          HA.debug.step(1);
        }
      };
      const choose = (i) => {
        for (let k = 0; k < i; k++) {
          HA.debug.step(1, { down: true });
          HA.debug.step(1);
        }
        const asks = !!w().scene.step.choice.options[i].confirm;
        HA.debug.step(1, { confirm: true });
        HA.debug.step(1);
        if (asks) {
          HA.debug.step(1, { up: true });
          HA.debug.step(1);
          HA.debug.step(1, { confirm: true });
        }
        talkThrough();
      };
      const press = (key) => {
        HA.debug.step(1, { [key]: true });
        HA.debug.step(1);
      };
      const options = () => w().scene && w().scene.step && w().scene.step.choice && w().scene.step.choice.options;
      w().assist.invincible = true;
      // Along the keel tunnel into the Spine Foot.
      for (let i = 0; i < 200 && w().def.id === 'tram-station'; i++) HA.debug.step(1, { right: true });
      HA.debug.step(30);
      talkThrough();
      out.foot = { room: w().def.id, area: w().area.name, music: HA.music.playing, lead: s.lead };
      // The vent at the platform's end carries the hero up; off it to the left, onto the deck by the ladder.
      HA.debug.goto('spine-foot', 28, 37);
      for (let i = 0; i < 60; i++) HA.debug.step(1, { right: true });
      let top = 99;
      for (let i = 0; i < 200; i++) {
        HA.debug.step(1, p.vy > -0.6 && i > 40 && p.x > 26 * 8 ? { left: true } : {});
        top = Math.min(top, (p.y + p.h) / 8);
      }
      out.vent = { top: Math.floor(top), row: Math.round((p.y + p.h) / 8), ground: p.onGround };
      // The Boiler Landing: the tram comes in below and the crew build the first lift up to it.
      HA.debug.goto('boiler-stair', 18, 8);
      HA.debug.step(30);
      out.arrive = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(60);
      out.lift1 = { lifts: s.flags.lifts, link: w().links.some((l) => l.legend.crew), layers: w().def.musicLayers(s) };
      // Down in it to the Foot, where the tram now waits.
      const L = w().links.find((l) => l.legend.crew);
      p.x = L.x + 8;
      HA.debug.step(3);
      press('up');
      out.liftTo = (options() || []).map((o) => o.label).join('/');
      choose(0);
      HA.debug.step(80);
      out.down = { room: w().def.id, minder: w().npcs.some((n) => n.state === 'out') };
      // The heat: a slug's embers, a climber on the wall, and the pistons of the Piston Run.
      HA.debug.goto('boiler-stair', 23, 85);
      HA.debug.step(400);
      out.embers = w().hazards.some((h) => h.kind === 'ember');
      out.gripping = w().enemies.some((e) => e.type === 'climber' && e.grip);
      HA.debug.goto('piston-run', 16, 81); // on the catwalk the first ram sweeps
      w().assist.invincible = false;
      const hp = p.hp;
      for (let i = 0; i < 400 && p.hp === hp; i++) HA.debug.step(1);
      out.rammed = p.hp < hp;
      w().assist.invincible = true;
      p.hp = p.maxHp;
      // The Piston Landing: the second lift (seven of them is hands enough).
      HA.debug.goto('piston-run', 10, 8);
      HA.debug.step(30);
      out.landing2 = w().scene && w().scene.name;
      talkThrough();
      out.lift2 = s.flags.lifts;
      // Abel: up the ladder from the landing into the Reactor Throat.
      HA.debug.goto('piston-run', 4, 8);
      HA.debug.step(3);
      press('up');
      talkThrough();
      HA.debug.step(30);
      talkThrough();
      const b = w().boss;
      out.throat = { room: w().def.id, fighting: b.fighting, music: HA.music.playing, shut: w().doors.find((d) => d.id === 'throatShutter').open };
      const states = new Set();
      let fire = false;
      for (let i = 0; i < 1400; i++) {
        HA.debug.step(1);
        states.add(b.state);
        p.x = b.slag.length ? 22 * 8 : 4 * 8; // out from under it once it's thrown, so it lands and burns
        if (w().hazards.some((h) => h.kind === 'fire')) fire = true;
      }
      out.states = [...states].join(' ');
      out.fire = fire;
      b.lean = 0;
      HA.bosses.abel.hurt(w(), b, 50);
      out.barred = b.hp === b.maxHp;
      b.state = 'hold';
      b.timer = 999;
      HA.debug.step(30);
      HA.bosses.abel.hurt(w(), b, 140);
      out.phase = b.phase;
      b.state = 'idle';
      b.timer = 0;
      let opened = false;
      for (let i = 0; i < 1400 && !opened; i++) {
        HA.debug.step(1);
        opened = b.grates.some((g) => g.open) && w().room.tile(b.grates[0].x0, 19) === HA.room.EMPTY;
      }
      out.grates = opened;
      // In the fire under an open grate: burnt, and thrown back out onto the floor.
      w().assist.invincible = false;
      p.x = b.grates[1].x0 * 8 + 8;
      p.y = 19 * 8 - p.h;
      const before = p.hp;
      for (let i = 0; i < 40 && p.y + p.h < 19 * 8 + 4 + 8; i++) HA.debug.step(1);
      HA.debug.step(2);
      out.burnt = p.hp < before && p.y + p.h <= 19 * 8 + 1;
      w().assist.invincible = true;
      p.hp = p.maxHp;
      b.state = 'hold';
      b.timer = 999;
      HA.debug.step(30);
      HA.bosses.abel.hurt(w(), b, 999);
      HA.debug.step(5);
      out.defeated = w().scene && w().scene.name;
      talkThrough();
      out.ten = (options() || []).map((o) => o.label).join('/');
      const mercy = s.mercy;
      choose(0);
      HA.debug.step(60);
      out.abel = { fate: s.people.abel, mercy: s.mercy - mercy, open: w().doors.find((d) => d.id === 'throatShutter').open, floor: w().room.tile(b.grates[0].x0, 19) === HA.room.SOLID };
      // Up behind the shutter to the camp: the climbers come up the third lift.
      p.x = 3 * 8 - 4;
      p.y = 7 * 8 + 8 - p.h;
      HA.debug.step(5);
      press('up');
      talkThrough();
      HA.debug.step(40);
      talkThrough();
      out.camp = { room: w().def.id, crew: s.crew, lifts: s.flags.lifts, people: w().npcs.filter((n) => n.state === 'out').length, music: HA.music.playing };
      // Wick's Lancets, for Toller's arm.
      const toller = HA.story.npcOf(w(), 'toller');
      p.x = toller.x + 6; // his side away from the rest pod

      HA.debug.step(3);
      press('up');
      out.stitch = w().scene && w().scene.name;
      talkThrough();
      // The ladder up waits for the morning; resting at the pod brings the night.
      p.x = 34 * 8 - 4;
      HA.debug.step(3);
      press('up');
      out.notYet = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      p.x = w().pods[0].x + 4;
      HA.debug.step(3);
      press('up');
      HA.debug.step(3);
      out.night = w().scene && w().scene.name;
      talkThrough();
      out.call = (options() || []).map((o) => o.label).join('/');
      out.shim = !!s.flags.shimRanOff;
      choose(0);
      talkThrough();
      HA.debug.step(30);
      out.morning = { done: !!s.flags.campDone, purser: !!s.flags.purserGone, lead: s.lead };
      // The crew count themselves off by the Tower Lift.
      p.x = 34 * 8 - 4;
      p.y = 19 * 8 - p.h;
      HA.debug.step(3);
      press('up');
      talkThrough();
      HA.debug.step(10);
      for (let i = 0; i < 120 && !w().scene; i++) HA.debug.step(1, { left: true });
      const counts = [];
      for (let i = 0; i < 3000 && w().scene; i++) {
        const st = w().scene.step;
        if (st && st.say !== undefined && /^COUNT:/.test(st.text) && counts[counts.length - 1] !== st.text) counts.push(st.text);
        HA.debug.step(1, { confirm: i % 2 === 0 });
      }
      out.verdict = { room: w().def.id, counts: counts.length, crew: s.crew, lead: s.lead };
      HA.debug.goto('tower-lift', 24, 18);
      HA.debug.step(3);
      press('up');
      out.sealed = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      // The Tower Lift takes them all up into the Command Tower (Phase 3.6 carries on from there).
      const Z = w().links.find((l) => l.legend.big);
      p.x = Z.x + 8;
      HA.debug.step(3);
      press('up');
      out.tower = w().scene && w().scene.name;
      talkThrough();
      out.towerRoom = w().def.id;
      // Home: those who climbed are gone from the village, and so is Shim.
      HA.debug.goto('warrens', 40, 18);
      HA.debug.step(10);
      talkThrough();
      out.home = { gasket: w().npcs.some((n) => n.id === 'gasket' && n.state === 'out'), shim: w().npcs.some((n) => n.id === 'shim' && n.state === 'out'), tamp: w().npcs.some((n) => n.id === 'tamp' && n.state === 'out') };
      return out;
    });
    expect(sp.foot.room === 'spine-foot' && sp.foot.area === 'ENGINE SPINE' && sp.foot.music === 'spine' && /CLIMB THE ENGINE SPINE/.test(sp.foot.lead), `the keel tunnel did not lead to the Spine Foot (${JSON.stringify(sp.foot)})`);
    expect(sp.vent.top <= 8 && sp.vent.row === 10 && sp.vent.ground, `the Foot's steam vent did not carry the hero up to the deck (${JSON.stringify(sp.vent)})`);
    expect(sp.arrive === 'crewArrives' && sp.lift1.lifts === 1 && sp.lift1.link && sp.lift1.layers === 2, `the crew's arrival and first lift went wrong (${sp.arrive}, ${JSON.stringify(sp.lift1)})`);
    expect(sp.liftTo === 'DOWN TO THE FOOT/STAY' && sp.down.room === 'spine-foot' && sp.down.minder, `the crew's lift did not run down to the Foot (${sp.liftTo}, ${JSON.stringify(sp.down)})`);
    expect(sp.embers && sp.gripping && sp.rammed, `the Spine's heat slugs, climbers or pistons went wrong (${sp.embers}, ${sp.gripping}, ${sp.rammed})`);
    expect(sp.landing2 === 'liftTwo' && sp.lift2 === 2, `the second lift was not built (${sp.landing2}, ${sp.lift2})`);
    expect(sp.throat.room === 'reactor-throat' && sp.throat.fighting && sp.throat.music === 'abel' && !sp.throat.shut, `Abel's fight did not start with the shutter shut (${JSON.stringify(sp.throat)})`);
    expect(/throw/.test(sp.states) && /blow/.test(sp.states) && sp.fire && sp.barred && sp.phase === 2 && sp.grates && sp.burnt, `Abel's moves went wrong (${JSON.stringify(sp)})`);
    expect(sp.defeated === 'abelDefeated' && sp.ten === 'LEAVE HIM HIS FIRES/PUT THE FIRES OUT OF HIM' && sp.abel.fate === 'spared' && sp.abel.mercy === 1 && sp.abel.open && sp.abel.floor, `choice 10 went wrong (${sp.defeated}, ${sp.ten}, ${JSON.stringify(sp.abel)})`);
    expect(sp.camp.room === 'crew-camp' && sp.camp.crew === 8 && sp.camp.lifts === 3 && sp.camp.people === 8 && sp.camp.music === 'camp', `the climbers did not reach the camp (${JSON.stringify(sp.camp)})`);
    expect(sp.stitch === 'stitch' && /REST FIRST/.test(sp.notYet) && sp.night === 'lightsOut' && sp.call === 'STAY/TAKE THE BOAT' && sp.shim, `the camp's night went wrong (${JSON.stringify(sp)})`);
    expect(sp.morning.done && sp.morning.purser && /TOWER LIFT/.test(sp.morning.lead), `the morning at the camp went wrong (${JSON.stringify(sp.morning)})`);
    expect(sp.verdict.room === 'tower-lift' && sp.verdict.counts === 8 && sp.verdict.crew === 8 && /STEWARD/.test(sp.verdict.lead) && sp.tower === 'towerLift' && sp.towerRoom === 'barracks' && /WARDENS ONLY/.test(sp.sealed), `the crew's verdict, the Tower Lift or the sealed log went wrong (${JSON.stringify(sp.verdict)}, ${sp.tower}, ${sp.towerRoom}, ${sp.sealed})`);
    expect(!sp.home.gasket && !sp.home.shim && sp.home.tamp, `home after the climb went wrong (${JSON.stringify(sp.home)})`);
    await shot('spine');

    // ---- The Command Tower (Phase 3.6), from a save on the Tower Lift's deck after the crew's verdict ----
    // The lie path with a Warden salvaged: Shim in the Dome (choice 4b), the Gardener (choice 11), the Steward's fight
    // (a fall at the checkpoint), choice 12, the Key broken, and the run for the sleds to the Crash ending.
    const towerSave = (extra) =>
      get((extra) => {
        const s = HA.save.newState();
        Object.assign(s.flags, { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, reunion: true, homeDone: true, goodbye: true, gardens: true, cradlesSeen: true, prunerDown: true, cradles: true, wickFought: true, wickDead: true, thornOffered: true, gardenerGone: true, homeAgain: true, broadcastHeard: true, pistolDone: true, pistolGiven: true, newGate: true, hatch: true, solderLeft: true, climbPlanned: true, lanternWith: 'shim', cargo: true, chalkStops: true, deserterMet: true, deserterOffered: true, coldOpen: true, odell: true, odellPack: true, tallySeen: true, tallyDown: true, aisleWall: true, toolbag: true, ballast: true, solderFound: true, toolbagBack: true, siltSeen: true, siltDown: true, floodSeen: true, flooded: true, hatchOpen: true, tram: true, raidSeen: true, spine: true, crewCame: true, lifts: 2, liftTwoSeen: true, abelSeen: true, abelDown: true, camp: true, lightsOut: true, shimRanOff: true, purserGone: true, campDone: true, verdict: true });
        Object.assign(s.wardens, { bailiff: 'salvage', pruner: 'release', tallyman: 'release' });
        Object.assign(s.people, { wick: 'dead', flux: 'home', solder: 'alive', abel: 'spared' });
        Object.assign(s.abilities, { thruster: 'odell', grapple: true, boots: true });
        Object.assign(s, { toldShim: 'lie', warrensRaid: 'held', mercy: 5, takenHome: 11, crew: 6, room: 'tower-lift', x: 18 * 8, y: 19 * 8 - 14, facing: -1, fresh: false, lead: 'RIDE THE TOWER LIFT UP TO THE STEWARD' });
        s.weapons = ['cannon', 'harpoon', 'foam', 'lancets'].map((id) => HA.weapons.make(id));
        for (const [k, v] of Object.entries(extra || {})) {
          if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(s[k], v);
          else s[k] = v;
        }
        localStorage.setItem('hollow-ark.save.v1', JSON.stringify(s));
      }, extra);
    const startSaved = async () => {
      await page.reload();
      await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
      await get(() => {
        const w = () => HA.debug.world;
        window.tw = {
          w,
          talkThrough() {
            for (let i = 0; i < 6000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
              HA.debug.skipScene();
              HA.debug.step(1);
            }
          },
          // Every line said until the next choice (or the scene's end), confirming as a player would.
          listen() {
            const said = [];
            for (let i = 0; i < 8000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
              const st = w().scene.step;
              if (st && st.say !== undefined && said[said.length - 1] !== st.text) said.push(st.text);
              HA.debug.step(1, { confirm: i % 3 === 0 });
            }
            return said;
          },
          choose(i) {
            HA.debug.step(2); // let go of Confirm first: a choice answers to a fresh press
            for (let k = 0; k < i; k++) {
              HA.debug.step(1, { down: true });
              HA.debug.step(1);
            }
            const asks = !!w().scene.step.choice.options[i].confirm;
            HA.debug.step(1, { confirm: true });
            HA.debug.step(1);
            if (asks) {
              HA.debug.step(1, { up: true });
              HA.debug.step(1);
              HA.debug.step(1, { confirm: true });
            }
            HA.debug.step(1);
          },
          press(key) {
            HA.debug.step(1, { [key]: true });
            HA.debug.step(1);
          },
          options: () => w().scene && w().scene.step && w().scene.step.choice && w().scene.step.choice.options.map((o) => o.label).join('/'),
          toTitle() {
            for (let i = 0; i < 12000 && w() && !w().exitToTitle && HA.ui.mode === 'play'; i++) {
              HA.debug.skipScene();
              HA.debug.step(1);
            }
            HA.debug.step(30);
          },
        };
      });
    };
    await towerSave();
    await startSaved();
    const tw = await get(() => {
      const { w, talkThrough, listen, choose, press, options } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      // Up the Tower Lift with the crew.
      HA.debug.goto('tower-lift', 14, 18);
      HA.debug.step(3);
      press('up');
      out.lift = w().scene && w().scene.name;
      talkThrough();
      out.barracks = { room: w().def.id, crew: w().npcs.filter((n) => n.state === 'out').length, music: HA.music.playing, lead: s.lead, area: w().area.name };
      // The Observation Dome: the world, dark; Shim at the glass; the Navigator's terminal.
      HA.debug.goto('observation-dome', 1, 18);
      for (let i = 0; i < 40 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.dome = { scene: w().scene && w().scene.name, music: HA.music.playing, said: listen().join(' ') };
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.shimScene = w().scene && w().scene.name;
      out.shimSaid = listen().join(' ');
      out.fourB = options();
      const m = s.mercy;
      choose(1);
      talkThrough();
      out.lied = { knows: s.shimKnows, mercy: s.mercy - m, follow: !!(w().npcs.find((n) => n.id === 'shim') || {}).follow };
      HA.debug.goto('observation-dome', 19, 18);
      HA.debug.step(3);
      press('up');
      out.nav = listen().join(' ');
      out.navSpoke = s.flags.navSpoke;
      // Up the ladder into the Garden Gallery, Shim behind, and west to the Gardener.
      HA.debug.goto('observation-dome', 32, 18);
      HA.debug.step(3);
      press('up');
      talkThrough();
      out.gallery = { room: w().def.id, shim: w().npcs.some((n) => n.id === 'shim' && n.follow), gardener: w().npcs.some((n) => n.id === 'gardener') };
      HA.debug.goto('garden-gallery', 52, 18);
      for (let i = 0; i < 300 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.gardenerScene = w().scene && w().scene.name;
      listen();
      out.thorn = options();
      choose(0);
      out.toShim = listen().join(' ');
      out.eleven = options();
      const m2 = s.mercy;
      choose(0);
      talkThrough();
      out.gardener = { fate: s.people.gardener, mercy: s.mercy - m2, shimWith: s.flags.shimWith, lead: s.lead };
      // Up the Bridge Stair's ladder into the Helm: the speech, and the fight.
      HA.debug.goto('bridge-stair', 12, 8);
      HA.debug.step(3);
      out.podPrompt = w().near && w().near.label;
      HA.debug.goto('bridge-stair', 5, 8);
      HA.debug.step(3);
      press('up');
      talkThrough();
      out.helm = w().def.id;
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.speech = listen().join(' | ');
      const b = w().boss;
      out.fight = { fighting: b.fighting, music: HA.music.playing, check: w().checkpoint && w().checkpoint.room, crew: w().npcs.filter((n) => n.state === 'out').length };
      // Phase 1: the Key's field turns shots aside; the turrets fire on his word; the gates come down.
      HA.bosses.steward.hurt(w(), b, 10, 1);
      out.field = b.field > 0 && b.hp === b.maxHp;
      w().assist.invincible = true;
      let ordered = false;
      let gate = false;
      for (let i = 0; i < 900; i++) {
        HA.debug.step(1);
        ordered = ordered || w().shots.some((x) => x.kind === 'round');
        gate = gate || (b.gates[0].down && w().room.tile(b.gates[0].tx, 17) === HA.room.SOLID);
      }
      w().assist.invincible = false;
      out.ordered = ordered;
      out.gate = gate;
      // A fall in the fight: back at the checkpoint, inside the Helm, and straight back into it.
      p.hp = 1;
      p.invuln = 0;
      w().hurtPlayer(2, p.x + 20);
      for (let i = 0; i < 200 && (p.dead || !w().scene); i++) HA.debug.step(1);
      out.fall = { room: w().def.id, x: Math.round(p.x / 8), toast: w().toastText, scene: w().scene && w().scene.name };
      out.again = listen().join(' ');
      const b2 = w().boss;
      out.refight = b2.fighting && b2.phase === 1 && b2 !== b;
      // Break the relays: his guard, dosed; then the man himself.
      for (const r of b2.relays) HA.bosses.relay.hurt(w(), r, 50);
      HA.debug.step(2);
      out.guardScene = w().scene && w().scene.name;
      out.guardSaid = listen().join(' ');
      out.guards = b2.guards.map((g) => g.dosed && !g.shield).filter(Boolean).length;
      for (const g of b2.guards) {
        g.hp = 1;
        HA.actors.hurtEnemy(w(), g, 5, 1);
      }
      HA.debug.step(12);
      out.manSaid = listen().join(' ');
      w().assist.invincible = true;
      const states = new Set();
      let sight = false;
      for (let i = 0; i < 900; i++) {
        HA.debug.step(1);
        states.add(b2.state);
        sight = sight || !!b2.sight;
      }
      w().assist.invincible = false;
      out.man = { phase: b2.phase, states: [...states].join(','), sight };
      b2.manHp = 1;
      b2.rolling = false;
      HA.bosses.steward.hurt(w(), b2, 5, 1);
      HA.debug.step(20);
      out.defeated = w().scene && w().scene.name;
      out.beaten = listen().join(' ');
      out.twelve = options();
      const m3 = s.mercy;
      choose(0);
      // The Key breaks, the ship begins to come apart, and the crew run for the sleds.
      out.after = listen().join(' | ');
      out.steward = { fate: s.people.steward, mercy: s.mercy - m3, key: s.flags.key };
      talkThrough();
      out.run = { room: w().def.id, running: s.flags.running, scuttle: s.flags.scuttle, left: Math.round(w().runLeft / 60), music: HA.music.playing, check: w().checkpoint && w().checkpoint.room, lead: s.lead, alarm: w().alarm };
      // Along the way: the pods have no power, the Wardens are gone, and the ceilings come down.
      HA.debug.goto('thaw-corridor', 7, 18);
      HA.debug.step(5);
      out.podOff = !(w().near && w().near.kind === 'pod');
      HA.debug.goto('coolant-hall', 30, 18);
      HA.debug.step(5);
      out.wardens = w().enemies.filter((e) => !e.dead && ['warden', 'walker'].includes(e.type)).length;
      let debris = false;
      for (let i = 0; i < 300; i++) {
        HA.debug.step(1, { left: i % 60 < 30 });
        debris = debris || w().hazards.some((h) => h.kind === 'debris');
      }
      out.debris = debris;
      // The clock running out: back to the sump, with a full clock.
      w().runLeft = 2;
      HA.debug.step(4);
      out.failScene = w().scene && w().scene.name;
      talkThrough();
      out.retry = { room: w().def.id, left: Math.round(w().runLeft / 60) };
      // The Pod Stacks' console: launching the pods costs time.
      HA.debug.goto('pod-stacks', 5, 18);
      HA.debug.step(5);
      out.consolePrompt = w().near && w().near.label;
      press('up');
      listen();
      out.launchAsk = options();
      const before = w().runLeft;
      choose(0);
      talkThrough();
      out.launch = { cost: Math.round((before - w().runLeft) / 60), pods: s.podsLaunched };
      // Cryo Bay 4: Mara's clamps, empty; the sleds; the Crash ending.
      HA.debug.goto('cryo-bay', 22, 16);
      HA.debug.step(5);
      for (let i = 0; i < 400 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.mara = listen().join(' ');
      for (let i = 0; i < 400 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.sleds = w().scene && w().scene.name;
      window.tw.toTitle();
      out.title = HA.ui.mode;
      out.ending = JSON.parse(localStorage.getItem('hollow-ark.save.v1')).ending;
      return out;
    });
    expect(tw.lift === 'towerLift' && tw.barracks.room === 'barracks' && tw.barracks.crew === 6 && tw.barracks.music === 'tower' && tw.barracks.area === 'COMMAND TOWER' && /UP TO THE HELM/.test(tw.barracks.lead), `the Tower Lift did not take the crew up into the Barracks (${tw.lift}, ${JSON.stringify(tw.barracks)})`);
    expect(tw.dome.scene === 'domeView' && tw.dome.music === null && /NO LIGHTS/.test(tw.dome.said), `the Dome's view went wrong (${JSON.stringify(tw.dome)})`);
    expect(tw.shimScene === 'shimDome' && /WHERE IS MY MOTHER/.test(tw.shimSaid) && tw.fourB === 'TELL HIM THE TRUTH/KEEP LYING' && tw.lied.knows === false && tw.lied.mercy === -1 && tw.lied.follow, `choice 4b went wrong (${tw.shimScene}, ${tw.fourB}, ${JSON.stringify(tw.lied)})`);
    expect(/YOU ARE STILL HERE/.test(tw.nav) && tw.navSpoke, `the Navigator did not speak in the Dome (${tw.nav})`);
    expect(tw.gallery.room === 'garden-gallery' && tw.gallery.shim && tw.gallery.gardener && tw.gardenerScene === 'gardener', `the Garden Gallery went wrong (${JSON.stringify(tw.gallery)}, ${tw.gardenerScene})`);
    expect(/KEEP WICK'S LANCETS/.test(tw.thorn) && /ASKED VERY GOOD QUESTIONS/.test(tw.toShim) && tw.eleven === 'SPARE HER/MAKE HER TAKE HER OWN DOSE/WALK PAST', `the Gardener's offer or choice 11 went wrong (${tw.thorn}, ${tw.eleven}, ${tw.toShim})`);
    expect(tw.gardener.fate === 'spared' && tw.gardener.mercy === 1 && tw.gardener.shimWith && /BRIDGE STAIR/.test(tw.gardener.lead), `choice 11 did not spare the Gardener (${JSON.stringify(tw.gardener)})`);
    expect(tw.podPrompt === '{up} REST' && tw.helm === 'helm', `the Bridge Stair's pod or ladder went wrong (${tw.podPrompt}, ${tw.helm})`);
    expect(/DEAD MAN'S BOOTS/.test(tw.speech) && /THOSE WERE HIS BOOTS/.test(tw.speech) && /TELL ME AGAIN WHO THE MONSTER IS/.test(tw.speech), `the Steward's speech went wrong (${tw.speech})`);
    expect(tw.fight.fighting && tw.fight.music === 'steward' && tw.fight.check === 'helm' && tw.fight.crew >= 6 && tw.field && tw.ordered && tw.gate, `the Steward's first phase went wrong (${JSON.stringify(tw.fight)}, field ${tw.field}, turrets ${tw.ordered}, gates ${tw.gate})`);
    expect(tw.fall.room === 'helm' && /CHECKPOINT/.test(tw.fall.toast) && tw.fall.scene === 'stewardIntro' && /AGAIN, THEN/.test(tw.again) && !/BOOTS/.test(tw.again) && tw.refight, `a fall in the Steward's fight did not come back to its checkpoint (${JSON.stringify(tw.fall)}, ${tw.again}, ${tw.refight})`);
    expect(tw.guardScene === 'stewardGuard' && /MEASURE: FULL/.test(tw.guardSaid) && tw.guards === 3 && /DO IT MYSELF/.test(tw.manSaid), `the Steward's guard went wrong (${tw.guardScene}, ${tw.guardSaid}, ${tw.guards}, ${tw.manSaid})`);
    expect(tw.man.phase === 3 && /aim/.test(tw.man.states) && /crouch/.test(tw.man.states) && /run/.test(tw.man.states) && tw.man.sight, `the Steward's last phase went wrong (${JSON.stringify(tw.man)})`);
    expect(tw.defeated === 'stewardDefeated' && /AFRAID OF NOTHING/.test(tw.beaten) && tw.twelve === "SPARE HIM/END HIM/LEAVE HIM TO THE WARDENS' COUNT", `the Steward's defeat or choice 12 went wrong (${tw.defeated}, ${tw.twelve})`);
    expect(tw.steward.fate === 'spared' && tw.steward.mercy === 1 && tw.steward.key === 'broken' && /NOT YET/.test(tw.after) && /SLEDS/.test(tw.after), `choice 12 or the Key breaking went wrong (${JSON.stringify(tw.steward)}, ${tw.after})`);
    expect(tw.run.room === 'sump' && tw.run.running && tw.run.scuttle && tw.run.left === 270 && tw.run.music === 'scuttle' && tw.run.check === 'sump' && /SLEDS/.test(tw.run.lead) && tw.run.alarm, `the run for the sleds did not start (${JSON.stringify(tw.run)})`);
    expect(tw.podOff && tw.wardens === 0 && tw.debris, `the scuttle's ship went wrong (pods off ${tw.podOff}, wardens ${tw.wardens}, debris ${tw.debris})`);
    expect(tw.failScene === 'runFail' && tw.retry.room === 'sump' && tw.retry.left === 270, `running out of time did not start the run again (${tw.failScene}, ${JSON.stringify(tw.retry)})`);
    expect(/LAUNCH THE PODS/.test(tw.consolePrompt) && tw.launchAsk === 'LAUNCH THE PODS/KEEP RUNNING' && tw.launch.cost === 20 && tw.launch.pods > 0, `the pod launch went wrong (${tw.consolePrompt}, ${tw.launchAsk}, ${JSON.stringify(tw.launch)})`);
    expect(/CLAMPS WERE EMPTY/.test(tw.mara) && tw.sleds === 'sledsAway' && tw.title === 'title' && tw.ending === 'crash', `the sleds and the Crash ending went wrong (${tw.mara}, ${tw.sleds}, ${tw.title}, ${tw.ending})`);

    // The other branches after the Steward, each from a save at the Helm with him beaten and choice 12 to make.
    const helm = { room: 'helm', x: 16 * 8, y: 19 * 8 - 14, flags: { tower: true, towerUp: true, domeSeen: true, navSpoke: true, helmSeen: true, stewardSeen: true, stewardDown: true }, people: { gardener: 'passed' }, shimKnows: true };
    const branch = async (extra, fn) => {
      await towerSave(Object.assign({}, helm, extra, { flags: helm.flags, people: Object.assign({}, helm.people, extra.people) }));
      await startSaved();
      return get(fn);
    };
    // Dominion: Mercy -3 or less, and the Wardens kneel to the Key.
    const dom = await branch({ mercy: -4, crew: 2 }, () => {
      const { w, listen, choose, options, toTitle } = window.tw;
      HA.debug.step(40);
      const out = { scene: w().scene && w().scene.name, twelve: options() };
      choose(1);
      out.said = listen().join(' ');
      out.thirteen = options();
      choose(0);
      toTitle();
      out.ending = JSON.parse(localStorage.getItem('hollow-ark.save.v1')).ending;
      return out;
    });
    expect(dom.scene === 'stewardChoice' && /NEW HOLDER/.test(dom.said) && dom.thirteen === 'CLAIM THE KEY/BREAK IT' && dom.ending === 'dominion', `the Key offered and Dominion went wrong (${JSON.stringify(dom)})`);
    // Overgrown: Bloom 8 or more; the fight is Solder's, with the hero's weapon.
    const over = await branch({ bloom: 8, mercy: 2, crew: 3 }, () => {
      const { w, talkThrough, choose, toTitle } = window.tw;
      HA.debug.step(40);
      choose(0);
      talkThrough();
      const b = w().boss;
      const out = { playAs: w().playAs, type: b.type, weapons: w().player.weapons.map((x) => x.id).join(','), music: HA.music.playing, check: w().checkpoint && w().checkpoint.room };
      w().assist.invincible = true;
      const states = new Set();
      for (let i = 0; i < 1200; i++) {
        HA.debug.step(1);
        states.add(b.state);
      }
      w().assist.invincible = false;
      out.states = [...states].join(',');
      b.hp = 1;
      HA.bosses.overgrown.hurt(w(), b, 5);
      HA.debug.step(20);
      out.scene = w().scene && w().scene.name;
      toTitle();
      const saved = JSON.parse(localStorage.getItem('hollow-ark.save.v1'));
      out.ending = saved.ending;
      out.kept = saved.weapons.length;
      return out;
    });
    expect(over.playAs === 'solder' && over.type === 'overgrown' && over.weapons === 'cannon' && over.music === 'overgrown' && over.check === 'helm', `the Overgrown fight did not start as Solder (${JSON.stringify(over)})`);
    expect(/press/.test(over.states) && /air/.test(over.states) && /draw/.test(over.states) && /shake/.test(over.states) && over.scene === 'overgrownDefeated' && over.ending === 'overgrown' && over.kept === 4, `the Overgrown fight or ending went wrong (${JSON.stringify(over)})`);
    // The true path: every requirement met. The freed Wardens hold the doors, and the crew mend Lift B.
    const home = await branch({ mercy: 9, crew: 9, wardens: { bailiff: 'release', pruner: 'release', tallyman: 'release' } }, () => {
      const { w, listen, choose, press } = window.tw;
      HA.debug.step(40);
      choose(0);
      const out = { said: listen().join(' | ') };
      const s = w().state;
      out.liftB = s.flags.liftB;
      out.link = w().links.some((l) => l.legend.name === 'Lift B');
      out.music = HA.music.playing;
      out.lead = s.lead;
      // Lift B takes everyone down to the Dreaming Deck.
      HA.debug.goto('helm', 73, 16);
      HA.debug.step(3);
      press('up');
      out.ride = w().scene && w().scene.name;
      out.rideSaid = listen().join(' | ');
      HA.debug.step(20);
      out.room = w().def.id;
      out.crew = w().npcs.filter((n) => n.state === 'out').length;
      out.check = w().checkpoint && w().checkpoint.room;
      out.downLead = w().state.lead;
      return out;
    });
    expect(/ONE COUNT REMAINS/.test(home.said) && /CAN'T LIFT THE BRAKE ALONE/.test(home.said) && home.liftB && home.link && home.music === 'scuttle' && /LIFT B/.test(home.lead), `the true path at the Helm went wrong (${JSON.stringify(home)})`);
    expect(home.ride === 'liftBDown' && /DOWN, NOT OUT/.test(home.rideSaid) && home.room === 'lift-down' && home.crew >= 9 && home.check === 'lift-down' && /SEAL/.test(home.downLead), `Lift B down to the Dreaming Deck went wrong (${JSON.stringify(home)})`);
    await shot('tower');

    // ---- The Dreaming Deck (Phase 3.7), on from the Lift Down: the seal, the memory halls and their checkpoint,
    // the wake log, the Navigator's fight (a fall at its checkpoint, every loop cut, its course held on the world),
    // the song and the turn, and choice 14 in the Quiet, to the Homecoming ending ----
    const deck = await get(() => {
      const { w, listen, choose, options, toTitle } = window.tw;
      const walk = (dir, frames) => {
        for (let i = 0; i < frames && !w().scene; i++) HA.debug.step(1, { [dir]: true });
      };
      const out = {};
      walk('right', 400);
      out.seal = w().scene && w().scene.name;
      out.sealSaid = listen().join(' | ');
      HA.debug.step(5);
      out.sealOpen = w().state.flags.sealOpen;
      out.sealMusic = HA.music.playing;
      walk('right', 300);
      out.hall = w().def.id + ':' + (w().scene && w().scene.name);
      out.hallSaid = listen().join(' | ');
      HA.debug.goto('hall-helm', 8, 18);
      HA.debug.step(5);
      out.helm = w().scene && w().scene.name;
      listen();
      out.check = w().checkpoint && w().checkpoint.room;
      out.checkToast = w().toastText;
      HA.debug.goto('hall-helm', 62, 18);
      HA.debug.step(5);
      out.wake = w().scene && w().scene.name;
      out.wakeSaid = listen().join(' | ');
      HA.debug.goto('sphere', 30, 18);
      HA.debug.step(5);
      out.intro = listen().join(' | ');
      HA.debug.step(30);
      let b = w().boss;
      const p = w().player;
      out.fight = { fighting: b.fighting, music: HA.music.playing, check: w().checkpoint && w().checkpoint.room, nodes: b.nodes.length };
      // a fall in the fight: back at its checkpoint, and straight back into it
      p.hp = 1;
      p.invuln = 0;
      w().hurtPlayer(2, p.x + 20);
      for (let i = 0; i < 200 && (p.dead || !w().scene); i++) HA.debug.step(1);
      out.fall = { room: w().def.id, toast: w().toastText, scene: w().scene && w().scene.name };
      out.again = listen().join(' ');
      HA.debug.step(10);
      out.refight = w().boss !== b && w().boss.fighting;
      b = w().boss;
      // each loop: its nodes cut, and it redrawn faster, with more of them; the second burns
      w().assist.invincible = true;
      const loops = [];
      let burned = false;
      for (let k = 0; k < 3; k++) {
        for (let i = 0; i < 520; i++) {
          HA.debug.step(1);
          if (b.burn > 0) burned = true;
        }
        loops.push(b.phase + ':' + b.nodes.length + ':' + (w().navLayers || 0));
        for (const n of b.nodes) HA.bosses.navnode.hurt(w(), n, 99);
        HA.debug.step(10);
        loops.push(b.state + ':' + (w().navLine && w().navLine.text));
        HA.debug.step(130);
      }
      out.loops = loops.join(',');
      out.burned = burned;
      HA.debug.step(100); // the loop opens, and its course swings out
      // the hold: hits push the course onto the world, and it pulls back between them
      out.hold = { state: b.state, layers: w().navLayers, d0: +b.d.toFixed(2) };
      for (let i = 0; i < 240; i++) {
        if (i % 6 === 0) HA.bosses.navhead.hurt(w(), b.head, 3);
        HA.debug.step(1);
      }
      out.hold.held = +b.d.toFixed(2);
      out.hold.gained = b.hold;
      HA.debug.step(200);
      out.hold.pulled = +b.d.toFixed(2);
      for (let i = 0; i < 2000 && b.state !== 'held'; i++) {
        if (i % 6 === 0) HA.bosses.navhead.hurt(w(), b.head, 3);
        HA.debug.step(1);
      }
      w().assist.invincible = false;
      HA.debug.step(20);
      out.won = w().scene && w().scene.name;
      out.song = [];
      for (let i = 0; i < 9000 && w().scene; i++) {
        const m = HA.music.playing;
        if (out.song[out.song.length - 1] !== m) out.song.push(m);
        HA.debug.step(1, { confirm: i % 3 === 0 });
      }
      out.song = out.song.map(String).join(',');
      const f = w().state.flags;
      out.turned = { turned: f.navTurned, scuttle: f.scuttle, crew: w().npcs.filter((n) => n.state === 'out').length, lead: w().state.lead };
      walk('left', 600);
      out.quiet = w().def.id + ':' + (w().scene && w().scene.name);
      out.quietSaid = listen().join(' | ');
      out.fourteen = options();
      choose(1);
      toTitle();
      const saved = JSON.parse(localStorage.getItem('hollow-ark.save.v1'));
      out.ending = saved.ending;
      out.navigator = saved.people.navigator;
      return out;
    });
    expect(deck.seal === 'seal' && /CLEAN PERSONNEL ONLY/.test(deck.sealSaid) && /ACCESS: ONE/.test(deck.sealSaid) && deck.sealOpen && deck.sealMusic === 'deck', `the seal went wrong (${JSON.stringify(deck)})`);
    expect(deck.hall === 'hall-night:hallNight' && /I KEPT THE SONG/.test(deck.hallSaid) && deck.helm === 'hallHelm' && deck.check === 'hall-helm' && /CHECKPOINT/.test(deck.checkToast), `the memory halls or their checkpoint went wrong (${deck.hall}, ${deck.hallSaid}, ${deck.helm}, ${deck.check}, ${deck.checkToast})`);
    expect(deck.wake === 'wakeLog' && /0112\. LEFT/.test(deck.wakeSaid) && /2207\. RULED/.test(deck.wakeSaid) && /CHOOSE TO STAY/.test(deck.wakeSaid) && /THE WATER WAS A QUESTION/.test(deck.wakeSaid), `the wake log went wrong (${deck.wake}, ${deck.wakeSaid})`);
    expect(/YOU ARE STILL HERE/.test(deck.intro) && /NOT YET/.test(deck.intro) && deck.fight.fighting && deck.fight.music === 'navigator' && deck.fight.check === 'sphere' && deck.fight.nodes === 4, `the Navigator's fight did not start (${deck.intro}, ${JSON.stringify(deck.fight)})`);
    expect(deck.fall.room === 'sphere' && /CHECKPOINT/.test(deck.fall.toast) && deck.fall.scene === 'navIntro' && /NOT YET/.test(deck.again) && !/STILL HERE/.test(deck.again) && deck.refight, `a fall in the Navigator's fight did not come back to its checkpoint (${JSON.stringify(deck.fall)}, ${deck.again}, ${deck.refight})`);
    expect(deck.loops === '0:4:1,redraw:NOT YET.,1:5:2,redraw:NOT YET.,2:6:3,redraw:NOT YET.' && deck.burned, `the Navigator's loops went wrong (${deck.loops}, burned ${deck.burned})`);
    expect(deck.hold.state === 'hold' && deck.hold.layers === 4 && deck.hold.held < 0.35 && deck.hold.gained > 0 && deck.hold.pulled > deck.hold.held && deck.won === 'navigatorDefeated', `the hold went wrong (${JSON.stringify(deck.hold)}, ${deck.won})`);
    expect(/^null,hum,homecoming$/.test(deck.song) && deck.turned.turned && !deck.turned.scuttle && deck.turned.crew >= 9 && /QUIET/.test(deck.turned.lead), `the song and the turn went wrong (${deck.song}, ${JSON.stringify(deck.turned)})`);
    expect(deck.quiet === 'quiet:quietChoice' && /WILL YOU LEAVE ME TOO/.test(deck.quietSaid) && deck.fourteen === 'TAKE ITS CORE TO THE NEW WORLD/LET IT REST/STAY ABOARD WITH IT' && deck.ending === 'homecoming' && deck.navigator === 'rest', `choice 14 or the Homecoming ending went wrong (${deck.quiet}, ${deck.fourteen}, ${deck.ending}, ${deck.navigator})`);

    // ---- A Phase 2 save (the Bailiff's fate in flags.choice, the slice finished) upgrades and plays on ----
    await get(() => {
      const old = { v: 1, room: 'warrens', x: 400, y: 138, facing: 1, hp: 12, maxHp: 12, weapons: [{ id: 'pistol', level: 1, xp: 0, ammo: 0 }], wi: 0, mercy: 2, bloom: 0 };
      old.flags = { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, choice: 'release', reunion: true, sliceDone: true };
      Object.assign(old, { taken: {}, logs: {}, talked: {}, visited: {}, explored: {}, markers: [], journal: { story: ['OLD'], choices: [], talk: [] }, lead: 'THE STEWARD HOLDS THE HELM KEY', time: 0, deaths: 0 });
      localStorage.setItem('hollow-ark.save.v1', JSON.stringify(old));
    });
    await page.reload();
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    const up = await get(() => {
      const w = HA.debug.world;
      const out = { bailiff: w.state.wardens.bailiff, choiceFlag: w.state.flags.choice, scene: w.scene && w.scene.name, people: !!w.state.people, endings: Array.isArray(w.state.endingsSeen) };
      for (let i = 0; i < 600 && w.scene; i++) {
        HA.debug.skipScene();
        HA.debug.step(1);
      }
      out.goodbye = !!w.state.flags.goodbye;
      out.lead = w.state.lead;
      return out;
    });
    expect(up.bailiff === 'release' && up.choiceFlag === undefined && up.people && up.endings, `a Phase 2 save did not upgrade (${JSON.stringify(up)})`);
    expect(up.scene === 'goodbye' && up.goodbye, `a finished Phase 2 save should pick up with the night after the reunion (${JSON.stringify(up)})`);

    // ---- The five endings, each from the flags its path would set, played to the title and recorded ----
    const PATHS = {
      deserter: { takenHome: 11, people: { solder: null } },
      dominion: { mercy: -5, bloom: 0, wardens: { bailiff: 'salvage', pruner: 'salvage', tallyman: 'salvage' }, people: { solder: 'alive', steward: 'ended' } },
      overgrown: { mercy: 0, bloom: 9, people: { solder: 'dead', gardener: 'dosed' } },
      crash: { mercy: 2, bloom: 0, crew: 4, podsLaunched: 40, warrensRaid: 'fell', wardens: { bailiff: 'release', pruner: 'salvage', tallyman: 'release' }, people: { solder: 'alive' } },
      homecoming: { crew: 9, bloom: 1, mercy: 9, toldShim: 'truth', warrensRaid: 'held', wardens: { bailiff: 'release', pruner: 'release', tallyman: 'release' }, people: { solder: 'alive', navigator: 'stay', flux: 'home' } },
    };
    const WANT = {
      deserter: ['COUNT: HULLFOLK, 31.', 'I LEFT MARA IN 0418.', 'COUNT: SOLDER. NOT RECORDED.'],
      dominion: ['COUNT THEM.', 'THANK YOU.', 'THEY ARE SAFER ASLEEP.'],
      overgrown: ['OLD GASKET WALKED OUT OF THE HELM ALIVE.', 'ON 0418 FIRST.', 'THE GARDENER WENT INTO THE BLOOM SHE MADE.'],
      crash: ['COUNT: SURVIVORS, 5.', 'THE PODS CAME DOWN LIKE SEEDS.', 'THE FEW LEFT FROM THE WARRENS RODE THE LAST SLED.', 'COUNT: WARDENS, 2.'],
      homecoming: ['THE ONE IN 0417 STAYED WITH THE SHIP.', "HE CARRIED HIS MOTHER'S LANTERN.", 'MY NAME WAS USHER.', 'NOT ALONE.', 'FLUX FLEW HOME TO THE WARRENS, AND STAYED THERE.'],
    };
    for (const [id, path] of Object.entries(PATHS)) {
      if (!(await get(() => HA.ui.mode === 'play'))) {
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
      }
      const e = await get(
        ({ id, path, skip }) => {
          const w = HA.debug.world;
          const s = w.state;
          for (const [k, v] of Object.entries(path)) {
            if (v && typeof v === 'object') Object.assign(s[k], v);
            else s[k] = v;
          }
          const out = { branch: HA.endings.afterSteward(s), missing: HA.endings.missing(s).map((r) => r.id), lines: HA.endings.lines(id, s) };
          HA.debug.ending(id);
          // Read every card (or skip the whole ending from the pause menu), as a player would.
          for (let i = 0; i < 400 && HA.ui.mode === 'play'; i++) {
            if (skip) HA.debug.skipScene();
            HA.debug.step(22);
            if (HA.ui.mode === 'play') HA.debug.step(1, { confirm: true }); // on the title, Confirm would continue
          }
          out.title = HA.ui.mode === 'title';
          out.seen = HA.save.endings();
          return out;
        },
        { id, path, skip: id === 'overgrown' },
      );
      const lines = e.lines.join(' | ');
      for (const want of WANT[id]) expect(lines.includes(want), `the ${id} ending is missing "${want}" (${lines})`);
      if (id !== 'deserter') expect(e.branch === id, `the ${id} path led to ${e.branch} after the Steward (missing: ${e.missing})`);
      expect(e.title && e.seen.includes(id), `the ${id} ending did not finish at the title and get recorded (${JSON.stringify({ title: e.title, seen: e.seen })})`);
    }
    await shot('endings');
    const after = await get(() => {
      const shown = HA.ui.stack[0].endings.length;
      HA.ui.newGame();
      return { shown, kept: HA.debug.world.state.endingsSeen.length, stored: HA.save.endings().length, exists: HA.save.exists() };
    });
    expect(after.shown === 5 && after.kept === 5 && after.stored === 5 && !after.exists, `endings seen were not kept into a new game (${JSON.stringify(after)})`);

    problems.push(...errors.map((e) => 'error: ' + e));
    return { ok: problems.length === 0, moved: Math.round(moved), jump: Math.round(groundY - top), fired, problems };
  } catch (e) {
    return { ok: false, problems: problems.concat(String(e.message || e), errors) };
  } finally {
    await browser.close();
  }
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : ['chromium', 'firefox', 'webkit'];
  const server = await serve();
  const httpUrl = `http://127.0.0.1:${server.address().port}/index.html`;
  const fileUrl = pathToFileURL(path.join(GAME, 'index.html')).href;
  let failed = false;
  for (const name of names) {
    for (const [label, url] of [
      ['web', httpUrl],
      ['file', fileUrl],
    ]) {
      const r = await play(playwright[name], url, label);
      failed = failed || !r.ok;
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${process.platform} ${name} ${label}: ${JSON.stringify(r)}`);
    }
  }
  server.close();
  process.exit(failed ? 1 : 0);
})();
