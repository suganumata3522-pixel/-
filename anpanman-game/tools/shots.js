// Usage: node tools/shots.js outDir frame1 frame2 ...   (saves PNGs of the canvas at those game frames)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const serve = require('./serve');
(async () => {
  const [outDir, ...frames] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await serve(path.join(__dirname, '..'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 600, height: 1000 } });
  page.on('console', (m) => console.log('[page]', m.text()));
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/index.html?record=1&bot=fly`);
  await page.waitForFunction(() => window.REC && window.REC.ready, null, { timeout: 20000 });
  let cur = 0;
  for (const f of frames.map(Number).sort((a, b) => a - b)) {
    const res = await page.evaluate((n) => window.REC.skip(n), f - cur);
    cur = f;
    const png = await page.evaluate(() => document.getElementById('game').toDataURL('image/png'));
    const file = path.join(outDir, `f${String(f).padStart(5, '0')}.png`);
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
    console.log(file, res.mode);
  }
  await browser.close(); srv.close();
})();
