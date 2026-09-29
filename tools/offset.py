# offset.py: python tools/offset.py [start 30] [length 30]   must print "offset 0.0 ms"
import subprocess, sys, numpy as np
start, length = (float(v) for v in (sys.argv[1:] + ['30', '30'][len(sys.argv[1:]):])[:2])
def pcm(f): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(start), '-t', str(length), '-i', f, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout, np.int16).astype(float)
a, b = pcm('song/song.wav'), pcm('song/vocals.wav')
if min(len(a), len(b)) < 16000 * length * 0.9: sys.exit(f'the audio ends before {start + length:.0f} s: pass an earlier start or a shorter length')
n = len(a) + len(b)
x = np.fft.irfft(np.fft.rfft(a, n) * np.conj(np.fft.rfft(b, n)), n)
lag = int(np.argmax(x)); lag = lag - n if lag > n // 2 else lag
print(f'stem is {-lag / 16:.1f} ms late' if lag else 'offset 0.0 ms')
