/* All drawing. Characters are drawn with canvas paths (no image files). */
(function (G) {
  'use strict';
  const AP = G.AP = G.AP || {};
  const Art = AP.Art = {};
  const T = 72;
  const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "IPAGothic", sans-serif';
  const INK = '#2B1A12';
  const C = {
    bread: '#E0A064', breadWeak: '#C8A584', cheek: '#F2552C', nose: '#E5331D',
    red: '#E2342B', redDark: '#B8241C', yellow: '#F8C630', yellowDark: '#D59E12',
    collar: '#8B5427', cape: '#43293A', brow: '#6B3A16', mouth: '#8E1F1A', tongue: '#EE7B6C',
    gold: '#FFC93A', goldDark: '#9A5A0C',
  };
  Art.FONT = FONT;

  /* ---------------------------------------------------------- helpers */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function ellipse(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); }
  function paint(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function limb(ctx, x1, y1, x2, y2, w, color) {
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = INK; ctx.lineWidth = w + 6; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
  }
  function text(ctx, s, x, y, size, o) {
    o = o || {};
    ctx.font = `${o.weight || 900} ${size}px ${FONT}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
    ctx.lineJoin = 'round'; ctx.miterLimit = 2;
    const lw = o.lw != null ? o.lw : size * 0.2;
    if (o.outer) { ctx.strokeStyle = o.outer; ctx.lineWidth = lw + (o.outerW || 10); ctx.strokeText(s, x, y); }
    if (o.stroke !== null && lw > 0) { ctx.strokeStyle = o.stroke || INK; ctx.lineWidth = lw; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.fill || '#fff'; ctx.fillText(s, x, y);
  }
  function hash(i, s) { const x = Math.sin(i * 127.1 + (s || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
  function star(ctx, x, y, r1, r2, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + i * Math.PI / n, r = i % 2 ? r2 : r1;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }
  function smiley(ctx, x, y, r, fill) {
    circle(ctx, x, y, r); paint(ctx, fill || C.yellow, INK, Math.max(1.5, r * 0.22));
    ctx.fillStyle = INK;
    circle(ctx, x - r * 0.36, y - r * 0.2, r * 0.13); ctx.fill();
    circle(ctx, x + r * 0.36, y - r * 0.2, r * 0.13); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + r * 0.05, r * 0.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.2, r * 0.14); ctx.lineCap = 'round'; ctx.stroke();
  }
  Art.rr = rr; Art.text = text;

  /* --------------------------------------------------------- アンパンマン */
  Art.head = function (ctx, hx, hy, mood) {
    const weak = mood === 'weak' || mood === 'sad';
    circle(ctx, hx, hy, 28); paint(ctx, weak ? C.breadWeak : C.bread, INK, 3.5);
    ellipse(ctx, hx - 10, hy - 13, 11, 6.5, -0.6); ctx.fillStyle = 'rgba(255,240,215,0.45)'; ctx.fill();
    for (const cx of [hx - 13, hx + 21]) {
      circle(ctx, cx, hy + 7, 9.5); paint(ctx, C.cheek, INK, 2.4);
      rr(ctx, cx - 5, hy + 1.5, 4.5, 3.5, 1.4); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
    }
    circle(ctx, hx + 4, hy + 3, 10); paint(ctx, C.nose, INK, 2.4);
    rr(ctx, hx - 1, hy - 3, 5, 4, 1.5); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    const ey = hy - 10;
    for (const ex of [hx - 6, hx + 12]) {
      if (mood === 'sad') {
        ctx.beginPath(); ctx.moveTo(ex - 4, ey - 3); ctx.lineTo(ex + 1, ey); ctx.lineTo(ex - 4, ey + 3);
        ctx.strokeStyle = '#1A0F0A'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke();
      } else {
        ellipse(ctx, ex, ey, 3.4, 5, 0); ctx.fillStyle = '#1A0F0A'; ctx.fill();
        circle(ctx, ex - 1, ey - 2, 1.3); ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
    ctx.lineCap = 'round'; ctx.strokeStyle = C.brow; ctx.lineWidth = 3.8;
    if (weak) {
      ctx.beginPath(); ctx.moveTo(hx - 13, ey - 8); ctx.lineTo(hx - 2, ey - 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 8, ey - 12); ctx.lineTo(hx + 19, ey - 8); ctx.stroke();
    } else if (mood === 'punch') {
      ctx.beginPath(); ctx.moveTo(hx - 13, ey - 13); ctx.lineTo(hx - 1, ey - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 7, ey - 8); ctx.lineTo(hx + 19, ey - 13); ctx.stroke();
    } else {
      for (const ex of [hx - 6, hx + 12]) { ctx.beginPath(); ctx.arc(ex, ey - 3, 7.5, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    }
    if (weak) {
      ctx.beginPath(); ctx.moveTo(hx - 4, hy + 20); ctx.quadraticCurveTo(hx, hy + 15, hx + 4, hy + 20);
      ctx.quadraticCurveTo(hx + 8, hy + 25, hx + 12, hy + 20);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
      for (const [dx, dy, s] of [[-24, -16, 1], [25, -4, 0.8]]) drop(ctx, hx + dx, hy + dy, 6 * s);
    } else {
      const deep = mood === 'punch' ? 31 : 28;
      ctx.beginPath(); ctx.moveTo(hx - 6, hy + 14); ctx.quadraticCurveTo(hx + 4, hy + deep, hx + 15, hy + 14); ctx.closePath();
      paint(ctx, C.mouth, null);
      ctx.save(); ctx.clip(); circle(ctx, hx + 5, hy + 24, 6.5); ctx.fillStyle = C.tongue; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.moveTo(hx - 6, hy + 14); ctx.quadraticCurveTo(hx + 4, hy + deep, hx + 15, hy + 14); ctx.closePath();
      paint(ctx, null, INK, 2.4);
    }
  };
  function drop(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.8);
    ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r);
    ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.8);
    paint(ctx, '#7CC8F5', '#2C5F86', 2);
  }
  function boot(ctx, x, y, back) { ellipse(ctx, x + 4, y - 7, 12.5, 8, 0); paint(ctx, back ? C.yellowDark : C.yellow, INK, 3); }
  function gloveY(ctx, x, y, r, back) { circle(ctx, x, y, r); paint(ctx, back ? C.yellowDark : C.yellow, INK, 3); }

  Art.anpanman = function (ctx, x, y, o) {
    const f = o.frame || 0, pose = o.pose || 'stand', ph = o.phase || 0;
    ctx.save(); ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (o.dir < 0) ctx.scale(-1, 1);
    if (o.rot) { ctx.translate(0, -56); ctx.rotate(o.rot); ctx.translate(0, 56); }
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    let fF = [8, 0], fB = [-8, 0], hF = [17, -36], hB = [-17, -36], bob = 0, gloveR = 9;
    let mood = o.genki === false ? 'weak' : 'happy';
    const wind = o.wind || 0;
    switch (pose) {
      case 'run': {
        const s = Math.sin(ph), c = Math.cos(ph);
        fF = [3 + s * 13, -Math.max(0, c) * 9]; fB = [-3 - s * 13, -Math.max(0, -c) * 9];
        hF = [12 - s * 13, -38 - Math.abs(s) * 4]; hB = [-12 + s * 13, -38 - Math.abs(s) * 4];
        bob = -Math.abs(s) * 3; break;
      }
      case 'jump': fF = [13, -16]; fB = [-9, -4]; hF = [16, -102]; hB = [-27, -50]; break;
      case 'fall': fF = [11, -10]; fB = [-10, -2]; hF = [24, -76]; hB = [-28, -60]; break;
      case 'punch': {
        const k = o.punchK || 0;
        fF = [13, 0]; fB = [-12, 0]; hF = [24 + 30 * k, -52]; hB = [-20, -42]; gloveR = 9 + 4 * k; mood = o.genki === false ? 'weak' : 'punch';
        break;
      }
      case 'slide': fF = [20, -26]; fB = [8, -6]; hF = [28, -86]; hB = [26, -68]; break;
      case 'victory': fF = [9, 0]; fB = [-9, 0]; hF = [18, -108]; hB = [-28, -52]; bob = -Math.abs(Math.sin(f * 0.15)) * 10; break;
      case 'die': fF = [14, -8]; fB = [-14, -8]; hF = [28, -98]; hB = [-28, -98]; mood = 'sad'; break;
      case 'fly': fF = [-14, -4]; fB = [-24, -12]; hF = [30, -104]; hB = [-16, -54]; break;
      case 'flypunch': {
        const k = o.punchK || 0;
        fF = [-14, -4]; fB = [-24, -12]; hF = [22, -108 - 36 * k]; hB = [-16, -54]; gloveR = 9 + 6 * k; mood = 'punch';
        break;
      }
      default: bob = Math.sin(f * 0.07) * 1.2;
    }
    ctx.translate(0, bob);
    if (o.star) {
      const hue = (f * 12) % 360;
      const gr = ctx.createRadialGradient(0, -56, 8, 0, -56, 92);
      gr.addColorStop(0, `hsla(${hue},100%,78%,0.85)`); gr.addColorStop(0.6, `hsla(${(hue + 60) % 360},100%,65%,0.35)`); gr.addColorStop(1, `hsla(${hue},100%,60%,0)`);
      ctx.fillStyle = gr; circle(ctx, 0, -56, 92); ctx.fill();
    }
    // cape
    const flap = Math.sin(f * 0.3) * 4 * (0.3 + wind);
    ctx.beginPath(); ctx.moveTo(-10, -60);
    ctx.quadraticCurveTo(-26 - 18 * wind, -44 - 6 * wind, -32 - 36 * wind, -10 - 30 * wind + flap);
    ctx.quadraticCurveTo(-18 - 30 * wind, -4 - 24 * wind, -4 - 26 * wind, -8 - 18 * wind - flap * 0.6);
    ctx.quadraticCurveTo(-2, -32, 10, -58); ctx.closePath();
    paint(ctx, C.cape, INK, 3);
    const shB = [-10, -52], shF = [11, -52];
    limb(ctx, -6, -24, fB[0], fB[1] - 7, 13, C.redDark); boot(ctx, fB[0], fB[1], true);
    limb(ctx, shB[0], shB[1], hB[0], hB[1], 12, C.redDark); gloveY(ctx, hB[0], hB[1], 8.5, true);
    rr(ctx, -17, -61, 34, 37, 11); paint(ctx, C.red, INK, 3.2);
    rr(ctx, -17, -32, 34, 7, 2.5); paint(ctx, C.yellow, INK, 2.4);
    rr(ctx, -5, -34, 10, 10, 2.5); paint(ctx, C.yellow, INK, 2.2);
    smiley(ctx, 4, -46, 7);
    limb(ctx, 6, -24, fF[0], fF[1] - 7, 13, C.red); boot(ctx, fF[0], fF[1], false);
    // fluffy collar
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI * (1.05 - i * 0.183); ctx.arc(2 + Math.cos(a) * 18, -58 + Math.sin(a) * -2, 6.5, 0, Math.PI * 2); }
    paint(ctx, C.collar, null);
    ellipse(ctx, 2, -58, 22, 7.5, 0); paint(ctx, C.collar, INK, 2.6);
    const armOver = pose !== 'stand' && pose !== 'run';
    if (!armOver) { limb(ctx, shF[0], shF[1], hF[0], hF[1], 12, C.red); gloveY(ctx, hF[0], hF[1], gloveR); }
    if ((pose === 'fly' || pose === 'flypunch') && o.rot) { ctx.save(); ctx.translate(3, -84); ctx.rotate(-o.rot * 0.8); Art.head(ctx, 0, 0, mood); ctx.restore(); }
    else Art.head(ctx, 3, -84, mood);
    if (armOver) {
      limb(ctx, shF[0], shF[1], hF[0], hF[1], 12, C.red); gloveY(ctx, hF[0], hF[1], gloveR);
      if (pose === 'flypunch' && (o.punchK || 0) > 0.4) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (const dx of [-11, 0, 11]) { ctx.beginPath(); ctx.moveTo(hF[0] + dx, hF[1] + 24 + Math.abs(dx)); ctx.lineTo(hF[0] + dx, hF[1] + 46 + Math.abs(dx)); ctx.stroke(); }
      }
      if (pose === 'punch' && (o.punchK || 0) > 0.4) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (const dy of [-10, 0, 10]) { ctx.beginPath(); ctx.moveTo(hF[0] - 22 - Math.abs(dy), hF[1] + dy); ctx.lineTo(hF[0] - 40 - Math.abs(dy), hF[1] + dy); ctx.stroke(); }
      }
    }
    ctx.restore();
  };

  /* --------------------------------------------------------- かびるんるん */
  const KABI_COL = {
    green: { body: '#5E9F86', shade: '#4A846D', tip: '#8E5BAE', cheek: '#9C6CBF' },
    winged: { body: '#5E9F86', shade: '#4A846D', tip: '#8E5BAE', cheek: '#9C6CBF' },
    purple: { body: '#9466BE', shade: '#7149A0', tip: '#4FAE7E', cheek: '#E07AB8' },
  };
  Art.kabi = function (ctx, e, f) {
    const col = KABI_COL[e.kind] || KABI_COL.green;
    const cx = e.x + e.w / 2, by = e.y + e.h;
    ctx.save(); ctx.translate(cx, by); ctx.scale(1.1, 1.1);
    if (e.state === 'flat') {
      ellipse(ctx, 0, -9, 32, 10, 0); paint(ctx, col.body, INK, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const ex of [-10, 10]) { ctx.beginPath(); ctx.moveTo(ex - 4, -13); ctx.lineTo(ex + 4, -7); ctx.moveTo(ex + 4, -13); ctx.lineTo(ex - 4, -7); ctx.stroke(); }
      ctx.restore(); return;
    }
    if (e.state === 'shell' || e.state === 'kicked') {
      ctx.translate(0, -24); ctx.rotate(e.rot || 0);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.lineTo(Math.cos(a) * 31, Math.sin(a) * 31);
        ctx.strokeStyle = INK; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
        ctx.strokeStyle = col.tip; ctx.lineWidth = 3.5; ctx.stroke();
      }
      circle(ctx, 0, 0, 24); paint(ctx, col.body, INK, 3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
      for (const ex of [-8, 8]) { ctx.beginPath(); ctx.arc(ex, -2, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      circle(ctx, 0, 8, 5); paint(ctx, col.tip, INK, 2);
      ctx.restore(); return;
    }
    if (e.state === 'flip') { ctx.translate(0, -27); ctx.rotate(Math.PI + (e.rot || 0)); ctx.translate(0, 27); }
    const dir = e.vx < 0 ? -1 : 1;
    const ph = e.phase || 0;
    const sq = 1 + Math.sin(ph * 2) * 0.05;
    ctx.scale(1 + (1 - sq) * 0.6, sq);
    const wig = Math.sin(ph * 1.3) * 4;
    // antennae + arms
    const ant = [[-8, -48, -15 + wig, -74], [8, -48, 15 - wig, -74], [-24, -28, -43, -40 + wig], [24, -28, 43, -40 - wig]];
    for (const [x1, y1, x2, y2] of ant) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2 + (x2 - x1) * 0.2, (y1 + y2) / 2 + 6, x2, y2);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      ellipse(ctx, x2, y2, 6.5, 4.5, Math.atan2(y2 - y1, x2 - x1)); paint(ctx, col.tip, INK, 2.2);
    }
    if (e.kind === 'winged') {
      const fl = Math.sin(f * 0.55) * 0.55;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * 24, -36); ctx.rotate(s * (-0.3 + fl)); ctx.scale(s, 1);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(18, -26, 40, -20);
        ctx.quadraticCurveTo(34, -10, 38, -2); ctx.quadraticCurveTo(26, -4, 24, 6); ctx.quadraticCurveTo(14, 0, 0, 6); ctx.closePath();
        paint(ctx, '#57406E', INK, 2.6); ctx.restore();
      }
    }
    const lift = Math.max(0, Math.sin(ph * 2)) * 4;
    ellipse(ctx, -12, -3 - lift, 9, 5, 0); paint(ctx, col.tip, INK, 2.4);
    ellipse(ctx, 12, -3 - (4 - lift), 9, 5, 0); paint(ctx, col.tip, INK, 2.4);
    ctx.beginPath(); ctx.moveTo(-26, -6);
    ctx.bezierCurveTo(-35, -30, -24, -55, 0, -55);
    ctx.bezierCurveTo(24, -55, 35, -30, 26, -6);
    ctx.bezierCurveTo(16, 2, -16, 2, -26, -6); ctx.closePath();
    paint(ctx, col.body, INK, 3);
    ellipse(ctx, -12, -42, 7, 4, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fill();
    const fx = dir * 3;
    for (const ex of [-9, 9]) {
      ellipse(ctx, ex + fx, -34, 8, 9.5, 0); paint(ctx, '#fff', INK, 2.4);
      circle(ctx, ex + fx + dir * 3.2, -33, 3.6); ctx.fillStyle = '#111'; ctx.fill();
    }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-15 + fx, -48); ctx.lineTo(-4 + fx, -45); ctx.moveTo(15 + fx, -48); ctx.lineTo(4 + fx, -45); ctx.stroke();
    ctx.globalAlpha *= 0.85;
    circle(ctx, -19 + fx, -20, 4.5); ctx.fillStyle = col.cheek; ctx.fill();
    circle(ctx, 19 + fx, -20, 4.5); ctx.fill();
    ctx.globalAlpha /= 0.85;
    ctx.beginPath(); ctx.arc(fx, -24, 13, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
    circle(ctx, fx, -23, 7.5); paint(ctx, col.tip, INK, 2.2);
    ctx.fillStyle = '#fff'; ctx.fillRect(fx - 2.5, -27, 4.5, 4.5);
    ctx.restore();
  };

  /* --------------------------------------------------------- items */
  Art.newFace = function (ctx, it, f) {
    ctx.save(); ctx.translate(it.x, it.y);
    for (let i = 0; i < 6; i++) {
      const a = f * 0.08 + i * Math.PI / 3;
      star(ctx, Math.cos(a) * 44, Math.sin(a) * 44, 8, 3.5, 4, a);
      ctx.fillStyle = '#FFF3A0'; ctx.fill();
    }
    const gr = ctx.createRadialGradient(0, 0, 10, 0, 0, 50); gr.addColorStop(0, 'rgba(255,250,200,0.9)'); gr.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = gr; circle(ctx, 0, 0, 50); ctx.fill();
    ctx.rotate(Math.sin(it.spin) * 0.25);
    Art.head(ctx, -3, 0, 'happy');
    ctx.restore();
  };
  Art.coin = function (ctx, x, y, f, r) {
    r = r || 22;
    const s = Math.max(0.18, Math.abs(Math.cos(f * 0.09)));
    ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
    ellipse(ctx, 0, 0, r, r * 1.22, 0); paint(ctx, C.gold, C.goldDark, 3.5);
    ellipse(ctx, 0, 0, r * 0.72, r * 0.92, 0); ctx.strokeStyle = '#FFE58A'; ctx.lineWidth = 3; ctx.stroke();
    if (s > 0.55) {
      ctx.fillStyle = C.goldDark;
      circle(ctx, -r * 0.27, -r * 0.2, r * 0.1); ctx.fill(); circle(ctx, r * 0.27, -r * 0.2, r * 0.1); ctx.fill();
      ctx.beginPath(); ctx.arc(0, r * 0.05, r * 0.38, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = C.goldDark; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    }
    ctx.restore();
  };

  /* ------------------------------------------------------ バイキンマン */
  Art.baikinBust = function (ctx, x, y, mood, f, look) {
    ctx.save(); ctx.translate(x, y);
    const wob = Math.sin(f * 0.18) * 2;
    // shoulders
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-36, -26, 0, -26); ctx.quadraticCurveTo(36, -26, 40, 0); ctx.closePath();
    paint(ctx, '#2D2F4E', INK, 3);
    // antennae
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(s * 15, -72 + wob); ctx.quadraticCurveTo(s * 20, -88, s * 28, -100 + wob);
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      circle(ctx, s * 28, -102 + wob, 6.5); paint(ctx, '#2D2F4E', INK, 2.5);
    }
    // waving arm
    const ay = -30 + Math.sin(f * 0.22) * 7;
    limb(ctx, 30, -14, 46, ay, 9, '#2D2F4E');
    circle(ctx, 48, ay - 2, 8); paint(ctx, '#B6A6E0', INK, 2.5);
    ellipse(ctx, 0, -46 + wob * 0.5, 41, 34, 0); paint(ctx, '#2D2F4E', INK, 3.5);
    ellipse(ctx, 0, -32 + wob * 0.5, 31, 15, 0); paint(ctx, '#A99BD6', null);
    const hy = wob * 0.5;
    const lk = (look || 0) * 3;
    for (const s of [-1, 1]) {
      const ex = s * 14, ey = -54 + hy;
      if (mood === 'dizzy') {
        ctx.beginPath();
        for (let i = 0; i < 24; i++) { const a = i * 0.55 + f * 0.25; const r = i * 0.42; ctx.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); }
        ellipse(ctx, ex, ey, 10, 11, 0); ctx.fillStyle = '#F1E8FF'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 24; i++) { const a = i * 0.55 + f * 0.25 * s; const r = i * 0.38; ctx.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r); }
        ctx.strokeStyle = '#D6489C'; ctx.lineWidth = 2; ctx.stroke();
      } else if (mood === 'hurt') {
        ellipse(ctx, ex, ey, 10, 11, 0); paint(ctx, '#F1E8FF', INK, 2.4);
        ctx.beginPath(); ctx.moveTo(ex - 5 * s, ey - 5); ctx.lineTo(ex + 4 * s, ey); ctx.lineTo(ex - 5 * s, ey + 5);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      } else {
        ellipse(ctx, ex, ey, 10, 11, 0); paint(ctx, '#F1E8FF', INK, 2.4);
        circle(ctx, ex + lk, ey + 2, 5.2); ctx.fillStyle = '#D6489C'; ctx.fill();
        circle(ctx, ex + lk, ey + 2, 2.2); ctx.fillStyle = '#2B1030'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(ex + s * 13, ey - 16); ctx.lineTo(ex - s * 6, ey - 9);
        ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      }
    }
    // grin
    if (mood === 'dizzy' || mood === 'hurt') {
      ellipse(ctx, 0, -24 + hy, 13, 9, 0); paint(ctx, '#5E1838', INK, 2.4);
    } else {
      rr(ctx, -24, -36 + hy, 48, 19, 8); paint(ctx, '#fff', INK, 2.6);
      ctx.beginPath(); ctx.moveTo(-23, -26.5 + hy); ctx.lineTo(23, -26.5 + hy);
      for (const tx of [-12, 0, 12]) { ctx.moveTo(tx, -35 + hy); ctx.lineTo(tx, -18 + hy); }
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    }
    circle(ctx, 0, -40 + hy, 7.5); paint(ctx, '#8F63B8', INK, 2.4);
    ctx.fillStyle = '#fff'; ctx.fillRect(-3, -44 + hy, 4, 4);
    ctx.restore();
  };

  function segArm(ctx, p0, p1, p2, p3) {
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
    ctx.strokeStyle = INK; ctx.lineWidth = 28; ctx.lineCap = 'round'; ctx.stroke();
    ctx.strokeStyle = '#A3A6B0'; ctx.lineWidth = 21; ctx.stroke();
    ctx.strokeStyle = '#6E717C'; ctx.lineWidth = 3;
    for (let i = 1; i < 12; i++) {
      const t = i / 12, mt = 1 - t;
      const bx = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
      const by = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
      const dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
      const dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      const l = Math.hypot(dx, dy) || 1, nx = -dy / l * 10, ny = dx / l * 10;
      ctx.beginPath(); ctx.moveTo(bx - nx, by - ny); ctx.lineTo(bx + nx, by + ny); ctx.stroke();
    }
  }
  Art.glove = function (ctx, x, y, side, rot, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale((s || 1) * side, s || 1);
    rr(ctx, -24, 26, 48, 16, 6); paint(ctx, '#F7A8D6', INK, 3.5);
    rr(ctx, -31, -34, 62, 64, 27); paint(ctx, '#EE6CB8', INK, 4);
    ellipse(ctx, -26, 6, 13, 18, 0.3); paint(ctx, '#EE6CB8', INK, 3.5);
    ctx.strokeStyle = '#A8357A'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const yy of [-16, -3, 10]) { ctx.beginPath(); ctx.moveTo(-6, yy); ctx.quadraticCurveTo(10, yy - 4, 24, yy); ctx.stroke(); }
    ellipse(ctx, 10, -22, 10, 5, -0.3); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    ctx.restore();
  };

  Art.boss = function (ctx, b, f, px) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(b.scale, b.scale);
    if (b.flashT > 0 && (b.flashT >> 2) % 2 === 0) ctx.globalAlpha *= 0.45;
    const gl = b.glove;
    const glSide = gl ? (gl.x >= b.x ? 1 : -1) : 0;
    const bobG = Math.sin(f * 0.12) * 6;
    for (const s of [-1, 1]) {
      if (s === glSide) {
        const gx = gl.x - b.x, gy = gl.y - b.y;
        segArm(ctx, [s * 46, 62], [s * 50, 150], [gx, gy - 140], [gx, gy - 40]);
        Art.glove(ctx, gx, gy, s, Math.PI, 1.05);
      } else {
        segArm(ctx, [s * 46, 62], [s * 60, 175], [s * 196, 170], [s * 188, 74 + bobG]);
        Art.glove(ctx, s * 188, 40 + bobG, s, 0, 1);
      }
    }
    rr(ctx, -64, 18, 128, 58, 12); paint(ctx, '#7E3FB0', INK, 4);
    rr(ctx, -52, 26, 14, 24, 6); ctx.fillStyle = '#B98BE8'; ctx.fill();
    rr(ctx, -46, 52, 92, 11, 5); paint(ctx, '#F4ECFF', INK, 2.5);
    rr(ctx, -76, 70, 152, 17, 8); paint(ctx, '#5E2A86', INK, 4);
    ctx.beginPath(); ctx.moveTo(-154, -12); ctx.lineTo(154, -12); ctx.lineTo(128, 24); ctx.lineTo(-128, 24); ctx.closePath();
    paint(ctx, '#8E5CC4', null);
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#B996E8';
    for (let i = -3; i <= 3; i++) {
      const sx = i * 44;
      ctx.beginPath(); ctx.moveTo(sx - 12, -12); ctx.lineTo(sx + 4, -12); ctx.lineTo(sx + 14, 24); ctx.lineTo(sx - 2, 24); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-154, -12); ctx.lineTo(154, -12); ctx.lineTo(128, 24); ctx.lineTo(-128, 24); ctx.closePath();
    paint(ctx, null, INK, 4);
    // lights on the rim
    for (let i = -2; i <= 2; i++) {
      circle(ctx, i * 50, 8, 6);
      const on = ((f >> 3) + i + 10) % 3 === 0;
      paint(ctx, on ? '#FFE14D' : '#6A3B98', INK, 2);
    }
    ellipse(ctx, 0, -12, 154, 11, 0); paint(ctx, '#A981DD', INK, 3.5);
    const mood = b.state === 'tired' ? 'dizzy' : (b.state === 'hurt' || b.state === 'defeat' || b.state === 'blasted') ? 'hurt' : 'grin';
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -12, 80, 102, 0, Math.PI, Math.PI * 2); ctx.closePath(); ctx.clip();
    const glass = ctx.createLinearGradient(0, -114, 0, -12); glass.addColorStop(0, '#F2FAFF'); glass.addColorStop(1, '#B4D9F2');
    ctx.fillStyle = glass; ctx.fillRect(-82, -116, 164, 106);
    Art.baikinBust(ctx, 0, -4, mood, f, Math.sign((px || b.x) - b.x));
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -12, 80, 102, 0, Math.PI, Math.PI * 2); ctx.closePath();
    paint(ctx, 'rgba(220,240,255,0.16)', INK, 4);
    ctx.beginPath(); ctx.ellipse(0, -12, 66, 88, 0, Math.PI * 1.12, Math.PI * 1.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.stroke();
    circle(ctx, 0, -116, 9); paint(ctx, '#B996E8', INK, 3);
    ctx.restore();
  };
  Art.bomb = function (ctx, bm, f) {
    ctx.save(); ctx.translate(bm.x, bm.y);
    if (bm.state === 'boom') { ctx.restore(); return; }
    const blink = bm.state === 'fuse' && (bm.t > 26 ? (f >> 2) % 2 === 0 : (f >> 3) % 2 === 0);
    if (bm.spawn) {
      ellipse(ctx, 0, 0, 19, 22, 0); paint(ctx, blink ? '#9DE0C2' : '#6FB89A', INK, 3);
      ctx.fillStyle = '#8E5BAE';
      for (const [dx, dy, r] of [[-7, -8, 4], [6, -2, 5], [-4, 9, 3.5]]) { circle(ctx, dx, dy, r); ctx.fill(); }
    } else {
      circle(ctx, 0, 0, 20); paint(ctx, blink ? '#C43B5A' : '#3A2F55', INK, 3);
      ellipse(ctx, -7, -8, 6, 4, -0.6); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill();
      ctx.fillStyle = '#fff';
      for (const dx of [-6, 6]) { circle(ctx, dx, 2, 3); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(6, -30, 12, -30); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
      star(ctx, 13, -31, 7, 3, 4, f * 0.3); ctx.fillStyle = '#FFE14D'; ctx.fill();
    }
    ctx.restore();
  };

  /* --------------------------------------------------------- tiles */
  const cache = {};
  function mk(w, h) {
    const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : document.createElement('canvas');
    c.width = w; c.height = h; return c;
  }
  const THEMES = {
    field: { grass: '#62C04A', grassHi: '#93E06E', grassDark: '#2F7A2A', soil: '#B9723E', soilDark: '#965A2E', soilHi: '#D08B55' },
    sunset: { grass: '#5AAE48', grassHi: '#8BD06A', grassDark: '#2C6A2A', soil: '#A8603A', soilDark: '#82482A', soilHi: '#C27A4E' },
    castle: { grass: '#6F6690', grassHi: '#8E86AE', grassDark: '#4B4366', soil: '#6F6690', soilDark: '#4B4366', soilHi: '#8E86AE' },
  };
  function tileSet(theme) {
    const P = THEMES[theme], S = {};
    const soil = (g) => {
      g.fillStyle = P.soil; g.fillRect(0, 0, T, T);
      g.fillStyle = P.soilDark;
      for (const [x, y, r] of [[14, 30, 4], [50, 20, 3], [36, 52, 5], [62, 58, 3], [8, 62, 3], [28, 12, 2.5]]) { circle(g, x, y, r); g.fill(); }
      g.fillStyle = P.soilHi;
      for (const [x, y, r] of [[22, 40, 2], [58, 38, 2.5], [44, 8, 2], [10, 48, 1.8]]) { circle(g, x, y, r); g.fill(); }
    };
    let c = mk(T, T), g = c.getContext('2d');
    soil(g); S.G_fill = c;
    c = mk(T, T); g = c.getContext('2d'); soil(g);
    g.fillStyle = P.grass; g.fillRect(0, 0, T, 16);
    g.beginPath(); for (let i = 0; i < 4; i++) g.arc(i * 18 + 9, 16, 9, 0, Math.PI); g.fill();
    g.strokeStyle = P.grassDark; g.lineWidth = 2.5;
    g.beginPath(); for (let i = 0; i < 4; i++) g.arc(i * 18 + 9, 16, 9, 0, Math.PI); g.stroke();
    g.fillStyle = P.grassHi;
    for (let i = 0; i < 6; i++) { g.fillRect(4 + i * 12, 4 + (i % 2) * 3, 5, 3); }
    g.fillStyle = P.grassDark; g.fillRect(0, 0, T, 3);
    S.G_top = c;
    // castle stone
    c = mk(T, T); g = c.getContext('2d');
    g.fillStyle = '#6F6690'; g.fillRect(0, 0, T, T);
    g.strokeStyle = '#4B4366'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 36); g.lineTo(T, 36); g.moveTo(0, 1.5); g.lineTo(T, 1.5);
    g.moveTo(36, 0); g.lineTo(36, 36); g.moveTo(14, 36); g.lineTo(14, T); g.moveTo(58, 36); g.lineTo(58, T); g.stroke();
    g.fillStyle = '#8E86AE'; g.fillRect(3, 4, 30, 4); g.fillRect(39, 4, 30, 4); g.fillRect(17, 39, 38, 4);
    g.fillStyle = '#5A527A'; g.fillRect(3, 30, 30, 4); g.fillRect(39, 30, 30, 4);
    S.W = c;
    // brick
    c = mk(T, T); g = c.getContext('2d');
    g.fillStyle = '#D9783A'; g.fillRect(0, 0, T, T);
    g.fillStyle = '#F2A066';
    for (let r = 0; r < 4; r++) g.fillRect(2, r * 18 + 3, T - 4, 3);
    g.strokeStyle = '#7A3B17'; g.lineWidth = 3; g.beginPath();
    for (let r = 1; r < 4; r++) { g.moveTo(0, r * 18); g.lineTo(T, r * 18); }
    for (let r = 0; r < 4; r++) { const xs = r % 2 ? [18, 54] : [36]; for (const x of xs) { g.moveTo(x, r * 18); g.lineTo(x, r * 18 + 18); } }
    g.stroke(); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1.5, 1.5, T - 3, T - 3);
    S.B = c;
    // ? blocks (4 shimmer frames)
    for (let i = 0; i < 4; i++) {
      c = mk(T, T); g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, T); gr.addColorStop(0, '#FFD95A'); gr.addColorStop(1, '#F2A81E');
      rr(g, 2, 2, T - 4, T - 4, 9); g.fillStyle = gr; g.fill(); g.strokeStyle = C.goldDark; g.lineWidth = 4; g.stroke();
      rr(g, 7, 7, T - 14, 10, 5); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
      g.fillStyle = C.goldDark; for (const [x, y] of [[11, 11], [61, 11], [11, 61], [61, 61]]) { circle(g, x, y, 3.2); g.fill(); }
      const glow = [0, 0.18, 0.36, 0.18][i];
      text(g, '?', 36, 39, 52, { fill: '#FFFFFF', stroke: C.goldDark, lw: 8 });
      if (glow) { rr(g, 2, 2, T - 4, T - 4, 9); g.fillStyle = `rgba(255,255,230,${glow})`; g.fill(); }
      S['Q' + i] = c;
    }
    c = mk(T, T); g = c.getContext('2d');
    rr(g, 2, 2, T - 4, T - 4, 9); g.fillStyle = '#B5814F'; g.fill(); g.strokeStyle = '#6E4320'; g.lineWidth = 4; g.stroke();
    g.fillStyle = '#6E4320'; for (const [x, y] of [[11, 11], [61, 11], [11, 61], [61, 61]]) { circle(g, x, y, 3.2); g.fill(); }
    S.U = c;
    // stair block
    c = mk(T, T); g = c.getContext('2d');
    const st = theme === 'castle' ? ['#9C93B4', '#BDB6D2', '#6E6688'] : ['#D2A066', '#EBC48B', '#A87543'];
    g.fillStyle = st[0]; g.fillRect(0, 0, T, T);
    g.fillStyle = st[1]; g.beginPath(); g.moveTo(0, 0); g.lineTo(T, 0); g.lineTo(T - 12, 12); g.lineTo(12, 12); g.lineTo(12, T - 12); g.lineTo(0, T); g.fill();
    g.fillStyle = st[2]; g.beginPath(); g.moveTo(T, 0); g.lineTo(T, T); g.lineTo(0, T); g.lineTo(12, T - 12); g.lineTo(T - 12, T - 12); g.lineTo(T - 12, 12); g.fill();
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1.5, 1.5, T - 3, T - 3);
    S.S = c;
    // pipes
    const pipeBody = (g, left) => {
      if (left) {
        g.fillStyle = '#3FB84F'; g.fillRect(6, 0, T - 6, T);
        g.fillStyle = '#8FE485'; g.fillRect(16, 0, 11, T);
        g.fillStyle = INK; g.fillRect(4, 0, 4, T);
      } else {
        g.fillStyle = '#3FB84F'; g.fillRect(0, 0, T - 6, T);
        g.fillStyle = '#24883A'; g.fillRect(40, 0, 16, T);
        g.fillStyle = INK; g.fillRect(T - 8, 0, 4, T);
      }
    };
    c = mk(T, T); g = c.getContext('2d'); pipeBody(g, true); S['{'] = c;
    c = mk(T, T); g = c.getContext('2d'); pipeBody(g, false); S['}'] = c;
    for (const left of [true, false]) {
      c = mk(T, T); g = c.getContext('2d'); pipeBody(g, left);
      g.fillStyle = '#3FB84F'; g.fillRect(0, 0, T, 34);
      g.fillStyle = left ? '#8FE485' : '#24883A'; g.fillRect(left ? 10 : 44, 4, left ? 12 : 16, 26);
      g.fillStyle = INK; g.fillRect(0, 0, T, 4); g.fillRect(0, 32, T, 4);
      if (left) g.fillRect(0, 0, 4, 36); else g.fillRect(T - 4, 0, 4, 36);
      S[left ? '[' : ']'] = c;
    }
    return S;
  }
  Art.init = function () {
    for (const th of Object.keys(THEMES)) cache[th] = tileSet(th);
  };

  function drawTiles(ctx, g, f) {
    const L = g.level, S = cache[L.theme], tiles = g.tiles;
    const c0 = Math.max(0, Math.floor(g.camX / T) - 1), c1 = Math.min(g.cols - 1, c0 + 17);
    const bumpOf = {};
    for (const b of g.bumps) bumpOf[b.c + ',' + b.r] = -Math.sin(b.t / 12 * Math.PI) * 20;
    const qf = 'Q' + ((f >> 3) % 4);
    for (let r = 0; r < AP.ROWS; r++) {
      const row = tiles[r];
      for (let c = c0; c <= c1; c++) {
        const ch = row[c];
        if (ch === '.' || ch === 'X') continue;
        const x = c * T, y = r * T + (bumpOf[c + ',' + r] || 0);
        switch (ch) {
          case 'G': {
            const top = r === 0 || tiles[r - 1][c] !== 'G';
            ctx.drawImage(top ? S.G_top : S.G_fill, x, y);
            ctx.fillStyle = INK;
            if (c > 0 && row[c - 1] !== 'G') ctx.fillRect(x, y, 3.5, T);
            if (c < g.cols - 1 && row[c + 1] !== 'G') ctx.fillRect(x + T - 3.5, y, 3.5, T);
            break;
          }
          case 'W': ctx.drawImage(S.W, x, y); break;
          case '?': case 'M': case 'N': ctx.drawImage(S[qf], x, y); break;
          case 'U': case 'S': case 'B': case '[': case ']': case '{': case '}': ctx.drawImage(S[ch], x, y); break;
          case 'o': Art.coin(ctx, x + 36, y + 36, f + c * 7); break;
          case '~': {
            ctx.fillStyle = '#E8480F'; ctx.fillRect(x, y + 20, T, T - 20);
            ctx.beginPath(); ctx.moveTo(x, y + T);
            for (let i = 0; i <= 12; i++) { const xx = x + i * 6; ctx.lineTo(xx, y + 18 + Math.sin(xx * 0.09 + f * 0.12) * 5); }
            ctx.lineTo(x + T, y + T); ctx.closePath(); ctx.fillStyle = '#FF7A1A'; ctx.fill();
            ctx.beginPath();
            for (let i = 0; i <= 12; i++) { const xx = x + i * 6; ctx.lineTo(xx, y + 18 + Math.sin(xx * 0.09 + f * 0.12) * 5); }
            ctx.strokeStyle = '#FFD45A'; ctx.lineWidth = 5; ctx.stroke();
            const bp = (f * 0.7 + c * 23) % 60;
            if (bp < 30) { circle(ctx, x + 20 + (c * 17) % 34, y + 40 - bp * 0.8, 5 + bp * 0.1); ctx.fillStyle = '#FFB347'; ctx.fill(); }
            break;
          }
          case 'L': ctx.fillStyle = '#C93A0C'; ctx.fillRect(x, y, T, T); break;
        }
      }
    }
  }

  /* --------------------------------------------------- backgrounds */
  function cloud(ctx, x, y, s, fill, line, face) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const blobs = [[-60, 10, 34], [-22, -12, 44], [26, -6, 40], [62, 12, 30], [0, 18, 36]];
    ctx.beginPath(); for (const [bx, by, br] of blobs) { ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, Math.PI * 2); }
    ctx.strokeStyle = line; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = fill; ctx.fill();
    if (face) {
      ctx.strokeStyle = line; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(-14, 4, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(14, 4, 6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 12, 7, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.fillStyle = 'rgba(255,150,170,0.5)'; circle(ctx, -26, 14, 6); ctx.fill(); circle(ctx, 26, 14, 6); ctx.fill();
    }
    ctx.restore();
  }
  function layer(cam, p, spacing, fn) {
    const off = cam * p;
    const i0 = Math.floor((off - 400) / spacing), i1 = Math.floor((off + 1080 + 400) / spacing);
    for (let i = i0; i <= i1; i++) fn(i, i * spacing - off);
  }
  function hills(ctx, cam, p, spacing, base, h, fill, line, seed) {
    layer(cam, p, spacing, (i, x) => {
      const w = spacing * (0.7 + hash(i, seed) * 0.6), hh = h * (0.6 + hash(i, seed + 1) * 0.5);
      const cx = x + hash(i, seed + 2) * spacing * 0.4;
      ctx.beginPath(); ctx.moveTo(cx - w / 2, base);
      ctx.bezierCurveTo(cx - w / 2, base - hh * 1.2, cx + w / 2, base - hh * 1.2, cx + w / 2, base);
      paint(ctx, fill, line, 5);
    });
  }
  function tree(ctx, x, base, s, crown, line, trunk) {
    ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
    rr(ctx, -9, -70, 18, 72, 6); paint(ctx, trunk, line, 4);
    ctx.beginPath(); ctx.moveTo(-50, -90); ctx.arc(-26, -96, 34, 0, Math.PI * 2); ctx.moveTo(60, -96); ctx.arc(26, -96, 34, 0, Math.PI * 2); ctx.moveTo(40, -130); ctx.arc(0, -130, 40, 0, Math.PI * 2);
    ctx.strokeStyle = line; ctx.lineWidth = 8; ctx.stroke(); ctx.fillStyle = crown; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; circle(ctx, -12, -144, 12); ctx.fill();
    ctx.restore();
  }
  function background(ctx, theme, cam, f) {
    const W = 1080, H = 1080;
    if (theme === 'field') {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#4FB9F0'); gr.addColorStop(1, '#C9F0FF');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      layer(cam, 0.1, 520, (i, x) => cloud(ctx, x + hash(i, 3) * 200, 120 + hash(i, 4) * 220, 0.8 + hash(i, 5) * 0.5, '#FFFFFF', '#A9D9F2', i % 3 === 0));
      hills(ctx, cam, 0.25, 520, 936, 340, '#A6DE7A', '#6BAA48', 10);
      hills(ctx, cam, 0.45, 380, 936, 200, '#7CCB5C', '#4C9A3A', 20);
      layer(cam, 0.45, 300, (i, x) => { if (hash(i, 31) > 0.45) tree(ctx, x + hash(i, 32) * 120, 936, 0.75 + hash(i, 33) * 0.35, '#5DBB4A', '#2F6B2A', '#8A5A32'); });
    } else if (theme === 'sunset') {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#FF7C68'); gr.addColorStop(0.55, '#FFB27A'); gr.addColorStop(1, '#FFE39A');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      const sx = 760 - cam * 0.03;
      const sg = ctx.createRadialGradient(sx, 640, 60, sx, 640, 300); sg.addColorStop(0, 'rgba(255,250,210,0.9)'); sg.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 300, W, 700);
      circle(ctx, sx, 640, 120); ctx.fillStyle = '#FFF0B0'; ctx.fill();
      layer(cam, 0.1, 560, (i, x) => cloud(ctx, x + hash(i, 6) * 220, 110 + hash(i, 7) * 200, 0.7 + hash(i, 8) * 0.5, '#FFD5C2', '#E88B74', i % 4 === 1));
      hills(ctx, cam, 0.25, 520, 936, 330, '#B4709A', '#7B3F63', 40);
      hills(ctx, cam, 0.45, 360, 936, 190, '#7E5E86', '#4E3456', 50);
      layer(cam, 0.6, 210, (i, x) => tree(ctx, x + hash(i, 61) * 80, 936, 0.8 + hash(i, 62) * 0.45, '#4F7F4A', '#26401F', '#5A3A2A'));
    } else {
      const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#140D24'); gr.addColorStop(1, '#3A1E4D');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const x = ((hash(i, 70) * 2400 - cam * 0.04) % 1200 + 1200) % 1200 - 60, y = hash(i, 71) * 520;
        ctx.fillStyle = `rgba(255,255,230,${0.35 + 0.35 * Math.sin(f * 0.05 + i)})`; ctx.fillRect(x, y, 3, 3);
      }
      circle(ctx, 840 - cam * 0.03, 200, 64); ctx.fillStyle = '#FFF4C2'; ctx.fill();
      circle(ctx, 820 - cam * 0.03, 186, 12); ctx.fillStyle = '#EADFA8'; ctx.fill();
      circle(ctx, 862 - cam * 0.03, 220, 9); ctx.fill();
      layer(cam, 0.2, 420, (i, x) => {
        const h = 260 + hash(i, 72) * 200, w = 150 + hash(i, 73) * 80;
        ctx.fillStyle = '#24173A';
        ctx.fillRect(x, 936 - h, w, h);
        for (let k = 0; k < 4; k++) ctx.fillRect(x + k * (w / 3.5), 936 - h - 26, w / 7, 28);
        ctx.fillStyle = '#FFD36B';
        for (let k = 0; k < 3; k++) if (hash(i * 3 + k, 74) > 0.4) { rr(ctx, x + 24 + k * 44, 936 - h + 60 + (k % 2) * 50, 18, 28, 9); ctx.fill(); }
      });
      layer(cam, 0.6, 340, (i, x) => {
        ctx.fillStyle = '#2E2240'; ctx.fillRect(x, 0, 340, 1080);
        ctx.strokeStyle = '#3B2C52'; ctx.lineWidth = 3;
        for (let r = 0; r < 16; r++) { ctx.beginPath(); ctx.moveTo(x, r * 68); ctx.lineTo(x + 340, r * 68); ctx.stroke(); }
        for (let r = 0; r < 16; r++) for (let k = 0; k < 3; k++) { const bx = x + k * 120 + (r % 2) * 60; ctx.beginPath(); ctx.moveTo(bx, r * 68); ctx.lineTo(bx, r * 68 + 68); ctx.stroke(); }
        const tx = x + 170, ty = 560;
        rr(ctx, tx - 10, ty, 20, 50, 4); paint(ctx, '#5A4A3A', INK, 3);
        const fl = Math.sin(f * 0.4 + i) * 4;
        const fg = ctx.createRadialGradient(tx, ty - 20, 5, tx, ty - 20, 110); fg.addColorStop(0, 'rgba(255,170,60,0.45)'); fg.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = fg; ctx.fillRect(tx - 120, ty - 140, 240, 240);
        ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.quadraticCurveTo(tx - 18, ty - 26, tx + fl, ty - 46); ctx.quadraticCurveTo(tx + 18, ty - 26, tx + 14, ty); ctx.closePath();
        paint(ctx, '#FF9A2A', '#C2410C', 3);
        ctx.beginPath(); ctx.moveTo(tx - 6, ty); ctx.quadraticCurveTo(tx - 8, ty - 14, tx + fl * 0.5, ty - 26); ctx.quadraticCurveTo(tx + 8, ty - 14, tx + 6, ty); ctx.closePath();
        ctx.fillStyle = '#FFE36B'; ctx.fill();
      });
      const lg = ctx.createLinearGradient(0, 760, 0, 1080); lg.addColorStop(0, 'rgba(255,90,20,0)'); lg.addColorStop(1, 'rgba(255,90,20,0.35)');
      ctx.fillStyle = lg; ctx.fillRect(0, 760, W, 320);
    }
  }
  Art.background = background;

  function bushes(ctx, g) {
    const L = g.level;
    if (L.theme === 'castle') return;
    const c0 = Math.floor(g.camX / T) - 4, c1 = c0 + 22;
    for (let c = c0; c <= c1; c++) {
      if (c < 0 || c % 7 !== 0 || hash(c, 90) < 0.35) continue;
      if (g.tileAt(c, AP.GT) !== 'G' || g.tileAt(c, AP.GT - 1) !== '.') continue;
      const x = c * T + 20, y = AP.GT * T, s = 0.7 + hash(c, 91) * 0.5;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.arc(-34, -18, 26, Math.PI, Math.PI * 1.9); ctx.arc(0, -30, 32, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(36, -16, 26, Math.PI * 1.1, 0); ctx.closePath();
      paint(ctx, L.theme === 'sunset' ? '#4E9A45' : '#5CC24A', L.theme === 'sunset' ? '#26502A' : '#2F7A2A', 5);
      ctx.restore();
    }
  }

  function flagpole(ctx, g, f) {
    const L = g.level, x = L.flagC * T + T / 2, top = 3 * T, base = (AP.GT - 1) * T;
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, base);
    ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.stroke(); ctx.strokeStyle = '#E9F7E4'; ctx.lineWidth = 5; ctx.stroke();
    circle(ctx, x, top - 10, 14); paint(ctx, C.gold, INK, 3.5);
    const fy = g.flagY, wave = Math.sin(f * 0.15) * 5;
    ctx.beginPath(); ctx.moveTo(x - 4, fy);
    ctx.quadraticCurveTo(x - 60, fy + 8 + wave, x - 112, fy + 40 + wave);
    ctx.quadraticCurveTo(x - 60, fy + 60 - wave, x - 4, fy + 80); ctx.closePath();
    paint(ctx, '#E2342B', INK, 3.5);
    smiley(ctx, x - 44, fy + 40, 17);
  }
  function house(ctx, g, f) {
    const x0 = g.level.houseC * T, gy = AP.GT * T;
    for (let i = 0; i < 4; i++) {
      const t = (f * 0.6 + i * 40) % 160;
      circle(ctx, x0 + 230 + Math.sin(t * 0.05 + i) * 10 + t * 0.15, gy - 360 - t, 14 + t * 0.12);
      ctx.fillStyle = `rgba(255,255,255,${0.85 - t / 190})`; ctx.fill();
    }
    rr(ctx, x0 + 210, gy - 352, 40, 80, 4); paint(ctx, '#C96A3A', INK, 4);
    rr(ctx, x0 + 12, gy - 232, 264, 232, 4); paint(ctx, '#FFF1D6', INK, 4.5);
    ctx.fillStyle = '#C98A52'; ctx.fillRect(x0 + 14, gy - 120, 260, 8);
    ctx.beginPath(); ctx.moveTo(x0 - 16, gy - 226); ctx.lineTo(x0 + 144, gy - 366); ctx.lineTo(x0 + 304, gy - 226); ctx.closePath();
    paint(ctx, '#E0453A', INK, 4.5);
    ctx.strokeStyle = '#B5302A'; ctx.lineWidth = 3;
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0 - 16 + k * 40, gy - 226 - k * 35); ctx.lineTo(x0 + 304 - k * 40, gy - 226 - k * 35); ctx.stroke(); }
    rr(ctx, x0 + 62, gy - 214, 164, 56, 14); paint(ctx, '#FFE08A', INK, 3.5);
    text(ctx, 'パン工場', x0 + 144, gy - 185, 36, { fill: '#8B4513', stroke: null, lw: 0 });
    ctx.beginPath(); ctx.moveTo(x0 + 114, gy); ctx.lineTo(x0 + 114, gy - 96); ctx.arc(x0 + 144, gy - 96, 30, Math.PI, 0); ctx.lineTo(x0 + 174, gy); ctx.closePath();
    paint(ctx, '#8B4E22', INK, 4);
    circle(ctx, x0 + 164, gy - 52, 4.5); ctx.fillStyle = C.gold; ctx.fill();
    for (const wx of [x0 + 62, x0 + 226]) {
      circle(ctx, wx, gy - 72, 26); paint(ctx, '#BFE6FF', INK, 4);
      ellipse(ctx, wx, gy - 70, 14, 9, 0); paint(ctx, C.bread, INK, 2);
    }
  }

  /* --------------------------------------------------------- effects */
  function bubble(ctx, s, x, y, size, fill, line, color, camX) {
    ctx.font = `900 ${size}px ${FONT}`;
    const w = ctx.measureText(s).width + size * 1.1, h = size * 1.7;
    x = Math.max(camX + w / 2 + 8, Math.min(camX + 1080 - w / 2 - 8, x));
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2); paint(ctx, fill, line, 4);
    ctx.beginPath(); ctx.moveTo(x - 12, y + h / 2 - 2); ctx.lineTo(x, y + h / 2 + 18); ctx.lineTo(x + 12, y + h / 2 - 2);
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = line; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillRect(x - 10, y + h / 2 - 5, 20, 5);
    text(ctx, s, x, y + 2, size, { fill: color, stroke: null, lw: 0 });
  }
  function drawEffect(ctx, e, g, camX) {
    const k = e.t / e.life, f = g.frame;
    switch (e.type) {
      case 'score': {
        ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1;
        text(ctx, e.text, e.x, e.y - e.t * 1.3, 30, { fill: '#fff', lw: 7 });
        ctx.globalAlpha = 1; break;
      }
      case 'coin': Art.coin(ctx, e.x, e.y, e.t * 3); break;
      case 'debris': {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
        rr(ctx, -12, -10, 24, 20, 3); paint(ctx, '#D9783A', INK, 3); ctx.restore(); break;
      }
      case 'dust': {
        circle(ctx, e.x, e.y, e.r * (0.6 + k * 0.8)); ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - k)})`; ctx.fill(); break;
      }
      case 'smoke': {
        circle(ctx, e.x, e.y, e.r * (0.6 + k * 1.3)); ctx.fillStyle = e.purple ? `rgba(170,120,210,${0.7 * (1 - k)})` : `rgba(150,150,160,${0.7 * (1 - k)})`; ctx.fill(); break;
      }
      case 'spark': {
        star(ctx, e.x, e.y, 9 * (1 - k * 0.6), 3.5, 4, e.t * 0.2);
        ctx.fillStyle = e.color || `hsl(${(e.hue + e.t * 15) % 360},100%,65%)`; ctx.globalAlpha = 1 - k * k; ctx.fill(); ctx.globalAlpha = 1; break;
      }
      case 'drop': drop(ctx, e.x, e.y, 6); break;
      case 'streak': {
        ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - k)})`; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.sign(e.vx) * e.len, e.y); ctx.stroke(); break;
      }
      case 'boom': {
        const r = e.r * (0.5 + k * 0.7);
        ctx.globalAlpha = 1 - k * 0.8;
        star(ctx, e.x, e.y, r, r * 0.55, 10, e.t * 0.08); paint(ctx, '#FFD23F', '#E2342B', 5);
        star(ctx, e.x, e.y, r * 0.55, r * 0.3, 8, -e.t * 0.1); ctx.fillStyle = '#FFFBE0'; ctx.fill();
        ctx.globalAlpha = 1; break;
      }
      case 'firework': {
        for (let i = 0; i < 26; i++) {
          const a = i / 26 * Math.PI * 2, sp = 6 + (i % 3) * 1.6;
          const d = sp * e.t * (1 - e.t / 160), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d + e.t * e.t * 0.012;
          ctx.globalAlpha = Math.max(0, 1 - k);
          circle(ctx, x, y, 5 - k * 3); ctx.fillStyle = `hsl(${(e.hue + i * 9) % 360},100%,${62 + (i % 2) * 14}%)`; ctx.fill();
        }
        if (e.t < 8) { circle(ctx, e.x, e.y, 30 - e.t * 3); ctx.fillStyle = 'rgba(255,255,230,0.9)'; ctx.fill(); }
        ctx.globalAlpha = 1; break;
      }
      case 'twinkle': {
        const s = e.t < 10 ? e.t / 10 : 1 - Math.max(0, (e.t - 70) / 30);
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.t * 0.06); ctx.scale(s, s);
        star(ctx, 0, 0, 60, 10, 4, 0); ctx.fillStyle = '#FFF6B0'; ctx.fill();
        star(ctx, 0, 0, 30, 8, 4, Math.PI / 4); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.restore(); break;
      }
      case 'text': {
        const pop = e.t < 7 ? 0.4 + e.t / 7 * 0.75 : e.t < 11 ? 1.15 - (e.t - 7) / 4 * 0.15 : 1;
        const fade = e.life - e.t < 10 ? (e.life - e.t) / 10 : 1;
        ctx.save(); ctx.globalAlpha = fade;
        if (e.style === 'punch') {
          ctx.translate(e.x, e.y - e.t * 0.6); ctx.rotate(-0.08); ctx.scale(pop, pop);
          text(ctx, e.text, 0, 0, 50, { fill: '#FFE14D', stroke: '#C2261B', lw: 11, outer: INK, outerW: 6 });
        } else if (e.style === 'speech') {
          ctx.translate(0, -Math.min(e.t, 10) * 1.2);
          bubble(ctx, e.text, e.x, e.y, 32, '#FFFFFF', INK, INK, camX);
        } else if (e.style === 'baikin') {
          const sh = Math.sin(e.t * 0.9) * 2;
          bubble(ctx, e.text, e.x + sh, e.y, e.big ? 58 : 38, '#F3E9FF', '#5E2F8F', '#5E2F8F', camX);
        } else if (e.style === 'big') {
          ctx.translate(e.x, e.y); ctx.scale(pop, pop); ctx.rotate(Math.sin(e.t * 0.2) * 0.04);
          text(ctx, e.text, 0, 0, 104, { fill: '#FFE14D', stroke: '#C2261B', lw: 16, outer: '#fff', outerW: 14 });
        }
        ctx.restore(); break;
      }
    }
  }

  /* --------------------------------------------------------- screens */
  function playerPose(g) {
    const p = g.player;
    if (p.pose) return p.pose;
    if (p.punchT > 0) return 'punch';
    if (!p.onGround) return p.vy < 4 ? 'jump' : 'fall';
    if (Math.abs(p.vx) > 0.4) return 'run';
    return 'stand';
  }
  function drawPlayer(ctx, g) {
    const p = g.player;
    if (!p.visible) return;
    if (p.inv > 0 && (g.frame >> 2) % 2 === 0 && g.mode === 'play') return;
    const k = p.punchT > 0 ? Math.sin((20 - p.punchT) / 20 * Math.PI) : 0;
    if (p.flying && !p.pose) {
      const rot = 0.25 + Math.min(1, Math.abs(p.vx) / AP.PH.FLY_MAX) * 0.95 + Math.max(-0.25, Math.min(0.25, p.vy * 0.025));
      Art.anpanman(ctx, p.cx, p.y + p.h, {
        dir: p.dir, pose: p.punchT > 0 ? 'flypunch' : 'fly', rot, frame: g.frame, genki: p.genki, star: g.star > 0,
        wind: 1.2, punchK: k, alpha: p.alpha, scale: 1.15,
      });
      return;
    }
    const pose = playerPose(g);
    Art.anpanman(ctx, p.cx, p.y + p.h, {
      dir: p.dir, pose, phase: p.walkPhase, frame: g.frame, genki: p.genki, star: g.star > 0,
      wind: Math.min(1, Math.abs(p.vx) / 7 + (p.onGround ? 0 : 0.35)), punchK: k, alpha: p.alpha, scale: 1.15,
    });
  }
  function drawWorld(ctx, g) {
    const f = g.frame, L = g.level;
    background(ctx, L.theme, g.camX, f);
    let sx = 0, sy = 0;
    if (g.shake) { sx = Math.sin(f * 1.7) * g.shake * 0.8; sy = Math.cos(f * 2.3) * g.shake * 0.6; }
    ctx.save(); ctx.translate(-Math.round(g.camX) + sx, sy);
    bushes(ctx, g);
    if (L.houseC != null) house(ctx, g, f);
    if (L.flagC != null) flagpole(ctx, g, f);
    drawTiles(ctx, g, f);
    for (const it of g.items) Art.newFace(ctx, it, f);
    for (const e of g.enemies) Art.kabi(ctx, e, f);
    const b = g.boss;
    if (b && !b.dead) {
      if (b.glove && b.glove.state === 'aim') {
        ellipse(ctx, b.glove.tx, AP.GT * T - 4, 46 + Math.sin(f * 0.6) * 4, 10, 0);
        ctx.fillStyle = 'rgba(200,30,60,0.45)'; ctx.fill();
      }
      for (const bm of b.bombs) Art.bomb(ctx, bm, f);
      Art.boss(ctx, b, f, g.player.cx);
    }
    drawPlayer(ctx, g);
    for (const e of g.effects) if (!e.screen) drawEffect(ctx, e, g, Math.round(g.camX));
    ctx.restore();
    if (b && !b.dead && b.state !== 'enter' && b.state !== 'defeat' && b.state !== 'blasted') {
      rr(ctx, 290, 24, 500, 56, 28); paint(ctx, 'rgba(30,18,50,0.75)', '#fff', 3);
      text(ctx, 'バイキンマン', 410, 53, 28, { fill: '#fff', stroke: null, lw: 0 });
      for (let i = 0; i < b.maxHp; i++) { circle(ctx, 560 + i * 62, 52, 20); paint(ctx, i < b.hp ? '#E2342B' : '#4A3A5E', '#fff', 3); }
    }
    if (g.mode === 'victory') {
      const t = g.modeT, s = t < 12 ? t / 12 : 1;
      ctx.save(); ctx.translate(540, 330); ctx.scale(s, s);
      text(ctx, 'バイキンマンを', 0, -60, 64, { fill: '#fff', lw: 12 });
      text(ctx, 'やっつけた!', 0, 40, 104, { fill: '#FFE14D', stroke: '#C2261B', lw: 16, outer: '#fff', outerW: 14 });
      ctx.restore();
    }
    if (g.mode === 'tally' || g.mode === 'goal') {
      const t = g.modeT, s = Math.min(1, t / 12);
      ctx.save(); ctx.translate(540, 300); ctx.scale(s, s);
      text(ctx, 'ステージクリア!', 0, 0, 92, { fill: '#FFE14D', stroke: '#C2261B', lw: 15, outer: '#fff', outerW: 14 });
      ctx.restore();
    }
  }

  function groundStrip(ctx, theme, off) {
    const S = cache[theme];
    for (let c = -1; c < 17; c++) {
      const x = c * T - (off % T);
      ctx.drawImage(S.G_top, x, 13 * T); ctx.drawImage(S.G_fill, x, 14 * T);
    }
  }
  function drawTitle(ctx, g) {
    const f = g.frame, cam = f * 2;
    background(ctx, 'field', cam, f);
    groundStrip(ctx, 'field', cam);
    for (let i = 0; i < 3; i++) {
      const x = ((i * 380 + f * 1.6) % 1300) - 110;
      Art.kabi(ctx, { x: x - 30, y: 13 * T - 58, w: 60, h: 58, kind: i === 1 ? 'purple' : 'green', state: 'walk', vx: 1, phase: f * 0.22 + i }, f);
    }
    const t = g.modeT;
    const ax = 560 + Math.sin(t * 0.018) * 230, ay = 700 + Math.sin(t * 0.045) * 26;
    if (f % 3 === 0) g.effects.push({ type: 'spark', x: ax - 120, y: ay - 40, vx: -2, vy: 0.4, t: 0, life: 24, color: '#FFF3A0', screen: true });
    Art.anpanman(ctx, ax, ay, { pose: 'fly', rot: 1.2, wind: 1.3, frame: f, scale: 1.6, dir: 1 });
    ctx.save(); ctx.translate(540, 230 + Math.sin(f * 0.05) * 6);
    rr(ctx, -470, -130, 940, 330, 60); paint(ctx, 'rgba(255,255,255,0.0)', null);
    text(ctx, 'スーパー', 0, -78, 72, { fill: '#FFE14D', stroke: '#C2261B', lw: 14, outer: '#fff', outerW: 10 });
    const lg = ctx.createLinearGradient(0, -20, 0, 90); lg.addColorStop(0, '#FF6A4D'); lg.addColorStop(1, '#D8231A');
    text(ctx, 'アンパンマン', 0, 36, 140, { fill: lg, stroke: '#5A1A10', lw: 22, outer: '#fff', outerW: 18 });
    rr(ctx, -300, 118, 600, 70, 35); paint(ctx, '#5E9F86', INK, 5);
    text(ctx, 'かびるんるん だいさくせん', 0, 154, 40, { fill: '#fff', stroke: INK, lw: 8 });
    ctx.restore();
    if (g.titleOut ? (f >> 2) % 2 === 0 : (f >> 5) % 2 === 0 || t < 30) {
      text(ctx, 'PRESS START', 540, 520, 54, { fill: '#fff', stroke: '#C2261B', lw: 11 });
    }
    rr(ctx, 120, 1004, 840, 52, 26); ctx.fillStyle = 'rgba(43,26,18,0.55)'; ctx.fill();
    text(ctx, 'ファンメイド非公式作品 ／ 原作：やなせたかし「アンパンマン」', 540, 1031, 26, { fill: '#fff', stroke: null, lw: 0, weight: 800 });
    if (g.titleOut) { ctx.fillStyle = `rgba(255,255,255,${Math.min(1, g.titleOut / 45)})`; ctx.fillRect(0, 0, 1080, 1080); }
  }
  function drawIntro(ctx, g) {
    const f = g.frame;
    ctx.fillStyle = '#1B1530'; ctx.fillRect(0, 0, 1080, 1080);
    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255,255,230,${0.3 + 0.3 * Math.sin(f * 0.06 + i * 1.7)})`;
      ctx.fillRect(hash(i, 1) * 1080, hash(i, 2) * 1080, 3, 3);
    }
    if (g.mode === 'gameover') { text(ctx, 'GAME OVER', 540, 520, 110, { fill: '#fff', stroke: '#C2261B', lw: 14 }); return; }
    const L = g.level, s = Math.min(1, g.modeT / 14);
    ctx.save(); ctx.translate(540, 360); ctx.scale(s, s);
    text(ctx, 'WORLD ' + L.world, 0, 0, 96, { fill: '#fff', stroke: '#C2261B', lw: 14 });
    text(ctx, L.name, 0, 110, 64, { fill: '#FFE14D', stroke: INK, lw: 12 });
    ctx.restore();
    Art.anpanman(ctx, 450, 700, { pose: 'stand', frame: f, scale: 1.3 });
    text(ctx, '× ' + g.lives, 600, 640, 70, { fill: '#fff', lw: 12 });
    if (g.levelIndex === 0) {
      rr(ctx, 150, 800, 780, 196, 30); paint(ctx, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.35)', 3);
      text(ctx, 'A：ジャンプ　B：アンパンチ', 540, 842, 40, { fill: '#fff', stroke: null, lw: 0 });
      text(ctx, '↑：そらをとぶ（とんだら 十字キーで いどう）', 540, 898, 32, { fill: '#fff', stroke: null, lw: 0 });
      text(ctx, 'かびるんるんを やっつけろ!', 540, 954, 36, { fill: '#FFE14D', stroke: null, lw: 0 });
    } else if (L.theme === 'castle') {
      text(ctx, 'バイキンマンが まっているぞ…!', 540, 880, 42, { fill: '#D9B8FF', stroke: null, lw: 0 });
    }
    if (g.modeT < 12) { ctx.fillStyle = `rgba(0,0,0,${1 - g.modeT / 12})`; ctx.fillRect(0, 0, 1080, 1080); }
  }
  function drawEnding(ctx, g) {
    const f = g.frame, t = g.modeT;
    const gr = ctx.createLinearGradient(0, 0, 0, 1080);
    gr.addColorStop(0, '#5BB8F2'); gr.addColorStop(0.6, '#FFD7A8'); gr.addColorStop(1, '#FFF1CF');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1080, 1080);
    layer(f * 3, 0.5, 480, (i, x) => cloud(ctx, x + hash(i, 9) * 160, 560 + hash(i, 10) * 300, 0.9 + hash(i, 11) * 0.4, '#fff', '#F2C6A0', i % 2 === 0));
    const ax = -200 + ((t * 5) % 1500), ay = 850 + Math.sin(t * 0.05) * 30;
    if (f % 2 === 0) g.effects.push({ type: 'spark', x: ax - 140, y: ay - 60 + Math.sin(f) * 20, vx: -3, vy: 0.5, t: 0, life: 30, color: null, hue: f * 7, screen: true });
    Art.anpanman(ctx, ax, ay, { pose: 'fly', rot: 1.25, wind: 1.3, frame: f, scale: 1.9 });
    const s = t < 16 ? t / 16 : 1 + Math.sin(t * 0.08) * 0.03;
    ctx.save(); ctx.translate(540, 190); ctx.scale(s, s);
    text(ctx, 'おしまい', 0, 0, 132, { fill: '#FFE14D', stroke: '#C2261B', lw: 20, outer: '#fff', outerW: 16 });
    ctx.restore();
    text(ctx, 'THANK YOU FOR PLAYING!', 540, 318, 52, { fill: '#fff', stroke: '#C2261B', lw: 11 });
    if (t > 40) {
      const a = Math.min(1, (t - 40) / 20);
      ctx.save(); ctx.globalAlpha = a;
      rr(ctx, 210, 370, 660, 262, 30); paint(ctx, 'rgba(255,255,255,0.85)', INK, 4);
      const sec = Math.round(g.stats.frames / 60);
      const rows = [['スコア', String(g.score).padStart(6, '0')], ['コイン', String(g.stats.coins)], ['やっつけた かびるんるん', String(g.stats.kabi)],
        ['アンパンチ', g.stats.punch + ' かい'], ['クリアタイム', Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')]];
      rows.forEach(([k, v], i) => {
        text(ctx, k, 250, 406 + i * 48, 31, { fill: INK, stroke: null, lw: 0, align: 'left' });
        text(ctx, v, 830, 406 + i * 48, 34, { fill: '#C2261B', stroke: null, lw: 0, align: 'right' });
      });
      ctx.restore();
    }
    rr(ctx, 120, 1004, 840, 52, 26); ctx.fillStyle = 'rgba(43,26,18,0.55)'; ctx.fill();
    text(ctx, 'ファンメイド非公式作品 ／ 原作：やなせたかし「アンパンマン」', 540, 1031, 26, { fill: '#fff', stroke: null, lw: 0, weight: 800 });
  }

  /* --------------------------------------------------------- HUD + pad */
  function header(ctx, g) {
    ctx.fillStyle = '#E2342B'; ctx.fillRect(0, 0, 1080, 250);
    ctx.fillStyle = '#EA5040';
    for (let y = 0; y < 5; y++) for (let x = 0; x < 19; x++) { circle(ctx, x * 60 + (y % 2) * 30, y * 52 + 10, 9); ctx.fill(); }
    ctx.fillStyle = '#F8C630'; ctx.fillRect(0, 236, 1080, 14);
    ctx.fillStyle = INK; ctx.fillRect(0, 248, 1080, 4);
    text(ctx, 'スーパーアンパンマン', 540, 70, 64, { fill: '#fff', stroke: '#5A1A10', lw: 14 });
    smiley(ctx, 112, 70, 26); smiley(ctx, 968, 70, 26);
    const lab = { fill: '#FFE27A', stroke: '#7A1A12', lw: 6 };
    const val = { fill: '#fff', lw: 9 };
    const show = g.mode !== 'title';
    text(ctx, 'SCORE', 150, 150, 28, lab);
    text(ctx, String(show ? g.score : 0).padStart(6, '0'), 150, 198, 46, val);
    Art.coin(ctx, 372, 186, 0, 18);
    text(ctx, '×' + String(show ? g.coins : 0).padStart(2, '0'), 450, 190, 46, val);
    text(ctx, 'WORLD', 680, 150, 28, lab);
    text(ctx, g.level && show ? g.level.world : '1-1', 680, 198, 46, val);
    text(ctx, 'TIME', 920, 150, 28, lab);
    text(ctx, g.level && show && g.mode !== 'intro' ? String(g.time).padStart(3, '0') : '', 920, 198, 46, val);
  }
  Art.padLayout = {
    dpad: { x: 255, y: 1610 }, A: { x: 875, y: 1555, r: 82 }, B: { x: 670, y: 1665, r: 82 },
    select: { x: 330, y: 1846, w: 120, h: 36 }, start: { x: 480, y: 1846, w: 120, h: 36 },
  };
  function pad(ctx, inp) {
    const Lp = Art.padLayout, y0 = 1330;
    ctx.fillStyle = '#FFF3D9'; ctx.fillRect(0, y0, 1080, 590);
    const sh = ctx.createLinearGradient(0, y0, 0, y0 + 26); sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh; ctx.fillRect(0, y0, 1080, 26);
    rr(ctx, 34, y0 + 40, 1012, 530, 70); paint(ctx, '#FFE6AE', '#C98A4B', 5);
    rr(ctx, 50, y0 + 56, 980, 498, 58); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4; ctx.stroke();
    // speaker
    ctx.fillStyle = '#E2B776';
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { circle(ctx, 470 + i * 28, 1430 + j * 26, 6); ctx.fill(); }
    smiley(ctx, 540, 1530, 30);
    // d-pad
    const d = Lp.dpad;
    circle(ctx, d.x, d.y, 168); paint(ctx, '#F6D697', '#D9A35E', 4);
    const arm = (dx, dy, on) => {
      const w = 88, l = 120;
      const x = d.x + dx * (l / 2 + 2) - w / 2, y = d.y + dy * (l / 2 + 2) - w / 2;
      rr(ctx, x + (on ? 2 : 0), y + (on ? 4 : 0), w, w, 14);
      paint(ctx, on ? '#FFC83A' : '#3A3540', INK, 4);
      ctx.save(); ctx.translate(d.x + dx * 74, d.y + dy * 74 + (on ? 4 : 0)); ctx.rotate(Math.atan2(dy, dx));
      ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -15); ctx.lineTo(-8, 15); ctx.closePath();
      ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.35)'; ctx.fill(); ctx.restore();
    };
    rr(ctx, d.x - 46, d.y - 46, 92, 92, 10); paint(ctx, '#3A3540', null);
    arm(0, -1, inp.up); arm(0, 1, inp.down); arm(-1, 0, inp.left); arm(1, 0, inp.right);
    rr(ctx, d.x - 44, d.y - 44, 88, 88, 6); ctx.fillStyle = '#3A3540'; ctx.fill();
    circle(ctx, d.x, d.y, 18); ctx.fillStyle = '#2A2630'; ctx.fill();
    // buttons
    const btn = (b, label, sub, on) => {
      if (on) { circle(ctx, b.x, b.y + 6, b.r + 16); ctx.fillStyle = 'rgba(255,225,77,0.65)'; ctx.fill(); }
      circle(ctx, b.x, b.y + 9, b.r); ctx.fillStyle = '#9C2A1F'; ctx.fill();
      const oy = on ? 7 : 0;
      circle(ctx, b.x, b.y + oy, b.r); paint(ctx, on ? '#C02A1F' : '#E2342B', INK, 5);
      ellipse(ctx, b.x - 22, b.y - 30 + oy, 26, 14, -0.5); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
      text(ctx, label, b.x, b.y + 4 + oy, 70, { fill: '#fff', stroke: '#7A1A12', lw: 8 });
      text(ctx, sub, b.x, b.y + b.r + 42, 34, { fill: '#8A5A2B', stroke: null, lw: 0 });
    };
    btn(Lp.B, 'B', 'アンパンチ', inp.b);
    btn(Lp.A, 'A', 'ジャンプ', inp.a);
    for (const [k, lbl] of [['select', 'SELECT'], ['start', 'START']]) {
      const b = Lp[k], on = inp[k];
      text(ctx, lbl, b.x, b.y - 38, 24, { fill: '#8A5A2B', stroke: null, lw: 0 });
      rr(ctx, b.x - b.w / 2, b.y - b.h / 2 + (on ? 3 : 0), b.w, b.h, b.h / 2); paint(ctx, on ? '#FFC83A' : '#8C8796', INK, 3.5);
    }
  }

  Art.renderGame = function (ctx, g) {
    ctx.save();
    header(ctx, g);
    const V = AP.VIEW;
    ctx.save(); ctx.beginPath(); ctx.rect(V.x, V.y, V.w, V.h); ctx.clip(); ctx.translate(V.x, V.y);
    switch (g.mode) {
      case 'title': drawTitle(ctx, g); break;
      case 'intro': case 'gameover': drawIntro(ctx, g); break;
      case 'ending': drawEnding(ctx, g); break;
      default: drawWorld(ctx, g);
    }
    for (const e of g.effects) if (e.screen) drawEffect(ctx, e, g, 0);
    if (g.flash) { ctx.fillStyle = `rgba(255,255,255,${g.flash / 12})`; ctx.fillRect(0, 0, V.w, V.h); }
    if (g.mode === 'tally' && g.tallyDone > 80) { ctx.fillStyle = `rgba(0,0,0,${(g.tallyDone - 80) / 20})`; ctx.fillRect(0, 0, V.w, V.h); }
    if (g.mode === 'victory' && g.modeT > 370) { ctx.fillStyle = `rgba(255,255,255,${(g.modeT - 370) / 20})`; ctx.fillRect(0, 0, V.w, V.h); }
    if (g.mode === 'ending' && g.modeT < 20) { ctx.fillStyle = `rgba(255,255,255,${1 - g.modeT / 20})`; ctx.fillRect(0, 0, V.w, V.h); }
    if (g.autoLabel) {
      rr(ctx, 24, 1000, 230, 54, 27); ctx.fillStyle = 'rgba(43,26,18,0.6)'; ctx.fill();
      text(ctx, 'オートプレイ', 139, 1028, 28, { fill: '#fff', stroke: null, lw: 0 });
    }
    ctx.restore();
    ctx.fillStyle = INK; ctx.fillRect(0, V.y + V.h, 1080, 4);
    pad(ctx, g.inp);
    ctx.restore();
  };
})(typeof window !== 'undefined' ? window : globalThis);
