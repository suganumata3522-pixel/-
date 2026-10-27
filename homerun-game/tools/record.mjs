// オートプレイを1コマずつ描画して、YouTubeショート用の縦動画(1080x1920 MP4)に書き出す。
//
//   node tools/record.mjs --out demo.mp4 --seed 7
//   node tools/record.mjs --snap 2,5.5,9 --until 10   (指定秒の静止画だけ保存)
//
// 必要なもの: Node.js 18+, ffmpeg, Playwright(Chromium)
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, [])
);
const fps = parseInt(args.fps || '30', 10);
const seed = args.seed || '7';
const balls = args.balls || '10';
const ai = args.ai === 'whiff' ? '&ai=whiff' : '';
const out = path.resolve(args.out || 'homerun-short.mp4');
const snaps = args.snap ? args.snap.split(',').map(Number) : null;
const until = args.until ? parseFloat(args.until) : 600;
const snapDir = path.resolve(args.snapdir || '.');

// ---- フォント(Google Fonts)をローカルにキャッシュして差し込む ----
const fontDir = path.join(here, '.fontcache');
const FONTS = [
  { family: 'M PLUS Rounded 1c', weight: 800, file: 'mplus-800.ttf', css: 'M+PLUS+Rounded+1c:wght@800' },
  { family: 'M PLUS Rounded 1c', weight: 900, file: 'mplus-900.ttf', css: 'M+PLUS+Rounded+1c:wght@900' },
  { family: 'Dela Gothic One', weight: 400, file: 'dela.ttf', css: 'Dela+Gothic+One' },
];
function ensureFonts() {
  fs.mkdirSync(fontDir, { recursive: true });
  for (const f of FONTS) {
    const dest = path.join(fontDir, f.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) continue;
    const css = execFileSync('curl', ['-sS', `https://fonts.googleapis.com/css2?family=${f.css}`]).toString();
    const m = css.match(/url\((https:[^)]+\.ttf)\)/);
    if (!m) throw new Error('フォントのURLが見つかりません: ' + f.family);
    execFileSync('curl', ['-sS', '-o', dest, m[1]]);
    console.log('font cached:', f.file);
  }
}

async function main() {
  ensureFonts();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.route('https://fonts.googleapis.com/**', (route) => {
    const css = FONTS.map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;src:url(https://fonts.gstatic.com/local/${f.file}) format('truetype');}`).join('\n');
    route.fulfill({ status: 200, contentType: 'text/css', body: css });
  });
  await page.route('https://fonts.gstatic.com/**', (route) => {
    const file = route.request().url().split('/').pop();
    const p = path.join(fontDir, file);
    if (fs.existsSync(p)) route.fulfill({ status: 200, contentType: 'font/ttf', body: fs.readFileSync(p), headers: { 'Access-Control-Allow-Origin': '*' } });
    else route.abort();
  });
  const url = pathToFileURL(path.join(root, 'index.html')).href + `?record=1&seed=${seed}&fps=${fps}&balls=${balls}&aniso=4${ai}`;
  await page.goto(url);
  await page.waitForFunction(() => window.__recReady === true, null, { timeout: 60000 });

  let ff = null, tmpVideo = null;
  if (!snaps) {
    tmpVideo = out.replace(/\.mp4$/, '') + '.noaudio.mp4';
    ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', tmpVideo], { stdio: ['pipe', 'inherit', 'inherit'] });
  }
  const t0 = Date.now();
  let frame = 0;
  // --from 秒: 静止画確認用に途中まで描画せずに進める
  if (snaps && args.from) {
    await page.evaluate((s) => window.__rec.skip(s), parseFloat(args.from));
    frame = Math.round(parseFloat(args.from) * fps);
  }
  const snapLeft = snaps ? [...snaps] : [];
  for (;;) {
    const data = await page.evaluate(() => window.__rec.frame());
    const time = (frame + 1) / fps;
    frame++;
    const buf = Buffer.from(data.slice(data.indexOf(',') + 1), 'base64');
    if (ff) {
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    while (snapLeft.length && time >= snapLeft[0] - 1e-6) {
      const s = snapLeft.shift();
      const p = path.join(snapDir, `snap-${String(s).replace('.', '_')}.jpg`);
      fs.writeFileSync(p, buf);
      console.log('snap', p);
    }
    if (frame % (fps * 5) === 0) {
      const st = await page.evaluate(() => window.__rec.stats);
      console.log(`${time.toFixed(1)}s rendered (${((Date.now() - t0) / frame).toFixed(0)}ms/frame) HR=${st.hr}`);
    }
    const done = await page.evaluate(() => window.__rec.done);
    if (done || time >= until || (snaps && !snapLeft.length)) break;
  }
  if (ff) {
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    const b64 = await page.evaluate(() => window.__rec.audio());
    const wav = out.replace(/\.mp4$/, '') + '.wav';
    fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpVideo, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
    fs.unlinkSync(tmpVideo);
    fs.unlinkSync(wav);
    const st = await page.evaluate(() => window.__rec.stats);
    console.log(`done: ${out} (${(frame / fps).toFixed(1)}s, HR ${st.hr}本, score ${st.score})`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
