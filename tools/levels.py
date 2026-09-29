# levels.py: per-frame audio levels of the song for scenes that draw meters from it (scenes.json "levels": N bands).
#   python tools/levels.py            -> song/levels.json { sNN: { fps, bands: [[N values 0..1] per frame], L: [...], R: [...] } }
# Frame f of a scene is the audio around song time start + f/30 (a 2048-sample Hann window). Bands are log-spaced from
# 40 Hz to 16 kHz; every value is dB mapped onto 0..1 over a 54 dB range under the song's own loudest frame, so meters
# built on it fill the way a real one would. build.mjs attaches each scene's entry to FILM.scenes[id].levels.
import json, wave
import numpy as np

FPS, WIN, FLOOR = 30, 2048, 54.0
scenes = json.load(open('scenes.json', encoding='utf8'))
timing = json.load(open('song/timing.json', encoding='utf8'))
with wave.open('song/song.wav', 'rb') as w:
    sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
    pcm = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, ch).astype(np.float32) / 32768.0

# scene starts as build.mjs computes them (frame grid; a scene ends where the next starts)
lines = {l: timing['lines'][l]['t'] for l in timing['lines']}
starts = []
for i, s in enumerate(scenes):
    if i == 0: st = 0.0
    elif s.get('start') is not None: st = round(s['start'] * FPS) / FPS
    else: st = max(0, int(np.floor(lines[s['lines'][0]] * FPS)) - 1) / FPS
    starts.append(st)
ends = starts[1:] + [timing['duration']]

hann = np.hanning(WIN).astype(np.float32)
freqs = np.fft.rfftfreq(WIN, 1 / sr)

def frame(t):
    c = int(round(t * sr)); a, b = c - WIN // 2, c + WIN // 2
    seg = np.zeros((WIN, ch), np.float32); lo, hi = max(0, a), min(len(pcm), b)
    if hi > lo: seg[lo - a:hi - a] = pcm[lo:hi]
    return seg

def analyse(t, edges):
    seg = frame(t); mono = seg.mean(axis=1) * hann
    mag = np.abs(np.fft.rfft(mono)) / (WIN / 4)
    bands = [float(np.sqrt(np.mean(mag[(freqs >= lo) & (freqs < hi)] ** 2)) + 1e-9) for lo, hi in zip(edges[:-1], edges[1:])]
    rms = np.sqrt(np.mean(seg ** 2, axis=0)) + 1e-9
    return np.array(bands), rms

out = {}
for i, s in enumerate(scenes):
    nb = s.get('levels')
    if not nb: continue
    edges = np.geomspace(40, 16000, nb + 1)
    ts = np.arange(starts[i], ends[i], 1 / FPS)
    data = [analyse(t, edges) for t in ts]
    # the song's own loudest moments set the top of the scale (sampled across the whole song)
    ref = [analyse(t, edges) for t in np.arange(0, timing['duration'], 0.25)]
    bmax = np.max([b for b, _ in ref], axis=0); rmax = np.max([r for _, r in ref])
    norm = lambda x, m: np.clip(1 + 20 * np.log10(x / m) / FLOOR, 0, 1)
    out[s['id']] = {
        'fps': FPS,
        'bands': [[round(float(v), 3) for v in norm(b, bmax)] for b, _ in data],
        'L': [round(float(norm(r[0], rmax)), 3) for _, r in data],
        'R': [round(float(norm(r[-1], rmax)), 3) for _, r in data],
    }
    print(f"{s['id']}: {len(ts)} frames, {nb} bands, from {starts[i]:.3f}s")
json.dump(out, open('song/levels.json', 'w'), separators=(',', ':'))
