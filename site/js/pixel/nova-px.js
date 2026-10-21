// NOVA in hi-bit pixel art (same renderer as GOLEM). A living shadow with
// blank glowing eyes, wrapped in a dithered purple magic haze. Three body
// shapes are on trial (Isaac picks one):
//   0 "flame"   - a shadow head crowned with flame horns; the body thins into smoke
//   1 "eclipse" - a shadow teardrop in front of a burning eclipse corona; the tail crumbles to dust
//   2 "wraith"  - a hooded shadow with a ragged void cape and obsidian shards in orbit
import { PixelGL } from "./pixel-gl.js";

// Materials: 1 shadow, 2 void (deeper shadow), 3 eyes, 4 magic (purple fire), 5 obsidian,
// 6 red (a planet, bucket stripes), 7 cream (a planet, popcorn), 8 grey stone (his dust ring).
const PALETTES = [
  ["#06040a", "#0d0917", "#171028", "#24183c", "#382558", "#583a88"],
  ["#020104", "#05030a", "#0a0614", "#120a21", "#1c1031", "#2a1846"],
  ["#8f86b8", "#b8b0dc", "#d8d2f0", "#ece8fa", "#f8f6ff", "#ffffff"],
  ["#2e0f5c", "#4f1f98", "#7838d0", "#a066f0", "#cba2ff", "#f3e6ff"],
  ["#0a0710", "#161024", "#241a3a", "#3a2a5c", "#6a4fa0", "#c3a8ff"],
  ["#3a0a10", "#6e1420", "#a8202e", "#d83a3e", "#f26a5e", "#ffb0a0"],
  ["#4a3a22", "#7a6440", "#b49a66", "#e0c890", "#f6e6b8", "#fffbea"],
  ["#2c2b33", "#46454f", "#63626d", "#83828d", "#a9a8b2", "#d4d3da"],
];
// Glow halos: eyes (pale lavender), then magic haze (deep to light violet).
const GLOW = ["#5b4c92", "#a99ee0", "#f2eeff", "#2c1258", "#5a2aa6", "#9a62ea"];
const EXTRA = ["#c9b8f0", "#ffffff", "#030206"];
export const NOVA_KINDS = ["flame", "eclipse", "wraith", "moon", "imp", "darkflame", "cloak", "crystal", "veil", "moonflame", "mooncloak", "flamecloak", "twinflame", "flamehood", "satellites"];

