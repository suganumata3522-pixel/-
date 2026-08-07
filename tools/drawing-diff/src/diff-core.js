/* =====================================================================
   図面差分抽出 ― コア処理
   PDF のベクター図形（線・曲線・矩形）とテキストを1つずつ照合して
   追加/削除された要素を求める。

   ラスタ（画像）比較を使わない理由:
     CAD の PDF はハッチングが 0.1pt 幅の斜線で描かれており、
     再プロット時のごく僅かな位置差でも画素上では別の線になる。
     画像比較ではこれが全面ノイズとなり実際の変更が埋もれるため、
     図形そのものを座標で突き合わせる方式を採る。
   ===================================================================== */

const DiffCore = (() => {
  'use strict';

  // ---- 調整パラメータ ------------------------------------------------
  const MATCH_TOL = 0.9;   // 同一図形とみなす座標差(pt)。再プロット誤差を吸収
  const CELL      = 8;     // 空間ハッシュのセルサイズ(pt)
  const LONG      = 60;    // これを超える図形は端点だけを変更点として扱う(pt)
  const CLUSTER_GAP = 16;  // 変更点をまとめる距離(pt)
  const TEXT_TOL  = 2.0;   // 同じ文字が同じ位置にあるとみなす距離(pt)
  const TEXT_CELL = 8;     // テキスト照合の空間ハッシュのセルサイズ(pt)
  const MIN_PRIMS = 25;    // テキスト変更が無い場合に「有意」とみなす図形数
  const MAX_REGION = 300;  // 1つの変更箇所の最大の広がり(pt)。長い寸法線対策
  const MIN_GAP = 4;       // 再分割するときの下限の距離(pt)
  const MERGE_GAP = 0.5;   // 文字を1つにつなぐ許容の隙間（字の高さに対する割合）
  const MIN_PRIM = 1.0;    // これ未満の極小図形は変更箇所として扱わない(pt)

  // ---- 行列ユーティリティ --------------------------------------------
  const mul = (a, b) => [
    a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
  ];
  const apply = (m, x, y) => [x * m[0] + y * m[2] + m[4], x * m[1] + y * m[3] + m[5]];
  const IDENT = [1, 0, 0, 1, 0, 0];

  // 逆変換（マーキングPDFを書き出すとき、表示上の座標を
  // PDF本来の座標に戻すのに使う）
  function invert(m) {
    const det = m[0] * m[3] - m[1] * m[2];
    if (!det) return IDENT.slice();
    return [
      m[3] / det, -m[1] / det,
      -m[2] / det, m[0] / det,
      (m[2] * m[5] - m[3] * m[4]) / det,
      (m[1] * m[4] - m[0] * m[5]) / det
    ];
  }

  // 矩形を変換する（回転すると角の対応が変わるので4隅から取り直す）
  function transformRect(m, x0, y0, x1, y1) {
    const p = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x1, y1), apply(m, x0, y1)];
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  // =====================================================================
  // 1. ページからベクター図形を取り出す
  //    pdf.js の operator list を辿り、CTM(変換行列)を追跡して
  //    PDF ユーザ空間の座標に直したうえで、N を掛けて
  //    「画面に表示されるときの向き」に揃える。
  // =====================================================================
  async function extractPrims(page, OPS, M) {
    const N = M || IDENT;
    const ol = await page.getOperatorList();
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    const out = [];
    // CTM で PDF 座標に直したあと、さらに N で「表示上の向き」に揃える。
    // 同じ図面でも回転して保存されたPDFがあるため、向きを合わせないと
    // 全要素が別物になってしまう。
    const P = (x, y) => { const q = apply(ctm, x, y); return apply(N, q[0], q[1]); };

    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i];
      const a = ol.argsArray[i];

      if (fn === OPS.save) {
        stack.push(ctm.slice());
      } else if (fn === OPS.restore) {
        ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      } else if (fn === OPS.transform) {
        ctm = mul(ctm, a);
      } else if (fn === OPS.constructPath) {
        const ops = a[0], c = a[1];
        let k = 0, cx = 0, cy = 0, sx = 0, sy = 0;
        for (const op of ops) {
          if (op === OPS.moveTo) {
            const p = P(c[k], c[k + 1]); k += 2;
            cx = p[0]; cy = p[1]; sx = cx; sy = cy;
          } else if (op === OPS.lineTo) {
            const p = P(c[k], c[k + 1]); k += 2;
            out.push(['l', cx, cy, p[0], p[1]]); cx = p[0]; cy = p[1];
          } else if (op === OPS.curveTo) {
            const p1 = P(c[k], c[k + 1]),
                  p2 = P(c[k + 2], c[k + 3]),
                  p3 = P(c[k + 4], c[k + 5]); k += 6;
            out.push(['c', cx, cy, p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]]);
            cx = p3[0]; cy = p3[1];
          } else if (op === OPS.curveTo2) {
            const p1 = P(c[k], c[k + 1]), p2 = P(c[k + 2], c[k + 3]); k += 4;
            out.push(['c', cx, cy, cx, cy, p1[0], p1[1], p2[0], p2[1]]);
            cx = p2[0]; cy = p2[1];
          } else if (op === OPS.curveTo3) {
            const p1 = P(c[k], c[k + 1]), p2 = P(c[k + 2], c[k + 3]); k += 4;
            out.push(['c', cx, cy, p1[0], p1[1], p2[0], p2[1], p2[0], p2[1]]);
            cx = p2[0]; cy = p2[1];
          } else if (op === OPS.closePath) {
            if (cx !== sx || cy !== sy) out.push(['l', cx, cy, sx, sy]);
            cx = sx; cy = sy;
          } else if (op === OPS.rectangle) {
            const x = c[k], y = c[k + 1], w = c[k + 2], h = c[k + 3]; k += 4;
            const p0 = P(x, y), p1 = P(x + w, y),
                  p2 = P(x + w, y + h), p3 = P(x, y + h);
            out.push(['l', p0[0], p0[1], p1[0], p1[1]], ['l', p1[0], p1[1], p2[0], p2[1]],
                     ['l', p2[0], p2[1], p3[0], p3[1]], ['l', p3[0], p3[1], p0[0], p0[1]]);
            cx = p0[0]; cy = p0[1]; sx = cx; sy = cy;
          }
        }
      }
    }
    return out;
  }

  // =====================================================================
  // 2. ページからテキストを取り出す（位置つき）
  // =====================================================================
  async function extractTexts(page, M) {
    const N = M || IDENT;
    const tc = await page.getTextContent();
    const out = [];
    for (const it of tc.items) {
      const s = (it.str || '').trim();
      if (!s) continue;
      const [a, b, c, d, e, f] = it.transform;
      const w = it.width || 0, h = it.height || 0;

      // 縦書きや回転した文字では、文字送りの向きが x 方向とは限らない。
      // 変換行列から実際の外接矩形を求める。
      const la = Math.hypot(a, b) || 1, lc = Math.hypot(c, d) || 1;
      const ax = a / la * w, ay = b / la * w;   // 文字送りの向き
      const cx_ = c / lc * h, cy_ = d / lc * h; // 字の高さの向き
      const corners = [[e, f], [e + ax, f + ay],
                       [e + ax + cx_, f + ay + cy_], [e + cx_, f + cy_]]
                       .map(q => apply(N, q[0], q[1]));
      const xs = corners.map(q => q[0]);
      const ys = corners.map(q => q[1]);
      const org = apply(N, e, f);

      // 文字送りの向き（正規化後）。行のまとまりを判定するのに使う。
      const dirv = [corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]];
      const dl = Math.hypot(dirv[0], dirv[1]) || 1;

      out.push({
        s, x: org[0], y: org[1], w, h,
        _dx: dirv[0] / dl, _dy: dirv[1] / dl,
        x0: Math.min(...xs), y0: Math.min(...ys),
        x1: Math.max(...xs), y1: Math.max(...ys),
        cx: (Math.min(...xs) + Math.max(...xs)) / 2,
        cy: (Math.min(...ys) + Math.max(...ys)) / 2
      });
    }
    return mergeTextRuns(out);
  }

  // =====================================================================
  // 2.2 バラバラに切れたテキストを1つにつなぎ直す
  //     PDFの作り手によって、同じ「SL-2150芯」が
  //     ["SL-2150","芯"] と分かれていたり 1つだったりする。
  //     このままだと同じ文字が「変更」に見えてしまうので、
  //     両方を同じ規則でつなぎ直してから比べる。
  // =====================================================================
  function mergeTextRuns(items) {
    const groups = new Map();
    for (const t of items) {
      // 文字送りの向きと、その向きに直交する位置（行の位置）で仕分ける
      const dx = t._dx, dy = t._dy;
      const along = t.x * dx + t.y * dy;          // 行に沿った位置
      const across = -t.x * dy + t.y * dx;        // 行と直交する位置
      const key = Math.round(dx * 100) / 100 + ',' + Math.round(dy * 100) / 100 +
                  ',' + Math.round(across / 1.5);
      let g = groups.get(key); if (!g) { g = []; groups.set(key, g); }
      g.push({ t, along });
    }

    const out = [];
    for (const g of groups) {
      const arr = g[1].sort((p, q) => p.along - q.along);
      let cur = null, curEnd = 0;
      for (const { t, along } of arr) {
        const h = t.h || 8;
        if (cur && along - curEnd <= h * MERGE_GAP) {
          cur.s += t.s;
          cur.x0 = Math.min(cur.x0, t.x0); cur.y0 = Math.min(cur.y0, t.y0);
          cur.x1 = Math.max(cur.x1, t.x1); cur.y1 = Math.max(cur.y1, t.y1);
        } else {
          if (cur) out.push(finishRun(cur));
          cur = { s: t.s, x: t.x, y: t.y, w: t.w, h: t.h,
                  x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1 };
        }
        curEnd = along + (t.w || 0);
      }
      if (cur) out.push(finishRun(cur));
    }
    return out;
  }
  function finishRun(r) {
    r.cx = (r.x0 + r.x1) / 2;
    r.cy = (r.y0 + r.y1) / 2;
    return r;
  }

  // =====================================================================
  // 2.5 用紙の外にはみ出した要素を取り除く
  //     CADの出力には、図枠の外に置かれた申し送りメモやスタンプが
  //     残っていることがある。印刷されない領域なので図面の変更とは
  //     区別し、件数だけ知らせる。
  // =====================================================================
  function clipToView(prims, texts, view) {
    const [vx0, vy0, vx1, vy1] = view;
    const inside = (x, y) => x >= vx0 && x <= vx1 && y >= vy0 && y <= vy1;

    const keptP = [], keptT = [];
    let dropped = 0;
    for (const p of prims) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 1; i < p.length; i += 2) {
        if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
        if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
      }
      if (inside((x0 + x1) / 2, (y0 + y1) / 2)) keptP.push(p); else dropped++;
    }
    for (const t of texts) {
      if (inside(t.cx, t.cy)) keptT.push(t); else dropped++;
    }
    return { prims: keptP, texts: keptT, dropped };
  }

  // =====================================================================
  // 3. 2枚のあいだの全体的な位置ずれを推定する
  //    「同じ長さ・同じ向きの線」で、両方に1本ずつしか無いものを
  //    手掛かりに平行移動量を求め、中央値まわりの平均をとる。
  //    ※CADの再出力では図面全体が数mmずれることがあり、
  //      これを補正しないと全要素が「変更」と判定されてしまう。
  // =====================================================================
  function estimateOffset(A, B) {
    const r3 = v => Math.round(v * 1000) / 1000;
    const key = p => r3(p[3] - p[1]) + ',' + r3(p[4] - p[2]);
    const sa = new Map(), sb = new Map();
    for (const p of A) { if (p[0] !== 'l') continue; const k = key(p); (sa.get(k) || sa.set(k, []).get(k)).push(p); }
    for (const p of B) { if (p[0] !== 'l') continue; const k = key(p); (sb.get(k) || sb.set(k, []).get(k)).push(p); }

    const dxs = [], dys = [];
    for (const [k, va] of sa) {
      const vb = sb.get(k);
      if (va.length === 1 && vb && vb.length === 1) {
        dxs.push(va[0][1] - vb[0][1]);
        dys.push(va[0][2] - vb[0][2]);
      }
    }
    if (!dxs.length) return { dx: 0, dy: 0, samples: 0 };

    const med = arr => { const s = [...arr].sort((x, y) => x - y); return s[s.length >> 1]; };
    const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
    const mx = med(dxs), my = med(dys);
    const gx = dxs.filter(v => Math.abs(v - mx) < 0.5);
    const gy = dys.filter(v => Math.abs(v - my) < 0.5);
    return {
      dx: avg(gx.length ? gx : dxs),
      dy: avg(gy.length ? gy : dys),
      samples: dxs.length
    };
  }

  // =====================================================================
  // 4. 図形を1対1で突き合わせる（空間ハッシュ＋許容差つき）
  //    照合できなかったものが、そのまま 追加/削除 になる。
  // =====================================================================
  function matchPrims(A, B, dx, dy) {
    const Bs = B.map(p => {
      const q = [p[0]];
      for (let i = 1; i < p.length; i += 2) q.push(p[i] + dx, p[i + 1] + dy);
      return q;
    });

    const center = p => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 1; i < p.length; i += 2) {
        if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
        if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
      }
      return [(x0 + x1) / 2, (y0 + y1) / 2];
    };

    const grid = new Map();
    Bs.forEach((p, i) => {
      const [cx, cy] = center(p);
      const k = Math.floor(cx / CELL) + ':' + Math.floor(cy / CELL);
      let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
      arr.push(i);
    });

    const used = new Uint8Array(Bs.length);
    const added = [];

    for (const p of A) {
      const [cx, cy] = center(p);
      const gx = Math.floor(cx / CELL), gy = Math.floor(cy / CELL);
      let found = -1;

      outer:
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const arr = grid.get((gx + ox) + ':' + (gy + oy));
          if (!arr) continue;
          for (const ib of arr) {
            if (used[ib]) continue;
            const q = Bs[ib];
            if (q[0] !== p[0] || q.length !== p.length) continue;
            let ok = true;
            for (let i = 1; i < p.length; i++) {
              if (Math.abs(p[i] - q[i]) > MATCH_TOL) { ok = false; break; }
            }
            if (ok) { found = ib; break outer; }
            // 線は始点・終点が逆でも同じ線とみなす
            if (p[0] === 'l' &&
                Math.abs(p[1] - q[3]) <= MATCH_TOL && Math.abs(p[2] - q[4]) <= MATCH_TOL &&
                Math.abs(p[3] - q[1]) <= MATCH_TOL && Math.abs(p[4] - q[2]) <= MATCH_TOL) {
              found = ib; break outer;
            }
          }
        }
      }
      if (found >= 0) used[found] = 1; else added.push(p);
    }

    const deleted = [];
    for (let i = 0; i < Bs.length; i++) if (!used[i]) deleted.push(Bs[i]);
    return { added, deleted };
  }

  // --- 極小の図形を落とす ---------------------------------------------
  //     PDFの作り手が違うと、寸法点のドットのような小さな印が
  //     別の描き方（微小なベジェ曲線の集まりなど）で出力される。
  //     1pt未満の図形だけの差は図面の変更ではないので対象から外す。
  function filterTiny(prims, minLen) {
    const lim = minLen == null ? MIN_PRIM : minLen;
    return prims.filter(p => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 1; i < p.length; i += 2) {
        if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
        if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
      }
      return Math.hypot(x1 - x0, y1 - y0) >= lim;
    });
  }

  // =====================================================================
  // 5. テキストの差分
  // =====================================================================
  function diffTexts(TA, TB, dx, dy) {
    // ずれを補正した旧図面のテキスト
    const B = TB.map(t => ({
      s: t.s, cx: t.cx + dx, cy: t.cy + dy,
      x0: t.x0 + dx, y0: t.y0 + dy, x1: t.x1 + dx, y1: t.y1 + dy
    }));

    // 文字列ごとに空間ハッシュを作り、許容差の中で1対1に対応づける。
    // 座標を格子に丸めて突き合わせる方式だと、境界をまたいだだけの
    // 0.1pt の差でも「別物」になり、作図しなおしの誤差を大量に
    // 「移動」として拾ってしまうため。
    const grid = new Map();
    B.forEach((t, i) => {
      const k = t.s + '|' + Math.floor(t.cx / TEXT_CELL) + '|' + Math.floor(t.cy / TEXT_CELL);
      let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(i);
    });

    const used = new Uint8Array(B.length);
    const added = [];
    for (const t of TA) {
      const gx = Math.floor(t.cx / TEXT_CELL), gy = Math.floor(t.cy / TEXT_CELL);
      let found = -1, bestD = Infinity;
      for (let ox = -1; ox <= 1 && found !== -2; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const arr = grid.get(t.s + '|' + (gx + ox) + '|' + (gy + oy));
          if (!arr) continue;
          for (const ib of arr) {
            if (used[ib]) continue;
            const d = Math.abs(B[ib].cx - t.cx) + Math.abs(B[ib].cy - t.cy);
            if (d <= TEXT_TOL * 2 && d < bestD) { bestD = d; found = ib; }
          }
        }
      }
      if (found >= 0) used[found] = 1; else added.push(t);
    }
    const deleted = [];
    for (let i = 0; i < B.length; i++) if (!used[i]) deleted.push(B[i]);
    return { added, deleted };
  }

  // =====================================================================
  // 6. 変更点を近いものどうしまとめて「変更箇所」にする
  //    長い線は全体を囲むと図面の端から端まで1箇所になってしまうため、
  //    端点だけを変更点として扱う。
  // =====================================================================
  function toUnits(prims, tag) {
    const u = [];
    for (const p of prims) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (let i = 1; i < p.length; i += 2) {
        if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i];
        if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
      }
      if (Math.hypot(x1 - x0, y1 - y0) <= LONG) {
        u.push({ x0, y0, x1, y1, tag });
      } else {
        for (let i = 1; i < p.length; i += 2) {
          u.push({ x0: p[i] - 4, y0: p[i + 1] - 4, x1: p[i] + 4, y1: p[i + 1] + 4, tag });
        }
      }
    }
    return u;
  }

  function clusterUnits(U, gap) {
    const n = U.length;
    const par = new Int32Array(n); for (let i = 0; i < n; i++) par[i] = i;
    const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par[rb] = ra; };

    const grid = new Map();
    for (let i = 0; i < n; i++) {
      const b = U[i];
      for (let gx = Math.floor(b.x0 / gap); gx <= Math.floor(b.x1 / gap); gx++)
        for (let gy = Math.floor(b.y0 / gap); gy <= Math.floor(b.y1 / gap); gy++) {
          const k = gx + ':' + gy; let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(i);
        }
    }
    for (let i = 0; i < n; i++) {
      const b = U[i];
      for (let gx = Math.floor(b.x0 / gap) - 1; gx <= Math.floor(b.x1 / gap) + 1; gx++)
        for (let gy = Math.floor(b.y0 / gap) - 1; gy <= Math.floor(b.y1 / gap) + 1; gy++) {
          const arr = grid.get(gx + ':' + gy); if (!arr) continue;
          for (const j of arr) {
            if (j <= i) continue;
            const a = U[j];
            if (b.x0 - gap <= a.x1 && a.x0 - gap <= b.x1 && b.y0 - gap <= a.y1 && a.y0 - gap <= b.y1) uni(i, j);
          }
        }
    }
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i); let g = groups.get(r); if (!g) { g = []; groups.set(r, g); } g.push(i);
    }
    return [...groups.values()];
  }

  // --- 広がりすぎた塊を、より短い距離で分け直す ------------------------
  //     連続寸法線は端点どうしが近く、そのままだと図面の端から端まで
  //     ひとつながりの「変更箇所」になってしまうため。
  function splitOversized(U, group, gap) {
    const box = idxs => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const i of idxs) {
        const u = U[i];
        if (u.x0 < x0) x0 = u.x0; if (u.y0 < y0) y0 = u.y0;
        if (u.x1 > x1) x1 = u.x1; if (u.y1 > y1) y1 = u.y1;
      }
      return [x0, y0, x1, y1];
    };
    const [x0, y0, x1, y1] = box(group);
    if ((x1 - x0 <= MAX_REGION && y1 - y0 <= MAX_REGION) || gap <= MIN_GAP) return [group];

    const sub = group;
    const local = sub.map(i => U[i]);
    const parts = clusterUnits(local, Math.max(MIN_GAP, Math.floor(gap / 2)));
    if (parts.length <= 1) return [group];               // これ以上分けられない
    const out = [];
    for (const part of parts) {
      out.push(...splitOversized(U, part.map(k => sub[k]), Math.max(MIN_GAP, Math.floor(gap / 2))));
    }
    return out;
  }

  // --- 大きな文字など、自分の大きさに比べて近い塊どうしを結合する ------
  //     170pt の見出し文字は1字ずつ離れているので、固定距離では
  //     1文字＝1箇所になってしまう。大きさに比例した距離で寄せる。
  function mergeProportional(regions) {
    let merged = true;
    while (merged) {
      merged = false;
      outer:
      for (let i = 0; i < regions.length; i++) {
        for (let j = i + 1; j < regions.length; j++) {
          const a = regions[i], b = regions[j];
          // 判定にはマージ後の大きさではなく「元の塊の大きさ」(_seed) を使う。
          // マージ後の値を使うと、大きくなるほど条件が緩んで際限なく
          // 吸収してしまう（ページ全体が1箇所になる）。
          const sa = a._seed, sb = b._seed;
          const allow = Math.min(Math.max(a._gap, 0.5 * Math.min(sa, sb)), MAX_REGION / 2);
          const gapX = Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1));
          const gapY = Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1));
          if (gapX > allow || gapY > allow) continue;
          const nx0 = Math.min(a.x0, b.x0), ny0 = Math.min(a.y0, b.y0);
          const nx1 = Math.max(a.x1, b.x1), ny1 = Math.max(a.y1, b.y1);
          if (nx1 - nx0 > MAX_REGION || ny1 - ny0 > MAX_REGION) continue;
          a.x0 = nx0; a.y0 = ny0; a.x1 = nx1; a.y1 = ny1;
          a.prims += b.prims; a.nNew += b.nNew; a.nOld += b.nOld;
          a._seed = Math.max(sa, sb);
          regions.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
    return regions;
  }

  // =====================================================================
  // 7. 通り芯（SX1, SY2, NX8 …）で位置を言い表す
  // =====================================================================
  // 通り芯記号: X1 / SX1 / NX8 / SY2 など「X・Yを含む記号＋数字」を対象とする。
  // S1(スラブ)・C3(柱)・B1(梁) などの部材記号を拾わないよう X|Y を必須にしている。
  const GRID_RE = /^[A-Z]{0,2}[XY]\d+$/;
  function buildGridIndex(texts) {
    const fam = new Map();
    for (const t of texts) {
      if (!GRID_RE.test(t.s)) continue;
      const pre = t.s.match(/^[A-Z]+/)[0];
      let a = fam.get(pre); if (!a) { a = []; fam.set(pre, a); } a.push(t);
    }
    const idx = [];
    for (const [pre, v] of fam) {
      if (v.length < 2) continue;
      const xs = v.map(t => t.cx), ys = v.map(t => t.cy);
      const spreadX = Math.max(...xs) - Math.min(...xs);
      const spreadY = Math.max(...ys) - Math.min(...ys);
      idx.push({ pre, axis: spreadX > spreadY ? 'x' : 'y', items: v });
    }
    return idx;
  }
  function nearestGrid(idx, cx, cy) {
    const names = [];
    for (const f of idx) {
      const c = f.axis === 'x' ? cx : cy;
      let best = null, bd = Infinity;
      for (const t of f.items) {
        const d = Math.abs((f.axis === 'x' ? t.cx : t.cy) - c);
        if (d < bd) { bd = d; best = t; }
      }
      if (best) names.push(best.s);
    }
    return [...new Set(names)].sort().join(' / ');
  }

  // =====================================================================
  // 8. 1ページ分の差分をまとめる
  // =====================================================================
  function buildRegions(pageIndex, primDiff, textDiff, textsNew, opts) {
    const gap = (opts && opts.clusterGap) || CLUSTER_GAP;
    const minPrims = (opts && opts.minPrims) || MIN_PRIMS;

    // 図形の変更に加えて、文字の変更そのものも変更点として扱う。
    // 寸法値の打ち替えのように図形が全く動かない修正は、
    // 図形だけを見ていると取りこぼしてしまう。
    const textUnit = (t, tag) => ({
      x0: t.x0 != null ? t.x0 : t.cx, y0: t.y0 != null ? t.y0 : t.cy,
      x1: t.x1 != null ? t.x1 : t.cx, y1: t.y1 != null ? t.y1 : t.cy, tag
    });
    const U = toUnits(primDiff.added, 'new')
      .concat(toUnits(primDiff.deleted, 'old'))
      .concat(textDiff.added.map(t => textUnit(t, 'new')))
      .concat(textDiff.deleted.map(t => textUnit(t, 'old')));
    if (!U.length) return [];

    // まとめる → 広がりすぎたものは分け直す → 大きさに比例して寄せ直す
    let groups = [];
    for (const g of clusterUnits(U, gap)) groups.push(...splitOversized(U, g, gap));
    const gridIdx = buildGridIndex(textsNew);

    const regions = [];
    for (const g of groups) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, nNew = 0, nOld = 0;
      for (const i of g) {
        const u = U[i];
        if (u.x0 < x0) x0 = u.x0; if (u.y0 < y0) y0 = u.y0;
        if (u.x1 > x1) x1 = u.x1; if (u.y1 > y1) y1 = u.y1;
        if (u.tag === 'new') nNew++; else nOld++;
      }
      regions.push({
        page: pageIndex, x0, y0, x1, y1,
        prims: g.length, nNew, nOld, _gap: gap,
        _seed: Math.hypot(x1 - x0, y1 - y0)   // マージ前の大きさを覚えておく
      });
    }

    mergeProportional(regions);

    // 位置が確定してからテキスト差分を割り当てる
    for (const r of regions) {
      const pad = 8;
      const inBox = t => t.cx >= r.x0 - pad && t.cx <= r.x1 + pad && t.cy >= r.y0 - pad && t.cy <= r.y1 + pad;
      const addI = textDiff.added.filter(inBox);
      const delI = textDiff.deleted.filter(inBox);
      r.addedText = addI.map(t => t.s);
      r.deletedText = delI.map(t => t.s);
      r.grid = nearestGrid(gridIdx, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);

      // 同じ場所の文字を「読む順」につないで比べる。
      // PDFの作り手によって文字の区切り方が違うだけの場合
      // （"通"＋"SL-950芯" と "通SL-950芯" など）はここで一致するので、
      // 変更ではないと判定できる。
      const norm = items => items.map(t => t.s).join('').replace(/[\s　]+/g, '');
      const seq = items => norm(items.slice().sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx)));
      const chars = items => norm(items).split('').sort().join('');
      // 縦書きラベルなどでは並び順が読み順と一致しないことがあるため、
      // 「区切りの個数が違う＋使われている文字が同じ」も区切り差とみなす。
      // 値の入れ替え（1,030→1,300 など）は個数が変わらないので誤判定しない。
      r.textSameContent = addI.length > 0 && delI.length > 0 && (
        seq(addI) === seq(delI) ||
        (addI.length !== delI.length && chars(addI) === chars(delI))
      );

      // 文字は同じで位置だけ動いた場合は「移動」として区別する
      const sa = [...new Set(r.addedText)].sort().join('');
      const sd = [...new Set(r.deletedText)].sort().join('');
      r.movedOnly = r.addedText.length > 0 && sa === sd;

      // 区切り方が違うだけなら、文字の変更としては数えない
      const realTextChange = (r.addedText.length + r.deletedText.length) > 0 && !r.textSameContent;
      r.significant = realTextChange || r.prims >= minPrims;
      delete r._gap; delete r._seed;
    }

    regions.sort((a, b) => {
      const score = r => ((r.movedOnly || r.textSameContent)
        ? 0 : (r.addedText.length + r.deletedText.length)) * 1000 + r.prims;
      return score(b) - score(a);
    });
    return regions;
  }

  return {
    extractPrims, extractTexts, clipToView, estimateOffset, matchPrims,
    diffTexts, buildRegions, invert, transformRect, apply, filterTiny,
    params: { MATCH_TOL, CLUSTER_GAP, MIN_PRIMS }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = DiffCore;
