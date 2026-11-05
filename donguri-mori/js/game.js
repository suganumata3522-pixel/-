'use strict';
// ゲーム本体: どんぐりっこ・おとしもの・1日の流れ・見所イベント
(function (DF) {
  const U = DF.U, C = DF.C, W = DF.World, A = DF.Audio;
  const G = {
    kids: [], items: [], sprouts: [], decos: [], particles: [], floaters: [], banners: [], rings: [],
    fireflies: [], shooting: [], drops: [],
    coins: 0, clock: 0.12, day: 1, time: 0, paused: false,
    mats: { wood: 0, stone: 0 }, jobs: [],
    stats: { delivered: {}, total: 0, born: 0, maxKids: 0, goldBorn: 0, coinsEarned: 0 },
    flags: {},
    input: { mx: 0, my: 0 },
    cam: { x: 0, y: 0, shake: 0 },
    gate: { progress: 0, anim: -1 },
    weather: { rain: 0, raining: false, rainLeft: 0, rainAt: 0.38, rainbow: 0, didRain: false },
    starCD: 20, goldTimer: 0, spawnT: 0, saveT: 0,
    listeners: {},
  };
  let nextId = 1;

  G.on = (ev, fn) => ((G.listeners[ev] = G.listeners[ev] || []).push(fn));
  G.emit = (ev, data) => (G.listeners[ev] || []).forEach((fn) => fn(data));

  // ---------- 生成 ----------
  function newKid(type, x, y, state) {
    const k = {
      id: nextId++, type, def: DF.KIDS[type], x, y, z: 0, state: state || 'follow',
      face: 1, dir: 'front', walkT: Math.random() * 6, moving: false,
      item: null, slot: 0, air: null, seekT: Math.random() * 0.5, hop: 0, popT: 0, idleT: Math.random() * 3,
    };
    G.kids.push(k);
    return k;
  }

  function newItem(type, x, y) {
    const def = DF.ITEMS[type];
    const it = {
      id: nextId++, type, def, x, y, z: 0, carriers: [], moving: false, absorbing: false, absT: 0,
      spawnT: 0, ph: Math.random() * 6, maxC: Math.min(def.w * 2, 30), stepT: 0,
    };
    G.items.push(it);
    return it;
  }

  function spawnItem(region) {
    const types = Object.keys(DF.ITEMS).filter((k) => DF.ITEMS[k].region === region);
    const type = U.weighted(types.map((k) => [k, DF.ITEMS[k].wt]));
    const r = DF.ITEMS[type].r;
    for (let i = 0; i < 40; i++) {
      const x = U.rand(150, C.WW - 150);
      const y = region === 'S' ? U.rand(C.GATE.y1 + 120, C.WH - 120) : U.rand(160, C.ST - 80);
      if (U.dist(x, y, C.HOUSE.x, C.HOUSE.y) < 300) continue;
      if (!W.isFree(x, y, r + 8)) continue;
      if (G.items.some((o) => U.dist(o.x, o.y, x, y) < 80)) continue;
      return newItem(type, x, y);
    }
    return null;
  }

  function freeSpotNear(x, y, rMin, rMax, r) {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = U.rand(rMin, rMax);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8;
      if (W.isFree(px, py, r)) return { x: px, y: py };
    }
    return { x: x, y: y + rMin };
  }

  // ---------- 開始・保存 ----------
  G.reset = function (save) {
    G.kids = []; G.items = []; G.sprouts = []; G.decos = []; G.particles = []; G.floaters = [];
    G.banners = []; G.rings = []; G.fireflies = []; G.shooting = [];
    G.player = { x: C.START.x, y: C.START.y, fx: 0, fy: 1, face: 1, dir: 'front', moving: false, walkT: 0, throwT: 0, vx: 0, vy: 0 };
    G.cam.x = G.player.x - C.VW / 2; G.cam.y = G.player.y - C.VH * 0.56;
    W.gateOpen = false; G.gate = { progress: 0, anim: -1 };
    G.mats = { wood: 0, stone: 0 };
    if (save) {
      G.coins = save.coins || 0;
      G.clock = save.clock != null ? save.clock : 0.12;
      G.day = save.day || 1;
      G.stats = Object.assign(G.stats, save.stats || {});
      G.flags = save.flags || {};
      W.gateOpen = !!save.gate;
      if (W.gateOpen) G.gate.progress = 1;
      if (save.mats) G.mats = { wood: save.mats.wood || 0, stone: save.mats.stone || 0 };
      for (const d of save.decos || []) if (DF.DECOS[d.t]) G.decos.push({ type: d.t, x: d.x, y: d.y, ph: Math.random() * 6 });
      const counts = save.kids || {};
      for (const t in counts) for (let i = 0; i < counts[t] && G.kids.length < C.MAX_KIDS; i++) {
        const s = freeSpotNear(G.player.x, G.player.y - 40, 10, 90, 8);
        newKid(t, s.x, s.y, 'follow');
      }
    } else {
      G.coins = 0; G.clock = 0.12; G.day = 1; G.flags = {};
      G.stats = { delivered: {}, total: 0, born: 0, maxKids: 0, goldBorn: 0, coinsEarned: 0 };
      for (let i = 0; i < 3; i++) newKid('brown', G.player.x - 20 + i * 20, G.player.y - 40, 'follow');
      // はじめの芽
      for (let i = 0; i < 6; i++) {
        const s = freeSpotNear(C.HOUSE.x, C.HOUSE.y + 40, 150, 230, 10);
        G.sprouts.push({ type: i === 5 ? 'green' : 'brown', x: s.x, y: s.y, z: 0, state: 'planted', ph: Math.random() * 6 });
      }
    }
    // おとしもの: 最初は家の近くにも少し置く
    const near = [['acorn', -260, -120], ['berry', 240, -180], ['acorn', -180, -380], ['apple', 300, -420], ['mushroom', -340, -520]];
    for (const [t, dx, dy] of near) {
      const s = freeSpotNear(C.HOUSE.x + dx, C.HOUSE.y + dy, 0, 60, DF.ITEMS[t].r + 8);
      newItem(t, s.x, s.y).spawnT = 1;
    }
    for (let i = 0; i < 12; i++) { const it = spawnItem('S'); if (it) it.spawnT = 1; }
    for (let i = 0; i < 13; i++) { const it = spawnItem('N'); if (it) it.spawnT = 1; }
    newItem('goldapple', 1000, 420).spawnT = 1;
    G.weather = { rain: 0, raining: false, rainLeft: 0, rainAt: G.day === 1 ? 0.36 : U.rand(0.15, 0.5), rainbow: 0, didRain: false };
    makeJobs();
    G.emit('reset', save || null);
  };

  G.save = function () {
    const kids = {};
    for (const k of G.kids) kids[k.type] = (kids[k.type] || 0) + 1;
    U.store.set('save', {
      v: 1, coins: G.coins, clock: G.clock, day: G.day, stats: G.stats, flags: G.flags,
      gate: W.gateOpen, kids, mats: G.mats, town: DF.Town ? DF.Town.serialize() : null, decos: G.decos.map((d) => ({ t: d.type, x: Math.round(d.x), y: Math.round(d.y) })),
    });
  };
  G.hasSave = () => !!U.store.get('save', null);
  G.loadSave = () => U.store.get('save', null);
  G.clearSave = () => U.store.remove('save');

  // ---------- 見所・演出 ----------
  G.highlight = function (title, sub, opt = {}) {
    if (G.banners.length < 4) G.banners.push({ title, sub: sub || '', t: 0, dur: opt.dur || 2.8, color: opt.color || '#f29b38' });
    A.play('highlight');
    G.emit('highlight', { title, sub, level: opt.level || 1 });
  };
  G.float = function (x, y, text, color, size) {
    G.floaters.push({ x, y, text, color: color || '#fff', size: size || 26, t: 0, dur: 1.3 });
  };
  G.burst = function (x, y, n, kind, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(opt.min || 40, opt.max || 160);
      G.particles.push({
        kind, x, y, z: opt.z || 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: U.rand(opt.vzMin || 60, opt.vzMax || 220),
        g: opt.g == null ? 420 : opt.g, life: 0, max: U.rand(opt.lifeMin || 0.5, opt.lifeMax || 1.1),
        size: U.rand(opt.sMin || 2, opt.sMax || 5), color: opt.colors ? U.pick(opt.colors) : opt.color || '#fff', rot: Math.random() * 6,
      });
    }
  };
  function hint(key, text) {
    if (G.flags['hint_' + key]) return;
    G.flags['hint_' + key] = 1;
    G.emit('hint', text);
  }

  // ---------- 操作 ----------
  G.followers = () => G.kids.filter((k) => k.state === 'follow');

  G.throwAt = function (wx, wy) {
    const p = G.player;
    let best = null, bd = 1e9;
    for (const k of G.kids) {
      if (k.state !== 'follow') continue;
      const d = U.dist(k.x, k.y, p.x, p.y);
      if (d < bd) { bd = d; best = k; }
    }
    if (!best) { G.emit('nokids'); return false; }
    let dx = wx - p.x, dy = wy - p.y;
    let d = Math.hypot(dx, dy);
    if (d < 30) { dx = p.fx * 60; dy = p.fy * 60; d = 60; }
    if (d > C.THROW_RANGE) { dx *= C.THROW_RANGE / d; dy *= C.THROW_RANGE / d; d = C.THROW_RANGE; }
    let tx = p.x + dx, ty = p.y + dy;
    // 川の向こう岸には投げられない
    const ps = W.side(p.y);
    if (ps === 'S' && ty < C.SB + 12) ty = C.SB + 12;
    if (ps === 'N' && ty > C.ST - 12) ty = C.ST - 12;
    tx = U.clamp(tx, 60, C.WW - 60); ty = U.clamp(ty, 60, C.WH - 60);
    d = U.dist(p.x, p.y, tx, ty);
    best.state = 'air';
    best.air = { sx: best.x, sy: best.y, tx, ty, t: 0, dur: 0.32 + d / 1100, h: 40 + d * 0.28 };
    p.throwT = 0.25;
    if (Math.abs(dx) > Math.abs(dy)) { p.dir = 'side'; p.face = dx < 0 ? -1 : 1; } else p.dir = dy < 0 ? 'back' : 'front';
    A.play('throw', { pitch: U.rand(0.92, 1.1) });
    return true;
  };

  G.whistle = function () {
    const p = G.player;
    G.rings.push({ x: p.x, y: p.y, t: 0, dur: 0.45 });
    A.play('whistle');
    let n = 0;
    for (const k of G.kids) {
      if (U.dist(k.x, k.y, p.x, p.y) > C.WHISTLE_R) continue;
      if (k.state === 'idle' || k.state === 'goto' || k.state === 'work' || k.state === 'return' ||
          (k.state === 'carry' && k.item && !k.item.moving)) {
        detach(k);
        k.state = 'follow'; k.hop = 0.3; n++;
      }
    }
    for (const s of G.sprouts) {
      if (s.state === 'planted' && U.dist(s.x, s.y, p.x, p.y) < C.WHISTLE_R) pluck(s);
    }
    return n;
  };

  function detach(k) {
    if (k.job) {
      const i = k.job.workers.indexOf(k);
      if (i >= 0) k.job.workers.splice(i, 1);
      k.job = null;
    }
    if (k.item) {
      const i = k.item.carriers.indexOf(k);
      if (i >= 0) k.item.carriers.splice(i, 1);
      k.item = null;
    }
    k.target = null;
  }

  function attach(k, it) {
    if (it.absorbing || it.carriers.length >= it.maxC) return false;
    k.state = 'carry'; k.item = it; it.carriers.push(k);
    it.carriers.forEach((c, i) => (c.slot = i));
    A.play('attach', { pitch: 1 + it.carriers.length * 0.03 });
    if (!G.flags.firstCarry) { G.flags.firstCarry = 1; }
    return true;
  }

  function pluck(s) {
    if (G.kids.length >= C.MAX_KIDS) {
      if (!G._fullWarned) { G._fullWarned = 1; G.emit('toast', 'どんぐりっこは100ぴきまで！'); }
      return false;
    }
    s.state = 'gone';
    const k = newKid(s.type, s.x, s.y, 'pop');
    k.popT = 0.45; k.hop = 0;
    G.stats.born++;
    A.play('pluck', { pitch: U.rand(0.9, 1.15) });
    G.burst(s.x, s.y, 6, 'dust', { colors: ['#a5825a', '#c9a66b'], min: 30, max: 90, vzMax: 120 });
    if (s.type === 'gold') {
      G.stats.goldBorn++;
      if (G.stats.goldBorn === 1 || G.stats.goldBorn % 5 === 0) G.highlight('金のどんぐりっこ！', 'ちからもち・あしもはやい');
    }
    const n = G.kids.length;
    for (const m of [10, 25, 50, 75, 100]) {
      if (n === m && !G.flags['kids' + m]) { G.flags['kids' + m] = 1; G.highlight(`どんぐりっこ ${m}ぴき！`, m === 100 ? 'ついに森いっぱい！' : 'なかまがふえたよ'); }
    }
    G.stats.maxKids = Math.max(G.stats.maxKids, n);
    hint('pluck', 'タップ(クリック)した場所に どんぐりっこを投げられるよ。おとしものに投げて、おうちへ運んでもらおう！');
    return true;
  }

  // ---------- かざり ----------
  G.buyDeco = function (type) {
    const def = DF.DECOS[type];
    if (!def || G.coins < def.price) { A.play('nope'); return false; }
    const p = G.player;
    let spot = null;
    for (let d = 50; d < 260 && !spot; d += 20) {
      for (let i = 0; i < 12; i++) {
        const a = Math.atan2(p.fy, p.fx) + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.45;
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        if (W.isFree(x, y, def.r) && !G.decos.some((o) => U.dist(o.x, o.y, x, y) < DF.DECOS[o.type].r + def.r + 6) &&
            U.dist(x, y, C.HOUSE.x, C.HOUSE.y) > C.HOUSE.r + def.r + 10) { spot = { x, y }; break; }
      }
    }
    if (!spot) { G.emit('toast', 'ここには置けないみたい。ひろい場所でためしてね'); A.play('nope'); return false; }
    G.coins -= def.price;
    G.decos.push({ type, x: spot.x, y: spot.y, ph: Math.random() * 6, born: G.time });
    A.play('buy');
    G.burst(spot.x, spot.y, 18, 'confetti', { colors: ['#ff6f91', '#ffc75f', '#6fc3e6', '#9cd36a', '#fff'], z: 30 });
    G.highlight(`${def.name}をかざった！`, '森がにぎやかになったよ');
    G.save();
    return true;
  };
  G.removeNearestDeco = function () {
    const p = G.player;
    let best = -1, bd = 140;
    G.decos.forEach((d, i) => { const dd = U.dist(d.x, d.y, p.x, p.y); if (dd < bd) { bd = dd; best = i; } });
    if (best < 0) return null;
    const d = G.decos.splice(best, 1)[0];
    const back = Math.floor(DF.DECOS[d.type].price / 2);
    G.coins += back;
    G.save();
    return { name: DF.DECOS[d.type].name, back };
  };
  G.nigiwai = () => Math.floor(G.decos.reduce((s, d) => s + DF.DECOS[d.type].price, 0) / 10 + G.kids.length * 2 + G.stats.total);

  // ---------- 更新 ----------
  function faceKid(k, dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 1.1) { k.dir = 'side'; k.face = dx < 0 ? -1 : 1; }
    else if (Math.abs(dy) > 0.01) k.dir = dy < 0 ? 'back' : 'front';
  }

  function seek(k, tx, ty, speed, dt, stopR) {
    const wp = W.nav(k.x, k.y, tx, ty);
    const dx = wp.x - k.x, dy = wp.y - k.y;
    const d = Math.hypot(dx, dy);
    const final = wp.x === tx && wp.y === ty;
    if (final && d < stopR) return d;
    const slow = final && d < 40 ? Math.max(0.3, d / 40) : 1;
    const step = Math.min(d, speed * dt * slow);
    W.move(k, (dx / d) * step, (dy / d) * step, 8);
    k.moving = true;
    k.walkT += dt * (speed / 200);
    faceKid(k, dx, dy);
    return d;
  }

  function landKid(k) {
    k.z = 0;
    k.state = 'idle';
    if (W.inWater(k.x, k.y)) {
      A.play('splash');
      G.burst(k.x, k.y, 10, 'splash', { colors: ['#bfe9ff', '#7fd0f0', '#fff'], min: 30, max: 110 });
    } else {
      G.burst(k.x, k.y, 4, 'dust', { colors: ['#d8c49a', '#b9a27a'], min: 20, max: 60, vzMax: 60 });
      A.play('land');
    }
    W.resolve(k, 8);
    // 近くのおとしものにくっつく
    let best = null, bd = 1e9;
    for (const it of G.items) {
      if (it.absorbing || it.carriers.length >= it.maxC) continue;
      const d = U.dist(k.x, k.y, it.x, it.y);
      if (d < it.def.r + 26 && d < bd) { bd = d; best = it; }
    }
    if (best) { attach(k, best); return; }
    // 木・岩・工事現場・丸太に投げたら、そこで働く
    let job = null, jd = Infinity;
    for (const j of G.jobs) {
      if (!j.active() || j.workers.length >= j.max) continue;
      const d = j.hit(k.x, k.y);
      if (d < jd) { jd = d; job = j; }
    }
    if (job) { k.state = 'goto'; k.target = job; k.stuckT = 0; return; }
    k.seekT = 0;
  }

  function findWork(k) {
    let best = null, bd = 150;
    for (const it of G.items) {
      if (it.absorbing || it.carriers.length >= it.maxC) continue;
      const d = U.dist(k.x, k.y, it.x, it.y) - it.def.r;
      if (d < bd && W.side(it.y) === W.side(k.y)) { bd = d; best = it; }
    }
    if (best) { k.state = 'goto'; k.target = best; return; }
    // 近くにしごと(工事・木・岩)があれば、自分から手伝いにいく
    let job = null, jd = 170;
    for (const j of G.jobs) {
      if (!j.active() || j.workers.length >= j.max) continue;
      const d = U.dist(k.x, k.y, j.x, j.y) - (j.kind === 'site' ? 120 : 0);
      if (d < jd && W.side(j.y) === W.side(k.y)) { jd = d; job = j; }
    }
    if (job) { k.state = 'goto'; k.target = job; k.stuckT = 0; }
  }

  // ---------- しごと(木・岩・丸太・工事現場) ----------
  function attachJob(k, j) {
    if (!j.active() || j.workers.length >= j.max) return false;
    j.workers.push(k);
    k.state = 'work'; k.job = j; k.target = null;
    A.play('attach', { pitch: 0.9 + j.workers.length * 0.03 });
    return true;
  }
  function releaseJob(j, after) {
    for (const k of j.workers) { k.job = null; k.state = after || 'idle'; k.hop = 0.3; k.seekT = 0.2 + Math.random() * 0.3; }
    j.workers = [];
  }
  G.addJob = (j) => { j.workers = j.workers || []; j.progress = j.progress || 0; G.jobs.push(j); return j; };
  G.removeJob = (j) => { releaseJob(j, 'return'); const i = G.jobs.indexOf(j); if (i >= 0) G.jobs.splice(i, 1); };

  function dropMat(type, x, y) {
    const r = DF.ITEMS[type].r;
    let spot = null;
    for (let i = 0; i < 20 && !spot; i++) {
      const a = U.rand(0.2, Math.PI - 0.2), d = U.rand(34, 70);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.8 + 10;
      if (W.isFree(px, py, r + 4) && W.side(py) === W.side(y)) spot = { x: px, y: py };
    }
    if (!spot) spot = freeSpotNear(x, y + 40, 20, 90, r + 4);
    const it = newItem(type, spot.x, spot.y);
    it.spawnT = 0.2;
    G.burst(spot.x, spot.y, 8, type === 'wood' ? 'confetti' : 'dust', { colors: type === 'wood' ? ['#5aa845', '#86c66a', '#3f8a40'] : ['#b3b8c0', '#868b94'], z: type === 'wood' ? 60 : 10, min: 30, max: 120 });
    A.play(type === 'wood' ? 'logdrop' : 'rockbreak');
    return it;
  }

  function makeJobs() {
    G.jobs = [];
    for (const t of W.trees) {
      const job = {
        kind: 'tree', ref: t, x: t.x, y: t.y, need: 9, max: 6, cd: 0, after: 'idle',
        active() { return this.cd <= 0; },
        hit(x, y) { return Math.abs(x - t.x) < 60 && y < t.y + 26 && y > t.y - 175 ? U.dist(x, y, t.x, t.y - 55) : Infinity; },
        slot(i) { const a = Math.PI * (0.12 + 0.76 * (((i % 6) + 0.5) / 6)); return { x: t.x + Math.cos(a) * 31, y: t.y + Math.sin(a) * 16 + 5 }; },
        done() { this.cd = 40; dropMat('wood', t.x, t.y); },
      };
      t.job = job; G.addJob(job);
    }
    for (const r of W.rocks) {
      const job = {
        kind: 'rock', ref: r, x: r.x, y: r.y, need: 15, max: 8, cd: 0, after: 'idle',
        active() { return this.cd <= 0; },
        hit(x, y) { const d = U.dist(x, y, r.x, r.y); return d < r.r + 30 ? d : Infinity; },
        slot(i) { const a = (i / 8) * Math.PI * 2 + 0.3; return { x: r.x + Math.cos(a) * (r.r + 11), y: r.y + Math.sin(a) * (r.r + 11) * 0.8 }; },
        done() { this.cd = 50; dropMat('stone', r.x, r.y); },
      };
      r.job = job; G.addJob(job);
    }
    const Gt = C.GATE;
    G.gateJob = G.addJob({
      kind: 'gate', x: (Gt.x0 + Gt.x1) / 2, y: Gt.y1, need: 80, max: 24, after: 'return', decay: 0.02, progress: W.gateOpen ? 1 : 0,
      active() { return !W.gateOpen; },
      hit(x, y) { return x > Gt.x0 - 30 && x < Gt.x1 + 30 && y > Gt.y0 - 30 && y < Gt.y1 + 60 ? 1 : Infinity; },
      slot(i) { const n = 12; i %= 24; return { x: Gt.x0 + 16 + (i % n) * ((Gt.x1 - Gt.x0 - 32) / (n - 1)), y: Gt.y1 + 11 + Math.floor(i / n) * 13 }; },
      done() { openGate(); },
    });
  }

  function openGate() {
    W.gateOpen = true; G.gate.anim = 0;
    A.play('gate');
    G.cam.shake = 14;
    for (const k of G.kids) if (k.state === 'goto' && k.target === G.gateJob) { k.state = 'return'; k.target = null; k.hop = 0.4; }
    G.highlight('みちがひらけた！', 'きたの深い森へ いけるよ', { level: 3 });
    G.save();
  }

  function updateJobs(dt) {
    for (const j of G.jobs) {
      if (j.cd > 0) j.cd -= dt;
      if (!j.workers.length) {
        j.power = 0;
        if (j.decay && j.progress > 0 && j.active()) j.progress = Math.max(0, j.progress - dt * j.decay);
        continue;
      }
      if (!j.active()) { releaseJob(j, 'return'); continue; }
      let p = 0;
      for (const k of j.workers) p += k.def.power;
      j.power = p;
      j.progress += (p * dt) / j.need;
      j.fxT = (j.fxT || 0) - dt;
      if (j.fxT <= 0 && onScreen(j.x, j.y)) {
        j.fxT = j.kind === 'tree' ? 0.3 : j.kind === 'rock' ? 0.36 : 0.45;
        A.play(j.kind === 'tree' ? 'chop' : j.kind === 'rock' ? 'mine' : j.kind === 'site' ? 'hammer' : 'push', { pitch: U.rand(0.9, 1.1) });
        if (j.kind === 'tree') G.burst(j.x + U.rand(-30, 30), j.y - 90, 2, 'confetti', { colors: ['#5aa845', '#86c66a'], z: 40, min: 10, max: 50, vzMin: 0, vzMax: 40 });
        else if (j.kind === 'rock') G.burst(j.x, j.y - 6, 3, 'dust', { colors: ['#b3b8c0', '#fff'], min: 30, max: 90 });
        else G.burst(j.x + U.rand(-30, 30), j.y, 2, 'dust', { colors: ['#c9a66b'], min: 10, max: 40, vzMax: 50 });
        if (j.kind === 'gate') G.cam.shake = Math.max(G.cam.shake, 0.6);
      }
      if (j.progress >= 1) {
        j.progress = j.kind === 'gate' || j.kind === 'site' ? 1 : 0;
        releaseJob(j, j.after);
        j.done();
      }
    }
    G.gate.progress = G.gateJob.progress;
    G.gate.power = G.gateJob.power;
    if (W.gateOpen && G.gate.anim >= 0 && G.gate.anim < 1.6) G.gate.anim += dt;
  }

  function updateKid(k, dt, fi) {
    const p = G.player;
    const sp = 205 * k.def.speed;
    k.moving = false;
    if (k.hop > 0) k.hop = Math.max(0, k.hop - dt);
    switch (k.state) {
      case 'follow': {
        const a = fi * 2.39996, rad = 14 * Math.sqrt(fi + 0.7);
        const bx = p.x - p.fx * (30 + rad * 0.5), by = p.y - p.fy * (30 + rad * 0.5) - 6;
        const tx = bx + Math.cos(a) * rad, ty = by + Math.sin(a) * rad * 0.75;
        const far = U.dist(k.x, k.y, p.x, p.y);
        seek(k, tx, ty, sp * (far > 140 ? 1.55 : 1.1), dt, 3);
        if (!k.moving) { k.dir = 'front'; }
        break;
      }
      case 'pop': {
        k.popT -= dt;
        const t = 1 - Math.max(0, k.popT) / 0.45;
        k.z = Math.sin(t * Math.PI) * 26;
        if (k.popT <= 0) { k.z = 0; k.state = 'follow'; }
        break;
      }
      case 'air': {
        const a = k.air;
        a.t += dt / a.dur;
        const t = Math.min(1, a.t);
        k.x = U.lerp(a.sx, a.tx, t); k.y = U.lerp(a.sy, a.ty, t);
        k.z = 4 * a.h * t * (1 - t);
        k.spin = t * Math.PI * 2;
        if (t >= 1) { k.air = null; k.spin = 0; landKid(k); }
        break;
      }
      case 'idle': {
        k.seekT -= dt;
        if (k.seekT <= 0) { k.seekT = 0.35; findWork(k); }
        k.idleT -= dt;
        if (k.idleT <= 0) { k.idleT = U.rand(1.5, 4); k.hop = 0.25; k.dir = U.pick(['front', 'side', 'front']); k.face = U.pick([-1, 1]); }
        break;
      }
      case 'goto': {
        if (k.target && k.target.workers) {
          const j = k.target;
          if (!j.active() || j.workers.length >= j.max || G.jobs.indexOf(j) < 0) { k.state = 'idle'; k.target = null; break; }
          const s = j.slot(j.workers.length);
          const d = seek(k, s.x, s.y, sp, dt, 5);
          if (d < 40) k.stuckT = (k.stuckT || 0) + dt;
          if (d < 12 || k.stuckT > 1.2) { if (!attachJob(k, j)) k.state = 'idle'; }
          break;
        }
        const it = k.target;
        if (!it || it.absorbing || it.carriers.length >= it.maxC || G.items.indexOf(it) < 0) { k.state = 'idle'; k.target = null; break; }
        const d = seek(k, it.x, it.y, sp, dt, it.def.r + 10);
        if (d < it.def.r + 12) { k.target = null; if (!attach(k, it)) k.state = 'idle'; }
        break;
      }
      case 'carry': {
        const it = k.item;
        if (!it) { k.state = 'idle'; break; }
        const n = it.carriers.length;
        const ang = (k.slot / n) * Math.PI * 2 + Math.PI / 2;
        const rr = it.def.r + 7 + (k.slot % 2) * (n > 12 ? 8 : 0);
        const tx = it.x + Math.cos(ang) * rr, ty = it.y + Math.sin(ang) * rr * 0.72;
        k.x = U.smooth(k.x, tx, 14, dt); k.y = U.smooth(k.y, ty, 14, dt);
        k.moving = it.moving;
        if (it.moving) { k.walkT += dt * 0.8; faceKid(k, it.vx || 0, it.vy || 0); }
        else { faceKid(k, it.x - k.x, it.y - k.y); }
        break;
      }
      case 'work': {
        const j = k.job;
        if (!j) { k.state = 'idle'; break; }
        const s = j.slot(Math.max(0, j.workers.indexOf(k)));
        k.x = U.smooth(k.x, s.x, 10, dt); k.y = U.smooth(k.y, s.y + Math.sin(G.time * 8 + k.id) * 1.5, 10, dt);
        k.moving = true; k.walkT += dt * 0.7;
        if (j.kind === 'gate') k.dir = 'back';
        else faceKid(k, j.x - k.x, (j.y - 4) - k.y);
        break;
      }
      case 'return': {
        const d = seek(k, p.x, p.y, sp * 1.1, dt, 50);
        if (d < 60 && W.side(k.y) === W.side(p.y)) k.state = 'follow';
        break;
      }
      default: break;
    }
  }

  function separate(dt) {
    const ks = G.kids;
    for (let i = 0; i < ks.length; i++) {
      const a = ks[i];
      if (a.state === 'air' || a.state === 'carry' || a.state === 'work') continue;
      for (let j = i + 1; j < ks.length; j++) {
        const b = ks[j];
        if (b.state === 'air' || b.state === 'carry' || b.state === 'work') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx > 15 || dx < -15 || dy > 15 || dy < -15) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 < 196 && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (14 - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        }
      }
    }
    // 主人公に重ならない
    const p = G.player;
    for (const k of ks) {
      if (k.state === 'air' || k.state === 'carry' || k.state === 'work') continue;
      const dx = k.x - p.x, dy = k.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 22 * 22 && d2 > 0.01) { const d = Math.sqrt(d2); k.x = p.x + (dx / d) * 22; k.y = p.y + (dy / d) * 22; }
    }
  }

  function updateItem(it, dt) {
    it.ph += dt;
    if (it.spawnT < 1) it.spawnT = Math.min(1, it.spawnT + dt * 2.2);
    if (it.absorbing) {
      it.absT += dt;
      const t = Math.min(1, it.absT / 0.75);
      const e = U.easeInOut(t);
      it.x = U.lerp(it.ax, C.HOUSE.x + 4, e);
      it.y = U.lerp(it.ay, C.HOUSE.y + 2, e);
      it.z = U.lerp(0, 125, e) + Math.sin(t * Math.PI) * 90;
      it.scale = 1 - t * 0.9;
      if (t >= 1) finishDeliver(it);
      return;
    }
    let power = 0, spd = 0;
    for (const c of it.carriers) { power += c.def.power; spd += c.def.speed; }
    it.power = power;
    it.moving = power >= it.def.w;
    if (!it.moving) { it.vx = 0; it.vy = 0; return; }
    const avg = spd / it.carriers.length;
    const speed = 64 * avg * Math.min(1.9, 1 + 0.1 * (power - it.def.w)) * (it.def.big ? 0.85 : 1);
    const wp = W.nav(it.x, it.y, C.HOUSE.x, C.HOUSE.y);
    const dx = wp.x - it.x, dy = wp.y - it.y, d = Math.hypot(dx, dy) || 1;
    const ox = it.x, oy = it.y;
    W.move(it, (dx / d) * speed * dt, (dy / d) * speed * dt, Math.min(it.def.r * 0.55, 22));
    it.vx = it.x - ox; it.vy = it.y - oy;
    it.stepT -= dt;
    if (it.stepT <= 0) { it.stepT = 0.42; if (onScreen(it.x, it.y)) A.play('step', { pitch: 1 + (it.carriers.length % 4) * 0.08 }); }
    if (U.dist(it.x, it.y, C.HOUSE.x, C.HOUSE.y) < C.HOUSE.r + it.def.r + 16) startAbsorb(it);
  }

  function startAbsorb(it) {
    it.absorbing = true; it.absT = 0; it.ax = it.x; it.ay = it.y;
    for (const c of it.carriers.slice()) { c.item = null; c.state = 'return'; c.hop = 0.3; }
    it.carriers = [];
    A.play('deliver');
  }

  function finishDeliver(it) {
    G.items.splice(G.items.indexOf(it), 1);
    const def = it.def;
    G.coins += def.v; G.stats.coinsEarned += def.v; G.stats.total++;
    const first = !G.stats.delivered[it.type];
    G.stats.delivered[it.type] = (G.stats.delivered[it.type] || 0) + 1;
    if (def.mat) {
      G.mats[def.mat]++;
      G.float(C.HOUSE.x, C.HOUSE.y - 170, `${def.name} +1`, def.mat === 'wood' ? '#ffd8a8' : '#e9ecef', 30);
    } else G.float(C.HOUSE.x, C.HOUSE.y - 170, `+${def.v}`, '#ffe066', 34);
    G.emit('deliver', { type: it.type, def });
    A.play('coin');
    G.burst(C.HOUSE.x, C.HOUSE.y, 16, 'spark', { z: 130, colors: ['#fff6c2', '#ffd84a', '#fff'], min: 40, max: 180 });
    G.cam.shake = Math.max(G.cam.shake, def.big ? 10 : 2);
    // 芽がとびだす
    const plantedCount = G.sprouts.filter((s) => s.state !== 'gone').length;
    for (let i = 0; i < def.seeds; i++) {
      if (plantedCount + i >= 60) { G.coins += 2; continue; }
      let type = 'brown';
      if (def.seedType && Math.random() < (def.seedType === 'gold' ? 0.5 : 0.6)) type = def.seedType;
      else if (Math.random() < 0.03) type = 'gold';
      const s = freeSpotNear(C.HOUSE.x, C.HOUSE.y + 30, 140, 300, 10);
      G.sprouts.push({ type, x: C.HOUSE.x, y: C.HOUSE.y + 2, z: 125, sx: C.HOUSE.x, sy: C.HOUSE.y + 2, tx: s.x, ty: s.y, t: -i * 0.09, dur: U.rand(0.7, 1.1), state: 'fly', ph: Math.random() * 6 });
    }
    if (def.legend) {
      G.goldTimer = 150;
      G.highlight('金のりんごをはこんだ！', `+${def.v} もりコイン！`, { level: 3, dur: 3.4, color: '#e0a800' });
      G.burst(C.HOUSE.x, C.HOUSE.y, 40, 'confetti', { z: 140, colors: ['#ff6f91', '#ffc75f', '#6fc3e6', '#9cd36a', '#fff'], min: 80, max: 260, vzMax: 320 });
    } else if (def.big) {
      G.highlight(`おおもの！ ${def.name}`, `${def.seeds}このたねが とびだした！`, { level: 2 });
    } else if (it.type === 'star') {
      G.highlight('ほしのかけらをはこんだ！', `+${def.v} もりコイン`, { level: 2 });
    } else if (first) {
      G.highlight(`はじめての${def.name}！`, `+${def.v} もりコイン`);
    }
    hint('deliver', '運ぶと芽がふえるよ！「おいで！」ボタン(スペースキー)で、近くの芽や どんぐりっこをまとめて呼べるよ');
    if (G.stats.total >= 3) hint('town', '木や岩に どんぐりっこを投げると、木材や石がとれるよ。「🏘まち」で、おうちの北の広場に家を建てて、住人をよぼう！');
  }

  function updateSprouts(dt) {
    const p = G.player;
    for (const s of G.sprouts) {
      s.ph += dt;
      if (s.state === 'fly') {
        s.t += dt / s.dur;
        if (s.t < 0) continue;
        const t = Math.min(1, s.t);
        s.x = U.lerp(s.sx, s.tx, t); s.y = U.lerp(s.sy, s.ty, t);
        s.z = U.lerp(125, 0, t) + Math.sin(t * Math.PI) * 120;
        if (t >= 1) { s.state = 'planted'; s.z = 0; A.play('seed', { pitch: U.rand(0.9, 1.2) }); G.burst(s.x, s.y, 5, 'dust', { colors: ['#a5825a'], min: 20, max: 70, vzMax: 80 }); }
      } else if (s.state === 'planted') {
        if (U.dist(s.x, s.y, p.x, p.y) < 36) pluck(s);
      }
    }
    if (G.sprouts.length > 80 || G.sprouts.some((s) => s.state === 'gone')) G.sprouts = G.sprouts.filter((s) => s.state !== 'gone');
  }

  function spawner(dt) {
    G.spawnT -= dt;
    if (G.spawnT > 0) return;
    G.spawnT = 4;
    let s = 0, n = 0;
    for (const it of G.items) { if (it.def.region === 'S') s++; else if (it.def.region === 'N') n++; }
    if (s < 17) spawnItem('S');
    if (n < 15) spawnItem('N');
    if (!G.items.some((it) => it.type === 'goldapple')) {
      G.goldTimer -= 4;
      if (G.goldTimer <= 0) newItem('goldapple', 1000, 420);
    }
  }

  // ---------- 1日の流れ・天気 ----------
  const DARK = [[0, 0.28], [0.06, 0.05], [0.1, 0], [0.55, 0], [0.62, 0.22], [0.7, 0.6], [0.93, 0.6], [1, 0.28]];
  G.darkness = function (c) {
    c = c == null ? G.clock : c;
    for (let i = 1; i < DARK.length; i++) {
      if (c <= DARK[i][0]) {
        const [x0, y0] = DARK[i - 1], [x1, y1] = DARK[i];
        return U.lerp(y0, y1, U.easeInOut((c - x0) / (x1 - x0)));
      }
    }
    return 0.28;
  };
  G.warmth = function () {
    const c = G.clock;
    const ev = Math.max(0, 1 - Math.abs(c - 0.6) / 0.07);
    const dawn = Math.max(0, 1 - Math.abs(((c + 0.5) % 1) - 0.5 - 0.02) / 0.07);
    return Math.max(ev, dawn);
  };
  G.isNight = () => G.darkness() > 0.4;
  G.hour = () => (6 + G.clock * 24) % 24;

  function updateSky(dt) {
    const wasNight = G.isNight();
    G.clock += dt / C.DAY_LEN;
    if (G.clock >= 1) {
      G.clock -= 1; G.day++;
      G.weather.didRain = false;
      G.weather.rainAt = Math.random() < 0.45 ? U.rand(0.12, 0.48) : 2;
    }
    const night = G.isNight();
    if (wasNight && !night) { G.highlight('あさがきた！', `${G.day}日目の森`, { dur: 2.4, color: '#ff9f43' }); G.emit('morning'); }
    if (!wasNight && night) G.emit('toast', '夜になったよ。ながれぼしが見えるかも…');
    A.setNight(night);
    // 雨
    const w = G.weather;
    if (!w.raining && !w.didRain && G.clock >= w.rainAt && G.clock < 0.55) {
      w.raining = true; w.didRain = true; w.rainLeft = U.rand(40, 60);
      G.emit('toast', '雨がふってきた…');
    }
    if (w.raining) {
      w.rainLeft -= dt;
      if (w.rainLeft <= 0) {
        w.raining = false;
        if (!G.isNight()) { w.rainbow = 22; setTimeout(() => G.highlight('にじがでた！', '雨あがりの森', { color: '#6fa8dc' }), 1800); }
      }
    }
    w.rain = U.smooth(w.rain, w.raining ? 1 : 0, 0.6, dt);
    if (w.rainbow > 0) w.rainbow -= dt;
    A.setRain(w.rain);
    // ながれぼし
    G.starCD -= dt;
    if (night && G.starCD <= 0 && Math.random() < dt / 8) { G.starCD = U.rand(30, 50); shootingStar(); }
  }

  function shootingStar() {
    const p = G.player;
    let spot = null;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, d = U.rand(150, 320);
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.8;
      if (W.side(y) === W.side(p.y) && W.isFree(x, y, 30)) { spot = { x, y }; break; }
    }
    if (!spot) return;
    G.shooting.push({ tx: spot.x, ty: spot.y, sx: spot.x + 520, sy: spot.y - 1100, t: 0, dur: 1.2 });
    A.play('star');
  }

  function updateShooting(dt) {
    for (const s of G.shooting) {
      s.t += dt / s.dur;
      const t = Math.min(1, s.t);
      s.x = U.lerp(s.sx, s.tx, t * t); s.y = U.lerp(s.sy, s.ty, t * t);
      if (Math.random() < 0.9) G.particles.push({ kind: 'spark', x: s.x, y: s.y, z: 0, vx: U.rand(-20, 20), vy: U.rand(-20, 20), vz: 0, g: 0, life: 0, max: 0.6, size: U.rand(2, 5), color: U.pick(['#fff6c2', '#ffd84a', '#fff']), rot: 0 });
      if (t >= 1) {
        s.done = true;
        const it = newItem('star', s.tx, s.ty); it.spawnT = 0.3;
        G.burst(s.tx, s.ty, 30, 'spark', { colors: ['#fff6c2', '#ffd84a', '#fff'], min: 60, max: 240 });
        G.cam.shake = 9;
        G.highlight('ながれぼし！', 'ほしのかけらが おちてきた', { color: '#7b6cff' });
      }
    }
    G.shooting = G.shooting.filter((s) => !s.done);
  }

  function onScreen(x, y, pad = 60) {
    return x > G.cam.x - pad && x < G.cam.x + C.VW + pad && y > G.cam.y - pad && y < G.cam.y + C.VH + pad;
  }
  G.onScreen = onScreen;

  function updateFX(dt) {
    for (const pt of G.particles) {
      pt.life += dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vz -= pt.g * dt; pt.z += pt.vz * dt;
      if (pt.z < 0 && pt.g > 0) { pt.z = 0; pt.vz *= -0.3; pt.vx *= 0.6; pt.vy *= 0.6; }
      pt.rot += dt * 6;
    }
    G.particles = G.particles.filter((pt) => pt.life < pt.max);
    if (G.particles.length > 700) G.particles.splice(0, G.particles.length - 700);
    for (const f of G.floaters) f.t += dt;
    G.floaters = G.floaters.filter((f) => f.t < f.dur);
    for (const r of G.rings) r.t += dt;
    G.rings = G.rings.filter((r) => r.t < r.dur);
    if (G.banners.length) {
      G.banners[0].t += dt;
      if (G.banners[0].t >= G.banners[0].dur) G.banners.shift();
    }
    // ほたる
    const night = G.darkness();
    if (night > 0.35 && G.fireflies.length < 26 && Math.random() < dt * 8) {
      const x = G.cam.x + U.rand(0, C.VW), y = G.cam.y + U.rand(0, C.VH);
      if (!W.inWater(x, y)) G.fireflies.push({ x, y, z: U.rand(10, 40), vx: 0, vy: 0, t: 0, max: U.rand(4, 8), ph: Math.random() * 6 });
    }
    for (const f of G.fireflies) {
      f.t += dt; f.ph += dt;
      f.vx += U.rand(-60, 60) * dt; f.vy += U.rand(-60, 60) * dt;
      f.vx *= 0.97; f.vy *= 0.97;
      f.x += f.vx * dt; f.y += f.vy * dt;
    }
    G.fireflies = G.fireflies.filter((f) => f.t < f.max && (night > 0.2 || f.t < 1));
    // ふんすいの水しぶき
    for (const d of G.decos) {
      if (d.type === 'fountain' && onScreen(d.x, d.y) && Math.random() < dt * 20) {
        G.particles.push({ kind: 'splash', x: d.x + U.rand(-3, 3), y: d.y - 2, z: 48, vx: U.rand(-30, 30), vy: U.rand(-12, 12), vz: U.rand(60, 120), g: 300, life: 0, max: 0.8, size: U.rand(1.5, 3), color: U.pick(['#bfe9ff', '#fff']), rot: 0 });
      }
    }
    // 金のりんごのきらめき
    for (const it of G.items) {
      if ((it.def.glow || it.def.shiny) && onScreen(it.x, it.y) && Math.random() < dt * (it.def.legend ? 8 : 3)) {
        G.particles.push({ kind: 'spark', x: it.x + U.rand(-it.def.r, it.def.r), y: it.y + U.rand(-4, 4), z: U.rand(0, it.def.r * 1.6), vx: 0, vy: 0, vz: 25, g: 0, life: 0, max: 0.8, size: U.rand(2, 4), color: '#fff6c2', rot: 0 });
      }
    }
    if (G.cam.shake > 0) G.cam.shake = Math.max(0, G.cam.shake - dt * 30);
  }

  function updatePlayer(dt) {
    const p = G.player;
    let mx = G.input.mx, my = G.input.my;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    const speed = 235;
    p.vx = U.smooth(p.vx, mx * speed, 14, dt);
    p.vy = U.smooth(p.vy, my * speed, 14, dt);
    p.moving = Math.hypot(p.vx, p.vy) > 20;
    if (p.moving) {
      W.move(p, p.vx * dt, p.vy * dt, 14);
      p.walkT += dt * Math.min(1, Math.hypot(p.vx, p.vy) / speed);
      if (m > 0.2) {
        const l = Math.hypot(mx, my);
        p.fx = mx / l; p.fy = my / l;
        if (p.throwT <= 0) {
          if (Math.abs(mx) > Math.abs(my) * 0.9) { p.dir = 'side'; p.face = mx < 0 ? -1 : 1; }
          else p.dir = my < 0 ? 'back' : 'front';
        }
      }
    }
    if (p.throwT > 0) p.throwT -= dt;
  }

  function updateCamera(dt) {
    const p = G.player;
    const tx = U.clamp(p.x - C.VW / 2 + p.vx * 0.25, 0, C.WW - C.VW);
    const ty = U.clamp(p.y - C.VH * 0.56 + p.vy * 0.25, 0, C.WH - C.VH);
    G.cam.x = U.smooth(G.cam.x, tx, 5, dt);
    G.cam.y = U.smooth(G.cam.y, ty, 5, dt);
  }

  G.update = function (dt) {
    if (G.paused) return;
    dt = Math.min(dt, 1 / 20);
    G.time += dt;
    updatePlayer(dt);
    const fol = [];
    for (const k of G.kids) if (k.state === 'follow') fol.push(k);
    fol.sort((a, b) => a.id - b.id);
    const idx = new Map(fol.map((k, i) => [k, i]));
    for (const k of G.kids) updateKid(k, dt, idx.get(k) || 0);
    separate(dt);
    for (const k of G.kids) if (k.state !== 'air' && k.state !== 'carry' && k.state !== 'work') W.resolve(k, 8);
    for (const it of G.items.slice()) updateItem(it, dt);
    updateSprouts(dt);
    updateJobs(dt);
    G.emit('update', dt);
    spawner(dt);
    updateSky(dt);
    updateShooting(dt);
    updateFX(dt);
    updateCamera(dt);
    if (!W.gateOpen && G.kids.length >= 10) hint('gate', '北の丸太は、どんぐりっこを10ぴきくらい投げるとどかせるよ。その先は深い森…！');
    G.saveT += dt;
    if (G.saveT > 10) { G.saveT = 0; G.save(); }
  };

  // デバッグ・テスト用
  G._debug = { newItem, newKid, shootingStar, spawnItem, dropMat };
  G.hint = hint;
  G.freeSpotNear = freeSpotNear;

  DF.Game = G;
})(window.DF);
