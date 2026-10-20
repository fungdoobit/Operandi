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
  - The Typo Swarm is drawn in the effects layer, in front of DOT, and circles all the way round him. Bugs passing behind are dimmer and smaller. Boss `typoSwarm({ spawn })` hands the bugs to `fx.bug()`.
- [x] Addendum D built 2026-10-20 after Isaac's "sure": lesson sections. Module 1 has 12 sections, at 10 Bits each.
- [ ] Phase 2: Module 2 (if/elif/else, booleans, comparisons, and/or/not) with about 30 templates, plus mistake rules and FAQ for it. Then tune the economy from Isaac's real numbers.
- [ ] Phases 3–6: Modules 3–8 (loops, lists, functions, dicts, files and errors, real-world projects).
- [ ] v1: Isaac's first real use inside claude.ai is still unconfirmed.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
- Nothing destructive or public without an explicit "proceed".
