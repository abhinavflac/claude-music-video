// test-site.mjs: drive the Lossless page as the Next.js app it ships as, in Edge (which decodes the H.264 films).
//   npm run test:site                   -> prints each check; screenshots in out/site-test/
// Boots `next dev` on port 5199, prepares public/lossless, and drives http://127.0.0.1:5199/lossless.
// Desktop: play with sound, a tap answers within a frame (stamp and chip), the live window comes up in the tapped look
// and stays on the video's clock, a 10-tap burst lands on the last look tapped, and back to original hides and then
// drops the windows. Phone (portrait): the vertical film and vertical windows. Each check prints ok or FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';

const OUT = 'out/site-test';
fs.mkdirSync(OUT, { recursive: true });
const { url: base, stop } = await startPreview(+process.env.PORT || 5199);
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' (' + detail + ')' : ''}`); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run(label, ctxOpts, expectFrame) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#go', { timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll('#chips .chip').length > 0, null, { timeout: 20000 });
  const chips = await page.$$eval('#chips .chip', cs => cs.length);
  check(`${label}: the looks row is up`, chips >= 7, `${chips} looks`);
  const src = await page.$eval('#film', v => v.currentSrc || v.src);
  check(`${label}: plays the ${expectFrame} film`, src.endsWith(`${expectFrame}.mp4`), src.split('/').pop());
  // the poster shows the first frame before play: it ships with the page, not from the asset host
  const poster = await page.$eval('#film', v => v.poster);
  const posterOk = await page.evaluate(async u => { try { const r = await fetch(u); return r.ok; } catch (e) { return false; } }, poster);
  check(`${label}: the poster loads before play`, posterOk, poster.split('/').pop());
  await page.click('#go');
  await page.waitForFunction(() => document.querySelector('#film').currentTime > 0.5, null, { timeout: 20000 });
  check(`${label}: plays with sound`, await page.$eval('#film', v => !v.paused && !v.muted));
  // jump to a busy stretch, then one tap on the film
  await page.$eval('#film', v => { v.currentTime = 58; });
  await sleep(800);
  const box = await page.$('#tap').then(e => e.boundingBox());
  const t0 = Date.now();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  const answered = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r({ stamp: document.querySelector('#flash').classList.contains('on'), pressed: [...document.querySelectorAll('#chips .chip')].findIndex(c => c.getAttribute('aria-pressed') === 'true') }))));
  check(`${label}: a tap answers within a frame (stamp, chip)`, answered.stamp && answered.pressed > 0, `chip ${answered.pressed}`);
  // the live window comes up in the look, on the video's clock
  const shown = await page.waitForFunction(() => document.querySelector('#layer .seg.on'), null, { timeout: 25000 }).then(() => true, () => false);
  check(`${label}: the live window shows`, shown, `${Date.now() - t0} ms after the tap`);
  if (shown) {
    await sleep(2500);
    const sync = await page.evaluate(async () => {
      const v = document.querySelector('#film'), seg = document.querySelector('#layer .seg.on');
      const live = await (await fetch('film/live.json')).json();
      const frame = seg.getAttribute('src').includes('-vert-') ? 'vert' : 'wide';
      const w = live.frames[frame].windows.find(x => seg.getAttribute('src').endsWith(x[2]));
      const doc = seg.contentDocument, tok = doc.getElementById('look-tokens');
      const p = seg.contentWindow.__player;
      return { drift: Math.abs(p.getTime() + w[0] - v.currentTime), toks: !!(tok && tok.textContent.includes('--k-paper')), playing: p.isPlaying() };
    });
    check(`${label}: live window on the video's clock`, sync.drift < 0.2, `drift ${(sync.drift * 1000).toFixed(0)} ms`);
    check(`${label}: live window wears the look's tokens`, sync.toks);
    await page.screenshot({ path: `${OUT}/${label}-look1.png` });
  }
  // a 10-tap burst ends on the last look tapped (1 + 10 = 11)
  for (let i = 0; i < 10; i++) { await page.mouse.click(box.x + box.width * (0.3 + i * 0.04), box.y + box.height * 0.5); await sleep(70); }
  const tLast = Date.now();
  await sleep(2500);
  const settled = Date.now() - tLast;
  const pressed = await page.$$eval('#chips .chip', bs => bs.findIndex(b => b.getAttribute('aria-pressed') === 'true'));
  check(`${label}: a 10-tap burst lands on the last look`, pressed === 11, `chip ${pressed}, settled ${settled} ms after the last tap`);
  await page.screenshot({ path: `${OUT}/${label}-look10.png` });
  // fps while live
  const fps = await page.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = t => { n++; if (t - t0 < 2000) requestAnimationFrame(f); else r(n * 1000 / (t - t0)); }; requestAnimationFrame(f); }));
  check(`${label}: live playback frame rate`, fps > 20, `${fps.toFixed(0)} fps`);
  // back to original (one more tap: 11 + 1 = 12 -> 0): the windows hide at once, drop about 4 s later
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await sleep(800);
  check(`${label}: back to original shows the MP4`, await page.$$eval('#layer .seg.on', ss => ss.length === 0));
  await sleep(4500);
  check(`${label}: windows dropped after a few seconds`, await page.$$eval('#layer .seg', ss => ss.length === 0));
  check(`${label}: no page errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } }, 'wide');
await run('phone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }, 'vert');
await browser.close(); stop();
console.log(fails ? `${fails} check(s) failed` : 'all checks passed');
process.exit(fails ? 1 : 0);
