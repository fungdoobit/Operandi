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

## Addendum K: every level is a fight, with small enemies per module, plus a scarier GOLEM (draft 2026-10-22, awaiting "go")

**Problem.** Only the boss at the end of a module is a fight; lessons and practice are plain. Isaac wants the whole course to feel like the GOLEM fight: the same cards and mana, the same "no help on tries 1 and 2" rule (hints and peeks still usable), but against smaller enemies, in a biome per module that differs from that module's boss arena. GOLEM should also look much more threatening.

**Success criteria.**
- Every practice challenge happens inside a fight. An enemy fight takes 1 to 3 challenges, about 5 to 15 minutes, not 45 like a boss.
- Each module has its own biome background and 3 to 5 enemies, each with a look, 2 to 3 attacks and a defeat animation, all at GOLEM's quality bar.
- The companions' existing abilities work on every enemy, not only on GOLEM.
- GOLEM still reads as GOLEM (one glowing eye, no brows or mouth), but Isaac calls him scary.

**Scope, IN.**
- **Enemy encounters** on the practice challenges (see open question 1 for lessons). Same card hand, mana, crits, cooldowns and strike-back as the boss fight.
- **Biome per module** (proposal; Isaac's five biomes plus three more, since there are 8 modules):

  | module | biome | enemies (from Isaac's list) |
  |---|---|---|
  | 1 Basics | Whispering Forest | tree monster, corrupted mushroom, wasp, forest spirit |
  | 2 Decisions | Grassland ruins | goblin, snake, spiders, mutated big snail |
  | 3 Loops | Desert | skeleton army: sword, bow and arrow (armies repeat, like loops) |
  | 4 Lists | Ice fields | zombified bear, small robots |
  | 5 Functions | Beach | robotic crab with weapon modifications |
  | 6 Dictionaries | Witch's swamp | witch, wizard |
  | 7 Files and errors | Scorched wasteland | terminator skeleton: plasma cannon, simple gun |
  | 8 Projects | Fallen castle | corrupted knight, plus a mix from earlier modules |

- **A generic enemy target.** Today every ability aims at GOLEM's parts (claw, cannon, poses, his size). Abilities move to a small shared "foe" interface (body centre, size, a few hit points, hurt, knockback, sink, defeat), and GOLEM-only beats (catching Jupiter, ripping free of Grasp) get a short alternative ending for small enemies.
- **Rendering:** enemies are 3D models on the same hi-bit renderer as GOLEM and NOVA; backgrounds are drawn once per size, like the Sunken Foundry.
- **GOLEM, scarier** (small redesign, kept recognisable): the eye becomes a narrow, hungry slit-iris that tracks the teammate and flares red when he attacks; a darker hull with red warning lights instead of friendly blue; sharper, hooked claw and spikes; a hunched, lower stance that leans over the teammate; cracks in his core leaking red light; steam and sparks venting.

**Scope, OUT (for now).** New bosses for modules 2 to 8 (they come with their modules); enemies for modules that don't have lessons yet (only Module 1's enemies are needed until Module 2 exists); new companion abilities.

**Constraints.** Zero budget; all art made in code. Each enemy at GOLEM's quality took several feedback rounds, so enemies are simpler (no specials) and arrive one module at a time. iPad performance is still untested, and more WebGL models on screen add to that risk.

**Plan (smallest working version first).**
1. GOLEM's scarier look (one design round with Isaac).
2. The generic foe interface, so every ability works on any enemy. Check that all current abilities still play on GOLEM.
3. Module 1: the Whispering Forest background and the first enemy (corrupted mushroom, the simplest), wired into the practice challenges end to end.
4. The other Module 1 enemies, one at a time, each reviewed by Isaac.
5. Later modules' biomes and enemies ship with those modules (Phase 2 onwards).

**Open questions.**
1. "All levels": does that include the **lessons** (the teaching sections), or only the practice challenges? Recommended: **practice only**. Lessons are where a complete beginner first meets an idea, and no explanations on the first two tries there would mostly cause frustration, not learning.
2. **HP and losing:** does your teammate's HP carry from one encounter to the next (an "expedition"), or does each encounter start fresh? Recommended: fresh, and losing just restarts that encounter.
3. **Mana between encounters:** reset per fight (ultimates then hardly ever show in short fights), or carry over across a module (recommended, cap 30, so ultimates come up every few fights)?
4. **Long ultimates:** Planetfall is about 20 s. Against a small enemy, keep the full cinematic, or play a short version and keep the full one for bosses? Recommended: full the first time per day, short after that.
5. **Rewards:** keep today's challenge Bits, plus a small win bonus per enemy (for example +5)?

**Isaac's decisions (2026-10-22), then "go" ("do as much as you can, even the actual new biomes and enemies"):**
1. **Lessons are fights too** ("I want my site to be game-like code"). Every lesson section and every practice challenge is fought.
2. **A fight per level**: a challenge is one fight. A lesson with sections is one fight across its sections: your teammate's HP carries from section to section.
3. **Mana carries over** between fights (cap 30), and so do cooldowns.
4. **Ultimates**: the full cinematic the first time each day, a short version after that.
5. **Rewards**: today's Bits, plus **+5 Bits per enemy beaten**.

**Build decisions:**
- **Waves.** A pass casts a card at the enemy. If it survives, it strikes back; if it dies, the next one steps in for the next section. **The last pass of a level always finishes the enemy** (the level ends with a win), so a challenge (one pass) is one enemy, and a lesson with sections can see several. More damage means more enemies beaten, which means more Bits.
- **A failed Submit** is a miss: the enemy attacks. If your teammate's HP hits 0, the fight restarts (full HP, a fresh enemy). Passed sections stay passed, and nothing else is lost.
- **No help on tries 1 and 2** in every fight (lessons included). Hints and peeks still work but cost mana. Solutions stay available outside boss fights (a solution pass gives 0 mana).
- Entering a lesson or challenge has no page-pixelate transition (that stays for bosses): the enemy just resolves out of big pixel blocks.
- Bosses keep their own mana pool (they start at 0), so the balanced 300-HP fight doesn't change.

## Addendum L: playable characters and a true pixel-art style (draft 2026-10-22, awaiting answers and "go")

**Problem.** Isaac (2026-10-22): the companions (DOT, PYRO) should go, replaced by real characters, keeping NOVA. The enemies built in Addendum K look like 3D models "pretending to be 2D pixel art"; he wants real 2D pixel art that uses shading to look solid, like his references (an RPG enemy sheet, a pixel treant, Fire Emblem-style character sprites, a blue-haired sword girl), at their resolution: not too low. The first character is a red-haired rogue assassin with a saber and a spear. Her basic attack copies the sword swing in his video, in red.

**What the references have in common.** Hand-placed pixels with a limited palette per sprite, 3 to 5 shades per colour, a dark (not black) outline, light from the top left, selective anti-aliasing, and strong poses. Characters are about 48 to 80 px tall; enemies 32 to 110 px. The slash effect in the video: a big crescent in flat bands (white core, light, mid, deep), jagged spiky tips, a thin dark wisp trailing behind, the enemy flashing to a solid white silhouette during the hit-stop.

**Success criteria.**
- Isaac calls the heroine and the enemies "real pixel art" that matches his references.
- The red saber slash reads as the one in the video.
- Every level still works as in Addendum K (cards, mana, waves, no tips on tries 1-2); only the art and the fighters change.

**Scope, IN (proposed).**
- **Characters replace companions.** You fight as a character: the heroine (the starter) or NOVA (kept as she is). DOT and PYRO are retired; the roaming pet goes too (see open question 2).
- **The heroine** (name to pick): red hair tied back, a rogue outfit (hood or scarf, leather, wraps), a saber and a spear. About 64 px tall in art pixels. Animations: idle, run-in, hurt, KO, win, plus a pose set for each ability.
- **Her 7 cards** (proposal; same tiers as now):

  | tier | card | what happens |
  |---|---|---|
  | basic | Crimson Slash | the video's swing in red |
  | light | Twin Fang | two fast saber cuts in an X |
  | medium | Piercing Lunge | a dash with the spear, a red line punching through |
  | medium | Scarlet Whirl | a spinning spear sweep, a full circle of red |
  | heavy | Rising Moon | an upward saber launch, then the spear driven down from the air |
  | ultimate | Thousand Cuts | she blinks around the enemy in a flurry of red slashes, then sheathes: everything lands at once |
  | ultimate II | Skyfall Lance | she hurls the spear into the sky and it falls as a giant blade of red light |

- **Enemies redrawn as real 2D pixel art**: the same 18 enemies, attacks and HP, new sprites (idle, attack, hurt; a few frames each).
- **Kept as they are**: the 8 biome backgrounds (already 2D pixel paintings), the card, mana and fight rules, the biome music, NOVA.

**How the art gets made (the big decision; see open question 1).**
- A. **I draw every sprite in code**, pixel by pixel (palette-indexed grids, frame by frame). Free and fully consistent, but slow, and every design needs your feedback rounds, like GOLEM did. Honest risk: matching professional sprite artists is hard; expect several rounds per character.
- B. **Free or cheap asset packs** (itch.io and similar; many are free, CC0 or allow commercial use) for the enemies, and I draw the heroine. Fastest and closest to your enemy references (that sheet looks like a commercial pack), but you'd download them (I can't buy or log in), and we'd check each licence.
- C. **A mix**: start with A for the heroine and one enemy as a style test, then decide.

