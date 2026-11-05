/* あつまれ ピクミンの森 — simulation.
 * Fixed 60 steps per second and seeded randomness only, so an autoplay run is
 * reproducible frame for frame (the video recorder relies on it). */
(function (G) {
  'use strict';
  const PM = G.PM = G.PM || {};
  const T = PM.T, TER = PM.TER;
  const VIEW = { x: 0, y: 230, w: 1080, h: 1420 };
  Object.assign(PM, { VIEW, W: 1080, H: 1920 });

  const COLORS = ['red', 'yellow', 'blue'];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  PM.dist = dist;

  PM.BUILD = {
    house: { name: 'ピクミンの家', cost: { wood: 6, stone: 2 }, work: 2400, slots: 10 },
    bridge: { name: '橋', cost: { wood: 8, stone: 0 }, work: 1800, slots: 8 },
    shop: { name: 'ルーイの商店', cost: { wood: 10, stone: 6 }, work: 3000, slots: 12 },
    museum: { name: '博物館', cost: { wood: 10, stone: 10 }, work: 3400, slots: 12 },
    plaza: { name: '噴水広場', cost: { wood: 0, stone: 10 }, work: 2400, slots: 12 },
  };
  // construction order; also drives the 島づくりの目標 panel
  PM.PLAN = [
    { kind: 'house', lot: 0, pikmin: 14 }, { kind: 'house', lot: 1, pikmin: 18 }, { kind: 'bridge', pikmin: 22 },
    { kind: 'shop', pikmin: 26 }, { kind: 'house', lot: 2, pikmin: 30 }, { kind: 'museum', pikmin: 34 },
    { kind: 'house', lot: 3, pikmin: 38 }, { kind: 'plaza', pikmin: 40 },
  ];
  const JOB = {
    tree: { need: 600, slots: 6, r: 46 },
    rock: { need: 660, slots: 6, r: 52 },
    fruit: { need: 300, slots: 4, r: 50 },
    posy: { need: 140, slots: 2, r: 30 },
    weed: { need: 50, slots: 1, r: 18 },
  };
  const ITEM = {
    log: { weight: 2, dest: 'base', res: 'wood' },
    stone: { weight: 2, dest: 'base', res: 'stone' },
    fruit: { weight: 2, dest: 'onion', seeds: 3 },
    pellet: { weight: 1, dest: 'onion', seeds: 2 },
  };
  PM.JOB = JOB; PM.ITEM = ITEM;

  /* ------------------------------------------------------------ objects */
  class Obj {
    constructor(g, o) {
      Object.assign(this, o);
      this.g = g; this.workers = []; this.progress = 0; this.state = 'ready'; this.t = 0; this.cool = 0;
      const J = JOB[this.kind];
      if (J) { this.need = J.need; this.slotN = J.slots; this.r = J.r; }
    }
    jobbable() { return !!JOB[this.kind] && this.state === 'ready' || (this.kind === 'site' && this.state === 'ready'); }
    freeSlots() { return this.jobbable() ? this.slotN - this.workers.length : 0; }
    slotPos(i) {
      if (this.kind === 'site') {
        const L = this.lot, x0 = L.c * T, y0 = L.r * T, w = L.w * T, h = L.h * T;
        const per = 2 * (w + h), d = (i + 0.5) / this.slotN * per;
        if (d < w) return { x: x0 + d, y: y0 + h + 16 };
        if (d < w + h) return { x: x0 + w + 16, y: y0 + h - (d - w) };
        if (d < 2 * w + h) return { x: x0 + w - (d - w - h), y: y0 - 6 };
        return { x: x0 - 16, y: y0 + (d - 2 * w - h) };
      }
      const a = (i / this.slotN) * Math.PI * 2 + 0.4;
      return { x: this.x + Math.cos(a) * this.r, y: this.y + Math.sin(a) * this.r * 0.6 + 4 };
    }
    addWorker(p) { const i = this.workers.length; this.workers.push(p); return this.slotPos(i); }
    removeWorker(p) { const i = this.workers.indexOf(p); if (i >= 0) this.workers.splice(i, 1); }
    update() {
      const g = this.g;
      this.t++;
      if (this.cool > 0 && --this.cool === 0) { this.state = 'ready'; this.progress = 0; }
      if (this.state === 'falling' && this.t >= 34) { this.state = 'stump'; g.sfx('thud'); g.dust(this.x, this.y, 5); }
      if (this.state !== 'ready' || this.progress < this.need) return;
      // job finished
      const ws = this.workers.slice(); this.workers = [];
      let drops = [];
      switch (this.kind) {
        case 'tree':
          this.state = 'falling'; this.t = 0; g.sfx('timber');
          drops = ['log', 'log', 'log'];
          g.highlight('tree', 'みんなで 木を きったよ!', { x: this.x, y: this.y - 60, dur: 150, once: true, zoom: 1.3 });
          break;
        case 'rock':
          this.state = 'cracked'; this.cool = 1700; g.sfx('crack'); g.dust(this.x, this.y, 6);
          drops = ['stone', 'stone'];
          g.highlight('rock', '岩を くだいて 石を ゲット!', { x: this.x, y: this.y - 40, dur: 110, once: true, zoom: 1.3 });
          break;
        case 'fruit':
          this.state = 'bare'; this.cool = 2600; g.sfx('shake');
          drops = ['fruit', 'fruit'];
          break;
        case 'posy':
          this.state = 'bare'; this.cool = 3200; g.sfx('pop');
          drops = ['pellet'];
          break;
        case 'weed':
          this.state = 'gone'; g.weeds++; g.sfx('puchi');
          for (let i = 0; i < 4; i++) g.leaf(this.x, this.y - 10);
          break;
        case 'site':
          g.finishSite(this, ws); return;
      }
      const items = drops.map((k, i) => {
        const a = (i / Math.max(1, drops.length)) * Math.PI * 2 + this.t * 0.1;
        const it = new Item(g, k, this.x + Math.cos(a) * 38, this.y + 10 + Math.sin(a) * 18);
        g.items.push(it); return it;
      });
      // the workers pick up what they produced, the rest go back to オリマー
      for (const p of ws) {
        const it = items.find((x) => x.carriers.length < x.weight);
        if (it) it.addCarrier(p); else p.goBack();
      }
    }
  }

  /* -------------------------------------------------------------- items */
  class Item {
    constructor(g, kind, x, y) {
      this.g = g; this.kind = kind; this.x = x; this.y = y; this.z = 0;
      const d = ITEM[kind];
      this.weight = d.weight; this.dest = d.dest; this.carriers = []; this.done = false; this.t = 0; this.bob = 0;
    }
    addCarrier(p) { this.carriers.push(p); p.state = 'carry'; p.item = this; p.job = null; }
    freeSlots() { return this.done ? 0 : Math.max(0, this.weight + 2 - this.carriers.length); }
    target() { return this.dest === 'onion' ? this.g.onion : this.g.base; }
    update() {
      const g = this.g;
      this.t++;
      if (this.carriers.length >= this.weight) {
        const sp = Math.min(3.1, 1.6 + 0.35 * (this.carriers.length - this.weight));
        const goal = this.target(), gy = goal.y + (this.dest === 'onion' ? 10 : 30);
        const wp = g.waypoint(this, { x: goal.x, y: gy });
        const dx = wp.x - this.x, dy = wp.y - this.y, d = Math.hypot(dx, dy);
        if (d > sp) { this.x += dx / d * sp; this.y += dy / d * sp; }
        this.bob += 0.35;
        if (Math.hypot(goal.x - this.x, gy - this.y) < 34) this.deliver();
      }
      this.carriers.forEach((p, i) => {
        const a = (i / this.carriers.length) * Math.PI * 2 + 0.5;
        p.x = this.x + Math.cos(a) * 18; p.y = this.y + Math.sin(a) * 9 + 6;
        p.anim += 0.3;
      });
    }
    deliver() {
      const g = this.g, d = ITEM[this.kind];
      this.done = true;
      if (d.res) {
        g.inv[d.res]++; g.sfx('deliver');
        g.popText('+1 ' + (d.res === 'wood' ? '木材' : '石'), g.base.x, g.base.y - 120);
        g.highlight('carry', 'えっほ えっほ! ピクミンが 運ぶよ', { x: this.x, y: this.y - 30, dur: 130, once: true, zoom: 1.35 });
      } else {
        g.onionEat(this, d.seeds);
      }
      for (const p of this.carriers) p.goBack();
      this.carriers = [];
    }
  }

  /* ------------------------------------------------------------- pikmin */
  class Pikmin {
    constructor(g, color, x, y, state) {
      this.g = g; this.color = color; this.x = x; this.y = y; this.z = 0;
      this.state = state || 'sprout'; this.t = 0; this.anim = (x * 7 + y) % 6; this.dir = 1;
      this.age = 0; this.job = null; this.item = null; this.flight = null; this.id = g.pikminSerial++;
    }
    get stage() { return this.age > 7000 ? 2 : this.age > 3200 ? 1 : 0; }
    goBack() { this.state = 'return'; this.job = null; this.item = null; this.z = 0; }
    walk(tx, ty, sp) {
      const wp = this.g.waypoint(this, { x: tx, y: ty });
      const dx = wp.x - this.x, dy = wp.y - this.y, d = Math.hypot(dx, dy);
      if (d <= sp) { this.x = wp.x; this.y = wp.y; return Math.hypot(tx - this.x, ty - this.y) < 2; }
      this.x += dx / d * sp; this.y += dy / d * sp; this.anim += sp * 0.18;
      if (Math.abs(dx) > 0.5) this.dir = dx > 0 ? 1 : -1;
      return false;
    }
    update() {
      const g = this.g, o = g.olimar;
      this.t++; if (this.state !== 'sprout' && this.state !== 'seed') this.age++;
      switch (this.state) {
        case 'seed': {
          const f = this.flight;
          if (++f.t < 0) { this.hidden = true; break; }
          this.hidden = false;
          const k = Math.min(1, f.t / f.dur);
          this.x = f.x0 + (f.x1 - f.x0) * k; this.y = f.y0 + (f.y1 - f.y0) * k; this.z = Math.sin(k * Math.PI) * f.h;
          if (k >= 1) { this.state = 'sprout'; this.z = 0; g.dust(this.x, this.y, 1); }
          break;
        }
        case 'sprout': this.anim += 0.08; break;
        case 'pluck':
          this.z = Math.sin(Math.min(1, this.t / 22) * Math.PI) * 46;
          if (this.t >= 22) { this.z = 0; this.state = 'follow'; g.followers.push(this); }
          break;
        case 'follow': {
          const tg = o.slot(g.followers.indexOf(this));
          const d = Math.hypot(tg.x - this.x, tg.y - this.y);
          if (d > 3) this.walk(tg.x, tg.y, d > 260 ? 7 : d > 60 ? 4.6 : 3.4);
          else this.dir = o.dir;
          break;
        }
        case 'thrown': {
          const f = this.flight, k = Math.min(1, ++f.t / f.dur);
          this.x = f.x0 + (f.x1 - f.x0) * k; this.y = f.y0 + (f.y1 - f.y0) * k;
          this.z = Math.sin(k * Math.PI) * f.h; this.anim += 0.6;
          if (k >= 1) {
            this.z = 0;
            if (this.item && !this.item.done) { this.item.addCarrier(this); }
            else if (this.job && this.job.state === 'ready') { this.state = 'work'; this.t = 0; }
            else this.goBack();
          }
          break;
        }
        case 'work': {
          const j = this.job;
          if (!j || j.state !== 'ready') { this.goBack(); break; }
          j.progress += 1; this.anim += 0.25;
          this.dir = j.x > this.x ? 1 : -1;
          if (this.t % 26 === (this.id % 26)) g.sfx(j.kind === 'site' ? 'hammer' : j.kind === 'rock' ? 'clink' : j.kind === 'tree' ? 'chop' : 'tug');
          break;
        }
        case 'carry': break;
        case 'return': {
          if (this.walk(o.x, o.y, 4.4) || Math.hypot(o.x - this.x, o.y - this.y) < 90) { this.state = 'follow'; g.followers.push(this); }
          // help an item that is short of carriers on the way
          for (const it of g.items) {
            if (!it.done && it.carriers.length < it.weight && Math.hypot(it.x - this.x, it.y - this.y) < 140) { it.addCarrier(this); break; }
          }
          break;
        }
        case 'idle': this.anim += 0.03; break;
      }
      if (this.state !== 'follow') { const i = g.followers.indexOf(this); if (i >= 0) g.followers.splice(i, 1); }
    }
  }

  /* ------------------------------------------------------------- olimar */
  class Olimar {
    constructor(g, x, y) {
      this.g = g; this.x = x; this.y = y; this.tx = null; this.ty = null; this.dir = 1; this.anim = 0;
      this.pluckT = 0; this.throwT = 0; this.whistleT = 0; this.visible = false; this.speed = 3.6; this.moving = false;
    }
    slot(i) {
      const cx = this.x - this.dir * 46, cy = this.y + 10;
      if (i < 0) return { x: cx, y: cy };
      const a = i * 2.39996, r = 16 * Math.sqrt(i + 1);
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.62 };
    }
    moveTo(x, y) { this.tx = x; this.ty = y; }
    update() {
      const g = this.g;
      if (this.pluckT > 0) { this.pluckT--; this.moving = false; return; }
      if (this.throwT > 0) this.throwT--;
      if (this.whistleT > 0) this.whistleT--;
      this.moving = false;
      if (this.tx == null) return;
      const wp = g.waypoint(this, { x: this.tx, y: this.ty });
      const dx = wp.x - this.x, dy = wp.y - this.y, d = Math.hypot(dx, dy);
      if (d < 4 && wp.x === this.tx && wp.y === this.ty) { this.tx = this.ty = null; return; }
      const sp = Math.min(this.speed, d);
      const nx = this.x + dx / d * sp, ny = this.y + dy / d * sp;
      if (g.walkable(nx, ny)) { this.x = nx; this.y = ny; }
      else if (g.walkable(nx, this.y)) this.x = nx;
      else if (g.walkable(this.x, ny)) this.y = ny;
      else { this.tx = this.ty = null; return; }
      if (Math.abs(dx) > 0.5) this.dir = dx > 0 ? 1 : -1;
      this.anim += 0.22; this.moving = true;
    }
  }

  /* ----------------------------------------------- resident pikmin (住民) */
  const TALK = ['ピクピク〜♪', 'いい島だね!', 'オリマーさん こんにちは!', 'おうち ありがとう!', 'きょうも いい天気〜', 'はっぱ キラキラ♪'];
  class Resident {
    constructor(g, home, color, hat, i) {
      this.g = g; this.home = home; this.color = color; this.hat = hat; this.x = home.x + (i - 1) * 40; this.y = home.y + 30;
      this.tx = this.x; this.ty = this.y; this.wait = 30 + i * 40; this.anim = 0; this.dir = 1; this.i = i; this.say = null; this.sayT = 0;
    }
    update() {
      const g = this.g;
      if (this.sayT > 0) this.sayT--;
      const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
      if (d > 1.5) { this.x += dx / d * 1.3; this.y += dy / d * 1.3; this.anim += 0.22; this.dir = dx > 0 ? 1 : -1; return; }
      if (--this.wait > 0) return;
      const r = g.rand;
      this.wait = 90 + Math.floor(r() * 160);
      for (let k = 0; k < 8; k++) {
        const nx = this.home.x + (r() - 0.5) * 360, ny = this.home.y + 30 + r() * 170;
        if (g.walkable(nx, ny)) { this.tx = nx; this.ty = ny; break; }
      }
      if (r() < 0.35) { this.say = TALK[Math.floor(r() * TALK.length)]; this.sayT = 120; }
    }
  }

  /* --------------------------------------------------------------- game */
  class Game {
    constructor() {
      this.listeners = []; this.frame = 0; this.rand = PM.rng(77001);
      const W = this.world = PM.makeWorld();
      this.ter = W.ter;
      this.base = { x: W.base.x, y: W.base.y };
      this.onion = { x: W.onion.x, y: W.onion.y, z: 900, landed: false, eat: 0, spin: 0 };
      this.ship = { x: W.pad.x, y: W.pad.y, z: 900, door: 0, state: 'away' };
      this.objects = W.objs.map((o) => new Obj(this, o));
      this.buildings = [{ kind: 'base', lot: PM.LOTS.base, x: this.base.x, y: this.base.y, t: 999 }];
      this.items = []; this.pikmin = []; this.followers = []; this.residents = []; this.effects = [];
      this.pikminSerial = 0;
      this.olimar = new Olimar(this, W.pad.x, W.pad.y);
      this.inv = { wood: 0, stone: 0 };
      this.weeds = 0; this.built = { house: 0, bridge: 0, shop: 0, museum: 0, plaza: 0 };
      this.planIndex = 0; this.site = null; this.stars = 1; this.starT = 0;
      this.clock = 8 * 60 + 30; this.day = 1;
      this.mode = 'title'; this.modeT = 0;
      this.hl = null; this.hlQueue = []; this.hlSeen = {};
      this.cam = { x: PM.WW / 2, y: PM.WH / 2 + 60, zoom: 0.44 };
      this.cinematic = false; this.manualZoom = 1;
      this.inp = { pointer: null }; this.finished = false; this.ff = false;
      this.invalidateNav();
    }
    on(fn) { this.listeners.push(fn); }
    emit(type, name, extra) { for (const l of this.listeners) l(type, name, extra); }
    sfx(n) { this.emit('sfx', n); }
    music(n) { if (this.curMusic === n) return; this.curMusic = n; this.emit('music', n); }
    setMode(m) { this.mode = m; this.modeT = 0; this.emit('mode', m); }
    get maxPikmin() { return 30 + 10 * this.built.house; }

    /* ------------------------------------------------------- highlights */
    highlight(key, text, o) {
      o = o || {};
      if (o.once && this.hlSeen[key]) return;
      this.hlSeen[key] = true;
      const h = { key, text, dur: o.dur || 150, x: o.x, y: o.y, zoom: o.zoom || 1, follow: o.follow, t: 0, born: this.frame, keep: o.keep || 90 };
      this.hlQueue.push(h);
      this.emit('highlight', key);
    }
    updateHighlight() {
      if (this.hl && ++this.hl.t >= this.hl.dur) this.hl = null;
      while (!this.hl && this.hlQueue.length) {
        const h = this.hlQueue.shift();
        if (this.frame - h.born <= h.keep) { this.hl = h; this.sfx('caption'); }
      }
    }

    /* ------------------------------------------------------- terrain */
    terAt(x, y) {
      const c = Math.floor(x / T), r = Math.floor(y / T);
      if (r < 0 || r >= PM.ROWS || c < 0 || c >= PM.COLS) return TER.SEA;
      return this.ter[r][c];
    }
    walkable(x, y) { return this.tileWalkable(Math.floor(x / T), Math.floor(y / T)); }
    side(p) { return p.x < PM.riverCol(p.y / T) * T ? 'W' : 'E'; }
    bridgeEnds() {
      const b = this.world.bridge, y = (b.r + 0.5) * T;
      return { W: { x: b.c0 * T + 20, y }, E: { x: (b.c1 + 1) * T - 20, y } };
    }
    /* Grid navigation: a BFS distance map per destination tile (cached until the
     * map changes). Walkers aim at the furthest tile down the gradient that is in
     * straight line of sight, which keeps paths smooth. */
    tileWalkable(c, r) {
      if (r < 0 || r >= PM.ROWS || c < 0 || c >= PM.COLS) return false;
      const t = this.ter[r][c];
      if (t === TER.SEA || t === TER.WATER) return false;
      return !this.blocked[r * PM.COLS + c];
    }
    invalidateNav() {
      const C = PM.COLS;
      this.blocked = new Uint8Array(C * PM.ROWS);
      for (const b of this.buildings) {
        const L = b.lot; if (!L || b.kind === 'plaza' || b.kind === 'bridge') continue;
        for (let r = L.r; r < L.r + L.h; r++) for (let c = L.c; c < L.c + L.w; c++) this.blocked[r * C + c] = 1;
      }
      this.flowCache = new Map();
    }
    flowField(tc, tr) {
      const key = tc + ',' + tr;
      let D = this.flowCache.get(key);
      if (D) return D;
      const C = PM.COLS, R = PM.ROWS;
      D = new Int16Array(C * R).fill(-1);
      const q = new Int32Array(C * R);
      let h = 0, n = 0;
      D[tr * C + tc] = 0; q[n++] = tr * C + tc;
      while (h < n) {
        const i = q[h++], c = i % C, r = (i / C) | 0, d = D[i] + 1;
        if (c > 0 && D[i - 1] < 0 && this.tileWalkable(c - 1, r)) { D[i - 1] = d; q[n++] = i - 1; }
        if (c < C - 1 && D[i + 1] < 0 && this.tileWalkable(c + 1, r)) { D[i + 1] = d; q[n++] = i + 1; }
        if (r > 0 && D[i - C] < 0 && this.tileWalkable(c, r - 1)) { D[i - C] = d; q[n++] = i - C; }
        if (r < R - 1 && D[i + C] < 0 && this.tileWalkable(c, r + 1)) { D[i + C] = d; q[n++] = i + C; }
      }
      if (this.flowCache.size > 60) this.flowCache.clear();
      this.flowCache.set(key, D);
      return D;
    }
    clearLine(x0, y0, x1, y1) {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 14);
      for (let i = 1; i <= n; i++) {
        const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
        if (!this.tileWalkable(Math.floor(x / T), Math.floor(y / T))) return false;
      }
      return true;
    }
    // next point to head for on the way to `to`
    waypoint(from, to) {
      if (this.clearLine(from.x, from.y, to.x, to.y)) return to;
      const C = PM.COLS, tc = Math.floor(to.x / T), tr = Math.floor(to.y / T);
      const D = this.flowField(tc, tr);
      let c = Math.floor(from.x / T), r = Math.floor(from.y / T);
      if (D[r * C + c] < 0) {
        // standing off-grid (e.g. nudged onto a blocked tile): step to the nearest reachable neighbour
        let best = null, bd = 1e9;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const v = D[(r + dr) * C + c + dc];
          if (v >= 0 && v < bd && this.tileWalkable(c + dc, r + dr)) { bd = v; best = [c + dc, r + dr]; }
        }
        return best ? { x: (best[0] + 0.5) * T, y: (best[1] + 0.5) * T } : to;
      }
      let aim = null;
      for (let k = 0; k < 5; k++) {
        const v = D[r * C + c];
        if (v <= 0) break;
        let nc = c, nr = r;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = (r + dr) * C + c + dc;
          if (c + dc >= 0 && c + dc < C && D[j] >= 0 && D[j] < v) { nc = c + dc; nr = r + dr; break; }
        }
        if (nc === c && nr === r) break;
        c = nc; r = nr;
        const p = D[r * C + c] === 0 ? to : { x: (c + 0.5) * T, y: (r + 0.5) * T };
        if (!aim || this.clearLine(from.x, from.y, p.x, p.y)) aim = p; else break;
      }
      return aim || to;
    }

    /* ------------------------------------------------------- actions */
    pluck(p) {
      const o = this.olimar;
      if (p.state !== 'sprout' || o.pluckT > 0) return false;
      if (Math.hypot(o.x - p.x, o.y - p.y) > 70) return false;
      p.state = 'pluck'; p.t = 0; o.pluckT = 14; o.dir = p.x > o.x ? 1 : -1;
      this.sfx('pluck'); this.sfx('hey');
      this.highlight('pluck', 'ピクミンを ひっこぬこう!', { follow: true, dur: 160, once: true, zoom: 1.35 });
      return true;
    }
    canTarget(t) {
      if (!t) return false;
      if (this.side(t) !== this.side(this.olimar) && !this.built.bridge) return false;
      if (t instanceof Item) return t.freeSlots() > 0;
      return t.freeSlots() > 0;
    }
    throwAt(t) {
      const o = this.olimar;
      if (o.throwT > 0 || o.pluckT > 0 || !this.followers.length || !this.canTarget(t)) return false;
      if (Math.hypot(t.x - o.x, t.y - o.y) > 330) return false;
      // nearest follower gets thrown
      let best = null, bd = 1e9;
      for (const p of this.followers) { const d = Math.hypot(p.x - o.x, p.y - o.y); if (d < bd) { bd = d; best = p; } }
      const p = best;
      this.followers.splice(this.followers.indexOf(p), 1);
      let to;
      if (t instanceof Item) { to = { x: t.x + (this.rand() - 0.5) * 30, y: t.y + 8 }; p.item = t; p.job = null; }
      else { to = t.addWorker(p); p.job = t; p.item = null; }
      const d = Math.hypot(to.x - o.x, to.y - o.y);
      p.state = 'thrown'; p.x = o.x + o.dir * 10; p.y = o.y - 2;
      p.flight = { x0: p.x, y0: p.y, x1: to.x, y1: to.y, t: 0, dur: Math.round(14 + d / 13), h: 40 + d * 0.32 };
      o.throwT = 6; o.dir = to.x > o.x ? 1 : -1;
      this.sfx('throw'); if (this.rand() < 0.4) this.sfx('hey');
      this.highlight('throw', 'ピクミンを なげて おしごと!', { follow: true, dur: 140, once: true, zoom: 1.2 });
      return true;
    }
    whistle() {
      const o = this.olimar;
      o.whistleT = 30; this.sfx('whistle');
      for (const p of this.pikmin) {
        if ((p.state === 'work' || p.state === 'idle') && Math.hypot(p.x - o.x, p.y - o.y) < 280) {
          if (p.job) p.job.removeWorker(p);
          p.state = 'follow'; p.job = null; this.followers.push(p);
        }
      }
    }
    placeNext() {
      const step = PM.PLAN[this.planIndex];
      if (!step || this.site) return false;
      const def = PM.BUILD[step.kind];
      if (this.inv.wood < def.cost.wood || this.inv.stone < def.cost.stone) return false;
      this.inv.wood -= def.cost.wood; this.inv.stone -= def.cost.stone;
      const lot = this.lotFor(step);
      const s = new Obj(this, { kind: 'site', build: step.kind, lot, x: (lot.c + lot.w / 2) * T, y: (lot.r + lot.h) * T, roof: lot.roof });
      s.need = def.work; s.slotN = def.slots; s.r = 0;
      this.objects.push(s); this.site = s;
      this.sfx('place');
      const L = { house: 'ピクミンの家を たてよう!', bridge: '川に 橋を かけよう!', shop: 'ルーイの商店を たてよう!', museum: '博物館を たてよう!', plaza: '噴水広場を つくろう!' };
      if (this.planIndex === 0) this.highlight('site0', L[step.kind], { x: s.x, y: s.y - 80, dur: 120, zoom: 0.9 });
      return true;
    }
    lotFor(step) {
      if (step.kind === 'house') return PM.LOTS.house[step.lot];
      if (step.kind === 'bridge') { const b = this.world.bridge; return { c: b.c0, r: b.r, w: b.c1 - b.c0 + 1, h: 1 }; }
      return PM.LOTS[step.kind];
    }
    finishSite(s, workers) {
      const kind = s.build;
      this.objects.splice(this.objects.indexOf(s), 1);
      this.site = null; this.planIndex++;
      this.built[kind]++;
      const b = { kind, lot: s.lot, x: s.x, y: s.y, roof: s.roof, t: 0 };
      this.buildings.push(b);
      if (kind === 'bridge') {
        const B = this.world.bridge;
        for (let c = B.c0; c <= B.c1; c++) if (this.ter[B.r][c] === TER.WATER) this.ter[B.r][c] = TER.BRIDGE;
      }
      this.layPath(b);
      this.invalidateNav();
      for (const p of workers) p.goBack();
      this.sfx('built');
      for (let i = 0; i < 40; i++) this.confetti(s.x, s.y - 90);
      const names = { house: 'ピクミンの家が できた!', bridge: '橋が かかった!', shop: 'ルーイの商店 オープン!', museum: '博物館が できた!', plaza: '噴水広場が かんせい!' };
      this.highlight('built' + this.planIndex, names[kind], { x: s.x, y: s.y - 90, dur: 170, zoom: kind === 'plaza' ? 0.8 : 1, keep: 400 });
      if (kind === 'house') {
        const hats = ['ribbon', 'cap', 'flower'];
        for (let i = 0; i < 3; i++) this.residents.push(new Resident(this, b, COLORS[(this.built.house + i) % 3], hats[i], i));
        if (this.built.house === 1) this.highlight('movein', 'ピクミンたちが ひっこしてきた!', { x: s.x, y: s.y + 20, dur: 140, keep: 400 });
      }
      this.updateStars();
      this.emit('built', kind);
    }
    // stone path from a building's door to the base plaza
    layPath(b) {
      const L = b.lot; if (!L || b.kind === 'bridge') return;
      const ter = this.ter;
      const set = (c, r) => { if (ter[r] && (ter[r][c] === TER.GRASS || ter[r][c] === TER.SAND)) { ter[r][c] = TER.PATH; this.pathDirty = true; } };
      const dc = Math.floor(L.c + L.w / 2), dr = L.r + L.h;
      const tc = PM.LOTS.base.c + 1, tr = PM.LOTS.base.r + 2 + 1;
      if (b.kind === 'plaza') { for (let r = L.r; r < L.r + L.h; r++) for (let c = L.c; c < L.c + L.w; c++) set(c, r); return; }
      if (this.side({ x: dc * T, y: dr * T }) !== this.side({ x: tc * T, y: tr * T })) {
        const B = this.world.bridge, e = B.c1 + 1;
        for (let r = Math.min(dr, B.r); r <= Math.max(dr, B.r); r++) set(dc, r);
        for (let c = Math.min(dc, e); c <= Math.max(dc, e); c++) set(c, B.r);
        return;
      }
      for (let r = Math.min(dr, tr); r <= Math.max(dr, tr); r++) set(dc, r);
      for (let c = Math.min(dc, tc); c <= Math.max(dc, tc); c++) set(c, tr);
    }
    updateStars() {
      let s = 1;
      if (this.built.house >= 2) s++;
      if (this.built.bridge && this.built.shop) s++;
      if (this.built.museum) s++;
      if (this.built.plaza && this.built.house >= 4) s++;
      if (s > this.stars) {
        this.stars = s; this.sfx('star');
        this.starT = 90;
      }
      if (s >= 5 && this.mode === 'play') this.startFinale();
    }
    onionEat(item, seeds) {
      const g = this, on = this.onion;
      on.eat = 30; this.sfx('slurp');
      const room = this.maxPikmin - this.pikmin.length;
      const n = Math.max(0, Math.min(seeds, room));
      for (let i = 0; i < n; i++) {
        const a = this.rand() * Math.PI * 2, r = 110 + this.rand() * 80;
        const p = new Pikmin(g, COLORS[this.pikminSerial % 3], on.x, on.y - 150, 'seed');
        p.flight = { x0: on.x, y0: on.y - 150, x1: on.x + Math.cos(a) * r, y1: on.y + 40 + Math.sin(a) * r * 0.55, t: -i * 6, dur: 40, h: 90 };
        this.pikmin.push(p);
      }
      if (n) { this.sfx('seed'); this.highlight('onion', 'オニヨンで ピクミンが ふえる!', { x: on.x, y: on.y - 60, dur: 140, once: true, zoom: 1.15 }); }
    }

    /* --------------------------------------------------------- flow */
    start() { if (this.mode === 'title') { this.setMode('arrive'); this.sfx('start'); } }
    step() {
      this.frame++; this.modeT++;
      switch (this.mode) {
        case 'title': if (this.modeT > 150 && this.autoStart) this.start(); break;
        case 'arrive': this.arriveUpdate(); break;
        case 'play': this.playUpdate(); break;
        case 'finale': this.playUpdate(); this.finaleUpdate(); break;
        case 'end':
          if (this.modeT >= 260) this.finished = true;
          if (this.modeT % 22 === 0) { const pz = (PM.LOTS.plaza.c + 2.5) * T; this.firework(pz + ((this.modeT * 97) % 700) - 350, (PM.LOTS.plaza.r - 3) * T - ((this.modeT * 53) % 260)); }
          this.playUpdate(); break;
      }
      this.updateHighlight();
      this.updateEffects();
      this.updateCamera();
    }
    arriveUpdate() {
      const s = this.ship, on = this.onion, o = this.olimar, t = this.modeT;
      if (t === 1) { s.state = 'landing'; this.sfx('engine'); this.highlight('arrive', 'オリマー、島に とうちゃく!', { x: s.x, y: s.y - 120, dur: 190, zoom: 0.9 }); }
      if (s.state === 'landing') {
        s.z = Math.max(0, s.z - Math.max(2.2, s.z * 0.045));
        if (s.z === 0) { s.state = 'landed'; this.sfx('land'); this.dust(s.x - 50, s.y, 6); this.dust(s.x + 50, s.y, 6); }
      }
      if (s.state === 'landed' && s.door < 1) s.door = Math.min(1, s.door + 0.04);
      if (t === 150) { o.visible = true; o.x = s.x + 20; o.y = s.y + 30; o.moveTo(s.x + 30, s.y + 110); this.sfx('hop'); }
      if (t >= 150) o.update();
      if (t === 190) { this.highlight('onionland', 'オニヨンも やってきた!', { x: on.x, y: on.y - 60, dur: 170, zoom: 0.9 }); }
      if (t >= 200 && !on.landed) {
        on.z = Math.max(0, on.z - Math.max(2, on.z * 0.05));
        on.spin += 0.3;
        if (on.z === 0) {
          on.landed = true; this.sfx('land'); this.dust(on.x, on.y, 6);
          for (let i = 0; i < 6; i++) {
            const a = i / 6 * Math.PI * 2 + 0.3, r = 120;
            const p = new Pikmin(this, COLORS[i % 3], on.x, on.y - 150, 'seed');
            p.flight = { x0: on.x, y0: on.y - 150, x1: on.x + Math.cos(a) * r, y1: on.y + 40 + Math.sin(a) * r * 0.55, t: -i * 7, dur: 40, h: 90 };
            this.pikmin.push(p);
          }
          this.sfx('seed');
        }
      }
      for (const p of this.pikmin) p.update();
      if (on.landed && this.modeT > 300 && this.pikmin.every((p) => p.state === 'sprout')) { this.setMode('play'); this.music('island'); }
      this.tickClock();
    }
    playUpdate() {
      this.olimar.update();
      for (const o of this.objects) o.update();
      this.objects = this.objects.filter((o) => o.state !== 'gone');
      for (const p of this.pikmin) p.update();
      for (const it of this.items) it.update();
      this.items = this.items.filter((it) => !it.done);
      for (const r of this.residents) r.update();
      if (this.onion.eat > 0) this.onion.eat--;
      for (const b of this.buildings) b.t++;
      this.tickClock();
    }
    tickClock() {
      const hr = this.clock / 60;
      const show = this.mode === 'finale' || this.mode === 'end';
      this.clock += show ? (hr < 19.5 && hr > 5 ? 2.5 : 0.05) : (hr >= 20 || hr < 5) ? 0.45 : 0.125;
      if (this.clock >= 24 * 60) { this.clock -= 24 * 60; this.day++; }
      if (this.mode === 'play') {
        const h = this.clock / 60;
        this.music(h >= 18 || h < 5 ? 'night' : 'island');
      }
    }
    startFinale() {
      this.setMode('finale');
      this.music(null);
      this.highlight('finale', '島評価 ★★★★★ たっせい!', { x: (PM.LOTS.plaza.c + 2.5) * T, y: (PM.LOTS.plaza.r + 2) * T, dur: 200, zoom: 0.62, keep: 400 });
    }
    finaleUpdate() {
      const t = this.modeT, pz = { x: (PM.LOTS.plaza.c + 2.5) * T, y: (PM.LOTS.plaza.r + 4.6) * T };
      if (t === 1) {
        this.olimar.moveTo(pz.x - 80, pz.y + 30);
        for (const p of this.pikmin) {
          if (p.state === 'sprout' || p.state === 'seed') continue;
          if (p.job) p.job.removeWorker(p);
          if (p.item) { p.item.carriers = p.item.carriers.filter((q) => q !== p); }
          if (p.state !== 'follow') p.goBack();
        }
      }
      if (t === 200) { this.music('festival'); this.highlight('fireworks', '夜は みんなで 花火大会!', { x: pz.x, y: pz.y - 300, dur: 380, zoom: 0.58, keep: 400 }); }
      if (t > 200 && t % 17 === 0 && t < 580) this.firework(pz.x + ((t * 97) % 760) - 380, pz.y - 380 - ((t * 53) % 360));
      if (t === 580) { this.setMode('end'); this.highlight('end', 'あつまれ ピクミンの森 かんせい!', { x: pz.x, y: pz.y - 120, dur: 300, zoom: 0.46, keep: 400 }); }
    }

    /* --------------------------------------------------------- camera */
    updateCamera() {
      const c = this.cam, o = this.olimar;
      let tx = o.x, ty = o.y - 40, tz = this.manualZoom;
      if (this.mode === 'title') { tx = PM.WW / 2; ty = PM.WH / 2 + 80; tz = 0.44; }
      else if (this.cinematic) {
        const h = this.hl;
        if (h && h.x != null && !h.follow) { tx = h.x; ty = h.y; tz = h.zoom; }
        else if (h) { tz = h.zoom || 1; }
        else tz = this.mode === 'play' ? 0.72 : 0.5;
        if (this.mode === 'arrive' && !(h && h.x != null)) { tx = this.ship.x; ty = this.ship.y - 140; tz = 0.9; }
      }
      const k = this.mode === 'title' ? 1 : 0.07;
      c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.zoom += (tz - c.zoom) * (this.mode === 'title' ? 1 : 0.05);
      const hw = VIEW.w / 2 / c.zoom, hh = VIEW.h / 2 / c.zoom;
      c.x = clamp(c.x, hw - 200, PM.WW - hw + 200); c.y = clamp(c.y, hh - 240, PM.WH - hh + 240);
    }

    /* --------------------------------------------------------- effects */
    dust(x, y, n) { for (let i = 0; i < n; i++) this.effects.push({ type: 'dust', x: x + (this.rand() - 0.5) * 50, y: y - 4, vx: (this.rand() - 0.5) * 2, vy: -0.5 - this.rand(), t: 0, life: 26, r: 10 + this.rand() * 10 }); }
    leaf(x, y) { this.effects.push({ type: 'leaf', x, y, vx: (this.rand() - 0.5) * 4, vy: -3 - this.rand() * 2, g: 0.18, t: 0, life: 36, rot: this.rand() * 6 }); }
    confetti(x, y) { const a = this.rand() * Math.PI * 2, s = 3 + this.rand() * 6; this.effects.push({ type: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 5, g: 0.22, t: 0, life: 70, hue: Math.floor(this.rand() * 360), rot: this.rand() * 6 }); }
    popText(text, x, y) { this.effects.push({ type: 'pop', text, x, y, t: 0, life: 50 }); }
    firework(x, y) { this.effects.push({ type: 'firework', x, y, t: 0, life: 80, hue: (x * 3 + y) % 360 }); this.sfx('firework'); }
    updateEffects() {
      for (const e of this.effects) {
        e.t++;
        if (e.vx !== undefined) { e.x += e.vx; e.y += e.vy; if (e.g) e.vy += e.g; }
      }
      this.effects = this.effects.filter((e) => e.t < e.life);
    }

    /* --------------------------------------------------------- queries */
    goalInfo() {
      const step = PM.PLAN[this.planIndex];
      if (this.mode === 'finale' || this.mode === 'end' || !step) return { title: '島評価 ★5 たっせい!', lines: [] };
      const def = PM.BUILD[step.kind];
      if (this.site) return { title: def.name + 'を けんせつちゅう', lines: [{ label: 'こうじ', have: Math.floor(this.site.progress / this.site.need * 100), need: 100, unit: '%' }] };
      const lines = [];
      if (def.cost.wood) lines.push({ label: '木材', have: this.inv.wood, need: def.cost.wood });
      if (def.cost.stone) lines.push({ label: '石', have: this.inv.stone, need: def.cost.stone });
      return { title: def.name + 'を たてよう', lines };
    }
    targetAt(x, y, r) {
      let best = null, bd = r;
      for (const it of this.items) { const d = Math.hypot(it.x - x, it.y - y); if (d < bd && it.freeSlots() > 0) { bd = d; best = it; } }
      for (const o of this.objects) {
        if (!o.freeSlots || o.freeSlots() <= 0) continue;
        const d = o.kind === 'site' ? (x > o.lot.c * T && x < (o.lot.c + o.lot.w) * T && y > o.lot.r * T - 40 && y < (o.lot.r + o.lot.h) * T + 30 ? 0 : 1e9) : Math.hypot(o.x - x, o.y - 20 - y);
        if (d < bd) { bd = d; best = o; }
      }
      return best;
    }
    render(ctx) { PM.Art.render(ctx, this); }
  }

  PM.Game = Game; PM.Pikmin = Pikmin; PM.Item = Item; PM.Obj = Obj;
})(typeof window !== 'undefined' ? window : globalThis);
