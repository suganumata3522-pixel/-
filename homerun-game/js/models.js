'use strict';
// パワプロ風にデフォルメしたキャラクター(バタコさん・ジャムおじさん)と
// アンパンマンの顔ボール、フランスパンバット。すべてコードで描いたオリジナルの3Dモデル。
(function () {
  const HR = window.HR;
  const T = THREE;
  const DEG = HR.DEG;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function toTex(c) {
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(4, HR.MAX_ANISO);
    return t;
  }
  function std(color, o) {
    return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.62, metalness: 0 }, o || {}));
  }

  // 球面テクスチャ(正距円筒)に経度・緯度で描くためのヘルパー。
  // 経度0が正面、+が見る人から見て右。
  function facePainter(base) {
    const W = 1024, H = 512;
    const [c, g] = canvas(W, H);
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    const px = W / 360;
    const P = (lon, lat) => [W * (0.25 + lon / 360), H * (0.5 - lat / 180)];
    const oval = (lon, lat, rx, ry, fill) => {
      const [x, y] = P(lon, lat);
      g.beginPath();
      g.ellipse(x, y, rx * px, ry * px, 0, 0, Math.PI * 2);
      g.fillStyle = fill;
      g.fill();
    };
    const curve = (a, ctrl, b, width, color) => {
      const [x0, y0] = P(a[0], a[1]), [cx, cy] = P(ctrl[0], ctrl[1]), [x1, y1] = P(b[0], b[1]);
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, x1, y1);
      g.lineWidth = width;
      g.lineCap = 'round';
      g.strokeStyle = color;
      g.stroke();
    };
    const eye = (lon, lat, rx, ry) => {
      oval(lon, lat, rx, ry, '#1a1210');
      oval(lon + rx * 0.35, lat + ry * 0.4, rx * 0.32, rx * 0.32, '#ffffff');
    };
    return { c, g, P, px, oval, curve, eye };
  }

  // 球の表面に沿ってパーツを置く(lon/lat 度、depth は中心からの距離)
  function onSphere(parent, mesh, lon, lat, depth) {
    const piv = new T.Group();
    piv.rotation.set(-lat * DEG, lon * DEG, 0, 'YXZ');
    mesh.position.z = depth;
    piv.add(mesh);
    parent.add(piv);
    return piv;
  }

  const sphereGeo = new T.SphereGeometry(1, 40, 24);
  const smallSphere = new T.SphereGeometry(1, 20, 14);
  function ball(r, mat) {
    const m = new T.Mesh(sphereGeo, mat);
    m.scale.setScalar(r);
    return m;
  }
  function highlight(parent, r, depth) {
    const hl = new T.Mesh(new T.BoxGeometry(r * 0.42, r * 0.34, r * 0.08), new T.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(r * 0.05, r * 0.42, depth + r * 0.9);
    parent.add(hl);
  }

  // ほっぺや鼻のふくらみ(白いツヤ付き)
  function bump(parent, lon, lat, R, r, color, flat, depthK) {
    const piv = new T.Group();
    piv.rotation.set(-lat * DEG, lon * DEG, 0, 'YXZ');
    const m = new T.Mesh(sphereGeo, std(color, { roughness: 0.38 }));
    const d = R * (depthK || 0.9);
    m.position.z = d;
    m.scale.set(r, r, r * (flat || 1));
    piv.add(m);
    highlight(piv, r, d + r * ((flat || 1) - 1));
    parent.add(piv);
    return piv;
  }

  // 胴体: 卵形の回転体。テクスチャの横中央(u=0.5)が正面。
  const bodyGeo = (function () {
    const prof = [[0.0, 0], [0.16, 0.01], [0.25, 0.05], [0.29, 0.13], [0.3, 0.24], [0.28, 0.35], [0.23, 0.45], [0.15, 0.52], [0.001, 0.56]];
    const curve = new T.SplineCurve(prof.map(([r, y]) => new T.Vector2(r, y)));
    return new T.LatheGeometry(curve.getPoints(32), 48);
  })();

  function shoeGeo() {
    const g = new T.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
    return g;
  }
  const SHOE = shoeGeo();

  // 共通のちびキャラ骨組み
  function buildChibi(o) {
    const root = new T.Group();
    const pivot = new T.Group(); // 腰: ひねり・前傾
    pivot.position.y = 0.3;
    root.add(pivot);

    const bodyMesh = new T.Mesh(bodyGeo, std('#ffffff', { map: o.bodyTex, roughness: 0.7 }));
    bodyMesh.position.y = 0.2 - 0.3;
    bodyMesh.rotation.y = Math.PI;
    bodyMesh.scale.set(1, 1, 0.86);
    pivot.add(bodyMesh);

    const head = new T.Group();
    head.position.y = 1.13 - 0.3;
    pivot.add(head);
    const headMesh = new T.Mesh(sphereGeo, std('#ffffff', { map: o.headTex, roughness: 0.58 }));
    headMesh.scale.set(o.headR, o.headR * 0.93, o.headR * 0.97);
    head.add(headMesh);

    const skinMat = std(o.skin, { roughness: 0.55 });
    const handL = ball(0.1, skinMat), handR = ball(0.1, skinMat);
    root.add(handL, handR);

    const shoeMat = std(o.shoe, { roughness: 0.5 });
    const mkFoot = () => {
      const f = new T.Mesh(SHOE, shoeMat);
      f.scale.set(0.12, 0.13, 0.19);
      return f;
    };
    const footL = mkFoot(), footR = mkFoot();
    root.add(footL, footR);

    root.traverse((m) => { if (m.isMesh) m.castShadow = false; });
    return { root, pivot, head, headMesh, bodyMesh, handL, handR, footL, footR, headR: o.headR };
  }

  function chefHat(height, puffR) {
    const g = new T.Group();
    const white = std('#fbfbf7', { roughness: 0.8 });
    const band = new T.Mesh(new T.CylinderGeometry(0.29, 0.27, height, 36, 1, true), white);
    band.position.y = height / 2;
    g.add(band);
    const top = height + puffR * 0.25;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = ball(puffR, white);
      p.position.set(Math.cos(a) * 0.18, top, Math.sin(a) * 0.18);
      g.add(p);
    }
    const c = ball(puffR * 1.15, white);
    c.position.y = top + puffR * 0.35;
    g.add(c);
    return g;
  }

  // ---------------- バタコさん ----------------
  function makeBatako() {
    const SKIN = '#eba98a';
    // expr: normal(にっこり) / cry(悔し泣き: つり上がった眉、への字に開いた口、涙)
    const drawFace = (expr) => {
      const f = facePainter(SKIN);
      const { g, P, px } = f;
      // 後ろ髪(黒)
      g.fillStyle = '#1c1a1a';
      // 経度180を超える部分はキャンバスの左端に回り込むので2回描く
      for (const off of [0, -1024]) {
        g.save();
        g.translate(off, 0);
        g.beginPath();
        g.moveTo(P(78, 0)[0], 0);
        g.lineTo(P(282, 0)[0], 0);
        for (let lon = 282; lon >= 78; lon -= 4) {
          const side = HR.smooth((Math.abs(lon - 180) - 60) / 42);
          const lat = -14 + 24 * side + Math.sin(lon * 0.4) * 2.5;
          const [x, y] = P(lon, lat);
          g.lineTo(x, y);
        }
        g.closePath();
        g.fill();
        g.restore();
      }
      g.fillRect(0, 0, 1024, P(0, 52)[1]);
      // 顔
      f.oval(-22, -9, 6.5, 5.5, 'rgba(217,120,108,0.75)');
      f.oval(22, -9, 6.5, 5.5, 'rgba(217,120,108,0.75)');
      f.eye(-12, 8, 3.1, 5.2);
      f.eye(12, 8, 3.1, 5.2);
      if (expr === 'cry') {
        f.curve([-18, 19], [-12, 16], [-6, 13], 6, '#1a1210');
        f.curve([6, 13], [12, 16], [18, 19], 6, '#1a1210');
        for (const sx of [-1, 1]) {
          const [tx, ty] = P(sx * 12, 1);
          g.fillStyle = 'rgba(110,190,255,0.9)';
          g.beginPath();
          g.moveTo(tx - 6, ty);
          g.quadraticCurveTo(tx - 9, ty + 40, tx, ty + 46);
          g.quadraticCurveTo(tx + 9, ty + 40, tx + 6, ty);
          g.fill();
        }
      } else {
        f.curve([-17, 17], [-12, 22], [-7, 18], 5, '#1a1210');
        f.curve([7, 18], [12, 22], [17, 17], 5, '#1a1210');
      }
      // 小さな鼻
      const [nx, ny] = P(0, -2);
      g.beginPath();
      g.arc(nx, ny, 2.6 * px, 0, Math.PI * 2);
      g.fillStyle = '#e39c80';
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = '#2a1a14';
      g.stroke();
      if (expr === 'cry') {
        const [mx0, my0] = P(-8, -19), [mx1] = P(8, -19), [cx, cy] = P(0, -11);
        g.beginPath();
        g.moveTo(mx0, my0);
        g.quadraticCurveTo(cx, cy - 18, mx1, my0);
        g.quadraticCurveTo(cx, my0 + 4, mx0, my0);
        g.fillStyle = '#8b3a46';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = '#2a1a14';
        g.stroke();
      } else {
        f.curve([-9, -13], [0, -21], [9, -13], 4.5, '#2a1a14');
      }
      return toTex(f.c);
    };
    const faces = { normal: drawFace('normal'), cry: drawFace('cry') };
    const headTex = faces.normal;

    // 胴体: 白シャツ+青いオーバーオール
    const [bc, bg] = canvas(512, 256);
    bg.fillStyle = '#f5f5f1';
    bg.fillRect(0, 0, 512, 256);
    const BLUE = '#2a8db5';
    bg.fillStyle = BLUE;
    bg.fillRect(0, 118, 512, 138);
    bg.beginPath();
    bg.moveTo(192, 128);
    bg.lineTo(196, 48);
    bg.quadraticCurveTo(256, 36, 316, 48);
    bg.lineTo(320, 128);
    bg.fill();
    bg.lineWidth = 16;
    bg.strokeStyle = BLUE;
    bg.beginPath(); bg.moveTo(204, 52); bg.lineTo(178, 0); bg.stroke();
    bg.beginPath(); bg.moveTo(308, 52); bg.lineTo(334, 0); bg.stroke();
    bg.beginPath(); bg.moveTo(120, 0); bg.lineTo(70, 124); bg.stroke();
    bg.beginPath(); bg.moveTo(392, 0); bg.lineTo(442, 124); bg.stroke();
    bg.fillStyle = 'rgba(0,0,0,0.12)';
    bg.fillRect(226, 78, 60, 34);
    bg.fillStyle = '#ffd34a';
    for (const x of [210, 302]) { bg.beginPath(); bg.arc(x, 60, 7, 0, Math.PI * 2); bg.fill(); }
    const bodyTex = toTex(bc);

    const m = buildChibi({ skin: SKIN, bodyTex, headTex, headR: 0.41, shoe: '#6f8d80' });
    const R = m.headR;
    m.faces = faces;
    m.setFace = (k) => {
      const mat = m.headMesh.material;
      if (mat.map === faces[k]) return;
      mat.map = faces[k];
      mat.needsUpdate = true;
    };
    // 鼻はテクスチャで描き、ほっぺは平らなチークで十分
    const hat = chefHat(0.3, 0.16);
    hat.position.y = R * 0.62;
    hat.rotation.x = -0.1;
    m.head.add(hat);
    m.hat = hat;
    m.hatHome = { y: hat.position.y, rx: hat.rotation.x };
    // 左手のグローブ(9回裏の場面だけ表示)。手の球は 0.1 倍に縮めてあるので 10 倍して打ち消す
    const leather = std('#a5652f', { roughness: 0.55 });
    const glove = new T.Group();
    const palm = new T.Mesh(sphereGeo, leather);
    palm.scale.set(0.15, 0.18, 0.08);
    glove.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = new T.Mesh(sphereGeo, leather);
      f.scale.set(0.04, 0.09, 0.05);
      f.position.set(-0.08 + i * 0.053, 0.17, 0);
      glove.add(f);
    }
    const thumb = new T.Mesh(sphereGeo, leather);
    thumb.scale.set(0.045, 0.08, 0.05);
    thumb.position.set(0.15, 0.03, 0.02);
    thumb.rotation.z = -0.6;
    glove.add(thumb);
    const webbing = new T.Mesh(sphereGeo, std('#6e3d18', { roughness: 0.6 }));
    webbing.scale.set(0.06, 0.06, 0.03);
    webbing.position.set(0.11, 0.13, 0.03);
    glove.add(webbing);
    glove.scale.setScalar(10);
    glove.position.set(0.2, 0.4, 0.6);
    glove.visible = false;
    m.handL.add(glove);
    m.glove = glove;
    const hairMat = std('#1c1a1a', { roughness: 0.6 });
    const cone = new T.ConeGeometry(0.07, 0.24, 10);
    const spikes = [[84, 6, -20], [94, -4, -35], [100, 14, -5], [76, 18, 10], [112, 2, -30]];
    for (const [lon, lat, tilt] of spikes) {
      for (const side of [-1, 1]) {
        const s = new T.Mesh(cone, hairMat);
        s.rotation.x = Math.PI / 2;
        const holder = new T.Group();
        holder.add(s);
        holder.rotation.x = tilt * DEG * -1;
        s.position.z = 0.06;
        onSphere(m.head, holder, side * lon, lat, R * 0.93);
      }
    }
    return m;
  }

  // ---------------- ジャムおじさん ----------------
  function makeJam() {
    const SKIN = '#eaa486';
    // expr: normal(にっこり) / angry(への字口で歯を食いしばる、目つきが鋭い) / shock(唖然: 白目に小さな黒目、口をぽかんと開ける)
    const drawJamFace = (expr) => {
      const f = facePainter(SKIN);
      const { g, P, px } = f;
      if (expr !== 'shock') {
        f.eye(-13, 10, 3.4, 5.6);
        f.eye(13, 10, 3.4, 5.6);
      }
      if (expr === 'shock') {
        for (const sx of [-1, 1]) {
          const [ex, ey] = P(sx * 13, 11);
          g.beginPath();
          g.ellipse(ex, ey, 6 * px, 8.5 * px, 0, 0, Math.PI * 2);
          g.fillStyle = '#ffffff';
          g.fill();
          g.lineWidth = 4;
          g.strokeStyle = '#1a1210';
          g.stroke();
          f.oval(sx * 13, 10.5, 1.4, 1.9, '#1a1210');
        }
        // ひげの下で、口がぽかんと開いたまま
        const [mx, my] = P(0, -33);
        g.beginPath();
        g.ellipse(mx, my, 7 * px, 9.5 * px, 0, 0, Math.PI * 2);
        g.fillStyle = '#6e2228';
        g.fill();
        g.save();
        g.clip();
        g.beginPath();
        g.ellipse(mx, my + 6 * px, 5 * px, 3.6 * px, 0, 0, Math.PI * 2);
        g.fillStyle = '#d9606a';
        g.fill();
        g.restore();
        g.beginPath();
        g.ellipse(mx, my, 7 * px, 9.5 * px, 0, 0, Math.PI * 2);
        g.lineWidth = 4.5;
        g.strokeStyle = '#1a1210';
        g.stroke();
      } else if (expr === 'angry') {
        // 目の内側上を肌色で斜めに隠して、つり目にする
        g.fillStyle = SKIN;
        for (const sx of [-1, 1]) {
          const [ax, ay] = P(sx * 6.5, 17.5), [bx, by] = P(sx * 19.5, 18.5), [cx, cy] = P(sx * 6.5, 9.5);
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(bx, by);
          g.lineTo(cx, cy);
          g.closePath();
          g.fill();
          f.curve([sx * 7, 10.5], [sx * 12, 13.6], [sx * 18.5, 16.8], 5, '#1a1210');
        }
        // への字に食いしばった口(白い歯)。ひげの下に収まるように少し下げる
        const [x0, y0] = P(-14, -35), [x1, y1] = P(14, -35), [qx, qy] = P(0, -21);
        const [r1, s1] = P(11, -39), [r0] = P(-11, -39), [qx2, qy2] = P(0, -29);
        const mouth = () => {
          g.beginPath();
          g.moveTo(x0, y0);
          g.quadraticCurveTo(qx, qy, x1, y1);
          g.lineTo(r1, s1);
          g.quadraticCurveTo(qx2, qy2, r0, s1);
          g.closePath();
        };
        mouth();
        g.fillStyle = '#fbfbf5';
        g.fill();
        g.save();
        g.clip();
        g.strokeStyle = '#1a1210';
        g.lineWidth = 2.5;
        for (const lon of [-5, 0, 5]) {
          const [tx, ty] = P(lon, -22), [ux, uy] = P(lon, -42);
          g.beginPath();
          g.moveTo(tx, ty);
          g.lineTo(ux, uy);
          g.stroke();
        }
        f.curve([-14, -37], [0, -25], [14, -37], 2.5, '#1a1210');
        g.restore();
        mouth();
        g.lineWidth = 4.5;
        g.lineJoin = 'round';
        g.strokeStyle = '#1a1210';
        g.stroke();
      } else {
        f.curve([-19, -24], [0, -38], [19, -24], 4.5, '#1a1210');
      }
      return toTex(f.c);
    };
    const faces = { normal: drawJamFace('normal'), angry: drawJamFace('angry'), shock: drawJamFace('shock') };
    const headTex = faces.normal;

    const [bc, bg] = canvas(512, 256);
    bg.fillStyle = '#f7f7f3';
    bg.fillRect(0, 0, 512, 256);
    bg.fillStyle = '#ffffff';
    bg.fillRect(150, 122, 212, 134);
    bg.strokeStyle = '#c9d0cf';
    bg.lineWidth = 4;
    bg.beginPath(); bg.moveTo(0, 122); bg.lineTo(512, 122); bg.stroke();
    bg.beginPath(); bg.moveTo(150, 122); bg.lineTo(150, 256); bg.moveTo(362, 122); bg.lineTo(362, 256); bg.stroke();
    bg.fillStyle = '#cfd5d4';
    for (const y of [38, 70, 100]) for (const x of [236, 276]) { bg.beginPath(); bg.arc(x, y, 6, 0, Math.PI * 2); bg.fill(); }
    bg.strokeStyle = '#d9dede';
    bg.lineWidth = 6;
    bg.beginPath(); bg.moveTo(180, 4); bg.quadraticCurveTo(256, 30, 332, 4); bg.stroke();
    const bodyTex = toTex(bc);

    const m = buildChibi({ skin: SKIN, bodyTex, headTex, headR: 0.43, shoe: '#6d8c7f' });
    const R = m.headR;
    m.faces = faces;
    const rosy = '#c97b65';
    bump(m.head, 0, -4, R, 0.105, rosy, 0.9, 0.86);
    bump(m.head, -24, -9, R, 0.095, rosy, 0.6, 0.88);
    bump(m.head, 24, -9, R, 0.095, rosy, 0.6, 0.88);
    const hairMat = std('#c3d5d0', { roughness: 0.85 });
    // ひげ(もこもこ)
    for (let i = -2; i <= 2; i++) {
      const s = new T.Mesh(smallSphere, hairMat);
      s.scale.set(0.05, 0.042, 0.03);
      onSphere(m.head, s, i * 6.5, -18 - Math.abs(i) * 0.8, R * 0.96);
    }
    // まゆげ(怒り顔では内側を下げてハの字を逆にする)
    const brows = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const s = new T.Mesh(smallSphere, hairMat);
        s.scale.setScalar(0.032);
        const lat = 22 + (i === 1 ? 2 : 0);
        brows.push({ piv: onSphere(m.head, s, side * (8 + i * 5.5), lat, R * 0.98), lat, angry: 17.5 + i * 3.4, shock: lat + 6 - i * 0.8 });
      }
    }
    m.setFace = (k) => {
      const mat = m.headMesh.material;
      if (mat.map === faces[k]) return;
      mat.map = faces[k];
      mat.needsUpdate = true;
      for (const b of brows) b.piv.rotation.x = -(k === 'angry' ? b.angry : k === 'shock' ? b.shock : b.lat) * DEG;
    };
    // 横と後ろのもこもこヘア
    const puff = (lon, lat, k) => {
      const grp = new T.Group();
      const offs = [[0, 0, 0], [0.06, 0.04, 0.02], [-0.05, 0.05, 0.01], [0.01, -0.05, 0.03], [-0.04, -0.03, -0.02]];
      for (const [x, y, z] of offs) {
        const s = new T.Mesh(smallSphere, hairMat);
        s.scale.setScalar(0.07 * k);
        s.position.set(x * k, y * k, z * k);
        grp.add(s);
      }
      onSphere(m.head, grp, lon, lat, R * 1.0);
    };
    for (const side of [-1, 1]) {
      puff(side * 86, 14, 1.25);
      puff(side * 104, 8, 1.15);
      puff(side * 70, 22, 0.9);
      puff(side * 128, 12, 1.05);
      puff(side * 152, 14, 1.0);
    }
    puff(180, 14, 1.0);
    const hat = chefHat(0.46, 0.17);
    hat.position.y = R * 0.6;
    hat.rotation.x = -0.06;
    m.head.add(hat);
    m.hat = hat;
    m.hatHome = { y: hat.position.y, rx: hat.rotation.x };

    // フランスパンのバット
    const prof = [[0.001, 0], [0.034, 0.008], [0.031, 0.035], [0.025, 0.07], [0.026, 0.26], [0.034, 0.45], [0.046, 0.64], [0.052, 0.8], [0.05, 0.9], [0.036, 0.945], [0.001, 0.96]];
    const curve = new T.SplineCurve(prof.map(([r, y]) => new T.Vector2(r, y)));
    const pts = curve.getPoints(80);
    const [cc, cg] = canvas(256, 512);
    const grd = cg.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, '#b06f2c'); grd.addColorStop(0.25, '#d99a4c'); grd.addColorStop(0.5, '#c88638');
    grd.addColorStop(0.75, '#d99a4c'); grd.addColorStop(1, '#b06f2c');
    cg.fillStyle = grd;
    cg.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 400; i++) {
      cg.fillStyle = `rgba(${90 + Math.random() * 60},${50 + Math.random() * 30},20,${Math.random() * 0.15})`;
      cg.fillRect(Math.random() * 256, Math.random() * 512, 2, 3);
    }
    cg.fillStyle = '#f2d69c';
    for (let k = 0; k < 4; k++) {
      for (const x of [64, 192]) {
        cg.save();
        cg.translate(x + (k % 2 ? 10 : -10), 60 + k * 72);
        cg.rotate(-0.5);
        cg.beginPath();
        cg.ellipse(0, 0, 34, 9, 0, 0, Math.PI * 2);
        cg.fill();
        cg.restore();
      }
    }
    const batMat = std('#ffffff', { map: toTex(cc), roughness: 0.75 });
    // テクスチャの v を高さで決める(折れた2本と模様がつながるように)
    const latheGeo = (points, base) => {
      const geo = new T.LatheGeometry(points, 24);
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) uv.setY(i, (pos.getY(i) + base) / 0.96);
      return geo;
    };
    const bat = new T.Mesh(latheGeo(pts, 0), batMat);
    m.bat = bat;
    m.root.add(bat);

    // へし折ったとき用の2本。原点が折れ目で、断面は白いパンの中身。
    const BREAK = 0.5;
    const k = pts.findIndex((p) => p.y >= BREAK);
    const pa = pts[k - 1], pb = pts[k];
    const cut = new T.Vector2(pa.x + ((pb.x - pa.x) * (BREAK - pa.y)) / (pb.y - pa.y), BREAK);
    const crumbMat = std('#f4e2bd', { roughness: 0.95 });
    const piece = (points, capUp) => {
      const grp = new T.Group();
      grp.add(new T.Mesh(latheGeo(points.map((p) => new T.Vector2(p.x, p.y - BREAK)), BREAK), batMat));
      const cap = new T.Mesh(new T.CircleGeometry(cut.x * 1.04, 20), crumbMat);
      cap.rotation.x = capUp ? -Math.PI / 2 : Math.PI / 2;
      grp.add(cap);
      grp.visible = false;
      m.root.add(grp);
      return grp;
    };
    m.batPieces = [piece(pts.slice(0, k).concat([cut]), true), piece([cut].concat(pts.slice(k)), false)];
    m.batBreak = BREAK;
    return m;
  }

  // ---------------- ランナー(パン工場チームの選手) ----------------
  function makeRunner(helmetColor) {
    const SKIN = '#efb38f';
    const f = facePainter(SKIN);
    f.eye(-12, 6, 3, 5);
    f.eye(12, 6, 3, 5);
    f.curve([-18, 17], [-12, 14], [-6, 13], 5, '#2a1a14');
    f.curve([6, 13], [12, 14], [18, 17], 5, '#2a1a14');
    f.curve([-6, -16], [0, -19], [6, -16], 4, '#2a1a14');
    const headTex = toTex(f.c);
    const [bc, bg] = canvas(512, 256);
    bg.fillStyle = '#f7f3e8';
    bg.fillRect(0, 0, 512, 256);
    bg.fillStyle = 'rgba(176,111,44,0.35)';
    for (let x = 0; x < 512; x += 22) bg.fillRect(x, 0, 3, 256);
    bg.fillStyle = '#7a4a1e';
    bg.fillRect(0, 150, 512, 16);
    bg.fillStyle = '#d9822b';
    bg.beginPath();
    bg.arc(256, 78, 30, 0, Math.PI * 2);
    bg.fill();
    const bodyTex = toTex(bc);
    const m = buildChibi({ skin: SKIN, bodyTex, headTex, headR: 0.4, shoe: '#2b2b2b' });
    const helmetMat = std(helmetColor, { roughness: 0.3, metalness: 0.1 });
    const helmet = new T.Mesh(new T.SphereGeometry(m.headR * 1.07, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.53), helmetMat);
    m.head.add(helmet);
    const brim = new T.Mesh(sphereGeo, helmetMat);
    brim.scale.set(0.24, 0.03, 0.18);
    brim.position.set(0, m.headR * 0.08, m.headR * 0.86);
    m.head.add(brim);
    return m;
  }

  // ---------------- アンパンマン(9回裏の「好捕」の場面で空から飛んでくる) ----------------
  // 赤いスーツに黄色のにこちゃんマークとベルト、黄色の手袋とブーツ、茶色のマント
  function makeAnpanman() {
    const YELLOW = '#f1b92c';
    const [bc, bg] = canvas(512, 256);
    bg.fillStyle = '#e23b2c';
    bg.fillRect(0, 0, 512, 256);
    // ベルト
    bg.fillStyle = YELLOW;
    bg.fillRect(0, 150, 512, 22);
    bg.fillStyle = 'rgba(120,60,10,0.35)';
    bg.fillRect(0, 170, 512, 3);
    // 胸のにこちゃんマーク(胴は横に引き伸ばされるので縦長の楕円で描くと丸く見える)
    const cx = 256, cy = 80;
    bg.beginPath();
    bg.ellipse(cx, cy, 25, 42, 0, 0, Math.PI * 2);
    bg.fillStyle = '#ffd23f';
    bg.fill();
    bg.lineWidth = 3;
    bg.strokeStyle = '#b8641c';
    bg.stroke();
    bg.fillStyle = '#9a4a12';
    for (const sx of [-1, 1]) { bg.beginPath(); bg.ellipse(cx + sx * 8, cy - 10, 2.6, 6, 0, 0, Math.PI * 2); bg.fill(); }
    bg.beginPath();
    bg.ellipse(cx, cy + 6, 13, 18, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    bg.lineWidth = 3.5;
    bg.strokeStyle = '#9a4a12';
    bg.stroke();
    const bodyTex = toTex(bc);
    const m = buildChibi({ skin: YELLOW, bodyTex, headTex: anpanFaceTex(false), headR: 0.47, shoe: YELLOW });
    anpanBumps(m.head, m.headR);
    // マント: 首の後ろから下がる布。頂点を毎フレーム動かしてはためかせる
    const COLS = 6, ROWS = 12;
    const capeGeo = new T.PlaneGeometry(1, 1, COLS, ROWS);
    const cape = new T.Mesh(capeGeo, std('#7a3c20', { roughness: 0.8, side: T.DoubleSide }));
    m.pivot.add(cape);
    m.cape = cape;
    const pos = capeGeo.attributes.position;
    // fly: 0(ぶら下がる)〜1(飛んでいて後ろへ流れる)
    m.updateCape = (t, fly) => {
      for (let j = 0; j <= ROWS; j++) {
        const sv = j / ROWS;
        for (let i = 0; i <= COLS; i++) {
          const u = i / COLS - 0.5;
          const wave = (0.025 + 0.07 * fly) * sv * Math.sin(6 * sv - t * (5 + 9 * fly) + u * 1.6);
          pos.setXYZ(j * (COLS + 1) + i,
            u * (0.4 + 0.32 * sv),
            0.44 - sv * (0.74 + 0.08 * fly),
            -0.27 - 0.07 * sv - (0.22 * fly + 0.03) * sv * sv - wave);
        }
      }
      pos.needsUpdate = true;
      capeGeo.computeVertexNormals();
    };
    m.updateCape(0, 0);
    return m;
  }

  // ---------------- アンパンマンの顔(ボールとアンパンマン本人で共通) ----------------
  function anpanFaceTex(dizzy) {
    const f = facePainter('#e9a066');
    if (!dizzy) {
      f.curve([-25, 27], [-16, 38], [-7, 28], 7, '#1a1210');
      f.curve([7, 28], [16, 38], [25, 27], 7, '#1a1210');
      f.eye(-14, 15, 4.4, 7.4);
      f.eye(14, 15, 4.4, 7.4);
    } else {
      f.curve([-21, 20], [-10, 15], [-21, 10], 6, '#1a1210');
      f.curve([21, 20], [10, 15], [21, 10], 6, '#1a1210');
      f.curve([-25, 27], [-16, 33], [-7, 29], 6, '#1a1210');
      f.curve([7, 29], [16, 33], [25, 27], 6, '#1a1210');
    }
    const { g, P, px } = f;
    g.beginPath();
    if (!dizzy) {
      const [x0, y0] = P(-22, -13), [x1] = P(22, -13);
      g.moveTo(x0, y0);
      g.lineTo(x1, y0);
      const [cx, cy] = P(0, -46);
      g.quadraticCurveTo(cx, cy, x0, y0);
    } else {
      const [x, y] = P(0, -26);
      g.ellipse(x, y, 9 * px, 11 * px, 0, 0, Math.PI * 2);
    }
    g.fillStyle = '#8b3a46';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#1a1210';
    g.stroke();
    return toTex(f.c);
  }
  // 赤い鼻と両ほっぺ
  function anpanBumps(parent, R) {
    bump(parent, -27, -4, R, R * 0.29, '#df6331', 0.75, 0.92);
    bump(parent, 27, -4, R, R * 0.29, '#df6331', 0.75, 0.92);
    bump(parent, 0, -2, R, R * 0.29, '#d8432a', 0.95, 0.9);
  }

  // ---------------- アンパンマンの顔ボール ----------------
  function makeBall() {
    const R = HR.PHYS.ballR;
    const drawFace = anpanFaceTex;
    const texNormal = drawFace(false), texDizzy = drawFace(true);
    const mat = std('#ffffff', { map: texNormal, roughness: 0.55 });
    const root = new T.Group();
    const spin = new T.Group();
    root.add(spin);
    const s = new T.Mesh(sphereGeo, mat);
    s.scale.setScalar(R);
    spin.add(s);
    anpanBumps(spin, R);
    return {
      root, spin, mat,
      setDizzy(on) { mat.map = on ? texDizzy : texNormal; mat.needsUpdate = true; },
    };
  }

  // 丸い影
  let blobTex = null;
  function blob(sx, sz, opacity) {
    if (!blobTex) {
      const [c, g] = canvas(128, 128);
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)');
      grd.addColorStop(0.6, 'rgba(0,0,0,0.3)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      blobTex = new T.CanvasTexture(c);
    }
    const m = new T.Mesh(
      new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: opacity == null ? 1 : opacity, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 })
    );
    m.rotation.x = -Math.PI / 2;
    m.scale.set(sx, sz, 1);
    m.renderOrder = 3;
    return m;
  }

  // ポーズ(手足の位置・胴のひねり)。root の置き場所は呼び出し側が決める。
  // バタコさん・ランナー: [右手xyz, 左手xyz, 左足xyz, 右足xyz, ひねり(度), 前傾(度)]
  function poseBatako(m, v) {
    m.handR.position.set(v[0], v[1], v[2]);
    m.handL.position.set(v[3], v[4], v[5]);
    m.footL.position.set(v[6], v[7], v[8]);
    m.footR.position.set(v[9], v[10], v[11]);
    m.pivot.rotation.set(v[13] * DEG, v[12] * DEG, 0, 'YXZ');
    m.pivot.position.z = 0;
  }

  // ジャムおじさん(左打ち): [グリップxyz, バット方位ψ(度), 仰角ε(度), ひねり(度), 右足xyz]
  const UP = new T.Vector3(0, 1, 0);
  const batDir = new T.Vector3();
  function poseJam(m, v, opts) {
    const psi = v[3] * DEG, eps = v[4] * DEG;
    const dir = batDir.set(Math.cos(eps) * Math.cos(psi), Math.sin(eps), Math.cos(eps) * Math.sin(psi)).normalize();
    m.handR.position.set(v[0], v[1], v[2]);
    m.handL.position.set(v[0] + dir.x * 0.14, v[1] + dir.y * 0.14, v[2] + dir.z * 0.14);
    m.bat.position.set(v[0] - dir.x * 0.07, v[1] - dir.y * 0.07, v[2] - dir.z * 0.07);
    m.bat.quaternion.setFromUnitVectors(UP, dir);
    m.pivot.rotation.set((opts && opts.lean) || 0, v[5] * DEG, 0, 'YXZ');
    m.footL.position.set(0.18, 0.06, 0.0);
    m.footR.position.set(v[6], v[7], v[8]);
  }

  HR.Models = { makeBatako, makeJam, makeBall, makeRunner, makeAnpanman, blob, onSphere, poseBatako, poseJam };
})();
