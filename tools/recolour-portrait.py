# Restyle Kaela's portrait to match her sprites (PRD Addendum L, kaela_style.py): no horns,
# darker red hair, red eyes, brown leather coat. The portrait is painterly (many shades, 4x4
# blocks), so it's done by region and colour rather than an exact palette:
#   horn   dark pixels in a band along the horn's diagonal (tip top-left to its root in the hair);
#          where it sticks out above her head it's erased, inside her hair it's painted over
#          with the hair round it (filled in from the edges, one ring at a time, with the most common
#          neighbouring hair colour)
#   hair   bright, cool-toned pixels (blue >= red) above her hand and the orb: brightness kept, hue red
#   eyes   the saturated cyan iris -> red
#   coat   saturated blue -> leather brown, same brightness
# Isaac 2026-10-23: the first version left the horn's tip and the white fringe.
# usage: python3 -I recolour-portrait.py <in.png> <out.png>
import sys, colorsys, numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).astype(float)
H, W = im.shape[:2]
def hsv(img):
    rgb = img[..., :3] / 255; r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(2), rgb.min(2); c = mx - mn + 1e-6
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.where(mx == r, ((g - b) / c) % 6, np.where(mx == g, (b - r) / c + 2, (r - g) / c + 4)) * 60
    return hue, s, mx
yy, xx = np.mgrid[0:H, 0:W]
on = im[..., 3] > 0
hue, s, v = hsv(im)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
low = yy > H * 0.62   # her hand and the orb: left as they are
# hair is clearly bluer than red (the horn's light mauve isn't) or near-white; only big connected
# areas (small cool patches on her face, like the mark under her eye, stay as they are)
cand = on & ~low & (v > 0.5) & ((B >= R + 8) | ((s < 0.12) & (v > 0.8)))
hairish = np.zeros_like(cand); seen = np.zeros_like(cand)
for y0, x0 in zip(*np.nonzero(cand)):
    if seen[y0, x0]: continue
    comp, st = [], [(y0, x0)]; seen[y0, x0] = True
    while st:
        y, x = st.pop(); comp.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            y2, x2 = y + dy, x + dx
            if 0 <= y2 < H and 0 <= x2 < W and cand[y2, x2] and not seen[y2, x2]: seen[y2, x2] = True; st.append((y2, x2))
    if len(comp) >= 120:
        for p in comp: hairish[p] = True
hairish |= cand & (yy < 150)   # thin strands round the top of her head (above her eye) are hair too

# ---- the horn: dark pixels near the segment from its tip to where it meets her hair ----
A, Bp = np.array([10.0, 18.0]), np.array([172.0, 112.0])
d = Bp - A; t = np.clip(((xx - A[0]) * d[0] + (yy - A[1]) * d[1]) / (d @ d), 0, 1)
dist = np.hypot(xx - (A[0] + t * d[0]), yy - (A[1] + t * d[1]))
horn = on & ~hairish & (dist < 18 + 38 * t)
# outside her head: the tip (top-left, where no hair is above or to the left of it)
head_rows = np.zeros(H, int) + W
for y in range(H):
    xs = np.nonzero(hairish[y])[0]
    if len(xs): head_rows[y] = xs.min()
outside = horn & (xx < head_rows[yy] - 2)
im[outside, 3] = 0
fill = horn & ~outside
known = on & ~horn
for _ in range(80):
    if not fill.any(): break
    nxt = fill.copy()
    for y, x in zip(*np.nonzero(fill)):
        ns = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and known[y + dy, x + dx] and hairish[y + dy, x + dx]]
        if len(ns) < 2: continue
        cs = [tuple(im[p][:3]) for p in ns]   # the most common neighbouring hair colour (an average smudged a horn-shaped shadow)
        im[y, x, :3] = max(set(cs), key=lambda c: (cs.count(c), sum(c))); im[y, x, 3] = 255
        hairish[y, x] = True; nxt[y, x] = False
    known |= fill & ~nxt; fill = nxt
im[fill, 3] = 0   # anything left over had no hair round it
# The hair right under the horn was painted in its shadow, so a fill from the edges carried that
# shadow and left a darker horn shape. The painted-over part gets the hair's typical colour around
# the top of her head instead (the median, lighter half).
filled = horn & ~outside & (im[..., 3] > 0)
top = hairish & ~horn & (yy < 150) & (im[..., 3] > 0)
vals = im[top][:, :3]; br = vals.sum(1)
im[filled, :3] = np.median(vals[br >= np.median(br)], 0)

# ---- hair, eyes, coat ----
hue, s, v = hsv(im)
on = im[..., 3] > 0
out = im.copy()
for y, x in zip(*np.nonzero(hairish & on)):   # darker red (Isaac 2026-10-23), brightness kept
    R_, G_, B_ = colorsys.hsv_to_rgb(0.99, 0.62 + 0.25 * (1 - v[y, x]), v[y, x] * 0.74)
    out[y, x, :3] = (R_ * 255, G_ * 255, B_ * 255)
iris = on & (hue > 175) & (hue < 205) & (s > 0.6) & (v > 0.4) & ~low
coat = on & (hue > 215) & (hue < 265) & (s > 0.6) & ~hairish
for y, x in zip(*np.nonzero(iris)):
    R_, G_, B_ = colorsys.hsv_to_rgb(0.985, 0.85, min(1, v[y, x] * 0.95)); out[y, x, :3] = (R_ * 255, G_ * 255, B_ * 255)
for y, x in zip(*np.nonzero(coat)):   # leather: warm brown
    R_, G_, B_ = colorsys.hsv_to_rgb(0.07, 0.55, min(1, 0.18 + v[y, x] * 0.45)); out[y, x, :3] = (R_ * 255, G_ * 255, B_ * 255)
Image.fromarray(out.astype(np.uint8)).save(sys.argv[2])
print("hair", int((hairish & on).sum()), "horn", int(horn.sum()), "erased", int(outside.sum()))
