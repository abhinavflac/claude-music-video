// rebuild-timing.mjs: fold forced-alignment results (with hand fixes) into song/timing.json and song/labels.txt.
//   node tools/rebuild-timing.mjs [--sections align/sections.json] [--fixes file] [--duration seconds]
// Run it from the project root. It reads song/lyrics.json and the aligner result files that --sections names
// (default: align/song.json holding every line, in order). A result file is ElevenLabs-shaped, { words: [{ text,
// start, end, loss }] }, optionally wrapped in { result }, and its lines are split at the entries whose text holds a
// newline (or, when there are no line breaks, by each line's sung-word count).
//
// sections.json is [{ "file", "shift", "ids" }]: the ids that file explains, in order, where "~id" marks a context
// line that was aligned and is then dropped, and song seconds = aligned seconds + shift. Several sections may share
// one file and take its lines in the order listed. Fixes are keyed by line id and sung-word index, in song seconds:
// { "<id>": { "why": "...", "words": { "<index>": [start, end] } } }.
//
// A line's screen words (lyrics.json "text") can differ from the words that were sung ("sung"): the sung words carry
// the timing, and the screen words take theirs: one-to-one when the counts match, by an explicit "map" of counts when
// a line sets one, otherwise spread across the sung words by letter count. Lines never overlap: each one ends by the
// time the next begins, and every word stays inside its line.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const die = why => { console.error('rebuild-timing: ' + why); process.exit(1); };
const readJson = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { die(`cannot read ${file}: ${e.message}`); } };
const r3 = n => +n.toFixed(3);

const lyrics = readJson('song/lyrics.json');
const byId = new Map(lyrics.map(line => [line.id, line]));
const lineOf = id => byId.get(id.replace(/^~/, '')) || die(`${id} is not in song/lyrics.json`);

const sections = opt('--sections') ? readJson(opt('--sections')) : [{ file: 'align/song.json', shift: 0, ids: lyrics.map(l => l.id) }];
const fixesFile = opt('--fixes') ?? (fs.existsSync('song/timing-fixes.json') ? 'song/timing-fixes.json' : null);
const fixes = fixesFile ? readJson(fixesFile) : {};

let duration = opt('--duration');
if (duration == null) {
  try {
    duration = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'song/song.wav']).toString();
  } catch {
    die('no --duration, and ffprobe could not read song/song.wav');
  }
}
duration = r3(+duration);

// ---------- what the aligner heard versus what the screen shows ----------
// the aligner was given the sung spelling: parentheses are stage directions, not words
const sungWords = line => (line.sung ?? line.text).replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
// Japanese and Chinese are captioned one character per word (an opening bracket rides the next character, trailing
// punctuation stays on the character before it); everything else splits on spaces
function screenWords(line) {
  if (!/^(ja|zh)/.test(line.lang || '')) return line.text.split(/\s+/).filter(Boolean);
  const words = [];
  let opening = '';
  for (const ch of line.text.replace(/\s+/g, '')) {
    if (/[\p{Ps}\p{Pi}]/u.test(ch)) opening += ch;
    else if (/\p{P}/u.test(ch) && words.length) words[words.length - 1] += ch;
    else { words.push(opening + ch); opening = ''; }
  }
  return words;
}

// ---------- group each result file's words into the lines its sections claim ----------
const perFile = new Map();
for (const section of sections) {
  section.ids.forEach(lineOf);
  if (!perFile.has(section.file)) perFile.set(section.file, { ids: [], next: 0 });
  perFile.get(section.file).ids.push(...section.ids);
}
for (const [file, claim] of perFile) {
  const raw = readJson(file);
  const words = (raw.result ?? raw).words;
  if (!Array.isArray(words)) die(`${file} has no words array`);
  const groups = [[]];
  for (const word of words) {
    if (word.text.includes('\n')) groups.push([]);
    else if (word.text.trim()) groups[groups.length - 1].push(word);
  }
  while (groups.length > 1 && !groups[groups.length - 1].length) groups.pop();
  if (groups.length === claim.ids.length) { claim.lines = groups; continue; }
  // the aligner's own line breaks disagree with the claim: split its flat words by each line's sung-word count
  const flat = groups.flat();
  const counts = claim.ids.map(id => sungWords(lineOf(id)).length);
  const total = counts.reduce((a, b) => a + b, 0);
  if (flat.length !== total) die(`${file}: ${groups.length} lines and ${flat.length} words, but its ids have ${claim.ids.length} lines and ${total} sung words`);
  console.warn(`${file}: ${groups.length - 1} line breaks for ${claim.ids.length} lines; split by each line's sung word count`);
  let k = 0;
  claim.lines = counts.map(n => flat.slice(k, k += n));
}

