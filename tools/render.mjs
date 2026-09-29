// render.mjs: render a frame of the film in chunks cut at scene starts, join them, and lay the song under the picture.
//   node tools/render.mjs <wide|vert> [--chunks 8] [--parallel 2] [--only 3,5] [--quality delivery]
// Chunk bounds: N equal parts of the song, each moved to the nearest scene start (every start sits on the 30 fps
// grid, so each chunk is a whole number of frames). Each chunk is built with --window and --mute, rendered to
// renders/chunks/<frame>-<i>.mp4, and only failed chunks need a re-run (--only). Then renders/<frame>.mp4 is the joined
// picture with song/song.wav under it. Logs go to renders/chunks/<frame>-<i>.log.
import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';

const [frame, ...rest] = process.argv.slice(2), opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
if (!/^(wide|vert)$/.test(frame || '')) { console.error('usage: node tools/render.mjs <wide|vert> [--chunks 8] [--parallel 2]'); process.exit(1); }
const N = +opt('--chunks', '8'), P = +opt('--parallel', '2'), Q = opt('--quality', 'delivery'), only = opt('--only')?.split(',').map(Number);

// scene starts from a plain build of this frame (the build owns the frame grid)
execSync(`node tools/build-film.mjs --frame ${frame} --mute --out out/render-plan-${frame}`, { stdio: 'ignore' });
const html = fs.readFileSync(`out/render-plan-${frame}/index.html`, 'utf8');
const starts = [...html.matchAll(/<div id="s\d+" data-composition-id="s\d+"[^>]*? data-start="([\d.]+)"/g)].map(m => +m[1]);
const dur = +html.match(/data-composition-id="main" data-start="0" data-duration="([\d.]+)"/)[1];
const bounds = [0];
for (let k = 1; k < N; k++) { const target = k * dur / N; bounds.push(starts.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a))); }
bounds.push(dur);
const chunks = bounds.slice(0, -1).map((a, i) => [i, a, bounds[i + 1]]).filter(([, a, b]) => b > a);
fs.mkdirSync('renders/chunks', { recursive: true });
console.log(`${frame}: ${chunks.length} chunks ${chunks.map(([i, a, b]) => `${i}:${a}-${b}`).join(' ')}`);

const run = (cmd, args, log) => new Promise(res => {
  const out = fs.openSync(log, 'a'), p = spawn(cmd, args, { stdio: ['ignore', out, out], shell: true });
  p.on('close', code => { fs.closeSync(out); res(code); });
});
const todo = chunks.filter(([i]) => !only || only.includes(i)), failed = [];
async function worker() {
  while (todo.length) {
    const [i, a, b] = todo.shift(), dir = `out/chunks/${frame}-${i}`, mp4 = `renders/chunks/${frame}-${i}.mp4`, log = `renders/chunks/${frame}-${i}.log`;
    fs.writeFileSync(log, `chunk ${i} ${a}-${b}\n`);
    const t0 = Date.now();
    let code = await run('node', ['tools/build-film.mjs', '--frame', frame, '--mute', '--window', `${a},${b}`, '--out', dir], log);
    if (!code) code = await run('npx', ['hyperframes', 'render', dir, '--output', mp4, '--fps', '30', '--quality', Q, '--workers', '2'], log);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`${frame}-${i} (${a}-${b} s): ${code ? 'FAILED' : 'ok'} in ${secs} s`);
    if (code) failed.push(i);
  }
}
await Promise.all(Array.from({ length: P }, worker));
if (failed.length) { console.log(`failed: ${failed.join(',')} (re-run with --only ${failed.join(',')})`); process.exit(1); }

// join every chunk (all must exist), check the length, lay the song under it
const files = chunks.map(([i]) => `${frame}-${i}.mp4`);
const missing = files.filter(f => !fs.existsSync(`renders/chunks/${f}`));
if (missing.length) { console.log(`not joining: missing ${missing.join(', ')}`); process.exit(1); }
fs.writeFileSync(`renders/chunks/${frame}.txt`, files.map(f => `file '${f}'`).join('\n') + '\n');
execSync(`ffmpeg -v error -y -f concat -safe 0 -i renders/chunks/${frame}.txt -an -c:v copy renders/${frame}-picture.mp4`, { stdio: 'inherit' });
execSync(`ffmpeg -v error -y -i renders/${frame}-picture.mp4 -i song/song.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart renders/${frame}.mp4`, { stdio: 'inherit' });
const got = +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 renders/${frame}.mp4`).toString();
console.log(`renders/${frame}.mp4: ${got.toFixed(3)} s (song ${dur} s, ${Math.abs(got - dur) <= 1 / 30 ? 'within a frame' : 'OFF BY ' + (got - dur).toFixed(3) + ' s'})`);
