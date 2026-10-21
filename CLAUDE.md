# Operandi — notes for Claude

Read this first every session. Specs: `docs/PRD.md` (v1, claude.ai) and `docs/PRD-v2.md` (v2, standalone). Setup guide for Isaac: `docs/SETUP.md`.

## What this is
Isaac's boot.dev-style Python learning app. There are two versions:
- **v2, the main one (`site/`):** a standalone site on Vercel with no AI. DOT, a rule-based mascot companion, does the marking, feedback, error help and hints. It has an in-game currency (Bits), a shop and levels.
- **v1, "office hours" (`claude-ai-app/`):** a private claude.ai artifact where Claude is the teacher. Isaac wants to keep it.

## Context
- Learner: Isaac, complete beginner (never written Python). Goal: Python as a career skill.
- Devices: laptop, desktop, sometimes iPad. Progress must sync, and it must be free.
- Budget: zero. Vercel Hobby (personal, non-commercial) and Firebase Spark.
- Personal project, no company approval needed. Isaac's EMT hub is also on Vercel.

## Decisions (v2)
- **No AI at runtime.** All knowledge is written ahead of time in `site/content/`.
- **Mascot: DOT (Digital Operandi Teammate).**
  - An original goopy light-blue glowing blob with two glowing white eyes, inspired by (not copied from) Isaac's reference image.
  - Moods: idle, happy, celebrate, thinking, worried, sad, sleepy.
  - Code: `site/js/dot.js`. Preview page: `site/dot-preview.html` (add `?skin=pyro` for PYRO).
  - Shapes:
    - The outline is a Catmull-Rom curve through evenly spaced points, blended between BODY, HELD (picked up), MELT (sad) and SPLASH (crown splat) shapes.
    - While blending, Taubin smoothing keeps in-between shapes round.
  - Plop: crown splat, then a tall bounce-back with a hop, then the landing. Subtle droplets (DOT) or sparks (PYRO), plus a ground ring.
  - Accessories are worn by slot, one each: head (bow, party, crown, wizard), face (shades, nerd), mouth (moustache), prop (laptop, which types along when Isaac types).
- **Roaming (`site/js/pet.js`):**
  - The teammate floats over the whole page and wanders until picked up. Dropping him plops him and parks him there; double-click sets him roaming again.
  - Position is saved in `state.pet` as screen fractions.
  - The bubble follows him and flips to stay on screen. Plain messages auto-hide after 14 s; he pauses while talking.
- **PYRO (PYthon Runtime Operative):** a fire skin of the same body (flames are part of the outline), bought for 800 Bits. Isaac switches teammates in the Shop. Personality lines are in `site/content/voices.js`; help content is shared.
  - Status: **approved by Isaac 2026-10-18** after rounds of feedback (black lines for all closed eyes, smiling idle, rounder and chubbier shape, very smooth wobble). The outline is a Catmull-Rom curve through about 44 evenly spaced points, with springs scaled by elapsed time.
  - Roaming decision: DOT free-roams anywhere on screen until Isaac picks him up and plops him down; then he stays parked there.
  - Isaac's font: he likes Bricolage Grotesque (headings). v2 already uses it; the sandbox just can't load Google Fonts, so screenshots show a fallback.
- **Currency: Bits.**
  - Starter items (free): 15 hints, 15 peeks, 5 solutions.
  - Always free: FAQ, glossary, error explanations, typo detection, output-difference help.
  - All economy numbers live in `site/js/economy.js`.
    - Earn: lesson section 10; challenge Easy 5, Medium 12, Hard 25.
    - ×2 for a first try with no hint or peek; +1/2/3 for a mark of 8/9/10; +5 for the first pass each day; +50 per completed module.
    - Easy and Medium pay half after 5 solves at that difficulty.
    - A solution used means 0 Bits.
    - Shop: hint 10, peek 15, solution 60, streak shield 30. Looks: moustache 100, bow 100, sunglasses 120, party hat 120, nerdy glasses 150, wizard hat 250, laptop 300, crown 400. Editor themes 80. PYRO 800.
- **Levels** come from completed modules: Operand 0, Operator 1, Expression 2, Function 4, Module 6, Program 8.
- **Marking (no AI):** tests decide pass/fail.
  - If any test fails, the mark is at most 5, scaled by the number of tests passed.
  - If all pass: 10, minus style penalties (`LINT_PENALTY` in `content/help.js`, max −3), minus 1 at 4+ attempts, never below 6.
  - Typing the answer in by hand (`lint-hardcoded`) blocks a pass when the task has `noHardcode`.
