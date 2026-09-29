# trace-all.py: trace every reference image into art/<name>.js with tools/trace.py, in parallel.
#   python tools/trace-all.py [name ...]
# Crops (x,y,w,h in source pixels) cut inside the panel borders the image model drew around some shots.
import subprocess, sys, os
from concurrent.futures import ThreadPoolExecutor

CROPS = {
    's09-album-portrait': '1520,320,2460,2460',
    's13-side-eye': '100,110,5300,2850',
    's25-thumbs-up': '230,230,5060,2630',
    's27-nodding': '330,110,4840,2850',
    's50-wide-eyes': '370,250,4760,2600',
    's54-chair-gift': '140,110,5250,2850',
    's38-ceiling': '40,40,5424,2992',
}
# sheets hold many small figures, so they keep more pixels; very busy frames trace smaller to stay under ~1.4 MB
WIDTH = {'char-me': '3600', 'char-oracle': '3600', 's06-desk-2am': '2400', 's33-judge': '2200', 's65-dawn': '2400'}
NAMES = ['char-me', 'char-oracle', 's05-eye-closed', 's05-eye-open', 's06-desk-2am', 's09-album-portrait', 's13-side-eye', 's18-listening',
         's24-glare', 's25-thumbs-up', 's27-nodding', 's33-judge', 's38-ceiling', 's50-wide-eyes', 's53-singing', 's54-chair-gift',
         's56-webcam', 's62-hero-thumbs-up', 's64-high-five', 's65-dawn', 's66-to-camera']
names = sys.argv[1:] or NAMES
py = sys.executable

def run(n):
    width = WIDTH.get(n, '3000')
    args = [py, 'tools/trace.py', f'refs/{n}.png', n, 'art', '--width', width, '--line-blur', '0.7', '--white', '0.62', '--ink', '0.22', '--levels', '0.84,0.62,0.40']
    if n in CROPS:
        args += ['--crop', CROPS[n]]
    r = subprocess.run(args, capture_output=True, text=True)
    return (r.stdout or r.stderr).strip()

with ThreadPoolExecutor(max(2, (os.cpu_count() or 4) // 2)) as ex:
    for line in ex.map(run, names):
        print(line)
