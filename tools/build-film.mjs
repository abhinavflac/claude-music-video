// build-film.mjs: assemble one frame of the film into a HyperFrames project.
//   node tools/build-film.mjs [--frame wide|vert] [--only s04,s05] [--window from,to] [--mute] [--look id] [--out dir] [--chrome|--no-chrome]
// Where the data comes from: song/lyrics.json, song/timing.json, song/beats.json, scenes.json, compositions/<frame>/sNN.html,
// art/ and assets/ (looks.json only when --look is given). What comes out, under out/<frame>/ by default: index.html,
// timing.js, and real copies of the frame's compositions, the art and the assets.
//
// The shape of a scene: one <scene look> tag, an optional <tokens> line, per-frame <style> and <body> blocks, and one
// <script> that registers a paused GSAP timeline on window.__timelines. docs/DEPLOY.md describes the contract in full.
//
// Things this build adds on top of the HyperFrames format:
//   * assets/kit.css is inlined (the token-driven look of every control) and assets/kit.js is loaded (window.K, the
//     scene helpers); both are shared by every scene.
//   * compositions/<frame>/chrome.html (the encoding pill and the bitrate counter) rides over the whole film. It is on
//     for full and window builds, and for --only builds only when --chrome is passed.
//   * window.FILM carries the song's beats and downbeats, the scene order, and per scene its own (scene-relative)
//     beats, downbeats and timed lines; FILM.offset is where this build starts in the song.
//   * every face of every family the placed scenes name is asked to load before the first frame renders.
//   * scenes marked "levels" in scenes.json take their audio levels from song/levels.json (see tools/levels.py).
import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const has = name => args.includes(name);
const die = message => { console.error('build-film: ' + message); process.exit(1); };
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const r3 = n => +n.toFixed(3);
const r4 = n => +n.toFixed(4);

const FRAME = opt('--frame', 'wide');
if (FRAME !== 'wide' && FRAME !== 'vert') die('--frame takes wide or vert');
const [W, H] = FRAME === 'vert' ? [1080, 1920] : [1920, 1080];
const OUT = opt('--out', `out/${FRAME}`);
const ONLY = opt('--only') ? opt('--only').split(',') : null;
const WINDOW = opt('--window') ? opt('--window').split(',').map(Number) : null;
const FPS = 30; // scene cuts are quantised to the render frame grid

const lyrics = Object.fromEntries(readJson('song/lyrics.json').map(line => [line.id, line]));
const timing = readJson('song/timing.json');
const scenes = readJson('scenes.json');
const beats = readJson('song/beats.json');

// ---------- when every scene starts and how long it runs ----------
// A scene begins one frame before the frame that holds its first sung word, so the cut always lands on the word. A
// scene with no sung lines carries its own "start" (song seconds). The last scene runs to the end of the song.
for (const [i, scene] of scenes.entries()) {
  for (const id of scene.lines || []) {
    if (!lyrics[id]) die(`${scene.id}: line ${id} is not in song/lyrics.json`);
    if (!timing.lines[id]) die(`${scene.id}: line ${id} has no timing`);
  }
  if (scene.start == null && !(scene.lines || []).length) die(`${scene.id} has no sung lines and no "start" in scenes.json`);
  const fromGrid = scene.start == null ? null : r4(Math.round(scene.start * FPS) / FPS);
  const fromLine = scene.lines?.length ? r4(Math.max(0, Math.floor(timing.lines[scene.lines[0]].t * FPS) - 1) / FPS) : null;
  scene.start = i === 0 ? 0 : fromGrid ?? fromLine;
  if (i && scene.start <= scenes[i - 1].start) die(`${scene.id} starts at ${scene.start}, not after ${scenes[i - 1].id}`);
}
for (const [i, scene] of scenes.entries()) scene.dur = r4((scenes[i + 1]?.start ?? timing.duration) - scene.start);
const beatsWithin = (list, scene) => list.filter(b => b >= scene.start - 1e-6 && b < scene.start + scene.dur - 1e-6).map(b => r3(b - scene.start));
const offset = WINDOW ? WINDOW[0] : 0;

const FILM = {
  duration: timing.duration,
  offset,
  song: { beats: beats.beats, downbeats: beats.downbeats },
  order: scenes.map(scene => [scene.id, scene.start]),
  scenes: {},
};
for (const scene of scenes) {
  const rel = t => r3(t - scene.start);
  FILM.scenes[scene.id] = {
    start: scene.start,
    dur: scene.dur,
    beats: beatsWithin(beats.beats, scene),
    downbeats: beatsWithin(beats.downbeats, scene),
    lines: (scene.lines || []).map(id => {
      const line = lyrics[id], at = timing.lines[id];
      return {
        id, text: line.text, en: line.en, lang: line.lang || 'en', t: rel(at.t), end: rel(at.end),
        words: at.words.map(word => ({ w: word.w, t: rel(word.t), end: rel(word.end) })),
      };
    }),
  };
}
if (fs.existsSync('song/levels.json')) {
  for (const [id, levels] of Object.entries(readJson('song/levels.json'))) if (FILM.scenes[id]) FILM.scenes[id].levels = levels;
}

