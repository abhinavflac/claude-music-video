import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url: base, stop } = await startPreview(3001, { quiet: true });
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
page.on('response', r => { if (/player\.js|looks\.json|live\.json/.test(r.url())) console.log('net', r.status(), r.url().split('/').pop()); });
const t0 = Date.now();
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log('dom', Date.now() - t0, 'ms');
for (let i = 0; i < 24; i++) {
  const s = await page.evaluate(() => ({
    mount: typeof window.mountLossless,
    chips: document.querySelectorAll('#chips .chip').length,
    scripts: [...document.scripts].filter(x => x.src).length,
    player: [...document.scripts].some(x => x.src.includes('player.js')),
  }));
  console.log(i * 3 + 's', JSON.stringify(s));
  if (s.chips > 0) break;
  await page.waitForTimeout(3000);
}
await page.screenshot({ path: 'out/next-page.png' });
console.log('errors:', errs.slice(0, 5));
await browser.close(); stop();
process.exit(0);
