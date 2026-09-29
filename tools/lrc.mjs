// lrc.mjs: write song/Lossless.lrc, the timed lyrics as an .lrc file (line-level, from song/timing.json)
//   node tools/lrc.mjs
import fs from 'node:fs';

const lyrics = JSON.parse(fs.readFileSync('song/lyrics.json', 'utf8'));
const timing = JSON.parse(fs.readFileSync('song/timing.json', 'utf8'));
const stamp = t => {
  const cs = Math.round(t * 100), m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `[${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}]`;
};
const dur = timing.duration, dm = Math.floor(dur / 60), ds = Math.round(dur % 60);
const out = [
  '[ar:abhinavflac]',
  '[ti:Lossless]',
  '[al:Lossless]',
  '[by:abhinavflac]',
  `[length:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}]`,
  '[offset:0]',
  '',
  ...lyrics.map(l => `${stamp(timing.lines[l.id].t)}${l.text}`),
];
fs.writeFileSync('song/Lossless.lrc', out.join('\n') + '\n');
console.log(`song/Lossless.lrc: ${lyrics.length} lines, ${out[4]}`);
