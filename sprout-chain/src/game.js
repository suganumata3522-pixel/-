(function () {
  'use strict';
  const E = window.Engine, A = window.Art, S = window.Sfx, BOARDS = window.BOARDS;
  const W = 6, VIEW = 13.6;
  const FONT = '"Mochiy Pop One", "Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
  const OFF = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const $ = id => document.getElementById(id);

  const canvas = $('board'), ctx = canvas.getContext('2d');
  const nextCv = $('next'), nctx = nextCv.getContext('2d');
  let cell = 40, soil = null;

  let seed = (Date.now() ^ 0x5f3759df) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  function loadPref(k, d) { try { const v = localStorage.getItem('happa.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function savePref(k, v) { try { localStorage.setItem('happa.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

  const st = {
    mode: 'menu', cols: [[], [], [], [], [], []], piece: null, queue: [],
    score: 0, chain: 0, lastChain: 0, best: loadPref('best', 0), colors: loadPref('colors', 4),
    timer: 0, popping: null, texts: [], parts: new A.Particles(), time: 0, shake: 0,
    lock: 0, lockMoves: 0, soft: false, banner: null, boardNo: 0, pieces: 0,
  };

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
    const playing = st.mode !== 'menu' && st.mode !== 'over' && st.mode !== 'paused';
    if (!playing) { audio.nextBar = Math.max(audio.nextBar, audio.ctx.currentTime + 0.1); return; }
    while (audio.nextBar < audio.ctx.currentTime + 0.6) {
      S.bgm(audio.ctx, audio.music, audio.nextBar, audio.bar, audio.bar + 1, 1);
      audio.nextBar += S.BAR;
      audio.bar++;
    }
  }

  // ---------- puyo objects ----------
  function makePuyo(c, y) {
    const r = rand();
    return { c, stage: r < 0.6 ? 0 : r < 0.84 ? 1 : 2, seed: rand() * 10, y: y || 0, vy: 0, squash: 0, flash: 0, happy: false, blinkAt: 1 + rand() * 4 };
  }
  const randomPair = () => [makePuyo(1 + ((rand() * st.colors) | 0)), makePuyo(1 + ((rand() * st.colors) | 0))];

  function occ(x, y) { return x < 0 || x >= W || y < 0 || y >= 14 || y < st.cols[x].length; }
  function fits(x, y, r) {
    const [dx, dy] = OFF[r];
    for (const [px, py] of [[x, y], [x + dx, y + dy]]) if (occ(px, Math.floor(py)) || occ(px, Math.ceil(py))) return false;
    return true;
  }

  // ---------- flow ----------
  function resetField() {
    st.cols = [[], [], [], [], [], []];
    st.piece = null; st.score = 0; st.chain = 0; st.lastChain = 0; st.texts = []; st.banner = null; st.pieces = 0;
    st.parts = new A.Particles();
  }

  function startEndless() {
    ensureAudio();
    resetField();
    st.queue = [randomPair(), randomPair(), randomPair()];
    hideOverlay();
    spawn();
  }

  function startChallenge() {
    ensureAudio();
    resetField();
    const b = BOARDS[st.boardNo % BOARDS.length];
    st.boardNo++;
    b.cols.forEach((str, x) => {
      for (let i = 0; i < str.length; i++) st.cols[x].push(makePuyo(+str[i], i + 14 + x * 0.7 + i * 0.15));
    });
    // the last pair dropped in column 3 is the trigger
    const top = st.cols[2].pop(), under = st.cols[2].pop();
    st.queue = [[under, top], randomPair(), randomPair()];
    st.triggerNext = true;
    st.banner = { text: '19れんさ', sub: 'ボード ' + (((st.boardNo - 1) % BOARDS.length) + 1) + ' / ' + BOARDS.length, age: 0, hold: 1.6 };
    hideOverlay();
    st.mode = 'settle'; st.timer = 0;
  }

  function spawn() {
    const [a, b] = st.queue.shift();
    while (st.queue.length < 2) st.queue.push(randomPair());
    st.piece = { x: 2, y: 11, r: 0, a, b, angle: 0, dx: 2, trigger: !!st.triggerNext, born: st.time };
    st.triggerNext = false;
    st.lock = 0; st.lockMoves = 0;
    st.mode = 'play';
    drawNext();
  }

  function resetLock() { if (st.lockMoves < 15) { st.lock = 0; st.lockMoves++; } }

  function tryMove(dx) {
    const p = st.piece;
    if (!p || st.mode !== 'play') return false;
    if (fits(p.x + dx, p.y, p.r)) { p.x += dx; sfx('move'); resetLock(); return true; }
    return false;
  }

  function tryRotate(dir) {
    const p = st.piece;
    if (!p || st.mode !== 'play') return;
    const attempt = (nr, kicks) => {
      for (const [kx, ky] of kicks) {
        if (fits(p.x + kx, ky, nr)) {
          p.angle += dir * (nr === (p.r + 2) % 4 ? 180 : 90);
          p.x += kx; p.y = ky; p.r = nr;
          sfx('rotate'); resetLock();
          return true;
        }
      }
      return false;
    };
    const nr = (p.r + dir + 4) % 4;
    const up = Math.ceil(p.y);
    const kicks = [[0, p.y]];
    if (nr === 1) kicks.push([-1, p.y]);
    if (nr === 3) kicks.push([1, p.y]);
    if (nr === 2) kicks.push([0, up], [0, up + 1]);
    if (attempt(nr, kicks)) return;
    // boxed in on both sides: flip the pair over (quick turn)
    attempt((p.r + 2) % 4, [[0, p.y], [0, up], [0, up + 1]]);
  }

  function lockPiece() {
    const p = st.piece;
    st.piece = null;
    const [dx, dy] = OFF[p.r];
    const parts = [{ x: p.x, y: p.y, o: p.a }, { x: p.x + dx, y: p.y + dy, o: p.b }].sort((u, v) => u.y - v.y);
    for (const q of parts) {
      const col = st.cols[q.x];
      if (col.length >= 13) continue; // a puyo that would rest in row 14 is lost
      q.o.y = q.y; q.o.vy = 0;
      col.push(q.o);
    }
    st.pieces++;
    sfx('land', 0.8);
    st.mode = 'settle'; st.timer = 0;
  }

  function checkPops() {
    const colors = st.cols.map(c => c.map(p => p.c));
    const r = E.step(colors, st.chain + 1);
    if (!r) return endTurn();
    st.chain++;
    st.score += r.score;
    st.popping = r.popping.map(g => g.cells.map(([x, y]) => ({ x, y, p: st.cols[x][y] })));
    let sx = 0, sy = 0, n = 0;
    for (const g of st.popping) for (const q of g) { q.p.happy = true; sx += q.x; sy += q.y; n++; }
    st.texts.push({ n: st.chain, x: sx / n, y: sy / n, age: 0 });
    sfx('voice', st.chain);
    st.mode = 'pop'; st.timer = 0;
    updateHud();
  }

  function finishPop() {
    const dead = new Set();
    for (const g of st.popping) for (const q of g) {
      dead.add(q.p);
      st.parts.burst((q.x + 0.5) * cell, canvas.height - (q.y + 0.5) * cell, cell, q.p.c, q.p.stage, Math.min(st.chain, 19) / 4, rand);
    }
    for (let x = 0; x < W; x++) st.cols[x] = st.cols[x].filter(p => !dead.has(p));
    st.popping = null;
    st.shake = Math.min(1, 0.25 + st.chain * 0.04);
    sfx('pop', st.chain);
    st.mode = 'settle'; st.timer = 0;
  }

  function endTurn() {
    if (st.chain > 0) {
      st.lastChain = st.chain;
      if (st.chain > st.best) { st.best = st.chain; savePref('best', st.best); }
      const clear = st.cols.every(c => c.length === 0);
      if (st.chain >= 19) {
        st.banner = { text: '19れんさ!!', sub: clear ? 'りろんち & ぜんけし!' : 'りろんち たっせい!', age: 0, hold: 3.2, big: true };
        st.parts.confetti(canvas.width, canvas.height, 140, rand);
        sfx('fanfare');
      } else if (clear) {
        st.banner = { text: 'ぜんけし!', sub: '+2100', age: 0, hold: 1.4 };
      }
      if (clear) { st.score += 2100; sfx('allClear'); }
      st.chain = 0;
      updateHud();
    }
    if (st.cols[2].length >= 12) return gameOver();
    spawn();
  }

  function gameOver() {
    st.mode = 'over';
    sfx('gameOver');
    showOverlay('over');
  }

  // ---------- update ----------
  const held = { left: false, right: false, down: false, rep: 0, dir: 0 };

  function fallSpeed() { return 1.15 + Math.min(2.4, st.pieces * 0.012); }

  function updateFalling(dt) {
    let moving = false, landed = 0;
    for (const col of st.cols) {
      for (let i = 0; i < col.length; i++) {
        const p = col[i];
        if (p.y > i) {
          p.vy = Math.min(p.vy + 75 * dt, 24);
          p.y -= p.vy * dt;
          if (p.y <= i) { p.y = i; if (p.vy > 4) { p.squash = 1; landed++; } p.vy = 0; } else moving = true;
        } else if (p.y < i) p.y = i;
      }
    }
    if (landed) sfx('land', Math.min(1, 0.4 + landed * 0.05));
    return moving;
  }

  function update(dt) {
    st.time += dt;
    st.shake = Math.max(0, st.shake - dt * 2.5);
    for (const col of st.cols) for (const p of col) {
      p.squash = Math.max(0, p.squash - dt * 4);
      if (st.time > p.blinkAt + 0.16) p.blinkAt = st.time + 2 + rand() * 5;
    }
    st.parts.update(dt, cell * 22);
    for (const t of st.texts) t.age += dt;
    st.texts = st.texts.filter(t => t.age < 1.4);
    if (st.banner) { st.banner.age += dt; if (st.banner.age > st.banner.hold + 0.4) st.banner = null; }

    if (st.mode === 'play') {
      const p = st.piece;
      // auto-repeat for held left/right
      if (held.dir) {
        held.rep -= dt;
        if (held.rep <= 0) { tryMove(held.dir); held.rep = 0.055; }
      }
      p.dx += (p.x - p.dx) * Math.min(1, dt * 28);
      p.angle += 0;
      const soft = held.down;
      const v = soft ? 17 : fallSpeed();
      const ny = p.y - v * dt;
      if (fits(p.x, ny, p.r)) {
        p.y = ny;
        if (soft) st.score += 0; // soft drop is free; points come from chains
      } else {
        let ry = Math.ceil(ny);
        while (!fits(p.x, ry, p.r) && ry < 14) ry++;
        p.y = Math.min(p.y, ry);
        st.lock += dt;
        const limit = p.trigger ? (soft ? 0.02 : 6) : soft ? 0.04 : 0.5;
        if (st.lock > limit) lockPiece();
      }
    } else if (st.mode === 'settle') {
      if (!updateFalling(dt)) { st.timer += dt; if (st.timer > 0.06) checkPops(); }
    } else if (st.mode === 'pop') {
      st.timer += dt;
      if (st.timer > 0.5) finishPop();
    }
    tickMusic();
  }

  // ---------- rendering ----------
  function resize() {
    const wrap = $('boardWrap');
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const s = Math.max(16, Math.floor((wrap.clientWidth * dpr) / W));
    if (s === cell && soil) return;
    cell = s;
    canvas.width = W * s;
    canvas.height = Math.round(VIEW * s);
    soil = A.makeSoil(canvas.width, canvas.height, s, W, 14);
    const ns = Math.max(12, Math.floor((nextCv.clientWidth * dpr) / 2.4));
    nextCv.width = Math.round(ns * 2.4);
    nextCv.height = Math.round(ns * 4.4);
    nextCv._s = ns;
    drawNext();
  }

  function drawNext() {
    const s = nextCv._s || 30;
    nctx.clearRect(0, 0, nextCv.width, nextCv.height);
    st.queue.slice(0, 2).forEach((pair, k) => {
      const scale = k === 0 ? 1 : 0.72;
      const cx = k === 0 ? s * 0.9 : s * 1.75;
      const base = k === 0 ? s * 2.05 : s * 3.95;
      A.drawSprout(nctx, cx, base - s * 0.5 * scale, s * scale, pair[0].c, { stage: pair[0].stage, time: st.time, seed: pair[0].seed });
      A.drawSprout(nctx, cx, base - s * 1.5 * scale, s * scale, pair[1].c, { stage: pair[1].stage, time: st.time, seed: pair[1].seed });
    });
  }

  function sproutOpts(p, x, i) {
    const look = st.piece ? Math.max(-1, Math.min(1, (st.piece.dx - x) / 2.5)) : 0;
    const k = p.squash;
    const fallStretch = p.vy > 6 ? 0.06 : 0;
    const blinking = st.time > p.blinkAt && st.time < p.blinkAt + 0.16;
    const flash = p.happy && st.mode === 'pop' ? (Math.sin(st.timer * 38) > 0 ? 1 : 0.15) : 0;
    return {
      sx: 1 + 0.16 * k - fallStretch, sy: 1 - 0.2 * k + fallStretch, time: st.time, seed: p.seed, stage: p.stage,
      blink: blinking ? 1 : 0, look, happy: p.happy, flash,
      alpha: i >= 12 ? 0.75 : 1,
    };
  }

  function render() {
    const s = cell, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, h);
    const sh = st.shake * s * 0.12;
    ctx.translate(Math.sin(st.time * 71) * sh, Math.cos(st.time * 53) * sh);
    if (soil) ctx.drawImage(soil, 0, 0);
    A.drawFieldMarks(ctx, 0, h - 13 * s, s, 13, st.cols[2].length < 12);
    const X = x => (x + 0.5) * s, Y = y => h - (y + 0.5) * s;

    // ghost marks where the pair will land
    if (st.piece && st.mode === 'play') {
      const p = st.piece, [dx, dy] = OFF[p.r];
      const items = [{ x: p.x, y: p.y, o: p.a }, { x: p.x + dx, y: p.y + dy, o: p.b }].sort((u, v) => u.y - v.y);
      const hs = st.cols.map(c => c.length);
      for (const it of items) {
        const gy = hs[it.x]++;
        if (gy > 12) continue;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = A.PAL[it.o.c].body;
        ctx.beginPath();
        ctx.arc(X(it.x), Y(gy) + s * 0.1, s * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // links between settled neighbours of the same colour (visible rows only)
    const settled = (p, i) => Math.abs(p.y - i) < 0.01;
    for (let x = 0; x < W; x++) {
      const col = st.cols[x];
      for (let i = 0; i < Math.min(col.length, 12); i++) {
        const p = col[i];
        if (!settled(p, i)) continue;
        const r = st.cols[x + 1] && st.cols[x + 1][i];
        if (r && r.c === p.c && settled(r, i)) A.drawLink(ctx, X(x), Y(i), X(x + 1), Y(i), s, p.c);
        const u = col[i + 1];
        if (u && i + 1 < 12 && u.c === p.c && settled(u, i + 1)) A.drawLink(ctx, X(x), Y(i), X(x), Y(i + 1), s, p.c);
      }
    }

    // sprouts, bottom rows first so the ones above stand in front
    const all = [];
    for (let x = 0; x < W; x++) st.cols[x].forEach((p, i) => all.push({ p, x, i }));
    all.sort((a, b) => a.p.y - b.p.y);
    for (const { p, x, i } of all) A.drawSprout(ctx, X(x), Y(p.y), s, p.c, sproutOpts(p, x, i));

    // the falling pair
    if (st.piece) {
      const p = st.piece;
      const target = p.r * 90;
      let diff = ((target - p.angle) % 360 + 540) % 360 - 180;
      p.angle += diff * 0.35;
      const ang = (p.angle * Math.PI) / 180;
      const ax = X(p.dx), ay = Y(p.y);
      const bx = ax + Math.sin(ang) * s, by = ay - Math.cos(ang) * s;
      const pulse = 0.5 + 0.5 * Math.sin(st.time * 9);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,230,${0.35 + pulse * 0.4})`;
      ctx.lineWidth = s * 0.06;
      ctx.beginPath();
      ctx.arc(ax, ay + s * 0.08, s * 0.46, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      A.drawSprout(ctx, bx, by, s, p.b.c, { time: st.time, seed: p.b.seed, stage: p.b.stage, look: 0 });
      A.drawSprout(ctx, ax, ay, s, p.a.c, { time: st.time, seed: p.a.seed, stage: p.a.stage, look: 0 });
      if (p.trigger) {
        const a = 0.6 + 0.4 * Math.sin(st.time * 6);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.font = `${s * 0.36}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.lineWidth = s * 0.1;
        ctx.strokeStyle = '#2a1608';
        ctx.fillStyle = '#ffd43b';
        const tx = X(2), ty = Y(8.7);
        ctx.strokeText('↓ で はっか!', tx, ty);
        ctx.fillText('↓ で はっか!', tx, ty);
        ctx.restore();
      }
    }

    st.parts.draw(ctx);
    for (const t of st.texts) A.drawChainText(ctx, X(t.x), Y(t.y), t.n, t.age, s * 1.1, FONT);

    if (st.banner) drawBanner(st.banner);
    if (st.mode === 'play' || st.mode === 'settle' || st.mode === 'pop') drawNextIdle();
  }

  let nextTick = 0;
  function drawNextIdle() { if (st.time > nextTick) { nextTick = st.time + 0.05; drawNext(); } }

  function drawBanner(b) {
    const s = cell, w = canvas.width, h = canvas.height;
    const inK = Math.min(1, b.age / 0.25), outK = b.age > b.hold ? Math.max(0, 1 - (b.age - b.hold) / 0.4) : 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = outK;
    ctx.fillStyle = 'rgba(15,10,6,.55)';
    const bh = s * (b.big ? 3.1 : 2.4);
    ctx.fillRect(0, h * 0.42 - bh / 2, w, bh);
    ctx.translate(w / 2, h * 0.42);
    const sc = 0.6 + 0.4 * (1 - Math.pow(1 - inK, 3)) + (b.big ? Math.sin(b.age * 5) * 0.03 : 0);
    ctx.scale(sc, sc);
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.font = `${s * (b.big ? 1.15 : 0.95)}px ${FONT}`;
    ctx.lineWidth = s * 0.2;
    ctx.strokeStyle = '#2a1608';
    ctx.strokeText(b.text, 0, s * 0.15);
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(b.text, 0, s * 0.15);
    if (b.sub) {
      ctx.font = `${s * 0.4}px ${FONT}`;
      ctx.lineWidth = s * 0.1;
      ctx.strokeText(b.sub, 0, s * 0.85);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.sub, 0, s * 0.85);
    }
    ctx.restore();
  }

  // ---------- HUD & overlay ----------
  const fmt = n => n.toLocaleString('ja-JP');
  function updateHud() {
    $('score').textContent = fmt(st.score);
    $('chain').textContent = st.chain || st.lastChain;
    $('best').textContent = st.best;
  }

  function showOverlay(kind) {
    const ov = $('overlay');
    ov.hidden = false;
    $('menuPanel').hidden = kind !== 'menu';
    $('overPanel').hidden = kind !== 'over';
    $('pausePanel').hidden = kind !== 'pause';
    if (kind === 'over') {
      $('overScore').textContent = fmt(st.score);
      $('overChain').textContent = st.best;
    }
    const first = ov.querySelector(`#${kind}Panel button`);
    if (first) first.focus({ preventScroll: true });
  }
  function hideOverlay() { $('overlay').hidden = true; updateHud(); }

  function togglePause() {
    if (st.mode === 'paused') { st.mode = st.resume; hideOverlay(); }
    else if (['play', 'settle', 'pop'].includes(st.mode)) { st.resume = st.mode; st.mode = 'paused'; showOverlay('pause'); }
  }

  function setColors(n) {
    st.colors = n;
    savePref('colors', n);
    document.querySelectorAll('[data-colors]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.colors === n)));
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
  function press(action) {
    if (action === 'left' || action === 'right') {
      const d = action === 'left' ? -1 : 1;
      tryMove(d);
      held.dir = d; held.rep = 0.16;
    } else if (action === 'down') held.down = true;
    else if (action === 'cw') tryRotate(1);
    else if (action === 'ccw') tryRotate(-1);
  }
  function release(action) {
    if ((action === 'left' && held.dir === -1) || (action === 'right' && held.dir === 1)) held.dir = 0;
    if (action === 'down') held.down = false;
  }

  const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'cw', x: 'cw', X: 'cw', z: 'ccw', Z: 'ccw' };
  window.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { togglePause(); e.preventDefault(); return; }
    const a = KEYS[e.key];
    if (!a || !['play', 'settle', 'pop'].includes(st.mode)) return;
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
  $('again19Btn').addEventListener('click', startChallenge);
  $('resumeBtn').addEventListener('click', togglePause);
  $('quitBtn').addEventListener('click', () => { st.mode = 'menu'; st.piece = null; showOverlay('menu'); });
  $('side19').addEventListener('click', startChallenge);
  $('pauseBtn').addEventListener('click', togglePause);
  $('soundBtn').addEventListener('click', () => { ensureAudio(); setSound(!audio.on); });
  document.querySelectorAll('[data-colors]').forEach(b => b.addEventListener('click', () => setColors(+b.dataset.colors)));

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (st.mode !== 'paused') update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function boot() {
    setColors(st.colors);
    setSound(audio.on);
    // a calm demo field behind the menu
    const demo = BOARDS[0].cols;
    demo.forEach((str, x) => { for (let i = 0; i < Math.min(str.length, 6); i++) st.cols[x].push(makePuyo(+str[i], i)); });
    st.queue = [randomPair(), randomPair()];
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe($('boardWrap'));
    resize();
    updateHud();
    showOverlay('menu');
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot); else boot();
})();
