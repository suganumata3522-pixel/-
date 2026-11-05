'use strict';
// まちづくり: 建物の工事・住人のひっこし・おねがい・お店の収入・町の評価
(function (DF) {
  const U = DF.U, C = DF.C, W = DF.World, G = DF.Game, A = DF.Audio;
  const T = { name: 'どんぐりタウン', buildings: [], residents: [], rank: 1, nextId: 1, pendingMoves: [], rankT: 0 };
  const SPECIES = { rabbit: 'うさぎ', bear: 'くま', cat: 'ねこ', dog: 'いぬ', squirrel: 'りす', sheep: 'ひつじ', fox: 'きつね', penguin: 'ペンギン' };
  T.speciesName = (r) => SPECIES[DF.RESIDENTS[r.idx].species] || '';

  // ---------- 建物 ----------
  T.count = (type) => T.buildings.filter((b) => b.type === type).length;
  T.built = () => T.buildings.filter((b) => b.done);
  T.byId = (id) => T.buildings.find((b) => b.id === id);
  T.base = (b) => b.y + b.def.r * 0.35; // 建物の正面(描く基準)

  T.canBuild = function (type) {
    const def = DF.BUILDINGS[type];
    if (T.count(type) >= def.max) {
      if (def.max > 1) return { ok: false, reason: 'もういっぱい' };
      return { ok: false, reason: T.buildings.some((b) => b.type === type && !b.done) ? '工事中' : '完成ずみ' };
    }
    if (def.resident && T.count('house') >= DF.RESIDENTS.length) return { ok: false, reason: 'もういっぱい' };
    const lack = [];
    if (G.mats.wood < def.wood) lack.push(`木材${def.wood - G.mats.wood}`);
    if (G.mats.stone < def.stone) lack.push(`石${def.stone - G.mats.stone}`);
    if (G.coins < def.coins) lack.push(`コイン${def.coins - G.coins}`);
    if (lack.length) return { ok: false, reason: 'あと ' + lack.join('・') };
    return { ok: true };
  };

  function spotOK(x, y, def) {
    const r = def.r;
    if (y < C.GATE.y1 + r + 90 || y > C.WH - r - 50 || x < r + 70 || x > C.WW - r - 70) return false;
    if (Math.abs(x - 1000) < r * 0.8 + 72 && y < C.HOUSE.y - 40) return false; // 橋からおうちへの道はあけておく
    if (U.dist(x, y, C.HOUSE.x, C.HOUSE.y) < C.HOUSE.r + r * 0.8 + 50) return false;
    if (!W.isFreeArea(x, y, r * 0.8)) return false;
    for (const b of T.buildings) if (U.dist(x, y, b.x, b.y) < (b.def.r + r) * 1.05) return false;
    for (const d of G.decos) if (U.dist(x, y, d.x, d.y) < r * 0.8 + DF.DECOS[d.type].r + 6) return false;
    return true;
  }

  T.startBuild = function (type) {
    const chk = T.canBuild(type);
    if (!chk.ok) { A.play('nope'); return { ok: false, reason: chk.reason }; }
    const def = DF.BUILDINGS[type];
    const p = G.player;
    let spot = null;
    const base = Math.atan2(p.fy, p.fx);
    for (let d = def.r + 70; d < 460 && !spot; d += 22) {
      for (let i = 0; i < 16; i++) {
        const a = base + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.38;
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        if (spotOK(x, y, def)) { spot = { x, y }; break; }
      }
    }
    if (!spot) { A.play('nope'); return { ok: false, reason: 'ここには建てられないみたい。橋の南の、ひろい場所で ためしてね' }; }
    G.mats.wood -= def.wood; G.mats.stone -= def.stone; G.coins -= def.coins;
    const b = { id: T.nextId++, type, def, x: spot.x, y: spot.y, done: false, progress: 0, born: G.time };
    if (def.resident) b.residentIdx = nextResidentIdx();
    T.buildings.push(b);
    addBuildingBody(b);
    b.job = siteJob(b);
    A.play('buy');
    G.burst(b.x, b.y, 14, 'dust', { colors: ['#c9a66b', '#e9d8a6'], min: 40, max: 140 });
    G.hint('site', '工事現場に どんぐりっこを投げると、工事がすすむよ。たくさん投げるほど早くできる！');
    G.save();
    return { ok: true, building: b };
  };

  function nextResidentIdx() {
    const used = new Set(T.buildings.filter((b) => b.residentIdx != null).map((b) => b.residentIdx));
    for (let i = 0; i < DF.RESIDENTS.length; i++) if (!used.has(i)) return i;
    return 0;
  }

  function addBuildingBody(b) {
    W.addObstacle({ kind: 'circle', x: b.x, y: b.y, r: b.def.r * 0.72, dynamic: true });
    // 敷地の中にあったおとしものは外へ
    for (const it of G.items) {
      if (!it.carriers.length && U.dist(it.x, it.y, b.x, b.y) < b.def.r * 0.72 + it.def.r) {
        const s = G.freeSpotNear(b.x, b.y, b.def.r + 20, b.def.r + 90, it.def.r + 4);
        it.x = s.x; it.y = s.y;
      }
    }
  }

  function siteJob(b) {
    const def = b.def;
    return G.addJob({
      kind: 'site', ref: b, x: b.x, y: b.y, need: def.work, max: 30, after: 'return', progress: b.progress || 0,
      active() { return !b.done; },
      hit(x, y) { const d = U.dist(x, y, b.x, b.y - def.r * 0.3); return d < def.r + 46 ? d * 0.4 : Infinity; },
      slot(i) {
        const n = 16, ring = Math.floor(i / n);
        const a = ((i % n) / n) * Math.PI * 2 + ring * 0.2 + Math.PI / 2;
        const rr = def.r * 0.72 + 18 + ring * 14;
        return { x: b.x + Math.cos(a) * rr, y: b.y + Math.sin(a) * rr * 0.9 };
      },
      done() { complete(b); },
    });
  }

  function complete(b) {
    b.done = true; b.doneT = G.time; b.progress = 1;
    const def = b.def;
    A.play('build');
    G.cam.shake = 8;
    G.burst(b.x, T.base(b) - 40, 36, 'confetti', { z: 60, colors: ['#ff6f91', '#ffc75f', '#6fc3e6', '#9cd36a', '#fff'], min: 80, max: 260, vzMax: 320 });
    G.highlight(`${def.name}が完成！`, def.resident ? 'だれかが ひっこしてくるよ…！' : def.desc, { level: 2, color: '#4c9a3a' });
    if (def.resident) T.pendingMoves.push({ b, at: G.time + 3.2 });
    G.save();
  }

  // ---------- 住人 ----------
  function door(b) { return { x: b.x, y: b.y + b.def.r * 0.72 + 20 }; }

  function moveIn(b) {
    const d = DF.RESIDENTS[b.residentIdx];
    // 画面の中で、家まで少し歩いてくる位置にあらわれる
    const dr = door(b);
    let s = G.freeSpotNear(dr.x, dr.y + 230, 0, 90, 14);
    if (W.side(s.y) !== 'S') s = { x: dr.x, y: dr.y + 60 };
    const r = newResident(b.residentIdx, b.id, s.x, s.y);
    r.state = 'arrive';
    G.burst(s.x, s.y - 20, 12, 'spark', { colors: ['#ff8fab', '#fff6c2', '#fff'], z: 20 });
    G.emit('toast', `${d.name}が ひっこしてくるよ！`);
    return r;
  }

  function newResident(idx, home, x, y) {
    const r = {
      id: T.nextId++, idx, home, x, y, state: 'idle', face: 1, dir: 'front', moving: false, t: U.rand(1, 3),
      talk: null, talkCD: 0, req: null, reqCD: U.rand(15, 35), happy: 0, tx: x, ty: y,
    };
    T.residents.push(r);
    return r;
  }

  function walkTo(r, tx, ty, speed, dt) {
    const wp = W.nav(r.x, r.y, tx, ty);
    const dx = wp.x - r.x, dy = wp.y - r.y, d = Math.hypot(dx, dy);
    if (d < 6 && wp.x === tx && wp.y === ty) { r.moving = false; return true; }
    const step = Math.min(d, speed * dt);
    W.move(r, (dx / d) * step, (dy / d) * step, 12);
    r.moving = true;
    if (Math.abs(dx) > Math.abs(dy) * 1.1) { r.dir = 'side'; r.face = dx < 0 ? -1 : 1; }
    else r.dir = dy < 0 ? 'back' : 'front';
    return false;
  }

  function say(r, text, dur) {
    r.talk = { text, t: dur || 3.4 };
    A.play('talk', { pitch: 0.8 + (r.idx % 4) * 0.12 });
  }

  // おねがい: 指定のものを運ぶと、ごほうび
  function makeRequest(r) {
    const pool = ['acorn', 'berry', 'mushroom', 'apple', 'wood', 'wood', 'stone'];
    if (W.gateOpen) pool.push('chestnut', 'peach', 'gem');
    const item = U.pick(pool);
    const def = DF.ITEMS[item];
    const count = def.w >= 4 ? U.randi(1, 2) : def.w >= 2 ? U.randi(1, 3) : U.randi(2, 4);
    const reward = Math.round(def.v * count * 2 + 25 + (def.mat ? 12 * count : 0));
    r.req = { item, count, got: 0, reward, seen: false };
  }
  T.reqText = (r) => {
    const q = r.req, def = DF.ITEMS[q.item];
    return q.got ? `${def.name} あと${q.count - q.got}こ、まってるね！` : `${def.name}を ${q.count}こ もってきてくれる？`;
  };

  G.on('deliver', ({ type }) => {
    for (const r of T.residents) {
      const q = r.req;
      if (!q || q.item !== type || q.got >= q.count) continue;
      q.got++;
      if (q.got >= q.count) {
        const d = DF.RESIDENTS[r.idx];
        G.coins += q.reward; G.stats.coinsEarned += q.reward;
        r.req = null; r.reqCD = U.rand(70, 120); r.happy = 3.5;
        say(r, `ありがとう！ おれいに ${q.reward}コイン どうぞ`, 4);
        G.float(r.x, r.y - 90, `+${q.reward}`, '#ffe066', 32);
        G.burst(r.x, r.y - 40, 14, 'spark', { colors: ['#ff8fab', '#ffd84a', '#fff'], z: 40 });
        G.highlight(`${d.name}のおねがい達成！`, `+${q.reward} もりコイン`, { color: '#e07a8f' });
      }
      break; // ひとつの品は1人分
    }
  });

  G.on('morning', () => {
    let sum = 0;
    for (const b of T.built()) {
      if (!b.def.income) continue;
      G.coins += b.def.income; G.stats.coinsEarned += b.def.income; sum += b.def.income;
      G.float(b.x, T.base(b) - 120, `+${b.def.income}`, '#ffe066', 30);
    }
    if (sum) G.emit('toast', `お店から +${sum} もりコイン がとどいたよ`);
  });

  // ---------- 町の評価 ----------
  T.points = function () {
    let p = 0;
    for (const b of T.built()) p += b.def.pts;
    p += T.residents.length * 8;
    p += G.decos.reduce((s, d) => s + DF.DECOS[d.type].price, 0) / 40;
    p += Math.floor(G.kids.length / 5);
    if (W.gateOpen) p += 5;
    return Math.floor(p);
  };
  T.rankOf = (pts) => { let r = 0; for (const t of DF.RANKS) if (pts >= t) r++; return Math.max(1, r); };
  T.stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  // ---------- 毎フレーム ----------
  G.on('update', (dt) => {
    for (let i = T.pendingMoves.length - 1; i >= 0; i--) {
      if (G.time >= T.pendingMoves[i].at) { moveIn(T.pendingMoves[i].b); T.pendingMoves.splice(i, 1); }
    }
    const p = G.player;
    const night = G.isNight();
    for (const r of T.residents) {
      const home = T.byId(r.home);
      if (!home) continue;
      const dr = door(home);
      if (r.happy > 0) r.happy -= dt;
      if (r.talkCD > 0) r.talkCD -= dt;
      if (r.talk) { r.talk.t -= dt; if (r.talk.t <= 0) r.talk = null; }
      if (!r.req && r.state !== 'arrive') { r.reqCD -= dt; if (r.reqCD <= 0) makeRequest(r); }
      switch (r.state) {
        case 'arrive':
          if (walkTo(r, dr.x, dr.y, 90, dt)) {
            r.state = 'idle'; r.t = 3; r.happy = 3; r.dir = 'front';
            say(r, 'よろしくね！ すてきな町だね', 4);
            const d = DF.RESIDENTS[r.idx];
            G.highlight(`${d.name}がひっこしてきた！`, `${SPECIES[d.species]}の ${d.name}`, { level: 2, color: '#e07a8f' });
            G.hint('resident', '住人に近づくと話しかけられるよ。「！」が出ていたら おねがいがあるみたい！');
          }
          break;
        case 'inside':
          r.moving = false;
          if (!night) { r.state = 'idle'; r.t = U.rand(1, 3); r.x = dr.x; r.y = dr.y; }
          break;
        case 'home':
          if (walkTo(r, dr.x, dr.y - 12, 70, dt)) r.state = 'inside';
          break;
        case 'idle':
          r.moving = false;
          if (night) { r.state = 'home'; break; }
          r.t -= dt;
          if (r.t <= 0) {
            // 家のまわりか、町の広場をおさんぽ
            const c = Math.random() < 0.35 ? { x: C.HOUSE.x, y: C.HOUSE.y + 120 } : dr;
            const s = G.freeSpotNear(c.x, c.y, 40, 230, 14);
            if (W.side(s.y) === 'S') { r.tx = s.x; r.ty = s.y; r.state = 'walk'; }
            r.t = U.rand(2, 5);
          }
          break;
        case 'walk':
          if (night) { r.state = 'home'; break; }
          if (walkTo(r, r.tx, r.ty, 55, dt)) { r.state = 'idle'; r.t = U.rand(2, 6); }
          r.t -= dt;
          if (r.t < -8) { r.state = 'idle'; r.t = 1; }
          break;
        default: r.state = 'idle';
      }
      // 隊長が近くに来たらおしゃべり
      if (r.state !== 'inside' && r.state !== 'arrive' && r.talkCD <= 0 && U.dist(r.x, r.y, p.x, p.y) < 78) {
        r.talkCD = 8;
        if (r.req) { say(r, T.reqText(r), 4.2); r.req.seen = true; }
        else say(r, U.pick(DF.TALK));
        if (r.state === 'walk') { r.state = 'idle'; r.t = 2.5; }
        const dx = p.x - r.x;
        r.dir = Math.abs(dx) > 20 ? 'side' : 'front'; r.face = dx < 0 ? -1 : 1;
      }
    }
    // 評価
    T.rankT -= dt;
    if (T.rankT <= 0) {
      T.rankT = 1;
      const rk = T.rankOf(T.points());
      if (rk > T.rank) {
        T.rank = rk;
        G.highlight(`町の評価が ${T.stars(rk)} に！`, rk >= 5 ? 'みんなのあこがれの町！' : 'にぎやかになってきたよ', { level: 3, color: '#e0a800', dur: 3.2 });
        G.save();
      }
    }
  });

  // ---------- 保存・復元 ----------
  T.serialize = function () {
    return {
      name: T.name, rank: T.rank, nextId: T.nextId,
      buildings: T.buildings.map((b) => ({ id: b.id, type: b.type, x: Math.round(b.x), y: Math.round(b.y), done: b.done, progress: b.job ? +b.job.progress.toFixed(3) : b.progress, residentIdx: b.residentIdx })),
      residents: T.residents.map((r) => ({ id: r.id, idx: r.idx, home: r.home, req: r.req })),
    };
  };
  G.on('reset', (save) => {
    W.clearDynamic();
    T.buildings = []; T.residents = []; T.pendingMoves = []; T.rank = 1; T.nextId = 1; T.name = 'どんぐりタウン';
    const t = save && save.town;
    if (!t) return;
    T.name = t.name || T.name; T.rank = t.rank || 1; T.nextId = t.nextId || 1;
    for (const s of t.buildings || []) {
      const def = DF.BUILDINGS[s.type];
      if (!def) continue;
      const b = { id: s.id, type: s.type, def, x: s.x, y: s.y, done: !!s.done, progress: s.progress || 0, residentIdx: s.residentIdx, doneT: -10 };
      T.buildings.push(b);
      addBuildingBody(b);
      if (!b.done) b.job = siteJob(b);
    }
    for (const s of t.residents || []) {
      const home = T.byId(s.home);
      if (!home) continue;
      const dr = door(home);
      const r = newResident(s.idx, s.home, dr.x, dr.y);
      r.id = s.id; r.req = s.req || null;
    }
    // 完成したのに住人がいない家(ひっこし前に閉じた)
    for (const b of T.buildings) {
      if (b.done && b.def.resident && !T.residents.some((r) => r.home === b.id)) T.pendingMoves.push({ b, at: G.time + 2 });
    }
  });

  DF.Town = T;
})(window.DF);
