// Synthesized sounds. Every function takes (audioContext, destination, startTime, ...)
// so the same code drives live play and the offline render used for the video soundtrack.
(function (root) {
  const noiseCache = new WeakMap();
  function noise(ctx) {
    let b = noiseCache.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = b.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; }
      noiseCache.set(ctx, b);
    }
    return b;
  }
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);

  function tone(ctx, out, t, { type = 'sine', f0, f1 = f0, dur = 0.1, gain = 0.2, attack = 0.005, filter }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function hiss(ctx, out, t, { dur = 0.05, gain = 0.1, hp = 2000 }) {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noise(ctx);
    f.type = 'highpass';
    f.frequency.value = hp;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const Sfx = {
    move(ctx, out, t) { tone(ctx, out, t, { type: 'square', f0: 880, dur: 0.03, gain: 0.04, filter: 2400 }); },
    rotate(ctx, out, t) { tone(ctx, out, t, { type: 'triangle', f0: 620, f1: 980, dur: 0.07, gain: 0.09 }); },
    land(ctx, out, t, k = 1) {
      tone(ctx, out, t, { type: 'sine', f0: 210, f1: 80, dur: 0.09, gain: 0.22 * k });
      hiss(ctx, out, t, { dur: 0.03, gain: 0.04 * k, hp: 3000 });
    },
    pop(ctx, out, t, chain) {
      const up = Math.min(chain, 19) - 1;
      tone(ctx, out, t, { type: 'sine', f0: 330 * Math.pow(2, up / 24), f1: 1200 * Math.pow(2, up / 24), dur: 0.12, gain: 0.25 });
      tone(ctx, out, t + 0.05, { type: 'sine', f0: 500 * Math.pow(2, up / 24), f1: 1500 * Math.pow(2, up / 24), dur: 0.1, gain: 0.16 });
      hiss(ctx, out, t, { dur: 0.08, gain: 0.08, hp: 2500 });
    },
    // a little "pi-pi!" call that climbs with the chain number
    voice(ctx, out, t, chain) {
      const n = Math.min(chain, 19);
      const base = midi(72 + Math.min(n - 1, 18) * 1);
      const notes = n >= 15 ? [1, 1.26, 1.5, 2] : n >= 8 ? [1, 1.26, 1.5] : [1, 1.5];
      notes.forEach((m, i) => {
        const tt = t + i * 0.07;
        tone(ctx, out, tt, { type: 'square', f0: base * m * 0.94, f1: base * m, dur: 0.09, gain: 0.07, filter: 3200 });
        tone(ctx, out, tt, { type: 'sine', f0: base * m * 2, dur: 0.07, gain: 0.04 });
      });
    },
    allClear(ctx, out, t) {
      [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => tone(ctx, out, t + i * 0.07, { type: 'triangle', f0: midi(m), dur: 0.35, gain: 0.12 }));
    },
    fanfare(ctx, out, t) {
      const seq = [[0, 72], [0.12, 76], [0.24, 79], [0.36, 84], [0.6, 79], [0.72, 84]];
      seq.forEach(([d, m]) => tone(ctx, out, t + d, { type: 'square', f0: midi(m), dur: 0.22, gain: 0.07, filter: 3000 }));
      for (const m of [60, 64, 67, 72, 76]) tone(ctx, out, t + 0.84, { type: 'triangle', f0: midi(m), dur: 1.8, gain: 0.08, attack: 0.02 });
      for (const m of [84, 88, 91]) tone(ctx, out, t + 0.84, { type: 'square', f0: midi(m), dur: 1.2, gain: 0.03, filter: 4000 });
      hiss(ctx, out, t + 0.84, { dur: 0.6, gain: 0.08, hp: 6000 });
    },
    gameOver(ctx, out, t) {
      [67, 64, 60, 55].forEach((m, i) => tone(ctx, out, t + i * 0.16, { type: 'triangle', f0: midi(m), dur: 0.3, gain: 0.12 }));
    },
  };

  // ---- background tune (original): 8 bars, 8th-note grid ----
  const MELODY = [
    'E5 G5 A5 G5 E5 D5 C5 -', 'D5 E5 G5 E5 D5 - . .', 'E5 G5 A5 C6 A5 G5 E5 -', 'G5 A5 G5 E5 D5 - . .',
    'C5 D5 E5 G5 A5 - G5 -', 'A5 C6 D6 C6 A5 - . .', 'G5 A5 G5 E5 D5 E5 C5 -', 'D5 - E5 - C5 - . .'];
  const ROOTS = ['C3', 'G2', 'A2', 'G2', 'F2', 'D3', 'C3', 'G2'];
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const toMidi = n => 12 * (+n.slice(-1) + 1) + NOTE[n[0]];
  const BPM = 132, EIGHTH = 60 / BPM / 2, BAR = EIGHTH * 8;

  function marimba(ctx, out, t, f, len, gain) {
    tone(ctx, out, t, { type: 'sine', f0: f, dur: Math.min(0.5, len + 0.15), gain });
    tone(ctx, out, t, { type: 'sine', f0: f * 4, dur: 0.06, gain: gain * 0.25 });
  }

  // schedules bars [fromBar, toBar) starting at time t0; returns the loop length in seconds
  Sfx.bgm = function (ctx, out, t0, fromBar, toBar, vol = 1) {
    for (let b = fromBar; b < toBar; b++) {
      const bar = b % 8, tb = t0 + (b - fromBar) * BAR;
      const toks = MELODY[bar].split(' ');
      toks.forEach((tok, i) => {
        if (tok === '-' || tok === '.') return;
        let len = 1;
        while (toks[i + len] === '-') len++;
        marimba(ctx, out, tb + i * EIGHTH, midi(toMidi(tok)), len * EIGHTH, 0.09 * vol);
      });
      const r = toMidi(ROOTS[bar]);
      [0, 7, 12, 7].forEach((iv, q) => tone(ctx, out, tb + q * EIGHTH * 2, { type: 'triangle', f0: midi(r + iv), dur: EIGHTH * 1.6, gain: 0.13 * vol, attack: 0.01 }));
      for (let q = 0; q < 4; q++) hiss(ctx, out, tb + q * EIGHTH * 2 + EIGHTH, { dur: 0.04, gain: 0.025 * vol, hp: 7000 });
    }
    return BAR;
  };
  Sfx.BAR = BAR;

  // 16-bit PCM WAV from an AudioBuffer (used by the video renderer)
  Sfx.toWav = function (buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true);
    out.setUint16(34, 16, true); str(36, 'data'); out.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
    return out.buffer;
  };

  root.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
