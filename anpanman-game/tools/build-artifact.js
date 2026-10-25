// Inlines scripts + fonts into one HTML body fragment (for hosting as a single page).
// Usage: node tools/build-artifact.js out.html
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let style = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
style = style.replace(/url\((fonts\/[^)]+)\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`);
style = style.replace('html, body { height: 100%;', 'html, body { height: 100%;')
  .replace(/padding: env\(safe-area-inset-top, 0px\) env\(safe-area-inset-right, 0px\) env\(safe-area-inset-bottom, 0px\) env\(safe-area-inset-left, 0px\);/,
    'padding-block: env(safe-area-inset-top, 0px) env(safe-area-inset-bottom, 0px);\n    padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));');
const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1]
  .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => `<script>\n${fs.readFileSync(path.join(root, src), 'utf8')}\n</script>`);
const out = `<title>スーパーアンパンマン</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${style}</style>
${body.trim()}
`;
const dest = process.argv[2] || path.join(root, 'out', 'anpanman-single.html');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out);
console.log('wrote', dest, (out.length / 1024).toFixed(0) + ' KB');
