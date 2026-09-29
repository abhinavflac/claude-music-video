// filmsheet.mjs: whole-film contact sheets, a few frames per scene, labelled with the scene id and song time.
//   node tools/filmsheet.mjs <wide|vert> [--at 0.35,0.8] [--per 48]     -> out/film-<frame>-<n>.png
// Builds the frame (muted), snapshots every scene at the given fractions of its length, and tiles the frames into
// sheets of --per frames each, small enough to read at phone size.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const [frame, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const FR = opt('--at', '0.35,0.8').split(',').map(Number), PER = +opt('--per', '48'), dir = `out/sheet-${frame}`;
execSync(`node tools/build-film.mjs --frame ${frame} --mute --out ${dir}`, { stdio: 'ignore' });
const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const hosts = [...html.matchAll(/<div id="(s\d+)" data-composition-id="\1"[^>]*? data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(m => ({ id: m[1], at: +m[2], dur: +m[3] }));
const shots = hosts.flatMap(h => FR.map(f => ({ id: h.id, t: +(h.at + f * h.dur).toFixed(3) })));
fs.rmSync(`${dir}/frames`, { recursive: true, force: true }); fs.mkdirSync(`${dir}/frames`, { recursive: true });
// snapshot in groups, so one slow frame does not sink the run; the tool clears snapshots/ on every call, so each
// group's frames move to frames/ before the next
for (let i = 0; i < shots.length; i += 12) {
  const group = shots.slice(i, i + 12);
  fs.rmSync(`${dir}/snapshots`, { recursive: true, force: true });
  try { execSync(`npx hyperframes snapshot ${dir} --at ${group.map(s => s.t).join(',')}`, { stdio: 'ignore', timeout: 900000 }); } catch {}
  if (fs.existsSync(`${dir}/snapshots`)) for (const f of fs.readdirSync(`${dir}/snapshots`)) {
    const m = f.match(/^frame-\d+-at-([\d.]+)s\.png$/);
    if (m && group.some(s => Math.abs(s.t - +m[1]) < 0.002)) fs.renameSync(`${dir}/snapshots/${f}`, `${dir}/frames/at-${m[1]}.png`);
  }
}
const files = fs.readdirSync(`${dir}/frames`);
const byTime = new Map(files.map(f => [+f.match(/^at-([\d.]+)\.png$/)[1], `${dir}/frames/${f}`]));
const list = shots.map(s => ({ ...s, file: [...byTime.entries()].find(([t]) => Math.abs(t - s.t) < 0.002)?.[1] }));
fs.writeFileSync('out/.filmsheet.json', JSON.stringify(list.filter(s => s.file)));
fs.writeFileSync('out/.filmsheet.py', `import json, sys
from PIL import Image, ImageDraw
items = json.load(open('out/.filmsheet.json')); frame, per = sys.argv[1], int(sys.argv[2])
w, h = (320, 180) if frame == 'wide' else (150, 267)
cols = 6 if frame == 'wide' else 12
for n in range(0, len(items), per):
    page = items[n:n + per]; rows = (len(page) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + 6), rows * (h + 26)), (32, 32, 32)); d = ImageDraw.Draw(sheet)
    for i, it in enumerate(page):
        im = Image.open(it['file']).convert('RGB').resize((w, h), Image.LANCZOS)
        x, y = (i % cols) * (w + 6), (i // cols) * (h + 26)
        sheet.paste(im, (x, y + 20)); d.text((x + 3, y + 4), f"{it['id']}  {it['t']:.2f}s", fill=(230, 230, 230))
    sheet.save(f'out/film-{frame}-{n // per + 1}.png'); print(f'out/film-{frame}-{n // per + 1}.png', len(page))
`);
console.log(execSync(`"${path.resolve('.venv/Scripts/python.exe')}" out/.filmsheet.py ${frame} ${PER}`).toString().trim());
console.log(`${list.filter(s => s.file).length}/${shots.length} frames`);
