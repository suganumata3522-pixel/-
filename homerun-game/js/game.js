'use strict';
// ゲーム本体: 進行管理・投球・打撃判定・カメラ・入力・録画
(function () {
  const HR = window.HR;
  const T = THREE;
  const W = HR.W, H = HR.H, DEG = HR.DEG;

  const qs = new URLSearchParams(location.search);
  const OFFLINE = qs.get('record') === '1';
  const SEED = parseInt(qs.get('seed'), 10) || (OFFLINE ? 7 : Date.now() % 100000);
  const TOTAL_BALLS = HR.clamp(parseInt(qs.get('balls'), 10) || 5, 1, 30);
  const OFFLINE_FPS = parseInt(qs.get('fps'), 10) || 30;
  // ai=whiff: オートのジャムおじさんが一球も当てられない(動画用)
  const AI_MODE = qs.get('ai') === 'whiff' ? 'whiff' : 'normal';
  // 9回裏2アウト満塁の名場面。sayonara: 空振り三振でゲームセット、gyakuten: 逆転サヨナラ満塁ホームラン、
  // anpanman: ホームラン性の当たりをアンパンマンが空中でキャッチ(?scene=sayonara / #sayonara などで開く)
  const SCENE_PARAM = qs.get('scene') || location.hash.slice(1);
  const SCENE_KINDS = { sayonara: 'strikeout', gyakuten: 'homerun', anpanman: 'catch' };
  let sceneKind = SCENE_KINDS[SCENE_PARAM] || null;
  let sceneMode = !!sceneKind;

  let rng = HR.makeRng(SEED);
  const fxRng = HR.makeRng(SEED + 1); // 画面揺れなど見た目だけの乱数(試合結果に影響させない)
  const rr = (a, b) => a + (b - a) * rng();
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const gauss = () => { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

  // ---------------- 定数 ----------------
  const ZONE = { x0: -0.45, x1: 0.45, y0: 0.35, y1: 1.35 };
  const CUR = { meet: { rx: 0.2, ry: 0.155 }, power: { rx: 0.14, ry: 0.11 } };
  const CUR_LIMIT = { x0: -0.75, x1: 0.75, y0: 0.12, y1: 1.62 };
  const SWING_DELAY = HR.SWING_DELAY, TIMING_W = HR.TIMING_W;
  const BALL_SLOW = 1.45; // 投球は実際より少しゆっくり(遊びやすさ優先)
  const FLIGHT_SPEED = 2.0; // 打球の再生速度
  const PITCHER_POS = new T.Vector3(0, 0.25, -18.7);
  const BATTER_POS = new T.Vector3(0.98, 0, 0.1);
  const BAT_CAM = { pos: new T.Vector3(0.12, 1.5, 4.7), look: new T.Vector3(0.0, 1.02, -18), fov: 50 };
  // 振りかぶり(吹き出し「アンパンマン!」)で一度止まり、「新しい顔よ!」で投げ始めて「それっ!」でリリース
  const RELEASE_T = 1.6;
  const FACE_LEAD = 0.94; // 吹き出しを「新しい顔よ!」に切り替える、リリースの何秒前か

  // バタコさんの持ち球: 最速168km/hのストレートと、変化量MAX(7)のスライダー・SFF・シュート。
  // bx/by は変化量(m)。ボールは目標から変化量ぶんずれた所へ向かい、終盤で曲がって目標に届く。
  const PITCHES = [
    { name: 'ストレート', kmh: [168, 168], bx: 0, by: 0.03, arc: 0.03, w: 4 },
    { name: 'スライダー', kmh: [138, 143], bx: 0.62, by: -0.08, arc: 0.08, w: 2.5 },
    { name: 'SFF', kmh: [144, 149], bx: 0.04, by: -0.58, arc: 0.05, w: 2 },
    { name: 'シュート', kmh: [143, 148], bx: -0.5, by: -0.14, arc: 0.06, w: 1.6 },
  ];

  // ---------------- 描画の準備 ----------------
  const screen = document.getElementById('screen');
  screen.width = W;
  screen.height = H;
  const g = screen.getContext('2d');

  let renderer, scene, camera, batCam, stadium, batako, jam, ballM, anpan, runners = [];
  let shadows = {}, trail = [], halo;
  let renderScale = 1;

  function setupScene() {
    renderer = new T.WebGLRenderer({ antialias: qs.get('aa') !== '0', powerPreference: 'high-performance', preserveDrawingBuffer: OFFLINE });
    renderer.setPixelRatio(1);
    renderer.setSize(W * renderScale, H * renderScale, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(BAT_CAM.fov, W / H, 0.3, 4000);
    batCam = new T.PerspectiveCamera(BAT_CAM.fov, W / H, 0.3, 4000);
    batCam.position.copy(BAT_CAM.pos);
    batCam.lookAt(BAT_CAM.look);
    batCam.updateMatrixWorld();
    stadium = HR.Stadium.build(scene);
    batako = HR.Models.makeBatako();
    jam = HR.Models.makeJam();
    ballM = HR.Models.makeBall();
    scene.add(batako.root, jam.root, ballM.root);
    batako.root.position.copy(PITCHER_POS);
    jam.root.position.copy(BATTER_POS);
    jam.root.rotation.y = -Math.PI / 2;
    // 満塁のランナー(1塁・2塁・3塁で次の塁へリード)。名場面のときだけ表示
    runners = [[17.3, -21.5], [-2.1, -36.7], [-17.3, -17.3]].map(([x, z]) => {
      const m = HR.Models.makeRunner('#8a5a2b');
      m.base = { x, z, rot: Math.atan2(-x, -z) };
      m.root.position.set(x, 0, z);
      m.root.rotation.y = m.base.rot;
      m.root.visible = false;
      m.shadow = HR.Models.blob(1.1, 0.9, 0.8);
      m.shadow.position.set(x, 0.02, z);
      m.shadow.visible = false;
      scene.add(m.root, m.shadow);
      return m;
    });
    // アンパンマン(好捕の場面だけ空から飛んでくる)
    anpan = HR.Models.makeAnpanman();
    anpan.root.visible = false;
    scene.add(anpan.root);
    shadows.jam = HR.Models.blob(1.2, 1.0, 0.9);
    shadows.batako = HR.Models.blob(1.2, 1.0, 0.9);
    shadows.ball = HR.Models.blob(0.4, 0.4, 0.8);
    shadows.anpan = HR.Models.blob(1.0, 0.9, 0.7);
    shadows.anpan.visible = false;
    scene.add(shadows.jam, shadows.batako, shadows.ball, shadows.anpan);
    const dot = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const gr = x.createRadialGradient(32, 32, 2, 32, 32, 31);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,230,0.8)');
      gr.addColorStop(1, 'rgba(255,255,200,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      return new T.CanvasTexture(c);
    })();
    const TRAIL = 50;
    for (let i = 0; i < TRAIL; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, sizeAttenuation: false, opacity: 0.8 * (1 - i / TRAIL) }));
      s.scale.setScalar(0.024 * (1 - i / (TRAIL * 1.25)));
      s.visible = false;
      scene.add(s);
      trail.push(s);
    }
    halo = new T.Sprite(new T.SpriteMaterial({ map: dot, transparent: true, depthWrite: false, sizeAttenuation: false, opacity: 0.7 }));
    halo.scale.setScalar(0.03);
    halo.visible = false;
    scene.add(halo);
  }

  // ---------------- ゲーム状態 ----------------
  const S = {
    phase: 'title', now: 0, pt: 0,
    balls: TOTAL_BALLS, pitchNo: 0,
    stats: { hit: 0, hr: 0, longest: 0, score: 0 },
    best: loadBest(),
    power: false, auto: OFFLINE || qs.get('auto') === '1',
    cursor: { x: 0, y: 0.85 }, curTarget: { x: 0, y: 0.85 },
    pitch: null, swing: null, batted: null, ai: null,
    caption: null, banner: null, cutin: null, finish: null, intro: null, title: { t0: 0 },
    pitchInfo: null, flash: 0, shake: 0, excite: 0, cursorFlash: 0,
    done: false, live: !OFFLINE,
  };
  const cam = { pos: new T.Vector3(), look: new T.Vector3() };
  const tmpV = new T.Vector3(), tmpV2 = new T.Vector3();

  function loadBest() {
    const z = { hit: 0, hr: 0, longest: 0, score: 0 };
    if (OFFLINE) return z;
    try { return Object.assign(z, JSON.parse(localStorage.getItem('jam-hr-best') || '{}')); } catch (e) { return z; }
  }
  function saveBest() {
    if (OFFLINE) return;
    try { localStorage.setItem('jam-hr-best', JSON.stringify(S.best)); } catch (e) { /* 保存できない環境では無視 */ }
  }

  function say(key, vars, opts) {
    const list = HR.LINES[key];
    if (!list) return;
    narrate(fill(pick(list), vars || {}), opts);
  }
  function narrate(text, opts) {
    S.caption = { text, t0: S.now };
    if (!(opts && opts.quiet)) HR.Voice.say(text, !(opts && opts.queue));
  }
  const sfx = (name, opt) => HR.Audio.play(name, opt);
  const curSize = () => (S.power ? CUR.power : CUR.meet);

  // ---------------- 進行 ----------------
  function setPhase(p) { S.phase = p; S.pt = 0; }

  function startGame() {
    if (sceneMode) { startScene(); return; }
    S.mode = 'derby';
    S.tan = null;
    S.btan = null;
    S.speech = null;
    S.anp = null; S.cfx = null; S.speech2 = null;
    resetScenery();
    rng = HR.makeRng(SEED + (S.runs || 0) * 7919);
    S.runs = (S.runs || 0) + 1;
    S.balls = TOTAL_BALLS;
    S.pitchNo = 0;
    S.stats = { hit: 0, hr: 0, longest: 0, score: 0 };
    S.streak = 0;
    S.contacts = 0;
    S.finish = null; S.title = null; S.banner = null; S.cutin = null; S.pitchInfo = null;
    HR.HUD.clearParticles();
    stadium.drawScreen('ホームラン競争', 'HR 0本', false);
    setPhase('intro');
    S.intro = { stage: 'title', t0: S.now };
    say('intro', null, { queue: true });
    sfx('organ');
    sfx('cheer', { level: 0.35, dur: 3 });
  }

  function nextPitch() {
    S.banner = null; S.cutin = null; S.batted = null; S.swing = null; S.pitch = null; S.ai = null; S.pitchInfo = null; S.batakoSay = null;
    ballM.setDizzy(false);
    if (S.screenDirty) { stadium.drawScreen('ホームラン競争', `HR ${S.stats.hr}本`, false); S.screenDirty = false; }
    for (const s of trail) s.visible = false;
    halo.visible = false;
    if (S.mode === 'scene') { scenePitch(); return; }
    if (S.balls <= 0) return finishGame();
    S.pitchNo++;
    setPhase('ready');
    if (S.pitchNo === 1) {
      S.banner = { kind: 'play', t0: S.now };
      say('first');
      sfx('whistle');
    } else if (rng() < 0.6) {
      // バタコさんのセリフと重ならないよう、構えの実況は読み上げずテロップだけ
      say('ready', { n: S.balls }, { quiet: true });
    } else {
      S.caption = null;
    }
    if (S.auto) S.power = rng() < (AI_MODE === 'whiff' ? 0.7 : 0.55);
  }

  function finishGame() {
    setPhase('finish');
    const st = S.stats;
    const newRecord = st.score > S.best.score;
    S.best = { hit: Math.max(S.best.hit, st.hit), hr: Math.max(S.best.hr, st.hr), longest: Math.max(S.best.longest, st.longest), score: Math.max(S.best.score, st.score) };
    saveBest();
    const perfect = S.contacts === 0;
    // 一球も当たらなかったときは、結果発表の前にジャムおじさんが悔しがる
    if (perfect) startTantrum('toss');
    S.finish = { t0: S.now + (perfect ? 6.2 : 0.6), stats: Object.assign({}, st), rank: HR.rankFor(st.hr), newRecord, perfect };
    say(perfect ? 'finishZero' : 'finish', { n: st.hr });
    sfx('cheer', { level: 0.5, dur: 3.5 });
    if (perfect) sfx('organ');
    if (st.hr >= 3) { sfx('fanfare'); HR.HUD.confetti(160); }
  }

  function makePitch() {
    let type = PITCHES[0], kmh, tx, ty;
    if (S.mode === 'scene') {
      const e = sceneScript()[S.sc.i];
      type = PITCHES.find((p) => p.name === e.name);
      kmh = e.kmh; tx = e.tx; ty = e.ty;
    } else {
      const total = PITCHES.reduce((a, p) => a + p.w, 0);
      let r = rng() * total;
      for (const p of PITCHES) { r -= p.w; if (r <= 0) { type = p; break; } }
      kmh = Math.round(rr(type.kmh[0], type.kmh[1]));
      tx = HR.clamp(gauss() * 0.17, -0.4, 0.4);
      ty = HR.clamp(0.86 + gauss() * 0.19, 0.45, 1.28);
    }
    batako.handR.getWorldPosition(tmpV);
    const sx = tmpV.x, sy = tmpV.y + 0.02, sz = tmpV.z + 0.12;
    const dist = Math.hypot(tx - sx, ty - sy, sz);
    const Tm = (dist / (kmh / 3.6)) * BALL_SLOW;
    return { name: type.name, kmh, sx, sy, sz, tx, ty, bx: type.bx, by: type.by, arc: type.arc, T: Tm, t0: S.now, spin: type.name === 'ストレート' ? 4 : 12 };
  }

  function pitchPos(p, s, out) {
    if (s <= 1) {
      const s3 = s * s * s;
      out.set(
        HR.lerp(p.sx, p.tx - p.bx, s) + p.bx * s3,
        HR.lerp(p.sy, p.ty - p.by, s) + p.by * s3 + p.arc * 4 * s * (1 - s),
        HR.lerp(p.sz, 0, s)
      );
    } else {
      const u = s - 1;
      const dx = p.tx - p.bx - p.sx + 3 * p.bx, dy = p.ty - p.by - p.sy + 3 * p.by - 4 * p.arc, dz = -p.sz;
      out.set(p.tx + dx * u, p.ty + dy * u - 2 * u * u, dz * u);
    }
    return out;
  }

  function trySwing() {
    if (S.swing) return;
    if (S.phase !== 'pitch') return;
    const c = { x: S.cursor.x, y: S.cursor.y };
    S.swing = { t0: S.now, cx: c.x, cy: c.y, power: S.power };
    sfx('swing');
    S.cursorFlash = 0.15;
    const p = S.pitch;
    if (!p) return;
    const ta = p.t0 + p.T, tc = S.now + SWING_DELAY, d = tc - ta;
    const cs = curSize();
    const dx = (p.tx - c.x) / cs.rx, dy = (p.ty - c.y) / cs.ry, e = Math.hypot(dx, dy);
    if (Math.abs(d) <= TIMING_W && e <= 1) S.swing.contact = { tc, d, dx, dy, e };
  }

  function doContact() {
    const c = S.swing.contact, p = S.pitch;
    const s = (S.now - p.t0) / p.T;
    const p0 = pitchPos(p, Math.min(s, 1.06), new T.Vector3());
    const L = S.ai && S.ai.forced ? Object.assign({}, S.ai.forced) : HR.contactToLaunch(c, S.swing.power, gauss);
    const v = L.kmh / 3.6, th = L.launch * DEG, ph = L.spray * DEG;
    const v0 = { x: v * Math.cos(th) * Math.sin(ph), y: v * Math.sin(th), z: -v * Math.cos(th) * Math.cos(ph) };
    const sim = HR.simulateBatted({ x: p0.x, y: p0.y, z: p0.z }, v0, L);
    S.batted = { sim, L, ft: 0, t0: S.now, events: {}, dir: { x: Math.sin(ph), z: -Math.cos(ph) } };
    if (S.mode === 'scene' && S.sc.kind === 'catch' && sim.result === 'hr') setupCatch(S.batted);
    S.streak = 0;
    S.contacts++;
    setPhase('batted');
    const big = L.quality > 0.7 && L.launch > 12;
    sfx('hit', { power: HR.clamp(0.45 + L.quality * 0.7, 0.4, 1) });
    sfx('cheer', { level: big ? 0.55 : 0.3, dur: big ? 2.5 : 1.5 });
    say(big ? 'contactBig' : 'contact');
    S.flash = big ? 0.45 : 0.2;
    S.shake = big ? 0.05 : 0.02;
    S.excite = big ? 0.6 : 0.3;
    ballM.setDizzy(true);
    cam.pos.copy(camera.position);
    cam.look.copy(p0);
  }

  function resolveBatted(kind) {
    const b = S.batted, sim = b.sim;
    if (S.mode === 'scene' && kind === 'hr') { sceneHomer(b); return; }
    if (S.mode === 'scene') {
      S.sc.s = Math.min(2, S.sc.s + 1);
      S.banner = { kind: 'foul', t0: S.now };
      narrate(HR.SCENE.result[S.sc.i]);
      sfx('groan');
      b.kind = 'foul';
      return;
    }
    let dist = Math.round(kind === 'hr' ? sim.carry : sim.landDist);
    if (kind === 'hr') {
      S.stats.hr++;
      S.stats.hit++;
      S.stats.score += 100 + dist;
      S.stats.longest = Math.max(S.stats.longest, dist);
      S.banner = { kind: 'hr', t0: S.now, dist };
      say('hr');
      sfx('fanfare');
      sfx('cheer', { level: 0.9, dur: 4 });
      sfx('firework');
      HR.HUD.confetti(140);
      for (let i = 0; i < 3; i++) HR.HUD.burst(180 + rng() * 720, 250 + rng() * 500);
      S.fireworkT = S.now;
      S.flash = 0.5;
      S.excite = 1;
      stadium.drawScreen('HOME RUN!', `HR ${S.stats.hr}本  ${dist}m`, true);
      S.screenDirty = true;
    } else if (kind === 'hit' || kind === 'wall') {
      S.stats.hit++;
      S.stats.score += 10;
      S.stats.longest = Math.max(S.stats.longest, dist);
      S.banner = { kind, t0: S.now };
      say(kind === 'wall' ? 'wall' : 'hit');
      sfx('cheer', { level: 0.5, dur: 2 });
      S.excite = 0.5;
    } else {
      S.banner = { kind, t0: S.now };
      say(kind);
      sfx('groan');
      S.excite = 0;
    }
    b.kind = kind;
    if (OFFLINE) (window.__log = window.__log || []).push(kind === 'hr' ? `HR${dist}` : kind);
  }

  // ---------------- 名場面: 9回裏2アウト満塁、一打サヨナラのピンチ ----------------
  // バタコさん(3-2でリード)がジャムおじさんを空振り三振に仕留める。1球ごとの結果は決め打ち。
  const SAYONARA = [
    { name: 'シュート', kmh: 145, tx: -0.66, ty: 0.62, act: 'take', result: 'ball' },
    { name: 'スライダー', kmh: 141, tx: 0.22, ty: 0.62, act: 'whiff', result: 'strike' },
    { name: 'SFF', kmh: 147, tx: 0.05, ty: 0.16, act: 'take', result: 'ball' },
    { name: 'ストレート', kmh: 168, tx: 0.12, ty: 0.98, act: 'foul', result: 'foul' },
    { name: 'ストレート', kmh: 168, tx: -0.08, ty: 1.6, act: 'take', result: 'ball' },
    { name: 'SFF', kmh: 148, tx: 0.0, ty: 0.3, act: 'whiff', result: 'strikeout' },
  ];
  // 逆転版: フルカウントまで同じで、6球目の168km/hを打ち返す
  const SAYONARA_HR = SAYONARA.slice(0, 5).concat([{ name: 'ストレート', kmh: 168, tx: 0.06, ty: 0.86, act: 'homer', result: 'homer' }]);
  // 好捕版: 6球目は逆転版と同じ当たり。フェンスの手前でアンパンマンが空中でキャッチする
  const SAYONARA_CATCH = SAYONARA.slice(0, 5).concat([{ name: 'ストレート', kmh: 168, tx: 0.06, ty: 0.86, act: 'homer', result: 'catch' }]);
  const sceneScript = () => (S.sc.kind === 'homerun' ? SAYONARA_HR : S.sc.kind === 'catch' ? SAYONARA_CATCH : SAYONARA);
  // 逆転弾・好捕版は、フルカウント(5球目まで終わったところ)から始めて6球目だけを見せる
  const fromFullCount = (kind) => kind === 'homerun' || kind === 'catch';
  const teams = () => [
    { name: 'バタコ', score: S.sc.score[0], color: '#e8337a' },
    { name: 'ジャム', score: S.sc.score[1], color: '#1fae4a', batting: true },
  ];
  // 三振のあと: バタコさんの喜び → ジャムおじさん → 試合終了の画面(sEnd 開始からの秒数)
  const SCENE_END = { batako: 1.9, jam: 3.8, final: 10.6 };
  // 逆転弾のあと: ジャムおじさんの喜び → バタコさんが悔しがる → 試合終了の画面
  const SCENE_END_HR = { batako: 2.3, final: 9.0 };
  // 好捕の流れ。打球の時間(秒)で、フェンスを越える lead 秒前にキャッチ。approach 秒かけて飛んできて、carry 秒ボールを持って飛び去る
  const CATCH = { lead: 0.2, approach: 1.7, carry: 1.3, end: 1.25 };
  // 好捕のあと(sEnd 開始からの秒数): アンパンマンがホームへ降りてくる → ジャムおじさんが怒る → 試合終了の画面
  const SCENE_END_CATCH = { arrive: 1.5, say: 0.9, jam: 2.7, final: 10.2 };
  const ANP_HOVER = new T.Vector3(BATTER_POS.x - 0.83, 1.05, BATTER_POS.z - 0.54); // ジャムおじさんの斜め前(カメラ側)に浮かぶ
  // アンパンマンのポーズ [右手xyz, 左手xyz, 左足xyz, 右足xyz, ひねり(度), 前傾(度)]
  const ANP_FLY = [-0.4, 1.3, 0.42, 0.36, 0.45, -0.1, 0.08, 0.0, -0.12, -0.08, 0.04, -0.18, 0, 0];
  const ANP_HOLD = [-0.46, 1.28, 0.28, 0.42, 0.6, 0.05, 0.12, 0.0, 0.02, -0.12, 0.0, 0.02, 0, 6]; // 顔の横でボールを見せる
  const ANP_DODGE = [-0.42, 1.6, 0.15, 0.44, 1.38, 0.2, 0.14, 0.1, 0.06, -0.14, -0.02, -0.06, 0, -8];
  const ANP_CATCH = [-0.28, 1.72, 0.3, 0.36, 1.05, 0.25, 0.1, 0.0, -0.1, -0.1, 0.04, -0.14, 0, 0]; // 頭の上で右手キャッチ
  // 好捕のあとのカメラ: ジャムおじさんの正面寄り → 追いかけっこが入る引きの画(最後の画面は下に結果を出す)
  const CATCH_CAM = {
    pos: new T.Vector3(BATTER_POS.x - 4.8, 1.55, BATTER_POS.z + 1.4),
    look: new T.Vector3(BATTER_POS.x - 0.6, 1.9, BATTER_POS.z - 0.15),
    wide: new T.Vector3(BATTER_POS.x - 8.4, 1.7, BATTER_POS.z + 2.4),
    wideLook: new T.Vector3(BATTER_POS.x - 0.9, 0.6, BATTER_POS.z - 0.4),
  };
  // カメラから見た左右・奥行きの向き(追いかけっこで左右に逃げる向き)
  const CATCH_FWD = new T.Vector3().subVectors(CATCH_CAM.look, CATCH_CAM.pos).setY(0).normalize();
  const CATCH_RIGHT = new T.Vector3(-CATCH_FWD.z, 0, CATCH_FWD.x);
  // バタコさんが悔しがる流れ(始まってからの秒数)
  const B_TANTRUM_T = { anger: 0.9, hatUp: 1.2, release: 1.62, land: 1.72, glove: 2.33, pound: 3.1, cry: 3.4 };
  // [右手xyz, 左手xyz, 左足xyz, 右足xyz, ひねり(度), 前傾(度), しゃがみ(m)]
  const B_TANTRUM = [
    [0.0, [-0.28, 1.1, 0.34, 0.28, 1.1, 0.34, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, -6, 0]],
    [0.9, [-0.28, 1.12, 0.34, 0.28, 1.12, 0.34, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, -6, 0]],
    [1.2, [-0.18, 1.78, 0.12, 0.3, 0.9, 0.3, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, -4, 0]],
    [1.5, [-0.32, 2.08, 0.2, 0.3, 0.9, 0.3, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, -8, 0]],
    [1.66, [-0.36, 0.5, 0.5, 0.3, 0.9, 0.3, 0.17, 0.06, 0, -0.17, 0.06, 0, -10, 18, 0]],
    [1.95, [-0.3, 0.75, 0.3, 0.32, 0.9, 0.25, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, 4, 0]],
    [2.2, [-0.3, 0.75, 0.3, 0.55, 1.0, -0.3, 0.17, 0.06, 0, -0.17, 0.06, 0, 28, -6, 0]],
    [2.4, [-0.3, 0.75, 0.3, 0.62, 1.6, 0.5, 0.17, 0.06, 0, -0.17, 0.06, 0, -22, 10, 0]],
    [2.7, [-0.28, 1.45, 0.3, 0.28, 1.45, 0.3, 0.17, 0.06, 0, -0.17, 0.06, 0, 0, 0, 0]],
    [3.05, [-0.4, 1.15, 0.5, 0.4, 1.15, 0.5, 0.17, 0.06, -0.15, -0.17, 0.06, -0.15, 0, 40, -0.17]],
  ];
  const B_HAT_GROUND = new T.Vector3(-0.66, 0, 0.02); // バタコさんが帽子を叩きつける場所(バタコさん基準)
  const POUND_Y = 0.19; // こぶしがマウンドに当たる高さ(しゃがんだ状態のバタコさん基準)
  // ジャムおじさんが悔しがる流れ(始まってからの秒数)。帽子を叩きつけてバットをひざでへし折るまでは共通で、
  // collapse(名場面): 2本は足元に落ち、こぶしを突き上げたあと崩れ落ちる
  // toss(全球空振り): 折った2本を振りかぶってぶん投げ、こぶしを突き上げたまま
  const TANTRUM = { anger: 0.7, hatUp: 1.3, release: 1.85, land: 1.95, grab: 2.1, snap: 2.72 };
  // [右手xyz, 左手xyz, 左足xyz, 右足z, 前傾(rad)]
  const J_TANTRUM = [
    [0.0, [-0.3, 0.45, 0.22, 0.3, 0.45, 0.2, 0.18, 0.06, 0.0, 0.04, 0.28]],
    [0.7, [-0.3, 0.45, 0.22, 0.3, 0.45, 0.2, 0.18, 0.06, 0.0, 0.04, 0.28]],
    [1.1, [-0.32, 0.5, 0.22, 0.2, 1.4, 0.2, 0.18, 0.06, 0.0, 0.04, -0.04]],
    [1.3, [-0.32, 0.5, 0.22, 0.18, 1.86, 0.14, 0.18, 0.06, 0.0, 0.04, -0.06]],
    [1.7, [-0.32, 0.5, 0.22, 0.34, 2.15, 0.2, 0.18, 0.06, 0.0, 0.04, -0.12]],
    [1.85, [-0.32, 0.5, 0.22, 0.32, 0.55, 0.55, 0.18, 0.06, 0.0, 0.04, 0.22]],
    [2.1, [-0.3, 0.55, 0.36, 0.3, 0.55, 0.36, 0.18, 0.06, 0.0, 0.04, 0.1]],
    [2.6, [-0.3, 1.9, 0.3, 0.3, 1.9, 0.3, 0.06, 0.4, 0.26, 0.04, -0.1]],
    [2.72, [-0.3, 0.52, 0.38, 0.3, 0.52, 0.38, 0.06, 0.4, 0.26, 0.04, 0.2]],
    [3.0, [-0.4, 1.3, 0.22, 0.4, 1.3, 0.22, 0.18, 0.06, 0.0, 0.04, -0.08]],
    [4.7, [-0.4, 1.3, 0.22, 0.4, 1.3, 0.22, 0.18, 0.06, 0.0, 0.04, -0.08]],
    [5.3, [-0.26, 0.08, 0.6, 0.26, 0.08, 0.6, 0.18, 0.06, -0.2, -0.2, 0.95]],
  ];
  const J_TANTRUM_TOSS = J_TANTRUM.slice(0, 9).concat([
    [2.95, [-0.3, 1.05, 0.3, 0.3, 1.05, 0.3, 0.18, 0.06, 0.0, 0.04, -0.04]],
    [3.3, [-0.3, 1.05, 0.3, 0.3, 1.05, 0.3, 0.18, 0.06, 0.0, 0.04, -0.04]],
    [3.5, [-0.5, 1.75, -0.15, 0.5, 1.75, -0.15, 0.18, 0.06, 0.0, 0.04, -0.16]],
    [3.68, [-0.62, 1.05, 0.45, 0.62, 1.05, 0.45, 0.18, 0.06, 0.12, 0.04, 0.24]],
    [4.0, [-0.4, 1.3, 0.22, 0.4, 1.3, 0.22, 0.18, 0.06, 0.0, 0.04, -0.08]],
  ]);
  // charge(好捕): 帽子を叩きつけたあと、バットを両手で振り上げてアンパンマンに向かっていく
  const J_TANTRUM_CHARGE = J_TANTRUM.slice(0, 7).concat([
    [2.5, [-0.12, 1.92, 0.02, 0.1, 1.92, 0.02, 0.18, 0.06, 0.0, 0.04, -0.16]],
    [3.0, [-0.12, 1.92, 0.02, 0.1, 1.92, 0.02, 0.18, 0.06, 0.0, 0.04, -0.16]],
  ]);
  const TANTRUM_VARIANT = {
    collapse: { keys: J_TANTRUM, fists: 3.0, down: 4.7 },
    toss: { keys: J_TANTRUM_TOSS, toss: 3.62, fists: 3.95 },
    charge: { keys: J_TANTRUM_CHARGE, noSnap: true, raise: 2.1, yell: 2.35, rush: 2.95, swings: [3.6, 4.5, 5.4, 6.3, 7.2, 8.1, 9.0, 9.9, 10.8, 11.7] },
  };
  const HAT_GROUND = new T.Vector3(0.58, 0, 0.3); // 帽子を叩きつける場所(ジャムおじさん基準)

  function startScene() {
    S.mode = 'scene';
    const kind = sceneKind || 'strikeout', full = fromFullCount(kind);
    S.sc = { kind, i: full ? 4 : -1, b: full ? 3 : 0, s: full ? 2 : 0, o: 2, ev: {}, score: [3, 2] };
    S.tan = null;
    S.btan = null;
    S.anp = null; S.cfx = null; S.speech2 = null;
    S.finish = null; S.title = null; S.banner = null; S.cutin = null; S.pitchInfo = null; S.final = null; S.speech = null;
    S.stats = { hit: 0, hr: 0, longest: 0, score: 0 };
    S.auto = true;
    S.power = true;
    resetScenery();
    for (const r of runners) { r.root.visible = true; r.shadow.visible = true; }
    HR.HUD.clearParticles();
    stadium.drawScreen('9回裏', 'バタコ 3 - 2 ジャム', false);
    setPhase('sIntro');
    S.intro = { stage: 'scene', t0: S.now, full };
    narrate(full ? HR.SCENE.introFull : HR.SCENE.intro, { queue: true });
    sfx('organ');
    sfx('cheer', { level: 0.5, dur: 4 });
    syncButtons();
  }

  // 帽子・バット・ランナーを元に戻す
  function resetScenery() {
    if (jam.hat.parent !== jam.head) jam.head.attach(jam.hat);
    jam.hat.position.set(0, jam.hatHome.y, 0);
    jam.hat.rotation.set(jam.hatHome.rx, 0, 0);
    jam.hat.scale.set(1, 1, 1);
    jam.bat.visible = true;
    for (const p of jam.batPieces) p.visible = false;
    jam.root.rotation.y = -Math.PI / 2;
    if (batako.hat.parent !== batako.head) batako.head.attach(batako.hat);
    batako.hat.position.set(0, batako.hatHome.y, 0);
    batako.hat.rotation.set(batako.hatHome.rx, 0, 0);
    batako.hat.scale.set(1, 1, 1);
    if (batako.glove.parent !== batako.handL) batako.handL.attach(batako.glove);
    batako.glove.position.set(0.2, 0.4, 0.6);
    batako.glove.rotation.set(0, 0, 0);
    batako.glove.scale.setScalar(10);
    const show = S.mode === 'scene';
    batako.glove.visible = show;
    batako.setFace('normal');
    jam.setFace('normal');
    anpan.root.visible = false;
    shadows.anpan.visible = false;
    for (const r of runners) {
      r.root.visible = show;
      r.shadow.visible = show;
      r.root.position.set(r.base.x, 0, r.base.z);
      r.root.rotation.y = r.base.rot;
      r.shadow.position.set(r.base.x, 0.02, r.base.z);
    }
  }

  function scenePitch() {
    const sc = S.sc;
    sc.i++;
    setPhase('ready');
    narrate(HR.SCENE.ready[sc.i], { quiet: true });
    if (sc.i === 5) S.banner = { kind: 'fullcount', t0: S.now };
  }

  // 見送り・空振りの判定
  function sceneCall() {
    const sc = S.sc, e = sceneScript()[sc.i];
    if (e.result === 'strikeout') { startSceneEnd(); return; }
    if (e.result === 'ball') {
      sc.b++;
      S.banner = { kind: 'ball', t0: S.now };
      sfx('cheer', { level: 0.3, dur: 1.2 });
    } else {
      sc.s++;
      S.banner = { kind: 'whiff', t0: S.now };
      sfx('groan');
    }
    narrate(HR.SCENE.result[sc.i]);
  }

  // 逆転サヨナラ満塁ホームラン(打球がスタンドに入った瞬間)
  function sceneHomer(b) {
    b.kind = 'hr';
    S.sc.score[1] += 4;
    S.stats.hr++;
    S.banner = { kind: 'sayonara', t0: S.now };
    narrate(HR.SCENE.homer);
    sfx('fanfare');
    sfx('cheer', { level: 1, dur: 5 });
    sfx('firework');
    HR.HUD.confetti(160);
    for (let i = 0; i < 3; i++) HR.HUD.burst(180 + rng() * 720, 250 + rng() * 500);
    S.fireworkT = S.now;
    S.flash = 0.5;
    S.excite = 1;
    stadium.drawScreen('SAYONARA!', 'ジャム 6 - 3 バタコ', true);
  }

  function startSceneEnd() {
    setPhase('sEnd');
    S.missed = false;
    if (S.sc.kind === 'catch') {
      S.banner = null;
      S.cfx = null;
      return;
    }
    if (S.sc.kind === 'homerun') {
      // ランナーがホームに還って、ジャムおじさんと大喜び
      [[-1.3, 1.5], [2.7, 1.3], [0.5, 2.6]].forEach(([x, z], i) => {
        const r = runners[i];
        r.root.position.set(x, 0, z);
        r.root.rotation.y = Math.PI;
        r.shadow.position.set(x, 0.02, z);
      });
      // 「逆転サヨナラ」の文字は顔にかからないよう画面下へ(出たときのアニメはくり返さない)
      if (S.banner && S.banner.kind === 'sayonara') S.banner = { kind: 'sayonara', t0: Math.min(S.banner.t0, S.now - 0.5), y: 1480, burstR: 380 };
      narrate(HR.SCENE.jamJoy, { queue: true });
      S.speech = { text: 'やったぞー!!', t0: S.now + 0.2, who: 'jam' };
      sfx('cheer', { level: 0.8, dur: 4 });
      return;
    }
    S.sc.s = 2;
    S.sc.o = 3;
    S.banner = { kind: 'strikeout', t0: S.now };
    narrate(HR.SCENE.result[5]);
    S.flash = 0.5;
    S.shake = 0.05;
    sfx('whistle');
    sfx('groan');
    sfx('cheer', { level: 0.7, dur: 3 });
    stadium.drawScreen('GAME SET', 'バタコ 3 - 2 ジャム', true);
  }

  const headTop = (m, dx, dy) => m.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, dy, 0)).add(jamSide(dx));
  // ジャムおじさんから見て左右(画面の左右)にずらすベクトル
  const jamSide = (dx) => new T.Vector3(0, 0, dx);
  const jamLocal = (v) => jam.root.localToWorld(v.clone());

  function sceneEnd(dt) {
    if (S.sc.kind === 'homerun') { sceneEndHomer(dt); return; }
    if (S.sc.kind === 'catch') { sceneEndCatch(dt); return; }
    const t = S.pt, ev = S.sc.ev;
    const once = (k, at, fn) => { if (!ev[k] && t >= at) { ev[k] = true; fn(); } };
    const J = SCENE_END.jam;
    once('batako', SCENE_END.batako, () => {
      S.banner = { kind: 'gameset', t0: S.now, y: 420 };
      S.speech = { text: 'やったー!', t0: S.now, who: 'batako' };
      narrate(HR.SCENE.celebrate, { queue: true });
      sfx('fanfare');
      HR.HUD.confetti(90);
    });
    once('jam', J, () => {
      S.banner = null;
      HR.HUD.clearParticles();
      startTantrum('collapse');
    });
    if (S.tan) updateTantrum(dt);
    if (t >= SCENE_END.final) {
      setPhase('sFinal');
      S.banner = null;
      S.final = { t0: S.now + 0.3, teams: teams(), line: '最後は空振り三振!' };
    }
  }

  function sceneEndHomer(dt) {
    const t = S.pt, ev = S.sc.ev;
    if (!ev.batako && t >= SCENE_END_HR.batako) {
      ev.batako = true;
      S.banner = null;
      HR.HUD.clearParticles();
      S.btan = { t0: S.now, fx: [], ev: {}, glove: null };
    }
    if (S.btan) updateBatakoTantrum(dt);
    if (t >= SCENE_END_HR.final) {
      setPhase('sFinal');
      S.speech = null;
      S.final = {
        t0: S.now + 0.3, stamp: 'サヨナラ', line: '逆転サヨナラ満塁ホームラン!',
        teams: [{ name: 'ジャム', score: S.sc.score[1], color: '#1fae4a' }, { name: 'バタコ', score: S.sc.score[0], color: '#e8337a' }],
      };
    }
  }

  // ---------------- アンパンマンのスーパーキャッチ(好捕版) ----------------
  const aP = new T.Vector3(), aT = new T.Vector3(), aT2 = new T.Vector3(), aOff = new T.Vector3(), aUp = new T.Vector3();
  // 2次ベジェ曲線の位置と接線
  const bez = (p0, p1, p2, s, out) => out.set(0, 0, 0).addScaledVector(p0, (1 - s) * (1 - s)).addScaledVector(p1, 2 * (1 - s) * s).addScaledVector(p2, s * s);
  const bezTan = (p0, p1, p2, s, out) => out.subVectors(p1, p0).multiplyScalar(2 * (1 - s)).addScaledVector(aT2.subVectors(p2, p1), 2 * s);
  const lerpAngle = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
  const lerpPose = (a, b, k) => a.map((x, i) => HR.lerp(x, b[i], k));

  // 打った瞬間に、キャッチする位置とアンパンマンの飛ぶ道すじを決める
  function setupCatch(b) {
    const sim = b.sim, tc = sim.hrT - CATCH.lead;
    const pc = HR.samplePath(sim.pts, tc, new T.Vector3());
    const dir = new T.Vector3(b.dir.x, 0, b.dir.z), side = new T.Vector3(-b.dir.z, 0, b.dir.x);
    const at = (d, u, sd) => pc.clone().addScaledVector(dir, d).add(new T.Vector3(0, u, 0)).addScaledVector(side, sd);
    const hv = (x, y, z) => ANP_HOVER.clone().add(new T.Vector3(x, y, z));
    S.anp = {
      tc, pc, caught: false, ev: {}, dodgeT: -99,
      a0: at(6, 14, -9), a1: at(1.5, 3, -3), // 画面の左上(スタンドの上空)から打球めがけて急降下
      b1: at(-2.5, -0.6, 2.5), b2: at(-10, 3, 4.5), // ボールを持ったまま、右手前へ飛び去る
      e0: hv(0.5, 6.0, -3.5), e1: hv(0.2, 1.4, -0.8), // ホームへ降りてくる
    };
  }

  function updateCatch(b) {
    const A = S.anp, ft = b.ft;
    const once = (k, at, fn) => { if (!A.ev[k] && ft >= at) { A.ev[k] = true; fn(); } };
    once('sky', A.tc - 1.1, () => narrate(HR.SCENE.catchSky));
    once('catch', A.tc, () => {
      b.kind = 'catch';
      A.caught = true;
      S.sc.o = 3;
      ballM.setDizzy(false);
      S.banner = { kind: 'supercatch', t0: S.now, y: 1380, burstR: 460 };
      narrate(HR.SCENE.catchMade);
      sfx('mitt');
      sfx('cheer', { level: 1, dur: 4.5 });
      S.flash = 0.45;
      S.shake = 0.04;
      S.excite = 1;
      const [x, y] = projCam(A.pc);
      HR.HUD.burst(x, y);
      S.cfx = [{ kind: 'text', text: 'パシッ!', w: A.pc.clone().add(new T.Vector3(0, 1.4, 0)), px: 120, t0: S.now, dur: 1.1, rot: -0.1 }];
      stadium.drawScreen('NICE CATCH!', 'バタコ 3 - 2 ジャム', true);
    });
    once('out', A.tc + 0.75, () => {
      narrate(HR.SCENE.catchOut);
      sfx('whistle');
    });
  }

  function sceneEndCatch(dt) {
    const t = S.pt, ev = S.sc.ev, E = SCENE_END_CATCH;
    const once = (k, at, fn) => { if (!ev[k] && t >= at) { ev[k] = true; fn(); } };
    once('say', E.say, () => {
      S.speech2 = { text: 'ボクの顔、キャッチ!', t0: S.now, who: 'anpan' };
      narrate(HR.SCENE.anpanLand, { queue: true });
    });
    once('jam', E.jam, () => startTantrum('charge'));
    if (S.tan) updateTantrum(dt);
    if (t >= E.final) {
      setPhase('sFinal');
      S.banner = null;
      S.speech = null;
      S.speech2 = null;
      S.final = { t0: S.now + 0.3, teams: teams(), line: 'まさかのスーパーキャッチ!', stamp: 'アウト', bottom: true };
    }
  }

  // アンパンマンの位置・向き・ポーズ(毎フレーム)
  function updateAnpan() {
    const A = S.anp;
    const on = !!(A && S.mode === 'scene' && (S.phase === 'batted' || S.phase === 'sEnd' || S.phase === 'sFinal'));
    let vis = on;
    if (on && S.phase === 'batted') {
      const ft = S.batted.ft;
      vis = ft >= A.tc - CATCH.approach;
      // 打球の飛んでくる向き(カメラの方)。キャッチの直前から顔をこちらへ向けて、頭の上で受け止める
      const toBall = Math.atan2(-S.batted.dir.x, -S.batted.dir.z);
      let lean, yaw, pose;
      if (ft < A.tc) {
        const s = HR.clamp((ft - (A.tc - CATCH.approach)) / CATCH.approach, 0, 1);
        bez(A.a0, A.a1, A.pc, s, aP);
        bezTan(A.a0, A.a1, A.pc, s, aT);
        const k = HR.smooth((s - 0.55) / 0.4);
        lean = HR.lerp(62, 18, k);
        yaw = lerpAngle(Math.atan2(aT.x, aT.z), toBall, k);
        pose = lerpPose(ANP_FLY, ANP_CATCH, k);
      } else {
        const s = HR.clamp((ft - A.tc) / CATCH.carry, 0, 1);
        bez(A.pc, A.b1, A.b2, s, aP);
        bezTan(A.pc, A.b1, A.b2, s, aT);
        lean = HR.lerp(18, 14, s);
        yaw = lerpAngle(toBall, Math.atan2(aT.x, aT.z), 0.25);
        pose = lerpPose(ANP_CATCH, ANP_HOLD, HR.smooth(s / 0.5));
      }
      HR.Models.poseBatako(anpan, pose);
      anpan.root.rotation.set(lean * DEG, yaw, 0, 'YXZ');
      // 右手がちょうど打球の位置に来るように体を置く
      anpan.root.position.copy(aP).sub(aOff.copy(anpan.handR.position).applyQuaternion(anpan.root.quaternion));
      anpan.updateCape(S.now, 1);
    } else if (on) {
      poseAnpanInfield();
    }
    anpan.root.visible = vis;
    shadows.anpan.visible = vis;
    if (vis) {
      const p = anpan.root.position, h = Math.max(0, p.y);
      shadows.anpan.position.set(p.x, 0.02, p.z);
      const sc = 0.9 + h * 0.08;
      shadows.anpan.scale.set(sc, sc * 0.9, 1);
      shadows.anpan.material.opacity = 0.7 / (1 + h * 0.6);
    }
  }

  // ホームへ降りてきて浮かぶ → ジャムおじさんが向かってくると上へ逃げて、くるくる回ってかわす
  function poseAnpanInfield() {
    const A = S.anp, E = SCENE_END_CATCH;
    const t = S.phase === 'sEnd' ? S.pt : E.final + S.pt;
    // 顔はカメラに向けつつ、少しジャムおじさんの方を向く
    const jp = jam.root.position;
    let pose = ANP_HOLD, fly = 0.15, lean = 6;
    if (t < E.arrive) {
      const s = HR.easeOutCubic(t / E.arrive);
      bez(A.e0, A.e1, ANP_HOVER, s, aP);
      bezTan(A.e0, A.e1, ANP_HOVER, Math.min(s, 0.95), aT);
      lean = HR.lerp(50, 6, s);
      fly = HR.lerp(1, 0.15, s);
      if (s < 0.75) pose = ANP_FLY;
    } else {
      aP.copy(ANP_HOVER);
      aP.y += Math.sin(S.now * 2.4) * 0.06;
      const tan = S.tan;
      if (tan && tan.variant === 'charge') {
        const tr = S.now - tan.t0 - TANTRUM_VARIANT.charge.rush;
        if (tr > 0) {
          // 上へ逃げて、ジャムおじさんの前を左右にふわふわ。振られるたびにひょいと浮く
          aP.y += HR.smooth(tr / 0.7) * 0.3;
          const sinceDodge = S.now - A.dodgeT;
          if (sinceDodge >= 0) aP.y += 0.32 * Math.sin(Math.min(1, sinceDodge / 0.45) * Math.PI);
          // 画面の左上を行ったり来たり(ジャムおじさんはその右下から追いかける)
          const e = HR.smooth(tr / 1.0);
          aP.addScaledVector(CATCH_RIGHT, (-0.35 - 0.75 * Math.sin(tr * 1.2)) * e);
          aP.addScaledVector(CATCH_FWD, 0.1 * e);
          pose = ANP_DODGE;
          fly = 0.45;
        }
      }
    }
    const toCam = Math.atan2(camera.position.x - aP.x, camera.position.z - aP.z);
    const toJam = Math.atan2(jp.x - aP.x, jp.z - aP.z);
    let yaw = lerpAngle(toCam, toJam, 0.3);
    if (t < E.arrive) yaw = lerpAngle(Math.atan2(aT.x, aT.z), yaw, HR.smooth(t / E.arrive));
    HR.Models.poseBatako(anpan, pose);
    anpan.root.rotation.set(lean * DEG, yaw, 0, 'YXZ');
    anpan.root.position.copy(aP);
    anpan.updateCape(S.now, fly);
  }

  // ---------------- バタコさんが悔しがる(逆転弾のあと) ----------------
  const batakoTop = (dx, dy) => batako.head.getWorldPosition(new T.Vector3()).add(new T.Vector3(dx, dy, 0));
  const batakoLocal = (v) => batako.root.localToWorld(v.clone());

  function updateBatakoTantrum(dt) {
    const bt = S.btan, tt = S.now - bt.t0, T_ = B_TANTRUM_T;
    const once = (k, at, fn) => { if (!bt.ev[k] && tt >= at) { bt.ev[k] = true; fn(); } };
    once('start', 0, () => {
      batako.setFace('cry');
      S.speech = { text: 'そんな…', t0: S.now, who: 'batako', style: 'close' };
      narrate(HR.SCENE.batakoShock);
    });
    once('anger', T_.anger, () => {
      S.speech = { text: 'もうっ!!', t0: S.now, who: 'batako', style: 'close' };
      bt.fx.push({ kind: 'anger', w: batakoTop(0.42, 0.4), r: 50, t0: S.now, rot: 0.3 });
      bt.fx.push({ kind: 'anger', w: batakoTop(-0.4, 0.25), r: 36, t0: S.now + 0.15, rot: -0.4 });
    });
    once('hatUp', T_.hatUp, () => batako.root.attach(batako.hat));
    once('release', T_.release, () => narrate(HR.SCENE.batakoHat));
    once('land', T_.land, () => {
      sfx('slam');
      S.shake = 0.06;
      const w = batakoLocal(B_HAT_GROUND);
      const [x, y] = projCam(w);
      HR.HUD.dust(x, y);
      bt.fx.push({ kind: 'text', text: 'バシッ!', w: w.add(new T.Vector3(0, 0.55, 0)), px: 120, t0: S.now, dur: 1.0, rot: -0.12 });
    });
    once('glove', T_.glove, () => {
      scene.attach(batako.glove); // バタコさんはこのあとしゃがむので、球場に置いて飛ばす
      const g0 = batako.glove.position;
      bt.glove = { x: g0.x, y: g0.y, z: g0.z, vx: 3.2, vy: 4.0, vz: 3.0 };
      sfx('swing');
      bt.fx.push({ kind: 'text', text: 'ポイッ!', w: batakoTop(0.55, 0.15), px: 110, t0: S.now, dur: 0.9, rot: 0.1, fills: ['#ffffff', '#cfe6ff', '#5a8cff'], strokes: [[26, '#0d1446'], [12, '#ffffff']] });
      narrate(HR.SCENE.batakoGlove);
    });
    once('cry', T_.cry, () => {
      S.speech = { text: 'くやしいーっ!!', t0: S.now, who: 'batako', style: 'close' };
      bt.fx.push({ kind: 'steam', w: batakoTop(0, 0.6), t0: S.now });
      narrate(HR.SCENE.batakoPound);
    });
    // こぶしがマウンドに当たるたびに土ぼこり(左右交互に0.25秒ごと)
    if (tt >= T_.pound) {
      const k = Math.floor((tt - T_.pound) / 0.25);
      if (k !== bt.lastPound) {
        bt.lastPound = k;
        const hand = k % 2 === 0 ? batako.handR : batako.handL;
        const w = hand.getWorldPosition(new T.Vector3());
        const [x, y] = projCam(w);
        HR.HUD.dust(x, y + 20);
        sfx('slam');
        S.shake = Math.max(S.shake, 0.03);
        if (k < 4) bt.fx.push({ kind: 'text', text: 'ドン!', w: w.add(new T.Vector3(k % 2 ? 0.35 : -0.35, 0.45, 0)), px: 96, t0: S.now, dur: 0.6, rot: k % 2 ? 0.12 : -0.12 });
      }
    }
    // 投げ捨てたグローブ
    const gl = bt.glove;
    if (gl && !gl.landed) {
      gl.vy -= 9.8 * dt;
      gl.x += gl.vx * dt; gl.y += gl.vy * dt; gl.z += gl.vz * dt;
      batako.glove.rotation.x += dt * 12;
      batako.glove.rotation.z += dt * 9;
      if (gl.y <= 0.07 && gl.vy < 0) {
        // 地面に落ちたら手のひらを上にして転がったまま
        gl.y = 0.07;
        gl.landed = true;
        batako.glove.rotation.set(-Math.PI / 2, 0, batako.glove.rotation.z);
      }
      batako.glove.position.set(gl.x, gl.y, gl.z);
    }
  }

  function poseBatakoTantrum() {
    const bt = S.btan, tt = S.now - bt.t0, m = batako;
    const v = HR.keys(B_TANTRUM, tt, false);
    if (tt >= B_TANTRUM_T.pound) {
      // 両こぶしでマウンドを交互に叩く(大きな頭に隠れないよう、顔の左右で)
      const u = (tt - B_TANTRUM_T.pound) / 0.5;
      const hr = Math.sin(Math.PI * (u % 1)), hl = Math.sin(Math.PI * ((u + 0.5) % 1));
      v[0] = -0.46; v[1] = POUND_Y + hr * 0.5; v[2] = 0.6;
      v[3] = 0.46; v[4] = POUND_Y + hl * 0.5; v[5] = 0.6;
    }
    HR.Models.poseBatako(m, v);
    if (tt > B_TANTRUM_T.anger) m.pivot.rotation.z = Math.sin(S.now * 45) * 0.035;
    m.root.position.set(PITCHER_POS.x, PITCHER_POS.y + v[14], PITCHER_POS.z);
    m.root.rotation.y = 0;
    // 帽子: 右手で持ち上げ → 叩きつけてつぶれる
    const hat = m.hat;
    if (hat.parent === m.root) {
      if (tt < B_TANTRUM_T.release) {
        hat.position.set(v[0] + 0.04, v[1] - 0.26, v[2]);
        hat.rotation.set(0, 0, 0.35);
      } else {
        const k = HR.clamp((tt - B_TANTRUM_T.release) / (B_TANTRUM_T.land - B_TANTRUM_T.release), 0, 1);
        const from = m.hatFrom || (m.hatFrom = hat.position.clone());
        hat.position.lerpVectors(from, B_HAT_GROUND, k * k);
        hat.rotation.set(0, -0.4, HR.lerp(0.35, 0, k));
        if (k >= 1) {
          hat.scale.set(1.25, 0.45, 1.25);
          hat.position.y -= v[14]; // しゃがんでも帽子は地面に残す
        }
      }
    } else m.hatFrom = null;
  }

  function jamCheer(a) {
    const pump = Math.abs(Math.sin(a * 7));
    applyJam([-0.36, 1.45 + pump * 0.12, 0.12, 100, 82, 0, -0.18, 0.06, 0.04], { jump: pump * 0.12 });
    jam.handL.position.set(0.36, 1.25 + pump * 0.25, 0.14);
  }

  // ---------------- ジャムおじさんが悔しがる ----------------
  function startTantrum(variant) {
    S.tan = { t0: S.now, variant, fx: [], pieces: null, ev: {}, jx: BATTER_POS.x, jz: BATTER_POS.z, yaw: -Math.PI / 2, moving: false };
    jam.setFace('angry');
  }

  function updateTantrum(dt) {
    const tan = S.tan, tt = S.now - tan.t0, V = TANTRUM_VARIANT[tan.variant];
    const once = (k, at, fn) => { if (!tan.ev[k] && tt >= at) { tan.ev[k] = true; fn(); } };
    once('start', 0, () => { S.speech = { text: '……', t0: S.now, who: 'jam' }; });
    once('anger', TANTRUM.anger, () => {
      S.speech = { text: 'ぐぬぬ…!', t0: S.now, who: 'jam' };
      narrate(HR.SCENE.angry);
      tan.fx.push({ kind: 'anger', at: () => headTop(jam, 0.42, 0.42), r: 50, t0: S.now, rot: 0.3 });
      tan.fx.push({ kind: 'anger', at: () => headTop(jam, -0.4, 0.26), r: 36, t0: S.now + 0.15, rot: -0.4 });
    });
    once('hatUp', TANTRUM.hatUp, () => jam.root.attach(jam.hat));
    once('land', TANTRUM.land, () => {
      sfx('slam');
      S.shake = 0.06;
      const [x, y] = projCam(jamLocal(HAT_GROUND));
      HR.HUD.dust(x, y);
      tan.fx.push({ kind: 'text', text: 'バシッ!', w: jamLocal(HAT_GROUND).add(new T.Vector3(0, 0.55, 0)), px: 120, t0: S.now, dur: 1.0, rot: -0.12 });
    });
    if (!V.noSnap) once('snap', TANTRUM.snap, () => {
      sfx('snap');
      S.shake = 0.09;
      S.flash = 0.3;
      jam.bat.visible = false;
      // collapse は足元へ跳ね上がって落ち、toss は両手に1本ずつ持ったまま
      tan.pieces = [
        { obj: jam.batPieces[0], x: 0.02, y: 0.52, z: 0.38, vx: -0.55, vy: 2.6, vz: 0.15, a: 0, va: -7, held: tan.variant === 'toss' },
        { obj: jam.batPieces[1], x: 0.02, y: 0.52, z: 0.38, vx: 0.6, vy: 2.8, vz: 0.15, a: 0, va: 7, held: tan.variant === 'toss' },
      ];
      const brk = jamLocal(new T.Vector3(0.02, 0.52, 0.38));
      const [x, y] = projCam(brk);
      HR.HUD.crumbs(x, y);
      tan.fx.push({ kind: 'text', text: 'バキッ!!', w: brk.add(new T.Vector3(0, 0.75, 0)), px: 150, t0: S.now, dur: 1.4, rot: -0.1, fills: ['#ffffff', '#ffe0a0', '#ff6a00'], strokes: [[32, '#3a1a00'], [16, '#ffffff']] });
      narrate(HR.SCENE.snap);
      S.speech = null;
    });
    if (V.toss) {
      once('toss', V.toss, () => {
        const [p0, p1] = tan.pieces;
        Object.assign(p0, { held: false, vx: -4.2, vy: 5.0, vz: 2.2, va: -15 });
        Object.assign(p1, { held: false, vx: 4.4, vy: 5.4, vz: 2.2, va: 15 });
        sfx('swing');
        tan.fx.push({ kind: 'text', text: 'ブンッ!', w: headTop(jam, -0.36, 0.05), px: 130, t0: S.now, dur: 1.0, rot: 0.08, fills: ['#ffffff', '#cfe6ff', '#5a8cff'], strokes: [[28, '#0d1446'], [14, '#ffffff']] });
        narrate(HR.SCENE.toss);
      });
    }
    once('fists', V.fists, () => {
      S.speech = { text: 'くやしいーっ!!', t0: S.now, who: 'jam' };
      tan.fx.push({ kind: 'steam', at: () => headTop(jam, 0, 0.7), t0: S.now });
    });
    if (V.down) {
      once('down', V.down, () => {
        narrate(HR.SCENE.down);
        S.speech = null;
        tan.fx = [];
        sfx('groan');
      });
    }
    if (V.rush) updateCharge(dt, tan, tt, V, once);
    if (tan.pieces) stepPieces(dt);
  }

  // バットを振り上げてアンパンマンを追いかける(好捕版)
  function updateCharge(dt, tan, tt, V, once) {
    once('yell', V.yell, () => {
      S.speech = { text: 'こらーっ!!アンパンマーン!!', t0: S.now, who: 'jam', side: 'right' };
      narrate(HR.SCENE.charge);
      tan.fx.push({ kind: 'anger', at: () => headTop(jam, 0.46, 0.5), r: 58, t0: S.now, rot: 0.25 });
      tan.fx.push({ kind: 'steam', at: () => headTop(jam, 0, 0.75), t0: S.now + 0.1 });
      S.shake = Math.max(S.shake, 0.03);
    });
    once('rush', V.rush, () => { S.speech2 = { text: 'わわっ!', t0: S.now + 0.3, who: 'anpan' }; });
    once('sorry', V.rush + 2.4, () => { S.speech2 = { text: 'ごめんなさーい!', t0: S.now, who: 'anpan' }; });
    once('wait', V.swings[2], () => { S.speech = { text: 'まてーっ!!', t0: S.now, who: 'jam', side: 'right' }; });
    V.swings.forEach((ts, i) => once('swing' + i, ts, () => {
      sfx('swing');
      S.anp.dodgeT = S.now + 0.08;
      const tip = jam.bat.localToWorld(new T.Vector3(0, 0.9, 0));
      tan.fx.push({ kind: 'text', text: 'ブンッ!', w: tip, px: 104, t0: S.now + 0.12, dur: 0.6, rot: i % 2 ? 0.12 : -0.12, fills: ['#ffffff', '#cfe6ff', '#5a8cff'], strokes: [[26, '#0d1446'], [12, '#ffffff']] });
      if (i === 0) narrate(HR.SCENE.dodge);
      if (tan.fx.length > 14) tan.fx.splice(0, tan.fx.length - 14);
    }));
    // 向き: 帽子を叩きつけるまでは正面、そのあとはアンパンマンの方へ
    const ap = anpan.root.position;
    const dx = ap.x - tan.jx, dz = ap.z - tan.jz, d = Math.hypot(dx, dz);
    if (tt >= V.raise) tan.yaw = lerpAngle(tan.yaw, Math.atan2(dx, dz), Math.min(1, dt * 6));
    // 画面の左右だけ追いかけて、いつもアンパンマンの右下からバットを振る
    tan.moving = false;
    if (tt >= V.rush) {
      const lat = (x, z) => (x - BATTER_POS.x) * CATCH_RIGHT.x + (z - BATTER_POS.z) * CATCH_RIGHT.z;
      const dl = lat(ap.x, ap.z) + 0.75 - lat(tan.jx, tan.jz);
      if (Math.abs(dl) > 0.04) {
        const step = Math.sign(dl) * Math.min(Math.abs(dl), 2.0 * dt);
        tan.jx += CATCH_RIGHT.x * step;
        tan.jz += CATCH_RIGHT.z * step;
        tan.moving = Math.abs(dl) > 0.1;
      }
    }
  }
  // 振り下ろしの強さ(0〜1): 各スイングの 0.38 秒間
  function chargeSwing(V, tt) {
    let a = 0;
    for (const ts of V.swings) if (tt >= ts && tt < ts + 0.38) a = Math.max(a, Math.sin((Math.PI * (tt - ts)) / 0.38));
    return a;
  }

  // へし折ったバットの2本: 跳ね上がって回りながら落ち、地面で寝かせる
  function stepPieces(dt) {
    for (const p of S.tan.pieces) {
      if (p.held) continue;
      if (!p.rest) {
        p.vy -= 9.8 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.a += p.va * dt;
        if (p.y < 0.06 && p.vy < 0) {
          p.y = 0.06;
          p.vy = -p.vy * 0.3;
          p.vx *= 0.5; p.vz *= 0.5; p.va *= 0.4;
          if (p.vy < 0.6) { p.rest = true; p.a = Math.round(p.a / Math.PI) * Math.PI; }
        }
      }
      p.obj.visible = true;
      p.obj.position.set(p.x, p.y, p.z);
      p.obj.rotation.set(0, 0, p.a - Math.PI / 2);
    }
  }

  function poseTantrum() {
    const tan = S.tan, tt = S.now - tan.t0, V = TANTRUM_VARIANT[tan.variant];
    const m = jam, v = HR.keys(V.keys, tt, false);
    m.handR.position.set(v[0], v[1], v[2]);
    m.handL.position.set(v[3], v[4], v[5]);
    m.footL.position.set(v[6], v[7], v[8]);
    m.footR.position.set(-0.18, 0.06, v[9]);
    const angry = tt > TANTRUM.anger && !(V.down && tt >= V.down);
    m.pivot.rotation.set(v[10], 0, angry ? Math.sin(S.now * 45) * 0.035 : 0, 'YXZ');
    m.root.position.set(BATTER_POS.x, V.down ? -0.14 * HR.smooth((tt - V.down) / 0.6) : 0, BATTER_POS.z);
    if (V.rush) {
      // 振り上げたバットを、アンパンマンめがけて何度も振り下ろす。走るときは足を交互に出して跳ねる
      const a = chargeSwing(V, tt), run = tan.moving || tt >= V.rush;
      if (tt >= 3.0) {
        m.handR.position.set(-0.11, HR.lerp(1.92, 1.48, a), HR.lerp(0.02, 0.46, a));
        m.handL.position.set(0.09, HR.lerp(1.92, 1.5, a), HR.lerp(0.02, 0.46, a));
        m.pivot.rotation.x = HR.lerp(-0.16, 0.22, a);
      }
      const hop = run ? Math.abs(Math.sin((tt - V.rush) * 9)) * (tan.moving ? 0.13 : 0.06) : 0;
      if (run) {
        const ph = Math.sin((tt - V.rush) * 18);
        m.footL.position.set(0.18, 0.06 + Math.max(0, ph) * 0.08, ph * 0.13);
        m.footR.position.set(-0.18, 0.06 + Math.max(0, -ph) * 0.08, -ph * 0.13);
      }
      m.root.position.set(tan.jx, hop, tan.jz);
      m.root.rotation.y = tan.yaw;
      // バット: 横に持つ → 頭の上へ振り上げる → 振り下ろす
      if (tt >= TANTRUM.grab) {
        const u = HR.smooth((tt - TANTRUM.grab) / 0.4);
        const dir = tmpV2.set(1, 0, 0).lerp(tmpV.set(0.1, 0.8, -0.6).normalize(), u);
        dir.lerp(tmpV.set(0.08, 0.5, 0.86).normalize(), a).normalize();
        const gx = (m.handR.position.x + m.handL.position.x) / 2, gy = (m.handR.position.y + m.handL.position.y) / 2, gz = (m.handR.position.z + m.handL.position.z) / 2;
        m.bat.position.set(HR.lerp(v[0] - 0.18, gx - dir.x * 0.12, u), HR.lerp(v[1], gy - dir.y * 0.12, u), HR.lerp(v[2], gz - dir.z * 0.12, u));
        m.bat.quaternion.setFromUnitVectors(tmpV.set(0, 1, 0), dir);
      }
    }
    // バット: 右手で下げる → 両手で横に持つ → 折れたら2本に
    if (tt < TANTRUM.grab) {
      const dir = tmpV2.set(Math.cos(-72 * DEG) * Math.cos(95 * DEG), Math.sin(-72 * DEG), Math.cos(-72 * DEG) * Math.sin(95 * DEG));
      m.bat.position.set(v[0] - dir.x * 0.07, v[1] - dir.y * 0.07, v[2] - dir.z * 0.07);
      m.bat.quaternion.setFromUnitVectors(tmpV.set(0, 1, 0), dir);
    } else if (tt < TANTRUM.snap && !V.rush) {
      m.bat.position.set(v[0] - 0.18, v[1], v[2]);
      m.bat.quaternion.setFromUnitVectors(tmpV.set(0, 1, 0), tmpV2.set(1, 0, 0));
    }
    // 持っている折れた2本: 右手に持ち手側、左手に先端側を持ち、折れ口を上に向けて「へ」の字に
    if (tan.pieces) {
      const [p0, p1] = tan.pieces;
      if (p0.held) Object.assign(p0, { x: v[0] + 0.25, y: v[1] + 0.43, z: v[2], a: Math.PI / 3 });
      if (p1.held) Object.assign(p1, { x: v[3] - 0.23, y: v[4] + 0.4, z: v[5], a: -Math.PI / 3 });
      for (const p of tan.pieces) {
        if (!p.held) continue;
        p.obj.visible = true;
        p.obj.position.set(p.x, p.y, p.z);
        p.obj.rotation.set(0, 0, p.a - Math.PI / 2);
      }
    }
    // 帽子: 左手で持ち上げ → 叩きつけてつぶれる
    const hat = m.hat;
    if (hat.parent === m.root) {
      if (tt < TANTRUM.release) {
        hat.position.set(v[3] - 0.04, v[4] - 0.28, v[5]);
        hat.rotation.set(0, 0, -0.35);
      } else {
        const u = HR.clamp((tt - TANTRUM.release) / (TANTRUM.land - TANTRUM.release), 0, 1);
        const from = m.hatFrom || (m.hatFrom = hat.position.clone());
        hat.position.lerpVectors(from, HAT_GROUND, u * u);
        hat.rotation.set(0, 0.4, HR.lerp(-0.35, 0, u));
        if (u >= 1) {
          hat.scale.set(1.25, 0.45, 1.25);
          if (V.rush) scene.attach(hat); // このあと走り出すので、帽子は地面に置いていく
        }
      }
    } else m.hatFrom = null;
  }

  // 現在のカメラでの画面座標
  const ndcCam = new T.Vector3();
  function projCam(v) {
    ndcCam.copy(v).project(camera);
    return [(ndcCam.x + 1) * 0.5 * W, (1 - ndcCam.y) * 0.5 * H];
  }

  // ---------------- 毎フレームの更新 ----------------
  function update(dt) {
    S.now += dt;
    S.pt += dt;
    S.flash = Math.max(0, S.flash - dt * 2.5);
    S.shake = Math.max(0, S.shake - dt * 0.12);
    S.cursorFlash = Math.max(0, S.cursorFlash - dt);
    S.excite = Math.max(0, S.excite - dt * 0.12);

    updateCursor(dt);

    switch (S.phase) {
      case 'title':
        if (OFFLINE) startGame();
        break;
      case 'intro': {
        const t = S.pt;
        if (t > 1.3 && S.intro.stage === 'title') { S.intro = { stage: 'pitcher', t0: S.now }; say('pitcher', null, { queue: true }); sfx('pop'); }
        if (t > 2.5 && S.intro.stage === 'pitcher') { S.intro = { stage: 'batter', t0: S.now }; say('batter', null, { queue: true }); sfx('pop'); }
        if (t > 3.8) { S.intro = null; nextPitch(); }
        break;
      }
      case 'ready': {
        const wait = S.mode === 'scene' ? (S.sc.i === 0 ? 1.4 : 1.1) : S.pitchNo === 1 ? 1.3 : 0.6;
        if (S.pt > wait) {
          setPhase('windup');
          if (S.banner && (S.banner.kind === 'play' || S.banner.kind === 'fullcount')) S.banner = null;
          S.batakoSay = { t0: S.now, text: 'アンパンマン!', sore: 0 };
        }
        break;
      }
      case 'windup':
        if (S.batakoSay && S.batakoSay.text === 'アンパンマン!' && S.pt >= RELEASE_T - FACE_LEAD) {
          S.batakoSay = { t0: S.now, text: '新しい顔よ!', sore: 0 };
        }
        if (S.pt >= RELEASE_T) {
          S.pitch = makePitch();
          S.balls--;
          S.pitchInfo = { name: S.pitch.name, kmh: S.pitch.kmh, t0: S.now };
          sfx('throw');
          if (OFFLINE) (window.__pitchLog = window.__pitchLog || []).push(`${S.pitch.name}${S.pitch.kmh}`);
          if (S.batakoSay) { S.batakoSay.sore = S.now; S.batakoSay.text = 'それっ!'; }
          if (S.auto) planAI();
          setPhase('pitch');
        }
        break;
      case 'pitch': {
        const p = S.pitch;
        if (S.auto && S.ai && !S.swing && S.now >= S.ai.swingAt) trySwing();
        if (S.swing && S.swing.contact && S.now >= S.swing.contact.tc) { doContact(); break; }
        const s = (S.now - p.t0) / p.T;
        if (s > 1.35 && !S.missed) {
          S.missed = true;
          sfx('mitt');
          if (S.mode === 'scene') { sceneCall(); break; }
          const kind = S.swing ? 'whiff' : 'look';
          if (OFFLINE) (window.__log = window.__log || []).push(kind);
          S.banner = { kind, t0: S.now };
          S.streak = (S.streak || 0) + 1;
          if (kind === 'whiff' && S.streak >= 3 && rng() < 0.5) say('whiffStreak', { k: S.streak });
          else say(kind === 'whiff' ? HR.WHIFF_KEY[p.name] || 'whiff' : 'look');
          sfx('groan');
        }
        if (S.missed && S.pt > p.T * 1.35 + (S.mode === 'scene' ? 1.7 : 1.0)) { S.missed = false; nextPitch(); }
        break;
      }
      case 'batted': {
        const b = S.batted, sim = b.sim;
        const age = S.now - b.t0;
        let rate = age < 0.1 ? 0.15 : HR.lerp(0.6, FLIGHT_SPEED, HR.smooth((age - 0.1) / 0.5));
        const A = S.anp;
        if (A) {
          // アンパンマンが飛んでくるところからキャッチの直後まではスローモーション
          const k = HR.smooth((b.ft - (A.tc - 1.0)) / 0.4) * (1 - HR.smooth((b.ft - (A.tc + 0.35)) / 0.5));
          rate *= HR.lerp(1, 0.28, k);
        }
        b.ft += dt * rate;
        if (sim.result === 'hr' && sim.hrT > 1.4 && !b.events.fly && b.ft > sim.hrT * 0.4) { b.events.fly = true; say('flyBig'); }
        if (A) updateCatch(b);
        if (!b.kind) {
          if (sim.result === 'hr' && b.ft >= sim.hrT) resolveBatted('hr');
          else if (sim.result !== 'hr' && b.ft >= (sim.landT != null ? sim.landT : sim.dur)) resolveBatted(sim.result === 'hit' && sim.fenceT != null ? 'wall' : sim.result);
        }
        if (b.kind === 'hr' && S.now - S.fireworkT > 0.45 && !b.events.fw2) { b.events.fw2 = true; sfx('firework'); for (let i = 0; i < 2; i++) HR.HUD.burst(150 + rng() * 780, 220 + rng() * 520); }
        const linger = S.mode === 'scene' ? 2.6 : 0.9; // 名場面ではファウルの表示を長めに見せる
        const end = b.kind === 'catch' ? b.ft >= A.tc + CATCH.end : b.kind === 'hr' ? b.ft >= sim.hrT + 1.7 : b.kind && (b.ft >= (sim.landT != null ? sim.landT : sim.dur) + linger || b.ft >= sim.dur + linger - 0.6);
        if (end) {
          if (S.mode === 'scene' && (b.kind === 'hr' || b.kind === 'catch')) startSceneEnd();
          else if (b.kind === 'hr') startCutin();
          else nextPitch();
        }
        break;
      }
      case 'cutin':
        if (S.pt > 1.6) nextPitch();
        break;
      case 'finish':
        if (S.tan) updateTantrum(dt);
        if (OFFLINE && S.now - S.finish.t0 > 5.2) S.done = true;
        break;
      case 'sIntro': {
        const t = S.pt;
        if (t > 2.2 && S.intro.stage === 'scene') { S.intro = { stage: 'runner', t0: S.now }; narrate(HR.SCENE.runner, { queue: true }); }
        if (t > 3.5 && S.intro.stage === 'runner') { S.intro = { stage: 'pitcher', t0: S.now }; narrate(HR.SCENE.pitcher, { queue: true }); sfx('pop'); }
        if (t > 5.4 && S.intro.stage === 'pitcher') { S.intro = { stage: 'batter', t0: S.now }; narrate(HR.SCENE.batter, { queue: true }); sfx('pop'); }
        if (t > 7.3) { S.intro = null; nextPitch(); }
        break;
      }
      case 'sEnd':
        sceneEnd(dt);
        break;
      case 'sFinal':
        if (S.tan && S.sc.kind === 'catch') updateTantrum(dt); // 追いかけっこは結果の画面でも続く
        if (OFFLINE && S.pt > 4.4) S.done = true;
        break;
    }
    if (S.batted && S.batted.kind === 'hr' && S.phase === 'cutin' && S.pt > 0.3 && !S.batted.events.fw3) {
      S.batted.events.fw3 = true;
      for (let i = 0; i < 2; i++) HR.HUD.burst(150 + rng() * 780, 220 + rng() * 400);
    }
    stadium.update(S.now, dt, S.excite);
    updateAnpan();
    poseCharacters(dt);
    placeBall(dt);
    updateCamera(dt);
  }

  function startCutin() {
    const dist = S.banner && S.banner.dist;
    setPhase('cutin');
    S.banner = null;
    S.cutin = { t0: S.now, dist, bubble: pick(HR.LINES.bubble) };
    say(dist >= 135 ? 'hrFar' : 'hrNormal', { d: dist });
    sfx('cheer', { level: 0.6, dur: 2 });
  }

  // ---------------- オートバッター ----------------
  function planAI() {
    const p = S.pitch;
    const cs = curSize();
    if (S.mode === 'scene') {
      // 見送り / 変化前のコースを追って空振り / 引っ張ってファウル(打球は決め打ち)
      const e = sceneScript()[S.sc.i], ta = p.t0 + p.T;
      if (e.act === 'homer') S.ai = { swingAt: ta - SWING_DELAY - 0.02, aimX: p.tx, aimY: p.ty - 0.02, reactAt: p.t0 + p.T * 0.25, forced: { kmh: 184, launch: 29, spray: 16, quality: 0.97 } };
      else if (e.act === 'take') S.ai = { swingAt: Infinity, aimX: p.tx * 0.6, aimY: 0.85 + (p.ty - 0.85) * 0.5, reactAt: p.t0 + p.T * 0.35 };
      else if (e.act === 'whiff') S.ai = { swingAt: ta - SWING_DELAY + 0.01, aimX: p.tx - p.bx * 0.9, aimY: p.ty - p.by * 0.9, reactAt: p.t0 + p.T * 0.25 };
      else S.ai = { swingAt: ta - SWING_DELAY - 0.055, aimX: p.tx, aimY: p.ty - 0.03, reactAt: p.t0 + p.T * 0.25, forced: { kmh: 158, launch: 24, spray: 56, quality: 0.85 } };
      return;
    }
    if (AI_MODE === 'whiff') {
      // 変化する前のコースを追いかけ、タイミングも判定の外(±0.12秒以上)にずらすので必ず空振りになる
      const fast = p.name === 'ストレート';
      const off = fast || rng() < 0.5 ? 0.12 + rng() * 0.07 : -(0.12 + rng() * 0.06);
      S.ai = {
        swingAt: p.t0 + p.T - SWING_DELAY + off,
        aimX: p.tx - p.bx * 0.9 + gauss() * 0.03,
        aimY: p.ty - p.by * 0.9 - cs.ry * 0.25 + gauss() * 0.03,
        reactAt: p.t0 + p.T * (0.2 + rng() * 0.1),
      };
      return;
    }
    S.ai = {
      swingAt: p.t0 + p.T - SWING_DELAY + gauss() * 0.022,
      aimX: p.tx + gauss() * 0.035,
      aimY: p.ty - cs.ry * 0.33 + gauss() * 0.035,
      reactAt: p.t0 + p.T * (0.25 + rng() * 0.15),
    };
  }

  function updateCursor(dt) {
    const c = S.cursor, t = S.curTarget;
    if (S.auto) {
      if (S.ai && S.now >= S.ai.reactAt) { t.x = S.ai.aimX; t.y = S.ai.aimY; }
      else if (S.phase === 'ready' || S.phase === 'windup') { t.x = HR.lerp(t.x, 0, HR.damp(2, dt)); t.y = HR.lerp(t.y, 0.82, HR.damp(2, dt)); }
      const maxV = 2.6 * dt;
      const dx = t.x - c.x, dy = t.y - c.y, d = Math.hypot(dx, dy);
      const k = d > maxV ? maxV / d : 1;
      c.x += dx * k * 0.9;
      c.y += dy * k * 0.9;
    } else {
      if (keys.size) {
        const v = 1.5 * dt;
        if (keys.has('left')) t.x -= v;
        if (keys.has('right')) t.x += v;
        if (keys.has('up')) t.y += v;
        if (keys.has('down')) t.y -= v;
      }
      t.x = HR.clamp(t.x, CUR_LIMIT.x0, CUR_LIMIT.x1);
      t.y = HR.clamp(t.y, CUR_LIMIT.y0, CUR_LIMIT.y1);
      const k = HR.damp(30, dt);
      c.x += (t.x - c.x) * k;
      c.y += (t.y - c.y) * k;
    }
  }

  // ---------------- キャラクターのポーズ ----------------
  // バタコさん: [右手xyz, 左手xyz, 左足xyz, 右足xyz, ひねり, 前傾, 前進]
  const B_READY = [-0.12, 0.62, 0.3, 0.12, 0.62, 0.3, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, 0, 0];
  const B_PITCH = [
    [0.0, B_READY],
    [0.3, [-0.09, 1.66, 0.4, 0.09, 1.66, 0.4, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, -5, 0]],
    [0.65, [-0.09, 1.7, 0.38, 0.09, 1.7, 0.38, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, -7, 0]],
    [1.2, [-0.4, 0.72, -0.12, 0.3, 0.82, 0.22, 0.1, 0.42, 0.16, -0.17, 0.06, 0.0, -38, -10, 0]],
    [1.45, [-0.46, 1.44, -0.24, 0.4, 0.9, 0.4, 0.18, 0.07, 0.6, -0.17, 0.06, 0.0, -24, 4, 0.22]],
    [1.6, [-0.22, 1.32, 0.52, 0.32, 0.55, 0.05, 0.18, 0.06, 0.62, -0.17, 0.1, -0.05, 22, 20, 0.34]],
    [1.8, [0.18, 0.45, 0.42, 0.34, 0.55, -0.1, 0.18, 0.06, 0.62, -0.1, 0.28, 0.3, 36, 26, 0.42]],
    [2.35, [-0.12, 0.62, 0.3, 0.12, 0.62, 0.3, 0.17, 0.06, 0.32, -0.17, 0.06, 0.32, 0, 0, 0.32]],
  ];
  function applyBatako(v) {
    HR.Models.poseBatako(batako, v);
    batako.root.position.set(PITCHER_POS.x, PITCHER_POS.y, PITCHER_POS.z + v[14]);
  }

  // ジャムおじさん(左打ち): [グリップxyz, バット方位ψ, 仰角ε, ひねり, 右足xyz]
  const J_STANCE = [0.3, 0.86, 0.06, -12, 58, 14, -0.18, 0.06, 0.04];
  const J_SWING = [
    [0.0, J_STANCE],
    [0.05, [0.2, 0.74, 0.2, 30, 24, 4, -0.27, 0.1, 0.04]],
    [0.1, [0.02, 0.64, 0.32, 95, -4, -28, -0.3, 0.06, 0.04]],
    [0.16, [-0.16, 0.7, 0.24, 158, 8, -60, -0.3, 0.06, 0.04]],
    [0.28, [-0.24, 0.92, 0.02, 228, 38, -85, -0.3, 0.06, 0.04]],
    [0.6, [-0.22, 0.95, -0.04, 245, 46, -85, -0.3, 0.06, 0.04]],
  ];
  function applyJam(v, opts) {
    HR.Models.poseJam(jam, v, opts);
    jam.root.position.set(BATTER_POS.x, (opts && opts.jump) || 0, BATTER_POS.z);
  }

  function poseCharacters() {
    const t = S.now;
    // バタコさん
    let bv;
    if (S.phase === 'windup') bv = HR.keys(B_PITCH, S.pt, false);
    else if (S.phase === 'pitch' || S.phase === 'batted' || S.phase === 'cutin' || S.phase === 'after') {
      const tt = S.pitch ? S.now - S.pitch.t0 + RELEASE_T : 2;
      bv = HR.keys(B_PITCH, tt, false);
    } else {
      bv = B_READY.slice();
      bv[1] += Math.sin(t * 2.2) * 0.015;
      bv[4] += Math.sin(t * 2.2) * 0.015;
      if ((S.phase === 'intro' || S.phase === 'sIntro') && S.intro && S.intro.stage === 'pitcher') {
        const a = S.now - S.intro.t0;
        bv[0] = -0.42; bv[1] = 1.55 + Math.sin(a * 14) * 0.08; bv[2] = 0.15;
      }
    }
    // 三振を取って大喜び(両手を上げてジャンプ)
    const cheer = S.mode === 'scene' && S.sc.kind !== 'homerun' && ((S.phase === 'sEnd' && S.pt > 0.6) || S.phase === 'sFinal');
    if (cheer) bv = [-0.5, 1.6, 0.18, 0.5, 1.6, 0.18, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, -10, 0];
    applyBatako(bv);
    if (cheer) batako.root.position.y += Math.abs(Math.sin(S.now * 6.5)) * 0.22;
    if (S.btan) poseBatakoTantrum();
    // ボールを追って振り返る
    let yaw = 0;
    if (S.phase === 'batted' && S.batted) {
      const bp = HR.samplePath(S.batted.sim.pts, S.batted.ft, tmpV);
      const target = Math.atan2(bp.x - PITCHER_POS.x, bp.z - PITCHER_POS.z);
      const tYaw = bp.z < PITCHER_POS.z ? target : 0;
      batako.yaw = HR.lerp(batako.yaw || 0, tYaw, HR.damp(4, 1 / 60));
      yaw = batako.yaw;
    } else batako.yaw = 0;
    if (!S.btan) batako.root.rotation.y = yaw;

    // ランナー(リード → 三振でがっくり)
    if (S.mode === 'scene') {
      const over = S.phase === 'sEnd' || S.phase === 'sFinal';
      const joy = over && S.sc.kind === 'homerun';
      runners.forEach((r, i) => {
        const sway = Math.sin(t * 2.4 + i) * 0.03;
        if (joy) {
          const j = Math.abs(Math.sin(t * 6.5 + i * 1.3));
          HR.Models.poseBatako(r, [-0.32, 1.5, 0.15, 0.32, 1.5, 0.15, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, -10]);
          r.root.position.y = j * 0.2;
          return;
        }
        HR.Models.poseBatako(r, over
          ? [-0.25, 0.3, 0.2, 0.25, 0.3, 0.2, 0.18, 0.06, 0.0, -0.18, 0.06, 0.0, 0, 40]
          : [-0.3, 0.5 + sway, 0.2, 0.3, 0.5 - sway, 0.2, 0.22, 0.06, 0.0, -0.22, 0.06, 0.0, 0, 20]);
      });
    }

    // ジャムおじさん
    if (S.phase === 'sIntro' && S.intro && S.intro.stage === 'batter') {
      // ピッチャーにバットを向けて構える
      applyJam([-0.16, 1.0, 0.24, 180, 14, -30, -0.18, 0.06, 0.04]);
    } else if (S.phase === 'sEnd' || S.phase === 'sFinal') {
      if (S.sc.kind === 'homerun') {
        jamCheer(S.now);
        jam.root.rotation.y = S.phase === 'sFinal' ? Math.PI : -Math.PI / 2;
      } else if (!S.tan && S.sc.kind === 'catch') {
        // ぼうぜんと立ちつくす(唖然とした顔で、バットを下げてアンパンマンを見上げる)
        jam.setFace('shock');
        applyJam([-0.3, 0.42, 0.24, 95, -72, 0, -0.18, 0.06, 0.04], { lean: -0.05 });
        jam.handL.position.set(0.3, 0.44, 0.22);
        jam.root.rotation.y = -Math.PI / 2;
      } else if (!S.tan) applyJam(J_SWING[J_SWING.length - 1][1]);
      else poseTantrum();
    } else if (S.phase === 'cutin' || (S.phase === 'finish' && S.stats.hr >= 3) || (S.phase === 'intro' && S.intro && S.intro.stage === 'batter')) {
      const a = S.now - (S.cutin ? S.cutin.t0 : S.finish ? S.finish.t0 : S.intro.t0);
      const pump = Math.abs(Math.sin(a * 7));
      const intro = S.phase === 'intro';
      applyJam([-0.36, 1.45 + (intro ? 0 : pump * 0.12), 0.12, 100, 82, 0, -0.18, 0.06, 0.04], { jump: intro ? 0 : pump * 0.12 });
      jam.handL.position.set(0.36, intro ? 0.62 : 1.25 + pump * 0.25, 0.14);
    } else if (S.phase === 'finish' && S.tan) {
      poseTantrum();
    } else if (S.phase === 'finish' && S.stats.hr === 0) {
      // がっくり: バットを下げてうなだれる
      const a = S.now - S.finish.t0;
      applyJam([-0.3, 0.42, 0.24, 95, -72, 0, -0.18, 0.06, 0.04], { lean: 0.34 + Math.sin(a * 1.5) * 0.02 });
      jam.handL.position.set(0.3, 0.42, 0.22);
    } else if (S.swing && (S.phase === 'pitch' || S.phase === 'batted')) {
      const st = S.now - S.swing.t0;
      const v = HR.keys(J_SWING, st, true);
      // 照準の高さに合わせてバットの軌道を上下させる
      const w = Math.exp(-Math.pow((st - 0.1) / 0.08, 2));
      const dyAim = (S.swing.cy - 0.85) * w;
      v[1] += dyAim * 0.75;
      v[4] += dyAim * 40;
      applyJam(v);
    } else if (S.swing && S.phase === 'pitch') {
      applyJam(J_SWING[J_SWING.length - 1][1]);
    } else {
      const v = J_STANCE.slice();
      v[3] += Math.sin(t * 3.1) * 6;
      v[1] += Math.sin(t * 3.1) * 0.012;
      if (S.phase === 'windup') { v[5] += HR.smooth(S.pt / 0.9) * 8; v[7] += HR.smooth((S.pt - 0.5) / 0.3) * 0.06; }
      applyJam(v);
    }
    shadows.jam.position.set(BATTER_POS.x, 0.02, BATTER_POS.z);
    shadows.batako.position.set(batako.root.position.x, 0.27, batako.root.position.z);
  }

  const ballPos = new T.Vector3();
  function placeBall(dt) {
    const b = ballM;
    let visible = true;
    const held = !!(S.anp && S.anp.caught && (S.phase === 'batted' || S.phase === 'sEnd' || S.phase === 'sFinal'));
    if (held) {
      // キャッチしたボール(新しい顔)をアンパンマンが右手で持つ
      anpan.root.updateMatrixWorld(true);
      anpan.handR.getWorldPosition(ballPos);
      ballPos.addScaledVector(aUp.set(0, 1, 0).applyQuaternion(anpan.root.quaternion), 0.2);
      b.root.position.copy(ballPos);
      b.root.lookAt(camera.position);
      b.spin.rotation.set(0, 0, 0);
      b.root.scale.setScalar(S.phase === 'batted' ? 1.8 : 1.5);
    } else if (S.phase === 'pitch' && S.pitch) {
      const s = (S.now - S.pitch.t0) / S.pitch.T;
      pitchPos(S.pitch, s, ballPos);
      b.spin.rotation.set(Math.sin(S.now * 5) * 0.25, Math.sin(S.now * 3) * 0.2, -(S.now - S.pitch.t0) * S.pitch.spin);
      if (ballPos.z > 5.5) visible = false;
    } else if (S.phase === 'batted' && S.batted) {
      HR.samplePath(S.batted.sim.pts, S.batted.ft, ballPos);
      const age = S.now - S.batted.t0;
      b.root.position.copy(ballPos);
      b.root.lookAt(camera.position);
      b.spin.rotation.set(Math.sin(age * 9) * 0.35, Math.sin(age * 7) * 0.3, age * 10);
      b.root.scale.setScalar(HR.lerp(1, 1.8, HR.smooth(age / 0.6)));
    } else if (S.phase === 'ready' || S.phase === 'windup' || S.phase === 'intro' || S.phase === 'sIntro' || S.phase === 'title') {
      // バタコさんの手の中
      batako.root.updateMatrixWorld(true);
      if ((S.phase === 'intro' || S.phase === 'sIntro') && S.intro && S.intro.stage === 'pitcher') {
        batako.handL.getWorldPosition(ballPos);
        ballPos.y += 0.12;
        ballPos.z += 0.1;
      } else if (S.phase === 'windup' && S.pt > RELEASE_T - 0.7) {
        batako.handR.getWorldPosition(ballPos);
        ballPos.z += 0.1;
      } else {
        batako.handR.getWorldPosition(tmpV);
        batako.handL.getWorldPosition(ballPos);
        ballPos.add(tmpV).multiplyScalar(0.5);
        ballPos.y += 0.1;
        ballPos.z += 0.14;
      }
      b.spin.rotation.set(0, 0, 0);
    } else visible = false;
    if (S.phase !== 'batted' && !held) { b.root.scale.setScalar(1); b.root.rotation.set(0, 0, 0); }
    b.root.visible = visible;
    b.root.position.copy(ballPos);
    shadows.ball.visible = visible;
    if (visible) {
      const gy = Math.abs(ballPos.z - PITCHER_POS.z) < 2.6 && Math.abs(ballPos.x) < 2.6 ? 0.27 : 0.02;
      const h = Math.max(0, ballPos.y - gy);
      shadows.ball.position.set(ballPos.x, gy + 0.005, ballPos.z);
      const sc = 0.32 + h * 0.03;
      shadows.ball.scale.set(sc, sc, 1);
      shadows.ball.material.opacity = 0.75 / (1 + h * 0.15);
    }
    // 打球の軌跡
    const flying = S.phase === 'batted' && S.batted;
    halo.visible = !!flying && !held;
    if (flying) {
      halo.position.copy(ballPos);
      const tEnd = S.anp ? S.anp.tc : Infinity; // キャッチした後は軌跡を伸ばさない
      trail.forEach((s, i) => {
        const t = Math.min(S.batted.ft, tEnd) - (i + 1) * 0.008;
        s.visible = t > 0.05 && S.batted.ft - (i + 1) * 0.008 < tEnd + 0.25;
        if (s.visible) HR.samplePath(S.batted.sim.pts, t, s.position);
      });
    } else for (const s of trail) s.visible = false;
  }

  // ---------------- カメラ ----------------
  const INTRO_CAM = [
    [0.0, [0, 34, 12, 0, 0, -75]],
    [1.3, [0, 7.5, 9, 0, 2, -20]],
  ];
  function setCam(pos, look, fov) {
    camera.position.copy(pos);
    camera.lookAt(look);
    if (fov && camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }
  function updateCamera(dt) {
    let fov = 50;
    switch (S.phase) {
      case 'title': {
        const a = S.now * 0.12;
        setCam(tmpV.set(Math.sin(a) * 36, 16 + Math.sin(a * 0.7) * 4, -30 + Math.cos(a) * 52), tmpV2.set(0, 2, -30), 55);
        return;
      }
      case 'intro': {
        const t = S.pt;
        if (t < 1.3) {
          const v = HR.keys(INTRO_CAM, t, false);
          setCam(tmpV.set(v[0], v[1], v[2]), tmpV2.set(v[3], v[4], v[5]), 50);
        } else if (t < 2.5) {
          const u = HR.smooth((t - 1.3) / 1.2);
          setCam(tmpV.set(HR.lerp(1.3, 1.0, u), HR.lerp(1.75, 1.7, u), HR.lerp(-14.2, -14.7, u)), tmpV2.set(0.1, 1.2, PITCHER_POS.z), 42);
        } else {
          const u = HR.smooth((t - 2.5) / 1.3);
          setCam(tmpV.set(HR.lerp(-2.7, -2.35, u), HR.lerp(1.3, 1.35, u), HR.lerp(1.25, 1.05, u)), tmpV2.set(BATTER_POS.x, 1.15, BATTER_POS.z), 42);
        }
        return;
      }
      case 'batted': {
        const b = S.batted;
        const bp = ballPos;
        // ホームランはフェンスを越えた瞬間にカメラを止め、スタンドへ飛び込む打球を見送る
        const landed = !!b.kind;
        if (S.mode === 'scene' && sceneScript()[S.sc.i].act === 'foul') {
          // 名場面のファウルは、本塁後方の高い位置からライト線へ切れていく打球を見せる
          cam.pos.copy(BAT_CAM.pos).lerp(tmpV.set(-5, 9, 15), HR.smooth((S.now - b.t0) / 0.6));
          cam.look.lerp(bp, HR.damp(landed ? 3 : 7, dt));
        } else if (!landed || b.kind === 'catch') {
          // 打球のすぐ後ろから追いかける(アンパンマンの顔が見える距離)。キャッチした後はアンパンマンを追う
          const age = S.now - b.t0;
          tmpV.set(bp.x - b.dir.x * 7.5, Math.max(1.4, bp.y + 1.6), bp.z - b.dir.z * 7.5);
          const k = HR.smooth(age / 0.75);
          cam.pos.copy(BAT_CAM.pos).lerp(tmpV, k);
          cam.look.copy(BAT_CAM.look).lerp(bp, HR.smooth(age / 0.35));
        } else {
          cam.look.lerp(bp, HR.damp(6, dt));
        }
        camera.position.copy(cam.pos);
        camera.lookAt(cam.look);
        if (camera.fov !== 50) { camera.fov = 50; camera.updateProjectionMatrix(); }
        applyShake();
        return;
      }
      case 'cutin': {
        const u = HR.easeOutCubic(S.pt / 0.5);
        setCam(tmpV.set(HR.lerp(-2.2, -1.55, u), 1.15, HR.lerp(1.0, 0.75, u)), tmpV2.set(BATTER_POS.x, 1.3, BATTER_POS.z), 44);
        return;
      }
      case 'sIntro': {
        const t = S.pt;
        if (t < 2.2) {
          const u = HR.smooth(t / 2.2);
          setCam(tmpV.set(0, HR.lerp(46, 30, u), HR.lerp(32, 18, u)), tmpV2.set(0, 0, -24), 64);
        } else if (t < 3.5) {
          // 二塁ランナーの背中越しに、マウンドのバタコさんと打席のジャムおじさん
          const u = HR.smooth((t - 2.2) / 1.3);
          setCam(tmpV.set(-3.0, 2.0, HR.lerp(-42.4, -41.6, u)), tmpV2.set(0.2, 0.9, -8), 40);
        } else if (t < 5.4) {
          const u = HR.smooth((t - 3.5) / 1.9);
          setCam(tmpV.set(HR.lerp(1.3, 1.0, u), HR.lerp(1.75, 1.7, u), HR.lerp(-14.2, -14.7, u)), tmpV2.set(0.1, 1.2, PITCHER_POS.z), 42);
        } else {
          const u = HR.smooth((t - 5.4) / 1.9);
          setCam(tmpV.set(HR.lerp(-2.7, -2.35, u), HR.lerp(1.3, 1.35, u), HR.lerp(1.45, 1.2, u)), tmpV2.set(BATTER_POS.x - 0.2, 1.15, BATTER_POS.z), 44);
        }
        return;
      }
      case 'sEnd': {
        const t = S.pt;
        if (S.sc.kind === 'catch') {
          // ジャムおじさんの斜め前から。追いかけっこが始まったら引いて、浮かぶアンパンマンまで入れる
          const tan = S.tan;
          const tr = tan && tan.variant === 'charge' ? S.now - tan.t0 - TANTRUM_VARIANT.charge.rush : -9;
          const k = HR.smooth((tr + 0.3) / 1.6);
          setCam(tmpV.lerpVectors(CATCH_CAM.pos, CATCH_CAM.wide, k), tmpV2.lerpVectors(CATCH_CAM.look, CATCH_CAM.wideLook, k), 50);
          applyShake();
          return;
        }
        if (S.sc.kind === 'homerun') {
          if (t < SCENE_END_HR.batako) {
            const u = HR.easeOutCubic(t / 0.5);
            setCam(tmpV.set(HR.lerp(-2.4, -1.7, u), 1.15, HR.lerp(1.1, 0.8, u)), tmpV2.set(BATTER_POS.x, 1.3, BATTER_POS.z), 46);
          } else {
            // 帽子を叩きつける → グローブを投げる → しゃがんでマウンドを叩くまで、全身が入る正面から少しずつ寄る
            const tb = t - SCENE_END_HR.batako;
            const u = HR.smooth(tb / 6), k = HR.smooth((tb - B_TANTRUM_T.pound + 0.4) / 0.8);
            setCam(tmpV.set(0, HR.lerp(1.55, 1.3, k), HR.lerp(-14.9, -15.25, u)), tmpV2.set(0, HR.lerp(1.45, 1.05, k), PITCHER_POS.z), 48);
            applyShake();
          }
          return;
        }
        if (t < SCENE_END.batako) { setCam(BAT_CAM.pos, BAT_CAM.look, 50); applyShake(); }
        else if (t < SCENE_END.jam) setCam(tmpV.set(0.15, 1.75, -14.6), tmpV2.set(0, 2.1, PITCHER_POS.z), 50);
        else { setCam(tmpV.set(BATTER_POS.x - 2.9, 1.0, BATTER_POS.z + 0.5), tmpV2.set(BATTER_POS.x, 0.95, BATTER_POS.z), 46); applyShake(); }
        return;
      }
      case 'sFinal':
        // 逆転版はうずくまるバタコさんの背中越しに、ホームで喜ぶジャムおじさんたち
        if (S.sc.kind === 'homerun') setCam(tmpV.set(0.5, 1.45, -21.6), tmpV2.set(0.5, 0.9, 0), 46);
        else if (S.sc.kind === 'catch') setCam(CATCH_CAM.wide, CATCH_CAM.wideLook, 50);
        else setCam(tmpV.set(0.5, 1.3, 3.4), tmpV2.set(0.3, 1.0, -8), 50);
        return;
      case 'finish': {
        if (S.tan && S.now < S.finish.t0) {
          setCam(tmpV.set(BATTER_POS.x - 2.9, 1.0, BATTER_POS.z + 0.5), tmpV2.set(BATTER_POS.x, 0.95, BATTER_POS.z), 46);
          applyShake();
          return;
        }
        const a = S.now * 0.15;
        // 結果パネルの下にジャムおじさんの顔が来るよう、注視点を頭より上にとる
        setCam(tmpV.set(-1.35 + Math.sin(a) * 0.25, 1.2, 0.75 + Math.cos(a) * 0.2), tmpV2.set(BATTER_POS.x, 1.85, BATTER_POS.z), 46);
        return;
      }
      default:
        setCam(BAT_CAM.pos, BAT_CAM.look, fov);
        applyShake();
    }
  }
  function applyShake() {
    if (S.shake > 0) {
      camera.position.x += (fxRng() - 0.5) * S.shake;
      camera.position.y += (fxRng() - 0.5) * S.shake;
    }
  }

  // ---------------- 描画 ----------------
  const ndc = new T.Vector3();
  function project(x, y, z) {
    ndc.set(x, y, z).project(batCam);
    return [(ndc.x + 1) * 0.5 * W, (1 - ndc.y) * 0.5 * H];
  }
  function hudState(dt) {
    const batView = ['ready', 'windup', 'pitch'].includes(S.phase);
    const st = {
      now: S.now, dt, stats: S.stats, best: S.best, balls: S.balls, power: S.power, live: S.live,
      showBoards: !['title', 'intro', 'finish', 'cutin'].includes(S.phase),
      showPlates: batView,
      caption: S.phase === 'finish' && S.now > S.finish.t0 ? null : S.caption, banner: S.banner, intro: S.intro, cutin: S.cutin, finish: S.finish,
      title: S.phase === 'title' ? S.title : null, flash: S.flash, cursorFlash: S.cursorFlash > 0,
      pitchInfo: batView || S.phase === 'batted' ? S.pitchInfo : null,
    };
    if (S.mode === 'scene' && S.sc) {
      const sc = S.sc;
      st.showBoards = S.phase === 'sIntro' || batView || S.phase === 'batted' || (S.phase === 'sEnd' && S.pt < SCENE_END.batako);
      const won = sc.score[1] > sc.score[0];
      st.situation = { inning: 9, half: '裏', teams: teams(), bases: won ? [0, 0, 0] : [1, 1, 1], b: sc.b, s: sc.s, o: Math.min(2, sc.o), alert: won ? 'サヨナラ!' : sc.o >= 3 ? 'ゲームセット' : 'サヨナラのピンチ' };
      st.final = S.final;
      if (st.caption && S.phase === 'sFinal') st.caption = null;
    }
    // 結果発表が出たら吹き出しは消すが、怒りマークと湯気は残して悔しさを見せる
    const panelUp = S.phase === 'finish' && S.finish && S.now > S.finish.t0;
    const fx = [].concat(S.tan ? S.tan.fx : [], S.btan ? S.btan.fx : [], S.cfx || []);
    if (fx.length) st.fx = fx.filter((f) => !panelUp || f.kind !== 'text').map((f) => { const [x, y] = projCam(f.at ? f.at() : f.w); return Object.assign({}, f, { x, y }); });
    const speechAt = (sp) => {
      const who = sp.who === 'batako' ? batako : sp.who === 'anpan' ? anpan : jam;
      const [hx, hy] = projCam(who.head.getWorldPosition(tmpV).add(tmpV2.set(0, 0.5, 0)));
      // 喜ぶバタコさん(引きの画)は実況テロップより下、アップの時は頭の上に出す
      // side: 'right' は頭の右上に出して、しっぽを左下へ向ける(左上のアンパンマンと重ならないように)
      const wide = sp.who === 'batako' && sp.style !== 'close', right = sp.side === 'right';
      const [dx, dy, top] = wide ? [-270, -170, 760] : right ? [160, -160, 420] : [-150, -150, 420];
      return { text: sp.text, t0: sp.t0, x: HR.clamp(hx + dx, 300, W - 300), y: HR.clamp(hy + dy, top, 1500), flip: right };
    };
    if (S.speech && !panelUp && S.now >= S.speech.t0 && (S.mode === 'scene' || S.tan)) st.speech = speechAt(S.speech);
    if (S.speech2 && S.mode === 'scene' && S.now >= S.speech2.t0) st.speech2 = speechAt(S.speech2);
    if (S.phase === 'title' && sceneMode) st.title = { t0: S.title.t0, scene: true, full: fromFullCount(sceneKind) };
    const bs = S.batakoSay;
    if (bs && batView && (!bs.sore || S.now - bs.sore < 0.8)) {
      const r = batako.root.position;
      const [x, y] = project(r.x, r.y + 2.15, r.z);
      st.batako = { x, y, text: bs.text, age: S.now - bs.t0, sore: bs.sore ? S.now - bs.sore : -1 };
    }
    if (batView) {
      st.zone = [project(ZONE.x0, ZONE.y1, 0), project(ZONE.x1, ZONE.y1, 0), project(ZONE.x1, ZONE.y0, 0), project(ZONE.x0, ZONE.y0, 0)];
      const cs = curSize(), c = S.cursor;
      const outer = [], inner = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        outer.push(project(c.x + Math.cos(a) * cs.rx, c.y + Math.sin(a) * cs.ry, 0));
        inner.push(project(c.x + Math.cos(a) * cs.rx * 0.38, c.y + Math.sin(a) * cs.ry * 0.38, 0));
      }
      st.cursor = { outer, inner, center: project(c.x, c.y, 0) };
    }
    return st;
  }

  function render(dt) {
    renderer.render(scene, camera);
    g.drawImage(renderer.domElement, 0, 0, W, H);
    HR.HUD.draw(g, hudState(dt));
  }

  // ---------------- 入力 ----------------
  const keys = new Set();
  const raycaster = new T.Raycaster();
  const zPlane = new T.Plane(new T.Vector3(0, 0, 1), 0);
  function toCanvas(e) {
    const r = screen.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  }
  function aimAt(x, y) {
    raycaster.setFromCamera({ x: (x / W) * 2 - 1, y: -((y / H) * 2 - 1) }, batCam);
    const hit = raycaster.ray.intersectPlane(zPlane, tmpV);
    if (hit) { S.curTarget.x = hit.x; S.curTarget.y = hit.y; }
  }
  function onTap() {
    HR.Audio.init();
    HR.Audio.resume();
    if (S.phase === 'title') { startGame(); return true; }
    if (S.phase === 'finish' && S.now - S.finish.t0 > 2) { startGame(); return true; }
    if (S.phase === 'sFinal' && S.pt > 2) { startScene(); return true; }
    if (S.mode === 'scene') return true;
    if (S.phase === 'cutin' || (S.phase === 'batted' && S.batted && S.batted.kind)) {
      if (S.phase === 'batted' && S.batted.kind === 'hr') startCutin();
      else nextPitch();
      return true;
    }
    return false;
  }
  let drag = null;
  function bindInput() {
    screen.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { screen.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (onTap()) return;
      if (e.pointerType === 'mouse') {
        if (S.auto) return;
        const [x, y] = toCanvas(e);
        aimAt(x, y);
        S.cursor.x = S.curTarget.x; S.cursor.y = S.curTarget.y;
        trySwing();
      } else {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: S.curTarget.x, cy: S.curTarget.y };
      }
    });
    screen.addEventListener('pointermove', (e) => {
      if (S.auto) return;
      if (e.pointerType === 'mouse') {
        const [x, y] = toCanvas(e);
        aimAt(x, y);
      } else if (drag && drag.id === e.pointerId) {
        const r = screen.getBoundingClientRect();
        const k = (W / r.width) * 0.0024 * 1.25;
        S.curTarget.x = drag.cx + (e.clientX - drag.x) * k;
        S.curTarget.y = drag.cy - (e.clientY - drag.y) * k;
      }
    });
    const up = (e) => {
      if (drag && drag.id === e.pointerId) {
        drag = null;
        if (!S.auto) trySwing();
      }
    };
    screen.addEventListener('pointerup', up);
    screen.addEventListener('pointercancel', () => { drag = null; });
    const KEYMAP = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
    window.addEventListener('keydown', (e) => {
      const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase && e.key.toLowerCase()];
      if (k) { keys.add(k); e.preventDefault(); return; }
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (!onTap() && !S.auto) trySwing();
      } else if (e.key === 'x' || e.key === 'X' || e.key === 'Shift') {
        togglePower();
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase && e.key.toLowerCase()];
      if (k) keys.delete(k);
    });
  }
  function backToTitle() {
    S.mode = 'derby';
    S.power = false;
    S.auto = qs.get('auto') === '1';
    S.sc = null; S.tan = null; S.btan = null; S.final = null; S.speech = null; S.banner = null; S.caption = null; S.intro = null; S.pitch = null; S.swing = null; S.batted = null;
    S.anp = null; S.cfx = null; S.speech2 = null;
    resetScenery();
    HR.HUD.clearParticles();
    stadium.drawScreen('ホームラン競争', 'HR 0本', false);
    setPhase('title');
    S.title = { t0: S.now };
  }
  function togglePower() {
    if (S.auto) return;
    S.power = !S.power;
    sfx('tick');
    syncButtons();
  }

  // ---------------- ツールバー・録画 ----------------
  const $ = (id) => document.getElementById(id);
  function syncButtons() {
    const set = (id, on, label) => { const b = $(id); if (!b) return; b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (label) b.querySelector('.lbl').textContent = label; };
    set('btnPower', S.power, S.power ? '強振' : 'ミート');
    set('btnAuto', S.auto);
    set('btnVoice', HR.Voice.enabled);
    set('btnSound', !HR.Audio.muted, HR.Audio.muted ? '音 OFF' : '音 ON');
    set('btnRec', !!Rec.mr, Rec.mr ? '録画を止める' : '録画');
    set('btnScene', sceneMode);
    for (const b of document.querySelectorAll('#sceneDlg [data-scene]')) b.setAttribute('aria-current', sceneMode && b.dataset.scene === sceneKind ? 'true' : 'false');
    const back = $('btnDerby');
    if (back) back.hidden = !sceneMode;
  }
  const Rec = { mr: null, chunks: [], t0: 0, blob: null, ext: 'webm' };
  function recStart() {
    if (!screen.captureStream || !window.MediaRecorder) { toast('このブラウザは録画に対応していません。画面収録機能をお使いください'); return; }
    HR.Audio.init();
    HR.Audio.resume();
    const stream = screen.captureStream(30);
    if (HR.Audio.recDest) for (const tr of HR.Audio.recDest.stream.getAudioTracks()) stream.addTrack(tr);
    const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
    let mr;
    try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 } : undefined); } catch (e) { toast('録画を開始できませんでした'); return; }
    Rec.ext = /mp4/.test(mr.mimeType || mime) ? 'mp4' : 'webm';
    Rec.chunks = [];
    mr.ondataavailable = (e) => { if (e.data && e.data.size) Rec.chunks.push(e.data); };
    mr.onstop = () => {
      Rec.blob = new Blob(Rec.chunks, { type: mr.mimeType || mime || 'video/webm' });
      Rec.mr = null;
      syncButtons();
      showSaveDialog();
    };
    mr.start(1000);
    Rec.mr = mr;
    Rec.t0 = performance.now();
    Rec.autoStop = false;
    if (S.phase === 'title' || S.phase === 'finish' || S.phase === 'sFinal') startGame();
    syncButtons();
  }
  function recStop() { if (Rec.mr && Rec.mr.state !== 'inactive') Rec.mr.stop(); }
  function showSaveDialog() {
    const dlg = $('saveDlg');
    if (!dlg || !Rec.blob) return;
    const mb = (Rec.blob.size / 1048576).toFixed(1);
    $('saveInfo').textContent = `${Rec.ext.toUpperCase()} ・ ${mb}MB ・ 1080×1920(縦)`;
    dlg.hidden = false;
  }
  async function saveVideo() {
    if (!Rec.blob) return;
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    const filename = `jam-homerun-${stamp}.${Rec.ext}`;
    let dl = null;
    try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; }
    if (dl) {
      try {
        await dl.save({ filename, data: Rec.blob });
        toast('保存しました');
        $('saveDlg').hidden = true;
      } catch (e) {
        if (e && e.code === 'declined') toast('保存をキャンセルしました');
        else if (e && e.code === 'rejected_extension') toast('この形式は保存できませんでした');
        else toast('保存できませんでした。もう一度お試しください');
      }
      return;
    }
    const url = URL.createObjectURL(Rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('saveDlg').hidden = true;
  }
  let toastTimer = 0;
  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function bindToolbar() {
    const on = (id, fn) => { const b = $(id); if (b) b.addEventListener('click', (e) => { e.stopPropagation(); fn(); b.blur(); }); };
    on('btnPower', () => { if (S.auto || S.mode === 'scene') { toast('オート中は自動で切り替わります'); return; } togglePower(); });
    on('btnAuto', () => {
      if (S.mode === 'scene') { toast('名場面の再生中は切り替えられません'); return; }
      S.auto = !S.auto;
      S.ai = null;
      syncButtons();
    });
    on('btnVoice', () => { HR.Voice.enabled = !HR.Voice.enabled; if (!HR.Voice.enabled && 'speechSynthesis' in window) speechSynthesis.cancel(); syncButtons(); });
    on('btnSound', () => { HR.Audio.init(); HR.Audio.setMuted(!HR.Audio.muted); syncButtons(); });
    on('btnRec', () => { if (Rec.mr) recStop(); else recStart(); });
    // 9回裏の名場面: ボタンで結末を選ぶ画面を開く
    const sceneDlg = $('sceneDlg');
    const closeSceneDlg = () => { if (sceneDlg) sceneDlg.hidden = true; };
    on('btnScene', () => {
      if (!sceneDlg) return;
      syncButtons();
      sceneDlg.hidden = false;
      const cur = sceneDlg.querySelector('[aria-current="true"]') || sceneDlg.querySelector('[data-scene]');
      if (cur) cur.focus();
    });
    for (const b of document.querySelectorAll('#sceneDlg [data-scene]')) {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        HR.Audio.init();
        HR.Audio.resume();
        sceneMode = true;
        sceneKind = b.dataset.scene;
        closeSceneDlg();
        startScene();
        syncButtons();
      });
    }
    on('btnDerby', () => {
      sceneMode = false;
      closeSceneDlg();
      backToTitle();
      syncButtons();
    });
    on('btnSceneClose', closeSceneDlg);
    if (sceneDlg) sceneDlg.addEventListener('click', (e) => { if (e.target === sceneDlg) closeSceneDlg(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSceneDlg(); const sd = $('saveDlg'); if (sd) sd.hidden = true; } });
    on('btnSave', saveVideo);
    on('btnClose', () => { $('saveDlg').hidden = true; });
    syncButtons();
  }
  function recTick() {
    const el = $('recTime');
    if (!el) return;
    if (Rec.mr) {
      const s = Math.floor((performance.now() - Rec.t0) / 1000);
      el.textContent = `● REC ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      el.hidden = false;
      // 結果発表を見せきったら自動で止める
      const ended = (S.phase === 'finish' && S.finish && S.now - S.finish.t0 > 4.5) || (S.phase === 'sFinal' && S.pt > 4.2);
      if (ended && !Rec.autoStop) { Rec.autoStop = true; recStop(); }
    } else el.hidden = true;
  }

  // 画面サイズに合わせて 9:16 で最大表示
  function fit() {
    const stage = $('stage');
    if (!stage) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    const s = Math.min(w / 9, h / 16);
    screen.style.width = `${Math.floor(s * 9)}px`;
    screen.style.height = `${Math.floor(s * 16)}px`;
  }

  // ---------------- 起動 ----------------
  async function boot() {
    try {
      if (document.fonts && document.fonts.load) {
        const txt = HR.allText();
        await Promise.race([
          Promise.all([
            document.fonts.load(`900 40px "M PLUS Rounded 1c"`, txt),
            document.fonts.load(`800 40px "M PLUS Rounded 1c"`, txt),
            document.fonts.load(`40px "Dela Gothic One"`, txt),
          ]),
          new Promise((r) => setTimeout(r, 6000)),
        ]);
      }
    } catch (e) { /* フォントが読めなくても代替フォントで続行 */ }
    setupScene();
    S.title = { t0: 0 };
    if (OFFLINE) {
      HR.Audio.offline = true;
      HR.Audio.clock = () => S.now;
      window.__rec = {
        fps: OFFLINE_FPS,
        frame() {
          const dt = 1 / OFFLINE_FPS;
          update(dt);
          render(dt);
          return screen.toDataURL('image/jpeg', 0.93);
        },
        skip(sec) {
          const dt = 1 / OFFLINE_FPS;
          for (let i = 0; i < Math.round(sec * OFFLINE_FPS) && !S.done; i++) update(dt);
        },
        get done() { return S.done; },
        get time() { return S.now; },
        get phase() { return S.phase; },
        get stats() { return S.stats; },
        async audio() {
          const wav = await HR.Audio.renderOffline(S.now + 0.3);
          let s = '';
          for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
          return btoa(s);
        },
      };
      window.__recReady = true;
      return;
    }
    bindInput();
    bindToolbar();
    fit();
    window.addEventListener('resize', fit);
    let last = performance.now(), slow = 0, frames = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      render(dt);
      recTick();
      // 重い端末では3D描画の解像度を下げる(録画中は維持)
      frames++;
      if (dt > 0.026) slow++;
      if (frames >= 90) {
        if (slow > 45 && renderScale > 0.6 && !Rec.mr) {
          renderScale = Math.round((renderScale - 0.15) * 100) / 100;
          renderer.setSize(W * renderScale, H * renderScale, false);
        }
        frames = 0; slow = 0;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const ld = $('loading');
    if (ld) ld.hidden = true;
  }
  boot();
})();
