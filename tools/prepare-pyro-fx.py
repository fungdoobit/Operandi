#!/usr/bin/env python3
"""Cut the fire packs into strips for PYRO's boss-fight cards (Isaac 2026-10-24).

usage: prepare-pyro-fx.py <folder with the unzipped packs> site/assets/fx/pyro
 needs, inside the folder:
   "Magic Pack Fire files/sprites/{fire,fire_aura,flame-loop}/<name>N.png"   (Ansimuz Magic Pack Fire)
   "fire-animation-files/PNG/fire-animation.png"                              (Ansimuz Patreon pack; licence file next to it)
   "Explosions Pack 11/Assets/N/Sprites/frame-K.png"                          (Ansimuz Explosions Pack 11)
writes one horizontal strip per effect (frames side by side, same size) and fx.json {name: {n, w, h}}.
"""
import glob, json, os, re, shutil, sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
meta = {}
nat = lambda f: int(re.findall(r"(\d+)\.png$", f)[-1])

def strip(name, frames):
    w, h = frames[0].size
    s = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        s.paste(f.convert("RGBA"), (i * w, 0))
    s.save(os.path.join(out, name + ".png"))
    meta[name] = {"n": len(frames), "w": w, "h": h}

mp = os.path.join(src, "Magic Pack Fire files", "sprites")
for name, folder in [("fire", "fire"), ("aura", "fire_aura"), ("flame", "flame-loop")]:
    fs = sorted(glob.glob(os.path.join(mp, folder, "*.png")), key=nat)
    strip(name, [Image.open(f) for f in fs])
sheet = Image.open(os.path.join(src, "fire-animation-files", "PNG", "fire-animation.png")).convert("RGBA")
strip("swirl", [sheet.crop((i * 48, 0, i * 48 + 48, 64)) for i in range(sheet.width // 48)])   # 8 frames of 48 x 64
for k in range(1, 7):
    fs = sorted(glob.glob(os.path.join(src, "Explosions Pack 11", "Assets", str(k), "Sprites", "frame-*.png")), key=nat)
    strip(f"boom{k}", [Image.open(f) for f in fs])
json.dump(meta, open(os.path.join(out, "fx.json"), "w"), indent=1)
shutil.copy(os.path.join(src, "fire-animation-files", "patreon-license.txt"), os.path.join(out, "LICENSE-patreon.txt"))
print(meta)