- **Expected output** always comes from running the reference solution in Python, never computed in JS. This avoids rounding mismatches.
- **Templates:** about 25–40 per module, each a genuinely different problem, with no cap. `make(r)` uses seeded randomness. A challenge is saved as `{templateId, seed}`.
- **Challenge gating:** challenges only use what Isaac has learned. `requiredLessons()` in `app.js` maps a template's topics to lessons.
- **Python engine:** Pyodide 0.26.4, self-hosted in `site/pyodide/`.
  - It runs in a worker (`site/js/worker.js`) and is stopped after 5 s.
  - `site/py/harness.py` is shared by the browser and the validator. Keep it standard-library only.

- **Home page (`site/index.html`, Addendum B, built 2026-10-20):**
  - Standalone page with its own inline CSS and JS (doesn't load `app.css`).
  - A looping strip of language tiles: Python (opens `python.html`), VBA, C++, HTML, SQL ("Coming soon"). Icons are original inline SVGs.
  - It drifts slowly, and can be dragged, wheeled or swiped with momentum. Hover gives a Dock-style magnify (max ×1.28, eased every frame).
  - Sign in currently links straight to the course (temporary, Isaac 2026-10-20). Pricing scrolls to a small "Planned pricing" section (RM80 one-time, RM20/month, not available yet).
- **The course is `site/python.html`** (was `index.html`). Its logo links home. `site/vercel.json` sets `cleanUrls`, so it's served at `/python`.

## How content works
- **Lessons:** `site/content/m1-lessons.js`.
  - Each lesson has `sections: [{ title, html, task }]`. Each section gets its own task and explanation. A lesson without `sections` (`html` + `task`) still works as a single section.
  - Progress: each section is saved under `lessons["<id>.<n>"]`. The lesson's own record (`lessons[id]`, done plus the average mark) is written when its last section passes, so lesson completion, levels and challenge gating are unchanged.
  - Each `task` has: `text`, `starter`, `solution`, `checks` (Python asserts with `fail`/`peek`), `hints` (exactly 3) and `noHardcode`.
  - Checks can use `LINES`, `OUTPUT`, `SOURCE`, `print_has_literal(text)` and the learner's variables via `globals().get(...)`.
- **Templates:** `site/content/m1-templates.js`.
  - Helpers: `given()` (given values unchanged), `v()` (variable value; `approx` for floats) and `noTyped()`.
- **Registry:** `site/content/index.js` lists the modules and collects all lessons and templates.
- **Messages:** `site/content/help.js` (DOT's message per mistake id, plus `compareOutput`) and `site/content/faq.js`.
- **New mistake rules:** add the detection in `harness.py` `diagnose()` or `lint()`, then the message in `help.js`.
- **Validate before pushing:** `node tools/validate.mjs 60`. CI runs it on every push (`.github/workflows/validate.yml`). It checks that:
  - the solution passes and scores 10/10 with no style findings
  - the starter fails
  - there are 3 hints

## Where things live
- Standalone site: `site/`, deployed by Vercel with Root Directory = `site` (see `docs/SETUP.md`). The URL isn't known yet; Isaac sets it up.
- Sync:
  - `site/js/cloud.js` handles Firebase Google sign-in plus a Firestore doc `users/{uid}` (`{progress: JSON string, updatedAt}`).
  - The config goes in `site/js/firebase-config.js` (null means local-only). Rules: `firestore.rules`.
  - Merge rule: the newer `updatedAt` wins; a fresh browser takes the cloud copy.
- Local progress: localStorage key `operandi:v2:progress`. Draft code: `operandi:draft:<task key>`.
- **v1 (claude.ai):** https://claude.ai/artifact/4r3k5iGZrFXD5hQL4WF2VQ. Code: `claude-ai-app/`.
  - Progress is in its artifact db doc `progress/main`.
  - Republish: copy `claude-ai-app/` to the scratchpad and publish `index.html` with root = that copy, files = worker.js + pyodide/*.
  - Capabilities: `{sample:{}, db:{rules:[{path:"", read:"view", write:"owner"}]}}`.
  - Its stdlib is renamed `python_stdlib.zip.wasm` because the artifact host won't serve .zip.

## Open threads
- [x] Addendum A built 2026-10-18 after Isaac's "go": roaming, new shop items, PYRO.
- [x] Addendum B built 2026-10-20 after Isaac's "go": home page with looping language tiles, Sign in (no function yet), planned pricing.
- [ ] Sign in on the home page just opens the course for now. Later it can reuse the Firebase sign-in from `cloud.js`.
- [ ] Isaac sets up Vercel and Firebase (`docs/SETUP.md`), then pastes the Firebase config into `site/js/firebase-config.js`.
- [ ] Firebase sign-in and sync are untested: the cloud sandbox couldn't reach Google. Test once Isaac has a config.
- [ ] Addendum C (boss fights and streak rewards): "go" given 2026-10-20.
  - Step 1 (design): boss 1 is **GOLEM**, after 3 rounds of Isaac's feedback on 2026-10-20. The boss is now a big floating mech: wires dangling instead of legs, an orange core eye, a claw arm and a cannon arm, and cyan glitch crystals. Isaac removed the brow and the fanged jaw in round 3.
    - Firewall: a smooth glowing dome with a hex pattern inside, planted on the ground (it doesn't move with him) and big enough to cover all his moves. A crit scatters the hexes.
    - DOT faces the boss in battle (mirrored) and has attack / hurt / KO / win moves (`dot.js`).
    - Companions now face the way they roam (`pet.js` calls `dot.face()`).
    - Preview: `site/boss-preview.html`. Isaac liked the original flying Typo Swarm (letter-bugs with wings). Attacks have big wind-up, lunge and recoil movement.
    - HP decided: longer fights. GOLEM 300 HP with damage unchanged, so the teammate gets 300 HP too (about 13–15 challenges). Save fights in progress.
    - Waiting on: Isaac's final OK on the look before step 2.
  - Then: battle screen, rewards and aura slot, streak rewards. Ideas parked for later: the Super move, and bosses mixing topics from earlier modules.
- [x] Addendum E (2026-10-20): Isaac tried the Hollow Knight-style concept (`site/hk-preview.html`, `site/hk/`, kept for reference only) and **hated the character designs**.
  - Decision: **drop the look, keep the motion.** DOT, PYRO and GOLEM stay as approved, with cinematic, high-impact animation themed to each character: DOT water, PYRO fire, GOLEM impact and glitch.
  - Built:
    - `js/battle-time.js`: shared hit-stop and slow motion. DOT's and the boss's frame loops use it; outside battles it does nothing.
    - `js/battle-fx.js`: camera (shake, zoom punch, focus, letterbox), flashes, and themed particles (gather, dash trail, blade slash, droplets or embers, ripples, geyser, ground shockwave, shot, title card).
    - `js/battle-moves.js`: the choreography for each move (anticipation, then a fast strike, hit-stop, follow-through), shared by the preview and the future battle screen.
  - GOLEM's cannon aims at the teammate, and the Typo Swarm mobs the teammate (no damage).
  - The teammate's moves are picked at random, never the same twice in a row (`battle-moves.js`):
    - attacks: water blade (dash and slash), tidal dive (leap, spin, crash), hydro volley (three orbs)
    - crit finishers: crossing blades plus a splash crown, or a tidal wave DOT rides into the boss
  - Water look, round 4 (Isaac said the drawn splash and tsunami still looked weird):
    - Liquid is now simulated: many small round blobs with gravity, drawn in a layer whose "gooey" filter (blur, then a sharp alpha cut-off) melts touching blobs into sheets that pinch off into drops.
    - The same filter adds a dark outline, a shaded underside, a light rim and a white glint (`fxGoo-<theme>` in `battle-fx.js`).
    - Splash crown: a ring of blobs flung up, a jet, and a mound that spreads into a puddle. White foam blobs ride the edges.
    - Tsunami: a moving front throws a dense stream ahead of itself that arches over (the curl), with white foam on the crest. It's slower (1050 ms) so the curl has time to form.
  - Water look, round 5: matched to Isaac's reference video of classic 2D anime water effects.
    - Pale blue-grey body, a steel-blue underside and white top edges, cel-shaded with no outline.
    - White flow streaks ride along with the water.
    - The water is animated "on twos": each drawing is held for two frames, for the hand-drawn snap.
    - Ripples are thick, flat rings.
  - GOLEM's attacks (Isaac asked for more impact and action), picked at random without repeats (`bossAttack` in `battle-moves.js`):
    - claw slam: charge-up, floor cracks, debris, double shockwave
    - cannon barrage: three aimed shots with recoil and explosions
    - core laser: the screen darkens, energy pours into his eye, then a beam
    - rocket ram: cables flare like thrusters, he blasts across and smashes into DOT. His whole frame moves by an exact tween so he stops right in front of DOT.
  - New effects in `battle-fx.js`: explosion (cel-shaded fire made with the liquid layer), smoke, electric arcs, armour debris, floor cracks, converge (charge-up), beam, darken.
  - Boss hit reactions: arcs, debris and sparks; a crit adds an explosion.
  - Defeat: chained explosions in slow motion, then a huge final blast. Win: a roar with shock rings and arcs.
  - Swarmed DOT (no damage): worried, jittering and squashing about, wincing (>_<), shaking off droplets.
  - The Typo Swarm is drawn in the effects layer, in front of DOT, and circles all the way round him. Bugs passing behind are dimmer and smaller. Boss `typoSwarm({ spawn })` hands the bugs to `fx.bug()`.
- [ ] Addendum F (hi-bit pixel art for battles, "go" 2026-10-20). GOLEM prototype v3 built, **waiting on Isaac's verdict**.
  - Technique: `site/js/pixel/pixel-gl.js` (WebGL2). Pass 1 raymarches a 3D distance-function model; pass 2 turns it into pixel art (6-colour ramp per material, Bayer dithering, outline, inner lines, dithered glow halos, ground shadow, thruster plume, glitch rows, hit flash, `uBlock` for the transition). Scaled up with `image-rendering: pixelated` at 2 screen px per art pixel.
  - Design: Isaac disliked v1 and sent a reference (a wide armoured crab-mech). v2+ follows it closely: wide hull, stepped dome, missile-pod holes, back horns, amber honeycomb core eye, dark ribbed jaw, thruster (no dangling wires now), spiky arms with a huge claw (left) and a cannon (right), blue ice patches and glowing nodes. He faces left, toward the teammate.
    - IP note told to Isaac: fine for a personal project; change him enough to be our own before Operandi ever charges money.
  - Code: `golem-px.js` (`PixelGolem`: model, poses, `toCanvas`/`pagePoint` find points on him), `golem-moves.js` (attacks: claw slam, cannon barrage, core laser; `golemIntro`), `golem-boss.js` (`PixelBoss`: the old Boss interface so `battle-moves.js` works unchanged, plus the specials).
  - Isaac dropped the rocket ram ("DOT is so tiny"). Specials kept: Firewall (same look, sized to him, drawn on a pixel canvas), Typo Swarm (bugs fly out of the pod holes), Glitch Text.
  - **No SVG filters on the battle per frame** (2026-10-21: Isaac's PC lagged and his iPad dropped or delayed effects; `filter: url(#…)` on HTML is redrawn on the CPU each frame in Chrome, and Safari skips repaints). Effects and DOT use `shape-rendering: crispEdges` instead; DOT has bolder face lines. Only the one-off entry transition uses `#pixelate`. GOLEM drops to 30 fps by himself when frames run slow (`golem-px.js` loop). DOT himself is still the old one; his hi-bit round comes after GOLEM is approved. **Keep DOT's size as is** (Isaac 2026-10-20: don't make him bigger next to GOLEM).
  - Battle transition: the lesson pixelates through an SVG filter into big blocks, cuts to the arena, GOLEM resolves from 48-px blocks, then roars (title card).
  - Preview: `site/pixel-preview.html`. Videos (not in git): `previews/`.
- [ ] Addendum C step 2 **built 2026-10-20**: the GOLEM fight is in the course (PRD "Addendum C, step 2"). Isaac approved the hi-bit GOLEM and DOT's current look ("looks amazing"; no separate DOT/PYRO pixel redesign). In battle DOT has **angry eyes** (eye shape cut on a slant, no brows): `dot.js` mood "angry", the battle default.
  - Code: `js/boss-rules.js` (rules, Typo/Glitch planting), `js/boss-fight.js` (`BattleStage`: stage, HP bars, damage numbers, messages, `pixelateOut` transition), `app.js` "Boss fight" section (`openBoss`, `bossTurn`, `winFight`), numbers in `economy.js` `BOSS`. Save: `state.boss` (fight in progress), `bossWins`, `bossFights`.
  - During a fight the roaming pet hides and its messages show in a sticky box at the top of the instructions (`pet.sayOverride`).
  - 2026-10-21 (Isaac's feedback): the battle is a band across the top (`#arena`, `.body.boss-mode` grid areas), scaled to its height (`BattleStage.fit()`, designed at 440 px). GOLEM strikes back for 10 after every pass except a crit (`BOSS.strikeBack`). Course list: ☰ toggle (`setRail`), a drawer up to 1400 px. Ultrawide: `zoom` steps from 1900 px on `.top/.rail/.brief/.work` (not the arena, whose maths uses real pixels).
  - 2026-10-21: **no top bar** (Isaac: battle and editor too small). The ☰ button floats top-left; logo, level line (`#lvl`), Bits and streak sit at the top of the course list (`.rail-head`); Bits also show in the Shop; the hint/peek/solution counts are on the editor buttons. In a fight the editor and output split the space 3:2. The battle stage spans the whole band (no frame); fighters and HP bars stay in a central fight zone ≤ 2.4× the height (`fit()`). The editor has no header strip (Python status `#engine` sits in its top-right corner); the button row and tabs are slim.
  - 2026-10-21: Typo Swarm and Glitch Text are full cinematics (`golemSpecial` in `golem-moves.js`; Firewall keeps `bossSpecial`). Typo: deck reveal, pods charge pink, 3 launch waves with recoil, slow-mo bite. Glitch: eye blaze, red/cyan split on the fighters, static bars, glyph torrent + floor corruption wave, aftershock. Then the editor jolts as the corrupted starter loads (`corruptEditor`). `fx.converge` takes `glow: null`.
  - 2026-10-21: **sound** (PRD Addendum G): `js/sound.js` (Web Audio; effects plus a chiptune battle theme, no files). `wireBattleSounds(fx, theme)` hooks the effects calls; moves with signature sounds call `sound.sfx` directly (servo, laserCharge/laserBeam, roar, bite, screech). Music: a tense D-harmonic-minor theme; layers and tempo follow `sound.setDanger(boss, me)` (either side low → tenser; your teammate below 1/3 → alarm). The music starts with the entry transition; a "Tap for sound" button shows if the page loaded straight into a fight. The roaming pet makes a quiet jelly "blup" on every other hop (a sine bending up with a fast wobble, over a faint `slosh()`). Rejected by Isaac 2026-10-21: a continuous noise slosh ("gritty, like a storm") and a low sawtooth through a resonant filter ("sounds like a fart"). Pickup/plop use `slosh()` and he liked those. Typo Swarm plays a sustained wing cloud (`swarm()`). iPad: unlock also listens to touchend/click, plays a silent sample, sets `navigator.audioSession` to playback and loops a silent media element so the silent switch does not mute it. Music base 160 BPM with a root-fifth tremolo voice; stabs, toms and sweeps layered in with danger. **Settings** in the course list (`wireSettings` in `app.js`): music and effects on/off and volume, plus separate volumes for the roaming sound and the pick up & drop sound (`roamVol`/`grabVol` → `roamBus`/`grabBus` under the effects bus) (`operandi:sound`), companion roaming (`operandi:roam`, `pet.setRoaming`). The Settings section is a collapsible `<details>`, closed by default, open state remembered (`operandi:settings-open`).
  - Test links: `/python?test=boss` (also turns on `testMode`: a "Fill in the answer" button on boss challenges) and `/python?test=reset` (asks first; `store.reset()`; a reset beats an older cloud copy via `resetAt`). **Isaac will use reset after testing.**
  - Waiting on: Isaac testing it on his devices. Next: GOLEM's reward is now the companion NOVA (Addendum H below), then streak rewards. Performance on iPad untested (the GOLEM renderer is a WebGL raymarcher).
- [ ] Addendum H (GOLEM's reward is an exclusive companion, **NOVA**; "go" 2026-10-21). Design rounds so far:
  - Rejected: cosmic wizard / void spirit (vector), Gastly-style void ghost, the traced shadow creature and the Hollow Knight-like shadow cloak ("too close to Hollow Knight"), three cartoony vector redesigns ("unserious, like a kid's drawing").
  - Decided: **hi-bit pixel art on the GOLEM renderer** (`site/js/pixel/nova-px.js`, one shader, `NOVA_KINDS` picks the body). A living shadow with blank glowing eyes, a dithered purple haze, and (Isaac's favourite element) an **eclipse corona** behind his head.
  - Isaac liked B1 black moon, B3 dark flame, B4 cloaked; round 3 (C1–C6 combinations) is on `site/nova-preview.html`, **waiting on his pick**.
  - After the pick: moods, roaming, random idles (orbiting planets/black hole/asteroids; popcorn from a black-hole portal) with SFX, unlock (free on a first-try win, else 1,500 Bits), voice lines; battle moves later. Check WebGL cost while roaming on PC and iPad.
- [x] Addendum D built 2026-10-20 after Isaac's "sure": lesson sections. Module 1 has 12 sections, at 10 Bits each.
- [ ] Phase 2: Module 2 (if/elif/else, booleans, comparisons, and/or/not) with about 30 templates, plus mistake rules and FAQ for it. Then tune the economy from Isaac's real numbers.
- [ ] Phases 3–6: Modules 3–8 (loops, lists, functions, dicts, files and errors, real-world projects).
- [ ] v1: Isaac's first real use inside claude.ai is still unconfirmed.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
- Nothing destructive or public without an explicit "proceed".
