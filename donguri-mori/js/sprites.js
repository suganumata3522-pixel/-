'use strict';
// スプライト: すべてCanvasで描いて事前にキャッシュする(画像ファイル不要)
(function (DF) {
  const U = DF.U;
  const S = { kid: {}, item: {}, tree: [], deco: {}, rock: [] };
  const SC = 2; // 高解像度で描いて縮小表示

  function sprite(w, h, ax, ay, draw) {
    const c = U.makeCanvas(w * SC, h * SC);
    const g = c.getContext('2d');
    g.scale(SC, SC);
    draw(g, w, h);
    return { c, w, h, ax, ay };
  }

  S.draw = function (ctx, spr, x, y, opt) {
    const s = (opt && opt.scale) || 1;
    if (opt && opt.flip) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-s, s);
      ctx.drawImage(spr.c, -spr.ax, -spr.ay, spr.w, spr.h);
      ctx.restore();
    } else if (s !== 1) {
      ctx.drawImage(spr.c, x - spr.ax * s, y - spr.ay * s, spr.w * s, spr.h * s);
    } else {
      ctx.drawImage(spr.c, x - spr.ax, y - spr.ay, spr.w, spr.h);
    }
  };

  // ---------- どんぐりっこ ----------
  // dir: 'front' | 'side' | 'back'
  function drawKid(g, t, dir) {
    const cx = 18;
    // からだ(どんぐりの実)
    const body = g.createRadialGradient(cx - 4, 22, 2, cx, 27, 15);
    body.addColorStop(0, lighten(t.body, 0.25));
    body.addColorStop(0.7, t.body);
    body.addColorStop(1, t.bodyDark);
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(cx - 11, 22);
    g.bezierCurveTo(cx - 12, 33, cx - 6, 39, cx, 40);
    g.bezierCurveTo(cx + 6, 39, cx + 12, 33, cx + 11, 22);
    g.closePath();
    g.fill();
    // 顔
    if (dir !== 'back') {
      const ex = dir === 'side' ? 4 : 0;
      const eyes = dir === 'side' ? [cx + 5] : [cx - 4.5, cx + 4.5];
      g.fillStyle = 'rgba(255,120,120,0.45)';
      for (const e of eyes) {
        g.beginPath(); g.ellipse(e + (e < cx ? -2.5 : 2.5) + (dir === 'side' ? 0 : 0), 31, 2.6, 1.6, 0, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#2b1a10';
      for (const e of eyes) { g.beginPath(); g.ellipse(e, 27.5, 1.9, 2.5, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff';
      for (const e of eyes) { g.beginPath(); g.arc(e + 0.6, 26.5, 0.75, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#2b1a10'; g.lineWidth = 1.1; g.lineCap = 'round';
      g.beginPath(); g.arc(cx + ex, 31, 1.8, 0.2, Math.PI - 0.2); g.stroke();
    }
    // ぼうし(どんぐりの殻斗)
    const capY = dir === 'back' ? 22 : 20;
    g.fillStyle = t.cap;
    g.beginPath();
    g.ellipse(cx, capY, 13, 8.5, 0, Math.PI, 0);
    g.ellipse(cx, capY, 13, 3, 0, 0, Math.PI);
    g.fill();
    // ぼうしの模様
    g.fillStyle = t.capLight;
    for (let r = 0; r < 3; r++) {
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * 3.4 + (r % 2) * 1.7;
        const y = capY - 1.5 - r * 2.6;
        if (Math.abs(x - cx) > 11 - r * 2.5) continue;
        g.beginPath(); g.arc(x, y, 1.05, 0, Math.PI * 2); g.fill();
      }
    }
    // へた
    g.strokeStyle = t.cap; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx, capY - 8);
    g.quadraticCurveTo(cx + 1, capY - 12, cx + (dir === 'side' ? -3 : 3), capY - 13);
    g.stroke();
    if (t.glow) {
      g.fillStyle = 'rgba(255,255,230,0.9)';
      star(g, cx - 7, 25, 2.2);
    }
  }

  function star(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 ? r * 0.35 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }
  S.star = star;

  function lighten(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * amt); gg = Math.round(gg + (255 - gg) * amt); b = Math.round(b + (255 - b) * amt);
    return `rgb(${r},${gg},${b})`;
  }
  S.lighten = lighten;

  // ---------- アイテム ----------
  const ITEM_DRAW = {
    acorn(g, r) {
      g.fillStyle = '#b8743a';
      g.beginPath(); g.ellipse(0, 2, r * 0.75, r * 0.9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6b4223';
      g.beginPath(); g.ellipse(0, -r * 0.35, r * 0.85, r * 0.5, 0, Math.PI, 0); g.ellipse(0, -r * 0.35, r * 0.85, r * 0.2, 0, 0, Math.PI); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-r * 0.3, r * 0.1, r * 0.15, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    },
    berry(g, r) {
      g.fillStyle = '#e8414f';
      g.beginPath(); g.moveTo(0, r); g.bezierCurveTo(-r * 1.2, 0, -r * 0.8, -r * 0.9, 0, -r * 0.7); g.bezierCurveTo(r * 0.8, -r * 0.9, r * 1.2, 0, 0, r); g.fill();
      g.fillStyle = '#ffe28a';
      for (let i = 0; i < 7; i++) { const a = i * 2.3; g.beginPath(); g.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.4, 0.9, 0, 7); g.fill(); }
      g.fillStyle = '#4c9a3a';
      for (let i = -1; i <= 1; i++) { g.beginPath(); g.ellipse(i * 4, -r * 0.75, 4, 2, i * 0.6, 0, 7); g.fill(); }
    },
    mushroom(g, r) {
      g.fillStyle = '#f3e6cf'; U.roundRect(g, -r * 0.35, -r * 0.1, r * 0.7, r * 1.0, 4); g.fill();
      g.fillStyle = '#d9763b';
      g.beginPath(); g.ellipse(0, -r * 0.15, r * 1.05, r * 0.75, 0, Math.PI, 0); g.closePath(); g.fill();
      g.fillStyle = '#fff3dd';
      [[-0.45, -0.5, 0.18], [0.3, -0.6, 0.15], [0.05, -0.3, 0.12], [0.6, -0.3, 0.1]].forEach(([x, y, s]) => { g.beginPath(); g.arc(x * r, y * r, s * r, 0, 7); g.fill(); });
    },
    apple(g, r) {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      gr.addColorStop(0, '#ff8a80'); gr.addColorStop(1, '#c62f2f');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -r * 0.6);
      g.bezierCurveTo(r * 1.1, -r * 1.1, r * 1.3, r * 0.6, 0, r * 0.95);
      g.bezierCurveTo(-r * 1.3, r * 0.6, -r * 1.1, -r * 1.1, 0, -r * 0.6); g.fill();
      g.strokeStyle = '#6b4223'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.1, -r * 0.95); g.stroke();
      g.fillStyle = '#5aa845'; g.beginPath(); g.ellipse(r * 0.35, -r * 0.85, r * 0.3, r * 0.14, -0.5, 0, 7); g.fill();
    },
    chestnut(g, r) {
      g.fillStyle = '#7a3f1d';
      g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 1.1, -r * 0.4, r * 1.0, r * 0.9, 0, r * 0.9); g.bezierCurveTo(-r * 1.0, r * 0.9, -r * 1.1, -r * 0.4, 0, -r); g.fill();
      g.fillStyle = '#d8b48a'; g.beginPath(); g.ellipse(0, r * 0.6, r * 0.7, r * 0.3, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.2, r * 0.14, r * 0.35, 0.2, 0, 7); g.fill();
    },
    peach(g, r) {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.2, 2, 0, 0, r);
      gr.addColorStop(0, '#ffe0c8'); gr.addColorStop(0.6, '#ffab9a'); gr.addColorStop(1, '#f07a83');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(200,80,90,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.3, 0, 0, r * 0.9); g.stroke();
      g.fillStyle = '#5aa845'; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.95, r * 0.4, r * 0.16, 0.4, 0, 7); g.fill();
    },
    gem(g, r) {
      g.fillStyle = '#5ec8e6';
      g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.9, -r * 0.2); g.lineTo(r * 0.5, r * 0.9); g.lineTo(-r * 0.5, r * 0.9); g.lineTo(-r * 0.9, -r * 0.2); g.closePath(); g.fill();
      g.fillStyle = '#a8ecff';
      g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.3, -r * 0.2); g.lineTo(-r * 0.3, -r * 0.2); g.closePath(); g.fill();
      g.fillStyle = '#2f93b8';
      g.beginPath(); g.moveTo(r * 0.3, -r * 0.2); g.lineTo(r * 0.9, -r * 0.2); g.lineTo(r * 0.5, r * 0.9); g.lineTo(0, r * 0.9); g.closePath(); g.fill();
      g.fillStyle = '#fff'; star(g, -r * 0.4, -r * 0.35, r * 0.28);
    },
    melon(g, r) {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
      gr.addColorStop(0, '#7fcf6a'); gr.addColorStop(1, '#2f7a32');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r, r * 0.88, 0, 0, 7); g.fill();
      g.strokeStyle = '#1d4f22'; g.lineWidth = 3.2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        for (let y = -r * 0.85; y <= r * 0.85; y += 4) {
          const x = i * r * 0.36 * Math.sqrt(1 - (y / r) ** 2) + Math.sin(y * 0.4) * 2;
          y === -r * 0.85 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.4, r * 0.2, r * 0.12, -0.6, 0, 7); g.fill();
    },
    goldapple(g, r) {
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.35, 2, 0, 0, r * 1.1);
      gr.addColorStop(0, '#fff6c2'); gr.addColorStop(0.45, '#ffd84a'); gr.addColorStop(1, '#c48a12');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -r * 0.6);
      g.bezierCurveTo(r * 1.1, -r * 1.1, r * 1.3, r * 0.6, 0, r * 0.95);
      g.bezierCurveTo(-r * 1.3, r * 0.6, -r * 1.1, -r * 1.1, 0, -r * 0.6); g.fill();
      g.strokeStyle = '#7a4a1a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.1, -r * 0.95); g.stroke();
      g.fillStyle = '#6cc04a'; g.beginPath(); g.ellipse(r * 0.38, -r * 0.88, r * 0.3, r * 0.13, -0.5, 0, 7); g.fill();
      g.fillStyle = '#fff'; star(g, -r * 0.4, -r * 0.2, r * 0.2); star(g, r * 0.35, r * 0.35, r * 0.12);
    },
    star(g, r) {
      g.fillStyle = '#fff3a8';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = i % 2 ? r * 0.45 : r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
      g.fillStyle = '#ffd34d';
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
        const rr = (i % 2 ? r * 0.45 : r) * 0.6;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath(); g.fill();
    },
  };

  ITEM_DRAW.wood = function (g, r) {
    // 丸太2本
    for (const [dy, len] of [[r * 0.35, r * 1.9], [-r * 0.35, r * 1.7]]) {
      g.fillStyle = '#a0683f';
      U.roundRect(g, -len / 2, dy - r * 0.34, len, r * 0.68, r * 0.34); g.fill();
      g.fillStyle = 'rgba(60,35,18,0.35)'; g.fillRect(-len / 2 + 4, dy - 1, len - 12, 2);
      g.fillStyle = '#e2b884';
      g.beginPath(); g.ellipse(len / 2 - r * 0.12, dy, r * 0.2, r * 0.33, 0, 0, 7); g.fill();
      g.strokeStyle = '#b88b55'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(len / 2 - r * 0.12, dy, r * 0.1, r * 0.17, 0, 0, 7); g.stroke();
    }
    g.fillStyle = '#5aa845'; g.beginPath(); g.ellipse(-r * 0.4, -r * 0.72, r * 0.28, r * 0.12, -0.4, 0, 7); g.fill();
  };
  ITEM_DRAW.stone = function (g, r) {
    g.fillStyle = '#868b94';
    g.beginPath(); g.moveTo(-r, r * 0.5); g.lineTo(-r * 0.8, -r * 0.4); g.lineTo(-r * 0.1, -r * 0.9); g.lineTo(r * 0.8, -r * 0.5); g.lineTo(r, r * 0.4); g.lineTo(r * 0.3, r * 0.85); g.closePath(); g.fill();
    g.fillStyle = '#b3b8c0';
    g.beginPath(); g.moveTo(-r * 0.8, -r * 0.4); g.lineTo(-r * 0.1, -r * 0.9); g.lineTo(r * 0.4, -r * 0.55); g.lineTo(-r * 0.2, -r * 0.1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(-r * 0.3, -r * 0.5, r * 0.12, 0, 7); g.fill();
  };

  // ---------- 木 ----------
  function makeTree(variant, r) {
    const w = r * 2 + 24, h = r * 2 + 80;
    return sprite(w, h, w / 2, h - 14, (g) => {
      const cx = w / 2, base = h - 14;
      // 幹
      g.fillStyle = variant === 3 ? '#5b4030' : '#7a5236';
      g.beginPath();
      g.moveTo(cx - 13, base); g.quadraticCurveTo(cx - 8, base - 30, cx - 9, base - 60);
      g.lineTo(cx + 9, base - 60); g.quadraticCurveTo(cx + 8, base - 30, cx + 13, base); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(cx + 2, base - 58, 6, 56);
      const cy = base - 60 - r * 0.75;
      const pal = [
        ['#2f6b35', '#3f8a40', '#5aa84f', '#86c66a'],
        ['#356f2d', '#4b8c34', '#6aad45', '#9cd36a'],
        ['#a85a7a', '#d77fa0', '#f0a7c0', '#ffd3e2'],
        ['#1f4f36', '#2d6a47', '#3f8758', '#5fa877'],
      ][variant];
      if (variant === 3) {
        // 針葉樹
        for (let i = 0; i < 4; i++) {
          const yy = base - 40 - i * r * 0.42;
          const ww = r * (1.05 - i * 0.2);
          g.fillStyle = pal[i % 2 ? 1 : 0];
          g.beginPath(); g.moveTo(cx - ww, yy); g.lineTo(cx, yy - r * 0.75); g.lineTo(cx + ww, yy); g.closePath(); g.fill();
          g.fillStyle = pal[2];
          g.beginPath(); g.moveTo(cx - ww * 0.2, yy - r * 0.2); g.lineTo(cx, yy - r * 0.7); g.lineTo(cx - ww * 0.7, yy - 4); g.closePath(); g.fill();
        }
        return;
      }
      const rnd = U.mulberry32(variant * 97 + r);
      g.fillStyle = pal[0];
      blob(g, cx, cy + 6, r, rnd);
      g.fillStyle = pal[1];
      blob(g, cx - r * 0.1, cy - r * 0.05, r * 0.85, rnd);
      g.fillStyle = pal[2];
      blob(g, cx - r * 0.25, cy - r * 0.25, r * 0.55, rnd);
      g.fillStyle = pal[3];
      for (let i = 0; i < 6; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * r * 0.6;
        g.beginPath(); g.arc(cx - r * 0.2 + Math.cos(a) * d, cy - r * 0.3 + Math.sin(a) * d * 0.7, 3 + rnd() * 5, 0, 7); g.fill();
      }
      if (variant === 1) {
        // 実のなる木
        g.fillStyle = '#e8414f';
        for (let i = 0; i < 5; i++) {
          const a = rnd() * Math.PI * 2, d = r * (0.3 + rnd() * 0.5);
          g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 4.5, 0, 7); g.fill();
        }
      }
    });
  }

  function blob(g, x, y, r, rnd) {
    g.beginPath();
    const n = 9;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.82 + rnd() * 0.22);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.86;
      if (i === 0) g.moveTo(px, py);
      else {
        const pa = ((i - 0.5) / n) * Math.PI * 2;
        g.quadraticCurveTo(x + Math.cos(pa) * r * 1.08, y + Math.sin(pa) * r * 0.95, px, py);
      }
    }
    g.closePath(); g.fill();
  }

  function makeRock(r, seed) {
    const w = r * 2.4, h = r * 2;
    return sprite(w, h, w / 2, h * 0.72, (g) => {
      const rnd = U.mulberry32(seed);
      const cx = w / 2, cy = h * 0.55;
      g.fillStyle = '#8a8f98';
      blob(g, cx, cy, r, rnd);
      g.fillStyle = '#a9aeb7';
      blob(g, cx - r * 0.2, cy - r * 0.25, r * 0.6, rnd);
      g.fillStyle = 'rgba(90,150,70,0.8)';
      g.beginPath(); g.ellipse(cx + r * 0.2, cy - r * 0.55, r * 0.4, r * 0.15, 0.2, 0, 7); g.fill();
    });
  }

  // ---------- おうち(大きな切り株) ----------
  function makeHouse() {
    const w = 260, h = 250;
    return sprite(w, h, w / 2, 205, (g) => {
      const cx = w / 2;
      // 根っこ
      g.fillStyle = '#6a4630';
      [[-110, 200, -60, 170], [110, 200, 60, 170], [-70, 214, -30, 185], [75, 214, 35, 185]].forEach(([x1, y1, x2, y2]) => {
        g.beginPath(); g.moveTo(cx + x1, y1); g.quadraticCurveTo(cx + x2, y1 - 6, cx + x2, y2); g.lineTo(cx + x2 + (x1 < 0 ? 30 : -30), y2); g.closePath(); g.fill();
      });
      // 幹(側面)
      const side = g.createLinearGradient(cx - 100, 0, cx + 100, 0);
      side.addColorStop(0, '#6e4a32'); side.addColorStop(0.35, '#97684a'); side.addColorStop(1, '#5a3b27');
      g.fillStyle = side;
      g.beginPath();
      g.moveTo(cx - 98, 80); g.lineTo(cx - 104, 196);
      g.quadraticCurveTo(cx, 222, cx + 104, 196); g.lineTo(cx + 98, 80); g.closePath(); g.fill();
      // 樹皮
      g.strokeStyle = 'rgba(50,30,18,0.45)'; g.lineWidth = 2;
      for (let i = -4; i <= 4; i++) {
        g.beginPath(); g.moveTo(cx + i * 22, 95 + Math.abs(i) * 2); g.quadraticCurveTo(cx + i * 23 + 4, 150, cx + i * 24, 200 - Math.abs(i) * 3); g.stroke();
      }
      // 上面(年輪)
      g.fillStyle = '#d9b07a';
      g.beginPath(); g.ellipse(cx, 80, 98, 34, 0, 0, 7); g.fill();
      g.strokeStyle = '#b88b55'; g.lineWidth = 2;
      for (let i = 1; i <= 4; i++) { g.beginPath(); g.ellipse(cx + 4, 80, 98 - i * 20, 34 - i * 7, 0, 0, 7); g.stroke(); }
      // うろ(とどけ口)
      g.fillStyle = '#3d2616';
      g.beginPath(); g.ellipse(cx + 4, 80, 30, 11, 0, 0, 7); g.fill();
      // こけの屋根
      g.fillStyle = '#5c9a45';
      g.beginPath(); g.ellipse(cx - 55, 62, 40, 14, -0.2, 0, 7); g.fill();
      g.fillStyle = '#76b55a';
      g.beginPath(); g.ellipse(cx - 60, 58, 22, 7, -0.2, 0, 7); g.fill();
      // とびら
      g.fillStyle = '#4a2e1c';
      g.beginPath(); g.moveTo(cx - 26, 205); g.lineTo(cx - 26, 160); g.arc(cx, 160, 26, Math.PI, 0); g.lineTo(cx + 26, 205); g.closePath(); g.fill();
      g.fillStyle = '#b5774a';
      g.beginPath(); g.moveTo(cx - 20, 205); g.lineTo(cx - 20, 161); g.arc(cx, 161, 20, Math.PI, 0); g.lineTo(cx + 20, 205); g.closePath(); g.fill();
      g.strokeStyle = '#8a5734'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx, 141); g.lineTo(cx, 205); g.stroke();
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(cx + 10, 180, 3, 0, 7); g.fill();
      // まど
      [[-62, 135], [62, 128]].forEach(([dx, y]) => {
        g.fillStyle = '#4a2e1c'; g.beginPath(); g.arc(cx + dx, y, 17, 0, 7); g.fill();
        g.fillStyle = '#ffe6a6'; g.beginPath(); g.arc(cx + dx, y, 12, 0, 7); g.fill();
        g.strokeStyle = '#4a2e1c'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(cx + dx - 12, y); g.lineTo(cx + dx + 12, y); g.moveTo(cx + dx, y - 12); g.lineTo(cx + dx, y + 12); g.stroke();
      });
      // きのこ飾り
      [[-90, 190, 14, '#e8414f'], [-75, 196, 9, '#f29b38'], [92, 186, 12, '#f29b38']].forEach(([dx, y, r, col]) => {
        g.fillStyle = '#f3e6cf'; g.fillRect(cx + dx - r * 0.25, y - r * 0.2, r * 0.5, r * 0.9);
        g.fillStyle = col; g.beginPath(); g.ellipse(cx + dx, y - r * 0.2, r, r * 0.65, 0, Math.PI, 0); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + dx - r * 0.3, y - r * 0.5, r * 0.17, 0, 7); g.fill();
      });
      // ポスト風の看板
      g.fillStyle = '#7a5236'; g.fillRect(cx + 50, 175, 5, 32);
      g.fillStyle = '#e9cf98'; U.roundRect(g, cx + 30, 160, 46, 22, 5); g.fill();
      g.fillStyle = '#6b4223'; g.font = `800 11px ${U.FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('おうち', cx + 53, 171.5);
    });
  }

  // ---------- かざり ----------
  const DECO_DRAW = {
    flowerbed(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#8a5c3c'; U.roundRect(g, cx - 30, h - 26, 60, 18, 8); g.fill();
      g.fillStyle = '#6a4630'; g.beginPath(); g.ellipse(cx, h - 25, 28, 7, 0, 0, 7); g.fill();
      const cols = ['#ff6f91', '#ffc75f', '#f9f871', '#c490ff', '#ff9671'];
      for (let i = 0; i < 9; i++) {
        const x = cx - 22 + (i % 5) * 11 + (i > 4 ? 5 : 0), y = h - 32 - (i > 4 ? 8 : 0);
        g.strokeStyle = '#4c9a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, h - 24); g.lineTo(x, y); g.stroke();
        g.fillStyle = cols[i % cols.length];
        for (let p = 0; p < 5; p++) { const a = p * 1.256; g.beginPath(); g.arc(x + Math.cos(a) * 3.5, y + Math.sin(a) * 3.5, 3, 0, 7); g.fill(); }
        g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill();
      }
    },
    lantern(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#4a3a30'; g.fillRect(cx - 2.5, 26, 5, h - 30);
      g.fillStyle = '#3a2d25'; g.fillRect(cx - 9, h - 8, 18, 5);
      g.fillStyle = '#4a3a30'; g.beginPath(); g.moveTo(cx - 12, 14); g.lineTo(cx, 4); g.lineTo(cx + 12, 14); g.closePath(); g.fill();
      g.fillStyle = '#ffd77a'; U.roundRect(g, cx - 9, 14, 18, 16, 3); g.fill();
      g.strokeStyle = '#4a3a30'; g.lineWidth = 2; g.strokeRect(cx - 9, 14, 18, 16);
      g.fillStyle = '#fff6d0'; g.beginPath(); g.ellipse(cx, 22, 3, 5, 0, 0, 7); g.fill();
    },
    bench(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#5a3b27';
      [[-24, 0], [20, 0]].forEach(([dx]) => g.fillRect(cx + dx, h - 22, 5, 18));
      g.fillStyle = '#a5714a'; U.roundRect(g, cx - 30, h - 28, 60, 9, 3); g.fill();
      g.fillStyle = '#b8835a'; U.roundRect(g, cx - 30, h - 46, 60, 7, 3); g.fill(); U.roundRect(g, cx - 30, h - 37, 60, 6, 3); g.fill();
      g.fillStyle = '#5a3b27'; g.fillRect(cx - 26, h - 46, 4, 20); g.fillRect(cx + 22, h - 46, 4, 20);
    },
    pinwheel(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#7a5236'; g.fillRect(cx - 2, 18, 4, h - 20);
    },
    mushhouse(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#f3e6cf'; U.roundRect(g, cx - 22, h - 44, 44, 40, 10); g.fill();
      g.fillStyle = '#d9763b'; g.beginPath(); g.ellipse(cx, h - 44, 38, 30, 0, Math.PI, 0); g.closePath(); g.fill();
      g.fillStyle = '#fff3dd';
      [[-18, -58, 6], [10, -64, 7], [24, -50, 4], [-2, -50, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(cx + x, h + y, r, 0, 7); g.fill(); });
      g.fillStyle = '#7a4a2a'; g.beginPath(); g.moveTo(cx - 8, h - 4); g.lineTo(cx - 8, h - 20); g.arc(cx, h - 20, 8, Math.PI, 0); g.lineTo(cx + 8, h - 4); g.fill();
      g.fillStyle = '#ffe6a6'; g.beginPath(); g.arc(cx + 14, h - 28, 4.5, 0, 7); g.fill();
    },
    fountain(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#a9aeb7'; g.beginPath(); g.ellipse(cx, h - 22, 42, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#8a8f98'; g.fillRect(cx - 42, h - 22, 84, 10); g.beginPath(); g.ellipse(cx, h - 12, 42, 14, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#6fc3e6'; g.beginPath(); g.ellipse(cx, h - 23, 35, 11, 0, 0, 7); g.fill();
      g.fillStyle = '#a9aeb7'; g.fillRect(cx - 5, h - 52, 10, 30);
      g.beginPath(); g.ellipse(cx, h - 52, 16, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#6fc3e6'; g.beginPath(); g.ellipse(cx, h - 53, 12, 4, 0, 0, 7); g.fill();
    },
    tower(g, w, h) {
      const cx = w / 2;
      g.fillStyle = '#8a5c3c'; g.beginPath(); g.moveTo(cx - 26, h - 6); g.lineTo(cx - 14, 70); g.lineTo(cx + 14, 70); g.lineTo(cx + 26, h - 6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.moveTo(cx + 4, h - 6); g.lineTo(cx + 4, 70); g.lineTo(cx + 14, 70); g.lineTo(cx + 26, h - 6); g.fill();
      g.fillStyle = '#ffe6a6'; g.beginPath(); g.arc(cx, 110, 6, 0, 7); g.fill(); g.beginPath(); g.arc(cx - 3, 150, 5, 0, 7); g.fill();
      // てっぺんの大どんぐり
      g.fillStyle = '#cf904f'; g.beginPath(); g.ellipse(cx, 48, 22, 26, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4223'; g.beginPath(); g.ellipse(cx, 34, 26, 16, 0, Math.PI, 0); g.ellipse(cx, 34, 26, 6, 0, 0, Math.PI); g.fill();
      g.strokeStyle = '#6b4223'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, 18); g.quadraticCurveTo(cx + 2, 10, cx + 8, 8); g.stroke();
      g.fillStyle = '#2b1a10'; g.beginPath(); g.arc(cx - 7, 52, 2.5, 0, 7); g.arc(cx + 7, 52, 2.5, 0, 7); g.fill();
    },
  };
  const DECO_SIZE = { flowerbed: [70, 50], lantern: [30, 70], bench: [70, 56], pinwheel: [40, 70], mushhouse: [84, 96], fountain: [92, 70], tower: [60, 220] };

  // ---------- 町の建物 ----------
  function wall(g, x, y, w, h, col, dark) {
    const gr = g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, col); gr.addColorStop(1, dark);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  function roofTri(g, x0, x1, top, base, col, dark) {
    g.fillStyle = dark;
    g.beginPath(); g.moveTo(x0 - 8, base + 6); g.lineTo((x0 + x1) / 2, top - 4); g.lineTo(x1 + 8, base + 6); g.closePath(); g.fill();
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x0 - 6, base); g.lineTo((x0 + x1) / 2, top); g.lineTo(x1 + 6, base); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      const yy = top + (base - top) * (i / 4), k = i / 4;
      g.beginPath(); g.moveTo((x0 + x1) / 2 - (x1 - x0 + 12) / 2 * k, yy); g.lineTo((x0 + x1) / 2 + (x1 - x0 + 12) / 2 * k, yy); g.stroke();
    }
  }
  function door(g, cx, base, w, h, col) {
    g.fillStyle = '#4a2e1c';
    g.beginPath(); g.moveTo(cx - w / 2 - 3, base); g.lineTo(cx - w / 2 - 3, base - h + w / 2); g.arc(cx, base - h + w / 2, w / 2 + 3, Math.PI, 0); g.lineTo(cx + w / 2 + 3, base); g.fill();
    g.fillStyle = col;
    g.beginPath(); g.moveTo(cx - w / 2, base); g.lineTo(cx - w / 2, base - h + w / 2); g.arc(cx, base - h + w / 2, w / 2, Math.PI, 0); g.lineTo(cx + w / 2, base); g.fill();
    g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(cx + w * 0.25, base - h * 0.4, 2.2, 0, 7); g.fill();
  }
  function win(g, x, y, w, h) {
    g.fillStyle = '#4a2e1c'; U.roundRect(g, x - 3, y - 3, w + 6, h + 6, 4); g.fill();
    g.fillStyle = '#ffe6a6'; U.roundRect(g, x, y, w, h, 3); g.fill();
    g.strokeStyle = '#4a2e1c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  }
  function sign(g, cx, y, text, bg, fg) {
    g.font = `800 13px ${U.FONT}`;
    const w = g.measureText(text).width + 16;
    g.fillStyle = bg; U.roundRect(g, cx - w / 2, y, w, 20, 6); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cx, y + 10.5);
  }
  function awning(g, x, y, w, c1, c2) {
    const n = 7, sw = w / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? c2 : c1;
      g.beginPath(); g.moveTo(x + i * sw, y); g.lineTo(x + (i + 1) * sw, y); g.lineTo(x + (i + 1) * sw, y + 12);
      g.arc(x + (i + 0.5) * sw, y + 12, sw / 2, 0, Math.PI); g.closePath(); g.fill();
    }
  }
  S.makeHouse2 = function (roof) {
    const w = 140, h = 132;
    return sprite(w, h, w / 2, h - 8, (g) => {
      const base = h - 8;
      wall(g, 24, base - 60, 92, 60, '#fff3dc', '#ead7b4');
      g.fillStyle = '#c9a66b'; g.fillRect(20, base - 4, 100, 6);
      roofTri(g, 24, 116, 14, base - 56, roof, shade(roof, 0.75));
      g.fillStyle = '#8a5c3c'; g.fillRect(92, 22, 12, 22);
      door(g, 70, base, 22, 38, '#b5774a');
      win(g, 34, base - 46, 20, 18); win(g, 86, base - 46, 20, 18);
      g.fillStyle = '#5aa845'; g.beginPath(); g.ellipse(30, base - 2, 12, 6, 0, 0, 7); g.ellipse(110, base - 2, 12, 6, 0, 0, 7); g.fill();
      g.fillStyle = '#ff8fab'; g.beginPath(); g.arc(26, base - 6, 3, 0, 7); g.arc(112, base - 6, 3, 0, 7); g.fill();
    });
  };
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * k), gg = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
    return `rgb(${r},${gg},${b})`;
  }
  S.shade = shade;
  const BUILD_DRAW = {
    bakery(g, w, h) {
      const base = h - 8;
      wall(g, 20, base - 70, w - 40, 70, '#fde2d6', '#f2c6b2');
      g.fillStyle = '#8a4b2a'; U.roundRect(g, 14, base - 92, w - 28, 26, 8); g.fill();
      awning(g, 22, base - 66, w - 44, '#e5484d', '#fff8e7');
      door(g, w / 2, base, 24, 36, '#b5774a');
      win(g, 32, base - 38, 26, 22); win(g, w - 58, base - 38, 26, 22);
      sign(g, w / 2, base - 90, 'パン屋', '#fff8e7', '#8a4b2a');
      g.fillStyle = '#d99a4e'; g.beginPath(); g.ellipse(w - 30, base - 102, 12, 7, -0.2, 0, 7); g.fill();
      g.strokeStyle = '#a86e38'; g.lineWidth = 1.5; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(w - 30 + i * 5 - 2, base - 106); g.lineTo(w - 30 + i * 5 + 2, base - 98); g.stroke(); }
    },
    cafe(g, w, h) {
      const base = h - 8;
      wall(g, 20, base - 70, w - 40, 70, '#dff3ea', '#c3e3d4');
      roofTri(g, 20, w - 20, base - 112, base - 66, '#4c9a7a', '#3b7a60');
      awning(g, 22, base - 64, w - 44, '#2f8f6b', '#fff8e7');
      door(g, w / 2, base, 24, 36, '#8a5c3c');
      win(g, 32, base - 38, 26, 22); win(g, w - 58, base - 38, 26, 22);
      sign(g, w / 2, base - 86, 'カフェ', '#fff8e7', '#2f6b55');
      g.fillStyle = '#fff'; U.roundRect(g, w - 40, base - 122, 16, 14, 3); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.arc(w - 23, base - 115, 4, -1.5, 1.5); g.stroke();
    },
    library(g, w, h) {
      const base = h - 8;
      wall(g, 18, base - 78, w - 36, 78, '#ece6da', '#d6ccb8');
      g.fillStyle = '#cfc4ad'; g.fillRect(10, base - 8, w - 20, 8); g.fillRect(14, base - 14, w - 28, 6);
      g.fillStyle = '#b9ad94';
      g.beginPath(); g.moveTo(8, base - 78); g.lineTo(w / 2, base - 120); g.lineTo(w - 8, base - 78); g.closePath(); g.fill();
      g.fillStyle = '#e8e1d2';
      g.beginPath(); g.moveTo(22, base - 82); g.lineTo(w / 2, base - 112); g.lineTo(w - 22, base - 82); g.closePath(); g.fill();
      g.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { const x = 30 + i * ((w - 60) / 4); if (Math.abs(x - w / 2) < 20) continue; g.fillRect(x - 5, base - 74, 10, 60); }
      door(g, w / 2, base - 14, 26, 44, '#7a4a2a');
      sign(g, w / 2, base - 104, '図書館', '#7a5236', '#fff8e7');
    },
    windmill(g, w, h) {
      const base = h - 8, cx = w / 2;
      g.fillStyle = '#e9dcc0';
      g.beginPath(); g.moveTo(cx - 34, base); g.lineTo(cx - 22, base - 120); g.lineTo(cx + 22, base - 120); g.lineTo(cx + 34, base); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.1)';
      g.beginPath(); g.moveTo(cx + 6, base); g.lineTo(cx + 4, base - 120); g.lineTo(cx + 22, base - 120); g.lineTo(cx + 34, base); g.closePath(); g.fill();
      g.fillStyle = '#b5651d';
      g.beginPath(); g.moveTo(cx - 28, base - 118); g.lineTo(cx, base - 146); g.lineTo(cx + 28, base - 118); g.closePath(); g.fill();
      door(g, cx, base, 18, 30, '#8a5c3c');
      win(g, cx - 8, base - 80, 16, 16);
    },
    clocktower(g, w, h) {
      const base = h - 8, cx = w / 2;
      wall(g, cx - 26, base - 170, 52, 170, '#efe4cc', '#d8c9a8');
      g.fillStyle = '#cfc4ad'; g.fillRect(cx - 32, base - 10, 64, 10);
      g.fillStyle = '#5b7fb5';
      g.beginPath(); g.moveTo(cx - 32, base - 168); g.lineTo(cx, base - 214); g.lineTo(cx + 32, base - 168); g.closePath(); g.fill();
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(cx, base - 218, 4, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, base - 140, 19, 0, 7); g.fill();
      g.strokeStyle = '#5a3b1e'; g.lineWidth = 3; g.beginPath(); g.arc(cx, base - 140, 19, 0, 7); g.stroke();
      door(g, cx, base - 10, 18, 30, '#7a4a2a');
      win(g, cx - 7, base - 96, 14, 18);
    },
  };
  const BUILD_SIZE = { bakery: [150, 140], cafe: [150, 150], library: [190, 150], windmill: [120, 170], clocktower: [90, 240] };

  // ---------- 住人(オリジナルのどうぶつ) ----------
  S.drawResident = function (ctx, r, t) {
    const d = DF.RESIDENTS[r.idx];
    const walk = r.moving ? Math.sin(t * 12 + r.id) : 0;
    const bob = r.moving ? Math.abs(walk) * 2 : Math.sin(t * 2 + r.id) * 0.6;
    const flip = r.face < 0;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.fillStyle = 'rgba(20,40,20,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 5.5, 0, 0, 7); ctx.fill();
    if (flip) ctx.scale(-1, 1);
    const fur = d.fur, dark = shade(fur.length === 7 ? fur : '#888888', 0.78);
    // しっぽ
    if (d.species === 'squirrel') {
      ctx.fillStyle = shade(fur, 0.9);
      ctx.beginPath(); ctx.ellipse(-16, -30 - bob, 10, 18, -0.4, 0, 7); ctx.fill();
    } else if (d.species === 'fox') {
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(-16, -16 - bob, 7, 13, -0.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-21, -24 - bob, 4, 5, -0.8, 0, 7); ctx.fill();
    }
    // あし
    ctx.fillStyle = d.species === 'penguin' ? '#f4a261' : dark;
    ctx.beginPath(); ctx.ellipse(-6, -3 - Math.max(0, walk) * 3, 5.5, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -3 - Math.max(0, -walk) * 3, 5.5, 4, 0, 0, 7); ctx.fill();
    ctx.translate(0, -bob);
    // ふく
    ctx.fillStyle = d.cloth; U.roundRect(ctx, -12, -30, 24, 24, 9); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-12, -25, 24, 3);
    ctx.fillStyle = fur;
    ctx.beginPath(); ctx.ellipse(-14, -19 + walk * 2, 4, 6.5, 0.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14, -19 - walk * 2, 4, 6.5, -0.2, 0, 7); ctx.fill();
    // 耳
    const hy = -46;
    ctx.fillStyle = fur;
    if (d.species === 'rabbit') {
      ctx.beginPath(); ctx.ellipse(-6, hy - 22, 4.5, 13, -0.15, 0, 7); ctx.ellipse(6, hy - 22, 4.5, 13, 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#f7a6b8'; ctx.beginPath(); ctx.ellipse(-6, hy - 22, 2, 9, -0.15, 0, 7); ctx.ellipse(6, hy - 22, 2, 9, 0.15, 0, 7); ctx.fill();
    } else if (d.species === 'bear' || d.species === 'squirrel') {
      ctx.beginPath(); ctx.arc(-12, hy - 12, 6, 0, 7); ctx.arc(12, hy - 12, 6, 0, 7); ctx.fill();
    } else if (d.species === 'cat' || d.species === 'fox') {
      const tall = d.species === 'fox' ? 18 : 13;
      ctx.beginPath(); ctx.moveTo(-15, hy - 6); ctx.lineTo(-11, hy - 6 - tall); ctx.lineTo(-3, hy - 12); ctx.closePath();
      ctx.moveTo(15, hy - 6); ctx.lineTo(11, hy - 6 - tall); ctx.lineTo(3, hy - 12); ctx.closePath(); ctx.fill();
    }
    // あたま
    if (d.species === 'sheep') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 13, hy + Math.sin(a) * 12, 7, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#f2dcc2'; ctx.beginPath(); ctx.ellipse(0, hy + 2, 10, 11, 0, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = fur; ctx.beginPath(); ctx.arc(0, hy, 15, 0, 7); ctx.fill();
    }
    if (d.species === 'dog') {
      ctx.fillStyle = shade(fur, 0.7);
      ctx.beginPath(); ctx.ellipse(-14, hy, 5, 10, 0.3, 0, 7); ctx.ellipse(14, hy, 5, 10, -0.3, 0, 7); ctx.fill();
    }
    if (d.species === 'fox') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, hy + 7, 9, 6, 0, 0, 7); ctx.fill(); }
    if (d.species === 'penguin') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, hy + 3, 10, 9, 0, 0, 7); ctx.fill(); }
    // かお
    if (r.dir !== 'back') {
      const ex = r.dir === 'side' ? 4 : 0;
      ctx.fillStyle = '#2b1a10';
      const eyes = r.dir === 'side' ? [6] : [-5.5, 5.5];
      const happy = r.happy > 0;
      for (const e of eyes) {
        if (happy) { ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(e, hy + 1, 2.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
        else { ctx.beginPath(); ctx.ellipse(e, hy, 2, 2.7, 0, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = 'rgba(255,120,120,0.45)';
      for (const e of eyes) { ctx.beginPath(); ctx.ellipse(e + (e < 0 ? -3.5 : 3.5), hy + 5.5, 3, 1.8, 0, 0, 7); ctx.fill(); }
      if (d.species === 'penguin') { ctx.fillStyle = '#f4a261'; ctx.beginPath(); ctx.moveTo(ex - 3, hy + 4); ctx.lineTo(ex + 3, hy + 4); ctx.lineTo(ex, hy + 8); ctx.fill(); }
      else { ctx.fillStyle = '#2b1a10'; ctx.beginPath(); ctx.arc(ex, hy + 5, 1.6, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  };

  S.drawBlades = function (ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.4);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#7a5236'; ctx.fillRect(-2, 0, 4, 58);
      ctx.fillStyle = 'rgba(255,248,231,0.95)'; ctx.fillRect(2, 12, 16, 44);
      ctx.strokeStyle = '#7a5236'; ctx.lineWidth = 1.2; ctx.strokeRect(2, 12, 16, 44);
      ctx.rotate(Math.PI / 2);
    }
    ctx.fillStyle = '#5a3b1e'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
    ctx.restore();
  };
  S.drawClockHands = function (ctx, x, y, hour) {
    const hA = ((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2;
    const mA = ((hour % 1)) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#2b1a10'; ctx.lineCap = 'round';
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(hA) * 9, y + Math.sin(hA) * 9); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(mA) * 14, y + Math.sin(mA) * 14); ctx.stroke();
  };

  S.init = function () {
    for (const k in DF.KIDS) {
      S.kid[k] = {};
      for (const dir of ['front', 'side', 'back']) {
        S.kid[k][dir] = sprite(36, 44, 18, 40, (g) => drawKid(g, DF.KIDS[k], dir));
      }
    }
    for (const k in DF.ITEMS) {
      const r = DF.ITEMS[k].r;
      const sz = r * 2.8;
      S.item[k] = sprite(sz, sz, sz / 2, sz / 2, (g) => { g.translate(sz / 2, sz / 2); ITEM_DRAW[k](g, r); });
    }
    S.tree = [makeTree(0, 74), makeTree(1, 66), makeTree(2, 62), makeTree(3, 56), makeTree(0, 92)];
    S.rock = [makeRock(22, 3), makeRock(30, 8), makeRock(18, 12)];
    S.house = makeHouse();
    S.building = {};
    for (const k in BUILD_DRAW) {
      const [w, h] = BUILD_SIZE[k];
      S.building[k] = sprite(w, h, w / 2, h - 8, (g) => BUILD_DRAW[k](g, w, h));
    }
    S.houseByRoof = {};
    for (const r of DF.RESIDENTS) S.houseByRoof[r.roof] = S.makeHouse2(r.roof);
    for (const k in DECO_DRAW) {
      const [w, h] = DECO_SIZE[k];
      S.deco[k] = sprite(w, h, w / 2, h - 6, (g) => DECO_DRAW[k](g, w, h));
    }
  };

  // 主人公(森のこども)。動きがあるので毎フレーム描く。
  S.drawPlayer = function (ctx, p, t) {
    const x = p.x, y = p.y;
    const walk = p.moving ? Math.sin(p.walkT * 14) : 0;
    const bob = p.moving ? Math.abs(Math.sin(p.walkT * 14)) * 2 : Math.sin(t * 2.4) * 0.6;
    const dir = p.dir; // front/back/side
    const flip = p.face < 0;
    ctx.save();
    ctx.translate(x, y);
    if (flip && dir === 'side') ctx.scale(-1, 1);
    // くつ
    ctx.fillStyle = '#6b3f22';
    ctx.beginPath(); ctx.ellipse(-6, -3 - Math.max(0, walk) * 3, 6, 4, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -3 - Math.max(0, -walk) * 3, 6, 4, 0, 0, 7); ctx.fill();
    ctx.translate(0, -bob);
    // からだ(オーバーオール)
    ctx.fillStyle = '#f7eedb';
    U.roundRect(ctx, -12, -36, 24, 16, 7); ctx.fill();
    ctx.fillStyle = '#3f7bb0';
    U.roundRect(ctx, -13, -27, 26, 22, 8); ctx.fill();
    ctx.fillStyle = '#356a99';
    ctx.fillRect(-9, -34, 4, 10); ctx.fillRect(5, -34, 4, 10);
    // かばん
    if (dir !== 'back') {
      ctx.fillStyle = '#c9884a'; U.roundRect(ctx, dir === 'side' ? -16 : 8, -22, 10, 11, 3); ctx.fill();
    } else {
      ctx.fillStyle = '#c9884a'; U.roundRect(ctx, -9, -30, 18, 16, 4); ctx.fill();
      ctx.fillStyle = '#a86e38'; ctx.fillRect(-9, -26, 18, 3);
    }
    // うで
    const throwA = p.throwT > 0 ? p.throwT / 0.25 : 0;
    ctx.fillStyle = '#f6d2b0';
    if (dir === 'side') {
      ctx.save(); ctx.translate(2, -30); ctx.rotate(-0.3 - throwA * 2.2 + walk * 0.4);
      ctx.beginPath(); ctx.ellipse(0, 7, 3.6, 7, 0, 0, 7); ctx.fill(); ctx.restore();
    } else {
      ctx.beginPath(); ctx.ellipse(-15, -24 + walk * 2, 3.6, 6.5, 0.2, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(15, -30); ctx.rotate(-throwA * 2.4 - walk * 0.2);
      ctx.beginPath(); ctx.ellipse(0, 6, 3.6, 6.5, -0.2, 0, 7); ctx.fill(); ctx.restore();
    }
    // あたま
    ctx.fillStyle = '#f6d2b0';
    ctx.beginPath(); ctx.arc(0, -47, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4a2a';
    if (dir === 'back') { ctx.beginPath(); ctx.arc(0, -48, 14, 0, 7); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.ellipse(dir === 'side' ? -6 : 0, -55, 13, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#2b1a10';
      const eyes = dir === 'side' ? [6] : [-5, 5];
      for (const e of eyes) { ctx.beginPath(); ctx.ellipse(e, -46, 1.9, 2.6, 0, 0, 7); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,120,120,0.5)';
      for (const e of eyes) { ctx.beginPath(); ctx.ellipse(e + (e < 0 ? -3 : 3), -41, 2.8, 1.6, 0, 0, 7); ctx.fill(); }
    }
    // むぎわらぼうし
    ctx.fillStyle = '#e9c86d';
    ctx.beginPath(); ctx.ellipse(0, -55, 23, 8.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2d78a';
    ctx.beginPath(); ctx.ellipse(0, -60, 13, 9, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9534f';
    ctx.fillRect(-13, -60, 26, 4);
    ctx.fillStyle = '#4c9a3a';
    ctx.beginPath(); ctx.ellipse(10, -62, 5, 2.5, -0.5, 0, 7); ctx.fill();
    ctx.restore();
  };

  S.drawPinwheel = function (ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y - 58); ctx.rotate(t * 3);
    const cols = ['#ff6f91', '#ffc75f', '#6fc3e6', '#9cd36a'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -3); ctx.lineTo(5, -14); ctx.closePath(); ctx.fill();
      ctx.rotate(Math.PI / 2);
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill();
    ctx.restore();
  };

  DF.Sprites = S;
})(window.DF);
