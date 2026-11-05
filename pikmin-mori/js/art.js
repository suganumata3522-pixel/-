/* あつまれ ピクミンの森 — all drawing (canvas paths, no image files). */
(function (G) {
  'use strict';
  const PM = G.PM = G.PM || {};
  const Art = PM.Art = {};
  const T = PM.T, TER = PM.TER;
  const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Hiragino Sans", "IPAGothic", sans-serif';
  Art.FONT = FONT;
  const INK = '#5B4632';
  const PIK = {
    red: { body: '#E8432E', dark: '#A82A1C' },
    yellow: { body: '#F6C927', dark: '#B88C0E' },
    blue: { body: '#3E7FE0', dark: '#21509C' },
  };
  const ROOF = { red: '#E2554A', yellow: '#F2B93B', blue: '#4F86D9' };

  /* ---------------------------------------------------------- helpers */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
  const ellipse = (ctx, x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); };
  function paint(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 3; ctx.lineJoin = 'round'; ctx.stroke(); }
  }
  function text(ctx, s, x, y, size, o) {
    o = o || {};
    ctx.font = `${o.weight || 900} ${size}px ${FONT}`;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || size * 0.2; ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.fill || INK; ctx.fillText(s, x, y);
  }
  const shadow = (ctx, x, y, rx, ry, a) => { ellipse(ctx, x, y, rx, ry, 0); ctx.fillStyle = `rgba(40,60,30,${a == null ? 0.18 : a})`; ctx.fill(); };
  function star5(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
    ctx.closePath();
  }
  function leafShape(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.8, -s * 0.5, 0, -s * 1.5); ctx.quadraticCurveTo(-s * 0.8, -s * 0.5, 0, 0); ctx.closePath();
    paint(ctx, '#6CC24F', '#3E8A30', 2);
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, -s * 1.2); ctx.strokeStyle = '#3E8A30'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }
  Art.text = text;

  /* ---------------------------------------------------------- terrain */
  let ground = null, shore = [];
  function mk(w, h) { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function landish(t) { return t !== TER.SEA; }
  function drawGround(g) {
    const C = PM.COLS, R = PM.ROWS, ter = g.ter;
    if (!ground) ground = mk(C * T, R * T);
    const ctx = ground.getContext('2d');
    ctx.clearRect(0, 0, C * T, R * T);
    // light shallow water ring around the island
    ctx.fillStyle = '#7FD6EE';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (landish(ter[r][c])) { rr(ctx, c * T - 30, r * T - 30, T + 60, T + 60, 46); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (landish(ter[r][c])) { rr(ctx, c * T - 12, r * T - 12, T + 24, T + 24, 30); ctx.fill(); }
    // sand
    ctx.fillStyle = '#F4E4B4';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (landish(ter[r][c])) { rr(ctx, c * T - 6, r * T - 6, T + 12, T + 12, 24); ctx.fill(); }
    ctx.fillStyle = '#E9D59C';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (ter[r][c] !== TER.SAND) continue;
      for (let k = 0; k < 3; k++) { circle(ctx, c * T + PM.hash(c, r, k) * T, r * T + PM.hash(r, c, k + 5) * T, 2.4); ctx.fill(); }
    }
    // grass (rounded so the beach edge is soft)
    const grassy = (t) => t === TER.GRASS || t === TER.PATH || t === TER.WATER || t === TER.BRIDGE;
    ctx.fillStyle = '#86CD5E';
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (grassy(ter[r][c])) { rr(ctx, c * T - 5, r * T - 5, T + 10, T + 10, 22); ctx.fill(); }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (!grassy(ter[r][c])) continue;
      if (PM.hash(c, r, 40) > 0.6) { circle(ctx, c * T + PM.hash(c, r, 41) * T, r * T + PM.hash(c, r, 42) * T, 18 + PM.hash(c, r, 43) * 16); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); }
      ctx.strokeStyle = '#6DB64C'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
      for (let k = 0; k < 2; k++) {
        const x = c * T + 10 + PM.hash(c, r, 20 + k) * (T - 20), y = r * T + 12 + PM.hash(r, c, 30 + k) * (T - 20);
        ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x, y); ctx.lineTo(x + 4, y - 5); ctx.stroke();
      }
    }
    // river
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const t = ter[r][c];
      if (t !== TER.WATER && t !== TER.BRIDGE) continue;
      ctx.fillStyle = '#7BB7A0'; rr(ctx, c * T - 4, r * T - 4, T + 8, T + 8, 20); ctx.fill();
    }
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      const t = ter[r][c];
      if (t !== TER.WATER && t !== TER.BRIDGE) continue;
      ctx.fillStyle = '#5CC6E8'; rr(ctx, c * T + 1, r * T + 1, T - 2, T - 2, 16); ctx.fill();
      ctx.fillRect(c * T + 12, r * T, T - 24, T); ctx.fillRect(c * T, r * T + 12, T, T - 24);
    }
    // stone paths
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (ter[r][c] === TER.PATH) pathTile(ctx, c, r);
    shore = [];
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) {
      if (!landish(ter[r][c])) continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ter[r + dr][c + dc] === TER.SEA) shore.push({ x: (c + 0.5 + dc * 0.75) * T, y: (r + 0.5 + dr * 0.75) * T, k: PM.hash(c, r, 9) });
    }
    g.pathDirty = false;
  }
  function pathTile(ctx, c, r) {
    ctx.fillStyle = '#B9D88F'; ctx.fillRect(c * T, r * T, T, T);
    for (let k = 0; k < 4; k++) {
      const x = c * T + (k % 2) * 32 + 4 + PM.hash(c, r, k) * 4, y = r * T + Math.floor(k / 2) * 32 + 4 + PM.hash(r, c, k) * 4;
      rr(ctx, x, y, 26, 24, 9); paint(ctx, '#E8DCC0', '#C4B28E', 2);
    }
  }
  Art.init = function (g) { drawGround(g); };

  function drawSea(ctx, g, f) {
    const V = PM.VIEW;
    const gr = ctx.createLinearGradient(0, 0, 0, V.h);
    gr.addColorStop(0, '#46B7E2'); gr.addColorStop(1, '#3AA6D6');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, V.w, V.h);
  }
  function seaWaves(ctx, g, f, bounds) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const step = 150;
    for (let y = Math.floor(bounds.y0 / step) * step; y < bounds.y1; y += step) {
      for (let x = Math.floor(bounds.x0 / step) * step; x < bounds.x1; x += step) {
        const k = PM.hash(x, y, 4), ph = (f * 0.03 + k * 6) % (Math.PI * 2);
        const a = Math.sin(ph);
        if (a < 0.2) continue;
        const cx = x + k * 90, cy = y + PM.hash(y, x, 2) * 90;
        if (g.terAt(cx, cy) !== TER.SEA) continue;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(cx, cy, 16, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    // foam pulsing along the shore
    for (const s of shore) {
      if (s.x < bounds.x0 - 40 || s.x > bounds.x1 + 40 || s.y < bounds.y0 - 40 || s.y > bounds.y1 + 40) continue;
      const a = 0.25 + 0.3 * Math.sin(f * 0.05 + s.k * 6);
      circle(ctx, s.x, s.y, 9 + 4 * Math.sin(f * 0.05 + s.k * 6)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    }
  }
  function riverShimmer(ctx, g, f, bounds) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let r = Math.max(0, Math.floor(bounds.y0 / T)); r < Math.min(PM.ROWS, bounds.y1 / T + 1); r++) {
      for (let c = Math.max(0, Math.floor(bounds.x0 / T)); c < Math.min(PM.COLS, bounds.x1 / T + 1); c++) {
        if (g.ter[r][c] !== TER.WATER) continue;
        const k = PM.hash(c, r, 7), y = r * T + ((f * 0.6 + k * T) % T);
        ctx.beginPath(); ctx.moveTo(c * T + 14 + k * 20, y); ctx.lineTo(c * T + 26 + k * 20, y); ctx.stroke();
      }
    }
  }

  /* ---------------------------------------------------------- nature */
  function canopy(ctx, blobs, light, dark, hi) {
    ctx.beginPath(); for (const [x, y, r] of blobs) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.stroke(); ctx.fillStyle = light; ctx.fill();
    ctx.fillStyle = hi;
    for (const [x, y, r] of blobs) { circle(ctx, x - r * 0.3, y - r * 0.35, r * 0.42); ctx.fill(); }
  }
  function drawTree(ctx, o, f) {
    const shake = o.workers.length ? Math.sin(f * 0.9) * 2 : 0;
    if (o.state === 'stump') {
      shadow(ctx, o.x, o.y, 22, 8);
      rr(ctx, o.x - 14, o.y - 18, 28, 20, 6); paint(ctx, '#9C6B3F', '#6E4A2A', 2.5);
      ellipse(ctx, o.x, o.y - 18, 14, 6, 0); paint(ctx, '#D9A86C', '#6E4A2A', 2.5);
      ellipse(ctx, o.x, o.y - 18, 6, 2.5, 0); ctx.strokeStyle = '#B9874F'; ctx.lineWidth = 1.5; ctx.stroke();
      return;
    }
    ctx.save(); ctx.translate(o.x + shake, o.y);
    if (o.state === 'falling') { const k = Math.min(1, o.t / 34); ctx.rotate(k * k * 1.45 * (PM.hash(o.x, o.y, 1) > 0.5 ? 1 : -1)); ctx.globalAlpha = 1 - Math.max(0, k - 0.75) * 4; }
    else shadow(ctx, 0, 0, 44, 15);
    rr(ctx, -10, -50, 20, 52, 8); paint(ctx, '#A2703F', '#6E4A2A', 2.5);
    const B = [[0, -112, 46], [-32, -88, 34], [32, -88, 34], [0, -78, 40]];
    canopy(ctx, B, '#5DB84A', '#3C8A33', '#77CF5C');
    if (o.kind === 'fruit' && o.state === 'ready') {
      for (const [x, y] of [[-26, -96], [18, -116], [30, -84], [-4, -82], [-14, -122]]) {
        circle(ctx, x, y, 8); paint(ctx, o.fruit === 'peach' ? '#F7A595' : '#E8432E', '#8E2A1E', 2);
        circle(ctx, x - 2.5, y - 2.5, 2.5); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
      }
    }
    ctx.restore();
  }
  function drawPalm(ctx, o, f) {
    shadow(ctx, o.x + 20, o.y, 40, 12);
    ctx.save(); ctx.translate(o.x, o.y);
    const sway = Math.sin(f * 0.03 + o.x) * 3;
    for (let i = 0; i < 7; i++) {
      const y = -i * 18, x = i * i * 0.9 + sway * i / 7;
      rr(ctx, x - 9, y - 20, 18, 22, 6); paint(ctx, i % 2 ? '#C4945E' : '#B5854F', '#7A5534', 2);
    }
    const tx = 44 + sway, ty = -130;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.62;
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, -18, 78, 10); ctx.quadraticCurveTo(40, 4, 0, 0); paint(ctx, '#58B046', '#357A2C', 2.5);
      ctx.restore();
    }
    for (const dx of [-8, 6]) { circle(ctx, tx + dx, ty + 8, 8); paint(ctx, '#8A5A2E', '#5A3A1E', 2); }
    ctx.restore();
  }
  function drawRock(ctx, o) {
    const cracked = o.state === 'cracked';
    const s = cracked ? 0.72 : 1, sh = o.workers.length ? Math.sin(o.t * 1.3) * 1.5 : 0;
    shadow(ctx, o.x, o.y, 40 * s, 13 * s);
    ctx.save(); ctx.translate(o.x + sh, o.y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-40, 0); ctx.bezierCurveTo(-46, -30, -22, -58, 4, -56); ctx.bezierCurveTo(32, -54, 46, -26, 40, 0); ctx.closePath();
    paint(ctx, '#A9A8B4', '#6D6C7A', 3);
    ctx.beginPath(); ctx.moveTo(-22, -30); ctx.bezierCurveTo(-18, -46, 0, -52, 14, -48); ctx.bezierCurveTo(2, -40, -8, -34, -22, -30); ctx.fillStyle = '#CBCAD4'; ctx.fill();
    if (cracked || o.progress > o.need * 0.4) {
      ctx.beginPath(); ctx.moveTo(6, -54); ctx.lineTo(0, -36); ctx.lineTo(10, -24); ctx.lineTo(2, -8);
      ctx.strokeStyle = '#5E5D6A'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    ctx.restore();
  }
  function drawWeed(ctx, o, f) {
    const w = o.workers.length ? Math.sin(f * 1.2) * 0.2 : 0;
    ctx.save(); ctx.translate(o.x, o.y);
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + w;
      ctx.save(); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-3, -16, 0, -24 + Math.abs(i - 2) * 4); ctx.quadraticCurveTo(3, -16, 4, 0); ctx.closePath();
      paint(ctx, i % 2 ? '#5CA845' : '#6DBC50', '#3F7F2F', 2);
      ctx.restore();
    }
    ctx.restore();
  }
  const FLOWER = ['#F25C6A', '#FFD54A', '#FFFFFF', '#F59BD0', '#B48CF2'];
  function flowerHead(ctx, x, y, col, r) {
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(90,60,40,0.5)'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8); ctx.fill(); ctx.stroke(); }
    circle(ctx, x, y, r * 0.6); ctx.fillStyle = '#F6B93B'; ctx.fill();
  }
  function drawFlower(ctx, o, f) {
    const col = FLOWER[o.hue % FLOWER.length];
    for (const [dx, dy] of [[-12, 2], [10, -2], [0, 8]]) {
      ctx.beginPath(); ctx.moveTo(o.x + dx, o.y + dy); ctx.lineTo(o.x + dx, o.y + dy - 14); ctx.strokeStyle = '#4E9A3A'; ctx.lineWidth = 2.5; ctx.stroke();
      flowerHead(ctx, o.x + dx, o.y + dy - 16 + Math.sin(f * 0.05 + dx) * 1.2, col, 5);
    }
  }
  const PELLET = ['#E8432E', '#F6C927', '#3E7FE0'];
  function pelletDisc(ctx, x, y, col, r) {
    circle(ctx, x, y, r); paint(ctx, col, 'rgba(0,0,0,0.35)', 2.5);
    circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.35); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
    text(ctx, '1', x, y + 1, r * 1.2, { fill: '#fff', stroke: 'rgba(0,0,0,0.3)', lw: 3 });
  }
  function drawPosy(ctx, o, f) {
    const col = PELLET[Math.floor(PM.hash(o.x, o.y, 3) * 3)];
    const sw = Math.sin(f * 0.05 + o.x) * 2 + (o.workers.length ? Math.sin(f * 0.8) * 3 : 0);
    shadow(ctx, o.x, o.y, 20, 7);
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.quadraticCurveTo(o.x - 6, o.y - 30, o.x + sw, o.y - 56); ctx.strokeStyle = '#4E9A3A'; ctx.lineWidth = 4; ctx.stroke();
    leafShape(ctx, o.x - 2, o.y - 14, 12, -1.1); leafShape(ctx, o.x + 2, o.y - 22, 12, 1.0);
    if (o.state === 'ready') {
      ctx.fillStyle = col;
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ellipse(ctx, o.x + sw + Math.cos(a) * 18, o.y - 60 + Math.sin(a) * 18, 9, 6, a); paint(ctx, '#FFFFFF', 'rgba(0,0,0,0.2)', 1.5); }
      pelletDisc(ctx, o.x + sw, o.y - 60, col, 14);
    } else { circle(ctx, o.x + sw, o.y - 58, 6); paint(ctx, '#7FBF5A', '#4E9A3A', 2); }
  }

  /* ---------------------------------------------------------- characters */
  Art.pikmin = function (ctx, p, f, o) {
    o = o || {};
    if (p.hidden) return;
    const col = PIK[p.color], x = p.x, y = p.y, z = p.z || 0, dir = p.dir || 1;
    if (p.state === 'seed') {
      shadow(ctx, x, y, 6, 2.5, 0.2);
      circle(ctx, x, y - z - 6, 6); paint(ctx, '#FFF7C2', '#C9A43A', 2);
      return;
    }
    if (p.state === 'sprout') {
      ellipse(ctx, x, y, 12, 4.5, 0); ctx.fillStyle = '#8B6A43'; ctx.fill();
      const w = Math.sin(p.anim * 2) * 0.25;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(w) * 14, y - 14); ctx.strokeStyle = '#5A3E2A'; ctx.lineWidth = 2.5; ctx.stroke();
      leafShape(ctx, x + Math.sin(w) * 14, y - 14, 9, w);
      if ((f + p.id * 13) % 90 < 12) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 12, y - 30, 6, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    shadow(ctx, x, y, 10 * Math.max(0.4, 1 - z / 200), 3.5, 0.22);
    ctx.save(); ctx.translate(x, y - z);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (p.state === 'thrown') ctx.rotate(p.anim * dir);
    const walk = p.state === 'follow' || p.state === 'return' || p.state === 'carry' || o.walk;
    const leg = walk ? Math.sin(p.anim * 2.2) * 3 : 0;
    ctx.strokeStyle = col.dark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-3, -6); ctx.lineTo(-3 - leg, 0); ctx.moveTo(3, -6); ctx.lineTo(3 + leg, 0); ctx.stroke();
    const bob = walk ? Math.abs(Math.sin(p.anim * 2.2)) * 1.5 : 0;
    ctx.translate(0, -bob);
    // arms
    let arm = 0;
    if (p.state === 'work') arm = Math.sin(p.anim * 3) * 1.2 - 0.6;
    if (p.state === 'carry') arm = -1.4;
    ctx.beginPath();
    ctx.moveTo(-5, -16); ctx.lineTo(-5 - Math.cos(arm) * 7, -16 + Math.sin(arm) * 8);
    ctx.moveTo(5, -16); ctx.lineTo(5 + Math.cos(arm) * 7, -16 + Math.sin(arm) * 8);
    ctx.strokeStyle = col.dark; ctx.lineWidth = 2.5; ctx.stroke();
    ellipse(ctx, 0, -14, 6.5, 9, 0); paint(ctx, col.body, col.dark, 2);
    if (p.color === 'yellow') { for (const s of [-1, 1]) { ellipse(ctx, s * 11, -33, 6, 4, s * 0.5); paint(ctx, col.body, col.dark, 2); } }
    circle(ctx, 0, -30, 10); paint(ctx, col.body, col.dark, 2);
    if (p.color === 'red') { ctx.beginPath(); ctx.moveTo(dir * 7, -31); ctx.lineTo(dir * 15, -28); ctx.lineTo(dir * 7, -26); ctx.closePath(); paint(ctx, col.body, col.dark, 1.8); }
    if (p.color === 'blue') { ctx.beginPath(); ctx.arc(dir * 2, -24, 4, 0.1, Math.PI - 0.1); ctx.strokeStyle = '#BFD6FF'; ctx.lineWidth = 1.6; ctx.stroke(); }
    for (const s of [-1, 1]) {
      circle(ctx, s * 3.8 + dir * 1.5, -32, 3.4); ctx.fillStyle = '#fff'; ctx.fill();
      circle(ctx, s * 3.8 + dir * 2.4, -32, 1.7); ctx.fillStyle = '#222'; ctx.fill();
    }
    // stem + leaf / bud / flower
    const sw = Math.sin(p.anim * 0.7) * 3;
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(-dir * 3, -50, sw - dir * 2, -58); ctx.strokeStyle = '#5A3E2A'; ctx.lineWidth = 2; ctx.stroke();
    const st = p.stage || 0, tx = sw - dir * 2, ty = -58;
    if (st === 0) leafShape(ctx, tx, ty, 9, sw * 0.08);
    else if (st === 1) { circle(ctx, tx, ty - 4, 4.5); paint(ctx, p.color === 'blue' ? '#F7D6F0' : '#FFFFFF', '#B9A0A0', 1.5); }
    else flowerHead(ctx, tx, ty - 5, p.color === 'blue' ? '#F7C8EC' : '#FFFFFF', 4);
    if (o.hat) hat(ctx, o.hat, dir);
    ctx.restore();
  };
  function hat(ctx, kind, dir) {
    if (kind === 'ribbon') { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(dir * 6, -38); ctx.lineTo(dir * 6 + s * 8, -44); ctx.lineTo(dir * 6 + s * 8, -34); ctx.closePath(); paint(ctx, '#F25C8A', '#A8325A', 1.5); } circle(ctx, dir * 6, -39, 2.5); ctx.fillStyle = '#F25C8A'; ctx.fill(); }
    else if (kind === 'cap') { ctx.beginPath(); ctx.arc(0, -35, 10, Math.PI, 0); ctx.closePath(); paint(ctx, '#3FA9F5', '#1F6FAF', 1.6); ellipse(ctx, dir * 9, -35, 7, 2.5, 0); paint(ctx, '#3FA9F5', '#1F6FAF', 1.4); }
    else { flowerHead(ctx, -dir * 7, -38, '#FFD54A', 3.2); }
  }

  Art.olimar = function (ctx, o, f) {
    if (!o.visible) return;
    const x = o.x, y = o.y, dir = o.dir;
    shadow(ctx, x, y, 22, 7, 0.22);
    if (o.whistleT > 0) {
      const k = 1 - o.whistleT / 30;
      ellipse(ctx, x, y - 10, 60 + k * 220, (60 + k * 220) * 0.55, 0);
      ctx.strokeStyle = `rgba(255,170,40,${1 - k})`; ctx.lineWidth = 6; ctx.stroke();
    }
    ctx.save(); ctx.translate(x, y);
    const step = o.moving ? Math.sin(o.anim * 1.6) : 0;
    const crouch = o.pluckT > 0 ? 8 : 0;
    ctx.translate(0, crouch - Math.abs(step) * 2);
    for (const s of [-1, 1]) { ellipse(ctx, s * 8 + (s === 1 ? step : -step) * 4, -4, 8, 5.5, 0); paint(ctx, '#55566A', '#33343F', 2); }
    rr(ctx, -dir * 22 - 9, -48, 18, 28, 7); paint(ctx, '#F5C34A', '#A87D1E', 2.5);
    rr(ctx, -15, -50, 30, 42, 12); paint(ctx, '#F4F4F8', '#6A6A80', 2.5);
    ctx.fillStyle = '#E8432E'; rr(ctx, -15, -24, 30, 6, 2); ctx.fill();
    circle(ctx, dir * 3, -38, 5); paint(ctx, '#F5C34A', '#A87D1E', 1.5);
    // arms
    const armA = o.throwT > 0 ? -2.3 : o.pluckT > 0 ? 1.2 : 0.5 + step * 0.4;
    for (const s of [1, -1]) {
      const sx = s * 14, a = s === dir ? armA : 0.5 - step * 0.4;
      const hx = sx + s * Math.cos(a) * 12, hy = -42 + Math.sin(a) * 14;
      ctx.beginPath(); ctx.moveTo(sx, -42); ctx.lineTo(hx, hy); ctx.strokeStyle = '#6A6A80'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = '#F4F4F8'; ctx.lineWidth = 5.5; ctx.stroke();
      circle(ctx, hx, hy, 4.5); paint(ctx, '#E8432E', '#8E2A1E', 1.5);
    }
    // head in the glass helmet
    circle(ctx, 0, -66, 14); paint(ctx, '#F7CDA6', '#9C6B4A', 2);
    for (const s of [-1, 1]) { ellipse(ctx, s * 12 - dir * 2, -70, 5, 4, 0); ctx.fillStyle = '#7A4E2E'; ctx.fill(); }
    for (const s of [-1, 1]) { circle(ctx, dir * 2 + s * 5, -70, 1.8); ctx.fillStyle = '#222'; ctx.fill(); }
    circle(ctx, dir * 4, -63, 6.5); paint(ctx, '#F2A08A', '#9C6B4A', 1.5);
    circle(ctx, 0, -67, 21); paint(ctx, 'rgba(210,240,255,0.22)', '#6EA9CC', 2.5);
    ctx.beginPath(); ctx.arc(0, -67, 16, Math.PI * 1.15, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(0, -102); ctx.strokeStyle = '#6A6A80'; ctx.lineWidth = 2.5; ctx.stroke();
    circle(ctx, 0, -104, 5); paint(ctx, '#FF4A3D', '#A82A1C', 1.5);
    ctx.restore();
  };

  Art.onion = function (ctx, on, f) {
    const x = on.x, y = on.y, z = on.z || 0;
    shadow(ctx, x, y, 70 * Math.max(0.3, 1 - z / 900), 20 * Math.max(0.3, 1 - z / 900), 0.2);
    ctx.save(); ctx.translate(x, y - z);
    const sq = on.eat > 0 ? 1 + Math.sin(on.eat * 0.5) * 0.06 : 1;
    ctx.strokeStyle = '#8E8E9E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const [lx, ly] of [[-56, 0], [56, 0], [0, 16]]) { ctx.beginPath(); ctx.moveTo(lx * 0.3, -96); ctx.lineTo(lx, ly); ctx.stroke(); circle(ctx, lx, ly, 6); ctx.fillStyle = '#8E8E9E'; ctx.fill(); }
    ctx.save(); ctx.translate(0, -126); ctx.scale(1 / sq, sq);
    ellipse(ctx, 0, 0, 48, 40, 0); ctx.save(); ctx.clip();
    const cols = ['#E8432E', '#F6C927', '#3E7FE0'];
    for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 3]; ctx.fillRect(-48 + i * 16, -40, 16, 80); }
    const gr = ctx.createRadialGradient(-14, -14, 4, 0, 0, 52); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(-50, -42, 100, 84);
    ctx.restore();
    ellipse(ctx, 0, 0, 48, 40, 0); paint(ctx, null, '#5B4632', 3);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-14, -90); ctx.lineTo(14, -90); ctx.lineTo(6, -76); ctx.lineTo(-6, -76); ctx.closePath(); paint(ctx, '#C9C9D6', '#5B4632', 2.5);
    ctx.beginPath(); ctx.moveTo(0, -166); ctx.lineTo(0, -184); ctx.strokeStyle = '#6A6A80'; ctx.lineWidth = 4; ctx.stroke();
    const spin = (on.spin || 0) + f * 0.02;
    for (let i = 0; i < 3; i++) {
      const a = spin + i * Math.PI * 2 / 3;
      ellipse(ctx, Math.cos(a) * 22, -188 + Math.sin(a) * 5, 22, 7, 0); paint(ctx, cols[i], 'rgba(0,0,0,0.3)', 2);
    }
    circle(ctx, 0, -188, 6); paint(ctx, '#FFF3B0', '#C9A43A', 2);
    ctx.restore();
  };

  Art.ship = function (ctx, s, f) {
    const x = s.x, y = s.y, z = s.z || 0;
    shadow(ctx, x, y, 90 * Math.max(0.25, 1 - z / 900), 24 * Math.max(0.25, 1 - z / 900), 0.2);
    ctx.save(); ctx.translate(x, y - z);
    if (z > 0) {
      const fl = 30 + Math.sin(f * 1.3) * 8;
      ctx.beginPath(); ctx.moveTo(-26, -40); ctx.quadraticCurveTo(0, -40 + fl * 1.6, 26, -40); ctx.closePath(); paint(ctx, '#FFC94A', '#F07A2A', 3);
    }
    ctx.strokeStyle = '#6A6A80'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s2 * 40, -60); ctx.lineTo(s2 * 66, 0); ctx.stroke(); ellipse(ctx, s2 * 66, 0, 12, 4, 0); ctx.fillStyle = '#6A6A80'; ctx.fill(); }
    // fins
    for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-70, -96 + s2 * 6); ctx.lineTo(-112, -96 + s2 * 50); ctx.lineTo(-56, -96 + s2 * 30); ctx.closePath(); paint(ctx, '#F5C34A', '#A87D1E', 3); }
    ellipse(ctx, 0, -96, 82, 56, 0); paint(ctx, '#E6453A', '#8E2A1E', 3.5);
    ellipse(ctx, 0, -80, 74, 22, 0); ctx.fillStyle = '#F4F4F8'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(70, -112); ctx.quadraticCurveTo(128, -98, 76, -78); ctx.closePath(); paint(ctx, '#F4F4F8', '#8E2A1E', 3);
    circle(ctx, 22, -122, 26); paint(ctx, 'rgba(180,230,255,0.85)', '#6EA9CC', 3);
    ctx.beginPath(); ctx.arc(22, -122, 19, Math.PI * 1.1, Math.PI * 1.5); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 4; ctx.stroke();
    const d = s.door || 0;
    rr(ctx, -30, -96, 34, 50, 10); paint(ctx, d > 0 ? '#3A3A4A' : '#E6453A', '#8E2A1E', 2.5);
    if (d < 1) { rr(ctx, -30, -96 + 50 * d, 34, 50 * (1 - d), 10); paint(ctx, '#F4F4F8', '#8E2A1E', 2.5); }
    text(ctx, 'DOLPHIN', 34, -70, 13, { fill: '#8E2A1E' });
    ctx.restore();
  };

  /* ---------------------------------------------------------- buildings */
  function lotBox(b) { const L = b.lot; return { x: (L.c + L.w / 2) * T, y: (L.r + L.h) * T, w: L.w * T, h: L.h * T }; }
  function drawTent(ctx, B, f) {
    const { x, y } = B;
    shadow(ctx, x, y - 6, 110, 20);
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-100, -4); ctx.quadraticCurveTo(-60, -110, 0, -160); ctx.quadraticCurveTo(60, -110, 100, -4); ctx.closePath();
    paint(ctx, '#7CC85E', '#3E8A30', 4);
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#9BD97C';
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 30, -4); ctx.lineTo(i * 6, -160); ctx.lineTo(i * 6 + 8, -160); ctx.lineTo(i * 30 + 14, -4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-26, -4); ctx.quadraticCurveTo(0, -90, 26, -4); ctx.closePath(); paint(ctx, '#3D6B2E', '#2B4E20', 3);
    rr(ctx, -44, -138, 88, 34, 14); paint(ctx, '#FFF4D8', '#A8703F', 3);
    leafShape(ctx, -24, -112, 9, -0.4);
    text(ctx, 'ほんぶ', 10, -121, 20);
    ctx.restore();
  }
  function drawHouse(ctx, B, f, night, alpha) {
    const { x, y } = B, roof = ROOF[B.roof || 'red'];
    shadow(ctx, x, y - 6, 100, 18);
    ctx.save(); ctx.translate(x, y); if (alpha != null) ctx.globalAlpha *= alpha;
    rr(ctx, 30, -150, 22, 40, 4); paint(ctx, '#C88A5A', '#7A5534', 2.5);
    leafShape(ctx, 41, -150, 10, 0.2);
    rr(ctx, -82, -112, 164, 112, 8); paint(ctx, '#FFF3DC', '#9C7A55', 3);
    ctx.beginPath(); ctx.moveTo(-100, -104); ctx.quadraticCurveTo(-60, -160, 0, -184); ctx.quadraticCurveTo(60, -160, 100, -104); ctx.closePath();
    paint(ctx, roof, '#5B4632', 3.5);
    ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, -40 - i * 26, 110, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-20, -48); ctx.arc(0, -48, 20, Math.PI, 0); ctx.lineTo(20, 0); ctx.closePath(); paint(ctx, '#A8703F', '#6E4A2A', 3);
    circle(ctx, 12, -26, 3); ctx.fillStyle = '#F5C34A'; ctx.fill();
    for (const s of [-1, 1]) { circle(ctx, s * 52, -62, 17); paint(ctx, night ? '#FFE48A' : '#BFE8FF', '#9C7A55', 3); ctx.beginPath(); ctx.moveTo(s * 52 - 17, -62); ctx.lineTo(s * 52 + 17, -62); ctx.moveTo(s * 52, -79); ctx.lineTo(s * 52, -45); ctx.strokeStyle = '#9C7A55'; ctx.lineWidth = 2.5; ctx.stroke(); }
    rr(ctx, 92, -40, 16, 40, 3); paint(ctx, '#A8703F', '#6E4A2A', 2); rr(ctx, 86, -56, 28, 20, 6); paint(ctx, roof, '#5B4632', 2);
    ctx.restore();
  }
  function drawShop(ctx, B, f, night, alpha) {
    const { x, y } = B;
    shadow(ctx, x, y - 6, 140, 20);
    ctx.save(); ctx.translate(x, y); if (alpha != null) ctx.globalAlpha *= alpha;
    rr(ctx, -120, -128, 240, 128, 8); paint(ctx, '#D9A066', '#8A5A2E', 3);
    ctx.strokeStyle = 'rgba(120,70,30,0.35)'; ctx.lineWidth = 2;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-120, -128 + i * 21); ctx.lineTo(120, -128 + i * 21); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-136, -116); ctx.lineTo(0, -176); ctx.lineTo(136, -116); ctx.closePath(); paint(ctx, '#7A5534', '#4E3520', 3.5);
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(-128 + i * 32, -112); ctx.lineTo(-96 + i * 32, -112); ctx.lineTo(-100 + i * 32, -84); ctx.quadraticCurveTo(-112 + i * 32, -76, -124 + i * 32, -84); ctx.closePath(); paint(ctx, i % 2 ? '#FFFFFF' : '#4FB86A', '#2E7A40', 2); }
    rr(ctx, -84, -170, 168, 36, 14); paint(ctx, '#FFF4D8', '#8A5A2E', 3);
    text(ctx, 'ルーイの商店', 0, -152, 22);
    rr(ctx, -24, -70, 48, 70, 8); paint(ctx, night ? '#FFE48A' : '#8FD3F2', '#8A5A2E', 3);
    for (const s of [-1, 1]) { rr(ctx, s * 76 - 26, -64, 52, 36, 6); paint(ctx, night ? '#FFE48A' : '#BFE8FF', '#8A5A2E', 3); }
    for (const [cx2, col] of [[-90, '#E8432E'], [90, '#F7A595']]) { rr(ctx, cx2 - 22, -24, 44, 26, 4); paint(ctx, '#C88A5A', '#7A5534', 2); for (let k = 0; k < 3; k++) { circle(ctx, cx2 - 12 + k * 12, -27, 7); paint(ctx, col, '#8E2A1E', 1.5); } }
    ctx.restore();
  }
  function drawMuseum(ctx, B, f, night, alpha) {
    const { x, y } = B;
    shadow(ctx, x, y - 6, 140, 22);
    ctx.save(); ctx.translate(x, y); if (alpha != null) ctx.globalAlpha *= alpha;
    rr(ctx, -128, -150, 256, 140, 6); paint(ctx, '#EDE6D6', '#8C8070', 3);
    ctx.beginPath(); ctx.ellipse(0, -150, 70, 62, 0, Math.PI, 0); ctx.closePath(); paint(ctx, '#5BB8A6', '#2E7A6E', 3.5);
    circle(ctx, 0, -214, 7); paint(ctx, '#F5C34A', '#A87D1E', 2);
    ctx.beginPath(); ctx.moveTo(-140, -150); ctx.lineTo(0, -196); ctx.lineTo(140, -150); ctx.closePath(); paint(ctx, '#F6F0E2', '#8C8070', 3);
    for (let i = 0; i < 5; i++) { rr(ctx, -104 + i * 50, -140, 16, 116, 4); paint(ctx, '#FFFFFF', '#A89C88', 2); }
    rr(ctx, -26, -84, 52, 64, 6); paint(ctx, night ? '#FFE48A' : '#7A5534', '#5B4632', 3);
    rr(ctx, -140, -22, 280, 12, 3); paint(ctx, '#DCD3C0', '#8C8070', 2);
    rr(ctx, -150, -10, 300, 12, 3); paint(ctx, '#CFC5B0', '#8C8070', 2);
    rr(ctx, -60, -188, 120, 30, 10); paint(ctx, '#FFF4D8', '#8C8070', 2.5);
    text(ctx, '博物館', 0, -173, 20);
    ctx.restore();
  }
  function drawBridge(ctx, B, f, alpha) {
    const L = B.lot, x0 = L.c * T + 10, x1 = (L.c + L.w) * T - 10, yc = (L.r + 0.5) * T;
    ctx.save(); if (alpha != null) ctx.globalAlpha *= alpha;
    rr(ctx, x0, yc - 34, x1 - x0, 68, 10); paint(ctx, '#C99A62', '#7A5534', 3);
    ctx.strokeStyle = 'rgba(122,85,52,0.6)'; ctx.lineWidth = 2;
    for (let x = x0 + 16; x < x1; x += 16) { ctx.beginPath(); ctx.moveTo(x, yc - 32); ctx.lineTo(x, yc + 32); ctx.stroke(); }
    for (const s of [-1, 1]) {
      const yy = yc + s * 34;
      ctx.beginPath(); ctx.moveTo(x0, yy - 18); ctx.lineTo(x1, yy - 18); ctx.strokeStyle = '#8A5A2E'; ctx.lineWidth = 6; ctx.stroke();
      for (let x = x0 + 4; x <= x1; x += (x1 - x0 - 8) / 4) { rr(ctx, x - 5, yy - 24, 10, 26, 3); paint(ctx, '#A8703F', '#6E4A2A', 2); }
    }
    ctx.restore();
  }
  function drawPlaza(ctx, B, f, night) {
    const L = B.lot, cx = (L.c + L.w / 2) * T, cy = (L.r + L.h / 2) * T + 10;
    ellipse(ctx, cx, cy + 10, 96, 46, 0); ctx.fillStyle = 'rgba(40,60,30,0.15)'; ctx.fill();
    ellipse(ctx, cx, cy, 92, 44, 0); paint(ctx, '#D9D1C0', '#9C9080', 4);
    ellipse(ctx, cx, cy - 4, 78, 34, 0); paint(ctx, '#62C8EA', '#4A9CC0', 3);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const k = ((f * 0.02 + i / 3) % 1); ellipse(ctx, cx, cy - 4, 20 + k * 54, (20 + k * 54) * 0.44, 0); ctx.globalAlpha = 1 - k; ctx.stroke(); }
    ctx.globalAlpha = 1;
    rr(ctx, cx - 12, cy - 70, 24, 66, 6); paint(ctx, '#E8E2D4', '#9C9080', 3);
    ellipse(ctx, cx, cy - 72, 34, 12, 0); paint(ctx, '#E8E2D4', '#9C9080', 3);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, k = (f * 0.04 + i * 0.37) % 1;
      circle(ctx, cx + Math.cos(a) * 30 * k, cy - 88 + k * k * 60 - 26 * Math.sin(k * Math.PI), 4); ctx.fillStyle = 'rgba(180,235,255,0.95)'; ctx.fill();
    }
    for (const [dx, dy] of [[-150, -40], [150, -40], [-150, 70], [150, 70]]) lamp(ctx, cx + dx, cy + dy, night);
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2;
      flowerHead(ctx, cx + Math.cos(a) * 118, cy + 6 + Math.sin(a) * 60, FLOWER[i % FLOWER.length], 5.5);
    }
  }
  function lamp(ctx, x, y, night) {
    shadow(ctx, x, y, 12, 4);
    rr(ctx, x - 4, y - 70, 8, 70, 3); paint(ctx, '#4E5A66', '#2E3640', 2);
    rr(ctx, x - 12, y - 92, 24, 24, 6); paint(ctx, night ? '#FFE48A' : '#F4F4F8', '#2E3640', 2.5);
  }
  function drawSite(ctx, s, f) {
    const b = { kind: s.build, lot: s.lot, roof: s.roof };
    const box = lotBox(b), k = Math.min(1, s.progress / s.need);
    // ghost of the finished building rising from the ground
    ctx.save();
    ctx.beginPath(); ctx.rect(box.x - box.w, box.y - (40 + 200 * k), box.w * 2, 40 + 200 * k); ctx.clip();
    drawBuilding(ctx, Object.assign({ x: box.x, y: box.y }, b), f, false, 0.35 + 0.55 * k);
    ctx.restore();
    if (s.build !== 'bridge') {
      ctx.strokeStyle = '#B98A55'; ctx.lineWidth = 5;
      const top = box.y - 40 - 170 * k;
      for (const dx of [-box.w / 2 + 14, 0, box.w / 2 - 14]) { ctx.beginPath(); ctx.moveTo(box.x + dx, box.y); ctx.lineTo(box.x + dx, top); ctx.stroke(); }
      for (let yy = box.y - 40; yy > top; yy -= 46) { ctx.beginPath(); ctx.moveTo(box.x - box.w / 2 + 14, yy); ctx.lineTo(box.x + box.w / 2 - 14, yy); ctx.stroke(); }
    }
    for (let i = 0; i < 7; i++) {
      const px = box.x - box.w / 2 + i * box.w / 6;
      rr(ctx, px - 5, box.y + 6, 10, 26, 3); paint(ctx, '#F28C28', '#8A4A10', 2);
    }
    ctx.beginPath(); ctx.moveTo(box.x - box.w / 2, box.y + 16); ctx.lineTo(box.x + box.w / 2, box.y + 16);
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7; ctx.stroke(); ctx.setLineDash([12, 12]); ctx.strokeStyle = '#F28C28'; ctx.stroke(); ctx.setLineDash([]);
    // progress bar
    rr(ctx, box.x - 60, box.y - box.h - 50, 120, 16, 8); paint(ctx, '#FFFFFF', INK, 2.5);
    rr(ctx, box.x - 57, box.y - box.h - 47, 114 * k, 10, 5); ctx.fillStyle = '#7CC85E'; ctx.fill();
  }
  function drawBuilding(ctx, b, f, night, alpha) {
    const box = b.x != null && b.kind !== 'base' && b.kind !== 'bridge' && b.kind !== 'plaza' ? null : null;
    const B = Object.assign({}, b, lotBox(b));
    switch (b.kind) {
      case 'base': drawTent(ctx, B, f); break;
      case 'house': drawHouse(ctx, B, f, night, alpha); break;
      case 'shop': drawShop(ctx, B, f, night, alpha); break;
      case 'museum': drawMuseum(ctx, B, f, night, alpha); break;
      case 'bridge': drawBridge(ctx, B, f, alpha); break;
      case 'plaza': if (alpha == null) drawPlaza(ctx, B, f, night); else { ctx.save(); ctx.globalAlpha *= alpha; drawPlaza(ctx, B, f, night); ctx.restore(); } break;
    }
    return box;
  }

  /* ---------------------------------------------------------- items */
  function drawItem(ctx, it, f) {
    const x = it.x, y = it.y - (it.carriers.length >= it.weight ? 16 + Math.abs(Math.sin(it.bob)) * 3 : 4);
    shadow(ctx, it.x, it.y, 18, 6);
    switch (it.kind) {
      case 'log':
        rr(ctx, x - 26, y - 11, 52, 22, 10); paint(ctx, '#A8703F', '#6E4A2A', 2.5);
        ellipse(ctx, x + 24, y, 7, 10.5, 0); paint(ctx, '#E0B77E', '#6E4A2A', 2);
        break;
      case 'stone':
        rr(ctx, x - 20, y - 16, 40, 30, 9); paint(ctx, '#B4B3BF', '#6D6C7A', 2.5);
        rr(ctx, x - 13, y - 12, 18, 8, 4); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        break;
      case 'fruit':
        circle(ctx, x, y - 6, 15); paint(ctx, '#E8432E', '#8E2A1E', 2.5);
        circle(ctx, x - 5, y - 11, 4.5); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
        leafShape(ctx, x + 2, y - 20, 7, 0.6);
        break;
      case 'pellet': pelletDisc(ctx, x, y - 8, PELLET[it.t % 3 === 0 ? 0 : Math.floor(PM.hash(it.x | 0, 1, 1) * 3)], 14); break;
    }
  }

  /* ---------------------------------------------------------- lighting */
  function nightness(g) {
    const h = g.clock / 60;
    if (h >= 20 || h < 4) return 1;
    if (h >= 18) return (h - 18) / 2;
    if (h < 6) return 1 - (h - 4) / 2;
    return 0;
  }
  function sunset(g) {
    const h = g.clock / 60;
    if (h >= 16.5 && h < 19) return Math.sin((h - 16.5) / 2.5 * Math.PI);
    if (h >= 5 && h < 7) return Math.sin((h - 5) / 2 * Math.PI) * 0.6;
    return 0;
  }

  /* ---------------------------------------------------------- world */
  function drawWorld(ctx, g) {
    const f = g.frame, V = PM.VIEW, c = g.cam;
    if (g.pathDirty) drawGround(g);
    drawSea(ctx, g, f);
    ctx.save();
    ctx.translate(V.w / 2, V.h / 2); ctx.scale(c.zoom, c.zoom); ctx.translate(-c.x, -c.y);
    const hw = V.w / 2 / c.zoom, hh = V.h / 2 / c.zoom;
    const bounds = { x0: c.x - hw, x1: c.x + hw, y0: c.y - hh, y1: c.y + hh };
    seaWaves(ctx, g, f, bounds);
    ctx.drawImage(ground, 0, 0);
    riverShimmer(ctx, g, f, bounds);
    const night = nightness(g) > 0.5;
    const vis = (x, y, m) => x > bounds.x0 - m && x < bounds.x1 + m && y > bounds.y0 - 40 && y < bounds.y1 + m * 1.5;
    // y-sorted draw list
    const list = [];
    for (const b of g.buildings) {
      const B = lotBox(b);
      if (!vis(B.x, B.y, 260)) continue;
      list.push({ y: b.kind === 'plaza' || b.kind === 'bridge' ? B.y - 400 : B.y, d: () => drawBuilding(ctx, b, f, night) });
    }
    for (const o of g.objects) {
      if (o.kind === 'site') { const B = lotBox(o); list.push({ y: o.build === 'bridge' ? B.y - 400 : B.y, d: () => drawSite(ctx, o, f) }); continue; }
      if (!vis(o.x, o.y, 160)) continue;
      const fn = { tree: drawTree, fruit: drawTree, rock: drawRock, weed: drawWeed, flower: drawFlower, posy: drawPosy, palm: drawPalm }[o.kind];
      if (fn) list.push({ y: o.kind === 'flower' || o.kind === 'weed' ? o.y - 30 : o.y, d: () => fn(ctx, o, f) });
    }
    for (const it of g.items) if (vis(it.x, it.y, 60)) list.push({ y: it.y + 1, d: () => drawItem(ctx, it, f) });
    for (const p of g.pikmin) if (vis(p.x, p.y, 60)) list.push({ y: p.y, d: () => Art.pikmin(ctx, p, f) });
    for (const r of g.residents) if (vis(r.x, r.y, 60)) list.push({ y: r.y, d: () => Art.pikmin(ctx, { x: r.x, y: r.y, color: r.color, dir: r.dir, anim: r.anim, state: 'resident', stage: 2, id: 0 }, f, { scale: 1.15, hat: r.hat, walk: true }) });
    if (g.onion.z < 1200) list.push({ y: g.onion.y, d: () => Art.onion(ctx, g.onion, f) });
    list.push({ y: g.ship.y, d: () => Art.ship(ctx, g.ship, f) });
    list.push({ y: g.olimar.y + 2, d: () => Art.olimar(ctx, g.olimar, f) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) e.d();
    // effects
    for (const e of g.effects) if (e.type !== 'firework') drawEffect(ctx, e, f);
    for (const r of g.residents) if (r.sayT > 0 && vis(r.x, r.y, 100)) bubble(ctx, r.say, r.x, r.y - 82, 22 / Math.max(0.6, c.zoom) * 0.9);
    ctx.restore();

    // lighting
    const n = nightness(g), ss = sunset(g);
    if (ss > 0) { ctx.fillStyle = `rgba(255,130,60,${0.2 * ss})`; ctx.fillRect(0, 0, V.w, V.h); }
    if (n > 0) {
      ctx.fillStyle = `rgba(16,24,80,${0.44 * n})`; ctx.fillRect(0, 0, V.w, V.h);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const glow = (wx, wy, r, col, a) => {
        const sx = (wx - c.x) * c.zoom + V.w / 2, sy = (wy - c.y) * c.zoom + V.h / 2, rr2 = r * c.zoom;
        if (sx < -rr2 || sx > V.w + rr2 || sy < -rr2 || sy > V.h + rr2) return;
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, rr2);
        gr.addColorStop(0, `rgba(${col},${a * n})`); gr.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = gr; ctx.fillRect(sx - rr2, sy - rr2, rr2 * 2, rr2 * 2);
      };
      for (const b of g.buildings) {
        const B = lotBox(b);
        if (b.kind === 'house') { glow(B.x - 52, B.y - 62, 70, '255,200,90', 0.55); glow(B.x + 52, B.y - 62, 70, '255,200,90', 0.55); }
        if (b.kind === 'shop' || b.kind === 'museum') glow(B.x, B.y - 50, 150, '255,200,90', 0.5);
        if (b.kind === 'base') glow(B.x, B.y - 60, 110, '255,220,140', 0.35);
        if (b.kind === 'plaza') for (const [dx, dy] of [[-150, -40], [150, -40], [-150, 70], [150, 70]]) glow(B.x + dx, B.y - B.h / 2 + 10 + dy - 80, 110, '255,210,120', 0.6);
      }
      glow(g.olimar.x, g.olimar.y - 104, 40, '255,80,60', 0.9);
      glow(g.onion.x, g.onion.y - 130 - g.onion.z, 130, '255,240,200', 0.35);
      for (const e of g.effects) if (e.type === 'firework') glow(e.x, e.y, 320, '255,220,180', 0.4 * (1 - e.t / e.life));
      ctx.restore();
    }
    // fireworks go on top of the night so they stay bright
    if (g.effects.some((e) => e.type === 'firework')) {
      ctx.save();
      ctx.translate(V.w / 2, V.h / 2); ctx.scale(c.zoom, c.zoom); ctx.translate(-c.x, -c.y);
      for (const e of g.effects) if (e.type === 'firework') drawEffect(ctx, e, f);
      ctx.restore();
    }
  }

  function bubble(ctx, s, x, y, size) {
    ctx.font = `800 ${size}px ${FONT}`;
    const w = ctx.measureText(s).width + size * 1.2, h = size * 1.7;
    rr(ctx, x - w / 2, y - h, w, h, h / 2); paint(ctx, '#FFFDF4', '#B9A27A', 2.5);
    ctx.beginPath(); ctx.moveTo(x - 7, y - 2); ctx.lineTo(x, y + 9); ctx.lineTo(x + 7, y - 2); ctx.closePath(); ctx.fillStyle = '#FFFDF4'; ctx.fill();
    text(ctx, s, x, y - h / 2, size, { weight: 800 });
  }

  function drawEffect(ctx, e, f) {
    const k = e.t / e.life;
    switch (e.type) {
      case 'dust': circle(ctx, e.x, e.y, e.r * (0.6 + k)); ctx.fillStyle = `rgba(255,250,235,${0.7 * (1 - k)})`; ctx.fill(); break;
      case 'leaf': leafShape(ctx, e.x, e.y, 7, e.rot + e.t * 0.2); break;
      case 'confetti':
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot + e.t * 0.2);
        ctx.fillStyle = `hsl(${e.hue},90%,62%)`; ctx.fillRect(-6, -3, 12, 6); ctx.restore(); break;
      case 'pop': {
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        text(ctx, e.text, e.x, e.y - e.t * 0.9, 26, { fill: '#7A4E1E', stroke: '#FFFDF4', lw: 7 });
        ctx.globalAlpha = 1; break;
      }
      case 'firework': {
        const n = 40;
        for (let ring = 0; ring < 2; ring++) {
          for (let i = 0; i < n; i++) {
            const a = i / n * Math.PI * 2 + ring * 0.08, sp = (ring ? 6 : 10) + (i % 3) * 1.2;
            const d = sp * e.t * (1 - e.t / 170), x = e.x + Math.cos(a) * d, y = e.y + Math.sin(a) * d + e.t * e.t * 0.015;
            ctx.globalAlpha = Math.max(0, 1 - k * k);
            circle(ctx, x, y, (ring ? 6 : 9) - k * 5); ctx.fillStyle = `hsl(${(e.hue + ring * 120 + i * 4) % 360},100%,${60 + (i % 2) * 14}%)`; ctx.fill();
          }
        }
        if (e.t < 10) { circle(ctx, e.x, e.y, 60 - e.t * 6); ctx.fillStyle = 'rgba(255,255,230,0.9)'; ctx.fill(); }
        ctx.globalAlpha = 1; break;
      }
    }
  }

  /* ---------------------------------------------------------- UI */
  const DOW = ['日', '月', '火', '水', '木', '金', '土'];
  function header(ctx, g) {
    const gr = ctx.createLinearGradient(0, 0, 0, 230);
    gr.addColorStop(0, '#8FD8C8'); gr.addColorStop(1, '#6CC4B0');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, 1080, 230);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i < 14; i++) leafDeco(ctx, 40 + i * 80, 40 + (i % 2) * 120, i);
    // title
    text(ctx, 'あつまれ', 228, 62, 40, { fill: '#FFFFFF', stroke: '#3E7A5A', lw: 10 });
    text(ctx, 'ピクミンの森', 540, 58, 62, { fill: '#FFF7D6', stroke: '#3E7A5A', lw: 13 });
    leafShape(ctx, 790, 74, 20, 0.5);
    circle(ctx, 826, 44, 15); paint(ctx, '#E8432E', '#A82A1C', 3);
    for (const s of [-1, 1]) { circle(ctx, 826 + s * 5, 42, 4); ctx.fillStyle = '#fff'; ctx.fill(); circle(ctx, 827 + s * 5, 42, 2); ctx.fillStyle = '#222'; ctx.fill(); }
    // clock card
    rr(ctx, 30, 108, 330, 104, 30); paint(ctx, '#FFFDF4', '#C9B48A', 3);
    const h = Math.floor(g.clock / 60), m = Math.floor(g.clock % 60);
    const ap = h < 12 ? 'AM' : 'PM', h12 = ((h + 11) % 12) + 1;
    text(ctx, `${h12}:${String(m).padStart(2, '0')}`, 160, 150, 52, { fill: '#5B4632' });
    text(ctx, ap, 268, 162, 26, { fill: '#A08560' });
    text(ctx, `11月${4 + g.day}日 (${DOW[(3 + g.day) % 7]})  ${g.day}日目`, 195, 192, 22, { fill: '#8A7250', weight: 800 });
    // resource chips
    const chips = [
      { icon: 'wood', v: g.inv.wood }, { icon: 'stone', v: g.inv.stone },
      { icon: 'pik', v: g.pikmin.filter((p) => p.state !== 'sprout' && p.state !== 'seed').length },
    ];
    chips.forEach((c, i) => {
      const x = 390 + i * 160;
      rr(ctx, x, 112, 146, 56, 28); paint(ctx, '#FFFDF4', '#C9B48A', 3);
      chipIcon(ctx, c.icon, x + 34, 140);
      text(ctx, String(c.v), x + 100, 141, 34, { fill: '#5B4632' });
    });
    rr(ctx, 390, 174, 450, 44, 22); paint(ctx, 'rgba(255,253,244,0.9)', '#C9B48A', 3);
    text(ctx, '島評価', 450, 196, 22, { fill: '#8A7250' });
    for (let i = 0; i < 5; i++) {
      const on = i < g.stars, pulse = on && i === g.stars - 1 && g.starT > 0 ? 1 + Math.sin(g.starT * 0.3) * 0.25 : 1;
      star5(ctx, 540 + i * 56, 196, 17 * pulse); paint(ctx, on ? '#FFD23F' : '#E6DCC6', on ? '#C99A1E' : '#C9BFA8', 2.5);
    }
    if (g.starT > 0) g.starT--;
    rr(ctx, 860, 112, 190, 106, 28); paint(ctx, '#FFFDF4', '#C9B48A', 3);
    text(ctx, 'たてもの', 955, 136, 20, { fill: '#8A7250' });
    text(ctx, (g.buildings.length - 1) + ' / 8', 955, 180, 40, { fill: '#5B4632' });
  }
  function leafDeco(ctx, x, y, i) { ctx.save(); ctx.translate(x, y); ctx.rotate(i); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(14, -10, 0, -30); ctx.quadraticCurveTo(-14, -10, 0, 0); ctx.fill(); ctx.restore(); }
  function chipIcon(ctx, k, x, y) {
    if (k === 'wood') { rr(ctx, x - 20, y - 9, 40, 18, 8); paint(ctx, '#A8703F', '#6E4A2A', 2); ellipse(ctx, x + 19, y, 5, 8.5, 0); paint(ctx, '#E0B77E', '#6E4A2A', 1.5); }
    else if (k === 'stone') { rr(ctx, x - 16, y - 13, 32, 26, 8); paint(ctx, '#B4B3BF', '#6D6C7A', 2); }
    else { Art.pikmin(ctx, { x, y: y + 18, color: 'red', dir: 1, anim: 0, state: 'icon', stage: 0, id: 0 }, 0, { scale: 0.9 }); }
  }
  function panel(ctx, g) {
    const y0 = PM.VIEW.y + PM.VIEW.h;
    ctx.fillStyle = '#FFF6DE'; ctx.fillRect(0, y0, 1080, 1920 - y0);
    ctx.fillStyle = '#7CC85E'; ctx.fillRect(0, y0, 1080, 10);
    const q = g.goalInfo(), live = !g.recording;
    const cardH = live ? 150 : 200, titleY = y0 + (live ? 72 : 92), barY = y0 + (live ? 138 : 160);
    rr(ctx, 30, y0 + 30, 1020, cardH, 34); paint(ctx, '#FFFDF4', '#C9B48A', 3);
    rr(ctx, 60, y0 + 14, 230, 40, 20); paint(ctx, '#7CC85E', '#4E9A3A', 3);
    text(ctx, '島づくりの目標', 175, y0 + 35, 22, { fill: '#FFFFFF' });
    text(ctx, q.title, 70, titleY, live ? 36 : 40, { align: 'left', fill: '#5B4632' });
    q.lines.forEach((l, i) => {
      const x = 70 + i * 480, y = barY, k = Math.min(1, l.have / l.need);
      text(ctx, l.label, x, y, 28, { align: 'left', fill: '#8A7250' });
      rr(ctx, x + 90, y - 14, 250, 28, 14); paint(ctx, '#EFE6CF', '#C9B48A', 2);
      if (k > 0) { rr(ctx, x + 92, y - 12, 246 * k, 24, 12); ctx.fillStyle = k >= 1 ? '#7CC85E' : '#F2B93B'; ctx.fill(); }
      text(ctx, `${Math.min(l.have, l.need)}/${l.need}${l.unit || ''}`, x + 395, y, 28, { fill: '#5B4632' });
    });
    if (!q.lines.length) { for (let i = 0; i < 5; i++) { star5(ctx, 100 + i * 70, barY, 26); paint(ctx, '#FFD23F', '#C99A1E', 3); } }
    if (!g.recording) {
      const btns = Art.buttons;
      for (const b of btns) {
        const on = (b.id === 'auto' && g.auto) || (b.id === 'zoom' && g.manualZoom < 1);
        rr(ctx, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, b.h / 2); paint(ctx, on ? '#7CC85E' : '#FFFDF4', '#C9B48A', 3);
        text(ctx, b.label, b.x, b.y, 30, { fill: on ? '#FFFFFF' : '#5B4632' });
      }
    }
  }
  Art.buttons = [
    { id: 'whistle', label: 'ふえ', x: 200, y: 1866, w: 300, h: 80 },
    { id: 'zoom', label: 'ズーム', x: 540, y: 1866, w: 300, h: 80 },
    { id: 'auto', label: 'オート', x: 880, y: 1866, w: 300, h: 80 },
  ];

  function caption(ctx, g) {
    const h = g.hl; if (!h) return;
    const t = h.t, k = t < 10 ? t / 10 : h.dur - t < 12 ? (h.dur - t) / 12 : 1;
    ctx.save(); ctx.globalAlpha = Math.max(0, k);
    ctx.translate(540, 90); ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.font = `900 50px ${FONT}`;
    const w = Math.max(560, ctx.measureText(h.text).width + 140);
    rr(ctx, -w / 2, -58, w, 116, 58); paint(ctx, 'rgba(255,253,244,0.96)', '#C9B48A', 4);
    leafShape(ctx, -w / 2 + 52, 18, 14, -0.5);
    text(ctx, h.text, 16, 2, 50, { fill: '#5B4632' });
    ctx.restore();
  }
  function ffBadge(ctx, g) {
    if (!g.ff) return;
    rr(ctx, 760, 190, 290, 64, 32); paint(ctx, 'rgba(91,70,50,0.82)', null);
    text(ctx, '▶▶ はやおくり', 905, 222, 30, { fill: '#FFFFFF' });
  }
  function titleCard(ctx, g) {
    const t = g.modeT;
    ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(0, 0, 1080, 1420);
    const s = Math.min(1, t / 20);
    ctx.save(); ctx.translate(540, 520); ctx.scale(s, s);
    rr(ctx, -440, -170, 880, 330, 70); paint(ctx, 'rgba(255,253,244,0.95)', '#7CC85E', 8);
    text(ctx, 'あつまれ', -10, -92, 74, { fill: '#7CC85E', stroke: '#FFFFFF', lw: 12 });
    text(ctx, 'ピクミンの森', 0, 22, 116, { fill: '#5B4632', stroke: '#FFFFFF', lw: 16 });
    leafShape(ctx, 330, -60, 34, 0.5);
    text(ctx, 'オリマーと ピクミンの 島づくり', 0, 118, 36, { fill: '#8A7250' });
    ctx.restore();
    if (!g.recording && (t >> 5) % 2 === 0) text(ctx, 'タップして スタート', 540, 860, 44, { fill: '#FFFFFF', stroke: '#3E7A5A', lw: 10 });
  }

  Art.render = function (ctx, g) {
    header(ctx, g);
    const V = PM.VIEW;
    ctx.save(); ctx.beginPath(); ctx.rect(V.x, V.y, V.w, V.h); ctx.clip(); ctx.translate(V.x, V.y);
    drawWorld(ctx, g);
    if (g.mode === 'title') titleCard(ctx, g);
    caption(ctx, g);
    ffBadge(ctx, g);
    if (g.mode === 'end' && g.modeT > 150) {
      const a = Math.min(1, (g.modeT - 150) / 30);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, 700);
      text(ctx, 'おしまい', 0, 0, 120, { fill: '#FFF7D6', stroke: '#3E7A5A', lw: 18 });
      text(ctx, 'THANK YOU FOR WATCHING!', 0, 110, 40, { fill: '#FFFFFF', stroke: '#3E7A5A', lw: 9 });
      ctx.restore();
    }
    ctx.restore();
    panel(ctx, g);
  };
})(typeof window !== 'undefined' ? window : globalThis);
