/* Browser boot: live play (keyboard / touch / autoplay) or ?record=1 capture mode. */
(function () {
  'use strict';
  const AP = window.AP;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const RECORD = /[?&]record\b/.test(location.search);

  AP.Art.init();
  const game = new AP.Game();
  const bot = new AP.Bot(game);

  if (RECORD) { setupRecorder(); return; }

  /* ------------------------------------------------------------ live */
  const audio = new AP.Sound.LivePlayer();
  game.on((type, name) => audio.handle(type, name));
  game.resync();

  let auto = false;
  const keys = AP.blankInput();
  const touch = AP.blankInput();
  const latch = AP.blankInput(); // presses shorter than one game step still count once
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'a', Space: 'a', KeyK: 'a', KeyX: 'b', KeyJ: 'b', Enter: 'start', Tab: 'select',
  };
  function setAuto(v) { auto = v; game.autoLabel = v; }
  addEventListener('keydown', (e) => {
    audio.unlock();
    if (e.code === 'KeyM') { audio.setMuted(!audio.muted); return; }
    const k = KEYMAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (k === 'select' && !keys.select) setAuto(!auto);
    keys[k] = true; latch[k] = true;
  });
  addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const pointers = new Map();
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 1080 / r.width, y: (e.clientY - r.top) * 1920 / r.height };
  }
  function hitTest(x, y) {
    const L = AP.Art.padLayout, out = [];
    const dx = x - L.dpad.x, dy = y - L.dpad.y;
    if (Math.hypot(dx, dy) < 200) {
      if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
        const ax = Math.abs(dx), ay = Math.abs(dy);
        if (ax > ay * 0.5) out.push(dx < 0 ? 'left' : 'right');
        if (ay > ax * 0.5) out.push(dy < 0 ? 'up' : 'down');
      }
      return out;
    }
    if (Math.hypot(x - L.A.x, y - L.A.y) < 125) return ['a'];
    if (Math.hypot(x - L.B.x, y - L.B.y) < 125) return ['b'];
    for (const k of ['select', 'start']) {
      const b = L[k];
      if (Math.abs(x - b.x) < b.w / 2 + 20 && Math.abs(y - (b.y - 14)) < 50) return [k];
    }
    if (y > AP.VIEW.y && y < AP.VIEW.y + AP.VIEW.h && (game.mode === 'title' || game.mode === 'ending')) return ['start'];
    return out;
  }
  function refreshTouch() {
    const prevSelect = touch.select;
    for (const k in touch) touch[k] = false;
    for (const btns of pointers.values()) for (const b of btns) { touch[b] = true; latch[b] = true; }
    if (touch.select && !prevSelect) setAuto(!auto);
  }
  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock(); canvas.setPointerCapture(e.pointerId);
    const p = toCanvas(e); pointers.set(e.pointerId, hitTest(p.x, p.y)); refreshTouch(); e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const p = toCanvas(e); const h = hitTest(p.x, p.y);
    const old = pointers.get(e.pointerId);
    // keep sliding thumbs on the d-pad; ignore drift off a face button
    if (old.some((b) => b === 'left' || b === 'right' || b === 'up' || b === 'down') || h.length) pointers.set(e.pointerId, h);
    refreshTouch();
  });
  const release = (e) => { pointers.delete(e.pointerId); refreshTouch(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function human() {
    const i = AP.blankInput();
    for (const k in i) { i[k] = keys[k] || touch[k] || latch[k]; latch[k] = false; }
    return i;
  }

  function fit() {
    const st = document.getElementById('stage');
    const help = document.getElementById('help');
    const helpW = help && getComputedStyle(help).display !== 'none' ? help.offsetWidth + 40 : 0;
    const cs = getComputedStyle(st);
    const w = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - helpW;
    const h = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(w / 1080, h / 1920);
    canvas.style.width = Math.floor(1080 * s) + 'px';
    canvas.style.height = Math.floor(1920 * s) + 'px';
  }
  addEventListener('resize', fit); fit();

  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    let steps = 0;
    while (acc >= 1000 / 60 && steps < 4) {
      const inp = auto ? bot.think() : human();
      if (auto) { inp.select = keys.select || touch.select; }
      game.step(inp);
      if (game.mode === 'ending' && game.finished && (game.pressed('start') || game.pressed('a'))) restart();
      acc -= 1000 / 60; steps++;
    }
    if (steps === 4) acc = 0;
    game.render(ctx);
    requestAnimationFrame(frame);
  }
  function restart() {
    game.setMode('title'); game.music('title'); game.finished = false; game.titleOut = 0;
    bot.seen = new Map(); bot.bumped = new Set(); bot.count = 0;
  }
  const go = () => requestAnimationFrame((t) => { last = t; frame(t); });
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load(`900 40px ${AP.Art.FONT}`), document.fonts.load(`800 40px ${AP.Art.FONT}`)]).then(go, go);
  } else go();

  /* -------------------------------------------------------- recorder */
  function setupRecorder() {
    const events = [];
    game.on((type, name, frame) => { if (type === 'sfx' || type === 'music') events.push({ type, name, frame }); });
    game.resync();
    let wavBytes = null;
    const b64 = (u8) => {
      let s = '';
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    window.REC = {
      ready: false,
      frames(n, quality) {
        const imgs = [];
        for (let i = 0; i < n && !game.finished; i++) {
          game.step(bot.think());
          game.render(ctx);
          imgs.push(canvas.toDataURL('image/jpeg', quality || 0.92));
        }
        return { imgs, done: game.finished, frame: game.frame, mode: game.mode, level: game.levelIndex };
      },
      skip(n) { for (let i = 0; i < n && !game.finished; i++) game.step(bot.think()); game.render(ctx); return { frame: game.frame, mode: game.mode }; },
      prepareWav() { wavBytes = AP.Sound.wav(AP.Sound.mix(events, game.frame + 30)); return wavBytes.length; },
      wavChunk(i, size) { return b64(wavBytes.subarray(i, i + size)); },
      stats() { return { frame: game.frame, score: game.score, stats: game.stats, events: events.length }; },
    };
    const done = () => { game.render(ctx); window.REC.ready = true; };
    Promise.all([document.fonts.load(`900 40px ${AP.Art.FONT}`), document.fonts.load(`800 40px ${AP.Art.FONT}`)]).then(done, done);
  }
})();
