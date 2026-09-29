// contrast.mjs: token contrast of every visible text element, in every scene, of a built film (any look).
//   node tools/contrast.mjs <built-dir> [--at 0.4,0.7,0.95] [--out report.txt]
// `hyperframes check` measures contrast at five moments per build, which misses most scenes of a 67-scene film. This
// seeks to a few moments inside every scene host and, for each visible text element, compares its colour with the
// colour behind it: the first opaque background up its ancestors (pseudo-element blocks included, translucent layers
// blended), or the scene's own ground. Text over traced art (inside a .k-shot) and data-layout-ignore decor is skipped,
// since its ground is the art. WCAG AA: 3:1 for large text (24 px, or 18.7 px bold), 4.5:1 otherwise.
// Serving and seeking follow the same pattern as the edge checks (see docs/DEPLOY.md). Exit 1 when anything fails.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args[0]), OUT = opt('--out'), FR = opt('--at', '0.4,0.7,0.95').split(',').map(Number);
const RUNTIME = fs.readFileSync(path.resolve('node_modules/hyperframes/dist/hyperframe.runtime.iife.js'), 'utf8');
const rootTag = (fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/<[^>]*data-composition-id=[^>]*>/) || [''])[0];
const W = +rootTag.match(/data-width="(\d+)"/)[1], H = +rootTag.match(/data-height="(\d+)"/)[1];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  if (rel === '__hf_runtime.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end(RUNTIME); }
  const f = path.join(dir, path.normalize(rel));
  fs.readFile(f, (e, buf) => {
    if (e) { res.writeHead(404); return res.end(); }
    if (path.extname(f) === '.html') {
      let html = buf.toString('utf8').replace(/<audio\b[^>]*>[\s\S]*?<\/audio>/g, '');
      if (rel === 'index.html') html = html.replace(/<head[^>]*>/, m => m + '\n<script src="/__hf_runtime.js"></script>');
      buf = Buffer.from(html);
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const { chromium } = createRequire(path.resolve('noop.js'))('playwright');
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForFunction(() => window.__playerReady || window.__player, null, { timeout: 60000 });
await page.waitForFunction(() => [...document.querySelectorAll('[data-composition-src]')].every(h => (window.__timelines || {})[h.getAttribute('data-composition-id')]), null, { timeout: 60000 }).catch(() => {});
await page.evaluate(() => document.fonts.ready.then(() => true));
// the player takes a moment past __player to accept seeks; without this every scene reads as its first frame
await page.waitForFunction(() => window.__playerReady === true, null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);
const hosts = await page.evaluate(() => [...document.querySelectorAll('[data-composition-id] > [data-composition-src]')]
  .filter(h => h.getAttribute('data-composition-id') !== 'chrome')
  .map(h => ({ id: h.getAttribute('data-composition-id'), start: +h.getAttribute('data-start'), dur: +(h.getAttribute('data-hf-authored-duration') || h.getAttribute('data-duration')) })));

const found = new Map(); let checked = 0;
for (const h of hosts) for (const f of FR) {
  const t = h.start + f * h.dur;
  const now = await page.evaluate(t => new Promise(r => { window.__player.seek(t); requestAnimationFrame(() => requestAnimationFrame(() => r(window.__player.getTime ? window.__player.getTime() : -1))); }), t);
  if (process.env.DBG) console.log('seek', t.toFixed(2), '->', now);
  const fails = await page.evaluate(id => {
    const host = [...document.querySelectorAll(`[data-composition-id="${id}"]`)].pop();
    // computed colours arrive as rgb()/rgba(), or as oklch() / color(srgb ...) for relative colours; all become [r, g, b, a]
    const oklch = (L, C, H, A) => {
      const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, q = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
      const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * q];
      return lin.map(v => { v = Math.max(0, Math.min(1, v)); return 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055); }).concat(A);
    };
    const num = (t, pct = 1) => (t.endsWith('%') ? parseFloat(t) / 100 * pct : parseFloat(t));
    const rgba = s => {
      if (!s) return null;
      let m = s.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
      m = s.match(/oklch\(([^)]+)\)/);
      if (m) { const [c, al] = m[1].split('/'), p = c.trim().split(/\s+/); return oklch(num(p[0]), num(p[1], 0.4), parseFloat(p[2]) || 0, al ? num(al.trim()) : 1); }
      m = s.match(/color\(srgb ([^)]+)\)/);
      if (m) { const [c, al] = m[1].split('/'), p = c.trim().split(/\s+/).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, al ? num(al.trim()) : 1]; }
      return null;
    };
    const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
    const lum = c => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
    const inner = host.querySelector(':scope > [data-hf-inner-root]') || host;
    const ground = rgba(getComputedStyle(inner).backgroundColor) || [0, 0, 0, 1];
    const layers = el => { // the colours behind el, top first: its ::before block and background, then each ancestor's
      const out = [];
      for (let e = el; e && e !== host; e = e.parentElement) {
        const b = getComputedStyle(e, '::before');
        if (b.content && b.content !== 'none' && b.position === 'absolute') { const c = rgba(b.backgroundColor); if (c && c[3] > 0) out.push(c); }
        const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) out.push(c);
        if (out.length && out[out.length - 1][3] >= 0.99) break;
      }
      return out;
    };
    const bad = []; let n = 0;
    for (const el of inner.querySelectorAll('*')) {
      if (el.closest('[data-layout-ignore], .k-shot, .k-slabs, .k-credits, script, style, defs')) continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue;
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || c.visibility === 'hidden') continue;
      let op = 1, shown = true;
      for (let e = el; e && e !== host; e = e.parentElement) { const a = getComputedStyle(e); if (a.display === 'none') { shown = false; break; } op *= +a.opacity; }
      if (!shown || op < 0.5) continue;
      if (r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
      let fg = rgba(el instanceof SVGElement ? c.fill : c.color);
      if (!fg) { bad.push({ txt: el.textContent.trim().slice(0, 32), sel: 'unparsed colour: ' + (el instanceof SVGElement ? c.fill : c.color).slice(0, 40), got: 0, need: 0 }); continue; }
      n++;
      let bg = ground; layers(el).reverse().forEach(l => { bg = over(l, bg); });
      fg = over([fg[0], fg[1], fg[2], fg[3] * op], bg);
      // outlined text (a stroke or a text shadow) reads against its outline, not the ground
      // a hard text shadow (no blur) is an outline; a blurred one is a glow and does not count
      const hard = c.textShadow !== 'none' && !/\d+px \d+px [1-9]\d*px/.test(c.textShadow.replace(/-/g, ''));
      const stroke = parseFloat(c.webkitTextStrokeWidth) > 0 ? rgba(c.webkitTextStrokeColor) : hard ? rgba(c.textShadow) : null;
      if (stroke && stroke[3] > 0.5) bg = over(stroke, bg);
      const size = parseFloat(c.fontSize), bold = +c.fontWeight >= 700, large = size >= 24 || (size >= 18.66 && bold), need = large ? 3 : 4.5, got = ratio(fg, bg);
      if (got < need) bad.push({ txt: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 32), sel: (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '')), got: +got.toFixed(2), need });
    }
    return { bad, n };
  }, h.id);
  checked += fails.n; if (process.env.DBG) console.log(h.id, f, fails.n);
  for (const b of fails.bad) { const k = `${h.id}|${b.sel}|${b.txt}`; if (!found.has(k) || found.get(k).got > b.got) found.set(k, { id: h.id, t: +(f * h.dur).toFixed(2), ...b }); }
}
await browser.close(); server.close();
const lines = [...found.values()].sort((a, b) => a.id.localeCompare(b.id)).map(b => `${b.id} +${b.t}s ${b.sel} "${b.txt}" ${b.got}:1 (need ${b.need}:1)`);
const per = {}; found.forEach(b => { per[b.id] = (per[b.id] || 0) + 1; });
const summary = `contrast (${path.basename(dir)}, ${hosts.length} scenes x ${FR.length} moments, ${checked} text checks): ${found.size} failing text element(s)` + (found.size ? ` in ${Object.keys(per).length} scene(s) ${JSON.stringify(per)}` : '');
if (lines.length) console.log(lines.join('\n'));
console.log(summary);
if (OUT) fs.writeFileSync(OUT, lines.concat(summary).join('\n') + '\n');
process.exit(found.size ? 1 : 0);
