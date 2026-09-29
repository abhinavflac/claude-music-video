import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url: base, stop } = await startPreview(5196);
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 200)); });
page.on('response', r => { if (/player|looks\.json|live\.json|_next\/static/.test(r.url()) && r.status() >= 400) console.log('http', r.status(), r.url()); else if (/player\.js|looks\.json/.test(r.url())) console.log('http', r.status(), r.url()); });
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForSelector('#go', { timeout: 90000 });
await page.waitForTimeout(9000);
console.log(await page.evaluate(() => ({
  mount: typeof window.mountLossless,
  scripts: [...document.scripts].map(s => s.src || '(inline)').slice(-6),
  links: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.split('/').pop()),
  chips: document.querySelectorAll('#chips .chip').length,
})), errors);
await browser.close(); stop();
