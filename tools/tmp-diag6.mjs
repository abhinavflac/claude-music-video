import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url, stop } = await startPreview(3005, { quiet: false });
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const b = await chromium.launch({ channel: 'msedge' });
const p = await (await b.newContext()).newPage();
p.on('pageerror', e => console.log('pageerror:', e.message.split('\n')[0]));
p.on('console', m => { if (m.type() === 'error' && !/hmr|WebSocket/.test(m.text())) console.log('console:', m.text().slice(0, 160)); });
const t0 = Date.now();
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
console.log('dom', Date.now() - t0);
for (let i = 0; i < 24; i++) {
  const s = await p.evaluate(() => ({ mount: typeof window.mountLossless, chips: document.querySelectorAll('#chips .chip').length }));
  if (i % 4 === 0 || s.chips) console.log(i * 5 + 's', JSON.stringify(s));
  if (s.chips) break;
  await p.waitForTimeout(5000);
}
await b.close(); stop();
process.exit(0);
