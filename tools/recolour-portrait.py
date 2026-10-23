# Restyle Kaela's portrait to match her sprites (PRD Addendum L, kaela_style.py): no horns,
# darker red hair, red eyes, brown leather coat. The portrait is painterly (thousands of
# colours), so it's done by region and hue rather than an exact palette:
#   horns  the dark shape on her head (top part of the picture) is painted over from the
#          surrounding hair, one ring of pixels at a time (or cleared where it sticks out)
#   hair   the large connected areas of pale, low-saturation colour (her skin highlights share
#          that colour but sit in small patches, so they're left alone); brightness kept, hue red
#   eyes   the saturated cyan iris -> red
#   coat   saturated blue -> leather brown, same brightness
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

# ---- horns: dark pixels in the top band, inside the head ----
hue, s, v = hsv(im)
on = im[..., 3] > 0
yy, xx = np.mgrid[0:H, 0:W]
horn = on & (yy < 125) & ~((s < 0.35) & (v > 0.5))   # up there it's only hair (pale) or horn
pale = on & (v >= 0.62) & (s < 0.5)
known = ~horn
filled = np.zeros_like(horn)
for _ in range(60):
    if not horn.any(): break
    nxt = horn.copy()
    for y, x in zip(*np.nonzero(horn)):
        ns = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and known[y + dy, x + dx]]
        if len(ns) < 3: continue
        clear = [p for p in ns if im[p][3] == 0]
        if len(clear) * 2 > len(ns): im[y, x, 3] = 0
        else:
            hairn = [im[p][:3] for p in ns if im[p][3] > 0]
            im[y, x, :3] = np.mean(hairn, 0); im[y, x, 3] = 255; filled[y, x] = True
        nxt[y, x] = False
    known |= horn & ~nxt; horn = nxt

# ---- hair, eyes, coat ----
hue, s, v = hsv(im)
on = im[..., 3] > 0
paleh = on & ((((hue > 195) & (hue < 300)) & (s < 0.5) & (v > 0.42)) | ((s < 0.07) & (v > 0.78)))
paleh[int(H * 0.68):] = False                      # the orb and her hand
seen = np.zeros_like(paleh); hair = np.zeros_like(paleh)
for y0, x0 in zip(*np.nonzero(paleh)):
    if seen[y0, x0]: continue
    comp, st = [], [(y0, x0)]; seen[y0, x0] = True
    while st:
        y, x = st.pop(); comp.append((y, x))
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            y2, x2 = y + dy, x + dx
            if 0 <= y2 < H and 0 <= x2 < W and paleh[y2, x2] and not seen[y2, x2]: seen[y2, x2] = True; st.append((y2, x2))
    if len(comp) >= 400:
        for y, x in comp: hair[y, x] = True
hair |= filled & on   # the painted-over horn is hair too
iris = on & (hue > 175) & (hue < 205) & (s > 0.6) & (v > 0.4)
coat = on & (hue > 215) & (hue < 265) & (s > 0.6) & ~hair
out = im.copy()
for y, x in zip(*np.nonzero(hair)):   # darker red (Isaac 2026-10-23)
    R, G, B = colorsys.hsv_to_rgb(0.99, min(1, 0.55 + s[y, x] * 1.2), v[y, x] * 0.72)
    out[y, x, :3] = (R * 255, G * 255, B * 255)
for y, x in zip(*np.nonzero(iris)):
    R, G, B = colorsys.hsv_to_rgb(0.985, 0.85, min(1, v[y, x] * 0.95))
    out[y, x, :3] = (R * 255, G * 255, B * 255)
for y, x in zip(*np.nonzero(coat)):   # leather: warm brown, a little lighter than the deep blue was
    R, G, B = colorsys.hsv_to_rgb(0.07, 0.55, min(1, 0.18 + v[y, x] * 0.45))
    out[y, x, :3] = (R * 255, G * 255, B * 255)
Image.fromarray(out.astype(np.uint8)).save(sys.argv[2])
print("hair", int(hair.sum()), "iris", int(iris.sum()), "coat", int(coat.sum()))
