// Reverse-construction search for a 19-chain (Tsu rules, 6x13, row 13 never connects).
// Start from an empty field and repeatedly insert a 4-cell group that pops first,
// so that popping it + gravity gives back the previous field exactly.
const E = require('../src/engine.js');
const { W, H, VISIBLE } = E;
const TARGET = +(process.argv[2] || 19);
const COLORS = 4;
let seed = +(process.argv[3] || Date.now() % 100000);
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

// all 19 fixed tetrominoes, as [dx,dy] lists normalised to min 0
const SHAPES = (() => {
  const base = [[[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]],
    [[0,0],[1,0],[2,0],[2,1]], [[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]]];
  const out = new Map();
  for (const s of base) {
    let cur = s;
    for (let r = 0; r < 4; r++) {
      cur = cur.map(([x, y]) => [y, -x]);
      const mx = Math.min(...cur.map(p => p[0])), my = Math.min(...cur.map(p => p[1]));
      const n = cur.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      out.set(JSON.stringify(n), n);
    }
  }
  return [...out.values()];
})();

function insert(cols, cells, color) {
  const add = Array.from({ length: W }, () => []);
  for (const [x, y] of cells) add[x].push(y);
  const next = [];
  for (let x = 0; x < W; x++) {
    const ys = add[x];
    const len = cols[x].length + ys.length;
    if (len > H) return null;
    for (const y of ys) if (y >= len) return null;
    const col = new Array(len);
    let src = 0;
    for (let y = 0; y < len; y++) col[y] = ys.includes(y) ? color : cols[x][src++];
    next.push(col);
  }
  return next;
}

function stableExcept(cols, cells) {
  // the inserted cells must form exactly one group of 4 and nothing else may pop
  const key = new Set(cells.map(([x, y]) => x * 16 + y));
  for (const g of E.findGroups(cols)) {
    if (g.cells.length < 4) continue;
    if (g.cells.length !== 4) return false;
    if (!g.cells.every(([x, y]) => key.has(x * 16 + y))) return false;
  }
  return true;
}

function candidates(cols, depth) {
  const out = [];
  const last = depth === TARGET;
  for (const s of SHAPES) for (let ax = 0; ax < W; ax++) for (let ay = 0; ay < VISIBLE; ay++) {
    const cells = s.map(([dx, dy]) => [ax + dx, ay + dy]);
    if (cells.some(([x, y]) => x >= W || y >= VISIBLE)) continue;
    for (let c = 1; c <= COLORS; c++) {
      const next = insert(cols, cells, c);
      if (!next) continue;
      if (last) {
        // last pair = top two cells of column 3, spawned there; at least one must belong to the trigger group
        const h = next[2].length;
        if (h - 2 > 11) continue;
        if (!cells.some(([x, y]) => x === 2 && y >= h - 2)) continue;
      }
      if (!stableExcept(next, cells)) continue;
      const hs = next.map(c => c.length);
      const spread = Math.max(...hs) - Math.min(...hs);
      out.push({ next, cells, score: spread + rnd() * 2.5 });
    }
  }
  out.sort((a, b) => a.score - b.score);
  return out;
}

let nodes = 0;
const BUDGET = 400000;
function dfs(cols, depth, trail) {
  if (++nodes > BUDGET) return null;
  if (depth > TARGET) return { cols, trail };
  const cands = candidates(cols, depth).slice(0, depth < 6 ? 6 : 12);
  for (const c of cands) {
    const r = dfs(c.next, depth + 1, trail.concat([{ cells: c.cells }]));
    if (r) return r;
  }
  return null;
}

const t0 = Date.now();
for (let attempt = 0; ; attempt++) {
  nodes = 0;
  const r = dfs(Array.from({ length: W }, () => []), 1, []);
  if (r) {
    const sim = E.resolve(r.cols);
    console.log(JSON.stringify({ seed, attempt, ms: Date.now() - t0, chain: sim.chain, left: sim.final.flat().length, cols: r.cols }));
    break;
  }
  console.error('attempt', attempt, 'failed after', nodes, 'nodes', Date.now() - t0, 'ms');
  if (Date.now() - t0 > 240000) break;
}
