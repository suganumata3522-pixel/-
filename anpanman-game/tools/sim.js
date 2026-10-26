// Headless run of the whole game driven by the bot. Prints a timeline.
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ctx = { console, Math, Map, Set, WeakMap, Object, Array, String, Number, JSON };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['levels.js', 'game.js', 'bot.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const AP = ctx.AP;
const g = new AP.Game(), bot = new AP.Bot(g, process.argv[3] || 'fly');
const log = [];
g.on((type, name, f) => { if (type === 'mode') log.push(`${(f / 60).toFixed(1)}s mode=${name} lvl=${g.levelIndex} x=${g.player ? (g.player.x / AP.T).toFixed(1) : '-'}`); });
let hurts = 0, lastGenki = true, maxF = +(process.argv[2] || 14000);
const sfxCount = {};
g.on((type, name) => { if (type === 'sfx') sfxCount[name] = (sfxCount[name] || 0) + 1; });
for (let f = 0; f < maxF && !g.finished; f++) {
  g.step(bot.think());
  if (g.player && lastGenki && !g.player.genki) { hurts++; log.push(`${(g.frame / 60).toFixed(1)}s HURT lvl=${g.levelIndex} x=${(g.player.x / AP.T).toFixed(1)}`); }
  if (g.player) lastGenki = g.player.genki;
  if (g.boss && g.frame % 60 === 0 && g.mode === 'play') log.push(`  ${(g.frame / 60).toFixed(1)}s boss=${g.boss.state} hp=${g.boss.hp} px=${((g.player.x - g.boss.ax0) / AP.T).toFixed(1)}`);
}
console.log(log.join('\n'));
console.log('frames', g.frame, (g.frame / 60).toFixed(1) + 's', 'finished', g.finished, 'score', g.score, 'coins', g.stats.coins, 'kabi', g.stats.kabi, 'punch', g.stats.punch, 'lives', g.lives, 'hurts', hurts);
console.log(JSON.stringify(sfxCount));
