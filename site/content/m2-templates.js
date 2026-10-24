// Module 2 challenge templates (Decisions). Each make(r) builds one challenge from a
// seeded random generator r, so every play-through gets different values.
// The expected output is produced by running `solution`, and tools/validate.mjs
// proves every template works across many seeds.
//
// Most checks are `logic(...)`: they re-run the learner's program with OTHER values
// for the starter's variables (rerun in py/harness.py) and compare the printed lines
// with a reference written in Python. That tests the decision, not just one example,
// so a typed-in answer can't pass. Topics are named exactly (see requiredLessons in
// app.js): booleans, comparisons, if, else, elif, and, or, not.

const PEOPLE = ["Aisha", "Ben", "Chloe", "Daniel", "Elena", "Farid", "Grace", "Hiro", "Ines", "Jamal", "Kim", "Leo", "Maya", "Noah", "Omar", "Priya", "Quinn", "Rosa", "Sam", "Tara"];
const lines = (...ls) => ls.join("\n");

// A Python literal for a JS value (strings, numbers, booleans, lists).
const pv = (x) => (x === true ? "True" : x === false ? "False" : Array.isArray(x) ? `[${x.map(pv).join(", ")}]` : typeof x === "string" ? JSON.stringify(x) : String(x));
const assigns = (vars) => Object.entries(vars).map(([k, x]) => `${k} = ${pv(x)}`).join("\n");

const given = (vars) => {
  const names = Object.keys(vars);
  return {
    name: "Given values unchanged",
    code: `assert [${names.map((n) => `globals().get(${pv(n)})`).join(", ")}] == [${names.map((n) => pv(vars[n])).join(", ")}], "Keep ${names.join(", ")} exactly as given."`,
    peek: `Keep ${names.map((n) => `${n} = ${pv(vars[n])}`).join(", ")}.`,
  };
};

const v = (name, expr, peek) => ({
  name: `${name} is right`,
  code: `assert ${pv(name)} in globals(), "Make a variable called ${name}."\nassert ${name} == (${expr}), "${name} isn't right yet."`,
  peek,
});

const noBool = {
  name: "Python answers, not you",
  code: `s = SOURCE.replace(" ", "")\nassert "print(True" not in s and "print(False" not in s, "Don't type True or False. Print a comparison and let Python answer."`,
  peek: "Print the comparison itself.",
};

// Re-run the learner's program for several cases and compare with a Python reference.
//   names: the variables to change; cases: lists of values for them; body: Python that
//   returns the list of printed lines for those values.
const logic = (names, cases, body, peek) => ({
  name: "Works for other values",
  code: [
    `def ref(${names.join(", ")}):`,
    ...body.split("\n").map((l) => "    " + l),
    `for case in ${pv(cases)}:`,
    `    kw = dict(zip(${pv(names)}, case))`,
    "    got = rerun(**kw)",
    "    want = ref(*case)",
    '    assert got == want, "With " + ", ".join(k + " = " + repr(x) for k, x in kw.items()) + " your program should print " + " / ".join(want) + ", but it printed " + (" / ".join(got) if got else "nothing or an error") + "."',
  ].join("\n"),
  peek,
});

// Values on both sides of a limit, to test the edges.
const around = (limit, extra = []) => [limit - 3, limit - 1, limit, limit + 1, ...extra];

