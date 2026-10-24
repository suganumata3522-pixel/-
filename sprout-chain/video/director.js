// Frame-by-frame director for the 1080x1920 Shorts video.
// Runs inside a page that already loaded Engine, Art, Sfx and BOARDS. Deterministic: tick(1/fps) then draw().
(function () {
  const E = window.Engine, A = window.Art;
  const VW = 1080, VH = 1920, CELL = 96, FX = 270, FY = 372, FW = CELL * 6, FH = CELL * 13;
  const FD = '"Mochiy Pop One", "Zen Maru Gothic", sans-serif';
  const FB = '"Zen Maru Gothic", "Mochiy Pop One", sans-serif';
  const G = 62; // gravity, rows/s^2

  const canvas = document.createElement('canvas');
  canvas.width = VW; canvas.height = VH;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const soil = A.makeSoil(FW, FH + CELL, CELL, 6, 14);

  let seed = 20261024;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const S = {
    t: 0, phase: 'build', phaseT: 0, cols: [[], [], [], [], [], []], chain: 0, score: 0, shownScore: 0,
    popping: null, popT: 0, settleT: 0, texts: [], parts: new A.Particles(), shake: 0, banner: null,
    counterPop: 0, leafAt: [], flowerAt: null, events: [], done: false, endAt: null, total: 0, lastStart: 0,
  };

  function mk(c) {
    const r = rand();
    return { c, stage: r < 0.58 ? 0 : r < 0.83 ? 1 : 2, seed: rand() * 10, y: 0, vy: 0, squash: 0, happy: false, wait: 0, blinkAt: 0.6 + rand() * 3 };
  }

  function init(boardIndex) {
    const b = window.BOARDS[boardIndex || 0];
    const full = b.cols.map(s => [...s].map(Number));
    const h = full[2].length;
    S.trigger = [full[2][h - 2], full[2][h - 1]];
    full[2] = full[2].slice(0, h - 2);
    full.forEach((col, x) => col.forEach((c, i) => {
      const p = mk(c);
      p.y = 14.2 + i * 0.25;
      p.wait = 0.15 + i * 0.12 + ((x * 7) % 6) * 0.018;
      S.lastStart = Math.max(S.lastStart, p.wait);
      S.cols[x].push(p);
    }));
    S.total = full.reduce((a, c) => a + c.length, 0) + 2;
  }

  function ev(type, arg) { S.events.push({ t: S.t, type, arg }); }

  function fall(dt) {
    let moving = false, landed = 0;
    for (const col of S.cols) col.forEach((p, i) => {
      if (S.t < p.wait) { moving = true; return; }
      if (p.y > i) {
        p.vy = Math.min(p.vy + G * dt, 22);
        p.y -= p.vy * dt;
        if (p.y <= i) { p.y = i; if (p.vy > 4) { p.squash = 1; landed++; } p.vy = 0; } else moving = true;
      } else p.y = i;
    });
    if (landed) ev('land', Math.min(1, 0.35 + landed * 0.08));
    return moving;
  }

  function flashTime() { return 0.54 - S.chain * 0.006; }

  function checkPops() {
    const r = E.step(S.cols.map(c => c.map(p => p.c)), S.chain + 1);
    if (!r) return false;
    S.chain++;
    S.score += r.score;
    S.popping = r.popping.map(g => g.cells.map(([x, y]) => ({ x, y, p: S.cols[x][y] })));
    let sx = 0, sy = 0, n = 0;
    for (const g of S.popping) for (const q of g) { q.p.happy = true; sx += q.x; sy += q.y; n++; }
    S.texts.push({ n: S.chain, x: sx / n, y: sy / n, age: 0 });
    S.focus = { x: sx / n, y: sy / n };
    S.leafAt[S.chain - 1] = S.t;
    S.counterPop = 1;
    S.popT = 0;
    ev('voice', S.chain);
    return true;
  }

  function finishPop() {
    const dead = new Set();
    for (const g of S.popping) for (const q of g) {
      dead.add(q.p);
      S.parts.burst(FX + (q.x + 0.5) * CELL, FY + FH - (q.y + 0.5) * CELL, CELL, q.p.c, q.p.stage, Math.min(S.chain, 19) / 4, rand);
    }
    for (let x = 0; x < 6; x++) S.cols[x] = S.cols[x].filter(p => !dead.has(p));
    S.popping = null;
    S.shake = Math.min(1, 0.3 + S.chain * 0.04);
    ev('pop', S.chain);
  }

  function tick(dt) {
    S.t += dt;
    S.phaseT += dt;
    S.shake = Math.max(0, S.shake - dt * 2.4);
    S.counterPop = Math.max(0, S.counterPop - dt * 3);
    for (const col of S.cols) for (const p of col) {
      p.squash = Math.max(0, p.squash - dt * 4);
      if (S.t > p.blinkAt + 0.15) p.blinkAt = S.t + 1.8 + rand() * 4.5;
    }
    S.parts.update(dt, CELL * 22);
    for (const tx of S.texts) tx.age += dt;
    S.texts = S.texts.filter(tx => tx.age < 1.4);
    if (S.banner) S.banner.age += dt;
    S.shownScore += (S.score - S.shownScore) * Math.min(1, dt * 7);
    if (Math.abs(S.score - S.shownScore) < 1) S.shownScore = S.score;

    if (S.phase === 'build') {
      const moving = fall(dt);
      if (!moving && S.t > S.lastStart + 0.4) {
        S.phase = 'trigger'; S.phaseT = 0;
        const a = mk(S.trigger[0]), b = mk(S.trigger[1]);
        a.y = 14.4; b.y = 15.4; a.wait = b.wait = S.t + 0.55; a.trigger = b.trigger = true;
        S.cols[2].push(a, b);
        S.pair = [a, b];
      }
    } else if (S.phase === 'trigger') {
      const moving = fall(dt);
      if (!moving && !S.triggered && S.phaseT > 0.8) { S.triggered = true; S.trigAt = S.t; }
      if (S.triggered && S.t > S.trigAt + 0.5) { S.phase = 'chain'; S.phaseT = 0; S.settleT = 0; }
    } else if (S.phase === 'chain') {
      if (S.popping) {
        S.popT += dt;
        if (S.popT > flashTime()) finishPop();
      } else if (!fall(dt)) {
        S.settleT += dt;
        if (S.settleT > 0.07) {
          S.settleT = 0;
          if (!checkPops()) {
            S.phase = 'finale'; S.phaseT = 0; S.flowerAt = S.t;
            S.banner = { age: 0 };
            S.parts.confetti(VW, VH, 220, rand);
            ev('fanfare'); ev('allClear');
            S.endAt = S.t + 3.7;
          }
        }
      } else S.settleT = 0;
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

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, '#1f2f15');
    g.addColorStop(0.35, '#18120c');
    g.addColorStop(1, '#0d0906');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    const heat = Math.min(1, S.chain / 19);
    const rg = ctx.createRadialGradient(FX + FW / 2, FY + FH * 0.45, 50, FX + FW / 2, FY + FH * 0.45, 900);
    rg.addColorStop(0, `rgba(255,${212 - heat * 60},59,${0.05 + heat * 0.16 + S.shake * 0.06})`);
    rg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, VW, VH);
    // drifting spores
    for (let i = 0; i < 36; i++) {
      const sx = (i * 389) % VW, speed = 18 + (i % 7) * 6;
      const y = VH - ((S.t * speed + i * 211) % (VH + 100));
      const x = sx + Math.sin(S.t * 0.7 + i) * 20;
      ctx.fillStyle = `rgba(220,255,170,${0.05 + (i % 5) * 0.025})`;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHeader() {
    // pill + line: 理論値 | 6×13マスの最大れんさ
    ctx.font = `48px ${FD}`;
    const line = '6×13マスの最大れんさ', lw1 = ctx.measureText(line).width, pw = 150, gap = 18;
    const x1 = VW / 2 - (pw + gap + lw1) / 2;
    ctx.fillStyle = '#8fd14f';
    roundRect(x1, 56, pw, 60, 30);
    ctx.fill();
    ctx.font = `36px ${FD}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10210a';
    ctx.fillText('理論値', x1 + pw / 2, 99);
    outlined(line, x1 + pw + gap, 103, 48, '#eef5e4', '#120c08', 12, FD, 'left');
    const n = S.phase === 'build' || S.phase === 'trigger' ? 19 : S.chain;
    const label = n + '連鎖';
    const k = S.counterPop;
    const final = S.phase === 'finale';
    ctx.save();
    ctx.translate(VW / 2, 228);
    const sc = 1 + k * 0.12 + (final ? Math.sin(S.t * 6) * 0.025 : 0);
    ctx.scale(sc, sc);
    const fill = S.phase === 'chain' && n < 19 ? (n >= 15 ? '#ffb02e' : '#ffffff') : '#ffd43b';
    if (final) { ctx.shadowColor = 'rgba(255,212,59,.8)'; ctx.shadowBlur = 40; }
    outlined(label + (final ? '!!' : ''), 0, 58, 168, fill, '#2a1608', 26, FD);
    ctx.restore();
    // remaining sprouts and score, aligned to the field edges
    const left = S.cols.reduce((a, c) => a + c.filter(p => S.t >= p.wait && p.y < 13.2).length, 0);
    ctx.save();
    ctx.font = `900 30px ${FB}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b9c4a8';
    ctx.fillText('のこり', FX, 352);
    ctx.fillStyle = left === 0 ? '#8fd14f' : '#eef5e4';
    ctx.font = `38px ${FD}`;
    ctx.fillText(String(left), FX + 98, 354);
    const lw = ctx.measureText(String(left)).width;
    ctx.font = `900 30px ${FB}`;
    ctx.fillStyle = '#b9c4a8';
    ctx.fillText('ひき', FX + 104 + lw, 352);
    ctx.textAlign = 'right';
    ctx.font = `38px ${FD}`;
    ctx.fillStyle = '#ffd43b';
    const sc2 = Math.round(S.shownScore).toLocaleString('en-US');
    ctx.fillText(sc2, FX + FW, 354);
    const w = ctx.measureText(sc2).width;
    ctx.font = `900 30px ${FB}`;
    ctx.fillStyle = '#b9c4a8';
    ctx.fillText('スコア', FX + FW - w - 12, 352);
    ctx.restore();
  }

  // left-hand gauge: a stem that grows one leaf per chain and blooms at 19
  function drawGauge() {
    const x0 = 140, yTop = FY + 40, yBot = FY + FH - 20;
    const step = (yBot - yTop) / 19;
    const grown = S.chain;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(143,209,79,.16)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x0, yBot);
    for (let y = yBot; y >= yTop; y -= 8) ctx.lineTo(x0 + Math.sin(y / 70) * 10, y);
    ctx.stroke();
    if (grown > 0) {
      const lastAt = S.leafAt[grown - 1] || 0;
      const grow = Math.min(1, (S.t - lastAt) / 0.25);
      const yEnd = yBot - step * (grown - 1 + grow);
      ctx.strokeStyle = '#4f9a32';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(x0, yBot);
      for (let y = yBot; y >= yEnd; y -= 6) ctx.lineTo(x0 + Math.sin(y / 70) * 10, y);
      ctx.stroke();
    }
    for (let i = 0; i < 19; i++) {
      const y = yBot - step * (i + 1);
      const x = x0 + Math.sin(y / 70) * 10;
      const side = i % 2 ? -1 : 1;
      const at = S.leafAt[i];
      if (at != null && i < grown) {
        const age = S.t - at;
        const k = Math.min(1, age / 0.22);
        const s = (k < 1 ? k * 1.25 : 1 + Math.max(0, 0.25 - (age - 0.22) * 1.5)) * 1;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(side * 1.05);
        ctx.scale(s * 70, s * 70);
        const lg = ctx.createLinearGradient(0, 0, 0, -1);
        lg.addColorStop(0, '#3f8f2a');
        lg.addColorStop(1, i === grown - 1 && S.phase !== 'finale' ? '#d8ff8a' : '#8ad94f');
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
      if ((i + 1) % 5 === 0 || i === 18) {
        ctx.font = `26px ${FD}`;
        ctx.textAlign = side > 0 ? 'right' : 'left';
        ctx.fillStyle = i < grown ? '#eef5e4' : 'rgba(238,245,228,.35)';
        ctx.fillText(String(i + 1), x - side * 34, y + 9);
      }
    }
    if (S.flowerAt != null) {
      const age = S.t - S.flowerAt;
      const k = Math.min(1, age / 0.4);
      const y = yBot - step * 19 - 8;
      ctx.save();
      ctx.translate(x0 + Math.sin(y / 70) * 10, y);
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
    ctx.save();
    // frame
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
    A.drawFieldMarks(ctx, ox, oy, CELL, 13, S.cols[2].length < 12);
    const X = x => ox + (x + 0.5) * CELL, Y = y => oy + FH - (y + 0.5) * CELL;
    const settled = (p, i) => Math.abs(p.y - i) < 0.01 && S.t >= p.wait;
    for (let x = 0; x < 6; x++) {
      const col = S.cols[x];
      for (let i = 0; i < Math.min(col.length, 12); i++) {
        const p = col[i];
        if (!settled(p, i)) continue;
        const r = S.cols[x + 1] && S.cols[x + 1][i];
        if (r && r.c === p.c && settled(r, i)) A.drawLink(ctx, X(x), Y(i), X(x + 1), Y(i), CELL, p.c);
        const u = col[i + 1];
        if (u && i + 1 < 12 && u.c === p.c && settled(u, i + 1)) A.drawLink(ctx, X(x), Y(i), X(x), Y(i + 1), CELL, p.c);
      }
    }
    const all = [];
    for (let x = 0; x < 6; x++) S.cols[x].forEach((p, i) => all.push({ p, x, i }));
    all.sort((a, b) => a.p.y - b.p.y);
    const flashOn = S.popping ? (Math.sin(S.popT * 34) > 0 ? 1 : 0.15) : 0;
    for (const { p, x, i } of all) {
      if (p.y > 13.8) continue;
      const k = p.squash, st = p.vy > 6 ? 0.06 : 0;
      const look = S.focus ? Math.max(-1, Math.min(1, (S.focus.x - x) / 2.5)) : 0;
      const blink = S.t > p.blinkAt && S.t < p.blinkAt + 0.15 ? 1 : 0;
      if (p.trigger && S.phase === 'trigger') {
        const pulse = 0.5 + 0.5 * Math.sin(S.t * 10);
        ctx.strokeStyle = `rgba(255,255,230,${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(X(x), Y(p.y) + CELL * 0.08, CELL * 0.48, 0, Math.PI * 2);
        ctx.stroke();
      }
      A.drawSprout(ctx, X(x), Y(p.y), CELL, p.c, {
        sx: 1 + 0.16 * k - st, sy: 1 - 0.2 * k + st, time: S.t, seed: p.seed, stage: p.stage,
        blink, look, happy: p.happy, flash: p.happy ? flashOn : 0, alpha: i >= 12 ? 0.8 : 1,
      });
    }
    ctx.restore();
    ctx.restore();

    // "13段目" tag beside the hidden row
    ctx.save();
    ctx.font = `900 26px ${FB}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(238,245,228,.55)';
    ctx.fillText('← 13段目', FX + FW + 22, FY + CELL * 0.5 + 9);
    ctx.font = `900 20px ${FB}`;
    ctx.fillStyle = 'rgba(238,245,228,.38)';
    ctx.fillText('(つながらない)', FX + FW + 22, FY + CELL * 0.5 + 38);
    ctx.restore();

    // trigger callout on the field
    if (S.phase === 'trigger' || (S.phase === 'chain' && S.chain === 0)) {
      const txt = S.triggered ? 'はっか!' : 'さいごの1手';
      const a = Math.min(1, S.phaseT / 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(14,10,6,.72)';
      roundRect(FX + FW / 2 - 200, FY + CELL * 2.2, 400, 104, 52);
      ctx.fill();
      const pop = S.triggered ? 1 + Math.max(0, 0.25 - (S.t - S.trigAt)) : 1;
      ctx.translate(FX + FW / 2, FY + CELL * 2.2 + 74);
      ctx.scale(pop, pop);
      outlined(txt, 0, 0, S.triggered ? 64 : 50, S.triggered ? '#ffd43b' : '#ffffff', '#2a1608', 12, FD);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ox - FX, oy - FY);
    const conf = S.parts.list.filter(q => q.kind === 'conf');
    S.parts.list = S.parts.list.filter(q => q.kind !== 'conf');
    S.parts.draw(ctx);
    S.parts.list = S.parts.list.concat(conf);
    for (const t of S.texts) A.drawChainText(ctx, FX + (t.x + 0.5) * CELL, FY + FH - (t.y + 0.5) * CELL, t.n, t.age, CELL * 1.15, FD);
    ctx.restore();
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

  function drawBanner() {
    if (!S.banner) return;
    const age = S.banner.age;
    const k = Math.min(1, age / 0.3);
    const ease = 1 - Math.pow(1 - k, 3);
    ctx.save();
    ctx.fillStyle = `rgba(14,10,6,${0.55 * ease})`;
    ctx.fillRect(0, 820, VW, 330);
    ctx.translate(VW / 2, 975);
    const sc = (0.5 + 0.5 * ease) * (1 + Math.sin(age * 5) * 0.03);
    ctx.scale(sc, sc);
    ctx.shadowColor = 'rgba(255,212,59,.7)';
    ctx.shadowBlur = 30;
    outlined('理論値たっせい!', 0, 0, 104, '#ffd43b', '#2a1608', 22, FD);
    ctx.shadowBlur = 0;
    const k2 = Math.min(1, Math.max(0, (age - 0.35) / 0.25));
    ctx.globalAlpha = k2;
    outlined('全消し!', 0, 115, 80, '#ffffff', '#2a1608', 16, FD);
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
    const sr = 44100;
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
    const bars = Math.ceil(duration / window.Sfx.BAR) + 1;
    window.Sfx.bgm(oc, music, 0.05, 0, bars, 1);
    let lastLand = -1;
    for (const e of S.events) {
      if (e.type === 'land') { if (e.t - lastLand < 0.06) continue; lastLand = e.t; window.Sfx.land(oc, master, e.t, e.arg * 0.8); }
      else if (e.type === 'voice') window.Sfx.voice(oc, master, e.t, e.arg);
      else if (e.type === 'pop') window.Sfx.pop(oc, master, e.t, e.arg);
      else if (e.type === 'fanfare') window.Sfx.fanfare(oc, master, e.t);
      else if (e.type === 'allClear') window.Sfx.allClear(oc, master, e.t + 0.9);
    }
    const buf = await oc.startRendering();
    const wav = new Uint8Array(window.Sfx.toWav(buf));
    let bin = '';
    for (let i = 0; i < wav.length; i += 0x8000) bin += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  window.Director = {
    init, tick, draw, renderAudio, canvas, state: S,
    frame(dt, quality) { tick(dt); draw(); return canvas.toDataURL('image/jpeg', quality || 0.93); },
  };
})();
