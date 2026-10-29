'use strict';
// Plays the browser build in Chromium, Firefox and WebKit (Safari's engine), both from a web server
// (like GitHub Pages) and straight from disk (like a downloaded folder). Exits non-zero on any failure.
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
  const get = (expr) => page.evaluate(expr);
  try {
    await page.goto(url);
    await page.waitForFunction(() => window.HA && HA.debug && HA.debug.frames > 20, null, { timeout: 15000 });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => HA.ui.mode === 'play', null, { timeout: 5000 });
    const start = await get(() => ({ x: HA.debug.world.player.x, y: HA.debug.world.player.y }));
    await page.keyboard.down('ArrowRight');
    await wait(500);
    await page.keyboard.up('ArrowRight');
    const moved = (await get(() => HA.debug.world.player.x)) - start.x;
    await wait(300);
    const groundY = await get(() => HA.debug.world.player.y);
    await page.keyboard.down('KeyZ');
    let top = groundY;
    for (let i = 0; i < 12; i++) {
      await wait(30);
      top = Math.min(top, await get(() => HA.debug.world.player.y));
    }
    await page.keyboard.up('KeyZ');
    await wait(500);
    await page.keyboard.press('KeyX');
    await wait(60);
    const shots = await get(() => HA.debug.world.shots.length);
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, `${browserType.name()}-${label}.png`) });
    const problems = [];
    if (moved < 20) problems.push(`hero barely moved (${moved.toFixed(1)}px)`);
    if (groundY - top < 20) problems.push(`jump too low (${(groundY - top).toFixed(1)}px)`);
    if (shots < 1) problems.push('fire made no shot');
    problems.push(...errors.map((e) => 'error: ' + e));
    return { ok: problems.length === 0, moved: Math.round(moved), jump: Math.round(groundY - top), shots, problems };
  } catch (e) {
    return { ok: false, problems: [String(e.message || e)].concat(errors) };
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
