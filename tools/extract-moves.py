# Cut one move out of the creator's motion-test video into native-size RGBA frames.
# usage: python3 -I extract.py <video a|b|c> <first frame> <last frame> <name> <outdir>
import sys, json, numpy as np, os
from PIL import Image
k, f0, f1, name, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5]
DARK = (41, 36, 31)
BG = {'a': (145,126,107), 'b': (145,126,107), 'c': (173,152,132)}[k]
FLOOR = {'a': 306, 'b': 306, 'c': 268}[k]          # native y of the floor's top row
W, H = 640, 360
xs = np.minimum(853, np.floor((np.arange(W) + 0.5) * 854 / W).astype(int))
ys = np.minimum(479, np.floor((np.arange(H) + 0.5) * 480 / H).astype(int))
import colorsys
# Kaela is red: her lavender hair and the effects (mint-green and lavender-blue) become
# reds by brightness; her dark blue robe, skin, boots and white highlights stay.
RED = {'pale': (255, 196, 182), 'light': (255, 120, 104), 'mid': (224, 58, 52), 'deep': (176, 34, 42), 'dark': (122, 12, 38)}
def recolour(rgba):
    out = rgba.copy()
    hsv = np.zeros(rgba.shape[:2] + (3,))
    r, g, b = [rgba[..., i] / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    v, s = mx, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.zeros_like(v)
    c = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    on = rgba[..., 3] > 0
    green = on & (hue > 90) & (hue < 195) & (s > 0.12)
    blue = on & (hue >= 195) & (hue < 285) & (v > 0.55) & (s > 0.12) & (s < 0.85)
    sel = green | blue
    def put(mask, col): out[mask, 0], out[mask, 1], out[mask, 2] = col
    put(sel & (s < 0.3) & (v > 0.9) & green, RED['pale'])
    put(sel & (s < 0.45) & ~((s < 0.3) & (v > 0.9) & green), RED['mid'])
    put(sel & (s >= 0.45) & (s < 0.7), RED['deep'])
    put(sel & (s >= 0.7) & (v > 0.85), RED['light'])
    put(sel & (s >= 0.7) & (v <= 0.85), RED['dark'])
    # the white highlight on her hair: small white patches touching the (now red) hair
    white = on & (s < 0.12) & (v > 0.9)
    hair = sel & (s < 0.45)
    h, w = white.shape
    seen = np.zeros_like(white)
    for y0, x0 in zip(*np.nonzero(white)):
        if seen[y0, x0]: continue
        comp, stack = [], [(y0, x0)]; seen[y0, x0] = True
        while stack:
            y, x = stack.pop(); comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and white[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; stack.append((yy, xx))
        if len(comp) > 170: continue
        ys_, xs_ = zip(*comp)
        near = hair[max(0, min(ys_) - 2):max(ys_) + 3, max(0, min(xs_) - 2):max(xs_) + 3].sum()
        if near >= 4:
            for y, x in comp: out[y, x, :3] = RED['light']
    return snap(out)
# then snap every pixel to her real palette (from the clean sprite sheets, recoloured) plus the
# effect colours, which strips the video's compression noise
def _pal():
    cols = set()
    for f in ['merak/idle/sprite sheets/idle.png', 'merak/walk/sprite sheets/walk.png']:
        a = np.asarray(Image.open(f'{os.path.dirname(os.path.abspath(__file__))}/{f}').convert('RGBA'))
        for c in a[a[..., 3] > 0][:, :3]: cols.add(tuple(int(x) for x in c))
    hair = {(178, 178, 255): (224, 58, 52), (158, 160, 250): (176, 34, 42)}
    cols = {hair.get(c, c) for c in cols}
    cols |= set(RED.values()) | {(255, 255, 255), (232, 232, 232), (200, 200, 204), (160, 160, 168), (110, 110, 120)}
    return np.array(sorted(cols))
PAL = None
def snap(rgba):
    global PAL
    if PAL is None: PAL = _pal()
    on = rgba[..., 3] > 0
    px = rgba[on][:, :3].astype(int)
    d = ((px[:, None, :] - PAL[None, :, :]) ** 2).sum(2)
    i = d.argmin(1); ok = d[np.arange(len(px)), i] < 70 ** 2
    px[ok] = PAL[i[ok]]
    out = rgba.copy(); out[on, :3] = px
    return out
frames = []
for i in range(f0, f1 + 1):
    a = np.asarray(Image.open(f'{os.path.dirname(__file__)}/mv/full{k}/{i:04d}.png').convert('RGB')).astype(int)
    n = a[ys][:, xs]                                  # sample native pixel centres
    d = np.abs(n - np.array(BG)).sum(2)
    dark = bool(np.abs(n[5, 5] - np.array(DARK)).sum() < 20)    # the ultimate dims the screen
    alpha = (d > 36) & (np.abs(n - np.array(DARK)).sum(2) > 30)
    alpha[FLOOR:] = False                             # drop the floor
    rgba = np.zeros((H, W, 4), np.uint8); rgba[..., :3] = n; rgba[..., 3] = alpha * 255
    frames.append((recolour(rgba), dark))
# merge duplicate frames (the game animates slower than 30 fps), keeping their durations
keep, dur = [], []
darks = []
for fr, dk in frames:
    if keep and np.abs(fr.astype(int) - keep[-1].astype(int)).mean() < 0.6: dur[-1] += 1; continue
    keep.append(fr); dur.append(1); darks.append(dk)
# the window that holds the whole move
u = np.zeros((H, W), bool)
for fr in keep: u |= fr[..., 3] > 0
yy, xx = np.nonzero(u)
x0, x1, y0 = max(0, xx.min() - 2), min(W, xx.max() + 3), max(0, yy.min() - 2)
y1 = FLOOR
fw, fh = x1 - x0, y1 - y0
sheet = Image.new('RGBA', (fw * len(keep), fh))
for j, fr in enumerate(keep): sheet.paste(Image.fromarray(fr[y0:y1, x0:x1]), (j * fw, 0))
os.makedirs(out, exist_ok=True)
sheet.save(f'{out}/{name}.png')
# where she starts: the first frame's body centre (median of its pixels), relative to the window
f0a = keep[0][y0:y1, x0:x1, 3] > 0; cy, cx = np.nonzero(f0a)
# when it lands: frames where the red effect peaks (one entry per separate peak)
REDS = np.array(list(RED.values()) + [(255, 255, 255)])
def fxcount(fr):
    px = fr[fr[..., 3] > 0][:, :3].astype(int)
    return int((((px[:, None, :] - REDS[None]) ** 2).sum(2).min(1) < 30).sum()) if len(px) else 0
cnt = [fxcount(fr[y0:y1, x0:x1]) for fr in keep]
top = max(cnt) or 1
hits = [j for j in range(len(cnt)) if cnt[j] >= 0.45 * top and (j == 0 or cnt[j - 1] < 0.45 * top)]
if len(sys.argv) > 6: hits = [int(h) for h in sys.argv[6].split(',')]
def fxx(fr):   # where the effect is, sideways, relative to her start (source faces left: negative = in front)
    a = fr[..., 3] > 0; px = fr[..., :3].astype(int)
    m = a & ((((px[..., None, :] - REDS[None, None]) ** 2).sum(-1).min(-1)) < 30)
    yy, xx = np.nonzero(m)
    return int(np.median(xx)) if len(xx) else None
f0a = keep[0][y0:y1, x0:x1, 3] > 0; cy, cx = np.nonzero(f0a)
ax = int(np.median(cx))
hitx = [(fxx(keep[h][y0:y1, x0:x1]) or ax) - ax for h in hits]
meta = {'hits': hits, 'hitx': hitx, 'fw': int(fw), 'fh': int(fh), 'n': len(keep), 'ms': [round(d * 1000 / 30) for d in dur], 'dark': [i for i, v in enumerate(darks) if v], 'anchor': [int(np.median(cx)), int(fh)]}
json.dump(meta, open(f'{out}/{name}.json', 'w'))
print(name, meta['fw'], meta['fh'], meta['n'], sum(meta['ms']), 'ms')
