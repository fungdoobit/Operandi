// Quick tests for the Abyssal Maw's Constrict (Module 2 boss): while his arms squeeze your fighter, one of these pops up
// and you have a few seconds to pick what the code prints. Right: you break free. Wrong or too slow: a crushing crit.
// They only use what Modules 1 and 2 teach. Each prints one line.
// answer is what Python prints; wrong are two believable mistakes. tools/validate.mjs runs every snippet in Python and
// fails if the answer isn't exactly what it prints (or a wrong one is), so they can never disagree.
export const QUICK_TESTS = [
  // Module 2: comparisons, if / else / elif, and / or / not
  { code: "print(7 > 3 and 2 > 5)", answer: "False", wrong: ["True", "7"] },
  { code: "print(4 == 4 or 1 > 9)", answer: "True", wrong: ["False", "4"] },
  { code: "print(not 5 == 5)", answer: "False", wrong: ["True", "5"] },
  { code: "print(3 != 3)", answer: "False", wrong: ["True", "0"] },
  { code: 'print("cat" == "Cat")', answer: "False", wrong: ["True", "cat"] },
  { code: "x = 4\nif x % 2 == 0:\n    print(\"even\")\nelse:\n    print(\"odd\")", answer: "even", wrong: ["odd", "0"] },
  { code: "hp = 12\nif hp < 10:\n    print(\"low\")\nelse:\n    print(\"ok\")", answer: "ok", wrong: ["low", "12"] },
  { code: "score = 72\nif score >= 80:\n    print(\"A\")\nelif score >= 60:\n    print(\"B\")\nelse:\n    print(\"C\")", answer: "B", wrong: ["A", "C"] },
  { code: "t = 30\nif t > 25:\n    print(\"hot\")\nelif t > 15:\n    print(\"warm\")\nelse:\n    print(\"cold\")", answer: "hot", wrong: ["warm", "cold"] },
  { code: "n = 0\nif n:\n    print(\"yes\")\nelse:\n    print(\"no\")", answer: "no", wrong: ["yes", "0"] },
  { code: "a = 5\nb = 9\nprint(a > 3 and b < 10)", answer: "True", wrong: ["False", "9"] },
  { code: "age = 15\nprint(age >= 13 and not age >= 18)", answer: "True", wrong: ["False", "15"] },
  { code: "lives = 0\nprint(lives > 0 or lives == 3)", answer: "False", wrong: ["True", "0"] },
  { code: "x = 10\nif x > 5:\n    x = x - 5\nprint(x)", answer: "5", wrong: ["10", "x"] },
  // Module 1: maths, text, f-strings
  { code: "print(10 // 3)", answer: "3", wrong: ["3.3333333333333335", "1"] },
  { code: "print(10 % 3)", answer: "1", wrong: ["3", "0"] },
  { code: "print(2 + 3 * 4)", answer: "14", wrong: ["20", "24"] },
  { code: "print(2 ** 3)", answer: "8", wrong: ["6", "9"] },
  { code: 'print("ab" * 3)', answer: "ababab", wrong: ["ab3", "ab ab ab"] },
  { code: 'print(len("hi there"))', answer: "8", wrong: ["7", "2"] },
  { code: 'word = "python"\nprint(word[0])', answer: "p", wrong: ["y", "n"] },
  { code: 'word = "python"\nprint(word[-1])', answer: "n", wrong: ["p", "o"] },
  { code: 'name = "Mittens"\nprint(f"Hi {name}!")', answer: "Hi Mittens!", wrong: ["Hi {name}!", "Hi name!"] },
  { code: "score = 3\nscore = score + 2\nprint(score)", answer: "5", wrong: ["3", "32"] },
  { code: 'print("3" + "4")', answer: "34", wrong: ["7", "3 4"] },
];
