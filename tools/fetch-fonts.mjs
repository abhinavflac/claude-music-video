// fetch-fonts.mjs: self-host every look's Google Fonts. Keeps the latin and latin-ext subsets only (the film is English),
// downloads the .woff2 files into assets/fonts/ and writes assets/fonts.css with url(assets/fonts/...) paths.
// Covers the scene languages (looks/tokens.json) and the restyle looks (looks.json fonts), and writes a size-adjusted
// '<family> Fit' copy for every family a look's fit map names.
//   node tools/fetch-fonts.mjs
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const tokens = JSON.parse(fs.readFileSync('looks/tokens.json', 'utf8'));
const looks = fs.existsSync('looks.json') ? JSON.parse(fs.readFileSync('looks.json', 'utf8')).looks || [] : [];
const urls = [...new Set([...Object.values(tokens).map(t => t.fonts_url), ...looks.map(l => l.fonts)].filter(Boolean))];
const fit = {}; // family -> size-adjust %, from every look's fit map
for (const l of looks) for (const [fam, pct] of Object.entries(l.fit || {})) fit[fam] = pct;
fs.mkdirSync('assets/fonts', { recursive: true });

const get = async (u, kind) => {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(u, { headers: { 'user-agent': UA } });
      if (!r.ok) throw new Error(`${r.status} ${u}`);
      return kind === 'text' ? await r.text() : Buffer.from(await r.arrayBuffer());
    } catch (e) { if (i === 3) throw e; await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
};

const rules = new Map(); // key: family|weight|style|stretch|range -> css rule
const files = new Map(); // remote url -> local name
for (const u of urls) {
  const css = await get(u, 'text');
  // blocks look like: /* latin */\n@font-face { ... }
  for (const m of css.matchAll(/\/\*\s*([\w\[\]-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
    const subset = m[1], rule = m[2];
    if (subset !== 'latin' && subset !== 'latin-ext') continue;
    const prop = p => (rule.match(new RegExp(p + ':\\s*([^;]+);')) || [])[1]?.trim() || '';
    const key = [prop('font-family'), prop('font-weight'), prop('font-style'), prop('font-stretch'), prop('unicode-range')].join('|');
    const src = (rule.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/) || [])[1];
    if (!src) continue;
    if (!files.has(src)) files.set(src, path.basename(new URL(src).pathname));
    rules.set(key, rule.replace(src, `assets/fonts/${files.get(src)}`));
  }
}
let n = 0, bytes = 0;
const queue = [...files.entries()];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const [src, name] = queue.shift(), out = `assets/fonts/${name}`;
    if (!fs.existsSync(out)) fs.writeFileSync(out, await get(src, 'bin'));
    n++; bytes += fs.statSync(out).size;
  }
}));
const sorted = [...rules.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, r]) => r);
// '<family> Fit': the same files as a smaller face (size-adjust), for families wider than the scenes were set for
const fits = [];
for (const rule of sorted) {
  const fam = (rule.match(/font-family:\s*'([^']+)'/) || [])[1];
  if (!fam || !fit[fam]) continue;
  const cut = rule.lastIndexOf('}');
  if (cut < 0) continue;
  fits.push(rule.slice(0, cut).replace(`font-family: '${fam}'`, `font-family: '${fam} Fit'`) + `  size-adjust: ${fit[fam]}%;\n}` + rule.slice(cut + 1));
}
fs.writeFileSync('assets/fonts.css', sorted.concat(fits).join('\n') + '\n');
const fams = new Set([...rules.keys()].map(k => k.split('|')[0]));
console.log(`${urls.length} font sheets -> ${fams.size} families, ${sorted.length} faces, ${fits.length} fit faces, ${n} files, ${(bytes / 1048576).toFixed(1)} MB`);
