# Operandi v2 — standalone site, no AI (draft v2.1, awaiting Isaac's sign-off)

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
- **Currency: "Bits"** (in-game only, never real money).
  - New users start with free items: **15 hints, 15 test peeks, 5 full solutions**.
  - Earn Bits from lessons and challenges, with more for first try and Hard.
  - Spend Bits in a shop to restock.
- **Shop items:**
  - hint
  - test peek (shows what one failing test expects)
  - streak shield
  - full solution (gives no reward)
  - cosmetics: editor themes and mascot outfits
- **Always free, never sold:** error explanations, typo detection, FAQ, glossary. Only hints, peeks and full solutions cost Bits (decided with Isaac).
- **Mascot companion: DOT (Digital Operandi Teammate)**
  - a cute goopy blob, based on Isaac's reference image
    - glowing light-blue body with a soft dome and a droopy curl on one side
    - two simple glowing white eyes, tiny mouth
    - animation: idle wobble and squish, blinking, bouncing when happy, drooping when sad
  - moods: happy, thinking, worried, celebrating, sleepy; plus a speech bubble
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
  - about 25–40 challenge templates, each genuinely different (not just renamed), with random values, names and scenarios. Target: about 250+ templates across the course; no cap, more where a module has more to practise
  - templates for each module use only that module's ideas and earlier ones
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
  - the mascot design, shown to Isaac for approval first
  - Module 1 ported from v1, with about 25 templates
- **Phase 2:** Module 2 (if/else), about 30 templates, plus mistake rules and FAQ for it. Tune the economy from Isaac's real numbers.
- **Phases 3–6:** two modules per phase, until 8 modules and 100+ templates.
- **Each phase:** automatic checks pass, Isaac uses it, then we adjust.

## 6. Open questions
- Decided: currency "Bits"; levels Operand → Program, earned by finishing modules; starting items 15 hints, 15 peeks, 5 solutions; FAQ always free; templates "as many as possible, per module".
- Decided: mascot is **DOT, the Digital Operandi Teammate**.
- Isaac must create a Firebase project and connect the repo to Vercel. Claude walks him through both.
- Reuse an existing open-source error explainer (friendly-traceback, or the Raspberry Pi Foundation's python-friendly-error-messages) or write our own rules? Licenses not checked yet.

## Addendum A: roaming DOT, new shop items, PYRO (approved with "go", built 2026-10-18)

Decided with Isaac on 2026-10-18:
- **Roaming:**
  - DOT free-roams anywhere on screen.
  - Isaac can pick him up (picked-up face, stretch) and plop him down (splat, squeezed eyes). DOT then stays parked there, remembered across visits.
  - Double-click sets him roaming again.
  - His speech bubble follows him and flips to stay on screen.
  - Works with mouse and touch (iPad).
- **New shop items:**
  - fake moustache 100
  - sunglasses 120
  - nerdy big black-frame glasses 150 (replaces the old "Reading glasses")
  - wizard hat 250
  - laptop 300 (DOT types along when Isaac types)
- **PYRO** (PYthon Runtime Operative), 800 Bits:
  - His own character with a slightly redesigned look, in the same cute, chubby, soft, rounded style as DOT.
  - Flames instead of watery goop: warm orange-red glow, soft round flame flicker on top, floating embers inside. Same black-line face style.
  - Personality: energetic and fired-up, where DOT is calm and patient. Same help content, own voice for greetings and reactions.
  - Isaac chooses which teammate is active and can switch any time.
- **Prices:** confirmed by Isaac.

## Addendum B: home page (approved with "go", built 2026-10-20)

Decided with Isaac on 2026-10-20:
- **Home page at `/`.** The course moves to `/python`, unchanged.
- **Wordmark:** a big "Operandi" in Bricolage Grotesque, on a warm off-white background, with a dark version for night mode.
- **Language tiles:** they slowly cycle around in a circle on a loop.
  - Drag or scroll to spin them, on touch too.
  - Hovering gives a macOS-Dock-style magnify effect: the tile under the cursor grows most and its neighbours a little. Subtle, smooth.
  - Only Python is clickable and opens the course; the others show "Coming soon".
  - Icons are simple originals drawn in the same rounded-tile style (no official logos).
- **Buttons:**
  - Sign in: a button only, no function yet.
  - Pricing: scrolls to the pricing section.
- **Planned pricing**, small and low-key at the bottom: RM80 one-time or RM20/month, labelled "Planned pricing — not available yet". No payments.
  - If real payments are ever added: Vercel Hobby doesn't allow commercial use (Pro is needed), plus payment setup and terms.
- Tiles, in order: Python (clickable), VBA (the coloured blocks), C++, HTML, SQL. All but Python are "Coming soon".

## Addendum C: boss fights and streak rewards (draft, awaiting "go")

Decided with Isaac on 2026-10-20:
- **The boss is the last step of each module.** The lessons unlock the boss. Winning completes the module, which gives the +50 module Bits and the level-up.
- **Rewards:**
  - First-try win: the boss's exclusive accessory (with its own animation or effect) plus 100 Bits.
  - Win on a retry: 50 Bits. The exclusive is then unlocked in the Shop for 1,500 Bits (Isaac, 2026-10-20).
- **Build order:** the battle system, the Module 1 boss and streak rewards first. Each later module ships with its own boss.
- **Special moves:** each boss has its own, tied to that module's topic. They are telegraphed one turn ahead and must be beatable with that module's skills only.
- **Difficulty scales by module, based on what that module taught** (Isaac, 2026-10-20).
  - Boss challenges test only that module's topics (see "Boss topics" below).
  - Later bosses get harder through challenge difficulty, special-move frequency and fewer misses you can afford. Not just bigger HP numbers, which would only make fights longer.
  - The validator checks that every boss challenge and special move uses only topics already taught.
- **Fight rules (proposed):**
  - Both sides have 100 HP.
  - A pass deals 15–25 depending on the mark. A flawless pass (10/10, first submission, no hint or peek) is a crit for 40. A fail is a miss.
  - The boss hits for 20.
  - Hints and peeks cancel the crit. Solutions are off.
  - Losing costs nothing, and you can retry straight away.
- **Streak rewards (proposed):**
  - 7 days: 40 Bits + 1 hint
  - 15 days: 80 Bits + 1 shield
  - 30 days: 150 Bits + a one-time badge cosmetic
  - Every 30 days after that: 150 Bits
- **Module 1 special moves (Isaac's pick):**
  - Firewall: blocks part of your next hit; only a crit breaks through.
  - Typo Swarm: planted typos in the starter.
  - Glitch Text: the given text arrives messed up and must be cleaned first.
- **Boss topics: own module only, for now** (Isaac, 2026-10-20). Each boss tests only its own module's topics.
  - Earlier basics (print, variables) may appear as glue but are never what's tested.
  - Review mixing modules later, once we've seen the balance.
- **Super move: parked** (Isaac, 2026-10-20). It would be double damage after 2 crits in a row. Left out until the balance has been seen in real fights, so the companion isn't made too strong.
