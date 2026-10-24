// Renders the Shorts video: frames from video/director.js in headless Chromium -> ffmpeg (H.264 + AAC).
// usage: node video/render.js [boardIndex] [out.mp4] [--preview]
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const root = path.join(__dirname, '..');
const boardIndex = +(process.argv[2] || 0);
const out = path.resolve(process.argv[3] || path.join(root, 'shorts_19chain.mp4'));
const preview = process.argv.includes('--preview');
const FPS = 60;
const fontCache = path.join(root, 'video', '.fontcache');
fs.mkdirSync(fontCache, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('pageerror', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  // Google Fonts are fetched with curl (which goes through the proxy) and cached on disk.
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, async route => {
    const url = route.request().url();
    const file = path.join(fontCache, crypto.createHash('sha1').update(url).digest('hex'));
    if (!fs.existsSync(file)) execFileSync('curl', ['-sSf', '-A', route.request().headers()['user-agent'] || 'Mozilla/5.0', '-o', file, url]);
    await route.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': url.includes('googleapis') ? 'text/css' : 'font/woff2', 'access-control-allow-origin': '*' } });
  });
  const boards = fs.readFileSync(path.join(root, 'boards.json'), 'utf8');
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@500;700;900&display=block">
    <style>body{margin:0;background:#000}</style></head><body></body></html>`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(`window.BOARDS = ${boards};`);
  for (const f of ['src/engine.js', 'src/art.js', 'src/sfx.js', 'video/director.js']) await page.addScriptTag({ path: path.join(root, f) });
  // make sure every glyph we draw is loaded before the first frame
  await page.evaluate(async () => {
    const text = '0123456789,/!?×←()…・ 6×13マスでつくれる最大れんさ連鎖理論値さいごの1手はっか全消しのこりひきスコア段目つながらないたっせい';
    await Promise.all([
      document.fonts.load('100px "Mochiy Pop One"', text),
      document.fonts.load('900 30px "Zen Maru Gothic"', text),
    ]);
    await document.fonts.ready;
    return [...document.fonts].filter(f => f.status === 'loaded').length;
  }).then(n => console.log('font faces loaded:', n));
  await page.evaluate(i => window.Director.init(i), boardIndex);

  if (preview) {
    // a few stills for checking the layout
    const marks = [0.05, 1.0, 3.75, 25];
    let t = 0;
    for (const m of marks) {
      const n = Math.round((m - t) * FPS);
      const url = await page.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) window.Director.tick(dt); window.Director.draw(); return window.Director.canvas.toDataURL('image/jpeg', 0.9); }, [n, 1 / FPS]);
      t += n / FPS;
      fs.writeFileSync(path.join(root, `tools/out/v_${m}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
    }
    console.log(JSON.stringify(await page.evaluate(() => ({ phase: Director.state.phase, chain: Director.state.chain, t: Director.state.t }))));
    await browser.close();
    return;
  }

  const wavPath = out.replace(/\.mp4$/, '.wav');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', out + '.video.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  let frames = 0;
  for (;;) {
    const batch = await page.evaluate(([n, dt]) => {
      const urls = [];
      for (let i = 0; i < n && !window.Director.state.done; i++) urls.push(window.Director.frame(dt, 0.94));
      return { urls, done: window.Director.state.done };
    }, [12, 1 / FPS]);
    for (const u of batch.urls) {
      const ok = ff.stdin.write(Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
      if (!ok) await new Promise(r => ff.stdin.once('drain', r));
      frames++;
    }
    if (frames % 240 < 12) console.log(`frame ${frames} (${(frames / FPS).toFixed(1)}s) ${((Date.now() - t0) / 1000).toFixed(0)}s elapsed`);
    if (batch.done) break;
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  const duration = frames / FPS;
  console.log('frames', frames, 'duration', duration.toFixed(2));
  const wav64 = await page.evaluate(d => window.Director.renderAudio(d), duration);
  fs.writeFileSync(wavPath, Buffer.from(wav64, 'base64'));
  const stats = await page.evaluate(() => ({ chain: Director.state.chain, score: Director.state.score, events: Director.state.events.length }));
  console.log('sim', JSON.stringify(stats));
  await browser.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', out + '.video.mp4', '-i', wavPath, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  fs.unlinkSync(out + '.video.mp4');
  console.log('wrote', out);
})().catch(e => { console.error(e); process.exit(1); });