**Constraints.** Zero budget. The art takes many feedback rounds. Asset packs must allow use in a site that may charge later (RM80 plan).

**Plan (smallest first, after "go").**
1. Style test: the heroine's idle frame plus the red Crimson Slash on one redrawn enemy (Rotcap), in the forest. You approve the look before anything else.
2. The heroine's full animation set and her 7 cards.
3. Retire DOT and PYRO; the character select (the heroine or NOVA) replaces the teammate Shop cards.
4. Redraw the enemies, module by module (Module 1 first).

**Open questions.**
1. Art: A (I draw everything), B (asset packs for enemies), or C (style test first)? Recommended: **C**.
2. Without DOT, who gives the feedback, hints and error help (today DOT says them)? Options: the heroine speaks them, or a plain message panel with no mascot. Recommended: **the character you're playing speaks**, in a short dialogue box next to her portrait.
3. GOLEM and NOVA are drawn in the 3D "hi-bit" style. Keep both for now (recommended, since you rated NOVA highly), or redraw GOLEM as 2D pixel art too?
4. The heroine's name? (A few ideas: Scarlet, Rook, Kaela, Vex.)
5. The cards above: OK, or changes?

## Addendum M: back to learning first, one big boss per module ("go" 2026-10-23)

Isaac 2026-10-23: scrap "every level is a fight". Lessons and practice go back to the roaming companion that gives hints and tips, with idle animations and a goal to collect companions. Kaela stays as the main character: she is used through Module 1 and fights its boss. DOT and PYRO stay (their abilities may need a revamp). Each module has one fight, or at most two (an optional mid-boss, then the big boss). Most effort goes into the big boss: higher quality, fun, tense, and it makes you use the module's skills.

