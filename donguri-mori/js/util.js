'use strict';
// どんぐりっこの森 — 共通ユーティリティと定数
window.DF = window.DF || {};
(function (DF) {
  const U = {};
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  U.randi = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  U.smooth = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  // 再現性のある乱数(森の地形を毎回同じにする)
  U.mulberry32 = (seed) => () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  U.weighted = (entries) => {
    // entries: [[value, weight], ...]
    let total = 0;
    for (const e of entries) total += e[1];
    let r = Math.random() * total;
    for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
    return entries[entries.length - 1][0];
  };

  U.store = {
    get(key, def) {
      try {
        const raw = localStorage.getItem('donguri-mori:' + key);
        return raw == null ? def : JSON.parse(raw);
      } catch (e) { return def; }
    },
    set(key, val) {
      try { localStorage.setItem('donguri-mori:' + key, JSON.stringify(val)); } catch (e) { /* 保存できない環境 */ }
    },
    remove(key) {
      try { localStorage.removeItem('donguri-mori:' + key); } catch (e) { /* noop */ }
    },
  };

  U.fmtSec = (s) => {
    s = Math.max(0, Math.floor(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  U.stamp = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  };

  U.FONT = "'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', 'Kosugi Maru', 'Yu Gothic UI', 'Meiryo', sans-serif";

  U.roundRect = (ctx, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  U.makeCanvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  DF.U = U;

  // ---- ゲーム定数 ----
  DF.C = {
    VW: 720, VH: 1280,            // 画面(=ショート動画)の解像度 9:16
    WW: 2000, WH: 3400,           // 森の広さ
    HOUSE: { x: 1000, y: 2950, r: 92 },
    START: { x: 1000, y: 3130 },
    ST: 1640, SB: 1750,           // 小川の上端・下端
    BX0: 925, BX1: 1075,          // 橋の左右
    GATE: { x0: 880, x1: 1120, y0: 1752, y1: 1806, need: 10 },
    MAX_KIDS: 100,
    DAY_LEN: 240,                 // 1日の長さ(秒)
    THROW_RANGE: 360,
    WHISTLE_R: 240,
  };

  // どんぐりっこの種類
  DF.KIDS = {
    brown: { name: 'ちゃいろ', power: 1, speed: 1.0, body: '#cf904f', bodyDark: '#9a612f', cap: '#6b4223', capLight: '#8d5a33' },
    green: { name: 'こけ', power: 1, speed: 1.35, body: '#a3c96f', bodyDark: '#6e9944', cap: '#3d6a2c', capLight: '#5b8a3d' },
    gold: { name: 'きん', power: 2, speed: 1.2, body: '#f5d05a', bodyDark: '#cc9b26', cap: '#a5741d', capLight: '#cf9a3a', glow: true },
  };

  // 森のおとしもの(はこぶもの)
  DF.ITEMS = {
    acorn: { name: 'どんぐり', w: 1, v: 3, seeds: 1, r: 11, region: 'S', wt: 4 },
    berry: { name: 'いちご', w: 1, v: 5, seeds: 1, r: 12, region: 'S', wt: 3 },
    mushroom: { name: 'きのこ', w: 2, v: 10, seeds: 2, r: 16, region: 'S', wt: 2.2, seedType: 'green' },
    apple: { name: 'りんご', w: 3, v: 18, seeds: 3, r: 19, region: 'S', wt: 2 },
    chestnut: { name: 'くり', w: 2, v: 14, seeds: 2, r: 16, region: 'N', wt: 3 },
    peach: { name: 'もも', w: 5, v: 40, seeds: 5, r: 23, region: 'N', wt: 2 },
    gem: { name: 'きらきら石', w: 4, v: 70, seeds: 2, r: 17, region: 'N', wt: 1.4, shiny: true },
    melon: { name: 'すいか', w: 10, v: 110, seeds: 8, r: 34, region: 'N', wt: 1, seedType: 'green', big: true },
    goldapple: { name: '金のりんご', w: 20, v: 400, seeds: 12, r: 40, region: 'X', seedType: 'gold', big: true, legend: true, glow: true },
    star: { name: 'ほしのかけら', w: 3, v: 120, seeds: 4, r: 19, region: 'X', seedType: 'gold', glow: true, shiny: true },
  };

  // かざり(おみせで買える)
  DF.DECOS = {
    flowerbed: { name: '花だん', price: 30, desc: 'いろとりどりのお花', r: 26 },
    lantern: { name: 'ランタン', price: 50, desc: '夜をやさしく照らす', r: 10, light: 170 },
    bench: { name: 'ベンチ', price: 60, desc: 'ひとやすみの場所', r: 26 },
    pinwheel: { name: 'かざぐるま', price: 80, desc: 'くるくる回る', r: 12 },
    mushhouse: { name: 'きのこの家', price: 150, desc: 'どんぐりっこのお昼寝小屋', r: 34, light: 110 },
    fountain: { name: 'ふんすい', price: 300, desc: 'きらきら水しぶき', r: 42, light: 60 },
    tower: { name: 'どんぐりの塔', price: 600, desc: '森のシンボル', r: 30, light: 230 },
  };
})(window.DF);
