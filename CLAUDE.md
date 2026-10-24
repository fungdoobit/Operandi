# Operandi — notes for Claude

Read this first every session. It holds the **current state only**. The full history (every design round, Isaac's feedback, rejected ideas, build notes for Addenda A to M) is in `docs/HISTORY.md`: search it when you need the detail behind something. Specs: `docs/PRD.md` (v1, claude.ai) and `docs/PRD-v2.md` (v2, standalone, with an addendum per feature). Setup guide for Isaac: `docs/SETUP.md`.

## What this is
Isaac's boot.dev-style Python learning game. `site/` is the main one: a standalone site on Vercel (deploys on every push to `main`) with **no AI at runtime**. Companions do the marking, feedback, error help and hints from rules written ahead of time; there is an in-game currency (Bits), a shop, levels and a boss fight per module. `claude-ai-app/` is v1 ("office hours", a private claude.ai artifact where Claude teaches); Isaac wants to keep it.

## Context
- Learner: Isaac, complete beginner (never written Python). Goal: Python as a career skill.
- Devices: laptop, desktop, sometimes iPad. Progress must sync, and it must be free.
- Budget: zero. Vercel Hobby (personal, non-commercial) and Firebase Spark.
- Personal project, no company approval needed. Isaac's EMT hub is also on Vercel.

## Decisions (v2)
- **No AI at runtime.** All knowledge is written ahead of time in `site/content/`.
- **Characters** (all pixel art; every art pixel is 1.5 to 2 screen px):
  - **PYRO** is the starting teammate (Isaac 2026-10-23). A living flame from devkidd's free pixel fire pack (`assets/pyro/devkidd/`, licence file there; any use, don't resell): flame E usually, bigger darker flame F when angry or picked up; blank rounded white eyes like NOVA's on a slightly darker core; the flame sways against his movement. **Higher bit (Isaac 2026-10-24, to match NOVA):** the flames are doubled with Scale2x at load and drawn at 1.5 CSS px per art pixel (NOVA's grain), with a faint see-through dithered ember glow like NOVA's aura (no outline; Isaac 2026-10-24), finer rounded eyes on the same grid. Code `js/pixel/pyro-mate.js` (`PyroMate`). **Movement (Isaac 2026-10-24: "like fire lit on a line of flammable gas"):** trips of 140 px or more are a flash, not a glide: he becomes the flame front and races along the path (fast start, jittery, 0.4-1.1 s) while a line of fire burns behind him and dies out (white-yellow at the front, orange, red, embers; `js/pixel/pyro-dash.js` `GasTrail`, `dashProgress`; driven by `Pet.startDash/stepDash/endDash`; determined eyes while it lasts, a spark burst on arrival). Shorter trips still glide. Picking him up mid-flash ends it. **Still to do:** exclusive idles (Isaac hasn't picked yet), a battle version, new ability cards. In battle he is still the old SVG body (`dot.js` skin "pyro").
  - **NOVA** (she/her): GOLEM's reward companion, free while Isaac tests her. 3D hi-bit renderer (`js/pixel/nova-px.js`, `nova-mate.js`); idles: orrery, popcorn, and the portal-pizza warp (`nova-warp.js`, `nova-pizza.js`). The warp: the portal sits behind her, she's cut at its middle and darkens as she nears it (depth, no shrinking), and the portal's front rim is redrawn over her, so she goes IN and OUT (Isaac rejected her walking over it or under it). The pizza takes 5 bites: three finish the slice, the 4th takes half the crust, the 5th the rest.
  - **Kaela**: a fighter only (picked when a boss fight starts, shown in the Shop's Characters section); she doesn't roam. Sprites from the Merakintsugi pack, 2D enemies from Ansimuz packs, all committed and cleared (see HISTORY).
  - **DOT is in storage** (Isaac 2026-10-23): hidden from the Shop, the boss picker and all text ("your teammate"), but `js/dot.js`, `VOICES.dot` and his battle kit stay in the code.
  - Looks (hats, glasses, etc.) only render on the old DOT body, so they don't show on PYRO or NOVA yet (the Shop says so).
- **Roaming (`js/pet.js`):** the teammate floats over the page and wanders until picked up; dropping parks him; double-click sets him roaming. Position saved in `state.pet`. The bubble follows and flips to stay on screen; he pauses while talking. NOVA and PYRO glide (DOT hopped).
- **Lessons and practice are calm** (Isaac 2026-10-23: "scrap every level is a fight"): the roaming companion with hints and idles, help from the first Submit. Optional forest music in lessons (Settings, off by default). The old level-fight code is in git history before commit 72a1f57.
- **One boss per module, Module 1 = GOLEM.** The 2D GOLEM (`PixelGolem` chunk 2, flat tones, `boss-fight.js`). **Fighter picker** (`chooseFighter` in `app.js`): Kaela, PYRO or NOVA; saved in `state.boss.fighter`. Mana and ability cards (Addendum J): `economy.js` `MANA`/`TIERS`, `boss-rules.js`, `cards.js`; kits in `js/abilities.js` (DOT, stored), `abilities-nova.js`, `abilities-pyro.js`, `stage2d/kaela-boss-kit.js`. No tips on tries 1 and 2 in boss fights only (`quietTry`).
- **Currency: Bits.**
  - Starter items (free): 15 hints, 15 peeks, 5 solutions.
  - Always free: FAQ, glossary, error explanations, typo detection, output-difference help.
  - All economy numbers live in `site/js/economy.js`.
    - Earn: lesson section 10; challenge Easy 5, Medium 12, Hard 25.
    - ×2 for a first try with no hint or peek; +1/2/3 for a mark of 8/9/10; +5 for the first pass each day; +50 per completed module.
    - Easy and Medium pay half after 5 solves at that difficulty.
    - A solution used means 0 Bits.
    - Shop: hint 10, peek 15, solution 60, streak shield 30. Looks: moustache 100, bow 100, sunglasses 120, party hat 120, nerdy glasses 150, wizard hat 250, laptop 300, crown 400. Editor themes 80. (PYRO used to cost 800; he's the free starting teammate now, the buy path in `economy.js` is unused.)
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

## Testing hooks (all local, safe)
- `/python?test=boss`: a save with Module 1 done and GOLEM ready, plus a "Fill in the answer" button. `/python?test=reset` wipes progress (asks first; Isaac uses it after testing). `/python?test=nova`: equips NOVA, idles every 8-12 s.
- Console: `operandiPet` (the roaming companion; `.warpNow(1|-1)` fires NOVA's warp), `window.__warpSlow = 4` plays the warp 4x slower.
- `node tools/validate.mjs 60` before pushing (CI runs it too).

## Open threads (current)
- NOVA's warp is her third idle (Isaac 2026-10-24): the idle rotation (orrery, popcorn, warp; one every 20-40 s, never the same twice running) picks it, then `Pet.maybeWarp` does it on her next sideways trip (within 90 s). No shrinking in the portal; she only darkens.
- **PYRO revamp, waiting on Isaac** (I sent lists; he hasn't answered). Roaming movement ideas: fuse run (short trips), fireball leap (medium), wildfire crawl (long), rocket hop, rolling fireball, smoke blink; my pick 1-3 by distance. Idle ideas: marshmallow roast, split-and-chase (3 mini flames), fire sneeze, juggling, smoke rings, running low on embers, fire signature, fire dance, ice cube; my picks marshmallow, running low, split-and-chase. Open questions: roaming size (3 px per art px now), whether other moods besides angry use flame F, then a PRD and his "go". After that: battle version, 7 new ability cards that interact with GOLEM (like NOVA's), sounds.
- **Kaela paused** (Isaac: "pause on Kaela's stuff"): a Blood Orb rebuild sits untested on branch `claude/wizardly-wozniak-iu7om1`, not on `main`. Her 7 abilities are to be redesigned as cinematics (review after 3); card art should show the ability, not her.
- Bosses to come: Module 2 and 3 (red-demon, vampire sprites exist, idle only). Boss phases, telegraphs, challenges covering every lesson. The 3D enemies and biomes (Addendum K) are built but unused since lessons went calm; Isaac wanted enemies redrawn as 2D pixel art.
- Isaac sets up Firebase (`docs/SETUP.md`), then the config goes in `site/js/firebase-config.js`. Sync is untested (the cloud sandbox can't reach Google). Home-page Sign in just opens the course for now.
- Phase 2: Module 2 content (if/elif/else, booleans, comparisons, and/or/not), about 30 templates, mistake rules, FAQ. Then Modules 3-8. v1: Isaac's first real use in claude.ai is unconfirmed.
- NOVA's real unlock (free on a first-try GOLEM win, else 1,500 Bits) still replaces "free while testing". WebGL cost of GOLEM and NOVA on iPad is untested.

## ECC (lean install, Isaac 2026-10-24)
Project-only, in `.claude/` (from github.com/affaan-m/everything-claude-code v2.2.3, MIT, licence in `.claude/rules/ecc/LICENSE-ECC`): rules `ecc/common` (code-review, development-workflow, git-workflow, security: always loaded, about 1.5k tokens) and `ecc/web` (6 files, only loaded for web files; `.js` added to their `paths`); skill `product-capability`; agents `planner` and `code-reviewer` (descriptions changed to "use when asked / after big changes", so they don't run after every edit). Trimmed: references to agents, tools and 80% coverage that aren't installed. To remove anything, delete its file in `.claude/`. No MCP servers, hooks or settings changes.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
- Nothing destructive or public without an explicit "proceed".
