import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url, stop } = await startPreview(3002, { quiet: true });
const html = await (await fetch(url)).text();
console.log('html bytes', html.length);
console.log('flight pushes', (html.match(/self\.__next_f\.push/g) || []).length);
console.log('script srcs', [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1].split('/').pop()).join(' | '));
console.log('inline scripts', (html.match(/<script(?![^>]*src)[^>]*>/g) || []).length);
const pageChunk = [...html.matchAll(/"([^"]*chunks[^"]*lossless[^"]*)"/g)].map(m => m[1]);
console.log('lossless chunks referenced:', pageChunk.slice(0, 4));
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const b = await chromium.launch();
const p = await (await b.newContext()).newPage();
p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await p.waitForTimeout(6000);
console.log('client:', await p.evaluate(() => ({
  flight: typeof window.__next_f !== 'undefined' ? window.__next_f.length : 'none',
  reactDom: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
  tick: window.__tick || 0,
})));
await b.close(); stop();
process.exit(0);
