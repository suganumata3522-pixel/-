/* あつまれ ピクミンの森 — synth. All tunes are original compositions; samples are
 * generated in JS so the same audio is used live and for the video render. */
(function (G) {
  'use strict';
  const PM = G.PM = G.PM || {};
  const Sound = PM.Sound = {};
  const SR = Sound.SR = 44100;
  const TAU = Math.PI * 2;
  const MUSIC_VOL = 0.6, SFX_VOL = 0.9;

  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = (name) => { const m = /^([A-G][#b]?)(-?\d)$/.exec(name); return 12 * (+m[2] + 1) + PC[m[1]]; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function parse(seq) {
    return seq.trim().split(/\s+/).map((tok) => {
      const [n, l] = tok.split(':');
      return { m: n === 'R' ? null : midi(n), len: l ? +l : 2 };
    });
  }
  function chord(name) {
    const m = /^([A-G][#b]?)(m?)(7?)$/.exec(name);
    let r = 36 + PC[m[1]]; if (r < 40) r += 12;
    return { r, third: r + (m[2] ? 3 : 4), fifth: r + 7, minor: !!m[2] };
  }
  const nn = (m) => { const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; return names[m % 12] + (Math.floor(m / 12) - 1); };
  function bassLine(chords, style) {
    const out = [];
    for (const c of chords.trim().split(/\s+/)) {
      const k = chord(c);
      if (style === 'pulse') out.push(`${nn(k.r)}:2 ${nn(k.r)}:2 ${nn(k.r + 12)}:2 ${nn(k.r)}:2`);
      else if (style === 'drive') out.push(`${nn(k.r)}:1 ${nn(k.r)}:1 ${nn(k.r + 12)}:1 ${nn(k.r)}:1 ${nn(k.r)}:1 ${nn(k.r + 12)}:1 ${nn(k.r + 7)}:1 ${nn(k.r + 12)}:1`);
      else if (style === 'long') out.push(`${nn(k.r)}:6 ${nn(k.r + 7)}:2`);
      else out.push(`${nn(k.r)}:2 ${nn(k.fifth)}:2 ${nn(k.r + 12)}:2 ${nn(k.fifth)}:2`);
    }
    return out.join(' ');
  }
  function arpLine(chords, oct) {
    const out = [];
    for (const c of chords.trim().split(/\s+/)) {
      const k = chord(c), up = 12 * (oct || 2);
      const ns = [k.r, k.third, k.fifth, k.r + 12, k.fifth, k.third, k.r + 12, k.fifth].map((m) => nn(m + up) + ':1');
      out.push(ns.join(' '));
    }
    return out.join(' ');
  }

  const LEAD = { type: 'tri', vol: 0.26, attack: 0.006, decay: 0.16, sustain: 0.45, release: 0.08, vib: 0.004, gate: 0.92 };
  const BASS = { type: 'tri', vol: 0.24, attack: 0.004, decay: 0.08, sustain: 0.7, release: 0.04, gate: 0.85 };
  const ARP = { type: 'pulse', duty: 0.125, vol: 0.03, attack: 0.002, decay: 0.06, sustain: 0.35, release: 0.03, gate: 0.6 };
  const HARM = { type: 'pulse', duty: 0.25, vol: 0.028, attack: 0.004, decay: 0.12, sustain: 0.4, release: 0.05, gate: 0.85 };

  const TRACKS = Sound.tracks = {
    island: {
      bpm: 112, bars: 16, loop: true, drumVol: 0.5,
      lead: 'A4:4 C5:2 F5:2 E5:4 C5:4 | D5:4 F5:2 Bb5:2 A5:6 R:2 | G5:2 F5:2 E5:2 D5:2 C5:4 A4:4 | Bb4:4 D5:2 G5:2 F5:8 | ' +
        'A4:4 C5:2 F5:2 A5:4 G5:4 | F5:2 E5:2 D5:2 E5:2 F5:4 C5:4 | D5:2 E5:2 F5:2 G5:2 A5:3 G5:1 F5:4 | F5:8 R:4 C5:4 | ' +
        'D5:4 F5:2 A5:2 G5:4 F5:4 | E5:4 G5:2 C6:2 Bb5:4 A5:4 | Bb5:2 A5:2 G5:2 F5:2 G5:4 E5:4 | F5:4 A5:4 C6:8 | ' +
        'D6:2 C6:2 Bb5:2 A5:2 G5:4 Bb5:4 | A5:2 G5:2 F5:2 E5:2 F5:4 A4:4 | Bb4:2 D5:2 G5:2 Bb5:2 A5:2 G5:2 E5:2 C5:2 | F5:12 R:4',
      chords: 'F F Bb F C F Gm C F Dm Bb C Bb C F F Dm Am C F Bb C F F Bb Gm F Dm Gm C F F', drums: 'k...h.h.s...h.h.',
    },
    night: {
      bpm: 84, bars: 8, loop: true, drumVol: 0.3,
      lead: 'E5:4 G5:4 A5:6 R:2 | G5:4 E5:4 D5:6 R:2 | C5:4 D5:4 E5:4 G5:4 | A5:4 G5:4 E5:8 | E5:4 G5:4 C6:6 R:2 | B5:4 A5:4 G5:6 R:2 | F5:4 E5:4 D5:4 B4:4 | C5:12 R:4',
      chords: 'Am F C G F C Dm G Am F C G Dm G C C', drums: 'k.......h.......',
    },
    festival: {
      bpm: 132, bars: 8, loop: true, drumVol: 0.7,
      lead: 'C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:4 | F5:2 A5:2 C6:2 A5:2 G5:8 | E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 A5:4 | B5:2 A5:2 G5:2 F5:2 D5:4 G5:4 | ' +
        'C5:2 E5:2 G5:2 C6:2 B5:2 G5:2 E5:4 | F5:2 A5:2 C6:2 F6:2 E6:4 C6:4 | D6:2 C6:2 B5:2 A5:2 G5:2 A5:2 B5:4 | C6:8 G5:2 E5:2 C5:4',
      chords: 'C C F G C Am Dm G C C F Am Dm G C C', drums: 'k.h.s.h.k.h.s.hh',
    },
  };

  /* ---------------------------------------------------- primitives */
  function polyblep(t, dt) {
    if (t < dt) { t /= dt; return t + t - t * t - 1; }
    if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
    return 0;
  }
  function osc(type, ph, dt, duty) {
    if (type === 'pulse') {
      let v = ph < duty ? 1 : -1;
      v += polyblep(ph, dt); v -= polyblep((ph - duty + 1) % 1, dt);
      return v;
    }
    if (type === 'tri') return 4 * Math.abs(ph - 0.5) - 1;
    if (type === 'sine') return Math.sin(ph * TAU);
    return 2 * ph - 1 - polyblep(ph, dt);
  }
  function note(buf, start, f, dur, v) {
    const n0 = Math.floor(start * SR);
    const len = Math.min(Math.floor((dur + v.release) * SR), buf.length - n0);
    const a = Math.max(1, v.attack * SR), dEnd = (v.attack + v.decay) * SR, durS = dur * SR, rel = v.release * SR;
    const sus = v.sustain, vol = v.vol, pulse = v.type === 'pulse', duty = v.duty;
    const dt0 = f / SR, vib = v.vib || 0, vibStart = 0.14 * SR, vibW = TAU * 5.5 / SR;
    let ph = 0;
    for (let i = 0; i < len; i++) {
      let env = i < a ? i / a : i < dEnd ? 1 - (1 - sus) * (i - a) / (dEnd - a) : sus;
      if (i > durS) env *= 1 - (i - durS) / rel;
      const dt = vib && i > vibStart ? dt0 * (1 + Math.sin(i * vibW) * vib) : dt0;
      ph += dt; if (ph >= 1) ph -= 1;
      let s;
      if (pulse) {
        s = ph < duty ? 1 : -1;
        if (ph < dt) { const t = ph / dt; s += t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; s += t * t + t + t + 1; }
        let p2 = ph - duty; if (p2 < 0) p2 += 1;
        if (p2 < dt) { const t = p2 / dt; s -= t + t - t * t - 1; } else if (p2 > 1 - dt) { const t = (p2 - 1) / dt; s -= t * t + t + t + 1; }
      } else s = 4 * Math.abs(ph - 0.5) - 1;
      buf[n0 + i] += s * env * vol;
    }
  }
  let seed = 1;
  const noise = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x3fffffff - 1; };
  function drum(buf, start, kind, vol) {
    const n0 = Math.floor(start * SR);
    const dur = kind === 'k' ? 0.18 : kind === 's' ? 0.2 : 0.05;
    const len = Math.floor(dur * SR);
    let ph = 0, prev = 0;
    for (let i = 0; i < len && n0 + i < buf.length; i++) {
      const t = i / SR; let v = 0;
      if (kind === 'k') { const f = 45 + 130 * Math.exp(-t * 30); ph += f / SR; v = Math.sin(ph * TAU) * Math.exp(-t * 16) * 0.9; }
      else if (kind === 's') { ph += 185 / SR; v = noise() * Math.exp(-t * 22) * 0.55 + Math.sin(ph * TAU) * Math.exp(-t * 30) * 0.35; }
      else { const n = noise(); v = (n - prev) * Math.exp(-t * 80) * 0.35; prev = n; }
      buf[n0 + i] += v * vol;
    }
  }

  function renderTrack(name) {
    const d = TRACKS[name];
    const step = 60 / d.bpm / 4, steps = d.bars * 16, total = steps * step;
    const buf = new Float32Array(Math.ceil((total + 1.2) * SR));
    seed = 7;
    const voices = [
      [Object.assign({}, LEAD, d.leadDuty ? { duty: d.leadDuty } : {}), d.lead.replace(/\|/g, ' ')],
      [BASS, bassLine(d.chords, d.bass)],
      [ARP, arpLine(d.chords, 2)],
      [HARM, d.lead.replace(/\|/g, ' ')],
    ];
    voices.forEach(([v, seq], vi) => {
      let pos = 0;
      for (const n of parse(seq)) {
        if (n.m != null) {
          let m = n.m;
          if (vi === 3) { m += 12; }
          note(buf, pos * step, hz(m), n.len * step * v.gate, v);
        }
        pos += n.len;
      }
      if (pos !== steps && typeof console !== 'undefined') console.warn('track', name, 'voice', vi, 'has', pos, 'steps, expected', steps);
    });
    for (let s = 0; s < steps; s++) {
      const ch = d.drums[s % 16];
      if (ch !== '.') drum(buf, s * step, ch, (ch === 'k' ? 0.42 : ch === 's' ? 0.22 : 0.12) * (d.drumVol == null ? 1 : d.drumVol));
    }
    const L = Math.round(total * SR);
    if (d.loop) {
      for (let i = L; i < buf.length; i++) buf[i - L] += buf[i];
      return buf.slice(0, L);
    }
    return buf.slice(0, Math.min(buf.length, L + Math.round(0.6 * SR)));
  }

  /* ------------------------------------------------------- SFX */
  function synth(dur, fn) {
    const n = Math.ceil(dur * SR), out = new Float32Array(n);
    const st = { ph: 0, ph2: 0, prev: 0, lp: 0 };
    for (let i = 0; i < n; i++) out[i] = fn(i / SR, st, i);
    return out;
  }
  function tone(st, f, type, duty, key) {
    const k = key || 'ph';
    const dt = f / SR; st[k] += dt; if (st[k] >= 1) st[k] -= Math.floor(st[k]);
    return osc(type, st[k], dt, duty);
  }
  function arpeggio(notes, each, type, duty, vol, tailMul) {
    const dur = notes.length * each + each * (tailMul || 3);
    return synth(dur, (t, st) => {
      const i = Math.min(notes.length - 1, Math.floor(t / each));
      const lt = t - i * each;
      const env = i === notes.length - 1 ? Math.exp(-lt * 6) : Math.exp(-lt * 10);
      return tone(st, hz(midi(notes[i])), type, duty) * env * vol;
    });
  }  function melody(seq, bpm, voice, extra) {
    const step = 60 / bpm / 4, notes = parse(seq);
    const total = notes.reduce((a, n) => a + n.len, 0) * step + 0.8;
    const buf = new Float32Array(Math.ceil(total * SR));
    let pos = 0;
    for (const n of notes) { if (n.m != null) note(buf, pos * step, hz(n.m), n.len * step * 0.9, voice); pos += n.len; }
    if (extra) extra(buf, step);
    return buf;
  }
  const BELL = { type: 'tri', vol: 0.32, attack: 0.002, decay: 0.25, sustain: 0.2, release: 0.12, gate: 1 };
  const SFX = {
    pluck: () => synth(0.22, (t, st) => tone(st, 170 * Math.exp(-t * 14), 'sine', 0) * 0.6 * Math.exp(-t * 18) + tone(st, 520 * Math.pow(3, t / 0.08), 'pulse', 0.5, 'ph2') * 0.16 * Math.max(0, 1 - t / 0.1)),
    hey: () => synth(0.14, (t, st) => tone(st, (1500 + t * 3000) * (1 + Math.sin(t * TAU * 40) * 0.04), 'pulse', 0.35) * 0.09 * Math.sin(Math.PI * t / 0.14)),
    throw: () => synth(0.22, (t, st) => { st.lp += (noise() - st.lp) * (0.06 + t); return st.lp * 0.5 * Math.sin(Math.PI * t / 0.22) + tone(st, 900 - t * 1400, 'sine', 0) * 0.08 * (1 - t / 0.22); }),
    whistle: () => synth(0.5, (t, st) => tone(st, (1150 + t * 300) * (1 + Math.sin(t * TAU * 16) * 0.025), 'sine', 0) * 0.28 * Math.min(1, t * 30) * Math.min(1, (0.5 - t) * 12)),
    chop: () => synth(0.1, (t, st) => tone(st, 470, 'tri', 0) * 0.32 * Math.exp(-t * 45) + noise() * 0.12 * Math.exp(-t * 90)),
    clink: () => synth(0.12, (t, st) => (tone(st, 2300, 'pulse', 0.5) * 0.06 + tone(st, 3450, 'sine', 0, 'ph2') * 0.08) * Math.exp(-t * 40) + noise() * 0.08 * Math.exp(-t * 120)),
    hammer: () => synth(0.09, (t, st) => tone(st, 330, 'tri', 0) * 0.3 * Math.exp(-t * 50) + noise() * 0.1 * Math.exp(-t * 110)),
    tug: () => synth(0.07, (t) => noise() * 0.08 * Math.exp(-t * 60)),
    timber: () => synth(0.5, (t, st) => tone(st, 260 - t * 260, 'saw', 0) * 0.08 * Math.min(1, (0.5 - t) * 6) + noise() * 0.03),
    thud: () => synth(0.32, (t, st) => tone(st, 85 * Math.exp(-t * 3), 'sine', 0) * 0.7 * Math.exp(-t * 9) + noise() * 0.25 * Math.exp(-t * 25)),
    crack: () => synth(0.35, (t, st) => { st.lp += (noise() - st.lp) * 0.35; return st.lp * 0.9 * Math.exp(-t * 12) + tone(st, 1800, 'pulse', 0.5) * 0.05 * Math.exp(-t * 30); }),
    shake: () => synth(0.4, (t, st) => { st.lp += (noise() - st.lp) * 0.5; return (noise() - st.lp) * 0.22 * Math.sin(Math.PI * t / 0.4) * (0.6 + 0.4 * Math.sin(t * TAU * 22)); }),
    pop: () => synth(0.1, (t, st) => tone(st, 400 * Math.pow(3, t / 0.08), 'sine', 0) * 0.3 * (1 - t / 0.1)),
    puchi: () => synth(0.07, (t, st) => tone(st, 900 + t * 4000, 'pulse', 0.5) * 0.1 * (1 - t / 0.07)),
    deliver: () => arpeggio(['E6', 'A6'], 0.07, 'tri', 0, 0.22, 3),
    slurp: () => synth(0.32, (t, st) => tone(st, (300 + t * 1800) * (1 + Math.sin(t * TAU * 18) * 0.05), 'sine', 0) * 0.22 * Math.sin(Math.PI * t / 0.32)),
    seed: () => synth(0.42, (t, st) => { const i = Math.min(2, Math.floor(t / 0.11)), lt = t - i * 0.11; return tone(st, [500, 650, 820][i] * Math.pow(2, lt / 0.06), 'sine', 0) * 0.28 * Math.exp(-lt * 22); }),
    place: () => arpeggio(['G5', 'D6'], 0.08, 'tri', 0, 0.26, 4),
    built: () => melody('G5:1 C6:1 E6:1 G6:1 E6:2 G6:2 C7:8', 150, BELL, (buf, step) => {
      note(buf, 8 * step, hz(midi('E6')), 8 * step, Object.assign({}, BELL, { vol: 0.16 }));
      note(buf, 8 * step, hz(midi('G5')), 8 * step, Object.assign({}, BELL, { vol: 0.16 }));
    }),
    star: () => arpeggio(['C6', 'E6', 'G6', 'C7', 'E7'], 0.06, 'tri', 0, 0.24, 5),
    caption: () => arpeggio(['A5', 'E6'], 0.06, 'sine', 0, 0.13, 4),
    start: () => melody('C6:2 E6:2 G6:2 C7:6', 140, BELL),
    engine: () => synth(2.2, (t, st) => (tone(st, 70 + Math.sin(t * 7) * 6, 'saw', 0) * 0.12 + noise() * 0.06) * Math.min(1, t * 2) * Math.min(1, (2.2 - t) * 2)),
    land: () => synth(0.45, (t, st) => tone(st, 70 * Math.exp(-t * 2), 'sine', 0) * 0.7 * Math.exp(-t * 7) + noise() * 0.3 * Math.exp(-t * 14)),
    hop: () => synth(0.16, (t, st) => tone(st, 420 * Math.pow(2.5, t / 0.14), 'pulse', 0.25) * 0.14 * (1 - t / 0.16)),
    firework: () => synth(1.1, (t, st) => {
      if (t < 0.32) return tone(st, 500 + t * 2600, 'sine', 0) * 0.07;
      const lt = t - 0.32; st.lp += (noise() - st.lp) * 0.45;
      const crackle = lt > 0.12 && noise() > 0.92 ? noise() * 0.35 : 0;
      return st.lp * 0.6 * Math.exp(-lt * 6) + crackle * Math.exp(-lt * 3) + tone(st, 60, 'sine', 0, 'ph2') * 0.4 * Math.exp(-lt * 10);
    }),
  };

  const cacheM = {}, cacheS = {};
  Sound.music = (name) => cacheM[name] || (cacheM[name] = renderTrack(name));
  Sound.sfx = (name) => cacheS[name] || (cacheS[name] = SFX[name] ? SFX[name]() : new Float32Array(1));
  Sound.names = { music: Object.keys(TRACKS), sfx: Object.keys(SFX) };

  /* Mix a recorded event list (game frames at 60 fps) into one mono track.
   * opts.bgm === false drops the looping background music but keeps every sound
   * effect and the one-shot jingles (stage start, stage clear, victory). */
  Sound.mix = function (events, totalFrames, opts) {
    const bgm = !(opts && opts.bgm === false);
    const len = Math.ceil(totalFrames / 60 * SR) + SR;
    const out = new Float32Array(len);
    let cur = null;
    const stop = (at) => {
      if (!cur) return;
      const data = Sound.music(cur.name), loop = TRACKS[cur.name].loop;
      const end = Math.min(at, len);
      for (let i = cur.start; i < end; i++) {
        const k = i - cur.start;
        if (!loop && k >= data.length) break;
        const fade = Math.min(1, (end - i) / 400);
        out[i] += data[loop ? k % data.length : k] * MUSIC_VOL * fade;
      }
      cur = null;
    };
    for (const ev of events) {
      const s = Math.max(0, Math.round((ev.frame - 1) / 60 * SR));
      if (ev.type === 'music') { stop(s); if (ev.name && (bgm || !TRACKS[ev.name].loop)) cur = { name: ev.name, start: s }; }
      else if (ev.type === 'sfx') {
        const d = Sound.sfx(ev.name);
        for (let i = 0; i < d.length && s + i < len; i++) out[s + i] += d[i] * SFX_VOL;
      }
    }
    stop(len);
    for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * 1.05);
    return out;
  };
  Sound.wav = function (samples) {
    const n = samples.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
    return new Uint8Array(buf);
  };

  /* Live playback through Web Audio. */
  class LivePlayer {
    constructor() { this.ctx = null; this.bufs = {}; this.cur = null; this.want = null; this.muted = false; }
    unlock() {
      if (!this.ctx) {
        const AC = G.AudioContext || G.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.8; this.out.connect(this.ctx.destination);
        this.playMusic(this.want);
        const names = Sound.names.music.slice();
        const warm = () => { const n = names.shift(); if (n) { this.buf('m', n); setTimeout(warm, 30); } };
        setTimeout(warm, 50);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    buf(kind, name) {
      const key = kind + name;
      if (!this.bufs[key]) {
        const d = kind === 'm' ? Sound.music(name) : Sound.sfx(name);
        const b = this.ctx.createBuffer(1, d.length, SR); b.getChannelData(0).set(d);
        this.bufs[key] = b;
      }
      return this.bufs[key];
    }
    handle(type, name) { if (type === 'sfx') this.playSfx(name); else if (type === 'music') this.playMusic(name); }
    setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.8; }
    playSfx(name) {
      if (!this.ctx) return;
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      g.gain.value = SFX_VOL; s.buffer = this.buf('s', name); s.connect(g); g.connect(this.out); s.start();
    }
    playMusic(name) {
      this.want = name;
      if (!this.ctx) return;
      if (this.cur) { try { this.cur.stop(); } catch (e) { /* already stopped */ } this.cur = null; }
      if (!name) return;
      const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
      g.gain.value = MUSIC_VOL; s.buffer = this.buf('m', name); s.loop = !!TRACKS[name].loop;
      s.connect(g); g.connect(this.out); s.start(); this.cur = s;
    }
  }
  Sound.LivePlayer = LivePlayer;
})(typeof window !== 'undefined' ? window : globalThis);

