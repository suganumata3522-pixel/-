// 開発用：録画モードで指定時刻のスクリーンショットを撮る
// node preview.js <shorts|okawari> <出力フォルダ> <秒,秒,...>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const CONFIGS = require('./record-config');
const { SEED, BOT_PROFILE, QUERY } = CONFIGS[process.argv[2] || 'shorts'];
const OUT = process.argv[3] || 'shots';
const times = (process.argv[4] || '1,2.5,6,20,34.3,42,50,54.5,58').split(',').map(Number);
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html') + '?record=1&seed=' + SEED + (QUERY ? '&' + QUERY : ''));
  await page.waitForFunction(() => window.REC && window.REC.ready, null, { timeout: 20000 });
  await page.evaluate(([s, p]) => REC.setup(s, p), [SEED, BOT_PROFILE]);
  let t = 0; const dt = 1 / 60;
  for (const target of times) {
    while (t < target - 1e-6) { await page.evaluate(d => REC.step(d), dt); t += dt; }
    const b64 = await page.evaluate(() => REC.frame(0.85));
    fs.writeFileSync(path.join(OUT, `t${target.toFixed(1).padStart(5, '0')}.jpg`), Buffer.from(b64.split(',')[1], 'base64'));
    console.log('shot', target, JSON.stringify(await page.evaluate(() => REC.info())));
  }
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})();
