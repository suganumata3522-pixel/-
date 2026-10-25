/* Chiptune synth. Every tune here is an original composition; samples are
 * generated in JS so the same audio is used live and for the video render. */
(function (G) {
  'use strict';
  const AP = G.AP = G.AP || {};
  const Sound = AP.Sound = {};
  const SR = Sound.SR = 44100;
  const TAU = Math.PI * 2;
  const MUSIC_VOL = 0.75, SFX_VOL = 0.9;

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

  const LEAD = { type: 'pulse', duty: 0.25, vol: 0.15, attack: 0.004, decay: 0.09, sustain: 0.65, release: 0.04, vib: 0.006, gate: 0.88 };
  const BASS = { type: 'tri', vol: 0.30, attack: 0.003, decay: 0.05, sustain: 0.85, release: 0.02, gate: 0.8 };
  const ARP = { type: 'pulse', duty: 0.125, vol: 0.045, attack: 0.002, decay: 0.05, sustain: 0.5, release: 0.02, gate: 0.7 };
  const HARM = { type: 'pulse', duty: 0.5, vol: 0.06, attack: 0.004, decay: 0.1, sustain: 0.6, release: 0.04, gate: 0.85 };

  const TRACKS = Sound.tracks = {
    title: {
      bpm: 132, bars: 8, loop: true,
      lead: 'G4:2 C5:2 E5:2 G5:2 E5:4 C5:4 | A4:2 D5:2 F5:2 A5:2 G5:8 | E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 | F5:2 E5:2 D5:2 E5:2 D5:8 | G4:2 C5:2 E5:2 G5:2 A5:4 G5:4 | F5:2 A5:2 C6:4 B5:2 G5:2 E5:4 | D5:2 F5:2 A5:2 G5:2 F5:2 E5:2 D5:2 B4:2 | C5:8 R:8',
      chords: 'C C Dm G C Am F G C F F Em Dm G C C', drums: 'k...h...s...h...',
    },
    field: {
      bpm: 150, bars: 16, loop: true,
      lead: 'C5:2 E5:2 G5:2 E5:2 A5:3 G5:1 E5:2 C5:2 | D5:2 F5:2 A5:2 F5:2 G5:6 R:2 | E5:2 G5:2 C6:2 G5:2 A5:2 G5:2 F5:2 E5:2 | D5:4 G4:2 B4:2 D5:6 R:2 | ' +
        'C5:2 E5:2 G5:2 E5:2 A5:3 G5:1 A5:2 C6:2 | B5:2 A5:2 G5:2 F5:2 E5:4 G5:4 | F5:2 E5:2 D5:2 C5:2 D5:2 E5:2 G5:2 B4:2 | C5:6 G4:2 C5:4 R:4 | ' +
        'A4:2 C5:2 F5:4 E5:2 C5:2 A4:4 | B4:2 D5:2 G5:4 F5:2 D5:2 B4:4 | C5:2 E5:2 A5:4 G5:2 E5:2 C5:2 E5:2 | F5:4 E5:4 D5:4 G4:4 | ' +
        'A4:2 C5:2 F5:4 A5:2 G5:2 F5:4 | E5:2 G5:2 C6:4 B5:2 A5:2 G5:4 | F5:2 A5:2 G5:2 F5:2 E5:2 D5:2 C5:2 D5:2 | C5:4 G4:2 E4:2 C4:4 R:4',
      chords: 'C C Dm G C F G G C F G C F G C C F Am G G Am C Dm G F F C Em Dm G C C', drums: 'k.h.s.h.k.hks.h.',
    },
    forest: {
      bpm: 128, bars: 16, loop: true,
      lead: 'G4:2 B4:2 D5:4 E5:2 D5:2 B4:4 | C5:2 E5:2 G5:4 F#5:2 E5:2 D5:4 | B4:2 D5:2 G5:4 A5:2 G5:2 E5:4 | C5:3 D5:1 E5:4 D5:8 | ' +
        'G5:2 F#5:2 E5:2 D5:2 E5:2 D5:2 B4:4 | C5:2 B4:2 A4:2 G4:2 A4:4 D5:4 | B4:2 C5:2 D5:2 G5:2 F#5:2 E5:2 D5:2 C5:2 | B4:4 A4:2 F#4:2 G4:8 | ' +
        'E5:4 E5:2 F#5:2 G5:4 E5:4 | D5:4 B4:2 G4:2 A4:6 R:2 | C5:4 C5:2 D5:2 E5:4 G5:4 | F#5:2 E5:2 D5:2 E5:2 F#5:4 A5:4 | ' +
        'G5:3 F#5:1 E5:2 D5:2 E5:2 D5:2 B4:4 | C5:2 D5:2 E5:2 G5:2 F#5:4 D5:4 | B4:2 D5:2 G5:2 B5:2 A5:2 G5:2 F#5:2 A5:2 | G5:8 D5:4 B4:2 A4:2',
      chords: 'G Em C D G Em C D C G Am D G D D G Em C G D C C D D Em G C D G D G D', drums: 'k...h.h.s...h.h.', bass: 'walk',
    },
    castle: {
      bpm: 120, bars: 8, loop: true,
      lead: 'D4:2 F4:2 A4:2 D5:2 C#5:4 A4:4 | D5:2 E5:2 F5:2 E5:2 D5:4 A4:4 | Bb4:2 D5:2 F5:4 E5:2 D5:2 C#5:4 | D5:6 A4:2 D4:8 | ' +
        'F5:2 E5:2 D5:2 C5:2 Bb4:4 A4:4 | G4:2 Bb4:2 D5:2 F5:2 E5:4 C5:4 | A4:2 C#5:2 E5:2 G5:2 F5:2 E5:2 D5:2 C#5:2 | D5:8 R:8',
      chords: 'Dm A Dm Dm Bb A Dm Dm Bb C Gm C A A Dm Dm', drums: 'k.......s.......', bass: 'pulse', leadDuty: 0.5,
    },
    boss: {
      bpm: 168, bars: 8, loop: true,
      lead: 'E5:1 E5:1 R:1 E5:1 D5:2 E5:2 G5:2 F#5:2 E5:2 B4:2 | E5:1 E5:1 R:1 E5:1 D5:2 E5:2 A5:2 G5:2 F#5:2 D5:2 | C5:2 E5:2 A5:2 E5:2 B4:2 D#5:2 F#5:2 B5:2 | E5:4 B4:2 E5:2 G5:4 F#5:4 | ' +
        'G5:2 F#5:2 E5:2 D5:2 C5:4 E5:4 | F#5:2 E5:2 D5:2 C5:2 B4:4 D#5:4 | E5:2 G5:2 B5:2 G5:2 A5:2 F#5:2 D5:2 F#5:2 | E5:2 B4:2 G4:2 B4:2 E5:4 R:4',
      chords: 'Em Em Em D C B Em B C C D B Em D Em Em', drums: 'k.hsk.hsk.hsk.hs', bass: 'drive',
    },
    star: {
      bpm: 180, bars: 4, loop: true,
      lead: 'C5:1 C5:1 F5:2 C5:1 C5:1 F5:2 A5:2 G5:2 F5:2 G5:2 | D5:1 D5:1 G5:2 D5:1 D5:1 G5:2 Bb5:2 A5:2 G5:2 A5:2 | C5:1 C5:1 F5:2 C5:1 C5:1 F5:2 A5:2 C6:2 A5:2 F5:2 | G5:2 A5:2 Bb5:2 G5:2 F5:4 C5:4',
      chords: 'F F Gm C F F C F', drums: 'k.hhs.hhk.hhs.hh', bass: 'drive',
    },
    ending: {
      bpm: 104, bars: 8, loop: true,
      lead: 'E5:4 D5:2 C5:2 D5:4 G4:4 | E5:2 F5:2 G5:4 C6:4 G5:4 | A5:4 G5:2 F5:2 E5:4 C5:4 | D5:4 E5:2 F5:2 D5:8 | E5:4 D5:2 C5:2 D5:4 G4:4 | E5:2 F5:2 G5:4 C6:4 E6:4 | D6:4 C6:2 B5:2 A5:4 B5:4 | C6:12 R:4',
      chords: 'C G C C F C Dm G C G C C F G C C', drums: 'k.......s.......', bass: 'long',
    },
    ready: {
      bpm: 150, bars: 1, loop: false,
      lead: 'G4:1 C5:1 E5:1 G5:1 C6:3 G5:1 C6:8', chords: 'C C', drums: 'k...............',
    },
    clear: {
      bpm: 150, bars: 4, loop: false,
      lead: 'G4:1 C5:1 E5:1 G5:1 C6:3 G5:1 E5:1 G5:1 C6:1 E6:1 G6:4 | F6:2 E6:2 D6:2 C6:2 D6:4 G5:4 | C6:2 E6:2 G6:2 E6:2 F6:2 D6:2 B5:2 G5:2 | C6:8 R:8',
      chords: 'C C F G C G C C', drums: 'k...s...k...s...',
    },
    victory: {
      bpm: 150, bars: 4, loop: false,
      lead: 'G4:2 C5:2 E5:2 G5:2 C6:4 E6:4 | D6:2 C6:2 B5:2 C6:2 D6:4 G5:4 | A5:2 C6:2 F6:4 G5:2 B5:2 D6:4 | C6:4 E6:2 G6:10',
      chords: 'C C G G F G C C', drums: 'k.h.s.h.k.h.s.h.',
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
          if (vi === 3) { m -= 12; }
          note(buf, pos * step + (vi === 3 ? step * 0.5 : 0), hz(m), n.len * step * v.gate, vi === 3 ? Object.assign({}, v, { vol: 0.035 }) : v);
        }
        pos += n.len;
      }
      if (pos !== steps && typeof console !== 'undefined') console.warn('track', name, 'voice', vi, 'has', pos, 'steps, expected', steps);
    });
    for (let s = 0; s < steps; s++) {
      const ch = d.drums[s % 16];
      if (ch !== '.') drum(buf, s * step, ch, ch === 'k' ? 0.42 : ch === 's' ? 0.22 : 0.12);
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
  }
  const SFX = {
    jump: () => synth(0.18, (t, st) => tone(st, 280 * Math.pow(3.1, t / 0.15), 'pulse', 0.25) * Math.max(0, 1 - t / 0.18) * 0.32),
    stomp: () => synth(0.14, (t, st) => (tone(st, 700 * Math.pow(0.25, t / 0.1), 'pulse', 0.5) * 0.3 + noise() * 0.12 * Math.exp(-t * 40)) * Math.max(0, 1 - t / 0.14)),
    coin: () => synth(0.45, (t, st) => tone(st, t < 0.07 ? 988 : 1319, 'pulse', 0.25) * (t < 0.07 ? 0.3 : 0.3 * Math.exp(-(t - 0.07) * 7))),
    bump: () => synth(0.12, (t, st) => (tone(st, 160 * Math.pow(0.45, t / 0.1), 'tri', 0) * 0.5 + noise() * 0.1 * Math.exp(-t * 60)) * Math.max(0, 1 - t / 0.12)),
    break: () => synth(0.35, (t, st) => { st.lp += (noise() - st.lp) * 0.25; return st.lp * 0.9 * Math.exp(-t * 9) + tone(st, 120 * Math.exp(-t * 4), 'tri', 0) * 0.4 * Math.exp(-t * 18); }),
    appear: () => arpeggio(['G4', 'C5', 'E5', 'G5', 'C6', 'E6'], 0.045, 'pulse', 0.25, 0.26),
    powerup: () => arpeggio(['C5', 'E5', 'G5', 'C6', 'E5', 'G5', 'C6', 'E6', 'G5', 'C6', 'E6', 'G6'], 0.05, 'pulse', 0.25, 0.28, 4),
    oneup: () => arpeggio(['E6', 'G6', 'E7', 'C7', 'D7', 'G7'], 0.08, 'pulse', 0.25, 0.25),
    start: () => arpeggio(['C6', 'G6'], 0.09, 'pulse', 0.5, 0.25, 4),
    punch: () => synth(0.2, (t, st) => {
      st.lp += (noise() - st.lp) * (0.08 + t * 3); const w = st.lp * Math.sin(Math.PI * Math.min(1, t / 0.12)) * 0.9;
      const hit = t > 0.05 ? tone(st, 240 * Math.exp(-(t - 0.05) * 9), 'pulse', 0.5) * 0.22 * Math.exp(-(t - 0.05) * 18) : 0;
      return w * (t < 0.12 ? 1 : Math.max(0, 1 - (t - 0.12) / 0.08)) + hit;
    }),
    hit: () => synth(0.28, (t, st) => (noise() * 0.5 * Math.exp(-t * 22) + tone(st, 420 * Math.exp(-t * 9), 'pulse', 0.5) * 0.3 * Math.exp(-t * 10))),
    kick: () => synth(0.1, (t, st) => tone(st, 900 * Math.pow(0.33, t / 0.08), 'pulse', 0.5) * 0.28 * Math.max(0, 1 - t / 0.1)),
    hurt: () => synth(0.55, (t, st) => tone(st, (650 - t * 800) * (1 + Math.sin(t * TAU * 18) * 0.06), 'pulse', 0.5) * 0.28 * Math.max(0, 1 - t / 0.55)),
    die: () => {
      const seq = [['E5', 0.12], ['D#5', 0.12], ['D5', 0.12], ['C#5', 0.5], ['A4', 0.18], ['F4', 0.18], ['D4', 0.6]];
      const dur = seq.reduce((a, b) => a + b[1], 0) + 0.2;
      return synth(dur, (t, st) => {
        let acc = 0;
        for (const [n, d] of seq) { if (t < acc + d) { const lt = t - acc; return tone(st, hz(midi(n)) * (1 + Math.sin(lt * TAU * 6) * 0.01), 'pulse', 0.5) * 0.25 * Math.min(1, (d - lt) * 30); } acc += d; }
        return 0;
      });
    },
    flag: () => synth(1.0, (t, st) => tone(st, (1300 - t * 1000) * (1 + Math.sin(t * TAU * 12) * 0.02), 'pulse', 0.25) * 0.24 * Math.min(1, (1 - t) * 6)),
    tick: () => synth(0.035, (t, st) => tone(st, 1760, 'pulse', 0.5) * 0.12 * (1 - t / 0.035)),
    firework: () => synth(0.8, (t, st) => {
      st.lp += (noise() - st.lp) * 0.5;
      const crackle = t > 0.15 && noise() > 0.93 ? noise() * 0.5 : 0;
      return st.lp * 0.55 * Math.exp(-t * 7) + crackle * Math.exp(-t * 3) + tone(st, 70, 'sine', 0) * 0.35 * Math.exp(-t * 12);
    }),
    alarm: () => synth(1.2, (t, st) => tone(st, (Math.floor(t / 0.2) % 2 ? 660 : 880), 'pulse', 0.5) * 0.18 * Math.min(1, (1.2 - t) * 5)),
    laugh: () => {
      const syl = [[523, 0.13], [622, 0.13], [494, 0.13], [440, 0.13], [370, 0.22]];
      const dur = syl.reduce((a, b) => a + b[1] + 0.03, 0) + 0.1;
      return synth(dur, (t, st) => {
        let acc = 0;
        for (const [f, d] of syl) {
          if (t < acc + d) { const lt = t - acc; const ff = f * (1 + Math.sin(lt * TAU * 22) * 0.05) * (1 + lt * 0.8); return (tone(st, ff, 'pulse', 0.35) * 0.22 + noise() * 0.05) * Math.sin(Math.PI * lt / d); }
          acc += d + 0.03;
        }
        return 0;
      });
    },
    drop: () => synth(0.4, (t, st) => tone(st, 1500 - t * 2200, 'sine', 0) * 0.22 * Math.min(1, (0.4 - t) * 10)),
    charge: () => synth(0.45, (t, st) => tone(st, 200 + t * 1500 + Math.sin(t * TAU * 30) * 40, 'pulse', 0.25) * 0.16),
    thud: () => synth(0.32, (t, st) => tone(st, 90 * Math.exp(-t * 4), 'sine', 0) * 0.7 * Math.exp(-t * 9) + noise() * 0.25 * Math.exp(-t * 25)),
    boom: () => synth(0.6, (t, st) => { st.lp += (noise() - st.lp) * 0.18; return st.lp * 1.4 * Math.exp(-t * 6) + tone(st, 60, 'sine', 0) * 0.4 * Math.exp(-t * 8); }),
    pop: () => synth(0.1, (t, st) => tone(st, 300 * Math.pow(3, t / 0.08), 'pulse', 0.5) * 0.25 * (1 - t / 0.1)),
    bosshit: () => synth(0.45, (t, st) => noise() * 0.45 * Math.exp(-t * 14) + tone(st, 300 * (1 + Math.sin(t * TAU * 25) * 0.2) * Math.exp(-t * 2), 'pulse', 0.5) * 0.3 * Math.exp(-t * 5)),
    bossdie: () => synth(1.5, (t, st) => { st.lp += (noise() - st.lp) * 0.22; return st.lp * 1.2 * Math.exp(-t * 2.2) + tone(st, 500 * Math.exp(-t * 1.5), 'pulse', 0.5) * 0.2 * Math.exp(-t * 1.5); }),
    bossfly: () => synth(1.3, (t, st) => tone(st, 300 * Math.pow(6, t / 1.3), 'pulse', 0.25) * 0.2 * Math.min(1, (1.3 - t) * 4)),
    twinkle: () => synth(0.9, (t, st) => {
      const ns = [1319, 1661, 1976, 2637]; const i = Math.min(3, Math.floor(t / 0.06));
      return tone(st, ns[i], 'pulse', 0.25) * 0.2 * Math.exp(-Math.max(0, t - 0.18) * 5) + tone(st, 3951, 'sine', 0, 'ph2') * 0.06 * Math.exp(-t * 4) * (Math.sin(t * TAU * 14) > 0 ? 1 : 0.3);
    }),
    engine: () => synth(0.7, (t, st) => tone(st, 80 + t * 220, 'saw', 0) * 0.16 * Math.min(1, (0.7 - t) * 4)),
  };

  const cacheM = {}, cacheS = {};
  Sound.music = (name) => cacheM[name] || (cacheM[name] = renderTrack(name));
  Sound.sfx = (name) => cacheS[name] || (cacheS[name] = SFX[name] ? SFX[name]() : new Float32Array(1));
  Sound.names = { music: Object.keys(TRACKS), sfx: Object.keys(SFX) };

  /* Mix a recorded event list (game frames at 60 fps) into one mono track. */
  Sound.mix = function (events, totalFrames) {
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
      if (ev.type === 'music') { stop(s); if (ev.name) cur = { name: ev.name, start: s }; }
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
