// Kaela's ability cards (PRD Addendum L, Isaac's list 2026-10-23). The card hand, mana and
// cooldowns work as for the other teammates (cards.js, boss-rules.js): tier sets the cost,
// cooldown and damage (economy.js TIERS).
//
// A card plays a chain of segments: a move from frame `from` to `to`, so the recovery frames in
// the middle of a chain are skipped. Segment options (laid out by engine.js):
//   hold   show one frame for this long (a charge-up)      hang  hold its last frame this much longer
//   dy     how high she floats through it (px)            blend how fast she eases to that height
//   speed  play faster                                    launch its first hit throws the enemy up
//   slamDown  the enemy is driven into the floor          hits  its own hit frames
// Card options: ranged (cast from her place), orb (Blood Orb), heavy (bigger finish), juggle (the
// enemy stays up through the chain), reach (stance distance). pose: the frame shown on the card.
const S = (id, from = 0, to = null, o = {}) => ({ id, from, to, ...o });

export const KAELA_KIT = [
  { id: "crimsonSlash", name: "Crimson Slash", tier: "basic", pose: ["quick", 2],
    desc: "A quick slash with her saber.", seq: [S("quick")] },
  { id: "twinFang", name: "Twin Fang", tier: "light", pose: ["dash", 2],
    desc: "A slash, then a lunging second cut.", seq: [S("quick", 0, 6), S("dash")] },
  { id: "bloodOrb", name: "Blood Orb", tier: "medium", pose: ["quick", 0], orbArt: true, ranged: true, orb: true,
    desc: "Charges a crimson orb on her blade and flings it. It bursts on the enemy.",
    seq: [S("quick", 0, 0, { hold: 560, charge: true }), S("quick", 1)] },
  { id: "scarletWhirl", name: "Scarlet Whirl", tier: "medium", pose: ["spin", 7],
    desc: "A spinning cut that rakes the enemy like a claw.", seq: [S("spin")] },
  { id: "fangWhirl", name: "Fang Whirl", tier: "heavy", pose: ["spin", 9], heavy: true,
    desc: "Twin Fang flowing straight into Scarlet Whirl.", seq: [S("quick", 0, 6), S("dash", 0, 3), S("spin", 1)] },
  { id: "risingMoon", name: "Rising Moon", tier: "ultimate", pose: ["upper", 4], heavy: true, juggle: true, reach: 50,
    desc: "An uppercut throws the enemy into the air. She follows it up and cuts it a thousand times.",
    seq: [S("upper", 0, 9, { launch: true }), S("combo", 1, 33, { dy: 52, speed: 1.15 }), S("upper", 11)] },
  { id: "skyfall", name: "Skyfall", tier: "ultimate2", pose: ["slam", 16], heavy: true, reach: 46,
    desc: "Thousand Cuts into an uppercut, then she dives and slams the enemy into the ground.",
    seq: [S("combo", 0, 33), S("upper", 0, 10, { launch: true, hang: 110 }), S("slam", 11, null, { slamDown: true, blend: 60, hits: [14] })] },
];
