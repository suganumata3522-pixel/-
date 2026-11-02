// YouTube ショート用のサムネイル(1080x1920 JPEG)を書き出す。
//
//   node tools/thumbnail.mjs --out thumbs                 (全デザイン)
//   node tools/thumbnail.mjs --design hr-a,zero-a --out thumbs
//
// 必要なもの: Node.js 18+, Playwright(Chromium)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openPage } from './browser.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']);
    return acc;
  }, [])
);
const outDir = path.resolve(args.out || 'thumbs');
const designs = (args.design || 'hr-a,hr-b,zero-a,zero-b,hit-p,hit-p-plain,catch-a,catch-a-plain').split(',');

fs.mkdirSync(outDir, { recursive: true });
const { browser, page } = await openPage();
for (const d of designs) {
  await page.goto(pathToFileURL(path.join(here, 'thumbnail.html')).href + `?design=${d}&aniso=4`);
  await page.waitForFunction(() => window.__thumbDone === true, null, { timeout: 120000 });
  const data = await page.evaluate(() => document.getElementById('out').toDataURL('image/jpeg', 0.92));
  const file = path.join(outDir, `thumb-${d}.jpg`);
  fs.writeFileSync(file, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
  console.log(`${file} (${Math.round(fs.statSync(file).size / 1024)}KB)`);
}
await browser.close();
