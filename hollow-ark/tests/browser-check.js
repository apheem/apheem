'use strict';
// Plays the browser build in Chromium, Firefox and WebKit (Safari's engine), both from a web server
// (like GitHub Pages) and straight from disk (like a downloaded folder). Exits non-zero on any failure.
// Each run plays by hand-held keys first (move, jump, fire), then runs the whole vertical slice quickly
// through the game's debug helpers: rooms, saving, the raid, the boss, the choice, and continuing a save.
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
      out.choice = w().state.flags.choice;
      out.maxHp = w().player.maxHp;
      out.room = w().def.id;
      out.sliceDone = !!w().state.flags.sliceDone;
      out.journal = { story: w().state.journal.story.length, choices: w().state.journal.choices.length, talk: w().state.journal.talk.length };
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
    expect(r.room === 'warrens' && r.sliceDone, 'the reunion and end of the slice did not play');
    expect(r.journal.story >= 5 && r.journal.choices === 1 && r.journal.talk > 20, `the journal is missing entries (${JSON.stringify(r.journal)})`);
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
    const back = await get(() => ({ room: HA.debug.world.def.id, maxHp: HA.debug.world.player.maxHp, choice: HA.debug.world.state.flags.choice }));
    expect(back.room === 'warrens' && back.maxHp === 16 && back.choice === 'salvage', `continuing lost progress (${JSON.stringify(back)})`);

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
