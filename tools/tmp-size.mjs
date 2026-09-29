import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url, stop } = await startPreview(3006, { quiet: true });
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const b = await chromium.launch({ channel: 'msedge' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => console.log('pageerror:', e.message.split('\n')[0]));
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForFunction(() => document.querySelectorAll('#chips .chip').length > 0, null, { timeout: 120000 });
await p.waitForTimeout(1500);
const m = await p.evaluate(() => {
  const cs = getComputedStyle(document.querySelector('#app'));
  const h = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
  return {
    inner: [innerWidth, innerHeight],
    appH: cs.getPropertyValue('--app-h'), sw: cs.getPropertyValue('--sw'), sh: cs.getPropertyValue('--sh'),
    chrome: document.documentElement.getAttribute('data-chrome'), layout: document.documentElement.getAttribute('data-layout'),
    stage: (() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    heights: { bar: h('#bar'), chips: h('#chips'), about: h('#about'), foot: h('.chrome-bottom'), frame: h('#frame') },
    compact: document.documentElement.classList.contains('chips-compact'),
  };
});
console.log(JSON.stringify(m));
await b.close(); stop();
process.exit(0);
