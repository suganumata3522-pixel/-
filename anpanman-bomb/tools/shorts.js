// YouTube ショート用（1080x1920 / 60fps）の動画フレーム＆音声を生成するモジュール。
// index.html?noboot を開いたページに読み込んで使う（tools/make-shorts.js から操作）。
(function () {
'use strict';
const AB = window.AnpanBomb;
const { COLS, ROWS, DT, Game, Bot, Renderer, Synth, Music, SFX_OF, FONT_POP, FONT_UI, clamp, easeOutBack } = AB;
const D = AB.draw;

const W = 1080, H = 1920, FPS = 60;
const T = 80, BW = COLS * T, BH = ROWS * T, BX = (W - BW) / 2;
const PANEL_Y = 452, HUD_H = 84, BY = PANEL_Y + HUD_H;
const CTRL_Y = 1700;
const ENDING = 5.4;                       // ゲームクリア後のエンディング秒数
const GAME_OPT = { stages: [0, 3], introTime: 0.6, clearTime: 1.8, bombs: 2, range: 3, lives: 3 };

// ---------------------------------------------------------------- シミュレーション（シード選び用）
function simulate(seed, maxT) {
  const g = new Game(Object.assign({ seed }, GAME_OPT)), bot = new Bot();
  const log = [];
  let endT = null;
  const steps = (maxT || 90) * FPS;
  for (let i = 0; i < steps; i++) {
    g.input = bot.update(g);
    g.step(DT);
    let fin = false;
    for (const ev of g.events) { log.push(ev); if (ev.type === 'stage_clear' && ev.last) fin = true; }
    g.events.length = 0;
    if (fin) { endT = (i + 1) / FPS; break; }
    if (g.phase === 'over') break;
  }
  return { log, endT };
}
function evaluate(seed) {
  const { log, endT } = simulate(seed);
  if (!endT) return null;
  const total = endT + ENDING;
  if (total > 58.5) return null;
  const items = log.filter(e => e.type === 'item').length;
  const chains = log.filter(e => e.type === 'explode' && e.chain).length;
  const hits = log.filter(e => e.type === 'hit');
  const kills = log.filter(e => e.type === 'enemy_die');
  const combos = kills.filter(e => e.combo >= 2).length;
  const s1 = (log.find(e => e.type === 'stage_clear' && !e.last) || {}).t || 0;
  const firstBoom = (log.find(e => e.type === 'explode') || { t: 99 }).t;
  const firstKill = (kills[0] || { t: 99 }).t;
  const bossHits = log.filter(e => e.type === 'boss_hit').length;
  const lastBossHit = (log.filter(e => e.type === 'boss_hit').pop() || { t: endT }).t;
  let score = 30 - Math.abs(total - 49) * 1.2;
  score += Math.min(items, 4) * 3 + Math.min(chains, 5) * 1.5 + Math.min(combos, 2) * 4;
  if (hits.length === 1) score += (hits[0].t > 5 && hits[0].t < s1 - 3) ? 10 : (hits[0].t > s1 && hits[0].t < lastBossHit) ? 7 : 1;
  else if (hits.length === 0) score += 2;
  else score -= 8 * (hits.length - 1);
  if (firstBoom < 4) score += 3;
  score += firstKill < 10 ? 5 : firstKill < 14 ? 3 : 0;
  if (kills.filter(e => e.t < s1 - 2).length >= 2) score += 2;
  if (bossHits >= 2) score += 2;
  return { seed, score: +score.toFixed(2), total: +total.toFixed(2), items, chains, combos, hits: hits.length, stage1: +s1.toFixed(1), firstKill: +firstKill.toFixed(1) };
}

// ---------------------------------------------------------------- テロップ演出
const L = (t, size, fill, stroke) => ({ t, size: size || 112, fill: fill || '#fff', stroke: stroke || '#c62828' });
const ITEM_TELOP = { 1: '顔ボムがふえた！', 2: 'パンチ力アップ！', 3: 'マントでスピードUP！', 4: '顔がふえた！' };
class Director {
  constructor() { this.cur = null; this.pops = []; this.seen = {}; this.booms = []; this.chainCool = -9; this.section = 'stage1'; this.flashT = -9; }
  say(lines, o, vt) {
    o = o || {};
    const pri = o.pri || 1;
    if (this.cur && vt < this.cur.lock && pri < this.cur.pri) return false;
    this.cur = { lines, t0: vt, dur: o.dur || 1.7, pri, lock: vt + (o.min || 0.9), wobble: !!o.wobble, noPop: !!o.noPop };
    if (o.pop !== false && pri >= 4 && pri < 100) this.pops.push(vt);
    return true;
  }
  onEvent(ev, vt) {
    switch (ev.type) {
      case 'bomb':
        if (!this.seen.bomb && vt > 3.2) { this.seen.bomb = 1; this.say([L('顔ボムをセット！', 104)], { pri: 2 }, vt); }
        break;
      case 'explode': {
        this.booms = this.booms.filter(t => vt - t < 0.35); this.booms.push(vt);
        if ((ev.chain || this.booms.length >= 2) && vt - this.chainCool > 3.5) { this.chainCool = vt; this.say([L('連鎖ドッカン!!', 128, '#ffe03d')], { pri: 5, wobble: true }, vt); }
        else if (!this.seen.boom) { this.seen.boom = 1; this.say([L('ドッカーン!!', 132, '#ffe03d')], { pri: 3, wobble: true }, vt); }
        break;
      }
      case 'item': this.say([L('パワーアップ！', 78, '#fff', '#ef6c00'), L(ITEM_TELOP[ev.item], 100, '#fff59d', '#e65100')], { pri: 4, dur: 1.6 }, vt); break;
      case 'enemy_die':
        if (ev.combo >= 2) this.say([L('まとめて', 84), L('アンパーンチ!!', 124, '#ffe03d')], { pri: 6, wobble: true }, vt);
        else this.say([L('アンパーンチ!!', 128, '#ffe03d')], { pri: 4, wobble: true }, vt);
        break;
      case 'hit': this.say([L('あ〜っ!!', 130, '#fff', '#5e35b1')], { pri: 7, dur: 1.1, min: 0.9 }, vt); break;
      case 'new_face': this.say([L('新しい顔よ〜！', 116, '#fff', '#d81b60')], { pri: 8, dur: 1.1, min: 0.9 }, vt); break;
      case 'genki': this.say([L('元気100倍!!', 132, '#ffe03d', '#d84315')], { pri: 8, dur: 1.6, wobble: true }, vt); break;
      case 'stage_clear':
        if (!ev.last) this.say([L('ステージクリア！', 116, '#fff', '#ef6c00')], { pri: 9, dur: 1.8 }, vt);
        else { this.section = 'ending'; this.endT = vt; this.say([L('ゲームクリア!!', 132, '#ffe03d')], { pri: 200, dur: 2.5, min: 2.4, wobble: true }, vt); }
        break;
      case 'stage_start':
        if (ev.stage > 0) {
          this.flashT = vt;
          if (ev.boss) { this.section = 'boss'; this.say([L('ボス戦！', 84, '#fff', '#4527a0'), L('バイキンマン登場!!', 108, '#e1d5ff', '#311b92')], { pri: 9, dur: 2.2, min: 2.0 }, vt); }
        }
        break;
      case 'boss_laugh': this.say([L('ハーッヒフーヘホー！', 92, '#ede7ff', '#311b92')], { pri: 3, dur: 1.4 }, vt); break;
      case 'boss_hit': this.say(ev.hp >= 2 ? [L('効いてる！', 84), L('あと2回!!', 124, '#ffe03d')] : [L('あと1回!!', 132, '#ffe03d')], { pri: 6, wobble: true }, vt); break;
      case 'boss_defeat': this.say([L('バイバイキーン!!', 128, '#e1d5ff', '#311b92')], { pri: 10, dur: 2.6, min: 2.2, wobble: true }, vt); break;
    }
  }
  update(vt) {
    if (this.section === 'ending' && !this.seen.cta && vt - this.endT > 2.5) {
      this.seen.cta = 1;
      this.say([L('あそんでみたい人は', 80), L('コメントしてね！', 116, '#ffe03d')], { pri: 300, dur: 99, min: 99, pop: false }, vt);
      this.pops.push(vt);
    }
  }
  draw(ctx, vt) {
    const cy = 306;
    let c = this.cur;
    if (vt < 3.3 && (!c || c.pri < 100)) c = null;
    if (c && vt - c.t0 > c.dur) c = null;
    if (!c) {
      const idle = this.section === 'boss' ? [L('VS バイキンマン', 92, '#e1d5ff', '#311b92')] : [L('顔ボムで', 70), L('バイキンをやっつけろ！', 84)];
      drawLines(ctx, idle, W / 2, cy, 1, 0, 0.92);
      return;
    }
    const age = vt - c.t0;
    const sc = c.noPop ? 1 + 0.035 * Math.sin(age * 6) : age < 0.22 ? 0.55 + 0.45 * easeOutBack(age / 0.22) : 1;
    const rot = c.wobble ? Math.sin(age * 18) * Math.max(0, 0.05 - age * 0.04) : 0;
    const fade = c.dur - age < 0.15 ? Math.max(0, (c.dur - age) / 0.15) : 1;
    drawLines(ctx, c.lines, W / 2, cy, sc, rot, fade);
  }
}
function drawLines(ctx, lines, x, cy, sc, rot, alpha) {
  const gap = 14;
  const sizes = lines.map(l => {
    ctx.font = l.size + 'px ' + FONT_POP;
    const w = ctx.measureText(l.t).width, maxW = 1000;
    return w > maxW ? l.size * maxW / w : l.size;
  });
  const total = sizes.reduce((a, b) => a + b, 0) + gap * (lines.length - 1);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, cy); ctx.rotate(rot); ctx.scale(sc, sc);
  let y = -total / 2;
  lines.forEach((l, i) => {
    const s = sizes[i];
    D.otext(ctx, l.t, 0, y + s / 2, { size: s, fill: l.fill, stroke: l.stroke, lw: s * 0.26, shadow: 'rgba(60,10,0,.55)' });
    y += s + gap;
  });
  ctx.restore();
}

// ---------------------------------------------------------------- 背景・飾り
let bgCache = null;
function buildBackground() {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4fb2ee'); g.addColorStop(0.45, '#a9dffc'); g.addColorStop(0.78, '#dff4ff'); g.addColorStop(1, '#f2fbff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const hill = (y, col, amp, ph) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x / 260 + ph) * amp);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  };
  hill(1560, '#9ad66f', 34, 0.4); hill(1640, '#7cc35e', 26, 2.1); hill(1760, '#68b34d', 22, 4.0);
  return c;
}
function drawCloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (const [dx, dy, r] of [[0, 0, 46], [52, -18, 56], [110, 0, 44], [56, 16, 48]]) { D.circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }
}
function drawBackground(ctx, vt) {
  if (!bgCache) bgCache = buildBackground();
  ctx.drawImage(bgCache, 0, 0);
  ctx.save(); ctx.translate(W / 2, 320); ctx.rotate(vt * 0.12);
  ctx.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1300, (i * 2) * Math.PI / 16, (i * 2 + 1) * Math.PI / 16); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  const cl = [[120, 240, 0.9, 14], [760, 160, 1.1, 10], [430, 410, 0.7, 18], [900, 400, 0.8, 12]];
  for (const [x, y, s, sp] of cl) drawCloud(ctx, ((x + vt * sp) % (W + 300)) - 150, y, s);
}
function drawBadge(ctx, vt) {
  const cx = W / 2, cy = 128, w = 660, h = 82;
  ctx.save();
  D.rrect(ctx, cx - w / 2, cy - h / 2 + 7, w, h, h / 2); ctx.fillStyle = 'rgba(120,10,0,.35)'; ctx.fill();
  D.rrect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fillStyle = '#e8322e'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#fff'; ctx.stroke();
  D.otext(ctx, 'ドッカン！アンパンボム', cx + 40, cy + 2, { size: 47, fill: '#fff', stroke: '#8e1612', lw: 10 });
  D.drawFaceBomb(ctx, cx - w / 2 + 50, cy + 4, 92, { t: 2.4 - ((vt * 0.8) % 1.6), age: vt });
  ctx.restore();
}
function drawController(ctx, inp, bombFlash) {
  const cy = CTRL_Y;
  ctx.save();
  D.rrect(ctx, 70, cy - 104, 940, 208, 50); ctx.fillStyle = 'rgba(255,255,255,.78)'; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#e8322e'; ctx.stroke();
  const k = 64, cx = 250;
  const keys = [[1, cx, cy - k], [2, cx, cy + k], [3, cx - k, cy], [4, cx + k, cy]];
  D.rrect(ctx, cx - k / 2 + 3, cy - k / 2 + 3, k - 6, k - 6, 12); ctx.fillStyle = '#f1e2d6'; ctx.fill();
  for (const [d, x, y] of keys) {
    const on = inp && inp.dir === d, off = on ? 5 : 0;
    D.rrect(ctx, x - k / 2 + 3, y - k / 2 + 9, k - 6, k - 6, 14); ctx.fillStyle = on ? '#c9a21f' : '#cdb9a8'; ctx.fill();
    D.rrect(ctx, x - k / 2 + 3, y - k / 2 + 3 + off, k - 6, k - 6, 14); ctx.fillStyle = on ? '#ffd23f' : '#fff'; ctx.fill();
    ctx.fillStyle = '#e8322e'; ctx.beginPath();
    const a = 15, yy = y + off;
    if (d === 1) { ctx.moveTo(x, yy - a); ctx.lineTo(x + a, yy + a * 0.7); ctx.lineTo(x - a, yy + a * 0.7); }
    if (d === 2) { ctx.moveTo(x, yy + a); ctx.lineTo(x + a, yy - a * 0.7); ctx.lineTo(x - a, yy - a * 0.7); }
    if (d === 3) { ctx.moveTo(x - a, yy); ctx.lineTo(x + a * 0.7, yy - a); ctx.lineTo(x + a * 0.7, yy + a); }
    if (d === 4) { ctx.moveTo(x + a, yy); ctx.lineTo(x - a * 0.7, yy - a); ctx.lineTo(x - a * 0.7, yy + a); }
    ctx.closePath(); ctx.fill();
  }
  const bx = 800, on = bombFlash > 0, off = on ? 7 : 0, r = 78;
  D.circle(ctx, bx, cy + 9, r); ctx.fillStyle = '#8e1612'; ctx.fill();
  const gg = ctx.createRadialGradient(bx - 26, cy - 28 + off, 8, bx, cy + off, r);
  gg.addColorStop(0, on ? '#ffd0c0' : '#ff8a70'); gg.addColorStop(0.6, on ? '#ff5a3c' : '#e8322e'); gg.addColorStop(1, '#b71c1c');
  D.circle(ctx, bx, cy + off, r); ctx.fillStyle = gg; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.stroke();
  D.otext(ctx, 'ボム', bx, cy + off + 2, { size: 46, fill: '#fff', stroke: '#8e1612', lw: 8 });
  if (on) { ctx.globalAlpha = bombFlash / 0.18; D.starPath(ctx, bx + 70, cy - 70, 26, 10, 8, 0); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.globalAlpha = 1; }
  D.otext(ctx, 'そうさ', 540, cy - 22, { size: 34, fill: '#b0846a', font: FONT_UI, weight: 800 });
  D.otext(ctx, '（オートプレイ）', 540, cy + 24, { size: 26, fill: '#c49a82', font: FONT_UI, weight: 800 });
  ctx.restore();
}

