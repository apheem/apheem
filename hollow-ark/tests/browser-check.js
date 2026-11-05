'use strict';
// Plays the browser build in Chromium, Firefox and WebKit (Safari's engine), both from a web server
// (like GitHub Pages) and straight from disk (like a downloaded folder). Exits non-zero on any failure.
// Each run plays by hand-held keys first (move, jump, fire), then runs the story so far quickly through the
// game's debug helpers: rooms, saving, the raid, the boss, the choice, the reunion and the night after it,
// and continuing a save, then the Hydroponic Gardens (a bulb, the empty racks and the taken found in the Nursery, the Pruner and its choice, the
// taken waking, Wick's fight and the Gardener's offer), the Warrens return (the lift home, telling Shim,
// the broadcast, the pistol, the night Solder leaves, his gate, the hatch to the sump), and the Cargo Labyrinth
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
      // The racks in the Root Cellar are empty: the Wardens hoisted the taken up to the Nursery, and ran the hoist up
      // after them, so it's shut from below (STORYBOARD.md, "The way into the Gardens").
      HA.debug.goto('root-cellar', 48, 18);
      HA.debug.step(5);
      out.berthScene = w().scene && w().scene.name;
      talkThrough();
      out.lead0 = s.lead;
      HA.debug.goto('root-cellar', 66, 18);
      HA.debug.step(5);
      HA.debug.step(2, { up: true });
      HA.debug.step(5);
      out.hoistShut = { toast: w().toastText, room: w().def.id, scene: !!w().scene };
      // Wick goes up with the hero (STORYBOARD.md, "Wick's longer escort"). Left on the Terraces' floor while the
      // hero climbs, she catches up out of sight; in the Irrigation Works she patches the hero up on the pod, opens
      // the cradles' air (it goes up, to the Nursery), and goes back down to wait by the hoist.
      const wk = () => w().npcs.find((n) => n.id === 'wick' && n.state === 'out');
      out.up = { wickUp: !!s.flags.wickUp, following: !!(wk() && wk().follow) };
      HA.debug.goto('terraces', 4, 41);
      HA.debug.step(10);
      const feet = (a) => Math.round((a.y + a.h) / 8);
      out.caught = { before: wk() && feet(wk()) };
      Object.assign(p, { x: 6 * 8, y: 15 * 8 - p.h, vx: 0, vy: 0, facing: -1 });
      HA.debug.step(90);
      Object.assign(out.caught, { after: wk() && feet(wk()), hero: feet(p) });
      HA.debug.goto('irrigation', 76, 14);
      p.hp = 3;
      HA.debug.step(5);
      out.patchScene = w().scene && w().scene.name;
      talkThrough();
      out.patched = { flag: !!s.flags.wickPatched, healed: p.hp === p.maxHp, gone: !wk(), story: s.journal.story.some((t) => /PATCHED ME UP/.test(t)), said: s.journal.talk.some((t) => /SOMEONE SMALL\. BADLY/.test(t.text)) };
      out.lead0b = s.lead;
      HA.debug.goto('root-cellar', 40, 18);
      HA.debug.step(5);
      out.backDown = !!(wk() && !wk().follow && Math.abs(wk().x - 62 * 8) < 16);
      // The Nursery, over the Spore Beds: the taken, found at last. The hero sends the hoist down, and Wick comes up
      // it to stay with them; the lead goes on to the Warden that holds the seals, in the room under it.
      HA.debug.goto('nursery', 62, 18);
      HA.debug.step(5);
      out.cradleScene = w().scene && w().scene.name;
      talkThrough();
      out.lead1 = s.lead;
      out.found = { hoist: !!s.flags.hoist, seen: !!s.flags.cradlesSeen, wick: !!(wk() && wk().kneel), story: s.journal.story.some((t) => /OLD NURSERY/.test(t)) };
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
      // Back up in the Nursery the cradles open; eleven wake and go home down the hoist; Wick is gone and her lantern
      // is on the floor.
      HA.debug.goto('nursery', 98, 18);
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
      // Sorrel (3.13): released, the Pruner cuts open the door it welded shut on her, and she runs. (The game was quit
      // before it got there, so that's settled on the way back in.) Her game, on the Old Greenhouse's glass.
      HA.debug.step(5);
      out.greenhouse = { flag: !!s.flags.greenhouse, door: (w().doors.find((d) => d.id === 'greenhouse') || {}).open };
      HA.debug.goto('greenhouse', 72, 18);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      out.greenhouse.glass = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      out.greenhouse.read = !!s.logs.sorrelGlass && s.journal.story.some((t) => /COUNT TO A HUNDRED AND COME FIND ME/.test(t));
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
      // The way to the vats (3.24): the Vat House's door is barred from inside, with Wick's bag by it; down the mash
      // hatch, along the Mash Floor (Wick humming down the pipes, then off the tune), and up the vat drain into her
      // fight, which shuts the drain until she falls.
      const mash = (out.mash = {});
      HA.debug.goto('vat-walk', 31, 18);
      HA.debug.step(20);
      mash.barred = w().scene && w().scene.name;
      mash.bag = w().scene && w().scene.step && w().scene.step.text;
      mash.shut = !w().doors.find((d) => d.id === 'vatBar').open;
      talkThrough();
      HA.debug.goto('vat-walk', 27, 18);
      HA.debug.step(3);
      mash.hatch = w().near && w().near.label;
      HA.debug.step(1, { down: true });
      talkThrough();
      HA.debug.step(5);
      mash.down = [w().def.id, Math.round((p.x + p.w / 2) / 8)].join(',');
      HA.debug.goto('mash-floor', 38, 18);
      HA.debug.step(30);
      mash.hum = w().scene && w().scene.name;
      talkThrough();
      HA.debug.goto('mash-floor', 58, 18);
      HA.debug.step(30);
      mash.sour = w().scene && w().scene.name;
      talkThrough();
      mash.layers = HA.music.layers;
      HA.debug.goto('mash-floor', 74, 18);
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      for (let i = 0; i < 300 && w().def.id === 'mash-floor'; i++) HA.debug.step(1);
      mash.up = [w().def.id, Math.round((p.x + p.w / 2) / 8)].join(',');
      // (the climb's own fade first, then her scene)
      for (let i = 0; i < 300 && !(w().scene && w().scene.name === 'vatHouse'); i++) HA.debug.step(1);
      mash.scene = w().scene && w().scene.name;
      const drain = () => w().links.find((l) => l.legend.to === 'mash-floor');
      talkThrough();
      mash.drainShut = !!drain() && !drain().legend.open(s) && !!(w().boss && w().boss.fighting); // shut while she fights
      out.vale = s.journal.talk.some((t) => /I AM HESTER VALE/.test(t.text)); // the Gardener names herself and makes her case
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
      // The quick way back (3.24): the drain opens again, and the bar lifts from the Vat House's side.
      talkThrough();
      mash.drainAfter = !!drain() && drain().legend.open(s);
      HA.debug.goto('vat-walk', 38, 18);
      HA.debug.step(20);
      mash.barLabel = w().near && w().near.label;
      HA.debug.step(1, { up: true });
      HA.debug.step(30);
      mash.barSaid = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      HA.debug.step(3);
      mash.lifted = !!s.flags.vatBar && w().doors.find((d) => d.id === 'vatBar').open;
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
    expect(gd.berthScene === 'berths' && gd.lead0 === 'FIND WHERE THE WARDENS TOOK THE TAKEN' && gd.hoistShut.room === 'root-cellar' && /HOIST/.test(gd.hoistShut.toast) && !gd.hoistShut.scene, `the empty racks, or the hoist shut from below, went wrong (${gd.berthScene}, ${gd.lead0}, ${JSON.stringify(gd.hoistShut)})`);
    expect(gd.lead0b === 'FIND THE NURSERY, OVER THE SPORE BEDS' && gd.cradleScene === 'nursery' && gd.lead1 === 'FIND THE WARDEN THAT HOLDS THE SEALS' && gd.found.hoist && gd.found.seen && gd.found.wick && gd.found.story, `the taken were not found in the Nursery, or Wick didn't come up the hoist (${gd.lead0b}, ${gd.cradleScene}, ${gd.lead1}, ${JSON.stringify(gd.found)})`);
    expect(gd.up.wickUp && gd.up.following && gd.caught.before === 42 && gd.caught.after === gd.caught.hero && gd.caught.hero === 15, `Wick didn't go up with the hero, or didn't catch up (${JSON.stringify(gd.up)}, ${JSON.stringify(gd.caught)})`);
    expect(gd.patchScene === 'wickPatch' && gd.patched.flag && gd.patched.healed && gd.patched.gone && gd.patched.story && gd.patched.said && gd.backDown, `Wick's sit-down in the Irrigation Works went wrong (${gd.patchScene}, ${JSON.stringify(gd.patched)}, back down ${gd.backDown})`);
    expect(gd.vale, `the Gardener did not name herself and make her case in the Vat House (${gd.vale})`);
    const mash = gd.mash;
    expect(mash.barred === 'vatBarred' && /WICK'S BAG/.test(mash.bag) && mash.shut && /CLIMB DOWN/.test(mash.hatch) && /^mash-floor,2[78]$/.test(mash.down), `the barred Vat House door, Wick's bag or the mash hatch went wrong (${JSON.stringify(mash)})`);
    expect(mash.hum === 'mashHum' && mash.sour === 'mashSour' && mash.layers === 2 && /^vat-house,3[45]$/.test(mash.up) && mash.scene === 'vatHouse' && mash.drainShut, `the Mash Floor, or the vat drain up into Wick's fight, went wrong (${JSON.stringify(mash)})`);
    expect(mash.drainAfter && /LIFT THE BAR/.test(mash.barLabel) && /CAME UP EASY/.test(mash.barSaid) && mash.lifted, `the bar was not lifted from the Vat House's side after Wick (${JSON.stringify(mash)})`);
    expect(gd.scatter && gd.grenade, 'the Scatter Launcher was not picked up, or threw no grenade');
    expect(gd.prunerFighting && gd.hallShut && gd.prunerChoice, `the Pruner fight and its choice did not play (${JSON.stringify(gd)})`);
    expect(gd.pruner === 'release' && /LAUNCHER/.test(gd.prunerLose) && gd.mercy === 0, `releasing the Pruner went wrong (${gd.pruner}, ${gd.prunerLose}, mercy ${gd.mercy})`);
    expect(gd.shortcut === 'terraces', `the Dome Stair's shutter did not open into the Terraces (${gd.shortcut})`);
    expect(gd.greenhouse.flag && gd.greenhouse.door && /COUNT TO A HUNDRED/.test(gd.greenhouse.glass) && gd.greenhouse.read, `the Old Greenhouse's door, or Sorrel's message, went wrong (${JSON.stringify(gd.greenhouse)})`);
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
      out.marrant = s.journal.talk.some((t) => /THIS IS IVO MARRANT/.test(t.text)); // the Steward names himself
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
      // Gasket's trust (story/gasket.js): his grief has had its say, so talking to him now he hangs up his wrench,
      // and the next time he shows Cleat's count on the wall.
      const px = p.x;
      const trust0 = HA.story.gasketTrust(s);
      out.wrench = talkTo('gasket');
      talkThrough();
      out.cleat = talkTo('gasket');
      talkThrough();
      out.trust = { before: trust0, after: HA.story.gasketTrust(s), journal: s.journal.story.some((t) => /HUNG UP THE WRENCH/.test(t)) && s.journal.story.some((t) => /CLEAT'S MARKS/.test(t)) };
      out.again = talkTo('gasket');
      talkThrough();
      p.x = px;
      HA.debug.step(2);
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
    expect(wr.griefScene === 'grief' && wr.broadcast && wr.lead2 === 'TALK TO SOLDER BEFORE HE GOES', `Gasket's grief and the broadcast did not play (${JSON.stringify(wr)})`);
    expect(wr.marrant, `the Steward did not name himself in his broadcast (${JSON.stringify(wr)})`);
    expect(wr.pistolScene === 'pistol' && /FALLS/.test(wr.pistolLose) && wr.gun.includes('repeater') && !wr.gun.includes('pistol') && wr.twin === 2, `the pistol did not become the Repeater (${JSON.stringify(wr)})`);
    expect(wr.night === 'solderLeaves' && wr.morning.newGate && wr.morning.hatch && wr.morning.planned && wr.morning.solderGone && wr.morning.lead === 'FOLLOW SOLDER DOWN THROUGH THE CARGO LABYRINTH', `the night Solder leaves did not play out (${JSON.stringify(wr.morning)})`);
    expect(wr.wrench === 'gasketWrench' && wr.cleat === 'gasketCleat' && wr.again !== 'gasketCleat' && wr.trust.after === wr.trust.before + 2 && wr.trust.journal, `Gasket's trust at home went wrong (${wr.wrench}, ${wr.cleat}, ${wr.again}, ${JSON.stringify(wr.trust)})`);
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
      // The Purser's Office door to the dock is bolted on the dock's side (3.12): the way in is the Muster, east of
      // the Armory, and its hatch down into the dock.
      at('pursers-office', 33, 18);
      out.bolt = { shut: !w().doors.find((d) => d.id === 'dockBolt').open };
      at('muster', 32, 18);
      out.bolt.hatch = w().links.some((l) => l.legend.to === 'lifeboat-dock');
      // The Lifeboat Dock: the deserter, shaking. Choice 6: let him fly home.
      at('lifeboat-dock', 3, 18);
      HA.debug.step(80, { right: true });
      out.deserter = w().scene && w().scene.name;
      talkThrough();
      out.deserterLose = choose(0);
      out.fluxFate = { flux: s.people.flux, coldOpen: !!s.flags.coldOpen, thruster: s.abilities.thruster, lead: s.lead };
      // The Purser drew his bolt in the scene: the office is the way back.
      out.bolt.purser = s.journal.talk.some((x) => /DRAWN THE BOLT/.test(x.text));
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
      // The aisle gate (the Watch Gallery, 3.10): shut, so the hero can't walk west to the Drain; its lever in the
      // watch room over the Drain opens it.
      at('long-aisle', 8, 18);
      HA.debug.step(80, { left: true });
      out.gate = { shut: w().def.id === 'long-aisle', ladder: w().links.some((l) => l.legend.to === 'watch-gallery') };
      at('watch-gallery', 4, 18);
      // Coming into the watch room, someone up in the pipes counts the hero through (story/watch.js).
      for (let i = 0; i < 30 && !w().scene; i++) HA.debug.step(1);
      out.gate.counted = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(1, { up: true });
      talkThrough();
      out.gate.flag = !!s.flags.aisleGate;
      at('long-aisle', 8, 18);
      HA.debug.step(80, { left: true });
      out.gate.through = w().def.id;
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
      out.bolt.open = w().doors.find((d) => d.id === 'dockBolt').open;
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
    expect(cl.bolt.shut && cl.bolt.hatch && cl.bolt.purser && cl.bolt.open, `the dock's bolt from the Purser's Office, or the Muster's hatch, went wrong (${JSON.stringify(cl.bolt)})`);
    expect(cl.deserter === 'deserter' && /BLOOMFIRE/.test(cl.deserterLose) && cl.fluxFate.flux === 'home' && cl.fluxFate.coldOpen && !cl.fluxFate.thruster && /COLD STORE/.test(cl.fluxFate.lead), `choice 6 went wrong (${JSON.stringify(cl)})`);
    expect(cl.boat === 'STAY/TAKE THE BOAT', `the Purser did not offer the boat (${cl.boat})`);
    expect(cl.ice && /READ/.test(cl.odellPrompt) && cl.odell.thruster === 'odell' && /TALLYMAN/.test(cl.odell.lead) && cl.odell.music === 'coldStore' && cl.coldLift === 'coolant-hall', `Odell, his pack or the cold lift went wrong (${JSON.stringify(cl)})`);
    expect(cl.tallyIntro === 'tallyIntro' && cl.fight.fighting && cl.fight.music === 'tallyman' && cl.fight.opened && cl.fight.struck === 40 && cl.fight.after === 'tallymanDefeated', `the Tallyman's fight went wrong (${JSON.stringify(cl.fight)})`);
    expect(/CHARGES HOLD 3/.test(cl.tallyLose) && cl.coreLose === 'WHAT IT KNOWS, FOR GOOD' && cl.tally.fate === 'release' && cl.tally.vault && cl.tally.said, `choice 8 went wrong (${JSON.stringify(cl.tally)}, ${cl.coreLose})`);
    expect(cl.charges === 3 && cl.wall && cl.aisle === 'long-aisle', `the Breach Charges did not open the cracked wall (${cl.charges}, ${cl.wall}, ${cl.aisle})`);
    expect(cl.gate.shut && cl.gate.ladder && cl.gate.counted === 'watchCount' && cl.gate.flag && cl.gate.through === 'drain', `the aisle gate and its lever in the Watch Gallery went wrong (${JSON.stringify(cl.gate)})`);
    expect(/BALLAST/.test(cl.toolbag) && cl.grate === 'ballast-intake', `the Drain went wrong (${cl.toolbag}, ${cl.grate})`);
    expect(/TRAVEL/.test(cl.podPrompt) && /warrens/.test(cl.travel) && cl.travelled === 'warrens' && cl.flux, `travel between pods, or Flux at home, went wrong (${JSON.stringify(cl)})`);
    expect(cl.boatLose.lose === 'EVERYONE ELSE, AND MARA' && /ENDS HERE/.test(cl.boatLose.note) && cl.ending.mode === 'title' && cl.ending.seen.includes('deserter'), `taking the boat did not play the Deserter ending to the title (${JSON.stringify(cl.ending)})`);
    await shot('labyrinth');

    // ---- The Flooded Ballast (Phase 3.4), from a save at the Drain's grate with the Labyrinth behind it ----
    await get(() => {
      const s = HA.save.newState();
      Object.assign(s.flags, { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, reunion: true, homeDone: true, goodbye: true, gardens: true, cradlesSeen: true, prunerDown: true, cradles: true, wickFought: true, wickDead: true, thornOffered: true, gardenerGone: true, homeAgain: true, broadcastHeard: true, pistolDone: true, pistolGiven: true, newGate: true, hatch: true, solderLeft: true, climbPlanned: true, lanternWith: 'shim', cargo: true, chalkStops: true, deserterMet: true, coldOpen: true, odell: true, odellPack: true, tallySeen: true, tallyDown: true, aisleWall: true, toolbag: true, greenhouse: true });
      s.logs.sorrelGlass = true;
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
      // The Pump Gallery's door from the Intake is wedged until Solder is found (3.12): the way to him is over the
      // Pump Heads and down his ladder.
      HA.debug.goto('ballast-intake', 33, 41);
      HA.debug.step(5);
      out.wedge = { shut: !w().doors.find((d) => d.id === 'wedge').open };
      HA.debug.goto('pump-heads', 36, 18);
      HA.debug.step(5);
      out.wedge.ladder = w().links.some((l) => l.legend.to === 'pump-gallery');
      // 1. Solder, with the motor: the toolbag back, the Foam Sprayer, and the walk begins.
      HA.debug.goto('pump-gallery', 4, 18);
      HA.debug.step(5);
      talkThrough();
      out.found = { foam: p.weapons.some((x) => x.id === 'foam'), back: !!s.flags.toolbagBack, walk: !!s.flags.solderWalk };
      out.wedge.open = !!HA.rooms.byId['ballast-intake'].legend.D.open(s);
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
      // The ladder at the workshop's far end goes up into Odell's Test Tank; the boots are at the end of its channel.
      HA.debug.goto('odell-workshop', 36, 18);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      HA.debug.step(40);
      out.tank = w().def.id;
      HA.debug.goto('test-tank', 77, 18);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.boots = s.abilities.boots;
      // Odell's drain beside the stand (0.3.23): the shortcut back, down to the workshop's ladder
      HA.debug.goto('test-tank', 75, 18);
      HA.debug.step(5);
      out.drain = w().near && w().near.label;
      HA.debug.step(1, { down: true });
      HA.debug.step(1);
      for (let i = 0; i < 200 && (w().scene || w().transition); i++) HA.debug.step(1);
      out.drainTo = [w().def.id, Math.round((p.x + p.w / 2) / 8)].join(',');
      // In the boots the hero sinks to the bottom of the Tank Farm's east tank.
      HA.debug.goto('tank-farm', 52, 41);
      HA.debug.step(5);
      HA.debug.step(1, { down: true, jump: true });
      HA.debug.step(200);
      out.sank = p.y > 55 * 8;
      // The Silt Mother: she waits until the hero is out over her water (from the door she can't be fought), then the
      // shutters come down over her gates. Her moves run, she's only hurt out of the water, she drains the tank (the
      // gantries go with the water), and she falls.
      HA.debug.goto('silt-tank', 4, 18);
      HA.debug.step(30);
      const shutters = () => w().doors.find((d) => d.id === 'shutters');
      out.atDoor = { fighting: !!(w().boss && w().boss.fighting), shut: !shutters().open };
      HA.debug.goto('silt-tank', 17, 8);
      HA.debug.step(5);
      talkThrough();
      HA.debug.step(2);
      const b = w().boss;
      out.fighting = b && b.fighting && HA.music.playing === 'siltMother' && !shutters().open;
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
      out.drained = b.phase === 2 && w().room.tile(40, 15) === HA.room.EMPTY && w().room.tile(17, 9) === HA.room.EMPTY;
      hurtWhenOut(0);
      out.defeated = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(30); // past the hit-stop of her last blow, which the skipped scene outran
      out.after = { down: !!s.flags.siltDown, raid: s.warrensRaid, withHer: !!s.flags.solderWith, solder: !!solder(), gates: w().doors.every((d) => d.open) };
      // Sorrel (3.13): at the bottom of the Settling Pools' sump, a hatch barred from below. The hero knows her game
      // (the glass), knocks, and she unbars it; she's at her pumps, counting. Bring her home.
      HA.debug.goto('settling-pools', 30, 43);
      HA.debug.step(30);
      const sump = w().links.find((l) => l.legend.to === 'dry-pumps');
      // On the finished path (lock 3b) the same hatch is rusted shut; before the glass is read, barred.
      const shutFor = (flags, logs) => sump && sump.legend.shut({ flags, logs });
      out.sorrel = { hatch: !!sump, rusted: shutFor({}, {}), barred: shutFor({ greenhouse: true }, {}) };
      HA.debug.step(1, { down: true });
      for (let i = 0; i < 3000 && w().def.id !== 'dry-pumps'; i++) HA.debug.step(1, { confirm: i % 4 === 0 });
      Object.assign(out.sorrel, { room: w().def.id, open: !!s.flags.sorrelOpen });
      HA.debug.step(5);
      talkThrough();
      out.sorrel.choice = w().scene && w().scene.step && w().scene.step.choice && w().scene.step.choice.options.map((o) => o.label).join('/');
      const mercy0 = s.mercy;
      if (out.sorrel.choice) choose(0);
      const her = HA.story.npcOf(w(), 'sorrel');
      Object.assign(out.sorrel, { fate: s.people.sorrel, mercy: s.mercy - mercy0, gone: !her || her.state === 'gone', story: s.journal.story.some((t) => /FOUR THOUSAND AND THIRTY-ONE/.test(t)) });
      // 3. The flood. The first time, the water is let catch him, and he's pulled back to the Valve Hall.
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
      // A fall in the flood comes back to the Valve Hall with Solder, not to the rest pod with the water still rising.
      for (let i = 0; i < 600 && !(w().scene && w().scene.name === 'flood'); i++) pace(i);
      talkThrough();
      HA.debug.step(20, { right: true });
      for (let i = 0; i < 300 && p.invuln > 0; i++) HA.debug.step(1);
      w().assist.invincible = false;
      w().hurtPlayer(p.hp, p.x + 20);
      for (let i = 0; i < 400 && (p.dead || w().transition); i++) HA.debug.step(1);
      w().assist.invincible = true;
      HA.debug.step(30);
      out.fell = { room: w().def.id, flooding: !!s.flags.flooding, solder: !!solder(), level: w().floodLevel === undefined };
      // Then up the culvert, keeping him close, to the hatch.
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
      // Every line of each option's confirm box stays inside it, and the box on the screen.
      out.boxes = (opts || []).map((o) => {
        const L = HA.scenes.confirmLayout(o.confirm);
        const inside = L.texts.every((t) => (t.center ? HA.font.measure(t.text) <= L.w - 12 : t.x + HA.font.measure(t.text) <= L.x + L.w - 6));
        return { lines: L.texts.length, inside, onScreen: L.y + L.h <= HA.VIEW_H };
      });
      const bloom = s.bloom;
      choose(1);
      out.choice = { solder: s.people.solder, by: s.flags.solderBy, bloom: s.bloom - bloom, room: w().def.id, flooded: !!s.flags.flooded, flooding: !!s.flags.flooding, charges: p.weapons.some((x) => x.id === 'charges') };
      // 5. The tram: the motor in, and the hero rides it home to the sump with Solder (story/tram.js). He starts
      // up on the platform by the terminal, and walks down its steps to the winch, not across the air.
      HA.debug.goto('tram-station', 33, 18);
      HA.debug.step(5);
      const sol = w().npcs.find((n) => n.id === 'solder');
      if (sol) Object.assign(sol, { x: 10 * 8, homeX: 10 * 8, y: 9 * 8 - sol.h, homeY: 9 * 8 - sol.h });
      HA.debug.step(1, { up: true });
      out.ride = [];
      // Wherever he walks, there's floor under his feet (or he's dropping a step to it); he gets in before the
      // hero; and the tram doesn't move while anyone is still talking.
      out.board = { floating: 0, atWinch: null, firstIn: null, talkingWhileGone: 0 };
      const R = HA.room;
      for (let i = 0; i < 6000 && w() && w().scene; i++) {
        if (w().card && w().card.pic && !out.ride.includes(w().card.card[0])) out.ride.push(w().card.card[0]);
        if (sol && sol.state === 'out' && w().def.id === 'tram-station') {
          const tx = Math.floor((sol.x + sol.w / 2) / 8);
          let drop = 0;
          while (drop < 6 && ![R.SOLID, R.ONEWAY, R.CRATE].includes(w().room.tile(tx, Math.floor((sol.y + sol.h) / 8) + drop))) drop++;
          if (drop > 2) out.board.floating++;
          if (out.board.atWinch === null && w().scene.step && w().scene.step.say === 'SOLDER' && /MOTOR GOES IN/.test(w().scene.step.text)) out.board.atWinch = { x: Math.round(sol.x / 8), feet: (sol.y + sol.h) / 8 };
        }
        if (out.board.firstIn === null && (w().tramRiders || 0) > 0) out.board.firstIn = p.hidden ? 'hero' : 'solder';
        if ((w().tramGo || 0) > 0 && w().scene && w().scene.step && w().scene.step.say !== undefined) out.board.talkingWhileGone++;
        HA.debug.step(1, { confirm: i % 4 === 0 });
      }
      const solderIn = () => w().npcs.some((n) => n.id === 'solder' && n.state === 'out');
      out.tram = { tram: !!s.flags.tram, west: !!s.flags.tramWest, room: w().def.id, lead: s.lead, solder: solderIn(), tramLink: w().links.some((l) => l.legend.tram) };
      // The ballast control log; and the way on east waits for the climbers now.
      HA.debug.goto('tram-station', 10, 8);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      out.log = w().scene && w().scene.step && w().scene.step.text;
      talkThrough();
      HA.debug.goto('tram-station', 36, 18);
      for (let i = 0; i < 90; i++) HA.debug.step(1, { right: true });
      out.held = { room: w().def.id, note: w().toastText };
      // Home: the gate held, with the pistol on it. The news, then the tram waits.
      HA.debug.goto('warrens', 40, 18);
      for (let i = 0; i < 6; i++) {
        HA.debug.step(40);
        talkThrough();
      }
      out.home = { raidSeen: !!s.flags.raidSeen, story: s.journal.story.some((t) => /GATE HELD/.test(t)), waits: !!s.flags.tramWaits, lead: s.lead, solder: solderIn(), sorrel: !!s.flags.sorrelHome && s.journal.story.some((t) => /LET BRINE FIND HER/.test(t)), sorrelOut: w().npcs.some((n) => n.id === 'sorrel' && n.state === 'out') };
      // Up at Mara's pod: a goodbye, once.
      HA.debug.goto('cryo-bay', 10, 18);
      HA.debug.step(5);
      const plate = w().logs.find((l) => l.id === 'mara');
      p.x = plate.x;
      p.y = plate.y + plate.h - p.h;
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      talkThrough();
      out.bye = { flag: !!s.flags.maraBye, story: s.journal.story.filter((t) => /BACK WITH THE KEY/.test(t)).length };
      // The sump: the climbers on the platform, and the tram east with them to the Spine Foot.
      HA.debug.goto('sump', 60, 18);
      HA.debug.step(5);
      const crew = w().npcs.filter((n) => n.state === 'out').length;
      const car = w().links.find((l) => l.legend.tram);
      out.sump = { crew, car: !!car, enemies: w().enemies.length };
      if (car) {
        p.x = car.x + 8;
        HA.debug.step(3);
        HA.debug.step(1, { up: true });
        talkThrough();
      }
      out.east = { climbs: HA.story.crewList(s).includes('sorrel'), room: w().def.id, east: !!s.flags.tramEast, lead: s.lead, crew: w().npcs.filter((n) => n.state === 'out').length, story: s.journal.story.some((t) => /RODE THE KEEL TRAM EAST/.test(t)) };
      return out;
    });
    expect(bl.into.room === 'ballast-intake' && bl.into.area === 'FLOODED BALLAST' && bl.into.music === 'ballast' && /SOLDER/.test(bl.into.lead), `the Drain's grate did not lead into the Ballast (${JSON.stringify(bl.into)})`);
    expect(bl.wedge.shut && bl.wedge.ladder && bl.wedge.open, `the Pump Gallery's wedged door, or the way round over the Pump Heads, went wrong (${JSON.stringify(bl.wedge)})`);
    expect(bl.found.foam && bl.found.back && bl.found.walk && bl.walk.barks >= 6 && bl.walk.door === 'workshopDoor', `finding Solder, or the walk, went wrong (${JSON.stringify(bl.found)}, ${JSON.stringify(bl.walk)})`);
    expect(bl.foam && bl.thrown && bl.tank === 'test-tank' && bl.boots && bl.sank, `the Foam Sprayer, the silt, the Test Tank or the boots went wrong (${bl.foam}, ${bl.thrown}, ${bl.tank}, ${bl.boots}, ${bl.sank})`);
    expect(bl.drain === '{down} CLIMB DOWN' && /^odell-workshop,3[67]$/.test(bl.drainTo), `Odell's drain, the shortcut back from the boots, went wrong (${bl.drain}, ${bl.drainTo})`);
    expect(!bl.atDoor.fighting && !bl.atDoor.shut, `the Silt Mother's fight started from the door, or her shutters were already down (${JSON.stringify(bl.atDoor)})`);
    expect(bl.fell.room === 'valve-hall' && !bl.fell.flooding && bl.fell.solder && bl.fell.level, `a fall in the flood did not come back to the Valve Hall with Solder (${JSON.stringify(bl.fell)})`);
    expect(bl.fighting && /bite/.test(bl.states) && /lash/.test(bl.states) && /spit/.test(bl.states) && bl.underwater && bl.drained && bl.defeated === 'siltMotherDefeated', `the Silt Mother's fight went wrong (${JSON.stringify(bl)})`);
    expect(bl.after.down && bl.after.raid === 'held' && bl.after.withHer && bl.after.solder && bl.after.gates, `after the Silt Mother, Solder or the raid went wrong (${JSON.stringify(bl.after)})`);
    expect(/RUSTED SHUT/.test(bl.sorrel.rusted) && bl.sorrel.barred === 'BARRED FROM BELOW.' && bl.sorrel.hatch && bl.sorrel.room === 'dry-pumps' && bl.sorrel.open && bl.sorrel.choice === 'BRING HER HOME/LEAVE HER COUNTING' && bl.sorrel.fate === 'home' && bl.sorrel.mercy === 1 && bl.sorrel.gone && bl.sorrel.story, `finding Sorrel under the Settling Pools went wrong (${JSON.stringify(bl.sorrel)})`);
    expect(bl.flood.flooding && bl.flood.music === 'flood' && /hallWest- culvert\+/.test(bl.flood.doors) && bl.failed === 'floodFail' && bl.retry.room === 'valve-hall' && !bl.retry.flooding && bl.retry.solder, `the flood, or its retry, went wrong (${JSON.stringify(bl.flood)}, ${bl.failed}, ${JSON.stringify(bl.retry)})`);
    expect(bl.culvert.rooms === 'valve-hall/long-culvert/jammed-hatch' && bl.culvert.under === 0 && bl.culvert.scene === 'jammed', `the escape up the culvert went wrong (${JSON.stringify(bl.culvert)})`);
    expect(bl.nine === 'BLOW THE BEAM/EAT THE BLOOM ON THE HATCH/LEAVE HIM' && /BLOOM GROWS/.test(bl.bloomLose) && bl.choice.solder === 'alive' && bl.choice.by === 'bloom' && bl.choice.bloom === 2 && bl.choice.room === 'tram-station' && bl.choice.flooded && !bl.choice.flooding && bl.choice.charges, `choice 9 went wrong (${JSON.stringify(bl.choice)})`);
    expect(bl.tram.tram && bl.tram.west && bl.tram.room === 'sump' && /VILLAGE/.test(bl.tram.lead) && bl.tram.solder && !bl.tram.tramLink && bl.ride.length === 2 && /WEST/.test(bl.ride[0]) && /NAVIGATOR AUTHORITY/.test(bl.log), `the tram home, or the valves log, went wrong (${JSON.stringify(bl.tram)}, ${JSON.stringify(bl.ride)}, ${bl.log})`);
    expect(bl.boxes.length === 3 && bl.boxes.every((b) => b.inside && b.onScreen) && bl.boxes[0].lines > 6, `a confirm box for choice 9 spills out (${JSON.stringify(bl.boxes)})`);
    expect(bl.board.floating === 0 && bl.board.atWinch && bl.board.atWinch.feet === 19 && bl.board.firstIn === 'solder' && bl.board.talkingWhileGone === 0, `Solder walked across the air, didn't get in first, or the tram left while he was talking (${JSON.stringify(bl.board)})`);
    expect(bl.held.room === 'tram-station' && /NOT WITHOUT THE CLIMBERS/.test(bl.held.note), `the way east didn't wait for the climbers (${JSON.stringify(bl.held)})`);
    expect(bl.home.raidSeen && bl.home.story && bl.home.waits && /TRAM/.test(bl.home.lead) && !bl.home.solder, `home after the raid went wrong (${JSON.stringify(bl.home)})`);
    expect(bl.home.sorrel && bl.home.sorrelOut && bl.east.climbs, `Sorrel home, found by Brine, and climbing with them went wrong (${JSON.stringify(bl.home)}, climbs ${bl.east.climbs})`);
    expect(bl.bye.flag && bl.bye.story === 1, `the goodbye at Mara's pod went wrong (${JSON.stringify(bl.bye)})`);
    expect(bl.sump.car && bl.sump.crew >= 4 && bl.sump.enemies === 0 && bl.east.room === 'spine-foot' && bl.east.east && /BUILD BEHIND YOU/.test(bl.east.lead) && bl.east.crew >= 3 && bl.east.story, `the tram east with the climbers went wrong (${JSON.stringify(bl.sump)}, ${JSON.stringify(bl.east)})`);
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
      // Every line said until the next choice (or the scene's end), confirming as a player would.
      const listen = () => {
        const said = [];
        for (let i = 0; i < 8000 && w() && w().scene && !(w().scene.step && w().scene.step.choice); i++) {
          const st = w().scene.step;
          if (st && st.say !== undefined && said[said.length - 1] !== st.text) said.push(st.text);
          HA.debug.step(1, { confirm: i % 3 === 0 });
        }
        return said;
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
      // The shaft under the Piston Landing is plated over (the third batch of new rooms), so the way up is round
      // through the Stokers' Bunks: the plate shut, the bunks and the humming, and Abel's count on the last bunk.
      HA.debug.goto('piston-run', 33, 15);
      HA.debug.step(5);
      out.plate = { shut: !w().doors.find((d) => d.id === 'stokersPlate').open, thought: listen().join(' ') };
      HA.debug.goto('stokers-bunks', 5, 15);
      HA.debug.step(40);
      out.plate.bunks = listen().join(' ');
      HA.debug.goto('stokers-bunks', 63, 18);
      HA.debug.step(3);
      out.plate.prompt = w().near && w().near.label;
      press('up');
      out.plate.count = listen().join(' ');
      out.plate.read = !!s.logs.abelCount;
      // The Piston Landing: the second lift (seven of them is hands enough), then the plate's bolt.
      HA.debug.goto('piston-run', 24, 8); // come out of the bunks onto the landing, east of the plate's bolt
      HA.debug.step(30);
      out.landing2 = w().scene && w().scene.name;
      talkThrough();
      out.lift2 = s.flags.lifts;
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.plate.bolt = w().scene && w().scene.name;
      out.plate.drawn = listen().join(' ');
      out.plate.open = w().doors.find((d) => d.id === 'stokersPlate').open;
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
      out.abelSaid = listen().join(' ');
      HA.debug.step(2); // let go of Confirm: a choice answers to a fresh press
      out.ten = (options() || []).map((o) => o.label).join('/');
      const mercy = s.mercy;
      choose(0);
      HA.debug.step(60);
      out.abel = { fate: s.people.abel, mercy: s.mercy - mercy, open: w().doors.find((d) => d.id === 'throatShutter').open, floor: w().room.tile(b.grates[0].x0, 19) === HA.room.SOLID };
      // The ship's page for Pod 1130 follows choice 10 (story/pod1130.js).
      out.paged = !!s.flags.pod1130Alarm && s.journal.story.some((l) => /POD 1130/.test(l));
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
      // Gasket has come to trust the hero by now (story/gasket.js): the wrench, Cleat's count, and Flux home.
      Object.assign(s.flags, { gasketWrench: true, gasketCleat: true });
      p.x = w().pods[0].x + 4;
      HA.debug.step(3);
      press('up');
      HA.debug.step(3);
      out.night = w().scene && w().scene.name;
      talkThrough();
      out.call = (options() || []).map((o) => o.label).join('/');
      out.shim = !!s.flags.shimRanOff;
      out.sky = { trust: HA.story.gasketTrust(s), said: s.journal.talk.some((t) => /NEVER SEEN A SKY/.test(t.text)) };
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
    const pl = sp.plate;
    expect(pl.shut && /PLATED OVER/.test(pl.thought) && /STOKERS/.test(pl.thought) && /HUMMING/.test(pl.bunks) && /HUM IT IN THE WARRENS/.test(pl.bunks) && pl.prompt === '{up} LOOK AT THE BUNK' && /A COUNT IN FIVES/.test(pl.count) && pl.read && pl.bolt === 'plateBolt' && /DREW THE BOLT/.test(pl.drawn) && pl.open, `the plated shaft, or the way round through the Stokers' Bunks, went wrong (${JSON.stringify(pl)})`);
    expect(sp.throat.room === 'reactor-throat' && sp.throat.fighting && sp.throat.music === 'abel' && !sp.throat.shut, `Abel's fight did not start with the shutter shut (${JSON.stringify(sp.throat)})`);
    expect(/throw/.test(sp.states) && /blow/.test(sp.states) && sp.fire && sp.barred && sp.phase === 2 && sp.grates && sp.burnt, `Abel's moves went wrong (${JSON.stringify(sp)})`);
    expect(/CUT INTO THE LAST BUNK/.test(sp.abelSaid), `Abel's name did not bring back his count on the last bunk (${sp.abelSaid})`);
    expect(sp.defeated === 'abelDefeated' && sp.ten === 'LEAVE HIM HIS FIRES/PUT THE FIRES OUT OF HIM' && sp.abel.fate === 'spared' && sp.abel.mercy === 1 && sp.abel.open && sp.abel.floor && sp.paged, `choice 10, or the page for Pod 1130 after it, went wrong (${sp.defeated}, ${sp.ten}, ${JSON.stringify(sp.abel)}, ${sp.paged})`);
    expect(sp.camp.room === 'crew-camp' && sp.camp.crew === 8 && sp.camp.lifts === 3 && sp.camp.people === 8 && sp.camp.music === 'camp', `the climbers did not reach the camp (${JSON.stringify(sp.camp)})`);
    expect(sp.sky.said === sp.sky.trust >= 3 && sp.sky.trust >= 3, `Gasket's sky at the camp went wrong (${JSON.stringify(sp.sky)})`);
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
        Object.assign(s.flags, { woke: true, metHullfolk: true, night: true, raid: true, raidDone: true, bossDefeated: true, reunion: true, homeDone: true, goodbye: true, gardens: true, cradlesSeen: true, prunerDown: true, cradles: true, wickFought: true, wickDead: true, thornOffered: true, gardenerGone: true, homeAgain: true, broadcastHeard: true, pistolDone: true, pistolGiven: true, newGate: true, hatch: true, solderLeft: true, climbPlanned: true, lanternWith: 'shim', cargo: true, chalkStops: true, deserterMet: true, deserterOffered: true, coldOpen: true, odell: true, odellPack: true, tallySeen: true, tallyDown: true, aisleWall: true, toolbag: true, ballast: true, solderFound: true, toolbagBack: true, siltSeen: true, siltDown: true, floodSeen: true, flooded: true, hatchOpen: true, tram: true, raidSeen: true, intercom: true, spine: true, crewCame: true, lifts: 2, liftTwoSeen: true, abelSeen: true, abelDown: true, camp: true, lightsOut: true, shimRanOff: true, purserGone: true, campDone: true, verdict: true, condenser: true, guardBolt: true });
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
            // Skipping passes everything but the results cards, which wait for a press.
            for (let i = 0; i < 12000 && w() && !w().exitToTitle && HA.ui.mode === 'play'; i++) {
              HA.debug.skipScene();
              HA.debug.step(1, i % 60 === 59 ? { confirm: true } : undefined);
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
      // The night watch (story/gasket.js): the far end of the Barracks wakes them, and they go for Old Gasket by the
      // lift. He holds them off with his wrench until the hero is back with him.
      w().assist.invincible = true;
      HA.debug.goto('barracks', 62, 18);
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.watch = { scene: w().scene && w().scene.name, said: listen().join(' | ') };
      out.watch.hold = w().gasketHold && w().gasketHold.state;
      let back = 0;
      for (; back < 600 && w().gasketHold && w().gasketHold.state === 'holding'; back++) HA.debug.step(1, { left: true, jump: back % 30 < 12 });
      Object.assign(out.watch, { back, flag: s.flags.gasketBarracks });
      for (const e of w().enemies.filter((e) => e.nightWatch)) HA.actors.hurtEnemy(w(), e, 99, e.facing);
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1);
      out.watch.held = w().scene && w().scene.name;
      out.watch.thanks = listen().join(' | ');
      out.watch.alive = s.people.gasket;
      w().assist.invincible = false;
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
      // The Bridge Stair is shut above (the third batch of new rooms), so the way up is round through the Steward's
      // Rooms: the shutter, his voice, his daybook, the boots under glass, and the shutter's bolt from the landing.
      HA.debug.goto('bridge-stair', 28, 20);
      HA.debug.step(5);
      out.shutter = { shut: !w().doors.find((d) => d.id === 'stewardShutter').open, thought: listen().join(' ') };
      HA.debug.goto('steward-rooms', 5, 20);
      HA.debug.step(40);
      out.shutter.rooms = listen().join(' | ');
      HA.debug.goto('steward-rooms', 36, 20);
      HA.debug.step(3);
      press('up');
      out.shutter.daybook = listen().join(' ');
      HA.debug.goto('steward-rooms', 50, 8);
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.shutter.boots = listen().join(' ');
      HA.debug.goto('bridge-stair', 30, 8);
      HA.debug.step(3);
      out.shutter.under = !w().doors.find((d) => d.id === 'stewardShutter').open;
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.shutter.bolt = w().scene && w().scene.name;
      out.shutter.drawn = listen().join(' | ');
      out.shutter.open = w().doors.find((d) => d.id === 'stewardShutter').open;
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
      out.man = { phase: b2.phase, states: [...states].join(','), sight };
      // A quarter of the way into the man, Old Gasket goes for him over his brother's boots (story/gasket.js); the
      // sidearm turns on the old man, and the hero gets to him first.
      b2.rolling = false;
      HA.bosses.steward.hurt(w(), b2, 35, 1);
      for (let i = 0; i < 30 && !w().scene; i++) HA.debug.step(1);
      out.charge = { scene: w().scene && w().scene.name, said: listen().join(' | ') };
      out.charge.aimed = !!b2.hostage && !!b2.sight;
      const old = w().npcs.find((n) => n.id === 'gasket');
      p.x = old.x + 20;
      p.y = old.y + old.h - p.h;
      for (let i = 0; i < 200 && b2.hostage; i++) HA.debug.step(1, { left: true });
      Object.assign(out.charge, { flag: s.flags.gasketHelm, alive: s.people.gasket, bark: w().barks.map((k) => k.text).join(' | ') });
      w().assist.invincible = false;
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
      // The ship coming apart: the hall's floor has given way over the coolant, girders stand up out of it, and fires burn.
      const door = (id) => w().doors.find((d) => d.id === id);
      out.wreck = { floor: door('runFloor') && door('runFloor').open, girders: door('runGirders') && !door('runGirders').open, fires: w().hazards.filter((h) => h.kind === 'fire').length };
      // A piece comes down every 80 frames, aimed at a random spot beside the hero, and none falls if that spot is a
      // wall or under a low ceiling; so give it time for several tries, not two or three.
      let debris = false;
      for (let i = 0; i < 1200 && !debris; i++) {
        HA.debug.step(1, { left: i % 60 < 30 });
        debris = w().hazards.some((h) => h.kind === 'debris');
      }
      out.debris = debris;
      // Home is no refuge while the clock runs: the run's music keeps playing in the Warrens.
      HA.debug.goto('warrens', 40, 18);
      HA.debug.step(10);
      out.warrensMusic = HA.music.playing;
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
    const wa = tw.watch;
    expect(wa.scene === 'guardWake' && /NIGHT WATCH/.test(wa.said) && /BEHIND ME/.test(wa.said) && wa.hold === 'holding' && wa.flag === 'held' && wa.back < 480 && wa.held === 'gasketHeld' && /TOOK YOUR TIME/.test(wa.thanks) && wa.alive === null, `the night watch in the Barracks went wrong (${JSON.stringify(wa)})`);
    expect(tw.dome.scene === 'domeView' && tw.dome.music === null && /NO LIGHTS/.test(tw.dome.said), `the Dome's view went wrong (${JSON.stringify(tw.dome)})`);
    expect(tw.shimScene === 'shimDome' && /WHERE IS MY MOTHER/.test(tw.shimSaid) && tw.fourB === 'TELL HIM THE TRUTH/KEEP LYING' && tw.lied.knows === false && tw.lied.mercy === -1 && tw.lied.follow, `choice 4b went wrong (${tw.shimScene}, ${tw.fourB}, ${JSON.stringify(tw.lied)})`);
    expect(/YOU ARE STILL HERE/.test(tw.nav) && tw.navSpoke, `the Navigator did not speak in the Dome (${tw.nav})`);
    expect(tw.gallery.room === 'garden-gallery' && tw.gallery.shim && tw.gallery.gardener && tw.gardenerScene === 'gardener', `the Garden Gallery went wrong (${JSON.stringify(tw.gallery)}, ${tw.gardenerScene})`);
    expect(/KEEP WICK'S LANCETS/.test(tw.thorn) && /ASKED VERY GOOD QUESTIONS/.test(tw.toShim) && tw.eleven === 'SPARE HER/MAKE HER TAKE HER OWN DOSE/WALK PAST', `the Gardener's offer or choice 11 went wrong (${tw.thorn}, ${tw.eleven}, ${tw.toShim})`);
    expect(tw.gardener.fate === 'spared' && tw.gardener.mercy === 1 && tw.gardener.shimWith && /BRIDGE STAIR/.test(tw.gardener.lead), `choice 11 did not spare the Gardener (${JSON.stringify(tw.gardener)})`);
    expect(tw.podPrompt === '{up} REST' && tw.helm === 'helm', `the Bridge Stair's pod or ladder went wrong (${tw.podPrompt}, ${tw.helm})`);
    const sh = tw.shutter;
    expect(sh.shut && /SHUT ABOVE ME/.test(sh.thought) && /PRIVATE/.test(sh.thought) && /YOU'RE IN MY ROOMS/.test(sh.rooms) && /LOCKUP'S INTERCOM/.test(sh.rooms) && /NOT YET FOR TWENTY YEARS/.test(sh.daybook) && /OLD BOOTS ON A STAND/.test(sh.boots) && sh.under && sh.bolt === 'shutterBolt' && /DREW THE BOLT/.test(sh.drawn) && /FORTY-TWO YEARS/.test(sh.drawn) && sh.open, `the Bridge Stair's shutter, or the way round through the Steward's Rooms, went wrong (${JSON.stringify(sh)})`);
    expect(/DEAD MAN'S BOOTS/.test(tw.speech) && /THOSE WERE HIS BOOTS/.test(tw.speech) && /TELL ME AGAIN WHO THE MONSTER IS/.test(tw.speech) && /THE BOOTS UNDER GLASS/.test(tw.speech), `the Steward's speech went wrong (${tw.speech})`);
    expect(tw.fight.fighting && tw.fight.music === 'steward' && tw.fight.check === 'helm' && tw.fight.crew >= 6 && tw.field && tw.ordered && tw.gate, `the Steward's first phase went wrong (${JSON.stringify(tw.fight)}, field ${tw.field}, turrets ${tw.ordered}, gates ${tw.gate})`);
    expect(tw.fall.room === 'helm' && /CHECKPOINT/.test(tw.fall.toast) && tw.fall.scene === 'stewardIntro' && /AGAIN, THEN/.test(tw.again) && !/BOOTS/.test(tw.again) && tw.refight, `a fall in the Steward's fight did not come back to its checkpoint (${JSON.stringify(tw.fall)}, ${tw.again}, ${tw.refight})`);
    expect(tw.guardScene === 'stewardGuard' && /MEASURE: FULL/.test(tw.guardSaid) && tw.guards === 3 && /DO IT MYSELF/.test(tw.manSaid), `the Steward's guard went wrong (${tw.guardScene}, ${tw.guardSaid}, ${tw.guards}, ${tw.manSaid})`);
    expect(tw.man.phase === 3 && /aim/.test(tw.man.states) && /crouch/.test(tw.man.states) && /run/.test(tw.man.states) && tw.man.sight, `the Steward's last phase went wrong (${JSON.stringify(tw.man)})`);
    const ch = tw.charge;
    expect(ch.scene === 'gasketCharge' && /MY BROTHER'S BOOTS/.test(ch.said) && /SIT DOWN, OLD MAN/.test(ch.said) && ch.aimed && ch.flag === 'held' && ch.alive === null && /FINE|GOING/.test(ch.bark), `Gasket's charge at the Helm went wrong (${JSON.stringify(ch)})`);
    expect(tw.defeated === 'stewardDefeated' && /AFRAID OF NOTHING/.test(tw.beaten) && tw.twelve === "SPARE HIM/END HIM/LEAVE HIM TO THE WARDENS' COUNT", `the Steward's defeat or choice 12 went wrong (${tw.defeated}, ${tw.twelve})`);
    expect(tw.steward.fate === 'spared' && tw.steward.mercy === 1 && tw.steward.key === 'broken' && /NOT YET/.test(tw.after) && /SLEDS/.test(tw.after), `choice 12 or the Key breaking went wrong (${JSON.stringify(tw.steward)}, ${tw.after})`);
    expect(tw.run.room === 'sump' && tw.run.running && tw.run.scuttle && tw.run.left === 160 && tw.run.music === 'scuttle' && tw.run.check === 'sump' && /SLEDS/.test(tw.run.lead) && tw.run.alarm, `the run for the sleds did not start (${JSON.stringify(tw.run)})`);
    expect(tw.podOff && tw.wardens === 0 && tw.debris, `the scuttle's ship went wrong (pods off ${tw.podOff}, wardens ${tw.wardens}, debris ${tw.debris})`);
    expect(tw.wreck.floor && tw.wreck.girders && tw.wreck.fires >= 2, `the Coolant Hall didn't come apart in the run (${JSON.stringify(tw.wreck)})`);
    expect(tw.warrensMusic === 'scuttle', `the run's music changed in the Warrens (${tw.warrensMusic})`);
    expect(tw.failScene === 'runFail' && tw.retry.room === 'sump' && tw.retry.left === 160, `running out of time did not start the run again (${tw.failScene}, ${JSON.stringify(tw.retry)})`);
    expect(/LAUNCH THE PODS/.test(tw.consolePrompt) && tw.launchAsk === 'LAUNCH THE PODS/KEEP RUNNING' && tw.launch.cost === 30 && tw.launch.pods > 0, `the pod launch went wrong (${tw.consolePrompt}, ${tw.launchAsk}, ${JSON.stringify(tw.launch)})`);
    expect(/CLAMPS WERE EMPTY/.test(tw.mara) && tw.sleds === 'sledsAway' && tw.title === 'title' && tw.ending === 'crash', `the sleds and the Crash ending went wrong (${tw.mara}, ${tw.sleds}, ${tw.title}, ${tw.ending})`);

    // Old Gasket lost (story/gasket.js). In the Barracks, walked out on: he's where he fell when the hero comes back,
    // and the crew say what he asked; the Helm without him (the boots are the hero's to know, the Key counts one
    // fewer), and the run for the sleds opened by whoever speaks for the crew now. Then, on another save, shot at the
    // Helm because the hero kept fighting.
    const said = () =>
      get(() => {
        const w = HA.debug.world;
        const out = [];
        for (let i = 0; i < 8000 && w.scene && !(w.scene.step && w.scene.step.choice); i++) {
          const st = w.scene.step;
          const line = st && st.say !== undefined ? (st.say ? st.say + ': ' : '') + st.text : null;
          if (line && out[out.length - 1] !== line) out.push(line);
          HA.debug.step(1, { confirm: i % 3 === 0 });
        }
        return out.join(' | ');
      });
    await towerSave({ people: { solder: 'dead' }, flags: { gasketSky: true } });
    await startSaved();
    const gl = await get(() => {
      const { w, talkThrough, listen, press } = window.tw;
      const out = {};
      const s = w().state;
      HA.debug.goto('tower-lift', 14, 18);
      HA.debug.step(3);
      press('up');
      talkThrough();
      w().assist.invincible = true;
      HA.debug.goto('barracks', 62, 18);
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { right: true });
      listen();
      for (let i = 0; i < 600 && w().def.id === 'barracks'; i++) HA.debug.step(1, { right: true });
      HA.debug.step(3);
      talkThrough();
      out.left = { room: w().def.id, gasket: s.people.gasket, flag: s.flags.gasketBarracks, kept: s.journal.story.some((t) => /I KEPT GOING/.test(t)) };
      HA.debug.goto('barracks', 34, 18);
      HA.debug.step(3);
      out.body = w().npcs.some((n) => n.id === 'gasket' && n.lying);
      for (let i = 0; i < 300 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.late = { scene: w().scene && w().scene.name, said: listen().join(' | ') };
      out.late.gone = (w().npcs.find((n) => n.id === 'gasket') || {}).state;
      out.trigger = HA.rooms.byId.barracks.triggers[0].when(s);
      s.flags.stewardShutter = true;
      HA.debug.goto('bridge-stair', 5, 8);
      HA.debug.step(3);
      press('up');
      talkThrough();
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.speech = listen().join(' | ');
      out.crew = w().npcs.filter((n) => n.state === 'out').map((n) => n.id);
      const b = w().boss;
      for (const r of b.relays) HA.bosses.relay.hurt(w(), r, 50);
      HA.debug.step(2);
      talkThrough();
      for (const g of b.guards) {
        g.hp = 1;
        HA.actors.hurtEnemy(w(), g, 5, 1);
      }
      HA.debug.step(12);
      talkThrough();
      b.rolling = false;
      HA.bosses.steward.hurt(w(), b, 35, 1);
      HA.debug.step(30);
      out.noCharge = !w().scene && !b.hostage;
      b.manHp = 1;
      HA.bosses.steward.hurt(w(), b, 5, 1);
      HA.debug.step(20);
      listen();
      window.tw.choose(0);
      return out;
    });
    const glRun = await said();
    expect(gl.left.room === 'observation-dome' && gl.left.gasket === 'dead' && gl.left.flag === 'lost' && gl.left.kept && gl.body, `walking out on Gasket in the Barracks went wrong (${JSON.stringify(gl.left)}, body ${gl.body})`);
    expect(gl.late.scene === 'gasketLast' && /ASKED WHERE YOU WERE/.test(gl.late.said) && /TELL THEM HE WANTED TO/.test(gl.late.said) && gl.late.gone === 'gone' && !gl.trigger, `coming back to Gasket in the Barracks went wrong (${JSON.stringify(gl.late)}, trigger ${gl.trigger})`);
    expect(!/THOSE WERE HIS BOOTS/.test(gl.speech) && /CLEAT'S BOOTS/.test(gl.speech) && /COUNT: 6\./.test(gl.speech) && !gl.crew.includes('gasket') && gl.noCharge, `the Helm without Gasket went wrong (${gl.speech}, ${gl.crew}, charge ${!gl.noCharge})`);
    expect(!/OLD GASKET:/.test(glRun) && /FLUX: THE SLEDS!/.test(glRun) && /FLUX: TAMP'S TAKEN THE VILLAGE/.test(glRun), `the run for the sleds without Gasket went wrong (${glRun})`);
    await towerSave({ flags: { towerUp: true, guardWoke: true, gasketBarracks: 'held', domeSeen: true, navSpoke: true, helmSeen: true, stewardShutter: true }, room: 'bridge-stair', x: 5 * 8, y: 9 * 8 - 14 });
    await startSaved();
    const gs = await get(() => {
      const { w, talkThrough, listen, press, choose } = window.tw;
      const out = {};
      const s = w().state;
      HA.debug.goto('bridge-stair', 5, 8);
      HA.debug.step(3);
      press('up');
      talkThrough();
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1, { right: true });
      talkThrough();
      const b = w().boss;
      for (const r of b.relays) HA.bosses.relay.hurt(w(), r, 50);
      HA.debug.step(2);
      talkThrough();
      for (const g of b.guards) {
        g.hp = 1;
        HA.actors.hurtEnemy(w(), g, 5, 1);
      }
      HA.debug.step(12);
      talkThrough();
      w().assist.invincible = true;
      b.rolling = false;
      HA.bosses.steward.hurt(w(), b, 35, 1);
      for (let i = 0; i < 30 && !w().scene; i++) HA.debug.step(1);
      talkThrough();
      // the hero keeps fighting, far from him
      w().player.x = 70 * 8;
      let f = 0;
      for (; f < 400 && !w().scene; f++) HA.debug.step(1);
      out.frames = f;
      out.scene = w().scene && w().scene.name;
      out.said = listen().join(' | ');
      out.lying = w().npcs.some((n) => n.id === 'gasket' && n.lying);
      Object.assign(out, { gasket: s.people.gasket, flag: s.flags.gasketHelm, saved: JSON.parse(localStorage.getItem('hollow-ark.save.v1')).people.gasket });
      b.manHp = 1;
      b.rolling = false;
      HA.bosses.steward.hurt(w(), b, 5, 1);
      HA.debug.step(20);
      out.beaten = listen().join(' | ');
      choose(1);
      out.ended = listen().join(' | ');
      w().assist.invincible = false;
      return out;
    });
    expect(gs.scene === 'gasketShot' && gs.frames >= 290 && /I TOLD HIM TO SIT DOWN/.test(gs.said) && gs.lying && gs.gasket === 'dead' && gs.flag === 'lost' && gs.saved === 'dead', `Gasket shot at the Helm went wrong (${JSON.stringify(gs)})`);
    expect(/KNEELING BY GASKET/.test(gs.beaten) && /TO BURY WITH GASKET/.test(gs.ended), `the Steward's end after Gasket went wrong (${gs.beaten} / ${gs.ended})`);
    // The endings with Gasket lost: his cards, one fewer of the Warrens, one fewer pair of hands for Lift B's brake,
    // and whoever is left to fight what the hero became.
    const gone = await get(() => {
      const s0 = HA.debug.world.state;
      const mk = (o) => Object.assign({}, s0, o, { people: Object.assign({}, s0.people, { flux: null, sorrel: null }, o.people), flags: Object.assign({}, s0.flags, o.flags) });
      const free = { bailiff: 'release', pruner: 'release', tallyman: 'release' };
      const lines = (id, o) => HA.endings.lines(id, mk(o)).join(' | ');
      const eight = mk({ crew: 8, bloom: 0, mercy: 9, wardens: free, takenHome: 11, people: { solder: 'alive', gasket: 'dead' } });
      return {
        home: lines('homecoming', { crew: 9, mercy: 9, wardens: free, people: { solder: 'alive', gasket: 'dead', navigator: 'rest' }, flags: { gasketSky: true } }),
        crash: lines('crash', { people: { gasket: 'dead' } }),
        dominion: lines('dominion', { people: { gasket: 'dead' } }),
        overgrown: lines('overgrown', { crew: 4, people: { solder: 'dead', gasket: 'dead' } }),
        branch: HA.endings.afterSteward(eight),
        closed: HA.endings.closedCard(eight, 'crash').map((l) => (Array.isArray(l) ? l[0] : l)).join(' '),
        hullfolk: HA.endings.landed(Object.assign(eight, { crew: 9 }), 'homecoming').hullfolk,
        pics: ['homecoming', 'crash'].every((id) => HA.endings.epilogue(id, mk({ people: { gasket: 'dead' } })).every((c) => !c.pic || HA.pictures.names().includes(c.pic))),
      };
    });
    expect(/OLD GASKET NEVER SAW THE SKY/.test(gone.home) && /I TOLD THEM HE WANTED TO/.test(gone.home) && !/BREATHED OUT/.test(gone.home), `the Homecoming epilogue with Gasket lost went wrong (${gone.home})`);
    expect(/TAMP COUNTED THEM AT LIGHTS-OUT NOW/.test(gone.crash) && /THEY BURIED OLD GASKET/.test(gone.dominion) && /BRINE WALKED OUT OF THE HELM ALIVE/.test(gone.overgrown) && /SHE DIDN'T TALK ABOUT IT/.test(gone.overgrown), `the other epilogues with Gasket lost went wrong (${gone.crash} / ${gone.dominion} / ${gone.overgrown})`);
    expect(gone.branch === 'crash' && /WITHOUT GASKET'S/.test(gone.closed) && gone.hullfolk === 30 && gone.pics, `losing Gasket did not cost a pair of hands, or a place in the count (${JSON.stringify(gone)})`);

    // ---- Hasp's boy (3.15), from a save in the Warrens before the climb: Hasp asks, the tally's line, Cotter in his
    // chair in the Muster, his fight (a fall puts him back in the chair; hits don't shorten it), and the choice. Dry:
    // he's home in bed, and counted. Dosed: he climbs, as one more pair of hands, and does as he's told. ----
    const before = { crew: 0, flags: { crewCame: false, camp: false, campDone: false, verdict: false, lifts: 0, spine: false, namedLate: true, fluxHome: true, fluxMorning: true } };
    await towerSave(Object.assign({}, before, { room: 'warrens', x: 60 * 8, y: 19 * 8 - 14 }));
    await startSaved();
    const rv = await get(() => {
      const { w, listen, talkThrough, choose, options } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      const npc = (id) => HA.story.npcOf(w(), id);
      const still = () => {
        for (const e of w().enemies) if (!e.boss) Object.assign(e, { dead: true, spawn: Object.assign(e.spawn, { respawn: -1 }) });
      };
      const talk = () => {
        p.x = npc('cotter').x - 10;
        HA.debug.step(3);
        HA.debug.step(1, { up: true });
      };
      w().assist.invincible = true;
      HA.debug.step(5);
      out.hasp = npc('hasp') && npc('hasp').state;
      for (let i = 0; i < 300 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.asks = w().scene && w().scene.name;
      out.asked = listen().join(' | ');
      HA.debug.goto('counting-house', 14, 40);
      HA.debug.step(5);
      HA.debug.step(1, { up: true });
      out.log = w().scene && w().scene.name;
      out.tally = listen().join(' | ');
      HA.debug.goto('muster', 36, 18);
      HA.debug.step(3);
      still();
      out.chair = npc('cotter') && npc('cotter').kneel && npc('cotter').state;
      p.x = npc('cotter').x - 20;
      HA.debug.step(10);
      out.seen = !!s.flags.cotterSeen;
      talk();
      out.found = w().scene && w().scene.name;
      out.foundSaid = listen().join(' | ');
      HA.debug.step(5);
      let b = w().boss;
      out.fight = { type: b && b.type, fighting: b && b.fighting, music: HA.music.playing, check: w().checkpoint && w().checkpoint.room };
      // Hits don't shorten the fit: only staying on your feet does.
      const fit = b.fit;
      HA.actors.hurtEnemy(w(), b, 50, 1);
      out.hit = b.fit >= fit - 2;
      // A fall: back at the fight's checkpoint, and Cotter back in his chair.
      for (let i = 0; i < 300 && p.invuln > 0; i++) HA.debug.step(1);
      w().assist.invincible = false;
      w().hurtPlayer(p.hp, p.x + 20);
      for (let i = 0; i < 400 && (p.dead || w().transition); i++) HA.debug.step(1);
      HA.debug.step(30);
      out.fell = { room: w().def.id, chair: !!(npc('cotter') && npc('cotter').kneel && npc('cotter').state === 'out'), boss: !!w().boss, cotter: s.people.cotter };
      w().assist.invincible = true;
      still();
      talk();
      talkThrough();
      b = w().boss;
      // Each move from its wind-up. He picks them at random, and with the hero standing still by him a lunge can go a
      // whole fit without coming up.
      for (let i = 0; i < 300 && (w().scene || b.state !== 'think'); i++) HA.debug.step(1);
      const moves = {};
      for (const [tele, want] of [['lungeTele', 'lunge'], ['leapTele', 'drop'], ['slamTele', 'wave']]) {
        w().shots = w().shots.filter((sh) => sh.kind !== 'wave');
        b.state = tele;
        b.timer = 1;
        for (let i = 0; i < 200 && !moves[tele]; i++) {
          HA.debug.step(1);
          if (want === 'wave' ? w().shots.some((sh) => sh.kind === 'wave') : b.state === want) moves[tele] = true;
        }
        for (let i = 0; i < 300 && b.state !== 'think'; i++) HA.debug.step(1);
      }
      out.moves = Object.keys(moves).sort().join(',');
      const states = new Set();
      out.shards = 0; // the most in the air at once: the hero, standing by the racks, picks them up
      for (let i = 0; i < 2700 && !w().scene; i++) {
        HA.debug.step(1);
        states.add(b.state);
        out.shards = Math.max(out.shards, w().pickups.filter((k) => k.kind === 'shard').length);
      }
      out.states = [...states].sort().join(',');
      out.defeated = w().scene && w().scene.name;
      out.beaten = listen().join(' | ');
      out.choice = options();
      const m = s.mercy;
      choose(0);
      out.dry = listen().join(' | ');
      talkThrough();
      HA.debug.step(400);
      out.after = { cotter: s.people.cotter, mercy: s.mercy - m, check: !!w().checkpoint, boss: !!w().boss, gone: npc('cotter') && npc('cotter').state, music: HA.music.playing };
      HA.debug.goto('warrens', 60, 18);
      HA.debug.step(10);
      out.home = w().scene && w().scene.name;
      out.homeSaid = listen().join(' | ');
      out.bed = npc('cotter') && npc('cotter').state + ':' + (npc('cotter').sprite === HA.art.people.cotterDry);
      out.count = HA.endings.landed(s, 'homecoming').hullfolk;
      out.crash = HA.endings.lines('crash', s).join(' | ');
      out.crew = HA.story.crewList(s).includes('cotter');
      w().assist.invincible = false;
      return out;
    });
    expect(rv.hasp === 'out' && rv.asks === 'haspAsks' && /NINETEEN/.test(rv.asked) && /WITH A PIPE/.test(rv.asked), `Hasp asking after her son went wrong (${JSON.stringify(rv)})`);
    expect(rv.log === 'tallyCotter' && /OUTSIDE THE COUNT/.test(rv.tally) && /THE MUSTER\. THEY MADE A SOLDIER OF HIM/.test(rv.tally), `the tally's line for Cotter went wrong (${rv.log}: ${rv.tally})`);
    expect(rv.chair === 'out' && rv.seen && rv.found === 'cotterFound' && /HASP SENT ME/.test(rv.foundSaid), `Cotter in his chair in the Muster went wrong (${JSON.stringify(rv)})`);
    expect(rv.fight.type === 'cotter' && rv.fight.fighting && rv.fight.music === 'wick' && rv.fight.check === 'muster' && rv.hit, `Cotter's fight did not start, or hits shortened it (${JSON.stringify(rv.fight)}, ${rv.hit})`);
    expect(rv.fell.room === 'muster' && rv.fell.chair && !rv.fell.boss && !rv.fell.cotter, `a fall in Cotter's fight did not put him back in his chair (${JSON.stringify(rv.fell)})`);
    expect(rv.moves === 'leapTele,lungeTele,slamTele' && rv.states.split(',').includes('down') && rv.shards > 0, `Cotter's fight is missing a move, or its shards (${rv.moves}; ${rv.states}, ${rv.shards})`);
    expect(rv.defeated === 'cotterDefeated' && /MA'S GOING TO KILL ME/.test(rv.beaten) && rv.choice === 'WALK HIM HOME DRY/GIVE HIM HIS DOSE', `the end of Cotter's fit went wrong (${rv.defeated}, ${rv.choice}: ${rv.beaten})`);
    expect(rv.after.cotter === 'dry' && rv.after.mercy === 1 && !rv.after.check && !rv.after.boss && rv.after.gone === 'gone' && rv.after.music !== 'wick' && /TELL HER I'M COMING/.test(rv.dry), `Cotter sent home dry went wrong (${JSON.stringify(rv.after)}: ${rv.dry})`);
    expect(rv.home === 'cotterHome' && /HANDS AND KNEES/.test(rv.homeSaid) && rv.bed === 'hidden:true' && rv.count === 32 && /COTTER CARRIED HASP DOWN TO THE SLEDS/.test(rv.crash) && !rv.crew, `Cotter home dry went wrong (${JSON.stringify(rv)})`);
    // Dosed: one more pair of hands on the climb, who does as he's told, and the Dominion's own card.
    await towerSave(Object.assign({}, before, { room: 'muster', x: 36 * 8, y: 19 * 8 - 14, mercy: 6, flags: Object.assign({}, before.flags, { haspAsked: true }) }));
    await startSaved();
    const rd = await get(() => {
      const { w, listen, talkThrough, choose } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      w().assist.invincible = true;
      HA.debug.step(3);
      for (const e of w().enemies) if (!e.boss) Object.assign(e, { dead: true, spawn: Object.assign(e.spawn, { respawn: -1 }) });
      p.x = HA.story.npcOf(w(), 'cotter').x - 10;
      HA.debug.step(3);
      HA.debug.step(1, { up: true });
      talkThrough();
      w().boss.fit = 5;
      for (let i = 0; i < 80 && !(w().scene && w().scene.name === 'cotterDefeated'); i++) HA.debug.step(1);
      talkThrough();
      const m = s.mercy;
      choose(1);
      out.said = listen().join(' | ');
      talkThrough();
      HA.debug.step(300);
      out.cotter = s.people.cotter;
      out.mercy = s.mercy - m;
      out.crew = HA.story.crewList(s).join(',');
      out.hands = HA.story.crewOf(s);
      HA.debug.goto('warrens', 60, 18);
      HA.debug.step(10);
      out.home = w().scene && w().scene.name;
      out.homeSaid = listen().join(' | ');
      out.door = HA.story.npcOf(w(), 'cotter') && HA.story.npcOf(w(), 'cotter').state;
      // Once the crew have gone up he's with them, not at Hasp's door; and he's nobody's voice, or the Overgrown's fight.
      s.flags.crewCame = true;
      s.crew = out.hands;
      HA.debug.goto('warrens', 60, 18);
      HA.debug.step(5);
      out.climbing = !HA.story.npcOf(w(), 'cotter');
      out.dominion = HA.endings.lines('dominion', s).join(' | ');
      const over = Object.assign({}, s, { crew: 4, people: Object.assign({}, s.people, { solder: 'dead', gasket: 'dead' }) });
      out.overgrown = HA.endings.lines('overgrown', over).join(' | ');
      w().assist.invincible = false;
      return out;
    });
    expect(rd.cotter === 'dosed' && rd.mercy === -1 && /WHO GIVES THE DOSE GIVES THE ORDERS/.test(rd.said) && rd.crew.startsWith('gasket,cotter,') && rd.hands === 7, `Cotter given his dose went wrong (${JSON.stringify(rd)})`);
    expect(rd.home === 'cotterHome' && /HE CALLS ME MA'AM/.test(rd.homeSaid) && rd.door === 'out' && rd.climbing, `Cotter home dosed went wrong (${JSON.stringify(rd)})`);
    expect(/I HAD THE RACKS NOW/.test(rd.dominion) && /COTTER DIDN'T NOTICE ANY DIFFERENCE/.test(rd.overgrown) && /WALKED OUT OF THE HELM ALIVE/.test(rd.overgrown) && !/COTTER WALKED OUT OF THE HELM/.test(rd.overgrown), `the endings with Cotter dosed went wrong (${rd.dominion} / ${rd.overgrown})`);

    // ---- Wick's remedy (3.15), from a save in the Warrens after the climb: her notebook on her doorstep, the three
    // things (under the Cold Store's ice, at the bottom of the Settling Pools' sump, by the furnace once Abel is down),
    // the Warrens' bench with no Solder there, and the remedy taken by the hero (Bloom 4 to 2); then from the camp,
    // Solder binds it and it goes into the water; then at Bloom 8, when taking it does nothing. ----
    const settled = { namedLate: true, fluxHome: true, fluxMorning: true };
    const allThree = { remedyRead: true, remedyLichen: true, remedySilt: true, remedyAsh: true };
    await towerSave({ room: 'warrens', x: 40 * 8, y: 19 * 8 - 14, bloom: 4, bloomWarned: 3, flags: settled });
    await startSaved();
    const rh = await get(() => {
      const { w, listen, talkThrough, choose, press, options } = window.tw;
      const out = {};
      const s = w().state;
      w().assist.invincible = true;
      HA.debug.step(5);
      talkThrough();
      HA.debug.goto('warrens', 57, 10);
      HA.debug.step(3);
      press('up');
      out.notebook = w().scene && w().scene.name;
      out.read = listen().join(' | ');
      talkThrough();
      out.flag = !!s.flags.remedyRead && !!s.logs.wickNotebook;
      const grab = (room, tx, ty, id) => {
        HA.debug.goto(room, tx, ty);
        HA.debug.step(5);
        const near = w().near && w().near.o.id;
        press('up');
        const said = listen().join(' | ');
        talkThrough();
        HA.debug.step(5);
        return near === id && !!s.flags[id] && !w().logs.some((l) => l.id === id) ? said : 'missed ' + id + ' (' + near + ')';
      };
      out.lichen = grab('cold-store', 3, 11, 'remedyLichen');
      out.silt = grab('settling-pools', 32, 43, 'remedySilt');
      out.ash = grab('reactor-throat', 23, 18, 'remedyAsh');
      HA.debug.goto('warrens', 84, 18);
      HA.debug.step(5);
      press('up');
      out.made = listen().join(' | ');
      out.choice = options();
      out.gain = w().scene.step.choice.options[1].confirm.gain;
      choose(1);
      out.took = listen().join(' | ');
      talkThrough();
      out.after = { remedy: s.flags.remedy, bloom: s.bloom, warned: s.bloomWarned, stage: HA.bloom.stage(s) };
      // The bench is only a bench after that.
      press('up');
      listen(); // the first time at his bench, the hero says so first
      out.again = w().scene && w().scene.name + ':' + (options() || '').split('/')[0];
      talkThrough();
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      w().assist.invincible = false;
      return out;
    });
    expect(rh.notebook === 'wickNotebook' && /IT HATES THREE THINGS/.test(rh.read) && /SHE NEVER GOT TO FINISH IT/.test(rh.read) && rh.flag, `Wick's notebook went wrong (${rh.notebook}: ${rh.read})`);
    expect(/UNDER THE ICE/.test(rh.lichen) && /DEEPEST POOL/.test(rh.silt) && /FURNACE MOUTH/.test(rh.ash) && /ALL THREE/.test(rh.ash), `the three things for Wick's remedy went wrong (${rh.lichen} / ${rh.silt} / ${rh.ash})`);
    expect(/WICK'S NOTES SAY HOW/.test(rh.made) && rh.choice === 'CUT IT INTO THE WATER/TAKE IT YOURSELF' && rh.gain === 'THE BLOOM IN YOU, PUSHED BACK' && /LETS GO, A LITTLE/.test(rh.took), `Wick's remedy at the Warrens' bench went wrong (${JSON.stringify(rh)})`);
    expect(rh.after.remedy === 'hero' && rh.after.bloom === 2 && rh.after.warned === 0 && rh.after.stage === 0 && /^bench:PLATING/.test(rh.again), `the remedy taken did not take the Bloom down (${JSON.stringify(rh.after)}, ${rh.again})`);
    expect(/I NEVER TOLD ANYONE WHERE WICK'S REMEDY WENT/.test(rh.cards) && /I KEPT WICK'S CURE FOR MYSELF/.test(rh.cards) && /WICK'S REMEDY WENT INTO ME/.test(rh.cards) && /WICK'S REMEDY WASN'T ENOUGH/.test(rh.cards), `the endings with Wick's remedy taken went wrong (${rh.cards})`);
    // At the camp, with Solder: into the water, and the woken stop dreaming of the field.
    await towerSave({ room: 'crew-camp', x: 18 * 8, y: 19 * 8 - 14, flags: Object.assign({ camp: true, campDone: false, verdict: false }, settled, allThree) });
    await startSaved();
    const rw = await get(() => {
      const { w, listen, talkThrough, choose } = window.tw;
      const out = {};
      const s = w().state;
      HA.debug.step(5);
      talkThrough();
      HA.debug.goto('crew-camp', 21, 18);
      HA.debug.step(5);
      window.tw.press('up');
      out.made = listen().join(' | ');
      const m = s.mercy;
      choose(0);
      out.water = listen().join(' | ');
      talkThrough();
      out.after = { remedy: s.flags.remedy, mercy: s.mercy - m, bloom: s.bloom };
      HA.debug.goto('warrens', 30, 18);
      HA.debug.step(10);
      talkThrough();
      out.woken = w().npcs.filter((n) => n.id === 'woken').map((n) => n.lines[0]).join(' | ');
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      return out;
    });
    expect(/THAT'S WICK'S HAND/.test(rw.made) && /SEND IT DOWN THE LIFTS TO TAMP/.test(rw.water) && rw.after.remedy === 'woken' && rw.after.mercy === 1 && rw.after.bloom === 0, `Wick's remedy at the camp went wrong (${JSON.stringify(rw)})`);
    expect(/NO FIELD/.test(rw.woken) && /TASTES OF ASH/.test(rw.woken), `the woken did not stop dreaming (${rw.woken})`);
    expect(/AND DREAMED OF IT/.test(rw.cards) && /NONE OF THEM DREAMED PINK/.test(rw.cards) && /NOBODY DOWN THERE DREAMS PINK/.test(rw.cards) && /CLEAR FOR A YEAR/.test(rw.cards), `the endings with Wick's remedy in the water went wrong (${rw.cards})`);
    // At Bloom 8 it's too late, and the screen says so.
    await towerSave({ room: 'warrens', x: 84 * 8, y: 19 * 8 - 14, bloom: 8, bloomWarned: 8, flags: Object.assign({}, settled, allThree) });
    await startSaved();
    const r8 = await get(() => {
      const { w, listen, talkThrough, choose } = window.tw;
      const s = w().state;
      HA.debug.step(5);
      talkThrough();
      HA.debug.goto('warrens', 84, 18);
      HA.debug.step(5);
      window.tw.press('up');
      listen();
      const gain = w().scene.step.choice.options[1].confirm.gain;
      choose(1);
      const said = listen().join(' | ');
      talkThrough();
      return { gain, said, bloom: s.bloom, remedy: s.flags.remedy };
    });
    expect(r8.gain === 'NOTHING. THE BLOOM HAS YOU' && /DRINKS IT DOWN LIKE WATER/.test(r8.said) && r8.bloom === 8 && r8.remedy === 'hero', `Wick's remedy at Bloom 8 went wrong (${JSON.stringify(r8)})`);

    // ---- Pod 1130 (3.15): the ship's page, here on the way up to the camp after a game quit before it was heard;
    // the pod on the Pod Stacks' ledge, thawed (Hugo Marsh goes down to the Warrens, Mercy +1); then, from another
    // save, its cell taken (max health +4, Mercy -1); and never answered before the Tower. ----
    await towerSave({ room: 'piston-run', x: 8 * 8, y: 9 * 8 - 14, flags: Object.assign({}, settled, { camp: false, lightsOut: false, campDone: false, verdict: false }) });
    await startSaved();
    const pt = await get(() => {
      const { w, listen, talkThrough, choose, press, options } = window.tw;
      const out = {};
      const s = w().state;
      w().assist.invincible = true;
      HA.debug.step(5);
      // (The Piston Run has its own scene first, if the plate's bolt hasn't been drawn.)
      for (let i = 0; i < 4000 && !(w().scene && w().scene.name === 'pod1130Alarm'); i++) {
        if (w().scene) HA.debug.skipScene();
        HA.debug.step(1);
      }
      out.page = w().scene && w().scene.name;
      out.paged = listen().join(' | ');
      talkThrough();
      out.heard = !!s.flags.pod1130Alarm && s.journal.story.some((l) => /POD 1130 WENT ONTO ITS RESERVE CELL/.test(l));
      HA.debug.goto('pod-stacks', 3, 18);
      HA.debug.step(30);
      out.noted = w().barks.some((b) => /BLINKING RED: POD 1130/.test(b.text));
      HA.debug.goto('pod-stacks', 8, 18);
      HA.debug.step(5);
      out.near = w().near && w().near.o.id + ':' + w().near.label;
      press('up');
      out.read = listen().join(' | ');
      out.choice = options();
      out.gain = w().scene.step.choice.options[0].confirm.gain;
      const m = s.mercy;
      choose(0);
      out.thaw = listen().join(' | ');
      talkThrough();
      const hugo = HA.story.npcOf(w(), 'hugo');
      out.after = { fate: s.people.pod1130, mercy: s.mercy - m, hugo: hugo && hugo.state, log: w().logs.some((l) => l.id === 'pod1130'), story: s.journal.story.some((l) => /THE OTHER SLEEPER/.test(l)) };
      HA.debug.goto('warrens', 50, 18);
      HA.debug.step(10);
      talkThrough();
      const h = HA.story.npcOf(w(), 'hugo');
      out.home = h && { state: h.state, kneel: !!h.kneel, x: Math.round(h.x / 8), said: h.lines.join(' | ') };
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.landed = { home: HA.endings.landed(s, 'homecoming').sleepers, crash: HA.endings.landed(s, 'crash').sleepers, survivors: HA.endings.lines('crash', s).find((l) => /^COUNT: SURVIVORS/.test(l)) };
      out.crashHullfolk = HA.endings.landed(s, 'crash').hullfolk;
      w().assist.invincible = false;
      return out;
    });
    expect(pt.page === 'pod1130Alarm' && /ATTENDANT TO THE STACKS/.test(pt.paged) && /CREW'S LIFTS/.test(pt.paged) && /THE WAY I WAS/.test(pt.paged) && pt.heard, `the ship's page for Pod 1130 went wrong (${pt.page}: ${pt.paged})`);
    expect(pt.noted && pt.near === 'pod1130:{up} POD 1130' && /AUTHORITY: ANY/.test(pt.read) && /IN 0417/.test(pt.read) && pt.choice === 'THAW HIM/TAKE THE CELL' && pt.gain === 'HUGO MARSH, AWAKE · 232 YEARS LATE', `Pod 1130 on the ledge went wrong (${JSON.stringify(pt)})`);
    expect(/IS THIS THE NEW WORLD/.test(pt.thaw) && /THEY TOOK ME IN/.test(pt.thaw) && /AT THE BOTTOM, HE WAVED/.test(pt.thaw) && pt.after.fate === 'thawed' && pt.after.mercy === 1 && pt.after.hugo === 'gone' && !pt.after.log && pt.after.story, `thawing Pod 1130 went wrong (${JSON.stringify(pt.after)}: ${pt.thaw})`);
    expect(pt.home && pt.home.state === 'out' && pt.home.kneel && pt.home.x === 45 && /THE OTHER SLEEPER/.test(pt.home.said), `Hugo Marsh in the Warrens went wrong (${JSON.stringify(pt.home)})`);
    expect(/RIGHT ON TIME/.test(pt.cards) && /RODE THE SLEDS DOWN WITH THE HULLFOLK/.test(pt.cards) && /GROWS BEANS UNDER THE WARRENS' LAMPS/.test(pt.cards) && /IN TIME FOR THE PINK/.test(pt.cards), `the endings with Hugo Marsh thawed went wrong (${pt.cards})`);
    expect(pt.landed.home === 3986 && pt.landed.crash === 1 && pt.landed.survivors === 'COUNT: SURVIVORS, ' + (pt.crashHullfolk + 2) + '.', `Hugo Marsh is not counted where he landed (${JSON.stringify(pt.landed)})`);
    // From the ledge, the other way: the cell, for the suit.
    await towerSave({ room: 'pod-stacks', x: 8 * 8, y: 19 * 8 - 14, flags: Object.assign({ pod1130Alarm: true }, settled) });
    await startSaved();
    const pc = await get(() => {
      const { w, listen, talkThrough, choose, press } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      w().assist.invincible = true;
      HA.debug.step(5);
      talkThrough();
      HA.debug.goto('pod-stacks', 8, 18);
      HA.debug.step(5);
      press('up');
      listen();
      const max = p.maxHp;
      const m = s.mercy;
      choose(1);
      out.took = listen().join(' | ');
      talkThrough();
      HA.debug.step(2);
      out.after = { fate: s.people.pod1130, mercy: s.mercy - m, max: p.maxHp - max, full: p.hp === p.maxHp, toast: w().toastText, log: w().logs.some((l) => l.id === 'pod1130') };
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.sleepers = HA.endings.landed(s, 'homecoming').sleepers;
      // Never answered: heard, and the hero rode the Tower Lift first.
      s.people.pod1130 = null;
      s.flags.tower = true;
      out.failed = HA.story.pod1130Fate(s);
      out.failedCards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.failedSleepers = HA.endings.landed(s, 'homecoming').sleepers;
      // Never heard at all (a save from before it): nothing in the endings.
      s.flags.pod1130Alarm = false;
      out.unheard = HA.story.pod1130Fate(s) === null && !/POD 1130/.test(['homecoming', 'crash'].map((id) => HA.endings.lines(id, s).join(' ')).join(' '));
      w().assist.invincible = false;
      return out;
    });
    expect(/FROM RED TO NOTHING/.test(pc.took) && pc.after.fate === 'cell' && pc.after.mercy === -1 && pc.after.max === 4 && pc.after.full && pc.after.toast === 'SUIT CELL · MAX HEALTH +4' && !pc.after.log, `taking Pod 1130's cell went wrong (${JSON.stringify(pc.after)}: ${pc.took})`);
    expect(/STAYED DARK WHEN THE OTHERS OPENED/.test(pc.cards) && /ITS CELL CAME DOWN WITH ME/.test(pc.cards) && /IT WAS NEVER MINE TO TAKE/.test(pc.cards) && /A LITTLE LONGER/.test(pc.cards) && pc.sleepers === 3985, `the endings with Pod 1130's cell taken went wrong (${pc.sleepers}: ${pc.cards})`);
    expect(pc.failed === 'failed' && /STOPPED WHILE I WAS CLIMBING/.test(pc.failedCards) && /I WAS BUSY WITH THE KEY/.test(pc.failedCards) && pc.failedSleepers === 3985 && pc.unheard, `Pod 1130 never answered went wrong (${pc.failed}, ${pc.failedSleepers}, ${pc.unheard}: ${pc.failedCards})`);

    // ---- The new stoker (3.15): the morning's sounds after the night at the camp (Abel spared); the Fireman's
    // offer in the Reactor Throat; unchaining Rivet, so his fight (each move forced in turn, a fall, the win); Rivet
    // home by the Warrens' gate, and counted; then, from another save (Abel ended), the sack taken; and the cards. ----
    await towerSave({ room: 'crew-camp', x: 18 * 8, y: 19 * 8 - 14, logs: { stokers: true }, flags: Object.assign({}, settled, { lightsOut: false, campDone: false, verdict: false }) });
    await startSaved();
    const st = await get(() => {
      const { w, listen, talkThrough, choose, options } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      w().assist.invincible = true;
      HA.debug.step(5);
      talkThrough();
      HA.story.run(w(), 'lightsOut');
      out.night = listen().slice(-3).join(' | ');
      HA.debug.step(3);
      out.heard = { flag: !!s.flags.rivetHeard, toast: w().toastText, lead: s.lead };
      // Down the camp's hatch: the ladder lands on the ledge by the shutter. Through it, the Fireman sees the hero.
      HA.debug.goto('reactor-throat', 3, 7);
      HA.debug.step(10);
      out.room = { boss: w().boss && w().boss.type, enemies: w().enemies.map((e) => e.type).join(' '), rivet: (w().npcs.find((n) => n.id === 'rivet') || {}).chained };
      for (let i = 0; i < 600 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.scene = w().scene && w().scene.name;
      out.offer = listen().join(' | ');
      out.choice = options();
      out.lose = w().scene.step.choice.options.map((o) => o.confirm.lose).join(' / ');
      const m = s.mercy;
      choose(0);
      out.unchain = listen().join(' | ');
      HA.debug.step(5);
      const b = w().boss;
      out.fight = { type: b && b.type, fighting: b && b.fighting, music: HA.music.playing, rivet: s.people.rivet, mercy: s.mercy - m, cp: w().checkpoint && w().checkpoint.room };
      // Each move, forced in turn: the rake along the floor in front of him, the coals at the hero, the draught
      // through the grate nearest them. (Mortal for these, with the hero's hits counted, not his.)
      w().assist.invincible = false;
      const hurt = (place, state, frames) => {
        place();
        p.invuln = 0;
        p.hp = p.maxHp;
        Object.assign(b, { state, timer: 1, vx: 0 });
        b.facing = Math.sign(p.x - b.x) || 1;
        const x0 = b.x;
        for (let i = 0; i < frames && p.hp === p.maxHp; i++) {
          HA.debug.step(1);
          // nothing else of his while this one plays out, and no walking into the hero
          if (b.state === 'think') Object.assign(b, { timer: 99, x: x0, vx: 0 });
        }
        return p.maxHp - p.hp;
      };
      const stand = (tx) => () => {
        Object.assign(p, { x: tx * 8, y: 19 * 8 - p.h, vx: 0, vy: 0 });
        Object.assign(b, { x: 15 * 8 - 3, y: 19 * 8 - b.h });
      };
      out.rake = hurt(stand(10), 'rakeTele', 30);
      out.coals = { n: 0, fires: 0 };
      out.coalsHit = hurt(() => {
        stand(8)();
        b.coals = [];
        b.fires = [];
      }, 'coalsTele', 120);
      out.coals = { n: b.coals.length + b.fires.length, fires: b.fires.length };
      out.draught = hurt(() => {
        stand(19)();
        b.columns = [];
        Object.assign(b, { x: 26 * 8 });
      }, 'draughtTele', 90);
      out.columns = b.columns.map((c) => c.x / 8).join(',');
      // The second half: hotter. Five coals, and every grate.
      for (let i = 0; i < 40 && b.phase === 1; i++) w().hurtEnemy(b, 4, 1);
      // (past the hit-stop from the hero's last hit)
      Object.assign(b, { state: 'coalsTele', timer: 1, coals: [], columns: [] });
      HA.debug.step(8);
      out.half = { phase: b.phase, coals: b.coals.length };
      Object.assign(b, { state: 'draughtTele', timer: 1 });
      HA.debug.step(8);
      out.half.columns = b.columns.length;
      // A fall: back on the ledge, him back at his post; through the shutter, it starts again.
      p.invuln = 0;
      w().hurtPlayer(p.hp, p.x + 20);
      for (let i = 0; i < 400 && (w().player.dead || w().transition); i++) HA.debug.step(1);
      HA.debug.step(20);
      w().assist.invincible = true;
      const back = w().enemies.find((e) => e.type === 'fireman');
      out.fall = { room: w().def.id, x: Math.round(w().player.x / 8), y: Math.round((w().player.y + w().player.h) / 8), fighting: back.fighting, hp: back.hp === back.maxHp, at: Math.round(back.x / 8) };
      for (let i = 0; i < 600 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.again = w().scene && w().scene.name;
      talkThrough();
      HA.debug.step(5);
      out.again += ' ' + !!(w().boss && w().boss.type === 'fireman' && w().boss.fighting);
      // The win: the key, the chain, and Abel's word.
      for (let i = 0; i < 4000 && w().boss.fighting; i++) {
        if (i % 6 === 0) w().hurtEnemy(w().boss, 4, 1);
        HA.debug.step(1);
      }
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1);
      out.won = listen().join(' | ');
      talkThrough();
      HA.debug.step(30);
      out.after = { rivet: s.people.rivet, mercy: s.mercy - m, boss: w().boss && w().boss.type, gone: w().npcs.filter((n) => n.id === 'rivet').every((n) => n.state === 'gone'), choice: s.journal.choices[s.journal.choices.length - 1], cp: w().checkpoint };
      HA.debug.goto('reactor-throat', 3, 7);
      HA.debug.step(10);
      out.empty = !w().enemies.some((e) => e.type === 'fireman') && !w().npcs.some((n) => n.id === 'rivet');
      // Home, by the gate.
      HA.debug.goto('warrens', 100, 18);
      HA.debug.step(10);
      const rv = w().npcs.find((n) => n.id === 'rivet');
      out.home = rv && { x: Math.round(rv.x / 8), state: rv.state, kneel: rv.kneel, lines: rv.lines.join(' ') };
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.count = HA.endings.landed(s, 'homecoming').hullfolk;
      s.people.rivet = null;
      out.count -= HA.endings.landed(s, 'homecoming').hullfolk;
      s.people.rivet = 'freed';
      return out;
    });
    expect(/TWO SHOVELS/.test(st.night) && /A CHAIN, DRAGGING ON THE GRATING/.test(st.night) && st.heard.flag && st.heard.toast === 'THE REACTOR THROAT · DOWN THE HATCH FROM THE CAMP', `the morning's sounds from the Throat went wrong (${JSON.stringify(st.heard)}: ${st.night})`);
    expect(st.room.boss === 'abel' && st.room.enemies === 'abel fireman' && st.room.rivet && st.scene === 'rivetFound', `the Fireman and his stoker were not in the Throat (${JSON.stringify(st.room)}, ${st.scene})`);
    expect(/A SECOND SHOVEL/.test(st.offer) && /WHEN ONE IS USED UP/.test(st.offer) && /RIVET\. I KEPT TO THE WALLS/.test(st.offer) && st.choice === 'UNCHAIN HIM/TAKE THE SACK' && st.lose === 'THE SACK · ABEL STOKES ALONE / RIVET', `the Fireman's offer went wrong (${st.choice}, ${st.lose}: ${st.offer})`);
    expect(/MIGHT BE STUPID/.test(st.unchain) && st.fight.type === 'fireman' && st.fight.fighting && st.fight.music === 'boss' && st.fight.rivet === 'unchain' && st.fight.mercy === 0 && st.fight.cp === 'reactor-throat', `the Fireman's fight did not start (${JSON.stringify(st.fight)})`);
    expect(st.rake === 3 && st.coalsHit >= 1 && st.coals.n >= 1 && st.draught === 2 && st.columns === '17' && st.half.phase === 2 && st.half.coals === 5 && st.half.columns === 3, `the Fireman's moves went wrong (rake ${st.rake}, coals ${st.coalsHit} ${JSON.stringify(st.coals)}, draught ${st.draught} at ${st.columns}, ${JSON.stringify(st.half)})`);
    expect(st.fall.room === 'reactor-throat' && st.fall.x === 3 && st.fall.y === 8 && !st.fall.fighting && st.fall.hp && st.fall.at === 15 && st.again === 'firemanAgain true', `a fall in the Fireman's fight went wrong (${JSON.stringify(st.fall)}, ${st.again})`);
    expect(/SEND FOR ANOTHER/.test(st.won) && /I CAN STOP/.test(st.won) && /GO\. GO HOME/.test(st.won) && /THEY'LL TAKE YOU/.test(st.won) && st.after.rivet === 'freed' && st.after.mercy === 1 && st.after.boss === 'abel' && st.after.gone && /UNCHAINED HIM/.test(st.after.choice) && !st.after.cp && st.empty, `unchaining Rivet went wrong (${JSON.stringify(st.after)}, ${st.empty}: ${st.won})`);
    expect(st.home && st.home.x === 105 && st.home.state === 'out' && st.home.kneel && /COOL BY THE GATE/.test(st.home.lines), `Rivet at home went wrong (${JSON.stringify(st.home)})`);
    expect(/COOLEST THING HE EVER FELT/.test(st.cards) && /NEVER SAT NEAR A FIRE AGAIN/.test(st.cards) && /HE HIDES/.test(st.cards) && /BEFORE THE PINK CAME/.test(st.cards) && st.count === 1, `the endings with Rivet freed went wrong (${st.count}: ${st.cards})`);
    // Abel ended, and the sack taken.
    await towerSave({ room: 'reactor-throat', x: 3 * 8, y: 8 * 8 - 14, people: { abel: 'ended' }, flags: Object.assign({ rivetHeard: true }, settled) });
    await startSaved();
    const sk = await get(() => {
      const { w, listen, talkThrough, choose } = window.tw;
      const out = {};
      const s = w().state;
      const p = w().player;
      w().assist.invincible = true;
      HA.debug.step(5);
      const abel = w().enemies.find((e) => e.type === 'abel');
      out.relit = !!abel.relit && !!abel.moved;
      for (let i = 0; i < 600 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.offer = listen().join(' | ');
      out.lose = w().scene.step.choice.options[0].confirm.lose;
      const m = s.mercy;
      const level = p.weapons[0].level;
      choose(1);
      out.took = listen().join(' | ');
      talkThrough();
      for (let i = 0; i < 240; i++) HA.debug.step(1, { left: i % 60 < 30, right: i % 60 >= 30 });
      const fm = w().enemies.find((e) => e.type === 'fireman');
      out.after = { rivet: s.people.rivet, mercy: s.mercy - m, levelled: p.weapons[0].level > level || s.scrap > 0, hostile: fm.fighting, choice: s.journal.choices[s.journal.choices.length - 1] };
      const rv = w().npcs.find((n) => n.id === 'rivet');
      out.rivet = rv && rv.chained && rv.talkable(w(), rv) && rv.lines.join(' ');
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.count = HA.endings.landed(s, 'homecoming').hullfolk;
      // Never gone down to see: heard, never settled. Never heard at all: nothing.
      s.people.rivet = null;
      out.never = HA.story.rivetFate(s) + ' ' + ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.count -= HA.endings.landed(s, 'homecoming').hullfolk;
      s.flags.rivetHeard = false;
      out.unheard = HA.story.rivetFate(s) === null && !/RIVET|WHO WAS FEEDING IT|FEEDS THE FIRES/.test(['homecoming', 'crash', 'dominion'].map((id) => HA.endings.lines(id, s).join(' ')).join(' '));
      w().assist.invincible = false;
      return out;
    });
    expect(sk.relit && /WE LAID HIM ON HIS BUNK/.test(sk.offer) && sk.lose === "THE SACK · THE FURNACE'S FIRE", `the Throat with Abel ended went wrong (${sk.relit}, ${sk.lose}: ${sk.offer})`);
    expect(/SENSIBLE/.test(sk.took) && /GO ON, THEN/.test(sk.took) && !/TWO SHOVELS/.test(sk.took) && sk.after.rivet === 'left' && sk.after.mercy === -1 && sk.after.levelled && !sk.after.hostile && /LEFT RIVET CHAINED/.test(sk.after.choice) && /DON'T STOP ME/.test(sk.rivet), `taking the Steward's sack went wrong (${JSON.stringify(sk.after)}, ${sk.rivet}: ${sk.took})`);
    expect(/SOMEBODY ELSE WENT BACK TO UNCHAIN HIM/.test(sk.cards) && /SO WAS RIVET/.test(sk.cards) && /I SEND HIM HIS DOSE/.test(sk.cards) && /UNTIL THE PINK CAME UP THE SPINE/.test(sk.cards) && sk.count === 0, `the endings with Rivet left at the fires went wrong (${sk.count}: ${sk.cards})`);
    expect(/^never /.test(sk.never) && /WHO WAS FEEDING IT/.test(sk.never) && /NEVER ASKED WHO FEEDS THE FIRES/.test(sk.never) && sk.unheard, `the new stoker never gone to see went wrong (${sk.unheard}: ${sk.never})`);

    // ---- The last watchman (3.15): counted through on the way to the Drain; her call on the Warrens' speakers once
    // home's news is told; back in the Watch Gallery, relieving her (she opens her own gate and goes home, and is
    // counted); then, from another save, leaving her the gate, and her time on the run for the sleds; and the cards. ----
    await towerSave({ room: 'watch-gallery', x: 27 * 8, y: 19 * 8 - 14, flags: settled });
    await startSaved();
    const wt = await get(() => {
      const { w, listen, talkThrough, choose, options } = window.tw;
      const out = {};
      const s = w().state;
      w().assist.invincible = true;
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1);
      out.count = { scene: w().scene && w().scene.name, said: listen().join(' | '), flag: !!s.flags.watchCount, seen: w().npcs.some((n) => n.id === 'watch') };
      talkThrough();
      // Home: once it's quiet, the old speakers.
      HA.debug.goto('warrens', 60, 18);
      for (let i = 0; i < 400 && !(w().scene && w().scene.name === 'watchCall'); i++) {
        if (w().scene) talkThrough();
        HA.debug.step(1);
      }
      out.call = { scene: w().scene && w().scene.name, said: listen().join(' | ') };
      HA.debug.step(3);
      Object.assign(out.call, { flag: !!s.flags.watchCall, toast: w().toastText, lead: s.lead });
      talkThrough();
      // The Watch Gallery again: she's down out of the pipes, in the watch room.
      HA.debug.goto('watch-gallery', 27, 18);
      HA.debug.step(10);
      const n = w().npcs.find((x) => x.id === 'watch');
      out.post = n && { x: Math.round(n.x / 8), feet: n.y + n.h, rifle: n.rifle, scene: w().scene && w().scene.name };
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.scene = w().scene && w().scene.name;
      out.offer = listen().join(' | ');
      out.choice = options();
      out.confirms = w().scene.step.choice.options.map((o) => o.confirm.title + ' ' + o.confirm.gain + ' / ' + o.confirm.lose).join(' || ');
      out.prompt = HA.font.measure(w().scene.step.choice.prompt) + 16 <= HA.VIEW_W - 8;
      const m = s.mercy;
      choose(0);
      out.relieved = listen().join(' | ');
      talkThrough();
      HA.debug.step(10);
      out.after = { fate: s.people.watch, mercy: s.mercy - m, gate: !!s.flags.aisleGate, rifle: !!w().watchRifle, gone: w().npcs.filter((x) => x.id === 'watch').every((x) => x.state === 'gone'), choice: s.journal.choices[s.journal.choices.length - 1] };
      HA.debug.goto('watch-gallery', 27, 18);
      HA.debug.step(10);
      out.empty = !w().npcs.some((x) => x.id === 'watch') && !!w().watchRifle && !w().scene;
      // Home: up on the platform over the gate.
      HA.debug.goto('warrens', 92, 18);
      HA.debug.step(10);
      const e = w().npcs.find((x) => x.id === 'watch');
      out.home = e && { name: e.name, x: Math.round(e.x / 8), feet: e.y + e.h, talk: e.talkable(w(), e), lines: e.lines.join(' ') };
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.most = HA.endings.resultCard(s, 'homecoming').map((r) => (r && r.a === 'HULLFOLK' ? r.b : '')).join('');
      out.counted = HA.endings.landed(s, 'homecoming').hullfolk;
      s.people.watch = null;
      out.counted -= HA.endings.landed(s, 'homecoming').hullfolk;
      s.people.watch = 'relieved';
      // At the sleds, she's counted the village on.
      HA.story.SCENES.watchSledsCheck = function* (wd) {
        yield* HA.story.watchSleds(wd);
      };
      HA.story.run(w(), 'watchSledsCheck');
      out.sleds = listen().join(' | ');
      w().assist.invincible = false;
      return out;
    });
    expect(wt.count.scene === 'watchCount' && /FOUR HUNDRED AND TWELVE/.test(wt.count.said) && /UP IN THE PIPES/.test(wt.count.said) && wt.count.flag && !wt.count.seen, `Watch 4 counting the hero through went wrong (${JSON.stringify(wt.count)})`);
    expect(wt.call.scene === 'watchCall' && /WATCH 4 TO THE TALLY YARD/.test(wt.call.said) && /REQUEST RELIEF/.test(wt.call.said) && /SHE COUNTED ME THROUGH/.test(wt.call.said) && /NOBODY LEFT TO ANSWER HER/.test(wt.call.said) && wt.call.flag && wt.call.toast === 'THE WATCH GALLERY · WEST, IN THE LABYRINTH' && !/WATCH/.test(wt.call.lead), `Watch 4's call on the Warrens' speakers went wrong (${JSON.stringify(wt.call)})`);
    expect(wt.post && wt.post.x === 14 && wt.post.feet === 152 && wt.post.rifle === 'down' && !wt.post.scene && wt.scene === 'watchFound', `Watch 4 was not at her post in the watch room (${JSON.stringify(wt.post)}, ${wt.scene})`);
    expect(/STEWARD'S MARK/.test(wt.offer) && /FOUR HUNDRED AND ELEVEN/.test(wt.offer) && /SOLDER\./.test(wt.offer) && /RECEIVED, WATCH 4\. HOLD/.test(wt.offer) && /NOBODY WAS EVER COMING/.test(wt.offer) && wt.choice === 'RELIEVE HER/LEAVE HER THE GATE' && /TELL HER NOBODY IS COMING\?/.test(wt.confirms) && /ON YOUR ORDERS/.test(wt.confirms) && wt.prompt, `Watch 4's story or choice went wrong (${wt.choice}, ${wt.confirms}, fits ${wt.prompt}: ${wt.offer})`);
    expect(/STAND DOWN/.test(wt.relieved) && /EDDA VOSS/.test(wt.relieved) && /GRINDS OPEN/.test(wt.relieved) && /THROUGH HER OWN GATE/.test(wt.relieved) && wt.after.fate === 'relieved' && wt.after.mercy === 1 && wt.after.gate && wt.after.rifle && wt.after.gone && /RELIEVED HER MYSELF/.test(wt.after.choice) && wt.empty, `relieving Watch 4 went wrong (${JSON.stringify(wt.after)}, ${wt.empty}: ${wt.relieved})`);
    expect(wt.home && wt.home.name === 'EDDA' && wt.home.x === 96 && wt.home.feet === 128 && wt.home.talk && /I WATCH THE GATE/.test(wt.home.lines), `Edda at home went wrong (${JSON.stringify(wt.home)})`);
    expect(/COUNTED EVERY ONE OF US OUT/.test(wt.cards) && /NEVER STOOD A WATCH AGAIN/.test(wt.cards) && /I'VE ASKED/.test(wt.cards) && /A FEW WARM DAYS/.test(wt.cards) && wt.counted === 1 && / OF 35$/.test(wt.most), `the endings with Watch 4 relieved went wrong (${wt.counted}, ${wt.most}: ${wt.cards})`);
    expect(/EDDA COUNTED THE VILLAGE ON/.test(wt.sleds) && /AND ONE MORE/.test(wt.sleds), `Edda at the sleds went wrong (${wt.sleds})`);
    // Another save: her call heard, and the gate left to her, with orders. Then the run for the sleds.
    await towerSave({ room: 'watch-gallery', x: 27 * 8, y: 19 * 8 - 14, flags: Object.assign({ watchCount: true, watchCall: true, aisleGate: true }, settled) });
    await startSaved();
    const wh = await get(() => {
      const { w, listen, talkThrough, choose } = window.tw;
      const out = {};
      const s = w().state;
      w().assist.invincible = true;
      HA.debug.step(5);
      for (let i = 0; i < 200 && !w().scene; i++) HA.debug.step(1, { left: true });
      listen();
      const m = s.mercy;
      choose(1);
      out.held = listen().join(' | ');
      talkThrough();
      HA.debug.step(10);
      const n = w().npcs.find((x) => x.id === 'watch');
      out.after = { fate: s.people.watch, mercy: s.mercy - m, out: n && n.state, talk: n && n.talkable(w(), n), lines: n && n.lines.join(' '), gate: !!s.flags.aisleGate, rifle: !!w().watchRifle, choice: s.journal.choices[s.journal.choices.length - 1] };
      out.cards = ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      out.counted = HA.endings.landed(s, 'homecoming').hullfolk;
      // The run for the sleds: she shuts the gate on the Ballast, and the keel holds longer.
      Object.assign(s.flags, { towerUp: true, stewardDown: true, key: 'broken' });
      HA.story.SCENES.watchRunCheck = function* (wd) {
        yield* HA.story.scuttleRun(wd);
      };
      HA.story.run(w(), 'watchRunCheck');
      out.run = listen().join(' | ');
      out.left = Math.round(w().runLeft / 60);
      out.flash = w().watchFlash > 0;
      w().runLeft = 2;
      HA.debug.step(4);
      talkThrough();
      out.retry = Math.round(w().runLeft / 60);
      HA.story.SCENES.watchSledsCheck = function* (wd) {
        yield* HA.story.watchSleds(wd);
      };
      HA.story.run(w(), 'watchSledsCheck');
      out.sleds = listen().join(' | ');
      // Never gone back: her call heard, never settled. Never heard at all: nothing.
      s.people.watch = null;
      out.counted -= HA.endings.landed(s, 'homecoming').hullfolk;
      out.never = HA.story.watchFate(s) + ' ' + ['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' || ');
      HA.story.SCENES.watchNeverCheck = function* (wd) {
        yield* HA.story.watchRun(wd, 'OLD GASKET');
      };
      HA.story.run(w(), 'watchNeverCheck');
      out.neverRun = listen().join(' | ');
      s.flags.watchCall = false;
      out.unheard = HA.story.watchFate(s) === null && !/WATCH 4|EDDA/.test(['homecoming', 'crash', 'dominion', 'overgrown'].map((id) => HA.endings.lines(id, s).join(' ')).join(' '));
      w().assist.invincible = false;
      return out;
    });
    expect(/THIRTY YEARS, AND AN ORDER/.test(wh.held) && /COUNTED BACK/.test(wh.held) && wh.after.fate === 'held' && wh.after.mercy === 0 && wh.after.out === 'out' && wh.after.talk && /WATCH 4 HOLDS/.test(wh.after.lines) && wh.after.gate && !wh.after.rifle && /WITH AN ORDER/.test(wh.after.choice), `leaving Watch 4 the gate went wrong (${JSON.stringify(wh.after)}: ${wh.held})`);
    expect(/ASKED WHO WAS RELIEVING HER/.test(wh.cards) && /HELD THE DRAIN SHUT/.test(wh.cards) && /RECEIVED, WATCH 4\. HOLD/.test(wh.cards) && /HELD THE GATE ANYWAY/.test(wh.cards) && wh.counted === 0, `the endings with Watch 4 left at her gate went wrong (${wh.counted}: ${wh.cards})`);
    expect(/THE BALLAST IS COMING UP THE DRAIN/.test(wh.run) && /THAT'S TIME/.test(wh.run) && wh.left === 175 && wh.flash && wh.retry === 175 && /SHE HAD ORDERS/.test(wh.sleds), `Watch 4 on the run for the sleds went wrong (clock ${wh.left}, again ${wh.retry}, flash ${wh.flash}, ${wh.sleds}: ${wh.run})`);
    expect(/^never /.test(wh.never) && /STILL ASKING FOR WATCH 4'S RELIEF/.test(wh.never) && /I'VE NEVER ANSWERED/.test(wh.never) && /ASKED FOR RELIEF/.test(wh.never) && /REQUEST RELIEF/.test(wh.neverRun) && /STILL ASKING/.test(wh.neverRun) && wh.unheard, `Watch 4 never gone back to went wrong (${wh.unheard}, ${wh.neverRun}: ${wh.never})`);

    // The fourth batch of new rooms. The Condenser: Main 3 has burst across the Boiler Stair over its midway shelf,
    // and shuts off at its two valves, A past the sump and B on the coil tops; then the crew's leader on the dry stair.
    await towerSave({ room: 'boiler-stair', x: 30 * 8, y: 56 * 8 - 14, flags: { crewCame: false, lifts: 0, liftTwoSeen: false, abelSeen: false, abelDown: false, camp: false, lightsOut: false, shimRanOff: false, purserGone: false, campDone: false, verdict: false, condenser: false }, people: { abel: null } });
    await startSaved();
    const cn = await get(() => {
      const { w, listen, press } = window.tw;
      const s = w().state;
      const f = s.flags;
      w().assist.invincible = true;
      const out = {};
      HA.debug.step(5);
      out.shut = !w().doors.find((d) => d.id === 'steamMain').open;
      out.thought = listen().join(' ');
      // up the shelf's vent: it stops under the steam
      HA.debug.goto('boiler-stair', 35, 55);
      HA.debug.step(3);
      listen(); // the thought again: it's a new visit
      let top = 99;
      for (let i = 0; i < 150; i++) {
        HA.debug.step(1);
        top = Math.min(top, w().player.y / 8);
      }
      out.under = Math.floor(top) >= 46 && top < 54; // carried up, and stopped under the steam
      // east off the shelf, into the Condenser
      HA.debug.goto('boiler-stair', 38, 55); // past the vent, in the doorway
      HA.debug.step(3);
      listen();
      for (let i = 0; i < 120 && w().def.id === 'boiler-stair'; i++) HA.debug.step(1, { right: true });
      out.room = w().def.id;
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.inside = listen().join(' ');
      HA.debug.goto('condenser', 8, 12);
      HA.debug.step(5);
      press('up');
      out.notice = listen().join(' ');
      out.prompts = [];
      const valve = (tx, ty) => {
        HA.debug.goto('condenser', tx, ty);
        HA.debug.step(5);
        out.prompts.push(w().near && w().near.label);
        press('up');
        return listen().join(' ');
      };
      // the shortcut back (0.3.23): the ladder by A, up the well beside Main 3, steamed shut while the main is open
      HA.debug.goto('condenser', 71, 12);
      HA.debug.step(5);
      out.ladder = w().near && w().near.label;
      press('up');
      out.ladderShut = listen().join(' ');
      out.ladderStay = w().def.id;
      out.a = valve(74, 12);
      out.half = [f.condenserA, !!f.condenserB, !!f.condenser].join(',');
      out.b = valve(29, 7);
      out.done = !!f.condenser && s.journal.story.some((t) => /SHUT IT OFF AT BOTH ITS VALVES/.test(t));
      out.again = valve(29, 7);
      // both shut, the ladder runs: out on the stair above the burst, and the hatch there goes back down
      const at = () => [w().def.id, Math.round((w().player.x + w().player.w / 2) / 8), Math.round((w().player.y + w().player.h) / 8)].join(',');
      HA.debug.goto('condenser', 71, 12);
      HA.debug.step(5);
      press('up');
      out.climb = listen().join(' ');
      out.top = at();
      out.hatch = w().near && w().near.label;
      press('down');
      listen();
      out.bottom = at();
      HA.debug.goto('boiler-stair', 30, 55);
      HA.debug.step(5);
      out.open = w().doors.find((d) => d.id === 'steamMain').open && !w().scene;
      // the Boiler Landing: the crew build the first lift, and the stair is dry
      HA.debug.goto('boiler-stair', 18, 8);
      HA.debug.step(30);
      out.arrive = w().scene && w().scene.name;
      out.crew = listen().join(' | ');
      // a game saved past the shelf before 0.3.22: the crew have come, so the steam is gone
      f.condenser = false;
      HA.debug.goto('boiler-stair', 30, 55);
      HA.debug.step(5);
      out.old = w().doors.find((d) => d.id === 'steamMain').open && !w().scene;
      w().assist.invincible = false;
      return out;
    });
    expect(cn.shut && /LIVE STEAM, WALL TO WALL/.test(cn.thought) && /CONDENSER/.test(cn.thought) && cn.under && cn.room === 'condenser' && /SUMP OF HOT WATER/.test(cn.inside), `the burst main over the Boiler Stair's shelf went wrong (${JSON.stringify(cn)})`);
    expect(/A IS PAST THE SUMP, B IS ON THE COIL TOPS/.test(cn.notice) && cn.prompts.every((l) => l === '{up} SHUT THE VALVE') && /THINNED\. NOT ENOUGH/.test(cn.a) && cn.half === 'true,false,false' && /DIED TO A HISS/.test(cn.b) && cn.done && /IT'S SHUT\. SO IS THE OTHER ONE/.test(cn.again), `the Condenser's valves went wrong (${JSON.stringify(cn)})`);
    expect(cn.open && cn.arrive === 'crewArrives' && /SOMEBODY SHUT MAIN 3/.test(cn.crew) && cn.old, `the Boiler Stair after Main 3 went wrong (${JSON.stringify(cn)})`);
    expect(/TAKE THE LADDER BY A/.test(cn.notice) && cn.ladder === '{up} CLIMB UP' && /LIVE STEAM, ROLLING DOWN THE LADDER WELL/.test(cn.ladderShut) && cn.ladderStay === 'condenser' && /LADDER WELL BY A WENT QUIET/.test(cn.b), `the Condenser's ladder, before the valves, went wrong (${JSON.stringify(cn)})`);
    expect(/ABOVE WHERE MAIN 3 BURST/.test(cn.climb) && /^boiler-stair,2[45],32$/.test(cn.top) && cn.hatch === '{down} CLIMB DOWN' && /^condenser,7[12],13$/.test(cn.bottom), `the Condenser's ladder back to the stair went wrong (${JSON.stringify(cn)})`);

    // The Guard Room: the Barracks' bulkhead to the Dome is bolted for the night from the Guard Room, west of the lift;
    // the racked guard, the one who's awake (and, with the Muster's dose book read, why), and the bell.
    await towerSave({ room: 'barracks', x: 30 * 8, y: 19 * 8 - 14, flags: { towerUp: true, guardWoke: true, gasketBarracks: 'held', guardBolt: false }, logs: { muster: true } });
    await startSaved();
    const gr = await get(() => {
      const { w, listen, press } = window.tw;
      const s = w().state;
      const f = s.flags;
      w().assist.invincible = true;
      const out = {};
      HA.debug.goto('barracks', 62, 18);
      HA.debug.step(5);
      for (let i = 0; i < 300 && !w().scene; i++) HA.debug.step(1, { right: true });
      out.scene = w().scene && w().scene.name;
      out.thought = listen().join(' ');
      for (let i = 0; i < 120; i++) HA.debug.step(1, { right: true });
      out.shut = !w().doors.find((d) => d.id === 'guardBolt').open && w().def.id === 'barracks' && w().player.x < 76 * 8;
      // the turnout car by the bulkhead (0.3.23): braked, its lamp red, until the Guard Room's bell rings
      const car = () => w().links.find((l) => l.legend.scene === 'turnout');
      const at = () => [w().def.id, Math.round((w().player.x + w().player.w / 2) / 8), Math.round((w().player.y + w().player.h) / 8)].join(',');
      HA.debug.goto('barracks', 70, 18);
      HA.debug.step(5);
      listen();
      out.car = w().near && w().near.label;
      out.lampBefore = car().legend.lit(s);
      press('up');
      out.braked = listen().join(' ');
      out.carStay = at();
      // west, past the lift, into the Guard Room
      HA.debug.goto('barracks', 4, 18);
      HA.debug.step(5);
      for (let i = 0; i < 200 && w().def.id === 'barracks'; i++) HA.debug.step(1, { left: true });
      out.room = w().def.id;
      for (let i = 0; i < 60 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.inside = listen().join(' ');
      out.still = w().enemies.filter((e) => e.type === 'guard').length;
      HA.debug.goto('guard-room', 24, 9);
      HA.debug.step(5);
      for (let i = 0; i < 100 && !w().scene; i++) HA.debug.step(1, { left: true });
      out.awake = listen().join(' ');
      HA.debug.goto('guard-room', 45, 18);
      HA.debug.step(5);
      press('up');
      out.orders = listen().join(' ');
      HA.debug.goto('guard-room', 5, 9);
      HA.debug.step(5);
      out.prompt = w().near && w().near.label;
      press('up');
      out.bell = listen().join(' ');
      const racked = () => w().enemies.filter((e) => e.racked && !e.dead).map((e) => Math.round((e.y + e.h) / 8)).sort((a, b) => a - b).join(',');
      out.out = racked();
      out.empty = (w().guardOut || []).join(',');
      out.bolt = !!f.guardBolt && s.journal.story.some((t) => /RANG A BELL DOWN THE RACKS/.test(t));
      press('up');
      out.again = listen().join(' ');
      // the bell took the car's brake off: it runs from beside the board to the bulkhead's end, and back
      HA.debug.goto('guard-room', 8, 9);
      HA.debug.step(5);
      out.lampAfter = car().legend.lit(s);
      out.ride = w().near && w().near.label;
      press('up');
      out.rode = listen().join(' ');
      out.arrived = at();
      press('up');
      listen();
      out.rodeBack = at();
      // back east and through the open bulkhead to the Dome; and the racks still empty on the way back in
      HA.debug.goto('barracks', 70, 18);
      HA.debug.step(5);
      out.open = w().doors.find((d) => d.id === 'guardBolt').open && !w().scene;
      for (let i = 0; i < 200 && w().def.id === 'barracks'; i++) HA.debug.step(1, { right: true });
      out.dome = w().def.id;
      HA.debug.goto('guard-room', 70, 18);
      HA.debug.step(5);
      out.back = racked();
      // a game saved past the Barracks before 0.3.22: the Dome has been seen, so the bulkhead is open
      f.guardBolt = false;
      f.domeSeen = true;
      HA.debug.goto('barracks', 70, 18);
      HA.debug.step(5);
      out.old = w().doors.find((d) => d.id === 'guardBolt').open && !w().scene && car().legend.lit(s);
      w().assist.invincible = false;
      return out;
    });
    expect(gr.car === '{up} RIDE THE TURNOUT CAR' && !gr.lampBefore && /BRAKED/.test(gr.braked) && /GUARD ROOM'S BELL RINGS/.test(gr.braked) && /^barracks,/.test(gr.carStay), `the turnout car before the bell went wrong (${JSON.stringify(gr)})`);
    expect(/DROPPED ITS BRAKE/.test(gr.bell) && gr.lampAfter && gr.ride === '{up} RIDE THE TURNOUT CAR' && /OVER EVERYONE'S HEADS/.test(gr.rode) && /^barracks,(69|70|71),19$/.test(gr.arrived) && /^guard-room,(7|8|9),10$/.test(gr.rodeBack), `riding the turnout car went wrong (${JSON.stringify(gr)})`);
    expect(gr.scene === 'bulkheadShut' && /BOLTED FOR THE NIGHT/.test(gr.thought) && /GUARD ROOM/.test(gr.thought) && gr.shut, `the Barracks' bulkhead was not bolted (${JSON.stringify(gr)})`);
    expect(gr.room === 'guard-room' && /EYES SHUT/.test(gr.inside) && /NOBODY MOVED/.test(gr.inside) && gr.still === 0 && /HIS EYES FOLLOWED ME/.test(gr.awake) && /MISSED A DOSE/.test(gr.awake) && /NOTHING COMES UP FROM THE SPINE AFTER DARK/.test(gr.orders), `the Guard Room's racks went wrong (${JSON.stringify(gr)})`);
    expect(gr.prompt === '{up} DRAW THE BOLT' && /A BELL OVER THE BOARD RANG/.test(gr.bell) && /STEPPING OUT/.test(gr.bell) && /STAYED WHERE HE WAS/.test(gr.bell) && gr.out === '10,19,19' && gr.empty === '40,27,59' && gr.bolt && /THE BOLT'S DRAWN/.test(gr.again), `drawing the bulkhead's bolt went wrong (${JSON.stringify(gr)})`);
    expect(gr.open && gr.dome === 'observation-dome' && gr.back === gr.out && gr.old, `the bulkhead after the bolt went wrong (${JSON.stringify(gr)})`);

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
      // The Dock's hall (3.24): in at the First Night's east end, 0112 and the boat, the empty cradle, and out at the
      // bottom into the Gardens hall (no ladder up now), which is a checkpoint too.
      const dock = (out.dock = {});
      HA.debug.goto('hall-night', 76, 18);
      walk('right', 200);
      dock.room = w().def.id;
      dock.scene = w().scene && w().scene.name;
      dock.said = listen().join(' | ');
      HA.debug.goto('hall-dock', 5, 41);
      HA.debug.step(5);
      dock.cradle = w().scene && w().scene.name;
      dock.cradleSaid = listen().join(' | ');
      walk('left', 300);
      dock.out = w().def.id;
      dock.gardens = w().scene && w().scene.name;
      listen();
      dock.check = w().checkpoint && w().checkpoint.room;
      dock.toast = w().toastText;
      dock.noLadder = !w().links.some((l) => l.legend.to === 'hall-night');
      dock.story = w().state.journal.story.some((t) => /0112, ASKED WHERE WE WERE/.test(t));
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
    const dk = deck.dock;
    expect(dk.room === 'hall-dock' && dk.scene === 'hallDock' && /POD 0112/.test(dk.said) && /I OPENED THE DOOR FOR THEM/.test(dk.said) && dk.cradle === 'dockCradle' && /I WATCHED THAT TOO/.test(dk.cradleSaid), `the Dock's memory hall went wrong (${JSON.stringify(dk)})`);
    expect(dk.out === 'hall-gardens' && dk.gardens === 'hallGardens' && dk.check === 'hall-gardens' && /CHECKPOINT/.test(dk.toast) && dk.noLadder && dk.story, `out of the Dock into the Gardens hall, or its checkpoint, went wrong (${JSON.stringify(dk)})`);
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

    // ---- Mara's dreams (3.10): each one plays over the screen, clears, and leaves a line in the journal ----
    const dreams = await get(() => {
      const w = HA.debug.world;
      const c = document.createElement('canvas');
      c.width = HA.VIEW_W;
      c.height = HA.VIEW_H;
      const g = c.getContext('2d');
      const out = [];
      for (let n = 1; n <= 4; n++) {
        const before = w.state.journal.story.length;
        HA.scenes.run(w, () => HA.story.dream(w, n), { name: 'dream' + n });
        let lit = 0;
        for (let i = 0; i < 400 && w.scene; i++) {
          HA.debug.step(10);
          HA.debug.step(1, { confirm: true });
          if (!w.dream) continue;
          HA.scenes.drawCard(w, g);
          const px = g.getImageData(0, 0, HA.VIEW_W, HA.VIEW_H).data;
          let sum = 0;
          for (let k = 0; k < px.length; k += 4) sum += px[k] + px[k + 1] + px[k + 2];
          lit = Math.max(lit, sum / (px.length / 4));
        }
        out.push({ n, flag: !!w.state.flags['dream' + n], journal: w.state.journal.story.length - before, left: !!w.dream || !!w.scene, lit: Math.round(lit) });
      }
      return out;
    });
    for (const d of dreams) expect(d.flag && d.journal === 1 && !d.left && d.lit > 8, `dream ${d.n} did not play through, show its picture and leave a journal line (${JSON.stringify(d)})`);

    // ---- The shard bank and Solder's bench (3.10): spare shards become scrap, and scrap buys plating ----
    const bench = await get(() => {
      const w = HA.debug.world;
      const p = w.player;
      const s = w.state;
      if (!p.weapons.length) p.weapons.push(HA.weapons.make('pistol'));
      const wpn = p.weapons[p.wi];
      const out = { scrap0: s.scrap };
      wpn.level = 3;
      wpn.xp = HA.weapons.cap(wpn) - 1;
      HA.weapons.addXp(w, 4); // one point fills the weapon; three are spare
      out.overflow = s.scrap - out.scrap0;
      HA.weapons.addXp(w, 4);
      out.maxed = s.scrap - out.scrap0;
      s.scrap = 30;
      out.hp0 = p.maxHp;
      HA.scenes.run(w, HA.story.SCENES.bench, { name: 'bench' });
      for (let i = 0; i < 60 && w.scene; i++) {
        const st = w.scene.step;
        if (st && st.choice && s.upgrades.plating) HA.debug.step(1, { up: true }); // round to LEAVE
        HA.debug.step(6);
        HA.debug.step(1, { confirm: true });
        HA.debug.step(6);
      }
      out.plating = s.upgrades.plating;
      out.scrap = s.scrap;
      out.hp = p.maxHp;
      out.open = !!w.scene;
      return out;
    });
    expect(bench.overflow === 3 && bench.maxed === 7, `spare shards were not kept as scrap (${JSON.stringify(bench)})`);
    expect(bench.plating === 1 && bench.scrap === 0 && bench.hp === bench.hp0 + 2 && !bench.open, `Solder's bench did not sell plating for 30 scrap (${JSON.stringify(bench)})`);

    // ---- Lock 2 (3.10): if the gate fell, the Warrens' way west is under rubble, and the deep walls go round ----
    const caveIn = await get(() => {
      const w = HA.debug.world;
      const s = w.state;
      const was = { raid: s.warrensRaid, seen: s.flags.raidSeen, room: w.def.id, x: w.player.x, y: w.player.y };
      s.flags.raidSeen = true; // (the raid's own scene isn't what this is about)
      const look = (raid) => {
        s.warrensRaid = raid;
        HA.debug.goto('warrens', 50, 18);
        HA.debug.step(2);
        const hole = w.links.find((l) => l.legend.to === 'deep-walls');
        const out = { rubble: !w.doors.find((d) => d.id === 'caveIn').open, wayWest: w.room.tile(0, 17) !== HA.room.SOLID, hole: !!hole && hole.legend.open(s) };
        HA.debug.goto('warrens-gate', 20, 41);
        HA.debug.step(2);
        out.gateRubble = !w.doors.find((d) => d.id === 'caveIn').open;
        out.deepDoor = w.doors.find((d) => d.id === 'deepDoor').open;
        return out;
      };
      const held = look('held');
      const fell = look('fell');
      // Walking up to the rubble says what it is, once, in the journal.
      HA.debug.goto('warrens', 30, 18);
      HA.debug.step(4);
      const line = s.journal.story.filter((t) => /WE LIVE IN THE WALLS AGAIN/.test(t)).length;
      // Down the hole: the deep walls.
      const hole = w.links.find((l) => l.legend.to === 'deep-walls');
      w.travel(hole);
      HA.debug.step(4);
      const room = w.def.id;
      s.warrensRaid = was.raid;
      s.flags.raidSeen = was.seen;
      w.enterRoom(was.room, was.x, was.y, { noSave: true });
      return { held, fell, line, room };
    });
    expect(!caveIn.held.rubble && caveIn.held.wayWest && !caveIn.held.hole && !caveIn.held.gateRubble && !caveIn.held.deepDoor, `with the gate held, the Warrens' way west should be open and the deep walls shut (${JSON.stringify(caveIn.held)})`);
    expect(caveIn.fell.rubble && !caveIn.fell.wayWest && caveIn.fell.hole && caveIn.fell.gateRubble && caveIn.fell.deepDoor, `with the gate fallen, the way west should be under rubble and the deep walls open (${JSON.stringify(caveIn.fell)})`);
    expect(caveIn.line === 1 && caveIn.room === 'deep-walls', `the cave-in's journal line, or the hole down into the deep walls, went wrong (${JSON.stringify(caveIn)})`);

    // ---- Lock 3 (3.10): with Flux home, a rest in the Warrens brings a morning with him and Shim; with his pack
    // taken, it never comes ----
    const morning = await get(() => {
      const w = HA.debug.world;
      const s = w.state;
      const was = { flux: s.people.flux, f: { ...s.flags }, scrap: s.scrap, room: w.def.id, x: w.player.x, y: w.player.y };
      Object.assign(s.flags, { fluxHome: true, fluxMorning: false, raidSeen: true, climbPlanned: true });
      const rest = HA.rooms.byId.warrens.onRest;
      s.people.flux = 'stripped';
      HA.debug.goto('warrens', 100, 18);
      const out = { stripped: rest(w) };
      s.people.flux = 'home';
      HA.debug.goto('warrens', 100, 18);
      HA.debug.step(2);
      out.home = rest(w);
      const before = s.journal.story.length;
      if (out.home === 'fluxMorning') HA.story.run(w, out.home);
      const said = [];
      for (let i = 0; i < 400 && w.scene; i++) {
        const st = w.scene.step;
        if (st && st.say !== undefined && said[said.length - 1] !== st.text) said.push(st.text);
        HA.debug.step(4);
        HA.debug.step(1, { confirm: true });
      }
      out.said = said.join(' / ');
      out.scrap = s.scrap - was.scrap;
      out.journal = s.journal.story.slice(before).join(' / ');
      out.done = !!s.flags.fluxMorning && !w.scene;
      out.again = rest(w);
      s.people.flux = was.flux;
      s.flags = Object.assign(s.flags, was.f);
      for (const k of ['fluxHome', 'fluxMorning', 'raidSeen', 'climbPlanned']) if (!(k in was.f)) delete s.flags[k];
      s.scrap = was.scrap;
      w.enterRoom(was.room, was.x, was.y, { noSave: true });
      return out;
    });
    expect(morning.stripped === null && morning.home === 'fluxMorning' && morning.again === null, `Flux's morning should come once, and only with him home (${JSON.stringify(morning)})`);
    expect(/THIS IS MY DAD/.test(morning.said) && /STRIPPED IT/.test(morning.said) && morning.scrap === 30 && /STRIPPED HIS PACK/.test(morning.journal) && morning.done, `Flux's morning went wrong (${JSON.stringify(morning)})`);

    // ---- The five endings, each from the flags its path would set, played to the title and recorded ----
    const PATHS = {
      deserter: { takenHome: 11, people: { solder: null } },
      dominion: { mercy: -5, bloom: 0, wardens: { bailiff: 'salvage', pruner: 'salvage', tallyman: 'salvage' }, people: { solder: 'alive', steward: 'ended' } },
      overgrown: { mercy: 0, bloom: 9, people: { solder: 'dead', gardener: 'dosed' } },
      crash: { mercy: 2, bloom: 0, crew: 4, podsLaunched: 40, warrensRaid: 'fell', wardens: { bailiff: 'release', pruner: 'salvage', tallyman: 'release' }, people: { solder: 'alive', sorrel: 'stayed' } },
      homecoming: { crew: 9, bloom: 1, mercy: 9, toldShim: 'truth', warrensRaid: 'held', wardens: { bailiff: 'release', pruner: 'release', tallyman: 'release' }, people: { solder: 'alive', navigator: 'stay', flux: 'home', sorrel: 'home' } },
    };
    const WANT = {
      // Each one ends Mara's thread, without ever saying what she is to the hero (Cody, Oct 31).
      deserter: ['COUNT: HULLFOLK, 31.', 'I LEFT MARA IN 0418.', "SHE'LL WAKE WITHOUT ME.", 'COUNT: SOLDER. NOT RECORDED.'],
      dominion: ['COUNT THEM.', 'THANK YOU.', 'THEY ARE SAFER ASLEEP.', 'I HAD THE KEY. I COULD HAVE WOKEN HER.'],
      overgrown: ['OLD GASKET WALKED OUT OF THE HELM ALIVE.', 'ON 0418 FIRST.', "I'M RIGHT HERE, LITTLE ONE.", 'THE GARDENER WENT INTO THE BLOOM SHE MADE.'],
      crash: ['COUNT: SURVIVORS, 6.', 'THE PODS CAME DOWN LIKE SEEDS.', 'I GOT THERE BEFORE SHE WOKE.', 'THE FEW LEFT FROM THE WARRENS RODE THE LAST SLED.', 'COUNT: WARDENS, 2.', 'SOMEONE WAS COUNTING THEM.'],
      homecoming: ['SORREL COUNTED THEM IN.', 'THE SEED VAULT WAS OPENED UNDER A REAL SKY.', "DUNN'S GIRL GOT HER STAR.", 'RETURNED, AS ASKED. HE HAD HIS ANSWER.', "HE SAID CLEAT'S NAME TO THE SKY.", 'THE ONE IN 0417 STAYED WITH THE SHIP.', 'FORGIVE ME FOR BEING LATE, MARA.', "HE CARRIED HIS MOTHER'S LANTERN.", 'MY NAME WAS USHER.', 'NOT ALONE.', 'FLUX FLEW HOME TO THE WARRENS, AND STAYED THERE.'],
    };
    const LANDED = {
      deserter: () => ({ hullfolk: 0, sleepers: 0, mara: false, hero: true }),
      dominion: () => ({ hullfolk: 0, sleepers: 0, mara: false, hero: false }),
      overgrown: () => ({ hullfolk: 0, sleepers: 0, mara: false, hero: false }),
      crash: () => ({ hullfolk: 5, sleepers: 3986, mara: true, hero: true }),
      homecoming: (home) => ({ hullfolk: home, sleepers: 3986, mara: true, hero: false }),
    };
    // What closed the way to Homecoming, at its longest (Dominion, with every requirement missing), fits on the screen.
    const closed = await get(() => {
      const s = HA.debug.world.state;
      const worst = { ...s, bloom: 9, crew: 0, wardens: {}, people: { ...s.people, solder: 'dead' } };
      const lines = HA.endings.closedCard(worst, 'dominion');
      return { n: lines.length, gap: lines.length > 14 ? 10 : 11, said: lines.map((l) => (Array.isArray(l) ? l[0] : l)).join(' ') };
    });
    expect(closed.n * closed.gap <= 180 - 16 && /OLD CREW LIFT/.test(closed.said) && /ONLY THE CLEAN/.test(closed.said) && !/SEAL READ/.test(closed.said), `the card of what closed the other way doesn't fit or doesn't say why (${JSON.stringify(closed)})`);
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
          const out = { branch: HA.endings.afterSteward(s), missing: HA.endings.missing(s).map((r) => r.id), lines: HA.endings.lines(id, s), landed: HA.endings.landed(s, id), home: 20 + (s.takenHome || 0) + (s.people.sorrel === 'home' ? 1 : 0) };
          // Every picture an epilogue card asks for is one pictures.js can draw.
          out.badPics = HA.endings.epilogue(id, s).filter((c) => c.pic && !HA.pictures.names().includes(c.pic)).map((c) => c.pic);
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
      expect(!/SISTER/.test(lines), `the ${id} ending says what Mara is to the hero (${lines})`);
      if (id !== 'deserter') expect(e.branch === id, `the ${id} path led to ${e.branch} after the Steward (missing: ${e.missing})`);
      expect(!e.badPics.length, `the ${id} epilogue asks for pictures that don't exist: ${e.badPics.join(', ')}`);
      // The results card: who reached the new world on this path (the gate fell on the Crash path: the crew and Tamp).
      const want = LANDED[id](e.home);
      expect(JSON.stringify(e.landed) === JSON.stringify(want), `the ${id} results counted ${JSON.stringify(e.landed)}, not ${JSON.stringify(want)}`);
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
