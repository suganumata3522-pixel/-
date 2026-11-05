'use strict';
// 画面・操作・ゲームループのつなぎこみ
(function (DF) {
  const U = DF.U, C = DF.C, G = DF.Game, A = DF.Audio, Rec = DF.Rec;
  const $ = (id) => document.getElementById(id);
  const UI = (DF.UI = {});

  const DEFAULTS = { autoHL: true, music: 0.55, sfx: 0.8, maxRec: 60, quality: 'std', ytClientId: '' };
  UI.settings = Object.assign({}, DEFAULTS, U.store.get('settings', {}));
  const BITRATE = { low: 2_500_000, std: 5_000_000, high: 8_000_000 };
  const saveSettings = () => U.store.set('settings', UI.settings);

  let started = false;
  const stage = $('stage'), canvas = $('game');

  // ---------- 画面サイズ(9:16を保つ) ----------
  function layout() {
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const s = Math.min(vw / C.VW, vh / C.VH);
    const w = Math.floor(C.VW * s), h = Math.floor(C.VH * s);
    stage.style.width = w + 'px';
    stage.style.height = h + 'px';
    stage.style.setProperty('--u', (w / 100).toFixed(3) + 'px');
  }
  window.addEventListener('resize', layout);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);
  layout();

  // ---------- トースト・ヒント ----------
  let toastTimer = null;
  UI.toast = function (msg, ms) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
  };
  let hintTimer = null;
  function showHint(text) {
    const el = $('hint');
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('out');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => { el.classList.add('out'); setTimeout(() => (el.hidden = true), 400); }, 7000);
  }
  $('hint').addEventListener('click', () => ($('hint').hidden = true));

  // ---------- モーダル ----------
  let openModals = 0;
  UI.openModal = function (id) {
    const m = $(id);
    if (!m.hidden) return;
    m.hidden = false;
    openModals++;
    G.paused = true;
    if (id === 'm-shop') renderShop();
    if (id === 'm-settings') renderSettings();
  };
  UI.closeModal = function (id) {
    const m = $(id);
    if (m.hidden) return;
    m.hidden = true;
    openModals = Math.max(0, openModals - 1);
    if (id === 'm-studio') onStudioClose();
    if (!openModals && started) G.paused = false;
  };
  document.querySelectorAll('.modal').forEach((m) => {
    if (m.id === 'm-preview') return;
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.closest('[data-close]')) UI.closeModal(m.id);
    });
  });

  // ---------- 録画 ----------
  const recOK = Rec.supported;
  function startBuffer() {
    if (recOK && UI.settings.autoHL && started && !Rec.manual && $('m-studio').hidden) Rec.buffer.start();
  }
  function stopBuffer() { if (recOK) Rec.buffer.stop(); }

  UI.updateClipCount = function () {
    const n = Rec.clips.length;
    const b = $('clip-count');
    b.hidden = n === 0;
    b.textContent = n;
  };

  function flash() {
    const f = $('flash');
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }

  function toggleRec() {
    if (!recOK) { UI.toast('このブラウザは録画に対応していません(Chrome / Edge / Safari の最新版でためしてね)'); return; }
    A.resume();
    if (Rec.manual) {
      Rec.stopManual();
      return;
    }
    stopBuffer();
    Rec.bitrate = BITRATE[UI.settings.quality] || BITRATE.std;
    if (Rec.startManual(Number(UI.settings.maxRec) || 60)) {
      A.play('rec');
      $('btn-rec').classList.add('on');
      $('rec-badge').hidden = false;
      $('rec-badge').querySelector('span').textContent = '00:00 / ' + U.fmtSec(UI.settings.maxRec);
      UI.toast('録画スタート！もう一度押すと止まるよ');
    }
  }
  if (recOK) {
    Rec.on('manualTick', ({ elapsed, max }) => {
      $('rec-badge').querySelector('span').textContent = U.fmtSec(elapsed) + ' / ' + U.fmtSec(max);
    });
    Rec.on('manualStop', (clip) => {
      $('btn-rec').classList.remove('on');
      $('rec-badge').hidden = true;
      UI.updateClipCount();
      if (clip) {
        UI.toast('録画できた！');
        openStudio({ only: clip.id });
      } else startBuffer();
    });
    Rec.on('clip', () => UI.updateClipCount());
  }

  function clipNow() {
    if (!recOK) { UI.toast('このブラウザは録画に対応していません'); return; }
    if (Rec.manual) { UI.toast('録画中だよ。止めるとクリップになるよ'); return; }
    if (!UI.settings.autoHL) { UI.toast('「見所の自動クリップ」がOFFです(せっていでONにできます)'); return; }
    const hh = Math.floor(G.hour()), mm = Math.floor((G.hour() % 1) * 60);
    if (Rec.buffer.mark(`見所 ${hh}:${String(mm).padStart(2, '0')}`, { post: 1, thumb: DF.Render.thumb() })) {
      A.play('shutter'); flash();
      UI.toast('いまの見所をクリップしたよ');
    } else UI.toast('ちょっと待ってからもう一度ためしてね');
  }

  G.on('highlight', (h) => {
    if (recOK && UI.settings.autoHL && Rec.buffer && Rec.buffer.running) Rec.buffer.mark(h.title, { thumb: DF.Render.thumb() });
  });
  G.on('hint', showHint);
  G.on('toast', (m) => UI.toast(m));
  let noKidsT = 0;
  G.on('nokids', () => {
    if (performance.now() - noKidsT < 2500) return;
    noKidsT = performance.now();
    A.play('nope');
    UI.toast('ついてきている どんぐりっこがいないよ。「おいで！」で呼んでね');
  });

  // ---------- スタジオ ----------
  async function openStudio(opt) {
    if (!recOK) { UI.toast('このブラウザは動画の書き出しに対応していません'); return; }
    if (Rec.manual) await Rec.stopManual();
    if (Rec.buffer.pending) { UI.toast('クリップを仕上げています…', 1200); await Rec.buffer.flush(); }
    stopBuffer();
    A.stopMusic();
    UI.openModal('m-studio');
    DF.Studio.show(opt || {});
  }
  function onStudioClose() {
    DF.Studio.hide();
    const v = $('st-video'); v.pause();
    if (started) { A.startMusic(); setTimeout(startBuffer, 300); }
  }

  // ---------- おみせ ----------
  function renderShop() {
    $('shop-coins').textContent = G.coins;
    $('shop-nigiwai').textContent = G.nigiwai();
    const ul = $('shop-list');
    ul.innerHTML = '';
    for (const k in DF.DECOS) {
      const d = DF.DECOS[k];
      const li = document.createElement('li');
      const spr = DF.Sprites.deco[k];
      const img = document.createElement('canvas');
      img.width = spr.c.width; img.height = spr.c.height;
      img.getContext('2d').drawImage(spr.c, 0, 0);
      img.className = 'deco-img';
      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `<b></b><small></small>`;
      info.querySelector('b').textContent = d.name;
      info.querySelector('small').textContent = d.desc;
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.textContent = `${d.price} コイン`;
      btn.disabled = G.coins < d.price;
      btn.addEventListener('click', () => {
        if (G.buyDeco(k)) UI.closeModal('m-shop');
        else renderShop();
      });
      li.append(img, info, btn);
      ul.appendChild(li);
    }
  }
  $('shop-remove').addEventListener('click', () => {
    const r = G.removeNearestDeco();
    if (r) { UI.toast(`${r.name}をしまった(+${r.back}コイン)`); A.play('coin'); renderShop(); }
    else UI.toast('近くにかざりがないよ');
  });

  // ---------- せってい ----------
  function renderSettings() {
    const s = UI.settings;
    $('set-autohl').checked = !!s.autoHL;
    $('set-music').value = s.music;
    $('set-sfx').value = s.sfx;
    $('set-maxrec').value = String(s.maxRec);
    $('set-quality').value = s.quality;
    $('set-ytid').value = s.ytClientId || '';
    $('set-recinfo').textContent = recOK
      ? `このブラウザの録画形式: ${(Rec.finalType || 'video/webm').split(';')[0]}(ショート動画) / ${(Rec.bufferType || 'video/webm').split(';')[0]}(自動クリップ)`
      : 'このブラウザは録画に対応していません。Chrome / Edge / Safari の最新版をおすすめします。';
  }
  $('set-autohl').addEventListener('change', (e) => {
    UI.settings.autoHL = e.target.checked; saveSettings();
    if (!e.target.checked) stopBuffer();
  });
  $('set-music').addEventListener('input', (e) => { UI.settings.music = Number(e.target.value); A.setVolumes(UI.settings.music, UI.settings.sfx); saveSettings(); });
  $('set-sfx').addEventListener('input', (e) => { UI.settings.sfx = Number(e.target.value); A.setVolumes(UI.settings.music, UI.settings.sfx); saveSettings(); });
  $('set-maxrec').addEventListener('change', (e) => { UI.settings.maxRec = Number(e.target.value); saveSettings(); });
  $('set-quality').addEventListener('change', (e) => { UI.settings.quality = e.target.value; Rec.bitrate = BITRATE[e.target.value]; saveSettings(); });
  $('set-ytid').addEventListener('change', (e) => { UI.settings.ytClientId = e.target.value.trim(); saveSettings(); });
  $('set-reset').addEventListener('click', () => {
    if (!confirm('森のデータ(コイン・どんぐりっこ・かざり)をリセットしますか?')) return;
    G.clearSave();
    location.reload();
  });
  // せっていを閉じたら自動クリップを再開
  $('m-settings').addEventListener('click', (e) => {
    if (e.target === $('m-settings') || e.target.closest('[data-close]')) setTimeout(startBuffer, 100);
  });

  // ---------- 入力 ----------
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    if (e.key === 'Escape') { document.querySelectorAll('.modal:not([hidden])').forEach((m) => UI.closeModal(m.id)); return; }
    if (!started || openModals) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === ' ' || k === 'shift') { e.preventDefault(); if (!e.repeat) G.whistle(); }
    if (k === 'r' && !e.repeat) toggleRec();
    if (k === 'h' && !e.repeat) clipNow();
    if (k.startsWith('arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  function keyVec() {
    let x = 0, y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x -= 1;
    if (keys.has('d') || keys.has('arrowright')) x += 1;
    if (keys.has('w') || keys.has('arrowup')) y -= 1;
    if (keys.has('s') || keys.has('arrowdown')) y += 1;
    return { x, y };
  }

  // タッチ: ドラッグ=移動スティック、タップ=なげる、長おし=連続なげ
  const ptrs = new Map();
  let joy = null; // {id, x0, y0, vx, vy}
  const toCanvas = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((cx - r.left) / r.width) * C.VW, y: ((cy - r.top) / r.height) * C.VH, s: r.width / C.VW };
  };
  function throwAtScreen(cx, cy) {
    const p = toCanvas(cx, cy);
    G.throwAt(G.cam.x + p.x, G.cam.y + p.y);
  }
  function onDown(e) {
    if (!started || openModals) return;
    A.resume();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const st = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), mode: 'pending', type: e.pointerType };
    ptrs.set(e.pointerId, st);
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      st.mode = 'aim';
      throwAtScreen(e.clientX, e.clientY);
      st.rep = setInterval(() => throwAtScreen(st.x, st.y), 150);
    } else {
      st.hold = setTimeout(() => {
        if (st.mode !== 'pending') return;
        st.mode = 'aim';
        throwAtScreen(st.x, st.y);
        st.rep = setInterval(() => throwAtScreen(st.x, st.y), 150);
      }, 260);
    }
    e.preventDefault();
  }
  function onMove(e) {
    if (e.pointerType === 'mouse') {
      const p = toCanvas(e.clientX, e.clientY);
      DF.Render.aim = started && !openModals ? { x: p.x, y: p.y } : null;
    }
    const st = ptrs.get(e.pointerId);
    if (!st) return;
    st.x = e.clientX; st.y = e.clientY;
    const dx = st.x - st.x0, dy = st.y - st.y0;
    const u = stage.clientWidth / 100;
    if (st.mode === 'pending' && Math.hypot(dx, dy) > u * 2.6 && !joy) {
      st.mode = 'joy'; clearTimeout(st.hold);
      joy = st;
      const r = stage.getBoundingClientRect();
      const j = $('joy');
      j.style.left = (st.x0 - r.left) + 'px'; j.style.top = (st.y0 - r.top) + 'px';
      j.hidden = false;
    }
    if (st.mode === 'joy') {
      const max = u * 11;
      const d = Math.hypot(dx, dy);
      const k = d > max ? max / d : 1;
      $('joy-knob').style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      st.vx = (dx * k) / max; st.vy = (dy * k) / max;
    }
  }
  function onUp(e) {
    const st = ptrs.get(e.pointerId);
    if (!st) return;
    ptrs.delete(e.pointerId);
    clearTimeout(st.hold); clearInterval(st.rep);
    if (st.mode === 'pending' && performance.now() - st.t0 < 400) throwAtScreen(st.x, st.y);
    if (st === joy) { joy = null; $('joy').hidden = true; $('joy-knob').style.transform = ''; }
  }
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') DF.Render.aim = null; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const tapBtn = (id, fn) => $(id).addEventListener('click', (e) => { e.stopPropagation(); A.resume(); fn(); });
  tapBtn('btn-whistle', () => G.whistle());
  tapBtn('btn-rec', toggleRec);
  tapBtn('btn-clip', clipNow);
  tapBtn('btn-studio', () => openStudio());
  tapBtn('btn-shop', () => { A.play('ui'); UI.openModal('m-shop'); });
  tapBtn('btn-settings', () => { A.play('ui'); stopBuffer(); UI.openModal('m-settings'); });
  $('btn-howto').addEventListener('click', () => UI.openModal('m-howto'));

  // ---------- HUD ----------
  const hudCache = {};
  function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
  function updateHUD() {
    setText('hud-coin-v', String(G.coins));
    let fol = 0;
    for (const k of G.kids) if (k.state === 'follow' || k.state === 'pop') fol++;
    setText('hud-kids-v', String(fol));
    setText('hud-kids-t', '/' + G.kids.length);
    const h = G.hour();
    setText('hud-clock-v', `${Math.floor(h)}:${String(Math.floor((h % 1) * 6) * 10).padStart(2, '0')}`);
    setText('hud-clock-i', G.weather.raining ? '☂' : G.isNight() ? '☾' : '☀');
  }
  // HUDのテキスト要素にIDをふる
  $('hud-coin').querySelector('b').id = 'hud-coin-v';
  $('hud-kids').querySelector('b').id = 'hud-kids-v';
  $('hud-kids').querySelector('small').id = 'hud-kids-t';
  $('hud-clock').querySelector('b').id = 'hud-clock-v';
  $('hud-clock').querySelector('.ico').id = 'hud-clock-i';

  // ---------- 起動 ----------
  DF.Sprites.init();
  DF.World.generate();
  DF.Render.init(canvas);
  G.reset(null);
  if (G.hasSave()) $('btn-continue').hidden = false;

  function start(fromSave) {
    A.init(); A.resume();
    A.setVolumes(UI.settings.music, UI.settings.sfx);
    G.reset(fromSave ? G.loadSave() : null);
    if (!fromSave) G.clearSave();
    $('title').hidden = true;
    $('hud').hidden = false;
    started = true;
    G.paused = false;
    A.startMusic();
    if (recOK) {
      Rec.bitrate = BITRATE[UI.settings.quality] || BITRATE.std;
      if (!Rec.stream) Rec.init(canvas, A.audioTrack());
      startBuffer();
    }
    if (!fromSave) setTimeout(() => showHint('スワイプ(PCはWASD)で歩こう。地面からのぞく「芽」に近づくと、どんぐりっこが仲間になるよ！'), 600);
    UI.updateClipCount();
  }
  $('btn-start').addEventListener('click', () => {
    if (G.hasSave() && !confirm('はじめからあそびますか?(いまの森のデータは消えます)')) return;
    start(false);
  });
  $('btn-continue').addEventListener('click', () => start(true));
  DF.Studio.init();

  window.addEventListener('pagehide', () => { if (started) G.save(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && started) G.save(); });

  // ---------- ループ ----------
  let last = performance.now();
  let titleT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (started) {
      const kv = keyVec();
      let mx = kv.x, my = kv.y;
      if (joy) { mx += joy.vx || 0; my += joy.vy || 0; }
      G.input.mx = mx; G.input.my = my;
      G.update(dt);
      updateHUD();
    } else {
      // タイトル画面の背景: 森をゆっくり見せる
      titleT += dt;
      G.cam.x = 640 + Math.sin(titleT * 0.1) * 300;
      G.cam.y = 2300 + Math.cos(titleT * 0.08) * 200;
      G.time += dt;
    }
    if (!G.paused || !started) DF.Render.draw(G, dt);
    else if (Rec.manual || (Rec.buffer && Rec.buffer.running)) DF.Render.draw(G, 0);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // テスト用
  DF._start = start;
})(window.DF);
