// add-tokens.mjs: merge language token records (JSON on stdin) into looks/tokens.json, keyed by slug-id6.
import fs from 'node:fs';
const f = 'looks/tokens.json', all = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
const add = JSON.parse(fs.readFileSync(0, 'utf8'));
for (const [k, v] of Object.entries(add)) all[k] = v;
fs.writeFileSync(f, JSON.stringify(all, null, 1) + '\n');
console.log(Object.keys(all).length, 'languages in looks/tokens.json');
