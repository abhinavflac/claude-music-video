// audit-looks.mjs: drive the Lossless page as the Next.js app it ships as, dress every window in every look and report
// text elements that overlap, so restyle looks whose faces are wider than the scene's own are found and fixed.
//   node tools/audit-looks.mjs [--frames wide,vert] [--looks 1,2,3] [--windows live-wide-07.html] [--min-area 40]
// Boots `next dev` on port 5198, prepares public/lossless, and seeks the film to each scene's end (all words revealed),
// then walks the window's document for pairs of visible text boxes that intersect. data-layout-allow-overlap on both
// sides is left alone (kerning, stickers); a word block pushed into the copy below by a wider face is reported.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startPreview } from './preview.mjs';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const OUT = 'out/audit-looks';
const FRAMES = opt('--frames', 'wide,vert').split(',');
const LOOKS_F = opt('--looks') ? opt('--looks').split(',').map(Number) : null;
const WINDOWS_F = opt('--windows') ? new Set(opt('--windows').split(',')) : null;
const MIN_AREA = +opt('--min-area', '40');
fs.mkdirSync(OUT, { recursive: true });
const { url: base, stop } = await startPreview(+process.env.PORT || 5198);
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=no-user-gesture-required'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const found = [];

async function frameRun(frame, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts), page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('#go', { timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll('#chips .chip').length > 0, null, { timeout: 20000 });
  const live = await page.evaluate(() => fetch('film/live.json').then(r => r.json()));
  const looks = await page.evaluate(() => fetch('film/looks.json').then(r => r.json()));
  const wins = live.frames[frame].windows.filter(w => !WINDOWS_F || WINDOWS_F.has(w[2]));
  const indices = LOOKS_F || looks.looks.map((_, i) => i).slice(1);
  for (const li of indices) {
    const look = looks.looks[li];
    await page.evaluate(i => { document.querySelectorAll('#chips .chip')[i].click(); }, li);
    await page.waitForFunction(p => getComputedStyle(document.documentElement).getPropertyValue('--k-paper').trim().toUpperCase() === p, (look.k || {}).paper.toUpperCase(), { timeout: 8000 }).catch(() => {});
    await sleep(400);
    for (const [a, b, file] of wins) {
      await page.$eval('#film', (v, t) => { v.currentTime = t; }, a + 0.1);
      const shown = await page.waitForFunction(f => [...document.querySelectorAll('#layer .seg')].some(s => s.getAttribute('src').endsWith(f) && s.classList.contains('on')), file, { timeout: 25000 }).then(() => true, () => false);
      if (!shown) { console.log(`skip ${frame} ${look.id} ${file}: window never showed`); continue; }
      await sleep(600);
      const scenes = await page.evaluate(f => {
        const seg = [...document.querySelectorAll('#layer .seg')].find(x => x.getAttribute('src').endsWith(f) && x.classList.contains('on'));
        const S = seg.contentWindow.FILM.scenes;
        return Object.entries(S).map(([id, s]) => [id, s.start, s.dur, (s.lines || []).length]).filter(([, st]) => isFinite(st)).sort((x, y) => x[1] - y[1]);
      }, file);
      const all = scenes.filter(([, st]) => st >= a - 0.01 && st < b);
      const inside = all.filter(([, , , lines]) => lines > 0);   // scenes with lyric lines
      if (all.length && inside.indexOf(all[all.length - 1]) < 0) inside.push(all[all.length - 1]);   // and the window's last scene, for typed copy
      if (process.env.DBG) console.log(`  window ${file} [${a},${b}] scenes ${inside.map(s => s[0]).join(',') || 'none'}`);
      for (const [sid, st, dur] of inside) {
        const at = Math.min(st + dur - 0.35, b - 0.25);
        await page.$eval('#film', (v, t) => { v.currentTime = t; }, at);
        await sleep(1400);
        const hits = await page.evaluate(f => {
          const seg = [...document.querySelectorAll('#layer .seg')].find(x => x.getAttribute('src').endsWith(f) && x.classList.contains('on'));
          const doc = seg.contentDocument;
          const sel = el => { const s = []; for (let e = el; e && e.tagName !== 'BODY'; e = e.parentElement) s.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.classList && e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '')); return s.join('>'); };
          // the visible glyph box of an element's own text: each line fragment, shrunk from its line box towards the type
          // (line-height leading is not an overlap) and cut by every overflow ancestor (clipped copy is not on screen)
          const range = el => {
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
            for (const n of el.childNodes) {
              if (n.nodeType !== 3 || !n.nodeValue.trim()) continue;
              const r = doc.createRange(); r.selectNodeContents(n);
              for (const fr of r.getClientRects()) {
                const inset = Math.max(0, (fr.height - fs * 1.02) / 2);
                let l = fr.left, t = fr.top + inset, rr = fr.right, b = fr.bottom - inset, vis = true;
                for (let e = el; e && e.tagName !== 'BODY'; e = e.parentElement) {
                  const c = getComputedStyle(e);
                  if (c.overflow === 'visible' && c.overflowX === 'visible' && c.overflowY === 'visible') continue;
                  const br = e.getBoundingClientRect();
                  l = Math.max(l, br.left); rr = Math.min(rr, br.right); t = Math.max(t, br.top); b = Math.min(b, br.bottom);
                  if (rr <= l || b <= t) { vis = false; break; }
                }
                if (!vis) continue;
                x0 = Math.min(x0, l); y0 = Math.min(y0, t); x1 = Math.max(x1, rr); y1 = Math.max(y1, b);
              }
            }
            return isFinite(x0) ? { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 } : null;
          };
          const els = [];
          for (const el of doc.querySelectorAll('body *')) {
            if (el.closest('script,style,defs,template,[data-layout-ignore]')) continue;
            let op = 1, hide = false;
            for (let e = el; e && e.tagName !== 'BODY'; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') { hide = true; break; } op *= +c.opacity; }
            if (hide || op < 0.5) continue;
            const r = range(el);
            if (!r || r.width < 6 || r.height < 5) continue;
            els.push({ el, r, sel: sel(el), txt: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 44), allow: !!el.closest('[data-layout-allow-overlap]') });
          }
          const out = [], word = E => !!E.el.closest('.k-line');
          for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
            const A = els[i], B = els[j];
            if (A.el.contains(B.el) || B.el.contains(A.el)) continue;
            if (A.el.parentElement === B.el.parentElement) continue;   // one text block, line boxes overlap by leading
            if (A.allow && B.allow) continue;
            if (A.allow && !word(A)) continue;   // a stamp or sticker over copy: by design
            if (B.allow && !word(B)) continue;
            const x = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left);
            const y = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top);
            if (x > 2 && y > 2 && x * y > 30) out.push({ a: A.sel, at: A.txt, b: B.sel, bt: B.txt, area: Math.round(x * y), aa: A.allow, ba: B.allow });
          }
          return out;
        }, file);
        for (const h of hits) {
          found.push({ frame, look: look.id, win: file, scene: sid, at, ...h });
          console.log(`${look.id.padEnd(9)} ${frame} ${file} ${sid} @${at.toFixed(1)}s  ${h.a} "${h.at}"  <>  ${h.b} "${h.bt}"  (${h.area} px2${h.aa ? ', a allows' : ''}${h.ba ? ', b allows' : ''})`);
        }
      }
    }
  }
  if (errors.length) console.log(`${frame}: page errors: ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

for (const frame of FRAMES) {
  const ctxOpts = frame === 'vert'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: 1440, height: 900 } };
  await frameRun(frame, ctxOpts);
}
await browser.close(); stop();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(found, null, 1));
console.log(`\n${found.length} overlapping pair(s); report in ${OUT}/report.json`);
process.exit(found.length ? 1 : 0);
