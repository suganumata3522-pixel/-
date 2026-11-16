// Plays the line game in headless Chromium: a bit of free play, then the 4-line challenge.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const phone = process.argv[2] === 'phone';
  const p = await b.newPage(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1100, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(700);
  const tag = phone ? 'phone' : 'desk';
  await p.screenshot({ path: `tools/out/${tag}_menu.png` });
  await p.click('#startBtn');
  for (let i = 0; i < 10; i++) {
    await p.keyboard.press(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'z', 'ArrowLeft'][i % 5]);
    await p.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
    await p.keyboard.press(' ');
    await p.waitForTimeout(250);
  }
  await p.screenshot({ path: `tools/out/${tag}_play.png` });
  await p.keyboard.press('p');
  await p.click('#quitBtn');
  await p.click('#challengeBtn');
  const waitPiece = async k => {
    try { await p.waitForFunction(() => happaLineState().mode === 'play' && happaLineState().piece === 'I', null, { timeout: 8000 }); }
    catch (e) { console.log('bar', k, 'never arrived; state', JSON.stringify(await p.evaluate(() => happaLineState()))); throw e; }
  };
  for (let k = 0; k < 4; k++) {
    await waitPiece(k);
    await p.waitForTimeout(300);
    if (k === 0) await p.screenshot({ path: `tools/out/${tag}_challenge_ready.png` });
    await p.keyboard.press('ArrowUp');
    for (let i = 0; i < 4; i++) await p.keyboard.press('ArrowRight');
    await p.waitForTimeout(150);
    if (k === 0) await p.screenshot({ path: `tools/out/${tag}_challenge_aim.png` });
    console.log('bar', k, 'before drop', JSON.stringify(await p.evaluate(() => happaLineState())));
    await p.keyboard.press(' ');
    console.log('bar', k, 'after drop ', JSON.stringify(await p.evaluate(() => happaLineState())));
    await p.waitForTimeout(k === 0 ? 250 : 100);
    if (k === 0) { await p.screenshot({ path: `tools/out/${tag}_challenge_clear.png` }); await p.waitForTimeout(1050); }
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: `tools/out/${tag}_challenge_end.png` });
  const hud = await p.evaluate(() => ({ score: score.textContent, lines: lines.textContent, level: level.textContent, state: happaLineState() }));
  console.log(tag, JSON.stringify(hud), 'errors:', errs);
  await b.close();
})();
