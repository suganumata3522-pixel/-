// Builds a 16-row stack in columns 0-6 (column 7 stays empty) from straight-dropped pieces with no holes,
// using every piece type exactly 4 times, then checks that 4 vertical I pieces clear it completely.
const L = require('../src/lines.js');
const ROWS = 16, COLS = 7;
let seed = +(process.argv[2] || 7);
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// unique (type, rotation) shapes with each column's lowest cell
const OPTIONS = [];
for (const t of L.TYPES) {
  const seen = new Set();
  L.SHAPES[t].forEach((cells, r) => {
    const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
    const norm = cells.map(([x, y]) => [x - mx, y - my]);
    const key = JSON.stringify(norm.slice().sort());
    if (seen.has(key)) return;
    seen.add(key);
    const bottom = {};
    for (const [x, y] of norm) bottom[x] = Math.min(bottom[x] ?? 9, y);
    OPTIONS.push({ t, r, norm, bottom, mx, my });
  });
}

function solve(h, counts, out) {
  let c = -1;
  for (let x = 0; x < COLS; x++) if (h[x] < ROWS && (c < 0 || h[x] < h[c])) c = x;
  if (c < 0) return true;
  const opts = OPTIONS.slice().sort(() => rand() - 0.5);
  for (const o of opts) {
    if (counts[o.t] >= 4) continue;
    for (const [bx, by] of Object.entries(o.bottom)) {
      const ox = c - +bx, oy = h[c] - by;
      const ok = Object.entries(o.bottom).every(([dx, dy]) => {
        const x = ox + +dx;
        return x >= 0 && x < COLS && h[x] === oy + dy;
      }) && o.norm.every(([dx, dy]) => oy + dy < ROWS);
      if (!ok) continue;
      const h2 = h.slice();
      for (const [dx, dy] of o.norm) h2[ox + dx] = Math.max(h2[ox + dx], oy + dy + 1);
      counts[o.t]++;
      out.push({ t: o.t, r: o.r, x: ox - o.mx, y: oy - o.my });
      if (solve(h2, counts, out)) return true;
      out.pop();
      counts[o.t]--;
    }
  }
  return false;
}

const out = [];
if (!solve(new Array(COLS).fill(0), Object.fromEntries(L.TYPES.map(t => [t, 0])), out)) throw new Error('no tiling');

// verify by dropping every piece straight down from the spawn rows
let g = L.emptyGrid();
out.forEach((p, i) => {
  const from = { ...p, y: 17 };
  if (!L.fits(g, from)) throw new Error('piece ' + i + ' cannot enter from above');
  const y = L.dropY(g, from);
  if (y !== p.y) throw new Error(`piece ${i} lands at ${y}, expected ${p.y}`);
  for (const [x, yy] of L.cellsOf(p)) g[yy][x] = p.t;
  if (L.fullRows(g).length) throw new Error('a row cleared during the build');
});
for (let y = 0; y < L.H; y++) for (let x = 0; x < L.W; x++) {
  const want = y < ROWS && x < COLS;
  if (!!g[y][x] !== want) throw new Error(`unexpected cell ${x},${y}`);
}
const clears = [];
for (let k = 0; k < 4; k++) {
  const I = { t: 'I', r: 1, x: 5, y: 16 };
  I.y = L.dropY(g, I);
  for (const [x, y] of L.cellsOf(I)) g[y][x] = 'I';
  const rows = L.fullRows(g);
  clears.push(rows.length);
  g = L.clearRows(g, rows);
}
const left = g.flat().filter(Boolean).length;
if (clears.join() !== '4,4,4,4' || left) throw new Error('finish failed ' + clears + ' left ' + left);
console.log(JSON.stringify({ seed: +process.argv[2] || 7, pieces: out }));
console.error('ok: ' + out.length + ' pieces, clears ' + clears.join('+') + ', cells left ' + left);