// ---------------------------------------------------------------- 本体
function wavBase64(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const ab = new ArrayBuffer(44 + len * ch * 2), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, len * ch * 2, true);
  const chans = []; for (let c = 0; c < ch; c++) chans.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const u8 = new Uint8Array(ab); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}

const S = {
  async init(fontBase) {
    const faces = [['Mochiy Pop One', 'MochiyPopOne.ttf', '400'], ['M PLUS Rounded 1c', 'MPLUSRounded1c-800.ttf', '800'], ['M PLUS Rounded 1c', 'MPLUSRounded1c-500.ttf', '500']];
    for (const [fam, file, wt] of faces) { const f = new FontFace(fam, 'url(' + fontBase + file + ')', { weight: wt }); await f.load(); document.fonts.add(f); }
    this.cv = document.createElement('canvas'); this.cv.width = W; this.cv.height = H;
    document.body.innerHTML = ''; document.body.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    return true;
  },
  timeline(seed) { return simulate(seed).log.filter(e => ['item','enemy_die','hit','stage_clear','boss_hit','boss_defeat','stage_start'].includes(e.type)).map(e => e.type + '@' + e.t.toFixed(1) + (e.combo > 1 ? 'x' + e.combo : '')).join(' '); },
  search(from, count) {
    const res = [];
    for (let s = from; s < from + count; s++) { const r = evaluate(s); if (r) res.push(r); }
    res.sort((a, b) => b.score - a.score);
    return res.slice(0, 8);
  },
  setup(seed) {
    const sim = simulate(seed);
    this.totalFrames = Math.round((sim.endT + ENDING) * FPS);
    this.game = new Game(Object.assign({ seed }, GAME_OPT));
    this.bot = new Bot(); this.ren = new Renderer(seed); this.dir = new Director();
    this.frame = 0; this.audioEv = []; this.input = { dir: 0, bomb: false }; this.bombFlash = 0; this.ending = false;
    this.dir.say([L('アンパンマンの顔が', 86), L('爆弾になった!?', 126, '#ffe03d')], { pri: 100, dur: 3.3, min: 3.2, noPop: true }, 0);
    return { totalFrames: this.totalFrames, seconds: +(this.totalFrames / FPS).toFixed(2) };
  },
  stepFrame() {
    const g = this.game, vt = this.frame / FPS;
    this.vt = vt;
    if (!this.ending) { this.input = this.bot.update(g); if (this.input.bomb) this.bombFlash = 0.18; }
    else this.input = { dir: 0, bomb: false };
    g.input = this.input;
    g.step(DT);
    for (const ev of g.events) {
      this.ren.onEvent(g, ev);
      if (!this.ending) {
        this.dir.onEvent(ev, vt);
        this.audioEv.push({ type: ev.type, t: vt, last: !!ev.last, bgm: ev.type === 'stage_start' ? g.stage.bgm : null });
        if (ev.type === 'stage_clear' && ev.last) this.ending = true;
      }
    }
    g.events.length = 0;
    this.ren.update(DT); this.dir.update(vt);
    this.bombFlash = Math.max(0, this.bombFlash - DT);
    this.frame++;
  },
  draw() {
    const ctx = this.ctx, g = this.game, vt = this.vt;
    drawBackground(ctx, vt);
    drawBadge(ctx, vt);
    this.dir.draw(ctx, vt);
    ctx.save();
    D.rrect(ctx, BX - 16, PANEL_Y - 12 + 12, BW + 32, HUD_H + BH + 28, 34); ctx.fillStyle = 'rgba(0,40,80,.22)'; ctx.fill();
    D.rrect(ctx, BX - 16, PANEL_Y - 12, BW + 32, HUD_H + BH + 28, 34); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();
    this.ren.drawHUD(ctx, g, BX - 6, PANEL_Y - 4, BW + 12, HUD_H);
    ctx.save();
    D.rrect(ctx, BX, BY, BW, BH, 22); ctx.clip();
    ctx.fillStyle = '#86c95f'; ctx.fillRect(BX, BY, BW, BH);
    this.ren.drawBoard(ctx, g, BX, BY, T);
    const fl = vt - this.dir.flashT;
    if (fl >= 0 && fl < 0.45) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - fl / 0.45).toFixed(3) + ')'; ctx.fillRect(BX, BY, BW, BH); }
    if (this.dir.section === 'ending') {
      const e = vt - this.dir.endT;
      if (e > 2.5) {
        const p = clamp((e - 2.5) / 0.35, 0, 1);
        ctx.fillStyle = 'rgba(40,15,5,' + (0.5 * p).toFixed(3) + ')'; ctx.fillRect(BX, BY, BW, BH);
        const s = 0.6 + 0.4 * easeOutBack(p), bob = Math.abs(Math.sin(e * 3.2)) * 40;
        ctx.save(); ctx.translate(W / 2, BY + BH * 0.42); ctx.scale(s, s);
        D.drawFaceBomb(ctx, 0, -150 - bob, 360, { t: 1.5 + Math.sin(e * 2) * 0.4, age: e });
        D.otext(ctx, 'ドッカン！', 0, 120, { size: 96, fill: '#ffe03d', stroke: '#c62828', lw: 24, shadow: 'rgba(60,10,0,.6)' });
        D.otext(ctx, 'アンパンボム', 0, 240, { size: 132, fill: '#fff', stroke: '#e8322e', lw: 30, shadow: 'rgba(60,10,0,.6)' });
        ctx.restore();
      }
    }
    ctx.restore();
    drawController(ctx, this.input, this.bombFlash);
  },
  renderFrames(n, quality) {
    const out = [];
    for (let i = 0; i < n && this.frame < this.totalFrames; i++) { this.stepFrame(); this.draw(); out.push(this.cv.toDataURL('image/jpeg', quality || 0.92)); }
    return out;
  },
  // 指定秒のフレームを1枚だけPNGで返す（確認用）
  peek(sec) {
    while (this.frame / FPS < sec && this.frame < this.totalFrames) this.stepFrame();
    this.draw();
    return this.cv.toDataURL('image/png');
  },
  async renderAudio() {
    const dur = this.totalFrames / FPS + 0.4, sr = 44100;
    const oc = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
    const syn = new Synth(oc), mus = new Music(syn);
    let playing = false;
    syn.sfx('hook', 0.03);
    for (const ev of this.audioEv) {
      const t = ev.t + 0.017;
      if (ev.type === 'stage_start') { if (playing) { mus.schedule(t); mus.stop(t); } mus.play(ev.bgm, t); playing = true; }
      else if (ev.type === 'stage_clear') { if (playing) { mus.schedule(t); mus.stop(t); } playing = false; syn.sfx(ev.last ? 'allclear' : 'clear', t); }
      else if (SFX_OF[ev.type]) syn.sfx(SFX_OF[ev.type], t);
    }
    if (playing) { mus.schedule(dur - 0.3); mus.stop(dur - 0.3); }
    if (this.dir.endT != null) {            // エンドカード中もBGMを流してフェードアウト
      const ts = this.dir.endT + 2.0, te = dur - 0.15;
      if (te > ts + 0.6) {
        mus.play('main', ts); mus.schedule(te);
        const g = mus.bus.gain; g.setValueAtTime(0.0001, ts); g.linearRampToValueAtTime(0.9, ts + 0.35); g.setValueAtTime(0.9, te - 0.8); g.linearRampToValueAtTime(0, te);
        mus.tr = null; mus.bus = null;
      }
    }
    for (const pt of this.dir.pops) syn.sfx('pop', pt + 0.01);
    const buf = await oc.startRendering();
    return wavBase64(buf);
  },
  // サムネイル用の1枚絵
  cover() {
    const ctx = this.ctx;
    drawBackground(ctx, 1.3);
    drawBadge(ctx, 0.4);
    drawLines(ctx, [L('アンパンマンの顔が', 92), L('爆弾になった!?', 138, '#ffe03d')], W / 2, 330, 1, -0.03, 1);
    ctx.save(); ctx.translate(W / 2, 1010);
    const glow = ctx.createRadialGradient(0, 0, 40, 0, 0, 520); glow.addColorStop(0, 'rgba(255,240,150,.95)'); glow.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = glow; ctx.fillRect(-540, -540, 1080, 1080);
    ctx.fillStyle = '#ff7a00'; D.starPath(ctx, 0, 0, 470, 300, 14, 0.1); ctx.fill();
    ctx.fillStyle = '#ffd23f'; D.starPath(ctx, 0, 0, 380, 250, 14, 0.3); ctx.fill();
    ctx.fillStyle = '#fff8d6'; D.circle(ctx, 0, 32, 236); ctx.fill();
    D.drawFaceBomb(ctx, 0, 10, 560, { t: 0.5, age: 0.3, noShadow: true });
    ctx.restore();
    D.drawAnpanman(ctx, 250, 1480, 330, { dir: 2, expr: 'happy', anim: 0.4, moving: false });
    ctx.save(); ctx.translate(800, 1440); ctx.rotate(0.12);
    D.drawBoss(ctx, 0, 0, 250, { state: 'fight', anim: 0.2, inv: 0 }, { x: -1, y: 0 });
    ctx.restore();
    D.otext(ctx, 'ドッカーン!!', W / 2, 1720, { size: 150, fill: '#ffe03d', stroke: '#c62828', lw: 36, shadow: 'rgba(60,10,0,.6)' });
    return this.cv.toDataURL('image/png');
  },
};
window.Shorts = S;
})();
