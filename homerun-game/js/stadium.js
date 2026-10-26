'use strict';
// 球場: 芝・内野・フェンス広告・スタンドの観客・大型ビジョン・空
(function () {
  const HR = window.HR;
  const T = THREE;
  const DEG = HR.DEG;

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  }
  function toTex(c, aniso) {
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(aniso || 8, HR.MAX_ANISO);
    return t;
  }
  function lambert(o) { return new T.MeshLambertMaterial(o); }
  function font(w, px) { return `${w} ${px}px ${HR.FONT_UI}`; }

  // 頂点列から帯状のメッシュを作る(rows: 各行の頂点配列, u は行方向の長さで計算)
  function ribbon(rows, uScale, vValues) {
    const nR = rows.length, nC = rows[0].length;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j < nR; j++) {
      let acc = 0;
      for (let i = 0; i < nC; i++) {
        const p = rows[j][i];
        if (i > 0) acc += Math.hypot(p.x - rows[j][i - 1].x, p.z - rows[j][i - 1].z);
        pos.push(p.x, p.y, p.z);
        uv.push(acc / uScale, vValues[j]);
      }
    }
    for (let j = 0; j < nR - 1; j++) {
      for (let i = 0; i < nC - 1; i++) {
        const a = j * nC + i, b = a + 1, c = a + nC, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  function grassTexture() {
    const [c, g] = canvas(256, 256);
    g.fillStyle = '#4daa3f';
    g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#429d35';
    g.fillRect(0, 128, 256, 128);
    g.fillStyle = 'rgba(255,255,255,0.035)';
    g.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '20,60,10' : '160,220,120'},${Math.random() * 0.08})`;
      g.fillRect(Math.random() * 256, Math.random() * 256, 1, 2);
    }
    const t = toTex(c, 16);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  function dirtSpeckle(g, w, h, n) {
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,45,20' : '235,190,140'},${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }

  // 内野(土・ライン)。x:-32..32, z:-56..8 を 2048px で覆う。
  function infieldTexture() {
    const S = 2048, M = 64, X0 = -32, Z0 = -56, k = S / M;
    const [c, g] = canvas(S, S);
    const C = (x, z) => [(x - X0) * k, (z - Z0) * k];
    const DIRT = '#bf7b4c';
    const circle = (x, z, r) => { const [cx, cy] = C(x, z); g.beginPath(); g.arc(cx, cy, r * k, 0, Math.PI * 2); g.fill(); };
    g.fillStyle = DIRT;
    circle(0, -18.44, 29);
    circle(0, 0, 4.2);
    // 内野の芝(ダイヤモンドを内側に縮めたもの)をくり抜く
    const inset = 1.0, s2 = Math.SQRT1_2;
    const H = [0, -inset / s2], B1 = [19.4 - inset / s2, -19.4], B2 = [0, -38.8 + inset / s2], B3 = [-19.4 + inset / s2, -19.4];
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    for (const [i, p] of [H, B1, B2, B3].entries()) { const [x, y] = C(p[0], p[1]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = DIRT;
    circle(0, 0, 4.2);
    circle(0, -18.44, 2.9);
    circle(19.4, -19.4, 1.6);
    circle(-19.4, -19.4, 1.6);
    circle(0, -38.8, 1.6);
    g.globalCompositeOperation = 'source-atop';
    dirtSpeckle(g, S, S, 26000);
    // ホーム周りの踏み固めた跡
    const [hx, hy] = C(0, 0);
    const rg = g.createRadialGradient(hx, hy, 10, hx, hy, 3.6 * k);
    rg.addColorStop(0, 'rgba(120,60,30,0.25)');
    rg.addColorStop(1, 'rgba(120,60,30,0)');
    g.fillStyle = rg;
    g.fillRect(hx - 4 * k, hy - 4 * k, 8 * k, 8 * k);
    g.globalCompositeOperation = 'source-over';
    // ライン
    g.strokeStyle = '#f6f6f2';
    g.lineCap = 'butt';
    g.lineWidth = 0.09 * k;
    const line = (a, b) => { const [x0, y0] = C(a[0], a[1]), [x1, y1] = C(b[0], b[1]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    line([0.25, -0.25], [45, -45]);
    line([-0.25, -0.25], [-45, -45]);
    const box = (x0, z0, w, h) => { const [x, y] = C(x0, z0); g.strokeRect(x, y, w * k, h * k); };
    box(0.37, -1.1, 1.22, 1.83);
    box(-1.59, -1.1, 1.22, 1.83);
    box(-0.55, 0.73, 1.1, 2.4);
    return toTex(c, 16);
  }

  function adTexture() {
    const W = 2048, H = 160;
    const [c, g] = canvas(W, H);
    const ads = [
      { bg: '#123a8c', fg: '#ffffff', text: 'パン工場', sub: 'やきたてパン' },
      { bg: '#d93a2b', fg: '#ffffff', text: 'いちごジャム', sub: 'JAM' },
      { bg: '#0f2a5c', fg: '#ffe066', text: 'メロンパン', sub: 'MELON' },
      { bg: '#f2f2ec', fg: '#d3381c', text: 'あんぱん', sub: 'あんこたっぷり' },
    ];
    const w = W / ads.length;
    ads.forEach((a, i) => {
      g.fillStyle = a.bg;
      g.fillRect(i * w, 0, w, H);
      g.fillStyle = a.fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = font(900, 78);
      g.fillText(a.text, i * w + w / 2, H * 0.47);
      g.font = font(800, 26);
      g.globalAlpha = 0.85;
      g.fillText(a.sub, i * w + w / 2, H * 0.86);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(i * w, 0, 4, H);
    });
    g.fillStyle = '#ffd400';
    g.fillRect(0, 0, W, 10);
    const t = toTex(c, 8);
    t.wrapS = T.RepeatWrapping;
    return t;
  }

  // 観客(パワプロ風のちびキャラ)。cheer=true で腕を上げてぴょんと跳ねた絵。
  function crowdTexture(cheer, seed) {
    const W = 1024, H = 512, rows = 14;
    const [c, g] = canvas(W, H);
    const rnd = HR.makeRng(seed);
    const rh = H / rows;
    for (let r = 0; r < rows; r++) {
      g.fillStyle = r % 2 ? '#27466e' : '#2e5482';
      g.fillRect(0, r * rh, W, rh);
    }
    const shirts = ['#e8463c', '#ffffff', '#2d6fd6', '#ffd23f', '#f08a2c', '#39b54a', '#e85d9a', '#ffffff', '#e8463c'];
    const hairs = ['#2a1d16', '#3b2a1d', '#111111', '#6b4a2a', '#2a1d16'];
    for (let r = 0; r < rows; r++) {
      for (let x = 8; x < W - 8; x += 22 + rnd() * 6) {
        if (rnd() < 0.12) continue;
        const jump = cheer && rnd() < 0.8 ? -5 - rnd() * 4 : 0;
        const by = r * rh + rh * 0.92 + jump;
        const sc = shirts[Math.floor(rnd() * shirts.length)];
        g.fillStyle = sc;
        g.beginPath();
        g.ellipse(x, by - 8, 10, 10, 0, Math.PI, 0);
        g.fill();
        if (cheer && jump) {
          g.fillStyle = '#f0b48f';
          g.beginPath(); g.arc(x - 11, by - 30, 4, 0, Math.PI * 2); g.fill();
          g.beginPath(); g.arc(x + 11, by - 30, 4, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#f0b48f';
        g.beginPath();
        g.arc(x, by - 21, 8.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = rnd() < 0.3 ? sc : hairs[Math.floor(rnd() * hairs.length)];
        g.beginPath();
        g.arc(x, by - 23, 8.8, Math.PI * 1.05, Math.PI * 1.95);
        g.fill();
      }
    }
    const t = toTex(c, 8);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }

  function skyTexture() {
    const [c, g] = canvas(8, 512);
    const grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#2b6fd6');
    grd.addColorStop(0.32, '#4f9cf0');
    grd.addColorStop(0.47, '#a9d6fb');
    grd.addColorStop(0.5, '#d9f0ff');
    grd.addColorStop(1, '#d9f0ff');
    g.fillStyle = grd;
    g.fillRect(0, 0, 8, 512);
    return toTex(c, 1);
  }

  function cloudTexture(seed) {
    const [c, g] = canvas(512, 256);
    const rnd = HR.makeRng(seed);
    const blobs = [];
    for (let i = 0; i < 9; i++) blobs.push([90 + rnd() * 330, 120 + rnd() * 50 - Math.sin((i / 8) * Math.PI) * 40, 40 + rnd() * 45]);
    g.fillStyle = 'rgba(190,215,240,1)';
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y + 8, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff';
    for (const [x, y, r] of blobs) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    const t = toTex(c, 1);
    return t;
  }

  function textPlaneTexture(text, w, h, px, color, bg) {
    const [c, g] = canvas(w, h);
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#ffd400';
      g.lineWidth = 8;
      g.strokeRect(4, 4, w - 8, h - 8);
    }
    g.font = font(900, px);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    return toTex(c, 4);
  }

  function build(scene) {
    const api = {};

    // 空
    const sky = new T.Mesh(new T.SphereGeometry(1800, 32, 16), new T.MeshBasicMaterial({ map: skyTexture(), side: T.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    scene.add(sky);
    const rnd = HR.makeRng(42);
    for (let i = 0; i < 16; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: cloudTexture(100 + i), transparent: true, depthWrite: false, fog: false }));
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.3;
      const d = 1100 + rnd() * 400;
      sp.position.set(Math.sin(a) * d, 160 + rnd() * 300, -Math.cos(a) * d - 100);
      const s = 260 + rnd() * 240;
      sp.scale.set(s * 2, s, 1);
      sp.renderOrder = -9;
      scene.add(sp);
    }

    // 地面(芝)
    const grassTex = grassTexture();
    grassTex.repeat.set(700 / 12, 700 / 12);
    const ground = new T.Mesh(new T.PlaneGeometry(700, 700), lambert({ map: grassTex }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -120);
    scene.add(ground);
    // 芝の帯がホームから放射状でなく横縞に見えるよう、テクスチャの向きはそのまま

    const infield = new T.Mesh(new T.PlaneGeometry(64, 64), lambert({ map: infieldTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
    infield.rotation.x = -Math.PI / 2;
    infield.position.set(0, 0.01, -24);
    infield.renderOrder = 1;
    scene.add(infield);

    const white = lambert({ color: '#f7f7f3' });
    // 外野のファウルライン
    for (const s of [-1, 1]) {
      const len = 60;
      const line = new T.Mesh(new T.PlaneGeometry(0.12, len), lambert({ color: '#f6f6f2', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6 }));
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = -s * 45 * DEG;
      const mid = 44 + len / 2;
      line.position.set(s * mid * Math.SQRT1_2, 0.015, -mid * Math.SQRT1_2);
      line.renderOrder = 2;
      scene.add(line);
    }
    // ホームベース・塁
    const plateShape = new T.Shape();
    plateShape.moveTo(-0.216, 0); plateShape.lineTo(0.216, 0); plateShape.lineTo(0.216, 0.216);
    plateShape.lineTo(0, 0.432); plateShape.lineTo(-0.216, 0.216); plateShape.closePath();
    const plate = new T.Mesh(new T.ShapeGeometry(plateShape), white);
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(0, 0.02, -0.0);
    plate.rotation.z = Math.PI;
    scene.add(plate);
    for (const [x, z] of [[19.4, -19.4], [0, -38.8], [-19.4, -19.4]]) {
      const b = new T.Mesh(new T.BoxGeometry(0.4, 0.08, 0.4), white);
      b.position.set(x, 0.04, z);
      b.rotation.y = 45 * DEG;
      scene.add(b);
    }
    // マウンド
    const dirtMat = lambert({ color: '#c47f4f' });
    const mound = new T.Mesh(new T.CylinderGeometry(1.7, 2.9, 0.25, 48), dirtMat);
    mound.position.set(0, 0.125, -18.44);
    scene.add(mound);
    const rubber = new T.Mesh(new T.BoxGeometry(0.62, 0.03, 0.16), white);
    rubber.position.set(0, 0.26, -18.44);
    scene.add(rubber);

    // ---------- フェンスとスタンドの輪郭 ----------
    const contour = [];
    for (let a = -48; a <= 48.001; a += 1.5) {
      const phi = a * DEG, R = HR.fenceR(phi);
      contour.push({ x: R * Math.sin(phi), z: -R * Math.cos(phi), h: HR.PHYS.fenceH, of: true });
    }
    const off = 17;
    for (let s = 84; s >= 0; s -= 4) contour.push({ x: Math.SQRT1_2 * (s + off), z: Math.SQRT1_2 * (-s + off), h: 1.6 });
    for (let a = 52.5; a <= 127.5; a += 7.5) contour.push({ x: off * Math.cos(a * DEG), z: off * Math.sin(a * DEG), h: 1.6 });
    for (let s = 0; s <= 84; s += 4) contour.push({ x: -Math.SQRT1_2 * (s + off), z: Math.SQRT1_2 * (-s + off), h: 1.6 });
    contour.push(Object.assign({}, contour[0]));
    const n = contour.length;
    const cx = 0, cz = -45;
    for (let i = 0; i < n; i++) {
      const a = contour[Math.max(0, i - 1)], b = contour[Math.min(n - 1, i + 1)];
      let nx = -(b.z - a.z), nz = b.x - a.x;
      const l = Math.hypot(nx, nz) || 1;
      nx /= l; nz /= l;
      if (nx * (contour[i].x - cx) + nz * (contour[i].z - cz) < 0) { nx = -nx; nz = -nz; }
      contour[i].nx = nx; contour[i].nz = nz;
    }
    // 外野の警告ゾーン(土)
    {
      const inner = [], outer = [];
      for (const p of contour.filter((q) => q.of)) {
        outer.push({ x: p.x, y: 0.012, z: p.z });
        inner.push({ x: p.x - p.nx * 5, y: 0.012, z: p.z - p.nz * 5 });
      }
      const m = new T.Mesh(ribbon([inner, outer], 10, [0, 1]), lambert({ color: '#b97a4e', polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
      m.renderOrder = 1;
      scene.add(m);
    }
    // フェンス(広告)
    const adTex = adTexture();
    {
      const bottom = contour.map((p) => ({ x: p.x, y: 0, z: p.z }));
      const top = contour.map((p) => ({ x: p.x, y: p.h, z: p.z }));
      const m = new T.Mesh(ribbon([bottom, top], 24, [0, 1]), lambert({ map: adTex, side: T.DoubleSide }));
      scene.add(m);
    }
    // スタンド
    const crowdA = crowdTexture(false, 7), crowdB = crowdTexture(true, 7);
    const crowdMat = lambert({ map: crowdA, side: T.DoubleSide });
    {
      const rows = [];
      const steps = 6, depth = 34, rise = HR.PHYS.standRise;
      for (let j = 0; j <= steps; j++) {
        const d = 0.6 + (depth * j) / steps;
        rows.push(contour.map((p) => ({ x: p.x + p.nx * d, y: p.h + d * rise, z: p.z + p.nz * d })));
      }
      const vs = rows.map((_, j) => (j / steps) * 2.8);
      const m = new T.Mesh(ribbon(rows, 24, vs), crowdMat);
      scene.add(m);
      // スタンド最上部の壁と屋根のふち
      const topIn = rows[steps];
      const wallTop = topIn.map((p) => ({ x: p.x, y: p.y + 7, z: p.z }));
      scene.add(new T.Mesh(ribbon([topIn, wallTop], 20, [0, 1]), lambert({ color: '#1f3a66', side: T.DoubleSide })));
      const lipOut = wallTop.map((p, i) => ({ x: p.x - contour[i].nx * 6, y: p.y + 0.5, z: p.z - contour[i].nz * 6 }));
      scene.add(new T.Mesh(ribbon([wallTop, lipOut], 20, [0, 1]), lambert({ color: '#e9eef3', side: T.DoubleSide })));
      // フェンス上の黄色いライン
      const yl = contour.map((p) => ({ x: p.x, y: p.h, z: p.z }));
      const yl2 = contour.map((p) => ({ x: p.x + p.nx * 0.6, y: p.h + 0.02, z: p.z + p.nz * 0.6 }));
      scene.add(new T.Mesh(ribbon([yl, yl2], 20, [0, 1]), lambert({ color: '#ffd400', side: T.DoubleSide })));
    }
    // ポール
    for (const s of [-1, 1]) {
      const phi = s * 45 * DEG, R = HR.fenceR(phi) + 0.3;
      const pole = new T.Mesh(new T.CylinderGeometry(0.28, 0.32, 34, 12), lambert({ color: '#ffd400' }));
      pole.position.set(R * Math.sin(phi), 17, -R * Math.cos(phi));
      scene.add(pole);
    }
    // 距離表示
    for (const [deg, label] of [[-45, '100'], [-22.5, '116'], [0, '122'], [22.5, '116'], [45, '100']]) {
      const phi = deg * DEG, R = HR.fenceR(phi) - 0.06;
      const m = new T.Mesh(new T.PlaneGeometry(5, 1.9), new T.MeshBasicMaterial({ map: textPlaneTexture(label, 256, 96, 78, '#ffffff', '#0f2a5c') }));
      m.position.set(R * Math.sin(phi), HR.PHYS.fenceH + 1.2, -R * Math.cos(phi));
      m.lookAt(0, HR.PHYS.fenceH + 1.2, 0);
      scene.add(m);
    }

    // 大型ビジョン
    const [sc, sg] = canvas(1024, 512);
    const screenTex = toTex(sc, 4);
    const screenMat = new T.MeshBasicMaterial({ map: screenTex });
    const frameMat = lambert({ color: '#1b1d22' });
    const boardZ = -(HR.fenceR(0) + 39);
    const board = new T.Mesh(new T.BoxGeometry(48, 24, 3), [frameMat, frameMat, frameMat, frameMat, screenMat, frameMat]);
    board.position.set(0, 52, boardZ);
    scene.add(board);
    const legs = new T.Mesh(new T.BoxGeometry(30, 40, 2.5), frameMat);
    legs.position.set(0, 20, boardZ - 0.5);
    scene.add(legs);
    const bannerTex = (() => {
      const [c, g] = canvas(256, 1024);
      g.fillStyle = '#1688d8';
      g.fillRect(0, 0, 256, 1024);
      g.fillStyle = '#ffffff';
      g.font = font(900, 150);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      'パン工場'.split('').forEach((ch, i) => g.fillText(ch, 128, 170 + i * 230));
      return toTex(c, 4);
    })();
    for (const s of [-1, 1]) {
      const b = new T.Mesh(new T.BoxGeometry(7, 30, 2.5), [frameMat, frameMat, frameMat, frameMat, lambert({ map: bannerTex }), frameMat]);
      b.position.set(s * 29, 49, boardZ + 0.3);
      scene.add(b);
    }
    api.drawScreen = function (big, sub, flash) {
      sg.fillStyle = '#05070c';
      sg.fillRect(0, 0, 1024, 512);
      sg.fillStyle = flash ? '#3a1d00' : '#0b1a33';
      sg.fillRect(16, 16, 992, 480);
      sg.textAlign = 'center';
      sg.textBaseline = 'middle';
      sg.fillStyle = '#9fd8ff';
      sg.font = font(800, 52);
      sg.fillText('パン工場スタジアム', 512, 82);
      sg.fillStyle = flash ? '#ffd23f' : '#ffffff';
      sg.font = `${flash ? '' : '900 '}${flash ? 170 : 150}px ${flash ? HR.FONT_IMPACT : HR.FONT_UI}`;
      sg.fillText(big, 512, 270);
      sg.fillStyle = '#ffe680';
      sg.font = font(800, 60);
      sg.fillText(sub, 512, 430);
      screenTex.needsUpdate = true;
    };
    api.drawScreen('ホームラン競争', 'HR 0本', false);

    // 照明塔
    const towerMat = lambert({ color: '#8c96a3' });
    const lampTex = (() => {
      const [c, g] = canvas(256, 128);
      g.fillStyle = '#39414d';
      g.fillRect(0, 0, 256, 128);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
        g.fillStyle = '#fffbe6';
        g.beginPath(); g.arc(18 + x * 31, 18 + y * 31, 11, 0, Math.PI * 2); g.fill();
      }
      return toTex(c, 4);
    })();
    for (const [deg, d] of [[-62, 150], [62, 150], [-118, 80], [118, 80]]) {
      const phi = deg * DEG;
      const x = d * Math.sin(phi), z = -d * Math.cos(phi);
      const pole = new T.Mesh(new T.CylinderGeometry(0.8, 1.2, 60, 10), towerMat);
      pole.position.set(x, 30, z);
      scene.add(pole);
      const lamp = new T.Mesh(new T.BoxGeometry(16, 8, 1), [towerMat, towerMat, towerMat, towerMat, new T.MeshBasicMaterial({ map: lampTex }), towerMat]);
      lamp.position.set(x, 62, z);
      lamp.lookAt(0, 20, -40);
      scene.add(lamp);
    }

    // ライト
    scene.add(new T.HemisphereLight('#d6ecff', '#6b8f4a', 1.35));
    const sun = new T.DirectionalLight('#fff4de', 2.1);
    sun.position.set(-40, 80, 60);
    scene.add(sun);
    scene.add(new T.AmbientLight('#ffffff', 0.35));

    let cheerT = 0, excite = 0;
    api.update = function (t, dt, ex) {
      excite = HR.lerp(excite, ex, HR.damp(3, dt));
      cheerT += dt;
      const cheering = excite > 0.35 && Math.floor(cheerT * 7) % 2 === 0;
      const want = cheering ? crowdB : crowdA;
      if (crowdMat.map !== want) { crowdMat.map = want; crowdMat.needsUpdate = true; }
    };
    return api;
  }

  HR.Stadium = { build };
})();
