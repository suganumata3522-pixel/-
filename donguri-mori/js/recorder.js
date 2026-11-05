'use strict';
// 録画: 手動録画 + 見所の自動クリップ(さかのぼり録画)
(function (DF) {
  const U = DF.U;
  const R = { clips: [], stream: null, listeners: {} };
  const now = () => performance.now() / 1000;

  R.supported = typeof window.MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement !== 'undefined' && !!HTMLCanvasElement.prototype.captureStream;

  // 仕上がり動画はMP4を優先(スマホのYouTubeアプリで扱いやすい)。なければWebM。
  R.TYPES_FINAL = [
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4',
    'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
  ];
  // さかのぼり録画も H.264(MP4) を優先。VP8 はソフトウェア処理で重く、
  // 処理が追いつかないと止めたときに直前の数秒が欠けてしまうため。
  R.TYPES_BUFFER = [
    'video/mp4;codecs=avc1.42E01F,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/mp4',
    'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm',
  ];
  R.pickType = function (list) {
    if (!R.supported) return '';
    for (const t of list) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { /* noop */ } }
    return '';
  };
  R.ext = (mime) => (mime && mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm');
  R.bitrate = 5_000_000;

  R.on = (ev, fn) => ((R.listeners[ev] = R.listeners[ev] || []).push(fn));
  R.emit = (ev, d) => (R.listeners[ev] || []).forEach((fn) => fn(d));

  R.init = function (canvas, audioTrack) {
    if (!R.supported) return false;
    const v = canvas.captureStream(30);
    const tracks = [...v.getVideoTracks()];
    if (audioTrack) tracks.push(audioTrack);
    R.stream = new MediaStream(tracks);
    R.bufferType = R.pickType(R.TYPES_BUFFER);
    R.finalType = R.pickType(R.TYPES_FINAL);
    R.buffer = new ReplayBuffer(R.stream, R.bufferType);
    return true;
  };

  function makeRecorder(stream, mime, bitrate) {
    const opt = { videoBitsPerSecond: bitrate || R.bitrate, audioBitsPerSecond: 128000 };
    if (mime) opt.mimeType = mime;
    try { return new MediaRecorder(stream, opt); }
    catch (e) { return new MediaRecorder(stream); }
  }

  let clipId = 1;
  function addClip(c) {
    c.id = clipId++;
    c.url = URL.createObjectURL(c.blob);
    c.created = new Date();
    R.clips.push(c);
    // メモリを守るため古いものから整理(お気に入りは残す)
    while (R.clips.length > 24) {
      const i = R.clips.findIndex((x) => !x.keep);
      if (i < 0) break;
      URL.revokeObjectURL(R.clips[i].url);
      R.clips.splice(i, 1);
    }
    R.emit('clip', c);
    return c;
  }
  R.removeClip = function (id) {
    const i = R.clips.findIndex((c) => c.id === id);
    if (i >= 0) { URL.revokeObjectURL(R.clips[i].url); R.clips.splice(i, 1); }
  };

  // ---------- 手動録画 ----------
  R.manual = null;
  R.startManual = function (maxSec) {
    if (!R.stream || R.manual) return false;
    const type = R.finalType;
    const rec = makeRecorder(R.stream, type, R.bitrate);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const m = { rec, chunks, t0: now(), max: maxSec || 60, type: rec.mimeType || type, thumb: DF.Render.thumb() };
    R.manual = m;
    rec.start(1000);
    m.timer = setInterval(() => {
      const el = now() - m.t0;
      R.emit('manualTick', { elapsed: el, max: m.max });
      if (el >= m.max) R.stopManual();
    }, 200);
    return true;
  };
  R.stopManual = function () {
    const m = R.manual;
    if (!m) return Promise.resolve(null);
    R.manual = null;
    clearInterval(m.timer);
    return new Promise((resolve) => {
      m.rec.onstop = () => {
        const blob = new Blob(m.chunks, { type: (m.type || 'video/webm').split(';')[0] });
        const dur = now() - m.t0;
        const clip = addClip({ blob, label: '録画 ' + U.fmtSec(dur), kind: 'manual', offset: 0, duration: dur, thumb: m.thumb, type: blob.type });
        R.emit('manualStop', clip);
        resolve(clip);
      };
      try { m.rec.stop(); } catch (e) { resolve(null); }
    });
  };

  // ---------- さかのぼり録画 ----------
  // ふだんはレコーダー1台。古くなったら次の1台を先に動かし、次が pre 秒たまってから古いほうを止める。
  // こうすると「いつでも直前 pre 秒以上の録画がある」状態を、2台同時はごく一部の時間だけで保てる。
  // 見所が起きたら、いちばん古い(長くさかのぼれる)レコーダーを post 秒後に止めてクリップにする。
  class ReplayBuffer {
    constructor(stream, type) {
      this.stream = stream; this.type = type;
      this.seg = 16; this.pre = 7; this.post = 3;
      this.slots = [{}, {}];
      this.running = false; this.pending = null;
    }
    start() {
      if (this.running) return;
      this.running = true;
      this._start(this.slots[0]);
      this._iv = setInterval(() => this._tick(), 250);
    }
    stop() {
      this.running = false;
      clearInterval(this._iv);
      for (const s of this.slots) this._kill(s);
      this.pending = null;
    }
    _start(s) {
      const rec = makeRecorder(this.stream, this.type, R.bitrate);
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      s.rec = rec; s.chunks = chunks; s.t0 = now(); s.hold = false;
      try { rec.start(1000); } catch (e) { s.rec = null; }
    }
    _kill(s) {
      if (s.rec) {
        const rec = s.rec;
        rec.ondataavailable = null; rec.onstop = null;
        try { if (rec.state !== 'inactive') rec.stop(); } catch (e) { /* noop */ }
      }
      s.rec = null; s.chunks = null;
    }
    _age(s) { return s.rec ? now() - s.t0 : -1; }
    _tick() {
      if (!this.running) return;
      if (this.pending && now() >= this.pending.stopAt) this._finalize();
      const live = this.slots.filter((s) => s.rec).sort((x, y) => x.t0 - y.t0);
      const idle = this.slots.find((s) => !s.rec);
      if (!live.length) { this._start(this.slots[0]); return; }
      if (live.length === 1) {
        // 古くなってきたら次を先に動かしておく
        if (this._age(live[0]) >= this.seg && idle) this._start(idle);
        return;
      }
      // 2台動いている: 新しいほうが pre 秒たまったら古いほうを止める(見所の保留中は除く)
      const [old, young] = live;
      if (!old.hold && this._age(young) >= this.pre) this._kill(old);
    }
    // 見所をマーク。直前の数秒+直後の数秒をクリップにする。
    mark(label, opt = {}) {
      if (!this.running) return false;
      const t = now();
      const post = opt.post == null ? this.post : opt.post;
      if (this.pending) {
        const p = this.pending;
        if (t - p.slot.t0 < 24) {
          if (p.labels.indexOf(label) < 0) p.labels.push(label);
          p.stopAt = Math.max(p.stopAt, t + post);
          return true;
        }
        this._finalize();
      }
      const cands = this.slots.filter((s) => s.rec && s.rec.state === 'recording');
      if (!cands.length) return false;
      cands.sort((x, y) => x.t0 - y.t0);
      const s = cands[0];
      s.hold = true;
      this.pending = { slot: s, labels: [label], stopAt: t + post, offset: t - s.t0, thumb: opt.thumb || '' };
      // 切り出し後も続けてさかのぼれるよう、待機中のレコーダーをすぐ動かしておく
      const idle = this.slots.find((x) => !x.rec);
      if (idle) this._start(idle);
      return true;
    }
    flush() {
      if (!this.pending) return Promise.resolve();
      return new Promise((res) => { this._onFlush = res; this._finalize(); });
    }
    _finalize() {
      const p = this.pending;
      if (!p) return;
      this.pending = null;
      const s = p.slot;
      const rec = s.rec, chunks = s.chunks, t0 = s.t0;
      const type = rec.mimeType || this.type || 'video/webm';
      const done = this._onFlush; this._onFlush = null;
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: type.split(';')[0] });
        const dur = now() - t0;
        if (blob.size > 1000) {
          addClip({ blob, label: p.labels.join(' / '), kind: 'auto', offset: p.offset, duration: dur, thumb: p.thumb, type: blob.type });
        }
        if (done) done();
      };
      try { rec.stop(); } catch (e) { if (done) done(); }
      s.rec = null; s.chunks = null; s.hold = false;
      // もう1台が動いていなければすぐ再開
      if (this.running && !this.slots.some((x) => x.rec)) this._start(s);
    }
  }

  DF.Rec = R;
})(window.DF);
