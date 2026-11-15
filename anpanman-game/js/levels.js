/* Level layouts. Tile legend:
 *  G ground   W castle stone   B brick   ? coin block   U used block
 *  M あたらしい顔 block (げんき100ばい star mode)   N あたらしい顔 block (heal only)
 *  S stair block   [ ] { } pipe   o coin   ~ lava surface   L lava   X invisible wall
 *  ^ floor spikes   v ceiling spikes   (spikes hurt on touch and are not solid)
 * Rows 0..14, ground surface is row 13. Row 3 coin lines sit on the flying route. */
(function (G) {
  'use strict';
  const AP = G.AP = G.AP || {};
  const ROWS = 15, GT = 13, T = 72;

  class Builder {
    constructor(cols, theme) {
      this.cols = cols; this.theme = theme;
      this.tiles = [];
      for (let r = 0; r < ROWS; r++) this.tiles.push(new Array(cols).fill('.'));
      this.spawns = []; this.flagC = null; this.houseC = null; this.arenaC = null; this.start = 3;
      this.hazards = [];
    }
    set(c, r, ch) { if (c >= 0 && c < this.cols && r >= 0 && r < ROWS) this.tiles[r][c] = ch; return this; }
    ground(c0, c1, ch) { for (let c = c0; c <= c1; c++) for (let r = GT; r < ROWS; r++) this.set(c, r, ch || 'G'); return this; }
    row(c, r, str) { for (let i = 0; i < str.length; i++) if (str[i] !== ' ') this.set(c + i, r, str[i]); return this; }
    pipe(c, h) {
      const top = GT - h;
      this.set(c, top, '['); this.set(c + 1, top, ']');
      for (let r = top + 1; r < GT; r++) { this.set(c, r, '{'); this.set(c + 1, r, '}'); }
      return this;
    }
    column(c, h, ch) { for (let k = 0; k < h; k++) this.set(c, GT - 1 - k, ch || 'S'); return this; }
    stairs(c, h, dir, ch) {
      for (let i = 0; i < h; i++) this.column(c + i, dir > 0 ? i + 1 : h - i, ch);
      return this;
    }
    enemy(c, type, r) { this.spawns.push({ c, r: r == null ? GT - 1 : r, type: type || 'k' }); return this; }
    coins(c, r, n) { for (let i = 0; i < n; i++) this.set(c + i, r, 'o'); return this; }
    lava(c0, c1) { for (let c = c0; c <= c1; c++) { this.set(c, GT, '~'); this.set(c, GT + 1, 'L'); } return this; }
    ceiling(c0, c1) { for (let c = c0; c <= c1; c++) { this.set(c, 0, 'W'); this.set(c, 1, 'W'); } return this; }
    // rotating chain of fireballs around a stone block; speed in radians per frame
    firebar(c, r, len, speed, phase, twin) {
      this.set(c, r, 'S');
      this.hazards.push({ type: 'bar', x: (c + 0.5) * T, y: (r + 0.5) * T, len, speed, phase, twin: !!twin });
      return this;
    }
    // magma ball that jumps out of the lava every `period` frames
    podo(c, period, phase, height) {
      this.hazards.push({ type: 'podo', x: (c + 0.5) * T, period, phase, h: height, air: Math.round(period * 0.55) });
      return this;
    }
    // かびるんるん floating in place, bobbing up and down
    hover(c, r, amp, phase) { this.spawns.push({ c, r, type: 'h', amp, phase }); return this; }
    flag(c) { this.flagC = c; this.set(c, GT - 1, 'S'); return this; }
    house(c) { this.houseC = c; return this; }
    done(meta) {
      this.spawns.sort((a, b) => a.c - b.c);
      return Object.assign({
        cols: this.cols, tiles: this.tiles, spawns: this.spawns, theme: this.theme,
        flagC: this.flagC, houseC: this.houseC, arenaC: this.arenaC, start: this.start, time: 300,
      }, meta);
    }
  }

  const LEVELS = [
    // ---------------------------------------------------------------- 1-1
    function () {
      const b = new Builder(212, 'field');
      b.ground(0, 68);
      b.row(14, 9, '?');
      b.row(19, 9, 'B?B?B').row(21, 5, '?');
      b.enemy(25);
      b.pipe(29, 2);
      b.coins(33, 11, 3);
      b.pipe(38, 3);
      b.enemy(42);
      b.pipe(47, 4);
      b.enemy(51).enemy(53);
      b.pipe(58, 4);
      b.coins(61, 11, 5);
      b.ground(71, 86);
      b.row(75, 9, 'B?B');
      b.row(79, 5, 'BBBBBBB');
      b.enemy(81, 'k', 4).enemy(83, 'k', 4);
      b.ground(90, 151);
      b.row(91, 5, 'BBB?');
      b.row(96, 9, 'M');
      b.enemy(101).enemy(103);
      b.enemy(106, 'K');
      b.row(107, 9, '?').row(110, 9, '?').row(110, 5, '?').row(113, 9, '?');
      b.enemy(111).enemy(113).enemy(117).enemy(119);
      b.row(120, 9, 'B').row(123, 5, 'BBB').row(129, 5, 'B??B').row(130, 9, 'BB');
      b.enemy(126).enemy(128);
      b.stairs(134, 4, 1).stairs(140, 4, -1);
      b.stairs(147, 4, 1).column(151, 4);
      b.ground(154, 211);
      b.stairs(154, 4, -1);
      b.coins(159, 11, 3);
      b.pipe(164, 2);
      b.row(169, 9, 'BB?B');
      b.enemy(172).enemy(174);
      b.pipe(180, 2);
      b.stairs(183, 7, 1).column(190, 7);
      for (const c of [24, 58, 100, 140, 168]) b.coins(c, 3, 8);
      b.flag(199).house(203);
      return b.done({ world: '1-1', name: 'あおぞら草原', music: 'field' });
    },
    // ---------------------------------------------------------------- 1-2
    function () {
      const b = new Builder(182, 'sunset');
      b.ground(0, 32);
      b.coins(8, 11, 4);
      b.row(13, 9, '?B?B?');
      b.enemy(20).enemy(27, 'f');
      b.ground(36, 64);
      b.row(39, 9, 'BBBB');
      b.enemy(41, 'K', 8);
      b.pipe(47, 3);
      b.enemy(51, 'K');
      b.row(54, 9, '?N?');
      b.enemy(60, 'f');
      b.ground(68, 100);
      b.stairs(70, 3, 1).column(73, 3).column(74, 3).stairs(75, 3, -1);
      b.enemy(80).enemy(82).enemy(84);
      b.row(87, 9, 'B?B?B').row(89, 5, '?');
      b.pipe(95, 2);
      b.ground(104, 146);
      b.coins(106, 11, 6);
      b.enemy(110, 'K').enemy(116, 'f').enemy(120, 'f');
      b.pipe(124, 3);
      b.enemy(128);
      b.pipe(131, 4);
      b.row(136, 9, 'B??B');
      b.enemy(140);
      b.ground(149, 181);
      b.stairs(152, 6, 1).column(158, 6);
      for (const c of [20, 62, 110, 138]) b.coins(c, 3, 8);
      b.flag(168).house(172);
      return b.done({ world: '1-2', name: 'ゆうやけの森', music: 'forest' });
    },
    // ---------------------------------------------------------------- 1-3
    function () {
      const b = new Builder(122, 'castle');
      b.ceiling(0, 101);
      b.ground(0, 18, 'W');
      b.coins(6, 11, 3);
      b.lava(19, 21);
      b.ground(22, 40, 'W');
      b.column(28, 2, 'W');
      b.enemy(32).enemy(35);
      b.row(37, 9, '?');
      b.lava(41, 43);
      b.ground(44, 70, 'W');
      b.row(49, 9, '?N?');
      b.enemy(54).enemy(56, 'K').enemy(61, 'f');
      b.column(65, 3, 'W');
      b.lava(71, 73);
      b.ground(74, 121, 'W');
      b.coins(77, 11, 4);
      b.enemy(82).enemy(85);
      b.row(88, 9, '???');
      b.enemy(92, 'K').enemy(97);
      for (let r = 0; r < 13; r++) { b.set(118, r, 'W'); b.set(119, r, 'W'); b.set(120, r, 'W'); b.set(121, r, 'W'); }
      for (const c of [16, 46, 76]) b.coins(c, 3, 8);
      b.arenaC = 104;
      return b.done({ world: '1-3', name: 'バイキン城', music: 'castle', princessC: 116 });
    },
    // ---------------------------------------------------------------- EX
    // じごくの バイキン城: six precision trials back to back. Flying is disabled here.
    function () {
      const b = new Builder(196, 'castle');
      b.ceiling(0, 195);
      b.ground(0, 9, 'W');
      b.enemy(7);
      // 1. 溶岩の飛び石: nine one-tile pillars of uneven height, a magma ball in every gap
      b.lava(10, 47);
      [2, 4, 1, 3, 5, 2, 4, 1, 3].forEach((h, i) => b.column(12 + i * 4, h, 'W'));
      for (let i = 0; i < 9; i++) b.podo(14 + i * 4, 100, (i * 37) % 100, 430);
      // 2. ファイアバー回廊: a low corridor with three long fire bars, the middle one double-armed
      b.ground(48, 74, 'W');
      for (let c = 51; c <= 72; c++) for (let r = 0; r <= 8; r++) b.set(c, r, 'W');
      b.firebar(55, 10, 7, 0.034, 0).firebar(62, 10, 7, -0.03, 2.2, true).firebar(69, 10, 7, 0.05, 4.1);
      // 3. ストンプ渡り: 21 tiles of lava, crossed only by bouncing off floating かびるんるん,
      //    with a fire bar turning in the middle of the route
      b.lava(75, 95);
      [[77, 10], [81, 9], [85, 10], [89, 9], [93, 10]].forEach(([c, r], i) => b.hover(c, r, 22, i * 1.7));
      b.firebar(87, 6, 5, 0.03, 1.0);
      // 4. マグマだま地帯: one-tile pillars with a magma ball in every gap
      b.ground(96, 99, 'W');
      b.lava(100, 118);
      for (const c of [103, 107, 111, 115]) b.column(c, 2, 'W');
      for (let i = 0; i < 5; i++) b.podo(101 + i * 4, 100, (i * 29) % 100, 440);
      // 5. トゲトンネル: spikes on the ceiling, pairs of floor spikes one tile apart
      b.ground(119, 156, 'W');
      for (let c = 123; c <= 144; c++) { for (let r = 0; r <= 7; r++) b.set(c, r, 'W'); b.set(c, 8, 'v'); }
      for (const c of [126, 128, 131, 133, 136, 138, 141]) b.set(c, GT - 1, '^');
      b.enemy(146);
      // 6. ラストジャンプ: a running jump onto a high pillar, then a drop onto a low one
      b.lava(157, 170);
      b.column(162, 3, 'W');
      b.column(167, 1, 'W');
      b.ground(171, 195, 'W');
      b.enemy(174);
      b.flag(178).house(183);
      return b.done({
        world: 'EX', name: 'じごくの バイキン城', music: 'boss', ex: true, noFly: true, time: 400, hazards: b.hazards,
        sections: [
          { c: 10, name: '溶岩の飛び石' }, { c: 50, name: 'ファイアバー回廊' }, { c: 74, name: 'ストンプ渡り' },
          { c: 98, name: 'マグマだま地帯' }, { c: 121, name: 'トゲトンネル' }, { c: 152, name: 'ラストジャンプ' },
        ],
      });
    },
  ];

  AP.LEVEL_COUNT = LEVELS.length;
  AP.buildLevel = (i) => LEVELS[i]();
})(typeof window !== 'undefined' ? window : globalThis);
