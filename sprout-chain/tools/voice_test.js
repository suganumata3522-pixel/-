// Renders the chain voices (1, 4, 8, 12, 16, 19) and the cheer to a WAV for inspection.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addScriptTag({ path: path.resolve('src/sfx.js') });
  const b64 = await p.evaluate(async () => {
    const oc = new OfflineAudioContext(2, 44100 * 7, 44100);
    const g = oc.createGain(); g.gain.value = 0.9; g.connect(oc.destination);
    [1, 4, 8, 12, 16, 19].forEach((n, i) => Sfx.voice(oc, g, 0.2 + i * 0.85, n));
    Sfx.cheer(oc, g, 5.4);
    const buf = await oc.startRendering();
    const wav = new Uint8Array(Sfx.toWav(buf));
    let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.writeFileSync('tools/out/voices.wav', Buffer.from(b64, 'base64'));
  await b.close();
})();
