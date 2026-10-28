// Boot, main loop, input and the DOM panels around the field.
(function (GD) {
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) {
      this.rect(x, y, w, h);
    };
  }

  const $ = (id) => document.getElementById(id);
  const STEP = 1 / 60;
  const BOSS_BAR_SPACE = 18;
  const AUTOSAVE_EVERY = 1; // seconds between saves while the field is clear

  const canvas = $('field');
  const stage = $('stage');
  const renderer = new GD.Renderer(canvas);
  const profile = GD.profile;

  let game = new GD.Game({ map: profile.state.map });
  let sel = null; // { c, r } for an empty tile, or { tower }
  let speed = 1;
  let paused = false;
  let running = false;
  let endTimer = 0;
  let acc = 0;
  let last = 0;
  let saveTimer = 0;
  let setupMap = profile.state.map;
  let setupDifficulty = profile.state.difficulty;

  // ---- Game flow ----

  function useGame(g) {
    game = g;
    sel = null;
    speed = 1;
    paused = false;
    endTimer = 0;
    acc = 0;
    saveTimer = 0;
    renderer.reset();
    resize();
  }

  function startRun(mapId, difficulty) {
    profile.clearRun();
    profile.state.map = mapId;
    profile.state.difficulty = difficulty;
    profile.save();
    useGame(new GD.Game(profile.runOptions(mapId, difficulty)));
    running = true;
    showOverlay(null);
  }

  function restartRun() {
    startRun(game.map.id, game.difficulty);
  }

  function continueRun() {
    const snap = profile.loadRun();
    if (!snap) return toTitle();
    useGame(GD.Game.restore(snap));
    running = true;
    showOverlay(null);
  }

  function toTitle() {
    useGame(new GD.Game({ map: profile.state.map }));
    running = false;
    showTitle();
  }

  function setPaused(p) {
    if (!running || game.state !== 'playing') return;
    if (p) autosave(true);
    paused = p;
    showOverlay(p ? 'overlay-pause' : null);
  }

  // Saves the run whenever the field is clear, so it can be continued after the app closes.
  function autosave(now) {
    if (!running || !game.canSave()) return;
    if (!now && saveTimer < AUTOSAVE_EVERY) return;
    saveTimer = 0;
    profile.saveRun(game.snapshot());
  }

  const OVERLAYS = ['overlay-title', 'overlay-setup', 'overlay-lab', 'overlay-pause', 'overlay-cards', 'overlay-end'];
  function showOverlay(id) {
    for (const o of OVERLAYS) $(o).hidden = o !== id;
    if (id === 'overlay-pause') showPause();
  }

  // ---- Title, setup and Lab ----

  function runLabel(r) {
    return GD.maps.find((m) => m.id === r.map).name + ' · ' + GD.difficulties[r.difficulty].name;
  }

  function showTitle() {
    const snap = profile.loadRun();
    $('btn-continue').hidden = !snap;
    if (snap) $('continue-sub').textContent = 'Wave ' + (snap.wave + 1) + ' · ' + runLabel({ map: snap.opts.map || 'circuit', difficulty: snap.opts.difficulty || 'normal' });
    $('btn-play').className = 'btn big' + (snap ? '' : ' primary');
    $('title-data').textContent = profile.state.data;
    const best = profile.state.best;
    $('best-line').hidden = !best || !best.wave;
    if (best && best.wave) $('best-line').textContent = 'Best run: ' + (best.won ? 'cleared all ' + best.wave + ' waves' : 'reached wave ' + best.wave) + ' · ' + runLabel(best);
    showOverlay('overlay-title');
  }

  function showSetup() {
    if (!GD.maps.some((m) => m.id === setupMap && profile.mapUnlocked(m))) setupMap = 'circuit';
    if (!profile.difficultyUnlocked(setupDifficulty)) setupDifficulty = 'normal';
    renderSetup();
    showOverlay('overlay-setup');
  }

  function renderSetup() {
    const maps = $('map-list');
    maps.textContent = '';
    for (const m of GD.maps) {
      const open = profile.mapUnlocked(m);
      const b = el('button', 'btn map-choice' + (m.id === setupMap ? ' selected' : ''));
      b.type = 'button';
      b.disabled = !open;
      const cv = el('canvas', 'map-thumb');
      cv.width = 54;
      cv.height = 84;
      drawMapThumb(cv, m, open);
      b.append(cv, el('span', 'map-name', m.name), el('span', 'map-lock', open ? '' : m.cost + ' Data · Lab'));
      b.addEventListener('click', () => {
        setupMap = m.id;
        renderSetup();
      });
      maps.appendChild(b);
    }
    $('map-blurb').textContent = GD.maps.find((m) => m.id === setupMap).blurb;

    const diffs = $('diff-list');
    diffs.textContent = '';
    for (const id of GD.difficultyOrder) {
      const d = GD.difficulties[id];
      const open = profile.difficultyUnlocked(id);
      const b = el('button', 'seg-btn' + (id === setupDifficulty ? ' selected' : ''), d.name);
      b.type = 'button';
      b.disabled = !open;
      b.addEventListener('click', () => {
        setupDifficulty = id;
        renderSetup();
      });
      diffs.appendChild(b);
    }
    $('diff-note').textContent = describeDifficulty(setupDifficulty);
  }

  function describeDifficulty(id) {
    const d = GD.difficulties[id];
    const parts = [];
    if (d.hp > 1) parts.push('Enemies have ' + Math.round((d.hp - 1) * 100) + '% more HP');
    if (d.speed > 1) parts.push('move ' + Math.round((d.speed - 1) * 100) + '% faster');
    if (d.coreHp < 0) parts.push('Core has ' + -d.coreHp + ' less HP');
    let text = parts.length ? parts.join(', ') + '. ' : 'The standard run. ';
    text += 'Pays ' + d.data + '× Data.';
    const locked = GD.difficultyOrder.find((x) => !profile.difficultyUnlocked(x));
    if (locked) text += ' Win on ' + GD.difficulties[GD.difficulties[locked].unlock].name + ' to unlock ' + GD.difficulties[locked].name + '.';
    return text;
  }

  function showLab() {
    renderLab();
    showOverlay('overlay-lab');
  }

  function renderLab() {
    $('lab-balance').textContent = profile.state.data;
    const list = $('lab-list');
    list.textContent = '';
    for (const item of GD.lab) {
      const lv = profile.level(item.id);
      const cost = profile.nextCost(item.id);
      const row = el('div', 'lab-item');
      const info = el('div', 'lab-info');
      const name = el('span', 'lab-name', item.name);
      if (item.levels.length > 1) {
        const pips = el('span', 'pips');
        for (let i = 0; i < item.levels.length; i++) pips.appendChild(el('i', i < lv ? 'on' : ''));
        name.appendChild(pips);
      }
      info.append(name, el('span', 'lab-text', item.text));
      const buy = el('button', 'btn buy', cost === null ? 'Owned' : cost + ' Data');
      buy.type = 'button';
      buy.disabled = cost === null || profile.state.data < cost;
      buy.addEventListener('click', () => {
        if (profile.buy(item.id)) renderLab();
      });
      row.append(info, buy);
      list.appendChild(row);
    }
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function drawMapThumb(cv, map, open) {
    const g = cv.getContext('2d');
    const cols = GD.config.cols;
    const rows = GD.config.rows;
    const ts = Math.min(cv.width / cols, cv.height / rows);
    const ox = (cv.width - ts * cols) / 2;
    const oy = (cv.height - ts * rows) / 2;
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = open ? 1 : 0.35;
    g.strokeStyle = GD.colors.magenta;
    g.lineWidth = ts * 0.55;
    g.lineJoin = 'miter';
    g.beginPath();
    map.path.forEach(([c, r], i) => {
      const x = ox + (c + 0.5) * ts;
      const y = oy + (Math.max(0, r) + (r < 0 ? 0 : 0.5)) * ts;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke();
    const [cc, cr] = map.path[map.path.length - 1];
    g.fillStyle = GD.colors.cyan;
    g.beginPath();
    g.arc(ox + (cc + 0.5) * ts, oy + (cr + 0.5) * ts, ts * 0.6, 0, Math.PI * 2);
    g.fill();
  }

  // ---- Upgrade cards ----

  function cardTag(card) {
    if (card.tower) return { label: GD.towers[card.tower].name, color: GD.towers[card.tower].color };
    return card.kind === 'econ' ? { label: 'Economy', color: GD.colors.amber } : { label: 'Core', color: GD.colors.cyan };
  }

  function showCards() {
    const offer = game.offers[0];
    const cleared = GD.cardWaves.filter((w) => w <= game.wave)[game.cards.length] || game.wave;
    $('cards-eyebrow').textContent = 'Wave ' + cleared + ' cleared';
    const box = $('card-choices');
    box.textContent = '';
    for (const id of offer.ids) {
      const card = GD.cards.find((c) => c.id === id);
      const tag = cardTag(card);
      const b = el('button', 'btn choice');
      b.type = 'button';
      b.style.setProperty('--edge', tag.color);
      b.style.setProperty('--tag', tag.color);
      b.append(el('span', 'choice-tag', tag.label), el('span', 'choice-name', card.name), el('span', 'choice-text', card.text));
      b.addEventListener('click', () => {
        game.pickCard(id);
        showOverlay(null);
        autosave(true);
      });
      box.appendChild(b);
    }
    $('btn-reroll').hidden = !game.canReroll || offer.rerolled;
    sel = null;
    showOverlay('overlay-cards');
  }

  function showPause() {
    $('pause-sub').textContent = runLabel({ map: game.map.id, difficulty: game.difficulty }) + ' · Wave ' + game.wave + '/' + game.totalWaves;
    const names = game.cards.map((id) => GD.cards.find((c) => c.id === id).name);
    $('owned').hidden = names.length === 0;
    $('owned-list').textContent = names.join(' · ');
  }

  function showEnd() {
    const won = game.state === 'won';
    const title = $('end-title');
    title.textContent = won ? 'Sector clear' : 'Core breached';
    title.className = 'overlay-title ' + (won ? 'won' : 'lost');
    $('end-wave').textContent = game.wave + '/' + game.totalWaves;
    $('end-kills').textContent = game.stats.kills;
    $('end-hp').textContent = game.hp;
    profile.clearRun();
    const result = profile.finishRun(game);
    $('end-data').textContent = '+' + result.data + ' Data · ' + profile.state.data + ' total';
    $('end-unlock').hidden = !result.unlocked.length;
    $('end-unlock').textContent = result.unlocked.map((n) => n + ' difficulty unlocked').join(' · ');
    showOverlay('overlay-end');
  }

  // ---- Main loop ----

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
    last = ts;
    if (running && !paused && game.offers.length && $('overlay-cards').hidden) showCards();
    const live = running && !paused && !game.offers.length;

    if (live) {
      saveTimer += dt;
      autosave(false);
    }

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
    if (!running || paused || game.offers.length || game.state !== 'playing') return;
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
  $('btn-target').addEventListener('click', () => sel && sel.tower && game.cycleMode(sel.tower));
  $('btn-sell').addEventListener('click', () => {
    if (sel && sel.tower) game.sell(sel.tower);
    sel = null;
  });
  $('btn-wave').addEventListener('click', () => game.startNextWave());
  $('btn-speed').addEventListener('click', () => (speed = speed === 3 ? 1 : speed + 1));
  $('btn-pause').addEventListener('click', () => setPaused(true));
  $('btn-resume').addEventListener('click', () => setPaused(false));
  $('btn-restart').addEventListener('click', restartRun);
  $('btn-quit').addEventListener('click', toTitle);
  $('btn-continue').addEventListener('click', continueRun);
  $('btn-play').addEventListener('click', showSetup);
  $('btn-lab').addEventListener('click', showLab);
  $('btn-start').addEventListener('click', () => startRun(setupMap, setupDifficulty));
  $('btn-setup-back').addEventListener('click', showTitle);
  $('btn-setup-lab').addEventListener('click', showLab);
  $('btn-lab-back').addEventListener('click', showTitle);
  $('btn-again').addEventListener('click', restartRun);
  $('btn-title').addEventListener('click', toTitle);
  $('btn-reroll').addEventListener('click', () => {
    if (game.reroll()) showCards();
  });

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
    else if (prop === 'style') el.style.cssText = value;
    else el[prop] = value;
  }

  const roman = ['I', 'II', 'III'];
  const cards = {};
  document.querySelectorAll('[data-tower]').forEach((b) => (cards[b.dataset.tower] = b));

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
      for (const type of GD.towerOrder) {
        const cost = game.buildCost(type);
        set('cost-' + type, 'textContent', String(cost));
        cards[type].classList.toggle('poor', game.gold < cost);
      }
    }
    if (mode === 'tower') updateTowerPanel(sel.tower);
    updateBossBar();
  }

  function updateBossBar() {
    const boss = game.enemies.find((e) => e.boss && !e.dead);
    set('boss-bar', 'hidden', !boss);
    if (!boss) return;
    set('boss-name', 'textContent', GD.enemies[boss.type].name);
    set('boss-fill', 'style', 'width:' + Math.max(0, (boss.hp / boss.maxHp) * 100).toFixed(1) + '%');
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
      sub = '+' + GD.config.earlyCallBonus + ' gold · ' + describeWave(preview);
      cls += ' early';
    } else {
      main = 'Start wave ' + preview.wave;
      sub = describeWave(preview);
    }
    set('wave-main', 'textContent', main);
    set('wave-sub', 'textContent', sub);
    set('btn-wave', 'class', cls);
    set('btn-wave', 'disabled', disabled);

    let hint = '';
    if (game.towers.length === 0) hint = 'Tap an empty tile to build a tower.';
    else if (game.wave === 0) hint = 'Tap a tower to upgrade or sell it.';
    else if (preview && preview.newType && !game.spawnQueue.length) hint = 'Next up: ' + GD.enemies[preview.newType].intro;
    set('idle-hint', 'textContent', hint);
  }

  // "10 drones · 4 darts", largest groups first, at most three kinds.
  function describeWave(preview) {
    const parts = Object.entries(preview.counts).filter(([type]) => type !== preview.boss).sort((a, b) => b[1] - a[1]);
    const text = parts.slice(0, preview.boss ? 2 : 3).map(([type, n]) => n + ' ' + (n === 1 ? GD.enemies[type].name.toLowerCase() : GD.enemies[type].plural));
    if (preview.boss) text.unshift('Boss: ' + GD.enemies[preview.boss].name);
    return text.join(' · ') + (parts.length > (preview.boss ? 2 : 3) ? ' · more' : '');
  }

  const STAT_LABELS = {
    damage: ['Damage', (v) => String(Math.round(v))],
    rate: ['Shots/s', (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1))],
    range: ['Range', (v) => v.toFixed(1)],
    splash: ['Blast', (v) => v.toFixed(1)],
    slow: ['Slow', (v) => Math.round(v * 100) + '%'],
  };

  function updateTowerPanel(t) {
    const def = GD.towers[t.type];
    const s = game.statsFor(t.type, t.tier);
    const n = t.tier + 1 < def.tiers.length ? game.statsFor(t.type, t.tier + 1) : null;
    set('tower-title', 'textContent', def.name + ' · Tier ' + roman[t.tier]);
    def.stats.forEach((key, i) => {
      const [label, fmt] = STAT_LABELS[key];
      const next = n && fmt(n[key]) !== fmt(s[key]) ? '<span class="next">→' + fmt(n[key]) + '</span>' : '';
      set('ts-label-' + i, 'textContent', label);
      set('ts-value-' + i, 'innerHTML', fmt(s[key]) + next);
    });
    set('btn-target', 'hidden', !t.mode);
    if (t.mode) set('btn-target', 'textContent', 'Target: ' + GD.targetModes[t.mode]);
    const cost = game.upgradeCost(t);
    set('btn-upgrade', 'textContent', cost === null ? 'Max tier' : 'Upgrade · ' + cost);
    set('btn-upgrade', 'disabled', cost === null || game.gold < cost);
    set('btn-sell', 'textContent', 'Sell +' + game.sellValue(t));
  }

  // ---- Card icons ----

  function drawIcons() {
    document.querySelectorAll('canvas[data-icon]').forEach((cv) => {
      const g = cv.getContext('2d');
      const k = cv.width / 28;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, 28, 28);
      const color = GD.towers[cv.dataset.icon].color;
      g.lineWidth = 1.6;
      g.strokeStyle = color;
      g.fillStyle = color;
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
    if (r.width > 0 && r.height > 0) renderer.resize(r.width, r.height, game, BOSS_BAR_SPACE);
  }

  // Handle for poking at a live run from the browser console or automated tests.
  GD.debug = { get game() { return game; } };

  new ResizeObserver(resize).observe(stage);
  window.addEventListener('orientationchange', resize);
  drawIcons();
  showTitle();
  resize();
  requestAnimationFrame(frame);
})(window.GD = window.GD || {});