const aligned = {};
for (const section of sections) {
  for (const id of section.ids) {
    const tokens = perFile.get(section.file).lines[perFile.get(section.file).next++];
    if (id.startsWith('~')) continue; // a context line: aligned, then dropped
    if (aligned[id]) die(`${id} is in two sections`);
    aligned[id] = tokens.map(word => ({ text: word.text, start: word.start + section.shift, end: word.end + section.shift, loss: word.loss ?? 0 }));
  }
}
for (const line of lyrics) if (!aligned[line.id]?.length) die(`no aligned words for ${line.id}`);

// ---------- hand fixes, by sung-word index ----------
for (const [id, fix] of Object.entries(fixes)) {
  if (!aligned[id]) die(`fix for unknown line ${id}`);
  for (const [k, [start, end]] of Object.entries(fix.words || {})) {
    if (!aligned[id][+k]) die(`fix ${id}: no sung word ${k}`);
    Object.assign(aligned[id][+k], { start, end, fixed: true });
  }
}

// ---------- screen words take their timing from the sung words ----------
// the time at a fractional sung-word position (0..N), reading the fraction across the word it lands in
const timeAt = (tokens, x) => {
  const i = Math.min(tokens.length - 1, Math.floor(x));
  const word = tokens[i];
  return word.start + Math.min(1, x - i) * (word.end - word.start);
};
const glyphs = word => Math.max(1, (word.match(/[\p{L}\p{N}]/gu) || []).length);

const out = { duration, lines: {} };
const report = [];
for (const line of lyrics) {
  const tokens = aligned[line.id];
  const screen = screenWords(line);
  const flags = [];
  let words;
  if (screen.length === tokens.length || line.map) {
    const counts = screen.length === tokens.length ? screen.map(() => 1) : line.map;
    if (counts.length !== screen.length || counts.some(n => !Number.isInteger(n) || n < 1) || counts.reduce((a, b) => a + b, 0) !== tokens.length) {
      die(`${line.id}: "map" needs ${screen.length} entries of 1 or more that add up to ${tokens.length} sung words (${tokens.map(t => t.text).join(' ')})`);
    }
    let k = 0;
    words = screen.map((word, i) => {
      const first = tokens[k];
      const last = tokens[(k += counts[i]) - 1];
      return { w: word, t: first.start, end: last.end };
    });
  } else {
    // no map: spread the screen words across the sung words in proportion to their letter counts
    const weights = screen.map(glyphs);
    const sum = weights.reduce((a, b) => a + b, 0);
    const N = tokens.length;
    let done = 0;
    words = screen.map((word, i) => {
      const from = done / sum * N;
      done += weights[i];
      return { w: word, t: timeAt(tokens, from), end: timeAt(tokens, done / sum * N) };
    });
    flags.push('mapped by length');
  }
  for (let k = 1; k < words.length; k++) {
    words[k].t = Math.max(words[k].t, words[k - 1].t);
    words[k - 1].end = Math.min(words[k - 1].end, words[k].t);
  }
  out.lines[line.id] = { t: tokens[0].start, end: tokens[tokens.length - 1].end, words };

  const losses = tokens.map(t => t.loss);
  const worst = Math.max(...losses);
  if (worst >= 3) flags.push('loss ' + tokens.filter(t => t.loss >= 3).map(t => t.text).join(' '));
  if (tokens.some(t => t.end - t.start < 0.02)) flags.push('squeezed ' + tokens.filter(t => t.end - t.start < 0.02).map(t => t.text).join(' '));
  report.push([line.id, losses.reduce((a, b) => a + b, 0) / losses.length, worst, flags, tokens.some(t => t.fixed)]);
}

// ---------- a line ends by the time the next one starts, and every word is rounded once ----------
lyrics.forEach((line, i) => {
  const current = out.lines[line.id];
  const next = lyrics[i + 1] && out.lines[lyrics[i + 1].id];
  if (next && next.t < current.t) die(`${lyrics[i + 1].id} starts before ${line.id}: check both lines and add a fix`);
  if (next && current.end > next.t) {
    current.end = next.t;
    for (const word of current.words) { word.t = Math.min(word.t, next.t); word.end = Math.min(word.end, next.t); }
  }
  Object.assign(current, { t: r3(current.t), end: r3(current.end), words: current.words.map(w => ({ w: w.w, t: r3(w.t), end: r3(w.end) })) });
});

fs.writeFileSync('song/timing.json', JSON.stringify(out, null, 1) + '\n');
fs.writeFileSync('song/labels.txt', lyrics.map(line => `${out.lines[line.id].t}\t${out.lines[line.id].end}\t${line.id}`).join('\n') + '\n');
for (const [id, mean, worst, flags, fixed] of report) {
  const line = out.lines[id];
  console.log(`${id.padEnd(8)} ${line.t.toFixed(2).padStart(7)} ${(line.end - line.t).toFixed(2).padStart(5)}s  loss ${mean.toFixed(2)} max ${worst.toFixed(2)}${fixed ? '  (fixed)' : ''}${flags.length ? '  CHECK ' + flags.join('; ') : ''}`);
}
console.log(`wrote song/timing.json and song/labels.txt: ${lyrics.length} lines, ${duration} s`);
