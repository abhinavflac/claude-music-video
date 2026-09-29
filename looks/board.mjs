// board.mjs: write the look board page (scenes, their Katagami looks, thumbnails) for approval.
//   node looks/board.mjs <outdir>     (thumbnails are expected in <outdir>/thumbs/)
import fs from 'node:fs';
const outdir = process.argv[2];
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const scenes = read('scenes.json'), lyrics = Object.fromEntries(read('song/lyrics.json').map(l => [l.id, l]));
const timing = read('song/timing.json'), picks = Object.fromEntries(read('looks/picks.json').map(p => [p.scene, p]));
const restyle = read('looks/restyle.json');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FPS = 30;
scenes.forEach((s, i) => { s.at = i === 0 ? 0 : s.start != null ? Math.round(s.start * FPS) / FPS : Math.max(0, Math.floor(timing.lines[s.lines[0]].t * FPS) - 1) / FPS; });
const tc = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const thumb = p => `thumbs/${p.slug}-${p.id.slice(-6)}.jpg`;
const counts = scenes.reduce((a, s) => (a[s.mode] = (a[s.mode] || 0) + 1, a), {});

const panel = s => {
  const p = picks[s.id], lyric = s.lines.map(id => lyrics[id].text).join(' / ');
  const refs = (s.refs || []).map(r => r.replace(/^refs\//, '').replace(/\.png$/, ''));
  return `<article class="koma" data-mode="${s.mode}">
  <header class="koma-head"><span class="tc">${tc(s.at)}</span><span class="sid">${s.id}</span><span class="mode mode-${s.mode}">${s.mode}</span></header>
  <p class="lyric${lyric ? '' : ' inst'}">${lyric ? esc(lyric) : 'instrumental'}</p>
  <p class="idea">${esc(s.idea)}</p>
  <a class="look" href="${p.url}" target="_blank" rel="noopener">
    <img src="${thumb(p)}" alt="${esc(p.name)} design language on katagami.ai" loading="lazy" width="520" height="325">
    <span class="look-name">${esc(p.name)}<span class="arrow" aria-hidden="true">↗</span></span>
  </a>
  <p class="why">${esc(p.why)}</p>
  ${s.art_style ? `<p class="art"><span class="k">art</span> Plainclothes <span class="k">refs</span> ${refs.map(esc).join(', ')}</p>` : ''}
</article>`;
};

const gallery = [1, 2, 3, 4, 5, 6, 7].map(i => `<img src="thumbs/plainclothes-g${i}.jpg" alt="Plainclothes gallery image ${i}" loading="lazy">`).join('');
const restyleCards = restyle.map(r => `<a class="rs" href="${r.url}" target="_blank" rel="noopener"><img src="thumbs/${r.slug}-${r.id.slice(-6)}.jpg" alt="${esc(r.name)} on katagami.ai" loading="lazy"><span>${esc(r.name)}<span class="arrow" aria-hidden="true">↗</span></span><small>${esc(r.tags.slice(0, 3).join(' · '))}</small></a>`).join('');

const html = `<title>Lossless Look Board</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Kode+Mono:wght@400;600&family=Noto+Sans:wght@400;600;700&display=swap">
<style>
:root {
  color-scheme: dark;
  --gutter: #0A0A0B; --text: #EDEAE2; --muted: #8A8A82; --line: #26262A;
  --paper: #F4F2EC; --ink: #0A0A0B; --ink-soft: #4A4A45;
  --signal: #7CFF9A; --on-signal: #06140A; --amber: #C9A24B;
  --display: 'Anton', 'Impact', 'Arial Narrow', sans-serif;
  --body: 'Noto Sans', system-ui, sans-serif;
  --mono: 'Kode Mono', ui-monospace, 'Consolas', monospace;
}
* { box-sizing: border-box; }
body { background: var(--gutter); color: var(--text); font: 15px/1.5 var(--body); }
.wrap { max-width: 1320px; margin: 0 auto; padding-inline: 20px; padding-block: 28px 64px; display: grid; gap: 36px; }
a { color: inherit; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--signal); outline-offset: 3px; }
.mast { display: grid; gap: 10px; border-bottom: 1px solid var(--line); padding-bottom: 24px; }
.eyebrow { font: 600 12px/1 var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
h1 { font: 400 clamp(64px, 11vw, 148px)/0.86 var(--display); letter-spacing: -0.035em; text-transform: uppercase; margin: 0 0 8px; }
h1 .less { display: inline-block; line-height: 0.86; background: var(--signal); color: var(--on-signal); padding: 0.03em 0.06em 0; }
.lede { max-width: 68ch; color: var(--text); margin: 4px 0 0; text-wrap: pretty; }
.status { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.pill { font: 600 12px/1 var(--mono); letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid var(--line); padding: 7px 10px; color: var(--muted); }
.pill.done { color: var(--signal); border-color: color-mix(in srgb, var(--signal) 45%, var(--line)); }
.pill.wait { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
h2 { font: 400 clamp(30px, 4vw, 44px)/1 var(--display); text-transform: uppercase; letter-spacing: -0.02em; margin: 0; text-wrap: balance; }
.sec { display: grid; gap: 16px; }
.sec-intro { color: var(--muted); max-width: 70ch; margin: 0; }
.base { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; align-items: start; }
.card { background: var(--paper); color: var(--ink); padding: 18px; display: grid; gap: 10px; align-content: start; }
.card h3 { font: 400 28px/1 var(--display); text-transform: uppercase; margin: 0; }
.card p { margin: 0; color: var(--ink-soft); font-size: 14px; }
.card .kind { font: 600 11px/1 var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-soft); }
.card img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; background: #d9d6ce; }
.strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.strip img { aspect-ratio: 1; object-fit: cover; width: 100%; display: block; }
.swatches { display: flex; gap: 6px; flex-wrap: wrap; }
.sw { display: grid; gap: 4px; font: 11px/1.2 var(--mono); color: var(--ink-soft); }
.sw i { display: block; width: 58px; height: 34px; border: 1px solid #c9c5bb; }
.filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.filters button { font: 600 12px/1 var(--mono); letter-spacing: 0.1em; text-transform: uppercase; background: transparent; color: var(--text); border: 1px solid var(--line); padding: 9px 12px; cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--text); color: var(--gutter); border-color: var(--text); }
.filters button span { color: var(--muted); margin-left: 6px; }
.filters button[aria-pressed="true"] span { color: var(--ink-soft); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 12px; }
.koma { background: var(--paper); color: var(--ink); padding: 14px; display: grid; gap: 8px; align-content: start; }
.koma-head { display: flex; align-items: center; gap: 8px; font: 600 12px/1 var(--mono); letter-spacing: 0.06em; }
.tc { color: var(--ink-soft); font-variant-numeric: tabular-nums; }
.sid { color: var(--ink); }
.mode { margin-left: auto; text-transform: uppercase; letter-spacing: 0.14em; font-size: 10.5px; padding: 5px 7px; border: 1px solid var(--ink); }
.mode-manga { background: var(--ink); color: var(--paper); }
.mode-terminal { background: var(--signal); color: var(--on-signal); border-color: var(--on-signal); }
.mode-pop { background: var(--amber); color: var(--ink); border-color: var(--ink); }
.lyric { font: 700 17px/1.3 var(--body); margin: 2px 0 0; text-wrap: balance; }
.lyric.inst { font: 400 13px/1.3 var(--mono); color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.12em; }
.idea { font-size: 13px; line-height: 1.45; color: var(--ink-soft); margin: 0; }
.look { display: grid; gap: 8px; text-decoration: none; margin-top: 4px; }
.look img { width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; display: block; background: #d9d6ce; }
.look-name { font: 400 24px/1 var(--display); text-transform: uppercase; letter-spacing: -0.01em; }
.arrow { font: 600 14px/1 var(--mono); margin-left: 6px; vertical-align: 4px; }
.look:hover .look-name { text-decoration: underline; text-decoration-thickness: 2px; }
.why { margin: 0; font-size: 13px; color: var(--ink); }
.art { margin: 0; font: 12px/1.4 var(--mono); color: var(--ink-soft); border-top: 1px dashed #bdb8ad; padding-top: 8px; }
.art .k { text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink); margin-right: 4px; }
.art .k + .k, .art .k:not(:first-child) { margin-left: 8px; }
.rsgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.rs { background: var(--paper); color: var(--ink); padding: 10px; display: grid; gap: 6px; text-decoration: none; }
.rs img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; }
.rs span { font: 400 20px/1 var(--display); text-transform: uppercase; }
.rs small { font: 11px/1.3 var(--mono); color: var(--ink-soft); }
.foot { border-top: 1px solid var(--line); padding-top: 20px; color: var(--muted); font-size: 13px; display: grid; gap: 6px; }
.foot code { font-family: var(--mono); color: var(--text); }
@media (max-width: 520px) { .strip { grid-template-columns: repeat(4, 1fr); } .strip img:nth-child(n+5) { display: none; } }
@media (prefers-reduced-motion: no-preference) { .look img { transition: filter 160ms cubic-bezier(0.2, 0, 0, 1); } .look:hover img { filter: contrast(1.06); } }
</style>
<div class="wrap">
  <header class="mast">
    <span class="eyebrow">abhinav.flac · music video · look board for approval</span>
    <h1>Loss<span class="less">less</span></h1>
    <p class="lede">Every scene of the film with the Katagami look it would be built in: 67 scenes, 67 different design languages across four modes, and one art style for every drawn frame. Tap a thumbnail to open that look on katagami.ai.</p>
    <div class="status">
      <span class="pill done">timing: forced-aligned, 62 lines</span>
      <span class="pill wait">looks: waiting for your ok</span>
      <span class="pill wait">images: refs\\PROMPTS.md, 21 to make</span>
    </div>
  </header>

  <section class="sec" aria-labelledby="base-h">
    <h2 id="base-h">The film's own look</h2>
    <p class="sec-intro">Plainclothes draws every manga frame. Tachikiri, with its Kuroban palette, carries the chrome that runs over the whole film: the encoding pill top left, the bitrate counter top right, the title and the end card.</p>
    <div class="base">
      <div class="card">
        <span class="kind">art style · all manga shots</span>
        <h3><a href="https://katagami.ai/art-styles/en-019f24b6-bc8a-7e40-9b50-15041a9d6181" target="_blank" rel="noopener">Plainclothes<span class="arrow" aria-hidden="true">↗</span></a></h3>
        <div class="strip">${gallery}</div>
        <p>Two inks only, bone-white paper and matte black, with every tone built from halftone dots. The references get traced into flat plates, and the dot screens are redrawn in code, so the art restyles with each look.</p>
      </div>
      <div class="card">
        <span class="kind">design language · chrome, title, end card</span>
        <h3><a href="https://katagami.ai/language/en-019ef820-29bb-7941-9720-bb01d0378e82" target="_blank" rel="noopener">Tachikiri<span class="arrow" aria-hidden="true">↗</span></a></h3>
        <img src="thumbs/tachikiri-${picks.s67.id.slice(-6)}.jpg" alt="Tachikiri design language" loading="lazy">
        <p>Koma panels on black gutters and a single phosphor signal. Anton for display, Noto Sans for body, Kode Mono for readouts.</p>
      </div>
      <div class="card">
        <span class="kind">palette · Kuroban</span>
        <h3><a href="https://katagami.ai/palettes/en-019ef820-09f9-7950-9eb5-8383057d86ce" target="_blank" rel="noopener">Kuroban<span class="arrow" aria-hidden="true">↗</span></a></h3>
        <div class="swatches">
          <span class="sw"><i style="background:#070708"></i>ink<br>#070708</span>
          <span class="sw"><i style="background:#F4F2EC"></i>paper<br>#F4F2EC</span>
          <span class="sw"><i style="background:#7CFF9A"></i>phosphor<br>#7CFF9A</span>
          <span class="sw"><i style="background:#8A8A82"></i>muted<br>#8A8A82</span>
        </div>
        <p>The counter climbs 128 kbps, 320, 1411, then FLAC 24/96. It reads offline through the account-suspension verse and buffering at the hard stop. The pill fills with the song and ends on "encoded. 0 bits lost."</p>
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="scenes-h">
    <h2 id="scenes-h">Scene by scene</h2>
    <p class="sec-intro">In film order. Every lyric sits inside a fake UI in that scene's language, and manga scenes put it in a small UI element over the drawing. Timecodes are where each scene cuts in.</p>
    <div class="filters" role="group" aria-label="Filter scenes by mode">
      <button type="button" data-f="all" aria-pressed="true">all<span>${scenes.length}</span></button>
      <button type="button" data-f="manga" aria-pressed="false">manga<span>${counts.manga}</span></button>
      <button type="button" data-f="ui" aria-pressed="false">ui<span>${counts.ui}</span></button>
      <button type="button" data-f="terminal" aria-pressed="false">terminal<span>${counts.terminal}</span></button>
      <button type="button" data-f="pop" aria-pressed="false">pop<span>${counts.pop}</span></button>
    </div>
    <div class="grid" id="grid">
${scenes.map(panel).join('\n')}
    </div>
  </section>

  <section class="sec" aria-labelledby="rs-h">
    <h2 id="rs-h">Tap-to-restyle looks</h2>
    <p class="sec-intro">The whole-film looks on the page at abhinavflac.dev/lossless, in tap order. Each tap cycles the film through them and back to the original. Every one passed a contrast audit of every text element in every scene, in both frames.</p>
    <div class="rsgrid">${restyleCards}</div>
  </section>

  <footer class="foot">
    <span>Approved. Kunpu and Dither were swapped for Ringback and Lantern in the restyle set.</span>
    <span>Looks from katagami.ai.</span>
  </footer>
</div>
<script>
(() => {
  const btns = [...document.querySelectorAll('.filters button')], komas = [...document.querySelectorAll('.koma')];
  btns.forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.f;
    btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    komas.forEach(k => { k.hidden = f !== 'all' && k.dataset.mode !== f; });
  }));
})();
</script>
`;
fs.writeFileSync(`${outdir}/lossless-looks.html`, html);
console.log('wrote', `${outdir}/lossless-looks.html`, Math.round(html.length / 1024) + ' KB');
