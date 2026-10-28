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
  let aiming = null; // ability waiting for a tap on the field
  let labTab = 'core';
  let labBack = null; // screen to return to from the Lab

  GD.applySkin(profile.state.skin);

  // ---- Game flow ----

  function useGame(g) {
    game = g;
    sel = null;
    aiming = null;
    speed = 1;
    paused = false;
    endTimer = 0;
    acc = 0;
    saveTimer = 0;
    renderer.reset();
    applyTheme();
    buildAbilityButtons();
    resize();
  }

  // The page around the field takes on the sector's background color.
  function applyTheme() {
    const th = GD.themes[game.map.theme];
    const root = document.documentElement.style;
    root.setProperty('--bg', th.bg);
    root.setProperty('--overlay', GD.rgba(th.bg, 0.86));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = th.bg;
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

  function sectorLabel(map) {
    return 'Sector ' + (GD.maps.indexOf(map) + 1) + ' · ' + map.name;
  }

  function runLabel(r) {
    return sectorLabel(GD.maps.find((m) => m.id === r.map) || GD.maps[0]) + ' · ' + GD.difficulties[r.difficulty].name;
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
    GD.maps.forEach((m, i) => {
      const open = profile.mapUnlocked(m);
      const b = el('button', 'btn map-choice' + (m.id === setupMap ? ' selected' : ''));
      b.type = 'button';
      b.disabled = !open;
      b.style.setProperty('--theme', GD.themes[m.theme].edge);
      const cv = el('canvas', 'map-thumb');
      cv.width = 54;
      cv.height = 84;
      drawMapThumb(cv, m, open);
      const marks = el('span', 'clears');
      for (const d of GD.difficultyOrder) {
        const mark = el('i', profile.cleared(m.id, d) ? 'on' : '');
        mark.title = GD.difficulties[d].name;
        marks.appendChild(mark);
      }
      b.append(el('span', 'map-num', String(i + 1).padStart(2, '0')), cv, el('span', 'map-name', m.name), open ? marks : el('span', 'map-lock', 'Win ' + String(i).padStart(2, '0')));
      b.addEventListener('click', () => {
        setupMap = m.id;
        renderSetup();
      });
      maps.appendChild(b);
    });
    const map = GD.maps.find((m) => m.id === setupMap);
    $('map-name').textContent = sectorLabel(map);
    $('map-blurb').textContent = map.blurb;
    $('map-twist').textContent = map.twist + (map.data > 1 ? ' Pays ' + map.data + '× Data.' : '');

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

  const LAB_NOTES = {
    core: 'Every run pays Data, win or lose. Unlocks are permanent.',
    arsenal: 'New towers join the build menu. Abilities appear above the wave button during a run.',
    research: 'Permanent upgrades for each tower, applied at the start of every run.',
    cards: 'Each card joins the pool you draw from every third wave.',
    style: 'Tower colors and plate shapes. Switch any time, even mid-run.',
  };

  function showLab(from) {
    labBack = from;
    renderLab();
    showOverlay('overlay-lab');
  }

  function renderLab() {
    $('lab-balance').textContent = profile.state.data;
    const tabs = $('lab-tabs');
    tabs.textContent = '';
    for (const tab of GD.labTabs) {
      const b = el('button', 'seg-btn' + (tab.id === labTab ? ' selected' : ''), tab.name);
      b.type = 'button';
      b.addEventListener('click', () => {
        labTab = tab.id;
        renderLab();
        $('overlay-lab').scrollTop = 0;
      });
      tabs.appendChild(b);
    }
    $('lab-note').textContent = LAB_NOTES[labTab];

    const list = $('lab-list');
    list.textContent = '';
    for (const item of GD.lab.filter((i) => i.tab === labTab)) {
      const lv = profile.level(item.id);
      const cost = profile.nextCost(item.id);
      const blocked = profile.blocked(item);
      const row = el('div', 'lab-item' + (blocked ? ' blocked' : ''));
      const info = el('div', 'lab-info');
      const name = el('span', 'lab-name', item.name);
      if (item.levels.length > 1) {
        const pips = el('span', 'pips');
        for (let i = 0; i < item.levels.length; i++) pips.appendChild(el('i', i < lv ? 'on' : ''));
        name.appendChild(pips);
      }
      let text = item.text;
      if (blocked) text += ' Unlock ' + GD.lab.find((i) => i.id === item.requires).name + ' first.';
      else if (item.more && lv > 0 && cost !== null) text += ' ' + item.more;
      info.append(name, el('span', 'lab-text', text));
      row.append(labIcon(item), info, labButton(item, cost, blocked));
      list.appendChild(row);
    }
  }

  function labButton(item, cost, blocked) {
    if (item.skin && profile.ownsSkin(item.skin)) {
      const on = profile.state.skin === item.skin;
      const b = el('button', 'btn buy equip' + (on ? ' on' : ''), on ? 'Equipped' : 'Equip');
      b.type = 'button';
      b.disabled = on;
      b.addEventListener('click', () => {
        profile.setSkin(item.skin);
        GD.applySkin(item.skin);
        drawIcons();
        renderLab();
      });
      return b;
    }
    const b = el('button', 'btn buy', cost === null ? 'Owned' : blocked ? 'Locked' : cost + ' Data');
    b.type = 'button';
    b.disabled = cost === null || blocked || profile.state.data < cost;
    b.addEventListener('click', () => {
      if (profile.buy(item.id)) renderLab();
    });
    return b;
  }

  // Small picture beside a Lab item: the tower, ability glyph or color swatches.
  function labIcon(item) {
    const box = el('span', 'lab-icon');
    if (item.skin) {
      const skin = GD.skins[item.skin];
      box.classList.add('swatches');
      for (const t of ['pulse', 'nova', 'rail', 'laser']) {
        const dot = el('i');
        dot.style.background = skin.towers[t];
        box.appendChild(dot);
      }
      return box;
    }
    const cv = el('canvas');
    cv.width = 56;
    cv.height = 56;
    if (item.tower) cv.dataset.icon = item.tower;
    else if (item.ability) cv.dataset.ability = item.ability;
    else cv.dataset.glyph = item.tab === 'cards' ? 'card' : item.id;
    drawIcon(cv);
    box.appendChild(cv);
    return box;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Sector preview in its theme colors.
  function drawMapThumb(cv, map, open) {
    const g = cv.getContext('2d');
    const th = GD.themes[map.theme];
    const cols = GD.config.cols;
    const rows = GD.config.rows;
    const ts = Math.min(cv.width / cols, cv.height / rows);
    const ox = (cv.width - ts * cols) / 2;
    const oy = (cv.height - ts * rows) / 2;
    g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = open ? 1 : 0.35;
    g.fillStyle = th.bg;
    g.fillRect(ox, oy, ts * cols, ts * rows);
    g.fillStyle = GD.rgba(th.tile, 0.12);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) g.fillRect(ox + c * ts + 0.5, oy + r * ts + 0.5, ts - 1, ts - 1);
    g.strokeStyle = th.edge;
    g.lineWidth = ts * 0.55;
    g.lineJoin = 'miter';
    g.beginPath();
    for (const path of map.paths) {
      path.forEach(([c, r], i) => {
        const x = ox + (c + 0.5) * ts;
        const y = oy + (Math.max(0, r) + (r < 0 ? 0 : 0.5)) * ts;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
    }
    g.stroke();
    const [cc, cr] = map.paths[0][map.paths[0].length - 1];
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
    $('end-unlock').textContent = result.unlocked.join(' · ');
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
    if (aiming) {
      const p = renderer.toField(e.clientX - rect.left, e.clientY - rect.top);
      if (p.x >= 0 && p.y >= 0 && p.x <= game.cols && p.y <= game.rows) game.useAbility(aiming, p.x, p.y);
      aiming = null;
      return;
    }
    const { c, r } = renderer.toTile(e.clientX - rect.left, e.clientY - rect.top);
    const tower = game.towerAt(c, r);
    if (tower) sel = sel && sel.tower === tower ? null : { tower };
    else if (game.canBuild(c, r)) sel = sel && !sel.tower && sel.c === c && sel.r === r ? null : { c, r };
    else sel = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => (sel = null)));

  // Build menu: one card per tower. Towers still locked in the Lab show up dimmed.
  const cards = {};
  for (const type of GD.towerOrder) {
    const def = GD.towers[type];
    const b = el('button', 'btn card');
    b.type = 'button';
    b.dataset.tower = type;
    const cv = el('canvas', 'card-icon');
    cv.width = 56;
    cv.height = 56;
    cv.dataset.icon = type;
    const cost = el('span', 'card-cost', String(def.tiers[0].cost));
    cost.id = 'cost-' + type;
    b.append(cv, el('span', 'card-name', def.name), cost);
    b.addEventListener('click', () => {
      if (!sel || sel.tower) return;
      if (game.build(type, sel.c, sel.r)) sel = null;
    });
    $('build-cards').appendChild(b);
    cards[type] = b;
  }

  // Ability buttons for the abilities this run has, rebuilt whenever a run starts.
  const abilityButtons = {};
  function buildAbilityButtons() {
    const row = $('abilities');
    row.textContent = '';
    for (const k in abilityButtons) delete abilityButtons[k];
    for (const id of GD.abilityOrder) {
      if (!game.abilities[id]) continue;
      const def = GD.abilities[id];
      const b = el('button', 'btn ability');
      b.type = 'button';
      b.style.setProperty('--edge', def.color);
      b.style.setProperty('--tint', def.color);
      const cv = el('canvas', 'ability-icon');
      cv.width = 40;
      cv.height = 40;
      cv.dataset.ability = id;
      drawIcon(cv);
      const label = el('span', 'ability-label', def.short);
      b.append(el('span', 'ability-fill'), cv, label);
      b.addEventListener('click', () => {
        if (!running || paused || game.state !== 'playing' || game.abilityCharge(id) < 1) return;
        if (def.aim) {
          aiming = aiming === id ? null : id;
          sel = null;
        } else game.useAbility(id);
      });
      row.appendChild(b);
      abilityButtons[id] = { button: b, label };
    }
    row.hidden = !Object.keys(abilityButtons).length;
  }

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
  $('btn-lab').addEventListener('click', () => showLab(showTitle));
  $('btn-start').addEventListener('click', () => startRun(setupMap, setupDifficulty));
  $('btn-setup-back').addEventListener('click', showTitle);
  $('btn-setup-lab').addEventListener('click', () => showLab(showSetup));
  $('btn-lab-back').addEventListener('click', () => (labBack || showTitle)());
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

    if (mode === 'idle') {
      updateWaveButton();
      updateAbilities();
    }
    if (mode === 'build') {
      for (const type of GD.towerOrder) {
        const open = game.available.includes(type);
        const cost = game.buildCost(type);
        set('cost-' + type, 'textContent', open ? String(cost) : 'Lab');
        cards[type].classList.toggle('poor', open && game.gold < cost);
        cards[type].classList.toggle('locked', !open);
        cards[type].disabled = !open;
      }
    }
    renderer.aim = !!aiming;
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
    if (aiming) hint = 'Tap the field to aim the ' + GD.abilities[aiming].name + '.';
    else if (game.towers.length === 0) hint = 'Tap an empty tile to build a tower.';
    else if (game.wave === 0) hint = 'Tap a tower to upgrade or sell it.';
    else if (preview && preview.newType && !game.spawnQueue.length) hint = 'Next up: ' + GD.enemies[preview.newType].intro;
    set('idle-hint', 'textContent', hint);
  }

  function updateAbilities() {
    for (const [id, { button, label }] of Object.entries(abilityButtons)) {
      const charge = game.abilityCharge(id);
      const ready = charge >= 1 && game.state === 'playing';
      button.style.setProperty('--p', charge.toFixed(3));
      button.classList.toggle('ready', ready);
      button.classList.toggle('aiming', aiming === id);
      const text = ready ? GD.abilities[id].short : Math.ceil(game.abilities[id].cd) + 's';
      if (label.textContent !== text) label.textContent = text;
    }
    if (aiming && (game.state !== 'playing' || game.abilityCharge(aiming) < 1)) aiming = null;
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
    dps: ['Damage/s', (v) => String(Math.round(v))],
    rate: ['Shots/s', (v) => (v < 1 ? v.toFixed(2) : v.toFixed(1))],
    range: ['Range', (v) => v.toFixed(1)],
    splash: ['Blast', (v) => v.toFixed(1)],
    slow: ['Slow', (v) => Math.round(v * 100) + '%'],
    chains: ['Jumps', (v) => String(v)],
    ramp: ['Full heat', (v) => '×' + v.toFixed(1)],
    boost: ['Boost', (v) => '+' + Math.round(v * 100) + '%'],
    linked: ['Boosting', (v) => String(v)],
    income: ['Per wave', (v) => '+' + v],
    earned: ['Mined', (v) => String(v)],
  };

  function updateTowerPanel(t) {
    const def = GD.towers[t.type];
    // linked and earned belong to this tower, not its tier.
    const s = Object.assign(game.towerStats(t), { linked: t.links ? t.links.length : 0, earned: t.earned || 0 });
    const n = t.tier + 1 < def.tiers.length ? game.statsFor(t.type, t.tier + 1, t.boost) : null;
    set('tower-title', 'textContent', def.name + ' · Tier ' + roman[t.tier] + (t.boost ? ' · +' + Math.round(t.boost * 100) + '%' : ''));
    for (let i = 0; i < 3; i++) {
      const key = def.stats[i];
      set('ts-cell-' + i, 'hidden', !key);
      if (!key) continue;
      const [label, fmt] = STAT_LABELS[key];
      const next = n && n[key] !== undefined && fmt(n[key]) !== fmt(s[key]) ? '<span class="next">→' + fmt(n[key]) + '</span>' : '';
      set('ts-label-' + i, 'textContent', label);
      set('ts-value-' + i, 'innerHTML', fmt(s[key]) + next);
    }
    set('btn-target', 'hidden', !t.mode);
    if (t.mode) set('btn-target', 'textContent', 'Target: ' + GD.targetModes[t.mode]);
    const cost = game.upgradeCost(t);
    set('btn-upgrade', 'textContent', cost === null ? 'Max tier' : 'Upgrade · ' + cost);
    set('btn-upgrade', 'disabled', cost === null || game.gold < cost);
    set('btn-sell', 'textContent', 'Sell +' + game.sellValue(t));
  }

  // ---- Icons ----

  // Draws the icon a canvas asks for: data-icon (tower), data-ability or data-glyph (other Lab items).
  function drawIcon(cv) {
    const g = cv.getContext('2d');
    const k = cv.width / 28;
    g.setTransform(k, 0, 0, k, 0, 0);
    g.clearRect(0, 0, 28, 28);
    g.lineWidth = 1.6;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const line = (...pts) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
    };
    const ring = (x, y, r) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    };
    const id = cv.dataset.icon || cv.dataset.ability || cv.dataset.glyph;
    let color = GD.colors.cyan;
    if (cv.dataset.icon) color = GD.towers[id].color;
    else if (cv.dataset.ability) color = GD.abilities[id].color;
    else if (id === 'gold' || id === 'miner') color = GD.colors.amber;
    else if (id === 'card') color = '#a77bff';
    g.strokeStyle = color;
    g.fillStyle = color;
    switch (id) {
      case 'pulse':
        g.strokeRect(4, 4, 20, 20);
        ring(14, 14, 5);
        g.fillRect(14, 12.8, 10, 2.4);
        break;
      case 'nova':
        for (const r of [3, 7, 11]) ring(14, 14, r);
        break;
      case 'cryo':
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI) / 3;
          line([14 - Math.cos(a) * 11, 14 - Math.sin(a) * 11], [14 + Math.cos(a) * 11, 14 + Math.sin(a) * 11]);
        }
        break;
      case 'rail':
        ring(9, 19, 5);
        line([12, 16], [25, 3]);
        break;
      case 'tesla':
        line([16, 2], [8, 15], [15, 15], [11, 26], [21, 11], [14, 11], [18, 2]);
        break;
      case 'laser':
        line([3, 24], [19, 8]);
        g.beginPath();
        g.moveTo(24, 3);
        g.lineTo(25, 8);
        g.lineTo(20, 7);
        g.closePath();
        g.fill();
        ring(5, 22, 3);
        break;
      case 'amp':
        g.beginPath();
        g.moveTo(14, 8);
        g.lineTo(18, 14);
        g.lineTo(14, 20);
        g.lineTo(10, 14);
        g.closePath();
        g.fill();
        g.beginPath();
        g.arc(14, 14, 10, -0.7, 0.7);
        g.stroke();
        g.beginPath();
        g.arc(14, 14, 10, Math.PI - 0.7, Math.PI + 0.7);
        g.stroke();
        break;
      case 'harvester':
        g.beginPath();
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const r = i % 2 ? 8 : 11;
          g.lineTo(14 + Math.cos(a) * r, 14 + Math.sin(a) * r);
        }
        g.closePath();
        g.stroke();
        ring(14, 14, 3.5);
        break;
      case 'strike':
        ring(14, 14, 9);
        line([14, 1], [14, 9]);
        line([14, 19], [14, 27]);
        line([1, 14], [9, 14]);
        line([19, 14], [27, 14]);
        break;
      case 'stasis':
        g.strokeRect(6, 6, 16, 16);
        line([14, 2], [14, 26]);
        line([2, 14], [26, 14]);
        break;
      case 'surge':
        line([4, 20], [10, 14], [14, 18], [24, 8]);
        line([18, 8], [24, 8], [24, 14]);
        break;
      case 'gold':
      case 'miner':
        ring(14, 14, 9);
        line([14, 9], [14, 19]);
        break;
      case 'plating':
        g.beginPath();
        for (let i = 0; i < 6; i++) g.lineTo(14 + Math.cos((i * Math.PI) / 3) * 11, 14 + Math.sin((i * Math.PI) / 3) * 11);
        g.closePath();
        g.stroke();
        break;
      case 'reroll':
        g.beginPath();
        g.arc(14, 14, 9, 0.3, Math.PI * 1.7);
        g.stroke();
        line([20, 4], [22, 9], [17, 10]);
        break;
      case 'card':
        g.strokeRect(7, 4, 14, 20);
        line([11, 10], [17, 10]);
        line([11, 14], [17, 14]);
        break;
    }
  }

  function drawIcons() {
    document.querySelectorAll('canvas[data-icon], canvas[data-ability], canvas[data-glyph]').forEach(drawIcon);
  }

  // ---- Boot ----

  function resize() {
    const r = stage.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) renderer.resize(r.width, r.height, game, BOSS_BAR_SPACE);
  }

  // ---- Phone niceties ----

  // Keep the screen awake while a wave is running. Not every browser allows it, which is fine.
  let wakeLock = null;
  let wantAwake = false;
  async function keepAwake(on) {
    wantAwake = on;
    try {
      if (on && !wakeLock && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }
  setInterval(() => {
    const on = running && !paused && game.state === 'playing' && !document.hidden;
    if (on !== wantAwake || (on && !wakeLock)) keepAwake(on);
  }, 1000);

  // Stop Safari's pinch-zoom from grabbing the field mid-game.
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // Offline copy of the game (only where service workers are allowed: https or localhost).
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // Handle for poking at a live run from the browser console or automated tests.
  GD.debug = { get game() { return game; }, renderer };

  new ResizeObserver(resize).observe(stage);
  window.addEventListener('orientationchange', resize);
  applyTheme();
  drawIcons();
  showTitle();
  resize();
  requestAnimationFrame(frame);
})(window.GD = window.GD || {});
