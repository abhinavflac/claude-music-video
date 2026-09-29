// batch.mjs: generate, build (--only, with the chrome) and check a batch of scenes in both frames, then snapshot each
// scene at a few moments and tile them into one contact sheet per frame (out/sheet-NAME-<frame>.png).
//   node tools/batch.mjs NAME s06,s09 [--frames wide,vert] [--at 0.1,0.4,0.75] [--no-check] [--no-gen] [--samples N]
// The full check report goes to out/check-NAME-<frame>.txt; only errors and warnings are printed.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [name, list, ...rest] = process.argv.slice(2);
if (!name || !list) { console.error('usage: node tools/batch.mjs NAME s06,s09 [--frames wide,vert] [--at 0.1,0.4,0.75]'); process.exit(1); }
const ids = list.split(','), opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const frames = (opt('--frames') || 'wide,vert').split(','), fracs = (opt('--at') || '0.1,0.4,0.75').split(',').map(Number);
const run = cmd => { try { return execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || '') + `\n[exit ${e.status}]`; } };
const clean = s => s.replace(/\x1b\[[0-9;]*m/g, '');
const py = `"${path.resolve('.venv/Scripts/python.exe')}"`;

if (!rest.includes('--no-gen')) process.stdout.write(run(`node tools/gen-scenes.mjs ${ids.join(' ')}`));
for (const f of frames) {
  const dir = `out/b-${name}-${f}`;
  process.stdout.write(run(`node tools/build-film.mjs --frame ${f} --only ${ids.join(',')} --chrome --out ${dir}`));
  const html = fs.readFileSync(`${dir}/index.html`, 'utf8');
  const hosts = [...html.matchAll(/<div id="(s\d+)" data-composition-id="\1"[^>]*? data-start="([\d.]+)" data-duration="([\d.]+)"/g)].map(m => ({ id: m[1], at: +m[2], dur: +m[3] }));
  if (!rest.includes('--no-check')) {
    const out = clean(run(`npx hyperframes check ${dir} --samples ${opt('--samples') || Math.max(12, hosts.length * 8)}`));
    fs.writeFileSync(`out/check-${name}-${f}.txt`, out);
    const lines = out.split('\n'), keep = [];
    lines.forEach((l, i) => {
      if (/^\s*[✗⚠]|error\(s\)|errors?,|issues? across|checks pass|Check (passed|failed)/.test(l)) {
        keep.push(l);
        if (/^\s*[✗⚠]/.test(l) && lines[i + 1] && /^\s+(Fix|Try)/.test(lines[i + 1])) keep.push(lines[i + 1]);
      }
    });
    console.log(`\n== check ${f} (full report: out/check-${name}-${f}.txt) ==\n` + keep.join('\n'));
  }
  const times = hosts.flatMap(h => fracs.map(x => +(h.at + x * h.dur).toFixed(3)));
  fs.rmSync(`${dir}/snapshots`, { recursive: true, force: true });
  const snap = clean(run(`npx hyperframes snapshot ${dir} --at ${times.join(',')}`));
  const shots = fs.existsSync(`${dir}/snapshots`) ? fs.readdirSync(`${dir}/snapshots`).filter(p => /^frame-\d+/.test(p)).sort().slice(0, times.length).map(p => `${dir}/snapshots/${p}`) : [];
  if (shots.length < times.length) { console.log(`snapshot ${f}: ${shots.length}/${times.length} frames\n` + snap.split('\n').slice(-12).join('\n')); if (!shots.length) continue; }
  const sheet = `out/sheet-${name}-${f}.png`, cols = fracs.length, scale = f === 'vert' ? 0.28 : 0.3;
  fs.writeFileSync('out/.sheet.py', `import sys
from PIL import Image
paths = sys.argv[3:]; cols = int(sys.argv[2]); ims = [Image.open(p).convert('RGB') for p in paths]
w, h = int(ims[0].width * ${scale}), int(ims[0].height * ${scale}); rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (40, 40, 40))
for i, im in enumerate(ims):
    sheet.paste(im.resize((w, h), Image.LANCZOS), ((i % cols) * (w + 6), (i // cols) * (h + 6)))
sheet.save(sys.argv[1])
`);
  const r = run(`${py} out/.sheet.py ${sheet} ${cols} ${shots.join(' ')}`);
  if (r.trim()) console.log(r);
  console.log(`sheet ${sheet}: ${hosts.map(h => `${h.id}@${h.at}`).join(' ')} (rows: scenes, columns: ${fracs.join(', ')} of each)`);
}
