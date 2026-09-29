// prepare-preview.mjs: copy the built static pieces of the page into public/lossless, where the Next app serves them.
//   node tools/prepare-preview.mjs
// The Next app (app/lossless) renders next/LosslessPlayer.tsx; the player, the styles, the portrait and the live windows
// are plain static files under /lossless/. Nothing here is hand-written HTML: site/ is the build output.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const PIECES = ['film', 'player.js', 'page.css', 'page-fonts.css', 'profile.jpg', 'favicon.svg'];

export function prepare() {
  fs.rmSync('public/lossless', { recursive: true, force: true });
  fs.mkdirSync('public/lossless', { recursive: true });
  for (const piece of PIECES) {
    const from = `site/${piece}`;
    if (!fs.existsSync(from)) throw new Error(`site/${piece} is missing: run npm run site first`);
    fs.cpSync(from, `public/lossless/${piece}`, { recursive: true });
  }
  // the two posters live in the repo (film/), not on the asset host: copy them in next to the live windows
  for (const poster of ['poster-wide.jpg', 'poster-vert.jpg']) {
    fs.cpSync(`film/${poster}`, `public/lossless/film/${poster}`, { force: true });
  }
  return PIECES.length + 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(`public/lossless: ${prepare()} pieces copied`);
