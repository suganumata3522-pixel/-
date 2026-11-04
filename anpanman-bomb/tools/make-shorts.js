#!/usr/bin/env node
// YouTube ショート動画を作るスクリプト
//   node tools/make-shorts.js                 … シードを自動で選んで shorts/ に mp4 とサムネを出力
//   node tools/make-shorts.js --seed 123      … シードを指定
//   node tools/make-shorts.js --peek 1,5,20   … 指定秒のフレームを PNG で出すだけ（確認用）
//   node tools/make-shorts.js --bgm           … BGM も入れる（ふだんは効果音だけ）
// 必要なもの: Node.js, Playwright(Chromium), ffmpeg
'use strict';
const { chromium } = require('playwright');
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'shorts');
const FONT_DIR = process.env.FONT_DIR || path.join(__dirname, 'fonts');
const FONTS = {
  'MochiyPopOne.ttf': 'https://fonts.gstatic.com/s/mochiypopone/v12/QdVPSTA9Jh-gg-5XZP2UmU4O9kww.ttf',
  'MPLUSRounded1c-800.ttf': 'https://fonts.gstatic.com/s/mplusrounded1c/v22/VdGBAYIAV6gnpUpoWwNkYvrugw9RuM0m4psK.ttf',
  'MPLUSRounded1c-500.ttf': 'https://fonts.gstatic.com/s/mplusrounded1c/v22/VdGBAYIAV6gnpUpoWwNkYvrugw9RuM1y55sK.ttf',
};
const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const withBgm = args.includes('--bgm');

function download(url, dest) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode !== 200) { rej(new Error('download failed ' + r.statusCode + ' ' + url)); return; }
      const f = fs.createWriteStream(dest); r.pipe(f); f.on('finish', () => f.close(res));
    }).on('error', rej);
  });
}
async function ensureFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const p = path.join(FONT_DIR, name);
    if (!fs.existsSync(p)) { console.log('downloading font', name); await download(url, p); }
  }
}
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf' };
  return new Promise(res => {
    const srv = http.createServer((req, resp) => {
      const p = decodeURIComponent(req.url.split('?')[0]);
      const file = p.startsWith('/__fonts/') ? path.join(FONT_DIR, path.basename(p)) : path.join(ROOT, path.normalize(p));
      if (!file.startsWith(ROOT) && !file.startsWith(FONT_DIR)) { resp.writeHead(403); resp.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { resp.writeHead(404); resp.end(); return; }
        resp.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); resp.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}
// 音声の積分ラウドネス(LUFS)を測る
function measureLufs(file) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']);
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', () => { const m = /I:\s+(-?[\d.]+) LUFS/.exec(err.slice(err.lastIndexOf('Summary'))); if (m) res(parseFloat(m[1])); else rej(new Error('loudness measure failed')); });
  });
}
function run(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', code => (code === 0 ? res() : rej(new Error(cmd + ' exited ' + code))));
  });
}
const dataUrlToBuf = d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');

(async () => {
  await ensureFonts();
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', e => console.error('[pageerror]', e));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  // Google Fonts はオフライン描画では使わない（ローカルのフォントを読み込む）
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(base + '/index.html?noboot');
  await page.addScriptTag({ url: base + '/tools/shorts.js' });
  await page.evaluate(fb => window.Shorts.init(fb), base + '/__fonts/');

  let seed = arg('seed') != null ? Number(arg('seed')) : null;
  if (seed == null) {
    const from = Number(arg('from', 1)), count = Number(arg('count', 400));
    console.log('searching seeds', from, '...', from + count - 1);
    const best = await page.evaluate(([f, c]) => window.Shorts.search(f, c), [from, count]);
    console.table(best);
    if (!best.length) throw new Error('no usable seed found');
    for (const b of best.slice(0, 4)) console.log(b.seed, await page.evaluate(s => window.Shorts.timeline(s), b.seed));
    seed = best[0].seed;
  }
  const info = await page.evaluate(([s, b]) => window.Shorts.setup(s, { bgm: b }), [seed, withBgm]);
  console.log('seed', seed, info);

  const peek = arg('peek');
  if (peek) {
    for (const t of peek.split(',').map(Number).sort((a, b) => a - b)) {
      const d = await page.evaluate(s => window.Shorts.peek(s), t);
      const f = path.join(OUT, 'peek_' + String(t).replace('.', '_') + 's.png');
      fs.writeFileSync(f, dataUrlToBuf(d)); console.log('wrote', f);
    }
    await browser.close(); srv.close(); return;
  }

  const name = arg('name', 'dokkan_anpanbomb_short');
  const videoOnly = path.join(OUT, '_video_only.mp4'), wav = path.join(OUT, '_audio.wav'), final = path.join(OUT, name + '.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '60', videoOnly], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const t0 = Date.now();
  for (let f = 0; f < info.totalFrames; f += 12) {
    const frames = await page.evaluate(n => window.Shorts.renderFrames(n, 0.93), 12);
    for (const d of frames) { if (!ff.stdin.write(dataUrlToBuf(d))) await new Promise(r => ff.stdin.once('drain', r)); }
    if (f % 600 === 0) console.log('frame', f, '/', info.totalFrames, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end();
  await ffDone;
  console.log('rendering audio...');
  fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.Shorts.renderAudio()), 'base64'));
  fs.writeFileSync(path.join(OUT, 'thumbnail.png'), dataUrlToBuf(await page.evaluate(() => window.Shorts.cover())));
  await browser.close(); srv.close();
  // 音量は一定のゲインで -14 LUFS 付近にそろえ、リミッターでピークをおさえる（効果音だけでも音量がゆれない）
  const lufs = await measureLufs(wav), gain = Math.max(-20, Math.min(15, -14 - lufs));
  console.log('audio loudness', lufs.toFixed(1), 'LUFS -> gain', gain.toFixed(1), 'dB');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', videoOnly, '-i', wav, '-c:v', 'copy',
    '-af', 'volume=' + gain.toFixed(2) + 'dB,alimiter=limit=0.84:level=false', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', final]);
  fs.unlinkSync(videoOnly); fs.unlinkSync(wav);
  console.log('done:', final, '(' + ((Date.now() - t0) / 1000).toFixed(0) + 's)');
})().catch(e => { console.error(e); process.exit(1); });
