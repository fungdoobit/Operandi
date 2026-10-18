# Operandi — PRD v2 (draft, awaiting Isaac's sign-off)

## 1. Problem
Isaac is a complete beginner at Python (level a). Wants it as a career skill. boot.dev's interactive parts are paywalled. Wants a boot.dev-style web app where Claude is the teacher and marker.

## 2. Success criteria
- Can write a 30–50 line script from a blank file, no AI, by end of the core path.
- Lessons take 10–20 min; a challenge takes 5–15 min.
- Every submission gets feedback in under ~20 s.
- Challenges Claude generates are checked automatically before Isaac sees them. Target: 0 broken challenges shown.

## 3. Scope
IN (v1):
- Web app hosted as a private claude.ai Artifact
- Real Python running in the browser (Pyodide)
- Module 1: 5 lessons (print, variables, numbers, strings, f-strings)
- Infinite challenges, limited to topics already unlocked
- Submit → hidden tests (pass/fail) + Claude mark /10, corrections, hints → redo
- XP, levels (Operand → Operator → Expression → Function → Module → Program), streak, per-topic mastery; progress saved in the artifact db
OUT (v1): public hosting, logins for others, leaderboards, mobile-first editor, Modules 2+

## 4. Constraints
- Near-zero budget: no API key, no paid hosting
- Teacher calls probably count against Isaac's Claude plan usage (unverified)
- Only works signed in to claude.ai; not a public portfolio piece in this form
- Personal project, no company approval needed

## 5. Plan
1. Shell: editor + Run button + output panel (Pyodide)
2. Lesson 1 end to end: explanation → exercise → tests → Claude feedback
3. Progress + XP saved in db
4. Challenge generator (Claude writes challenge + tests + reference solution; app runs the reference against the tests; discard if it fails)
5. Lessons 2–5, levels and streaks
6. Isaac uses it for a week → adjust → Module 2

## 6. Open questions
- Laptop or phone? → **Laptop** (answered). Desktop layout: lesson left, editor + output right.
- Hours per week? → Not fixed, "as much as I can". So keep units small (lesson ≈ 10–20 min, challenge ≈ 5–15 min) so any length of session works.
- Repo: created by Isaac (`fungdoobit/operandi`).
- Will it need to be public later (portfolio)? If yes, that needs a different hosting setup later.
- Will it need to be public later (portfolio)? If yes, that needs a different hosting setup later.
