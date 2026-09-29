// encode.mjs: the copies made from renders/wide.mp4 and renders/vert.mp4.
//   node tools/encode.mjs [wide] [vert]
// wide -> renders/wide-master.mp4 (desktop upload master) and renders/web-wide.mp4 (the live page, 720p)
// vert -> renders/vert-phone.mp4 (phones and chat apps, two-pass ~2.7 Mbps) and renders/web-vert.mp4 (the live page)
// Both web copies are two-pass at ~1.3 Mbps so each stays under ~50 MB (static hosting limits); posters are the
// title card's frame. Every ffmpeg call has -y, so a re-run never keeps a stale file.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const want = process.argv.slice(2).length ? process.argv.slice(2) : ['wide', 'vert'];
const sh = c => execSync(c, { stdio: 'inherit' });
const nul = process.platform === 'win32' ? 'NUL' : '/dev/null';
const twoPass = (src, vf, kbps, out, audio) => {
  sh(`ffmpeg -v error -y -i ${src} ${vf} -c:v libx264 -preset slow -b:v ${kbps}k -pass 1 -passlogfile renders/.${out.replace(/\W/g, '')} -an -f mp4 ${nul}`);
  sh(`ffmpeg -v error -y -i ${src} ${vf} -c:v libx264 -preset slow -b:v ${kbps}k -maxrate ${kbps * 2}k -bufsize ${kbps * 4}k -pass 2 -passlogfile renders/.${out.replace(/\W/g, '')} -pix_fmt yuv420p -r 30 -c:a aac -b:a ${audio}k -ar 48000 -movflags +faststart renders/${out}`);
};
for (const f of want) {
  const src = `renders/${f}.mp4`;
  if (!fs.existsSync(src)) { console.log(`skip ${f}: no ${src}`); continue; }
  if (f === 'wide') sh(`ffmpeg -v error -y -i ${src} -c:v libx264 -preset medium -crf 18 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -profile:v high -r 30 -c:a aac -b:a 256k -ar 48000 -movflags +faststart renders/wide-master.mp4`);
  else twoPass(src, '', 2700, 'vert-phone.mp4', 160);
  twoPass(src, `-vf scale=${f === 'wide' ? '1280:720' : '720:1280'}:flags=lanczos`, 1300, `web-${f}.mp4`, 128);
  sh(`ffmpeg -v error -y -ss 16.4 -i ${src} -frames:v 1 -vf scale=${f === 'wide' ? '1280:720' : '720:1280'}:flags=lanczos -q:v 3 renders/poster-${f}.jpg`);
  for (const o of f === 'wide' ? ['wide-master.mp4', 'web-wide.mp4'] : ['vert-phone.mp4', 'web-vert.mp4']) {
    const d = execSync(`ffprobe -v error -show_entries format=duration,size -of csv=p=0 renders/${o}`).toString().trim().split(',');
    console.log(`renders/${o}: ${(+d[0]).toFixed(2)} s, ${(+d[1] / 1048576).toFixed(1)} MB`);
  }
}
for (const f of fs.readdirSync('renders')) if (/^\..*log/.test(f)) fs.rmSync(`renders/${f}`, { force: true });
