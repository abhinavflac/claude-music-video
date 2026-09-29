# compare-timing.py: score candidate timings against onsets in the vocal stem, line by line.
#   python tools/compare-timing.py song/timing-draft.json song/timing-aligned.json [more.json ...] [--json align/compare.json]
# For each line and candidate:
#   onset  mean over words of how well the word start sits on a spectral-flux peak (1 = on the local peak)
#   lead   seconds the line start comes before the first voiced frame near it (> 0.05 means captions lead the voice)
#   late   seconds the line start comes after that voiced frame
#   short  words shorter than 0.06 s (squeezed or guessed)
import json, subprocess, sys
import numpy as np

args = [a for a in sys.argv[1:]]
out_json = None
if '--json' in args:
    i = args.index('--json'); out_json = args[i + 1]; del args[i:i + 2]
files = args
SR, HOP, NFFT = 16000, 160, 1024
pcm = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'song/vocals.wav', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                                   capture_output=True, check=True).stdout, np.int16).astype(np.float32) / 32768
n = 1 + (len(pcm) - NFFT) // HOP
idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
frames = pcm[idx] * np.hanning(NFFT)[None, :].astype(np.float32)
S = np.abs(np.fft.rfft(frames, axis=1))
f = np.fft.rfftfreq(NFFT, 1 / SR)
band = (f > 150) & (f < 7000)
logS = np.log1p(100 * S[:, band])
flux = np.maximum(0, np.diff(logS, axis=0, prepend=logS[:1])).sum(1)
rms = 20 * np.log10(np.sqrt((frames ** 2).mean(1)) + 1e-9)
T = (np.arange(n) * HOP + NFFT / 2) / SR
fr = lambda t: int(np.clip(round((t - NFFT / 2 / SR) * SR / HOP), 0, n - 1))
peak = np.percentile(rms, 99)
voiced = rms > peak - 30  # within 30 dB of the vocal's loud level

def onset_score(t):
    a, b = fr(t - 0.03), fr(t + 0.06)
    A, B = fr(t - 0.3), fr(t + 0.3)
    loc = flux[A:B + 1].max() + 1e-9
    return float(flux[a:b + 1].max() / loc)

def voice_onset(t, prev_end):
    # the first voiced frame after the last unvoiced stretch before t + 0.4 (searching back to the previous line's end)
    lo = fr(max(prev_end - 0.05, t - 1.2)) if prev_end is not None else fr(t - 1.2)
    hi = fr(t + 0.4)
    v = voiced[lo:hi + 1]
    if not v.any():
        return None
    # the start of the voiced run that contains or follows t - 0.4 .. the first run that begins after lo
    k = int(np.argmax(v))
    return float(T[lo + k])

lyr = json.load(open('song/lyrics.json', encoding='utf8'))
cands = [json.load(open(p, encoding='utf8'))['lines'] for p in files]
names = [p.split('/')[-1].replace('timing-', '').replace('.json', '') for p in files]
rows = {}
print(f"{'id':8} " + '  '.join(f"{nm[:10]:>10} {'onset':>5} {'lead':>5} {'late':>5} sh" for nm in names))
prev_ends = [None] * len(files)
for l in lyr:
    cells, row = [], {}
    for c, (C, nm) in enumerate(zip(cands, names)):
        L = C.get(l['id'])
        if not L:
            cells.append(f"{'-':>10} {'':>5} {'':>5} {'':>5}   "); continue
        ons = np.mean([onset_score(w['t']) for w in L['words']])
        vo = voice_onset(L['t'], prev_ends[c])
        lead = max(0.0, (vo - L['t'])) if vo is not None else 0.0
        late = max(0.0, (L['t'] - vo)) if vo is not None else 0.0
        short = sum(1 for w in L['words'] if w['end'] - w['t'] < 0.06)
        row[nm] = {'t': L['t'], 'onset': round(float(ons), 3), 'lead': round(lead, 3), 'late': round(late, 3), 'short': short, 'voice_onset': vo}
        cells.append(f"{L['t']:10.2f} {ons:5.2f} {lead:5.2f} {late:5.2f} {short:2d}")
        prev_ends[c] = L['end']
    rows[l['id']] = row
    print(f"{l['id']:8} " + '  '.join(cells))
if out_json:
    json.dump(rows, open(out_json, 'w'), indent=1)