const model = (kind) => `
#define KIND ${kind}
uniform vec2 uRes; uniform float uTime, uYaw, uView, uBlink, uBob, uSway, uMood, uEnergy;
// idles: orrery strength, portal open, bucket risen, head chomp; a flying kernel (xyz, size)
uniform float uOrb, uPortal, uBucket, uChomp; uniform vec4 uKern;
// orrery: orbit size, his dust ring (presence, radius, extra spin), a shake; a magic burst (size 0..1) at uBurstAt
uniform float uOrbR, uRingK, uRingR, uRingSpin, uShake, uBurst, uImplode; uniform vec3 uBurstAt;
// snack time: the tear before the portal opens, telekinesis beam strength, where the bucket is
uniform float uTear, uTK; uniform vec3 uBucketAt;
float gm; float gEye; float gMagic;
void U(inout float d, float nd, float m){ if (nd < d) { d = nd; gm = m; } }
float sdEll(vec3 p, vec3 r){ float k0 = length(p/r), k1 = length(p/(r*r)); return k0*(k0 - 1.)/k1; }
float fbm(vec3 p){ return vnoise(p)*.6 + vnoise(p*2.1 + 4.)*.3 + vnoise(p*4.3 + 9.)*.1; }

// One eye, shaped by mood (uMood: 0 idle, 1 happy, 2 angry, 3 sad, 4 sleepy).
// s is +1 for his left eye (its inner side is +x), -1 for his right.
float eye1(vec3 q, vec3 r, float s){
  vec3 rb = vec3(r.x, r.y*uBlink*(uMood == 4. ? .14 : 1.), r.z);
  if (uMood == 4.) q.y += r.y*.25;                                   // sleepy: shut, slightly low
  float e = sdEll(q, rb);
  if (uMood == 1.) e = max(e, -sdEll(q + vec3(0., r.y*1.02, 0.), r*vec3(1.6, 1.05, 2.)));  // happy: an upturned arc
  if (uMood == 2.) e = max(e, (q.y + s*q.x*.95 - r.y*.3)*.7);         // angry: cut down toward the middle
  if (uMood == 3.) e = max(e, (q.y - s*q.x*.7 - r.y*.45)*.7);         // sad: cut down toward the outside
  return e;
}
void eyes(inout float d, vec3 p, vec3 a, vec3 b, vec3 r){
  float e = min(eye1(p - a, r, 1.), eye1(p - b, r*vec3(1.08, 1.04, 1.), -1.));
  U(d, e, 3.); gEye = min(gEye, e);
}
// A flame horn: a thick base blended into the head, a licking tip that ends in purple fire.
float horn(inout float body, inout float d, vec3 p, vec3 a, vec3 b, vec3 c, float r, float ph){
  vec3 bw = b + vec3(sin(uTime*3.1 + ph)*.03, 0., 0.);
  vec3 cw = c + vec3(sin(uTime*4.7 + ph)*.07, sin(uTime*6.3 + ph*1.7)*.05, 0.);
  body = smin(body, sdCapT(p, a, mix(a, bw, .6), r, r*.75), .1);
  // the horn is shadow at the root and burns into purple fire towards the tip
  float fire = min(sdCapT(p, mix(a, bw, .45), bw, r*.8, r*.6), sdCapT(p, bw, cw, r*.6, .0));
  U(d, fire, 4.); gMagic = min(gMagic, fire);
  return body;
}

// The eclipse corona behind a head at c (radius rr): a ring and flickering rays of purple fire.
// uEnergy scales the rays: long and fast when angry, short and slow when sad or sleepy.
void corona(inout float d, vec3 p, vec3 c0, float rr){
  vec3 c = p - c0 - vec3(0., 0., .32);
  float ring = sdTorZ(c, rr, .04);
  float n = 20., sec = 6.2831853/n, a = atan(c.y, c.x);
  float id = floor((a + sec*.5)/sec), an = mod(a + sec*.5, sec) - sec*.5;
  float len = (.16 + .16*hash1(id) + .07*sin(uTime*3.3*uEnergy + id*2.1))*uEnergy;
  vec3 rp = vec3(cos(an)*length(c.xy), sin(an)*length(c.xy), c.z);
  ring = min(ring, sdCapT(rp, vec3(rr, 0., 0.), vec3(rr + len, 0., 0.), .045, .0));
  U(d, ring, 4.); gMagic = min(gMagic, ring);
}
// Eyes on the front of a round head at c with radius r.
void headEyes(inout float d, vec3 p, vec3 c, float r, float k){
  float z = -r*.86;
  eyes(d, p, c + vec3(-.18*k, .01, z), c + vec3(.17*k, .01, z), vec3(.1, .18, .11)*k);
}

// A tongue of shadow fire rising from base (height h, base radius r), purple at the tip.
float flameT(inout float d, vec3 p, vec3 base, float h, float r, float ph, float lean){
  vec3 f = p - base; float k = clamp(f.y/h, 0., 1.);
  f.x -= sin(f.y*3.5/h - uTime*4. + ph)*.09*k + lean*k*k;
  float fl = sdCapT(f, vec3(0.), vec3(0., h, .04), r, .0);
  fl += (fbm(f*4.5 + vec3(ph, -uTime*2.2, 0.)) - .5)*.16*k;
  float tip = sdCapT(f, vec3(0., h*.68, .04), vec3(0., h*1.04, .04), r*.32, .0);
  U(d, tip, 4.); gMagic = min(gMagic, tip);
  return fl;
}
// A tilted ring of obsidian dust around s (already relative to his centre).
void dustRing(inout float d, vec3 s, float y, float rad, float tilt){
  vec3 r = s - vec3(0., y, 0.); r.yz = R(tilt) * r.yz; r.xy = R(-.22) * r.xy;
  float an = atan(r.y, r.x) + uTime*.4, ra = length(r.xy);
  float seg = mod(an, .26) - .13;
  U(d, sdBox(vec3(seg*ra, ra - rad, r.z), vec3(.045)), 5.);
}
// A short shadow cloak from y=top down to a ragged hem near y=bot.
float cloakB(vec3 p, float top, float bot, float r0, float r1){
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(top - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(top - s.y, 0.), 2.);
  float ry = mix(r0, r1, clamp((top - s.y)/(top - bot), 0., 1.));
  float c = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  return max(c, max(s.y - top - .02, (bot + jag) - s.y));
}
// The black moon's underside: shadow flames licking up its lower half.
float moonB(vec3 s, float r){
  return length(s) - r + (fbm(s*5. + vec3(0., -uTime*1.6, 0.)) - .5)*.14*clamp(-s.y*1.6 + .1, 0., 1.);
}

float map(vec3 p){
  gm = 0.; gEye = 1e5; gMagic = 1e5;
  float d = 1e5;
  p.y -= uBob;
  p.x += sin(uTime*55.)*.035*uShake;   // shaking things off
  p.xz = R(uYaw) * p.xz;
  float big = max(max(uOrb*uOrbR, uPortal + uTear), max(uBurst, uBucket));
  if (sdBox(p - vec3(0., .2, 0.), vec3(1.6 + big*.45, 1.8, 1.3 + big*.5)) > .3) return 1.;
  float body;
#if KIND == 0
  // head with four flame horns
  body = sdEll(p - vec3(0., .35, 0.), vec3(.56, .5, .46));
  body = horn(body, d, p, vec3(-.36, .62, .05), vec3(-.5, .9, .08), vec3(-.4, 1.16, .1), .1, 0.);
  body = horn(body, d, p, vec3(-.13, .74, .05), vec3(-.16, 1.06, .1), vec3(.02, 1.42, .12), .12, 1.7);
  body = horn(body, d, p, vec3(.15, .74, .05), vec3(.24, 1.04, .1), vec3(.14, 1.36, .12), .12, 3.1);
  body = horn(body, d, p, vec3(.38, .58, .05), vec3(.62, .76, .08), vec3(.7, 1.0, .1), .09, 4.4);
  // the body below thins into rising smoke
  vec3 s = p; s.x += sin(s.y*2.6 + uTime*1.5)*.09*max(-s.y + .1, 0.) + uSway*max(-s.y, 0.);
  s.x -= .22*pow(max(-s.y, 0.), 2.);
  float smoke = sdCapT(s, vec3(0., -.05, 0.), vec3(.04, -1.0, .08), .3, .02);
  smoke += (fbm(s*5. + vec3(0., uTime*1.4, 0.)) - .5)*.2*clamp(-s.y + .15, 0., 1.);
  body = smin(body, smoke, .12);
  U(d, body, 1.);
  eyes(d, p, vec3(-.2, .36, -.39), vec3(.17, .37, -.37), vec3(.1, .18, .06));
#elif KIND == 1
  // teardrop body
  float sw = sin(uTime*1.3)*.16 + uSway;
  vec3 s = p;
  body = length(s - vec3(0., .35, 0.)) - .48;
  float tail = sdCapT(s, vec3(0., .2, 0.), vec3(sw, -1.05, 0.), .42, .02);
  tail += (fbm(s*6. + vec3(0., uTime*1.1, 0.)) - .5)*.16*clamp(-s.y - .2, 0., 1.);
  body = smin(body, tail, .16);
  U(d, body, 1.);
  // dust crumbling off the tail tip
  for (int k = 0; k < 7; k++) {
    float fk = float(k), ph = fract(uTime*.38 + fk/7.);
    vec3 c = s - (vec3(sw, -1.02, 0.) + vec3((hash1(fk) - .5)*.7*ph, -ph*.7, (hash1(fk + 3.) - .5)*.3));
    c.xy = R(ph*4. + fk) * c.xy;
    U(d, sdBox(c, vec3(.05*(1. - ph*.7))), 1.);
  }
  // the eclipse corona behind the head: a ring and flickering rays of purple fire
  vec3 c = p - vec3(0., .35, .32);
  float ring = sdTorZ(c, .6, .04);
  float n = 20., sec = 6.2831853/n, a = atan(c.y, c.x);
  float id = floor((a + sec*.5)/sec), an = mod(a + sec*.5, sec) - sec*.5;
  float len = .16 + .16*hash1(id) + .07*sin(uTime*3.3 + id*2.1);
  vec3 rp = vec3(cos(an)*length(c.xy), sin(an)*length(c.xy), c.z);
  ring = min(ring, sdCapT(rp, vec3(.6, 0., 0.), vec3(.6 + len, 0., 0.), .045, .0));
  U(d, ring, 4.); gMagic = min(gMagic, ring);
  eyes(d, p, vec3(-.18, .37, -.41), vec3(.17, .37, -.41), vec3(.1, .18, .06));
#elif KIND == 2
  // hooded wraith: a void face in a deep hood, a ragged cape, shoulder spikes, orbiting shards
  vec3 h = p; h.z -= (h.y - .4)*(h.y - .4)*.45;
  float hood = sdCapT(h, vec3(0., .42, .06), vec3(.02, 1.08, .38), .5, .05);
  hood = max(hood, -(length(p - vec3(0., .52, -.38)) - .4));
  vec3 s = p; s.x += sin(s.y*2.2 + uTime*1.4)*.07*max(.4 - s.y, 0.) + uSway*max(-s.y, 0.) - .2*pow(max(.4 - s.y, 0.), 2.);
  float ry = mix(.36, .78, clamp((.38 - s.y)/1.4, 0., 1.));
  float cape = (length(vec2(s.x, s.z*1.35)) - ry)*.7;
  float jag = .34*abs(sin(s.x*7.5 + uTime*1.1)) + .1*sin(s.x*19. - uTime*2.);
  cape = max(cape, max(s.y - .42, (-.92 + jag) - s.y));
  body = smin(hood, cape, .1);
  body = min(body, sdCapT(vec3(abs(p.x), p.yz), vec3(.36, .36, .02), vec3(.62, .6, .14), .1, .0));
  U(d, body, 1.);
  U(d, length(p - vec3(0., .52, .02)) - .32, 2.);
  for (int k = 0; k < 3; k++) {
    float fk = float(k), an = uTime*.8 + fk*2.094;
    vec3 c = p - vec3(cos(an)*1.05, .15 + sin(an*1.3 + fk)*.22, sin(an)*.55);
    c.xy = R(uTime*1.7 + fk) * c.xy; c.xz = R(uTime*1.1) * c.xz;
    float o = sdOct(c*vec3(1., .6, 1.), .1);
    U(d, o, 5.); gMagic = min(gMagic, o + .02);
  }
  eyes(d, p, vec3(-.11, .54, -.27), vec3(.11, .54, -.27), vec3(.065, .1, .04));
#elif KIND == 3
  // black moon: a shadow sphere, a tilted ring of obsidian dust, shadow flames licking up its lower half
  vec3 c = vec3(0., .2, 0.);
  vec3 s = p - c;
  body = length(s) - .55;
  body += (fbm(s*5. + vec3(0., -uTime*1.6, 0.)) - .5)*.14*clamp(-s.y*1.6 + .1, 0., 1.);
  U(d, body, 1.);
  vec3 r = s + vec3(0., .4, 0.); r.yz = R(-1.3) * r.yz; r.xy = R(-.22) * r.xy;
  float an = atan(r.y, r.x) + uTime*.4, ra = length(r.xy);
  float seg = mod(an, .26) - .13;
  vec3 rq = vec3(seg*ra, ra - .92, r.z);
  U(d, sdBox(rq, vec3(.045, .045, .045)), 5.);
  corona(d, p, c, .68);
  headEyes(d, p, c, .55, 1.05);
#elif KIND == 4
  // imp: round head with two swept-back horns, a small body curling into a wisp
  vec3 c = vec3(0., .42, 0.);
  body = length(p - c) - .44;
  vec3 a = vec3(abs(p.x), p.yz);
  body = smin(body, sdCapT(a, vec3(.22, .7, -.02), vec3(.42, 1.12, .08), .13, .0), .08);
  vec3 s = p; s.x += sin(s.y*3. + uTime*1.6)*.07*max(-s.y, 0.) + uSway*max(-s.y, 0.);
  body = smin(body, sdEll(s - vec3(0., -.12, .02), vec3(.3, .38, .27)), .12);
  float tail = sdCapT(s, vec3(0., -.35, .02), vec3(.18 + .1*sin(uTime*1.3), -.88, .05), .16, .01);
  tail = smin(tail, sdCapT(s, vec3(.18 + .1*sin(uTime*1.3), -.88, .05), vec3(.36, -.74, .06), .03, .0), .06);
  body = smin(body, tail, .1);
  U(d, body, 1.);
  corona(d, p, c, .6);
  headEyes(d, p, c, .44, .95);
#elif KIND == 5
  // dark flame: a round base whose top rises into one tall licking tongue of shadow fire
  vec3 c = vec3(0., .05, 0.);
  body = length(p - c) - .46;
  vec3 f = p; float k = clamp((f.y - .2)/1.4, 0., 1.);
  f.x -= sin(f.y*3.2 - uTime*4.)*.1*k + .12*k*k;
  float flame = sdCapT(f, vec3(0., .1, 0.), vec3(0., 1.62, .05), .42, .0);
  flame += (fbm(f*4.5 + vec3(0., -uTime*2.2, 0.)) - .5)*.18*k;
  body = smin(body, flame, .12);
  U(d, body, 1.);
  float tips = sdCapT(f, vec3(0., 1.15, .05), vec3(0., 1.7, .05), .14, .0);
  U(d, tips, 4.); gMagic = min(gMagic, tips);
  corona(d, p, c, .58);
  headEyes(d, p, c, .46, 1.);
#elif KIND == 6
  // cloaked: a round head on a short shadow cloak with a ragged, drifting hem
  vec3 c = vec3(0., .48, 0.);
  body = length(p - c) - .4;
  vec3 s = p; s.x += sin(s.y*2.4 + uTime*1.5)*.06*max(.2 - s.y, 0.) + uSway*max(-s.y, 0.) - .14*pow(max(.2 - s.y, 0.), 2.);
  float ry = mix(.22, .62, clamp((.2 - s.y)/.9, 0., 1.));
  float cape = (length(vec2(s.x, s.z*1.3)) - ry)*.7;
  float jag = .22*abs(sin(s.x*8. + uTime*1.2)) + .06*sin(s.x*21. - uTime*2.3);
  cape = max(cape, max(s.y - .22, (-.72 + jag) - s.y));
  body = smin(body, cape, .1);
  U(d, body, 1.);
  corona(d, p, c, .56);
  headEyes(d, p, c, .4, .92);
#elif KIND == 7
  // crystal: a faceted shadow gem body (stretched octahedron) with a smaller gem head
  vec3 c = vec3(0., .5, 0.);
  vec3 g = p - c; g.xz = R(uTime*.25) * g.xz;
  body = sdOct(g*vec3(1., .9, 1.), .5);
  vec3 b = p - vec3(0., -.35, 0.); b.xz = R(-uTime*.3) * b.xz;
  float low = sdOct(b*vec3(1., .5, 1.), .3);
  U(d, min(body, low), 5.);
  for (int k = 0; k < 2; k++) {
    float an = uTime*1.1 + float(k)*3.14;
    vec3 q = p - vec3(cos(an)*.62, .02 + sin(an*2.)*.05, sin(an)*.4);
    q.xy = R(uTime*2.) * q.xy;
    U(d, sdOct(q*vec3(1., .6, 1.), .07), 5.);
  }
  corona(d, p, c, .64);
  eyes(d, p, c + vec3(-.14, -.02, -.4), c + vec3(.14, -.02, -.4), vec3(.075, .13, .07));
#elif KIND == 9
  // moon + flame: the black moon crowned with one tall tongue of shadow fire, dust ring below
  vec3 c = vec3(0., .1, 0.);
  body = smin(moonB(p - c, .5), flameT(d, p, c + vec3(0., .25, 0.), 1.15, .3, 0., .12), .1);
  U(d, body, 1.);
  dustRing(d, p - c, -.36, .86, -1.3);
  corona(d, p, c, .6);
  headEyes(d, p, c, .5, 1.);
#elif KIND == 10
  // cloaked moon: round head on the short cloak, a dust ring circling the cloak
  vec3 c = vec3(0., .5, 0.);
  body = smin(length((p - c)*vec3(1., 1. + .2*uChomp, 1.)) - .4, cloakB(p, .22, -.74, .22, .64), .1);
  U(d, body, 1.);
  // his dust ring: crushed inward and away for the orrery, then summoned back
  if (uRingK > 0.) {
    vec3 r = p - vec3(0., -.12, 0.); r.yz = R(-1.32) * r.yz; r.xy = R(-.22) * r.xy;
    float an = atan(r.y, r.x) + uTime*.4 + uRingSpin, ra = length(r.xy);
    float seg = mod(an, .26) - .13;
    U(d, sdBox(vec3(seg*ra, ra - .82*uRingR, r.z), vec3(.045*uRingK)), 8.);   // grey stone, so it reads as rocks, not an arm
  }
  corona(d, p, c, .56);
  headEyes(d, p, c, .4, .92);
  // A star-flash (a sharp four-point glint, white-hot) with shards streaking out of it
  // (the ring crushed) or sucked into it (the portal snapping shut). No sphere.
  if (uBurst > 0.) {
    vec3 q = p - uBurstAt;
    float f = uBurst < .2 ? uBurst/.2 : pow((1. - uBurst)/.8, 2.);   // snaps out, then fades
    float L = .62*f, w = .05*f;
    float star = min(min(sdCapT(q, vec3(0.), vec3(L, 0., 0.), w, 0.), sdCapT(q, vec3(0.), vec3(-L, 0., 0.), w, 0.)),
                     min(sdCapT(q, vec3(0.), vec3(0., L*1.25, 0.), w, 0.), sdCapT(q, vec3(0.), vec3(0., -L*1.25, 0.), w, 0.)));
    star = min(star, min(sdCapT(q, vec3(0.), vec3(.7, .7, 0.)*L*.38, w*.7, 0.), sdCapT(q, vec3(0.), vec3(-.7, -.7, 0.)*L*.38, w*.7, 0.)));
    star = min(star, min(sdCapT(q, vec3(0.), vec3(-.7, .7, 0.)*L*.38, w*.7, 0.), sdCapT(q, vec3(0.), vec3(.7, -.7, 0.)*L*.38, w*.7, 0.)));
    U(d, star, 3.); gEye = min(gEye, star);
    for (int k = 0; k < 9; k++) {
      float fk = float(k), a = fk*.698 + hash1(fk)*.4;
      vec3 dir = normalize(vec3(cos(a), sin(a), (hash1(fk + 2.) - .5)*.5));
      float reach = .2 + (1.1 + .3*hash1(fk + 5.))*mix(uBurst, 1. - uBurst, uImplode);
      vec3 at = dir*reach;
      // a purple streak trailing behind each shard
      vec3 tail = at + dir*(uImplode > .5 ? .35 : -.35)*(1. - uBurst*.6);
      float streak = sdCapT(q, tail, at, .0, .028*(1. - uBurst*.7));
      U(d, streak, 4.); gMagic = min(gMagic, streak);
      vec3 sq = q - at; sq.xy = R(uTime*7. + fk)*sq.xy;
      U(d, sdOct(sq, .065*(1. - uBurst*.6)), 8.);
    }
  }
  // ---- idle 1, the orrery: planets, a black hole and asteroids circle him ----
  if (uOrb > 0.) {
    vec3 o = p - vec3(0., .2, 0.);
    o.yz = R(.35) * o.yz;                     // tip the orbits toward us
    for (int k = 0; k < 3; k++) {
      float fk = float(k), an = uTime*(.9 - fk*.2) + fk*2.1, rad = (.95 + fk*.22)*uOrbR;
      vec3 q = o - vec3(cos(an)*rad, 0., sin(an)*rad);
      float sz = (k == 0 ? .13 : k == 1 ? .1 : .08)*uOrb;
      U(d, length(q) - sz, k == 1 ? 7. : 6.);
      if (k == 0) { vec3 rq = q; rq.yz = R(1.2)*rq.yz; U(d, sdTorZ(rq, sz*1.75, .014*uOrb), 7.); }   // a ringed planet
    }
    float an = uTime*.6 + 4.2;
    vec3 q = o - vec3(cos(an), .05, sin(an))*1.34*uOrbR;
    U(d, length(q) - .1*uOrb, 2.);                                  // the black hole
    vec3 aq = q; aq.yz = R(1.3)*aq.yz;
    float disc = sdTorZ(aq, .18*uOrb, .03*uOrb);                     // its burning accretion disc
    U(d, disc, 4.); gMagic = min(gMagic, disc);
    for (int k = 0; k < 5; k++) {
      float fk = float(k), a2 = uTime*(1.3 + hash1(fk)*.5) + fk*1.26, rad = (.8 + hash1(fk + 7.)*.62)*uOrbR;
      vec3 a = o - vec3(cos(a2)*rad, (hash1(fk + 3.) - .5)*.25, sin(a2)*rad);
      a.xy = R(uTime*2. + fk)*a.xy; a.yz = R(uTime*1.3)*a.yz;
      U(d, sdOct(a*vec3(1., .7, 1.2), .055*uOrb), 5.);              // asteroids
    }
  }
  // ---- idle 2, snack time: he tears a portal open and pulls popcorn out with telekinesis ----
  vec3 P0 = vec3(1.04, .2, .05);
  vec3 q = p - P0;
  if (uTear > 0.) {
    // first a jagged slash of light rips through the air
    float len = .42*uTear;
    vec3 t = vec3(q.x - sin(q.y*38.)*.018 - sin(q.y*11.)*.02, q.y, q.z);
    float slash = sdCapT(t, vec3(0., -len, 0.), vec3(0., len, 0.), .028, .006);
    U(d, slash, 4.); gMagic = min(gMagic, slash - .02);
  }
  if (uPortal > 0.) {
    // then it rips wide: a vortex (taller than wide) with a burning rim
    float R0 = .42*uPortal;
    vec3 e = vec3(q.x*1.55, q.y, q.z);
    float ring = sdTorZ(e, R0, .035)/1.55;
    // jagged rays round the rim, swept round like a swirl, turning
    float n = 14., sec = 6.2831853/n, a = atan(e.y, e.x) + uTime*1.6;
    float id = floor((a + sec*.5)/sec), an = mod(a + sec*.5, sec) - sec*.5;
    float len = (.07 + .12*hash1(id) + .05*sin(uTime*9. + id*3.))*uPortal;
    float l = length(e.xy);
    vec3 rp = vec3(cos(an)*l, sin(an)*l, e.z);
    float rays = sdCapT(rp, vec3(R0, 0., 0.), vec3(R0 + len, -len*.9, 0.), .03, .0)/1.55;
    U(d, min(ring, rays), 4.); gMagic = min(gMagic, min(ring, rays));
    // inside: the void, with spiral arms of purple light winding into the middle
    float disc = max(length(e.xy) - R0*.97, abs(q.z) - .012)/1.55;
    float rr = l/max(R0, .001), arm = sin(atan(e.y, e.x)*3. - rr*9. + uTime*5.);
    U(d, disc, arm > .45 && rr > .15 ? 4. : 2.);
    // black shards whirling round it
    for (int k = 0; k < 6; k++) {
      float fk = float(k), a2 = uTime*(2.2 + fk*.2) + fk*1.05;
      vec3 sq = q - vec3(cos(a2)*(R0*1.7 + .05*fk)/1.55, sin(a2)*(R0*1.5 + .04*fk), .05);
      sq.xy = R(uTime*4. + fk)*sq.xy;
      U(d, sdOct(sq, .05*uPortal), 5.);
    }
  }
  // the popcorn bucket, held in purple telekinesis
  if (uBucket > 0.) {
    float sc = uBucket;
    vec3 b = (p - uBucketAt)/sc;
    b.xy = R(-.18)*b.xy;
    float h = .19, rr = mix(.14, .19, clamp((b.y + h)/(2.*h), 0., 1.));
    float bucket = max(length(b.xz) - rr, abs(b.y) - h)*sc;
    float stripe = step(.5, fract(atan(b.z, b.x)*1.2732 + .25));
    U(d, bucket, stripe > .5 ? 6. : 7.);
    float corn = 1e5;
    for (int k = 0; k < 7; k++) {
      float fk = float(k);
      corn = min(corn, length(b - vec3(cos(fk*1.9)*.09*step(.5, fk), h + .03 + hash1(fk)*.05, sin(fk*1.9)*.09*step(.5, fk))) - .06);
    }
    U(d, corn*sc, 7.);
    gMagic = min(gMagic, mix(1., bucket - .06, uTK));             // the telekinetic glow round it
  }
  // the telekinesis itself: two twisting strands of purple magic from him to the bucket
  if (uTK > 0.) {
    vec3 A = vec3(.2, .32, -.25), B = uBucketAt;
    float best = 1e5;
    for (int k = 0; k < 2; k++) {
      float ph = float(k)*3.14159;
      vec3 prev = A;
      for (int i = 1; i <= 6; i++) {
        float s2 = float(i)/6.;
        vec3 cur = mix(A, B, s2) + vec3(0., sin(s2*3.14159)*.18, 0.)
                 + vec3(0., cos(s2*9. - uTime*7. + ph), sin(s2*9. - uTime*7. + ph))*.045*sin(s2*3.14159);
        best = min(best, sdCapT(p, prev, cur, .032*uTK, .026*uTK));
        prev = cur;
      }
    }
    U(d, best, 4.); gMagic = min(gMagic, best);
  }
  if (uKern.w > 0.) { float k = length(p - uKern.xyz) - .055*uKern.w; U(d, k, 7.); gMagic = min(gMagic, k + .02); }
#elif KIND == 11
  // flame cloak: the cloaked one, with a tongue of shadow fire rising from his head
  vec3 c = vec3(0., .46, 0.);
  body = smin(length(p - c) - .4, cloakB(p, .2, -.76, .22, .62), .1);
  body = smin(body, flameT(d, p, c + vec3(0., .18, 0.), .9, .24, 1.3, .1), .1);
  U(d, body, 1.);
  corona(d, p, c, .56);
  headEyes(d, p, c, .4, .92);
#elif KIND == 12
  // twin flames: the black moon with two flame horns leaning outwards
  vec3 c = vec3(0., .1, 0.);
  body = moonB(p - c, .5);
  body = smin(body, flameT(d, p, c + vec3(-.27, .28, 0.), .78, .17, 0., -.18), .08);
  body = smin(body, flameT(d, p, c + vec3(.27, .28, 0.), .78, .17, 2.1, .18), .08);
  U(d, body, 1.);
  corona(d, p, c, .6);
  headEyes(d, p, c, .5, 1.);
#elif KIND == 13
  // hooded flame: a cloak whose head draws up into one thick flame, like a hood of fire
  vec3 c = vec3(0., .42, 0.);
  body = smin(length(p - c) - .42, cloakB(p, .16, -.8, .24, .66), .1);
  body = smin(body, flameT(d, p, c + vec3(0., .02, .02), 1.0, .4, .7, .2), .14);
  U(d, body, 1.);
  corona(d, p, c, .58);
  headEyes(d, p, c, .42, .95);
#elif KIND == 14
  // moon with satellites: the black moon, two small shadow moons in orbit
  vec3 c = vec3(0., .15, 0.);
  body = moonB(p - c, .5);
  for (int k = 0; k < 2; k++) {
    float an = uTime*.9 + float(k)*3.14159;
    body = min(body, length(p - c - vec3(cos(an)*.86, .12*sin(an*1.7), sin(an)*.5)) - .11);
  }
  U(d, body, 1.);
  corona(d, p, c, .62);
  headEyes(d, p, c, .5, 1.);
#else
  // veil: a round head trailing a long shadow ribbon that ripples behind him
  vec3 c = vec3(0., .3, 0.);
  body = length(p - c) - .46;
  float rib = 1e5; vec3 prev = c + vec3(.1, -.2, .1);
  for (int k = 1; k <= 7; k++) {
    float fk = float(k), w = fk/7.;
    vec3 nx = c + vec3(.1 + w*1.0, -.2 - w*.75 + sin(fk*.9 - uTime*3.)*.12*w, .1 + w*.2);
    rib = smin(rib, sdCapT(p, prev, nx, .3*(1. - (fk - 1.)/7.*.85), .3*(1. - w*.85)), .05);
    prev = nx;
  }
  body = smin(body, rib, .12);
  U(d, body, 1.);
  corona(d, p, c, .58);
  headEyes(d, p, c, .46, .98);
#endif
  return d;
}

vec3 nrm(vec3 p){
  const vec2 k = vec2(1., -1.)*.002;
  return normalize(k.xyy*map(p + k.xyy) + k.yyx*map(p + k.yyx) + k.yxy*map(p + k.yxy) + k.xxx*map(p + k.xxx));
}

out vec4 o;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / uRes.y * uView;
  vec3 ro = vec3(uv.x, uv.y + .1, -5.), rd = vec3(0., 0., 1.);
  float t = 0., m = 0., minD = 1e5, minEye = 1e5, minMagic = 1e5;
  for (int i = 0; i < 110; i++) {
    float d = map(ro + rd*t);
    minD = min(minD, d); minEye = min(minEye, gEye); minMagic = min(minMagic, gMagic);
    if (d < .003) { m = gm; break; }
    t += d*.65;
    if (t > 10.) break;
  }
  float eyeGlow = exp(-max(minEye, 0.)*13.)*.55;
  float magic = exp(-max(minMagic, 0.)*16.)*.6;
  if (m == 0.) {
    // the purple haze: thick near his body, broken up by drifting noise
    vec2 q = uv*3.2 + vec2(0., -uTime*.55);
    float n = fbm(vec3(q, uTime*.25));
    float gas = exp(-max(minD, 0.)*5.)*(.2 + .95*n);
    // a few star specks drifting up through the haze
    vec2 cell = floor(vec2(gl_FragCoord.x, gl_FragCoord.y - uTime*14.)/2.);
    if (hash1(cell.x*17.3 + cell.y*91.7) > .993 && gas > .18) gas = 1.;
    o = vec4(max(gas, magic), 0., 1., eyeGlow); return;
  }
  vec3 p = ro + rd*t;
  map(p); m = gm;
  vec3 n = nrm(p);
  vec3 L = normalize(vec3(-.5, .7, -.6));
  float key = max(dot(n, L), 0.);
  float rim = pow(1. - max(dot(n, -rd), 0.), 2.4);
  float back = max(dot(n, normalize(vec3(.7, .3, .5))), 0.);
  float sh;
  if (m == 3.) sh = .86 + .14*key;
  else if (m == 4.) sh = .55 + .35*key + .15*sin(uTime*9. + p.y*14.);
  else if (m == 5.) sh = .12 + .4*key + .45*pow(max(dot(reflect(-L, n), -rd), 0.), 10.) + .35*rim;
  else if (m == 2.) sh = .05 + .2*rim;
  else if (m == 8.) sh = .2 + .55*key + .25*rim;
  else if (m >= 6.) sh = .14 + .62*key + .22*rim;
  else {
    // shadow: almost black, a cold key light and a purple rim so the form still reads
    sh = .05 + .2*key + .55*rim*(.4 + .6*back);
    sh += .3*exp(-max(gEye, 0.)*10.);                // the eyes light the face around them
  }
  o = vec4(clamp(sh, 0., 1.), m/16., t/10., eyeGlow);
}`;

