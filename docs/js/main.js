// Boot, main loop, input and the DOM panels around the field.
(function (GD) {
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
      this.rect(x, y, w, h);
    };
  }

  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 60;
  const BEST_KEY = 'glitch-defense.best';

  const canvas = $('field');
  const stage = $('stage');
  const renderer = new GD.Renderer(canvas);

  let game = new GD.Game(0);
  let sel = null; // { c, r } for an empty tile, or { tower }
  let speed = 1;
  let paused = false;
  let running = false;
  let endTimer = 0;
  let acc = 0;
  let last = 0;

  // ---- Persistence (best run) ----

  function loadBest() {
    try {
      return JSON.parse(localStorage.getItem(BEST_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  // Score a run so that a win beats any loss, then the furthest wave reached wins.
  const score = (b) => (b ? b.wave + (b.won ? 100 : 0) : 0);

  function saveBest(g) {
    const run = { wave: g.wave, won: g.state === 'won' };
    if (score(loadBest()) >= score(run)) return;
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(run));
    } catch (e) {
      // Storage can be unavailable (private mode); the best score just isn't kept.
    }
  }

  function showBest() {
    const best = loadBest();
    const el = $('best-line');
    if (!best || !best.wave) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = best.won ? 'Best run: all ' + best.wave + ' waves cleared' : 'Best run: reached wave ' + best.wave;
  }

  // ---- Game flow ----

  function newGame() {
    game = new GD.Game(0);
    sel = null;
    speed = 1;
    paused = false;
    endTimer = 0;
    acc = 0;
    renderer.reset();
    resize();
  }

  function startRun() {
    newGame();
    running = true;
    showOverlay(null);
  }

  function toTitle() {
    newGame();
    running = false;
    showBest();
    showOverlay('overlay-title');
  }

  function setPaused(p) {
    if (!running || game.state !== 'playing') return;
    paused = p;
    showOverlay(p ? 'overlay-pause' : null);
  }

  function showOverlay(id) {
    for (const o of ['overlay-title', 'overlay-pause', 'overlay-end']) $(o).hidden = o !== id;
  }

  function showEnd() {
    const won = game.state === 'won';
    const title = $('end-title');
    title.textContent = won ? 'Sector clear' : 'Core breached';
    title.className = 'overlay-title ' + (won ? 'won' : 'lost');
    $('end-wave').textContent = game.wave + '/' + game.totalWaves;
    $('end-kills').textContent = game.stats.kills;
    $('end-hp').textContent = game.hp;
    saveBest(game);
    showOverlay('overlay-end');
  }

  // ---- Main loop ----

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    const live = running && !paused;

    if (live && game.state === 'playing') {
      acc += dt * speed;
      let n = 0;
      while (acc >= STEP && n < 12) {
        game.update(STEP);
        acc -= STEP;
        n++;
      }
      if (n === 12) acc = 0;
    }

    if (running && game.state !== 'playing' && $('overlay-end').hidden) {
      endTimer += dt;
      if (endTimer > 1.2) showEnd();
    }

    if (sel && sel.tower && !game.towers.includes(sel.tower)) sel = null;
    renderer.consume(game);
    renderer.draw(game, sel, live ? dt * speed : running ? 0 : dt);
    updateUI();
  }

  // ---- Input ----

  canvas.addEventListener('pointerdown', (e) => {
    if (!running || paused || game.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const { c, r } = renderer.toTile(e.clientX - rect.left, e.clientY - rect.top);
    const tower = game.towerAt(c, r);
    if (tower) sel = sel && sel.tower === tower ? null : { tower };
    else if (game.canBuild(c, r)) sel = sel && !sel.tower && sel.c === c && sel.r === r ? null : { c, r };
    else sel = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => (sel = null)));

  document.querySelectorAll('[data-tower]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!sel || sel.tower) return;
      if (game.build(b.dataset.tower, sel.c, sel.r)) sel = null;
    })
  );

  $('btn-upgrade').addEventListener('click', () => sel && sel.tower && game.upgrade(sel.tower));
  $('btn-sell').addEventListener('click', () => {
    if (sel && sel.tower) game.sell(sel.tower);
    sel = null;
  });
  $('btn-wave').addEventListener('click', () => game.startNextWave());
  $('btn-speed').addEventListener('click', () => (speed = speed === 3 ? 1 : speed + 1));
  $('btn-pause').addEventListener('click', () => setPaused(true));
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-restart').addEventListener('click', startRun);
  $('btn-quit').addEventListener('click', toTitle);
  $('btn-play').addEventListener('click', startRun);
  $('btn-again').addEventListener('click', startRun);
  $('btn-title').addEventListener('click', toTitle);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });

  // ---- DOM panels ----

  const cache = new Map();
  function set(id, prop, value) {
    const key = id + '.' + prop;
    if (cache.get(key) === value) return;
    cache.set(key, value);
    const el = $(id);
    if (prop === 'hidden' || prop === 'disabled') el[prop] = value;
    else if (prop === 'class') el.className = value;
    else el[prop] = value;
  }

  const roman = ['I', 'II', 'III'];

  function updateUI() {
    set('hud-hp', 'textContent', String(game.hp));
    set('stat-core', 'class', 'stat core' + (game.hp / game.maxHp <= 0.3 ? ' low' : ''));
    set('hud-gold', 'textContent', String(game.gold));
    set('hud-wave', 'textContent', game.wave + '/' + game.totalWaves);
    set('btn-speed', 'textContent', speed + '×');

    const mode = sel ? (sel.tower ? 'tower' : 'build') : 'idle';
    set('panel-idle', 'hidden', mode !== 'idle');
    set('panel-build', 'hidden', mode !== 'build');
    set('panel-tower', 'hidden', mode !== 'tower');

    if (mode === 'idle') updateWaveButton();
    if (mode === 'build') {
      const cost = GD.towers.pulse.tiers[0].cost;
      set('cost-pulse', 'textContent', String(cost));
      const card = document.querySelector('[data-tower="pulse"]');
      card.classList.toggle('poor', game.gold < cost);
    }
    if (mode === 'tower') updateTowerPanel(sel.tower);
  }

  function updateWaveButton() {
    let main;
    let sub;
    let cls = 'btn primary wave-btn';
    let disabled = false;
    const preview = game.nextWavePreview();
    if (game.state !== 'playing') {
      main = game.state === 'won' ? 'Sector clear' : 'Core breached';
      sub = '';
      disabled = true;
    } else if (game.spawnQueue.length) {
      main = 'Wave ' + game.wave + ' incoming';
      sub = game.spawnQueue.length + ' more on the way';
      disabled = true;
    } else if (!preview) {
      main = 'Final wave';
      sub = 'Clear the field to win';
      disabled = true;
    } else if (game.enemies.length) {
      main = 'Call wave ' + preview.wave + ' early';
      sub = '+' + GD.config.earlyCallBonus + ' gold · ' + preview.count + ' drones';
      cls += ' early';
    } else {
      main = 'Start wave ' + preview.wave;
      sub = preview.count + ' drones';
    }
    set('wave-main', 'textContent', main);
    set('wave-sub', 'textContent', sub);
    set('btn-wave', 'class', cls);
    set('btn-wave', 'disabled', disabled);

    let hint = '';
    if (game.towers.length === 0) hint = 'Tap an empty tile to build a tower.';
    else if (game.wave === 0) hint = 'Tap a tower to upgrade or sell it.';
    set('idle-hint', 'textContent', hint);
  }

  function updateTowerPanel(t) {
    const def = GD.towers[t.type];
    const s = def.tiers[t.tier];
    const n = def.tiers[t.tier + 1];
    const stat = (cur, next, fmt) => fmt(cur) + (n && next !== cur ? '<span class="next">→' + fmt(next) + '</span>' : '');
    const int = (v) => String(v);
    const one = (v) => v.toFixed(1);
    set('tower-title', 'textContent', def.name + ' · Tier ' + roman[t.tier]);
    set('ts-damage', 'innerHTML', stat(s.damage, n && n.damage, int));
    set('ts-rate', 'innerHTML', stat(s.rate, n && n.rate, one));
    set('ts-range', 'innerHTML', stat(s.range, n && n.range, one));
    const cost = game.upgradeCost(t);
    set('btn-upgrade', 'textContent', cost === null ? 'Max tier' : 'Upgrade · ' + cost);
    set('btn-upgrade', 'disabled', cost === null || game.gold < cost);
    set('btn-sell', 'textContent', 'Sell +' + game.sellValue(t));
  }

  // ---- Card icons ----

  function drawIcons() {
    const C = GD.colors;
    document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
      const g = cv.getContext('2d');
      const k = cv.width / 28;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, 28, 28);
      g.lineWidth = 1.6;
      g.strokeStyle = C.cyan;
      g.fillStyle = C.cyan;
      switch (cv.dataset.icon) {
        case 'pulse':
          g.strokeRect(4, 4, 20, 20);
          g.beginPath();
          g.arc(14, 14, 5, 0, Math.PI * 2);
          g.stroke();
          g.fillRect(14, 12.8, 10, 2.4);
          break;
        case 'nova':
          for (const r of [3, 7, 11]) {
            g.beginPath();
            g.arc(14, 14, r, 0, Math.PI * 2);
            g.stroke();
          }
          break;
        case 'cryo':
          for (let i = 0; i < 3; i++) {
            const a = (i * Math.PI) / 3;
            g.beginPath();
            g.moveTo(14 - Math.cos(a) * 11, 14 - Math.sin(a) * 11);
            g.lineTo(14 + Math.cos(a) * 11, 14 + Math.sin(a) * 11);
            g.stroke();
          }
          break;
        case 'rail':
          g.beginPath();
          g.arc(9, 19, 5, 0, Math.PI * 2);
          g.stroke();
          g.beginPath();
          g.moveTo(12, 16);
          g.lineTo(25, 3);
          g.stroke();
          break;
      }
    });
  }

  // ---- Boot ----

  function resize() {
    const r = stage.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) renderer.resize(r.width, r.height, game);
  }

  new ResizeObserver(resize).observe(stage);
  window.addEventListener('orientationchange', resize);
  drawIcons();
  showBest();
  resize();
  requestAnimationFrame(frame);
})(window.GD = window.GD || {});
