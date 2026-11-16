(function () {
  'use strict';
  const L = window.Lines, A = window.Art, S = window.Sfx, STACK = window.STACK;
  const W = L.W, VIEW = 20.3;
  const FONT = '"Mochiy Pop One", "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
  const $ = id => document.getElementById(id);

  const canvas = $('board'), ctx = canvas.getContext('2d');
  const nextCv = $('next'), nctx = nextCv.getContext('2d');
  let cell = 30, soil = null;

  let seed = (Date.now() ^ 0x2545f491) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function loadPref(k, d) { try { const v = localStorage.getItem('happaline.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function savePref(k, v) { try { localStorage.setItem('happaline.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

  const st = {
    mode: 'menu', grid: L.emptyGrid(), piece: null, queue: [], bag: new L.Bag(rand),
    score: 0, lines: 0, combo: 0, best: loadPref('best', 0), pid: 0,
    timer: 0, gravity: 0, lock: 0, lockMoves: 0, clearing: null, texts: [], parts: new A.Particles(),
    time: 0, shake: 0, banner: null, hint: false,
  };
  const level = () => 1 + Math.floor(st.lines / 10);

  // ---------- audio ----------
  const audio = { ctx: null, master: null, music: null, on: loadPref('sound', true), nextBar: 0, bar: 0 };
  function ensureAudio() {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
    try {
      audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = audio.on ? 0.9 : 0;
      audio.master.connect(audio.ctx.destination);
      audio.music = audio.ctx.createGain();
      audio.music.gain.value = 0.55;
      audio.music.connect(audio.master);
      audio.nextBar = audio.ctx.currentTime + 0.1;
    } catch (e) { audio.ctx = null; }
  }
  function sfx(name, ...args) {
    if (!audio.ctx || !audio.on) return;
    S[name](audio.ctx, audio.master, audio.ctx.currentTime + 0.01, ...args);
  }
  function tickMusic() {
    if (!audio.ctx || !audio.on) return;
    if (!['play', 'clear', 'settle'].includes(st.mode)) { audio.nextBar = Math.max(audio.nextBar, audio.ctx.currentTime + 0.1); return; }
    while (audio.nextBar < audio.ctx.currentTime + 0.6) {
      S.bgm(audio.ctx, audio.music, audio.nextBar, audio.bar, audio.bar + 1, 1);
      audio.nextBar += S.BAR;
      audio.bar++;
    }
  }

  // ---------- cells ----------
  function makeCell(c, pid, y) {
    const r = rand();
    return { c, pid, stage: r < 0.6 ? 0 : r < 0.84 ? 1 : 2, seed: rand() * 10, y, vy: 0, squash: 0, happy: false, blinkAt: 1 + rand() * 4 };
  }
  // the four sprouts of a piece share looks so a falling piece reads as one team
  function makeTeam(t) {
    const c = L.BASE[t].color, pid = ++st.pid;
    return { t, pid, cells: [0, 1, 2, 3].map(() => makeCell(c, pid, 0)) };
  }

  // ---------- flow ----------
  function resetField() {
    st.grid = L.emptyGrid();
    st.piece = null; st.score = 0; st.lines = 0; st.combo = 0; st.texts = []; st.banner = null; st.hint = false;
    st.parts = new A.Particles();
    st.bag = new L.Bag(rand);
  }

  function startEndless() {
    ensureAudio();
    resetField();
    st.queue = [makeTeam(st.bag.next()), makeTeam(st.bag.next()), makeTeam(st.bag.next())];
    hideOverlay();
    spawn();
  }

  // a ready-made 16-row stack with the right-hand column open, then four straight pieces
  function startChallenge() {
    ensureAudio();
    resetField();
    STACK.pieces.forEach((p, i) => {
      const team = makeTeam(p.t);
      L.cellsOf(p).forEach(([x, y], k) => {
        const c = team.cells[k];
        c.y = y + 22 + i * 0.35;
        st.grid[y][x] = c;
      });
    });
    st.queue = [makeTeam('I'), makeTeam('I'), makeTeam('I'), makeTeam('I'), makeTeam(st.bag.next())];
    for (const team of st.queue.slice(0, 4)) team.easy = true;
    st.hint = true;
    st.banner = { text: '4段消しチャレンジ', sub: 'たて棒を 右はしに落とそう', age: 0, hold: 1.8 };
    hideOverlay();
    st.mode = 'settle'; st.timer = 0;
  }

  function spawn() {
    const team = st.queue.shift();
    while (st.queue.length < 3) st.queue.push(makeTeam(st.bag.next()));
    const p = Object.assign(L.spawn(team.t), { team, dx: 0, dy: 0 });
    p.dx = p.x; p.dy = p.y;
    if (!L.fits(st.grid, p)) return gameOver();
    st.piece = p;
    st.lock = 0; st.lockMoves = 0; st.gravity = 0;
    st.mode = 'play';
    drawNext();
  }

  const grounded = p => !L.fits(st.grid, { ...p, y: p.y - 1 });
  function resetLock() { if (st.lockMoves < 15) { st.lock = 0; st.lockMoves++; } }

  function tryMove(dx) {
    const p = st.piece;
    if (!p || st.mode !== 'play') return;
    const q = { ...p, x: p.x + dx };
    if (L.fits(st.grid, q)) { p.x = q.x; sfx('move'); resetLock(); }
  }
  function tryRotate(dir) {
    const p = st.piece;
    if (!p || st.mode !== 'play') return;
    const q = L.rotate(st.grid, p, dir);
    if (q) { p.x = q.x; p.y = q.y; p.r = q.r; sfx('rotate'); resetLock(); }
  }
  function hardDrop() {
    const p = st.piece;
    if (!p || st.mode !== 'play') return;
    const y = L.dropY(st.grid, p);
    st.score += (p.y - y) * 2;
    p.y = y;
    lockPiece(true);
  }

  function lockPiece(hard) {
    const p = st.piece;
    st.piece = null;
    L.cellsOf(p).forEach(([x, y], k) => {
      const c = p.team.cells[k];
      c.y = y; c.vy = 0; c.squash = hard ? 1 : 0.6;
      if (y < L.H) st.grid[y][x] = c;
    });
    sfx('land', hard ? 1 : 0.7);
    if (hard) st.shake = Math.max(st.shake, 0.18);
    const rows = L.fullRows(st.grid);
    if (!rows.length) {
      st.combo = 0;
      // locking entirely inside the spawn rows ends the game
      if (L.cellsOf(p).every(([, y]) => y >= L.VISIBLE)) return gameOver();
      updateHud();
      return spawn();
    }
    st.combo++;
    st.clearing = rows;
    for (const y of rows) for (const c of st.grid[y]) c.happy = true;
    const n = rows.length;
    st.texts.push({ n, combo: st.combo, y: rows.reduce((a, b) => a + b, 0) / n, age: 0 });
    sfx('voice', [0, 2, 5, 9, 15][n] + Math.min(4, st.combo - 1));
    if (n === 4) sfx('hoi');
    st.mode = 'clear'; st.timer = 0;
  }

  function finishClear() {
    const rows = st.clearing, n = rows.length;
    for (const y of rows) st.grid[y].forEach((c, x) => st.parts.burst((x + 0.5) * cell, canvas.height - (y + 0.5) * cell, cell, c.c, c.stage, n, rand));
    st.grid = L.clearRows(st.grid, rows);
    st.clearing = null;
    st.lines += n;
    const allClear = st.grid.every(row => row.every(c => !c));
    st.score += L.score(n, level(), st.combo, allClear);
    st.shake = Math.min(1, 0.2 + n * 0.15);
    sfx('pop', n * 4);
    if (allClear) {
      st.banner = { text: '全消し!', sub: '+' + (3000 * level()).toLocaleString('ja-JP'), age: 0, hold: 2.2, big: true };
      st.parts.confetti(canvas.width, canvas.height, 120, rand);
      sfx('fanfare'); sfx('cheer');
    }
    if (st.lines >= 1 && st.score > st.best) { st.best = st.score; savePref('best', st.best); }
    updateHud();
    st.mode = 'settle'; st.timer = 0;
  }

  function gameOver() {
    st.mode = 'over';
    if (st.score > st.best) { st.best = st.score; savePref('best', st.best); }
    sfx('gameOver');
    showOverlay('over');
  }

  // ---------- update ----------
  const held = { dir: 0, rep: 0, down: false };

  function updateFalling(dt) {
    let moving = false, landed = 0;
    for (let y = 0; y < L.H; y++) for (const c of st.grid[y]) {
      if (!c) continue;
      if (c.y > y) {
        c.vy = Math.min(c.vy + 70 * dt, 26);
        c.y -= c.vy * dt;
        if (c.y <= y) { c.y = y; if (c.vy > 4) { c.squash = 1; landed++; } c.vy = 0; } else moving = true;
      } else c.y = y;
    }
    if (landed) sfx('land', Math.min(1, 0.3 + landed * 0.02));
    return moving;
  }

  function update(dt) {
    st.time += dt;
    st.shake = Math.max(0, st.shake - dt * 2.5);
    for (const row of st.grid) for (const c of row) if (c) {
      c.squash = Math.max(0, c.squash - dt * 4);
      if (st.time > c.blinkAt + 0.16) c.blinkAt = st.time + 2 + rand() * 5;
    }
    st.parts.update(dt, cell * 22);
    for (const t of st.texts) t.age += dt;
    st.texts = st.texts.filter(t => t.age < 1.4);
    if (st.banner) { st.banner.age += dt; if (st.banner.age > st.banner.hold + 0.4) st.banner = null; }

    if (st.mode === 'play') {
      const p = st.piece;
      if (held.dir) { held.rep -= dt; if (held.rep <= 0) { tryMove(held.dir); held.rep = 0.05; } }
      const interval = held.down ? 0.035 : p.team.easy ? 1.1 : Math.max(0.06, 0.85 * Math.pow(0.86, level() - 1));
      if (grounded(p)) {
        st.lock += dt;
        if (st.lock > (held.down ? 0.12 : p.team.easy ? 2.5 : 0.5)) lockPiece(false);
      } else {
        st.gravity += dt;
        while (st.gravity >= interval && !grounded(p)) {
          st.gravity -= interval;
          p.y--;
          if (held.down) st.score++;
        }
      }
      if (st.piece) { p.dx += (p.x - p.dx) * Math.min(1, dt * 30); p.dy += (p.y - p.dy) * Math.min(1, dt * 30); }
    } else if (st.mode === 'clear') {
      st.timer += dt;
      if (st.timer > 0.42) finishClear();
    } else if (st.mode === 'settle') {
      if (!updateFalling(dt)) { st.timer += dt; if (st.timer > 0.05) spawn(); }
    }
    tickMusic();
  }

  // ---------- rendering ----------
  function resize() {
    const wrap = $('boardWrap');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const s = Math.max(12, Math.floor((wrap.clientWidth * dpr) / W));
    if (s === cell && soil) return;
    cell = s;
    canvas.width = W * s;
    canvas.height = Math.round(VIEW * s);
    soil = A.makeSoil(canvas.width, canvas.height, s, W, 21);
    const ns = Math.max(10, Math.floor((nextCv.clientWidth * dpr) / 4.4));
    nextCv.width = Math.round(ns * 4.4);
    nextCv.height = Math.round(ns * 9);
    nextCv._s = ns;
    drawNext();
  }

  function drawTeam(c2d, team, cx, cy, s, r) {
    const cells = L.SHAPES[team.t][r || 0];
    const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const pos = cells.map(([x, y]) => [cx + (x - mx) * s, cy - (y - my) * s]);
    drawLinks(c2d, pos, team.cells[0].c, s);
    cells.map((_, k) => k).sort((a, b) => cells[a][1] - cells[b][1]).forEach(k => {
      const c = team.cells[k];
      A.drawSprout(c2d, pos[k][0], pos[k][1], s, c.c, { time: st.time, seed: c.seed, stage: c.stage });
    });
  }

  function drawLinks(c2d, pos, color, s) {
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
      const d = Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]);
      if (Math.abs(d - s) < 1) A.drawLink(c2d, pos[i][0], pos[i][1], pos[j][0], pos[j][1], s, color);
    }
  }

  function drawNext() {
    const s = nextCv._s || 20;
    nctx.clearRect(0, 0, nextCv.width, nextCv.height);
    st.queue.slice(0, 3).forEach((team, k) => {
      const sc = k === 0 ? 0.95 : 0.7;
      drawTeam(nctx, team, nextCv.width / 2, s * (1.4 + k * 3), s * sc, 0);
    });
  }

  function render() {
    const s = cell, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, h);
    const sh = st.shake * s * 0.12;
    ctx.translate(Math.sin(st.time * 71) * sh, Math.cos(st.time * 53) * sh);
    if (soil) ctx.drawImage(soil, 0, 0);
    const X = x => (x + 0.5) * s, Y = y => h - (y + 0.5) * s;

    // spawn rows above the field
    const top = h - L.VISIBLE * s;
    ctx.fillStyle = 'rgba(10,8,6,.5)';
    ctx.fillRect(0, 0, canvas.width, top);
    ctx.setLineDash([s * 0.12, s * 0.1]);
    ctx.strokeStyle = 'rgba(233,243,220,.28)';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(canvas.width, top); ctx.stroke();
    ctx.setLineDash([]);

    // the open column in the challenge
    if (st.hint && st.mode === 'play' && st.piece && st.piece.team.t === 'I') {
      const a = 0.18 + 0.12 * Math.sin(st.time * 6);
      ctx.fillStyle = `rgba(255,212,59,${a})`;
      ctx.fillRect(7 * s, top, s, L.VISIBLE * s);
    }

    // landing marks
    if (st.piece && st.mode === 'play') {
      const p = st.piece, gy = L.dropY(st.grid, p);
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = A.PAL[p.team.cells[0].c].body;
      for (const [x, y] of L.cellsOf({ ...p, y: gy })) {
        if (y >= L.H) continue;
        ctx.beginPath();
        ctx.arc(X(x), Y(y) + s * 0.1, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // links within each team (settled cells only)
    const g = st.grid, settled = (c, y) => Math.abs(c.y - y) < 0.01;
    for (let y = 0; y < L.H; y++) for (let x = 0; x < W; x++) {
      const c = g[y][x];
      if (!c || !settled(c, y)) continue;
      const r = x + 1 < W && g[y][x + 1];
      if (r && r.pid === c.pid && settled(r, y)) A.drawLink(ctx, X(x), Y(y), X(x + 1), Y(y), s, c.c);
      const u = y + 1 < L.H && g[y + 1][x];
      if (u && u.pid === c.pid && settled(u, y + 1)) A.drawLink(ctx, X(x), Y(y), X(x), Y(y + 1), s, c.c);
    }
    const all = [];
    for (let y = 0; y < L.H; y++) for (let x = 0; x < W; x++) if (g[y][x]) all.push({ c: g[y][x], x });
    all.sort((a, b) => a.c.y - b.c.y);
    const look = st.piece ? st.piece.dx + 1 : 4;
    for (const { c, x } of all) {
      const k = c.squash, stretch = c.vy > 6 ? 0.06 : 0;
      const blink = st.time > c.blinkAt && st.time < c.blinkAt + 0.16 ? 1 : 0;
      const flash = c.happy && st.mode === 'clear' ? (Math.sin(st.timer * 38) > 0 ? 1 : 0.15) : 0;
      A.drawSprout(ctx, X(x), Y(c.y), s, c.c, {
        sx: 1 + 0.14 * k - stretch, sy: 1 - 0.18 * k + stretch, time: st.time, seed: c.seed, stage: c.stage,
        blink, look: Math.max(-1, Math.min(1, (look - x) / 3)), happy: c.happy, flash,
      });
    }

    // the falling team
    if (st.piece) {
      const p = st.piece;
      const cells = L.SHAPES[p.t][p.r];
      const pos = cells.map(([x, y]) => [X(p.dx + x), Y(p.dy + y)]);
      drawLinks(ctx, pos, p.team.cells[0].c, s);
      cells.map((_, k) => k).sort((a, b) => cells[a][1] - cells[b][1]).forEach(k => {
        const c = p.team.cells[k];
        A.drawSprout(ctx, pos[k][0], pos[k][1], s, c.c, { time: st.time, seed: c.seed, stage: c.stage });
      });
    }

    st.parts.draw(ctx);
    for (const t of st.texts) drawClearText(t);
    if (st.banner) drawBanner(st.banner);
  }

  function drawClearText(t) {
    const s = cell, age = t.age;
    const k = Math.min(1, age / 0.16);
    const sc = age < 0.16 ? 0.4 + k * 0.8 : 1.2 - Math.min(0.2, (age - 0.16) * 1.2);
    const alpha = age > 0.9 ? Math.max(0, 1 - (age - 0.9) / 0.35) : 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(canvas.width / 2, canvas.height - (t.y + 0.5) * s - Math.min(age, 0.6) * s * 0.6);
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const big = t.n === 4;
    ctx.font = `${s * (big ? 1.25 : 0.9)}px ${FONT}`;
    ctx.lineWidth = s * 0.2;
    ctx.strokeStyle = '#2a1608';
    const label = t.n + '段消し' + (big ? '!!' : '!');
    ctx.strokeText(label, 0, s * 0.35);
    ctx.fillStyle = big ? '#ffd43b' : '#ffffff';
    ctx.fillText(label, 0, s * 0.35);
    if (t.combo > 1) {
      ctx.font = `${s * 0.55}px ${FONT}`;
      ctx.lineWidth = s * 0.12;
      ctx.strokeText(t.combo + 'れんぞく', 0, s * 1.05);
      ctx.fillStyle = '#8fd14f';
      ctx.fillText(t.combo + 'れんぞく', 0, s * 1.05);
    }
    ctx.restore();
  }

  function drawBanner(b) {
    const s = cell, w = canvas.width, h = canvas.height;
    const inK = Math.min(1, b.age / 0.25), outK = b.age > b.hold ? Math.max(0, 1 - (b.age - b.hold) / 0.4) : 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = outK;
    ctx.fillStyle = 'rgba(15,10,6,.6)';
    const bh = s * 3.4;
    ctx.fillRect(0, h * 0.45 - bh / 2, w, bh);
    ctx.translate(w / 2, h * 0.45);
    const sc = 0.6 + 0.4 * (1 - Math.pow(1 - inK, 3));
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    const fit = Math.min(1, (w * 0.9) / (b.text.length * s * (b.big ? 1.5 : 1.05)));
    ctx.font = `${s * (b.big ? 1.5 : 1.05) * fit}px ${FONT}`;
    ctx.lineWidth = s * 0.22;
    ctx.strokeStyle = '#2a1608';
    ctx.strokeText(b.text, 0, s * 0.2);
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(b.text, 0, s * 0.2);
    if (b.sub) {
      ctx.font = `${s * 0.5}px ${FONT}`;
      ctx.lineWidth = s * 0.12;
      ctx.strokeText(b.sub, 0, s * 1.15);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.sub, 0, s * 1.15);
    }
    ctx.restore();
  }

  // ---------- HUD & overlay ----------
  const fmt = n => n.toLocaleString('ja-JP');
  function updateHud() {
    $('score').textContent = fmt(st.score);
    $('lines').textContent = st.lines;
    $('level').textContent = level();
    $('best').textContent = fmt(st.best);
  }

  function showOverlay(kind) {
    const ov = $('overlay');
    ov.hidden = false;
    $('menuPanel').hidden = kind !== 'menu';
    $('overPanel').hidden = kind !== 'over';
    $('pausePanel').hidden = kind !== 'pause';
    if (kind === 'over') {
      $('overScore').textContent = fmt(st.score);
      $('overLines').textContent = st.lines;
    }
    const first = ov.querySelector(`#${kind}Panel button`);
    if (first) first.focus({ preventScroll: true });
  }
  function hideOverlay() { $('overlay').hidden = true; updateHud(); }

  function togglePause() {
    if (st.mode === 'paused') { st.mode = st.resume; hideOverlay(); }
    else if (['play', 'clear', 'settle'].includes(st.mode)) { st.resume = st.mode; st.mode = 'paused'; showOverlay('pause'); }
  }

  function setSound(on) {
    audio.on = on;
    savePref('sound', on);
    if (audio.master) audio.master.gain.value = on ? 0.9 : 0;
    const b = $('soundBtn');
    b.textContent = on ? '音 ON' : '音 OFF';
    b.setAttribute('aria-pressed', String(on));
  }

  // ---------- input ----------
  function press(a) {
    if (a === 'left' || a === 'right') { const d = a === 'left' ? -1 : 1; tryMove(d); held.dir = d; held.rep = 0.16; }
    else if (a === 'down') held.down = true;
    else if (a === 'cw') tryRotate(1);
    else if (a === 'ccw') tryRotate(-1);
    else if (a === 'drop') hardDrop();
  }
  function release(a) {
    if ((a === 'left' && held.dir === -1) || (a === 'right' && held.dir === 1)) held.dir = 0;
    if (a === 'down') held.down = false;
  }

  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw', ' ': 'drop' };
  window.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); e.preventDefault(); return; }
    const a = KEYS[e.key];
    if (!a || !['play', 'clear', 'settle'].includes(st.mode)) return;
    e.preventDefault();
    if (e.repeat) return;
    press(a);
  });
  window.addEventListener('keyup', e => { const a = KEYS[e.key]; if (a) release(a); });
  window.addEventListener('blur', () => { held.dir = 0; held.down = false; });

  document.querySelectorAll('#pad [data-act]').forEach(btn => {
    const a = btn.dataset.act;
    btn.addEventListener('pointerdown', e => { e.preventDefault(); ensureAudio(); btn.setPointerCapture(e.pointerId); press(a); btn.classList.add('down'); });
    const up = () => { release(a); btn.classList.remove('down'); };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', e => e.preventDefault());
  });

  $('startBtn').addEventListener('click', startEndless);
  $('challengeBtn').addEventListener('click', startChallenge);
  $('againBtn').addEventListener('click', startEndless);
  $('againChallengeBtn').addEventListener('click', startChallenge);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', () => { st.mode = 'menu'; st.piece = null; showOverlay('menu'); });
  $('sideChallenge').addEventListener('click', startChallenge);
  $('pauseBtn').addEventListener('click', togglePause);
  $('soundBtn').addEventListener('click', () => { ensureAudio(); setSound(!audio.on); });

  // ---------- loop ----------
  let last = performance.now(), nextTick = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (st.mode !== 'paused') update(dt);
    render();
    if (st.time > nextTick) { nextTick = st.time + 0.05; drawNext(); }
    requestAnimationFrame(frame);
  }

  window.happaLineState = () => ({ mode: st.mode, lines: st.lines, score: st.score, cells: st.grid.flat().filter(Boolean).length, piece: st.piece && st.piece.t });

  function boot() {
    setSound(audio.on);
    // a few rows of the challenge stack behind the menu
    STACK.pieces.slice(0, 9).forEach(p => {
      const team = makeTeam(p.t);
      L.cellsOf(p).forEach(([x, y], k) => { team.cells[k].y = y; st.grid[y][x] = team.cells[k]; });
    });
    st.queue = [makeTeam(st.bag.next()), makeTeam(st.bag.next()), makeTeam(st.bag.next())];
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));
    resize();
    updateHud();
    showOverlay('menu');
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
