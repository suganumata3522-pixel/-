'use strict';
// 森のマップ: 地形・障害物・当たり判定・道案内
(function (DF) {
  const U = DF.U, C = DF.C;
  const W = { trees: [], rocks: [], ponds: [], obstacles: [], grid: new Map(), gateOpen: false, gateAnim: 0 };
  const CELL = 200;

  function addObstacle(o) {
    W.obstacles.push(o);
    const ext = o.kind === 'ellipse' ? Math.max(o.rx, o.ry) : o.r;
    const x0 = Math.floor((o.x - ext - 40) / CELL), x1 = Math.floor((o.x + ext + 40) / CELL);
    const y0 = Math.floor((o.y - ext - 40) / CELL), y1 = Math.floor((o.y + ext + 40) / CELL);
    for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
      const k = gx * 1000 + gy;
      if (!W.grid.has(k)) W.grid.set(k, []);
      W.grid.get(k).push(o);
    }
  }
  const EMPTY = [];
  function cellObs(x, y) {
    return W.grid.get(Math.floor(x / CELL) * 1000 + Math.floor(y / CELL)) || EMPTY;
  }

  W.side = (y) => (y < C.ST ? 'N' : y > C.SB ? 'S' : 'B');

  W.inWater = function (x, y, pad = 0) {
    if (y > C.ST - pad && y < C.SB + pad && !(x > C.BX0 && x < C.BX1)) return true;
    for (const p of W.ponds) {
      const nx = (x - p.x) / (p.rx + pad), ny = (y - p.y) / (p.ry + pad);
      if (nx * nx + ny * ny < 1) return true;
    }
    return false;
  };

  // その場所に置ける(何かと重ならない)か
  W.isFree = function (x, y, r) {
    if (x < 60 + r || x > C.WW - 60 - r || y < 60 + r || y > C.WH - 60 - r) return false;
    if (W.inWater(x, y, r + 10)) return false;
    if (!W.gateOpen && x > C.GATE.x0 - r - 10 && x < C.GATE.x1 + r + 10 && y > C.GATE.y0 - r - 10 && y < C.GATE.y1 + r + 10) return false;
    for (const o of cellObs(x, y)) {
      if (o.kind === 'circle' && U.dist(x, y, o.x, o.y) < o.r + r + 6) return false;
    }
    return true;
  };

  // 大きな建物を置けるか(すべての障害物を調べる)
  W.isFreeArea = function (x, y, r) {
    if (!W.isFree(x, y, r)) return false;
    for (const o of W.obstacles) {
      if (o.kind === 'circle' && U.dist(x, y, o.x, o.y) < o.r + r + 8) return false;
      if (o.kind === 'ellipse') {
        const nx = (x - o.x) / (o.rx + r + 8), ny = (y - o.y) / (o.ry + r + 8);
        if (nx * nx + ny * ny < 1) return false;
      }
    }
    return true;
  };
  W.addObstacle = addObstacle;
  // 建物など、あとから置いた障害物をすべて取りのぞく(新しくはじめるとき用)
  W.clearDynamic = function () {
    W.obstacles = W.obstacles.filter((o) => !o.dynamic);
    for (const [k, list] of W.grid) W.grid.set(k, list.filter((o) => !o.dynamic));
  };

  // 円(半径r)を障害物から押し出す
  W.resolve = function (e, r) {
    e.x = U.clamp(e.x, r + 30, C.WW - r - 30);
    e.y = U.clamp(e.y, r + 30, C.WH - r - 30);
    const obs = cellObs(e.x, e.y);
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.kind === 'circle') {
        const dx = e.x - o.x, dy = e.y - o.y, rr = o.r + r;
        const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr) {
          const d = Math.sqrt(d2) || 0.01;
          e.x = o.x + (dx / d) * rr; e.y = o.y + (dy / d) * rr;
        }
      } else if (o.kind === 'ellipse') {
        const rx = o.rx + r, ry = o.ry + r;
        const nx = (e.x - o.x) / rx, ny = (e.y - o.y) / ry;
        const n = Math.hypot(nx, ny);
        if (n < 1) {
          const k = n < 0.001 ? 1 : 1 / n;
          const fx = n < 0.001 ? 0 : nx, fy = n < 0.001 ? 1 : ny;
          e.x = o.x + fx * k * rx; e.y = o.y + fy * k * ry;
        }
      }
    }
    // 小川(橋の上だけ通れる)
    if (e.y > C.ST - r && e.y < C.SB + r) {
      const onBridge = e.x > C.BX0 + r && e.x < C.BX1 - r;
      if (!onBridge) {
        let bx = e.x, by = C.ST - r, bd = Math.abs(e.y - (C.ST - r));
        const dB = Math.abs(C.SB + r - e.y);
        if (dB < bd) { by = C.SB + r; bd = dB; }
        if (e.x >= C.BX0 - r && e.x <= C.BX1 + r) {
          const tx = e.x < (C.BX0 + C.BX1) / 2 ? C.BX0 + r + 0.5 : C.BX1 - r - 0.5;
          if (Math.abs(tx - e.x) < bd) { bx = tx; by = e.y; }
        }
        e.x = bx; e.y = by;
      }
    }
    // 倒れた丸太(とおせんぼ)
    if (!W.gateOpen) {
      const G = C.GATE;
      const cx = U.clamp(e.x, G.x0, G.x1), cy = U.clamp(e.y, G.y0, G.y1);
      const dx = e.x - cx, dy = e.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 < 0.0001) { e.y = G.y1 + r; }
        else { const d = Math.sqrt(d2); e.x = cx + (dx / d) * r; e.y = cy + (dy / d) * r; }
      }
    }
  };

  // 引っかかったら少し向きを変えて回り込む
  const tmp = { x: 0, y: 0 };
  W.move = function (e, dx, dy, r) {
    const want = Math.hypot(dx, dy);
    if (want < 0.001) { W.resolve(e, r); return; }
    const ox = e.x, oy = e.y;
    e.x += dx; e.y += dy;
    W.resolve(e, r);
    const prog = ((e.x - ox) * dx + (e.y - oy) * dy) / want;
    if (prog > want * 0.45) return;
    let best = null, bestP = prog;
    const angs = e._slide ? [e._slide, e._slide * 1.6, -e._slide] : [0.8, -0.8, 1.4, -1.4];
    for (const a of angs) {
      const c = Math.cos(a), s = Math.sin(a);
      tmp.x = ox + dx * c - dy * s; tmp.y = oy + dx * s + dy * c;
      W.resolve(tmp, r);
      const p = ((tmp.x - ox) * dx + (tmp.y - oy) * dy) / want + 0.0001;
      const moved = Math.hypot(tmp.x - ox, tmp.y - oy);
      if (moved > want * 0.5 && p > bestP - want * 0.25) { best = { x: tmp.x, y: tmp.y, a }; bestP = p; break; }
    }
    if (best) { e.x = best.x; e.y = best.y; e._slide = best.a; }
    else e._slide = 0;
  };

  // 川をはさむときは橋を経由する
  const NW = { x: (C.BX0 + C.BX1) / 2, y: C.ST - 46 };
  const SW = { x: (C.BX0 + C.BX1) / 2, y: C.GATE.y1 + 34 };
  W.nav = function (fx, fy, tx, ty) {
    const sf = W.side(fy), st = W.side(ty);
    if (sf === st) return { x: tx, y: ty };
    if (sf === 'B') {
      if (st === 'N') return Math.abs(fy - NW.y) < 12 ? { x: tx, y: ty } : { x: NW.x, y: NW.y };
      return Math.abs(fy - SW.y) < 12 ? { x: tx, y: ty } : { x: SW.x, y: SW.y };
    }
    if (!W.gateOpen) return { x: tx, y: ty };
    const mine = sf === 'N' ? NW : SW, other = sf === 'N' ? SW : NW;
    // 橋の正面(岸と待ち合わせ点のあいだ)まで来たら、そのまま渡る
    const lined = Math.abs(fx - mine.x) < 55 && (sf === 'S' ? fy < mine.y + 24 : fy > mine.y - 24);
    if (lined) return { x: other.x, y: other.y };
    return { x: mine.x, y: mine.y };
  };

  // ---- マップ生成 ----
  W.generate = function () {
    const rnd = U.mulberry32(20261105);
    W.ponds = [
      { x: 470, y: 2420, rx: 165, ry: 105 },
      { x: 1560, y: 2180, rx: 125, ry: 85 },
      { x: 560, y: 880, rx: 200, ry: 120 },
      { x: 1480, y: 560, rx: 150, ry: 100 },
    ];
    for (const p of W.ponds) addObstacle({ kind: 'ellipse', x: p.x, y: p.y, rx: p.rx, ry: p.ry });
    addObstacle({ kind: 'circle', x: C.HOUSE.x, y: C.HOUSE.y, r: C.HOUSE.r });

    const blocked = (x, y, r) => {
      if (Math.abs(x - 1000) < 120 && y > C.SB - 20 && y < C.HOUSE.y) return true; // 道
      if (U.dist(x, y, C.HOUSE.x, C.HOUSE.y) < 330) return true;
      if (U.dist(x, y, C.START.x, C.START.y + 60) < 200) return true;
      if (y > C.ST - 110 && y < C.SB + 120) return true;
      if (W.inWater(x, y, r + 40)) return true;
      if (U.dist(x, y, 1000, 420) < 220) return true; // 金のりんごの広場
      if (x > C.TOWN.x0 - r && x < C.TOWN.x1 + r && y > C.TOWN.y0 - r && y < C.TOWN.y1 + r * 0.3) return true; // 町の広場
      for (const t of W.trees) if (U.dist(x, y, t.x, t.y) < t.gap + r) return true;
      for (const t of W.rocks) if (U.dist(x, y, t.x, t.y) < 70 + r) return true;
      return false;
    };
    // 町の近くの石切り場(石が手に入りやすいように先に置く)
    for (const [x, y, v] of [[1430, 2640, 1], [1500, 2730, 0], [1395, 2760, 2], [590, 2990, 1], [680, 3070, 0]]) {
      W.rocks.push({ x, y, v, r: [22, 30, 18][v] });
    }
    // 森のふち(外周に木を並べる)
    for (let x = 60; x < C.WW; x += 120) {
      for (const y of [70, C.WH - 40]) {
        const v = rnd() < 0.5 ? 0 : 3;
        W.trees.push({ x: x + rnd() * 40 - 20, y, v, gap: 100 });
      }
    }
    for (let y = 180; y < C.WH - 80; y += 125) {
      for (const x of [50, C.WW - 50]) {
        if (y > C.ST - 60 && y < C.SB + 60) continue;
        W.trees.push({ x: x + rnd() * 30 - 15, y: y + rnd() * 40, v: rnd() < 0.5 ? 0 : 3, gap: 100 });
      }
    }
    // 森の中の木
    let tries = 0;
    while (W.trees.length < 135 && tries++ < 5000) {
      const x = 160 + rnd() * (C.WW - 320), y = 180 + rnd() * (C.WH - 360);
      if (blocked(x, y, 60)) continue;
      const north = y < C.ST;
      let v;
      const r = rnd();
      if (north) v = r < 0.45 ? 3 : r < 0.8 ? 0 : r < 0.9 ? 4 : 1;
      else v = r < 0.38 ? 0 : r < 0.6 ? 1 : r < 0.75 ? 2 : r < 0.9 ? 3 : 4;
      W.trees.push({ x, y, v, gap: 150 });
    }
    tries = 0;
    while (W.rocks.length < 23 && tries++ < 3000) {
      const x = 160 + rnd() * (C.WW - 320), y = 180 + rnd() * (C.WH - 360);
      if (blocked(x, y, 40)) continue;
      const v = Math.floor(rnd() * 3);
      W.rocks.push({ x, y, v, r: [22, 30, 18][v] });
    }
    for (const t of W.trees) addObstacle({ kind: 'circle', x: t.x, y: t.y, r: 20 });
    for (const t of W.rocks) addObstacle({ kind: 'circle', x: t.x, y: t.y, r: t.r });
    W.trees.forEach((t) => (t.sway = rnd() * 6));
    W.flowersN = [];
    // 北の森の光る花
    for (let i = 0; i < 40; i++) {
      const x = 150 + rnd() * (C.WW - 300), y = 150 + rnd() * (C.ST - 300);
      if (!blocked(x, y, 5)) W.flowersN.push({ x, y, ph: rnd() * 6 });
    }
    W.renderGround(rnd);
  };

  // 地面を1枚の絵として描いておく
  W.renderGround = function (rnd) {
    const c = U.makeCanvas(C.WW, C.WH);
    const g = c.getContext('2d');
    // 南(明るい)と北(深い森)
    const grad = g.createLinearGradient(0, 0, 0, C.WH);
    grad.addColorStop(0, '#4f8a43');
    grad.addColorStop(0.45, '#5f9a4b');
    grad.addColorStop(0.55, '#7cb257');
    grad.addColorStop(1, '#8cc061');
    g.fillStyle = grad;
    g.fillRect(0, 0, C.WW, C.WH);
    // 草のまだら
    for (let i = 0; i < 520; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH, r = 40 + rnd() * 140;
      const north = y < C.ST;
      const col = rnd() < 0.5
        ? (north ? 'rgba(40,90,45,0.18)' : 'rgba(70,130,50,0.16)')
        : (north ? 'rgba(110,160,80,0.12)' : 'rgba(170,210,110,0.16)');
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // 道(橋からおうちへ)
    g.fillStyle = '#c9a66b';
    g.beginPath();
    for (let y = C.SB; y <= C.HOUSE.y + 140; y += 20) {
      const x = 1000 - 52 - Math.sin(y * 0.01) * 10 - rnd() * 4;
      y === C.SB ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    for (let y = C.HOUSE.y + 140; y >= C.SB; y -= 20) g.lineTo(1000 + 52 + Math.sin(y * 0.013) * 10 + rnd() * 4, y);
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(150,115,70,0.5)';
    for (let i = 0; i < 220; i++) { g.beginPath(); g.arc(950 + rnd() * 100, C.SB + rnd() * (C.HOUSE.y - C.SB + 140), 1.5 + rnd() * 2.5, 0, 7); g.fill(); }
    // おうちの前の広場
    g.fillStyle = '#c9a66b';
    g.beginPath(); g.ellipse(C.HOUSE.x, C.HOUSE.y + 60, 230, 150, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,200,0.25)';
    g.beginPath(); g.ellipse(C.HOUSE.x, C.HOUSE.y + 60, 190, 115, 0, 0, 7); g.fill();
    // 町の広場(建物を建てる場所)
    const tw = C.TOWN;
    const tg = g.createRadialGradient((tw.x0 + tw.x1) / 2, (tw.y0 + tw.y1) / 2, 50, (tw.x0 + tw.x1) / 2, (tw.y0 + tw.y1) / 2, (tw.x1 - tw.x0) * 0.6);
    tg.addColorStop(0, 'rgba(190,225,130,0.55)'); tg.addColorStop(1, 'rgba(190,225,130,0)');
    g.fillStyle = tg; g.fillRect(tw.x0 - 200, tw.y0 - 200, tw.x1 - tw.x0 + 400, tw.y1 - tw.y0 + 400);
    // 道ばたの石だたみ
    g.fillStyle = 'rgba(230,214,170,0.9)';
    for (let y = tw.y0 + 30; y < tw.y1; y += 34) for (const sx of [-74, 74]) { g.beginPath(); g.ellipse(1000 + sx + rnd() * 6, y, 12, 7, 0, 0, 7); g.fill(); }
    // 金のりんごの広場
    g.fillStyle = 'rgba(200,220,120,0.35)';
    g.beginPath(); g.ellipse(1000, 420, 170, 110, 0, 0, 7); g.fill();
    // 草
    for (let i = 0; i < 4200; i++) {
      const x = rnd() * C.WW, y = rnd() * C.WH;
      if (W.inWater(x, y, 6)) continue;
      const north = y < C.ST;
      g.strokeStyle = rnd() < 0.5 ? (north ? '#3f7a3a' : '#5d9b43') : (north ? '#6aa356' : '#a5d070');
      g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(x - 3, y); g.lineTo(x - 4, y - 6);
      g.moveTo(x, y); g.lineTo(x + 1, y - 8);
      g.moveTo(x + 3, y); g.lineTo(x + 5, y - 5);
      g.stroke();
    }
    // お花
    const cols = ['#ffffff', '#ffe066', '#ff8fab', '#b197fc', '#ffa94d'];
    for (let i = 0; i < 900; i++) {
      const x = rnd() * C.WW, y = C.SB + 40 + rnd() * (C.WH - C.SB - 40);
      if (W.inWater(x, y, 10)) continue;
      if (Math.abs(x - 1000) < 60 && y < C.HOUSE.y) continue;
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      const s = 2 + rnd() * 1.6;
      for (let p = 0; p < 5; p++) { const a = p * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * s, y + Math.sin(a) * s, s * 0.8, 0, 7); g.fill(); }
      g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(x, y, s * 0.6, 0, 7); g.fill();
    }
    // 池
    for (const p of W.ponds) {
      g.fillStyle = '#7a6a45';
      g.beginPath(); g.ellipse(p.x, p.y + 4, p.rx + 10, p.ry + 9, 0, 0, 7); g.fill();
      const pg = g.createRadialGradient(p.x - p.rx * 0.3, p.y - p.ry * 0.3, 10, p.x, p.y, Math.max(p.rx, p.ry));
      pg.addColorStop(0, '#7fd0f0'); pg.addColorStop(1, '#3d93c4');
      g.fillStyle = pg;
      g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, 7); g.fill();
      // はすの葉
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 7, d = 0.3 + rnd() * 0.5;
        const lx = p.x + Math.cos(a) * p.rx * d, ly = p.y + Math.sin(a) * p.ry * d;
        g.fillStyle = '#4e9a47';
        g.beginPath(); g.arc(lx, ly, 10 + rnd() * 6, 0.4, Math.PI * 2 - 0.1); g.lineTo(lx, ly); g.fill();
        if (rnd() < 0.4) { g.fillStyle = '#ffb3c6'; g.beginPath(); g.arc(lx + 4, ly - 3, 4, 0, 7); g.fill(); }
      }
    }
    // 小川
    g.fillStyle = '#7a6a45';
    g.fillRect(0, C.ST - 8, C.WW, C.SB - C.ST + 16);
    const sg = g.createLinearGradient(0, C.ST, 0, C.SB);
    sg.addColorStop(0, '#4aa3d4'); sg.addColorStop(0.5, '#73c3ea'); sg.addColorStop(1, '#3d8fc0');
    g.fillStyle = sg;
    g.beginPath();
    g.moveTo(0, C.ST);
    for (let x = 0; x <= C.WW; x += 40) g.lineTo(x, C.ST + Math.sin(x * 0.02) * 3);
    for (let x = C.WW; x >= 0; x -= 40) g.lineTo(x, C.SB + Math.sin(x * 0.017) * 3);
    g.closePath(); g.fill();
    // 川辺の石
    for (let i = 0; i < 120; i++) {
      const x = rnd() * C.WW, y = rnd() < 0.5 ? C.ST - 4 : C.SB + 4;
      g.fillStyle = rnd() < 0.5 ? '#9aa0a8' : '#b9bec5';
      g.beginPath(); g.ellipse(x, y, 5 + rnd() * 7, 3 + rnd() * 4, 0, 0, 7); g.fill();
    }
    // 橋
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(C.BX0 + 6, C.ST - 16, C.BX1 - C.BX0, C.SB - C.ST + 34);
    for (let y = C.ST - 18; y < C.SB + 14; y += 14) {
      g.fillStyle = (y / 14) % 2 < 1 ? '#a87a4f' : '#b88a5c';
      U.roundRect(g, C.BX0 - 4, y, C.BX1 - C.BX0 + 8, 12, 3); g.fill();
    }
    g.fillStyle = '#7a5236';
    g.fillRect(C.BX0 - 10, C.ST - 22, 8, C.SB - C.ST + 40);
    g.fillRect(C.BX1 + 2, C.ST - 22, 8, C.SB - C.ST + 40);
    W.ground = c;
  };

  DF.World = W;
})(window.DF);
