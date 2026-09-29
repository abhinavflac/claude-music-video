// one-off: screenshot the page at a few widths and report layout health (overflow, folded rows)
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url, stop } = await startPreview(3004, { quiet: true });
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const sizes = [['phone', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900]];
for (const [label, width, height] of sizes) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('#chips .chip').length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  const health = await page.evaluate(() => ({
    frame: document.documentElement.getAttribute('data-layout') + '/' + (document.querySelector('#stage').classList.contains('vert') ? 'vert' : 'wide'),
    chipsRows: new Set([...document.querySelectorAll('#chips .chip')].map(c => Math.round(c.getBoundingClientRect().top))).size,
    compact: document.documentElement.classList.contains('chips-compact'),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    footerWrapped: (() => { const f = document.querySelector('.chrome-bottom'); return { h: Math.round(f.getBoundingClientRect().height), w: Math.round(f.getBoundingClientRect().width) }; })(),
    stage: (() => { const r = document.querySelector('#stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
  }));
  console.log(label, width + 'x' + height, JSON.stringify(health));
  await page.screenshot({ path: `out/check-${label}.png`, fullPage: true });
  await page.close();
}
await browser.close(); stop();
process.exit(0);
