# specview.py: spectrogram strips of the vocal stem with candidate word starts drawn on them, for checking timing by eye.
#   python tools/specview.py out.png id [id ...] --cands song/timing-draft.json song/timing-tight.json [--pad 0.8]
# Each strip: the line from its earliest candidate start - pad to its latest end + pad. Candidate k draws its word starts
# as ticks in its own colour and band (draft on top, the next below). The white curve is loudness (dB).
import json, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

a = sys.argv[1:]
out, rest = a[0], a[1:]
pad = 0.8
PPS_ARG = None
if '--pad' in rest:
    i = rest.index('--pad'); pad = float(rest[i + 1]); del rest[i:i + 2]
if '--pps' in rest:
    i = rest.index('--pps'); PPS_ARG = int(rest[i + 1]); del rest[i:i + 2]
ci = rest.index('--cands'); ids = rest[:ci]; cands = rest[ci + 1:]
C = [json.load(open(p, encoding='utf8'))['lines'] for p in cands]
names = [p.split('/')[-1].replace('timing-', '').replace('.json', '') for p in cands]
SR, HOP, NFFT, PPS = 16000, 80, 1024, PPS_ARG or 200  # 5 ms per pixel by default
pcm = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'song/vocals.wav', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                                   capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
COLS = [(255, 70, 70), (70, 170, 255), (90, 230, 120), (255, 200, 60)]
try:
    font = ImageFont.truetype('arial.ttf', 13)
except OSError:
    font = ImageFont.load_default()
strips = []
for lid in ids:
    t0 = min(c[lid]['t'] for c in C if lid in c) - pad
    t1 = max(c[lid]['end'] for c in C if lid in c) + pad
    t0 = max(0, t0)
    seg = pcm[int(t0 * SR):int(t1 * SR)]
    n = 1 + max(0, (len(seg) - NFFT) // HOP)
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    fr = seg[np.minimum(idx, len(seg) - 1)] * np.hanning(NFFT)[None, :].astype(np.float32)
    S = np.abs(np.fft.rfft(fr, axis=1))[:, :int(6000 / (SR / NFFT))]  # up to 6 kHz
    L = 20 * np.log10(S + 1e-6)
    L = np.clip((L - (L.max() - 70)) / 70, 0, 1)
    img = (255 * L.T[::-1]).astype(np.uint8)  # low freq at the bottom
    W = int((t1 - t0) * PPS)
    spec = Image.fromarray(img).resize((W, 260), Image.BILINEAR).convert('RGB')
    band = 26
    H = 260 + band * len(C) + 22
    im = Image.new('RGB', (W, H), (18, 18, 22))
    im.paste(spec, (0, 22 + band * len(C)))
    d = ImageDraw.Draw(im)
    rms = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    ys = 22 + band * len(C) + 260 - np.clip((rms + 70) / 70, 0, 1) * 250
    xs = np.linspace(0, W, len(ys))
    d.line(list(zip(xs.tolist(), ys.tolist())), fill=(255, 255, 255), width=1)
    for s in np.arange(np.ceil(t0 * 10) / 10, t1, 0.1):  # 100 ms grid
        x = (s - t0) * PPS
        d.line([(x, 22 + band * len(C)), (x, 26 + band * len(C))], fill=(120, 120, 120))
        if abs(s * 2 - round(s * 2)) < 1e-6:
            d.text((x + 2, 4), f'{s:.1f}', fill=(160, 160, 160), font=font)
    for k, (c, nm) in enumerate(zip(C, names)):
        if lid not in c: continue
        y = 22 + band * k
        d.text((W - 60, y + 4), nm[:8], fill=COLS[k], font=font)
        for w in c[lid]['words']:
            x0, x1 = (w['t'] - t0) * PPS, (w['end'] - t0) * PPS
            d.rectangle([x0, y + 2, max(x0 + 1, x1 - 1), y + band - 3], outline=COLS[k])
            d.line([(x0, y), (x0, H)], fill=COLS[k], width=1)
            d.text((x0 + 3, y + 5), w['w'], fill=COLS[k], font=font)
    d.text((4, 4), lid, fill=(255, 255, 255), font=font)
    strips.append(im)
Wm = max(s.width for s in strips)
sheet = Image.new('RGB', (Wm, sum(s.height + 8 for s in strips)), (0, 0, 0))
y = 0
for s in strips:
    sheet.paste(s, (0, y)); y += s.height + 8
sheet.save(out)
print(out, sheet.size)
