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

  // ---- tiny-creature voice: a source-filter (formant) synth ----
  // Adult vowel formants (Hz), scaled up as if the speaker were very small.
  const VOWEL = { a: [800, 1200, 2600], i: [300, 2300, 3000], u: [350, 1250, 2400], e: [450, 1900, 2600], o: [500, 900, 2400] };
  const SIZE = 1.75;
  // each word: duration, pitch contour (start, peak, end multipliers), starts with a breathy h?, vowel path [[when 0..1, vowel]]
  const WORDS = {
    hoi: { dur: 0.21, glide: [0.94, 1.14, 1.02], h: true, path: [[0, 'o'], [0.45, 'o'], [0.8, 'i']] },
    hei: { dur: 0.2, glide: [0.96, 1.12, 1.0], h: true, path: [[0, 'e'], [0.45, 'e'], [0.8, 'i']] },
    ya: { dur: 0.17, glide: [1.0, 1.16, 0.94], h: false, path: [[0, 'i'], [0.28, 'a']] },
    wa: { dur: 0.18, glide: [0.9, 1.16, 1.0], h: false, path: [[0, 'u'], [0.3, 'a']] },
    yaa: { dur: 0.42, glide: [1.0, 1.22, 0.9], h: false, path: [[0, 'i'], [0.18, 'a']] },
    waai: { dur: 0.6, glide: [0.9, 1.25, 0.96], h: false, path: [[0, 'u'], [0.14, 'a'], [0.58, 'a'], [0.88, 'i']] },
  };
  const CHAIN_WORDS = ['hoi', 'hei', 'ya', 'hoi', 'wa'];
  const hash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };

  function cry(ctx, out, t, f0, w, gain, r) {
    const dur = w.dur * (0.92 + r * 0.16), end = t + dur;
    const src = ctx.createOscillator();
    src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0 * w.glide[0], t);
    src.frequency.linearRampToValueAtTime(f0 * w.glide[1], t + dur * 0.35);
    src.frequency.linearRampToValueAtTime(f0 * w.glide[2], end);
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 6.5 + r * 2;
    depth.gain.value = f0 * 0.022;
    lfo.connect(depth);
    depth.connect(src.frequency);
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 6500;
    src.connect(soften);

    const env = ctx.createGain(), on = t + (w.h ? 0.028 : 0);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.setValueAtTime(0.0001, on);
    env.gain.linearRampToValueAtTime(gain, on + 0.016);
    env.gain.setValueAtTime(gain, end - 0.035);
    env.gain.linearRampToValueAtTime(0.0001, end);
    env.connect(out);

    // three formant resonators following the vowel path
    [1, 0.9, 0.5].forEach((amp, k) => {
      const bp = ctx.createBiquadFilter(), g = ctx.createGain();
      bp.type = 'bandpass';
      bp.Q.value = [4.5, 7, 9][k];
      w.path.forEach(([when, v], j) => {
        const F = VOWEL[v][k] * SIZE;
        if (j === 0) bp.frequency.setValueAtTime(F, t);
        else bp.frequency.linearRampToValueAtTime(F, t + dur * when);
      });
      g.gain.value = amp * 2.2;
      soften.connect(bp);
      bp.connect(g);
      g.connect(env);
    });

    // breathy onset ("h") and a little air under the whole cry
    const air = ctx.createBufferSource(), airF = ctx.createBiquadFilter(), airG = ctx.createGain();
    air.buffer = noise(ctx);
    air.loop = true;
    airF.type = 'bandpass';
    airF.frequency.value = 3200;
    airF.Q.value = 0.8;
    airG.gain.setValueAtTime(w.h ? gain * 0.9 : gain * 0.12, t);
    airG.gain.exponentialRampToValueAtTime(gain * 0.06, t + 0.05);
    airG.gain.linearRampToValueAtTime(0.0001, end);
    air.connect(airF);
    airF.connect(airG);
    airG.connect(out);

    src.start(t); src.stop(end + 0.02);
    lfo.start(t); lfo.stop(end + 0.02);
    air.start(t); air.stop(end + 0.02);
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
    // the sprouts shout on every chain: higher each time, and more of them join in as it grows
    voice(ctx, out, t, chain) {
      const n = Math.min(chain, 19);
      const base = 540 * Math.pow(2, (n - 1) / 22);
      const word = CHAIN_WORDS[(n - 1) % CHAIN_WORDS.length];
      const voices = Math.min(6, 1 + Math.floor((n - 1) / 3));
      for (let v = 0; v < voices; v++) {
        const r = hash(n * 13 + v * 7);
        cry(ctx, out, t + (v ? 0.02 + r * 0.06 : 0), v ? base * (0.82 + r * 0.42) : base, v ? WORDS[CHAIN_WORDS[(n + v) % CHAIN_WORDS.length]] : WORDS[word], v ? 0.13 : 0.3, r);
      }
      if (n >= 10) cry(ctx, out, t + 0.2, base * 1.12, WORDS.hoi, 0.24, hash(n));
    },
    // single "ホイッ!" when the trigger pair lands
    hoi(ctx, out, t) { cry(ctx, out, t, 600, WORDS.hoi, 0.3, 0.4); },
    // everybody cheers "ワーイ!"
    cheer(ctx, out, t) {
      for (let v = 0; v < 12; v++) {
        const r = hash(500 + v * 11);
        cry(ctx, out, t + r * 0.45, 480 + r * 420, v % 3 ? WORDS.waai : WORDS.yaa, v ? 0.12 : 0.24, r);
      }
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
