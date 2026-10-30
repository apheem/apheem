'use strict';
// Plays Hollow Ark in Chromium from a new game to each of its five endings, in one go each, on Normal.
// Nothing is set by hand: every flag, weapon, ability, person and count comes from the game's own scenes,
// pickups, fights and choice screens. The hands it plays with are in playthrough-lib.js; in short, the hero
// moves only within the room they're in (never through a shut door or a wall), leaves rooms by their own exits,
// reads every scene through, and picks each choice on the choice screen. Fights are won with the hero unhurtable
// (the game's invincibility switch), after one fall on purpose in each to prove the fight comes back. At every new area the page is
// reloaded and the game continued from its save, as a player who quit there would.
// Routes: homecoming, crash, dominion, overgrown, deserter (all by default).
//   node playthrough.js [route ...] [--from segment]
// The save at the end of each segment is kept in tests/playthrough-saves/ (the Deserter run starts from one the
// Homecoming run leaves), and --from picks a route up from there.
const http = require('http');
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');

const GAME = path.resolve(__dirname, '..', '..', 'docs', 'hollow-ark');
const SAVES = path.join(__dirname, 'playthrough-saves');
const LIB = fs.readFileSync(path.join(__dirname, 'playthrough-lib.js'), 'utf8');
const KEY = 'hollow-ark.save.v1';
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

// ---- One playthrough ----
class Run {
  constructor(page, name, route) {
    this.page = page;
    this.name = name;
    this.route = route;
    this.policy = route.policy;
    this.log = [];
    this.problems = [];
    this.reloads = 0;
  }

  async boot() {
    await this.page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20 && window.PT, null, { timeout: 20000 });
    await this.page.evaluate((policy) => {
      PT.policy = policy;
      PT.watch();
    }, this.policy);
  }

  // Run PT.<code> in the page, collect what it noted, and continue from the save at each new area.
  async do(code) {
    if (await this.page.evaluate(() => HA.ui.mode === 'title')) return 'title';
    let result;
    try {
      result = await this.page.evaluate(code);
    } finally {
      await this.collect();
    }
    // (Not during the run for the sleds: a game left then starts the run again, which the scuttle tests itself.)
    const quit = await this.page.evaluate(() => {
      const changed = PT.areaChanged;
      PT.areaChanged = false;
      return changed && HA.ui.mode === 'play' && !HA.ui.world.state.flags.running;
    });
    if (quit) await this.reload();
    return result;
  }

  // A value from the game, or null once an ending has gone back to the title.
  async get(expr) {
    return this.page.evaluate(`HA.ui.mode === 'play' ? (${expr}) : null`);
  }

  // Pick up the Bloom bulbs in reach; a route chasing the Bloom eats them too.
  async bulbs() {
    const n = await this.get('HA.ui.world.pickups.filter((k) => k.kind === "bulb").length');
    for (let i = 0; i < n && (await this.get('HA.ui.world.state.bulbs')) < 3; i++) await this.do('PT.take("bulb")');
    if (!this.route.eatBulbs) return;
    while ((await this.get('HA.ui.mode === "play" && HA.ui.world.state.bulbs')) > 0) await this.do('PT.eat()');
  }

  async collect() {
    const got = await this.page.evaluate(() => ({ log: PT.log.splice(0), problems: PT.problems.splice(0) }));
    this.log.push(...got.log);
    this.problems.push(...got.problems);
  }

  // Cross the ship to a room, continuing from the save at each new area on the way.
  async to(room, opts) {
    for (let i = 0; i < 12; i++) {
      const got = await this.do(`PT.walkTo(${JSON.stringify(room)}, ${JSON.stringify(opts || {})})`);
      if (got !== 'area') return got === 'title' ? got : this.do('PT.settle()');
    }
    throw new Error('never got to ' + room);
  }

  // A boss fight, once its fight has started: fall once on purpose, come back to it from wherever the suit
  // reboots, and win it. done is a test in the page that says the fight is won. opts.enter is a step that starts
  // the fight, for one that doesn't start at the room's door (the Silt Mother waits till the hero is over her water).
  async boss(room, done = '!(HA.ui.world.boss && HA.ui.world.boss.fighting)', opts = {}) {
    if (opts.enter) await this.do(opts.enter);
    await this.do(`PT.fight(() => HA.ui.world.boss && HA.ui.world.boss.fighting, { max: 2000, every: 1e9 })`);
    if (opts.fall !== false) {
      await this.do('PT.fall()');
      await this.to(room);
      if (opts.enter) await this.do(opts.enter);
    }
    await this.do(`PT.fight(() => ${done}, ${JSON.stringify(opts.fight || {})})`);
    await this.do('PT.settle()');
  }

  // While writing a route: print where the run is and what's in reach.
  async show(label) {
    console.log(`   [${label || 'state'}] ${JSON.stringify(await this.state())}`);
  }

  async state() {
    return this.page.evaluate(() => PT.state());
  }

  // Quit to the browser and come back: reload the page and pick CONTINUE on the title.
  async reload(expect) {
    const before = await this.state();
    await this.page.reload();
    await this.boot();
    const first = await this.page.evaluate(() => HA.ui.stack[0] && HA.ui.stack[0].items[0].label);
    if (first !== 'CONTINUE') throw new Error(`after a reload in ${before.room}, the title offered ${first} instead of CONTINUE`);
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    this.reloads++;
    await this.do('PT.settle()');
    const after = await this.state();
    this.log.push(`continued in ${after.room} (quit in ${before.room})`);
    if (after.room !== (expect || before.room)) this.problems.push(`quitting in ${before.room} and continuing put the hero in ${after.room}`);
    await this.do('PT.restHere()');
  }

  async newGame() {
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    await this.do('PT.settle()');
  }

  async loadSave(text) {
    await this.page.evaluate(([k, t]) => localStorage.setItem(k, t), [KEY, text]);
    await this.page.reload();
    await this.boot();
    await this.page.keyboard.press('Enter');
    await this.page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    await this.do('PT.settle()');
  }

  async save() {
    return this.page.evaluate((k) => localStorage.getItem(k), KEY);
  }

  expect(ok, what) {
    if (!ok) this.problems.push(what);
  }
}

