// realign-lines.mjs: force-align every lyric line again on a tight clip of the vocal stem, with its neighbours as
// context lines when the singing runs on. Writes align/lines/<id>.wav/.txt/.json and align/sections-lines.json.
//   ELEVENLABS_API_KEY=... node tools/realign-lines.mjs [--only id,id]
// Clip bounds come from song/timing-draft.json and song/timing-aligned.json (a candidate whose line is wildly longer
// than the other's is ignored for bounds).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2), only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error('ELEVENLABS_API_KEY is not set');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const lyrics = read('song/lyrics.json'), D = read('song/timing-draft.json').lines, A = read('song/timing-aligned.json').lines;
const text = l => (l.sung ?? l.text).replace(/[()]/g, ' ');
const r2 = x => Math.round(x * 100) / 100;

// consensus bounds per line
const B = lyrics.map(l => {
  const d = D[l.id], a = A[l.id], dl = d.end - d.t, al = a.end - a.t;
  const useA = al < 2 * dl + 1, useD = dl < 2 * al + 1;
  const ts = [useD && d.t, useA && a.t].filter(x => x !== false), es = [useD && d.end, useA && a.end].filter(x => x !== false);
  return { id: l.id, t: Math.min(...ts), end: Math.max(...es) };
});
fs.mkdirSync('align/lines', { recursive: true });
const sections = [];
for (let i = 0; i < lyrics.length; i++) {
  const b = B[i], p = B[i - 1], n = B[i + 1];
  const withPrev = p && b.t - p.end < 0.5, withNext = n && n.t - b.end < 0.5;
  let from = withPrev ? p.t - 0.15 : Math.max(p ? p.end + 0.1 : 0, b.t - 1.0);
  let to = withNext ? n.end + 0.15 : Math.min(n ? n.t - 0.1 : 1e9, b.end + 1.0);
  from = r2(Math.max(0, from)); to = r2(to);
  const ids = [...(withPrev ? ['~' + p.id] : []), b.id, ...(withNext ? ['~' + n.id] : [])];
  sections.push({ file: `align/lines/${b.id}.json`, shift: from, ids });
  if (only && !only.includes(b.id)) continue;
  const wav = `align/lines/${b.id}.wav`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), '-to', String(to), '-i', 'align/vocals-16k.wav', '-c:a', 'pcm_s16le', wav]);
  const txt = ids.map(id => text(lyrics.find(l => l.id === id.replace(/^~/, '')))).join('\n') + '\n';
  fs.writeFileSync(`align/lines/${b.id}.txt`, txt);
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), `${b.id}.wav`);
  fd.append('text', txt);
  let res, body;
  for (let tries = 0; tries < 3; tries++) {
    res = await fetch('https://api.elevenlabs.io/v1/forced-alignment', { method: 'POST', headers: { 'xi-api-key': key }, body: fd });
    body = await res.text();
    if (res.ok) break;
    await new Promise(r => setTimeout(r, 1500 * (tries + 1)));
  }
  if (!res.ok) { console.error(`${b.id}: HTTP ${res.status} ${body.slice(0, 200)}`); continue; }
  fs.writeFileSync(`align/lines/${b.id}.json`, body);
  const j = JSON.parse(body);
  console.log(`${b.id.padEnd(7)} ${from.toFixed(2).padStart(7)}-${to.toFixed(2).padEnd(7)} ${ids.join(' ').padEnd(22)} loss ${j.loss.toFixed(2)}`);
}
fs.writeFileSync('align/sections-lines.json', JSON.stringify(sections, null, 1) + '\n');
console.log('wrote align/sections-lines.json');