export const M2_TEMPLATES = [
  // ---------------- Easy ----------------
  {
    id: "m2-alarm", module: 2, difficulty: 1, topics: ["comparisons"],
    make(r) {
      const limit = r.int(22, 38), temp = limit + r.int(-6, 8), room = r.pick(["server room", "freezer", "greenhouse", "lab", "garage"]);
      return {
        title: "Temperature alarm", noHardcode: false,
        scenario: `The ${room} has a sensor. The alarm limit is ${limit} degrees and it reads ${temp}.`,
        steps: [`Keep temp = ${temp} and limit = ${limit}.`, "Print three lines, each the answer to a comparison: is temp above limit? is temp equal to limit? is temp not equal to limit?"],
        starter: `${assigns({ temp, limit })}\n\n# Print the three answers\n`,
        solution: lines(assigns({ temp, limit }), "print(temp > limit)", "print(temp == limit)", "print(temp != limit)"),
        checks: [given({ temp, limit }), noBool, logic(["temp"], around(limit).map((x) => [x]), "return [str(temp > " + limit + "), str(temp == " + limit + "), str(temp != " + limit + ")]", "Three prints: temp > limit, temp == limit, temp != limit.")],
        hints: ["Each line is a print() with a comparison inside.", "Above is >, equal is ==, not equal is !=.", "print(temp > limit), then print(temp == limit), then print(temp != limit)."],
      };
    },
  },
  {
    id: "m2-pass-flag", module: 2, difficulty: 1, topics: ["comparisons", "booleans"],
    make(r) {
      const pass_mark = r.int(40, 70), score = pass_mark + r.int(-15, 20), course = r.pick(["Maths", "Biology", "History", "Python", "Art", "Physics"]);
      return {
        title: "Did they pass?", noHardcode: false,
        scenario: `${r.pick(PEOPLE)} scored ${score} in ${course}. The pass mark is ${pass_mark}.`,
        steps: [`Keep score = ${score} and pass_mark = ${pass_mark}.`, "Make a variable passed that holds whether score is at least pass_mark.", "Print passed."],
        starter: `${assigns({ score, pass_mark })}\n\n# Make passed, then print it\n`,
        solution: lines(assigns({ score, pass_mark }), "passed = score >= pass_mark", "print(passed)"),
        checks: [given({ score, pass_mark }), v("passed", "score >= pass_mark", "passed = score >= pass_mark"), noBool, logic(["score"], around(pass_mark).map((x) => [x]), `return [str(score >= ${pass_mark})]`, "print(passed)")],
        hints: ["A comparison can be stored in a variable.", "At least means greater than or equal: >=.", "passed = score >= pass_mark, then print(passed)."],
      };
    },
  },
  {
    id: "m2-name-match", module: 2, difficulty: 1, topics: ["comparisons", "booleans"],
    make(r) {
      const owner = r.pick(PEOPLE).toLowerCase(), typed = owner.split("").map((ch, i) => (r.int(0, 1) || i === 0 ? ch.toUpperCase() : ch)).join("");
      return {
        title: "Same name?", noHardcode: false,
        scenario: `The door scanner read the name "${typed}". The guest list says "${owner}". Capital letters shouldn't matter.`,
        steps: [`Keep typed = "${typed}" and owner = "${owner}".`, "Make a variable same: are the two names equal once typed is made lowercase?", "Print same."],
        starter: `${assigns({ typed, owner })}\n\n# Make same, then print it\n`,
        solution: lines(assigns({ typed, owner }), "same = typed.lower() == owner", "print(same)"),
        checks: [given({ typed, owner }), v("same", "typed.lower() == owner", "same = typed.lower() == owner"), logic(["typed"], [[owner.toUpperCase()], [owner], ["Zzz"], [owner + "x"]], `return [str(typed.lower() == ${pv(owner)})]`, "Use typed.lower() in the comparison.")],
        hints: ["Make typed lowercase first with .lower().", "Compare the lowercase text with owner using ==.", "same = typed.lower() == owner, then print(same)."],
      };
    },
  },
  {
    id: "m2-bonus", module: 2, difficulty: 1, topics: ["if"],
    make(r) {
      const goal = r.int(50, 200), points = goal + r.int(-30, 40), game = r.pick(["Puzzle Run", "Star Chase", "Block Quest", "Sky Dash"]);
      return {
        title: "Bonus round", noHardcode: false,
        scenario: `In ${game}, reaching ${goal} points unlocks a bonus. You have ${points}.`,
        steps: [`Keep points = ${points} and goal = ${goal}.`, "If points is at least goal, print: Bonus unlocked!", "Then, for everyone, print: Round over"],
        starter: `${assigns({ points, goal })}\n\n# Bonus check, then always print Round over\n`,
        solution: lines(assigns({ points, goal }), "if points >= goal:", '    print("Bonus unlocked!")', 'print("Round over")'),
        checks: [given({ points, goal }), logic(["points"], around(goal).map((x) => [x]), `if points >= ${goal}:\n    return ["Bonus unlocked!", "Round over"]\nreturn ["Round over"]`, "if points >= goal: with the bonus print indented.")],
        hints: ["if points >= goal: then an indented print.", "Round over has no indent, so it always prints.", 'print("Bonus unlocked!") goes inside the if.'],
      };
    },
  },
  {
    id: "m2-low-stock", module: 2, difficulty: 1, topics: ["if"],
    make(r) {
      const minimum = r.int(5, 25), stock = minimum + r.int(-4, 10), item = r.pick(["notebooks", "batteries", "mugs", "cables", "stickers"]);
      return {
        title: "Stock check", noHardcode: false,
        scenario: `The shop has ${stock} ${item} left and wants at least ${minimum} on the shelf.`,
        steps: [`Keep stock = ${stock} and minimum = ${minimum}.`, "If stock is below minimum, print two lines: Low stock! then Reorder now", "Then, always, print: Inventory checked"],
        starter: `${assigns({ stock, minimum })}\n\n# Check the stock\n`,
        solution: lines(assigns({ stock, minimum }), "if stock < minimum:", '    print("Low stock!")', '    print("Reorder now")', 'print("Inventory checked")'),
        checks: [given({ stock, minimum }), logic(["stock"], around(minimum).map((x) => [x]), `if stock < ${minimum}:\n    return ["Low stock!", "Reorder now", "Inventory checked"]\nreturn ["Inventory checked"]`, "Both warning lines belong inside the if.")],
        hints: ["if stock < minimum: with a colon.", "Both warning prints are indented under the if.", "Inventory checked is not indented."],
      };
    },
  },
  {
    id: "m2-even-note", module: 2, difficulty: 1, topics: ["if"],
    make(r) {
      const n = r.int(10, 99);
      return {
        title: "Even numbers", noHardcode: false,
        scenario: `A raffle ticket reads ${n}. Even-numbered tickets win a sticker.`,
        steps: [`Keep n = ${n}.`, "If n is even (n % 2 == 0), print: <n> wins a sticker", "Then, always, print: Ticket checked"],
        starter: `${assigns({ n })}\n\n# Check the ticket\n`,
        solution: lines(assigns({ n }), "if n % 2 == 0:", '    print(f"{n} wins a sticker")', 'print("Ticket checked")'),
        checks: [given({ n }), logic(["n"], [[n], [n + 1], [10], [11], [64], [77]], 'if n % 2 == 0:\n    return [f"{n} wins a sticker", "Ticket checked"]\nreturn ["Ticket checked"]', "if n % 2 == 0: and an f-string inside.")],
        hints: ["Even means n % 2 == 0: the remainder is zero.", 'The winning line is an f-string: print(f"{n} wins a sticker").', "Ticket checked is outside the if."],
      };
    },
  },
  {
    id: "m2-leader", module: 2, difficulty: 1, topics: ["if", "comparisons"],
    make(r) {
      const away = r.int(0, 5), home = away + r.int(-2, 3), sport = r.pick(["football", "handball", "hockey", "water polo"]);
      return {
        title: "Who leads?", noHardcode: false,
        scenario: `In ${sport} it's ${home} to ${away} (home to away).`,
        steps: [`Keep home = ${home} and away = ${away}.`, "If home is greater than away, print: Home team leads", "Then, always, print: Final whistle"],
        starter: `${assigns({ home, away })}\n\n# Who leads?\n`,
        solution: lines(assigns({ home, away }), "if home > away:", '    print("Home team leads")', 'print("Final whistle")'),
        checks: [given({ home, away }), logic(["home"], [[away - 1 < 0 ? 0 : away - 1], [away], [away + 1], [away + 4]], `if home > ${away}:\n    return ["Home team leads", "Final whistle"]\nreturn ["Final whistle"]`, "A tie doesn't count as leading: use >.")],
        hints: ["if home > away: with a colon.", "A tie isn't leading, so > not >=.", "Final whistle has no indent."],
      };
    },
  },
  {
    id: "m2-password-len", module: 2, difficulty: 1, topics: ["if", "comparisons"],
    make(r) {
      const words = ["sunshine", "dragon", "pizza", "rocket", "blue", "tiger99", "letmein", "moonlight", "abc", "python3", "fluffy"];
      const password = r.pick(words), need = r.int(6, 9);
      return {
        title: "Strong enough?", noHardcode: false,
        scenario: `A sign-up form needs passwords of at least ${need} characters. Someone typed "${password}".`,
        steps: [`Keep password = "${password}".`, `If len(password) is at least ${need}, print: Strong enough`, "Then, always, print: Password checked"],
        starter: `${assigns({ password })}\n\n# Check the password length\n`,
        solution: lines(assigns({ password }), `if len(password) >= ${need}:`, '    print("Strong enough")', 'print("Password checked")'),
        checks: [given({ password }), logic(["password"], [["a".repeat(need - 1)], ["a".repeat(need)], ["a".repeat(need + 4)], ["hi"]], `if len(password) >= ${need}:\n    return ["Strong enough", "Password checked"]\nreturn ["Password checked"]`, `if len(password) >= ${need}:`)],
        hints: [`len(password) gives the number of characters.`, `Use len(password) >= ${need} as the condition.`, "Password checked has no indent."],
      };
    },
  },
  {
    id: "m2-rsvp", module: 2, difficulty: 1, topics: ["if", "comparisons"],
    make(r) {
      const reply = r.pick(["yes", "no", "maybe"]), person = r.pick(PEOPLE), event = r.pick(["the picnic", "game night", "the concert", "movie night"]);
      return {
        title: "RSVP", noHardcode: false,
        scenario: `${person} replied "${reply}" to the invitation for ${event}. Only an exact "yes" counts as coming.`,
        steps: [`Keep reply = "${reply}".`, 'If reply is exactly "yes", print: Great, see you there!', "Then, always, print: Reply received"],
        starter: `${assigns({ reply })}\n\n# Check the reply\n`,
        solution: lines(assigns({ reply }), 'if reply == "yes":', '    print("Great, see you there!")', 'print("Reply received")'),
        checks: [given({ reply }), logic(["reply"], [["yes"], ["no"], ["maybe"], ["Yes"]], 'if reply == "yes":\n    return ["Great, see you there!", "Reply received"]\nreturn ["Reply received"]', 'if reply == "yes": (two equals signs).')],
        hints: ["To compare text, use two equals signs: reply == \"yes\".", "Don't forget the colon after the condition.", "The first message is indented. Reply received is not."],
      };
    },
  },

  // ---------------- Medium ----------------
  {
    id: "m2-ticket-price", module: 2, difficulty: 2, topics: ["else", "comparisons"],
    make(r) {
      const cutoff = r.int(10, 16), kid = r.int(3, 8), adult = kid + r.int(3, 9), age = cutoff + r.int(-5, 6), place = r.pick(["the zoo", "the science museum", "the aquarium", "the cinema", "the water park"]);
      return {
        title: "Ticket booth", noHardcode: false,
        scenario: `At ${place}, visitors under ${cutoff} pay ${kid}, everyone else pays ${adult}. The next visitor is ${age}.`,
        steps: [`Keep age = ${age}.`, `If age is under ${cutoff}, print: Child ticket: $${kid}`, `Otherwise print: Standard ticket: $${adult}`],
        starter: `${assigns({ age })}\n\n# Print the right ticket\n`,
        solution: lines(assigns({ age }), `if age < ${cutoff}:`, `    print("Child ticket: $${kid}")`, "else:", `    print("Standard ticket: $${adult}")`),
        checks: [given({ age }), logic(["age"], around(cutoff, [adult * 2]).map((x) => [x]), `if age < ${cutoff}:\n    return ["Child ticket: $${kid}"]\nreturn ["Standard ticket: $${adult}"]`, `if age < ${cutoff}: ... else:`)],
        hints: [`if age < ${cutoff}: with the child print under it.`, "else: at the same indent as the if, with the other ticket under it.", `Exactly ${cutoff} is not a child, so use < not <=.`],
      };
    },
  },
  {
    id: "m2-pass-fail", module: 2, difficulty: 2, topics: ["else", "comparisons"],
    make(r) {
      const pass_mark = r.int(45, 65), mark = pass_mark + r.int(-12, 25), name = r.pick(PEOPLE);
      return {
        title: "Result slip", noHardcode: false,
        scenario: `${name} got ${mark} on a test. The pass mark is ${pass_mark}.`,
        steps: [`Keep mark = ${mark} and pass_mark = ${pass_mark}.`, "If mark is at least pass_mark, print: Mark <mark>: Pass", "Otherwise print: Mark <mark>: Fail", "Use an f-string for the mark."],
        starter: `${assigns({ mark, pass_mark })}\n\n# Print the result\n`,
        solution: lines(assigns({ mark, pass_mark }), "if mark >= pass_mark:", '    print(f"Mark {mark}: Pass")', "else:", '    print(f"Mark {mark}: Fail")'),
        checks: [given({ mark, pass_mark }), logic(["mark"], around(pass_mark, [0, 100]).map((x) => [x]), `if mark >= ${pass_mark}:\n    return [f"Mark {mark}: Pass"]\nreturn [f"Mark {mark}: Fail"]`, "Both prints are f-strings with {mark}.")],
        hints: ["if mark >= pass_mark: ... else: ...", 'Each branch prints an f-string like print(f"Mark {mark}: Pass").', "Exactly the pass mark is a pass: use >=."],
      };
    },
  },
  {
    id: "m2-discount", module: 2, difficulty: 2, topics: ["else", "comparisons"],
    make(r) {
      const threshold = r.pick([50, 80, 100, 150, 200]), percent = r.pick([5, 10, 15, 20, 25]), total = threshold + r.int(-40, 120), shop = r.pick(["Pixel Palace", "Byte Bakery", "Page Turner", "Green Leaf"]);
      return {
        title: "Checkout discount", noHardcode: false,
        scenario: `${shop} takes ${percent}% off orders of ${threshold} or more. This order is ${total}.`,
        steps: [`Keep total = ${total}.`, `Make final: if total is ${threshold} or more it's total * (100 - ${percent}) / 100, otherwise just total.`, "Print: Pay $<final> with 2 decimal places."],
        starter: `${assigns({ total })}\n\n# Work out final, then print it\n`,
        solution: lines(assigns({ total }), `if total >= ${threshold}:`, `    final = total * (100 - ${percent}) / 100`, "else:", "    final = total", 'print(f"Pay ${final:.2f}")'),
        checks: [given({ total }), logic(["total"], [[threshold - 1], [threshold], [threshold + 1], [threshold + 77], [20]], `final = total * (100 - ${percent}) / 100 if total >= ${threshold} else total\nreturn [f"Pay \${final:.2f}"]`, `Use if total >= ${threshold}: ... else: to set final.`)],
        hints: [`if total >= ${threshold}: sets the discounted final.`, "else: final = total keeps the full price.", 'Then print(f"Pay ${final:.2f}") after the if / else, not indented.'],
      };
    },
  },
  {
    id: "m2-door-ab", module: 2, difficulty: 2, topics: ["else", "if"],
    make(r) {
      const n = r.int(100, 999), venue = r.pick(["the arena", "the theatre", "the stadium", "the hall"]);
      return {
        title: "Which door?", noHardcode: false,
        scenario: `At ${venue}, even ticket numbers use Door A and odd ticket numbers use Door B. Your ticket is ${n}.`,
        steps: [`Keep ticket = ${n}.`, "If the ticket number is even, print: Ticket <ticket>: Door A", "Otherwise print: Ticket <ticket>: Door B"],
        starter: `${assigns({ ticket: n })}\n\n# Which door?\n`,
        solution: lines(assigns({ ticket: n }), "if ticket % 2 == 0:", '    print(f"Ticket {ticket}: Door A")', "else:", '    print(f"Ticket {ticket}: Door B")'),
        checks: [given({ ticket: n }), logic(["ticket"], [[n], [n + 1], [100], [101], [500], [999]], 'door = "A" if ticket % 2 == 0 else "B"\nreturn [f"Ticket {ticket}: Door {door}"]', "Even means ticket % 2 == 0.")],
        hints: ["Even numbers have a remainder of 0 when divided by 2.", "if ticket % 2 == 0: ... else: ...", 'Each branch prints an f-string with {ticket}.'],
      };
    },
  },
  {
    id: "m2-login", module: 2, difficulty: 2, topics: ["else", "comparisons"],
    make(r) {
      const user = r.pick(PEOPLE), secret = r.pick(["rainbow", "pixel42", "open sesame", "tigerlily", "moonwalk"]), entered = r.pick([secret, secret, "wrong", secret.toUpperCase()]);
      return {
        title: "Login check", noHardcode: false,
        scenario: `${user} is signing in. The real password is "${secret}" and they typed "${entered}". Passwords are case-sensitive.`,
        steps: [`Keep user = "${user}", secret = "${secret}" and entered = "${entered}".`, "If entered equals secret, print: Welcome, <user>!", "Otherwise print: Wrong password"],
        starter: `${assigns({ user, secret, entered })}\n\n# Check the password\n`,
        solution: lines(assigns({ user, secret, entered }), "if entered == secret:", '    print(f"Welcome, {user}!")', "else:", '    print("Wrong password")'),
        checks: [given({ user, secret, entered }), logic(["entered"], [[secret], ["nope"], [secret.toUpperCase()], [""]], `if entered == ${pv(secret)}:\n    return ["Welcome, ${user}!"]\nreturn ["Wrong password"]`, "if entered == secret: ... else: ...")],
        hints: ["Compare the two texts with ==.", 'The welcome line is an f-string: print(f"Welcome, {user}!").', "else: has the Wrong password print under it."],
      };
    },
  },
  {
    id: "m2-grade-letter", module: 2, difficulty: 2, topics: ["elif", "comparisons"],
    make(r) {
      const a = r.int(85, 92), b = a - r.int(8, 12), c = b - r.int(8, 12), score = r.int(35, 99), name = r.pick(PEOPLE);
      return {
        title: "Report card", noHardcode: false,
        scenario: `${name} scored ${score}. A is ${a}+, B is ${b}+, C is ${c}+, and anything lower is D.`,
        steps: [`Keep score = ${score}.`, "Make a variable grade holding the right letter.", "Print: <name>: <grade> using an f-string, where name is the text " + `"${name}".`],
        starter: `${assigns({ score })}\nname = ${pv(name)}\n\n# Work out grade, then print\n`,
        solution: lines(assigns({ score }), `name = ${pv(name)}`, `if score >= ${a}:`, '    grade = "A"', `elif score >= ${b}:`, '    grade = "B"', `elif score >= ${c}:`, '    grade = "C"', "else:", '    grade = "D"', 'print(f"{name}: {grade}")'),
        checks: [given({ score, name }), logic(["score"], [[a], [a - 1], [b], [b - 1], [c], [c - 1], [100], [0]], `grade = "A" if score >= ${a} else "B" if score >= ${b} else "C" if score >= ${c} else "D"\nreturn [f"${name}: {grade}"]`, "if / elif / elif / else, highest limit first.")],
        hints: [`Start with if score >= ${a}: and work down.`, `Each limit is a >=: ${a}, then ${b}, then ${c}. else: catches the rest.`, 'After the chain: print(f"{name}: {grade}").'],
      };
    },
  },
  {
    id: "m2-clothes", module: 2, difficulty: 2, topics: ["elif", "comparisons"],
    make(r) {
      const t1 = r.int(24, 28), t2 = r.int(15, 19), t3 = r.int(5, 9), temp = r.int(-3, 33), city = r.pick(["Oslo", "Lima", "Perth", "Seoul", "Cairo", "Dublin"]);
      return {
        title: "What to wear", noHardcode: false,
        scenario: `It's ${temp} degrees in ${city}. ${t1}+ is T-shirt weather, ${t2}+ needs a light jacket, ${t3}+ needs a coat, and colder means staying in.`,
        steps: [`Keep temp = ${temp}.`, "Print one of: T-shirt, Light jacket, Coat or Stay in"],
        starter: `${assigns({ temp })}\n\n# Pick what to wear\n`,
        solution: lines(assigns({ temp }), `if temp >= ${t1}:`, '    print("T-shirt")', `elif temp >= ${t2}:`, '    print("Light jacket")', `elif temp >= ${t3}:`, '    print("Coat")', "else:", '    print("Stay in")'),
        checks: [given({ temp }), logic(["temp"], [[t1], [t1 - 1], [t2], [t2 - 1], [t3], [t3 - 1], [40], [-10]], `if temp >= ${t1}:\n    return ["T-shirt"]\nif temp >= ${t2}:\n    return ["Light jacket"]\nif temp >= ${t3}:\n    return ["Coat"]\nreturn ["Stay in"]`, "Check from the warmest limit down.")],
        hints: [`Start with the warmest: if temp >= ${t1}:`, `Then elif temp >= ${t2}: and elif temp >= ${t3}:`, 'Finish with else: print("Stay in").'],
      };
    },
  },
  {
    id: "m2-badge-order", module: 2, difficulty: 2, topics: ["elif", "comparisons"],
    make(r) {
      const gold = r.int(80, 150), silver = r.int(40, 70), bronze = r.int(10, 30), speed = gold + r.int(5, 60);
      return {
        title: "Fix the badges", noHardcode: false,
        scenario: `A game awards badges by speed: over ${gold} is Gold, over ${silver} is Silver, over ${bronze} is Bronze, otherwise None. The starter has the right badges but the conditions are in the wrong order, so fast players only get Bronze.`,
        steps: [`Keep speed = ${speed}.`, "Fix the order of the conditions. Don't change any number or badge name."],
        starter: `${assigns({ speed })}\n\nif speed > ${bronze}:\n    print("Bronze")\nelif speed > ${silver}:\n    print("Silver")\nelif speed > ${gold}:\n    print("Gold")\nelse:\n    print("None")\n`,
        solution: lines(assigns({ speed }), "", `if speed > ${gold}:`, '    print("Gold")', `elif speed > ${silver}:`, '    print("Silver")', `elif speed > ${bronze}:`, '    print("Bronze")', "else:", '    print("None")'),
        checks: [given({ speed }), logic(["speed"], [[gold + 1], [gold], [silver + 1], [silver], [bronze + 1], [bronze], [0]], `if speed > ${gold}:\n    return ["Gold"]\nif speed > ${silver}:\n    return ["Silver"]\nif speed > ${bronze}:\n    return ["Bronze"]\nreturn ["None"]`, "Biggest limit first.")],
        hints: ["Python stops at the first true condition. Which limit should come first?", "The biggest limit goes first, the smallest last.", `Order: > ${gold} (Gold), > ${silver} (Silver), > ${bronze} (Bronze), else None.`],
      };
    },
  },
  {
    id: "m2-speed-fine", module: 2, difficulty: 2, topics: ["elif", "comparisons"],
    make(r) {
      const limit = r.pick([50, 60, 80, 100]), speed = limit + r.int(-8, 45), f1 = r.pick([40, 50, 60]), f2 = f1 * 2, f3 = f1 * 4;
      return {
        title: "Speed camera", noHardcode: false,
        scenario: `A camera sees a car at ${speed} in a ${limit} zone.`,
        steps: [`Keep speed = ${speed} and limit = ${limit}.`, "Make over: how far the car is over the limit (speed - limit).", `If over is 30 or more print: Fine: $${f3}`, `Else if over is 15 or more print: Fine: $${f2}`, `Else if over is above 0 print: Fine: $${f1}`, "Otherwise print: No fine"],
        starter: `${assigns({ speed, limit })}\n\n# Work out over, then decide the fine\n`,
        solution: lines(assigns({ speed, limit }), "over = speed - limit", "if over >= 30:", `    print("Fine: $${f3}")`, "elif over >= 15:", `    print("Fine: $${f2}")`, "elif over > 0:", `    print("Fine: $${f1}")`, "else:", '    print("No fine")'),
        checks: [given({ speed, limit }), v("over", "speed - limit", "over = speed - limit"), logic(["speed"], [[limit - 5], [limit], [limit + 1], [limit + 14], [limit + 15], [limit + 29], [limit + 30], [limit + 60]], `over = speed - ${limit}\nif over >= 30:\n    return ["Fine: $${f3}"]\nif over >= 15:\n    return ["Fine: $${f2}"]\nif over > 0:\n    return ["Fine: $${f1}"]\nreturn ["No fine"]`, "Work out over first, then chain from the biggest limit down.")],
        hints: ["Start with over = speed - limit.", "Check over >= 30 first, then over >= 15, then over > 0.", "else: handles drivers at or under the limit."],
      };
    },
  },
  {
    id: "m2-traffic-light", module: 2, difficulty: 2, topics: ["elif", "comparisons"],
    make(r) {
      const colour = r.pick(["green", "yellow", "red", "flashing"]);
      return {
        title: "Traffic light", noHardcode: false,
        scenario: `A self-driving toy car reads the light colour: "${colour}".`,
        steps: [`Keep colour = "${colour}".`, 'If colour is "green" print: Go', 'Else if colour is "yellow" print: Slow down', "For anything else print: Stop"],
        starter: `${assigns({ colour })}\n\n# What should the car do?\n`,
        solution: lines(assigns({ colour }), 'if colour == "green":', '    print("Go")', 'elif colour == "yellow":', '    print("Slow down")', "else:", '    print("Stop")'),
        checks: [given({ colour }), logic(["colour"], [["green"], ["yellow"], ["red"], ["flashing"], ["Green"]], 'if colour == "green":\n    return ["Go"]\nif colour == "yellow":\n    return ["Slow down"]\nreturn ["Stop"]', "Compare text with == and finish with else.")],
        hints: ['Compare with two equals signs: colour == "green".', 'Use elif colour == "yellow": for the second case.', 'else: catches red and everything unexpected.'],
      };
    },
  },

  // ---------------- Hard ----------------
  {
    id: "m2-arcade-prize", module: 2, difficulty: 3, topics: ["and", "if", "else"],
    make(r) {
      const need = r.int(100, 400), cost = r.int(3, 9), score = need + r.int(-60, 80), tokens = cost + r.int(-3, 6);
      return {
        title: "Prize counter", noHardcode: false,
        scenario: `A prize costs ${cost} tokens and needs a score of at least ${need}. You have ${tokens} tokens and a score of ${score}.`,
        steps: [`Keep score = ${score} and tokens = ${tokens}.`, "If BOTH requirements are met, print: Prize unlocked!", "Otherwise print: Keep playing"],
        starter: `${assigns({ score, tokens })}\n\n# Can you claim the prize?\n`,
        solution: lines(assigns({ score, tokens }), `if score >= ${need} and tokens >= ${cost}:`, '    print("Prize unlocked!")', "else:", '    print("Keep playing")'),
        checks: [given({ score, tokens }), logic(["score", "tokens"], [[need, cost], [need - 1, cost], [need, cost - 1], [need + 50, cost + 5], [0, 0], [need + 50, cost - 2]], `if score >= ${need} and tokens >= ${cost}:\n    return ["Prize unlocked!"]\nreturn ["Keep playing"]`, "Both conditions, joined by and.")],
        hints: ["Two conditions joined with and: both must be true.", `Each side is a full comparison: score >= ${need} and tokens >= ${cost}.`, "else: catches every case where either one fails."],
      };
    },
  },
  {
    id: "m2-comfort", module: 2, difficulty: 3, topics: ["and", "if", "else"],
    make(r) {
      const lo = r.int(17, 20), hi = r.int(24, 27), temp = r.int(12, 32), room = r.pick(["the studio", "the classroom", "the office", "the library"]);
      return {
        title: "Comfort zone", noHardcode: false,
        scenario: `${room} should stay between ${lo} and ${hi} degrees (both included). The thermostat reads ${temp}.`,
        steps: [`Keep temp = ${temp}.`, `If temp is at least ${lo} AND at most ${hi}, print: Comfortable`, "Otherwise print: Adjust the thermostat"],
        starter: `${assigns({ temp })}\n\n# Is it comfortable?\n`,
        solution: lines(assigns({ temp }), `if temp >= ${lo} and temp <= ${hi}:`, '    print("Comfortable")', "else:", '    print("Adjust the thermostat")'),
        checks: [given({ temp }), logic(["temp"], [[lo - 1], [lo], [lo + 2], [hi], [hi + 1], [0], [40]], `if ${lo} <= temp <= ${hi}:\n    return ["Comfortable"]\nreturn ["Adjust the thermostat"]`, "temp >= low and temp <= high (repeat temp on each side).")],
        hints: ["You need two comparisons joined by and.", "Repeat the variable on both sides: temp >= low and temp <= high.", "Both limits are included, so use >= and <=."],
      };
    },
  },
  {
    id: "m2-day-off", module: 2, difficulty: 3, topics: ["or", "if", "else"],
    make(r) {
      const day = r.pick(["Monday", "Wednesday", "Friday", "Saturday", "Sunday", "Tuesday"]), is_holiday = r.pick([true, false]);
      return {
        title: "Day off?", noHardcode: false,
        scenario: `Today is ${day}${is_holiday ? " and it is a public holiday" : " and it is not a holiday"}. Saturdays, Sundays and public holidays are days off.`,
        steps: [`Keep day = "${day}" and is_holiday = ${pv(is_holiday)}.`, "If it's Saturday, or Sunday, or a holiday, print: Day off", "Otherwise print: Work day"],
        starter: `${assigns({ day, is_holiday })}\n\n# Day off or work day?\n`,
        solution: lines(assigns({ day, is_holiday }), 'if day == "Saturday" or day == "Sunday" or is_holiday:', '    print("Day off")', "else:", '    print("Work day")'),
        checks: [given({ day, is_holiday }), logic(["day", "is_holiday"], [["Saturday", false], ["Sunday", false], ["Monday", true], ["Monday", false], ["Friday", false], ["Sunday", true]], 'if day in ("Saturday", "Sunday") or is_holiday:\n    return ["Day off"]\nreturn ["Work day"]', "Join the three conditions with or.")],
        hints: ["or is true when at least one side is true.", 'Repeat day on each side: day == "Saturday" or day == "Sunday".', "is_holiday is already True or False, so add or is_holiday with no comparison."],
      };
    },
  },
  {
    id: "m2-greeting", module: 2, difficulty: 3, topics: ["not", "if", "else"],
    make(r) {
      const logged_in = r.pick([true, false]), name = r.pick(PEOPLE);
      return {
        title: "Welcome screen", noHardcode: false,
        scenario: `A site greets members. ${name} is ${logged_in ? "signed in" : "not signed in"}.`,
        steps: [`Keep name = "${name}" and logged_in = ${pv(logged_in)}.`, "If the visitor is NOT logged in, print: Please log in", "Otherwise print: Hello, <name>!"],
        starter: `${assigns({ name, logged_in })}\n\n# Greet the visitor\n`,
        solution: lines(assigns({ name, logged_in }), "if not logged_in:", '    print("Please log in")', "else:", '    print(f"Hello, {name}!")'),
        checks: [given({ name, logged_in }), logic(["logged_in"], [[true], [false]], `if not logged_in:\n    return ["Please log in"]\nreturn ["Hello, ${name}!"]`, "if not logged_in: ... else: ..."), { name: "Uses not", code: `assert "not " in SOURCE, "Use not in your condition: if not logged_in:"`, peek: "if not logged_in:" }],
        hints: ["not flips True and False.", "if not logged_in: runs when logged_in is False.", 'The else branch prints an f-string: print(f"Hello, {name}!").'],
      };
    },
  },
  {
    id: "m2-movie-night", module: 2, difficulty: 3, topics: ["and", "or", "not"],
    make(r) {
      const day = r.pick(["Thursday", "Friday", "Saturday", "Sunday", "Wednesday"]), has_exam = r.pick([true, false]);
      return {
        title: "Movie night", noHardcode: false,
        scenario: `The group watches a film on Friday or Saturday, as long as nobody has an exam the next day. Today is ${day}, exam: ${has_exam ? "yes" : "no"}.`,
        steps: [`Keep day = "${day}" and has_exam = ${pv(has_exam)}.`, "If (day is Friday or Saturday) and not has_exam, print: Movie night!", "Otherwise print: Study time"],
        starter: `${assigns({ day, has_exam })}\n\n# Movie night or study time?\n`,
        solution: lines(assigns({ day, has_exam }), 'if (day == "Friday" or day == "Saturday") and not has_exam:', '    print("Movie night!")', "else:", '    print("Study time")'),
        checks: [given({ day, has_exam }), logic(["day", "has_exam"], [["Friday", false], ["Saturday", false], ["Friday", true], ["Sunday", false], ["Saturday", true], ["Wednesday", true]], 'if day in ("Friday", "Saturday") and not has_exam:\n    return ["Movie night!"]\nreturn ["Study time"]', "Brackets round the or part, then and not has_exam.")],
        hints: ['The day part: day == "Friday" or day == "Saturday", in brackets.', "Then add and not has_exam after the brackets.", "else: prints Study time."],
      };
    },
  },
  {
    id: "m2-bus-fare", module: 2, difficulty: 3, topics: ["elif", "and"],
    make(r) {
      const age = r.int(2, 80), is_peak = r.pick([true, false]);
      return {
        title: "Bus fare", noHardcode: false,
        scenario: `A bus charges by age: under 5 travels free, under 16 pays 1, 65 or over pays 1, and everyone else pays 3. Then a separate rule: in peak hours, anyone who isn't free pays 1 extra.`,
        steps: [`Keep age = ${age} and is_peak = ${pv(is_peak)}.`, "Make fare using the age rules (an if / elif / else chain).", "Then, separately, add 1 to fare when it is peak time and the fare is above 0.", "Print: Fare: $<fare>"],
        starter: `${assigns({ age, is_peak })}\n\n# Work out fare, then print it\n`,
        solution: lines(assigns({ age, is_peak }), "if age < 5:", "    fare = 0", "elif age < 16:", "    fare = 1", "elif age >= 65:", "    fare = 1", "else:", "    fare = 3", "if is_peak and fare > 0:", "    fare += 1", 'print(f"Fare: ${fare}")'),
        checks: [given({ age, is_peak }), logic(["age", "is_peak"], [[3, true], [3, false], [4, false], [5, false], [15, true], [16, false], [16, true], [64, true], [65, false], [80, true]], 'if age < 5:\n    fare = 0\nelif age < 16:\n    fare = 1\nelif age >= 65:\n    fare = 1\nelse:\n    fare = 3\nif is_peak and fare > 0:\n    fare += 1\nreturn [f"Fare: ${fare}"]', "A chain for the age fare, then a separate if for the peak extra.")],
        hints: ["First an if / elif / elif / else chain that sets fare.", "Then a separate if (not elif): if is_peak and fare > 0:", 'Inside it add 1 with fare += 1, then print(f"Fare: ${fare}").'],
      };
    },
  },
  {
    id: "m2-bmi", module: 2, difficulty: 3, topics: ["elif", "comparisons"],
    make(r) {
      const height = r.pick([1.55, 1.6, 1.65, 1.7, 1.75, 1.8, 1.85]), weight = r.int(45, 105);
      return {
        title: "Health band", noHardcode: false,
        scenario: `A fitness app works out BMI (weight in kg divided by height in metres, squared) and names the band: under 18.5 Underweight, under 25 Healthy, under 30 Overweight, otherwise Obese. Today: ${weight} kg and ${height} m.`,
        steps: [`Keep weight = ${weight} and height = ${height}.`, "Make bmi = weight / (height * height).", "Make a variable band with the right name.", "Print: BMI <bmi to 1 decimal>: <band>"],
        starter: `${assigns({ weight, height })}\n\n# Work out bmi and band, then print\n`,
        solution: lines(assigns({ weight, height }), "bmi = weight / (height * height)", "if bmi < 18.5:", '    band = "Underweight"', "elif bmi < 25:", '    band = "Healthy"', "elif bmi < 30:", '    band = "Overweight"', "else:", '    band = "Obese"', 'print(f"BMI {bmi:.1f}: {band}")'),
        checks: [given({ weight, height }), v("bmi", "weight / (height * height)", "bmi = weight / (height * height)"), logic(["weight"], [[45], [52], [60], [72], [80], [95], [110]], `bmi = weight / (${height} * ${height})\nband = "Underweight" if bmi < 18.5 else "Healthy" if bmi < 25 else "Overweight" if bmi < 30 else "Obese"\nreturn [f"BMI {bmi:.1f}: {band}"]`, "Work out bmi first, then chain from the lowest limit up.")],
        hints: ["bmi = weight / (height * height) first.", "Check bmi < 18.5, then bmi < 25, then bmi < 30, else the last band.", 'Print with print(f"BMI {bmi:.1f}: {band}").'],
      };
    },
  },
  {
    id: "m2-leap-year", module: 2, difficulty: 3, topics: ["and", "or", "elif"],
    make(r) {
      const year = r.pick([1900, 2000, 2024, 2023, 2100, 2400, 1996, 2019, 2012, 1800, r.int(1950, 2100)]);
      return {
        title: "Leap year", noHardcode: false,
        scenario: `A calendar app needs to know if ${year} is a leap year. A leap year is divisible by 4, except years divisible by 100, which only count if they are also divisible by 400.`,
        steps: [`Keep year = ${year}.`, "If it's a leap year print: <year> is a leap year", "Otherwise print: <year> is not a leap year"],
        starter: `${assigns({ year })}\n\n# Leap year or not?\n`,
        solution: lines(assigns({ year }), "if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0):", '    print(f"{year} is a leap year")', "else:", '    print(f"{year} is not a leap year")'),
        checks: [given({ year }), logic(["year"], [[1900], [2000], [2024], [2023], [2100], [2400], [1996], [2019], [1800]], 'leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)\nreturn [f"{year} is a leap year"] if leap else [f"{year} is not a leap year"]', "year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)")],
        hints: ["Divisible by 4 is year % 4 == 0.", "The exception: (year % 100 != 0 or year % 400 == 0), in brackets.", "Join them with and: it must be divisible by 4 and pass the exception."],
      };
    },
  },
  {
    id: "m2-fizzbuzz", module: 2, difficulty: 3, topics: ["elif", "and"],
    make(r) {
      const n = r.pick([15, 30, 45, 9, 12, 21, 10, 20, 25, 7, 11, 13, r.int(1, 99)]);
      return {
        title: "Fizz Buzz", noHardcode: false,
        scenario: `In the classic game Fizz Buzz, each number is replaced by a word. The number is ${n}.`,
        steps: [`Keep n = ${n}.`, "If n is divisible by 3 AND by 5, print: FizzBuzz", "Else if n is divisible by 3, print: Fizz", "Else if n is divisible by 5, print: Buzz", "Otherwise print the number itself."],
        starter: `${assigns({ n })}\n\n# Fizz Buzz\n`,
        solution: lines(assigns({ n }), "if n % 3 == 0 and n % 5 == 0:", '    print("FizzBuzz")', "elif n % 3 == 0:", '    print("Fizz")', "elif n % 5 == 0:", '    print("Buzz")', "else:", "    print(n)"),
        checks: [given({ n }), logic(["n"], [[15], [30], [9], [12], [10], [25], [7], [11], [1], [60]], 'if n % 3 == 0 and n % 5 == 0:\n    return ["FizzBuzz"]\nif n % 3 == 0:\n    return ["Fizz"]\nif n % 5 == 0:\n    return ["Buzz"]\nreturn [str(n)]', "Check the both-case first, then 3, then 5.")],
        hints: ["Numbers divisible by both come first, or they would match Fizz.", "Divisible by 3 means n % 3 == 0. By 5 means n % 5 == 0.", "else: print(n) shows the plain number."],
      };
    },
  },
];
