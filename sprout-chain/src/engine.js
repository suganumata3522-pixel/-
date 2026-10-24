// Field rules shared by the game, the 19-chain search and the video renderer.
// 6 columns x 13 rows (row index 12 = hidden 13th row, which never connects).
(function (root) {
  const W = 6, H = 13, VISIBLE = 12;
  const CHAIN_POWER = [0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512];
  const COLOR_BONUS = [0, 3, 6, 12, 24];
  const GROUP_BONUS = n => (n <= 4 ? 0 : n >= 11 ? 10 : n - 3);

  // cols: array of W arrays, bottom -> top, values 1..5
  function cloneCols(cols) { return cols.map(c => c.slice()); }

  function findGroups(cols) {
    const seen = new Set(), groups = [];
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < Math.min(cols[x].length, VISIBLE); y++) {
        const k = x * 16 + y;
        if (seen.has(k)) continue;
        const color = cols[x][y], cells = [], stack = [[x, y]];
        seen.add(k);
        while (stack.length) {
          const [cx, cy] = stack.pop();
          cells.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= VISIBLE || ny >= cols[nx].length) continue;
            const nk = nx * 16 + ny;
            if (seen.has(nk) || cols[nx][ny] !== color) continue;
            seen.add(nk);
            stack.push([nx, ny]);
          }
        }
        groups.push({ color, cells });
      }
    }
    return groups;
  }

  // One chain step: returns null when nothing pops.
  function step(cols, chainNo) {
    const popping = findGroups(cols).filter(g => g.cells.length >= 4);
    if (!popping.length) return null;
    const dead = new Set();
    let count = 0, groupBonus = 0;
    const colors = new Set();
    for (const g of popping) {
      colors.add(g.color);
      groupBonus += GROUP_BONUS(g.cells.length);
      count += g.cells.length;
      for (const [x, y] of g.cells) dead.add(x * 16 + y);
    }
    const next = cols.map((c, x) => c.filter((_, y) => !dead.has(x * 16 + y)));
    const bonus = CHAIN_POWER[Math.min(chainNo, 19) - 1] + COLOR_BONUS[colors.size - 1] + groupBonus;
    const score = 10 * count * Math.min(999, Math.max(1, bonus));
    return { popping, next, score, count };
  }

  function resolve(cols) {
    let cur = cloneCols(cols), chain = 0, score = 0;
    const steps = [];
    for (;;) {
      const r = step(cur, chain + 1);
      if (!r) break;
      chain++;
      score += r.score;
      steps.push(r);
      cur = r.next;
    }
    return { chain, score, steps, final: cur };
  }

  const api = { W, H, VISIBLE, cloneCols, findGroups, step, resolve };
  if (typeof module !== 'undefined') module.exports = api; else root.Engine = api;
})(this);
