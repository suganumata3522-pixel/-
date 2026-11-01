// record.mjs / thumbnail.mjs 共通: ヘッドレス Chromium を開き、Google Fonts をローカルのキャッシュから差し込む。
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(here, '.fontcache');
const FONTS = [
  { family: 'M PLUS Rounded 1c', weight: 800, file: 'mplus-800.ttf', css: 'M+PLUS+Rounded+1c:wght@800' },
  { family: 'M PLUS Rounded 1c', weight: 900, file: 'mplus-900.ttf', css: 'M+PLUS+Rounded+1c:wght@900' },
  { family: 'Dela Gothic One', weight: 400, file: 'dela.ttf', css: 'Dela+Gothic+One' },
];

function ensureFonts() {
  fs.mkdirSync(fontDir, { recursive: true });
  for (const f of FONTS) {
    const dest = path.join(fontDir, f.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) continue;
    const css = execFileSync('curl', ['-sS', `https://fonts.googleapis.com/css2?family=${f.css}`]).toString();
    const m = css.match(/url\((https:[^)]+\.ttf)\)/);
    if (!m) throw new Error('フォントのURLが見つかりません: ' + f.family);
    execFileSync('curl', ['-sS', '-o', dest, m[1]]);
    console.log('font cached:', f.file);
  }
}

export async function openPage() {
  ensureFonts();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.route('https://fonts.googleapis.com/**', (route) => {
    const css = FONTS.map((f) => `@font-face{font-family:'${f.family}';font-weight:${f.weight};font-style:normal;src:url(https://fonts.gstatic.com/local/${f.file}) format('truetype');}`).join('\n');
    route.fulfill({ status: 200, contentType: 'text/css', body: css });
  });
  await page.route('https://fonts.gstatic.com/**', (route) => {
    const file = route.request().url().split('/').pop();
    const p = path.join(fontDir, file);
    if (fs.existsSync(p)) route.fulfill({ status: 200, contentType: 'font/ttf', body: fs.readFileSync(p), headers: { 'Access-Control-Allow-Origin': '*' } });
    else route.abort();
  });
  return { browser, page };
}
