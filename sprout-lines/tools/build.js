// Inlines the sources into index.html (standalone) and artifact.html (page content for publishing).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const stack = JSON.parse(fs.readFileSync(path.join(root, 'stack.json'), 'utf8'));

let html = fs.readFileSync(path.join(root, 'src/page.html'), 'utf8');
html = html.replace(/<!--INLINE:(.+?)-->/g, (_, name) => {
  if (name === 'stack') return `<script>window.STACK = ${JSON.stringify(stack)};</script>`;
  return `<script>\n${fs.readFileSync(path.join(root, name), 'utf8')}</script>`;
});
fs.writeFileSync(path.join(root, 'artifact.html'), html);
const standalone = `<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n` +
  html.replace(/<style>/, '<style>\n  :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }\n  body { margin: 0; }').replace('\n<div class="app">', '\n</head>\n<body>\n<div class="app">') + '</body>\n</html>\n';
fs.writeFileSync(path.join(root, 'index.html'), standalone);
console.log('wrote index.html', standalone.length, 'bytes');
