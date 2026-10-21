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

## Addendum C: boss fights and streak rewards (approved with "go" 2026-10-20, in progress)

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
- **Boss 1 is GOLEM** (Glitched Overclocked Logic-Eating Machine), a floating corrupted mech. The design went through 3 rounds of Isaac's feedback (2026-10-20). The Firewall is a smooth dome with hexes inside.
- **Longer fights** (Isaac, 2026-10-20): GOLEM has 300 HP and damage stays as below.
  - So the teammate also needs 300 HP, which means about 13–15 challenges per fight (roughly 45–60 minutes).
  - A fight in progress is saved, so Isaac can stop and carry on later.
  - The exact numbers live in `economy.js` and get tuned after real fights.
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

### Addendum C, step 2: the fight in the course (built 2026-10-20, after Isaac's "yea, good")
- **Where:** "Boss: GOLEM" sits at the end of Module 1 in the course list, unlocked by finishing the lessons. The fight shows in the lesson column (hi-bit stage on top, the challenge below); the editor works as usual.
- **Module completion moved:** with a boss, finishing the lessons unlocks him and **beating him** completes the module (+50 Bits, level up). Saves that completed Module 1 before bosses existed keep it.
- **Turns:** each challenge is a turn. A pass is your strike (15–25 by mark; 40 crit for 10/10 on the first Submit with no hints or peeks). **Every failed Submit is a miss and GOLEM hits back for 20.** Run is free.
  - **Changed 2026-10-21 (Isaac: "the boss doesn't really get to attack, no tension"):** GOLEM also strikes back for 10 after every pass. A crit staggers him, so no strike back that turn. You lose after about 9 misses.
