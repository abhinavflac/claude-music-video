// preview.mjs: boot the Next.js app for the page checks. startPreview() prepares public/lossless, starts `next dev`
// on the given port and waits until /lossless answers; returns { url, stop }.
import path from 'node:path';
import { spawn } from 'node:child_process';
import { prepare } from './prepare-preview.mjs';

export async function startPreview(port, { quiet = true } = {}) {
  prepare();
  const next = path.resolve('node_modules/next/dist/bin/next'); //  run our own install, not whatever is on PATH
  const child = spawn(process.execPath, [next, 'dev', '-p', String(port)], {
    stdio: quiet ? 'ignore' : 'inherit',
    env: { ...process.env, NEXT_DIST_DIR: '.next-test' }, // do not fight a dev server over .next
  });
  const url = `http://127.0.0.1:${port}/lossless/`;
  const until = Date.now() + 180000; // the first compile of the app can take a while
  for (;;) {
    if (child.exitCode != null) throw new Error(`next dev exited with ${child.exitCode}`);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) break;
    } catch (e) {}
    if (Date.now() > until) throw new Error('next dev never answered on ' + url);
    await new Promise(r => setTimeout(r, 700));
  }
  const stop = () => {
    if (child.exitCode != null) return;
    if (process.platform === 'win32') {
      try { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch (e) {}
    } else child.kill('SIGTERM');
  };
  return { url, stop };
}