// ---- The routes ----
// Each route is a choice policy (scene name -> the option to pick) and a list of segments that play it.
const ROUTES = require('./playthrough-routes.js');

async function play(browser, url, name, opts) {
  const route = ROUTES[name];
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(LIB);
  const run = new Run(page, name, route);
  const started = Date.now();
  let segment = '';
  try {
    await page.goto(url);
    await run.boot();
    let segments = route.segments;
    const from = opts.from && segments.findIndex((s) => s.name === opts.from);
    if (route.from || from > 0) {
      // Pick up from a save another route (or an earlier run of this one) wrote at the end of a segment.
      const base = from > 0 ? `${name}-${segments[from - 1].name}` : route.from;
      const file = path.join(SAVES, base + '.json');
      if (!fs.existsSync(file)) throw new Error(`no save ${base} to start from: run that route first`);
      await run.loadSave(fs.readFileSync(file, 'utf8'));
      if (from > 0) segments = segments.slice(from);
      run.log.push(`started from the save ${base}`);
    } else {
      await run.newGame();
    }
    for (const s of segments) {
      segment = s.name;
      await s.play(run);
      const save = await run.save();
      if (save && JSON.parse(save).room) {
        fs.mkdirSync(SAVES, { recursive: true });
        fs.writeFileSync(path.join(SAVES, `${name}-${s.name}.json`), save);
      }
      const st = await run.state();
      run.log.push(`-- ${s.name} done${st ? ` in ${st.room} · mercy ${st.mercy} · bloom ${st.bloom}` : ''}`);
    }
    const end = await page.evaluate(() => ({ mode: HA.ui.mode, seen: HA.save.endings(), ending: PT.ending || null }));
    run.ending = end.ending;
    run.expect(end.mode === 'title' && end.seen.includes(route.ending), `the ${route.ending} ending did not play out to the title and get recorded (${JSON.stringify({ mode: end.mode, seen: end.seen })})`);
    run.expect(end.ending && end.ending.id === route.ending, `the run reached ${end.ending && end.ending.id} instead of ${route.ending}`);
    // The run's clock: every frame played is in one area's split.
    if (end.ending) {
      const sum = Object.values(end.ending.areaTime).reduce((a, b) => a + b, 0);
      run.expect(sum === end.ending.time, `the area splits add up to ${sum} frames, not the ${end.ending.time} played`);
    }
    if (end.ending && route.check) for (const [what, ok] of Object.entries(route.check)) run.expect(ok(end.ending), `${route.ending}: ${what} (${JSON.stringify(end.ending)})`);
  } catch (e) {
    run.problems.push(`stopped in "${segment}": ${e.message.split('\n')[0]}`);
    try {
      await run.collect();
      run.log.push('state: ' + JSON.stringify(await run.state()));
    } catch (e2) {
      // the page itself is gone
    }
  } finally {
    await page.close();
  }
  run.problems.push(...errors.map((e) => 'error: ' + e));
  return { name, ok: run.problems.length === 0, run, seconds: Math.round((Date.now() - started) / 1000) };
}

(async () => {
  const args = process.argv.slice(2);
  const opts = {};
  const fi = args.indexOf('--from');
  if (fi >= 0) opts.from = args[fi + 1];
  const names = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--from');
  const list = names.length ? names : Object.keys(ROUTES);
  const server = await serve();
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await playwright.chromium.launch();
  let failed = false;
  for (const name of list) {
    if (!ROUTES[name]) throw new Error('no route called ' + name);
    const r = await play(browser, url, name, opts);
    failed = failed || !r.ok;
    const e = r.run.ending;
    const facts = e ? `mercy ${e.mercy}, bloom ${e.bloom}, crew ${e.crew}, ${e.choices} choices, ${e.deaths} falls, ` : '';
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${name}: ${r.run.log.filter((l) => /->/.test(l)).length} rooms, ${r.run.reloads} reloads, ${facts}${r.seconds}s`);
    if (!r.ok || process.env.PLAYTHROUGH_LOG) for (const l of r.run.log) console.log('   ' + l);
    for (const p of r.run.problems) console.log(' ! ' + p);
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
