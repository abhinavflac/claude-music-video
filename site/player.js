// player.js: the Lossless page. mount({ base }) builds the whole player in the current document (the static page and
// the React component both call it) and returns unmount(), which takes the listeners, the timers and the live windows
// off again. base is the folder the film folder, the looks and the player live under (/lossless/ from the site).
export function mount(opts) {
  opts = opts || {};
  var BASE = opts.base || '';
  var disposed = false;
  // every listener the player registers while mounting is recorded, so unmount() can take them all off again
  var listening = [], addListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, options) { listening.push([this, type, fn, options]); return addListener.call(this, type, fn, options); };
  var $ = function (s) { return document.querySelector(s); };
  var root = document.documentElement, stage = $('#stage'), video = $('#film'), layer = $('#layer'), inkCanvas = $('#ink'), flash = $('#flash'), tap = $('#tap');
  var startEl = $('#start'), go = $('#go'), gosub = $('#gosub'), about = $('#about'), say = $('#say');
  var frameEl = $('#frame'), inviteEl = $('#invite'), app = $('#app'), bar = $('#bar'), pp = $('#pp'), track = $('#track'), fill = $('#fill'), knob = $('#knob'), timeEl = $('#time'), hint = $('#hint'), hud = $('#hud'), chips = $('#chips');
  var params = new URLSearchParams(location.search);
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The film plays as rendered (the MP4, which is also the clock and the sound). A style redraws it live instead: the
  // HyperFrames film runs in the page, a few seconds of it at a time, with every drawing re-inked from the look's ramp
  // (window.reinkArt). Each style pairs a Katagami design language (its tokens drive every code-drawn element through
  // the scenes' --k-* custom properties, and the page chrome too) with the film's own traced ink. Looks from the library.
  var LOOKS = null, LIVE = null, liveFailedFlag = false;
  // the two films and their posters are far too large for git: they live on the asset host; ?assets=film uses a local copy
  var ASSETS = (params.get('assets') ? params.get('assets').replace(/\/?$/, '/') : 'https://assets.abhinavflac.dev/lossless/');
  // the films are far too large for the repo and stream from the asset host; the two posters are small, ship with the
  // page (film/poster-*.jpg) and show the first frame before play
  var FILMS = { wide: { src: ASSETS + 'wide.mp4', poster: BASE + 'film/poster-wide.jpg', w: 1920, h: 1080 }, vert: { src: ASSETS + 'vert.mp4', poster: BASE + 'film/poster-vert.jpg', w: 1080, h: 1920 } };
  var trackW = 0, film = 'wide', phase = 'ready', styleIndex = 0, restyles = 0, scrub = null, dur = 248, wantT = 0;
  if (window.ResizeObserver) new ResizeObserver(function () { trackW = 0; }).observe(track);

  function lookAt(i) { return LOOKS[Math.max(0, Math.min(LOOKS.length - 1, i))]; }
  function inkOf(s) { return s.ink || (s.k ? [s.k.accent, s.k.ink, s.k.paper] : ['#7CFF9A', '#0A0A0B', '#EDEAE2']); }

  // ---------- style chips ----------
  function swatch(l) {
    if (l.sw) return l.sw;
    var k = l.k || { paper: '#0A0A0B', accent: '#7CFF9A' };
    return '<rect width="20" height="20" fill="' + k.paper + '"/><circle cx="10" cy="10" r="5.5" fill="' + k.accent + '"/><circle cx="13.5" cy="13.5" r="3.5" fill="' + (k.ink || k['on-surface'] || '#FFFFFF') + '"/>';
  }
  function buildChips() {
    chips.textContent = '';
    LOOKS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true">' + swatch(s) + '</svg><span>' + s.name + '</span>';
      b.addEventListener('click', function (e) {
        var r = stage.getBoundingClientRect(), c = b.getBoundingClientRect(), side = root.getAttribute('data-layout') === 'side';
        restyle(i, side ? r.width : Math.max(0, Math.min(r.width, c.left + c.width / 2 - r.left)), side ? Math.max(0, Math.min(r.height, c.top + c.height / 2 - r.top)) : r.height, 'chip');
        if (!filmTapped && i > 0) setTimeout(function () { invite(); }, 500); // a nudge: the film itself takes taps
        if (e.detail > 0) b.blur();
      });
      chips.appendChild(b);
    });
  }

  // ---------- layout ----------
  function chromeMode() { var w = innerWidth, h = innerHeight; return h < 560 && w / h >= 1.3 ? 'corners' : 'stack'; }
  function layout() {
    var mode = chromeMode(), F = FILMS[film], W = innerWidth, H = innerHeight, sw, sh, full = isFull();
    root.style.setProperty('--app-h', H + 'px'); // the page is exactly the visible viewport (Safari's toolbars come and go)
    root.setAttribute('data-chrome', mode);
    root.setAttribute('data-layout', mode === 'corners' ? 'side' : 'stack');
    var topEl = document.querySelector('.chrome-top'), footEl = document.querySelector('.chrome-bottom');    var cs = getComputedStyle(app), gap = parseFloat(cs.rowGap) || 8, padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight), padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    root.classList.remove('chips-compact');
    if (!full && !root.classList.contains('chips-off')) {
      if (mode === 'corners') { if (chips.offsetHeight + (topEl ? topEl.offsetHeight : 0) + footEl.offsetHeight + 24 > H - padY) root.classList.add('chips-compact'); }
      else if (chips.offsetHeight > 50) root.classList.add('chips-compact');
    }
    if (full) {
      var kf = Math.min(W / F.w, H / F.h);
      sw = Math.floor(F.w * kf); sh = Math.floor(F.h * kf);
    } else if (mode === 'corners') {
      var side = Math.max(topEl ? topEl.offsetWidth : 0, footEl.offsetWidth, root.classList.contains('chips-off') ? 0 : chips.scrollWidth);
      var s = Math.min((W - padX - (parseFloat(cs.columnGap) || 16) - side) / F.w, (H - padY - bar.offsetHeight - gap) / F.h);
      sw = Math.floor(F.w * s); sh = Math.floor(F.h * s);
    } else {
      // one column in the page flow: link, film, bar, styles, (about,) footer. The film gets the height the rest leaves.
      var rest = function () {
        var items = [bar, footEl].concat(root.classList.contains('chips-off') ? [] : [chips]).concat(root.classList.contains('short') ? [] : [about]);
        return padY + items.reduce(function (h, el) { return h + el.offsetHeight + gap; }, 0);
      };
      var fit = function () { var k = Math.min(Math.min(W - padX, 1600) / F.w, (H - rest()) / F.h); sw = Math.floor(F.w * k); sh = Math.floor(F.h * k); };
      root.classList.remove('short'); fit();
      if (sh < 240) { root.classList.add('short'); fit(); }
    }
    root.style.setProperty('--sw', sw + 'px'); root.style.setProperty('--sh', sh + 'px');
    if (mode === 'corners') root.classList.toggle('short', sh < 240);
    stage.style.setProperty('--fs', Math.round(Math.max(30, Math.min(120, Math.min(sw, sh * 1.25) * 0.13))) + 'px');
    stage.style.setProperty('--is', Math.round(Math.max(18, Math.min(64, Math.min(sw, sh * 1.1) * 0.085))) + 'px');
    var pad = Math.round(Math.max(12, Math.min(36, sw * 0.04)));
    stage.style.setProperty('--pad', pad + 'px');
    var dpr = Math.min(2, devicePixelRatio || 1);
    inkCanvas.width = Math.round(sw * dpr); inkCanvas.height = Math.round(sh * dpr);
    Object.keys(segs).forEach(function (k) { sizeSeg(segs[k]); });
    trackW = 0; // measured again on the next frame
  }
  var filmChoice = null, lastPortrait = null; // the shape switch's choice, until the phone is turned
  function wantFilm() {
    var portrait = root.clientHeight > root.clientWidth;
    if (lastPortrait !== null && portrait !== lastPortrait) filmChoice = null;
    lastPortrait = portrait;
    if (filmChoice && FILMS[filmChoice]) return filmChoice;
    var f = params.get('frame');
    if (f && FILMS[f]) return f;
    return portrait ? 'vert' : 'wide';
  }
  function useFilm(name, via) {
    if (name === film || !FILMS[name]) return;
    var t = video.currentTime || wantT, playing = !video.paused && phase !== 'ready';
    film = name; wantT = t; root.setAttribute('data-film', name); showShape();
    liveCheck.t = 0; liveCheck.low = 0;
    video.poster = FILMS[name].poster; video.src = FILMS[name].src; video.load();
    if (playing) video.play().catch(function () {});
    dropAll(); layout();
  }
  video.addEventListener('loadedmetadata', function () {
    if (isFinite(video.duration)) { dur = video.duration; track.setAttribute('aria-valuemax', Math.round(dur)); }
    if (wantT > 0.05) { video.currentTime = Math.min(dur - 0.1, wantT); wantT = 0; }
  });

  // ---------- design-language tokens: on every composition root of a live window, and on the page ----------
  var TOKENS = ['paper', 'surface', 'ink', 'on-surface', 'muted', 'line', 'accent', 'accent-2', 'accent-3', 'on-accent', 'radius', 'shadow'];
  var FONTS = ['font-display', 'font-body', 'font-mono'];
  // every .k-line's height and widest line in the film's own faces, measured once per window with the runtime's
  // hidden-scene rule lifted (inactive scenes are display:none, and a display:none element has no rects). A restyle face
  // that wraps a lyric into more lines than it was drawn in is then scaled down to the drawn height, so a wider face
  // can never push a word into the copy below it. The CSS `scale` property is used, so it composes with any transform a
  // scene sets on the box, and transform-origin is the top-left.
  function lineMetrics(box) {
    var rs = box.getClientRects(); if (!rs.length) return null;
    var top = Infinity, bottom = -Infinity, w = 0;
    for (var i = 0; i < rs.length; i++) { var r = rs[i]; if (r.top < top) top = r.top; if (r.bottom > bottom) bottom = r.bottom; if (r.width > w) w = r.width; }
    return { h: bottom - top, w: w };
  }
  // a stable name for a lyric block: the runtime re-mounts a scene's DOM as a window seeks, so elements themselves are
  // not stable keys; the scene id and the block's index among that scene's lyric blocks are
  function boxKey(b) {
    var host = b.closest('[data-composition-id]');
    if (!host) return '?';
    return host.getAttribute('data-composition-id') + ':' + [].indexOf.call(host.querySelectorAll('.k-line'), b);
  }
  async function baseLines(doc) {
    var hide = [].filter.call(doc.querySelectorAll('style'), function (s) { return /visibility:\s*hidden/.test(s.textContent) && /display:\s*none/.test(s.textContent); });
    hide.forEach(function (s) { s.disabled = true; });
    await doc.fonts.ready;
    // the runtime hides every scene but the active one with inline styles, and a hidden scene has no rects: show them all
    // for the measure (synchronously, before the runtime's next frame can hide them again), then put every host back
    var saved = [].map.call(doc.querySelectorAll('[data-composition-src]'), function (h) { return [h, h.getAttribute('style')]; });
    saved.forEach(function (p) { p[0].style.display = 'block'; p[0].style.visibility = 'visible'; });
    var base = new Map();
    [].forEach.call(doc.querySelectorAll('.k-line'), function (b) { b.style.display = 'inline-block'; var m = lineMetrics(b); if (m && m.h > 2) base.set(boxKey(b), m); });
    saved.forEach(function (p) { if (p[1] == null) p[0].removeAttribute('style'); else p[0].setAttribute('style', p[1]); });
    hide.forEach(function (s) { s.disabled = false; });
    return base;
  }
  async function fitLyrics(doc, win) {
    var boxes = [].slice.call(doc.querySelectorAll('.k-line'));
    var st = doc.getElementById('look-tokens'), original = !st || !st.textContent;
    if (original && boxes.some(function (b) { return !win.__line0 || !win.__line0.has(boxKey(b)); })) {
      var base = await baseLines(doc);
      if (!win.__line0) win.__line0 = base;
      else base.forEach(function (v, k) { if (!win.__line0.has(k)) win.__line0.set(k, v); });
    }
    boxes.forEach(function (b) { b.style.scale = ''; });
    await doc.fonts.ready;
    boxes.forEach(function (b) {
      var b0 = win.__line0 && win.__line0.get(boxKey(b)); if (!b0) return;
      var now = lineMetrics(b); if (!now || now.w < 1) return;
      var parent = b.parentElement, pr = parent.getBoundingClientRect();
      var cs = getComputedStyle(parent), pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      var avail = parent.clientWidth > 8 ? (parent.clientWidth - pad) * (pr.width / Math.max(1, parent.offsetWidth)) : Infinity;
      var s = Math.min(1, b0.h / Math.max(1, now.h), avail / Math.max(1, now.w));
      if (s < 0.995) { b.style.transformOrigin = '0 0'; b.style.scale = s.toFixed(4); }
    });
  }
  function setTokens(doc, look) {
    var st = doc.getElementById('look-tokens');
    if (!st) { st = doc.createElement('style'); st.id = 'look-tokens'; doc.head.appendChild(st); }
    st.textContent = look.k ? '[data-composition-id],[data-composition-id] *{' + TOKENS.concat(FONTS).map(function (n) { return '--k-' + n + ':' + look.k[n] + '!important'; }).join(';') + '}' +
      (look.synth === false ? '[data-composition-id],[data-composition-id] *{font-synthesis:none!important}' : '') : '';
    return st;
  }
  // dress one window in the look at index i: the tokens and the ink ramp land in the same frame when the window has been
  // measured before; a window seen for the first time is measured in the film's own faces first, then dressed. The window
  // only becomes visible once dressed (liveTick gates on o.dressed === applied), so a seek never flashes the old look.
  function dressWindowAt(o, i) {
    var look = lookAt(i), d = o.w.document, ink = look.k ? look.inks : null;
    if (o.dressed === i && o.ink === ink) return; // already in this look
    var apply = function () {
      setTokens(d, look);
      o.w.__flatInks = flat;
      if (o.w.reinkArt) o.w.reinkArt(ink);
      o.dressed = i; o.ink = ink;
      fitLyrics(d, o.w).catch(function () {});   // fit the restyle faces to the size the film drew
    };
    if (!o.w.__line0 || !o.w.__line0.size) fitLyrics(d, o.w).then(apply, apply); // first sight: measure, then dress
    else apply();
  }
  function dressWindow(o) { dressWindowAt(o, applied); }

  // ---------- the live renderer: short windows of the HyperFrames film, only around the playhead ----------
  var segs = {}, liveOn = false, liveCheck = { t: 0, low: 0 }, applied = -1, fitAt = 0; // applied: the style the film is drawn in (a tap in flight may be ahead of it)
  var store = function (s, k, v) { try { return v === undefined ? s.getItem(k) : v === null ? s.removeItem(k) : s.setItem(k, v); } catch (e) { return null; } };
  // The styles go off only after repeated trouble in this visit (the tab's sessionStorage), and never for good.
  if (params.get('live') === '1') ['lossless-live-crashes', 'lossless-live-trips', 'lossless-live-running'].forEach(function (k) { store(sessionStorage, k, null); }); // ?live=1: a fresh start
  var crashes = +store(sessionStorage, 'lossless-live-crashes') || 0, trips = +store(sessionStorage, 'lossless-live-trips') || 0;
  if (store(sessionStorage, 'lossless-live-running')) { crashes++; store(sessionStorage, 'lossless-live-crashes', crashes); store(sessionStorage, 'lossless-live-running', null); }
  var cautious = crashes > 0, liveAllowed = crashes < 2 && trips < 3 && params.get('live') !== '0';
  function markRunning() { store(sessionStorage, 'lossless-live-running', liveOn && document.visibilityState === 'visible' ? '1' : null); }
  document.addEventListener('visibilitychange', markRunning);
  addEventListener('pagehide', function () { store(sessionStorage, 'lossless-live-running', null); });
  addEventListener('pageshow', markRunning);
  // the frame-rate guard: ?guard=0 turns it off, ?guard=N sets the floor (14 fps; a test sets it high to trip it)
  var guard = params.get('guard') !== '0', minFps = +params.get('guard') > 0 ? +params.get('guard') : 14;
  // WebKit (Safari and every iPhone browser) repaints blend-mode textures and big vector drawings on the CPU every frame
  var webkit = /AppleWebKit/.test(navigator.userAgent) && !/(Chrome|Chromium|Edg|OPR|SamsungBrowser|Firefox)\//.test(navigator.userAgent) && params.get('wk') !== '0';
  // flat: the drawings print as flat mixes instead of screentone patterns (the slow-device fallback). WebKit starts there.
  var flat = (webkit || cautious || !!store(localStorage, 'lossless-live-flat')) && params.get('lite') !== '0';
  function liveFrame() { return film === 'vert' ? 'vert' : 'wide'; }
  function segList() { return (LIVE && LIVE.frames[liveFrame()] && LIVE.frames[liveFrame()].windows) || []; }
  function segAt(t) { var S = segList(); for (var i = 0; i < S.length; i++) if (t < S[i][1]) return i; return S.length - 1; }
  function sizeSeg(o) {
    var F = LIVE.frames[liveFrame()], k = stage.clientWidth / F.w;
    if (webkit) { // WebKit paints an iframe at its own size before scaling it, so the film is laid out at the size it shows
      o.el.style.width = Math.round(F.w * k) + 'px'; o.el.style.height = Math.round(F.h * k) + 'px'; o.el.style.transform = 'none';
      if (o.w) o.w.document.documentElement.style.zoom = k;
    } else { o.el.style.width = F.w + 'px'; o.el.style.height = F.h + 'px'; o.el.style.transform = 'scale(' + k + ')'; }
  }
  var segRetries = {};
  function loadSeg(i) {
    if (segs[i]) return segs[i];
    var s = segList()[i], f = document.createElement('iframe');
    f.className = 'seg'; f.src = BASE + 'film/' + s[2]; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.title = '';
    var o = segs[i] = { i: i, from: s[0], to: s[1], el: f, ready: false, frames: 0, t0: performance.now() };
    sizeSeg(o); layer.appendChild(f);
    (function poll() {
      if (segs[i] !== o) return;
      // a window whose scripts failed to load (a dropped request, a cold cache right after a deploy) never becomes ready:
      // after 8 s it is dropped and the next tick loads it again, at most twice per window
      if (performance.now() - o.t0 > 8000) { segRetries[i] = (segRetries[i] || 0) + 1; if (segRetries[i] <= 2) { dropSeg(i); return; } }
      var w = null, ok = false;
      try {
        w = f.contentWindow;
        var d = w.document, reg = w.__timelines || {}, hosts = d.querySelectorAll('[data-composition-src]');
        ok = !!w.__player && hosts.length > 0 && [].every.call(hosts, function (h) { return reg[h.getAttribute('data-composition-id')]; }) && (!d.fonts || d.fonts.status === 'loaded');
      } catch (e) {}
      if (!ok) { setTimeout(poll, 100); return; }
      var st = d.createElement('style');
      st.textContent = '#root>[data-composition-src][style*="visibility: hidden"],#root>[data-composition-src][style*="visibility:hidden"]{display:none!important}' +
        (webkit ? '.k-tex .kit-tex,[id$="-grain"]{display:none!important}' : ''); // in WebKit the film grain and texture overlays go (they re-blend the whole frame)
      d.head.appendChild(st);
      o.w = w; sizeSeg(o);
      if (liveOn) quietDress(o); // a window loaded ahead takes the look in a quiet moment, not in the middle of taps
      w.__player.seek(Math.max(0, video.currentTime - o.from));
      (function count() { if (segs[i] === o) { o.frames++; w.requestAnimationFrame(count); } })();
      o.ready = true;
    })();
    return o;
  }
  function quietDress(o) {
    if (!liveOn || !o.ready || o.dressed === applied) return;
    if (performance.now() - lastTap < 500) { setTimeout(function () { if (segs[o.i] === o) quietDress(o); }, 250); return; }
    dressWindow(o);
  }
  function dropSeg(i) { var o = segs[i]; if (!o) return; delete segs[i]; o.w = null; o.el.remove(); }
  function dropAll() { Object.keys(segs).forEach(function (k) { dropSeg(+k); }); stage.classList.remove('drawn'); }
  function liveTick(now) {
    if (!liveOn || !LIVE) return;
    var t = scrub ? scrub.t : video.currentTime, S = segList(), i = segAt(t), cur = loadSeg(i);
    Object.keys(segs).forEach(function (k) { if (+k !== i && +k !== i + 1) dropSeg(+k); }); // this window and the next only
    // the next window loads ahead (its load is a few long tasks), in a pause between taps unless the cut is close; after
    // a crash, one window at a time
    if (!cautious && i + 1 < S.length && t > cur.to - 5 && (performance.now() - lastTap > 800 || t > cur.to - 2)) loadSeg(i + 1);
    if (cur.ready && cur.dressed !== applied) dressWindow(cur); // the next window takes the look (the one applied, not a tap in flight) as it comes on
    Object.keys(segs).forEach(function (k) { segs[k].el.classList.toggle('on', +k === i && segs[k].ready && segs[k].dressed === applied); });
    stage.classList.toggle('drawn', cur.ready && cur.dressed === applied);
    if (!cur.ready) return;
    // scenes come on screen as the window plays: keep fitting any lyric a restyle face wraps taller
    if (now - fitAt > 350) { fitAt = now; fitLyrics(cur.w.document, cur.w).catch(function () {}); }
    var p = cur.w.__player, lt = Math.max(0, t - cur.from);
    if (!video.paused && !scrub) {
      if (!p.isPlaying()) { p.seek(lt); p.play(); cur.drift = 0; }
      else if (Math.abs(p.getTime() - lt) > 0.12) { if (++cur.drift > 3) { p.seek(lt, { keepPlaying: true }); cur.drift = 0; } } else cur.drift = 0;
      // the device has to keep up: at least 14 frames a second in three checks in a row. A sample counts the frames of
      // one window only (the next one, a reloaded one or the other film's starts a new sample).
      if (!liveCheck.t || liveCheck.o !== cur) { liveCheck.t = now; liveCheck.f = cur.frames; liveCheck.o = cur; }
      else if (now - liveCheck.t > 2000) {
        var fps = (cur.frames - liveCheck.f) / ((now - liveCheck.t) / 1000);
        liveCheck.low = fps < minFps ? liveCheck.low + 1 : 0; root.setAttribute('data-live-fps', Math.round(fps));
        liveCheck.t = now; liveCheck.f = cur.frames;
        if (liveCheck.low >= 3 && guard) liveFailed();
      }
    } else {
      liveCheck.t = 0;
      if (p.isPlaying()) p.pause();
      if (Math.abs(p.getTime() - lt) > 0.05) p.seek(lt);
    }
  }
  // A device that can't keep up gets flat inks first, still the same styles. After that it goes back to the original
  // with the chips still there, and the next tap tries the styles again; the third time in a visit, the chips go.
  function liveFailed() {
    liveCheck.t = 0; liveCheck.low = 0;
    if (!flat) {
      flat = true; store(localStorage, 'lossless-live-flat', '1');
      Object.keys(segs).forEach(function (k) { if (segs[k].ready) dressWindow(segs[k]); });
      return;
    }
    trips++; store(sessionStorage, 'lossless-live-trips', trips);
    apply(0);
    if (trips >= 3) { liveAllowed = false; showChips(); }
    hud.textContent = trips >= 3 ? 'too choppy, playing the original' : 'too choppy, back to original'; hud.classList.add('on');
    setTimeout(function () { if (!scrub) hud.classList.remove('on'); }, 3200);
  }
  function setInksLive(ink) {
    liveOn = !!ink;
    markRunning();
    clearTimeout(setInksLive.drop);
    if (!liveOn) { // the film as rendered: the live windows pause out of sight for a few seconds, in case a style comes straight back
      liveCheck.t = 0; stage.classList.remove('drawn');
      Object.keys(segs).forEach(function (k) { var o = segs[k]; o.el.classList.remove('on'); try { if (o.ready && o.w.__player.isPlaying()) o.w.__player.pause(); } catch (e) {} });
      setInksLive.drop = setTimeout(function () { if (!liveOn) dropAll(); }, 4000);
      return;
    }
    // the window on screen now; any other (the next one, loaded ahead) when the taps have paused
    Object.keys(segs).forEach(function (k) { var o = segs[k]; if (o.ready && o.el.classList.contains('on')) dressWindow(o); });
    clearTimeout(setInksLive.t); setInksLive.t = setTimeout(function () { Object.keys(segs).forEach(function (k) { if (segs[k].ready) dressWindow(segs[k]); }); }, 600);
  }
  function showChips() {
    var on = liveAllowed && LIVE !== false && LOOKS !== null; // the row is there while film/looks.json and film/live.json load
    root.classList.toggle('chips-off', !on);
    var kmark = '<svg class="k-mark" viewBox="0 0 40 40" aria-hidden="true"><g style="isolation:isolate"><circle cx="13" cy="16" r="12" fill="#EBCBD2" style="mix-blend-mode:multiply"/><circle cx="27" cy="16" r="12" fill="#EFE6B4" style="mix-blend-mode:multiply"/><circle cx="20" cy="28" r="12" fill="#D9CBE6" style="mix-blend-mode:multiply"/></g></svg>';
    about.innerHTML = on ? 'A music video about refusing to be compressed: 67 scenes, each in its own design language, black-and-white manga traced into vectors. Every frame is JavaScript; tap to restyle it live, looks from ' + kmark + ' <a href="https://katagami.ai" target="_blank" rel="noopener">katagami.ai</a>.'
      : 'A music video about refusing to be compressed: 67 scenes, each in its own design language, black-and-white manga traced into vectors. Every frame is drawn in JavaScript.';
    layout(); // the styles row takes (or gives back) the height the film was sized around
  }

  // ---------- restyle ----------
  function apply(i) {
    if (!LOOKS) return;
    styleIndex = i;
    var s = LOOKS[i];
    [].forEach.call(chips.children, function (c, k) { var on = k === i ? 'true' : 'false'; if (c.getAttribute('aria-pressed') !== on) c.setAttribute('aria-pressed', on); });
    if (i === applied && (!s.k || liveOn)) return; // already showing this style
    applied = i;
    dressPage(i); // the page chrome in the same language, in the same frame as the film
    setInksLive(s.k ? s.inks : null);
    say.textContent = s.name + (s.k ? ': ' + s.language + ' with the film redrawn live' : ', as rendered');
  }
  // The page chrome restyles its few elements at once: the look's colours and faces (all self-hosted and preloaded).
  var paged = -1;
  function dressPage(i) {
    if (paged === i) return; paged = i;
    var s = LOOKS[i], k = s.k;
    TOKENS.concat(FONTS).concat(['accent-t', 'accent-2-t', 'accent-3-t']).forEach(function (n) {
      if (k && k[n]) root.style.setProperty('--k-' + n, k[n]); else root.style.removeProperty('--k-' + n);
    });
    if (!k) { // the film's own look
      var own = { paper: '#0A0A0B', surface: '#0F0F11', ink: '#EDEAE2', 'on-surface': '#EDEAE2', muted: '#8A8A82', line: '#26262A', accent: '#7CFF9A', 'accent-2': '#EDEAE2', 'accent-3': '#7CFF9A', 'on-accent': '#06140A', radius: '0px', shadow: 'none', 'accent-t': '#7CFF9A', 'accent-2-t': '#EDEAE2', 'accent-3-t': '#7CFF9A' };
      for (var n in own) root.style.setProperty('--k-' + n, own[n]);
      root.style.setProperty('--k-font-display', "'Anton', sans-serif");
      root.style.setProperty('--k-font-body', "'Noto Sans', sans-serif");
      root.style.setProperty('--k-font-mono', "'Kode Mono', monospace");
    }
    root.style.setProperty('--k-on-surface', k && k['on-surface'] ? k['on-surface'] : (k ? k.ink : '#EDEAE2'));
    // a look whose faces have no bold (a pixel face, a display face with one weight) requests no synthesis: an 800 or
    // 900 in a scene's CSS renders that one face as drawn instead of a smeared faux bold
    root.style.fontSynthesis = s.synth === false ? 'none' : '';
  }
  // Taps: the chip, the name stamp, the ripple, the ink ring and the page chrome answer every tap at once. The heavy
  // part, the scenes' tokens and faces (a restyle and relayout of the whole scene), comes with a lone tap; in a burst it
  // waits until the taps pause, so it never lands between two taps and always ends on the last style tapped.
  var applyTimer = null, lastTap = 0;
  function restyle(i, x, y, via) {
    if (!LOOKS || !liveAllowed || !LIVE) i = 0;
    i = (i % LOOKS.length + LOOKS.length) % LOOKS.length;
    liveCheck.t = 0; liveCheck.low = 0; // a tap starts the frame-rate count afresh
    restyles++;
    [hint, $('#coach')].forEach(function (el) { if (el.classList.contains('on')) { el.classList.add('off'); el.classList.remove('on'); } });
    styleIndex = i;
    [].forEach.call(chips.children, function (c, k) { c.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
    stamp(LOOKS[i]);
    if (x != null) ripple(x, y, vivid(LOOKS[i]));
    if (!reduced) { var sr = stage.getBoundingClientRect(); ring(LOOKS[i], x != null ? x : sr.width / 2, x != null ? y : sr.height / 2); }
    var now = performance.now(), gap = now - lastTap, burst = gap < 400;
    lastTap = now; clearTimeout(applyTimer);
    var run = function () { apply(styleIndex); warmAll(); };
    // A lone tap takes the whole look at once; so does one from the film as rendered (its live window starts loading).
    var lead = (!liveOn && LOOKS[i].k && !Object.keys(segs).length) || (!burst && !LOOKS[i].fit);
    // the frame with the ripple stays light; the drawings, the chrome (and a lone tap's whole look) follow in the next
    requestAnimationFrame(function () { setTimeout(function () { if (styleIndex !== i) return; inkNow(i); dressPage(i); if (lead && lastTap === now) run(); }, 0); });
    if (lead) return;
    // in a burst the heavy part waits for the pause that ends it, a beat longer than the viewer's own gap between taps
    applyTimer = setTimeout(run, burst ? Math.min(350, Math.max(170, gap + 20)) : 200);
  }
  // the bubble on a switch: the new style's inks well up from the tap in an organic ring (the canvas ink wipe)
  function blob(ctx, cx, cy, r, ph) {
    for (var k = 0; k <= 90; k++) {
      var a = k / 90 * Math.PI * 2, q = 1 + 0.09 * Math.sin(3 * a + ph[0]) + 0.055 * Math.sin(5 * a + ph[1]) + 0.03 * Math.sin(9 * a + ph[2]) + 0.018 * Math.sin(15 * a + ph[3]);
      var px = cx + Math.cos(a) * r * q, py = cy + Math.sin(a) * r * q;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  var wipe = null;
  function ring(s, x, y) {
    var dpr = inkCanvas.width / Math.max(1, stage.clientWidth), W = inkCanvas.width, H = inkCanvas.height, cx = x * dpr, cy = y * dpr;
    var R = Math.max(Math.hypot(cx, cy), Math.hypot(W - cx, cy), Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy)) * 1.25;
    var rnd = function () { return Math.random() * Math.PI * 2; }, off = Math.max(3, W * 0.012), ph = [rnd(), rnd(), rnd(), rnd()], ph2 = [rnd(), rnd(), rnd(), rnd()], drops = [];
    for (var k = 0; k < 14; k++) drops.push({ a: rnd(), f: 1.05 + Math.random() * 0.3, s: (0.01 + Math.random() * 0.03) * Math.min(W, H), c: k % 3 });
    var w = { t0: performance.now() }, ctx = inkCanvas.getContext('2d'), T = 460, ink = inkOf(s), A = ink[0], B = ink[1], C = ink[2] || ink[1];
    wipe = w;
    (function frame() {
      if (wipe !== w || disposed) return;
      var p = (performance.now() - w.t0) / T;
      ctx.clearRect(0, 0, W, H);
      if (p >= 1) { wipe = null; return; }
      var e = 1 - Math.pow(1 - p, 3), r = R * e, band = Math.max(3 * dpr, R * 0.22 * (1 - p));
      ctx.fillStyle = B; ctx.beginPath(); blob(ctx, cx + off, cy - off * 0.7, r * 1.02, ph2); blob(ctx, cx + off, cy - off * 0.7, Math.max(0, r - band * 1.1), ph2); ctx.fill('evenodd');
      ctx.fillStyle = A; ctx.beginPath(); blob(ctx, cx, cy, r, ph); blob(ctx, cx, cy, Math.max(0, r - band), ph); ctx.fill('evenodd');
      drops.forEach(function (d) { ctx.fillStyle = d.c === 2 ? C : d.c ? B : A; ctx.beginPath(); ctx.arc(cx + Math.cos(d.a) * r * d.f, cy + Math.sin(d.a) * r * d.f, d.s * (1 - p), 0, Math.PI * 2); ctx.fill(); });
      requestAnimationFrame(frame);
    })();
  }
  function inkNow(i) { // the window on screen re-inks its drawings in the tapped style right away
    var s = LOOKS[i]; if (!liveOn || !s.k) return;
    Object.keys(segs).forEach(function (k) { var o = segs[k]; if (o.ready && o.w && o.el.classList.contains('on') && o.ink !== s.inks && o.w.reinkArt) { o.w.reinkArt(s.inks); o.ink = s.inks; } });
  }
  // the ripple takes the style's liveliest ink (not its near-black or white)
  function vivid(s) {
    var ink = inkOf(s), lum = function (h) { var c = [1, 3, 5].map(function (k) { var v = parseInt(h.slice(k, k + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    for (var k = 0; k < ink.length; k++) { var L = lum(ink[k]); if (L > 0.12 && L < 0.92) return ink[k]; }
    return ink[0];
  }
  // every look's windows go into the browser cache once the viewer starts tapping, and the first window's parts ahead of the invite
  var warmed = {}, fontsWarm = false;
  function warmAll() { if (fontsWarm) return; fontsWarm = true; }
  function warm() {
    if (!LIVE) return;
    var S = segList(), i = segAt(video.currentTime);
    [i, i + 1].forEach(function (k) {
      var s = S[k]; if (!s || warmed[s[2]]) return; warmed[s[2]] = 1;
      fetch(BASE + 'film/' + s[2]).then(function (r) { return r.text(); }).then(function (html) {
        (html.match(/(?:<script src|data-composition-src)="[^"]+"/g) || []).forEach(function (m) {
          var u = m.slice(m.indexOf('"') + 1, -1); if (!/^[a-z]+:/.test(u)) fetch(BASE + 'film/' + u).catch(function () {});
        });
      }).catch(function () {});
    });
  }
  function stamp(s) {
    var span = flash.firstChild;
    flash.className = ''; span.textContent = s.name;
    void flash.offsetWidth;
    flash.className = 'on';
  }
  // ---------- playback ----------
  function setPhase(p) {
    phase = p;
    root.setAttribute('data-phase', p);
    var playing = p === 'playing';
    pp.classList.toggle('paused', !playing); pp.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    pp.classList.toggle('ended', p === 'ended'); if (p === 'ended') pp.setAttribute('aria-label', 'Play again');
  }
  var filmTapped = false;
  function begin() {
    go.classList.add('done');
    setTimeout(function () { startEl.classList.add('gone'); }, reduced ? 0 : 240);
    var replay = phase === 'ended';
    if (replay) video.currentTime = 0;
    var p = video.play();
    if (p && p.then) p.then(function () {}, function () { startEl.classList.remove('gone'); go.classList.remove('done'); gosub.textContent = 'tap again to play with sound'; });
    setTimeout(function () { invite(); }, 700);
  }
  go.addEventListener('click', function (e) { e.stopPropagation(); begin(); });
  startEl.addEventListener('click', function (e) { if (!e.target.closest('a')) begin(); });
  function togglePlay() {
    if (phase === 'ready' || phase === 'ended') { begin(); return; }
    if (video.paused) video.play().catch(function () {}); else video.pause();
  }
  pp.addEventListener('click', function (e) { togglePlay(); if (e.detail > 0) pp.blur(); });
  video.addEventListener('ended', function () { setPhase('ended'); });

  var buffering = false, lastT = -1, lastMove = 0;
  function tick(now) {
    if (disposed) return;
    var t = scrub ? scrub.t : video.currentTime;
    if (video.currentTime !== lastT) { lastT = video.currentTime; lastMove = now; }
    if (!video.ended && !scrub) {
      if (!video.paused) { if (phase !== 'playing') setPhase('playing'); }
      else if (phase === 'playing') setPhase('paused');
    }
    liveTick(now);
    var wait = !video.paused && !scrub && (video.readyState < 3 && now - lastMove > 400);
    var drawing = liveOn && !stage.classList.contains('drawn');
    var msg = wait ? 'loading...' : drawing && phase !== 'ready' ? 'drawing ' + (LOOKS ? LOOKS[styleIndex].name.toLowerCase() : '') + '...' : '';
    if ((msg !== '') !== buffering || (msg && hud.textContent !== msg)) { buffering = msg !== ''; if (msg) { hud.textContent = msg; hud.classList.add('on'); } else if (!scrub) hud.classList.remove('on'); }
    var f = Math.max(0, Math.min(1, t / dur));
    fill.style.transform = 'scaleX(' + f.toFixed(4) + ')';
    knob.style.transform = 'translateX(' + (f * (trackW || (trackW = track.clientWidth))).toFixed(1) + 'px)';
    var label = fmt(t);
    if (timeEl.textContent !== label) { timeEl.textContent = label; track.setAttribute('aria-valuenow', Math.floor(t)); track.setAttribute('aria-valuetext', label); }
    requestAnimationFrame(tick);
  }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return Math.floor(t / 60) + ':' + ('0' + (t % 60)).slice(-2); }

  // ---------- scrubbing ----------
  function scrubStart(t) {
    if (phase === 'ready') return false;
    scrub = { t: t, resume: !video.paused };
    if (!video.paused) video.pause();
    scrubTo(t); return true;
  }
  function scrubTo(t) {
    scrub.t = Math.max(0, Math.min(dur - 0.05, t));
    if (video.fastSeek) video.fastSeek(scrub.t); else video.currentTime = scrub.t;
    hud.textContent = (scrub.resume ? 'paused  ' : '') + fmt(scrub.t) + ' / ' + fmt(dur); hud.classList.add('on');
  }
  function scrubEnd() {
    if (!scrub) return;
    var s = scrub; scrub = null; hud.classList.remove('on');
    video.currentTime = s.t;
    if (phase === 'ended') setPhase('paused');
    if (s.resume) video.play().catch(function () {});
  }
  function trackTime(x) { var r = track.getBoundingClientRect(); return (x - r.left) / r.width * dur; }
  track.addEventListener('pointerdown', function (e) { if (!scrubStart(trackTime(e.clientX))) return; track.setPointerCapture(e.pointerId); e.preventDefault(); });
  track.addEventListener('pointermove', function (e) { if (scrub) scrubTo(trackTime(e.clientX)); });
  track.addEventListener('pointerup', scrubEnd);
  track.addEventListener('pointercancel', scrubEnd);
  track.addEventListener('keydown', function (e) {
    var step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
    if (!step) return;
    e.preventDefault(); e.stopPropagation();
    video.currentTime = Math.max(0, Math.min(dur - 0.05, video.currentTime + step));
  });

  // The film: a tap moves to the next style (or pauses, where the styles are off); hold pauses, drag while holding scrubs.
  var press = null;
  tap.addEventListener('pointerdown', function (e) {
    if (e.button > 0) return;
    var r = stage.getBoundingClientRect();
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX - r.left, y0: e.clientY - r.top, w: r.width, held: false, t0: video.currentTime };
    press.timer = setTimeout(function () { if (press && !press.held) hold(); }, 320);
  });
  function hold() {
    if (!scrubStart(video.currentTime)) { press = null; return; }
    press.held = true; press.t0 = scrub.t;
    try { tap.setPointerCapture(press.id); } catch (e) {}
  }
  tap.addEventListener('pointermove', function (e) {
    if (!press || e.pointerId !== press.id) return;
    var dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (!press.held && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) { clearTimeout(press.timer); hold(); if (!press) return; }
    if (press.held) scrubTo(press.t0 + dx / press.w * 40);
  });
  tap.addEventListener('pointerup', function (e) {
    if (!press || e.pointerId !== press.id) return;
    clearTimeout(press.timer);
    var p = press; press = null;
    if (p.held) { scrubEnd(); return; }
    if (Math.abs(e.clientX - p.x) < 12 && Math.abs(e.clientY - p.y) < 12) { filmTapped = true; uninvite(); if (root.classList.contains('chips-off')) { ripple(p.x0, p.y0); togglePlay(); } else if (!LOOKS) togglePlay(); else restyle(styleIndex + 1, p.x0, p.y0, 'film'); }
  });
  function ripple(x, y, color) { // where the finger landed, in the colour of the style it goes to
    var el = document.createElement('i'); el.className = 'ripple'; el.style.left = x + 'px'; el.style.top = y + 'px';
    if (color) el.style.setProperty('--rip', color);
    el.addEventListener('animationend', function (e) { if (!e.pseudoElement) el.remove(); }); stage.appendChild(el); // after the ring, not the disc
  }
  tap.addEventListener('pointercancel', function () { if (press) { clearTimeout(press.timer); if (press.held) scrubEnd(); press = null; } });
  tap.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  tap.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); e.stopPropagation();
    if (!LOOKS || phase === 'ready' || phase === 'ended' || root.classList.contains('chips-off')) togglePlay(); else { filmTapped = true; uninvite(); restyle(styleIndex + 1, null, null, 'film'); }
  });
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    var onControl = e.target.closest && e.target.closest('button, a, [role="slider"]'), off = root.classList.contains('chips-off');
    if (phase === 'ready') { if ((e.key === ' ' || e.key === 'Enter') && !onControl) { e.preventDefault(); begin(); } return; }
    if ((e.key === ' ' || e.key === 'Enter') && !onControl) { e.preventDefault(); if (off || !LOOKS) togglePlay(); else restyle(styleIndex + 1); }
    else if (e.key === 'ArrowRight' && !onControl && !off) { e.preventDefault(); restyle(styleIndex + 1); }
    else if (e.key === 'ArrowLeft' && !onControl && !off) { e.preventDefault(); restyle(styleIndex - 1); }
    else if (/^[1-9]$/.test(e.key) && !off) restyle(+e.key - 1);
    else if (e.key === 'k' || e.key === 'K') togglePlay();
  });

  // ---------- hints ----------
  function invite(force) { // the sticker: first play, entering full screen, a style change before the film was ever tapped
    if ((!force && filmTapped) || !liveAllowed || LIVE === false || !LOOKS || root.classList.contains('chips-off')) return;
    inviteEl.classList.remove('on'); void inviteEl.offsetWidth; inviteEl.classList.add('on');
    clearTimeout(invite.t); invite.t = setTimeout(uninvite, 3300);
    warm();
  }
  function uninvite() { clearTimeout(invite.t); inviteEl.classList.remove('on'); }
  var canFs = !!(app.requestFullscreen || app.webkitRequestFullscreen) && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && params.get('fs') !== 'page';
  function isFull() { return !!(document.fullscreenElement || document.webkitFullscreenElement) || root.classList.contains('immersive'); }
  function immersive(on) { root.classList.toggle('immersive', on); onFull(); }
  // the controls stay up while the pointer moves and slip away a few seconds after it rests (fullscreen / immersive)
  var idleTimer = 0;
  function showControls() {
    root.classList.remove('controls-idle');
    clearTimeout(idleTimer);
    if (isFull()) idleTimer = setTimeout(function () { root.classList.add('controls-idle'); }, 2800);
  }
  ['pointermove', 'pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, showControls, { passive: true }); });
  function onFull() { layout(); if (isFull()) invite(true); else uninvite(); showControls(); }
  function enterFull() { // the whole page goes full screen, so the bar and the styles row ride along over the film; iPhone gets it in the page
    if (canFs) { var r = (app.requestFullscreen || app.webkitRequestFullscreen).call(app); if (r && r.catch) r.catch(function () { immersive(true); }); }
    else immersive(true);
  }
  function exitFull() {
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    if (root.classList.contains('immersive')) immersive(false);
  }
  document.addEventListener('fullscreenchange', onFull); document.addEventListener('webkitfullscreenchange', onFull);
  $('#fs').addEventListener('click', function (e) { if (isFull()) exitFull(); else enterFull(); if (e.detail > 0) e.currentTarget.blur(); });
  $('#fsx').addEventListener('click', function (e) { e.stopPropagation(); exitFull(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('immersive')) exitFull(); });
  if (window.visualViewport) visualViewport.addEventListener('resize', function () { layout(); });
  function showHint() {
    if (restyles || root.classList.contains('chips-off')) return;
    var coach = $('#coach');
    hint.textContent = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'click a style, or press space' : 'tap a style to redraw it';
    setTimeout(function () { if (!restyles) { hint.classList.add('on'); coach.classList.add('on'); } }, 1400);
    setTimeout(function () { hint.classList.remove('on'); coach.classList.remove('on'); }, 5200);
  }

  // ---------- start: the poster at once, the film streams on play ----------
  var t0 = parseFloat(params.get('t')); if (t0 > 0) wantT = t0;
  video.poster = FILMS[film].poster;
  video.src = FILMS[film].src;
  setPhase('ready'); layout();
  useFilm(wantFilm()); // portrait phones start on the vertical film, before any rotate or tap
  addEventListener('resize', function () { layout(); useFilm(wantFilm(), 'rotate'); });
  function showShape() { document.querySelectorAll('#orient button').forEach(function (b) { b.setAttribute('aria-pressed', b.value === film ? 'true' : 'false'); }); }
  document.querySelectorAll('#orient button').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (e.detail > 0) b.blur();
      if (b.value === film || !FILMS[b.value]) return;
      filmChoice = b.value; useFilm(filmChoice, 'tap');
    });
  });
  if (document.fonts) { document.fonts.ready.then(layout); document.fonts.addEventListener('loadingdone', layout); }
  requestAnimationFrame(tick);
  // looks first (the chips), the film's windows second; both with retries. live=false disables the styles entirely.
  (function getLooks(n) {
    fetch(BASE + 'film/looks.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      LOOKS = j.looks || [];
      buildChips(); showChips(); showHint();
      var si = LOOKS.findIndex(function (s) { return s.id === params.get('style'); });
      if (si > 0 && liveAllowed) { restyles++; apply(si); } // a shared link already shows a style
    }, function () {
      if (n < 2) setTimeout(function () { getLooks(n + 1); }, 1000 * (n + 1));
      else { LIVE = false; setPhase('ready'); showChips(); }
    });
  })(0);
  (function getLive(n) { // a failed fetch is tried twice more (1 s, then 2 s later) before the page gives up on the styles
    fetch(BASE + 'film/live.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (l) {
      LIVE = l;
      ['wide', 'vert'].forEach(function (k) { var f = l.frames && l.frames[k]; if (f && f.w && f.h) { FILMS[k].w = f.w; FILMS[k].h = f.h; } });
      root.classList.toggle('has-tall', !!(l.frames && l.frames.vert));
      layout(); showChips();
    }, function () { if (n < 2) setTimeout(function () { getLive(n + 1); }, 1000 * (n + 1)); else { LIVE = false; showChips(); } });
  })(0);
  EventTarget.prototype.addEventListener = addListener;
  return function unmount() {
    disposed = true;
    listening.forEach(function (l) { try { l[0].removeEventListener(l[1], l[2], l[3]); } catch (e) {} });
    clearTimeout(idleTimer); clearTimeout(applyTimer); clearTimeout(dropTimer);
    clearTimeout(setInksLive.t); clearTimeout(setInksLive.drop); clearTimeout(invite.t);
    wipe = null;
    try { video.pause(); } catch (e) {}
    dropAll();
    ['controls-idle', 'chips-compact', 'chips-off', 'short', 'has-tall', 'immersive'].forEach(function (c) { root.classList.remove(c); });
    ['data-chrome', 'data-layout', 'data-phase', 'data-live-fps', 'data-film'].forEach(function (a) { root.removeAttribute(a); });
    TOKENS.concat(FONTS).concat(['accent-t', 'accent-2-t', 'accent-3-t']).forEach(function (n) { root.style.removeProperty('--k-' + n); });
    root.style.fontSynthesis = '';
  };
}

window.mountLossless = mount;
