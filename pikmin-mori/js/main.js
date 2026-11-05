/* Browser boot: live play (tap / keyboard / autoplay) or ?record=1 capture mode. */
(function () {
  'use strict';
  const PM = window.PM;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const RECORD = /[?&]record\b/.test(location.search);
  const FF = 10; // simulation steps per video frame while fast-forwarding

  const game = new PM.Game();
  const bot = new PM.Bot(game);
  PM.Art.init(game);

  if (RECORD) { setupRecorder(); return; }

  /* ------------------------------------------------------------ live */
  const audio = new PM.Sound.LivePlayer();
  game.on((type, name) => { if (type === 'sfx' || type === 'music') audio.handle(type, name); });
  game.auto = false;

  const keys = {};
  let pointer = null; // { wx, wy, target, sprout, held }
  addEventListener('keydown', (e) => {
    audio.unlock();
    if (game.mode === 'title') { game.start(); return; }
    keys[e.code] = true;
    if (e.code === 'KeyX') game.whistle();
    if (e.code === 'Tab') { e.preventDefault(); game.auto = !game.auto; }
    if (e.code === 'KeyM') audio.setMuted(!audio.muted);
    if (e.code === 'KeyC') game.manualZoom = game.manualZoom < 1 ? 1 : 0.62;
    if (e.code === 'Space') { e.preventDefault(); throwNearest(); }
    if (e.code === 'KeyZ') pluckNearest();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * 1080 / r.width, y: (e.clientY - r.top) * 1920 / r.height };
  }
  function toWorld(sx, sy) {
    const V = PM.VIEW, c = game.cam;
    return { x: (sx - V.w / 2) / c.zoom + c.x, y: (sy - V.y - V.h / 2) / c.zoom + c.y };
  }
  function nearestSprout(x, y, r) {
    let best = null, bd = r;
    for (const p of game.pikmin) { if (p.state !== 'sprout') continue; const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function throwNearest() {
    const o = game.olimar;
    let best = null, bd = 320;
    for (const t of game.items.concat(game.objects)) {
      if (!t.freeSlots || t.freeSlots() <= 0) continue;
      const d = Math.hypot(t.x - o.x, t.y - o.y); if (d < bd) { bd = d; best = t; }
    }
    if (best) game.throwAt(best);
  }
  function pluckNearest() { const s = nearestSprout(game.olimar.x, game.olimar.y, 90); if (s) game.pluck(s); }

  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock(); e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    if (game.mode === 'title') { game.start(); return; }
    for (const b of PM.Art.buttons) {
      if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2) {
        if (b.id === 'whistle') game.whistle();
        if (b.id === 'zoom') game.manualZoom = game.manualZoom < 1 ? 1 : 0.62;
        if (b.id === 'auto') game.auto = !game.auto;
        return;
      }
    }
    const V = PM.VIEW;
    if (p.y < V.y || p.y > V.y + V.h) return;
    const w = toWorld(p.x, p.y), r = 80 / game.cam.zoom;
    const sprout = nearestSprout(w.x, w.y, r * 0.8);
    const target = sprout ? null : game.targetAt(w.x, w.y, r);
    pointer = { wx: w.x, wy: w.y, sprout, target, held: true, t: 0 };
    if (!sprout && !target) game.olimar.moveTo(w.x, w.y);
  });
  canvas.addEventListener('pointerup', () => { if (pointer) pointer.held = false; });
  canvas.addEventListener('pointercancel', () => { pointer = null; });

  function humanStep() {
    const o = game.olimar;
    if (game.mode === 'play') game.placeNext();
    let kx = 0, ky = 0;
    if (keys.ArrowLeft || keys.KeyA) kx--; if (keys.ArrowRight || keys.KeyD) kx++;
    if (keys.ArrowUp || keys.KeyW) ky--; if (keys.ArrowDown || keys.KeyS) ky++;
    if (kx || ky) { o.moveTo(o.x + kx * 40, o.y + ky * 40); pointer = null; }
    if (!pointer) return;
    pointer.t++;
    if (pointer.sprout) {
      const s = pointer.sprout;
      if (s.state !== 'sprout') { pointer = null; return; }
      if (Math.hypot(s.x - o.x, s.y - o.y) < 60) { o.tx = null; game.pluck(s); pointer = null; }
      else o.moveTo(s.x + (o.x < s.x ? -34 : 34), s.y + 4);
    } else if (pointer.target) {
      const t = pointer.target;
      if (!t.freeSlots || t.freeSlots() <= 0) { pointer = null; return; }
      const d = Math.hypot(t.x - o.x, t.y - o.y);
      if (d > 300) { o.moveTo(t.x + (o.x < t.x ? -180 : 180), t.y + 40); return; }
      o.tx = null;
      if (o.throwT === 0 && (pointer.t === 1 || pointer.held || pointer.thrown < 1)) {
        if (game.throwAt(t)) pointer.thrown = (pointer.thrown || 0) + 1;
        if (!pointer.held && pointer.thrown >= 1) pointer = null;
      }
    }
  }

  function fit() {
    const st = document.getElementById('stage'), help = document.getElementById('help');
    const cs = getComputedStyle(st);
    const helpW = help && getComputedStyle(help).display !== 'none' ? help.offsetWidth + 40 : 0;
    const w = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - helpW;
    const h = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(w / 1080, h / 1920);
    canvas.style.width = Math.floor(1080 * s) + 'px'; canvas.style.height = Math.floor(1920 * s) + 'px';
  }
  addEventListener('resize', fit); fit();

  let last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= 1000 / 60 && n < 4) {
      if (game.auto) bot.step(); else humanStep();
      game.step();
      acc -= 1000 / 60; n++;
    }
    if (n === 4) acc = 0;
    game.render(ctx);
    requestAnimationFrame(frame);
  }
  const go = () => requestAnimationFrame((t) => { last = t; frame(t); });
  Promise.all([document.fonts.load(`900 40px ${PM.Art.FONT}`), document.fonts.load(`800 40px ${PM.Art.FONT}`)]).then(go, go);

  /* -------------------------------------------------------- recorder */
  function setupRecorder() {
    game.recording = true; game.cinematic = true;
    const events = [];
    let vframe = 0;
    const lastAt = {};
    // while fast-forwarding, keep only the sounds that matter and thin out repeats
    const FF_KEEP = { built: 0, star: 0, firework: 0, place: 0, crack: 20, thud: 20, deliver: 14, pluck: 10, seed: 20, timber: 20, slurp: 20 };
    game.on((type, name) => {
      if (type === 'music') { events.push({ type, name, frame: vframe }); return; }
      if (type !== 'sfx') return;
      if (game.ff) {
        if (!(name in FF_KEEP)) return;
        if (lastAt[name] != null && vframe - lastAt[name] < FF_KEEP[name]) return;
      }
      lastAt[name] = vframe;
      events.push({ type, name, frame: vframe });
    });
    let wavBytes = null;
    const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    window.REC = {
      ready: false,
      frames(n, quality) {
        const imgs = [];
        for (let i = 0; i < n && !game.finished; i++) {
          const slow = game.mode !== 'play' || game.hl != null || game.hlQueue.length > 0;
          game.ff = !slow;
          const steps = slow ? 1 : FF;
          for (let k = 0; k < steps && !game.finished; k++) { bot.step(); game.step(); }
          game.render(ctx);
          imgs.push(canvas.toDataURL('image/jpeg', quality || 0.92));
          vframe++;
        }
        return { imgs, done: game.finished, frame: game.frame, mode: game.mode, vframe };
      },
      skip(n) {
        for (let i = 0; i < n && !game.finished; i++) {
          const slow = game.mode !== 'play' || game.hl != null || game.hlQueue.length > 0;
          game.ff = !slow;
          const steps = slow ? 1 : FF;
          for (let k = 0; k < steps && !game.finished; k++) { bot.step(); game.step(); }
          vframe++;
        }
        game.render(ctx);
        return { frame: game.frame, mode: game.mode, vframe };
      },
      prepareWav(opts) { wavBytes = PM.Sound.wav(PM.Sound.mix(events, vframe + 30, opts)); return wavBytes.length; },
      wavChunk(i, size) { return b64(wavBytes.subarray(i, i + size)); },
      stats() { return { frame: game.frame, vframe, events: events.length, built: game.built, pikmin: game.pikmin.length }; },
    };
    const done = () => { game.render(ctx); window.REC.ready = true; };
    Promise.all([document.fonts.load(`900 40px ${PM.Art.FONT}`), document.fonts.load(`800 40px ${PM.Art.FONT}`)]).then(done, done);
  }
})();
