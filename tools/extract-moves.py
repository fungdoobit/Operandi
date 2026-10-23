# Cut one of Kaela's moves out of the creator's footage into a native-size sprite sheet
# (PRD Addendum L). Sources:
#   gif:<file>:<scale>   an animated GIF, an exact whole-number enlargement of the game
#                        (lossless, so her pixels come back exactly)
#   video:<dir>          frames of a motion-test video (854x480 = the 640x360 game at 1.333x;
#                        lossy, so colours are snapped to her palette afterwards)
# usage: python3 -I extract-moves.py <source> <first> <last> <name> <outdir> [--hits 3,9] [--travel]
# Out: <name>.png (frames side by side, facing LEFT as in the source) and <name>.json:
#   fw, fh, n, ms (per-frame duration), hits (frames where it lands), hitx (how far in front
#   of her it lands, px, negative = in front), dark (frames where the screen is dimmed), anchor.
# By default her body is held in place (the source's sideways travel is cancelled) so she
# doesn't wander about the stage; --travel keeps it (a lunge that should cover ground).
import sys, json, os, glob, numpy as np
from PIL import Image, ImageSequence

args = sys.argv[1:]
opt = lambda k: args[args.index(k) + 1] if k in args else None
src, f0, f1, name, out = args[0], int(args[1]), int(args[2]), args[3], args[4]
travel = "--travel" in args
force_hits = [int(h) for h in opt("--hits").split(",")] if opt("--hits") else None
HERE = os.path.dirname(os.path.abspath(__file__))

