// Headless autoplay run: prints the build timeline. Usage: node tools/sim.js [maxFrames]
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Map, Set, Object, Array, String, Number, JSON }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['world.js', 'game.js', 'bot.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const PM = ctx.PM;
const g = new PM.Game(), bot = new PM.Bot(g);
g.cinematic = true;
const T = PM.T;
// sanity: lots must sit on land
const lots = [PM.LOTS.base, PM.LOTS.shop, PM.LOTS.museum, PM.LOTS.plaza].concat(PM.LOTS.house);
for (const L of lots) for (let r = L.r; r < L.r + L.h; r++) for (let c = L.c; c < L.c + L.w; c++) if (g.ter[r][c] !== PM.TER.GRASS) console.log('LOT on non-grass', JSON.stringify(L), c, r, g.ter[r][c]);
console.log('objects', Object.entries(g.objects.reduce((m, o) => (m[o.kind] = (m[o.kind] || 0) + 1, m), {})).map(([k, v]) => k + ':' + v).join(' '));
const log = (s) => console.log(`${(g.frame / 60).toFixed(1)}s day${g.day} ${String(Math.floor(g.clock / 60)).padStart(2, '0')}:${String(Math.floor(g.clock % 60)).padStart(2, '0')} ${s}`);
g.on((type, name) => {
  if (type === 'mode') log('mode ' + name);
  if (type === 'built') log(`BUILT ${name}  pikmin=${g.pikmin.length} wood=${g.inv.wood} stone=${g.inv.stone} stars=${g.stars}`);
  if (type === 'highlight') log('  ★ ' + name);
});
const max = +(process.argv[2] || 60000);
let hlFrames = 0;
while (!g.finished && g.frame < max) {
  bot.step(); g.step();
  if (g.hl) hlFrames++;
  if (g.frame % 3600 === 0) log(`status plan=${g.planIndex} site=${g.site ? g.site.build + ' ' + Math.round(g.site.progress / g.site.need * 100) + '%' : '-'} pikmin=${g.pikmin.length} follow=${g.followers.length} wood=${g.inv.wood} stone=${g.inv.stone} items=${g.items.length} weeds=${g.weeds}`);
}
log(`END finished=${g.finished} frames=${g.frame} highlightFrames=${hlFrames} pikmin=${g.pikmin.length}`);