1. **Problem.** A fight on every task slows learning down and spreads the art effort thin: dozens of enemies got only basic attacks, and the cards looked copy-pasted (Magic Pack sprites) or showed Kaela's pose instead of the ability.
2. **Success criteria.**
   - A lesson or challenge has no fight: just the lesson, the editor and the roaming companion.
   - Each module ends in a boss fight Isaac calls "fun and tense", whose challenges need every main skill of that module.
   - Every ability is a custom-designed cinematic (the NOVA standard), with card art that shows the ability, not the character.
3. **Scope (in).**
   - Revert lesson/challenge fights. Remove the level-fight flow from app.js; the battle band appears only in boss fights. Lessons go back to the roaming companion (pet.js, idles, hints), as before Addendum K.
   - **Companion collecting:** DOT (start), PYRO (Shop), NOVA (boss reward) roam the lessons. The Shop and rewards show which ones you have and which are still to find.
   - **Music:** the forest theme plays in lessons and practice, **off by default** (a Settings switch), so it can be tested on other people first.
   - **Kaela's kit redesigned:** 7 cards in her red, all effects designed and drawn by me (no Magic Pack sprites), choreographed like NOVA's (wind-up, portal or charge, a big hit, impact frames, aftermath) but with her own identity: blood, blades, crimson moon. Card art = a painted picture of the ability.
   - **Module 1 boss with Kaela** (see question 1).
   - **The boss fight, made tense and skill-based:**
     - Phases: at 2/3 and 1/3 HP the boss changes form or arena and gets new attacks. The challenges get harder too.
     - Challenges are drawn to cover every lesson of the module; the last phase mixes several skills in one task.
     - Telegraphs: the boss shows its next attack ("charging a quake in 2 turns") so a fast clean pass matters.
     - Pressure: a miss is a hit on you. Knocked out means the phase restarts, not the whole fight.
     - Mana and cards as now (Addendum J).
   - The Explosions Pack 11 sprites for big hits and deaths in the 2D boss fight.
4. **Scope (out).** Small enemies in lessons (their abilities stay in code for possible mid-bosses). Other biomes until their bosses exist. DOT/PYRO's revamp (after Kaela's boss). The Undead JRPG pack until it arrives as a .zip.
5. **Constraints.** Zero cost; pixel art in the 2D engine (js/stage2d); must run on Isaac's PC and iPad.
6. **Plan.**
   1. Revert the lesson fights to the roaming companion; music off by default.
   2. Kaela's 7 abilities redesigned, plus new card art (review after the first 3, as with NOVA).
   3. The Module 1 boss in 2D: phases, telegraphs, skill-covering challenges.
   4. A Module 2 boss.
