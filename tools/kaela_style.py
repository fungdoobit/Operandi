# Kaela's look (PRD Addendum L), applied to every frame cut from the creator's art.
# Her sprites use one small fixed palette, so each part is restyled by exact colour:
#   hair      lavender -> darker red (Isaac 2026-10-23: "a bit darker")
#   eyes      green iris -> red; the pale-blue eye white -> white
#   coat      navy/blue -> brown leather;  boots  red -> dark brown leather
#   horns     removed: their pixels become hair where they sit on her hair, else see-through
# skin shading warm, sword steel; skin, gold trim keep their colours. Change a colour here and re-run the tools.
import numpy as np

HAIR = {"main": (150, 30, 36), "shade": (98, 16, 28), "light": (196, 58, 54), "shine": (226, 104, 92)}
STYLE = {
    # hair
    (178, 178, 255): HAIR["main"], (158, 160, 250): HAIR["shade"], (255, 255, 204): HAIR["shine"],
    # eyes: red iris, white whites
    (0, 127, 38): (196, 28, 42), (0, 110, 34): (120, 14, 30), (43, 122, 76): (196, 28, 42), (39, 113, 72): (120, 14, 30),
    (151, 192, 255): (255, 255, 255),
    # coat: brown leather (light side, base, folds, darkest)
    (3, 33, 188): (122, 84, 56), (28, 21, 77): (66, 44, 30), (64, 34, 95): (90, 60, 40), (21, 16, 55): (36, 24, 16), (50, 29, 112): (90, 60, 40),
    # warm skin shading (was purple), steel sword (was purple)
    (173, 95, 173): (182, 96, 82), (47, 24, 80): (58, 60, 70), (81, 55, 63): (120, 122, 132),
    # boots: dark brown leather
    (136, 35, 35): (78, 50, 32), (88, 3, 3): (44, 28, 18), (255, 14, 0): (118, 80, 52),
}
HORN = {(77, 47, 30), (169, 110, 103)}
HAIRSET = {HAIR["main"], HAIR["shade"], HAIR["light"], HAIR["shine"]}
pk = lambda c: (int(c[0]) << 16) | (int(c[1]) << 8) | int(c[2])
KEYS = np.array([pk(k) for k in STYLE]); VALS = np.array(list(STYLE.values()))
HORNK = np.array([pk(c) for c in HORN]); HAIRK = np.array([pk(c) for c in HAIRSET])

def restyle(rgba):
    """rgba: HxWx4 uint8 frame in her original colours (effects may be present). Returns a new array."""
    out = rgba.copy(); on = out[..., 3] > 0
    code = (out[..., 0].astype(np.int64) << 16) | (out[..., 1].astype(np.int64) << 8) | out[..., 2]
    horn = on & np.isin(code, HORNK)
    # the white on top of her hair (the shine): small white patches touching hair
    hairish = on & np.isin(code, KEYS[:3])
    white = on & (code == 0xFFFFFF)
    shine = np.zeros_like(white)
    h, w = white.shape; seen = np.zeros_like(white)
    for y0, x0 in zip(*np.nonzero(white)):
        if seen[y0, x0]: continue
        comp, st = [], [(y0, x0)]; seen[y0, x0] = True
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and white[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        if len(comp) > 170: continue
        ys, xs = zip(*comp)
        if hairish[max(0, min(ys) - 2):max(ys) + 3, max(0, min(xs) - 2):max(xs) + 3].sum() >= 4:
            for y, x in comp: shine[y, x] = True
    # exact colour swaps
    idx = np.searchsorted(KEYS[np.argsort(KEYS)], code)
    order = np.argsort(KEYS); sk = KEYS[order]; sv = VALS[order]
    idx = np.clip(np.searchsorted(sk, code), 0, len(sk) - 1)
    hit = on & (sk[idx] == code)
    out[hit, :3] = sv[idx[hit]]
    out[shine, :3] = HAIR["light"]
    # horns: hair where they cross her hair (two or more hair neighbours), otherwise gone
    for _ in range(3):
        code2 = (out[..., 0].astype(np.int64) << 16) | (out[..., 1].astype(np.int64) << 8) | out[..., 2]
        isHair = (out[..., 3] > 0) & np.isin(code2, HAIRK) & ~horn
        n = np.zeros(isHair.shape, int)
        n[1:] += isHair[:-1]; n[:-1] += isHair[1:]; n[:, 1:] += isHair[:, :-1]; n[:, :-1] += isHair[:, 1:]
        fill = horn & (n >= 2)
        out[fill, :3] = HAIR["main"]; horn &= ~fill
    out[horn, 3] = 0
    return out
