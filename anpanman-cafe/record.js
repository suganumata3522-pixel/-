// YouTubeショート用の操作動画（1080x1920 / 60fps / 音声つき）を書き出す
// 使い方: node record.js [出力ファイル]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const { SEED, FPS, BOT_PROFILE } = require('./record-config');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'video', 'anpanman-cafe-shorts.mp4'));
const TMP = path.join(path.dirname(OUT), '.tmp');

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const silent = path.join(TMP, 'video.mp4'), wav = path.join(TMP, 'audio.wav');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('page error:', e); process.exitCode = 1; });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?record=1&seed=' + SEED);
  await page.waitForFunction(() => window.REC && window.REC.ready, null, { timeout: 30000 });
  await page.evaluate(([s, p]) => REC.setup(s, p), [SEED, BOT_PROFILE]);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', silent],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));

  let n = 0; const t0 = Date.now();
  for (;;) {
    const r = await page.evaluate(dt => { REC.step(dt); return { img: REC.frame(0.95), done: REC.done }; }, 1 / FPS);
    if (!ff.stdin.write(Buffer.from(r.img.slice(r.img.indexOf(',') + 1), 'base64'))) await new Promise(res => ff.stdin.once('drain', res));
    n++;
    if (n % 600 === 0) console.log(`${(n / FPS).toFixed(0)}s 書き出し済み (${((Date.now() - t0) / 1000).toFixed(0)}s経過)`);
    if (r.done || n > FPS * 120) break;
  }
  ff.stdin.end(); await ffDone;
  const dur = n / FPS;
  console.log('フレーム数', n, '長さ', dur.toFixed(2) + 's', JSON.stringify(await page.evaluate(() => REC.info())));

  const b64 = await page.evaluate(d => REC.audio(d), dur);
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  await browser.close();

  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav,
    '-af', `afade=t=out:st=${(dur - 0.8).toFixed(2)}:d=0.8,loudnorm=I=-14:TP=-1.5:LRA=11`,
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('完成:', OUT);
})().catch(e => { console.error(e); process.exit(1); });