7. **Open questions.**
   1. **Module 1's boss.** Kaela is 2D pixel art; GOLEM is a 3D-rendered "hi-bit" mech. Side by side the styles clash. Options: (a) keep GOLEM as Module 1's boss and accept the mix; (b) a new 2D boss for Module 1 and retire GOLEM (or keep him for a later module with DOT/NOVA/PYRO). Recommendation: (b).
   2. **Who fights which boss?** Fixed per module (Kaela in Module 1, DOT in Module 2, …), or you pick from the characters you own?
   3. **Does Kaela also roam the lessons** as a companion, or only appear in fights?
   4. **Mid-boss:** build the system for an optional mid-module boss now, or only the big one per module for now? Recommendation: big one only for now.

**Isaac's answers (2026-10-23, with "go"):**
1. Module 1's boss is a **2D GOLEM based on the one we have**, so all the work on NOVA's interactions with him (Grasp, Chains, Planetfall) carries over.
2. **You pick your fighter** from the characters you own: Kaela, DOT, PYRO, and NOVA once won. Players may want to rematch GOLEM after getting NOVA.
3. **Kaela only fights**; she doesn't roam the lessons.
4. **Big boss only** for now.

## Addendum N: full UI/UX revamp (draft 2026-10-30, awaiting "go")

Isaac 2026-10-30: "revamp the whole site UI UX ... extremely high quality and professional", then "take inspiration from a lot of cool high-end sites with cool designs and interactive elements". A polish pass went live first (warm neutrals, ink buttons, one muted blue; not NOVA-themed); this is the full revamp, built on a preview link and only made live after Isaac approves.

