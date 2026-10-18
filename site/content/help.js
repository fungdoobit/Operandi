// What DOT says for each mistake the harness or the output check detects.
// Each entry: title, body (a function of the detail object d), and an
// optional FAQ id to link to. Always free to read.

const L = (d) => (d.line ? `line ${d.line}` : "your code");

export const HELP = {
  // ----- Names -----
  "name-typo": {
    title: "Looks like a typo",
    body: (d) => `On ${L(d)} you wrote ${d.name}, but Python doesn't know that name. Did you mean ${d.suggest}? Python is picky: every letter has to match exactly.`,
    faq: "nameerror",
  },
  "name-case": {
    title: "Watch the capital letters",
    body: (d) => `On ${L(d)} you wrote ${d.name}. Python is case-sensitive, so it has to be ${d.suggest}.`,
    faq: "case-sensitive",
  },
  "name-missing-quotes": {
    title: "Missing quotes?",
    body: (d) => `On ${L(d)}, Python thinks ${d.name} is the name of a variable, because it has no quotes. If you meant the text "${d.name}", wrap it in quotes. If you meant a variable, create it first with =.`,
    faq: "string-vs-variable",
  },
  "name-undefined": {
    title: "Python doesn't know that name yet",
    body: (d) => `${d.name} is used on ${L(d)}, but it was never created. Make it with ${d.name} = ... on a line ABOVE where you use it. Python reads from top to bottom.`,
    faq: "nameerror",
  },
  "attr-typo": {
    title: "That method name is off",
    body: (d) => `Text (a ${d.tname}) has no method called .${d.attr}(). Did you mean .${d.suggest}()?`,
    faq: "methods",
  },
  "attr-missing": {
    title: "That method doesn't exist here",
    body: (d) => `A ${d.tname} value has no .${d.attr}. Check the spelling, and check what kind of value you're calling it on.`,
    faq: "methods",
  },

  // ----- Syntax -----
  "syntax-quote": {
    title: "A quote isn't closed",
    body: (d) => `On ${L(d)}, a piece of text starts with a quote but never ends with one. Every opening " needs a closing ", on the same line.`,
    faq: "syntaxerror",
  },
  "syntax-bracket-open": {
    title: "A bracket isn't closed",
    body: (d) => `Something opened a bracket around ${L(d)} and never closed it. Count your ( and ): they must come in pairs.`,
    faq: "brackets",
  },
  "syntax-bracket-close": {
    title: "An extra closing bracket",
    body: (d) => `On ${L(d)} there's a ) with no matching (. Count the brackets on that line.`,
    faq: "brackets",
  },
  "syntax-colon": {
    title: "Missing colon",
    body: (d) => `The line on ${L(d)} needs a colon (:) at the end. Lines that start a block (if, else, for, while, def) always end with :.`,
    faq: "syntaxerror",
  },
  "syntax-print-parens": {
    title: "print needs brackets",
    body: (d) => `On ${L(d)}, write print("...") with brackets. print "..." is from the old Python 2.`,
    faq: "print",
  },
  "syntax-comma": {
    title: "Missing comma?",
    body: (d) => `On ${L(d)} two values sit next to each other with nothing between them. When you give print() several values, separate them with commas.`,
    faq: "print",
  },
  "syntax-indent": {
    title: "Spacing at the start of the line",
    body: (d) => `Python cares about the spaces at the start of a line. Check ${L(d)}: in this module, lines shouldn't start with spaces. Later, inside if and loops, you'll indent by exactly 4 spaces.`,
    faq: "indentation",
  },
  "syntax-name-digit": {
    title: "A name can't start with a number",
    body: (d) => `On ${L(d)}, a variable name starts with a digit. Use letters first, like second_place instead of 2nd_place.`,
    faq: "naming",
  },
  "syntax-space-in-name": {
    title: "No spaces in variable names",
    body: (d) => `On ${L(d)}, a variable name has a space in it. Join the words with an underscore instead: my_name, not my name.`,
    faq: "naming",
  },
  "syntax-eq-vs-assign": {
    title: "= versus ==",
    body: (d) => `On ${L(d)} you used = to compare. A single = stores a value. To check whether two things are equal, use ==.`,
    faq: "equals",
  },
  "syntax-assign-target": {
    title: "Can't store a value there",
    body: (d) => `On ${L(d)}, the left side of = must be a variable name. Write it as name = value, with the name on the left.`,
    faq: "variables",
  },
  "syntax-smart-quote": {
    title: "Curly quotes sneaked in",
    body: (d) => `On ${L(d)} there's a character Python can't read, usually curly quotes (“ ”) copied from a document or phone. Retype them as straight quotes: "`,
    faq: "syntaxerror",
  },
  "syntax-fstring": {
    title: "Something's off inside the f-string",
    body: (d) => `Check the {curly brackets} on ${L(d)}. Each { needs a matching }, and what's inside must be a valid name or calculation.`,
    faq: "fstrings",
  },
  "syntax-general": {
    title: "Python can't read this line",
    body: (d) => `Something on ${L(d)} (or just before it) breaks Python's grammar. Check the quotes, the brackets and any missing commas.`,
    faq: "syntaxerror",
  },

  // ----- Types and values -----
  "type-str-plus-num": {
    title: "Mixing text and numbers",
    body: (d) => `On ${L(d)} you used + between text and a number. Python won't guess what you mean. Turn the number into text with str(), or (easier) use an f-string: f"Age: {age}".`,
    faq: "str-plus-int",
  },
  "type-str-times-float": {
    title: "Text can only repeat a whole number of times",
    body: (d) => `On ${L(d)} text is multiplied by a decimal number. "ha" * 3 works, "ha" * 2.5 doesn't.`,
    faq: "str-plus-int",
  },
  "type-not-callable": {
    title: "Brackets after something that isn't a function",
    body: (d) => `On ${L(d)} you put () after a value that isn't a function. Check whether you reused a name like print or str as a variable earlier.`,
    faq: "builtins-shadow",
  },
  "type-not-subscriptable": {
    title: "Can't use [ ] on that",
    body: (d) => `On ${L(d)} you used [ ] on a value that doesn't have positions, like a number. [ ] works on text: word[0].`,
    faq: "indexing",
  },
  "type-arg-count": {
    title: "Wrong number of values in the brackets",
    body: (d) => `A function on ${L(d)} got more or fewer values than it expects. Check what goes inside its brackets.`,
    faq: "functions-call",
  },
  "type-general": {
    title: "Wrong kind of value",
    body: (d) => `On ${L(d)} an operation got a value of the wrong type. Use type() to check what kind of value each variable holds.`,
    faq: "types",
  },
  "value-convert": {
    title: "That text isn't a number",
    body: (d) => `On ${L(d)}, int() or float() got text that doesn't look like a number. int("42") works, int("forty") and int("4.5") don't.`,
    faq: "converting",
  },
  "value-general": {
    title: "Right type, wrong value",
    body: (d) => `On ${L(d)} a function got a value it can't use. Read the last line of the error for the detail.`,
    faq: "reading-errors",
  },
  "zero-division": {
    title: "Dividing by zero",
    body: (d) => `On ${L(d)} something is divided by 0, which has no answer. Check the value you divide by.`,
    faq: "maths",
  },
  "index-range": {
    title: "Position out of range",
    body: (d) => `On ${L(d)} you asked for a position that doesn't exist. Positions start at 0, so the last one in "abc" is 2 (or -1).`,
    faq: "indexing",
  },
  "key-missing": {
    title: "That key isn't there",
    body: (d) => `On ${L(d)} you looked up a key that the dictionary doesn't have. Check the spelling and capitals.`,
    faq: "reading-errors",
  },
  "input-unsupported": {
    title: "input() is switched off here",
    body: () => `Operandi can't pause to let you type while a program runs. Put the value straight into a variable instead, like name = "Sam".`,
    faq: "input",
  },
  "timeout": {
    title: "Your program took too long",
    body: () => `It ran for more than 5 seconds, so I stopped it. That usually means a loop that never ends.`,
    faq: "reading-errors",
  },
  "error-general": {
    title: "Your code hit an error",
    body: (d) => `Read the last line of the error in Output: it says what went wrong. The line number tells you where (${L(d)}).`,
    faq: "reading-errors",
  },

  // ----- Output comparison (worked out in JavaScript) -----
  "out-nothing": {
    title: "Nothing was printed",
    body: () => `Your code ran, but it didn't print anything. Did you forget print()?`,
    faq: "print",
  },
  "out-case": {
    title: "Almost: check the capital letters",
    body: (d) => `Line ${d.n} of your output matches except for capitals. Expected: ${d.want}  You printed: ${d.got}`,
    faq: "output-match",
  },
  "out-spacing": {
    title: "Almost: check the spaces",
    body: (d) => `Line ${d.n} has extra or missing spaces. Expected: "${d.want}"  You printed: "${d.got}"`,
    faq: "output-match",
  },
  "out-punct": {
    title: "Almost: check the punctuation",
    body: (d) => `Line ${d.n} differs only in punctuation (. , ! : $ and so on). Expected: ${d.want}  You printed: ${d.got}`,
    faq: "output-match",
  },
  "out-missing-lines": {
    title: "Some lines are missing",
    body: (d) => `The task expects ${d.want} line${d.want === 1 ? "" : "s"} of output, but you printed ${d.got}. Each print() makes one line.`,
    faq: "output-match",
  },
  "out-extra-lines": {
    title: "Too many lines",
    body: (d) => `The task expects ${d.want} line${d.want === 1 ? "" : "s"}, but you printed ${d.got}. Remove any extra print() calls.`,
    faq: "output-match",
  },
  "out-wrong": {
    title: "That line isn't right yet",
    body: (d) => `Line ${d.n} should be: ${d.want}  You printed: ${d.got}`,
    faq: "output-match",
  },

  // ----- Style (only shown when the code works) -----
  "lint-missing-f": {
    title: "Forgot the f?",
    body: (d) => `The text on ${L(d)} has {${d.name}} in it, but no f before the quote, so Python prints the brackets literally. Write f"..." to fill in the value.`,
    faq: "fstrings",
  },
  "lint-unused": {
    title: "Unused variable",
    body: (d) => `${d.name} is created on ${L(d)} but never used. Either use it or remove it.`,
    faq: "variables",
  },
  "lint-snake-case": {
    title: "Python style: snake_case",
    body: (d) => `Python names are lowercase with underscores. ${d.name} would normally be written ${d.suggest}.`,
    faq: "naming",
  },
  "lint-short-name": {
    title: "Say what it is",
    body: (d) => `${d.name} is a very short name. A name like total or price tells the reader what the value means.`,
    faq: "naming",
  },
  "lint-shadow-builtin": {
    title: "That name is already taken",
    body: (d) => `${d.name} is the name of something built into Python. Using it as a variable hides the original and can cause odd errors later. Pick another name.`,
    faq: "builtins-shadow",
  },
  "lint-hardcoded": {
    title: "Typed in, not worked out",
    body: (d) => `On ${L(d)} you printed the answer ${d.text} as fixed text. The task wants Python to work it out from the variables, so it still works if the numbers change.`,
    faq: "hardcoding",
  },
};

