'use strict';
// 描画: この canvas がそのまま録画(ショート動画)になる
(function (DF) {
  const U = DF.U, C = DF.C, W = DF.World, S = DF.Sprites;
  const R = { canvas: null, ctx: null, light: null, lctx: null, aim: null };
  const LS = 0.5; // 暗さレイヤーの解像度

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.light = U.makeCanvas(C.VW * LS, C.VH * LS);
    R.lctx = R.light.getContext('2d');
    R.rain = [];
    for (let i = 0; i < 150; i++) R.rain.push({ x: Math.random() * C.VW, y: Math.random() * C.VH, s: U.rand(0.7, 1.3) });
  };

  const drawList = [];
  function push(y, kind, ref) { drawList.push({ y, kind, ref }); }

  R.draw = function (G, dtReal) {
    const ctx = R.ctx;
    const t = G.time;
    const shake = G.cam.shake;
    const cx = Math.round(G.cam.x + (shake ? U.rand(-shake, shake) : 0));
    const cy = Math.round(G.cam.y + (shake ? U.rand(-shake, shake) : 0));
    const x0 = cx - 140, x1 = cx + C.VW + 140, y0 = cy - 120, y1 = cy + C.VH + 260;
    const vis = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const sx = U.clamp(cx, 0, C.WW - C.VW), sy = U.clamp(cy, 0, C.WH - C.VH);
    ctx.fillStyle = '#3d6b38';
    ctx.fillRect(0, 0, C.VW, C.VH);
    ctx.drawImage(W.ground, sx, sy, C.VW, C.VH, sx - cx, sy - cy, C.VW, C.VH);
    ctx.translate(-cx, -cy);

    drawWater(ctx, t, cy);

    // 影
    ctx.fillStyle = 'rgba(20,40,20,0.22)';
    for (const tr of W.trees) if (vis(tr.x, tr.y)) { ctx.beginPath(); ctx.ellipse(tr.x + 10, tr.y + 4, 52, 18, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(C.HOUSE.x + 8, C.HOUSE.y + 10, 128, 34, 0, 0, 7); ctx.fill();

    // 奥から順に描く
    drawList.length = 0;
    for (const tr of W.trees) if (vis(tr.x, tr.y)) push(tr.y, 'tree', tr);
    for (const r of W.rocks) if (vis(r.x, r.y)) push(r.y, 'rock', r);
    for (const d of G.decos) if (vis(d.x, d.y)) push(d.y, 'deco', d);
    for (const it of G.items) if (vis(it.x, it.y)) push(it.y, 'item', it);
    for (const k of G.kids) if (vis(k.x, k.y)) push(k.y, 'kid', k);
    for (const s of G.sprouts) if (s.state !== 'gone' && vis(s.x, s.y)) push(s.y, 'sprout', s);
    push(C.HOUSE.y, 'house', null);
    push(G.player.y, 'player', G.player);
    if (!W.gateOpen || (G.gate.anim >= 0 && G.gate.anim < 1.6)) push(C.GATE.y1 - 4, 'gate', null);
    for (const fl of W.flowersN) if (vis(fl.x, fl.y)) push(fl.y - 1, 'gflower', fl);
    const T = DF.Town;
    for (const b of T.buildings) if (vis(b.x, b.y)) push(T.base(b), 'building', b);
    for (const r of T.residents) if (r.state !== 'inside' && vis(r.x, r.y)) push(r.y, 'resident', r);
    drawList.sort((a, b) => a.y - b.y);

    const p = G.player;
    for (const d of drawList) {
      switch (d.kind) {
        case 'tree': drawTree(ctx, d.ref, p, t); break;
        case 'rock': S.draw(ctx, S.rock[d.ref.v], d.ref.x, d.ref.y); break;
        case 'deco': drawDeco(ctx, d.ref, t); break;
        case 'item': drawItem(ctx, d.ref, G); break;
        case 'kid': drawKid(ctx, d.ref, t); break;
        case 'sprout': drawSprout(ctx, d.ref, t); break;
        case 'house': S.draw(ctx, S.house, C.HOUSE.x, C.HOUSE.y); break;
        case 'player':
          ctx.fillStyle = 'rgba(20,40,20,0.25)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y, 16, 6, 0, 0, 7); ctx.fill();
          S.drawPlayer(ctx, p, t); break;
        case 'gate': drawGate(ctx, G); break;
        case 'gflower': drawGlowFlower(ctx, d.ref, t); break;
        case 'building': drawBuilding(ctx, d.ref, t, G); break;
        case 'resident': S.drawResident(ctx, d.ref, t); break;
        default: break;
      }
    }

    // 投げているどんぐりっこ(高いところにいるので最前面)
    for (const k of G.kids) if (k.state === 'air' && vis(k.x, k.y)) drawKid(ctx, k, t, true);
    for (const s of G.sprouts) if (s.state === 'fly' && s.t >= 0) drawSprout(ctx, s, t, true);

    drawParticles(ctx);
    drawShooting(ctx, G);

    // 運ぶ数の表示
    for (const it of G.items) {
      if (it.absorbing || !vis(it.x, it.y)) continue;
      const near = U.dist(it.x, it.y, p.x, p.y) < 220;
      if (!it.carriers.length && !near) continue;
      const pw = it.power || 0;
      const label = `${pw}/${it.def.w}`;
      const y = it.y - it.def.r * 1.25 - 26 - (it.moving ? Math.abs(Math.sin(t * 8)) * 3 : 0);
      ctx.font = `800 20px ${U.FONT}`;
      const w = ctx.measureText(label).width + 18;
      ctx.fillStyle = it.moving ? 'rgba(76,154,58,0.92)' : 'rgba(255,255,255,0.88)';
      U.roundRect(ctx, it.x - w / 2, y - 14, w, 28, 14); ctx.fill();
      ctx.fillStyle = it.moving ? '#fff' : '#5a3b1e';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, it.x, y + 1);
    }
    // 丸太の進み具合
    if (!W.gateOpen && G.gate.progress > 0.001) {
      const bx = (C.GATE.x0 + C.GATE.x1) / 2 - 70, by = C.GATE.y0 - 34;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; U.roundRect(ctx, bx - 3, by - 3, 146, 20, 10); ctx.fill();
      ctx.fillStyle = '#fff'; U.roundRect(ctx, bx, by, 140, 14, 7); ctx.fill();
      ctx.fillStyle = '#f29b38'; U.roundRect(ctx, bx, by, 140 * Math.min(1, G.gate.progress), 14, 7); ctx.fill();
    }
    // しごとの進み具合(木・岩)
    for (const j of G.jobs) {
      if ((j.kind !== 'tree' && j.kind !== 'rock') || !j.workers.length || !vis(j.x, j.y)) continue;
      const rx = j.x + (j.kind === 'tree' ? 40 : 0), ry = j.y - (j.kind === 'tree' ? 26 : j.ref.r + 34);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(rx, ry, 14, 0, 7); ctx.fill();
      ctx.strokeStyle = j.kind === 'tree' ? '#4c9a3a' : '#6c757d'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(rx, ry, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, j.progress)); ctx.stroke();
    }
    // 工事の進み具合
    for (const b of T.buildings) {
      if (b.done || !b.job || !vis(b.x, b.y)) continue;
      const spr = buildSprite(b);
      const bx = b.x - 70, by = T.base(b) - spr.h - 28;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; U.roundRect(ctx, bx - 3, by - 3, 146, 22, 11); ctx.fill();
      ctx.fillStyle = '#fff'; U.roundRect(ctx, bx, by, 140, 16, 8); ctx.fill();
      ctx.fillStyle = '#4c9a3a'; U.roundRect(ctx, bx, by, Math.max(16, 140 * Math.min(1, b.job.progress)), 16, 8); ctx.fill();
      ctx.font = `800 18px ${U.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(60,35,15,0.7)';
      const lbl = `${b.def.name} こうじ ${Math.floor(b.job.progress * 100)}%`;
      ctx.strokeText(lbl, b.x, by - 4); ctx.fillStyle = '#fff'; ctx.fillText(lbl, b.x, by - 4);
    }
    // 住人のふきだし・おねがいマーク
    for (const r of T.residents) {
      if (r.state === 'inside' || !vis(r.x, r.y)) continue;
      const hy = r.y - 92;
      if (r.talk) drawBubble(ctx, r.x, hy, DF.RESIDENTS[r.idx].name, r.talk.text, Math.min(1, r.talk.t * 3));
      else if (r.req && !r.req.seen) {
        const bob = Math.sin(t * 5 + r.id) * 4;
        ctx.fillStyle = '#f29b38'; ctx.beginPath(); ctx.arc(r.x, hy + bob, 15, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `800 22px ${U.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('！', r.x, hy + bob + 1);
      } else if (r.req) {
        ctx.fillStyle = 'rgba(255,255,255,0.92)'; U.roundRect(ctx, r.x - 34, hy - 16, 68, 32, 16); ctx.fill();
        S.draw(ctx, S.item[r.req.item], r.x - 16, hy, { scale: 14 / DF.ITEMS[r.req.item].r * 0.75 });
        ctx.fillStyle = '#5a3b1e'; ctx.font = `800 17px ${U.FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${r.req.got}/${r.req.count}`, r.x - 2, hy + 1);
      }
      if (r.happy > 0 && Math.random() < 0.05) G.burst(r.x, r.y - 60, 1, 'spark', { colors: ['#ff8fab'], z: 10, min: 5, max: 20, vzMin: 30, vzMax: 60, g: 0 });
    }
    // 「おいで！」の輪
    for (const r of G.rings) {
      const k = r.t / r.dur;
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, C.WHISTLE_R * U.easeOutCubic(k), C.WHISTLE_R * 0.75 * U.easeOutCubic(k), 0, 0, 7); ctx.stroke();
    }
    // マウスのねらい
    if (R.aim) {
      const ax = R.aim.x + cx, ay = R.aim.y + cy;
      const d = U.dist(p.x, p.y, ax, ay);
      const k = d > C.THROW_RANGE ? C.THROW_RANGE / d : 1;
      const tx = p.x + (ax - p.x) * k, ty = p.y + (ay - p.y) * k;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(tx, ty, 18, 12, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 20); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.setLineDash([]);
    }
    // 浮かぶ文字
    for (const f of G.floaters) {
      const k = f.t / f.dur;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      ctx.font = `800 ${f.size}px ${U.FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(70,40,10,0.8)';
      const fy = f.y - U.easeOutCubic(Math.min(1, k * 1.5)) * 50;
      ctx.strokeText(f.text, f.x, fy);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, fy);
      ctx.globalAlpha = 1;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawSky(ctx, G, cx, cy, t);
    drawBanner(ctx, G);
  };

  // ---------- 各パーツ ----------
  function drawWater(ctx, t, cy) {
    if (cy < C.SB + 20 && cy + C.VH > C.ST - 20) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 26; i++) {
        const lane = (i * 37) % 90;
        const x = ((i * 173 + t * (50 + (i % 5) * 12)) % (C.WW + 80)) - 40;
        if (x > C.BX0 - 30 && x < C.BX1 + 10) continue;
        const y = C.ST + 12 + lane;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 4, x + 28, y); ctx.stroke();
      }
    }
    for (const pd of W.ponds) {
      if (pd.y + pd.ry < cy - 50 || pd.y - pd.ry > cy + C.VH + 50) continue;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.35 + i / 3) % 1);
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.ellipse(pd.x + pd.rx * 0.2, pd.y + pd.ry * 0.1, 20 + k * 60, (20 + k * 60) * 0.5, 0, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawTree(ctx, tr, p, t) {
    const spr = S.tree[tr.v];
    const behind = p.y < tr.y - 6 && p.y > tr.y - spr.h + 30 && Math.abs(p.x - tr.x) < spr.w * 0.45;
    if (behind) ctx.globalAlpha = 0.55;
    ctx.save();
    ctx.translate(tr.x, tr.y);
    const chop = tr.job && tr.job.workers.length ? Math.sin(t * 38) * 0.018 : 0;
    ctx.rotate(Math.sin(t * 0.9 + tr.sway) * 0.012 + chop);
    ctx.drawImage(spr.c, -spr.ax, -spr.ay, spr.w, spr.h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawDeco(ctx, d, t) {
    const spr = S.deco[d.type];
    const age = DF.Game.time - (d.born || -10);
    const pop = age < 0.5 ? U.easeOutBack(age / 0.5) : 1;
    ctx.fillStyle = 'rgba(20,40,20,0.2)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, DF.DECOS[d.type].r + 4, 8, 0, 0, 7); ctx.fill();
    S.draw(ctx, spr, d.x, d.y, { scale: pop });
    if (d.type === 'pinwheel') S.drawPinwheel(ctx, d.x, d.y, t + d.ph);
  }

  function drawItem(ctx, it, G) {
    const spr = S.item[it.type];
    const sc = (it.spawnT < 1 ? U.easeOutBack(it.spawnT) : 1) * (it.scale == null ? 1 : it.scale);
    const bob = it.moving ? Math.abs(Math.sin(G.time * 8)) * 3 : 0;
    const lift = it.carriers.length ? 6 : 0;
    ctx.fillStyle = 'rgba(20,40,20,0.25)';
    ctx.beginPath(); ctx.ellipse(it.x, it.y + it.def.r * 0.5, it.def.r * 0.9 * sc, it.def.r * 0.35 * sc, 0, 0, 7); ctx.fill();
    const y = it.y - (it.z || 0) - lift - bob;
    if (it.def.glow || it.def.shiny) {
      const pulse = 0.6 + Math.sin(it.ph * 3) * 0.25;
      const r = it.def.r * 2.2;
      const g = ctx.createRadialGradient(it.x, y, 0, it.x, y, r);
      g.addColorStop(0, `rgba(255,240,170,${0.55 * pulse})`); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(it.x - r, y - r, r * 2, r * 2);
    }
    S.draw(ctx, spr, it.x, y, { scale: sc });
  }

  function drawKid(ctx, k, t, airPass) {
    if (k.state === 'air' && !airPass) {
      // 影だけ先に
      const s = Math.max(0.3, 1 - k.z / 260);
      ctx.fillStyle = 'rgba(20,40,20,0.25)';
      ctx.beginPath(); ctx.ellipse(k.x, k.y, 9 * s, 4 * s, 0, 0, 7); ctx.fill();
      return;
    }
    const spr = S.kid[k.type][k.dir];
    const hop = k.hop > 0 ? Math.sin((k.hop / 0.3) * Math.PI) * 9 : 0;
    const bob = k.moving ? Math.abs(Math.sin(k.walkT * 22)) * 2.2 : 0;
    const z = k.z + hop + bob;
    if (k.state !== 'air') {
      ctx.fillStyle = 'rgba(20,40,20,0.25)';
      ctx.beginPath(); ctx.ellipse(k.x, k.y, 9, 4, 0, 0, 7); ctx.fill();
      // あし
      ctx.fillStyle = k.def.cap;
      const ph = k.moving ? Math.sin(k.walkT * 22) : 0;
      ctx.beginPath(); ctx.ellipse(k.x - 4.5, k.y - 1.5 - Math.max(0, ph) * 3 - z * 0.6, 3.2, 2.2, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(k.x + 4.5, k.y - 1.5 - Math.max(0, -ph) * 3 - z * 0.6, 3.2, 2.2, 0, 0, 7); ctx.fill();
    }
    const y = k.y - z - 3;
    if (k.spin) {
      ctx.save(); ctx.translate(k.x, y - 18); ctx.rotate(k.spin);
      ctx.drawImage(spr.c, -spr.ax, -spr.ay + 18, spr.w, spr.h);
      ctx.restore();
    } else if (k.dir === 'side' && k.face < 0) {
      S.draw(ctx, spr, k.x, y, { flip: true });
    } else {
      ctx.drawImage(spr.c, k.x - spr.ax, y - spr.ay, spr.w, spr.h);
    }
  }

  function drawSprout(ctx, s, t, airPass) {
    if (s.state === 'fly') {
      if (!airPass) {
        ctx.fillStyle = 'rgba(20,40,20,0.2)';
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 7, 3, 0, 0, 7); ctx.fill();
        return;
      }
      const def = DF.KIDS[s.type];
      ctx.save(); ctx.translate(s.x, s.y - s.z); ctx.rotate(s.ph * 8);
      ctx.fillStyle = def.cap;
      ctx.beginPath(); ctx.ellipse(0, -3, 9, 6, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = def.body;
      ctx.beginPath(); ctx.ellipse(0, 2, 7, 8, 0, 0, Math.PI); ctx.fill();
      ctx.restore();
      return;
    }
    const def = DF.KIDS[s.type];
    const wob = Math.sin(s.ph * 3) * 1.2;
    ctx.fillStyle = '#7a5236';
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 13, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = def.cap;
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 2 + wob * 0.3, 10, 7.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = def.capLight;
    ctx.beginPath(); ctx.arc(s.x - 3, s.y - 5 + wob * 0.3, 1.3, 0, 7); ctx.arc(s.x + 3, s.y - 6 + wob * 0.3, 1.3, 0, 7); ctx.fill();
    ctx.strokeStyle = def.cap; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y - 9); ctx.lineTo(s.x + 2 + wob, s.y - 14); ctx.stroke();
    // きらり
    const tw = (Math.sin(s.ph * 4) + 1) / 2;
    if (tw > 0.7) {
      ctx.fillStyle = `rgba(255,255,220,${(tw - 0.7) * 3})`;
      S.star(ctx, s.x + 9, s.y - 14, 4);
    }
  }

  function drawGate(ctx, G) {
    const Gt = C.GATE;
    const a = G.gate.anim;
    const k = a >= 0 ? Math.min(1, a / 1.6) : 0;
    const off = U.easeInOut(k) * 420;
    ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
    const x0 = Gt.x0 + off, x1 = Gt.x1 + off, y0 = Gt.y0 + 4, y1 = Gt.y1;
    const h = y1 - y0;
    ctx.fillStyle = 'rgba(20,40,20,0.25)';
    ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, y1, (x1 - x0) / 2 + 10, 10, 0, 0, 7); ctx.fill();
    const wob = G.gate.power ? Math.sin(G.time * 30) * 1.5 : 0;
    const gg = ctx.createLinearGradient(0, y0, 0, y1);
    gg.addColorStop(0, '#9a6b46'); gg.addColorStop(0.5, '#7a5236'); gg.addColorStop(1, '#5a3b27');
    ctx.fillStyle = gg;
    U.roundRect(ctx, x0 + wob, y0, x1 - x0, h, h / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(50,30,18,0.5)'; ctx.lineWidth = 2;
    for (let x = x0 + 30; x < x1 - 30; x += 34) { ctx.beginPath(); ctx.moveTo(x + wob, y0 + 8); ctx.lineTo(x + 18 + wob, y0 + 10); ctx.stroke(); }
    // 年輪
    ctx.fillStyle = '#d9b07a';
    ctx.beginPath(); ctx.ellipse(x1 - h * 0.3 + wob, (y0 + y1) / 2, h * 0.3, h / 2 - 1, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#b88b55';
    ctx.save(); ctx.translate(x1 - h * 0.3 + wob, (y0 + y1) / 2); ctx.rotate(k * 12);
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(0, 0, h * 0.3 * (i / 4), (h / 2 - 1) * (i / 4), 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    // こけ・きのこ
    ctx.fillStyle = '#5c9a45';
    ctx.beginPath(); ctx.ellipse(x0 + 60 + wob, y0 + 4, 30, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8414f';
    ctx.beginPath(); ctx.ellipse(x0 + 150 + wob, y0 + 2, 10, 7, 0, Math.PI, 0); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function buildSprite(b) {
    return b.type === 'house' ? S.houseByRoof[DF.RESIDENTS[b.residentIdx || 0].roof] : S.building[b.type];
  }
  R.buildSprite = buildSprite;

  function drawBuilding(ctx, b, t, G) {
    const def = b.def, spr = buildSprite(b), T = DF.Town;
    const bx = b.x, by = T.base(b);
    ctx.fillStyle = 'rgba(20,40,20,0.22)';
    ctx.beginPath(); ctx.ellipse(bx + 8, by + 2, def.r * 1.05, def.r * 0.32, 0, 0, 7); ctx.fill();
    if (!b.done) {
      const prog = b.job ? Math.min(1, b.job.progress) : 0;
      ctx.fillStyle = '#b08a5a';
      ctx.beginPath(); ctx.ellipse(bx, by - 4, def.r * 0.95, def.r * 0.36, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#c9a66b';
      ctx.beginPath(); ctx.ellipse(bx, by - 6, def.r * 0.8, def.r * 0.28, 0, 0, 7); ctx.fill();
      const ph = Math.max(6, spr.h * prog);
      ctx.save();
      ctx.beginPath(); ctx.rect(bx - spr.w / 2 - 4, by - ph, spr.w + 8, ph + 12); ctx.clip();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(spr.c, bx - spr.ax, by - spr.ay, spr.w, spr.h);
      ctx.restore();
      ctx.globalAlpha = 1;
      // 足場
      const top = by - Math.max(50, ph + 16), hw = spr.w * 0.44;
      ctx.strokeStyle = '#a0683f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx - hw, by); ctx.lineTo(bx - hw, top); ctx.moveTo(bx + hw, by); ctx.lineTo(bx + hw, top);
      for (let y = by - 26; y > top; y -= 30) { ctx.moveTo(bx - hw, y); ctx.lineTo(bx + hw, y); }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(160,104,63,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - hw, by - 26); ctx.lineTo(bx + hw, top); ctx.stroke();
      // 看板
      ctx.fillStyle = '#7a5236'; ctx.fillRect(bx + hw + 8, by - 34, 4, 34);
      ctx.fillStyle = '#ffd43b'; U.roundRect(ctx, bx + hw - 14, by - 52, 52, 22, 5); ctx.fill();
      ctx.fillStyle = '#5a3b1e'; ctx.font = `800 12px ${U.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('こうじ中', bx + hw + 12, by - 40.5);
      return;
    }
    const age = G.time - (b.doneT == null ? -10 : b.doneT);
    const sc = age < 0.6 ? U.easeOutBack(age / 0.6) : 1;
    S.draw(ctx, spr, bx, by, { scale: sc });
    if (sc < 1) return;
    if (b.type === 'windmill') S.drawBlades(ctx, bx, by - 128, t);
    if (b.type === 'clocktower') S.drawClockHands(ctx, bx, by - 140, G.hour());
    if (b.type === 'bakery' && Math.random() < 0.04) G.burst(bx + 40, by - 120, 1, 'dust', { colors: ['rgba(255,255,255,0.8)'], z: 0, min: 2, max: 10, vzMin: 30, vzMax: 50, g: -10, lifeMin: 1.5, lifeMax: 2.4, sMin: 5, sMax: 9 });
  }

  function wrapText(ctx, text, maxW) {
    const lines = [];
    let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
  }
  function drawBubble(ctx, x, y, name, text, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `700 21px ${U.FONT}`;
    const lines = wrapText(ctx, text, 250);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width), 90) + 30;
    const h = lines.length * 28 + 22;
    const bx = U.clamp(x - w / 2, DF.Game.cam.x + 8, DF.Game.cam.x + C.VW - w - 8), by = y - h - 8;
    ctx.fillStyle = 'rgba(60,35,15,0.25)'; U.roundRect(ctx, bx + 3, by + 5, w, h, 18); ctx.fill();
    ctx.fillStyle = '#fffdf5'; U.roundRect(ctx, bx, by, w, h, 18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 10, by + h - 1); ctx.lineTo(x, by + h + 12); ctx.lineTo(x + 10, by + h - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3b1e'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    lines.forEach((l, i) => ctx.fillText(l, bx + 15, by + 25 + i * 28));
    // 名前札
    ctx.font = `800 16px ${U.FONT}`;
    const nw = ctx.measureText(name).width + 18;
    ctx.fillStyle = '#e07a8f'; U.roundRect(ctx, bx + 10, by - 13, nw, 24, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(name, bx + 19, by - 0.5);
    ctx.restore();
  }

  function drawGlowFlower(ctx, f, t) {
    const pulse = (Math.sin(t * 2 + f.ph) + 1) / 2;
    ctx.fillStyle = `rgba(150,230,255,${0.5 + pulse * 0.4})`;
    for (let i = 0; i < 5; i++) { const a = i * 1.256 + f.ph; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * 4, f.y - 8 + Math.sin(a) * 4, 3.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y - 8, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3f7a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - 5); ctx.stroke();
  }

  function drawParticles(ctx) {
    const G = DF.Game;
    for (const p of G.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = 1 - k * k;
      const y = p.y - p.z;
      ctx.fillStyle = p.color;
      if (p.kind === 'spark') {
        S.star(ctx, p.x, y, p.size * (1 - k * 0.5));
      } else if (p.kind === 'confetti') {
        ctx.save(); ctx.translate(p.x, y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, y, p.size * (1 - k * 0.4), 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const f of G.fireflies) {
      const a = Math.min(1, f.t, f.max - f.t) * (0.5 + Math.sin(f.ph * 5) * 0.5);
      ctx.fillStyle = `rgba(230,255,140,${a})`;
      ctx.beginPath(); ctx.arc(f.x, f.y - f.z, 2.6, 0, 7); ctx.fill();
    }
  }

  function drawShooting(ctx, G) {
    for (const s of G.shooting) {
      ctx.strokeStyle = 'rgba(255,246,194,0.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + 60, s.y - 130); ctx.stroke();
      ctx.fillStyle = '#fff'; S.star(ctx, s.x, s.y, 14);
    }
  }

  // ---------- 空・明かり ----------
  function drawSky(ctx, G, cx, cy, t) {
    const dark = G.darkness();
    const warm = G.warmth();
    const w = G.weather;
    if (warm > 0.01) {
      ctx.fillStyle = `rgba(255,140,60,${warm * 0.16})`;
      ctx.fillRect(0, 0, C.VW, C.VH);
    }
    if (w.rain > 0.01) {
      ctx.fillStyle = `rgba(40,60,90,${w.rain * 0.18})`;
      ctx.fillRect(0, 0, C.VW, C.VH);
    }
    if (dark > 0.01) {
      const L = R.lctx;
      L.globalCompositeOperation = 'source-over';
      L.clearRect(0, 0, R.light.width, R.light.height);
      L.fillStyle = `rgba(12,18,56,${dark})`;
      L.fillRect(0, 0, R.light.width, R.light.height);
      L.globalCompositeOperation = 'destination-out';
      const lights = [];
      const p = G.player;
      lights.push([p.x, p.y - 30, 210, 0.95]);
      lights.push([C.HOUSE.x - 62, C.HOUSE.y - 75, 130, 0.9]);
      lights.push([C.HOUSE.x + 62, C.HOUSE.y - 80, 130, 0.9]);
      lights.push([C.HOUSE.x, C.HOUSE.y - 20, 220, 0.6]);
      for (const d of G.decos) { const def = DF.DECOS[d.type]; if (def.light) lights.push([d.x, d.y - 30, def.light, 0.95]); }
      for (const k of G.kids) if (k.type === 'gold') lights.push([k.x, k.y - 15 - k.z, 46, 0.7]);
      for (const b of DF.Town.buildings) if (b.done) lights.push([b.x, DF.Town.base(b) - 40, b.def.r * 2.1, 0.85]);
      for (const it of G.items) if (it.def.glow || it.def.shiny) lights.push([it.x, it.y - (it.z || 0), it.def.r * 3.2, 0.9]);
      for (const f of G.fireflies) lights.push([f.x, f.y - f.z, 34, 0.8]);
      for (const f of W.flowersN) lights.push([f.x, f.y - 8, 40, 0.7]);
      for (const s of G.shooting) lights.push([s.x, s.y, 160, 1]);
      for (const [lx, ly, lr, li] of lights) {
        const x = (lx - cx) * LS, y = (ly - cy) * LS, r = lr * LS;
        if (x < -r || x > R.light.width + r || y < -r || y > R.light.height + r) continue;
        const g = L.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${li})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        L.fillStyle = g; L.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.drawImage(R.light, 0, 0, C.VW, C.VH);
      // あたたかい光
      ctx.globalCompositeOperation = 'lighter';
      const warmL = [[C.HOUSE.x - 62, C.HOUSE.y - 75, 90], [C.HOUSE.x + 62, C.HOUSE.y - 80, 90]];
      for (const b of DF.Town.buildings) if (b.done) warmL.push([b.x, DF.Town.base(b) - 40, b.def.r * 1.4]);
      for (const d of G.decos) { const def = DF.DECOS[d.type]; if (def.light) warmL.push([d.x, d.y - 30, def.light * 0.6]); }
      for (const [lx, ly, lr] of warmL) {
        const x = lx - cx, y = ly - cy;
        if (x < -lr || x > C.VW + lr || y < -lr || y > C.VH + lr) continue;
        const g = ctx.createRadialGradient(x, y, 0, x, y, lr);
        g.addColorStop(0, `rgba(255,170,70,${0.35 * dark})`); g.addColorStop(1, 'rgba(255,170,70,0)');
        ctx.fillStyle = g; ctx.fillRect(x - lr, y - lr, lr * 2, lr * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // 雨
    if (w.rain > 0.02) {
      ctx.strokeStyle = `rgba(225,238,255,${0.75 * w.rain})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      const n = Math.floor(R.rain.length * w.rain);
      for (let i = 0; i < n; i++) {
        const d = R.rain[i];
        d.y += 1500 * d.s / 60; d.x -= 200 * d.s / 60;
        if (d.y > C.VH) { d.y -= C.VH + 40; d.x = Math.random() * (C.VW + 200); }
        if (d.x < -20) d.x += C.VW + 40;
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 6 * d.s, d.y - 28 * d.s);
      }
      ctx.stroke();
      // 水たまりの波紋
      ctx.strokeStyle = `rgba(220,240,255,${0.4 * w.rain})`;
      for (let i = 0; i < 8; i++) {
        const k = ((t * 1.3 + i * 0.13) % 1);
        const rx = (Math.sin(i * 91.7 + Math.floor(t * 1.3 + i * 0.13) * 13.1) * 0.5 + 0.5) * C.VW;
        const ry = (Math.cos(i * 47.3 + Math.floor(t * 1.3 + i * 0.13) * 7.7) * 0.5 + 0.5) * C.VH;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath(); ctx.ellipse(rx, ry, 4 + k * 14, (4 + k * 14) * 0.45, 0, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // にじ
    if (w.rainbow > 0) {
      const a = Math.min(1, w.rainbow / 3, (22 - w.rainbow) / 3) * 0.32;
      const cols = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#9775fa', '#e599f7'];
      ctx.globalAlpha = a; ctx.lineWidth = 16;
      cols.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath(); ctx.arc(C.VW / 2, 760, 640 - i * 15, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
  }

  function drawBanner(ctx, G) {
    const b = G.banners[0];
    if (!b) return;
    const k = b.t / b.dur;
    const inK = Math.min(1, b.t / 0.35);
    const out = k > 0.85 ? (k - 0.85) / 0.15 : 0;
    const s = U.easeOutBack(inK) * (1 - out * 0.2);
    const y = 230 - out * 40;
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(C.VW / 2, y);
    ctx.scale(s, s);
    ctx.font = `800 54px ${U.FONT}`;
    const tw = Math.max(ctx.measureText(b.title).width, 300);
    const w = Math.min(680, tw + 90), h = b.sub ? 142 : 104;
    // リボン
    ctx.fillStyle = 'rgba(60,35,15,0.35)';
    U.roundRect(ctx, -w / 2 + 4, -h / 2 + 8, w, h, 30); ctx.fill();
    ctx.fillStyle = b.color;
    U.roundRect(ctx, -w / 2, -h / 2, w, h, 30); ctx.fill();
    ctx.fillStyle = '#fff8e7';
    U.roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 24); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.min(54, (54 * (w - 60)) / tw);
    ctx.font = `800 ${fs}px ${U.FONT}`;
    ctx.fillStyle = '#5a3b1e';
    ctx.fillText(b.title, 0, b.sub ? -18 : 2);
    if (b.sub) {
      ctx.font = `700 28px ${U.FONT}`;
      ctx.fillStyle = '#8a5a2b';
      ctx.fillText(b.sub, 0, 36);
    }
    // きらきら
    ctx.fillStyle = '#ffd84a';
    for (let i = 0; i < 6; i++) {
      const a = G.time * 2 + i * 1.05;
      S.star(ctx, Math.cos(a) * (w / 2 + 14), Math.sin(a) * (h / 2 + 10), 9 + Math.sin(G.time * 6 + i) * 3);
    }
    ctx.restore();
  }

  // サムネイル(見所クリップ一覧用)
  R.thumb = function () {
    const c = U.makeCanvas(135, 240);
    c.getContext('2d').drawImage(R.canvas, 0, 0, 135, 240);
    try { return c.toDataURL('image/jpeg', 0.7); } catch (e) { return ''; }
  };

  DF.Render = R;
})(window.DF);
