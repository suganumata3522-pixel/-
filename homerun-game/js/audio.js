'use strict';
// 効果音はすべて WebAudio で合成。ライブ再生とオフライン書き出し(動画用)で同じ関数を使う。
(function () {
  const HR = window.HR;

  const noiseCache = new WeakMap();
  function noise(ctx) {
    let b = noiseCache.get(ctx);
    if (!b) {
      const len = ctx.sampleRate * 2;
      b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const w = Math.random() * 2 - 1;
          last = 0.97 * last + 0.03 * w;
          d[i] = w * 0.6 + last * 3.0;
        }
      }
      noiseCache.set(ctx, b);
    }
    return b;
  }

  function env(ctx, t, pts) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (const [dt, v, lin] of pts) {
      if (lin) g.gain.linearRampToValueAtTime(v, t + dt);
      else g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0001), t + dt);
    }
    return g;
  }
  function noiseSrc(ctx, t, dur, loop) {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx);
    s.loop = !!loop;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur);
    return s;
  }
  function filter(ctx, type, f, q) {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    if (q != null) b.Q.value = q;
    return b;
  }
  function tone(ctx, out, t, type, freq, dur, vol, slideTo) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = env(ctx, t, [[0.005, vol], [dur, 0.0001]]);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

  const synth = {
    // カキーン
    hit(ctx, out, t, o) {
      const p = o.power == null ? 1 : o.power;
      const n = noiseSrc(ctx, t, 0.12);
      n.connect(filter(ctx, 'highpass', 1800)).connect(env(ctx, t, [[0.002, 0.9 * p], [0.07, 0.0001]])).connect(out);
      for (const [f, d, a] of [[1290, 0.42, 0.42], [2090, 0.3, 0.3], [3370, 0.16, 0.2], [760, 0.2, 0.22]]) {
        tone(ctx, out, t, 'sine', f * 1.03, d * (0.6 + 0.4 * p), a * p, f);
      }
      tone(ctx, out, t, 'sine', 160, 0.08, 0.6 * p, 70);
    },
    swing(ctx, out, t) {
      const n = noiseSrc(ctx, t, 0.3);
      const bp = filter(ctx, 'bandpass', 500, 1.4);
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2200, t + 0.16);
      n.connect(bp).connect(env(ctx, t, [[0.08, 0.5], [0.24, 0.0001]])).connect(out);
    },
    throw(ctx, out, t) {
      const n = noiseSrc(ctx, t, 0.25);
      const bp = filter(ctx, 'bandpass', 900, 2);
      n.connect(bp).connect(env(ctx, t, [[0.05, 0.18], [0.2, 0.0001]])).connect(out);
    },
    // キャッチャーミット: バスッ
    mitt(ctx, out, t) {
      const n = noiseSrc(ctx, t, 0.15);
      n.connect(filter(ctx, 'lowpass', 1100)).connect(env(ctx, t, [[0.003, 1.0], [0.09, 0.0001]])).connect(out);
      tone(ctx, out, t, 'sine', 120, 0.1, 0.5, 60);
    },
    cheer(ctx, out, t, o) {
      const lv = o.level || 0.5, dur = o.dur || 3;
      const n = noiseSrc(ctx, t, dur + 0.2, true);
      const bp = filter(ctx, 'bandpass', 1100, 0.6);
      const lp = filter(ctx, 'lowpass', 3800);
      n.connect(bp).connect(lp).connect(env(ctx, t, [[0.35, lv, true], [dur * 0.55, lv * 0.8, true], [dur, 0.0001]])).connect(out);
      // 歓声のゆらぎ
      const n2 = noiseSrc(ctx, t, dur + 0.2, true);
      const bp2 = filter(ctx, 'bandpass', 2400, 1.2);
      n2.connect(bp2).connect(env(ctx, t, [[0.3, lv * 0.4, true], [dur * 0.7, lv * 0.25, true], [dur, 0.0001]])).connect(out);
    },
    groan(ctx, out, t) {
      const n = noiseSrc(ctx, t, 1.2);
      const bp = filter(ctx, 'bandpass', 900, 1.2);
      bp.frequency.setValueAtTime(950, t);
      bp.frequency.exponentialRampToValueAtTime(420, t + 1.0);
      n.connect(bp).connect(env(ctx, t, [[0.15, 0.32, true], [1.1, 0.0001]])).connect(out);
    },
    // ホームランのファンファーレ(オリジナル)
    fanfare(ctx, out, t) {
      const lp = filter(ctx, 'lowpass', 3600);
      const bus = ctx.createGain();
      bus.gain.value = 0.22;
      bus.connect(lp).connect(out);
      const s = 0.1;
      const mel = [[67, 0, 1], [72, 1, 1], [76, 2, 1], [79, 3, 2], [76, 5, 1], [79, 6, 1], [84, 7, 7]];
      for (const [nn, st, d] of mel) {
        tone(ctx, bus, t + st * s, 'square', NOTE(nn), d * s * 0.95, 0.8);
        tone(ctx, bus, t + st * s, 'sawtooth', NOTE(nn) * 1.005, d * s * 0.95, 0.35);
      }
      for (const [nn, st, d] of [[76, 7, 7], [79, 7, 7]]) tone(ctx, bus, t + st * s, 'square', NOTE(nn), d * s, 0.45);
      for (const [nn, st, d] of [[48, 0, 3], [43, 3, 4], [48, 7, 7]]) tone(ctx, bus, t + st * s, 'triangle', NOTE(nn), d * s, 1.2);
      for (const st of [0, 2, 3, 5, 6, 7]) {
        const n = noiseSrc(ctx, t + st * s, 0.12);
        n.connect(filter(ctx, 'highpass', 2500)).connect(env(ctx, t + st * s, [[0.002, 0.5], [0.08, 0.0001]])).connect(bus);
      }
    },
    firework(ctx, out, t) {
      const n = noiseSrc(ctx, t, 0.9);
      n.connect(filter(ctx, 'lowpass', 500)).connect(env(ctx, t, [[0.004, 0.9], [0.7, 0.0001]])).connect(out);
      for (let i = 0; i < 6; i++) {
        const tt = t + 0.25 + Math.random() * 0.5;
        const c = noiseSrc(ctx, tt, 0.05);
        c.connect(filter(ctx, 'highpass', 3000)).connect(env(ctx, tt, [[0.002, 0.25], [0.04, 0.0001]])).connect(out);
      }
    },
    // 球場のオルガン(オリジナルの短いフレーズ)
    organ(ctx, out, t) {
      const bus = ctx.createGain();
      bus.gain.value = 0.16;
      bus.connect(filter(ctx, 'lowpass', 2600)).connect(out);
      const s = 0.13;
      for (const [nn, st, d] of [[60, 0, 1], [64, 1, 1], [67, 2, 1], [72, 3, 2], [67, 5, 1], [72, 6, 3]]) {
        for (const mul of [1, 2, 0.5]) tone(ctx, bus, t + st * s, 'sawtooth', NOTE(nn) * mul, d * s * 0.9, mul === 1 ? 0.7 : 0.25);
      }
    },
    tick(ctx, out, t) { tone(ctx, out, t, 'square', 1320, 0.05, 0.08); },
    pop(ctx, out, t) { tone(ctx, out, t, 'triangle', 660, 0.12, 0.3, 1320); },
    whistle(ctx, out, t) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(2100, t);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 28;
      const lg = ctx.createGain();
      lg.gain.value = 90;
      lfo.connect(lg).connect(o.frequency);
      const g = env(ctx, t, [[0.02, 0.12], [0.5, 0.12, true], [0.6, 0.0001]]);
      o.connect(g).connect(out);
      o.start(t); o.stop(t + 0.62); lfo.start(t); lfo.stop(t + 0.62);
    },
  };

  // 観客のざわめき(ずっと鳴っている)
  function crowdBed(ctx, out, t, dur) {
    const n = noiseSrc(ctx, t, dur, true);
    const bp = filter(ctx, 'bandpass', 700, 0.5);
    const g = ctx.createGain();
    g.gain.value = 0.055;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.23;
    const lg = ctx.createGain();
    lg.gain.value = 0.018;
    lfo.connect(lg).connect(g.gain);
    lfo.start(t);
    lfo.stop(t + dur);
    n.connect(bp).connect(g).connect(out);
  }

  // ---------------- 公開API ----------------
  const A = {
    ctx: null, master: null, recDest: null, muted: false,
    offline: false, events: [], clock: () => 0,
  };

  A.init = function () {
    if (A.ctx || A.offline) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    A.ctx = new AC();
    A.master = A.ctx.createGain();
    A.master.gain.value = A.muted ? 0 : 0.9;
    A.master.connect(A.ctx.destination);
    if (A.ctx.createMediaStreamDestination) {
      A.recDest = A.ctx.createMediaStreamDestination();
      A.master.connect(A.recDest);
    }
    crowdBed(A.ctx, A.master, A.ctx.currentTime, 60 * 60 * 6);
  };
  A.resume = function () { if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.setMuted = function (m) {
    A.muted = m;
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.9, A.ctx.currentTime, 0.02);
  };
  A.play = function (name, opt) {
    if (A.offline) { A.events.push({ t: A.clock(), name, opt: opt || {} }); return; }
    if (!A.ctx || !synth[name]) return;
    synth[name](A.ctx, A.master, A.ctx.currentTime + 0.01, opt || {});
  };

  // 動画書き出し用: 記録したイベントをオフラインで合成して WAV を返す
  A.renderOffline = async function (duration) {
    const sr = 48000;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * duration), sr);
    const m = oc.createGain();
    m.gain.value = 0.9;
    const comp = oc.createDynamicsCompressor();
    m.connect(comp).connect(oc.destination);
    crowdBed(oc, m, 0, duration);
    for (const e of A.events) if (synth[e.name]) synth[e.name](oc, m, Math.max(0, e.t), e.opt);
    const buf = await oc.startRendering();
    return encodeWav(buf);
  };

  function encodeWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true);
    out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = [];
    for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
    return new Uint8Array(out.buffer);
  }

  // 実況の読み上げ(ブラウザの音声合成。動画の録画には入らない)
  const V = { enabled: true, voice: null };
  V.pick = function () {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices().filter((v) => /ja/i.test(v.lang));
    V.voice = vs.find((v) => /Kyoko|Otoya|Google|Nanami|Keita/i.test(v.name)) || vs[0] || null;
  };
  // interrupt=false のときは前のセリフを最後まで読んでから続ける
  V.say = function (text, interrupt) {
    if (!V.enabled || A.offline || A.muted || !('speechSynthesis' in window)) return;
    try {
      if (!V.voice) V.pick();
      if (interrupt !== false) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/[!!]+/g, '!'));
      u.lang = 'ja-JP';
      if (V.voice) u.voice = V.voice;
      u.rate = 1.2;
      u.pitch = 1.05;
      speechSynthesis.speak(u);
    } catch (e) { /* 読み上げ非対応の環境では無視 */ }
  };
  if ('speechSynthesis' in window) {
    try { speechSynthesis.onvoiceschanged = V.pick; } catch (e) { /* ignore */ }
  }

  HR.Audio = A;
  HR.Voice = V;
})();
