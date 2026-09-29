# trace.py: python tools/trace.py refs/shot.png name art [--width 2400] [--crop x,y,w,h] [--levels 0.8,0.56,0.34]
# Traces a Plainclothes reference into role-tagged vector plates, painted in this order:
#   paper  the ground (one rect)
#   tone   three screen plates from a heavily blurred copy: light, mid, dark (data-cov = their ink coverage);
#          art/art.js prints them as halftone screens, so the printed dots are redrawn rather than traced
#   ink    solid black from a lightly blurred copy: linework and flat blacks
#   white  paper-coloured lines and highlights from the same copy, drawn over the ink (white contours on black)
# Tones are measured against the image's own paper and ink levels. Potrace's transform is baked into the path
# coordinates so userSpaceOnUse screens render at true size. Writes art/<name>.js registering window.ART[name].
import argparse, json, os, re, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('name'); ap.add_argument('outdir')
ap.add_argument('--width', type=int, default=2400)
ap.add_argument('--crop', default=None, help='x,y,w,h in source pixels, applied first')
ap.add_argument('--levels', default='0.80,0.56,0.34', help='tone plate thresholds, as fractions from ink (0) to paper (1)')
ap.add_argument('--ink', type=float, default=0.24, help='ink threshold on the lightly blurred copy')
ap.add_argument('--white', type=float, default=0.80, help='white-line threshold on the lightly blurred copy')
ap.add_argument('--tone-blur', type=float, default=3.5)
ap.add_argument('--line-blur', type=float, default=1.1)
ap.add_argument('--speckle', type=int, default=24)
a = ap.parse_args()

im = Image.open(a.src).convert('RGB')
if a.crop:
    x, y, w, h = (int(v) for v in a.crop.split(','))
    im = im.crop((x, y, x + w, y + h))
if im.width > a.width:
    im = im.resize((a.width, round(im.height * a.width / im.width)), Image.LANCZOS)
W, H = im.size
g = im.convert('L')
raw = np.asarray(g).astype(float)
paper, inkv = np.percentile(raw, 97), np.percentile(raw, 2)
norm = lambda arr: np.clip((arr - inkv) / max(1.0, paper - inkv), 0, 1)
tone = norm(np.asarray(g.filter(ImageFilter.GaussianBlur(a.tone_blur))).astype(float))
line = norm(np.asarray(g.filter(ImageFilter.GaussianBlur(a.line_blur))).astype(float))
levels = [float(v) for v in a.levels.split(',')]

TOK = re.compile(r'[MmLlCcZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?')
def bake(d, tx, ty, sx, sy):
    out, cmd, nums = [], None, []
    def flush():
        if cmd is None: return
        vals = []
        for i, v in enumerate(nums):
            v = float(v); xy = i % 2 == 0
            v = (sx * v + tx if xy else sy * v + ty) if cmd.isupper() else (sx * v if xy else sy * v)
            vals.append(('%.1f' % v).rstrip('0').rstrip('.'))
        out.append(cmd + ' '.join(vals))
    for t in TOK.findall(d):
        if t.isalpha():
            flush(); cmd, nums = t, []
            if t in 'Zz': out.append('z'); cmd = None
        else: nums.append(t)
    flush()
    return ''.join(out)

tmp = tempfile.mkdtemp()
def trace(mask, speckle):
    if not mask.any(): return ''
    Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert('1').save(f'{tmp}/p.pbm')
    subprocess.run(['potrace', f'{tmp}/p.pbm', '-s', '-o', f'{tmp}/p.svg', '-t', str(speckle), '-a', '1.0', '-O', '0.4', '--flat'], check=True)
    svg = open(f'{tmp}/p.svg').read()
    d = ' '.join(re.findall(r' d="([^"]+)"', svg)).replace('\n', ' ')
    if not d.strip(): return ''
    tx, ty, sx, sy = (float(v) for v in re.search(r'translate\(([-\d.]+),([-\d.]+)\)\s*scale\(([-\d.]+),([-\d.]+)\)', svg).groups())
    return bake(d, tx, ty, sx, sy)

def grey(v):
    c = int(round(inkv + v * (paper - inkv))); return '#%02x%02x%02x' % (c, c, c)
plates = [f'<g data-plate="0" data-role="paper" fill="{grey(1)}"><path d="M0 0H{W}V{H}H0z"/></g>']
for lv in levels:                                    # light, mid, dark screens: each covers every pixel at least that dark
    d = trace(tone <= lv, a.speckle * 4)
    mid = lv - 0.06                                  # the plate's own tone sits a little under its threshold
    if d: plates.append(f'<g data-plate="{len(plates)}" data-role="tone" data-cov="{1 - max(0.0, mid):.3f}" fill="{grey(max(0.0, mid))}"><path d="{d}"/></g>')
d = trace(line <= a.ink, a.speckle)
if d: plates.append(f'<g data-plate="{len(plates)}" data-role="ink" fill="{grey(0)}"><path d="{d}"/></g>')
dark_zone = np.asarray(Image.fromarray((tone < 0.55).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(9))) > 0
d = trace((line >= a.white) & dark_zone, a.speckle)   # white contours and highlights inside dark areas
if d: plates.append(f'<g data-plate="{len(plates)}" data-role="white" fill="{grey(1)}"><path d="{d}"/></g>')
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{"".join(plates)}</svg>'
os.makedirs(a.outdir, exist_ok=True)
js = f'window.ART=window.ART||{{}};window.ART[{json.dumps(a.name)}]={{w:{W},h:{H},svg:{json.dumps(svg)}}};\n'
open(os.path.join(a.outdir, a.name + '.js'), 'w').write(js)
print(a.name, f'{W}x{H}', len(plates), 'plates', round(len(js) / 1024), 'KB')
