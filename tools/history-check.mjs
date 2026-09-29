// history-check.mjs: does any scene depend on seek history? The renderer primes timelines (a pass to the end and
// back) before it captures, while snapshots and checks seek fresh. Anything that differs between the two is lost or
// wrong in the render: a fromTo's from-only property, overlapping tweens on one property, a `to` recording a start value
// that depends on where the playhead came from.
//   node tools/history-check.mjs <built-dir> [--at 0.25,0.6,0.9] [--only s33,s54]   -> out/hist/, and a diff report
// Page A seeks the sample times in increasing order from a fresh load; page B first seeks to the end and back to 0,
// then the same times. Both screenshot every time; a Python pass scores the pixel difference per time.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args[0]), FR = opt('--at', '0.25,0.6,0.9').split(',').map(Number), only = opt('--only')?.split(',');
const OUT = 'out/hist'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const RUNTIME = fs.readFileSync(path.resolve('node_modules/hyperframes/dist/hyperframe.runtime.iife.js'), 'utf8');
const rootTag = (fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/<[^>]*data-composition-id=[^>]*>/) || [''])[0];
const W = +rootTag.match(/data-width="(\d+)"/)[1], H = +rootTag.match(/data-height="(\d+)"/)[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  if (rel === '__hf_runtime.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(RUNTIME); }
  fs.readFile(path.join(dir, path.normalize(rel)), (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    if (rel.endsWith('.html')) { let h = buf.toString().replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/g, ''); if (rel === 'index.html') h = h.replace(/<head[^>]*>/, m => m + '<script src="/__hf_runtime.js"></script>'); buf = Buffer.from(h); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(rel)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch();
async function open() {
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(() => window.__player, null, { timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('[data-composition-src]')].every(h => (window.__timelines || {})[h.getAttribute('data-composition-id')]), null, { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready.then(() => true));
  await page.waitForTimeout(2500);
  return page;
}
const seek = (page, t) => page.evaluate(t => new Promise(r => { window.__player.seek(t); requestAnimationFrame(() => requestAnimationFrame(r)); }), t);
const A = await open(), B = await open();
const hosts = (await A.evaluate(() => [...document.querySelectorAll('[data-composition-id] > [data-composition-src]')].map(h => ({ id: h.getAttribute('data-composition-id'), start: +h.getAttribute('data-start'), dur: +(h.getAttribute('data-hf-authored-duration') || h.getAttribute('data-duration')) }))))
  .filter(h => h.id !== 'chrome' && (!only || only.includes(h.id)));
// frame-grid times, so a comparison with the render can use the same frames
const times = hosts.flatMap(h => FR.map(f => Math.round((h.start + f * h.dur) * 30) / 30));
const end = await B.evaluate(() => window.__player.getDuration ? window.__player.getDuration() : 0);
await seek(B, Math.max(0, end - 0.05)); await seek(B, 0);
for (const t of times) {
  for (const [p, tag] of [[A, 'A'], [B, 'B']]) { await seek(p, t); await p.screenshot({ path: `${OUT}/${tag}-${t.toFixed(3)}.png` }); }
}
await browser.close(); server.close();
fs.writeFileSync('out/.hist.py', `import os, re
import numpy as np
from PIL import Image
rows = []
for f in sorted(os.listdir('${OUT}')):
    m = re.match(r'A-([\\d.]+)\\.png', f)
    if not m: continue
    a = Image.open('${OUT}/' + f).convert('L'); b = Image.open('${OUT}/B-' + m.group(1) + '.png').convert('L')
    w, h = a.size[0] // 4, a.size[1] // 4
    x = np.asarray(a.resize((w, h)), dtype=np.int16); y = np.asarray(b.resize((w, h)), dtype=np.int16)
    rows.append(((np.abs(x - y) > 24).mean(), float(m.group(1))))
rows.sort(reverse=True)
bad = [r for r in rows if r[0] > 0.002]
for s, t in bad: print(f'{t:8.3f}s  {s * 100:5.2f}% differ')
print(f'{len(bad)} of {len(rows)} moments depend on seek history')
`);
const report = execSync(`"${path.resolve('.venv/Scripts/python.exe')}" out/.hist.py`).toString().trim();
console.log(report);
const map = hosts.map(h => `${h.id}@${h.start}`).join(' ');
fs.writeFileSync(`${OUT}/report.txt`, report + '\n' + map + '\n');
