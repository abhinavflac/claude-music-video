import path from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const base = 'http://127.0.0.1:3001/lossless';
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const t0 = Date.now();
page.on('pageerror', e => console.log('pageerror:', e.message.split('\n')[0]));
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log('dom at', Date.now() - t0, 'ms');
let state = null;
for (let i = 0; i < 20; i++) {
  state = await page.evaluate(() => ({
    mount: typeof window.mountLossless,
    chips: document.querySelectorAll('#chips .chip').length,
    links: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.split('/').pop()),
    photo: document.querySelector('img.me') ? document.querySelector('img.me').src.split('/').pop() : null,
  }));
  if (state.chips > 0) break;
  await page.waitForTimeout(3000);
}
console.log('after', Date.now() - t0, 'ms:', JSON.stringify(state));
await page.screenshot({ path: 'out/next-page.png' });
await browser.close();