export const NOVA_MOODS = {
  idle: { id: 0, energy: 1, bob: 1.5, amp: 0.05 },
  happy: { id: 1, energy: 1.2, bob: 3.2, amp: 0.07, hop: true },
  angry: { id: 2, energy: 1.6, bob: 2.4, amp: 0.035 },
  sad: { id: 3, energy: 0.55, bob: 0.9, amp: 0.03, sink: -0.06 },
  sleepy: { id: 4, energy: 0.45, bob: 0.7, amp: 0.025, sink: -0.04 },
};

export class PixelNova {
  // host: element the canvas goes in. w,h: art pixels. px: screen px per art pixel.
  constructor(host, { kind = "flame", w = 200, h = 230, px = 2, view = 3.4, half = false, shadow = true } = {}) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "px-nova";
    Object.assign(this.canvas.style, { width: w * px + "px", height: h * px + "px", imageRendering: "pixelated", display: "block" });
    host.appendChild(this.canvas);
    this.canvas.width = w; this.canvas.height = h;
    this.gl = new PixelGL(this.canvas, { model: model(NOVA_KINDS.indexOf(kind)), palettes: PALETTES, glow: GLOW, extra: EXTRA });
    this.view = view; this.yaw = 0.25; this.sway = 0; this.lift = 0;
    // idle state, tweened by NovaMate: orrery, portal, bucket, chomp, a kernel in flight
    this.idle = { orb: 0, orbR: 1, ringK: 1, ringR: 1, spin: 0, shake: 0, burst: 0, burstAt: [0, 0, 0], implode: 0,
      tear: 0, portal: 0, tk: 0, bucket: 0, bucketAt: [1.04, 0.2, 0.05], chomp: 0, kern: [0, 0, 0, 0] };
    this.half = half; this.shadow = shadow;
    this.setMood("idle");
    this.t0 = performance.now() - Math.random() * 4000;
    this.nextBlink = 2 + Math.random() * 3;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }
  // Moods change his eyes, how hard the corona burns, and how he floats.
  setMood(name) {
    this.mood = name;
    this.m = NOVA_MOODS[name] ?? NOVA_MOODS.idle;
  }
  bob(s) {
    const m = this.m, w = s * m.bob;
    return (m.hop ? Math.abs(Math.sin(w)) * m.amp * 1.6 - m.amp * 0.4 : Math.sin(w) * m.amp) + (m.sink ?? 0);
  }
  loop(now) {
    if (!this.canvas.isConnected) return;
    const s = (now - this.t0) / 1000;
    this.onFrame?.(s);
    // roaming: draw at 30 fps (pixel art reads fine, and it halves the GPU work)
    if (this.half && (this.skip = !this.skip)) { requestAnimationFrame(this.loop); return; }
    // blink every few seconds
    if (s > this.nextBlink + 0.16) this.nextBlink = s + 2.5 + Math.random() * 3;
    const blink = s > this.nextBlink ? 0.1 : 1;
    this.gl.draw(
      { uTime: s, uYaw: this.yaw, uView: this.view, uBlink: this.m.id === 4 ? 1 : blink, uBob: this.bob(s) + this.lift, uSway: this.sway, uMood: this.m.id, uEnergy: this.m.energy,
        uOrb: this.idle.orb, uPortal: this.idle.portal, uBucket: this.idle.bucket, uChomp: this.idle.chomp, uKern: this.idle.kern,
        uOrbR: this.idle.orbR, uRingK: this.idle.ringK, uRingR: this.idle.ringR, uRingSpin: this.idle.spin, uShake: this.idle.shake,
        uBurst: this.idle.burst, uBurstAt: this.idle.burstAt, uImplode: this.idle.implode, uTear: this.idle.tear, uTK: this.idle.tk, uBucketAt: this.idle.bucketAt },
      { uTime: s, uFlash: 0, uBlock: 1, uGlitch: 0, uShadow: this.shadow ? 0.7 - this.bob(s) * 4 : 0, uShadowX: 0.5, uPlume: [0, 0, 0, 0] },
    );
    requestAnimationFrame(this.loop);
  }
}
