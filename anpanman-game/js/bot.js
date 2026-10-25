/* Autopilot. Each frame it simulates short futures with the real tile collision
 * code (walking vs. jumping with several hold lengths) and picks a safe one. */
(function (G) {
  'use strict';
  const AP = G.AP = G.AP || {};
  const HOLDS = [2, 5, 8, 12, 16, 22, 30, 40];

  class Bot {
    constructor(g) {
      this.g = g; this.jumpHold = 0; this.pending = 0; this.prevA = false; this.prevB = false;
      this.lastX = 0; this.stuckT = 0; this.seen = new Map(); this.count = 0; this.bumped = new Set();
      this.airDir = 1;
    }

    think() {
      const g = this.g, inp = AP.blankInput();
      if (g.mode === 'title') {
        if (g.modeT >= 165 && g.modeT < 175) inp.start = true;
        return this.finish(inp);
      }
      if (g.mode !== 'play') { this.jumpHold = 0; this.pending = 0; return this.finish(inp); }
      const p = g.player;
      if (g.boss) return this.finish(this.bossThink(inp));

      let dir = 1;
      inp.right = true;
      // stay at walking pace (looks better on video) unless star mode
      if (g.star === 0 && p.onGround && p.runT >= AP.PH.RUN_DELAY - 1) inp.right = false;

      this.platform(inp, dir);
      this.unstick(inp);
      return this.finish(inp);
    }

    finish(inp) {
      // a jump needs a fresh press: release for a frame if A was held
      if (this.pending) {
        if (this.prevA) { inp.a = false; }
        else { inp.a = true; this.jumpHold = this.pending - 1; this.pending = 0; }
      } else if (this.jumpHold > 0) { inp.a = true; this.jumpHold--; }
      if (inp.b && this.prevB) inp.b = false;
      this.prevA = inp.a; this.prevB = inp.b;
      return inp;
    }

    jump(hold) { if (!this.pending && this.jumpHold === 0) this.pending = hold; }

    punchMode(e) {
      if (!this.seen.has(e)) {
        this.count++;
        this.seen.set(e, e.kind === 'green' && (this.count % 3 !== 0));
      }
      return this.seen.get(e);
    }

    /* ---------------------------------------------------------- core */
    platform(inp, dir) {
      const g = this.g, p = g.player;
      if (dir) this.airDir = dir;
      if (!p.onGround) {
        if (dir === 0) { inp.left = inp.right = false; }
        // steer in the air so we land on enemies' heads, never into their sides
        if (g.star === 0) {
          const cur = inp.right ? 1 : inp.left ? -1 : 0;
          const bad = (r) => r.fail || (r.trouble && r.trouble.kind !== 'wall');
          const first = this.sim(cur, 0, 90, this.jumpHold);
          if (bad(first)) {
            for (const d of [0, -cur || -1, cur || 1]) {
              if (d === cur) continue;
              if (!bad(this.sim(d, 0, 90, this.jumpHold))) { inp.right = d > 0; inp.left = d < 0; break; }
            }
          }
        }
        return;
      }
      if (this.pending || this.jumpHold > 0) return;

      // punching
      if (g.star === 0) {
        for (const e of g.enemies) {
          if (!e.alive() || e.state !== 'walk' || !this.punchMode(e)) continue;
          const same = e.y + e.h > p.y + 30 && e.y < p.bottom;
          if (!same) continue;
          const side = e.cx < p.cx ? -1 : 1;
          const dx = side > 0 ? e.x - (p.x + p.w) : p.x - (e.x + e.w);
          if (dx > -6 && dx < 56 && p.punchCD === 0) {
            inp.b = true;
            if (side !== p.dir) { inp.left = side < 0; inp.right = side > 0; }
          }
        }
      }

      const walk = this.sim(dir, 0, 46);
      const tr = walk.trouble;
      let need = false, prefer = null;
      if (tr) {
        if (tr.kind === 'pit' || tr.kind === 'lava') need = tr.t <= 2;
        else if (tr.kind === 'wall') need = tr.t <= 18;
        else if (tr.kind === 'enemy') need = tr.t <= 34;
      }
      if (need) {
        let best = null, bestScore = -1e9;
        for (const h of HOLDS) {
          const r = this.sim(dir, h, 110);
          let s;
          if (r.stomp) s = 10000 - h * 10;
          else if (r.landed) {
            const prog = (r.x - p.x) * (dir || 1);
            if (tr.kind === 'wall' && !(r.y < p.y - 10 || (r.x - tr.x) * (dir || 1) > 8)) continue;
            if ((tr.kind === 'pit' || tr.kind === 'lava') && (r.x - tr.x) * (dir || 1) < 30) continue;
            s = Math.min(prog, 420) - h * 2;
          } else continue;
          if (s > bestScore) { bestScore = s; best = h; prefer = r; }
        }
        if (tr.kind === 'enemy' && (best == null || !prefer.stomp) && tr.t <= 14) {
          // no clean stomp yet: hold position (or back off) and try again next frame
          for (const d of [0, -(dir || 1)]) {
            const r = this.sim(d, 0, 24);
            if (!r.trouble || r.trouble.kind === 'wall') { inp.right = d > 0; inp.left = d < 0; return; }
          }
        }
        if (best != null) {
          if (tr.kind === 'enemy' && !prefer.stomp && tr.t > 6) return; // wait for a stomp chance
          if (tr.kind === 'wall' && tr.t > 4 && !prefer.landed) return;
          this.jump(best);
          return;
        }
        if (tr.t <= 2) { this.jump(40); return; }
        return;
      }

      // opportunistic: bump ? / M blocks overhead
      for (const h of [10, 14]) {
        const r = this.sim(dir, h, 90);
        if (r.head && (r.landed || r.stomp)) {
          const key = r.head.c + ',' + r.head.r;
          const ch = g.tileAt(r.head.c, r.head.r);
          if ((ch === '?' || ch === 'M' || ch === 'N') && !this.bumped.has(key)) { this.bumped.add(key); this.jump(h); return; }
        }
      }
    }

    unstick(inp) {
      const g = this.g, p = g.player;
      if (Math.abs(p.x - this.lastX) < 1.5 && (inp.right || inp.left)) this.stuckT++; else this.stuckT = 0;
      this.lastX = p.x;
      if (this.stuckT > 40 && p.onGround) { this.jump(40); this.stuckT = 0; }
    }

    /* Simulate the player for `frames` steps holding direction `dir`,
     * jumping on frame 0 with A held for `hold` frames (0 = no jump). */
    sim(dir, hold, frames, airHold) {
      const g = this.g, p = g.player, PH = AP.PH, T = AP.T;
      const s = { x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, isPlayer: true, onGround: p.onGround };
      const max = (g.star > 0 || p.runT > PH.RUN_DELAY) ? PH.RUN : PH.WALK;
      const star = g.star > frames;
      const es = [];
      if (!star) for (const e of g.enemies) {
        if (!e.alive()) continue;
        if (e.state === 'walk' && this.punchMode(e) && p.punchCD === 0) continue;
        es.push({ x: e.x, y: e.y, w: e.w, h: e.h, vx: e.state === 'shell' ? 0 : e.vx, vy: e.vy, winged: e.kind === 'winged' && e.state === 'walk', shell: e.state === 'shell', gy: this.groundBelow(e) });
      }
      const bombs = g.boss ? g.boss.bombs : [];
      let jumping = !!(airHold > 0 && p.jumping), airborne = !p.onGround, leftGround = p.onGround ? -1 : 0, head = null, edgeX = p.x;
      const holdFor = hold > 0 ? hold : (airHold || 0);
      for (let t = 0; t < frames; t++) {
        if (dir !== 0) {
          if (s.vx * dir < 0) s.vx += dir * (s.onGround ? PH.SKID : PH.ACC_AIR);
          else if (Math.abs(s.vx) < max) { s.vx += dir * (s.onGround ? PH.ACC : PH.ACC_AIR); if (Math.abs(s.vx) > max) s.vx = dir * max; }
        } else if (s.onGround) { const sg = Math.sign(s.vx); s.vx -= sg * PH.FRIC; if (Math.sign(s.vx) !== sg) s.vx = 0; }
        if (t === 0 && hold > 0) { s.vy = -(PH.JUMP + Math.abs(s.vx) * PH.JUMP_SPEED_BONUS); jumping = true; s.onGround = false; airborne = true; }
        if (t >= holdFor) jumping = false;
        s.vy += (s.vy < 0 && jumping) ? PH.G_HOLD : PH.G;
        if (s.vy > PH.MAXFALL) s.vy = PH.MAXFALL;
        const prevBottom = s.y + s.h;
        const res = g.move(s);
        if (res.head && !head) head = res.head;
        if (res.hitWall) {
          s.vx = 0;
          if (hold === 0) {
            if (leftGround >= 0 && s.y + s.h > p.y + p.h + 20) return { trouble: { kind: 'pit', t: leftGround, x: edgeX }, x: s.x };
            return { trouble: { kind: 'wall', t, x: s.x }, x: s.x };
          }
        }
        if (s.x < g.camX) { s.x = g.camX; if (s.vx < 0) s.vx = 0; }
        if (!s.onGround && leftGround < 0) { leftGround = t; edgeX = s.x; }
        if (s.onGround && leftGround >= 0 && hold === 0) leftGround = -1;
        // enemies
        for (const e of es) {
          e.x += e.vx;
          if (e.winged) {
            e.vy = Math.min(e.vy + 0.9, 15); e.y += e.vy;
            if (e.y + e.h >= e.gy) { e.y = e.gy - e.h; e.vy = -13; }
          }
          const mc = Math.floor((e.vx > 0 ? e.x + e.w : e.x) / T), mr = Math.floor((e.y + e.h / 2) / T);
          if (e.vx !== 0 && g.solidAt(mc, mr)) e.vx = -e.vx;
          if (AP.overlap(s, e)) {
            if (e.shell) continue;
            if (s.vy > 0 && prevBottom <= e.y + 16) return { stomp: true, t, x: s.x, head };
            return hold === 0 ? { trouble: { kind: 'enemy', t }, x: s.x } : { fail: 'enemy', t };
          }
        }
        for (const b of bombs) {
          const by = b.state === 'fall' ? b.y + b.vy * t : b.y;
          if (b.state !== 'fuse' && AP.overlap(s, { x: b.x - 24, y: by - 24, w: 48, h: 48 })) return hold === 0 ? { trouble: { kind: 'enemy', t }, x: s.x } : { fail: 'bomb', t };
        }
        if (s.y > AP.ROWS * T) return hold === 0 ? { trouble: { kind: 'pit', t: Math.max(0, leftGround), x: edgeX }, x: s.x } : { fail: 'pit', t };
        if (s.y + s.h > AP.GT * T + 20) {
          const c0 = Math.floor(s.x / T), c1 = Math.floor((s.x + s.w - 1) / T);
          for (let c = c0; c <= c1; c++) if (g.tileAt(c, AP.GT) === '~') return hold === 0 ? { trouble: { kind: 'lava', t: Math.max(0, leftGround), x: edgeX }, x: s.x } : { fail: 'lava', t };
        }
        if (hold > 0 && res.landed && t > 1) return { landed: true, t, x: s.x, y: s.y, head };
      }
      return { timeout: true, x: s.x, head, landed: hold === 0 };
    }

    groundBelow(e) {
      const g = this.g, T = AP.T;
      const c = Math.floor((e.x + e.w / 2) / T);
      for (let r = Math.floor((e.y + e.h - 1) / T) + 1; r < AP.ROWS; r++) if (g.solidAt(c, r)) return r * T;
      return AP.ROWS * T + 400;
    }

    /* ---------------------------------------------------------- boss */
    bossThink(inp) {
      const g = this.g, p = g.player, b = g.boss;
      const mid = (b.ax0 + b.ax1) / 2;
      if (b.dead || b.state === 'defeat') return inp;
      let target = p.cx, attack = false;
      const lo = b.ax0 + 70, hi = b.ax1 - 70;
      const awayFrom = (x, dist) => {
        const away = p.cx >= x ? 1 : -1;
        let t = x + away * dist;
        if (t < lo || t > hi) t = x - away * dist;
        return t;
      };
      switch (b.state) {
        case 'enter': case 'hover': case 'rise': case 'hurt':
          target = Math.max(b.ax0 + 190, Math.min(b.ax1 - 190, awayFrom(b.x, 320)));
          break;
        case 'approach':
          target = p.cx;
          break;
        case 'smash': {
          const gl = b.glove;
          if (gl && gl.state !== 'back' && Math.abs(p.cx - gl.tx) < 170) target = awayFrom(gl.tx, 300);
          break;
        }
        case 'land':
          target = b.x + (p.cx < b.x ? -250 : 250);
          break;
        case 'tired':
          attack = true;
          break;
      }
      const zones = [];
      for (const bm of b.bombs) {
        if (bm.state === 'boom' || (bm.state === 'fuse' && !bm.spawn)) zones.push([bm.x - 112, bm.x + 112]);
        else if (bm.state === 'fall') zones.push([bm.x - 62, bm.x + 62]);
      }
      const gl = b.glove;
      if (gl && gl.state !== 'back') zones.push([gl.tx - 115, gl.tx + 115]);
      const inside = (x) => zones.some((z) => x > z[0] && x < z[1]);
      if (inside(p.cx)) {
        let best = null;
        for (const z of zones) for (const e of [z[0] - 12, z[1] + 12]) {
          if (e < lo || e > hi || inside(e)) continue;
          if (best === null || Math.abs(e - p.cx) < Math.abs(best - p.cx)) best = e;
        }
        if (best !== null) { target = best; attack = false; }
      } else {
        for (const z of zones) {
          if (target > p.cx && z[0] >= p.cx && target > z[0]) { target = z[0] - 12; attack = false; }
          if (target < p.cx && z[1] <= p.cx && target < z[1]) { target = z[1] + 12; attack = false; }
        }
      }
      target = Math.max(lo, Math.min(hi, target));
      this.dbg = { target: target - b.ax0, zones: zones.map((z) => [z[0] - b.ax0, z[1] - b.ax0]), attack };

      if (attack) {
        const stompMode = (b.maxHp - b.hp) % 2 === 0;
        const dx = b.x - p.cx;
        if (stompMode) {
          if (!p.onGround) { inp.right = dx > 6; inp.left = dx < -6; return inp; }
          if (Math.abs(dx) < 120) { this.jump(40); inp.right = dx > 6; inp.left = dx < -6; return inp; }
          inp.right = dx > 0; inp.left = dx < 0;
          this.platform(inp, Math.sign(dx));
          return inp;
        }
        const edge = dx > 0 ? (b.x - 150) - (p.x + p.w) : p.x - (b.x + 150);
        if (edge > 30) { inp.right = dx > 0; inp.left = dx < 0; }
        else { inp.right = dx > 0 && (edge > 0 || p.dir < 0); inp.left = dx < 0 && (edge > 0 || p.dir > 0); }
        if (edge < 60 && p.punchCD === 0) inp.b = true;
        if (p.onGround && !inp.b) this.platform(inp, dx > 0 ? 1 : -1);
        return inp;
      }

      const d = target - p.cx;
      const dir = Math.abs(d) > 18 ? Math.sign(d) : 0;
      inp.right = dir > 0; inp.left = dir < 0;
      if (!p.onGround) { inp.right = this.airDir > 0 && dir >= 0; inp.left = this.airDir < 0 && dir <= 0; }
      this.platform(inp, dir);
      return inp;
    }
  }

  AP.Bot = Bot;
})(typeof window !== 'undefined' ? window : globalThis);
