// gen-scenes.mjs: write compositions/wide/sNN.html and compositions/vert/sNN.html from one source, scenes-src/sNN.html.
//   node tools/gen-scenes.mjs [s01 s02 ...]        (no ids: every source file)
// Source format:
//   <scene look="slug-id6">                        the Katagami language: its 15 --k-* tokens come from looks/k.json
//   <tokens> --k-accent: #...; </tokens>            optional hand-tuned overrides, same syntax as CSS declarations
//   <style> ... </style>                            CSS for both frames;  <style frame="wide|vert"> for one frame
//   <body> ... </body>                              markup inside the scene root; <body frame="wide|vert"> for one frame
//   <script> ... </script>                          the scene script (one for both frames; read K.size(root).vert)
import fs from 'node:fs';

const K = JSON.parse(fs.readFileSync('looks/k.json', 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync('scenes-src').filter(f => /^s\d+\.html$/.test(f)).map(f => f.slice(0, -5));
const FRAMES = { wide: [1920, 1080], vert: [1080, 1920] };
const blocks = (src, tag) => [...src.matchAll(new RegExp(`<${tag}(\\s+frame="(wide|vert)")?\\s*>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => ({ frame: m[2] || null, body: m[3] }));

for (const id of ids) {
  const src = fs.readFileSync(`scenes-src/${id}.html`, 'utf8');
  const look = (src.match(/<scene\s+look="([^"]+)"/) || [])[1];
  if (!look || !K[look]) throw new Error(`${id}: <scene look="..."> names no language in looks/k.json (${look})`);
  const tokens = Object.entries(K[look]).map(([n, v]) => `--k-${n}: ${v};`).join(' ');
  const over = (src.match(/<tokens>([\s\S]*?)<\/tokens>/) || [])[1]?.trim() || '';
  const script = (src.match(/<script>([\s\S]*?)<\/script>/) || [])[1];
  if (!script) throw new Error(`${id}: no <script>`);
  for (const [frame, [W, H]] of Object.entries(FRAMES)) {
    const css = blocks(src, 'style').filter(b => !b.frame || b.frame === frame).map(b => b.body.replace(/^\n+|\s+$/g, '')).join('\n');
    const body = blocks(src, 'body').filter(b => !b.frame || b.frame === frame).map(b => b.body.replace(/^\n+|\s+$/g, '')).join('\n');
    const out = `<template>
  <style>
    #root { ${tokens}${over ? ' ' + over : ''}
      position: absolute; inset: 0; overflow: hidden; background: var(--k-paper); color: var(--k-ink); font-family: var(--k-font-body); }
${css}
  </style>
  <div id="root" data-composition-id="${id}" data-width="${W}" data-height="${H}">
${body}
  </div>
  <script>${script.replace(/\s+$/, '')}
  </script>
</template>
`;
    fs.mkdirSync(`compositions/${frame}`, { recursive: true });
    fs.writeFileSync(`compositions/${frame}/${id}.html`, out);
  }
  console.log(`${id}: ${look}`);
}
