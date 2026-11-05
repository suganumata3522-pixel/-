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
    TOWN: { x0: 500, x1: 1500, y0: 2170, y1: 2790 }, // 町の広場(木が生えていない、建物向きの場所)
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
    // 町づくりの資材(木や岩をどんぐりっこが働いて手に入れる)
    wood: { name: '木材', w: 1, v: 1, seeds: 0, r: 17, region: 'X', mat: 'wood' },
    stone: { name: '石', w: 3, v: 1, seeds: 0, r: 15, region: 'X', mat: 'stone' },
  };

  // 町の建物。資材とコインを使って建て、どんぐりっこを投げて工事する。
  // work = 工事に必要な「力×秒」(どんぐりっこ10ぴきなら work/10 秒)
  DF.BUILDINGS = {
    house: { name: 'いえ', desc: '住人がひっこしてくる', wood: 3, stone: 1, coins: 0, work: 60, r: 56, max: 8, pts: 10, resident: true },
    bakery: { name: 'パン屋', desc: '毎朝もりコインがとどく', wood: 8, stone: 4, coins: 80, work: 110, r: 62, max: 1, pts: 20, income: 40 },
    cafe: { name: 'カフェ', desc: '住人のいこいの場・毎朝コイン', wood: 10, stone: 6, coins: 150, work: 140, r: 62, max: 1, pts: 25, income: 60 },
    windmill: { name: '風車小屋', desc: 'くるくる回る町のシンボル', wood: 14, stone: 8, coins: 200, work: 180, r: 52, max: 1, pts: 35 },
    library: { name: '図書館', desc: '町の評価が大きく上がる', wood: 14, stone: 14, coins: 250, work: 220, r: 76, max: 1, pts: 45 },
    clocktower: { name: '時計台', desc: '町のまんなかに。評価アップ', wood: 12, stone: 20, coins: 400, work: 260, r: 46, max: 1, pts: 60 },
  };
  // 家を建てるたびに、この順でひっこしてくる(オリジナルの住人)
  DF.RESIDENTS = [
    { name: 'ココ', species: 'rabbit', fur: '#f6dce4', cloth: '#7ec4cf', roof: '#e07a8f' },
    { name: 'ムギ', species: 'bear', fur: '#c8a27a', cloth: '#e07a5f', roof: '#b5651d' },
    { name: 'ミント', species: 'cat', fur: '#f4f1ea', cloth: '#81b29a', roof: '#5aa469' },
    { name: 'ポテ', species: 'dog', fur: '#e9c46a', cloth: '#577590', roof: '#4d6fa8' },
    { name: 'クルミ', species: 'squirrel', fur: '#d08c60', cloth: '#f4a261', roof: '#d9822b' },
    { name: 'モコ', species: 'sheep', fur: '#fdfcf7', cloth: '#b5838d', roof: '#9b6a8e' },
    { name: 'コン', species: 'fox', fur: '#f4a259', cloth: '#3d5a80', roof: '#c0392b' },
    { name: 'ペタ', species: 'penguin', fur: '#3b4252', cloth: '#ffd166', roof: '#2a9d8f' },
  ];
  DF.TALK = [
    'いい町になってきたね！', 'どんぐりっこって はたらきものだね', '隊長、きょうもおつかれさま！',
    '夜は ほしがきれいなんだよ', '雨あがりは にじが出るかも', 'あたらしい建物、たのしみだなあ',
    'この町、だいすき！', 'ふんふーん♪', 'おなかすいたなあ…', 'きたの森には なにがあるのかな',
  ];
  DF.RANKS = [0, 25, 70, 140, 240]; // 町の評価 ★1〜★5 に必要なポイント

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
