// dev.mjs: run the Lossless page the way it ships: as a Next.js app. Builds whatever is missing first (the scenes, the
// fonts, the live windows), copies the static pieces into public/lossless, then boots `next dev`.
//   npm run dev                 -> http://localhost:5173/lossless
//   npm run dev -- --rebuild    -> rebuild the live windows even if they exist
//   npm run dev -- --port 4000  -> another port
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { prepare } from './prepare-preview.mjs';

const argv = process.argv.slice(2);
const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
const run = (label, cmd) => { console.log(`\n> ${label}`); execSync(cmd, { stdio: 'inherit' }); };

if (!fs.existsSync('compositions/wide/s01.html')) run('scenes: scenes-src -> compositions', 'node tools/gen-scenes.mjs');
if (!fs.existsSync('assets/fonts.css')) run('fonts: self-hosting every look\'s fonts', 'node tools/fetch-fonts.mjs');
if (argv.includes('--rebuild') || !fs.existsSync('site/film/live.json')) run('site: building the live windows (a minute or two)', 'node tools/site.mjs');
console.log(`\n> public/lossless: ${prepare()} pieces copied (player, styles, portrait, live windows)`);

const port = +(arg('--port') || 3001);
console.log(`\nLossless is a Next.js app now: http://localhost:${port}/lossless\n`);
const child = spawn(process.execPath, [path.resolve('node_modules/next/dist/bin/next'), 'dev', '-p', String(port)], { stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 0));
