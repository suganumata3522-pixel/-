// Frame-by-frame director for the はっぱライン Shorts video (1080x1920).
// Runs in a page that loaded Art, Sfx, Lines and STACK. Deterministic: tick(1/fps) then draw().
(function () {
  const A = window.Art, L = window.Lines;
  const VW = 1080, VH = 1920, CELL = 84, COLS = L.W, ROWS = L.VISIBLE;
  const FW = CELL * COLS, FH = CELL * ROWS, FX = 204, FY = 296;
  const FD = '"Mochiy Pop One", "Zen Maru Gothic", sans-serif';
  const FB = '"Zen Maru Gothic", "Mochiy Pop One", sans-serif';
  const BUILD_GAP = 0.13, BAR_GRAVITY = 95, CELL_GRAVITY = 70;

  const canvas = document.createElement('canvas');
  canvas.width = VW; canvas.height = VH;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const soil = A.makeSoil(FW, FH, CELL, COLS, ROWS);

  let seed = 20261116;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const S = {
    t: 0, phase: 'build', grid: L.emptyGrid(), falling: [], bars: 0, lines: 0, combo: 0, score: 0, shownScore: 0,
    clearing: null, clearT: 0, settleT: 0, texts: [], parts: new A.Particles(), shake: 0, banner: null,
    counterPop: 0, leafAt: [], flowerAt: null, events: [], done: false, endAt: null, wellGlow: 0, pid: 0,
  };
  function ev(type, arg) { S.events.push({ t: S.t, type, arg }); }

  function mk(c, pid) {
    const r = rand();
    return { c, pid, stage: r < 0.58 ? 0 : r < 0.83 ? 1 : 2, seed: rand() * 10, y: 0, vy: 0, squash: 0, happy: false, blinkAt: 0.6 + rand() * 3 };
  }

  // a falling team: four cells that move together until they land
  function team(p, startAt, startLift, gravity, v0) {
    const pid = ++S.pid, c = L.BASE[p.t].color;
    const cells = L.cellsOf(p).map(([x, y]) => ({ x, y, cell: mk(c, pid) }));
    return { p, cells, startAt, lift: startLift, vy: v0 || 0, gravity, landed: false };
  }

  function init() {
    window.STACK.pieces.forEach((p, i) => S.falling.push(team(p, 0.25 + i * BUILD_GAP, 6, 120, 6)));
    S.buildEnd = 0.25 + window.STACK.pieces.length * BUILD_GAP;
  }

  function stepFalling(dt) {
    let any = false;
    for (const f of S.falling) {
      if (f.landed || S.t < f.startAt) { if (!f.landed) any = true; continue; }
      any = true;
      f.vy = Math.min(f.vy + f.gravity * dt, 46);
      f.lift -= f.vy * dt;
      if (f.lift <= 0) {
        f.lift = 0;
        f.landed = true;
        for (const { x, y, cell } of f.cells) { cell.y = y; cell.squash = 1; S.grid[y][x] = cell; }
        if (f.p.t === 'I' && f.bar) {
          ev('land', 1);
          S.shake = Math.max(S.shake, 0.45);
          const rows = L.fullRows(S.grid);
          if (rows.length) beginClear(rows);
        } else ev('land', 0.45);
      }
    }
    S.falling = S.falling.filter(f => !f.landed);
    return any;
  }

  function dropBar() {
    const f = team({ t: 'I', r: 1, x: 5, y: 0 }, S.t + 0.05, ROWS + 2, BAR_GRAVITY, 4);
    f.bar = true;
    S.falling.push(f);
    S.bars++;
  }

  function beginClear(rows) {
    S.clearing = rows;
    S.clearT = 0;
    S.combo++;
    for (const y of rows) for (const c of S.grid[y]) c.happy = true;
    S.texts.push({ n: rows.length, combo: S.combo, y: rows.reduce((a, b) => a + b, 0) / rows.length, age: 0 });
    ev('voice', Math.min(19, 12 + S.combo * 2));
    ev('hoi');
  }

  function finishClear() {
    const rows = S.clearing;
    for (const y of rows) S.grid[y].forEach((c, x) => S.parts.burst(FX + (x + 0.5) * CELL, FY + FH - (y + 0.5) * CELL, CELL, c.c, c.stage, 4, rand));
    S.grid = L.clearRows(S.grid, rows);
    S.clearing = null;
    S.lines += rows.length;
    for (let k = 0; k < rows.length; k++) S.leafAt[S.lines - rows.length + k] = S.t + k * 0.06;
    const allClear = S.grid.every(r => r.every(c => !c));
    S.score += L.score(rows.length, 1 + Math.floor((S.lines - 1) / 10), S.combo, allClear);
    S.counterPop = 1;
    S.shake = 1;
    ev('pop', 16);
    S.settleT = 0;
    return allClear;
  }

  function settle(dt) {
    let moving = false;
    for (let y = 0; y < L.H; y++) for (const c of S.grid[y]) {
      if (!c) continue;
      if (c.y > y) {
        c.vy = Math.min(c.vy + CELL_GRAVITY * dt, 26);
        c.y -= c.vy * dt;
        if (c.y <= y) { c.y = y; c.vy = 0; c.squash = 1; } else moving = true;
      }
    }
    return moving;
  }

  function tick(dt) {
    S.t += dt;
    S.shake = Math.max(0, S.shake - dt * 2.4);
    S.counterPop = Math.max(0, S.counterPop - dt * 3);
    for (const row of S.grid) for (const c of row) if (c) {
      c.squash = Math.max(0, c.squash - dt * 4);
      if (S.t > c.blinkAt + 0.15) c.blinkAt = S.t + 1.8 + rand() * 4.5;
    }
    S.parts.update(dt, CELL * 22);
    for (const tx of S.texts) tx.age += dt;
    S.texts = S.texts.filter(tx => tx.age < 1.4);
    if (S.banner) S.banner.age += dt;
    S.shownScore += (S.score - S.shownScore) * Math.min(1, dt * 7);
    if (Math.abs(S.score - S.shownScore) < 1) S.shownScore = S.score;

    if (S.phase === 'build') {
      stepFalling(dt);
      if (!S.falling.length && S.t > S.buildEnd) { S.phase = 'aim'; S.aimAt = S.t; }
    } else if (S.phase === 'aim') {
      // the open column glows, then the next bar drops into it
      S.wellGlow = Math.min(1, (S.t - S.aimAt) / 0.25);
      if (S.t - S.aimAt > (S.bars === 0 ? 0.55 : 0.2)) { dropBar(); S.phase = 'bar'; }
    } else if (S.phase === 'bar') {
      if (S.clearing) {
        S.clearT += dt;
        if (S.clearT > 0.48) {
          S.wellGlow = 0;
          if (finishClear()) S.lastClear = true;
          S.phase = 'settle';
        }
      } else stepFalling(dt);
    } else if (S.phase === 'settle') {
      if (!settle(dt)) {
        S.settleT += dt;
        if (S.settleT > 0.12) {
          if (S.lastClear) {
            S.phase = 'finale'; S.flowerAt = S.t;
            S.banner = { age: 0 };
            S.parts.confetti(VW, VH, 220, rand);
            ev('fanfare'); ev('allClear'); ev('cheer');
            S.endAt = S.t + 3.6;
          } else { S.phase = 'aim'; S.aimAt = S.t; }
        }
      }
    } else if (S.phase === 'finale') {
      if (S.t >= S.endAt) S.done = true;
    }
  }

  // ---------- drawing ----------
  function outlined(text, x, y, size, fill, stroke, lw, font, align, weight) {
    ctx.font = `${weight || ''} ${size}px ${font || FD}`;
    ctx.textAlign = align || 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#1f2f15');
    g.addColorStop(0.35, '#18120c');
    g.addColorStop(1, '#0d0906');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    const heat = Math.min(1, S.lines / 16);
    const rg = ctx.createRadialGradient(FX + FW / 2, FY + FH * 0.5, 50, FX + FW / 2, FY + FH * 0.5, 900);
    rg.addColorStop(0, `rgba(255,${212 - heat * 60},59,${0.05 + heat * 0.16 + S.shake * 0.06})`);
    rg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 36; i++) {
      const speed = 18 + (i % 7) * 6;
      const y = VH - ((S.t * speed + i * 211) % (VH + 100));
      const x = ((i * 389) % VW) + Math.sin(S.t * 0.7 + i) * 20;
      ctx.fillStyle = `rgba(220,255,170,${0.05 + (i % 5) * 0.025})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGround() {
    const y0 = FY + FH + 26;
    const g = ctx.createLinearGradient(0, y0, 0, VH);
    g.addColorStop(0, '#22180f');
    g.addColorStop(1, '#0d0906');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, VW, VH - y0);
    for (let i = 0; i < 70; i++) {
      const x = (i * 157) % VW, hgt = 18 + ((i * 37) % 30);
      const sway = Math.sin(S.t * 1.6 + i) * 4;
      ctx.strokeStyle = i % 3 ? '#3f7a2a' : '#5fa83a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y0 + 6);
      ctx.quadraticCurveTo(x + sway * 0.5, y0 - hgt * 0.5, x + sway, y0 - hgt + 6);
      ctx.stroke();
    }
  }

  function drawHeader() {
    const final = S.phase === 'finale';
    if (S.bars > 0 && (S.lines > 0 || final)) {
      const n = S.lines / 4;
      ctx.save();
      ctx.translate(VW / 2, 140);
      const sc = 1 + S.counterPop * 0.12 + (final ? Math.sin(S.t * 6) * 0.025 : 0);
      ctx.scale(sc, sc);
      if (final) { ctx.shadowColor = 'rgba(255,212,59,.8)'; ctx.shadowBlur = 40; }
      ctx.font = `150px ${FD}`;
      const main = '4段消し', tail = '×' + n;
      const mw = ctx.measureText(main).width;
      ctx.font = `110px ${FD}`;
      const tw = ctx.measureText(tail).width;
      const x0 = -(mw + 14 + tw) / 2;
      outlined(main, x0, 52, 150, final || n >= 4 ? '#ffd43b' : '#ffffff', '#2a1608', 24, FD, 'left');
      outlined(tail, x0 + mw + 14, 52, 110, '#ffd43b', '#2a1608', 20, FD, 'left');
      ctx.restore();
    }
    ctx.save();
    ctx.font = `900 30px ${FB}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9c4a8';
    ctx.fillText('消した段', FX, 272);
    const lw = ctx.measureText('消した段').width;
    ctx.font = `38px ${FD}`;
    ctx.fillStyle = S.lines >= 16 ? '#8fd14f' : '#eef5e4';
    ctx.fillText(String(S.lines), FX + lw + 12, 274);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd43b';
    const sc2 = Math.round(S.shownScore).toLocaleString('en-US');
    ctx.fillText(sc2, FX + FW, 274);
    const w = ctx.measureText(sc2).width;
    ctx.font = `900 30px ${FB}`;
    ctx.fillStyle = '#b9c4a8';
    ctx.fillText('スコア', FX + FW - w - 12, 272);
    ctx.restore();
  }

  // left-hand gauge: one leaf per cleared row, a flower at 16
  function drawGauge() {
    const x0 = 100, yTop = FY + 40, yBot = FY + FH - 20, N = 16;
    const step = (yBot - yTop) / N;
    const wob = y => x0 + Math.sin(y / 70) * 10;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(143,209,79,.16)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x0, yBot);
    for (let y = yBot; y >= yTop; y -= 8) ctx.lineTo(wob(y), y);
    ctx.stroke();
    const grown = S.leafAt.filter(t => t != null && S.t >= t).length;
    if (grown > 0) {
      const lastAt = S.leafAt[grown - 1];
      const grow = Math.min(1, (S.t - lastAt) / 0.2);
      const yEnd = yBot - step * (grown - 1 + grow);
      ctx.strokeStyle = '#4f9a32';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(x0, yBot);
      for (let y = yBot; y >= yEnd; y -= 6) ctx.lineTo(wob(y), y);
      ctx.stroke();
    }
    for (let i = 0; i < N; i++) {
      const y = yBot - step * (i + 1), x = wob(y), side = i % 2 ? -1 : 1;
      const at = S.leafAt[i];
      if (at != null && S.t >= at) {
        const age = S.t - at, k = Math.min(1, age / 0.22);
        const s = k < 1 ? k * 1.25 : 1 + Math.max(0, 0.25 - (age - 0.22) * 1.5);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 1.05);
        ctx.scale(s * 70, s * 70);
        const lg = ctx.createLinearGradient(0, 0, 0, -1);
        lg.addColorStop(0, '#3f8f2a');
        lg.addColorStop(1, '#8ad94f');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(0.42, -0.18, 0.36, -0.72, 0, -1);
        ctx.bezierCurveTo(-0.36, -0.72, -0.42, -0.18, 0, 0);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.fillStyle = 'rgba(143,209,79,.25)';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if ((i + 1) % 4 === 0) {
        ctx.font = `26px ${FD}`;
        ctx.textAlign = side > 0 ? 'right' : 'left';
        ctx.fillStyle = at != null && S.t >= at ? '#eef5e4' : 'rgba(238,245,228,.35)';
        ctx.fillText(String(i + 1), x - side * 34, y + 9);
      }
    }
    if (S.flowerAt != null) {
      const age = S.t - S.flowerAt, k = Math.min(1, age / 0.4), y = yTop - 28;
      ctx.save();
      ctx.translate(wob(y), y);
      ctx.scale(k * 2.2, k * 2.2);
      ctx.rotate(age * 0.8);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate((i / 6) * Math.PI * 2);
        ctx.fillStyle = '#fffaf2';
        ctx.beginPath();
        ctx.ellipse(0, -16, 9, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#ffcc2e';
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawField() {
    const sh = S.shake * CELL * 0.1;
    const ox = FX + Math.sin(S.t * 71) * sh, oy = FY + Math.cos(S.t * 53) * sh;
    const X = x => ox + (x + 0.5) * CELL, Y = y => oy + FH - (y + 0.5) * CELL;
    ctx.save();
    ctx.fillStyle = '#120c08';
    roundRect(ox - 12, oy - 12, FW + 24, FH + 24, 26);
    ctx.fill();
    ctx.strokeStyle = '#4a3626';
    ctx.lineWidth = 6;
    roundRect(ox - 6, oy - 6, FW + 12, FH + 12, 20);
    ctx.stroke();
    ctx.save();
    roundRect(ox, oy, FW, FH, 14);
    ctx.clip();
    ctx.drawImage(soil, ox, oy);
    if (S.wellGlow > 0) {
      ctx.fillStyle = `rgba(255,212,59,${(0.14 + 0.1 * Math.sin(S.t * 9)) * S.wellGlow})`;
      ctx.fillRect(X(7) - CELL / 2, oy, CELL, FH);
    }

    const g = S.grid, settled = (c, y) => Math.abs(c.y - y) < 0.01;
    for (let y = 0; y < L.H; y++) for (let x = 0; x < COLS; x++) {
      const c = g[y][x];
      if (!c || !settled(c, y)) continue;
      const r = x + 1 < COLS && g[y][x + 1];
      if (r && r.pid === c.pid && settled(r, y)) A.drawLink(ctx, X(x), Y(y), X(x + 1), Y(y), CELL, c.c);
      const u = y + 1 < L.H && g[y + 1][x];
      if (u && u.pid === c.pid && settled(u, y + 1)) A.drawLink(ctx, X(x), Y(y), X(x), Y(y + 1), CELL, c.c);
    }
    const flashOn = S.clearing ? (Math.sin(S.clearT * 34) > 0 ? 1 : 0.15) : 0;
    const bar = S.falling.find(f => f.bar);
    const lookX = bar ? 7 : 3.5;
    const items = [];
    for (let y = 0; y < L.H; y++) for (let x = 0; x < COLS; x++) if (g[y][x]) items.push({ c: g[y][x], x, y: g[y][x].y });
    for (const f of S.falling) {
      if (S.t < f.startAt) continue;
      for (const { x, y, cell } of f.cells) items.push({ c: cell, x, y: y + f.lift, team: f });
    }
    // links inside falling teams
    for (const f of S.falling) {
      if (S.t < f.startAt) continue;
      for (const a of f.cells) for (const b of f.cells) {
        if (a === b || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1 || a.x > b.x || a.y > b.y) continue;
        A.drawLink(ctx, X(a.x), Y(a.y + f.lift), X(b.x), Y(b.y + f.lift), CELL, a.cell.c);
      }
    }
    items.sort((a, b) => a.y - b.y);
    for (const { c, x, y } of items) {
      if (y > ROWS + 0.6) continue;
      const k = c.squash;
      const blink = S.t > c.blinkAt && S.t < c.blinkAt + 0.15 ? 1 : 0;
      A.drawSprout(ctx, X(x), Y(y), CELL, c.c, {
        sx: 1 + 0.16 * k, sy: 1 - 0.2 * k, time: S.t, seed: c.seed, stage: c.stage,
        blink, look: Math.max(-1, Math.min(1, (lookX - x) / 3)), happy: c.happy, flash: c.happy ? flashOn : 0,
      });
    }
    ctx.restore();
    ctx.restore();

    ctx.save();
    ctx.translate(ox - FX, oy - FY);
    const conf = S.parts.list.filter(q => q.kind === 'conf');
    S.parts.list = S.parts.list.filter(q => q.kind !== 'conf');
    S.parts.draw(ctx);
    S.parts.list = S.parts.list.concat(conf);
    for (const t of S.texts) drawClearText(t);
    ctx.restore();
  }

  function drawClearText(t) {
    const age = t.age, k = Math.min(1, age / 0.16);
    const sc = age < 0.16 ? 0.4 + k * 0.8 : 1.2 - Math.min(0.2, (age - 0.16) * 1.2);
    const alpha = age > 0.9 ? Math.max(0, 1 - (age - 0.9) / 0.35) : 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(FX + FW / 2, FY + FH - (t.y + 0.5) * CELL - Math.min(age, 0.6) * CELL * 0.6);
    ctx.scale(sc, sc);
    outlined(t.n + '段消し!!', 0, 30, 110, '#ffd43b', '#2a1608', 20, FD);
    if (t.combo > 1) outlined(t.combo + 'れんぞく', 0, 100, 54, '#8fd14f', '#2a1608', 12, FD);
    ctx.restore();
  }

  function drawBanner() {
    if (!S.banner) return;
    const age = S.banner.age, k = Math.min(1, age / 0.3), ease = 1 - Math.pow(1 - k, 3);
    const cy = FY + FH * 0.47;
    ctx.save();
    ctx.fillStyle = `rgba(14,10,6,${0.55 * ease})`;
    ctx.fillRect(0, cy - 165, VW, 330);
    ctx.translate(VW / 2, cy);
    ctx.scale((0.5 + 0.5 * ease) * (1 + Math.sin(age * 5) * 0.03), (0.5 + 0.5 * ease) * (1 + Math.sin(age * 5) * 0.03));
    ctx.shadowColor = 'rgba(255,212,59,.7)';
    ctx.shadowBlur = 30;
    outlined('全消し!', 0, 42, 120, '#ffd43b', '#2a1608', 24, FD);
    ctx.restore();
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground();
    drawGround();
    drawGauge();
    drawField();
    drawHeader();
    drawBanner();
    const conf = S.parts.list.filter(q => q.kind === 'conf');
    if (conf.length) {
      const keep = S.parts.list;
      S.parts.list = conf;
      S.parts.draw(ctx);
      S.parts.list = keep;
    }
  }

  // ---------- soundtrack ----------
  async function renderAudio(duration) {
    const Sfx = window.Sfx, sr = 44100;
    const oc = new OfflineAudioContext(2, Math.ceil(duration * sr), sr);
    const comp = oc.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(oc.destination);
    const master = oc.createGain();
    master.gain.value = 0.95;
    master.gain.setValueAtTime(0.95, Math.max(0, duration - 0.7));
    master.gain.linearRampToValueAtTime(0.0001, duration);
    master.connect(comp);
    const music = oc.createGain();
    music.gain.value = 0.42;
    music.connect(master);
    Sfx.bgm(oc, music, 0.05, 0, Math.ceil(duration / Sfx.BAR) + 1, 1);
    let lastLand = -1;
    for (const e of S.events) {
      if (e.type === 'land') { if (e.arg < 1 && e.t - lastLand < 0.06) continue; lastLand = e.t; Sfx.land(oc, master, e.t, e.arg); }
      else if (e.type === 'voice') Sfx.voice(oc, master, e.t, e.arg);
      else if (e.type === 'hoi') Sfx.hoi(oc, master, e.t + 0.05);
      else if (e.type === 'pop') Sfx.pop(oc, master, e.t, e.arg);
      else if (e.type === 'fanfare') Sfx.fanfare(oc, master, e.t);
      else if (e.type === 'allClear') Sfx.allClear(oc, master, e.t + 0.9);
      else if (e.type === 'cheer') Sfx.cheer(oc, master, e.t + 0.15);
    }
    const buf = await oc.startRendering();
    const wav = new Uint8Array(Sfx.toWav(buf));
    let bin = '';
    for (let i = 0; i < wav.length; i += 0x8000) bin += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  window.Director = {
    init, tick, draw, renderAudio, canvas, state: S,
    frame(dt, quality) { tick(dt); draw(); return canvas.toDataURL('image/jpeg', quality || 0.93); },
  };
})();
