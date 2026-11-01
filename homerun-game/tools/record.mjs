// オートプレイを1コマずつ描画して、YouTubeショート用の縦動画(1080x1920 MP4)に書き出す。
//
//   node tools/record.mjs --out demo.mp4 --seed 7
//   node tools/record.mjs --snap 2,5.5,9 --until 10   (指定秒の静止画だけ保存)
//
// 必要なもの: Node.js 18+, ffmpeg, Playwright(Chromium)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openPage } from './browser.mjs';

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
const balls = args.balls ? `&balls=${args.balls}` : ''; // 指定がなければゲームの既定(5球)
const ai = (args.ai === 'whiff' ? '&ai=whiff' : '') + (args.scene ? `&scene=${args.scene}` : '');
const out = path.resolve(args.out || 'homerun-short.mp4');
const snaps = args.snap ? args.snap.split(',').map(Number) : null;
const until = args.until ? parseFloat(args.until) : 600;
const snapDir = path.resolve(args.snapdir || '.');

async function main() {
  const { browser, page } = await openPage();
  const url = pathToFileURL(path.join(root, 'index.html')).href + `?record=1&seed=${seed}&fps=${fps}${balls}&aniso=4${ai}`;
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
