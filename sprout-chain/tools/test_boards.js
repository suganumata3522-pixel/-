// Plays every bundled 19-chain board in the real game page and reports the resulting chain count.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const n = require('../boards.json').length;
  const results = await Promise.all(Array.from({ length: n }, async (_, k) => {
    const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve('index.html'));
    await p.waitForTimeout(500);
    for (let i = 0; i <= k; i++) { await p.click(i === 0 ? '#challengeBtn' : '#side19'); await p.waitForTimeout(150); }
    await p.waitForTimeout(3000);
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(400); await p.keyboard.up('ArrowDown');
    await p.waitForTimeout(26000);
    const hud = await p.evaluate(() => ({ best: document.getElementById('best').textContent, score: document.getElementById('score').textContent }));
    await p.screenshot({ path: `tools/out/board${k + 1}_end.png` });
    return { board: k + 1, ...hud, errs };
  }));
  console.log(JSON.stringify(results));
  await b.close();
})();
