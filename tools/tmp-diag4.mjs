import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';
const { url: base, stop } = await startPreview(3001, { quiet: true });
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
for (const [label, opts] of [['chromium', {}], ['msedge', { channel: 'msedge' }]]) {
  const browser = await chromium.launch(opts);
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('pageerror: ' + e.message.split('\n')[0]));
  page.on('console', m => logs.push(`${m.type()}: ${m.text().slice(0, 160)}`));
  page.on('requestfailed', r => logs.push('reqfail: ' + r.url().split('/').pop() + ' ' + (r.failure() || {}).errorText));
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    let state = null;
    for (let i = 0; i < 6; i++) {
      state = await page.evaluate(() => ({ mount: typeof window.mountLossless, chips: document.querySelectorAll('#chips .chip').length }));
      if (state.chips > 0) break;
      await page.waitForTimeout(2500);
    }
    const perf = await page.evaluate(() => performance.getEntriesByType('resource').filter(e => e.name.includes('_next/static/chunks')).map(e => [e.name.split('/').pop().slice(0, 50), e.responseStatus ?? 'n/a']).slice(0, 6));
    console.log(label, JSON.stringify(state), 'chunks:', JSON.stringify(perf));
  } catch (e) { console.log(label, 'threw', e.message.split('\n')[0]); }
  console.log(label, 'logs:', logs.filter(l => !/WebSocket|hmr/.test(l)).slice(0, 8));
  await browser.close();
}
stop();
process.exit(0);
