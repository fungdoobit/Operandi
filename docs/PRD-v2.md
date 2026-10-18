# Operandi v2 — standalone site, no AI (draft, awaiting Isaac's sign-off)

## 1. Problem
The v1 app only works inside claude.ai, because its teacher is Claude. Isaac wants a standalone web app with its own URL, like his EMT hub (on Vercel). It must:
- work on his laptop, desktop and sometimes his iPad, with progress synced between them
- be free
- teach with no AI: a rule-based companion and a large stored knowledge base
- use an in-game currency instead of XP

The claude.ai version stays as a separate "office hours" tool.

## 2. Success criteria
- Feedback appears in under 1 second after Submit. No AI calls, no usage limits.
- Progress done on the laptop shows up on the iPad after signing in.
- At least 90% of the beginner mistakes in Isaac's first 50 failed submissions get a specific help message, not a generic one. Checked against the submission log.
- Every challenge template passes an automatic check: the reference solution passes on 50 random variants, and the starter code fails.
- Running cost stays at 0.

## 3. Scope
IN:
- **Site:** static site on Vercel (Hobby plan), with Python running in the browser (Pyodide).
- **Sign-in and sync:** Google sign-in plus progress saved in Firebase (free Spark plan).
- **Currency** (working name "Bits"; in-game only, never real money):
  - start with 15 hints
  - earn Bits from lessons and challenges, with more for first try and Hard
  - spend Bits in a shop
- **Shop items:**
  - hint
  - test peek (shows what one failing test expects)
  - streak shield
  - full solution (gives no reward)
  - cosmetics: editor themes and mascot outfits
- **Always free, never sold:** error explanations, typo detection, FAQ. Help that a stuck beginner needs is never locked behind currency.
- **Mascot companion:**
  - an animated SVG character with moods (happy, thinking, worried, celebrating) and a speech bubble
  - gives marks, feedback, explanations, error help and recommendations ("You've failed this 3 times. Want a hint?")
  - all rule-based, no AI
- **Mistake detector:**
  - looks at the error and at your code
  - spots typos (with "did you mean …"), wrong capitals, missing quotes, brackets or colons, wrong indentation, `=` vs `==`, mixing text and numbers, answers typed in by hand, forgotten f's on f-strings, and so on
  - shows the matching help message automatically
- **Marking /10 by rubric:**
  - correctness from the tests
  - style checks that can be detected automatically (names, unused variables, hard-coding)
  - attempts used
- **FAQ and glossary:** searchable, linked from the help messages.
- **Curriculum, about 8 modules:**
  1. Basics
  2. Decisions (if)
  3. Loops
  4. Lists
  5. Functions
  6. Dictionaries
  7. Files and errors
  8. Real-world mini projects (data cleaning, reports)
- **Content per module:**
  - 5–7 lessons
  - 12–15 challenge templates with random values, names and scenarios, so 100+ templates in total
  - FAQ entries
  - mistake rules
- **Automatic content checks** on GitHub Actions (free), run on every change.

OUT:
- AI in the standalone site
- real money
- other users, leaderboards and social features
- merging progress with the claude.ai version (the two stay separate)
- an offline mode

## 4. Constraints
- Cost 0: Vercel Hobby (personal, non-commercial) and Firebase Spark.
  - Spark shuts a service off for the month if a limit is hit, instead of charging.
  - A single learner uses a tiny fraction of the quota.
- If real money is ever added: Vercel Hobby doesn't allow commercial use (Pro is paid), and payments bring legal and tax work. Out of scope.
- No AI at runtime, so all knowledge is written in advance. Quality depends on how much content gets written.
- Isaac's time: content arrives in phases, so he can learn Module 1 while later modules are being built.

## 5. Plan (smallest working version first)
- **Phase 1, the engine:**
  - site shell, Python runner, lesson and challenge formats
  - currency, shop and mascot
  - mistake detector, FAQ
  - Google sign-in and sync
  - the content-check script
  - Module 1 ported from v1, with about 15 templates
- **Phase 2:** Module 2 (if/else), about 15 templates, plus mistake rules and FAQ for it. Tune the economy from Isaac's real numbers.
- **Phases 3–6:** two modules per phase, until 8 modules and 100+ templates.
- **Each phase:** automatic checks pass, Isaac uses it, then we adjust.

## 6. Open questions
- Currency name: "Bits"?
- Mascot name and look. Suggestion: "Dot", from the dot in operandi.code.
- Keep level names (Operand → Program) tied to modules completed?
- Starting hints: 15?
- Isaac must create a Firebase project and connect the repo to Vercel. Claude walks him through both.
- Reuse an existing open-source error explainer (friendly-traceback, or the Raspberry Pi Foundation's python-friendly-error-messages) or write our own rules? Licenses not checked yet.
