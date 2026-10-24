const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const vp = process.argv[2] === 'phone' ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1100, height: 900 };
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height }, ...vp });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(800);
  const tag = process.argv[2] || 'desk';
  await p.screenshot({ path: `tools/out/${tag}_menu.png` });
  await p.click('#startBtn');
  for (let i = 0; i < 12; i++) {
    await p.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'z'][i % 4]);
    await p.keyboard.down('ArrowDown'); await p.waitForTimeout(500); await p.keyboard.up('ArrowDown');
    await p.waitForTimeout(250);
  }
  await p.screenshot({ path: `tools/out/${tag}_play.png` });
  await p.keyboard.press('p');
  await p.click('#quitBtn');
  await p.click('#challengeBtn');
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `tools/out/${tag}_c19_ready.png` });
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(300); await p.keyboard.up('ArrowDown');
  await p.waitForTimeout(5200);
  await p.screenshot({ path: `tools/out/${tag}_c19_mid.png` });
  await p.waitForTimeout(19000);
  await p.screenshot({ path: `tools/out/${tag}_c19_end.png` });
  const hud = await p.evaluate(() => ({ score: document.getElementById('score').textContent, chain: document.getElementById('chain').textContent, best: document.getElementById('best').textContent }));
  console.log(tag, JSON.stringify(hud), 'errors:', errs);
  await b.close();
})();
