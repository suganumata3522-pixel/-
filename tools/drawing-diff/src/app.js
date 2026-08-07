/* =====================================================================
   図面差分抽出ツール ― 画面まわり
   ===================================================================== */
(() => {
  'use strict';

  const pdfjsLib = window.pdfjsLib;
  const { PDFDocument, rgb } = window.PDFLib;

  const $ = id => document.getElementById(id);
  const state = {
    oldFile: null, newFile: null,
    result: null,          // { pages:[{regions, offset, ...}], ... }
    canvases: null,        // { scale, old:[canvas], new:[canvas] }
    selected: null
  };

  // ---- ファイル選択 ---------------------------------------------------
  function setupDrop(zoneId, which) {
    const zone = $(zoneId);
    const input = zone.querySelector('input[type=file]');

    const accept = file => {
      if (!file) return;
      if (!/\.pdf$/i.test(file.name)) { alert('PDFファイルを選んでください'); return; }
      state[which] = file;
      zone.classList.add('filled');
      zone.querySelector('.zone-file').textContent = file.name;
      zone.querySelector('.zone-size').textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
      refreshRunButton();
    };

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', e => accept(e.target.files[0]));
    ['dragenter', 'dragover'].forEach(ev =>
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev =>
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove('over'); }));
    zone.addEventListener('drop', e => accept(e.dataTransfer.files[0]));
  }

  function refreshRunButton() {
    $('btn-run').disabled = !(state.oldFile && state.newFile);
  }

  // ---- 進捗表示 -------------------------------------------------------
  function progress(msg, pct) {
    $('progress-wrap').hidden = false;
    $('progress-text').textContent = msg;
    $('progress-bar').style.width = (pct == null ? 0 : Math.round(pct * 100)) + '%';
  }
  const idle = () => new Promise(r => setTimeout(r, 0));

  // ---- 差分抽出の本体 -------------------------------------------------
  async function run() {
    $('btn-run').disabled = true;
    $('results').hidden = true;
    state.canvases = null;
    state.selected = null;

    try {
      progress('PDFを読み込んでいます…', 0.02);
      const oldBytes = new Uint8Array(await state.oldFile.arrayBuffer());
      const newBytes = new Uint8Array(await state.newFile.arrayBuffer());

      const docOld = await pdfjsLib.getDocument({ data: oldBytes.slice() }).promise;
      const docNew = await pdfjsLib.getDocument({ data: newBytes.slice() }).promise;

      const nPages = Math.min(docOld.numPages, docNew.numPages);
      const pageWarn = docOld.numPages !== docNew.numPages
        ? `ページ数が異なります（旧 ${docOld.numPages}／新 ${docNew.numPages}）。先頭 ${nPages} ページのみ比較しました。`
        : null;

      const OPS = pdfjsLib.OPS;
      const pages = [];

      for (let i = 1; i <= nPages; i++) {
        progress(`${i} / ${nPages} ページ目を解析しています…`, 0.05 + 0.8 * (i - 1) / nPages);
        await idle();

        const pOld = await docOld.getPage(i);
        const pNew = await docNew.getPage(i);

        // 同じ図面でも、回転して保存されたPDFと回転していないPDFがある。
        // 表示上の向きに揃えてから比較する。
        const mOld = pOld.getViewport({ scale: 1 }).transform;
        const mNew = pNew.getViewport({ scale: 1 }).transform;

        const rawPrimsOld = await DiffCore.extractPrims(pOld, OPS, mOld);
        const rawPrimsNew = await DiffCore.extractPrims(pNew, OPS, mNew);
        const rawTextOld = await DiffCore.extractTexts(pOld, mOld);
        const rawTextNew = await DiffCore.extractTexts(pNew, mNew);
        await idle();

        // 図枠の外に置かれた要素は比較の対象から外す
        const viewOld = DiffCore.transformRect(mOld, pOld.view[0], pOld.view[1], pOld.view[2], pOld.view[3]);
        const viewNew = DiffCore.transformRect(mNew, pNew.view[0], pNew.view[1], pNew.view[2], pNew.view[3]);
        const clipOld = DiffCore.clipToView(rawPrimsOld, rawTextOld, viewOld);
        const clipNew = DiffCore.clipToView(rawPrimsNew, rawTextNew, viewNew);
        const primsOld = clipOld.prims, primsNew = clipNew.prims;
        const textOld = clipOld.texts, textNew = clipNew.texts;

        const off = DiffCore.estimateOffset(primsNew, primsOld);
        const pdRaw = DiffCore.matchPrims(primsNew, primsOld, off.dx, off.dy);
        // 極小図形だけの差はPDFの作り手の違いなので落とす
        const pd = { added: DiffCore.filterTiny(pdRaw.added),
                     deleted: DiffCore.filterTiny(pdRaw.deleted) };
        const td = DiffCore.diffTexts(textNew, textOld, off.dx, off.dy);
        const regions = DiffCore.buildRegions(i, pd, td, textNew, {});

        pages.push({
          index: i, offset: off,
          counts: { primsOld: primsOld.length, primsNew: primsNew.length,
                    added: pd.added.length, deleted: pd.deleted.length,
                    outside: clipOld.dropped + clipNew.dropped },
          regions,
          viewBox: pNew.view, rotate: pNew.rotate,
          // マーキングPDFを書き出すときに、表示座標をPDF座標へ戻すのに使う
          toPdf: DiffCore.invert(mNew)
        });
      }

      progress('結果をまとめています…', 0.92);
      state.result = { pages, nPages, pageWarn, oldBytes, newBytes, docOld, docNew };
      renderResults();
      progress('完了', 1);
      setTimeout(() => { $('progress-wrap').hidden = true; }, 600);
    } catch (err) {
      console.error(err);
      progress('エラー: ' + err.message, 0);
      alert('解析に失敗しました:\n' + err.message);
    } finally {
      refreshRunButton();
    }
  }

  // ---- 結果の一覧表示 -------------------------------------------------
  function significantRegions(showAll) {
    const out = [];
    for (const p of state.result.pages)
      for (const r of p.regions)
        if (showAll || r.significant) out.push(r);
    return out;
  }

  function renderResults() {
    const showAll = $('chk-showall').checked;
    const regions = significantRegions(showAll);
    const res = state.result;

    // サマリ
    const sum = $('summary');
    sum.innerHTML = '';
    const rows = [
      ['比較ページ数', `${res.nPages} ページ`],
      ['検出した変更箇所', `${regions.length} 箇所`]
    ];
    for (const p of res.pages) {
      const shifted = Math.hypot(p.offset.dx, p.offset.dy) > 0.05;
      rows.push([`${p.index}ページ目`,
        `変更箇所 ${p.regions.filter(r => showAll || r.significant).length} 箇所` +
        `（図形 追加${p.counts.added} / 削除${p.counts.deleted}）` +
        (shifted
          ? ` ※図面全体が ${ptToMm(p.offset.dx)}×${ptToMm(p.offset.dy)}mm ずれていたため自動補正しました`
          : '') +
        (p.counts.outside ? ` ※図枠外の要素 ${p.counts.outside} 個は対象外` : '')]);
    }
    for (const [k, v] of rows) {
      const d = document.createElement('div');
      d.className = 'sum-row';
      d.innerHTML = `<span class="sum-k"></span><span class="sum-v"></span>`;
      d.querySelector('.sum-k').textContent = k;
      d.querySelector('.sum-v').textContent = v;
      sum.appendChild(d);
    }
    if (res.pageWarn) {
      const w = document.createElement('div');
      w.className = 'warn';
      w.textContent = res.pageWarn;
      sum.appendChild(w);
    }

    // 一覧
    const list = $('region-list');
    list.innerHTML = '';
    regions.forEach((r, i) => {
      r._no = i + 1;
      const li = document.createElement('button');
      li.className = 'region';
      li.type = 'button';

      const head = document.createElement('div');
      head.className = 'region-head';
      head.innerHTML = `<span class="badge"></span><span class="loc"></span>`;
      head.querySelector('.badge').textContent = `${r.page}P-${i + 1}`;
      head.querySelector('.loc').textContent = r.grid ? `通り芯 ${r.grid} 付近` : '';
      li.appendChild(head);

      const body = document.createElement('div');
      body.className = 'region-body';
      if (r.movedOnly) {
        const p = document.createElement('div');
        p.className = 'txt none';
        p.textContent = '位置移動: ' + uniqJoin(r.addedText) + '（文字は同じ）';
        body.appendChild(p);
      } else {
        if (r.deletedText.length) {
          const p = document.createElement('div');
          p.className = 'txt old';
          p.textContent = '旧: ' + uniqJoin(r.deletedText);
          body.appendChild(p);
        }
        if (r.addedText.length) {
          const p = document.createElement('div');
          p.className = 'txt new';
          p.textContent = '新: ' + uniqJoin(r.addedText);
          body.appendChild(p);
        }
        if (!r.deletedText.length && !r.addedText.length) {
          const p = document.createElement('div');
          p.className = 'txt none';
          p.textContent = `図形のみの変更（${r.prims} 要素）`;
          body.appendChild(p);
        }
      }
      li.appendChild(body);
      li.addEventListener('click', () => selectRegion(r));
      list.appendChild(li);
    });

    $('region-count').textContent = regions.length;
    $('results').hidden = false;
    if (regions.length) selectRegion(regions[0]);
    else $('preview').innerHTML = '<p class="empty">変更箇所は見つかりませんでした。</p>';
  }

  const uniqJoin = arr => [...new Set(arr)].join(' , ');
  const ptToMm = pt => (Math.abs(pt) * 25.4 / 72).toFixed(1);
  const q = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';

  // ---- 対象箇所の新旧比較を描く ---------------------------------------
  async function ensureCanvases() {
    if (state.canvases) return state.canvases;
    const res = state.result;
    // A1図面でもメモリが破綻しないよう、総画素数から倍率を決める
    const p0 = res.pages[0];
    const wpt = p0.viewBox[2] - p0.viewBox[0], hpt = p0.viewBox[3] - p0.viewBox[1];
    const scale = Math.min(3.0, Math.max(1.5, Math.sqrt(20e6 / (wpt * hpt))));

    const mk = async (doc, i) => {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale });
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      await page.render({ canvasContext: cv.getContext('2d', { alpha: false }), viewport: vp }).promise;
      return { cv, vp };
    };

    const oldC = [], newC = [];
    for (let i = 1; i <= res.nPages; i++) {
      progress(`比較画像を準備しています… (${i}/${res.nPages})`, 0.3 + 0.6 * (i - 1) / res.nPages);
      await idle();
      oldC.push(await mk(res.docOld, i));
      newC.push(await mk(res.docNew, i));
    }
    $('progress-wrap').hidden = true;
    state.canvases = { scale, old: oldC, new: newC };
    return state.canvases;
  }

  // 変更箇所をキャンバス上の矩形に直す。
  // 変更箇所の座標は既に「表示上の向き・倍率1」に揃えてあるので、
  // 描画倍率を掛けるだけでよい。
  function regionRect(scale, r, padPt) {
    const pad = padPt == null ? 26 : padPt;
    return {
      x: (r.x0 - pad) * scale, y: (r.y0 - pad) * scale,
      w: (r.x1 - r.x0 + pad * 2) * scale,
      h: (r.y1 - r.y0 + pad * 2) * scale
    };
  }

  async function buildComparison(r, minPx) {
    const c = await ensureCanvases();
    const pi = r.page - 1;
    const oldE = c.old[pi], newE = c.new[pi];
    const rc = regionRect(c.scale, r);

    // 小さすぎる箇所は周囲を足して見やすくする
    const want = minPx || 420;
    const cx = rc.x + rc.w / 2, cy = rc.y + rc.h / 2;
    const w = Math.max(rc.w, want), h = Math.max(rc.h, want);
    const sx = Math.max(0, Math.min(newE.cv.width - w, cx - w / 2));
    const sy = Math.max(0, Math.min(newE.cv.height - h, cy - h / 2));
    const sw = Math.min(w, newE.cv.width - sx), sh = Math.min(h, newE.cv.height - sy);

    const horizontal = sw <= sh; // 横長の箇所は上下に、縦長は左右に並べる
    const gap = 10;
    const out = document.createElement('canvas');
    out.width = horizontal ? sw * 2 + gap : sw;
    out.height = horizontal ? sh : sh * 2 + gap;
    const g = out.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(oldE.cv, sx, sy, sw, sh, 0, 0, sw, sh);
    if (horizontal) g.drawImage(newE.cv, sx, sy, sw, sh, sw + gap, 0, sw, sh);
    else g.drawImage(newE.cv, sx, sy, sw, sh, 0, sh + gap, sw, sh);

    // 仕切り線
    g.fillStyle = '#d32f2f';
    if (horizontal) g.fillRect(sw, 0, gap, out.height);
    else g.fillRect(0, sh, out.width, gap);

    // 変更箇所の枠
    g.strokeStyle = '#d32f2f'; g.lineWidth = 3;
    const bx = rc.x - sx, by = rc.y - sy;
    g.strokeRect(bx, by, rc.w, rc.h);
    g.strokeRect(bx + (horizontal ? sw + gap : 0), by + (horizontal ? 0 : sh + gap), rc.w, rc.h);

    // 旧/新のラベル
    g.font = 'bold 22px sans-serif';
    const label = (t, x, y) => {
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.fillRect(x, y, g.measureText(t).width + 16, 30);
      g.fillStyle = '#d32f2f'; g.fillText(t, x + 8, y + 22);
    };
    label('旧', 6, 6);
    if (horizontal) label('新', sw + gap + 6, 6); else label('新', 6, sh + gap + 6);

    return { canvas: out, horizontal };
  }

  async function selectRegion(r) {
    state.selected = r;
    document.querySelectorAll('.region').forEach((el, i) =>
      el.classList.toggle('sel', significantRegions($('chk-showall').checked)[i] === r));
    const prev = $('preview');
    prev.innerHTML = '<p class="empty">描画中…</p>';
    try {
      const { canvas } = await buildComparison(r);
      prev.innerHTML = '';
      const cap = document.createElement('div');
      cap.className = 'preview-cap';
      cap.textContent = `${r.page}ページ目 ${r._no}番目の変更箇所` + (r.grid ? `（通り芯 ${r.grid} 付近）` : '');
      prev.appendChild(cap);
      canvas.className = 'preview-img';
      prev.appendChild(canvas);
    } catch (e) {
      console.error(e);
      prev.innerHTML = '<p class="empty">表示に失敗しました</p>';
    }
  }

  // ---- 出力1: 変更箇所マーキングPDF -----------------------------------
  async function exportMarkedPdf() {
    const res = state.result;
    if (!res) return;
    progress('マーキングPDFを作成しています…', 0.3);
    await idle();
    try {
      const doc = await PDFDocument.load(res.newBytes.slice());
      const showAll = $('chk-showall').checked;
      const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      let total = 0;

      for (const p of res.pages) {
        const page = doc.getPage(p.index - 1);
        const regions = p.regions.filter(r => showAll || r.significant);
        regions.forEach((r, i) => {
          total++;
          const pad = 12;
          // 変更箇所は「表示上の向き」で持っているので、
          // 描き込む前にこのPDF本来の座標へ戻す。
          const b = DiffCore.transformRect(p.toPdf, r.x0 - pad, r.y0 - pad, r.x1 + pad, r.y1 + pad);
          page.drawRectangle({
            x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1],
            borderColor: rgb(0.85, 0.1, 0.1), borderWidth: 2.5, opacity: 0
          });
          // 通し番号（図面が90°回転していても読める向きに置く）
          const rot = ((page.getRotation().angle % 360) + 360) % 360;
          const label = `${p.index}P-${i + 1}`;
          const opt = { size: 13, font, color: rgb(0.85, 0.1, 0.1) };
          if (rot === 90 || rot === 270) {
            page.drawText(label, { x: b[0] - 4, y: b[1], rotate: window.PDFLib.degrees(90), ...opt });
          } else {
            page.drawText(label, { x: b[0], y: b[3] + 4, ...opt });
          }
        });
      }

      const bytes = await doc.save();
      download(new Blob([bytes], { type: 'application/pdf' }),
        baseName(state.newFile.name) + '_変更箇所マーキング.pdf');
      progress(`マーキングPDFを出力しました（${total}箇所）`, 1);
      setTimeout(() => { $('progress-wrap').hidden = true; }, 1500);
    } catch (e) {
      console.error(e);
      alert('マーキングPDFの作成に失敗しました:\n' + e.message);
      $('progress-wrap').hidden = true;
    }
  }

  // ---- 出力2: 新旧比較画像 --------------------------------------------
  async function exportImages() {
    const res = state.result;
    if (!res) return;
    const regions = significantRegions($('chk-showall').checked);
    if (!regions.length) { alert('出力する変更箇所がありません'); return; }

    try {
      await ensureCanvases();
      const zip = new window.JSZip();
      const index = ['No.,ページ,通り芯,種別,旧,新'];

      for (let i = 0; i < regions.length; i++) {
        const r = regions[i];
        progress(`比較画像を作成しています… (${i + 1}/${regions.length})`, (i + 1) / regions.length * 0.9);
        await idle();
        const { canvas } = await buildComparison(r, 520);
        const blob = await new Promise(rs => canvas.toBlob(rs, 'image/png'));
        const no = String(i + 1).padStart(2, '0');
        const name = `${no}_${r.page}P` + (r.grid ? '_' + r.grid.replace(/[ \/]+/g, '-') : '') + '.png';
        zip.file(name, blob);
        const kind = r.movedOnly ? '位置移動' : (r.addedText.length + r.deletedText.length ? '文字・寸法の変更' : '図形のみ');
        index.push([no, r.page + 'P', q(r.grid), kind,
                    q(uniqJoin(r.deletedText)), q(uniqJoin(r.addedText))].join(','));
      }

      // Excelでそのまま開けるよう BOM 付きにする
      zip.file('変更箇所一覧.csv', '﻿' + index.join('\r\n'));

      progress('ZIPにまとめています…', 0.95);
      const out = await zip.generateAsync({ type: 'blob' });
      download(out, baseName(state.newFile.name) + '_新旧比較.zip');
      progress(`比較画像 ${regions.length} 枚をZIPで出力しました`, 1);
      setTimeout(() => { $('progress-wrap').hidden = true; }, 1500);
    } catch (e) {
      console.error(e);
      alert('比較画像の書き出しに失敗しました:\n' + e.message);
      $('progress-wrap').hidden = true;
    }
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const baseName = n => n.replace(/\.pdf$/i, '');

  // ---- 起動 -----------------------------------------------------------
  window.addEventListener('DOMContentLoaded', () => {
    setupDrop('zone-old', 'oldFile');
    setupDrop('zone-new', 'newFile');
    $('btn-run').addEventListener('click', run);
    $('btn-pdf').addEventListener('click', exportMarkedPdf);
    $('btn-img').addEventListener('click', exportImages);
    $('chk-showall').addEventListener('change', () => { if (state.result) renderResults(); });
    $('btn-swap').addEventListener('click', () => {
      const a = state.oldFile, b = state.newFile;
      state.oldFile = b; state.newFile = a;
      for (const [zid, w] of [['zone-old', 'oldFile'], ['zone-new', 'newFile']]) {
        const z = $(zid), f = state[w];
        z.classList.toggle('filled', !!f);
        z.querySelector('.zone-file').textContent = f ? f.name : '';
        z.querySelector('.zone-size').textContent = f ? (f.size / 1024 / 1024).toFixed(1) + ' MB' : '';
      }
      refreshRunButton();
    });
  });
})();
