/* Level layouts. Tile legend:
 *  G ground   W castle stone   B brick   ? coin block   U used block
 *  M あたらしい顔 block (げんき100ばい star mode)   N あたらしい顔 block (heal only)
 *  S stair block   [ ] { } pipe   o coin   ~ lava surface   L lava   X invisible wall
 *  ^ floor spikes   v ceiling spikes   (spikes hurt on touch and are not solid)
 *  Q vanishing platform (EX-2; solid from above only while it is shown)   C cannon block
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
      this.hazards = []; this.blinks = {}; this.blinkList = []; this.chase = null;
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
      const x = (c + 0.5) * T, reach = (len - 1) * 24 + 12;
      this.hazards.push({ type: 'bar', x, y: (r + 0.5) * T, len, speed, phase, twin: !!twin, x0: x - reach, x1: x + reach });
      return this;
    }
    // four-armed fire bar
    cross(c, r, len, speed, phase) {
      this.firebar(c, r, len, speed, phase, true);
      this.hazards[this.hazards.length - 1].cross = true;
      return this;
    }
    // magma ball that jumps out of the lava every `period` frames
    podo(c, period, phase, height) {
      const x = (c + 0.5) * T;
      this.hazards.push({ type: 'podo', x, period, phase, h: height, air: Math.round(period * 0.55), x0: x - 21, x1: x + 21 });
      return this;
    }
    // platform that appears for `on` frames out of every `period` (EX-2)
    blink(c, r, period, on, phase) {
      this.set(c, r, 'Q');
      const b = { c, r, period, on, phase };
      this.blinks[c * 100 + r] = b; this.blinkList.push(b);
      return this;
    }
    // spiked press hanging from the ceiling (w tiles wide). top = ceiling y, up/down = press bottom y
    crusher(c, w, top, up, period, phase, o) {
      o = o || {};
      const x = c * T;
      this.hazards.push({
        type: 'crush', x, w: w * T, top, up, down: GT * T, period, phase,
        wait: o.wait || 40, fall: o.fall || 10, rest: o.rest || 22, x0: x, x1: x + w * T,
      });
      return this;
    }
    // cannon block that fires an iron ball every `period` frames (dir -1 = to the left).
    // The ball flies until the first solid tile, but at most maxTiles tiles.
    cannon(c, r, dir, period, phase, speed, maxTiles) {
      this.set(c, r, 'C');
      this.hazards.push({ type: 'cannon', c, r, x: (c + 0.5) * T, y: (r + 0.5) * T, dir, period, phase, speed, mouth: 44, range: 0, maxTiles: maxTiles || 10 });
      return this;
    }
    // bat circling around (c, r); positions follow the play clock
    bat(c, r, ampX, ampY, spd, phase) { this.spawns.push({ c, r, type: 'h', amp: ampY, ampX, spd, phase }); return this; }
    // a wall of spikes that starts moving right once the player passes triggerC
    chaseWall(triggerC, startC, speed, endC) {
      this.chase = { triggerC, x0: startC * T, speed, endX: endC * T };
      this.hazards.push({ type: 'chase' });
      return this;
    }
    // かびるんるん floating in place, bobbing up and down
    hover(c, r, amp, phase) { this.spawns.push({ c, r, type: 'h', amp, phase }); return this; }
    flag(c) { this.flagC = c; this.set(c, GT - 1, 'S'); return this; }
    house(c) { this.houseC = c; return this; }
    done(meta) {
      this.spawns.sort((a, b) => a.c - b.c);
      // cannon balls fly until the first solid tile
      const SOLID = 'GB?MNUS[]{}WXC';
      for (const h of this.hazards) {
        if (h.type !== 'cannon') continue;
        let c = h.c + h.dir;
        while (c >= 0 && c < this.cols && Math.abs(c - h.c) <= h.maxTiles && !SOLID.includes(this.tiles[h.r][c])) c += h.dir;
        h.range = Math.max(0, (h.dir < 0 ? (h.c - c - 1) * T : (c - h.c - 1) * T) + T / 2 - h.mouth - 17);
        h.x0 = h.dir < 0 ? h.x - h.range - h.mouth : h.x; h.x1 = h.dir < 0 ? h.x : h.x + h.range + h.mouth;
      }
      return Object.assign({
        cols: this.cols, tiles: this.tiles, spawns: this.spawns, theme: this.theme,
        flagC: this.flagC, houseC: this.houseC, arenaC: this.arenaC, start: this.start, time: 300,
        blinks: this.blinks, blinkList: this.blinkList, chase: this.chase,
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
      b.firebar(87, 4, 5, 0.03, 1.0);
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
    // ---------------------------------------------------------------- EX-2
    // しんえんの とりで: eight trials, no flying, and a spike wall that chases you near the end.
    function () {
      const b = new Builder(262, 'castle');
      b.ceiling(0, 261);
      b.ground(0, 9, 'W');
      b.enemy(7);
      // 1. きえる足場: platforms that blink on and off in a wave over the lava
      b.lava(10, 41);
      [11, 10, 9, 10, 11, 9, 10, 8, 10, 11].forEach((r, i) => b.blink(12 + i * 3, r, 108, 54, -i * 36));
      b.podo(22, 108, 30, 420).podo(34, 108, 70, 420);
      // 2. クロスファイアバー: a low corridor with four-armed fire bars
      b.ground(42, 70, 'W');
      for (let c = 45; c <= 67; c++) for (let r = 0; r <= 7; r++) b.set(c, r, 'W');
      // four-armed bars at head height: slip under right after an arm sweeps past
      b.cross(49, 10, 4, -0.034, 0).cross(54, 10, 4, -0.04, 0.5).firebar(60, 10, 7, -0.035, 2.0, true).cross(65, 10, 4, -0.045, 1.2);
      // 3. トゲプレス回廊: spiked presses slam down in turn; wait in the gaps between them
      b.ground(71, 95, 'W');
      for (let c = 73; c <= 93; c++) for (let r = 0; r <= 5; r++) b.set(c, r, 'W');
      [75, 79, 83, 87, 91].forEach((c, i) => b.crusher(c, 2, 6 * T, 754, 100, -i * 50, { wait: 30, fall: 8, rest: 16 }));
      // 4. てっきゅう砲台: cannon turrets fire iron balls low, mid and high
      b.ground(96, 124, 'W');
      b.cannon(101, 12, -1, 64, 0, 6.5, 5);
      b.column(106, 1, 'W').cannon(106, 11, -1, 72, 20, 6.5, 9);
      b.lava(108, 110);
      b.column(113, 1, 'W').cannon(113, 12, -1, 60, 10, 7).cannon(113, 10, -1, 60, 40, 7, 8).set(113, 11, 'W');
      b.lava(115, 117);
      b.cannon(121, 12, -1, 56, 0, 7.5).cannon(121, 11, -1, 56, 28, 7.5);
      // 5. コウモリ渡り: 27 tiles of lava crossed only by stomping circling bats (take a running start)
      b.ground(125, 128, 'W');
      b.lava(129, 155);
      [[132, 10], [136, 9], [140, 10], [144, 9], [148, 10], [152, 9]].forEach(([c, r], i) => b.bat(c, r, 26, 24, 0.045, i * 1.3));
      b.cross(140, 3, 5, 0.03, 0.4);
      // 6. トゲトンネル改: the spiked ceiling leaves room only for a one- or two-frame tap of A
      b.ground(156, 190, 'W');
      for (let c = 160; c <= 184; c++) { for (let r = 0; r <= 8; r++) b.set(c, r, 'W'); b.set(c, 9, 'w'); }
      for (const c of [164, 168, 172, 173, 177, 178, 182]) b.set(c, GT - 1, '^');
      // 7. せまりくるトゲかべ: once you pass column 192 a spike wall chases you
      b.chaseWall(192, 190, 7.6, 226);
      b.ground(191, 196, 'W');
      b.lava(197, 211);
      b.column(200, 2, 'W').column(204, 1, 'W').column(208, 3, 'W');
      b.podo(202, 80, 0, 420).podo(206, 80, 40, 420).podo(210, 80, 20, 420);
      b.ground(212, 216, 'W');
      b.cross(214, 10, 4, -0.05, 0.3);
      b.lava(217, 225);
      b.column(220, 2, 'W').column(223, 2, 'W');
      b.podo(218, 90, 10, 430).podo(221, 90, 55, 430).podo(224, 90, 30, 430);
      // 8. ラストアタック: blinking steps, then the goal
      b.ground(226, 229, 'W');
      b.lava(230, 238);
      b.blink(232, 11, 90, 45, 0).blink(235, 10, 90, 45, -30);
      b.podo(237, 90, 60, 430);
      b.ground(239, 261, 'W');
      b.enemy(244);
      b.flag(249).house(254);
      return b.done({
        world: 'EX-2', name: 'しんえんの とりで', music: 'boss', ex: true, noFly: true, time: 500, hazards: b.hazards,
        cast: 'kon', tasKey: 'ex2', diff: '超鬼ムズ', rule: ['トゲかべが せまってくる!', 'ノーミスで クリアせよ!'],
        sections: [
          { c: 10, name: 'きえる足場' }, { c: 43, name: 'クロスファイアバー' }, { c: 72, name: 'トゲプレス回廊' },
          { c: 97, name: 'てっきゅう砲台' }, { c: 129, name: 'コウモリ渡り' }, { c: 158, name: 'トゲトンネル改' },
          { c: 192, name: 'せまりくるトゲかべ' }, { c: 228, name: 'ラストアタック' },
        ],
      });
    },
  ];

  AP.LEVEL_COUNT = LEVELS.length;
  AP.buildLevel = (i) => LEVELS[i]();
})(typeof window !== 'undefined' ? window : globalThis);
