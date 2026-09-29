// site.mjs: the tap-to-restyle page as a static folder, ready to drop into the Next.js site's public/lossless.
//   node tools/site.mjs            -> site/ (index.html, film/...)
// Live windows: the film cut at scene boundaries into windows of at least 6 s, each built muted with --window and saved
// as film/live-<frame>-NN.html (+ film/timing-live-<frame>-NN.js), all sharing one copy of compositions/, art/ and
// assets/ in film/. The HyperFrames runtime, its player and GSAP are vendored in film/vendor/ at the versions the film
// was checked with. film/live.json lists the windows; film/looks.json is the looks; film/<frame>.mp4 are the web copies
// (renders/web-<frame>.mp4, copied when they exist). The page itself is site/index.html (written by hand, kept here).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// the build tools (hyperframes and gsap) are devDependencies; a production install skips them
if (!fs.existsSync('node_modules/hyperframes/dist/hyperframe.runtime.iife.js')) {
  console.error('site: hyperframes is not installed.\n  npm with NODE_ENV=production (Vercel) skips devDependencies: run `npm install --include=dev` or `npm ci --include=dev`.');
  process.exit(1);
}

const SITE = 'site', FILM = `${SITE}/film`;
fs.rmSync(FILM, { recursive: true, force: true });
fs.mkdirSync(`${FILM}/vendor`, { recursive: true });

// vendored runtime, player and GSAP (the builds load GSAP 3.14.2 from jsDelivr; the page must not)
fs.copyFileSync('node_modules/hyperframes/dist/hyperframe.runtime.iife.js', `${FILM}/vendor/hyperframe.runtime.iife.js`);
fs.copyFileSync('node_modules/hyperframes/dist/hyperframes-player.global.js', `${FILM}/vendor/hyperframes-player.global.js`);
fs.mkdirSync('out', { recursive: true });
// GSAP 3.14.2 from npm (package.json pins it); falls back to the CDN when node_modules/gsap is missing
if (fs.existsSync('node_modules/gsap/dist/gsap.min.js')) fs.copyFileSync('node_modules/gsap/dist/gsap.min.js', 'out/vendor-gsap.min.js');
else if (!fs.existsSync('out/vendor-gsap.min.js')) execSync('curl -fsSL https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js -o out/vendor-gsap.min.js');
fs.copyFileSync('out/vendor-gsap.min.js', `${FILM}/vendor/gsap.min.js`);

// shared files: every window reads the same compositions, art and assets
for (const d of ['compositions/wide', 'compositions/vert', 'art', 'assets'])
  fs.cpSync(d, `${FILM}/${d}`, { recursive: true, filter: p => !/song\.wav$/.test(p) });
fs.copyFileSync('looks.json', `${FILM}/looks.json`);
// the page's own faces (the chrome restyles with the looks): the same @font-face rules, pointed into film/assets
fs.writeFileSync(`${SITE}/page-fonts.css`, fs.readFileSync('assets/fonts.css', 'utf8').replace(/url\((['"]?)assets\//g, 'url($1film/assets/'));

const HIDE = `<style>#root > [data-composition-src][style*="visibility: hidden"], #root > [data-composition-src][style*="visibility:hidden"] { display: none !important; }</style>`;
const live = { frames: {} };
for (const frame of ['wide', 'vert']) {
  execSync(`node tools/build-film.mjs --frame ${frame} --mute --out out/site-plan-${frame}`, { stdio: 'ignore' });
  const plan = fs.readFileSync(`out/site-plan-${frame}/index.html`, 'utf8');
  const starts = [...plan.matchAll(/<div id="s\d+" data-composition-id="s\d+"[^>]*? data-start="([\d.]+)"/g)].map(m => +m[1]);
  const dur = +plan.match(/data-composition-id="main" data-start="0" data-duration="([\d.]+)"/)[1];
  const wins = []; let from = 0;
  starts.forEach((s, i) => { const end = i < starts.length - 1 ? starts[i + 1] : dur; if (end - from >= 6 || i === starts.length - 1) { wins.push([from, end]); from = end; } });
  const [W, H] = frame === 'wide' ? [1920, 1080] : [1080, 1920];
  live.frames[frame] = { w: W, h: H, duration: dur, windows: [] };
  wins.forEach(([a, b], i) => {
    const nn = String(i).padStart(2, '0'), tmp = `out/site-tmp/${frame}-${nn}`, name = `live-${frame}-${nn}.html`;
    execSync(`node tools/build-film.mjs --frame ${frame} --mute --window ${a},${b} --out ${tmp}`, { stdio: 'ignore' });
    let html = fs.readFileSync(`${tmp}/index.html`, 'utf8');
    html = html.replace('<script src="timing.js"></script>', `<script src="timing-live-${frame}-${nn}.js"></script>`)
      .replace('https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js', 'vendor/gsap.min.js')
      .replace(/<head>/, `<head>\n<script src="vendor/hyperframe.runtime.iife.js"></script>\n${HIDE}`);
    fs.writeFileSync(`${FILM}/${name}`, html);
    fs.copyFileSync(`${tmp}/timing.js`, `${FILM}/timing-live-${frame}-${nn}.js`);
    live.frames[frame].windows.push([a, b, name]);
  });
  console.log(`${frame}: ${wins.length} windows`);
  for (const f of [`web-${frame}.mp4`, `poster-${frame}.jpg`]) if (fs.existsSync(`renders/${f}`)) fs.copyFileSync(`renders/${f}`, `${FILM}/${f.replace('web-', '')}`);
}
fs.writeFileSync(`${FILM}/live.json`, JSON.stringify(live));
fs.rmSync('out/site-tmp', { recursive: true, force: true });
const du = d => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? du(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`site/: ${(du(SITE) / 1e6).toFixed(1)} MB (drop the folder's contents into public/lossless)`);
