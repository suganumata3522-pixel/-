'use strict';
// 2D の画面表示(スコアボード、選手プレート、照準、実況テロップ、ホームラン演出など)
(function () {
  const HR = window.HR;
  const W = HR.W, H = HR.H;
  const NAVY = '#0b2f73';
  const UI = (w, px) => `${w} ${px}px ${HR.FONT_UI}`;
  const IMP = (px) => `${px}px ${HR.FONT_IMPACT}`;
  const RANK_COLOR = { S: '#ff3fa4', A: '#ff4d6d', B: '#ff8a2b', C: '#f2c200', D: '#8bd600', E: '#2fc06a', F: '#3aa0ff', G: '#9aa3ad' };

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function vgrad(g, y0, y1, stops) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
    return gr;
  }
  // 縁取り文字。strokes は外側から順に [太さ, 色]
  function txt(g, s, x, y, o) {
    g.font = o.font;
    g.textAlign = o.align || 'left';
    g.textBaseline = o.base || 'alphabetic';
    g.lineJoin = 'round';
    g.miterLimit = 2;
    if (o.strokes) for (const [w, c] of o.strokes) { g.lineWidth = w; g.strokeStyle = c; g.strokeText(s, x, y); }
    g.fillStyle = o.fill || '#fff';
    g.fillText(s, x, y);
  }
  function fitFont(g, s, maxW, weight, px, min, impact) {
    let p = px;
    for (; p > min; p -= 2) {
      g.font = impact ? IMP(p) : UI(weight, p);
      if (g.measureText(s).width <= maxW) break;
    }
    return impact ? IMP(p) : UI(weight, p);
  }

  // 変化しない部品は画像としてキャッシュして使い回す(スマホでの負荷軽減)
  const cache = new Map();
  function cached(g, key, x, y, w, h, fn) {
    let c = cache.get(key);
    if (!c) {
      if (cache.size > 160) cache.clear();
      c = document.createElement('canvas');
      c.width = Math.ceil(w);
      c.height = Math.ceil(h);
      const cg = c.getContext('2d');
      cg.translate(-x, -y);
      fn(cg);
      cache.set(key, c);
    }
    g.drawImage(c, x, y);
  }

  // ---------------- スコアボード ----------------
  function board(g, x, y, w, h, title, rows) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 14;
    g.shadowOffsetY = 6;
    rr(g, x, y, w, h, 26);
    g.fillStyle = NAVY;
    g.fill();
    g.restore();
    g.save();
    rr(g, x + 6, y + 6, w - 12, h - 12, 21);
    g.fillStyle = vgrad(g, y, y + h, ['#8fe0ff', '#4cb2f2', '#2a86dc']);
    g.fill();
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = -2; i < 8; i++) {
      g.beginPath();
      const sx = x + i * 90;
      g.moveTo(sx, y + h); g.lineTo(sx + 40, y + h); g.lineTo(sx + 40 + h * 0.6, y); g.lineTo(sx + h * 0.6, y);
      g.fill();
    }
    g.restore();
    rr(g, x + 6, y + 6, w - 12, h - 12, 21);
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.stroke();
    txt(g, title, x + w / 2, y + 66, {
      font: fitFont(g, title, w - 40, 900, 44, 30), align: 'center',
      fill: vgrad(g, y + 30, y + 66, ['#ffffff', '#9ff0ff', '#4fd6ff']), strokes: [[13, NAVY], [5, '#ffffff']],
    });
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.fillRect(x + 22, y + 84, w - 44, 3);
    rows.forEach(([label, value, unit], i) => {
      const yy = y + 140 + i * 56;
      txt(g, label, x + 26, yy, { font: UI(900, 40), strokes: [[10, NAVY]] });
      txt(g, String(value), x + w - 74, yy + 2, { font: UI(900, 54), align: 'right', strokes: [[11, NAVY]] });
      txt(g, unit, x + w - 24, yy, { font: UI(900, 36), align: 'right', strokes: [[9, NAVY]] });
    });
  }

  function pill(g, x, y, balls) {
    const w = 360, h = 92;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.3)';
    g.shadowBlur = 10;
    g.shadowOffsetY = 4;
    rr(g, x, y, w, h, 20);
    g.fillStyle = NAVY;
    g.fill();
    g.restore();
    rr(g, x + 5, y + 5, w - 10, h - 10, 16);
    g.fillStyle = vgrad(g, y, y + h, ['#fff9b0', '#ffe34d', '#f5b800']);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    txt(g, 'のこり', x + 28, y + 64, { font: UI(900, 44), fill: '#1d6be0', strokes: [[10, '#ffffff']] });
    txt(g, String(balls), x + 262, y + 70, { font: UI(900, 64), align: 'right', fill: '#ffffff', strokes: [[12, '#1d4fb8']] });
    txt(g, '球', x + 278, y + 64, { font: UI(900, 44), fill: '#ffffff', strokes: [[10, '#1d4fb8']] });
  }

  function pitchInfo(g, x, y, info, a) {
    g.save();
    g.globalAlpha = a;
    const w = 470, h = 92;
    rr(g, x, y, w, h, 18);
    g.fillStyle = 'rgba(9,24,60,0.85)';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#7fd0ff';
    g.stroke();
    txt(g, info.name, x + 24, y + 62, { font: fitFont(g, info.name, 250, 900, 42, 28), fill: '#ffffff', strokes: [[8, '#000a2a']] });
    txt(g, `${info.kmh}`, x + w - 112, y + 66, { font: UI(900, 56), align: 'right', fill: '#ffe14d', strokes: [[9, '#000a2a']] });
    txt(g, 'km/h', x + w - 20, y + 64, { font: UI(900, 34), align: 'right', fill: '#ffffff', strokes: [[7, '#000a2a']] });
    g.restore();
  }

  function condFace(g, x, y, r) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = vgrad(g, y - r, y + r, ['#fff176', '#ffcc1a']);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#a86a00';
    g.stroke();
    g.fillStyle = '#4a2c00';
    g.beginPath(); g.ellipse(x - r * 0.33, y - r * 0.18, r * 0.11, r * 0.18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(x + r * 0.33, y - r * 0.18, r * 0.11, r * 0.18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath();
    g.arc(x, y + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
    g.lineWidth = 3.5;
    g.strokeStyle = '#4a2c00';
    g.stroke();
  }

  function badge(g, x, y, s, colors) {
    rr(g, x, y, 62, 62, 12);
    g.fillStyle = vgrad(g, y, y + 62, colors);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    txt(g, s, x + 31, y + 47, { font: UI(900, 42), align: 'center', fill: '#ffffff', strokes: [[6, 'rgba(0,0,0,0.35)']] });
  }

  function rankText(g, label, rank, x, y) {
    txt(g, label, x, y, { font: UI(900, 32), strokes: [[7, '#071a40']] });
    g.font = UI(900, 32);
    const w = g.measureText(label).width;
    txt(g, rank, x + w + 8, y + 4, { font: `italic ${UI(900, 50)}`, fill: RANK_COLOR[rank] || '#fff', strokes: [[10, '#ffffff'], [5, '#071a40']] });
    g.font = `italic ${UI(900, 50)}`;
    return w + 8 + g.measureText(rank).width + 22;
  }

  function trajArrow(g, x, y) {
    g.save();
    g.translate(x, y);
    g.rotate(-0.75);
    g.fillStyle = '#ff3b3b';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(-18, -7); g.lineTo(6, -7); g.lineTo(6, -17); g.lineTo(24, 0); g.lineTo(6, 17); g.lineTo(6, 7); g.lineTo(-18, 7);
    g.closePath();
    g.stroke();
    g.fill();
    g.restore();
  }

  function playerPlate(g, x, y, p) {
    const w = 640, h = 148;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 12;
    g.shadowOffsetY = 5;
    rr(g, x, y, w, h, 22);
    g.fillStyle = vgrad(g, y, y + h, ['rgba(36,86,170,0.94)', 'rgba(14,40,96,0.94)']);
    g.fill();
    g.restore();
    rr(g, x, y, w, h, 22);
    g.lineWidth = 4;
    g.strokeStyle = '#86d6ff';
    g.stroke();
    // 名前
    const nw = 360;
    rr(g, x + 18, y + 12, nw, 64, 14);
    g.fillStyle = vgrad(g, y + 12, y + 76, p.nameColors);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    txt(g, p.name, x + 18 + nw / 2, y + 60, { font: fitFont(g, p.name, nw - 30, 900, 46, 28), align: 'center', fill: '#ffffff', strokes: [[8, 'rgba(0,0,0,0.38)']] });
    condFace(g, x + nw + 64, y + 44, 28);
    badge(g, x + nw + 108, y + 13, p.badge, p.badgeColors);
    // 能力
    let cx = x + 24;
    const ry = y + 126;
    for (const item of p.stats) {
      if (item.speed) {
        txt(g, item.speed, cx, ry, { font: UI(900, 40), strokes: [[8, '#071a40']] });
        g.font = UI(900, 40);
        cx += g.measureText(item.speed).width + 20;
      } else if (item.arrow) {
        txt(g, '弾道', cx, ry, { font: UI(900, 32), strokes: [[7, '#071a40']] });
        g.font = UI(900, 32);
        trajArrow(g, cx + g.measureText('弾道').width + 26, ry - 12);
        cx += g.measureText('弾道').width + 66;
      } else {
        cx += rankText(g, item.label, item.rank, cx, ry);
      }
    }
  }

  function swingTag(g, x, y, power) {
    const s = power ? '強振' : 'ミート打ち';
    g.font = UI(900, 38);
    const w = g.measureText(s).width + 40;
    rr(g, x, y, w, 60, 14);
    g.fillStyle = vgrad(g, y, y + 60, power ? ['#ff9a6b', '#e2471f'] : ['#7fd7ff', '#2a86dc']);
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ffffff';
    g.stroke();
    txt(g, s, x + w / 2, y + 44, { font: UI(900, 38), align: 'center', fill: '#ffffff', strokes: [[7, 'rgba(0,0,0,0.35)']] });
  }

  // ---------------- 照準 ----------------
  function drawZone(g, zone) {
    g.beginPath();
    zone.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = '#ff3fd2';
    g.stroke();
  }
  function drawCursor(g, c, power, flash) {
    const path = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    path(c.outer);
    g.fillStyle = power ? 'rgba(255,120,60,0.16)' : 'rgba(255,236,90,0.16)';
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(30,20,0,0.55)';
    g.stroke();
    g.lineWidth = 5;
    g.strokeStyle = flash ? '#ffffff' : power ? '#ff8a3a' : '#ffe13b';
    g.stroke();
    path(c.inner);
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255,240,150,0.85)';
    g.stroke();
    const [x, y] = c.center;
    g.lineWidth = 3;
    g.strokeStyle = '#1b1300';
    g.beginPath();
    g.moveTo(x - 26, y); g.lineTo(x + 26, y);
    g.moveTo(x, y - 26); g.lineTo(x, y + 26);
    g.stroke();
    g.beginPath();
    g.arc(x, y, 13, 0, Math.PI * 2);
    g.lineWidth = 8;
    g.strokeStyle = '#1b1300';
    g.stroke();
    g.lineWidth = 4;
    g.strokeStyle = '#ffe13b';
    g.stroke();
  }

  // ---------------- テロップ・演出 ----------------
  function caption(g, cap, now) {
    if (!cap || !cap.text) return;
    const age = now - cap.t0;
    const n = Math.min(cap.text.length, Math.floor(age * 34) + 1);
    const s = cap.text.slice(0, n);
    const x = 30, y = 556, w = W - 60, h = 100;
    const a = HR.clamp(age * 6, 0, 1);
    g.save();
    g.globalAlpha = a;
    cached(g, 'capbox', x - 4, y - 4, w + 8, h + 8, (cg) => {
      rr(cg, x, y, w, h, 20);
      cg.fillStyle = 'rgba(8,18,46,0.8)';
      cg.fill();
      cg.lineWidth = 3;
      cg.strokeStyle = 'rgba(134,214,255,0.8)';
      cg.stroke();
      rr(cg, x + 14, y + 22, 92, 56, 12);
      cg.fillStyle = vgrad(cg, y + 22, y + 78, ['#ff6b6b', '#d92332']);
      cg.fill();
      txt(cg, '実況', x + 60, y + 63, { font: UI(900, 32), align: 'center', fill: '#fff' });
    });
    const f = fitFont(g, cap.text, w - 150, 900, 46, 30);
    txt(g, s, x + 124, y + 66, { font: f, fill: '#ffffff', strokes: [[8, '#000a2a']] });
    g.restore();
  }

  function sunburst(g, x, y, r, rot, alpha, colors) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    g.rotate(rot);
    const n = 18;
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[i % 2];
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, r, (i / n) * Math.PI * 2, ((i + 0.5) / n) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, r);
    rg.addColorStop(0, 'rgba(255,255,220,0.9)');
    rg.addColorStop(0.35, 'rgba(255,240,150,0.35)');
    rg.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function impactText(g, s, x, y, px, scale, rot, fills, strokes) {
    const key = `imp|${s}|${px}|${fills.join()}|${strokes.map((a) => a.join(':')).join()}`;
    let c = cache.get(key);
    if (!c) {
      const f = fitFont(g, s, W - 70, 900, px, 40, true);
      g.font = f;
      const sw = strokes.length ? strokes[0][0] : 0;
      const cw = Math.ceil(g.measureText(s).width + sw + 24), ch = Math.ceil(px * 1.5 + sw + 24);
      c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const cg = c.getContext('2d');
      txt(cg, s, cw / 2, ch / 2, { font: f, align: 'center', base: 'middle', fill: vgrad(cg, ch / 2 - px * 0.5, ch / 2 + px * 0.5, fills), strokes });
      cache.set(key, c);
    }
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(scale, scale);
    g.drawImage(c, -c.width / 2, -c.height / 2);
    g.restore();
  }

  const BANNERS = {
    hr: { text: 'ホームラン!', px: 150, fills: ['#fffbd0', '#ffe14a', '#ff9d00', '#ff5a00'], strokes: [[34, '#5a0d00'], [20, '#ffffff'], [8, '#e0301e']] },
    hit: { text: 'ヒット!', px: 130, fills: ['#e6fbff', '#7fdcff', '#1e8bff'], strokes: [[28, '#06225e'], [16, '#ffffff'], [6, '#1e5bd6']] },
    wall: { text: 'フェンス直撃!', px: 110, fills: ['#e6fbff', '#7fdcff', '#1e8bff'], strokes: [[26, '#06225e'], [14, '#ffffff'], [6, '#1e5bd6']] },
    foul: { text: 'ファウル', px: 116, fills: ['#ffffff', '#e2e8ef', '#9aa8b8'], strokes: [[24, '#1b2433'], [12, '#ffffff']] },
    out: { text: 'アウト', px: 116, fills: ['#ffffff', '#e2e8ef', '#9aa8b8'], strokes: [[24, '#1b2433'], [12, '#ffffff']] },
    whiff: { text: '空振り', px: 120, fills: ['#ffffff', '#cfe3ff', '#7aa7e0'], strokes: [[24, '#0d2244'], [12, '#ffffff']] },
    look: { text: '見逃し', px: 120, fills: ['#ffffff', '#cfe3ff', '#7aa7e0'], strokes: [[24, '#0d2244'], [12, '#ffffff']] },
    play: { text: 'プレイボール!', px: 112, fills: ['#fffbd0', '#ffe14a', '#ffb000'], strokes: [[26, '#5a2a00'], [14, '#ffffff']] },
  };

  function banner(g, b, now) {
    const def = BANNERS[b.kind];
    if (!def) return;
    const age = now - b.t0;
    const y = b.kind === 'hr' ? 840 : 800;
    if (b.kind === 'hr') {
      sunburst(g, W / 2, y, 620, age * 0.6, HR.clamp(age * 4, 0, 1) * 0.55, ['rgba(255,214,60,0.55)', 'rgba(255,150,40,0.25)']);
    }
    const sc = b.kind === 'hr' ? HR.lerp(2.4, 1, HR.easeOutBack(age / 0.38)) : HR.lerp(0.4, 1, HR.easeOutBack(age / 0.25));
    const wob = b.kind === 'hr' ? Math.sin(age * 9) * 0.015 * Math.max(0, 1 - age) : 0;
    g.save();
    g.globalAlpha = HR.clamp(age * 8, 0, 1);
    impactText(g, def.text, W / 2, y, def.px, sc + wob, -0.06, def.fills, def.strokes);
    g.restore();
    if (b.kind === 'hr' && b.dist && age > 0.45) {
      const a = HR.clamp((age - 0.45) * 5, 0, 1);
      distPlate(g, W / 2, y + 150, b.dist, a);
    }
  }

  function distPlate(g, cx, y, dist, a) {
    g.save();
    g.globalAlpha = a;
    const w = 520, h = 104, x = cx - w / 2;
    rr(g, x, y, w, h, 22);
    g.fillStyle = 'rgba(9,24,60,0.88)';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#ffe14d';
    g.stroke();
    txt(g, '飛距離', x + 34, y + 70, { font: UI(900, 44), fill: '#ffffff', strokes: [[8, '#000a2a']] });
    txt(g, String(dist), x + w - 96, y + 80, { font: UI(900, 76), align: 'right', fill: '#ffe14d', strokes: [[10, '#000a2a']] });
    txt(g, 'm', x + w - 36, y + 72, { font: UI(900, 48), align: 'right', fill: '#ffffff', strokes: [[8, '#000a2a']] });
    g.restore();
  }

  function logo(g, cx, cy, age, showSub) {
    sunburst(g, cx, cy + 20, 560, age * 0.4, 0.5 * HR.clamp(age * 3, 0, 1), ['rgba(255,214,60,0.5)', 'rgba(255,120,40,0.2)']);
    const sc = HR.lerp(1.8, 1, HR.easeOutBack(age / 0.4));
    g.save();
    g.globalAlpha = HR.clamp(age * 6, 0, 1);
    txt(g, 'ジャムおじさんの', cx, cy - 110, { font: UI(900, 62), align: 'center', fill: '#ffffff', strokes: [[16, NAVY], [6, '#4cb2f2']] });
    impactText(g, 'ホームラン競争', cx, cy + 20, 132, sc, -0.05, ['#fffbd0', '#ffe14a', '#ff9d00', '#ff5a00'], [[34, '#5a0d00'], [20, '#ffffff'], [8, '#e0301e']]);
    if (showSub) txt(g, 'in パン工場スタジアム', cx, cy + 150, { font: UI(900, 48), align: 'center', fill: '#ffe680', strokes: [[12, NAVY]] });
    g.restore();
  }

  function introCard(g, role, name, chips, age, colors) {
    const slide = HR.easeOutCubic(age / 0.3);
    const x = HR.lerp(-700, 40, slide), y = 1250;
    g.save();
    g.globalAlpha = HR.clamp(age * 5, 0, 1);
    g.save();
    g.transform(1, 0, -0.12, 1, 0, 0);
    rr(g, x + 150, y, 820, 230, 24);
    g.fillStyle = 'rgba(9,24,60,0.9)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = colors[0];
    g.stroke();
    g.restore();
    txt(g, role, x + 60, y + 62, { font: UI(900, 44), fill: colors[0], strokes: [[8, '#000a2a']] });
    txt(g, name, x + 60, y + 150, { font: fitFont(g, name, 760, 900, 92, 50), fill: '#ffffff', strokes: [[16, '#000a2a'], [6, colors[1]]] });
    let cx = x + 64;
    for (const [label, rank] of chips) cx += rankText(g, label, rank, cx, y + 210);
    g.restore();
  }

  function bubble(g, x, y, s, age) {
    const sc = HR.easeOutBack(age / 0.25);
    if (sc <= 0) return;
    g.save();
    g.translate(x, y);
    g.scale(sc, sc);
    g.font = fitFont(g, s, 760, 900, 64, 40);
    const tw = g.measureText(s).width;
    const w = tw + 80, h = 130;
    rr(g, -w / 2, -h / 2, w, h, 60);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 7;
    g.strokeStyle = '#1b2433';
    g.stroke();
    g.beginPath();
    g.moveTo(60, h / 2 - 6); g.lineTo(130, h / 2 + 70); g.lineTo(120, h / 2 - 6);
    g.fillStyle = '#ffffff';
    g.fill();
    g.stroke();
    g.fillRect(56, h / 2 - 14, 70, 12);
    txt(g, s, 0, 22, { font: g.font, align: 'center', fill: '#e0301e' });
    g.restore();
  }

  function finishPanel(g, f, now, live) {
    const age = now - f.t0;
    const a = HR.clamp(age * 3, 0, 1);
    g.save();
    g.globalAlpha = a;
    g.fillStyle = 'rgba(4,10,30,0.22)';
    g.fillRect(0, 0, W, H);
    const x = 80, y = 300 + (1 - HR.easeOutCubic(age / 0.5)) * 80, w = W - 160, h = 980;
    rr(g, x, y, w, h, 36);
    g.fillStyle = NAVY;
    g.fill();
    rr(g, x + 8, y + 8, w - 16, h - 16, 30);
    g.fillStyle = vgrad(g, y, y + h, ['#8fe0ff', '#4cb2f2', '#2a86dc']);
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#ffffff';
    g.stroke();
    impactText(g, '結果発表', W / 2, y + 100, 110, 1, 0, ['#fffbd0', '#ffe14a', '#ff9d00'], [[26, '#5a0d00'], [14, '#ffffff']]);
    const rows = [
      ['ホームラン', f.stats.hr, '本', 96],
      ['ヒット', f.stats.hit, '本', 64],
      ['最長飛距離', f.stats.longest, 'm', 64],
      ['スコア', f.stats.score, '点', 64],
    ];
    let yy = y + 270;
    rows.forEach(([label, v, unit, px], i) => {
      const show = HR.clamp((age - 0.4 - i * 0.25) * 6, 0, 1);
      if (show <= 0) return;
      g.save();
      g.globalAlpha = a * show;
      txt(g, label, x + 60, yy, { font: UI(900, px === 96 ? 64 : 52), strokes: [[12, NAVY]] });
      txt(g, String(v), x + w - 130, yy + (px === 96 ? 10 : 4), { font: UI(900, px), align: 'right', fill: px === 96 ? '#ffe14d' : '#ffffff', strokes: [[14, NAVY]] });
      txt(g, unit, x + w - 56, yy, { font: UI(900, 50), align: 'right', strokes: [[11, NAVY]] });
      g.restore();
      yy += i === 0 ? 130 : 105;
    });
    const showRank = HR.clamp((age - 1.6) * 4, 0, 1);
    if (showRank > 0) {
      g.save();
      g.globalAlpha = a * showRank;
      rr(g, x + 50, y + 720, w - 100, 150, 24);
      g.fillStyle = 'rgba(9,24,60,0.85)';
      g.fill();
      txt(g, '称号', x + 90, y + 770, { font: UI(900, 38), fill: '#ffe680' });
      txt(g, f.rank, W / 2, y + 840, { font: fitFont(g, f.rank, w - 160, 900, 70, 40), align: 'center', fill: '#ffffff', strokes: [[12, '#000a2a'], [5, '#ff3fa4']] });
      g.restore();
    }
    if (f.newRecord && age > 2.0) {
      const s = 1 + Math.sin(age * 8) * 0.05;
      impactText(g, 'NEW RECORD!', W / 2, y + h + 70, 90, s, -0.05, ['#fffbd0', '#ff7ad1', '#ff2f8e'], [[22, '#4a0030'], [10, '#ffffff']]);
    }
    if (live && age > 2.2 && Math.floor(age * 2) % 2 === 0) {
      txt(g, 'タップでもう一度', W / 2, 1520, { font: UI(900, 56), align: 'center', fill: '#ffffff', strokes: [[14, NAVY]] });
    }
    g.restore();
  }

  function titleScreen(g, age) {
    g.fillStyle = vgrad(g, 0, H, ['rgba(4,10,30,0.55)', 'rgba(4,10,30,0.05)', 'rgba(4,10,30,0.05)', 'rgba(4,10,30,0.7)']);
    g.fillRect(0, 0, W, H);
    logo(g, W / 2, 520, age, true);
    if (Math.floor(age * 2) % 2 === 0) {
      txt(g, 'タップでスタート', W / 2, 1180, { font: UI(900, 64), align: 'center', fill: '#ffffff', strokes: [[16, NAVY], [6, '#4cb2f2']] });
    }
    const lines = [
      ['スマホ', '指でドラッグして照準 → はなすと打つ'],
      ['PC', 'マウスで照準 → クリックで打つ'],
      ['', 'Xキー / ボタンで 強振・ミート打ち切替'],
    ];
    const y0 = 1440;
    rr(g, 60, y0 - 70, W - 120, 300, 26);
    g.fillStyle = 'rgba(9,24,60,0.82)';
    g.fill();
    lines.forEach(([k, v], i) => {
      if (k) txt(g, k, 100, y0 + i * 80, { font: UI(900, 36), fill: '#ffe14d' });
      txt(g, v, 260, y0 + i * 80, { font: fitFont(g, v, W - 360, 800, 38, 26), fill: '#ffffff' });
    });
    txt(g, '※ 非公式のファンメイド作品です', W / 2, 1830, { font: UI(800, 30), align: 'center', fill: 'rgba(255,255,255,0.8)', strokes: [[6, 'rgba(4,10,30,0.6)']] });
  }

  // ---------------- パーティクル(花火・紙吹雪) ----------------
  const parts = [];
  const rnd = HR.makeRng(777);
  function burst(x, y) {
    const hue = Math.floor(rnd() * 360);
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2, sp = 380 + rnd() * 260;
      parts.push({ type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.3 + rnd() * 0.4, age: 0, color: `hsl(${(hue + rnd() * 40) % 360},100%,${60 + rnd() * 20}%)` });
    }
  }
  function confetti(n) {
    const cols = ['#ff4d6d', '#ffd23f', '#3ad0ff', '#7bea5b', '#ff8ad6', '#ffffff', '#ff9d2b'];
    for (let i = 0; i < n; i++) {
      parts.push({ type: 'paper', x: rnd() * W, y: -40 - rnd() * 500, vx: (rnd() - 0.5) * 120, vy: 260 + rnd() * 240, rot: rnd() * 6, vr: (rnd() - 0.5) * 10, life: 4.5, age: 0, w: 18 + rnd() * 14, h: 10 + rnd() * 8, color: cols[Math.floor(rnd() * cols.length)] });
    }
  }
  function drawParts(g, dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age > p.life) { parts.splice(i, 1); continue; }
      if (p.type === 'spark') {
        p.vx *= 1 - 1.6 * dt; p.vy = p.vy * (1 - 1.6 * dt) + 260 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = 1 - p.age / p.life;
        g.globalAlpha = a;
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, 7 * a + 2, 0, Math.PI * 2);
        g.fill();
      } else {
        p.x += (p.vx + Math.sin(p.age * 3 + p.rot) * 60) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        g.globalAlpha = HR.clamp((p.life - p.age) * 2, 0, 1);
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.scale(1, Math.cos(p.age * 7 + p.rot));
        g.fillStyle = p.color;
        g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }

  function plates(g) {
    playerPlate(g, 24, 1506, {
      name: 'バタコ', nameColors: ['#ff8a8a', '#e8313f'], badge: '投', badgeColors: ['#ff8ab8', '#e8337a'],
      stats: [{ speed: '120km/h' }, { label: 'コントロール', rank: 'S' }, { label: 'スタミナ', rank: 'B' }],
    });
    playerPlate(g, 24, 1666, {
      name: 'ジャムおじさん', nameColors: ['#7cf08f', '#1fae4a'], badge: '打', badgeColors: ['#c9a0ff', '#8b4ee8'],
      stats: [{ arrow: true }, { label: 'ミート', rank: 'C' }, { label: 'パワー', rank: 'S' }, { label: '走力', rank: 'E' }],
    });
  }

  // ---------------- まとめて描画 ----------------
  function draw(g, s) {
    const now = s.now;
    if (s.zone) drawZone(g, s.zone);
    if (s.cursor) drawCursor(g, s.cursor, s.power, s.cursorFlash);

    if (s.title) { titleScreen(g, now - s.title.t0); drawParts(g, s.dt); return; }

    if (s.showBoards) {
      const rowsOf = (o) => [['ヒット', o.hit, '本'], ['ホームラン', o.hr, '本'], ['最長飛距離', o.longest, 'm'], ['スコア', o.score, '点']];
      const cur = rowsOf(s.stats), best = rowsOf(s.best);
      cached(g, 'b1|' + cur.join(), 0, 66, 540, 404, (cg) => board(cg, 24, 96, 504, 342, 'いまの打者の記録', cur));
      cached(g, 'b2|' + best.join(), 540, 66, 540, 404, (cg) => board(cg, 552, 96, 504, 342, 'これまでの最高記録', best));
      cached(g, 'pill|' + s.balls, 0, 430, 410, 140, (cg) => pill(cg, 24, 452, s.balls));
      if (s.pitchInfo) {
        const pi = s.pitchInfo;
        g.save();
        g.globalAlpha = HR.clamp((now - pi.t0) * 6, 0, 1);
        cached(g, `pi|${pi.name}|${pi.kmh}`, 576, 442, 490, 112, (cg) => pitchInfo(cg, 586, 452, pi, 1));
        g.restore();
      }
    }
    if (s.caption) caption(g, s.caption, now);
    if (s.showPlates) {
      cached(g, 'tag|' + s.power, 0, 1426, 400, 80, (cg) => swingTag(cg, 24, 1436, s.power));
      cached(g, 'plates', 0, 1480, 700, 380, plates);
    }
    if (s.intro) {
      const age = now - s.intro.t0;
      if (s.intro.stage === 'title') logo(g, W / 2, 900, age, true);
      if (s.intro.stage === 'pitcher') introCard(g, 'PITCHER', 'バタコさん', [['コントロール', 'S'], ['スタミナ', 'B']], age, ['#ff8ab8', '#e8337a']);
      if (s.intro.stage === 'batter') introCard(g, 'BATTER', 'ジャムおじさん', [['パワー', 'S'], ['ミート', 'C'], ['走力', 'E']], age, ['#7cf08f', '#1fae4a']);
    }
    if (s.banner) banner(g, s.banner, now);
    if (s.cutin) {
      const age = now - s.cutin.t0;
      bubble(g, 470, 600, s.cutin.bubble, age - 0.1);
      if (s.cutin.dist) distPlate(g, W / 2, 1180, s.cutin.dist, HR.clamp(age * 5, 0, 1));
    }
    drawParts(g, s.dt);
    if (s.finish) finishPanel(g, s.finish, now, s.live);
    if (s.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${s.flash})`;
      g.fillRect(0, 0, W, H);
    }
  }

  HR.HUD = { draw, burst, confetti, clearParticles: () => { parts.length = 0; } };
})();
