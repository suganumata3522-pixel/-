/* あつまれ ピクミンの森 — island layout.
 * The island is a tile grid (64px tiles). A river splits it into a west side
 * (airport, base, onion, houses, shop) and an east side reached by a bridge. */
(function (G) {
  'use strict';
  const PM = G.PM = G.PM || {};
  const T = 64, COLS = 32, ROWS = 42;
  const TER = { SEA: 0, SAND: 1, GRASS: 2, WATER: 3, PATH: 4, BRIDGE: 5 };
  Object.assign(PM, { T, COLS, ROWS, WW: COLS * T, WH: ROWS * T, TER });

  PM.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  PM.hash = hash;

  // river centre column (fractional) for a given row
  const riverCol = (r) => 20.5 + Math.sin(r * 0.21) * 1.1;
  PM.riverCol = riverCol;

  /* Building lots: tile rect of the footprint; the door is at the bottom middle. */
  const LOTS = {
    base: { c: 10, r: 18, w: 3, h: 2 },
    house: [
      { c: 6, r: 12, w: 3, h: 2, roof: 'red' },
      { c: 9, r: 10, w: 3, h: 2, roof: 'yellow' },
      { c: 14, r: 12, w: 3, h: 2, roof: 'blue' },
      { c: 5, r: 16, w: 3, h: 2, roof: 'yellow' },
    ],
    shop: { c: 5, r: 27, w: 4, h: 2 },
    museum: { c: 23, r: 14, w: 4, h: 3 },
    plaza: { c: 10, r: 22, w: 5, h: 4 },
  };
  PM.LOTS = LOTS;

  PM.makeWorld = function () {
    const ter = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const nx = (c + 0.5 - 16) / 14.6, ny = (r + 0.5 - 21) / 19.8;
        const d = Math.sqrt(nx * nx + ny * ny) + (vnoise(c * 0.33, r * 0.33, 3) - 0.5) * 0.16;
        row.push(d < 0.84 ? TER.GRASS : d < 0.99 ? TER.SAND : TER.SEA);
      }
      ter.push(row);
    }
    // wide beach for the landing pad
    for (let r = 36; r <= 39; r++) for (let c = 7; c <= 14; c++) ter[r][c] = TER.SAND;
    // river with a pond
    for (let r = 0; r < ROWS; r++) {
      const rc = riverCol(r);
      for (let c = Math.floor(rc - 1); c <= Math.floor(rc); c++) if (ter[r][c] !== TER.SEA) ter[r][c] = TER.WATER;
    }
    for (let r = 7; r <= 9; r++) for (let c = 19; c <= 23; c++) if (ter[r][c] !== TER.SEA) ter[r][c] = TER.WATER;

    // bridge spot: row 20, spanning the river plus one tile of bank on each side
    const br = 20, brc = riverCol(br);
    const bridge = { r: br, c0: Math.floor(brc - 1) - 1, c1: Math.floor(brc) + 1 };

    const reserved = (c, r, pad) => {
      const rects = [LOTS.base, LOTS.shop, LOTS.museum, LOTS.plaza].concat(LOTS.house);
      for (const L of rects) if (c >= L.c - pad && c < L.c + L.w + pad && r >= L.r - pad - 1 && r < L.r + L.h + pad + 1) return true;
      if (Math.abs(c - 7) < 3 && Math.abs(r - 21) < 3) return true;          // onion
      if (r >= 33 && c >= 6 && c <= 15) return true;                          // airport
      if (Math.abs(r - br) <= 1 && c >= bridge.c0 - 2 && c <= bridge.c1 + 2) return true;
      return false;
    };

    // scatter objects
    const rnd = PM.rng(20261105);
    const objs = [];
    const taken = [];
    const free = (x, y, d) => taken.every((p) => (p.x - x) ** 2 + (p.y - y) ** 2 > d * d);
    const put = (kind, c, r, extra) => {
      const x = (c + 0.5) * T + (rnd() - 0.5) * 20, y = (r + 0.6) * T + (rnd() - 0.5) * 14;
      objs.push(Object.assign({ kind, x, y }, extra || {}));
      taken.push({ x, y });
    };
    const grassAt = (c, r) => r > 0 && r < ROWS - 1 && c > 0 && c < COLS - 1 && ter[r][c] === TER.GRASS &&
      ter[r - 1][c] !== TER.SEA && ter[r + 1][c] !== TER.SEA && ter[r][c - 1] !== TER.WATER && ter[r][c + 1] !== TER.WATER && ter[r][c - 1] !== TER.SEA && ter[r][c + 1] !== TER.SEA;
    const tryPlace = (kind, n, pad, spacing, filter, extra) => {
      let placed = 0, guard = 0;
      while (placed < n && guard++ < 6000) {
        const c = 1 + Math.floor(rnd() * (COLS - 2)), r = 1 + Math.floor(rnd() * (ROWS - 2));
        if (!grassAt(c, r) || reserved(c, r, pad) || (filter && !filter(c, r))) continue;
        const x = (c + 0.5) * T, y = (r + 0.6) * T;
        if (!free(x, y, spacing)) continue;
        put(kind, c, r, typeof extra === 'function' ? extra(placed) : extra);
        placed++;
      }
    };
    const west = (c, r) => c < riverCol(r) - 2;
    const east = (c, r) => c > riverCol(r) + 1;
    tryPlace('fruit', 4, 1, 120, (c, r) => west(c, r) && r > 8 && r < 32, (i) => ({ fruit: i % 2 ? 'peach' : 'apple' }));
    tryPlace('fruit', 3, 1, 120, east, (i) => ({ fruit: i % 2 ? 'apple' : 'peach' }));
    tryPlace('tree', 26, 1, 110, west);
    tryPlace('tree', 14, 1, 110, east);
    tryPlace('rock', 6, 1, 120, west);
    tryPlace('rock', 4, 1, 120, east);
    tryPlace('posy', 5, 0, 90, (c, r) => west(c, r) && Math.abs(c - 8) < 7 && r > 15 && r < 32);
    tryPlace('weed', 34, 0, 62, (c, r) => west(c, r));
    tryPlace('weed', 12, 0, 62, east);
    tryPlace('flower', 18, 0, 56, null, (i) => ({ hue: i % 4 }));
    // coconut palms along the beach (decoration)
    let palms = 0, guard = 0;
    while (palms < 12 && guard++ < 4000) {
      const c = 1 + Math.floor(rnd() * (COLS - 2)), r = 1 + Math.floor(rnd() * (ROWS - 2));
      if (ter[r][c] !== TER.SAND || reserved(c, r, 0)) continue;
      const x = (c + 0.5) * T, y = (r + 0.6) * T;
      if (!free(x, y, 150)) continue;
      put('palm', c, r); palms++;
    }
    return {
      ter, objs, bridge,
      base: { x: (LOTS.base.c + 1.5) * T, y: (LOTS.base.r + 2) * T },
      onion: { x: 7.5 * T, y: 21.5 * T },
      pad: { x: 10.5 * T, y: 37.4 * T },
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
