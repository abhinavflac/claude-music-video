// art/art.js: placeArt(host, name, { fit, inks, tone, viewBox, cell }) and reinkArt(ramp)
// Traced plates carry a role (tools/trace.py): paper, tone (with data-cov, its ink coverage), ink, white. A ramp runs
// light to dark: paper and white lines print in its first colour, ink in its last. With tone (Plainclothes) the tone
// plates print as halftone screens, dots of ink on paper flipping to paper dots on ink past 50%, so the art keeps its
// screentone and re-inks with every look. window.__flatInks = true prints them as flat mixes (slow-device fallback).
(function () {
  const placed = new Set(); let ramp = null, uid = 0;
  const NS = 'http://www.w3.org/2000/svg';
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  function screens(svg, covs, paper, ink) {
    let defs = svg.querySelector('defs[data-tone]');
    if (!defs) { defs = document.createElementNS(NS, 'defs'); defs.setAttribute('data-tone', ''); svg.insertBefore(defs, svg.firstChild); }
    defs.textContent = '';
    const cell = +svg.dataset.cell;
    return covs.map(c => {
      const cov = Math.min(0.94, Math.max(0.06, c)), dark = cov > 0.5, id = `tone${++uid}`, p = document.createElementNS(NS, 'pattern');
      p.setAttribute('id', id); p.setAttribute('patternUnits', 'userSpaceOnUse');
      p.setAttribute('width', cell); p.setAttribute('height', cell); p.setAttribute('patternTransform', 'rotate(45)');
      const bg = document.createElementNS(NS, 'rect');
      bg.setAttribute('width', cell); bg.setAttribute('height', cell); bg.setAttribute('fill', dark ? ink : paper);
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', cell / 2); dot.setAttribute('cy', cell / 2);
      dot.setAttribute('r', (cell * Math.sqrt((dark ? 1 - cov : cov) / Math.PI)).toFixed(2)); dot.setAttribute('fill', dark ? paper : ink);
      p.append(bg, dot); defs.appendChild(p);
      return id;
    });
  }
  function ink(svg) {
    const r = ramp || (svg.dataset.inks ? JSON.parse(svg.dataset.inks) : null), gs = [...svg.querySelectorAll('g[data-plate]')];
    gs.forEach(g => { if (!g.dataset.own) g.dataset.own = g.getAttribute('fill'); });
    if (!r) { gs.forEach(g => g.setAttribute('fill', g.dataset.own)); return; }
    const light = r[0], dark = r[r.length - 1];
    if (gs.every(g => g.dataset.role)) {
      const tones = gs.filter(g => g.dataset.role === 'tone'), screen = svg.dataset.tone === '1' && !window.__flatInks;
      const ids = screen ? screens(svg, tones.map(g => +g.dataset.cov), light, dark) : [];
      gs.forEach(g => {
        const role = g.dataset.role, cov = +g.dataset.cov;
        g.setAttribute('fill', role === 'ink' ? dark : role === 'tone'
          ? (screen ? `url(#${ids[tones.indexOf(g)]})` : r.length > 2 ? r[Math.max(1, Math.min(r.length - 2, Math.round(cov * (r.length - 1))))] : mix(light, dark, cov))
          : light);
      });
      return;
    }
    gs.forEach((g, k) => g.setAttribute('fill', r[Math.round(k * (r.length - 1) / Math.max(1, gs.length - 1))]));
  }
  window.placeArt = function (host, name, opts = {}) {
    const A = window.ART && window.ART[name];
    if (!A) throw new Error('art not loaded: ' + name);
    host.innerHTML = A.svg;
    const svg = host.querySelector('svg');
    svg.setAttribute('preserveAspectRatio', opts.fit || 'xMidYMid slice');
    if (opts.viewBox) svg.setAttribute('viewBox', opts.viewBox);   // a crop of the plate, in its own pixels
    svg.style.cssText = 'width:100%;height:100%;display:block';
    // screen ruling: about 280 cells across whatever is shown, so dots keep one size on screen at any crop
    svg.dataset.cell = String(opts.cell || Math.max(2, svg.viewBox.baseVal.width / 280));
    if (opts.inks) svg.dataset.inks = JSON.stringify(opts.inks);   // a scene's own ramp, light to dark
    if (opts.tone) svg.dataset.tone = '1';
    placed.add(svg); ink(svg); return svg;
  };
  window.reinkArt = function (r) { ramp = r || null; placed.forEach(svg => (svg.isConnected ? ink(svg) : placed.delete(svg))); };
})();
