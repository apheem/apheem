'use strict';
// Plays the browser build in Chromium, Firefox and WebKit (Safari's engine), both from a web server
// (like GitHub Pages) and straight from disk (like a downloaded folder). Exits non-zero on any failure.
// Each run plays by hand-held keys first (move, jump, fire), then runs the story so far quickly through the
// game's debug helpers: rooms, saving, the raid, the boss, the choice, the reunion and the night after it,
// and continuing a save. Then it loads a Phase 2 save to check it upgrades, and plays all five endings.
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
      // The morning after: Wick waits in the Bailiff's Hall, whose east door has opened on the way to the Gardens.
      HA.debug.goto('arena', 30, 18);
      HA.debug.step(2);
      out.wickInHall = w().npcs.some((n) => n.id === 'wick');
      out.eastOpen = w().doors.some((d) => d.id === 'east' && d.open);
      HA.debug.step(150, { right: true });
      out.eastToast = w().toastText;
      out.stayedInHall = w().def.id === 'arena';
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
    expect(r.eastOpen && r.stayedInHall && /NEXT BUILD/.test(r.eastToast), `the Hall's east door should be open and lead to a "next build" note (${r.eastToast})`);
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
    expect(back.room === 'arena' && back.maxHp === 16 && back.choice === 'salvage', `continuing lost progress (${JSON.stringify(back)})`);

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
