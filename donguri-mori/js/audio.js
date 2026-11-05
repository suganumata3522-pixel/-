'use strict';
// サウンド: 効果音とBGMをWeb Audioで合成。録画用のストリームにも同じ音を流す。
(function (DF) {
  const A = {
    ctx: null, master: null, sfxGain: null, musicGain: null, recDest: null,
    ready: false, musicOn: false, night: false, rainGain: null,
    vol: { music: 0.55, sfx: 0.8 },
  };

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (A.ctx = new AC());
    A.master = ctx.createGain();
    A.master.gain.value = 0.9;
    // やわらかいリミッター
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    A.master.connect(comp);
    comp.connect(ctx.destination);
    if (ctx.createMediaStreamDestination) {
      A.recDest = ctx.createMediaStreamDestination();
      comp.connect(A.recDest);
    }
    A.sfxGain = ctx.createGain();
    A.sfxGain.gain.value = A.vol.sfx;
    A.sfxGain.connect(A.master);
    A.musicGain = ctx.createGain();
    A.musicGain.gain.value = A.vol.music;
    // オルゴールっぽい響き(ディレイ)
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    A.musicGain.connect(A.master);
    A.musicGain.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(A.master);

    // ノイズ(雨・水しぶき用)
    const len = ctx.sampleRate * 2;
    A.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = A.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    // 雨のループ
    const rs = ctx.createBufferSource();
    rs.buffer = A.noise; rs.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.6;
    A.rainGain = ctx.createGain(); A.rainGain.gain.value = 0;
    rs.connect(bp); bp.connect(A.rainGain); A.rainGain.connect(A.sfxGain);
    rs.start();
    A.ready = true;
  };

  A.resume = function () {
    if (!A.ctx) A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };

  A.audioTrack = function () {
    return A.recDest ? A.recDest.stream.getAudioTracks()[0] : null;
  };

  A.setVolumes = function (music, sfx) {
    A.vol.music = music; A.vol.sfx = sfx;
    if (!A.ctx) return;
    A.musicGain.gain.setTargetAtTime(music, A.ctx.currentTime, 0.05);
    A.sfxGain.gain.setTargetAtTime(sfx, A.ctx.currentTime, 0.05);
  };

  // ---- 基本の音づくり ----
  function tone(freq, t0, dur, opt = {}) {
    const ctx = A.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.to) o.frequency.exponentialRampToValueAtTime(opt.to, t0 + (opt.slide || dur));
    if (opt.vib) {
      const l = ctx.createOscillator(); const lg = ctx.createGain();
      l.frequency.value = opt.vib; lg.gain.value = opt.vibDepth || 20;
      l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05);
    }
    const peak = opt.vol == null ? 0.25 : opt.vol;
    const atk = opt.atk || 0.006;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opt.lp) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.lp;
      o.connect(f); node = f;
    }
    node.connect(g);
    g.connect(opt.dest || A.sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noiseBurst(t0, dur, opt = {}) {
    const ctx = A.ctx;
    const s = ctx.createBufferSource(); s.buffer = A.noise;
    const f = ctx.createBiquadFilter(); f.type = opt.ftype || 'lowpass'; f.frequency.value = opt.freq || 800; f.Q.value = opt.q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opt.vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(A.sfxGain);
    s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  }

  const N = (semi) => 523.25 * Math.pow(2, semi / 12); // C5 基準
  const U2 = (i) => N([7, 4, 9, 5][i % 4]); // 住人のおしゃべり音

  const lastPlay = {};
  A.play = function (name, opt = {}) {
    if (!A.ready || A.ctx.state !== 'running') return;
    const now = A.ctx.currentTime;
    // 同じ音の連打を間引く
    const gap = { land: 0.04, attach: 0.05, pluck: 0.05, throw: 0.03, step: 0.08, coin: 0.06 }[name] || 0;
    if (gap && lastPlay[name] && now - lastPlay[name] < gap) return;
    lastPlay[name] = now;
    const p = opt.pitch || 1;
    switch (name) {
      case 'pluck':
        tone(500 * p, now, 0.12, { to: 1300 * p, slide: 0.08, type: 'triangle', vol: 0.22 });
        tone(1800 * p, now + 0.07, 0.08, { vol: 0.08 });
        break;
      case 'throw':
        tone(380 * p, now, 0.18, { to: 980 * p, slide: 0.16, type: 'triangle', vol: 0.12 });
        break;
      case 'land':
        tone(200, now, 0.09, { to: 90, type: 'sine', vol: 0.14 });
        break;
      case 'attach':
        tone(880 * p, now, 0.07, { type: 'square', vol: 0.05, lp: 2400 });
        break;
      case 'step':
        tone(330 * p, now, 0.06, { type: 'triangle', vol: 0.06 });
        break;
      case 'whistle':
        tone(1250, now, 0.42, { type: 'sine', vol: 0.16, vib: 14, vibDepth: 60, atk: 0.02 });
        tone(1870, now, 0.42, { type: 'sine', vol: 0.05, vib: 14, vibDepth: 80, atk: 0.02 });
        break;
      case 'deliver': {
        const seq = [0, 4, 7, 12];
        seq.forEach((s, i) => tone(N(s), now + i * 0.07, 0.3, { type: 'triangle', vol: 0.16 }));
        tone(N(24), now + 0.3, 0.4, { vol: 0.05 });
        break;
      }
      case 'coin':
        tone(N(7), now, 0.08, { type: 'square', vol: 0.05, lp: 3000 });
        tone(N(12), now + 0.06, 0.18, { type: 'square', vol: 0.05, lp: 3000 });
        break;
      case 'seed':
        tone(700 * p, now, 0.1, { to: 1100 * p, type: 'sine', vol: 0.08 });
        break;
      case 'highlight': {
        const seq = [[7, 0], [12, 0.1], [16, 0.2], [19, 0.3], [24, 0.42]];
        seq.forEach(([s, t]) => tone(N(s - 12), now + t, 0.45, { type: 'square', vol: 0.07, lp: 2200 }));
        seq.forEach(([s, t]) => tone(N(s), now + t, 0.35, { type: 'triangle', vol: 0.06 }));
        break;
      }
      case 'gate':
        noiseBurst(now, 0.9, { freq: 260, vol: 0.35 });
        tone(110, now, 0.8, { to: 55, type: 'sawtooth', vol: 0.08, lp: 300 });
        break;
      case 'push':
        noiseBurst(now, 0.12, { freq: 400, vol: 0.06 });
        break;
      case 'star':
        for (let i = 0; i < 8; i++) tone(N(24 - i * 2), now + i * 0.06, 0.25, { vol: 0.06, type: 'sine' });
        noiseBurst(now + 0.5, 0.5, { freq: 3000, ftype: 'highpass', vol: 0.06 });
        break;
      case 'splash':
        noiseBurst(now, 0.25, { freq: 1600, ftype: 'bandpass', q: 1.2, vol: 0.18 });
        break;
      case 'buy':
        tone(N(12), now, 0.1, { type: 'square', vol: 0.06, lp: 3000 });
        tone(N(16), now + 0.08, 0.1, { type: 'square', vol: 0.06, lp: 3000 });
        tone(N(19), now + 0.16, 0.25, { type: 'triangle', vol: 0.1 });
        break;
      case 'chop':
        tone(420 * p, now, 0.07, { to: 260 * p, type: 'triangle', vol: 0.16 });
        noiseBurst(now, 0.05, { freq: 1800, ftype: 'bandpass', q: 2, vol: 0.12 });
        break;
      case 'mine':
        tone(1300 * p, now, 0.06, { type: 'square', vol: 0.05, lp: 4000 });
        noiseBurst(now, 0.08, { freq: 3500, ftype: 'highpass', vol: 0.1 });
        break;
      case 'hammer':
        tone(700 * p, now, 0.05, { type: 'square', vol: 0.06, lp: 2500 });
        tone(350 * p, now + 0.02, 0.08, { type: 'triangle', vol: 0.1 });
        break;
      case 'logdrop':
        tone(180, now, 0.18, { to: 90, type: 'triangle', vol: 0.2 });
        noiseBurst(now, 0.2, { freq: 600, vol: 0.12 });
        break;
      case 'rockbreak':
        noiseBurst(now, 0.3, { freq: 900, vol: 0.25 });
        tone(140, now, 0.2, { to: 70, type: 'sine', vol: 0.16 });
        break;
      case 'build': {
        const seq = [[0, 0], [4, 0.12], [7, 0.24], [12, 0.36], [16, 0.5], [19, 0.5], [24, 0.62]];
        seq.forEach(([s, t]) => tone(N(s), now + t, 0.5, { type: 'triangle', vol: 0.12 }));
        seq.forEach(([s, t]) => tone(N(s - 12), now + t, 0.4, { type: 'square', vol: 0.04, lp: 1800 }));
        break;
      }
      case 'talk':
        for (let i = 0; i < 4; i++) tone(U2(i) * p, now + i * 0.06, 0.05, { type: 'square', vol: 0.035, lp: 2000 });
        break;
      case 'ui':
        tone(N(5), now, 0.06, { type: 'triangle', vol: 0.08 });
        break;
      case 'nope':
        tone(220, now, 0.12, { type: 'square', vol: 0.05, lp: 900 });
        tone(180, now + 0.1, 0.16, { type: 'square', vol: 0.05, lp: 900 });
        break;
      case 'rec':
        tone(N(0), now, 0.08, { vol: 0.1 });
        tone(N(7), now + 0.09, 0.12, { vol: 0.1 });
        break;
      case 'shutter':
        noiseBurst(now, 0.06, { freq: 5000, ftype: 'highpass', vol: 0.15 });
        tone(N(19), now + 0.04, 0.15, { vol: 0.07 });
        break;
      default: break;
    }
  };

  // ---- BGM(自動作曲のオルゴール) ----
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // ペンタトニック
  const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]; // C Am F G
  let step = 0, nextT = 0, melIdx = 4, timer = null;

  A.startMusic = function () {
    if (!A.ready || A.musicOn) return;
    A.musicOn = true;
    nextT = A.ctx.currentTime + 0.1;
    timer = setInterval(schedule, 60);
  };
  A.stopMusic = function () {
    A.musicOn = false;
    if (timer) clearInterval(timer);
    timer = null;
  };
  A.setNight = function (n) { A.night = n; };
  A.setRain = function (v) {
    if (A.rainGain) A.rainGain.gain.setTargetAtTime(v * 0.12, A.ctx.currentTime, 0.5);
  };

  function schedule() {
    if (!A.musicOn || A.ctx.state !== 'running') return;
    const tempo = A.night ? 66 : 92;
    const stepDur = 60 / tempo / 2; // 8分音符
    while (nextT < A.ctx.currentTime + 0.25) {
      const bar = Math.floor(step / 8) % 4;
      const beat = step % 8;
      const chord = CHORDS[bar];
      const dest = A.musicGain;
      const base = A.night ? -12 : 0;
      // ベース
      if (beat === 0 || (beat === 4 && !A.night)) {
        tone(N(chord[0] - 24 + base), nextT, stepDur * 3.5, { type: 'sine', vol: 0.12, dest });
      }
      // 和音のアルペジオ
      if (!A.night || beat % 2 === 0) {
        const n = chord[(beat % 3)] + (beat >= 4 ? 12 : 0);
        tone(N(n - 12 + base), nextT, stepDur * 2.2, { type: 'triangle', vol: A.night ? 0.045 : 0.05, dest });
      }
      // メロディ(ランダムウォーク)
      const play = A.night ? Math.random() < 0.3 : Math.random() < 0.55;
      if (play && beat !== 7) {
        melIdx = DF.U.clamp(melIdx + DF.U.pick([-2, -1, -1, 0, 1, 1, 2]), 0, SCALE.length - 1);
        let n = SCALE[melIdx];
        // 拍頭は和音の音に寄せる
        if (beat % 4 === 0) n = chord[melIdx % 3] + 12;
        tone(N(n + base), nextT, stepDur * (A.night ? 3 : 1.8), { type: 'sine', vol: A.night ? 0.05 : 0.065, dest });
        tone(N(n + base + 12), nextT, stepDur * 0.8, { type: 'sine', vol: 0.015, dest });
      }
      nextT += stepDur;
      step++;
    }
  }

  DF.Audio = A;
})(window.DF);
