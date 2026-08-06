/* 単一HTMLファイルを組み立てる。
   使い方:  node build.mjs
   出力  :  図面差分抽出ツール.html （これ1つを配布すれば動く） */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(dir, p), 'utf8');

const template = read('src/index.template.html');
const pdfjs    = read('vendor/pdf.min.js');
const worker   = read('vendor/pdf.worker.min.js');
const pdflib   = read('vendor/pdf-lib.min.js');
const jszip    = read('vendor/jszip.min.js');
const core     = read('src/diff-core.js');
const app      = read('src/app.js');

// ワーカーは文字列としてページ内に持たせ、Blob URL から起動する
const workerBlock = pdfjs + '\nwindow.__PDFJS_WORKER__ = ' + JSON.stringify(worker) + ';';

// </script> がライブラリ中に現れるとHTMLが壊れるので退避する
const safe = s => s.replace(/<\/script/gi, '<\\/script');

const out = template
  .replace('/*__PDFJS__*/',    () => safe(workerBlock))
  .replace('/*__PDFLIB__*/',   () => safe(pdflib))
  .replace('/*__JSZIP__*/',    () => safe(jszip))
  .replace('/*__DIFFCORE__*/', () => safe(core))
  .replace('/*__APP__*/',      () => safe(app));

const dest = path.join(dir, '図面差分抽出ツール.html');
fs.writeFileSync(dest, out);
console.log('作成しました:', dest, (out.length / 1024 / 1024).toFixed(2) + ' MB');