// Lint findings that lower the mark, and by how much.
export const LINT_PENALTY = { "lint-missing-f": 2, "lint-unused": 1, "lint-snake-case": 1, "lint-short-name": 1, "lint-shadow-builtin": 1 };

// Compare the learner's printed lines with the expected ones and describe the
// first difference in a way a beginner can act on.
export function compareOutput(got, want) {
  if (!want) return null;
  if (got.length === 0) return { id: "out-nothing" };
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const bare = (s) => norm(s).replace(/[.,!?:;$'"]/g, "");
  const n = Math.min(got.length, want.length);
  for (let i = 0; i < n; i++) {
    const g = got[i], w = want[i];
    if (g === w) continue;
    if (g.toLowerCase() === w.toLowerCase()) return { id: "out-case", n: i + 1, got: g, want: w };
    if (norm(g) === norm(w) || g.replace(/\s/g, "") === w.replace(/\s/g, "")) return { id: "out-spacing", n: i + 1, got: g, want: w };
    if (bare(g).toLowerCase() === bare(w).toLowerCase()) return { id: "out-punct", n: i + 1, got: g, want: w };
    return { id: "out-wrong", n: i + 1, got: g, want: w };
  }
  if (got.length < want.length) return { id: "out-missing-lines", got: got.length, want: want.length };
  if (got.length > want.length) return { id: "out-extra-lines", got: got.length, want: want.length };
  return null;
}
