'use strict';
// 共通の定数・数学ヘルパー・打球の物理
(function () {
  const HR = (window.HR = window.HR || {});

  HR.W = 1080;
  HR.H = 1920;
  HR.DEG = Math.PI / 180;
  HR.MAX_ANISO = parseInt(new URLSearchParams(location.search).get('aniso'), 10) || 16;
  HR.FONT_UI = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic", "Meiryo", "IPAGothic", sans-serif';
  HR.FONT_IMPACT = '"Dela Gothic One", "M PLUS Rounded 1c", "Hiragino Sans", "Yu Gothic", "IPAGothic", sans-serif';

  HR.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  HR.lerp = (a, b, t) => a + (b - a) * t;
  HR.smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  HR.easeOutCubic = (t) => 1 - Math.pow(1 - HR.clamp(t, 0, 1), 3);
  HR.easeInOut = (t) => -(Math.cos(Math.PI * HR.clamp(t, 0, 1)) - 1) / 2;
  HR.easeOutBack = (t) => {
    t = HR.clamp(t, 0, 1);
    const c1 = 1.9, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };
  // dt に依存しない指数補間係数
  HR.damp = (rate, dt) => 1 - Math.exp(-rate * dt);

  HR.makeRng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // キーフレーム補間。frames = [[時刻, [値...]], ...]
  // spline=true で Catmull-Rom(スイングなど速い動き用)、false でサイン補間。
  HR.keys = function (frames, t, spline) {
    const n = frames.length;
    if (t <= frames[0][0]) return frames[0][1].slice();
    if (t >= frames[n - 1][0]) return frames[n - 1][1].slice();
    let i = 1;
    while (t > frames[i][0]) i++;
    const t0 = frames[i - 1][0], t1 = frames[i][0];
    const u = (t - t0) / (t1 - t0);
    const a = frames[i - 1][1], b = frames[i][1];
    if (!spline) {
      const e = HR.easeInOut(u);
      return a.map((v, k) => v + (b[k] - v) * e);
    }
    const p0 = frames[Math.max(0, i - 2)][1], p3 = frames[Math.min(n - 1, i + 1)][1];
    const u2 = u * u, u3 = u2 * u;
    return a.map((p1, k) => {
      const p2 = b[k];
      return 0.5 * (2 * p1 + (-p0[k] + p2) * u + (2 * p0[k] - 5 * p1 + 4 * p2 - p3[k]) * u2 + (-p0[k] + 3 * p1 - 3 * p2 + p3[k]) * u3);
    });
  };

  // ---------------------------------------------------------------
  // 球場と物理
  // 座標系: ホームベース原点、+y 上、-z がセンター方向、+x が一塁(ライト)側。
  // phi はセンター方向から測った角度(+ がライト)。
  // ---------------------------------------------------------------
  HR.PHYS = { g: 9.8, k: 0.0042, ballR: 0.12, fenceH: 4.2, standRise: 0.62 };
  HR.FOUL_LIMIT = 45 * HR.DEG;

  // 両翼100m・中堅122m
  HR.fenceR = function (phi) {
    const a = Math.min(Math.abs(phi), 60 * HR.DEG);
    return 100 + 22 * Math.cos(2 * a);
  };

  // 障害物なしで地面(y=0)に落ちるまでの水平距離 = 飛距離
  HR.carryDist = function (p0, v0) {
    const P = HR.PHYS, dt = 1 / 240;
    let x = p0.x, y = p0.y, z = p0.z, vx = v0.x, vy = v0.y, vz = v0.z;
    for (let i = 0; i < 240 * 15; i++) {
      const sp = Math.hypot(vx, vy, vz);
      vx += -P.k * sp * vx * dt;
      vy += (-P.g - P.k * sp * vy) * dt;
      vz += -P.k * sp * vz * dt;
      x += vx * dt; y += vy * dt; z += vz * dt;
      if (y <= 0) break;
    }
    return Math.hypot(x, z);
  };

  // 打球を最後までシミュレーションし、再生用の軌跡と判定を返す。
  HR.simulateBatted = function (p0, v0, meta) {
    const P = HR.PHYS, dt = 1 / 240, r = P.ballR;
    let x = p0.x, y = p0.y, z = p0.z, vx = v0.x, vy = v0.y, vz = v0.z, t = 0;
    const pts = [];
    let result = null, landT = null, landDist = 0, hrT = null, fenceT = null;
    let apexY = y, apexT = 0, inStands = false, stopped = false, wallHit = false;
    for (let i = 0; i < 240 * 9 && !stopped; i++) {
      if (i % 2 === 0) pts.push(t, x, y, z);
      const sp = Math.hypot(vx, vy, vz);
      vx += -P.k * sp * vx * dt;
      vy += (-P.g - P.k * sp * vy) * dt;
      vz += -P.k * sp * vz * dt;
      x += vx * dt; y += vy * dt; z += vz * dt; t += dt;
      if (y > apexY) { apexY = y; apexT = t; }
      const D = Math.hypot(x, z), phi = Math.atan2(x, -z);
      const R = HR.fenceR(phi);
      const fair = Math.abs(phi) <= HR.FOUL_LIMIT;
      if (!inStands && D >= R) {
        if (y > P.fenceH && !wallHit) {
          inStands = true;
          if (!result) result = fair ? 'hr' : 'foul';
          if (result === 'hr') hrT = t;
        } else {
          const nx = x / D, nz = z / D, vn = vx * nx + vz * nz;
          if (vn > 0) { vx -= 1.45 * vn * nx; vz -= 1.45 * vn * nz; }
          x = nx * (R - 0.02); z = nz * (R - 0.02);
          wallHit = true;
          if (!result) { result = fair ? 'hit' : 'foul'; fenceT = t; }
          if (landT === null) { landT = t; landDist = R; }
        }
      }
      if (inStands) {
        const hs = P.fenceH + (Math.hypot(x, z) - R) * P.standRise;
        if (y <= hs + r) {
          if (landT === null) { landT = t; landDist = D; }
          y = hs + r;
          if (t - (hrT || t) > 0.05) stopped = true;
        }
      } else if (y <= r) {
        y = r;
        if (landT === null) {
          landT = t; landDist = D;
          if (!result) result = HR.classifyLanding(D, phi, apexY, meta);
        }
        if (vy < 0) { vy = -vy * 0.38; vx *= 0.7; vz *= 0.7; }
        if (Math.abs(vy) < 0.9) {
          vy = 0;
          const hs = Math.hypot(vx, vz);
          if (hs < 0.5) stopped = true;
          else { const f = Math.max(0, hs - 6 * dt) / hs; vx *= f; vz *= f; }
        }
      }
      if (t > 8) stopped = true;
    }
    pts.push(t, x, y, z);
    if (!result) result = 'out';
    return {
      pts: Float32Array.from(pts), result, landT, landDist, hrT, fenceT, apexY, apexT,
      dur: t, carry: HR.carryDist(p0, v0),
    };
  };

  // バットとボールの当たり方から打球の初速・角度・方向を決める。
  // c.e: カーソル中心からのずれ(0..1)、c.dx/c.dy: 正規化したずれ、c.d: タイミング差(秒、+が遅れ)
  HR.SWING_DELAY = 0.1;
  HR.TIMING_W = 0.1;
  HR.contactToLaunch = function (c, power, gauss) {
    const q = 1 - 0.75 * c.e * c.e;
    const tq = 1 - 0.55 * Math.pow(Math.abs(c.d) / HR.TIMING_W, 2);
    let kmh = (103 + 80 * q * tq) * (power ? 1.06 : 1.0) + gauss() * 3;
    let launch = 13 + 40 * c.dy + (power ? 3 : 0) + gauss() * 3;
    if (c.e > 0.8) { kmh *= 0.82; launch += gauss() * 12; }
    const spray = (-c.d / HR.TIMING_W) * 46 + c.dx * 7 + gauss() * 4;
    return { kmh, launch: HR.clamp(launch, -30, 75), spray, quality: q * tq };
  };

  HR.classifyLanding = function (D, phi, apexY, meta) {
    if (Math.abs(phi) > HR.FOUL_LIMIT) return 'foul';
    const kmh = meta ? meta.kmh : 120, launch = meta ? meta.launch : 20;
    if (D >= 48 && apexY < 34) return 'hit';
    if (launch < 12 && kmh >= 140 && D >= 12) return 'hit';
    return 'out';
  };

  // 軌跡データ(t,x,y,z の並び)から時刻 t の位置を求める
  HR.samplePath = function (pts, t, out) {
    const n = pts.length / 4;
    if (t <= 0) { out.set(pts[1], pts[2], pts[3]); return out; }
    let lo = 0, hi = n - 1;
    if (t >= pts[hi * 4]) { out.set(pts[hi * 4 + 1], pts[hi * 4 + 2], pts[hi * 4 + 3]); return out; }
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (pts[m * 4] <= t) lo = m; else hi = m;
    }
    const t0 = pts[lo * 4], t1 = pts[hi * 4], u = (t - t0) / (t1 - t0 || 1);
    out.set(
      HR.lerp(pts[lo * 4 + 1], pts[hi * 4 + 1], u),
      HR.lerp(pts[lo * 4 + 2], pts[hi * 4 + 2], u),
      HR.lerp(pts[lo * 4 + 3], pts[hi * 4 + 3], u)
    );
    return out;
  };

  // ---------------------------------------------------------------
  // 実況セリフ・テキスト(フォントの事前読み込みにも使う)
  // ---------------------------------------------------------------
  HR.LINES = {
    intro: ['さあ、パン工場スタジアムからホームラン競争をお届けします!'],
    pitcher: ['マウンドには、最速168キロのバタコさん!'],
    batter: ['バッターは、パン作りで鍛えた怪力 ジャムおじさん!'],
    first: ['プレイボール!'],
    ready: ['バタコさん、新しい顔を手に構えます', 'さあ、次の一球!', '投げるのはもちろん、アンパンマンの顔!', 'のこり{n}球!', 'ジャムおじさん、どっしり構えた'],
    windup: ['バタコさん、振りかぶって…', '第{k}球…'],
    release: ['投げた!'],
    contactBig: ['打ったー!', 'カキーン!打ったー!', '捉えたー!'],
    contact: ['打った!', '当てた!'],
    flyBig: ['大きい!大きい!', 'これは行ったか!?', '伸びる!伸びる!'],
    hr: ['入ったー!ホームラン!!', 'スタンドへ一直線!ホームラン!', '焼きたての一発!ホームラン!'],
    hrFar: ['{d}メートルの特大アーチ!', '場外まで行きそうな{d}メートル!'],
    hrNormal: ['飛距離{d}メートル!', 'ジャムおじさん、見事な一発!'],
    hit: ['ヒット!いい当たり!', '外野の前に落ちた!ヒット!'],
    wall: ['フェンス直撃!惜しい!'],
    out: ['打ち上げた…平凡なフライ', 'ボテボテのゴロ…', '伸びない…アウト'],
    foul: ['ファウル!', '惜しい!切れてファウル!'],
    whiff: ['空振り!', 'バットが空を切った!', 'タイミングが合わない!'],
    // 球種ごとの空振り実況(HR.WHIFF_KEY で球種名と対応)
    whiffStraight: ['168キロ!振り遅れた!', '速い!168キロのストレートに空振り!'],
    whiffSlider: ['えげつないスライダー!空振り!', 'スライダーがぐいっと曲がった!'],
    whiffSFF: ['消えた!SFFがストンと落ちた!', 'SFFにバットが空を切る!'],
    whiffShoot: ['シュートが食い込む!空振り!', '内角をえぐるシュート!手が出ない!'],
    whiffStreak: ['これで{k}球連続の空振り!', 'ジャムおじさん、かすりもしない!', 'バタコさん、完全に手玉に取っている!'],
    look: ['見逃し!', 'じっくり見たが…見逃し'],
    finish: ['ホームラン競争、終了!ジャムおじさん、ホームラン{n}本!'],
    finishZero: ['ホームラン競争、終了!まさかの全球空振り!バタコさんの完全勝利!'],
    batako: ['新しい顔よ!', 'それ!'],
    bubble: ['よーし!', 'うまく焼けたぞ!', 'やったぞー!', 'まだまだ若いもんには負けんぞ!'],
  };

  HR.WHIFF_KEY = { 'ストレート': 'whiffStraight', 'スライダー': 'whiffSlider', 'SFF': 'whiffSFF', 'シュート': 'whiffShoot' };

  HR.RANKS = [
    [0, '見習いパン職人'],
    [1, 'パン工場の代打'],
    [3, 'パン工場の5番打者'],
    [5, 'パン工場の4番打者'],
    [7, '焼きたてスラッガー'],
    [9, '伝説のホームランベーカー'],
  ];
  HR.rankFor = (n) => HR.RANKS.reduce((acc, r) => (n >= r[0] ? r[1] : acc), HR.RANKS[0][1]);

  HR.UI_TEXT =
    'いまの打者の記録これまでの最高記録ヒットホームラン最長飛距離スコア本点球のこりバタコジャムおじさん投打弾道ミートパワー走力コントロールスタミナ' +
    '強振ミート打ちストレートカーブスライダーフォークシュートニューフェイス飛距離空振り見逃しファウルアウト結果発表称号新記録もう一度タップクリックでスタート' +
    'ピッチャーバッターパン工場スタジアム競争マウスで照準をあわせる指でドラッグしてはなすと打つキー切替録画中ナイスバッティング' +
    '最速変化球SFF完全勝利音声' +
    'PITCHERBATTERHOMERUNPLAYBALLNEWRECORDkm/h0123456789!?…ー、。・「」+-:%()';
  HR.allText = function () {
    let s = HR.UI_TEXT;
    for (const k in HR.LINES) s += HR.LINES[k].join('');
    for (const r of HR.RANKS) s += r[1];
    return Array.from(new Set(Array.from(s))).join('');
  };
})();
