// fromto-lint.mjs: list every fromTo whose "from" vars set a property the "to" vars do not.
//   node tools/fromto-lint.mjs [files...]      (default: scenes-src/*.html, assets/kit.js, compositions/*/s20.html, chrome)
// GSAP applies a fromTo's from-only properties once, when the tween initialises, and reverts them when the playhead
// rewinds past it; a later forward seek never re-applies them. The renderer primes timelines (end and back), so a
// from-only property is lost in the render even though snapshots show it. Every such property belongs in "to" too.
import fs from 'node:fs';
import path from 'node:path';

const files = process.argv.slice(2).length ? process.argv.slice(2)
  : [...fs.readdirSync('scenes-src').map(f => `scenes-src/${f}`), 'assets/kit.js', 'compositions/wide/s20.html', 'compositions/vert/s20.html', 'compositions/wide/chrome.html', 'compositions/vert/chrome.html'];
const IGNORE = new Set(['immediateRender', 'lazy', 'duration', 'ease', 'delay', 'overwrite', 'yoyo', 'repeat', 'stagger', 'onUpdate', 'onComplete']);
// the object literal that starts at s[i] ('{'), balanced, skipping strings and template literals
function objectAt(s, i) {
  let depth = 0, q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return [s.slice(i, j + 1), j + 1];
  }
  return [null, s.length];
}
// top-level keys of an object literal's source
function keys(obj) {
  const out = []; let depth = 0, q = null, tok = '', expectKey = true;
  for (let j = 1; j < obj.length - 1; j++) {
    const c = obj[j];
    if (q) { if (c === '\\') j++; else if (c === q) q = null; if (expectKey && depth === 0) tok += c; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; if (expectKey && depth === 0) tok += c; continue; }
    if ('{[('.includes(c)) depth++;
    else if ('}])'.includes(c)) depth--;
    else if (depth === 0 && c === ':' && expectKey) { out.push(tok.trim().replace(/^['"]|['"]$/g, '')); tok = ''; expectKey = false; continue; }
    else if (depth === 0 && c === ',') { expectKey = true; tok = ''; continue; }
    if (expectKey && depth === 0) tok += c;
  }
  // shorthand keys ({ x, y }) are rare here; a key with no colon is kept as written
  if (expectKey && tok.trim() && /^[\w$]+$/.test(tok.trim())) out.push(tok.trim());
  return out;
}
let n = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\.fromTo\(/g)) {
    let i = s.indexOf('{', m.index), line = s.slice(0, m.index).split('\n').length;
    if (i < 0 || i - m.index > 200) continue;   // a fromTo whose vars are not literals (none here)
    const [from, j] = objectAt(s, i); if (!from) continue;
    const k = s.indexOf('{', j); if (k < 0 || k - j > 20) continue;
    const [to] = objectAt(s, k); if (!to) continue;
    const toKeys = new Set(keys(to)), only = keys(from).filter(x => !IGNORE.has(x) && !toKeys.has(x));
    if (only.length) { n++; console.log(`${path.normalize(f)}:${line}  from-only: ${only.join(', ')}`); }
  }
}
console.log(n ? `${n} fromTo(s) with from-only properties` : 'no from-only properties');
process.exit(n ? 1 : 0);
