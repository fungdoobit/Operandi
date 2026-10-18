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
  - `sample` capability is the teacher.
  - `db` capability stores progress and XP.
  - Pyodide runs Python in the browser.
- Pass/fail comes from real hidden tests. Claude only marks quality (/10) and gives feedback, because AI marking alone can pass broken code.
- Generated challenges are checked before Isaac sees them: the app runs Claude's reference solution against the tests and throws the challenge away if it fails.
- Challenges only use topics already unlocked.
- XP rewards learning, not grinding: more for difficulty and first-try passes, less for hints and repeats.
- Not chosen: GitHub Pages + Claude API (costs money, and the key would be public); plain repo-based course (Isaac wants it interactive).

## Open threads
- [ ] Waiting for Isaac's "go" on the PRD before any code is written.
- [ ] Unverified: whether `sample` calls count against Isaac's plan usage, and its rate limits.
- [ ] Public/portfolio version later? Would need different hosting.

## Working rules (from Isaac)
- No building before PRD sign-off ("go" / "looks good").
- Teach as you build: explain the key parts in plain words.
- Update this file's Context / Decisions / Open threads as things change.
