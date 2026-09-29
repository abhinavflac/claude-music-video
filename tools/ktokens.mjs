// ktokens.mjs: map every language in looks/tokens.json to the film's 15 --k-* tokens (first match wins), with every
// text pair checked to 4.5:1. Writes looks/k.json.
//   node tools/ktokens.mjs [slug-id6 ...]     (prints the CSS token block for the named languages)
import fs from 'node:fs';

const T = JSON.parse(fs.readFileSync('looks/tokens.json', 'utf8'));
const hex = h => /^#[0-9a-f]{6}$/i.test(h || '');
const lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const bw = bg => (contrast('#000000', bg) >= contrast('#FFFFFF', bg) ? '#000000' : '#FFFFFF');
const first = (...xs) => xs.find(hex);
const passing = (bg, ...xs) => xs.filter(hex).find(x => contrast(x, bg) >= 4.5) || bw(bg);
const fam = (f, fallback) => f ? `'${f}', ${fallback}` : fallback;

export function kOf(t) {
  const c = t.c;
  const paper = first(c.background, c.bg) || '#FFFFFF';
  const surface = first(c['surface-solid'], c.surface) || paper;
  const ink = passing(paper, c.text, c.ink, c['wall-text'], c['on-ground'], c['text-inverse']);
  const onSurface = passing(surface, c['on-surface'], c.ink, c.text, c['text-on-plate'], c['on-panel'], c['on-leaf'], c.background, c.bg);
  const muted = hex(c.muted) && contrast(c.muted, paper) >= 4.5 ? c.muted : (hex(c['wall-muted']) && contrast(c['wall-muted'], paper) >= 4.5 ? c['wall-muted'] : ink);
  const line = first(c.border, c.line) || muted;
  const accent = first(c.accent, c.primary) || ink;
  const accent2 = first(c['accent-2'], c.secondary) || accent;
  const accent3 = first(c['accent-3']) || accent;
  const onAccent = passing(accent, c['on-accent'], ink, paper);
  const radius = t.radius?.md ?? t.radius?.card ?? t.radius?.base ?? t.radius?.sm ?? '0px';
  return {
    paper, surface, ink, 'on-surface': onSurface, muted, line, accent, 'accent-2': accent2, 'accent-3': accent3, 'on-accent': onAccent,
    'font-display': fam(t.font.h, 'sans-serif'), 'font-body': fam(t.font.b, 'sans-serif'), 'font-mono': fam(t.font.m, 'monospace'),
    radius: /^\d+$/.test(String(radius)) ? radius + 'px' : String(radius), shadow: t.shadow?.md || 'none',
  };
}
export const cssBlock = k => Object.entries(k).map(([n, v]) => `--k-${n}: ${v};`).join(' ');

const all = Object.fromEntries(Object.entries(T).map(([key, t]) => [key, kOf(t)]));
fs.writeFileSync('looks/k.json', JSON.stringify(all, null, 1) + '\n');
const args = process.argv.slice(2);
if (args.length) for (const a of args) console.log(`${a}:\n  ${cssBlock(all[a])}`);
else {
  const rows = Object.entries(all).map(([key, k]) => [key, contrast(k.ink, k.paper), contrast(k['on-surface'], k.surface), contrast(k.muted, k.paper), contrast(k['on-accent'], k.accent)]);
  const bad = rows.filter(r => r.slice(1).some(x => x < 4.5));
  console.log(`looks/k.json: ${rows.length} languages; pairs under 4.5:1: ${bad.length ? bad.map(r => r[0]).join(', ') : 'none'}`);
}
