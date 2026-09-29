# Lossless: the live restyle page

`site/` is a static folder served at `abhinavflac.dev/lossless`, built from the public repo
`github.com/abhinavflac/claude-music-video` and assembled by the private folio site (`github.com/abhinavflac/folio`).

## Assets

The two films and their posters are far too large for git (over 200 MB each; GitHub refuses files over 100 MB) and
for Vercel's static hosting. They live on the asset host:

- `https://assets.abhinavflac.dev/lossless/wide.mp4`
- `https://assets.abhinavflac.dev/lossless/vert.mp4`
- `https://assets.abhinavflac.dev/lossless/poster-wide.jpg` (copied from `film/` in this repo)
- `https://assets.abhinavflac.dev/lossless/poster-vert.jpg` (copied from `film/` in this repo)

The page reads that base; `?assets=film` uses a local copy instead (`film/wide.mp4`, `film/vert.mp4`).

## Build site/

```sh
npm run fonts                   # self-host the fonts every look uses      -> assets/fonts/
npm run scenes                  # scenes-src/ -> compositions/{wide,vert}/
npm run site                    # the windows, compositions, art, fonts    -> site/film/
npm run test:site               # drive the page end to end
```

## Put it in the site (public repo + private folio, Next.js)

The public repo is the source of truth. The folio repo pulls it in as a submodule, builds the static film folder, and
renders the page through a React client component; no rewrite is needed, `/lossless` is a real route. Vercel fetches
public submodules automatically.

1. Push this folder to `github.com/abhinavflac/claude-music-video` (public).
2. In the folio repo:

```sh
git submodule add https://github.com/abhinavflac/claude-music-video.git lossless
```

3. Add `scripts/lossless.mjs` to folio (runs before `next build`; builds the submodule and copies the static pieces):

```js
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const run = c => execSync(c, { stdio: 'inherit' });
run('npm ci --prefix lossless');
run('npm run fonts --prefix lossless');
run('npm run scenes --prefix lossless');
run('npm run site --prefix lossless');
fs.rmSync('public/lossless', { recursive: true, force: true });
fs.mkdirSync('public/lossless', { recursive: true });
for (const item of ['film', 'player.js', 'page.css', 'page-fonts.css', 'profile.jpg', 'favicon.svg']) {
  fs.cpSync(`lossless/site/${item}`, `public/lossless/${item}`, { recursive: true });
}
// the posters live in the repo, not on the asset host: they ride next to the live windows
for (const poster of ['poster-wide.jpg', 'poster-vert.jpg']) {
  fs.cpSync(`lossless/film/${poster}`, `public/lossless/film/${poster}`);
}
```

4. folio's `package.json`: `"build": "node scripts/lossless.mjs && next build"`.
5. `app/lossless/page.tsx` in folio (adjust the relative path for where the submodule sits):

```tsx
import LosslessPlayer from '../../../lossless/app/lossless/LosslessPlayer';

export const metadata = { title: 'Lossless' };

export default function Page() {
  return <LosslessPlayer />;
}
```

The component renders the page markup and mounts `player.js` from `/lossless/`; page.css and page-fonts.css are linked
while it is mounted and removed when it unmounts, so other routes are untouched. The HyperFrames windows and the fonts
must stay static files under `public/lossless/` — they are iframes and they cannot be bundled.

6. Updating the film: push to the public repo, then `git submodule update --remote lossless` in folio (or let CI do it).

## What is in it

- `index.html` + `player.js` + `page.css`: the standalone page (what `npm run dev` serves and the tests drive). The page
  plays the film from the asset host with sound; a tap on the film or a chip moves to the next look and lays a live,
  muted HyperFrames window over the video in that look. `player.js` is a module: `mount({ base })` builds the player and
  returns `unmount()`; `mountLossless` is exposed on `window` for the component.
- `app/lossless/LosslessPlayer.tsx`: the same page as a React client component for the folio.
- `film/live-<frame>-NN.html` and `film/timing-live-<frame>-NN.js`: the live windows, cut at scene boundaries (6 s or
  more each).
- `film/compositions/`, `film/art/`, `film/assets/`: shared by every window.
- `film/vendor/`: the HyperFrames runtime and player (0.8.81) and GSAP 3.14.2, pinned to the versions the film was
  checked with.
- `film/live.json`, `film/looks.json`: the windows and the twelve looks.

## Switches

- `?live=0` plays the MP4 only. `?live=1` clears a remembered fallback.
- `?assets=film` plays local film files (for development with `renders/` files present).
- `?frame=wide|vert`, `?style=<id>` and `?t=<seconds>` open on a frame, a look and a moment.
- A slow device steps down to flat inks, then to the MP4 for the rest of the visit.

## Rebuild

`node tools/site.mjs` rebuilds `site/film/` from the current scenes (the films are not copied: the page streams them
from the asset host). `renders/web-wide.mp4` / `poster-wide.jpg` are still copied into `site/film/` when they exist,
so a fully offline build can point at local files.

## A scene (the build contract)

A scene is one file `scenes-src/sNN.html`: a `<scene look="slug-id6">` tag, an optional `<tokens>` line for per-scene
token tweaks, a shared `<style>`, `<style frame="wide">` and `<style frame="vert">`, a `<body frame="wide">` and
`<body frame="vert">`, and one `<script>` that builds a paused GSAP timeline and registers it as
`window.__timelines['sNN']`. Scenes read the `--k-*` tokens their look declares (`looks/k.json`), use the helpers in
`assets/kit.js`, stay deterministic (seeded `K.rng`, no clock reads, finite repeats, no CSS animation; the renderer
seeks out of order), keep every word live type, and compose the vertical frame natively. `npm run scenes` expands
them into `compositions/{wide,vert}/`; `tools/build-film.mjs` assembles those into a HyperFrames project.
