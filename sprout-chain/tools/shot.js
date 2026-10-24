const { chromium } = require('playwright');
(async () => {
  const [, , file, out, w, h] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w || 900, height: +h || 600 } });
  p.on('console', m => console.log('console:', m.text()));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('file://' + require('path').resolve(file));
  await p.waitForTimeout(500);
  await p.screenshot({ path: out });
  await b.close();
})();
