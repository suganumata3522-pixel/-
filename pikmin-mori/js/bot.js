/* Autoplay: plays オリマー — plucks sprouts, throws ピクミン at whatever the
 * next building needs (wood, stone, more ピクミン), and starts construction. */
(function (G) {
  'use strict';
  const PM = G.PM = G.PM || {};
  const T = PM.T;

  class Bot {
    constructor(g) { this.g = g; this.target = null; this.stuck = 0; this.lastX = 0; this.lastY = 0; }

    reachable(p) { const g = this.g; return g.built.bridge || g.side(p) === g.side(g.olimar); }

    needs() {
      const g = this.g;
      let wood = 0, stone = 0;
      for (let i = g.planIndex; i < Math.min(PM.PLAN.length, g.planIndex + 2); i++) {
        if (i === g.planIndex && g.site) continue;
        const c = PM.BUILD[PM.PLAN[i].kind].cost; wood += c.wood; stone += c.stone;
      }
      let pw = 0, ps = 0;
      for (const it of g.items) { if (it.kind === 'log') pw++; if (it.kind === 'stone') ps++; }
      for (const o of g.objects) {
        if (o.state !== 'ready' || !o.workers.length) continue;
        if (o.kind === 'tree') pw += 3; if (o.kind === 'rock') ps += 2;
      }
      const step = PM.PLAN[g.planIndex];
      return {
        wood: wood - g.inv.wood - pw, stone: stone - g.inv.stone - ps,
        pikmin: (step ? step.pikmin : 40) - g.pikmin.length,
      };
    }

    nearest(list) {
      const o = this.g.olimar;
      let best = null, bd = 1e9;
      for (const t of list) {
        if (!this.reachable(t)) continue;
        // keep filling a job that already has workers before starting a new one
        const d = Math.hypot(t.x - o.x, t.y - o.y) - (t.workers && t.workers.length ? 260 : 0);
        if (d < bd) { bd = d; best = t; }
      }
      return best;
    }

    pickTarget() {
      const g = this.g;
      if (g.site && g.site.freeSlots() > 0) return g.site;
      const waiting = g.items.filter((it) => !it.done && it.carriers.length < it.weight);
      if (waiting.length) { const w = this.nearest(waiting); if (w) return w; }
      const n = this.needs(), ready = (k) => g.objects.filter((o) => o.kind === k && o.freeSlots() > 0);
      const order = [];
      if (n.pikmin > 0) order.push('fruit', 'posy');
      if (n.wood > 0) order.push('tree');
      if (n.stone > 0) order.push('rock');
      if (n.wood > 0 && n.stone > 0 && g.inv.wood > g.inv.stone + 4) order.splice(order.indexOf('rock'), 1), order.splice(order.indexOf('tree'), 0, 'rock');
      for (const k of order) { const t = this.nearest(ready(k)); if (t) return t; }
      const weed = this.nearest(ready('weed'));
      if (weed && Math.hypot(weed.x - g.base.x, weed.y - g.base.y) < 900) return weed;
      return null;
    }

    // a reachable spot ~150px from the target, picked once per target by path length
    standPoint(t) {
      if (this.stand && this.stand.t === t) return this.stand.p;
      const g = this.g, o = g.olimar, C = PM.COLS;
      const D = g.flowField(Math.floor(o.x / T), Math.floor(o.y / T));
      let best = null, bd = 1e9;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2;
        for (const r of [150, 110, 190]) {
          const p = { x: t.x + Math.cos(a) * r, y: t.y + 20 + Math.sin(a) * r * 0.8 };
          const c = Math.floor(p.x / T), rr = Math.floor(p.y / T);
          if (!g.tileWalkable(c, rr)) continue;
          const v = D[rr * C + c];
          if (v >= 0 && v < bd) { bd = v; best = p; }
        }
      }
      best = best || { x: t.x, y: t.y + 60 };
      this.stand = { t, p: best };
      return best;
    }

    step() {
      const g = this.g, o = g.olimar;
      if (g.mode === 'title') { g.autoStart = true; return; }
      if (g.mode !== 'play' || o.pluckT > 0) return;
      g.placeNext();

      // unstick: if オリマー has not moved while trying to, try a different route
      if (o.tx != null && Math.hypot(o.x - this.lastX, o.y - this.lastY) < 0.5) this.stuck++; else this.stuck = 0;
      this.lastX = o.x; this.lastY = o.y;
      if (this.stuck > 30) { o.moveTo(g.base.x, g.base.y + 120); this.stuck = 0; return; }

      const sprouts = g.pikmin.filter((p) => p.state === 'sprout' && this.reachable(p));
      if (sprouts.length) {
        const s = this.nearest(sprouts);
        if (Math.hypot(s.x - o.x, s.y - o.y) < 60) { o.moveTo(o.x, o.y); o.tx = null; g.pluck(s); }
        else o.moveTo(s.x + (o.x < s.x ? -34 : 34), s.y + 4);
        return;
      }
      if (!g.followers.length) {
        if (o.tx == null && Math.hypot(o.x - g.base.x, o.y - g.base.y) > 700) o.moveTo(g.base.x + 60, g.base.y + 140);
        return;
      }
      const t = this.pickTarget();
      if (!t) { if (o.tx == null) o.moveTo(g.base.x + 60, g.base.y + 140); return; }
      const d = Math.hypot(t.x - o.x, t.y - o.y);
      if (d > 260 || (g.side(t) !== g.side(o))) { const p = this.standPoint(t); o.moveTo(p.x, p.y); return; }
      o.tx = null;
      if (o.throwT === 0) g.throwAt(t);
    }
  }
  PM.Bot = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
