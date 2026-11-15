// Finds an input sequence that clears a stage without taking a single hit, by
// beam search over short input segments using the real game code (no shortcuts:
// every candidate is stepped through Game.step). Writes js/tas-ex.js for TasBot.
// Usage: node tools/tas.js [stage=4] [--width 400] [--out js/tas-ex.js]
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const stage = +(args[0] && !args[0].startsWith('--') ? args[0] : 4);
const WIDTH = +opt('--width', 400), PER_CELL = +opt('--per-cell', 8), CELL = 40, SEG = +opt('--seg', 3);
const out = path.resolve(root, opt('--out', 'js/tas-ex.js'));

const ctx = { console, Math, Map, Set, Object, Array, String, Number, JSON };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['levels.js', 'game.js', 'bot.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const AP = ctx.AP;

// deep copy of the game; terrain and hazard definitions never change, so they are shared
function cloneGame(g) {
  const memo = new Map([[g.tiles, g.tiles], [g.level, g.level], [g.hazards, g.hazards]]);
  const eff = g.effects, lis = g.listeners;
  g.effects = []; g.listeners = [];
  const c = deep(g, memo);
  g.effects = eff; g.listeners = lis;
  return c;
}
function deep(v, memo) {
  if (v === null || typeof v !== 'object') return v;
  const m = memo.get(v);
  if (m !== undefined) return m;
  if (Array.isArray(v)) { const a = new Array(v.length); memo.set(v, a); for (let i = 0; i < v.length; i++) a[i] = deep(v[i], memo); return a; }
  const o = Object.create(Object.getPrototypeOf(v)); memo.set(v, o);
  for (const k of Object.keys(v)) o[k] = deep(v[k], memo);
  return o;
}

// per-segment inputs: h = -1/0/1, a = jump held, b = punch
const ACTIONS = [];
for (const h of [1, 0, -1]) for (const a of [0, 1]) ACTIONS.push({ h, a, b: 0 });
ACTIONS.push({ h: 1, a: 0, b: 1 }, { h: -1, a: 0, b: 1 });
const code = (A) => (A.h < 0 ? 1 : 0) | (A.h > 0 ? 2 : 0) | (A.a ? 4 : 0) | (A.b ? 8 : 0);
const toInput = (A) => Object.assign(AP.blankInput(), { left: A.h < 0, right: A.h > 0, a: !!A.a, b: !!A.b });
// small penalties keep the run looking like a person's: fewer direction changes, presses and backsteps
function stepCost(prev, A) {
  let c = 0;
  if (!prev || prev.h !== A.h) c += 1;
  if (A.a && !(prev && prev.a)) c += 0.5;
  if (A.b) c += 2;
  if (A.h < 0) c += 0.5;
  return c;
}
const failed = (g) => g.mode === 'dying' || g.mode === 'gameover' || g.player.dead || !g.player.genki;

const g0 = new AP.Game();
g0.startAt(stage - 1);
while (g0.mode !== 'play') g0.step(AP.blankInput());
console.log(`stage ${g0.level.world} ${g0.level.name}: ${g0.cols} cols, width ${WIDTH}`);

let beam = [{ g: g0, parent: null, A: null, cost: 0 }];
let best = null, depth = 0, maxX = 0;
const t0 = Date.now();
while (beam.length && !best && depth < 3000) {
  depth++;
  const kids = [];
  for (const n of beam) {
    for (const A of ACTIONS) {
      const c = cloneGame(n.g), inp = toInput(A);
      let ok = true, done = false;
      for (let k = 0; k < SEG; k++) {
        c.step(inp);
        if (failed(c)) { ok = false; break; }
        if (c.mode !== 'play') { done = true; break; }
      }
      if (!ok) continue;
      const node = { g: c, parent: n, A, cost: n.cost + stepCost(n.A, A) };
      if (done && c.mode === 'flag') { best = node; break; }
      if (done) continue;
      kids.push(node);
    }
    if (best) break;
  }
  if (best) break;
  // keep the best node per (rounded) state, then spread the beam over the course
  const byKey = new Map();
  for (const n of kids) {
    const p = n.g.player;
    n.score = p.x - 4 * n.cost;
    const alive = n.g.enemies.reduce((s, e) => s + (e.alive() ? 1 : 0), 0);
    const key = [Math.round(p.x / 4), Math.round(p.y / 4), Math.round(p.vx * 2), Math.round(p.vy), p.onGround ? 1 : 0,
      p.runT > 36 ? 1 : 0, p.jumping ? 1 : 0, p.punchCD > 0 ? 1 : 0, alive].join(',');
    const o = byKey.get(key);
    if (!o || o.score < n.score) byKey.set(key, n);
  }
  const sorted = [...byKey.values()].sort((a, b) => b.score - a.score);
  const perCell = new Map(), next = [];
  for (const n of sorted) {
    const q = n.g.player;
    const motion = q.onGround ? (Math.abs(q.vx) < 0.5 ? 's' : q.vx > 0 ? 'r' : 'l') : (q.vy < 0 ? 'u' : 'd');
    const cell = Math.floor(q.x / CELL) + motion, k = perCell.get(cell) || 0;
    if (k >= PER_CELL) continue;
    perCell.set(cell, k + 1); next.push(n);
    if (next.length >= WIDTH) break;
  }
  for (const n of beam) n.g = null; // parents only need their action from now on
  beam = next;
  if (beam.length) maxX = Math.max(maxX, beam[0].g.player.x);
  if (opt('--hist', 0) && depth % 25 === 0 && depth <= 450) {
    const h = {};
    for (const n of beam) { const c = Math.floor(n.g.player.x / 72); h[c] = (h[c] || 0) + 1; }
    console.log('d' + depth, Object.entries(h).map(([c, k]) => c + ':' + k).join(' '));
  }
  if (+opt('--dump', 0) === depth) {
    for (const n of beam.slice(0, 12)) {
      const q = n.g.player;
      console.log(`x=${(q.x / 72).toFixed(2)} y=${q.y.toFixed(0)} vx=${q.vx.toFixed(2)} vy=${q.vy.toFixed(1)} g=${q.onGround} runT=${q.runT} playT=${n.g.playT}`);
    }
    // walk right from the front state and report what stops it
    const c = cloneGame(beam[0].g), q = c.player;
    for (let i = 0; i < 90; i++) {
      c.step(toInput({ h: 1, a: 0, b: 0 }));
      const balls = c.hazards.filter((h) => h.type === 'bar').map((h) => c.hazardBalls(h, c.playT).slice(-1)[0]);
      if (i % 5 === 0 || failed(c)) console.log(i, 'x', (q.x / 72).toFixed(2), 'y', q.y.toFixed(0), 'vx', q.vx.toFixed(2), 'genki', q.genki, 'mode', c.mode, 'bar1 tip', balls[0].x.toFixed(0), balls[0].y.toFixed(0));
      if (failed(c)) break;
    }
    process.exit(0);
  }
  if (depth % 50 === 0) console.log(`depth ${depth} (${(depth * SEG / 60).toFixed(1)}s) beam ${beam.length} front x=${(maxX / 72).toFixed(1)} tiles  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
if (!best) { console.log(`NO SOLUTION. furthest x = ${(maxX / 72).toFixed(1)} tiles at depth ${depth}`); process.exit(1); }

const acts = [];
for (let n = best; n.parent; n = n.parent) acts.push(n.A);
acts.reverse();
const frames = [];
for (const A of acts) for (let k = 0; k < SEG; k++) frames.push(code(A));
// run-length encode: <char A..P><count base36>,...
let enc = '', i = 0;
while (i < frames.length) { let j = i; while (j < frames.length && frames[j] === frames[i]) j++; enc += String.fromCharCode(65 + frames[i]) + (j - i).toString(36) + ','; i = j; }
fs.writeFileSync(out, `/* Input list for the EX stage, found by tools/tas.js (${frames.length} frames). */\n(function (G) {\n  const AP = G.AP = G.AP || {};\n  AP.TAS = AP.TAS || {};\n  AP.TAS.ex = '${enc}';\n})(typeof window !== 'undefined' ? window : globalThis);\n`);
console.log(`SOLVED at depth ${depth}: ${frames.length} frames (${(frames.length / 60).toFixed(2)}s)  search ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(root, out)}`);

// replay check on a fresh game, exactly as the video will run it
const g = new AP.Game(); g.startAt(stage - 1);
const bot = new AP.TasBot(g, enc);
while (!g.finished && g.frame < 20000) g.step(bot.think());
console.log(`replay: finished=${g.finished} noMiss=${g.noMiss} clear=${(g.clearT / 60).toFixed(2)}s kabi=${g.stats.kabi} punches=${g.stats.punch}`);