**Research (2026-10-30).** The sites themselves are blocked from this cloud session (linear.app, stripe.com, vercel.com, brilliant.org, boot.dev, awwwards.com, raycast.com, apple.com and duolingo.com all fail; Isaac can allow them under the environment's Network access), so this draws on published write-ups plus what I already know of them. What to borrow:

| Reference | What makes it feel high-end | What Operandi takes |
|---|---|---|
| Linear | Off-black dark mode, precise type, backgrounds layered from gradient + noise + a faint grid, a spotlight that follows the cursor across cards, layered soft shadows | The dark theme, the spotlight on cards, the quiet layered backgrounds |
| Raycast | The command palette is the product; shortcut keys shown as keycaps in a mono font; depth from layered shadows, not neon glow | A Ctrl/Cmd+K palette to jump anywhere; keycap chips on Run/Submit |
| Vercel | Monochrome, thin grid lines, crisp mono code | The grid lines and code styling |
| Stripe | Real, runnable code samples right on the marketing page | A live Python box in the home page hero |
| Brilliant | "Try first, then learn"; visual, hands-on steps; sounds and feedback make it fun | Lessons open with a quick try; satisfying pass/fail feedback |
| Duolingo | The learning path: one road of lessons with reviews mixed in, aimed at "less confusion". Users mocked it as Candy Crush | A course map, but calm and grown-up, not candy-coloured |
| Codecademy | A dashboard that says what to do next | A "Continue" card on the course home |
| Awwwards Site of the Year 2025 (e.g. Lando Norris by OFF+BRAND) | A cursor-reactive hero and one signature graphic motif carried through a modular layout | One signature motif, used on the home page only; lessons stay calm |
| 2026 practice | CSS scroll-driven animation (now in all major browsers), View Transitions between pages, micro-interactions under 300 ms, respect for reduced motion; bento grids for overviews (they break on phones, so stack them) | All of these, CSS-first so it stays fast |

1. **Problem.** The site works, but it reads as a prototype. The home page is a word and a button and says nothing about what Operandi is. The course page is a dense three-column tool whose menu hides behind ☰. Progress, Bits, levels and the bosses are hard to find, and nothing says what to do next. Testers will judge it in the first ten seconds.
2. **Success criteria.**
   - A first-time visitor understands what Operandi is and presses Run on lesson 1 within 30 seconds (timed with two or three testers).
   - Every screen has one obvious next action. Run and Submit have keyboard shortcuts (Ctrl+Enter, Ctrl+Shift+Enter).
   - It works at phone (390 px), iPad (768-1024), laptop (1440) and ultrawide sizes, in light and dark, and with reduced motion turned on.
   - Home page Lighthouse performance 90+, no layout jumps, every click answered within 100 ms.
   - Isaac calls it high-end next to the references above (his call).
   - Nothing breaks: the validator, both boss fights, NOVA, and existing saves all keep working.
3. **Scope (in).**
   - **Design system:** one set of tokens (colour, type scale, spacing, radius, shadow, motion) and components (buttons, cards, tabs, chips, inputs, toasts, dialogs, keycaps) in light and dark.
   - **Home page:** a hero with a live Python box (type, press Run; Python loads only when you first press it). Below it: how it works (learn → code → beat the boss), a preview of the course map with its bosses, why it's different (instant marking, free help, no AI at runtime), FAQ, footer. Cursor spotlight, scroll reveals, one signature motif. Language tiles and pricing stay hidden.
   - **Course home:** a calm path of modules → lessons → boss, with done/next/locked states, a "Continue" card, and level, Bits and streak in a clean header.
   - **Lesson workspace:** a top bar (where you are, progress, Bits, Ctrl+K), lesson text in a reading column, the task card always in reach, the editor with a proper Run/Submit bar showing keycaps, results redesigned (tests, score count-up), and a focus mode.
   - **Command palette (Ctrl/Cmd+K):** jump to any lesson, the Shop, the FAQ (searching it), settings; actions like Run, Submit, Hint.
   - **Feedback moments:** a small celebration on a pass (motion and sound), test rows sliding in, Bits flying to the counter. Short, calm, reduced-motion aware.
   - **Shop, FAQ, Practice, Settings:** consistent pages; the Shop as a bento grid.
   - **Page transitions** with View Transitions; scroll effects in CSS.
   - **Phone layout:** lesson and editor as switchable tabs instead of a long stack.
4. **Scope (out).** New lessons or content. The boss fights' game art and rules (only the frame and HUD around them change). New characters. Real sign-in (Firebase), payments, other language courses. Frameworks or a build step (it stays plain HTML, CSS and JS).
5. **Constraints.** Zero cost: free fonts (Google Fonts or self-hosted) and no paid libraries. No build step. Vercel Hobby. Testers keep the current site until Isaac approves. Old saves must load unchanged. It must run well on Isaac's PC and iPad.
6. **Plan (smallest working version first).**
   1. **Style tiles:** the same lesson screen in three directions on one preview page. Isaac picks one (or mixes).
   2. Design system plus the lesson workspace in the chosen direction, on a preview link.
   3. Course home and path, command palette, shortcuts.
   4. Home page with the live Python hero.
   5. Shop, FAQ, Practice, Settings, feedback moments, page transitions, phone layout.
   6. Full test pass (sizes, light and dark, reduced motion, Lighthouse, both boss fights, old saves). Isaac approves, then it goes live.
7. **Open questions.**
   1. **Direction** for the style tiles: (a) dark-first and precise like Linear/Raycast, (b) warm editorial paper (today's polish, pushed much further), (c) playful-premium like Brilliant (brighter, rounder, illustrated). Recommendation: tiles for all three; pick by eye.
   2. **Preview branch:** a new branch (e.g. `revamp`) that Vercel builds as a preview only Isaac can open. (The session branch `claude/wizardly-wozniak-iu7om1` holds Kaela's untested Blood Orb work, so not that one.) OK to create it?
   3. **NOVA on the home page:** the guide in the hero (characters sell a game), or a neutral home page?
   4. **Sign in** opens the course without signing in: rename it "Start learning" until real sign-in exists?

Sources: [Awwwards: Lando Norris](https://www.awwwards.com/sites/lando-norris), [DesignRush on the Lando Norris site](https://designrush.com/best-designs/websites/lando-norris-website-design), [Raycast design write-up](https://www.webdesignhot.com/design.md/raycast/), [Raycast design system notes](https://design.hagicode.com/designs/raycast/DESIGN.md), [Linear-style design notes](https://findskill.ai/de/skills/design-media/linear-modern-website-design/), [Duolingo: new home screen](https://blog.duolingo.com/new-duolingo-home-screen-design), [NBC on the Duolingo redesign](https://www.nbcnews.com/tech/tech-news/duolingos-update-redesign-luis-von-ahn-interview-rcna44655), [Brilliant on the App Store](https://apps.apple.com/app/brilliant-learn-by-doing/id913335252), [Fast Company on Codecademy](https://www.fastcompany.com/90184578/codecademycom-finally-an-interactive-coding-class-thats-fun), [Netguru: 2026 trends](https://www.netguru.com/blog/top-web-design-trends), [Line25: 2026 trends](https://line25.com/articles/web-design-trends-2026/).
