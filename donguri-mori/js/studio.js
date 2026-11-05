'use strict';
// ショート動画スタジオ: 見所クリップをつなげて 9:16 のショート動画をつくる → 保存・共有・アップロード
(function (DF) {
  const U = DF.U, C = DF.C;
  const ST = { open: false, result: null, selected: new Set(), making: false, cancel: false };
  const $ = (id) => document.getElementById(id);
  const MAX_TOTAL = 180;     // YouTubeショートの上限(3分)
  const RECOMMEND = 60;

  ST.segOf = function (c) {
    if (c.kind === 'manual') return { start: 0, end: Math.min(c.duration, 180) };
    const start = Math.max(0, c.offset - 6);
    const end = Math.min(c.duration, Math.max(c.offset + 3.2, start + 4));
    return { start, end };
  };

  ST.init = function () {
    $('st-make').addEventListener('click', make);
    $('st-cancel').addEventListener('click', () => { ST.cancel = true; });
    $('st-back').addEventListener('click', () => show('pick'));
    $('st-save').addEventListener('click', saveResult);
    $('st-share').addEventListener('click', shareResult);
    $('st-ytopen').addEventListener('click', openYouTube);
    $('st-copy').addEventListener('click', copyMeta);
    $('yt-upload').addEventListener('click', directUpload);
    $('yt-gosettings').addEventListener('click', () => { DF.UI.openModal('m-settings'); });
    $('st-intro').addEventListener('change', estimate);
    $('st-outro').addEventListener('change', estimate);
    $('pv-close').addEventListener('click', closePreview);
    $('st-clips').addEventListener('click', onListClick);
    $('st-clips').addEventListener('change', (e) => {
      const id = Number(e.target.dataset.id);
      if (!id) return;
      if (e.target.checked) ST.selected.add(id); else ST.selected.delete(id);
      estimate();
    });
    DF.Rec.on('clip', (c) => {
      if (c.kind === 'manual' || ST.selected.size < 6) ST.selected.add(c.id);
      if (ST.open && !ST.making) renderList();
    });
  };

  ST.show = function (opt = {}) {
    ST.open = true;
    if (opt.only) { ST.selected = new Set([opt.only]); }
    if (!$('st-title').value) $('st-title').value = 'どんぐりっこの森';
    renderList();
    show('pick');
  };
  ST.hide = function () {
    if (ST.making) ST.cancel = true;
    ST.open = false;
    closePreview();
  };

  function show(which) {
    $('st-pick').hidden = which !== 'pick';
    $('st-making').hidden = which !== 'making';
    $('st-done').hidden = which !== 'done';
  }

  function renderList() {
    const ul = $('st-clips');
    const clips = DF.Rec.clips.slice().reverse();
    for (const id of [...ST.selected]) if (!DF.Rec.clips.some((c) => c.id === id)) ST.selected.delete(id);
    $('st-empty').hidden = clips.length > 0;
    ul.innerHTML = '';
    for (const c of clips) {
      const seg = ST.segOf(c);
      const li = document.createElement('li');
      li.className = 'clip';
      const time = c.created.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      li.innerHTML = `
        <label class="clip-main">
          <input type="checkbox" data-id="${c.id}" ${ST.selected.has(c.id) ? 'checked' : ''}>
          <span class="thumb">${c.thumb ? `<img src="${c.thumb}" alt="">` : ''}<em>${Math.round(seg.end - seg.start)}秒</em></span>
          <span class="info"><b></b><small>${c.kind === 'manual' ? '手動録画' : '自動の見所'} ・ ${time}</small></span>
        </label>
        <span class="clip-acts">
          <button class="icon" data-act="play" data-id="${c.id}" title="見る" aria-label="見る">▶</button>
          <button class="icon" data-act="save" data-id="${c.id}" title="このクリップだけ保存" aria-label="保存">⤓</button>
          <button class="icon" data-act="del" data-id="${c.id}" title="けす" aria-label="けす">✕</button>
        </span>`;
      li.querySelector('.info b').textContent = c.label;
      ul.appendChild(li);
    }
    estimate();
  }

  function onListClick(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const id = Number(b.dataset.id);
    const c = DF.Rec.clips.find((x) => x.id === id);
    if (!c) return;
    if (b.dataset.act === 'play') openPreview(c);
    else if (b.dataset.act === 'save') download(c.blob, `donguri-clip-${c.id}.${DF.Rec.ext(c.type)}`);
    else if (b.dataset.act === 'del') { DF.Rec.removeClip(id); ST.selected.delete(id); renderList(); DF.UI.updateClipCount(); }
  }

  function selectedClips() {
    return DF.Rec.clips.filter((c) => ST.selected.has(c.id));
  }

  function estimate() {
    const clips = selectedClips();
    let total = clips.reduce((s, c) => { const g = ST.segOf(c); return s + (g.end - g.start); }, 0);
    if (clips.length) total += ($('st-intro').checked ? 1.3 : 0) + ($('st-outro').checked ? 2.2 : 0);
    const el = $('st-est');
    if (!clips.length) { el.textContent = 'つなげるクリップを えらんでね'; el.className = 'est'; $('st-make').disabled = true; return; }
    $('st-make').disabled = total > MAX_TOTAL;
    el.textContent = `${clips.length}クリップ ・ やく${Math.round(total)}秒` +
      (total > MAX_TOTAL ? '(3分をこえるとショートになりません。へらしてね)' : total > RECOMMEND ? '(60秒以内がおすすめ)' : '');
    el.className = 'est' + (total > MAX_TOTAL ? ' bad' : total > RECOMMEND ? ' warn' : ' ok');
  }

  // ---------- プレビュー ----------
  function openPreview(c) {
    const v = $('pv-video');
    const seg = ST.segOf(c);
    $('m-preview').hidden = false;
    v.src = c.url;
    v.onloadedmetadata = () => { try { v.currentTime = seg.start; } catch (e) { /* noop */ } v.play().catch(() => {}); };
  }
  function closePreview() {
    const v = $('pv-video');
    v.pause(); v.removeAttribute('src'); v.load();
    $('m-preview').hidden = true;
  }

  // ---------- 動画づくり ----------
  function once(el, ev, ms) {
    return new Promise((resolve) => {
      let done = false;
      const fin = (ok) => { if (done) return; done = true; el.removeEventListener(ev, h); clearTimeout(tm); resolve(ok); };
      const h = () => fin(true);
      el.addEventListener(ev, h);
      const tm = setTimeout(() => fin(false), ms);
    });
  }
  const raf = () => new Promise((r) => requestAnimationFrame(r));

  async function make() {
    const clips = selectedClips();
    if (!clips.length || ST.making) return;
    if (!DF.Rec.supported) { DF.UI.toast('このブラウザは動画の書き出しに対応していません'); return; }
    // 古い順(時系列)につなぐ
    clips.sort((a, b) => a.id - b.id);
    ST.making = true; ST.cancel = false;
    show('making');
    $('st-prog').style.width = '0%';
    $('st-making-msg').textContent = '動画をつくっています…(この画面をひらいたまま待ってね)';
    try {
      const blob = await compose(clips, {
        title: $('st-title').value.trim() || 'どんぐりっこの森',
        intro: $('st-intro').checked, outro: $('st-outro').checked,
      });
      if (ST.cancel || !blob) { show('pick'); return; }
      setResult(blob, clips);
    } catch (err) {
      console.error(err);
      DF.UI.toast('動画をつくれませんでした: ' + (err && err.message ? err.message : err));
      show('pick');
    } finally {
      ST.making = false;
    }
  }

  async function compose(clips, opt) {
    const A = DF.Audio;
    A.resume();
    const actx = A.ctx;
    const cv = $('st-canvas');
    const ctx = cv.getContext('2d');
    const dest = actx.createMediaStreamDestination();
    const monitor = actx.createGain(); monitor.gain.value = 0.7; monitor.connect(actx.destination);
    // ゲームの音はひかえめなので、動画用に持ち上げてリミッターで割れないようにする
    const boost = actx.createGain(); boost.gain.value = 2.6;
    const limiter = actx.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 6; limiter.ratio.value = 10; limiter.attack.value = 0.003; limiter.release.value = 0.15;
    boost.connect(limiter); limiter.connect(dest);
    const tracks = [...cv.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()];
    const stream = new MediaStream(tracks);
    const type = DF.Rec.finalType;
    let rec;
    try { rec = new MediaRecorder(stream, { mimeType: type || undefined, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128000 }); }
    catch (e) { rec = new MediaRecorder(stream); }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

    const segs = clips.map((c) => ({ clip: c, ...ST.segOf(c) }));
    const total = segs.reduce((s, g) => s + g.end - g.start, 0) + (opt.intro ? 1.3 : 0) + (opt.outro ? 2.2 : 0);
    let doneSec = 0;
    const prog = (sec) => { $('st-prog').style.width = Math.min(100, ((doneSec + sec) / total) * 100).toFixed(1) + '%'; };

    // 最初のフレームを描いてから録画開始
    if (opt.intro) drawIntro(ctx, 0, opt.title); else ctx.fillRect(0, 0, C.VW, C.VH);
    rec.start(500);

    async function phase(dur, fn) {
      const t0 = performance.now();
      for (;;) {
        if (ST.cancel) return;
        const t = (performance.now() - t0) / 1000;
        fn(ctx, Math.min(t, dur));
        prog(t);
        if (t >= dur) break;
        await raf();
      }
      doneSec += dur;
    }

    if (opt.intro) { jingle(actx, [dest, monitor], 'intro'); await phase(1.3, (c, t) => drawIntro(c, t, opt.title)); }
    for (let i = 0; i < segs.length && !ST.cancel; i++) {
      await playSeg(segs[i], i, segs.length, !opt.intro && i === 0);
    }
    if (opt.outro && !ST.cancel) { jingle(actx, [dest, monitor], 'outro'); await phase(2.2, drawOutro); }

    await new Promise((resolve) => { rec.onstop = resolve; try { rec.stop(); } catch (e) { resolve(); } });
    tracks.forEach((t) => t.stop());
    monitor.disconnect(); limiter.disconnect();
    if (ST.cancel) return null;
    return new Blob(chunks, { type: (rec.mimeType || type || 'video/webm').split(';')[0] });

    async function playSeg(seg, idx, n, showTitle) {
      const v = document.createElement('video');
      v.playsInline = true; v.preload = 'auto';
      v.src = seg.clip.url;
      await once(v, 'loadedmetadata', 5000);
      let src = null;
      try { src = actx.createMediaElementSource(v); src.connect(boost); src.connect(monitor); } catch (e) { v.muted = true; }
      if (seg.start > 0.05) {
        v.currentTime = seg.start;
        const ok = await once(v, 'seeked', 4000);
        if (!ok) { try { v.currentTime = 0; } catch (e) { /* noop */ } seg = { ...seg, end: seg.end - seg.start, start: 0 }; }
      }
      try { await v.play(); } catch (e) { v.muted = true; await v.play().catch(() => {}); }
      const len = seg.end - seg.start;
      const t0 = performance.now();
      for (;;) {
        if (ST.cancel) break;
        const wall = (performance.now() - t0) / 1000;
        const pos = v.currentTime - seg.start;
        const t = Math.max(0, Math.min(len, pos));
        drawClipFrame(ctx, v, seg.clip, t, len, idx, n, showTitle ? opt.title : null);
        prog(t);
        if (pos >= len || v.ended || wall > len + 4) break;
        await raf();
      }
      v.pause();
      if (src) src.disconnect();
      v.removeAttribute('src'); v.load();
      doneSec += len;
    }
  }

  function jingle(actx, dests, kind) {
    const notes = kind === 'intro' ? [[0, 0], [4, 0.1], [7, 0.2], [12, 0.32], [16, 0.32]] : [[12, 0], [7, 0.16], [4, 0.32], [9, 0.5], [12, 0.7], [16, 0.7]];
    const t0 = actx.currentTime + 0.02;
    for (const [s, dt] of notes) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'triangle'; o.frequency.value = 523.25 * Math.pow(2, s / 12);
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + dt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.6);
      o.connect(g); dests.forEach((d) => g.connect(d));
      o.start(t0 + dt); o.stop(t0 + dt + 0.7);
    }
  }

  // ---------- 動画の絵づくり ----------
  function bg(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, C.VH);
    g.addColorStop(0, '#a8d672'); g.addColorStop(0.55, '#5f9a4b'); g.addColorStop(1, '#2f5d3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, C.VW, C.VH);
    ctx.save();
    ctx.translate(C.VW / 2, 470);
    ctx.rotate(t * 0.4);
    ctx.fillStyle = 'rgba(255,250,210,0.16)';
    for (let i = 0; i < 12; i++) {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1300, (i / 12) * Math.PI * 2, ((i + 0.5) / 12) * Math.PI * 2); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function outlinedText(ctx, text, x, y, size, fill, stroke, maxW) {
    ctx.font = `800 ${size}px ${U.FONT}`;
    let w = ctx.measureText(text).width;
    if (maxW && w > maxW) { size = Math.floor((size * maxW) / w); ctx.font = `800 ${size}px ${U.FONT}`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(6, size * 0.2); ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }

  function kidsParade(ctx, t, y, n) {
    const types = ['brown', 'green', 'brown', 'gold', 'brown', 'green', 'brown'];
    for (let i = 0; i < n; i++) {
      const spr = DF.Sprites.kid[types[i % types.length]].front;
      const x = C.VW / 2 + (i - (n - 1) / 2) * 84;
      const hop = Math.abs(Math.sin(t * 7 + i * 0.8)) * 26;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(x, y, 26, 8, 0, 0, 7); ctx.fill();
      DF.Sprites.draw(ctx, spr, x, y - hop, { scale: 2.2 });
    }
  }

  function drawIntro(ctx, t, title) {
    bg(ctx, t);
    // 最初のフレーム(サムネイルになりやすい)からタイトルが読めるように、大きめから始める
    const k = 0.6 + 0.4 * U.easeOutBack(Math.min(1, t / 0.45));
    ctx.save();
    ctx.translate(C.VW / 2, 470); ctx.scale(k, k);
    outlinedText(ctx, title, 0, 0, 92, '#fff8e7', '#5a3b1e', 640);
    ctx.restore();
    if (t > 0.3) {
      ctx.globalAlpha = Math.min(1, (t - 0.3) / 0.3);
      outlinedText(ctx, 'きょうの見所', C.VW / 2, 590, 48, '#ffe066', '#5a3b1e');
      const d = new Date();
      outlinedText(ctx, `${d.getMonth() + 1}月${d.getDate()}日 ・ ${DF.Game.day}日目の森`, C.VW / 2, 660, 30, '#fff', 'rgba(60,35,15,0.6)');
      ctx.globalAlpha = 1;
    }
    kidsParade(ctx, t, 860, 5);
  }

  function drawOutro(ctx, t) {
    bg(ctx, t + 3);
    const G = DF.Game;
    const k = U.easeOutBack(Math.min(1, t / 0.45));
    ctx.save(); ctx.translate(C.VW / 2, 330); ctx.scale(k, k);
    outlinedText(ctx, 'またあそびにきてね！', 0, 0, 64, '#fff8e7', '#5a3b1e', 640);
    ctx.restore();
    const rows = [['もりコイン', G.stats.coinsEarned], ['どんぐりっこ', G.kids.length + 'ひき'], ['はこんだ数', G.stats.total + 'こ']];
    rows.forEach(([a, b], i) => {
      const a2 = Math.min(1, Math.max(0, (t - 0.3 - i * 0.18) / 0.3));
      if (a2 <= 0) return;
      ctx.globalAlpha = a2;
      const y = 470 + i * 96;
      ctx.fillStyle = 'rgba(255,248,231,0.92)';
      U.roundRect(ctx, 130, y - 38, 460, 76, 38); ctx.fill();
      ctx.font = `700 32px ${U.FONT}`; ctx.fillStyle = '#8a5a2b'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(a, 170, y);
      ctx.font = `800 40px ${U.FONT}`; ctx.fillStyle = '#5a3b1e'; ctx.textAlign = 'right';
      ctx.fillText(String(b), 550, y);
      ctx.globalAlpha = 1;
    });
    kidsParade(ctx, t, 900, 7);
    outlinedText(ctx, 'どんぐりっこの森', C.VW / 2, 1010, 36, '#fff', 'rgba(60,35,15,0.6)');
  }

  function drawClipFrame(ctx, v, clip, t, len, idx, n, title) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, C.VW, C.VH);
    const vw = v.videoWidth || C.VW, vh = v.videoHeight || C.VH;
    const s = Math.max(C.VW / vw, C.VH / vh);
    const dw = vw * s, dh = vh * s;
    try { ctx.drawImage(v, (C.VW - dw) / 2, (C.VH - dh) / 2, dw, dh); } catch (e) { /* フレーム未準備 */ }
    // 切り替えのフラッシュ
    if (t < 0.22) { ctx.fillStyle = `rgba(255,255,255,${0.85 * (1 - t / 0.22)})`; ctx.fillRect(0, 0, C.VW, C.VH); }
    // 上のタグ(ショートの画面UIにかぶらない位置)
    ctx.fillStyle = 'rgba(47,93,58,0.85)';
    U.roundRect(ctx, 24, 132, 246, 50, 25); ctx.fill();
    ctx.font = `800 26px ${U.FONT}`; ctx.fillStyle = '#fff8e7'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('どんぐりっこの森', 44, 158);
    if (n > 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; U.roundRect(ctx, 282, 136, 76, 42, 21); ctx.fill();
      ctx.font = `800 24px ${U.FONT}`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}/${n}`, 320, 158);
    }
    if (title && t < 1.8) {
      const a = Math.min(1, t / 0.2) * Math.min(1, (1.8 - t) / 0.3);
      ctx.globalAlpha = a;
      outlinedText(ctx, title, C.VW / 2, 420, 76, '#fff8e7', '#5a3b1e', 620);
      ctx.globalAlpha = 1;
    }
    // 下のテロップ
    const label = clip.label;
    const a = Math.min(1, t / 0.3);
    const y = 930 + (1 - U.easeOutCubic(a)) * 40;
    ctx.globalAlpha = a;
    ctx.font = `800 40px ${U.FONT}`;
    let tw = ctx.measureText(label).width;
    let fs = 40;
    if (tw > 520) { fs = Math.floor(40 * 520 / tw); ctx.font = `800 ${fs}px ${U.FONT}`; tw = ctx.measureText(label).width; }
    const w = tw + 64;
    // 右側はショートのボタンが重なるので、長いテロップは少し左に寄せる
    const x = Math.min(C.VW / 2, 610 - w / 2);
    ctx.fillStyle = 'rgba(60,35,15,0.35)'; U.roundRect(ctx, x - w / 2 + 4, y - 38, w, 80, 40); ctx.fill();
    ctx.fillStyle = '#f29b38'; U.roundRect(ctx, x - w / 2, y - 42, w, 80, 40); ctx.fill();
    ctx.fillStyle = '#fff8e7'; U.roundRect(ctx, x - w / 2 + 6, y - 36, w - 12, 68, 34); ctx.fill();
    ctx.fillStyle = '#5a3b1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - 1);
    ctx.globalAlpha = 1;
    // 進み具合
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, C.VH - 6, C.VW * ((idx + t / len) / n), 6);
  }

  // ---------- 仕上がり ----------
  function setResult(blob, clips) {
    if (ST.result) URL.revokeObjectURL(ST.result.url);
    const ext = DF.Rec.ext(blob.type);
    ST.result = { blob, url: URL.createObjectURL(blob), ext, name: `donguri-mori-shorts-${U.stamp()}.${ext}`, clips };
    const v = $('st-video');
    v.src = ST.result.url;
    const mb = (blob.size / 1024 / 1024).toFixed(1);
    $('st-meta').textContent = `縦型 720×1280 ・ ${ext.toUpperCase()} ・ ${mb}MB`;
    const title = $('st-title').value.trim() || 'どんぐりっこの森';
    const labels = clips.map((c) => c.label).join(' / ');
    const main = (clips.find((c) => c.kind === 'auto') || clips[0]).label.split(' / ')[0];
    $('yt-title').value = `${title}｜${main} #Shorts`.slice(0, 100);
    $('yt-desc').value = `「どんぐりっこの森」のプレイ動画です🌰\n${labels}\n\n#Shorts #どんぐりっこの森 #ゲーム #インディーゲーム`;
    const file = new File([blob], ST.result.name, { type: blob.type });
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    $('st-share').hidden = !canShare;
    $('st-hint-mobile').hidden = !canShare;
    $('yt-result').textContent = '';
    $('yt-progwrap').hidden = true;
    const id = DF.UI.settings.ytClientId;
    $('yt-need-id').hidden = !!id;
    $('yt-form').hidden = !id;
    if (id) DF.YT.prepare(id).catch((e) => ($('yt-result').textContent = e.message));
    show('done');
  }

  function download(blob, name) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function saveResult() {
    if (!ST.result) return;
    download(ST.result.blob, ST.result.name);
    DF.UI.toast('動画を保存しました');
  }
  async function shareResult() {
    if (!ST.result) return;
    const file = new File([ST.result.blob], ST.result.name, { type: ST.result.blob.type });
    try {
      await navigator.share({ files: [file], title: $('yt-title').value, text: $('yt-desc').value });
    } catch (e) {
      if (e && e.name !== 'AbortError') DF.UI.toast('共有できませんでした。「動画を保存」をためしてね');
    }
  }
  async function copyMeta() {
    const text = `${$('yt-title').value}\n\n${$('yt-desc').value}`;
    try { await navigator.clipboard.writeText(text); DF.UI.toast('タイトルと説明をコピーしました'); }
    catch (e) { DF.UI.toast('コピーできませんでした。下の欄から手動でコピーしてね'); }
  }
  function openYouTube() {
    copyMeta();
    window.open('https://www.youtube.com/upload', '_blank', 'noopener');
  }

  async function directUpload() {
    if (!ST.result) return;
    const out = $('yt-result');
    const btn = $('yt-upload');
    btn.disabled = true;
    out.textContent = 'Googleにログインしています…';
    $('yt-progwrap').hidden = false;
    $('yt-prog').style.width = '0%';
    try {
      const res = await DF.YT.upload(ST.result.blob, {
        title: $('yt-title').value.trim() || 'どんぐりっこの森 #Shorts',
        description: $('yt-desc').value,
        tags: ['どんぐりっこの森', 'ゲーム', 'Shorts'],
        privacy: $('yt-privacy').value,
      }, (p) => { $('yt-prog').style.width = (p * 100).toFixed(1) + '%'; out.textContent = `アップロード中… ${Math.round(p * 100)}%`; });
      const id = res && res.id;
      out.innerHTML = '';
      out.append('アップロードできました！ ');
      if (id) {
        const a = document.createElement('a');
        a.href = `https://youtube.com/shorts/${id}`; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = 'YouTubeで見る';
        out.append(a);
        out.append('(反映まで数分かかることがあります)');
      }
    } catch (e) {
      out.textContent = e.message || String(e);
    } finally {
      btn.disabled = false;
    }
  }

  DF.Studio = ST;
})(window.DF);
