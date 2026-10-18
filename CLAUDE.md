# Operandi — notes for Claude

Read this first every session. Full spec: `docs/PRD.md`.

## What this is
Isaac's boot.dev-style Python learning web app. Claude is the teacher: lessons, unlimited challenges, marks out of 10, corrections, hints, redo. Gamified with XP and levels.

## Context
- Learner: Isaac, complete beginner (never written Python). Goal: Python as a career skill.
- Device: laptop. Time: not fixed, so keep lessons and challenges short and self-contained.
- Budget: near zero. No API key, no paid hosting.
- Personal project, no company approval needed.

## Decisions
- Name: **Operandi** (wordmark `operandi.code`). Levels: Operand → Operator → Expression → Function → Module → Program.
- Hosting: private claude.ai Artifact page.
  - Built 2026-10-18.
  - `sample` capability is the teacher.
  - `db` capability stores progress and XP.
  - Pyodide runs Python in the browser.
- Pass/fail comes from real hidden tests. Claude only marks quality (/10) and gives feedback, because AI marking alone can pass broken code.
- Generated challenges are checked before Isaac sees them: the app runs Claude's reference solution against the tests and throws the challenge away if it fails.
- Challenges only use topics already unlocked.
- XP rewards learning, not grinding: more for difficulty and first-try passes, less for hints and repeats.
- Not chosen: GitHub Pages + Claude API (costs money, and the key would be public); plain repo-based course (Isaac wants it interactive).

- Python engine: Pyodide 0.26.4 (Python 3.12), self-hosted in `app/pyodide/`. It runs in a Web Worker (`app/worker.js`) so a runaway program is stopped after 5 s.
  - Self-hosted because the artifact sandbox blocks fetches from CDNs.
  - `python_stdlib.zip` is renamed `python_stdlib.zip.wasm` because the host won't serve .zip. `worker.js` passes `stdLibURL` so Pyodide still finds it.
  - Source: GitHub release `pyodide-core-0.26.4.tar.bz2` (npm and jsdelivr are blocked from the cloud sandbox).
- XP:
  - Lesson base 25; challenge base Easy 15, Medium 30, Hard 50.
  - First try ×1.5. Each extra attempt −20%, never below 40%. The mark (/10) is added on top.
  - Once 5+ challenges of an Easy or Medium difficulty are solved, that difficulty gives half XP.
  - Revealing the solution (allowed after 3 failed attempts) gives 0 XP.
- Levels (XP needed): Operand 0, Operator 150, Expression 400, Function 800, Module 1400, Program 2200.

## Where things live
- Live app: https://claude.ai/artifact/4r3k5iGZrFXD5hQL4WF2VQ (private to Isaac)
- Code: `app/index.html` (page, lessons, marking, challenges) and `app/worker.js` (Python runner)
- Progress: artifact db doc `progress/main`. Read it with ArtifactData (`get`, collection `progress`, doc_id `main`).
  - It holds xp, lessons, passes, streak and `history`: the last 60 submissions with failed tests and the first fix.
  - Use `history` to see where Isaac struggles.
- Republish: copy `app/` to the scratchpad and publish `index.html` with root = that copy and files = worker.js + every file in pyodide/.
  - Capabilities: `{sample:{}, db:{rules:[{path:"", read:"view", write:"owner"}]}}`

## Open threads
- [x] PRD signed off ("go. approved", 2026-10-18). v1 built: Module 1 (5 lessons), challenges, marking, XP and levels.
- [ ] First real use by Isaac: check that Python loads inside claude.ai. Local browser tests passed, but the live sandbox wasn't tested.
- [ ] Unverified: how `sample` calls count against Isaac's plan usage and rate limits.
- [ ] After a week of use: adjust, then build Module 2 (if/else).
- [ ] Public/portfolio version later? Would need different hosting.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
