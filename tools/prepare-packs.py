# Turn the unzipped art packs Isaac sent (2026-10-23) into what the site loads (PRD Addendum L):
#   site/assets/fx/<id>.png + .json        effect strips, recoloured to Kaela's red ramp by brightness
#   site/assets/bg/forest/{back,middle,front}.png   the Green Forest parallax layers
#   site/assets/enemies/<id>.png + .json   enemy strips: one row per animation, plus facing and footing
# usage: python3 -I prepare-packs.py <folder holding the unzipped packs> <site/assets>
import sys, os, re, json, shutil, numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
def find(*parts):   # the first folder under src whose path ends with these parts
    for root, ds, fs in os.walk(src):
        if "__MACOSX" in root: continue
        if root.replace("\\", "/").endswith("/".join(parts)): return root
    raise SystemExit("missing " + "/".join(parts))
def frames(d, prefix=""):
    fs = [f for f in os.listdir(d) if f.lower().endswith(".png") and f.startswith(prefix)]
    fs.sort(key=lambda f: [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", f)])
    return [np.asarray(Image.open(os.path.join(d, f)).convert("RGBA")) for f in fs]

# Kaela's red ramp (same as tools/extract-moves.py): pick the red by brightness, keep near-whites
# (thresholds set higher than extract-moves.py's: these packs' yellows and cyans are very bright and came out pale pink)
RED = [(0.93, (255, 196, 182)), (0.80, (255, 120, 104)), (0.58, (224, 58, 52)), (0.38, (176, 34, 42)), (-1, (122, 12, 38))]
def redden(a):
    a = a.copy(); px = a[..., :3].astype(float) / 255
    L = 0.3 * px[..., 0] + 0.59 * px[..., 1] + 0.11 * px[..., 2]
    on = a[..., 3] > 0; white = on & (px.min(-1) > 0.93); left = on & ~white
    for t, c in RED:
        m = left & (L > t); a[m, :3] = c; left &= ~m
    return a
def strip(fs):
    h, w = fs[0].shape[:2]; out = np.zeros((h, w * len(fs), 4), np.uint8)
    for i, f in enumerate(fs): out[:, i * w:(i + 1) * w] = f
    return out
def save(img, path, meta=None):
    Image.fromarray(img).save(path + ".png")
    if meta is not None: json.dump(meta, open(path + ".json", "w"))

# ---- effects ----
mp = "Magic Pack 4 files/sprites"
FX = {   # id: (frames, red?, ms per frame)
    "orb": (frames(find(mp, "Sparks/Sprites")), True, 50),            # gathers, swells into an orb, bursts
    "orb-raw": (frames(find(mp, "Sparks/Sprites")), False, 50),       # the same in its own colours (the mages' spell)
    "burst": (frames(find(mp, "Radial Explosion/sprites")), True, 45),
    "burst-raw": (frames(find(mp, "Radial Explosion/sprites")), False, 45),
    "wisp": (frames(find(mp, "wisp/sprites")), False, 40),            # magenta flare (the warlock's spell)
    "slash": (frames(find("slash", "slash")), True, 35),              # a clean crescent slash
}
os.makedirs(f"{dst}/fx", exist_ok=True)
for k, (fs, red, ms) in FX.items():
    fs = [redden(f) if red else f for f in fs]
    save(strip(fs), f"{dst}/fx/{k}", {"fw": fs[0].shape[1], "fh": fs[0].shape[0], "n": len(fs), "ms": ms})

# ---- the forest (parallax layers, 368x208) ----
os.makedirs(f"{dst}/bg/forest", exist_ok=True)
L = find("Green Forest", "Layers")
for k in ("back", "middle", "front"): shutil.copy(f"{L}/{k}1.png", f"{dst}/bg/forest/{k}.png")

# ---- enemies: rows of frames, all padded to one frame size ----
# Isaac 2026-10-23: only enemies about Kaela's height (55 px) or bigger; the small ones (ghost,
# zombie, firebat, skull, warlock, biceraptor, eye, shell) are left out.
def unshadow(f):   # Monster Pack sprites carry a drawn pure-black ellipse under their feet (the page draws its own):
    f = f.copy(); H, W = f.shape[:2]   # remove a flat, wide pure-black blob near the bottom, nothing else
    blk = (f[..., 3] > 0) & (f[..., :3].max(-1) == 0); seen = np.zeros_like(blk)
    for y0, x0 in zip(*np.nonzero(blk)):
        if seen[y0, x0]: continue
        comp, st = [], [(y0, x0)]; seen[y0, x0] = True
        while st:
            y, x = st.pop(); comp.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and blk[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; st.append((yy, xx))
        ys = [p[0] for p in comp]; xs = [p[1] for p in comp]
        if max(ys) >= H - 12 and max(ys) - min(ys) <= 16 and max(xs) - min(xs) >= 20:
            for y, x in comp: f[y, x, 3] = 0
    return f
g3, g4, g5, mp_ = "Gothicvania enemies pack 3 files", "Gothicvania Enemies Pack 4", "Enemies Pack 5 Files/sprites", "Monster Pack Files/Characters/Sprites"
def pick(fs, idx): return [fs[i] for i in idx]
jd, wolf, garg = frames(find(mp_, "Jumping-Demon")), frames(find(g4, "Ghost Wolf/energized")), frames(find(g4, "Gargoyle/gargoyle"))
EN = {   # id: ({row: frames}, faces right in the art?, flies?, ms). An "attack" row, where there is one, plays during its lunge.
    "flame": ({"idle": frames(find(g3, "Flame/sprites"))}, True, False, 110),
    "mage": ({"idle": frames(find(g5, "Mage"))}, False, False, 120),
    "mage-b": ({"idle": frames(find(g5, "Mage-B"))}, False, False, 120),
    "red-demon": ({"idle": [unshadow(f) for f in frames(find(mp_, "Demon"))]}, False, False, 140),
    "fireshaunt": ({"idle": [unshadow(f) for f in frames(find(mp_, "Fireshaunt"))]}, True, False, 120),
    "jumper": ({"idle": [unshadow(f) for f in pick(jd, [0, 1])], "attack": [unshadow(f) for f in jd]}, False, False, 160),   # crouch, leap, land
    "treant": ({"idle": [unshadow(f) for f in frames(find(mp_, "Treant"))]}, False, False, 150),
    "vampire": ({"idle": [unshadow(f) for f in frames(find(mp_, "Vampire"))]}, False, False, 140),
    "witch": ({"idle": [unshadow(f) for f in frames(find(mp_, "Witch"))]}, True, True, 120),
    "fire-skull": ({"idle": frames(find(g4, "Flames/flames"))}, False, True, 90),
    "gargoyle": ({"idle": pick(garg, [1, 2, 3, 4, 5]), "attack": pick(garg, [6, 6, 3, 4])}, False, True, 110),   # flaps; wings spread, then the swoop
    "wolf": ({"idle": pick(wolf, [0, 1, 2, 3]), "attack": pick(wolf, [4, 5, 6, 7, 8, 9])}, False, False, 100),       # stands; the pounce
}
os.makedirs(f"{dst}/enemies", exist_ok=True)
for k, (rows, right, fly, ms) in EN.items():
    fw = max(f.shape[1] for r in rows.values() for f in r); fh = max(f.shape[0] for r in rows.values() for f in r)
    n = max(len(r) for r in rows.values()); out = np.zeros((fh * len(rows), fw * n, 4), np.uint8); meta = {"fw": fw, "fh": fh, "rows": {}, "right": right, "fly": fly, "ms": ms}
    for ri, (name, fs) in enumerate(rows.items()):
        for i, f in enumerate(fs):   # bottom-centred in the cell
            h, w = f.shape[:2]; y = ri * fh + fh - h; x = i * fw + (fw - w) // 2
            out[y:y + h, x:x + w] = f
        meta["rows"][name] = [ri, len(fs)]
    save(out, f"{dst}/enemies/{k}", meta)
json.dump(list(EN), open(f"{dst}/enemies/list.json", "w"))
print("fx", list(FX), "enemies", list(EN))
