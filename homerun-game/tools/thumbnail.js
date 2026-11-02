'use strict';
// YouTube ショート用サムネイル(1080x1920)。thumbnail.html?design=hr-a のように開くと描画する。
// 球場とキャラクターを別々にレンダリングし、背景をぼかしてキャラクターに白フチを付け、文字を重ねる。
(async function () {
  const HR = window.HR;
  const T = THREE;
  const W = 1080, H = 1920;
  const design = new URLSearchParams(location.search).get('design') || 'hr-a';
  const out = document.getElementById('out');
  const g = out.getContext('2d');
  const UI = (w, px) => `${w} ${px}px ${HR.FONT_UI}`;
  const IMP = (px) => `${px}px ${HR.FONT_IMPACT}`;
  const rnd = HR.makeRng(2024);

  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  // ---------------- 3D ----------------
  function blank() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    return c;
  }
  function snap(scene, cam) {
    renderer.render(scene, cam);
    const c = blank();
    c.getContext('2d').drawImage(renderer.domElement, 0, 0, W, H);
    return c;
  }
  function camera(pos, look, fov) {
    const c = new T.PerspectiveCamera(fov, W / H, 0.05, 4000);
    c.position.set(pos[0], pos[1], pos[2]);
    c.lookAt(look[0], look[1], look[2]);
    c.updateMatrixWorld();
    return c;
  }
  function project(cam, p) {
    const v = new T.Vector3(p[0], p[1], p[2]).project(cam);
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H];
  }
  // キャラクターだけを撮るための舞台(背景なし、正面と逆光のライト)
  function stage() {
    const s = new T.Scene();
    s.add(new T.HemisphereLight('#e8f3ff', '#7a9a5a', 1.5));
    const key = new T.DirectionalLight('#fff4de', 2.4);
    key.position.set(-3, 5, 6);
    s.add(key);
    const rim = new T.DirectionalLight('#ffffff', 2.2);
    rim.position.set(3, 4, -6);
    s.add(rim);
    s.add(new T.AmbientLight('#ffffff', 0.3));
    return s;
  }
  // ピッチャー側(-z)から撮るときの舞台: 正面のライトをマウンド側に置く
  function stageFromMound() {
    const s = new T.Scene();
    s.add(new T.HemisphereLight('#e8f3ff', '#7a9a5a', 1.4));
    const key = new T.DirectionalLight('#fff4de', 2.6);
    key.position.set(-2, 5, -6);
    s.add(key);
    const rim = new T.DirectionalLight('#ffffff', 2.0);
    rim.position.set(3, 4, 6);
    s.add(rim);
    s.add(new T.AmbientLight('#ffffff', 0.3));
    return s;
  }
  function stadium(pos, look, fov, screen) {
    const s = new T.Scene();
    const st = HR.Stadium.build(s);
    st.drawScreen(screen[0], screen[1], screen[2]);
    return snap(s, camera(pos, look, fov));
  }

  // ---------------- 2D ----------------
  function vgrad(y0, y1, stops) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }
  function background(img, blur, filter) {
    g.save();
    g.filter = `blur(${blur}px) ${filter || ''}`;
    g.drawImage(img, -60, -60, W + 120, H + 120);
    g.restore();
  }
  // 白フチ+落ち影を付けて重ねる
  function cutout(img, r, color) {
    const sil = blank();
    const sg = sil.getContext('2d');
    sg.drawImage(img, 0, 0);
    sg.globalCompositeOperation = 'source-in';
    sg.fillStyle = color;
    sg.fillRect(0, 0, W, H);
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)';
    g.shadowBlur = 30;
    g.shadowOffsetY = 12;
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      g.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r);
      if (i === 0) g.shadowColor = 'transparent';
    }
    g.restore();
    g.drawImage(img, 0, 0);
  }
  function rays(cx, cy, n, color, alpha, rot) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(cx, cy);
    g.rotate(rot || 0);
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, 2600, (i / n) * Math.PI * 2, ((i + 0.5) / n) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  function glow(cx, cy, r, color) {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
  }
  // 漫画の集中線
  function focusLines(cx, cy, r0, n, color, alpha) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, w = 0.004 + rnd() * 0.012, rin = r0 * (0.75 + rnd() * 0.7);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
      g.lineTo(cx + Math.cos(a - w) * 2600, cy + Math.sin(a - w) * 2600);
      g.lineTo(cx + Math.cos(a + w) * 2600, cy + Math.sin(a + w) * 2600);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  // 打球の軌跡(尾は透明、先端ほど白く太い)
  function comet(x0, y0, x1, y1, w) {
    const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.7, 'rgba(255,250,210,0.75)');
    gr.addColorStop(1, 'rgba(255,255,255,1)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1 + nx * w, y1 + ny * w);
    g.lineTo(x1 - nx * w, y1 - ny * w);
    g.closePath();
    g.fill();
  }
  // フランスパンのバットから飛び散るパンくず
  function crumbs(cx, cy, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * (0.05 + rnd() * 1.1), d = spread * (0.25 + rnd() * 0.75);
      g.save();
      g.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8);
      g.rotate(rnd() * Math.PI);
      const r = 7 + rnd() * 13;
      g.beginPath();
      g.ellipse(0, 0, r, r * (0.6 + rnd() * 0.3), 0, 0, Math.PI * 2);
      g.fillStyle = rnd() < 0.55 ? '#f4e2bd' : '#c88638';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(90,50,10,0.5)';
      g.stroke();
      g.restore();
    }
  }
  function star(cx, cy, r1, r2, n, fill, stroke, rot) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot || 0);
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1 * (0.85 + rnd() * 0.3);
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    if (stroke) { g.lineWidth = 14; g.lineJoin = 'round'; g.strokeStyle = stroke; g.stroke(); }
    g.fillStyle = fill;
    g.fill();
    g.restore();
  }
  function fitPx(text, font, px, maxW) {
    for (; px > 30; px -= 4) {
      g.font = font(px);
      if (g.measureText(text).width <= maxW) break;
    }
    return px;
  }
  // テロップ風の文字: 立体の厚み → 外フチ → 内フチ → グラデーション
  function telop(text, x, y, o) {
    const font = o.impact ? IMP : (px) => UI(900, px);
    const px = fitPx(text, font, o.px, o.maxW || W - 80);
    g.save();
    g.translate(x, y);
    g.rotate(o.rot || 0);
    g.font = font(px);
    g.textAlign = o.align || 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.miterLimit = 2;
    const [ow, oc] = o.strokes[0];
    for (let i = o.depth || 0; i > 0; i--) {
      g.lineWidth = ow;
      g.strokeStyle = o.depthColor || oc;
      g.strokeText(text, i * 0.55, i);
    }
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = o.depth ? 0 : 16;
    for (const [w, c] of o.strokes) {
      g.lineWidth = w;
      g.strokeStyle = c;
      g.strokeText(text, 0, 0);
      g.shadowColor = 'transparent';
    }
    g.fillStyle = Array.isArray(o.fill) ? (() => {
      const gr = g.createLinearGradient(0, -px * 0.5, 0, px * 0.5);
      o.fill.forEach((c, i) => gr.addColorStop(i / (o.fill.length - 1), c));
      return gr;
    })() : o.fill;
    g.fillText(text, 0, 0);
    g.restore();
    return px;
  }
  // ギザギザのシール
  function sticker(cx, cy, r, lines, rot, colors) {
    g.save();
    g.translate(cx, cy);
    g.rotate(rot);
    const burst = (rr, fill) => {
      g.beginPath();
      const n = 24;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2, k = i % 2 ? 0.88 : 1;
        g.lineTo(Math.cos(a) * rr * k, Math.sin(a) * rr * k);
      }
      g.closePath();
      g.fillStyle = fill;
      g.fill();
    };
    g.shadowColor = 'rgba(0,0,0,0.4)';
    g.shadowBlur = 20;
    g.shadowOffsetY = 8;
    burst(r, '#ffffff');
    g.shadowColor = 'transparent';
    const gr = g.createLinearGradient(0, -r, 0, r);
    gr.addColorStop(0, colors[0]);
    gr.addColorStop(1, colors[1]);
    burst(r * 0.88, gr);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    for (const l of lines) {
      g.font = l.impact ? IMP(l.px) : UI(900, l.px);
      g.lineWidth = l.px * 0.16;
      g.strokeStyle = 'rgba(60,0,10,0.55)';
      g.strokeText(l.text, 0, l.y);
      g.fillStyle = l.color || '#ffffff';
      g.fillText(l.text, 0, l.y);
    }
    g.restore();
  }
  function ribbon(text, y, colors) {
    g.save();
    g.font = UI(900, 46);
    const w = g.measureText(text).width + 90;
    const x = (W - w) / 2;
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 14;
    g.beginPath();
    g.moveTo(x - 30, y);
    g.lineTo(x + w + 30, y);
    g.lineTo(x + w, y + 38);
    g.lineTo(x + w + 30, y + 76);
    g.lineTo(x - 30, y + 76);
    g.lineTo(x, y + 38);
    g.closePath();
    g.fillStyle = colors[0];
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 5;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = colors[1];
    g.fillText(text, W / 2, y + 40);
    g.restore();
  }
  function bubble(x, y, text, px, color, tail) {
    g.save();
    g.font = UI(900, px);
    const w = g.measureText(text).width + px * 1.2, h = px * 1.7;
    g.translate(x, y);
    g.rotate(-0.06);
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 16;
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h / 2);
    g.moveTo(tail[0] - 26, h / 2 - 8);
    g.lineTo(tail[0] + tail[1], h / 2 + tail[2]);
    g.lineTo(tail[0] + 26, h / 2 - 8);
    g.fillStyle = '#ffffff';
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = 8;
    g.strokeStyle = color;
    g.stroke();
    g.fill();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, 0, 4);
    g.restore();
  }
  function confetti(n, y0, y1) {
    const cols = ['#ff4d6d', '#ffd23f', '#3ad0ff', '#7bea5b', '#ff8ad6', '#ffffff', '#ff9d2b'];
    for (let i = 0; i < n; i++) {
      g.save();
      g.translate(rnd() * W, y0 + rnd() * (y1 - y0));
      g.rotate(rnd() * Math.PI);
      g.scale(1, 0.3 + rnd() * 0.7);
      g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.fillRect(-14, -8, 28, 16);
      g.restore();
    }
  }
  // 漫画の「ガーン」の縦線
  function gloom(x0, y0, w, h) {
    g.save();
    g.strokeStyle = 'rgba(70,90,200,0.55)';
    for (let i = 0; i < 16; i++) {
      const x = x0 + (i / 15) * w;
      g.lineWidth = 4 + (i % 3) * 3;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, y0 + h * (0.5 + rnd() * 0.5));
      g.stroke();
    }
    g.restore();
  }

  function drop(x, y, r) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(0, -r * 1.8);
    g.bezierCurveTo(r * 0.9, -r * 0.4, r, r * 0.2, r, r * 0.4);
    g.arc(0, r * 0.4, r, 0, Math.PI);
    g.bezierCurveTo(-r, r * 0.2, -r * 0.9, -r * 0.4, 0, -r * 1.8);
    g.fillStyle = '#7fd0ff';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.restore();
  }
  // 丸窓に別のキャラクターを入れる(画像の中央付近を切り抜く)
  function porthole(img, cx, cy, r, label) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.45)';
    g.shadowBlur = 24;
    g.beginPath();
    g.arc(cx, cy, r + 12, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.shadowColor = 'transparent';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    const gr = g.createLinearGradient(0, cy - r, 0, cy + r);
    gr.addColorStop(0, '#ffd0e4');
    gr.addColorStop(1, '#ff8ab8');
    g.fillStyle = gr;
    g.fill();
    g.clip();
    const k = (r * 2.3) / W;
    g.drawImage(img, cx - (W * k) / 2, cy - (H * k) * 0.42, W * k, H * k);
    g.restore();
    if (label) {
      g.save();
      g.font = UI(900, 40);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const w = g.measureText(label).width + 40;
      g.beginPath();
      g.roundRect(cx - w / 2, cy + r - 20, w, 58, 29);
      g.fillStyle = '#e8337a';
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = '#ffffff';
      g.stroke();
      g.fillStyle = '#ffffff';
      g.fillText(label, cx, cy + r + 10);
      g.restore();
    }
  }

  // ---------------- キャラクター ----------------
  function jamModel(s, pose, opts) {
    const m = HR.Models.makeJam();
    HR.Models.poseJam(m, pose, opts);
    s.add(m.root);
    return m;
  }
  function batakoModel(s, pose) {
    const m = HR.Models.makeBatako();
    HR.Models.poseBatako(m, pose);
    s.add(m.root);
    return m;
  }
  function faceBall(s, pos, scale, dizzy, cam, roll) {
    const b = HR.Models.makeBall();
    b.setDizzy(dizzy);
    b.root.position.set(pos[0], pos[1], pos[2]);
    b.root.scale.setScalar(scale);
    b.root.lookAt(cam.position);
    b.spin.rotation.z = roll || 0;
    s.add(b.root);
    return b;
  }

  // ---------------- デザイン ----------------
  const HR_FILL = ['#fffbd0', '#ffe14a', '#ff9d00', '#ff4a00'];
  const HR_STROKES = [[40, '#5a0d00'], [22, '#ffffff'], [9, '#e0301e']];
  const ZERO_FILL = ['#ffffff', '#cfe6ff', '#7aa7ff', '#5a4cff'];
  const ZERO_STROKES = [[40, '#0d1446'], [22, '#ffffff'], [9, '#3b4cd6']];

  // ピッチャー側から見た、ジャムおじさんがホームランを打った瞬間(text=false で文字なし)
  function hitFromMound(text) {
    const cam = camera([0.06, 0.76, -6.1], [0.6, 1.02, 0.1], 32);
    // 背景: マウンドの方から本塁の後ろのスタンドを見上げる(大きくぼかす)
    background(stadium([0.25, 1.0, -6.5], [0.6, 2.6, 10], 46, ['HOME RUN!', '', true]), 9, 'saturate(1.15) brightness(1.04)');
    // ジャムおじさん(左打ち): 気合いの顔で、バットの芯でアンパンマンの顔をとらえる
    const s = stageFromMound();
    const jam = HR.Models.makeJam();
    jam.setFace('angry');
    const pose = [0.04, 0.8, 0.3, 100, 3, -46, -0.3, 0.06, 0.04];
    HR.Models.poseJam(jam, pose, { lean: 0.06 });
    jam.head.rotation.y = -0.35; // 顔をこちら(ボール)へ向ける
    jam.root.position.set(0.98, 0, 0.1);
    jam.root.rotation.y = -Math.PI / 2;
    s.add(jam.root);
    s.updateMatrixWorld(true);
    // バットの芯(先の方)の少し上でとらえる。バットが見えるようにボールはやや上・手前に
    const sweet = jam.bat.localToWorld(new T.Vector3(0, 0.8, 0));
    const ballP = sweet.clone().add(new T.Vector3(0, 0.12, -0.14));
    const BS = 1.55;
    const ball = faceBall(s, [ballP.x, ballP.y, ballP.z], BS, true, cam, -0.3);
    ball.root.scale.set(BS * 0.82, BS * 1.08, BS); // バットに当たってつぶれる
    const [ix, iy] = project(cam, [ballP.x, ballP.y, ballP.z]);
    glow(ix, iy, 950, 'rgba(255,244,190,0.72)');
    rays(ix, iy, 24, '#ffe56a', 0.2, 0.1);
    focusLines(ix, iy, 330, 110, '#ffffff', 0.32);
    // 足もとの影(地面はぼかしてあるので、浮いて見えないように)
    const [fx, fy] = project(cam, [0.98, 0, 0.1]);
    g.save();
    g.fillStyle = 'rgba(40,20,0,0.28)';
    g.filter = 'blur(10px)';
    g.beginPath();
    g.ellipse(fx, fy + 6, 230, 46, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    cutout(snap(s, cam), 9, '#ffffff');
    star(ix, iy, 150, 72, 12, 'rgba(255,242,120,0.92)', '#ff8a00', 0.25);
    crumbs(ix, iy, 30, 330);
    // ボールは星とパンくずの上にもう一度重ねる
    const sb = stageFromMound();
    const ball2 = faceBall(sb, [ballP.x, ballP.y, ballP.z], BS, true, cam, -0.3);
    ball2.root.scale.copy(ball.root.scale);
    g.drawImage(snap(sb, cam), 0, 0);
    if (text) {
      telop('カキーン!!', Math.min(ix - 60, W - 330), iy - 330, { px: 150, impact: true, rot: -0.14, fill: HR_FILL, strokes: HR_STROKES, depth: 10, depthColor: '#3a0700', maxW: 600 });
    }
  }

  const designs = {
    // 168km/hをかっ飛ばす!! (ホームラン動画)
    'hr-a'() {
      background(stadium([0, 3, -26], [0, 26, -150], 64, ['HOME RUN!', 'HR 5本', true]), 8, 'saturate(1.2) brightness(1.06)');
      glow(230, 820, 900, 'rgba(255,240,170,0.6)');
      rays(230, 820, 22, '#ffd23f', 0.2, 0.08);
      const s = stage();
      const pose = [-0.16, 0.76, 0.3, 172, 14, -42, -0.3, 0.06, 0.04];
      const jam = jamModel(s, pose);
      jam.head.rotation.x = -0.12;
      const cam = camera([-1.6, 1.2, 3.8], [-0.3, 1.6, 0], 48);
      const ballPos = [-0.92, 1.85, 0.1];
      faceBall(s, ballPos, 2.0, true, cam, -0.35);
      const tip = [pose[0] - 0.83, pose[1] + 0.21, pose[2] + 0.12];
      const [bx, by] = project(cam, ballPos), [tx, ty] = project(cam, tip);
      comet(tx + (tx - bx) * 0.15, ty + (ty - by) * 0.15, bx, by, 64);
      cutout(snap(s, cam), 12, '#ffffff');
      star(tx, ty, 130, 64, 12, '#fff27a', '#ff8a00', 0.2);
      telop('カキーン!', tx + 40, ty + 10, { px: 88, impact: true, rot: -0.22, fill: '#ffffff', strokes: [[22, '#1d4fb8']] });
      telop('168km/hを', W / 2, 300, { px: 130, fill: '#ffffff', strokes: [[26, '#0b2f73'], [10, '#4cb2f2']], rot: -0.04 });
      telop('かっ飛ばす!!', W / 2, 520, { px: 250, impact: true, fill: HR_FILL, strokes: HR_STROKES, depth: 16, depthColor: '#3a0700', rot: -0.05 });
      sticker(890, 1530, 150, [{ text: '5連発', px: 76, y: 4 }], 0.2, ['#ff5a5a', '#d4142a']);
    },
    // フランスパンでホームラン!? (ホームラン動画)
    'hr-b'() {
      background(stadium([0, 2.2, -8], [0, 14, -150], 60, ['HOME RUN!', 'HR 5本', true]), 7, 'saturate(1.2) brightness(1.05)');
      glow(540, 1150, 900, 'rgba(255,236,160,0.55)');
      rays(540, 1150, 20, '#ffffff', 0.16, 0.05);
      confetti(110, 0, H);
      const s = stage();
      const jam = jamModel(s, [-0.36, 1.57, 0.12, 100, 82, 0, -0.18, 0.06, 0.04]);
      jam.handL.position.set(0.36, 1.5, 0.14);
      jam.root.position.y = 0.1;
      const cam = camera([0.35, 0.55, 2.55], [0, 1.25, 0], 52);
      cutout(snap(s, cam), 12, '#ffffff');
      telop('フランスパンで', W / 2, 300, { px: 128, fill: '#ffffff', strokes: [[26, '#0b2f73'], [10, '#4cb2f2']], rot: -0.04 });
      telop('ホームラン!?', W / 2, 510, { px: 210, impact: true, fill: HR_FILL, strokes: HR_STROKES, depth: 14, depthColor: '#3a0700', rot: -0.05 });
      sticker(860, 1240, 140, [{ text: '5連発', px: 72, y: 4 }], 0.18, ['#ff5a5a', '#d4142a']);
    },
    // 全5球 空振り… (空振り動画)
    'zero-a'() {
      background(stadium([0, 1.4, 6], [0, 3, -40], 55, ['空振り', 'HR 0本', false]), 8, 'saturate(0.9) brightness(0.92)');
      g.fillStyle = vgrad(0, H, ['rgba(40,30,140,0.45)', 'rgba(20,40,120,0.2)', 'rgba(10,10,60,0.55)']);
      g.fillRect(0, 0, W, H);
      focusLines(540, 1250, 520, 140, '#ffffff', 0.35);
      const s = stage();
      const jam = jamModel(s, [-0.3, 0.42, 0.24, 95, -72, 0, -0.18, 0.06, 0.04], { lean: 0.3 });
      jam.handL.position.set(0.3, 0.42, 0.22);
      const cam = camera([0.25, 0.7, 2.7], [0, 1.12, 0], 48);
      cutout(snap(s, cam), 12, '#ffffff');
      const [hx, hy] = project(cam, [0, 1.25, 0.3]);
      gloom(hx - 230, hy - 330, 460, 330);
      for (const [dx, dy, r] of [[290, -60, 34], [330, 40, 24], [-300, -20, 28]]) drop(hx + dx, hy + dy, r);
      // 右下にバタコさん(丸窓)
      const s2 = stage();
      const b = batakoModel(s2, [-0.14, 0.92, 0.36, 0.14, 0.92, 0.36, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, 0]);
      const cam2 = camera([0.15, 1.3, 1.9], [0, 1.2, 0], 40);
      faceBall(s2, [0, 1.0, 0.5], 1, false, cam2, 0);
      b.root.updateMatrixWorld(true);
      porthole(snap(s2, cam2), 880, 1430, 170, 'バタコさん');
      telop('全5球', W / 2, 300, { px: 150, fill: '#ffffff', strokes: [[26, '#0d1446'], [10, '#7aa7ff']], rot: -0.04 });
      telop('空振り…', W / 2, 520, { px: 250, impact: true, fill: ZERO_FILL, strokes: ZERO_STROKES, depth: 16, depthColor: '#060a2a', rot: -0.05 });
      sticker(180, 1380, 128, [{ text: '最速', px: 46, y: -40 }, { text: '168km/h', px: 44, y: 22 }], -0.16, ['#ff5a5a', '#d4142a']);
    },
    // ピッチャー側から見た、打った瞬間(文字あり / 文字なし)
    'hit-p'() { hitFromMound(true); },
    'hit-p-plain'() { hitFromMound(false); },
    // 168km/h バタコさん強すぎ… (空振り動画)
    'zero-b'() {
      background(stadium([0, 1.6, 4.5], [0, 2.4, -40], 50, ['空振り', 'HR 0本', false]), 8, 'saturate(1.05)');
      g.fillStyle = vgrad(0, H, ['rgba(255,80,140,0.25)', 'rgba(60,40,160,0.25)', 'rgba(10,10,60,0.5)']);
      g.fillRect(0, 0, W, H);
      rays(540, 1250, 22, '#ffffff', 0.12, 0.1);
      const s = stage();
      batakoModel(s, [-0.15, 0.56, 0.4, 0.15, 0.56, 0.4, 0.17, 0.06, 0.0, -0.17, 0.06, 0.0, 0, 0]);
      const cam = camera([0.3, 1.1, 2.45], [0, 1.12, 0], 46);
      faceBall(s, [0, 0.64, 0.52], 1.15, false, cam, 0);
      cutout(snap(s, cam), 12, '#ffffff');
      bubble(800, 820, '新しい顔よ!', 58, '#e8337a', [-60, -70, 60]);
      telop('168km/h', W / 2, 330, { px: 240, impact: true, fill: ['#ffffff', '#ffd0dd', '#ff4d80', '#d4142a'], strokes: [[40, '#3a0016'], [22, '#ffffff'], [9, '#d4142a']], depth: 16, depthColor: '#240010', rot: -0.05 });
      telop('バタコさん強すぎ…', W / 2, 560, { px: 120, fill: '#ffffff', strokes: [[26, '#0d1446'], [10, '#e8337a']], rot: -0.04 });
      sticker(190, 1330, 140, [{ text: '全球', px: 56, y: -36 }, { text: '空振り', px: 56, y: 30 }], -0.16, ['#6f7bff', '#3a2fd0']);
    },
  };

  try {
    if (document.fonts && document.fonts.load) {
      const txt = '168km/hをかっ飛ばす!!フランスパンでホームラン!?全5球空振り…バタコさん強すぎ新しい顔よ最速連発カキーンパン工場スタジアムHOMERUN!';
      await Promise.all([
        document.fonts.load(`900 40px "M PLUS Rounded 1c"`, txt),
        document.fonts.load(`40px "Dela Gothic One"`, txt),
      ]);
    }
    (designs[design] || designs['hr-a'])();
  } catch (e) {
    console.error(e);
  }
  window.__thumbDone = true;
})();
