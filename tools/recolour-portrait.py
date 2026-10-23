# Restyle Kaela's portrait to match her sprites (PRD Addendum L, kaela_style.py): no horns,
# darker red hair, red eyes, brown leather coat. The portrait is painterly (many shades, 4x4
# blocks), so it's done by region and colour rather than an exact palette.
#   head   where the horn crossed the top of her head, the outline is set by hand (TOP below):
#          everything above it goes (the horn's tip and its stripes)
#   horn   the horn's pixels inside her hair, and the dark outline pixels it left there, are
#          painted over by cloning real hair from further along the strands (down and to the right)
#   hair   bright, cool-toned pixels: each one's brightness is mapped onto a red ramp from deep
#          maroon to pale coral, so the shine and the strands of the original survive
#   eyes   the cyan iris -> red, the pale lavender eye whites -> white; her face is never hair
#   coat   saturated blue -> leather brown
# Isaac 2026-10-23: earlier versions left the horn's tip, a horn-shaped patch and flat hair.
# usage: python3 -I recolour-portrait.py <in.png> <out.png>
import sys, colorsys, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).astype(float)
H, W = im.shape[:2]
yy, xx = np.mgrid[0:H, 0:W]
def hsv(img):
    rgb = img[..., :3] / 255; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2); c = mx - mn + 1e-6
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    return hue, s, mx
on = im[..., 3] > 0
hue, s, v = hsv(im)
R, B = im[..., 0], im[..., 2]
low = yy > H * 0.62   # her hand and the orb stay as they are
face = (xx >= 64) & (xx < 136) & (yy >= 172) & (yy < 232)   # her eye and cheek: never hair (Isaac: red eye whites, a "scar")
cool = on & ~low & ~face & (v > 0.5) & ((B >= R + 8) | ((s < 0.12) & (v > 0.8)))

# ---- the top of her head where the horn crossed it (x: the outline's y), set by hand ----
TOP = [(0, 96), (16, 86), (32, 76), (48, 66), (64, 56), (80, 46), (96, 40), (112, 39)]
top_y = np.interp(np.arange(W), [p[0] for p in TOP], [p[1] for p in TOP], right=-1)
above = on & (xx <= 112) & (yy < top_y[xx])
im[above, 3] = 0
on = im[..., 3] > 0

# ---- the horn inside her hair: a band along it, plus dark outline pixels it left behind ----
A, Bp = np.array([10.0, 18.0]), np.array([172.0, 112.0])
d = Bp - A; t = np.clip(((xx - A[0]) * d[0] + (yy - A[1]) * d[1]) / (d @ d), 0, 1)
dist = np.hypot(xx - (A[0] + t * d[0]), yy - (A[1] + t * d[1]))
band = dist < 22 + 46 * t
horn = on & band & (~cool | (v < 0.3))
horn |= on & (yy < 125) & (xx < 180) & (v < 0.55) & band   # leftover dark outline bits and the shadow the horn cast on her hair
hair = on & cool & ~horn
# clone: each horn pixel takes the pixel further along the strands (down-right), the first that's real hair
src = np.zeros(horn.shape + (3,))
for y, x in zip(*np.nonzero(horn)):
    for k in range(1, 12):
        y2, x2 = y + 7 * k, x + 13 * k
        if y2 >= H or x2 >= W: break
        if hair[y2, x2] and v[y2, x2] > 0.62: src[y, x] = im[y2, x2, :3]; break   # lit hair only (dark strand lines made stripes)
    else:
        src[y, x] = np.median(im[hair & (yy < 150)][:, :3], 0)
im[horn, :3] = src[horn]; im[horn, 3] = 255
hair |= horn

# ---- colours ----
hue, s, v = hsv(im)
on = im[..., 3] > 0
L = (0.3 * im[..., 0] + 0.59 * im[..., 1] + 0.11 * im[..., 2]) / 255
# her hair's red ramp, dark to light (darker red: Isaac 2026-10-23)
RAMP = np.array([(52, 8, 16), (98, 16, 28), (146, 28, 36), (180, 42, 44), (206, 66, 58), (226, 104, 88), (240, 146, 128)], float)   # the top is a soft coral, not pink-white
lo, hi = np.percentile(L[hair], 2), np.percentile(L[hair], 99.5)
# the shadow the horn cast on her hair makes no sense without it: there, dark hair is lifted to
# the hair's typical brightness
shadow = hair & (dist < 40 + 50 * t) & (yy < 135)
L = np.where(shadow, np.maximum(L, np.median(L[hair & ~shadow])), L)
k = np.clip((L - lo) / (hi - lo), 0, 1) ** 1.15 * (len(RAMP) - 1)
i0 = np.floor(k).astype(int).clip(0, len(RAMP) - 2); f = (k - i0)[..., None]
red = RAMP[i0] * (1 - f) + RAMP[i0 + 1] * f
out = im.copy()
out[hair, :3] = red[hair]
eye = (xx >= 60) & (xx < 112) & (yy >= 170) & (yy < 200)
iris = on & eye & (hue > 150) & (hue < 215) & (s > 0.45) & (v > 0.1)   # the whole iris, dark teal too
whites = on & eye & ~iris & (B > R + 12) & (v > 0.6)                    # the pale lavender eye whites
out[whites, :3] = (236, 236, 244)
coat = on & (hue > 215) & (hue < 265) & (s > 0.6) & ~hair
for y, x in zip(*np.nonzero(iris)):
    R_, G_, B_ = colorsys.hsv_to_rgb(0.985, 0.85, min(1, 0.25 + v[y, x] * 0.8)); out[y, x, :3] = (R_ * 255, G_ * 255, B_ * 255)
for y, x in zip(*np.nonzero(coat)):   # leather: warm brown
    R_, G_, B_ = colorsys.hsv_to_rgb(0.07, 0.55, min(1, 0.18 + v[y, x] * 0.45)); out[y, x, :3] = (R_ * 255, G_ * 255, B_ * 255)
Image.fromarray(out.astype(np.uint8)).save(sys.argv[2])
print("hair", int(hair.sum()), "horn", int(horn.sum()), "cut above the head", int(above.sum()))