// ---------- which scenes this build contains ----------
let picked = scenes.filter(scene => fs.existsSync(`compositions/${FRAME}/${scene.id}.html`));
if (ONLY) picked = picked.filter(scene => ONLY.includes(scene.id));
if (WINDOW) picked = picked.filter(scene => scene.start + scene.dur > WINDOW[0] + 0.01 && scene.start < WINDOW[1] - 0.01);
if (!picked.length) die(`no scenes to build (looked in compositions/${FRAME}/)`);
let cursor = 0;
const placed = picked.map(scene => {
  const at = ONLY ? cursor : WINDOW ? scene.start - WINDOW[0] : scene.start;
  cursor += scene.dur;
  return { ...scene, at: r4(at) };
});
// a window build keeps the window's own length so the player's end lands there; a --only build is as long as its scenes
const span = r4(ONLY ? cursor : WINDOW ? WINDOW[1] - WINDOW[0] : timing.duration);

const useChrome = has('--no-chrome') ? false : has('--chrome') || !ONLY;
const chromeFile = `compositions/${FRAME}/chrome.html`;
if (useChrome && !fs.existsSync(chromeFile)) die(`${chromeFile} is missing (pass --no-chrome to build without it)`);

const sources = placed.map(scene => fs.readFileSync(`compositions/${FRAME}/${scene.id}.html`, 'utf8'))
  .concat(useChrome ? [fs.readFileSync(chromeFile, 'utf8')] : []);

// ---------- the art the scenes name, and the faces they ask for ----------
const artNames = new Set();
for (const [i, source] of sources.entries()) {
  for (const m of source.matchAll(/(?:placeArt|K\.shot)\([^,]+,\s*['"]([^'"]+)['"]/g)) artNames.add(m[1]);
  for (const name of placed[i]?.art || []) artNames.add(name);
}
for (const name of artNames) if (!fs.existsSync(`art/${name}.js`)) die(`art/${name}.js is missing (named by a scene)`);

const GENERIC = /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|inherit|initial|emoji)$/i;
const families = new Set();
for (const source of sources) {
  for (const m of source.matchAll(/(?:--k-font-[a-z]+|font-family)\s*:\s*([^;}]+)/g)) {
    for (const face of m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)) {
      if (!GENERIC.test(face) && !face.startsWith('var(')) families.add(face);
    }
  }
}

// ---------- write the project ----------
// copies, not links: the checkers and the renderer visit these files directly
fs.rmSync(OUT, { recursive: true, force: true });
for (const dir of [`compositions/${FRAME}`, 'art', 'assets']) {
  if (fs.existsSync(dir)) fs.cpSync(dir, `${OUT}/${dir}`, { recursive: true, filter: p => !/[\\/]assets[\\/]song\.wav$/.test(p) });
}
const withAudio = !has('--mute') && !ONLY;
if (withAudio) {
  fs.mkdirSync(`${OUT}/assets`, { recursive: true });
  fs.copyFileSync('song/song.wav', `${OUT}/assets/song.wav`);
}
FILM.span = span;
fs.writeFileSync(`${OUT}/timing.js`, `window.FILM = ${JSON.stringify(FILM)};\n`);

const lookId = opt('--look');
let lookTags = '';
if (lookId) {
  const look = readJson('looks.json').looks.find(l => l.id === lookId) || die(`no look ${lookId} in looks.json`);
  if (look.k) {
    const rule = Object.entries(look.k).map(([name, value]) => `--k-${name}:${value}!important`).join(';');
    lookTags = `<style>[data-composition-id],[data-composition-id] *{${rule}}</style>\n<script>reinkArt(${JSON.stringify(look.inks)});</script>\n`;
  }
}
const inline = file => fs.existsSync(file) ? `<style>\n${fs.readFileSync(file, 'utf8').trim()}\n</style>\n` : '';
const askForFaces = `<script>(function(){var want=${JSON.stringify([...families].map(f => f.toLowerCase()))};document.fonts.forEach(function(f){if(want.indexOf(f.family.replace(/^["']|["']$/g,'').toLowerCase())>=0)f.load();});})();</script>\n`;

fs.writeFileSync(`${OUT}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
${inline('assets/fonts.css')}${askForFaces}${inline('assets/kit.css')}<script src="timing.js"></script>
<script src="art/art.js"></script>
<script src="assets/kit.js"></script>
${[...artNames].map(name => `<script src="art/${name}.js"></script>\n`).join('')}${lookTags}<style>html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; } #root { position: relative; width: 100%; height: 100%; overflow: hidden; } #chrome { z-index: 5; pointer-events: none; }</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${span}" data-width="${W}" data-height="${H}">
${withAudio ? `<audio id="song" class="clip" data-timeline-role="music" data-start="0" data-duration="${span}"${WINDOW ? ` data-media-start="${WINDOW[0]}"` : ''} data-track-index="0" src="assets/song.wav"></audio>\n` : ''}${placed.map(scene => `<div id="${scene.id}" data-composition-id="${scene.id}" data-composition-src="compositions/${FRAME}/${scene.id}.html" data-start="${scene.at}" data-duration="${scene.dur}" data-track-index="1" data-width="${W}" data-height="${H}" style="position:absolute;inset:0;z-index:1"></div>`).join('\n')}
${useChrome ? `<div id="chrome" data-composition-id="chrome" data-composition-src="${chromeFile}" data-start="0" data-duration="${span}" data-track-index="2" data-width="${W}" data-height="${H}" style="position:absolute;inset:0"></div>\n` : ''}</div>
<script>window.__timelines = window.__timelines || {};
window.__timelines["main"] = gsap.timeline({ paused: true });</script>
</body>
</html>
`);
console.log(`built ${OUT}: ${placed.length} scenes, ${span} s, art ${artNames.size}, fonts ${families.size}${useChrome ? ', chrome' : ''}${withAudio ? ', with audio' : ''}${lookId ? ', look ' + lookId : ''}`);
