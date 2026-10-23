"""PYRO's flame (Isaac 2026-10-23): the burning part of Ansimuz's Magic Pack Fire "flame-loop"
(frames 9-22 of 31: after it ignites, before it dies to smoke) as one strip, plus a Scale2x
copy (twice the art pixels, same shapes) for a finer pixel size. Also writes each frame's
anchor: the middle of the flame's round bottom (the bulb DOT sits in).

  python3 -I tools/pyro-flame.py "<Magic Pack Fire files>/sprites/flame-loop" site/assets/pyro
"""
import sys, re, glob, json, os
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(os.path.join(src, "*.png")), key=lambda f: int(re.findall(r"(\d+)\.png$", f)[0]))[8:22]
frames = [np.array(Image.open(f).convert("RGBA")) for f in fs]
h, w = frames[0].shape[:2]

def scale2x(a):
    p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
    eq = lambda x, y: np.all(x == y, axis=-1)
    P = p[1:-1, 1:-1]; A = p[:-2, 1:-1]; B = p[1:-1, 2:]; C = p[1:-1, :-2]; D = p[2:, 1:-1]
    o = np.zeros((a.shape[0] * 2, a.shape[1] * 2, 4), a.dtype)
    pick = lambda c, X: np.where(c[..., None], X, P)
    o[0::2, 0::2] = pick(eq(C, A) & ~eq(C, D) & ~eq(A, B), A)
    o[0::2, 1::2] = pick(eq(A, B) & ~eq(A, C) & ~eq(B, D), B)
    o[1::2, 0::2] = pick(eq(D, C) & ~eq(D, B) & ~eq(C, A), C)
    o[1::2, 1::2] = pick(eq(B, D) & ~eq(B, A) & ~eq(D, C), D)
    return o

anchors, eyes = [], []
for f in frames:
    ys, xs = np.nonzero(f[..., 3] > 0)
    bottom = ys.max()
    bulb = xs[(ys >= bottom - 30) & (ys <= bottom - 6)]   # the round part, not the thin tail under it
    anchors.append([float(bulb.mean()), int(bottom)])
    # where the eyes go: the centre of the biggest circle that fits inside the flame, in its
    # lower part (the big round body), found with a distance transform
    a = f[..., 3] > 0
    D = np.where(a, 1e4, 0.0)
    for _ in range(2):
        for y in range(h):
            for x in range(w):
                if D[y, x]: D[y, x] = min(D[y, x], (D[y, x - 1] if x else 0) + 1, (D[y - 1, x] if y else 0) + 1, (D[y - 1, x - 1] if x and y else 0) + 1.41, (D[y - 1, x + 1] if y and x < w - 1 else 0) + 1.41)
        for y in range(h - 1, -1, -1):
            for x in range(w - 1, -1, -1):
                if D[y, x]: D[y, x] = min(D[y, x], (D[y, x + 1] if x < w - 1 else 0) + 1, (D[y + 1, x] if y < h - 1 else 0) + 1, (D[y + 1, x + 1] if x < w - 1 and y < h - 1 else 0) + 1.41, (D[y + 1, x - 1] if y < h - 1 and x else 0) + 1.41)
    D[: int(h * 0.4)] = 0
    y0, x0 = np.unravel_index(np.argmax(D), D.shape)
    eyes.append([float(x0), float(y0), float(D[y0, x0])])
Image.fromarray(np.concatenate(frames, axis=1)).save(os.path.join(out, "flame.png"))
Image.fromarray(np.concatenate([scale2x(f) for f in frames], axis=1)).save(os.path.join(out, "flame-2x.png"))
# smooth the eye spot over neighbouring frames (it loops), so the face glides instead of jumping
n = len(eyes)
eyes = [[round(sum(eyes[(i + k) % n][j] for k in (-1, 0, 1)) / 3, 2) for j in range(3)] for i in range(n)]
json.dump({"w": w, "h": h, "n": len(frames), "anchors": anchors, "eyes": eyes}, open(os.path.join(out, "flame.json"), "w"))
print(len(frames), w, h, anchors[:3])