- **Layout (2026-10-21):** the battle is a band across the top of the page (outside the scrolling instructions; sticky on iPad portrait and phones) and scales with the screen. The course list collapses behind a ☰ button (a slide-in drawer up to 1400 px wide). From 1900 px the interface scales up in steps.
- **Numbers (BOSS in `economy.js`):** 300 HP each. Challenges get harder as he weakens (Easy above 200 HP, Medium above 100, then Hard).
- **Specials:** after every 3rd pass he telegraphs one (never the same twice running):
  - Firewall: halves your next hit (then it's used up); a crit smashes straight through.
  - Typo Swarm: two letters of a given variable's name in the next starter are swapped.
  - Glitch Text: # % & @ symbols land inside the next starter's given text.
- **Solutions are off;** hints and peeks work but cancel the crit. The fight is saved after every turn.
- **Rewards:** first-try win +100 Bits, a win on a retry +50, rematches nothing. **GOLEM's exclusive accessory isn't designed yet:** first-try winners are recorded so they get it when it exists.
- **Test links (for Isaac):** `/python?test=boss` loads a save with Module 1's lessons done and GOLEM ready; `/python?test=reset` wipes everything back to the very beginning. Both ask first.
- **Still to do:** GOLEM's exclusive accessory (and the aura slot), streak rewards.

## Addendum D: lesson sections (approved with "sure", built 2026-10-20)

- **Problem:** lessons taught several things but practised only one. For example, Lesson 1 taught text, numbers and comments, but its task only used text.
- **Change:** each lesson is split into sections. Each section has its own explanation, its own task and 3 hints, and is submitted on its own.
  - Section tabs sit under the lesson title. A section opens once the one before it is done.
  - The lesson completes after its last section, marked as the average of its sections.
- **Lesson 1:** printing text, numbers and sums, comments.
- **Lessons 2–5** are split the same way: 12 sections in total.
- **Bits:** 10 per section, replacing 20 per lesson.
- **Checks:** every section is covered by the content checker.
- **Old progress:** a lesson finished before sections existed still counts as done.

## Addendum E: Hollow Knight-inspired battle style (concept rejected for looks; motion kept)

Asked by Isaac on 2026-10-20: "take heavy inspo from Hollow Knight for everything, art style, animations, attacks".
- **Scope (Isaac):** battles and characters. Lessons and the home page stay as they are.
- **Trial only:** DOT and PYRO are restyled as a trial. If Isaac doesn't like them, they go back to the approved designs.
  - Isaac wants to see the style because future teammates won't all be goo.
- **Two boss options to choose from:** a corrupted bug knight, or GOLEM redrawn in the new style.
- **Built as a separate concept:**
  - Preview page: `site/hk-preview.html`. Code: `site/hk/engine.js` (stage, clock with hit-stop, puppet parts, effects) and `site/hk/chars.js`.
  - The approved `dot.js`, `boss.js` and `pet.js` are untouched, so reverting costs nothing.
- **Style:**
  - Look: a dark misty cavern with depth layers, inky bodies, pale masks with hollow eyes, and soft glows.
  - Motion: anticipation holds, then very fast strikes, hit-stop on impact, camera shake, white flashes.
  - Effects: ink bursts when the teammate is hit, orange blobs when the boss is hit, soul wisps, crescent slashes, and shockwaves rolling along the floor.
  - All original art (no Hollow Knight assets or characters).
- **Next:** Isaac picks the boss and approves or rejects the restyle. Only then does it replace the current art, which would need the restyle rebuilt for roaming on lesson pages too.

**Outcome (2026-10-20):** Isaac hated the character designs.
- Decision: drop the look and bring the animation over to the approved characters, themed to each one: DOT water, PYRO fire.
- He wants high-quality, high-impact, cinematic animation.
- Built as `battle-time.js`, `battle-fx.js` and `battle-moves.js` (see CLAUDE.md).

## Addendum F: hi-bit pixel art for battles ("go" 2026-10-20, prototype in progress)

**Problem.** Isaac: the battle art looks like "simple shapes glued together".
- He wants detailed, high-density pixel art like his two references: a heavy armoured mech with an orange core, and a mechanical spider-bot.
- That style is usually called "hi-bit" pixel art: fine pixels, rich shading, dithering and dense mechanical detail.

**Scope (Isaac, 2026-10-20):** everything in battles.
- GOLEM, DOT, PYRO and the effects (water, fire, explosions).
- Lessons and the home page stay as they are.

**Ready-made art, checked:**
- Free licensed packs (Foozle's CC0 Sci-Fi Lab Mecha Boss, TheScrawlHive's mechs, PVFX Foundry's CC0 water effects) are small, low-detail sprites (32 to 96 px).
- None match the density Isaac wants, and none are our characters.
- Decision (Isaac left it to Claude): build our own, using a proven technique rather than other people's art.

**Technique: 3D model rendered as pixel art** (how Dead Cells made its characters):
- Each character is modelled in code as 3D shapes. GOLEM gets armour panels, bolts, vents, pistons, cables, crystals and a faceted core. DOT stays a glossy goo blob with his face.
- A WebGL shader renders the model at a reduced resolution with:
  - a key light and a rim light
  - a fixed palette per material
  - ordered dithering between shades
  - dark outlines
- The image is then scaled up with hard pixel edges.
- Pixel size is about 2–3 screen pixels, so "very high density", as Isaac asked.
- It animates freely (aiming, swinging, squash and stretch) because the 3D parts move.
- Effects get the same palette, dithering and pixel grid, so they match.
- If a device is too slow, the same renderer can pre-render frames into sprite sheets instead.

**Honest limit.** It gets real shading, depth and detail, but it won't be identical to art hand-painted pixel by pixel by a professional pixel artist.

**Plan (smallest first, Isaac checks each step):**
1. GOLEM prototype: idle animation plus one attack, rendered in this style. Isaac approves or gives feedback before anything else is converted.
2. DOT and PYRO in the same style: same characters and faces, approved designs kept. A design round.
3. Effects converted to the pixel style.
4. Swap the battle preview over.

**Cost:** free. WebGL works on laptop, desktop and iPad.

**Open questions:**
- Pixel size (2 or 3 screen pixels): decide on the prototype.
- Whether the boss's glitch effects stay as they are or become pixel glitches.

- **Battle transition (Isaac, 2026-10-20):** entering a battle should pixelate into this style. The pixel grid starts very coarse and resolves down to the fine, high-density pixels. Build it with the battle screen.

## Addendum G: battle sound and music ("go" 2026-10-21, built)

**Problem.** Battles are silent. Isaac (2026-10-21) wants cinematic, heavy sound design and pixel-style battle music.

**Approach: made in the browser with Web Audio.** No sound files and no licences: the music and effects are generated by code at play time.
- It fits the style: chiptune *is* synthesised sound (pulse, triangle and noise channels, like old consoles).
- Heavy hits are layered: a sub-bass thump, a noise crack, a pitched body, and a short room echo.
- Original, free, tiny, and every sound can be tuned in one file.
- Fallback if the hits don't feel heavy enough: free CC0 impact packs (e.g. Kenney), which allow any use.

**Success criteria**
- Every attack, hit, crit, special, win and loss has its own sound, timed to the animation (including hit-stop and slow motion).
- The music loops without a gap and builds as GOLEM weakens.
- A sound button on the battle band: on/off plus volume, remembered on each device.
- No added lag (audio runs on its own thread), and it works on iPad (sound starts after the first tap; the silent switch is respected).

**Scope: in**
- Music: an original chiptune battle theme (about 150 BPM, roughly a 40-second loop). An intro on entry, a heavier layer below 1/3 of GOLEM's HP, a victory jingle and a defeat sting.
- Effects:
  - Entrance: pixelate swoosh, title stinger.
  - GOLEM's attacks: claw slam (charge whine, whoosh, crunch and boom), cannon shots, core laser (charge and beam roar).
  - DOT's moves: water whooshes, blade slash, splashes, the tidal wave; PYRO gets fire versions.
  - Hits, crits (bigger, pitched down in slow motion), misses and HP hits.
  - Specials: Firewall hum and shatter, Typo Swarm launch and buzz, Glitch Text bit-crushed static.
  - Win and loss.

**Scope: out (for now)**
- Sounds in lessons and on the home page.
- Voices.
- Licensed or downloaded music.

**Plan:** (1) the sound engine and the sound button; (2) effects for every move; (3) the music theme and its intensity layers; (4) check on iPad.

**Open questions**
- Music on by default, or off until turned on?
- Default volume around 60%?

**Built 2026-10-21** (Isaac: "just add the music with settings in the side bar").
- `site/js/sound.js`: the Web Audio engine (compressor + limiter, short room echo), the effects, and the chiptune battle theme (D minor, 150 BPM, 16 bars; heavier above 2/3 intensity), plus victory and defeat jingles. `wireBattleSounds()` ties sounds to the battle effects, so they line up with hit-stop and slow motion.
- **Settings in the course list:** Music on/off and volume, Sound effects on/off and volume (saved per device), and **Companion roams the screen** (off: your teammate stays in the bottom-right corner; you can still drag him).
- Defaults: music on at 60%, effects on at 80%.

## Addendum H: GOLEM's reward becomes an exclusive space-magic companion (draft, awaiting "go")

**Change (Isaac, 2026-10-21):** GOLEM's reward is no longer an accessory. It's a new exclusive **companion**, the third after DOT and PYRO, and the first that isn't goo.
- Theme: space magic.
- Special because only a boss win unlocks him.

**How he's earned** (same rule as the accessory had):
- Beat GOLEM on your **first try**: he's yours for free.
- Win on a **retry**: he appears in the Shop for **1,500 Bits**.
- Not available any other way.

**What he does**
- **Same companion jobs as DOT and PYRO:** he roams the page (or stays put), gives feedback, hints and error help, wears accessories and fights in boss battles. He has his own voice lines.
- **Random idle animations**, while roaming or parked:
  1. **Orrery:** he floats up and summons small planets, a tiny black hole and asteroids that orbit around him, then fades them away.
  2. **Snack break:** a small black-hole portal opens, he pulls out a bucket of popcorn and eats a couple of pieces, then the portal swallows the bucket.
  3. Room for 1–2 more later (e.g. a shooting star, a mini constellation).
- **Cinematic sound effects** for each idle: cosmic shimmer, a gravity whoosh and hum, the portal opening, popcorn munching. They use the effects and roaming volumes, so they're easy to turn down.
- **A reveal moment:** when he's unlocked (the win screen or buying him), a short cinematic introduces him.

**Success criteria**
- He reads instantly as different from DOT and PYRO, and as premium.
- The idle animations play at random (every 20–40 s, never the same twice in a row) without getting in the way of lessons.
- Smooth on PC and iPad (no per-frame SVG filters).

**Scope: in**
- A design round first (concepts for Isaac to pick from), then his body and moods (idle, happy, thinking, worried, sad, sleepy, celebrate, angry for battle), roaming, pick-up and drop, the idles with their sounds, the Shop and unlock flow, voice lines, and battle moves.

**Scope: out (for now)**
- Exclusive companions for later bosses.

**Plan**
1. Design concepts (still images) for Isaac to choose from.
2. Body, moods and roaming.
3. Idle animations and sounds.
4. Unlock flow, Shop and reveal.
5. Battle moves.

**Open questions:** his name, which design direction, and whether battle moves come now or later.

## Addendum I: battle arena background and full ability kits (draft 2026-10-21, awaiting "go")

**Problem.** The GOLEM fight happens on a plain dark band, NOVA can't fight yet (DOT stands in), PYRO reuses DOT's water moves recoloured as fire, and GOLEM has 3 attacks plus 3 specials. Isaac wants the fight to feel like a Demon Slayer scene: high quality, cinematic, heavy hit-stop and screen shake, all in the hi-bit pixel style.

**Success criteria.**
- A hi-bit pixel arena behind the GOLEM fight that matches GOLEM and NOVA, with light ambient motion, and no frame drops on Isaac's PC or iPad (target: 60 fps PC, 30 fps or better iPad).
- NOVA fights with her own 6 abilities, PYRO with his own 6, GOLEM gains 2 attacks (5 attacks + 3 specials).
- Every ability has anticipation, a fast strike, hit-stop on contact, screen shake and follow-through, and its own sound.
- Isaac signs off the quality bar on the first three abilities before the rest are built.

**Scope (in).**
1. Arena background, boss 1, "The Sunken Foundry": a ruined data foundry in a cavern. Far layer: silhouetted server towers with blinking lights and a dim eclipse-purple haze; middle: hanging cables, broken pipes, cyan ice crystals (GOLEM's ice); floor: cracked metal grating that existing floor cracks and shockwaves land on. Drawn once into a pixel canvas, with a small animated layer (blinking lights, drifting dust, a cable sway). Parallax nudge on camera shake.
2. A shared **pixel FX layer**: effects drawn on a low-res canvas and turned into pixel art (dither, colour steps, outline) in one GPU pass, so flames, magic ribbons, chains and hands all look hi-bit and consistent.
3. **NOVA's kit** (4 attacks, 2 crit finishers), from Isaac's purple VFX references:
   - *Grasp of the Void* (signature): a rune circle tears open under GOLEM; dozens of shadow hands claw up, grab him and crush; hit-stop on the squeeze.
   - *Void Orb*: she gathers a swirling dark orb with a trailing tail, fires it; it detonates into a grinding vortex (multi-hit ticks).
   - *Spectral Chains*: glowing chains burst from a rune circle, lash around GOLEM, she yanks and slams him down.
   - *Wraith Flock*: screaming shadow wraiths stream out of her cloak and rip through him.
   - Finisher *Eclipse Lance*: her corona spins up, the screen goes dark, a lance of black light fires through a ring of runes.
   - Finisher *Event Horizon*: a black hole (disc and lensing ring, no sphere) forms above GOLEM, drags debris and him upward, collapses into a star-flash.
4. **PYRO's kit**, from Isaac's fire references:
   - *Flame Sword*: he forms a blade of fire, dashes, slashes with a long burning arc; afterburn embers.
   - *Comet Kick*: leaps and kicks a spiralling fireball that bursts into cel-shaded fire and black smoke puffs.
   - *Crescent Wave*: a ranged crescent of fire that skims the floor and bursts on impact.
   - *Eruption*: the floor cracks under GOLEM and a volcanic pillar blasts up with fire rings.
   - Finisher *Meteor Rain*: target circles appear, then meteors with long trails slam down in sequence.
   - Finisher *Inferno Line*: a wall of fire races along the floor and erupts into a flame tornado.
5. **GOLEM**, two new attacks: *Missile Swarm* (pod hatches open, a volley of homing missiles arc over with smoke trails, carpet explosions) and *Crystal Spikes* (he slams the floor and a line of ice spikes erupts toward the teammate).
6. NOVA as a real fighter on the battle stage (her pixel model, facing GOLEM, angry eyes, hurt/KO/win reactions). PYRO and NOVA use their own kits; DOT keeps his water moves.

**Scope (out).** New bosses; DOT's 3D rebuild; the NOVA unlock; new battle rules or damage numbers; any image assets (everything is drawn in code; the references are inspiration only, nothing traced or copied).

**Constraints.** Zero budget, no sound or image files, no AI at runtime. Isaac's usage limits: this is several sessions. Performance: no per-frame SVG filters (Addendum F rule); one extra WebGL pass at most for the FX layer; NOVA in battle is a second raymarched character next to GOLEM, so iPad speed must be checked early.

**Plan (smallest working version first).**
1. Arena background → Isaac reviews.
2. Pixel FX layer + one ability each as the quality bar: NOVA *Grasp of the Void*, PYRO *Flame Sword*, GOLEM *Missile Swarm* → video → Isaac reviews.
3. NOVA as a fighter on the stage; the rest of NOVA's kit.
4. The rest of PYRO's kit; GOLEM *Crystal Spikes*.
5. Sounds for each, performance pass (iPad), notes.

**Open questions.**
- Isaac called NOVA "her". Switch NOVA to she/her everywhere (voice lines, notes)?
- Background: "Sunken Foundry" (recommended, fits GOLEM's mech, ice and glitch), or a frozen crystal cavern, or a void wasteland under an eclipse sky?
- OK to review after the first three abilities before building the rest?

## Addendum J: mana and ability cards in boss fights (Isaac's idea 2026-10-21; his answers in, numbers awaiting OK)

**Problem.** In a boss fight a pass just triggers a random move. Isaac wants fights to reward flawless code and give the learner real choices.

**Proposal.**
- **Mana from each pass:** a flawless pass gives 10 mana, a weaker pass less (the mark: 6 to 9). Each hint used costs 2 mana and each peek 3; a used solution gives 0 (only the free basic strike). Any help also means no crit.
- **Spend it now:** mana is spent on that turn's ability; whatever is left over is lost (so the ultimate really needs a flawless pass). *(alternative: bank it up to 10)*
- **Ability cards:** each teammate has a hand of their abilities as poker-style cards with pixel art from the ability, a mana cost gem and a cooldown counter. Hover lifts a card; left click flips it to show what it does (damage, cost, cooldown, effect) with a **Cast** button on the back. A free **basic strike** (no cost, no cooldown) is always there, so a pass is never wasted.
- **Tiers** (numbers to tune with real play):
  | tier | mana | cooldown | damage |
  |---|---|---|---|
  | basic strike | 0 | none | 10 |
  | light ability | 3 | none | 15 |
  | medium ability (2 per kit) | 5-6 | 2 turns | 22-26 |
  | heavy ability | 8 | 3 turns | 32 |
  | ultimate (2 per kit) | 10 | 5 turns | 45 |
  Each 6-ability kit from Addendum I is sorted into these tiers (for NOVA: Wraith Flock light, Void Orb and Spectral Chains medium, Grasp of the Void heavy, Eclipse Lance and Event Horizon ultimate; PYRO and GOLEM likewise).
- **Turn flow:** submit → pass → the card hand slides up with your mana shown → pick a card → the ability plays → GOLEM strikes back (as now, except after an ultimate). A failed submit is still GOLEM's free hit.
- **No tips on the first two tries** of a boss challenge: the teammate stays quiet, and Feedback only says how many tests passed plus Python's own error message (no explanation, no typo spotting, no output-difference help). From the third try the usual free help comes back. Hints and peeks can still be bought at any time; they cost mana and remove the crit.
- This changes the "always free: error explanations, typo detection, output-difference help" rule, **for boss fights only**. Lessons and practice keep all free help.

**Out of scope.** Changing marking itself; new bosses; card collecting or trading.

**Open questions.**
1. No tips on tries 1-2: boss fights only (recommended, since lessons are where a beginner learns), or everywhere?
2. Mana: spend it or lose it each turn (recommended), or save up across turns?
3. Does a flawless pass on the second try still give the full 10 mana? Today the mark only drops at 4+ attempts. Recommended: first try only gets 10; second try at most 8.

**Isaac's decisions (2026-10-21).**
- No tips on tries 1 and 2: **boss fights only**.
- Mana **saves up** across turns (capped at 30 so it can't snowball forever), and ultimates cost **more than 10**, so they take saving.
- **Only a first-try flawless pass gives 10.** Second try: at most 8. Later tries: the mark minus 2 (minimum 4). Each hint −2, each peek −3, a solution 0; any help means no crit.
- Cards: **hover lifts, left click flips** to the explanation, **right click casts**. On iPad (no right click): tap flips, press and hold casts.

**Rebalanced tiers (proposed, to tune with real play):**
| tier | mana | cooldown | damage |
|---|---|---|---|
| basic strike | 0 | none | 10 |
| light | 4 | none | 16 |
| medium (2 per kit) | 7 | 2 turns | 24 |
| heavy | 11 | 3 turns | 34 |
| ultimate | 15 | 5 turns | 48 |
| ultimate II | 20 | 6 turns | 60 |

**Built 2026-10-21 (Isaac: "go"), with these build decisions:**
- Tiers as in the rebalanced table above (`economy.js` `MANA`, `TIERS`). A crit multiplies the cast card's damage by 1.5 (`BOSS.critTimes`) and staggers GOLEM (no strike back). The Firewall still halves a non-crit.
- Cooldowns count your turns (passes): casting a card ticks every other card's cooldown down by one.
- Each teammate has 7 cards: a free basic strike plus the 6 abilities.
  - NOVA: Shadow Bolt (basic), Wraith Flock (light), Void Orb, Spectral Chains (medium), Grasp of the Void (heavy), Eclipse Lance (ultimate), Event Horizon (ultimate II).
  - PYRO: Ember Shot (basic), Crescent Wave (light), Eruption, Comet Kick (medium), Sunfire Halo (heavy), Meteor Rain (ultimate), Inferno Line (ultimate II). Flame Sword was dropped (Isaac disliked it); Sunfire Halo took the heavy slot.
  - DOT keeps his water moves as cards: Water Blade (basic), Hydro Volley (light), Tidal Dive (medium), Crossing Blades (heavy), Tidal Wave (ultimate). No ultimate II yet.
- A pass is saved with its mana before the hand opens (`fight.hand`), so closing the page mid-choice brings the hand back.
- Card art is painted with the battle's cel-effects shader (`toonStill` in `toon-fx.js`).
- 2026-10-21, Isaac: **left click casts, right click flips** (the reverse of his first answer). Touch stays: tap flips, hold casts.
- The old mark-based damage (15 to 25, crit 40) is gone: damage comes from the card, the mark decides the mana.
