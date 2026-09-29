// assets/kit.js: shared helpers for the scenes (window.K). Deterministic by construction: no clock reads, only the
// seeded K.rng, no CSS animation. DOM side effects run from getter/setter tweens (K.drive), never timeline callbacks,
// because the renderer seeks with events suppressed and in any order. Colours come only from --k-* tokens (classes in kit.css, var() in SVG).
(function () {
  const K = (window.K = {}), FPS = 30, F = 1 / FPS, NS = 'http://www.w3.org/2000/svg';
  K.F = F;
  // nothing renders lazily: the renderer seeks frame by frame without a ticker tick between seeks, and a lazy tween's
  // first render (and a fromTo's start values) would wait for a tick that never comes, so the frame would lose them
  gsap.defaults({ lazy: false });

  K.rng = seed => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // the scene's own root: the runtime mounts the template's #root as an inner div of the host and keeps the
  // composition id on the host, so elements made here must go into the inner root to sit in the scene's tokens
  K.root = id => {
    const all = document.querySelectorAll(`[data-composition-id="${id}"]`), host = all[all.length - 1];
    return host.querySelector(':scope > [data-hf-inner-root]') || host.querySelector(':scope > [data-hf-authored-id="root"]') || host;
  };
  K.size = root => { const W = +root.getAttribute('data-width'), H = +root.getAttribute('data-height'); return { W, H, vert: H > W }; };
  K.el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
  K.svg = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs || {}) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  K.$ = (root, sel) => root.querySelector(sel);
  // an element's box in its scene root's pixels (layout only, ignoring transforms), for aiming cursors and overlays
  K.pos = (el, root) => { let x = 0, y = 0; for (let e = el; e && e !== root; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };

  // one number driven by a tween with a setter: fn(v) runs on every render of the tween, events suppressed or not.
  // fn(from) runs once now, so the frame before t0 is already drawn.
  K.drive = (tl, t0, t1, fn, from = 0, to = 1, ease = 'none') => {
    const o = { v: from, p(v) { if (!arguments.length) return this.v; this.v = v; fn(v); } };
    fn(from);
    tl.fromTo(o, { p: from }, { p: to, duration: Math.max(F, t1 - t0), ease, immediateRender: false, lazy: false }, t0);
    return o;
  };

  // ---- lyric type ----
  // the words of one line as spans; opts.key: index of the highlighted word, or a test (w, i) => bool
  K.words = (parent, line, opts = {}) => {
    const box = K.el('span', 'k-line' + (opts.cls ? ' ' + opts.cls : ''), parent);
    box.lang = line.lang || 'en';
    const keyAt = typeof opts.key === 'function' ? line.words.findIndex(opts.key) : (opts.key ?? -1);
    const spans = line.words.map((w, i) => {
      if (i) box.appendChild(document.createTextNode(' '));
      if (opts.breakBefore && opts.breakBefore.includes(i)) box.appendChild(document.createElement('br'));
      const s = K.el('span', 'k-w' + (i === keyAt ? ' k-key' : '') + (opts.wordCls ? ' ' + opts.wordCls : ''), box, i === keyAt ? null : w.w);
      if (i === keyAt) K.el('span', 'k-kt', s, w.w).setAttribute('data-layout-allow-overlap', '');
      s.setAttribute('data-layout-allow-overlap', '');   // display leading is tighter than the fonts' own boxes, by design
      return s;
    });
    return { box, spans, key: spans[keyAt] };
  };
  // each word appears on its sung time, never before. style: rise | slam | pop | cut | drop
  K.reveal = (tl, spans, line, style = 'rise', opts = {}) => {
    spans.forEach((s, i) => {
      const t = line.words[i].t + (opts.delay || 0);
      if (style === 'rise') tl.fromTo(s, { opacity: 0, y: '0.3em' }, { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, t);
      else if (style === 'slam') tl.fromTo(s, { opacity: 0, scale: 1.9 }, { opacity: 1, scale: 1, duration: 0.13, ease: 'power4.in' }, t);
      else if (style === 'pop') tl.fromTo(s, { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.2, ease: 'back.out(3)' }, t);
      else if (style === 'drop') tl.fromTo(s, { opacity: 0, y: '-0.6em', rotation: -6 }, { opacity: 1, y: 0, rotation: 0, duration: 0.22, ease: 'bounce.out' }, t);
      else tl.fromTo(s, { opacity: 0 }, { opacity: 1, duration: F, ease: 'none' }, t);
    });
  };
  // a line, typed one character at a time across each word's sung span (for terminals and text fields)
  K.typeLine = (tl, el, line, opts = {}) => {
    const text = line.words.map(w => w.w).join(' '), marks = [];
    let c = 0;
    line.words.forEach((w, i) => { marks.push([w.t, c]); c += w.w.length; marks.push([Math.max(w.t + F, Math.min(w.end, w.t + (opts.maxWord || 0.35))), c]); c += 1; });
    const at = time => { let n = 0; for (const [t, k] of marks) if (time >= t) n = k; return n; };
    const end = line.words[line.words.length - 1].end;
    K.drive(tl, 0, end + 0.2, v => { el.textContent = text.slice(0, at(v)); }, 0, end + 0.2);
    return text;
  };
  // any text typed at a steady rate between t0 and t1
  K.type = (tl, el, text, t0, t1) => K.drive(tl, t0, t1, v => { el.textContent = text.slice(0, Math.round(v * text.length)); });
  // a number counting from a to b
  K.count = (tl, el, a, b, t0, t1, fmt = v => Math.round(v).toLocaleString('en-US'), ease = 'power2.out') => K.drive(tl, t0, t1, v => { el.textContent = fmt(v); }, a, b, ease);

  // ---- camera and effects ----
  K.push = (tl, el, dur, s0 = 1, s1 = 1.05, ease = 'none') => tl.fromTo(el, { scale: s0 }, { scale: s1, duration: dur, ease }, 0);
  K.shake = (tl, el, t, amp = 10, frames = 3, seed = 7) => {
    const r = K.rng(seed);
    for (let i = 0; i < frames; i++) tl.set(el, { x: Math.round((r() * 2 - 1) * amp), y: Math.round((r() * 2 - 1) * amp) }, t + i * F);
    tl.set(el, { x: 0, y: 0 }, t + frames * F);
  };
  K.flashLayer = (root, ink) => K.el('div', 'k-flash' + (ink ? ' ink' : ''), root);
  K.flash = (tl, layer, t, frames = 2, peak = 1) => { tl.set(layer, { opacity: peak }, t); tl.set(layer, { opacity: 0 }, t + frames * F); };
  K.pulse = (tl, el, times, amt = 0.04, dur = 0.22) => times.forEach(t => tl.fromTo(el, { scale: 1 + amt }, { scale: 1, duration: dur, ease: 'power2.out', immediateRender: false }, t));

  // diagonal slab wipe. slabIn: the scene opens under two bands (its accent and ink) that sweep off to the right, the
  // first frame half covered. slabOut: bands sweep in from the left over the last moments, ending where slabIn starts.
  function slabs(root) {
    const host = K.el('div', 'k-slabs', root);
    host.setAttribute('data-bleed', ''); host.setAttribute('data-layout-ignore', '');
    return ['k-slab-a', 'k-slab-b'].map(c => { const s = K.el('div', 'k-slab ' + c, host); gsap.set(s, { skewX: -18 }); return s; });
  }
  // band geometry: width 0.78W, skewed 18deg about its middle, so its bottom leans 0.23H left of its top
  // while the bands cover part of the scene, its copy is marked as intentionally occluded (the audits then skip what
  // the bands hide, found by hit-testing them, and check the rest)
  const covered = (root, tl, t0, t1, on) => K.drive(tl, t0, t1, v => root.toggleAttribute('data-layout-allow-occlusion', on(v)));
  K.slabIn = (root, tl, opts = {}) => {
    const { W, H } = K.size(root), [a, b] = slabs(root), d = opts.dur || 0.3, gone = W + 0.3 * H;
    tl.fromTo(a, { x: -0.23 * W }, { x: gone, duration: d, ease: "power2.in" }, 0);
    tl.fromTo(b, { x: -0.95 * W }, { x: gone, duration: d * 1.25, ease: "power2.in" }, 0);
    covered(root, tl, 0, d * 1.25 + F, v => v < 1);
  };
  K.slabOut = (root, tl, end, opts = {}) => {
    const { W, H } = K.size(root), [a, b] = slabs(root), d = opts.dur || 0.2, away = -0.8 * W - 0.3 * H;
    tl.fromTo(a, { x: away }, { x: -0.23 * W, duration: d, ease: "power2.out", immediateRender: true }, end - d);
    tl.fromTo(b, { x: away - 0.75 * W }, { x: -0.95 * W, duration: d, ease: "power2.out", immediateRender: true }, end - d);
    covered(root, tl, end - d, end + 1, v => v > 0);
  };

  // ---- manga shots ----
  // a traced plate in an oversized, bleeding container (so pushes and pans never show an edge); returns the container.
  // opts: art name, viewBox crop in the plate's pixels, inks (light to dark), fit, and the container's CSS box
  K.shot = (parent, name, opts = {}) => {
    const box = K.el('div', 'k-shot' + (opts.cls ? ' ' + opts.cls : ''), parent);
    box.setAttribute('data-bleed', ''); box.setAttribute('data-layout-allow-overflow', ''); box.setAttribute('data-layout-ignore', '');
    Object.assign(box.style, { position: 'absolute', left: '-4%', top: '-4%', width: '108%', height: '108%' }, opts.style || {});
    window.placeArt(box, name, { fit: opts.fit || 'xMidYMid slice', viewBox: opts.viewBox, inks: opts.inks || K.PLAIN, tone: opts.tone !== false, cell: opts.cell });
    return box;
  };
  // Plainclothes' own two inks: bone-white paper and matte black
  K.PLAIN = ['#F2EEE6', '#0B0B0B'];
  // an SVG overlay in a plate's own pixel space, aligned with K.shot's art (same viewBox and fit)
  K.overlay = (shotBox, vb, fit = 'xMidYMid slice') => {
    const s = K.svg('svg', { viewBox: vb, preserveAspectRatio: fit }, shotBox);
    s.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;overflow:visible';
    return s;
  };
  // plate pixels to CSS pixels in the shot's parent, for HTML laid over a plate: vb is the shot's viewBox, box the shot
  // container [left, top, width, height] in px of that parent (K.bleed(PW, PH) for K.shot's default), slice fit
  K.bleed = (PW, PH) => [-0.04 * PW, -0.04 * PH, 1.08 * PW, 1.08 * PH];
  K.map = (vb, box) => {
    const [vx, vy, vw, vh] = vb.split(/[\s,]+/).map(Number), [l, t, bw, bh] = box, s = Math.max(bw / vw, bh / vh);
    const x0 = l + (bw - vw * s) / 2 - vx * s, y0 = t + (bh - vh * s) / 2 - vy * s, x = px => x0 + px * s, y = py => y0 + py * s;
    return { s, x, y, rect: (px, py, pw, ph) => ({ left: x(px) + 'px', top: y(py) + 'px', width: pw * s + 'px', height: ph * s + 'px' }) };
  };
  // keep a line within maxW whatever face a look sets: on every render, measure the content's layout width (an element's
  // offsetWidth, or a function) and scale the box down if it is wider. A restyle look's wider face is fitted as soon as
  // it lays out; the scenes' own faces fit already, so this changes nothing in the original look.
  K.fit = (tl, dur, box, content, maxW, origin = '0 50%') => {
    box.style.transformOrigin = origin;
    const width = typeof content === 'function' ? content : () => content.offsetWidth;
    K.drive(tl, 0, dur, () => { const w = width(); box.style.scale = w > maxW ? (maxW / w).toFixed(4) : ''; }, 0, dur);
  };
  // a scene's own token value (hex), e.g. to ink a plate in the scene's colours: [K.tok(root, 'ink'), K.tok(root, 'paper')]
  K.tok = (root, name) => getComputedStyle(root).getPropertyValue('--k-' + name).trim();
  // radial speed lines around (cx, cy) in an overlay; returns the group to animate
  K.speedLines = (svg, cx, cy, n = 64, r0 = 260, r1 = 2400, seed = 3, color = 'var(--k-paper)') => {
    const g = K.svg('g', {}, svg), r = K.rng(seed);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.08, w = 4 + r() * 16, s0 = r0 * (1 + r() * 0.6);
      const x0 = cx + Math.cos(a) * s0, y0 = cy + Math.sin(a) * s0, x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1;
      const nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      K.svg('path', { d: `M${x0.toFixed(0)} ${y0.toFixed(0)} L${(x1 + nx).toFixed(0)} ${(y1 + ny).toFixed(0)} L${(x1 - nx).toFixed(0)} ${(y1 - ny).toFixed(0)} Z`, fill: color }, g);
    }
    return g;
  };

  // ---- small UI parts ----
  K.stamp = (parent, text, cls = '') => K.el('div', 'k-stamp' + (cls ? ' ' + cls : ''), parent, text);
  K.slam = (tl, el, t, rot = -8, from = 2.4) => tl.fromTo(el, { opacity: 0, scale: from, rotation: rot - 10 }, { opacity: 1, scale: 1, rotation: rot, duration: 0.15, ease: 'power4.in' }, t);
  K.strike = parent => K.el('span', 'k-strike', parent);
  K.strikeAt = (tl, el, t, d = 0.16) => tl.to(el, { scaleX: 1, duration: d, ease: 'power2.out' }, t);
  K.bar = (parent, cls = '') => { const b = K.el('div', 'k-bar' + (cls ? ' ' + cls : ''), parent); return { bar: b, fill: K.el('div', 'k-bar-fill', b) }; };
  K.fill = (tl, fill, from, to, t0, t1, ease = 'power1.inOut') => tl.fromTo(fill, { scaleX: from }, { scaleX: to, duration: Math.max(F, t1 - t0), ease }, t0);
  K.toggle = (parent, on = true) => {
    const t = K.el('span', 'k-toggle', parent);
    K.el('span', 'k-toggle-off', t); const onL = K.el('span', 'k-toggle-on', t), knob = K.el('span', 'k-toggle-knob', t);
    onL.style.opacity = on ? 1 : 0; knob.style.transform = on ? 'translateX(1em)' : 'translateX(0)';
    return { el: t, on: onL, knob };
  };
  K.flip = (tl, tg, t, on) => {
    tl.to(tg.knob, { x: on ? '1em' : 0, duration: 0.14, ease: 'power3.out' }, t);
    tl.to(tg.on, { opacity: on ? 1 : 0, duration: 0.1, ease: 'none' }, t);
  };
  K.check = (parent, checked = false) => {
    const c = K.el('span', 'k-check', parent), s = K.svg('svg', { viewBox: '0 0 24 24' }, c);
    const p = K.svg('path', { d: 'M4 13 L10 19 L21 5', fill: 'none', stroke: 'var(--k-accent)', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, s);
    p.style.strokeDasharray = '1'; p.style.strokeDashoffset = checked ? '0' : '1';
    return { el: c, path: p };
  };
  K.tick = (tl, chk, t, d = 0.18) => tl.to(chk.path, { strokeDashoffset: 0, duration: d, ease: 'power2.out' }, t);
  K.cursor = parent => {
    const s = K.svg('svg', { class: 'k-cursor', viewBox: '0 0 24 24', width: 48, height: 48 }, parent);
    K.svg('path', { d: 'M3 2 L3 19.5 L7.8 15 L11.2 22.4 L14.4 21 L11 13.6 L17.6 13.6 Z', fill: 'var(--k-ink)', stroke: 'var(--k-paper)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, s);
    return s;
  };
  // path: [[t, x, y], ...] in scene seconds and scene pixels (the arrow tip)
  K.glide = (tl, cur, path, ease = 'power3.inOut') => {
    tl.set(cur, { x: path[0][1], y: path[0][2] }, 0);
    for (let i = 1; i < path.length; i++) tl.to(cur, { x: path[i][1], y: path[i][2], duration: Math.max(F, path[i][0] - path[i - 1][0]), ease }, path[i - 1][0]);
  };
  K.click = (tl, cur, ring, t, x, y) => {
    tl.to(cur, { scale: 0.86, duration: 0.06, ease: 'power2.in', transformOrigin: '0 0' }, t);
    tl.to(cur, { scale: 1, duration: 0.12, ease: 'power2.out' }, t + 0.06);
    if (ring) tl.fromTo(ring, { x, y, scale: 0.3, opacity: 1 }, { scale: 1.6, opacity: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, t);
  };
  K.caret = (tl, el, t0, t1, period = 0.53) => { for (let t = t0, on = true; t < t1; t += period / 2, on = !on) tl.set(el, { opacity: on ? 1 : 0 }, t); };
  K.onBeats = (S, fn, from = 0, to = Infinity) => S.beats.forEach((b, i) => { if (b >= from && b < to) fn(b, i, S.downbeats.some(d => Math.abs(d - b) < 0.02)); });
  // the lyric line starting nearest to t (scene seconds), for scenes with two lines
  K.lineAt = (S, i) => S.lines[Math.min(i, S.lines.length - 1)];

  // ---- sticker boards (s46, s47, and s48, which shows s47's last frame frozen) ----
  // list: [{ t, text, shape: pill|round|tag|burst|flower, tone (a token name), x, y (centre, px of host), rot, size }];
  // each sticker slaps on at its t. Shapes with outlines drawn in SVG sit under the text, which is its own span.
  const STAR = n => Array.from({ length: n * 2 }, (_, i) => { const a = Math.PI * i / n - Math.PI / 2, r = i % 2 ? 0.72 : 1; return [50 + Math.cos(a) * 50 * r, 50 + Math.sin(a) * 50 * r]; });
  K.stickers = (host, tl, list) => list.map(s => {
    const el = K.el('div', `k-stk k-stk-${s.shape}`, host);
    ['data-layout-allow-overlap', 'data-layout-allow-occlusion'].forEach(a => el.setAttribute(a, ''));   // a pile, by design
    Object.assign(el.style, { left: s.x + 'px', top: s.y + 'px', fontSize: s.size + 'px' });
    el.style.setProperty('--stk', `var(--k-${s.tone})`);
    if (s.shape === 'burst' || s.shape === 'flower') {
      const svg = K.svg('svg', { viewBox: '-12 -12 124 124', class: 'k-stk-bg' }, el);
      const d = s.shape === 'burst' ? 'M' + STAR(12).map(p => p.map(v => v.toFixed(1)).join(' ')).join(' L') + ' Z'
        : Array.from({ length: 8 }, (_, i) => { const a = Math.PI * i / 4, x = 50 + Math.cos(a) * 27, y = 50 + Math.sin(a) * 27; return `M${(x - 21).toFixed(1)} ${y.toFixed(1)} a21 21 0 1 0 42 0 a21 21 0 1 0 -42 0 Z`; }).join(' ') + ' M20 50 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0 Z';
      K.svg('path', { d, fill: 'var(--k-ink)', transform: 'translate(5 5)' }, svg);
      K.svg('path', { d, fill: 'var(--k-surface)', stroke: 'var(--k-surface)', 'stroke-width': 9, 'stroke-linejoin': 'round' }, svg);
      K.svg('path', { d, fill: 'var(--stk)', stroke: 'var(--k-ink)', 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    }
    if (s.text) { const t = K.el('span', 'k-stk-t', el, s.text); ['data-layout-allow-overlap', 'data-layout-allow-occlusion'].forEach(a => t.setAttribute(a, '')); }
    gsap.set(el, { xPercent: -50, yPercent: -50, rotation: s.rot, opacity: 0 });
    tl.set(el, { opacity: 1 }, s.t);
    tl.fromTo(el, { scale: 1.9, rotation: s.rot - 14 }, { scale: 1, rotation: s.rot, duration: 0.12, ease: 'power4.in', immediateRender: false }, s.t);
    tl.fromTo(el, { scale: 0.94 }, { scale: 1, duration: 0.16, ease: 'back.out(3)', immediateRender: false }, s.t + 0.12);
    return el;
  });
  // a seeded scatter of n points inside [x0, x1] x [y0, y1], kept clear of the given rects ([x, y, w, h])
  K.scatter = (seed, n, [x0, y0, x1, y1], avoid = []) => {
    const r = K.rng(seed), out = [];
    for (let k = 0; out.length < n && k < n * 200; k++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (!avoid.some(([ax, ay, aw, ah]) => x > ax && x < ax + aw && y > ay && y < ay + ah)) out.push([x, y, r()]);
    }
    return out;
  };
  // s47's pile, shared with s48: a labelled sticker on every sung "bit", a flower on every other beat
  K.pile47 = (S, W, H, vert) => {
    const words = S.lines.flatMap(l => l.words.map(w => ({ t: w.t, bit: /^bit/.test(w.w) })));
    const tail = S.lines[S.lines.length - 1].end, beats = S.beats.filter(b => b > tail + 0.05);
    const extra = beats.flatMap((b, i) => (i + 1 < beats.length ? [b, (b + beats[i + 1]) / 2] : [b]));
    const LAB = ['EVERY BIT', 'KEPT', 'ALL OF IT', '0 LOST', 'LOSSLESS', 'NO CUTS', 'RAW', 'BIT-PERFECT', '24-BIT', 'UNCUT'];
    const TONES = ['surface', 'accent', 'accent-2'], SHAPES = ['pill', 'burst', 'round', 'tag'];
    const band = vert ? [0, 1290, W, 630] : [0, 800, W, 280];
    const n = words.length + extra.length, pts = K.scatter(47, n, vert ? [210, 300, W - 320, 1190] : [260, 170, W - 260, 740], [band]);
    let k = 0;
    const big = words.map((w, i) => {
      const p = pts[i], r = p[2];
      return w.bit ? { t: w.t, text: LAB[k++ % LAB.length], shape: SHAPES[k % 4], tone: TONES[k % 3], x: p[0], y: p[1], rot: (r - 0.5) * 30, size: vert ? 66 : 60 }
        : { t: w.t, text: '', shape: 'flower', tone: TONES[i % 3], x: p[0], y: p[1], rot: r * 90, size: (vert ? 60 : 52) + r * 36 };
    });
    const small = extra.map((t, i) => { const p = pts[words.length + i]; return { t, text: '', shape: 'flower', tone: TONES[(i + 1) % 3], x: p[0], y: p[1], rot: p[2] * 90, size: (vert ? 64 : 56) + p[2] * 40 }; });
    // one last sticker two frames before the hard stop, so the frozen frame (s48) catches it mid-slap
    const last = { t: S.dur - 2 * F, text: 'EVERY BIT', shape: 'burst', tone: 'accent-2', x: W * 0.5, y: vert ? 820 : 470, rot: -8, size: vert ? 84 : 76 };
    return big.concat(small, [last]).sort((a, b) => a.t - b.t);
  };

  // ---- film-level moments shared by the chrome and the scenes (song seconds, derived from FILM, never typed in) ----
  const film = () => window.FILM;
  K.sceneStart = id => film().scenes[id].start;
  K.wordTime = (sceneId, lineId, word) => { const S = film().scenes[sceneId], L = S.lines.find(l => l.id === lineId); const w = L.words.find(x => x.w.replace(/[^\w']/g, '').toLowerCase() === word); return S.start + w.t; };
  // the cold open's EXPORT click: the first downbeat after 4 s
  K.exportAt = () => film().song.downbeats.find(d => d > 4);
})();
