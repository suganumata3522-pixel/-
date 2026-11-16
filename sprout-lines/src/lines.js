// Rules for はっぱライン: 8 columns x 18 visible rows (+2 spawn rows above), 4-cell pieces, full rows clear.
// The grid is grid[y][x] (y = 0 is the bottom row); a cell is any truthy value, null when empty.
(function (root) {
  const W = 8, H = 20, VISIBLE = 18;

  // state-0 cells inside a 4x4 (I), 2x2 (O) or 3x3 box, y up; rotation centre per piece
  const BASE = {
    I: { cells: [[0, 2], [1, 2], [2, 2], [3, 2]], c: [1.5, 1.5], color: 1 },
    O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], c: [0.5, 0.5], color: 3 },
    T: { cells: [[0, 1], [1, 1], [2, 1], [1, 2]], c: [1, 1], color: 2 },
    S: { cells: [[0, 1], [1, 1], [1, 2], [2, 2]], c: [1, 1], color: 4 },
    Z: { cells: [[0, 2], [1, 2], [1, 1], [2, 1]], c: [1, 1], color: 6 },
    J: { cells: [[0, 2], [0, 1], [1, 1], [2, 1]], c: [1, 1], color: 7 },
    L: { cells: [[2, 2], [0, 1], [1, 1], [2, 1]], c: [1, 1], color: 5 },
  };
  const TYPES = Object.keys(BASE);
  const SHAPES = {};
  for (const t of TYPES) {
    const { cells, c: [cx, cy] } = BASE[t];
    const states = [cells];
    for (let r = 1; r < 4; r++) states.push(states[r - 1].map(([x, y]) => [cx + (y - cy), cy - (x - cx)]));
    SHAPES[t] = states;
  }
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, 1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2], [-1, 2], [1, 2]];
  const SPAWN = { I: [2, 16], O: [3, 18], T: [2, 17], S: [2, 17], Z: [2, 17], J: [2, 17], L: [2, 17] };

  const emptyGrid = () => Array.from({ length: H }, () => new Array(W).fill(null));
  const cellsOf = p => SHAPES[p.t][p.r].map(([x, y]) => [p.x + x, p.y + y]);
  const free = (g, x, y) => x >= 0 && x < W && y >= 0 && (y >= H || !g[y][x]);
  const fits = (g, p) => cellsOf(p).every(([x, y]) => free(g, x, y));
  const spawn = t => ({ t, r: 0, x: SPAWN[t][0], y: SPAWN[t][1] });

  function rotate(g, p, dir) {
    const r = (p.r + dir + 4) % 4;
    for (const [kx, ky] of KICKS) {
      const q = { t: p.t, r, x: p.x + kx, y: p.y + ky };
      if (fits(g, q)) return q;
    }
    return null;
  }

  function dropY(g, p) {
    let y = p.y;
    while (fits(g, { ...p, y: y - 1 })) y--;
    return y;
  }

  function fullRows(g) {
    const rows = [];
    for (let y = 0; y < H; y++) if (g[y].every(Boolean)) rows.push(y);
    return rows;
  }

  // removes the given rows and lets everything above fall; returns the new grid
  function clearRows(g, rows) {
    const keep = g.filter((_, y) => !rows.includes(y));
    while (keep.length < H) keep.push(new Array(W).fill(null));
    return keep;
  }

  const LINE_SCORE = [0, 100, 300, 600, 1000];
  function score(lines, level, combo, allClear) {
    return (LINE_SCORE[lines] + Math.max(0, combo - 1) * 50 + (allClear ? 3000 : 0)) * level;
  }

  // 7-piece bag: every type once, shuffled, then the next bag
  function Bag(rand) { this.rand = rand || Math.random; this.q = []; }
  Bag.prototype.next = function () {
    if (!this.q.length) {
      const b = TYPES.slice();
      for (let i = b.length - 1; i > 0; i--) { const j = (this.rand() * (i + 1)) | 0; [b[i], b[j]] = [b[j], b[i]]; }
      this.q = b;
    }
    return this.q.shift();
  };

  const api = { W, H, VISIBLE, TYPES, SHAPES, BASE, emptyGrid, cellsOf, fits, spawn, rotate, dropY, fullRows, clearRows, score, Bag };
  if (typeof module !== 'undefined') module.exports = api; else root.Lines = api;
})(typeof window !== 'undefined' ? window : globalThis);
