// Renders the bot playthrough frame-by-frame into a 1080x1920 60fps MP4 with audio.
// Usage: node tools/record.js [out.mp4] [--bot fly|ground] [--max-frames N] [--crf 20]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
const serve = require('./serve');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const out = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname, '..', 'out', 'anpanman-shorts.mp4'));
const maxFrames = +opt('--max-frames', 1e9);
const crf = opt('--crf', '20');
const botStyle = opt('--bot', 'fly');
const BATCH = 20;

function run(cmd, argv) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(cmd + ' exited ' + c))));
  });
}

(async () => {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmpVideo = out.replace(/\.mp4$/, '.video.mp4'), tmpWav = out.replace(/\.mp4$/, '.wav');
  const srv = await serve(path.join(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?record=1&bot=${botStyle}`);
  await page.waitForFunction(() => window.REC && window.REC.ready, null, { timeout: 30000 });

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '60', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', '60', tmpVideo],
  { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const write = (buf) => new Promise((res) => { if (ff.stdin.write(buf)) res(); else ff.stdin.once('drain', res); });

  let frames = 0, done = false; const t0 = Date.now();
  while (!done && frames < maxFrames) {
    const r = await page.evaluate((n) => window.REC.frames(n, 0.93), Math.min(BATCH, maxFrames - frames));
    for (const d of r.imgs) await write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
    frames += r.imgs.length; done = r.done || r.imgs.length === 0;
    if (frames % 600 < BATCH) console.log(`frame ${frames} (${(frames / 60).toFixed(1)}s video) mode=${r.mode} level=${r.level}  ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
  }
  ff.stdin.end(); await ffDone;

  const size = await page.evaluate(() => window.REC.prepareWav());
  const fd = fs.openSync(tmpWav, 'w');
  for (let i = 0; i < size; i += 1 << 21) {
    const b64 = await page.evaluate(([a, n]) => window.REC.wavChunk(a, n), [i, 1 << 21]);
    fs.writeSync(fd, Buffer.from(b64, 'base64'));
  }
  fs.closeSync(fd);
  console.log('stats', JSON.stringify(await page.evaluate(() => window.REC.stats())));
  await browser.close(); srv.close();

  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpVideo, '-i', tmpWav, '-c:v', 'copy', '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out]);
  fs.unlinkSync(tmpVideo); fs.unlinkSync(tmpWav);
  console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB', frames, 'frames');
})().catch((e) => { console.error(e); process.exit(1); });
