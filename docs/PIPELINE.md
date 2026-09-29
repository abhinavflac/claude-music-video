# Pipeline

How the film and the live page are made, end to end. Run everything from the project root.

## What you need

- Node 20+ and npm.
- Python 3.12 with `numpy pillow scipy` (alignment review, tracing) in a venv.
- FFmpeg and potrace.
- A Chromium browser for the frame checks (the tests drive Edge or Chrome).
- Keys, kept in the environment: ElevenLabs or FAL for the forced alignment, an image model for the reference art,
  a music model (e.g. Suno) for the song.

## 1. Song and lyrics

- `song/song.wav` is the final take (48 kHz). `song/lyrics.json` lists every line twice: `text` for the screen and
  `sung` for the singer and the aligner (numbers spelled, punctuation dropped).
- `song/beats.json` holds the beat and downbeat grid (90.99 BPM, G minor for this film) from a tempo/beat pass.

## 2. Timing

Captions must never lead the voice: a scene cut may come one frame early, a word may not.

1. Isolate the vocal stem into `song/vocals.wav` (same length as the song; e.g. demucs).
2. Force-align the lyrics on the **stem**, never the mix, and never with a phrase transcriber (after a pause they
   start a line where the previous word ended, 0.2-1.5 s early).
3. Check every flagged start on a spectrogram of the stem (`tools/specview.py`), compare with the draft
   (`song/timing-draft.json`), and record every hand fix with its reason in `song/timing-fixes.json`.
4. Rebuild the timing: `node tools/rebuild-timing.mjs --sections align/sections-lines.json --fixes song/timing-fixes.json`.

The full account for this film is in `song/NOTES.md`.

## 3. Scene plan

`scenes.json` holds one scene per lyric line: the id, the line, a one-sentence idea, a mode (manga / ui / terminal /
pop) and a Katagami design language slug. Two or three modes for the whole film: a new look every line reads as
noise. `looks/pick.mjs` resolves the slugs to catalog entries and `looks/board.mjs` renders the look board for
approval.

## 4. A scene

`scenes-src/sNN.html` is one scene for both frames: a `<scene look>` tag, an optional `<tokens>` line, per-frame
`<style>` and `<body>` blocks, and one `<script>` that builds a paused GSAP timeline and registers it as
`window.__timelines['sNN']`. Scenes use the helpers in `assets/kit.js` (`K.words`, `K.reveal`, `K.fit`, `K.slabIn`,
`K.shot`, `K.drive`, …) and obey four rules:

- No scene hard-codes a colour, font, radius or shadow: everything reads the `--k-*` tokens (15 of them, declared
  by the look in `looks/k.json`). One token swap restyles the whole scene.
- Deterministic: seeded `K.rng`, no clock reads, finite repeats, no CSS animation, because the renderer seeks frames out of
  order, in parallel chunks.
- Every on-screen word is live type; raster art never ships (references are traced into vectors).
- The vertical frame is composed natively, not cropped from the wide one.

`npm run scenes` expands the sources into `compositions/{wide,vert}/`.

## 5. Art

1. Generate a reference per shot in the Plainclothes two-ink style (`refs/PROMPTS.md` is the exact prompt list).
2. `tools/trace.py` blurs the reference to melt its halftone, quantises it into tones and traces it with potrace into
   an SVG tone plate per layer (`art/*.js`).
3. `art/art.js` places the plates, prints the middle tones as SVG screentone, and re-inks every plate from a look's
   ramp (`reinkArt`), so the same drawing survives every restyle. `window.__flatInks` prints flat mixes on slow
   devices instead of the dot screens.

## 6. Build, render, encode

```sh
npm run scenes                  # scenes-src/ -> compositions/{wide,vert}/
npm run build:wide              # -> out/wide (a HyperFrames project)
npm run render:wide             # chunked render + the song -> renders/wide.mp4
npm run build:vert && npm run render:vert
npm run encode                  # renders/web-*.mp4, posters and master copies
```

`node tools/batch.mjs NAME s01,s02` builds, checks and contact-sheets a few scenes in both frames while you work.

## 7. Checks

- `npx hyperframes check` on a build; `node tools/contrast.mjs out/wide` for every visible text element in every
  scene; `node tools/fromto-lint.mjs` for animation hygiene.
- `npm run site` then `npm run test:site` drives the page end to end (desktop and phone).
- `npm run audit:looks` overlays every restyle look on every live window and reports any text that collides; the
  page's own lyric fit then holds each block to the height it was drawn at.

## 8. The live page

`site/index.html` plays the rendered MP4 (the clock and the sound) and, on a tap, lays the same scenes over it live
in another Katagami design language. `npm run site` rebuilds `site/film/` (the live windows, cut at scene cuts, plus
the shared compositions, art and self-hosted fonts) and copies `looks.json` in. The films and posters stream from
`assets.abhinavflac.dev/lossless/`, they are too large for git. The window mechanism, tokens, inks, fallbacks
and switches are documented in [DEPLOY.md](DEPLOY.md).
