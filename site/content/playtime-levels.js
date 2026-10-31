// Playtime's levels (PRD Addendum O). Each level is a small island drawn as text, a goal, three hints, the number of
// lines it can be solved in ("par") and a reference solution, which tools/validate.mjs runs in real Python on every
// push to prove the level can be won.
//
// `ground` (one string per row; the first row is the far side, north):
//   .  grass      =  stone path      ~  water      #  raised block      H  tall block      (space) nothing
// `things` (the same grid, laid over it):
//   T  tree       P  pine      R  rock      B  bush      (these block the way)
//   b  a Bit      s  a switch (off)      S  a switch (on)
//   > < ^ v  where NOVA starts, and which way she faces (east, west, north, south)
// Water on the island's edge pours off it as a waterfall.

export const CHAPTERS = [
  { id: 1, title: "Commands", idea: "Code is a list of steps, done in order." },
  { id: 2, title: "Functions", idea: "Give a group of steps a name, then use it again.", soon: true },
  { id: 3, title: "Loops", idea: "Repeat steps without writing them out.", soon: true },
  { id: 4, title: "Decisions", idea: "Check the island, then choose what to do.", soon: true },
  { id: 5, title: "While", idea: "Keep going until something changes.", soon: true },
];

export const LEVELS = [
  {
    id: "1.1", chapter: 1, title: "First Steps",
    goal: "Take NOVA to the end of the path and collect the Bit.",
    steps: ["Each <code>move()</code> takes NOVA one tile forward.", "On the Bit's tile, <code>collect()</code> picks it up.", "Press Run my code."],
    fresh: ["move()", "collect()"],
    commands: ["move()", "collect()"],
    ground: [
      "H....",
      "=====",
      ".....",
    ],
    things: [
      "T..B.",
      ">...b",
      ".P..T",
    ],
    par: 5,
    hints: [
      "Count the tiles between NOVA and the Bit.",
      "There are four tiles to cross, so four <code>move()</code> lines.",
      "<code>move()</code> four times, then <code>collect()</code> on the last line.",
    ],
    solution: "move()\nmove()\nmove()\nmove()\ncollect()",
  },
  {
    id: "1.2", chapter: 1, title: "Collect the Bits",
    goal: "Guide NOVA to both Bits and collect them.",
    steps: ["Find the two Bits on the island.", "<code>turn_left()</code> turns NOVA to her left, on the spot.", "Press Run my code."],
    fresh: ["turn_left()"],
    commands: ["move()", "turn_left()", "collect()"],
    ground: [
      "H#..#H",
      "#.===.",
      "..=.=~",
      "..=.=~",
      ".====.",
      " .....",
    ],
    things: [
      "T....T",
      "......",
      "BT..b.",
      "...R..",
      ".>..b.",
      ".B....",
    ],
    par: 8,
    hints: [
      "Count the tiles. How many <code>move()</code> commands reach the first Bit?",
      "<code>collect()</code> only works on the tile with the Bit.",
      "After the first Bit, <code>turn_left()</code> points NOVA at the second one. Then count again.",
    ],
    solution: "move()\nmove()\nmove()\ncollect()\nturn_left()\nmove()\nmove()\ncollect()",
  },
  {
    id: "1.3", chapter: 1, title: "The Long Way Round",
    goal: "Collect both Bits. NOVA can only turn left.",
    steps: ["There is no <code>turn_right()</code>.", "Three left turns face the same way as one right turn.", "Collect both Bits."],
    fresh: [],
    commands: ["move()", "turn_left()", "collect()"],
    ground: [
      "H..#.H",
      "..===.",
      "~~~.=.",
      "~~~.=.",
      "#.===.",
    ],
    things: [
      "T....P",
      "..>...",
      "...T..",
      "......",
      "..b.b.",
    ],
    par: 15,
    hints: [
      "Follow the path: two tiles east, then it turns right, down towards you.",
      "To turn right, turn left three times: <code>turn_left()</code>, <code>turn_left()</code>, <code>turn_left()</code>.",
      "Two moves, a right turn, three moves, collect. Then another right turn, two moves, collect.",
    ],
    solution: "move()\nmove()\nturn_left()\nturn_left()\nturn_left()\nmove()\nmove()\nmove()\ncollect()\nturn_left()\nturn_left()\nturn_left()\nmove()\nmove()\ncollect()",
  },
  {
    id: "1.4", chapter: 1, title: "Switches",
    goal: "Turn on both switches and collect the Bit.",
    steps: ["Stand on a switch and <code>toggle()</code> turns it on (or off again).", "Every switch must end up on.", "Collect the Bit on the way."],
    fresh: ["toggle()"],
    commands: ["move()", "turn_left()", "collect()", "toggle()"],
    ground: [
      ".=...",
      ".=.~~",
      ".=.~~",
      ".===.",
      "H....",
    ],
    things: [
      ".v..T",
      "B....",
      ".s...",
      ".b.s.",
      "T..B.",
    ],
    par: 9,
    hints: [
      "NOVA faces towards you. The first switch is two tiles ahead.",
      "<code>toggle()</code> on the switch, then one more <code>move()</code> to the Bit.",
      "After the Bit, one <code>turn_left()</code> faces the second switch, two tiles away.",
    ],
    solution: "move()\nmove()\ntoggle()\nmove()\ncollect()\nturn_left()\nmove()\nmove()\ntoggle()",
  },
  {
    id: "1.5", chapter: 1, title: "Garden Run", challenge: true,
    goal: "Go all the way round the garden: collect both Bits and turn on both switches.",
    steps: ["Plan the route before you write it.", "Right turns are three left turns.", "Bits and switches can come in any order you like."],
    fresh: [],
    commands: ["move()", "turn_left()", "collect()", "toggle()"],
    ground: [
      "H.....#",
      "..====.",
      "~.=~~=.",
      "~.=~~=.",
      "~.====.",
      "#......",
    ],
    things: [
      "T.P..T.",
      "..b..s.",
      "......B",
      ".......",
      "..^s.b.",
      ".T...P.",
    ],
    par: 24,
    hints: [
      "NOVA faces away from you, up the left side of the garden. Three moves reach the first Bit.",
      "At each corner the path turns right: three <code>turn_left()</code>.",
      "Up 3 and collect, right, along 3 and toggle, right, down 3 and collect, right, 2 more and toggle.",
    ],
    solution: "move()\nmove()\nmove()\ncollect()\nturn_left()\nturn_left()\nturn_left()\nmove()\nmove()\nmove()\ntoggle()\nturn_left()\nturn_left()\nturn_left()\nmove()\nmove()\nmove()\ncollect()\nturn_left()\nturn_left()\nturn_left()\nmove()\nmove()\ntoggle()",
  },
];

const FACING = { ">": 0, "^": 1, "<": 2, "v": 3 };

// The level's layout(s) as the island and the Python harness both read them: the ground rows, the blocking things,
// where NOVA starts, the Bits and the switches. (Later chapters will make several layouts from a seed.)
export function layoutsOf(level) {
  const things = level.things.map((row) => [...row]);
  const out = { ground: level.ground.slice(), things: [], start: null, bits: [], switches: [] };
  things.forEach((row, z) => row.forEach((ch, x) => {
    if (ch in FACING) out.start = [x, z, FACING[ch]];
    else if (ch === "b") out.bits.push([x, z]);
    else if (ch === "s" || ch === "S") out.switches.push([x, z, ch === "S"]);
    else return;
    row[x] = ".";
  }));
  out.things = things.map((row) => row.join(""));
  return [out];
}

// The lines that count towards par: not blank, not only a comment.
export function codeLines(code) {
  return code.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#")).length;
}

export const levelById = (id) => LEVELS.find((l) => l.id === id);
