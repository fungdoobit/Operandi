// THE ABYSSAL MAW's arena (Isaac 2026-10-24: "mix Castle Road and Overgrown Ruins"). The whole Overgrown Ruins scene is painted
// first (golden-hour sky, clouds, hills, the ruined colonnade, the oak, the meadow and its animated pollen and butterflies), then
// the Castle Road art goes over it, warmed to the sunset: its snowy mountains as hazy far hills and its foreground (the old
// tower, the stairs, the rocks and the stone road) on the right, behind the Maw. Its left edge fades into the ruins with dithering.
import { Scene as RuinsScene } from "./grassland.js";

const LAYERS = {};
const live = new Set();
for (const name of ["mountains", "foreground"]) {
  const im = new Image();
  im.onload = () => {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0);
    LAYERS[name] = { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data };
    if (LAYERS.mountains && LAYERS.foreground) for (const s of live) { s.wa = 0; s.resize(); }   // repaint once the art has loaded
  };
  im.src = new URL("../../../assets/maw-arena/" + name + ".png", import.meta.url).href;
}
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export class Scene extends RuinsScene {
  constructor(stage) { super(stage); live.add(this); }
  paint(p) {
    super.paint(p);
    const { W, H, put, bay, mix } = p;
    if (!LAYERS.mountains || !LAYERS.foreground) return;
    const WARM = [255, 168, 112], HAZE = [226, 150, 124];
    const lay = (L, grade, fade) => {
      const ox = W - L.w, oy = H - L.h;
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const o = (y * L.w + x) * 4; if (L.d[o + 3] < 128) continue;
        const X = ox + x; if (X < 0 || X >= W) continue;
        if (fade && clamp((x - 4) / fade) <= bay(X & 255, (y + oy) & 255)) continue;   // dithered fade into the ruins
        put(X, y + oy, grade([L.d[o], L.d[o + 1], L.d[o + 2]], y / L.h));
      }
    };
    lay(LAYERS.mountains, (c) => mix(mix(c, HAZE, 0.42), WARM, 0.12).map((v) => Math.round(v * 0.96)), 110);
    lay(LAYERS.foreground, (c) => mix(c, WARM, 0.26).map((v) => Math.round(v * 0.9)), 90);
  }
}
