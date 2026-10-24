// Inlines the sources into a single index.html and embeds every verified 19-chain board.
const fs = require('fs'), path = require('path');
const E = require('../src/engine.js');
const root = path.join(__dirname, '..');

const boards = [];
const seen = new Set();
for (const f of fs.readdirSync(__dirname).filter(f => /^gen_out.*\.txt$/.test(f)).sort()) {
  for (const line of fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n')) {
    if (!line.trim().startsWith('{')) continue;
    const { cols, seed } = JSON.parse(line);
    const key = JSON.stringify(cols);
    if (seen.has(key)) continue;
    const r = E.resolve(cols);
    const ok = r.chain === 19 && r.steps.every(s => s.count === 4) && r.final.every(c => c.length === 0)
      && cols.every(c => c.length <= 13) && cols[2].length - 2 <= 11
      && !E.findGroups([...cols.slice(0, 2), cols[2].slice(0, -2), ...cols.slice(3)]).some(g => g.cells.length >= 4);
    if (!ok) { console.error('rejected board from', f); continue; }
    seen.add(key);
    boards.push({ seed, cols: cols.map(c => c.join('')), score: r.score });
  }
}
if (!boards.length) throw new Error('no verified boards');
console.log('verified boards:', boards.length, boards.map(b => b.score));

let html = fs.readFileSync(path.join(root, 'src/page.html'), 'utf8');
html = html.replace(/<!--INLINE:(.+?)-->/g, (_, name) => {
  if (name === 'boards') return `<script>window.BOARDS = ${JSON.stringify(boards)};</script>`;
  return `<script>\n${fs.readFileSync(path.join(root, name), 'utf8')}</script>`;
});
// artifact.html is the bare page content (the publisher adds the document skeleton);
// index.html is a standalone document that opens directly in any browser.
fs.writeFileSync(path.join(root, 'artifact.html'), html);
const standalone = `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  html.replace(/<style>/, '<style>\n  :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n  body { margin: 0; }') .replace('\n<div class="app">', '\n</head>\n<body>\n<div class="app">') + '</body>\n</html>\n';
fs.writeFileSync(path.join(root, 'index.html'), standalone);
fs.writeFileSync(path.join(root, 'boards.json'), JSON.stringify(boards, null, 1));
console.log('wrote index.html', html.length, 'bytes');
