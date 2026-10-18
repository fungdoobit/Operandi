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
  - Accessories: bow, party, glasses, crown. Code: `site/js/dot.js`. Preview page: `site/dot-preview.html`.
  - Status: DOT v1 was sent to Isaac for approval; waiting on his reply.
- **Currency: Bits.**
  - Starter items (free): 15 hints, 15 peeks, 5 solutions.
  - Always free: FAQ, glossary, error explanations, typo detection, output-difference help.
  - All economy numbers live in `site/js/economy.js`.
    - Earn: lesson 20; challenge Easy 5, Medium 12, Hard 25.
    - ×2 for a first try with no hint or peek; +1/2/3 for a mark of 8/9/10; +5 for the first pass each day; +50 per completed module.
    - Easy and Medium pay half after 5 solves at that difficulty.
    - A solution used means 0 Bits.
    - Shop: hint 10, peek 15, solution 60, streak shield 30, cosmetics 80–400.
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

## How content works
- **Lessons:** `site/content/m1-lessons.js`.
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
- [ ] Isaac approves DOT's look (preview sent 2026-10-18), or asks for changes.
- [ ] Isaac sets up Vercel and Firebase (`docs/SETUP.md`), then pastes the Firebase config into `site/js/firebase-config.js`.
- [ ] Firebase sign-in and sync are untested: the cloud sandbox couldn't reach Google. Test once Isaac has a config.
- [ ] Phase 2: Module 2 (if/elif/else, booleans, comparisons, and/or/not) with about 30 templates, plus mistake rules and FAQ for it. Then tune the economy from Isaac's real numbers.
- [ ] Phases 3–6: Modules 3–8 (loops, lists, functions, dicts, files and errors, real-world projects).
- [ ] v1: Isaac's first real use inside claude.ai is still unconfirmed.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
- Nothing destructive or public without an explicit "proceed".