# ---- read native-size RGB frames and their durations ----
def native_gif(path, s):
    im = Image.open(path); fr, ms = [], []
    for i, f in enumerate(ImageSequence.Iterator(im)):
        a = np.asarray(f.convert("RGB")).astype(int); fr.append(a); ms.append(f.info.get("duration", 60))
    # find the pixel grid's phase: the offset where s x s blocks are flat
    a = fr[0]; best = None
    for oy in range(s):
        for ox in range(s):
            b = a[oy:oy + (a.shape[0] - oy) // s * s, ox:ox + (a.shape[1] - ox) // s * s]
            err = np.abs(b[:, 1:] - b[:, :-1])[:, [i for i in range(b.shape[1] - 1) if (i + 1) % s]].mean()
            if best is None or err < best[0]: best = (err, ox, oy)
    _, ox, oy = best
    return [f[oy + s // 2::s, ox + s // 2::s] for f in fr], ms
def native_video(d):
    W, H = 640, 360
    xs = np.minimum(853, np.floor((np.arange(W) + 0.5) * 854 / W).astype(int))
    ys = np.minimum(479, np.floor((np.arange(H) + 0.5) * 480 / H).astype(int))
    fs = sorted(glob.glob(f"{d}/*.png"))
    return [np.asarray(Image.open(f).convert("RGB")).astype(int)[ys][:, xs] for f in fs], [33] * len(fs)
def native_vid(d, s, fps):
    # frames of a clip that is an exact s-times enlargement (lossy): find the grid phase on the
    # first frame (the offset where s x s blocks are flattest), then read each block's centre
    fs = sorted(glob.glob(f"{d}/*.png"))
    a = np.asarray(Image.open(fs[0]).convert("RGB")).astype(int); best = None
    for oy in range(s):
        for ox in range(s):
            b = a[oy:oy + (a.shape[0] - oy) // s * s, ox:ox + (a.shape[1] - ox) // s * s]
            bl = b.reshape(b.shape[0] // s, s, b.shape[1] // s, s, 3)
            err = np.abs(bl - bl.mean(axis=(1, 3), keepdims=True)).mean()
            if best is None or err < best[0]: best = (err, ox, oy)
    _, ox, oy = best
    return [np.asarray(Image.open(f).convert("RGB")).astype(int)[oy + s // 2::s, ox + s // 2::s] for f in fs], [round(1000 / fps)] * len(fs)
kind = src.split(":")[0]
if kind == "gif": frames, ms = native_gif(src.split(":")[1], int(src.split(":")[2]))
elif kind == "vid": frames, ms = native_vid(src.split(":")[1], int(src.split(":")[2]), float(src.split(":")[3]))
else: frames, ms = native_video(src.split(":", 1)[1])
scene0 = frames[0]; sceneN = frames[-1]
frames, ms = frames[f0:f1 + 1], ms[f0:f1 + 1]
lossy = kind in ("video", "vid")

# ---- background, dark screen, floor ----
BG = tuple(int(v) for v in frames[0][3, 3]); DARK = (41, 36, 31)
rows = (np.abs(frames[0] - np.array(BG)).sum(2) > 40).mean(1)
FLOOR = next(y for y in range(len(rows) // 2, len(rows)) if rows[y] > 0.5)

# gif: every colour of the background, floor tiles and her shadow (frame 0, below the floor
# line, minus her own palette) is keyed out; her feet can stand below the floor's top edge
HER = set()   # her own palette, from the creator's clean sample sheets (original colours)
for f in ("idle.png", "walk.png"):
    a = np.asarray(Image.open(f"{HERE}/../site/assets/kaela/{f}").convert("RGBA")); HER |= {tuple(int(x) for x in c) for c in a[a[..., 3] > 0][:, :3]}
pk = lambda c: c[0] * 65536 + c[1] * 256 + c[2]
KEY = np.array(sorted({pk(BG), pk(DARK)} | {pk(tuple(int(x) for x in c)) for c in frames[0][FLOOR:].reshape(-1, 3)} - {pk(c) for c in HER}))
HERK = np.array(sorted(pk(c) for c in HER))

# ---- Kaela's look ----
# her own colours go through kaela_style.restyle (darker red hair, red eyes, leather coat and
# boots, no horns); the effects (mint-green and lavender-blue, not in her palette) become reds
# by saturation/brightness; white effect cores stay white
sys.path.insert(0, HERE)
from kaela_style import restyle
RED = {"pale": (255, 196, 182), "light": (255, 120, 104), "mid": (224, 58, 52), "deep": (176, 34, 42), "dark": (122, 12, 38)}
REDS = np.array(list(RED.values()) + [(255, 255, 255)])
def recolour(rgba):
    if lossy: rgba = snap(rgba)
    out = rgba.copy()
    r, g, b = [rgba[..., i] / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    v, s = mx, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    c = mx - mn + 1e-6
    hue = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    code = rgba[..., 0].astype(np.int64) * 65536 + rgba[..., 1].astype(np.int64) * 256 + rgba[..., 2]
    fx = (rgba[..., 3] > 0) & ~np.isin(code, HERK)
    green = fx & (hue > 90) & (hue < 195) & (s > 0.12)
    blue = fx & (hue >= 195) & (hue < 300) & (v > 0.45) & (s > 0.08)
    sel = green | blue
    # pick the red by BRIGHTNESS, so the swing keeps the artist's shading: a bright core,
    # lighter fading edges and trails, darker undersides (by saturation, fading trails went dark)
    L = 0.3 * r + 0.59 * g + 0.11 * b
    ramp = [(0.86, RED["pale"]), (0.70, RED["light"]), (0.52, RED["mid"]), (0.36, RED["deep"]), (-1, RED["dark"])]
    left = sel.copy()
    for t, col in ramp:
        m = left & (L > t); out[m, 0], out[m, 1], out[m, 2] = col; left &= ~m
    return restyle(out)
PAL = None
def snap(rgba):   # video only: snap to her original palette plus effect colours, to strip compression noise
    global PAL
    if PAL is None:
        fxcols = {(255, 255, 255), (232, 232, 232), (200, 200, 204), (160, 160, 168), (110, 110, 120),
                  (120, 230, 190), (70, 200, 160), (40, 150, 130), (170, 240, 220), (150, 150, 255), (110, 110, 230), (80, 70, 200), (200, 200, 255)}
        PAL = np.array(sorted(HER | fxcols))
    on = rgba[..., 3] > 0; px = rgba[on][:, :3].astype(int)
    d = ((px[:, None, :] - PAL[None]) ** 2).sum(2); i = d.argmin(1); ok = d[np.arange(len(px)), i] < 70 ** 2
    px[ok] = PAL[i[ok]]; o = rgba.copy(); o[on, :3] = px
    return o
def is_fx(fr):
    px = fr[..., :3].astype(int)
    return (fr[..., 3] > 0) & ((((px[..., None, :] - REDS[None, None]) ** 2).sum(-1).min(-1)) < 30)

# vid: the scenery's colours are learned from the clip's first frame (every colour there that
# isn't hers); a pixel stays if it is nearer her palette than the scenery (and close to hers),
# or far from both (an effect: slash, spark)
if kind == "vid":
    HERA = np.array(sorted(HER)).astype(int)
    def nearest(cols, pal):
        d = np.full(len(cols), 1e9)
        for i in range(0, len(pal), 256):
            p = pal[i:i + 256]; d = np.minimum(d, ((cols[:, None, :] - p[None]) ** 2).sum(2).min(1))
        return np.sqrt(d)
    sc = np.unique(np.vstack([scene0.reshape(-1, 3), sceneN.reshape(-1, 3)]), axis=0)
    SCENE = sc[nearest(sc, HERA) > 26]
    for dc in ((41, 36, 31), (27, 26, 29), (30, 28, 30)): SCENE = np.vstack([SCENE, np.array(dc)])   # the dimmed screen
    # --dummy x0,x1: the training dummy stands between these columns of the first frame; it is
    # tracked as the camera pans (best sideways match of its shape) and erased wherever a pixel
    # still looks like the dummy, so only she (and effects) survive in front of it
    DUM = None
    if opt("--dummy"):
        dx0, dx1 = (int(v) for v in opt("--dummy").split(","))
        bg0 = np.array(scene0[3, 3])
        rows0 = (np.abs(scene0 - bg0).sum(2) > 40).mean(1)
        fl = next(y for y in range(len(rows0) // 2, len(rows0)) if rows0[y] > 0.5)
        m = np.zeros(scene0.shape[:2], bool); m[:fl + 6, dx0:dx1] = np.abs(scene0[:fl + 6, dx0:dx1] - bg0).sum(2) > 40
        ys, xs = np.nonzero(m); DUM = (ys, xs, scene0[ys, xs])
    def keep_vid(n):
        cols, inv = np.unique(n.reshape(-1, 3), axis=0, return_inverse=True)
        dh, ds = nearest(cols, HERA), nearest(cols, SCENE)
        keep = ((dh <= ds) & (dh < 45)) | ((dh > 45) & (ds > 30))
        keep = keep[inv.reshape(-1)].reshape(n.shape[:2])
        if DUM is not None:
            ys, xs, cv = DUM; W = n.shape[1]; best = None
            for dx in range(-160, 161):
                x2 = xs + dx; ok = (x2 >= 0) & (x2 < W)
                if ok.sum() < len(xs) * 0.6: continue
                err = np.abs(n[ys[ok], x2[ok]] - cv[ok]).sum(1); score = (err < 40).mean()
                if best is None or score > best[0]: best = (score, dx)
            if best and best[0] > 0.3:
                dx = best[1]; x2 = xs + dx; ok = (x2 >= 0) & (x2 < W)
                same = np.abs(n[ys[ok], x2[ok]] - cv[ok]).sum(1) < 60
                keep[ys[ok][same], x2[ok][same]] = False
        # drop lone specks (compression leftovers): kept pixels with fewer than 2 kept neighbours
        k = keep.astype(int); nb = np.zeros_like(k)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx: nb += np.roll(np.roll(k, dy, 0), dx, 1)
        return keep & (nb >= 2)

# ---- key, recolour, merge repeats ----
cut, darks = [], []
for n in frames:
    dark = bool(np.abs(n[3, 3] - np.array(DARK)).sum() < 20) or (kind == "vid" and n[3, 3].sum() < 200)
    if kind == "vid":   # scenery (background, floor, dummy) keyed by colour; see SCENE below
        alpha = keep_vid(n)
    elif lossy:   # video: key the flat background and the dark screen, cut at the floor line
        alpha = (np.abs(n - np.array(BG)).sum(2) > 36) & (np.abs(n - np.array(DARK)).sum(2) > 30)
        alpha[FLOOR:] = False
    else:       # gif: exact colours, so drop the background, floor and shadow colours wherever they are
        alpha = ~np.isin(n[..., 0] * 65536 + n[..., 1] * 256 + n[..., 2], KEY)
    rgba = np.zeros(n.shape[:2] + (4,), np.uint8); rgba[..., :3] = n; rgba[..., 3] = alpha * 255
    cut.append(recolour(rgba)); darks.append(dark)
keep, dur, dk = [], [], []
for fr, d, m in zip(cut, darks, ms):
    if keep and np.abs(fr.astype(int) - keep[-1].astype(int)).mean() < 0.6: dur[-1] += m; continue
    keep.append(fr); dur.append(m); dk.append(d)

# ---- hold her in place: shift each frame so her body (not the effects) stays put ----
def body_x(fr):
    m = (fr[..., 3] > 0) & ~is_fx(fr); _, xs = np.nonzero(m)
    return float(np.median(xs)) if len(xs) else None
bx = [body_x(f) for f in keep]
base = next(x for x in bx if x is not None)
shift = [0 if travel or x is None else int(round(base - x)) for x in bx]
# fill gaps (frames where she's hidden in the effect) from the neighbours
for i in range(len(shift)):
    if bx[i] is None and not travel: shift[i] = shift[i - 1] if i else 0
pad = max(abs(s) for s in shift) + 2
H, W = keep[0].shape[:2]
placed = []
for fr, s in zip(keep, shift):
    c = np.zeros((H, W + 2 * pad, 4), np.uint8); c[:, pad + s:pad + s + W] = fr; placed.append(c)
u = np.zeros(placed[0].shape[:2], bool)
for fr in placed: u |= fr[..., 3] > 0
yy, xx = np.nonzero(u)
x0, x1, y0, y1 = max(0, xx.min() - 2), xx.max() + 3, max(0, yy.min() - 2), (FLOOR if kind == "video" else yy.max() + 1)
fw, fh = int(x1 - x0), int(y1 - y0)
win = [f[y0:y1, x0:x1] for f in placed]
sheet = Image.new("RGBA", (fw * len(win), fh))
for j, fr in enumerate(win): sheet.paste(Image.fromarray(fr), (j * fw, 0))
os.makedirs(out, exist_ok=True)
sheet.save(f"{out}/{name}.png")

# ---- when and where it lands ----
cnt = [int(is_fx(f).sum()) for f in win]
top = max(cnt) or 1
hits = force_hits or [j for j in range(len(cnt)) if cnt[j] >= 0.45 * top and (j == 0 or cnt[j - 1] < 0.45 * top)]
ax = int(round(base + pad - x0))
def fxx(fr):
    _, xs = np.nonzero(is_fx(fr)); return int(np.median(xs)) - ax if len(xs) else 0
meta = {"fw": fw, "fh": fh, "n": len(win), "ms": dur, "hits": hits, "hitx": [fxx(win[h]) for h in hits],
        "dark": [i for i, v in enumerate(dk) if v], "anchor": [ax, fh]}
json.dump(meta, open(f"{out}/{name}.json", "w"))
print(name, fw, fh, len(win), sum(dur), "ms, hits", hits, meta["hitx"])
