"""NOVA's warp portal (Isaac 2026-10-23): his 4-colour portal sheet (8 x 3 frames of 64 px:
row 0 the open portal swirling, row 1 opening from a slit, row 2 closing) made twice as big
with Scale2x, so it keeps 1-px detail at NOVA's art-pixel size, recoloured to her magic
ramp (nova-px.js palette 4) with a 1-px dark outline like her own pixel pass.

  python3 tools/nova-portal.py site/assets/nova/portal-src.png site/assets/nova/portal.png
"""
import sys
import numpy as np
from PIL import Image

SRC = {(105, 73, 116): (79, 31, 152), (120, 83, 132): (120, 56, 208), (142, 106, 154): (160, 102, 240), (190, 171, 196): (243, 230, 255)}
OUTLINE = (30, 8, 62)

def scale2x(a):
    """EPX: each pixel becomes 2x2, rounding corners where neighbours agree."""
    h, w = a.shape[:2]
    out = np.zeros((h * 2, w * 2) + a.shape[2:], a.dtype)
    p = np.pad(a, ((1, 1), (1, 1)) + ((0, 0),) * (a.ndim - 2), mode="edge")
    eq = lambda x, y: np.all(x == y, axis=-1)
    P = p[1:-1, 1:-1]; A = p[:-2, 1:-1]; B = p[1:-1, 2:]; C = p[1:-1, :-2]; D = p[2:, 1:-1]
    def pick(cond, X): return np.where(cond[..., None], X, P)
    out[0::2, 0::2] = pick(eq(C, A) & ~eq(C, D) & ~eq(A, B), A)
    out[0::2, 1::2] = pick(eq(A, B) & ~eq(A, C) & ~eq(B, D), B)
    out[1::2, 0::2] = pick(eq(D, C) & ~eq(D, B) & ~eq(C, A), C)
    out[1::2, 1::2] = pick(eq(B, D) & ~eq(B, A) & ~eq(D, C), D)
    return out

im = np.array(Image.open(sys.argv[1]).convert("RGBA"))
im[im[..., 3] < 128] = 0
rgb = im.copy()
for s, d in SRC.items():
    m = np.all(im[..., :3] == s, axis=-1) & (im[..., 3] > 0)
    rgb[m, :3] = d
big = scale2x(rgb)
# 1-px outline round everything (per frame cell, so it never bleeds between frames)
a = big[..., 3] > 0
ring = np.zeros_like(a)
for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    ring |= np.roll(np.roll(a, dy, 0), dx, 1)
ring &= ~a
big[ring] = OUTLINE + (255,)
Image.fromarray(big).save(sys.argv[2])
print(big.shape)
