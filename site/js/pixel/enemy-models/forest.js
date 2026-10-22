// Module 1's enemies, the Whispering Forest (PRD Addendum K). See enemy-px.js
// for what a model gives. All face left (-x), toward the teammate; the camera
// sits at -z, so -z is the side we see.

// ---- Rotcap: a corrupted mushroom ----
// A bloated violet cap with toxic green spots, a gnarled bone-pale stem with a
// jagged grin and slanted glowing eyes, root legs and two root arms. It head-
// butts with its cap and blows clouds of spores out of its gills.
export const mushroom = {
  name: "Rotcap", w: 200, h: 200, ground: 0, scale: 0.32, pitch: 0.12,
  palettes: [
    ["#120410", "#2a0a24", "#46123a", "#661c50", "#8a2c68", "#b44c86"],   // 1 cap
    ["#1e1712", "#3a2e24", "#5e4c3a", "#887056", "#b39a78", "#dccaa4"],   // 2 stem
    ["#0e2a08", "#2a5a10", "#4f9418", "#86d02a", "#c2f060", "#f2ffc0"],   // 3 toxic glow
    ["#0c0608", "#1a0e12", "#2a1820", "#3c2430", "#523442", "#6c4858"],   // 4 gills, mouth
    ["#120c08", "#24180e", "#3a2816", "#523a20", "#6e4e2c", "#8e683c"],   // 5 roots
  ],
  glow: ["#2a5a10", "#86d02a", "#e2ffa0", "#2a5a10", "#86d02a", "#e2ffa0"],
  anchors: {
    core: [0, 0.6, 0], weapon: (P) => [-0.42 - 0.25 * P.atk, 0.5, -0.12], muzzle: [-0.5, 0.9, 0],
    head: [-0.05, 1.15, 0], feet: [0, 0, 0],
  },
  idle: (t) => ({ bob: Math.sin(t * 2.4) * 0.015, lean: Math.sin(t * 1.3) * 0.03, walkT: t * 0.6 }),
  glsl: `
float map(vec3 p){
  float d = 1e5;
  // the whole body tips forward on the strike and back on the wind-up, pivoting at the feet
  vec3 q = p; q.xy = R(-.35*ATK + .22*WIND) * q.xy;
  // root legs, stepping
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s), ph = WALK*6.283 + fs*1.57;
    vec3 l = q - vec3(.04*sin(ph), 0., .14*fs);
    U(d, sdCapT(l, vec3(0., .26, 0.), vec3(-.06 + .05*sin(ph), .03, 0.), .1, .07), 5., l);
    U(d, sdCapT(l, vec3(-.06 + .05*sin(ph), .03, 0.), vec3(-.2 + .05*sin(ph), .02, -.03), .06, .02), 5., l);   // toe root
  }
  // gnarled stem with a jagged grin
  float stem = sdCapT(q, vec3(0., .22, 0.), vec3(-.05, .92, 0.), .3, .22);
  stem += .03*vnoise(q*11.) + .012*vnoise(q*30.);
  vec3 mq = q - vec3(-.27, .52, -.06);
  float zig = .025*abs(fract(mq.z*14.) - .5)*2.;
  float mouth = sdBox(mq, vec3(.12, .028 + .02*OPEN + zig, .15));
  float st = max(stem, -mouth);
  U(d, st, -mouth > stem - .004 ? 4. : 2., q);
  for (int i = 0; i < 4; i++) {   // little teeth along the top of the grin
    vec3 tq = mq - vec3(-.05, .03, -.11 + float(i)*.075);
    U(d, sdCapT(tq, vec3(0.), vec3(.0, -.05, 0.), .018, .0), 2., tq);
  }
  // slanted glowing eyes under the cap
  for (int s = -1; s <= 1; s += 2) {
    vec3 e = q - vec3(-.24, .74, -.05 + .11*float(s));
    float eye = length(e/vec3(.06, .045, .07))*.045 - .045;
    eye = max(eye, dot(e, normalize(vec3(.2, 1., -.6*float(s)))) - .004);   // cut on a slant: an angry look
    U(d, eye, 3., e); E(eye);
  }
  // root arms curling out of the stem
  for (int s = -1; s <= 1; s += 2) {
    float fs = float(s);
    vec3 a = q - vec3(-.05, .52, .22*fs);
    vec3 b = vec3(-.26 - .22*ATK + .12*WIND, -.1 + .12*ATK, .14*fs);
    U(d, sdCapT(a, vec3(0.), b, .06, .035), 5., a);
    U(d, sdCapT(a, b, b + vec3(-.12, .1 + .08*sin(T*3. + fs), .02*fs), .035, .01), 5., a);
  }
  // the cap: a bloated dome with a drooping rim and a dark gilled underside
  vec3 c = q - vec3(-.02, 1.1, 0.);
  c.xy = R(.26 - .35*WIND + .45*ATK) * c.xy;   // tipped back a little, so the face shows
  float br = .03*sin(T*2.4);
  float rr = length(c.xz);
  c.y += .1*smoothstep(.3, .66, rr) + .025*sin(atan(c.z, c.x)*7.);   // the rim droops and ripples
  float cap = (length(c/vec3(.66 + br, .42 + br, .62 + br)) - 1.)*.4;
  cap = max(cap, -c.y - .1);
  cap += .015*vnoise(c*9.);
  U(d, cap, c.y < -.075 ? 4. : 1., c);
  if (c.y < -.06 && cap < .05) G(cap + .03);   // the gills glow faintly
  return d;
}
float shadeOf(inout float m, vec3 p, vec3 n, vec3 lp, float sh){
  if (m == 1.) {   // toxic spots on the cap
    // corruption: glowing veins crawling over the cap, and a few swollen spots
    float v = abs(vnoise(lp*vec3(4., 7., 4.) + 3.) - .5) + abs(vnoise(lp*11. + 9.) - .5)*.3;
    float s = vnoise(lp*9. + 1.);
    if (v < .035 || s > .83) { m = 3.; return .6 + .4*sin(T*3. + lp.x*10.)*.5 + (s > .83 ? .3 : 0.); }
    return sh + .1*vnoise(lp*20.) - .08;
  }
  if (m == 4. && lp.y < -.07) return .15 + .2*abs(sin(atan(lp.z, lp.x)*22.));   // gill lines
  return sh;
}`,
};
