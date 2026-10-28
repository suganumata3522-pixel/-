'use strict';
// ゲーム本体: 進行管理・投球・打撃判定・カメラ・入力・録画
(function () {
  const HR = window.HR;
  const T = THREE;
  const W = HR.W, H = HR.H, DEG = HR.DEG;

  const qs = new URLSearchParams(location.search);
  const OFFLINE = qs.get('record') === '1';
  const SEED = parseInt(qs.get('seed'), 10) || (OFFLINE ? 7 : Date.now() % 100000);
  const TOTAL_BALLS = HR.clamp(parseInt(qs.get('balls'), 10) || 10, 1, 30);
  const OFFLINE_FPS = parseInt(qs.get('fps'), 10) || 30;
  // ai=whiff: オートのジャムおじさんが一球も当てられない(動画用)
  const AI_MODE = qs.get('ai') === 'whiff' ? 'whiff' : 'normal';

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
  // 振りかぶり(「アンパンマン!」)で一度止まり、「新しい顔よ!」で投げ始めて「それっ!」でリリース
  const RELEASE_T = 1.6;
  const FACE_LEAD = 0.94; // 「新しい顔よ!」の長さ+間。リリースのこの秒数前に言い始める

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

  let renderer, scene, camera, batCam, stadium, batako, jam, ballM;
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
    shadows.jam = HR.Models.blob(1.2, 1.0, 0.9);
    shadows.batako = HR.Models.blob(1.2, 1.0, 0.9);
    shadows.ball = HR.Models.blob(0.4, 0.4, 0.8);
    scene.add(shadows.jam, shadows.batako, shadows.ball);
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
    const text = fill(pick(list), vars || {});
    S.caption = { text, t0: S.now };
    if (!(opts && opts.quiet)) HR.Voice.say(text, !(opts && opts.queue));
  }
  const sfx = (name, opt) => HR.Audio.play(name, opt);
  const curSize = () => (S.power ? CUR.power : CUR.meet);

  // ---------------- 進行 ----------------
  function setPhase(p) { S.phase = p; S.pt = 0; }

  function startGame() {
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
    S.finish = { t0: S.now + 0.6, stats: Object.assign({}, st), rank: HR.rankFor(st.hr), newRecord, perfect };
    say(perfect ? 'finishZero' : 'finish', { n: st.hr });
    sfx('cheer', { level: 0.5, dur: 3.5 });
    if (perfect) sfx('organ');
    if (st.hr >= 3) { sfx('fanfare'); HR.HUD.confetti(160); }
  }

  function makePitch() {
    const total = PITCHES.reduce((a, p) => a + p.w, 0);
    let r = rng() * total, type = PITCHES[0];
    for (const p of PITCHES) { r -= p.w; if (r <= 0) { type = p; break; } }
    const kmh = Math.round(rr(type.kmh[0], type.kmh[1]));
    const tx = HR.clamp(gauss() * 0.17, -0.4, 0.4);
    const ty = HR.clamp(0.86 + gauss() * 0.19, 0.45, 1.28);
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
    const L = HR.contactToLaunch(c, S.swing.power, gauss);
    const v = L.kmh / 3.6, th = L.launch * DEG, ph = L.spray * DEG;
    const v0 = { x: v * Math.cos(th) * Math.sin(ph), y: v * Math.sin(th), z: -v * Math.cos(th) * Math.cos(ph) };
    const sim = HR.simulateBatted({ x: p0.x, y: p0.y, z: p0.z }, v0, L);
    S.batted = { sim, L, ft: 0, t0: S.now, events: {}, dir: { x: Math.sin(ph), z: -Math.cos(ph) } };
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
      case 'ready':
        if (S.pt > (S.pitchNo === 1 ? 1.3 : 0.6)) {
          setPhase('windup');
          if (S.banner && S.banner.kind === 'play') S.banner = null;
          S.batakoSay = { t0: S.now, text: 'アンパンマン!', sore: 0 };
          sfx('voice', { name: 'call' });
        }
        break;
      case 'windup':
        if (S.batakoSay && S.batakoSay.text === 'アンパンマン!' && S.pt >= RELEASE_T - FACE_LEAD) {
          S.batakoSay = { t0: S.now, text: '新しい顔よ!', sore: 0 };
          sfx('voice', { name: 'face' });
        }
        if (S.pt >= RELEASE_T) {
          S.pitch = makePitch();
          S.balls--;
          S.pitchInfo = { name: S.pitch.name, kmh: S.pitch.kmh, t0: S.now };
          sfx('throw');
          sfx('voice', { name: 'sore' });
          if (OFFLINE) (window.__pitchLog = window.__pitchLog || []).push(`${S.pitch.name}${S.pitch.kmh}`);
          if (S.batakoSay) { S.batakoSay.sore = S.now; S.batakoSay.text = '新しい顔よ!それっ!'; }
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
          const kind = S.swing ? 'whiff' : 'look';
          if (OFFLINE) (window.__log = window.__log || []).push(kind);
          S.banner = { kind, t0: S.now };
          S.streak = (S.streak || 0) + 1;
          if (kind === 'whiff' && S.streak >= 3 && rng() < 0.5) say('whiffStreak', { k: S.streak });
          else say(kind === 'whiff' ? HR.WHIFF_KEY[p.name] || 'whiff' : 'look');
          sfx('groan');
        }
        if (S.missed && S.pt > p.T * 1.35 + 1.0) { S.missed = false; nextPitch(); }
        break;
      }
      case 'batted': {
        const b = S.batted, sim = b.sim;
        const age = S.now - b.t0;
        const rate = age < 0.1 ? 0.15 : HR.lerp(0.6, FLIGHT_SPEED, HR.smooth((age - 0.1) / 0.5));
        b.ft += dt * rate;
        if (sim.result === 'hr' && sim.hrT > 1.4 && !b.events.fly && b.ft > sim.hrT * 0.4) { b.events.fly = true; say('flyBig'); }
        if (!b.kind) {
          if (sim.result === 'hr' && b.ft >= sim.hrT) resolveBatted('hr');
          else if (sim.result !== 'hr' && b.ft >= (sim.landT != null ? sim.landT : sim.dur)) resolveBatted(sim.result === 'hit' && sim.fenceT != null ? 'wall' : sim.result);
        }
        if (b.kind === 'hr' && S.now - S.fireworkT > 0.45 && !b.events.fw2) { b.events.fw2 = true; sfx('firework'); for (let i = 0; i < 2; i++) HR.HUD.burst(150 + rng() * 780, 220 + rng() * 520); }
        const end = b.kind === 'hr' ? b.ft >= sim.hrT + 1.7 : b.kind && (b.ft >= (sim.landT != null ? sim.landT : sim.dur) + 0.9 || b.ft >= sim.dur + 0.3);
        if (end) {
          if (b.kind === 'hr') startCutin();
          else nextPitch();
        }
        break;
      }
      case 'cutin':
        if (S.pt > 1.6) nextPitch();
        break;
      case 'finish':
        if (OFFLINE && S.now - S.finish.t0 > 5.2) S.done = true;
        break;
    }
    if (S.batted && S.batted.kind === 'hr' && S.phase === 'cutin' && S.pt > 0.3 && !S.batted.events.fw3) {
      S.batted.events.fw3 = true;
      for (let i = 0; i < 2; i++) HR.HUD.burst(150 + rng() * 780, 220 + rng() * 400);
    }
    stadium.update(S.now, dt, S.excite);
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
    const m = batako;
    m.handR.position.set(v[0], v[1], v[2]);
    m.handL.position.set(v[3], v[4], v[5]);
    m.footL.position.set(v[6], v[7], v[8]);
    m.footR.position.set(v[9], v[10], v[11]);
    m.pivot.rotation.set(v[13] * DEG, v[12] * DEG, 0, 'YXZ');
    m.pivot.position.z = 0;
    m.root.position.set(PITCHER_POS.x, PITCHER_POS.y, PITCHER_POS.z + v[14]);
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
  const UP = new T.Vector3(0, 1, 0);
  function applyJam(v, opts) {
    const m = jam;
    const psi = v[3] * DEG, eps = v[4] * DEG;
    const dir = tmpV2.set(Math.cos(eps) * Math.cos(psi), Math.sin(eps), Math.cos(eps) * Math.sin(psi)).normalize();
    m.handR.position.set(v[0], v[1], v[2]);
    m.handL.position.set(v[0] + dir.x * 0.14, v[1] + dir.y * 0.14, v[2] + dir.z * 0.14);
    m.bat.position.set(v[0] - dir.x * 0.07, v[1] - dir.y * 0.07, v[2] - dir.z * 0.07);
    m.bat.quaternion.setFromUnitVectors(UP, dir);
    m.pivot.rotation.set((opts && opts.lean) || 0, v[5] * DEG, 0, 'YXZ');
    m.footL.position.set(0.18, 0.06, 0.0);
    m.footR.position.set(v[6], v[7], v[8]);
    m.root.position.set(BATTER_POS.x, (opts && opts.jump) || 0, BATTER_POS.z);
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
      if (S.phase === 'intro' && S.intro && S.intro.stage === 'pitcher') {
        const a = S.now - S.intro.t0;
        bv[0] = -0.42; bv[1] = 1.55 + Math.sin(a * 14) * 0.08; bv[2] = 0.15;
      }
    }
    applyBatako(bv);
    // ボールを追って振り返る
    let yaw = 0;
    if (S.phase === 'batted' && S.batted) {
      const bp = HR.samplePath(S.batted.sim.pts, S.batted.ft, tmpV);
      const target = Math.atan2(bp.x - PITCHER_POS.x, bp.z - PITCHER_POS.z);
      const tYaw = bp.z < PITCHER_POS.z ? target : 0;
      batako.yaw = HR.lerp(batako.yaw || 0, tYaw, HR.damp(4, 1 / 60));
      yaw = batako.yaw;
    } else batako.yaw = 0;
    batako.root.rotation.y = yaw;

    // ジャムおじさん
    if (S.phase === 'cutin' || (S.phase === 'finish' && S.stats.hr >= 3) || (S.phase === 'intro' && S.intro && S.intro.stage === 'batter')) {
      const a = S.now - (S.cutin ? S.cutin.t0 : S.finish ? S.finish.t0 : S.intro.t0);
      const pump = Math.abs(Math.sin(a * 7));
      const intro = S.phase === 'intro';
      applyJam([-0.36, 1.45 + (intro ? 0 : pump * 0.12), 0.12, 100, 82, 0, -0.18, 0.06, 0.04], { jump: intro ? 0 : pump * 0.12 });
      jam.handL.position.set(0.36, intro ? 0.62 : 1.25 + pump * 0.25, 0.14);
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
    if (S.phase === 'pitch' && S.pitch) {
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
    } else if (S.phase === 'ready' || S.phase === 'windup' || S.phase === 'intro' || S.phase === 'title') {
      // バタコさんの手の中
      batako.root.updateMatrixWorld(true);
      if (S.phase === 'intro' && S.intro && S.intro.stage === 'pitcher') {
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
    if (S.phase !== 'batted') { b.root.scale.setScalar(1); b.root.rotation.set(0, 0, 0); }
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
    halo.visible = !!flying;
    if (flying) {
      halo.position.copy(ballPos);
      trail.forEach((s, i) => {
        const t = S.batted.ft - (i + 1) * 0.008;
        s.visible = t > 0.05;
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
        if (!landed) {
          // 打球のすぐ後ろから追いかける(アンパンマンの顔が見える距離)
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
      case 'finish': {
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
    if (S.phase === 'title' || S.phase === 'finish') startGame();
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
    on('btnPower', () => { if (S.auto) { toast('オート中は自動で切り替わります'); return; } togglePower(); });
    on('btnAuto', () => { S.auto = !S.auto; S.ai = null; syncButtons(); });
    on('btnVoice', () => { HR.Voice.enabled = !HR.Voice.enabled; if (!HR.Voice.enabled && 'speechSynthesis' in window) speechSynthesis.cancel(); syncButtons(); });
    on('btnSound', () => { HR.Audio.init(); HR.Audio.setMuted(!HR.Audio.muted); syncButtons(); });
    on('btnRec', () => { if (Rec.mr) recStop(); else recStart(); });
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
      if (S.phase === 'finish' && S.finish && S.now - S.finish.t0 > 4.5 && !Rec.autoStop) { Rec.autoStop = true; recStop(); }
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
