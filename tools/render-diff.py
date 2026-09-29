# render-diff.py: compare the rendered film with snapshots of the build at the same frames, to catch anything the
# renderer draws differently from a plain seek (a lost fromTo start value, a font that failed to load in the render).
#   python tools/render-diff.py <wide|vert> [--snaps out/hist-wide] [--top 20]
# Snapshots are PNGs named A-<t>.png (tools/history-check.mjs; t on the 30 fps grid) or at-<t>.png (filmsheet). Each
# rendered frame is the one at that time, taken by frame number; the score is the share of pixels that differ by more
# than 48 levels in a 4x-downscaled grey copy, so encoding noise stays small and a missing element does not.
import os, re, subprocess, argparse
import numpy as np
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('frame'); ap.add_argument('--snaps'); ap.add_argument('--top', type=int, default=20)
a = ap.parse_args()
d = a.snaps or f'out/hist-{a.frame}'
shots = sorted((float(m.group(1)), f) for f in os.listdir(d) if (m := re.match(r'(?:A-|at-)([\d.]+)\.png$', f)))
os.makedirs('out/.rdiff', exist_ok=True)
scores = []
for t, f in shots:
    n = round(t * 30); out = f'out/.rdiff/{a.frame}-{n}.png'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{n / 30 - 0.004:.4f}', '-i', f'renders/{a.frame}.mp4', '-frames:v', '1', out], check=True)
    A = Image.open(f'{d}/{f}').convert('L'); B = Image.open(out).convert('L').resize(A.size)
    w, h = A.size[0] // 4, A.size[1] // 4
    x = np.asarray(A.resize((w, h), Image.BILINEAR), dtype=np.int16); y = np.asarray(B.resize((w, h), Image.BILINEAR), dtype=np.int16)
    scores.append((float((np.abs(x - y) > 48).mean()), t))
scores.sort(reverse=True)
for s, t in scores[:a.top]:
    print(f'{t:8.3f}s  {s * 100:5.2f}% of pixels differ')
print(f'median {np.median([s for s, _ in scores]) * 100:.2f}%, {sum(s > 0.01 for s, _ in scores)} of {len(scores)} frames over 1%')
