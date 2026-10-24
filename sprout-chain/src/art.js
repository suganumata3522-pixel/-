// Canvas drawing for the sprout characters, the soil field and pop effects.
// All character drawing happens in "cell units": the cell is 1x1, centred on (0,0).
(function (root) {
  const PAL = {
    1: { body: '#ec4a2c', hi: '#ff9a6c', lo: '#a3241a', line: '#5e130c', name: 'あか' },
    2: { body: '#f7c51e', hi: '#fff27e', lo: '#c68904', line: '#6e4a00', name: 'きいろ' },
    3: { body: '#2e86ea', hi: '#86c6ff', lo: '#1949a8', line: '#0b2860', name: 'あお' },
    4: { body: '#8e4fd8', hi: '#cda3ff', lo: '#55249a', line: '#2f1259', name: 'むらさき' },
    5: { body: '#f1efe8', hi: '#ffffff', lo: '#bdb7a8', line: '#635d52', name: 'しろ' },
  };
  const STEM = '#2b5b20';

  function headPath(ctx, w) {
    ctx.beginPath();
    ctx.moveTo(0, -0.36);
    ctx.bezierCurveTo(0.29 * w, -0.36, 0.43 * w, -0.13, 0.43 * w, 0.11);
    ctx.bezierCurveTo(0.43 * w, 0.36, 0.25 * w, 0.44, 0, 0.44);
    ctx.bezierCurveTo(-0.25 * w, 0.44, -0.43 * w, 0.36, -0.43 * w, 0.11);
    ctx.bezierCurveTo(-0.43 * w, -0.13, -0.29 * w, -0.36, 0, -0.36);
    ctx.closePath();
  }

  function leaf(ctx, len) {
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, '#3f8f2a');
    g.addColorStop(1, '#8ad94f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(len * 0.5, -len * 0.18, len * 0.42, -len * 0.72, 0, -len);
    ctx.bezierCurveTo(-len * 0.42, -len * 0.72, -len * 0.5, -len * 0.18, 0, 0);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,70,20,.55)';
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.08);
    ctx.lineTo(0, -len * 0.85);
    ctx.stroke();
  }

  function bud(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, -0.17);
    g.addColorStop(0, '#f7ecd2');
    g.addColorStop(1, '#ff9fc0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -0.17);
    ctx.bezierCurveTo(0.08, -0.1, 0.08, 0, 0, 0.005);
    ctx.bezierCurveTo(-0.08, 0, -0.08, -0.1, 0, -0.17);
    ctx.fill();
    ctx.fillStyle = '#4f9a32';
    ctx.beginPath();
    ctx.ellipse(0, -0.005, 0.045, 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function flower(ctx, t) {
    ctx.save();
    ctx.translate(0, -0.075);
    ctx.rotate(t * 0.4);
    ctx.fillStyle = '#fffaf2';
    ctx.strokeStyle = 'rgba(200,170,190,.6)';
    ctx.lineWidth = 0.012;
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i / 5) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -0.068, 0.045, 0.066, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#ffcc2e';
    ctx.beginPath();
    ctx.arc(0, 0, 0.038, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function stemAndTop(ctx, sway, stage, t) {
    const tipX = 0.03 + sway * 0.9, tipY = -0.45;
    ctx.strokeStyle = STEM;
    ctx.lineWidth = 0.042;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -0.2);
    ctx.quadraticCurveTo(-0.04 + sway * 0.3, -0.33, tipX, tipY);
    ctx.stroke();
    ctx.save();
    ctx.translate(tipX, tipY);
    if (stage === 0) { ctx.rotate(0.8 + sway * 2); leaf(ctx, 0.26); }
    else if (stage === 1) { ctx.rotate(0.35 + sway * 1.5); ctx.scale(0.9, 0.9); bud(ctx); }
    else { ctx.scale(0.85, 0.85); flower(ctx, t); }
    ctx.restore();
  }

  // o: { sx, sy, alpha, time, seed, stage, blink, look, happy, flash, lean }
  function drawSprout(ctx, x, y, s, c, o = {}) {
    const p = PAL[c];
    if (!p) return;
    const t = o.time || 0;
    const w = c === 4 ? 1.07 : c === 5 ? 0.93 : 1;
    ctx.save();
    ctx.translate(x, y + s * 0.44);
    ctx.scale(o.sx || 1, o.sy || 1);
    ctx.translate(0, -s * 0.44);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.scale(s, s);
    if (c === 5) ctx.scale(0.94, 0.94);

    const sway = Math.sin(t * 2.1 + (o.seed || 0)) * 0.05 + (o.lean || 0);
    stemAndTop(ctx, sway, o.stage || 0, t + (o.seed || 0));
    ctx.translate(0, 0.075);
    ctx.scale(1, 0.85);

    // ears of the yellow ones sit behind the head
    if (c === 2) {
      ctx.fillStyle = p.body;
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 0.032;
      ctx.lineJoin = 'round';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(k * 0.26, -0.26);
        ctx.quadraticCurveTo(k * 0.44, -0.4, k * 0.52, -0.44);
        ctx.quadraticCurveTo(k * 0.49, -0.18, k * 0.37, 0.02);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = p.lo;
        ctx.beginPath();
        ctx.moveTo(k * 0.32, -0.21);
        ctx.quadraticCurveTo(k * 0.43, -0.34, k * 0.46, -0.37);
        ctx.quadraticCurveTo(k * 0.44, -0.2, k * 0.37, -0.06);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = p.body;
      }
    }

    // head
    const g = ctx.createRadialGradient(-0.14 * w, -0.18, 0.02, 0, 0.05, 0.62);
    g.addColorStop(0, p.hi);
    g.addColorStop(0.42, p.body);
    g.addColorStop(1, p.lo);
    headPath(ctx, w);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.globalAlpha *= 0.9;
    ctx.lineWidth = 0.034;
    ctx.stroke();
    ctx.globalAlpha /= 0.9;
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ctx.beginPath();
    ctx.ellipse(-0.19 * w, -0.2, 0.08, 0.045, -0.6, 0, Math.PI * 2);
    ctx.fill();

    // purple ones have a few stiff hairs
    if (c === 4) {
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 0.026;
      for (const k of [-1, 0, 1]) {
        ctx.beginPath();
        ctx.moveTo(k * 0.08, -0.33);
        ctx.quadraticCurveTo(k * 0.13, -0.42, k * 0.17 + 0.02, -0.45);
        ctx.stroke();
      }
    }

    // face
    const ey = -0.06, ex = 0.135;
    const blink = Math.min(1, Math.max(0, o.blink || 0));
    if (o.happy) {
      ctx.strokeStyle = '#1b1210';
      ctx.lineWidth = 0.045;
      ctx.lineCap = 'round';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(k * ex, ey + 0.03, 0.065, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,120,140,.55)';
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(k * 0.27 * w, 0.1, 0.06, 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = p.line;
      ctx.lineWidth = 0.03;
      ctx.beginPath();
      ctx.arc(0, 0.13, 0.06, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      const ry = Math.max(0.014, 0.132 * (1 - blink));
      const look = o.look || 0;
      for (const k of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(40,25,20,.55)';
        ctx.lineWidth = 0.02;
        ctx.beginPath();
        ctx.ellipse(k * ex, ey, 0.108, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (blink < 0.7) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(k * ex, ey, 0.108, ry, 0, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = c === 5 ? '#d3202a' : '#15100e';
          ctx.beginPath();
          ctx.arc(k * ex + look * 0.035, ey + 0.012, 0.074, 0, Math.PI * 2);
          ctx.fill();
          if (c === 5) {
            ctx.fillStyle = '#5c0a10';
            ctx.beginPath();
            ctx.arc(k * ex + look * 0.035, ey + 0.012, 0.035, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(k * ex + look * 0.035 - 0.026, ey - 0.024, 0.026, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      if (c === 1 || c === 5) {
        // pointed nose
        ctx.fillStyle = c === 1 ? p.lo : '#d8d2c4';
        ctx.strokeStyle = p.line;
        ctx.lineWidth = 0.022;
        ctx.beginPath();
        ctx.moveTo(-0.045, 0.06);
        ctx.quadraticCurveTo(0, 0.04, 0.045, 0.06);
        ctx.quadraticCurveTo(0.02, 0.15, 0, c === 1 ? 0.22 : 0.17);
        ctx.quadraticCurveTo(-0.02, 0.15, -0.045, 0.06);
        ctx.fill();
        ctx.stroke();
      } else if (c === 3) {
        // the blue ones have a wide mouth
        ctx.fillStyle = '#0c2252';
        ctx.beginPath();
        ctx.moveTo(-0.11, 0.13);
        ctx.quadraticCurveTo(0, 0.2, 0.11, 0.13);
        ctx.quadraticCurveTo(0, 0.25, -0.11, 0.13);
        ctx.fill();
      } else if (c === 4) {
        ctx.strokeStyle = p.line;
        ctx.lineWidth = 0.028;
        ctx.beginPath();
        ctx.arc(0, 0.12, 0.04, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      }
    }

    if (o.flash) {
      headPath(ctx, w);
      ctx.fillStyle = `rgba(255,255,240,${0.75 * o.flash})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // Thick bands between linked neighbours, drawn before the heads so they read as one clump.
  function drawLink(ctx, x1, y1, x2, y2, s, c, alpha) {
    const p = PAL[c];
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.strokeStyle = p.body;
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1 + s * 0.07);
    ctx.lineTo(x2, y2 + s * 0.07);
    ctx.stroke();
    ctx.strokeStyle = p.lo;
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = s * 0.12;
    ctx.beginPath();
    ctx.moveTo(x1, y1 + s * 0.27);
    ctx.lineTo(x2, y2 + s * 0.27);
    ctx.stroke();
    ctx.restore();
  }

  // Pre-rendered soil texture for the playfield.
  function makeSoil(w, h, s, cols, rows) {
    const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
    const ctx = cv.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b2c20');
    g.addColorStop(0.5, '#2c2018');
    g.addColorStop(1, '#1c140e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < (w * h) / 900; i++) {
      const x = r() * w, y = r() * h, rad = (0.4 + r() * 1.6) * s / 60;
      ctx.fillStyle = r() < 0.5 ? 'rgba(255,230,190,.05)' : 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(x, y, rad * (1 + r()), rad, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * w, y = r() * h, rad = (2 + r() * 4) * s / 60;
      ctx.fillStyle = 'rgba(120,100,80,.18)';
      ctx.beginPath();
      ctx.ellipse(x, y, rad * 1.4, rad, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,240,210,.045)';
    ctx.lineWidth = Math.max(1, s / 60);
    for (let x = 1; x < cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * s, 0);
      ctx.lineTo(x * s, h);
      ctx.stroke();
    }
    return cv;
  }

  // The hidden 13th row and the spawn mark (column 3, row 12).
  function drawFieldMarks(ctx, ox, oy, s, rows, deadEmpty) {
    const top = oy + (rows - 13) * s;
    ctx.save();
    const g = ctx.createLinearGradient(0, top, 0, top + s);
    g.addColorStop(0, 'rgba(10,8,6,.55)');
    g.addColorStop(1, 'rgba(10,8,6,.15)');
    ctx.fillStyle = g;
    ctx.fillRect(ox, top, 6 * s, s);
    ctx.setLineDash([s * 0.12, s * 0.1]);
    ctx.strokeStyle = 'rgba(233,243,220,.28)';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath();
    ctx.moveTo(ox, top + s);
    ctx.lineTo(ox + 6 * s, top + s);
    ctx.stroke();
    ctx.setLineDash([]);
    if (deadEmpty) {
      const cx = ox + 2.5 * s, cy = top + 1.5 * s;
      ctx.strokeStyle = 'rgba(255,110,90,.45)';
      ctx.lineWidth = s * 0.08;
      ctx.lineCap = 'round';
      const d = s * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
      ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- particles ----------
  function Particles() { this.list = []; }
  Particles.prototype.burst = function (x, y, s, c, stage, power, rand) {
    const R = rand || Math.random;
    const p = PAL[c];
    const n = 7 + Math.round(power * 3);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, v = s * (2.5 + R() * 4.5) * (1 + power * 0.15);
      this.list.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - s * 2.5, life: 0, max: 0.45 + R() * 0.35, size: s * (0.06 + R() * 0.07), color: R() < 0.7 ? p.body : p.hi });
    }
    this.list.push({ kind: 'leaf', x, y: y - s * 0.4, vx: (R() - 0.5) * s * 3, vy: -s * (3 + R() * 2), life: 0, max: 1.1 + R() * 0.5, size: s * 0.28, rot: R() * 6, vr: (R() - 0.5) * 9, color: stage === 2 ? '#fffaf2' : '#7ccb46' });
    this.list.push({ kind: 'ring', x, y, life: 0, max: 0.38, size: s * 0.45, color: p.hi });
  };
  Particles.prototype.confetti = function (w, h, n, rand) {
    const R = rand || Math.random;
    const colors = ['#ec4a2c', '#f7c51e', '#2e86ea', '#8e4fd8', '#f1efe8', '#7ccb46'];
    for (let i = 0; i < n; i++) {
      this.list.push({ kind: 'conf', x: R() * w, y: -R() * h * 0.4, vx: (R() - 0.5) * w * 0.15, vy: h * (0.12 + R() * 0.2), life: 0, max: 3 + R() * 2.5, size: w * (0.008 + R() * 0.008), rot: R() * 6, vr: (R() - 0.5) * 12, color: colors[(R() * colors.length) | 0] });
    }
  };
  Particles.prototype.update = function (dt, g) {
    for (const q of this.list) {
      q.life += dt;
      if (q.kind === 'spark') { q.vy += g * dt; q.vx *= 0.985; q.x += q.vx * dt; q.y += q.vy * dt; }
      else if (q.kind === 'leaf') { q.vy += g * 0.25 * dt; q.vx *= 0.98; q.x += q.vx * dt + Math.sin(q.life * 6) * q.size * 0.05; q.y += q.vy * dt; q.rot += q.vr * dt; }
      else if (q.kind === 'conf') { q.x += (q.vx + Math.sin(q.life * 3 + q.rot) * q.size * 20) * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
    }
    this.list = this.list.filter(q => q.life < q.max);
  };
  Particles.prototype.draw = function (ctx) {
    for (const q of this.list) {
      const k = 1 - q.life / q.max;
      ctx.save();
      if (q.kind === 'spark') {
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === 'leaf') {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.fillStyle = q.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, q.size * 0.22, q.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (q.kind === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = q.color;
        ctx.lineWidth = q.size * 0.18 * k;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.size * (0.5 + (1 - k) * 1.2), 0, Math.PI * 2);
        ctx.stroke();
      } else if (q.kind === 'conf') {
        ctx.globalAlpha = Math.min(1, k * 3);
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.scale(1, Math.abs(Math.cos(q.life * 5 + q.rot)) + 0.15);
        ctx.fillStyle = q.color;
        ctx.fillRect(-q.size, -q.size * 0.6, q.size * 2, q.size * 1.2);
      }
      ctx.restore();
    }
  };

  // "7れんさ!" popup. age in seconds since the pop.
  function drawChainText(ctx, x, y, n, age, s, fontFamily) {
    const k = Math.min(1, age / 0.16);
    const scale = age < 0.16 ? 0.4 + k * 0.8 : 1.2 - Math.min(0.2, (age - 0.16) * 1.2);
    const alpha = age > 0.9 ? Math.max(0, 1 - (age - 0.9) / 0.35) : 1;
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y - Math.min(age, 0.6) * s * 0.6);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    const big = `${s * 0.95}px ${fontFamily}`, small = `${s * 0.42}px ${fontFamily}`;
    ctx.font = big;
    const nw = ctx.measureText(String(n)).width;
    ctx.font = small;
    const lw = ctx.measureText('れんさ!').width;
    const total = nw + lw + s * 0.06;
    const left = -total / 2;
    ctx.textAlign = 'left';
    ctx.font = big;
    ctx.lineWidth = s * 0.16;
    ctx.strokeStyle = '#2a1608';
    ctx.strokeText(String(n), left, s * 0.3);
    ctx.fillStyle = '#ffd43b';
    ctx.fillText(String(n), left, s * 0.3);
    ctx.font = small;
    ctx.lineWidth = s * 0.12;
    ctx.strokeText('れんさ!', left + nw + s * 0.06, s * 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('れんさ!', left + nw + s * 0.06, s * 0.3);
    ctx.restore();
  }

  root.Art = { PAL, drawSprout, drawLink, makeSoil, drawFieldMarks, Particles, drawChainText, headPath };
})(typeof window !== 'undefined' ? window : globalThis);
