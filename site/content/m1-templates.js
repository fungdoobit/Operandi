// Module 1 challenge templates. Each make(r) builds one challenge from a
// seeded random generator r, so every play-through gets different values.
// The expected output is produced by running `solution`, and
// tools/validate.mjs proves every template works across many seeds.

import { py } from "../js/rng.js";

const PEOPLE = ["Aisha", "Ben", "Chloe", "Daniel", "Elena", "Farid", "Grace", "Hiro", "Ines", "Jamal", "Kim", "Leo", "Maya", "Noah", "Omar", "Priya", "Quinn", "Rosa", "Sam", "Tara", "Umar", "Vera", "Wei", "Yusuf", "Zoe"];
const TEAMS = ["Red Rockets", "Blue Sharks", "Green Giants", "Night Owls", "Iron Wolves", "Solar Flares"];
const CITIES = ["Tokyo", "Lisbon", "Nairobi", "Toronto", "Seoul", "Cairo", "Oslo", "Lima", "Perth", "Dublin", "Hanoi", "Quito"];
const SHOPS = ["Bean There", "Page Turner", "Pixel Palace", "Green Leaf", "The Daily Grind", "Byte Bakery"];
const FOODS = ["pizza", "noodles", "tacos", "curry", "sushi", "burgers", "dumplings", "salad"];
const ITEMS = [["Notebook", 3.5, 8.5], ["Headphones", 25, 60], ["Water bottle", 6, 15], ["Backpack", 20, 55], ["Phone case", 8, 22], ["Desk lamp", 15, 40], ["Mug", 4, 12], ["Keyboard", 30, 90]];
const SONGS = ["midnight drive", "golden hour", "paper planes", "neon lights", "ocean eyes", "slow motion"];
const WORDS = ["python", "variable", "keyboard", "galaxy", "rainbow", "dragon", "harbour", "journey"];

const given = (vars) => {
  const names = Object.keys(vars);
  return {
    name: "Given values unchanged",
    code: `assert [${names.map((n) => `globals().get(${py(n)})`).join(", ")}] == [${names.map((n) => py(vars[n])).join(", ")}], "Keep ${names.join(", ")} exactly as given."`,
    peek: `Keep ${names.map((n) => `${n} = ${py(vars[n])}`).join(", ")}.`,
  };
};

const v = (name, expr, peek, { approx } = {}) => ({
  name: `${name} is right`,
  code: `assert ${py(name)} in globals(), "Make a variable called ${name}."\n` +
    (approx ? `assert abs(${name} - (${expr})) < 1e-6, "${name} isn't right yet."` : `assert ${name} == (${expr}), "${name} isn't right yet."`),
  peek,
});

const noTyped = (texts, msg) => ({
  name: "Uses the variables, not typed-in text",
  code: `assert not any(print_has_literal(t) for t in ${JSON.stringify(texts)}), ${py(msg)}`,
  peek: msg,
});

const lines = (...ls) => ls.join("\n");

export const M1_TEMPLATES = [
  // ---------------- Easy ----------------
  {
    id: "m1-shop-sign", module: 1, difficulty: 1, topics: ["print()"],
    make(r) {
      const shop = r.pick(SHOPS), open = r.int(7, 10), close = r.int(5, 10);
      return {
        title: `Sign for ${shop}`, noHardcode: false,
        scenario: `${shop} needs a two-line sign for its window.`,
        steps: [`Print: Welcome to ${shop}!`, `Print: Open ${open}am to ${close}pm`],
        starter: "# Print the two lines of the sign\n",
        solution: lines(`print("Welcome to ${shop}!")`, `print("Open ${open}am to ${close}pm")`),
        checks: [],
        hints: ["One print() per line of the sign.", "Text goes in quotes inside print().", `Line 1: print("Welcome to ${shop}!")`],
      };
    },
  },
  {
    id: "m1-player-team", module: 1, difficulty: 1, topics: ["variables", "print()"],
    make(r) {
      const p = r.pick(PEOPLE), t = r.pick(TEAMS);
      return {
        title: "Team roster", noHardcode: true,
        scenario: `The league app shows which team each player is on. Today it's ${p}.`,
        steps: [`Make a variable player that holds "${p}".`, `Make a variable team that holds "${t}".`, `Print: ${p} plays for ${t}, using the variables and commas.`],
        starter: "# Make player and team, then print the sentence\n",
        solution: lines(`player = "${p}"`, `team = "${t}"`, `print(player, "plays for", team)`),
        checks: [v("player", py(p), `player should be "${p}".`), v("team", py(t), `team should be "${t}".`), noTyped([p, t], "Use the variables player and team inside print().")],
        hints: ["Create both variables first, each on its own line.", "print() can take several values separated by commas.", 'print(player, "plays for", team)'],
      };
    },
  },
  {
    id: "m1-bonus-points", module: 1, difficulty: 1, topics: ["variables", "+="],
    make(r) {
      const s = r.int(10, 90) * 10, b = r.int(2, 9) * 25;
      return {
        title: "Bonus round", noHardcode: true,
        scenario: `Your game score is ${s}. You just picked up a bonus worth ${b} points.`,
        steps: [`Keep score = ${s} and bonus = ${b}.`, "Add the bonus to score using +=.", "Print score."],
        starter: `score = ${s}\nbonus = ${b}\n\n# Add the bonus to score, then print it\n`,
        solution: lines(`score = ${s}`, `bonus = ${b}`, "score += bonus", "print(score)"),
        checks: [{ ...given({ bonus: b }) }, v("score", `${s} + ${b}`, `score should end up as ${s + b}.`)],
        hints: ["score += bonus adds bonus onto score.", "After that line, score holds the new total.", "score += bonus, then print(score)"],
      };
    },
  },
  {
    id: "m1-garden-area", module: 1, difficulty: 1, topics: ["maths", "variables"],
    make(r) {
      const w = r.int(3, 15), h = r.int(3, 15);
      return {
        title: "Garden plot", noHardcode: true,
        scenario: `A rectangular garden is ${w} metres wide and ${h} metres long.`,
        steps: [`Make width = ${w} and length = ${h}.`, "Make area by multiplying them.", "Print area."],
        starter: `width = ${w}\nlength = ${h}\n\n# Work out area and print it\n`,
        solution: lines(`width = ${w}`, `length = ${h}`, "area = width * length", "print(area)"),
        checks: [given({ width: w, length: h }), v("area", "width * length", `area should be ${w * h}.`)],
        hints: ["Area of a rectangle = width × length.", "Python uses * for multiply.", "area = width * length, then print(area)"],
      };
    },
  },
  {
    id: "m1-shout", module: 1, difficulty: 1, topics: ["string methods"],
    make(r) {
      const w = r.pick(["hello", "goal", "help", "pizza time", "we won", "game over", "happy birthday"]);
      return {
        title: "Shout it", noHardcode: true,
        scenario: `Your chat bot needs to SHOUT the message "${w}".`,
        steps: [`Keep message = "${w}".`, "Print message in capital letters, using a string method."],
        starter: `message = "${w}"\n\n# Print the message in capitals\n`,
        solution: lines(`message = "${w}"`, "print(message.upper())"),
        checks: [given({ message: w }), noTyped([w.toUpperCase()], "Use a method on message to make the capitals, don't type them.")],
        hints: ["There's a string method that makes every letter a capital.", "Methods are called with a dot: message.something()", "print(message.upper())"],
      };
    },
  },
  {
    id: "m1-password-length", module: 1, difficulty: 1, topics: ["len()"],
    make(r) {
      const pw = r.pick(["sunflower42", "blue_whale", "Tr0ub4dor", "correcthorse", "kopi&toast", "night-owl-7", "Pa55word!"]);
      return {
        title: "Password checker", noHardcode: true,
        scenario: "A sign-up form needs to know how long a password is.",
        steps: [`Keep password = "${pw}".`, "Print how many characters it has."],
        starter: `password = "${pw}"\n\n# Print the length of password\n`,
        solution: lines(`password = "${pw}"`, "print(len(password))"),
        checks: [given({ password: pw })],
        hints: ["There's a built-in function that counts characters.", "len(something) gives its length.", "print(len(password))"],
      };
    },
  },
  {
    id: "m1-first-last-letter", module: 1, difficulty: 1, topics: ["indexing"],
    make(r) {
      const c = r.pick(CITIES);
      return {
        title: "Airport codes", noHardcode: true,
        scenario: `A travel app shows the first and last letter of each city. Today: ${c}.`,
        steps: [`Keep city = "${c}".`, "Print the first letter of city.", "Print the last letter of city."],
        starter: `city = "${c}"\n\n# Print the first letter, then the last letter\n`,
        solution: lines(`city = "${c}"`, "print(city[0])", "print(city[-1])"),
        checks: [given({ city: c })],
        hints: ["Use square brackets with a position number.", "Positions start at 0. Negative positions count from the end.", "print(city[0]) and print(city[-1])"],
      };
    },
  },
  {
    id: "m1-divider", module: 1, difficulty: 1, topics: ["string repetition"],
    make(r) {
      const ch = r.pick(["=", "-", "*", "~", "#"]), n = r.int(10, 30);
      return {
        title: "Divider line", noHardcode: true,
        scenario: `A report needs a divider line made of ${n} "${ch}" characters.`,
        steps: [`Keep symbol = "${ch}" and width = ${n}.`, "Print symbol repeated width times."],
        starter: `symbol = "${ch}"\nwidth = ${n}\n\n# Print the divider\n`,
        solution: lines(`symbol = "${ch}"`, `width = ${n}`, "print(symbol * width)"),
        checks: [given({ symbol: ch, width: n }), noTyped([ch.repeat(3)], "Repeat symbol with *, don't type the line out.")],
        hints: ["Text can be repeated with one of the maths operators.", '"ab" * 3 gives "ababab".', "print(symbol * width)"],
      };
    },
  },
  {
    id: "m1-intro-fstring", module: 1, difficulty: 1, topics: ["f-strings"],
    make(r) {
      const n = r.pick(PEOPLE), a = r.int(16, 60), food = r.pick(FOODS);
      return {
        title: "Profile line", noHardcode: true,
        scenario: "A profile page shows one line about each user.",
        steps: [`Keep name = "${n}", age = ${a} and food = "${food}".`, `Print: ${n} is ${a} and loves ${food}, using one f-string.`],
        starter: `name = "${n}"\nage = ${a}\nfood = "${food}"\n\n# Print the profile line with an f-string\n`,
        solution: lines(`name = "${n}"`, `age = ${a}`, `food = "${food}"`, 'print(f"{name} is {age} and loves {food}")'),
        checks: [given({ name: n, age: a, food }), noTyped([n, food], "Put the variables inside {curly brackets} instead of typing the values.")],
        hints: ["Put an f right before the opening quote.", "Variables go inside {curly brackets} in the text.", 'print(f"{name} is {age} and loves {food}")'],
      };
    },
  },

  // ---------------- Medium ----------------
  {
    id: "m1-split-bill", module: 1, difficulty: 2, topics: ["division", "f-strings", ":.2f"],
    make(r) {
      const bill = r.money(40, 250, 0.05), people = r.int(2, 7), place = r.pick(["dinner", "karaoke", "bowling", "a road trip", "a birthday cake"]);
      return {
        title: "Split the bill", noHardcode: true,
        scenario: `${people} friends shared the cost of ${place}: ${bill.toFixed(2)} in total.`,
        steps: [`Keep bill = ${py(bill)} and people = ${people}.`, "Make share: the bill divided equally.", "Print: Each pays $<share> with 2 decimal places."],
        starter: `bill = ${py(bill)}\npeople = ${people}\n\n# Work out share, then print it\n`,
        solution: lines(`bill = ${py(bill)}`, `people = ${people}`, "share = bill / people", 'print(f"Each pays ${share:.2f}")'),
        checks: [given({ bill, people }), v("share", "bill / people", `share should be about ${(bill / people).toFixed(4)}.`, { approx: true })],
        hints: ["Divide the bill by the number of people.", "In an f-string, {share:.2f} shows exactly 2 decimals.", 'share = bill / people, then print(f"Each pays ${share:.2f}")'],
      };
    },
  },
  {
    id: "m1-temperature", module: 1, difficulty: 2, topics: ["maths", "f-strings", ":.1f"],
    make(r) {
      const c = r.int(-10, 40), city = r.pick(CITIES);
      return {
        title: "Weather converter", noHardcode: true,
        scenario: `It's ${c}°C in ${city}. Your app also shows the temperature in Fahrenheit.`,
        steps: [`Keep celsius = ${c}.`, "Make fahrenheit using: celsius × 9 / 5 + 32.", `Print: ${c}C is <fahrenheit>F with 1 decimal place.`],
        starter: `celsius = ${c}\n\n# Convert, then print\n`,
        solution: lines(`celsius = ${c}`, "fahrenheit = celsius * 9 / 5 + 32", 'print(f"{celsius}C is {fahrenheit:.1f}F")'),
        checks: [given({ celsius: c }), v("fahrenheit", "celsius * 9 / 5 + 32", `fahrenheit should be ${(c * 9 / 5 + 32).toFixed(1)}.`, { approx: true })],
        hints: ["Write the formula with *, / and +.", "fahrenheit = celsius * 9 / 5 + 32", 'Print with f"{celsius}C is {fahrenheit:.1f}F"'],
      };
    },
  },
  {
    id: "m1-clean-username", module: 1, difficulty: 2, topics: ["strip()", "lower()", "len()"],
    make(r) {
      const base = r.pick(PEOPLE) + r.pick(["_", ".", ""]) + r.pick(["Dev", "Codes", "Plays", "99", "X", "Kid"]);
      const messy = " ".repeat(r.int(1, 4)) + base.split("").map((ch, i) => (i % 2 ? ch.toUpperCase() : ch.toLowerCase())).join("") + " ".repeat(r.int(1, 4));
      return {
        title: "Tidy username", noHardcode: true,
        scenario: `Someone signed up as "${messy}". Usernames must be lowercase with no spaces around them.`,
        steps: [`Keep raw = "${messy}".`, "Make username: raw with outside spaces removed and all lowercase.", "Print username.", "Print how many characters username has."],
        starter: `raw = "${messy}"\n\n# Make username, then print it and its length\n`,
        solution: lines(`raw = "${messy}"`, "username = raw.strip().lower()", "print(username)", "print(len(username))"),
        checks: [given({ raw: messy }), v("username", "raw.strip().lower()", `username should be "${messy.trim().toLowerCase()}".`)],
        hints: ["Two methods: one removes outside spaces, one makes everything lowercase.", "You can chain methods: raw.strip().lower()", "Then print(username) and print(len(username))."],
      };
    },
  },
  {
    id: "m1-swap-word", module: 1, difficulty: 2, topics: ["replace()"],
    make(r) {
      const [a, b] = r.shuffle(FOODS).slice(0, 2), p = r.pick(PEOPLE);
      const s = `${p} wants ${a} for dinner`;
      return {
        title: "Change of plan", noHardcode: true,
        scenario: `The group chat says "${s}". ${p} changed their mind: it's ${b} now.`,
        steps: [`Keep message = "${s}".`, `Make updated: message with "${a}" replaced by "${b}".`, "Print updated."],
        starter: `message = "${s}"\n\n# Make updated with replace(), then print it\n`,
        solution: lines(`message = "${s}"`, `updated = message.replace("${a}", "${b}")`, "print(updated)"),
        checks: [given({ message: s }), v("updated", `message.replace(${py(a)}, ${py(b)})`, `updated should be "${s.replace(a, b)}".`), noTyped([s.replace(a, b)], "Use replace() on message instead of typing the new sentence.")],
        hints: ["Strings have a method for swapping one piece of text for another.", 'replace takes two values: what to find, then what to put instead.', `updated = message.replace("${a}", "${b}")`],
      };
    },
  },
  {
    id: "m1-initials", module: 1, difficulty: 2, topics: ["indexing", "joining strings", "upper()"],
    make(r) {
      const first = r.pick(PEOPLE).toLowerCase(), last = r.pick(["lovelace", "hopper", "turing", "johnson", "berners", "kahn", "liskov", "ritchie"]);
      return {
        title: "Badge initials", noHardcode: true,
        scenario: `Name badges show just the initials. The sign-up form saved the name in lowercase: ${first} ${last}.`,
        steps: [`Keep first = "${first}" and last = "${last}".`, "Make initials: the first letter of each name joined together, in capitals.", "Print initials."],
        starter: `first = "${first}"\nlast = "${last}"\n\n# Make initials, then print them\n`,
        solution: lines(`first = "${first}"`, `last = "${last}"`, "initials = (first[0] + last[0]).upper()", "print(initials)"),
        checks: [given({ first, last }), v("initials", "(first[0] + last[0]).upper()", `initials should be "${(first[0] + last[0]).toUpperCase()}".`)],
        hints: ["first[0] is the first letter of first.", "+ joins two strings together.", "initials = (first[0] + last[0]).upper()"],
      };
    },
  },
  {
    id: "m1-minutes-seconds", module: 1, difficulty: 2, topics: ["//", "%", "f-strings"],
    make(r) {
      const secs = r.int(75, 3500), what = r.pick(["song", "podcast clip", "workout", "video", "speech"]);
      return {
        title: "How long is it?", noHardcode: true,
        scenario: `A ${what} lasts ${secs} seconds. Show it in minutes and seconds instead.`,
        steps: [`Keep total = ${secs}.`, "Make minutes: whole minutes in total (use //).", "Make seconds: the seconds left over (use %).", "Print: <minutes> min <seconds> sec"],
        starter: `total = ${secs}\n\n# Work out minutes and seconds, then print\n`,
        solution: lines(`total = ${secs}`, "minutes = total // 60", "seconds = total % 60", 'print(f"{minutes} min {seconds} sec")'),
        checks: [given({ total: secs }), v("minutes", "total // 60", `minutes should be ${Math.floor(secs / 60)}.`), v("seconds", "total % 60", `seconds should be ${secs % 60}.`)],
        hints: ["There are 60 seconds in a minute.", "// gives the whole number of times 60 fits; % gives what's left.", "minutes = total // 60 and seconds = total % 60"],
      };
    },
  },
  {
    id: "m1-average-score", module: 1, difficulty: 2, topics: ["maths", "brackets", ":.1f"],
    make(r) {
      const a = r.int(40, 100), b = r.int(40, 100), c = r.int(40, 100), s = r.pick(PEOPLE);
      return {
        title: "Test average", noHardcode: true,
        scenario: `${s} scored ${a}, ${b} and ${c} in three quizzes.`,
        steps: [`Keep quiz1 = ${a}, quiz2 = ${b}, quiz3 = ${c}.`, "Make average: the three added up, divided by 3.", "Print: Average: <average> with 1 decimal place."],
        starter: `quiz1 = ${a}\nquiz2 = ${b}\nquiz3 = ${c}\n\n# Work out the average, then print it\n`,
        solution: lines(`quiz1 = ${a}`, `quiz2 = ${b}`, `quiz3 = ${c}`, "average = (quiz1 + quiz2 + quiz3) / 3", 'print(f"Average: {average:.1f}")'),
        checks: [given({ quiz1: a, quiz2: b, quiz3: c }), v("average", "(quiz1 + quiz2 + quiz3) / 3", `average should be about ${((a + b + c) / 3).toFixed(3)}.`, { approx: true })],
        hints: ["Add the three scores, then divide by 3.", "Brackets matter: without them only quiz3 is divided.", "average = (quiz1 + quiz2 + quiz3) / 3"],
      };
    },
  },
  {
    id: "m1-sale-price", module: 1, difficulty: 2, topics: ["maths", "f-strings", ":.2f"],
    make(r) {
      const [item, lo, hi] = r.pick(ITEMS), price = r.money(lo, hi, 0.5), pct = r.pick([10, 15, 20, 25, 30, 40, 50]);
      return {
        title: `${item} sale`, noHardcode: true,
        scenario: `A ${item.toLowerCase()} costs ${price.toFixed(2)}. Today everything is ${pct}% off.`,
        steps: [`Keep price = ${py(price)} and discount = ${pct}.`, "Make sale: the price after the discount. (Hint: you pay 100 minus discount percent.)", "Print: Sale price: $<sale> with 2 decimal places."],
        starter: `price = ${py(price)}\ndiscount = ${pct}\n\n# Work out the sale price, then print it\n`,
        solution: lines(`price = ${py(price)}`, `discount = ${pct}`, "sale = price * (100 - discount) / 100", 'print(f"Sale price: ${sale:.2f}")'),
        checks: [given({ price, discount: pct }), v("sale", "price * (100 - discount) / 100", `sale should be about ${(price * (100 - pct) / 100).toFixed(3)}.`, { approx: true })],
        hints: [`${pct}% off means you pay ${100 - pct}% of the price.`, "Percent means divide by 100.", "sale = price * (100 - discount) / 100"],
      };
    },
  },
  {
    id: "m1-steps-km", module: 1, difficulty: 2, topics: ["maths", "f-strings", ":.2f"],
    make(r) {
      const steps = r.int(3000, 18000), stride = r.int(60, 85);
      return {
        title: "Step counter", noHardcode: true,
        scenario: `Your watch counted ${steps} steps. Each step is about ${stride} cm long.`,
        steps: [`Keep steps = ${steps} and stride_cm = ${stride}.`, "Make km: the distance in kilometres (100,000 cm in a km).", "Print: You walked <km> km with 2 decimal places."],
        starter: `steps = ${steps}\nstride_cm = ${stride}\n\n# Work out km, then print it\n`,
        solution: lines(`steps = ${steps}`, `stride_cm = ${stride}`, "km = steps * stride_cm / 100000", 'print(f"You walked {km:.2f} km")'),
        checks: [given({ steps, stride_cm: stride }), v("km", "steps * stride_cm / 100000", `km should be about ${(steps * stride / 100000).toFixed(4)}.`, { approx: true })],
        hints: ["Total centimetres = steps × stride.", "Then divide by 100000 to get kilometres.", "km = steps * stride_cm / 100000"],
      };
    },
  },
  {
    id: "m1-pizza-slices", module: 1, difficulty: 2, topics: ["//", "%", "f-strings"],
    make(r) {
      const pizzas = r.int(2, 6), slices = r.pick([6, 8, 10]), people = r.int(3, 9);
      return {
        title: "Pizza party", noHardcode: true,
        scenario: `${pizzas} pizzas, ${slices} slices each, shared between ${people} people. Everyone gets the same number of whole slices.`,
        steps: [`Keep pizzas = ${pizzas}, slices_each = ${slices}, people = ${people}.`, "Make total_slices.", "Make each: whole slices per person (use //).", "Make leftover: slices left over (use %).", "Print: Each person gets <each> slices", "Print: Leftover: <leftover>"],
        starter: `pizzas = ${pizzas}\nslices_each = ${slices}\npeople = ${people}\n\n# Work out total_slices, each and leftover\n`,
        solution: lines(`pizzas = ${pizzas}`, `slices_each = ${slices}`, `people = ${people}`, "total_slices = pizzas * slices_each", "each = total_slices // people", "leftover = total_slices % people", 'print(f"Each person gets {each} slices")', 'print(f"Leftover: {leftover}")'),
        checks: [given({ pizzas, slices_each: slices, people }), v("each", "pizzas * slices_each // people", `each should be ${Math.floor(pizzas * slices / people)}.`), v("leftover", "pizzas * slices_each % people", `leftover should be ${(pizzas * slices) % people}.`)],
        hints: ["First multiply to get all the slices.", "// shares out whole slices; % gives what's left.", "each = total_slices // people and leftover = total_slices % people"],
      };
    },
  },

  // ---------------- Hard ----------------
  {
    id: "m1-receipt-tax", module: 1, difficulty: 3, topics: ["maths", "f-strings", ":.2f"],
    make(r) {
      const [item, lo, hi] = r.pick(ITEMS), price = r.money(lo, hi, 0.25), qty = r.int(2, 6), tax = r.pick([5, 6, 8, 10, 12]);
      return {
        title: "Shop receipt", noHardcode: true,
        scenario: `A customer buys ${qty} × ${item} at ${price.toFixed(2)} each. Sales tax is ${tax}%.`,
        steps: [`Keep item = "${item}", price = ${py(price)}, qty = ${qty}, tax_rate = ${tax}.`, "Make subtotal, tax (tax_rate percent of subtotal) and total.", "Print: <qty> x <item>: $<subtotal>", "Print: Tax: $<tax>", "Print: Total: $<total>", "All money with 2 decimal places."],
        starter: `item = "${item}"\nprice = ${py(price)}\nqty = ${qty}\ntax_rate = ${tax}\n\n# Work out subtotal, tax and total, then print 3 lines\n`,
        solution: lines(`item = "${item}"`, `price = ${py(price)}`, `qty = ${qty}`, `tax_rate = ${tax}`, "subtotal = price * qty", "tax = subtotal * tax_rate / 100", "total = subtotal + tax", 'print(f"{qty} x {item}: ${subtotal:.2f}")', 'print(f"Tax: ${tax:.2f}")', 'print(f"Total: ${total:.2f}")'),
        checks: [given({ item, price, qty, tax_rate: tax }), v("subtotal", "price * qty", `subtotal should be about ${(price * qty).toFixed(2)}.`, { approx: true }), v("total", "price * qty * (1 + tax_rate / 100)", `total should be about ${(price * qty * (1 + tax / 100)).toFixed(3)}.`, { approx: true })],
        hints: ["Work in order: subtotal first, then tax from the subtotal, then total.", "tax = subtotal * tax_rate / 100", "Each print uses an f-string with :.2f after the money variable."],
      };
    },
  },
  {
    id: "m1-savings-goal", module: 1, difficulty: 3, topics: ["maths", "f-strings", ":,.2f"],
    make(r) {
      const goal = r.int(30, 120) * 100, monthly = r.int(10, 45) * 25, months = r.int(2, 8);
      const g = Math.max(goal, monthly * months + 500);
      const thing = r.pick(["a laptop", "a trip to Japan", "a used car", "a camera", "a new bike", "an emergency fund"]);
      return {
        title: "Savings tracker", noHardcode: true,
        scenario: `You're saving for ${thing}, which costs ${g}. You save ${monthly} a month and have done so for ${months} months.`,
        steps: [`Keep goal = ${g}, monthly = ${monthly}, months = ${months}.`, "Make saved and remaining.", "Print: Saved: $<saved> with a thousands comma and 2 decimals.", "Print: Still need: $<remaining> the same way."],
        starter: `goal = ${g}\nmonthly = ${monthly}\nmonths = ${months}\n\n# Work out saved and remaining, then print 2 lines\n`,
        solution: lines(`goal = ${g}`, `monthly = ${monthly}`, `months = ${months}`, "saved = monthly * months", "remaining = goal - saved", 'print(f"Saved: ${saved:,.2f}")', 'print(f"Still need: ${remaining:,.2f}")'),
        checks: [given({ goal: g, monthly, months }), v("saved", "monthly * months", `saved should be ${monthly * months}.`), v("remaining", "goal - monthly * months", `remaining should be ${g - monthly * months}.`)],
        hints: ["saved is how much a month times how many months.", "remaining is what's left to reach the goal.", "Format with {saved:,.2f}: the comma adds thousands separators."],
      };
    },
  },
  {
    id: "m1-name-card", module: 1, difficulty: 3, topics: ["strip()", "title()", "len()", "indexing", "f-strings"],
    make(r) {
      const f = r.pick(PEOPLE), l = r.pick(["ramirez", "okafor", "nguyen", "schmidt", "tanaka", "haddad", "novak", "silva"]);
      const mf = "  " + f.toLowerCase() + " ", ml = " " + l.toUpperCase() + "   ";
      return {
        title: "Conference name card", noHardcode: true,
        scenario: "The sign-up sheet saved names with messy spaces and capitals. Make a tidy name card.",
        steps: [`Keep raw_first = "${mf}" and raw_last = "${ml}".`, "Make first and last: stripped and title-cased.", "Print: Name: <first> <last>", "Print: Initials: <first letter of each>", "Print: Letters: <how many letters in first and last together>"],
        starter: `raw_first = "${mf}"\nraw_last = "${ml}"\n\n# Clean the names, then print 3 lines\n`,
        solution: lines(`raw_first = "${mf}"`, `raw_last = "${ml}"`, "first = raw_first.strip().title()", "last = raw_last.strip().title()", 'print(f"Name: {first} {last}")', 'print(f"Initials: {first[0]}{last[0]}")', 'print(f"Letters: {len(first) + len(last)}")'),
        checks: [given({ raw_first: mf, raw_last: ml }), v("first", "raw_first.strip().title()", `first should be "${f}".`), v("last", "raw_last.strip().title()", `last should be "${l[0].toUpperCase() + l.slice(1)}".`)],
        hints: ["Clean each name the same way: strip, then title.", "Initials are first[0] and last[0] side by side.", "Letters is len(first) + len(last): spaces aren't letters."],
      };
    },
  },
  {
    id: "m1-road-trip", module: 1, difficulty: 3, topics: ["maths", "f-strings", ":.1f", ":.2f"],
    make(r) {
      const dist = r.int(120, 900), use = r.pick([5.5, 6, 6.5, 7, 7.5, 8, 9]), fuel = r.money(1.2, 2.4, 0.05), c1 = r.pick(CITIES), c2 = r.pick(CITIES.filter((x) => x !== c1));
      return {
        title: `${c1} to ${c2}`, noHardcode: true,
        scenario: `A road trip from ${c1} to ${c2} is ${dist} km. The car uses ${use} litres per 100 km, and fuel costs ${fuel.toFixed(2)} a litre.`,
        steps: [`Keep distance = ${dist}, per_100km = ${py(use)}, fuel_price = ${py(fuel)}.`, "Make litres and cost.", "Print: Fuel needed: <litres> L with 1 decimal place.", "Print: Fuel cost: $<cost> with 2 decimal places."],
        starter: `distance = ${dist}\nper_100km = ${py(use)}\nfuel_price = ${py(fuel)}\n\n# Work out litres and cost, then print 2 lines\n`,
        solution: lines(`distance = ${dist}`, `per_100km = ${py(use)}`, `fuel_price = ${py(fuel)}`, "litres = distance * per_100km / 100", "cost = litres * fuel_price", 'print(f"Fuel needed: {litres:.1f} L")', 'print(f"Fuel cost: ${cost:.2f}")'),
        checks: [given({ distance: dist, per_100km: use, fuel_price: fuel }), v("litres", "distance * per_100km / 100", `litres should be about ${(dist * use / 100).toFixed(3)}.`, { approx: true }), v("cost", "distance * per_100km / 100 * fuel_price", `cost should be about ${(dist * use / 100 * fuel).toFixed(3)}.`, { approx: true })],
        hints: ["per_100km tells you the litres for every 100 km.", "litres = distance * per_100km / 100", "cost = litres * fuel_price, then format each with the right decimals."],
      };
    },
  },
  {
    id: "m1-clock", module: 1, difficulty: 3, topics: ["//", "%", "f-strings"],
    make(r) {
      const t = r.int(3700, 86000), what = r.pick(["movie marathon", "flight", "hackathon", "study session", "long drive"]);
      return {
        title: "Timer display", noHardcode: true,
        scenario: `Your ${what} timer shows ${t} seconds. Show it as hours, minutes and seconds.`,
        steps: [`Keep total = ${t}.`, "Make hours, minutes and seconds (there are 3600 seconds in an hour).", "Print: <hours>h <minutes>m <seconds>s"],
        starter: `total = ${t}\n\n# Work out hours, minutes and seconds, then print\n`,
        solution: lines(`total = ${t}`, "hours = total // 3600", "minutes = total % 3600 // 60", "seconds = total % 60", 'print(f"{hours}h {minutes}m {seconds}s")'),
        checks: [given({ total: t }), v("hours", "total // 3600", `hours should be ${Math.floor(t / 3600)}.`), v("minutes", "total % 3600 // 60", `minutes should be ${Math.floor((t % 3600) / 60)}.`), v("seconds", "total % 60", `seconds should be ${t % 60}.`)],
        hints: ["Hours first: how many whole 3600s fit in total?", "The seconds left after taking out hours are total % 3600. Turn those into minutes with // 60.", "seconds = total % 60"],
      };
    },
  },
  {
    id: "m1-scoreboard", module: 1, difficulty: 3, topics: ["maths", "upper()", "f-strings", ":,"],
    make(r) {
      const p = r.pick(PEOPLE).toLowerCase(), kills = r.int(20, 400), per = r.pick([50, 75, 100, 150]), deaths = r.int(5, 80), bonus = r.int(1, 40) * 250;
      return {
        title: "Arcade scoreboard", noHardcode: true,
        scenario: `Scores are kills × points per kill, plus a bonus, minus 200 for every death. The scoreboard shows names in capitals.`,
        steps: [`Keep player = "${p}", kills = ${kills}, points_per_kill = ${per}, deaths = ${deaths}, bonus = ${bonus}.`, "Make score.", "Print: <PLAYER>: <score> points, with the name in capitals and a thousands comma in the score."],
        starter: `player = "${p}"\nkills = ${kills}\npoints_per_kill = ${per}\ndeaths = ${deaths}\nbonus = ${bonus}\n\n# Work out score, then print the scoreboard line\n`,
        solution: lines(`player = "${p}"`, `kills = ${kills}`, `points_per_kill = ${per}`, `deaths = ${deaths}`, `bonus = ${bonus}`, "score = kills * points_per_kill + bonus - deaths * 200", 'print(f"{player.upper()}: {score:,} points")'),
        checks: [given({ player: p, kills, points_per_kill: per, deaths, bonus }), v("score", "kills * points_per_kill + bonus - deaths * 200", `score should be ${kills * per + bonus - deaths * 200}.`)],
        hints: ["Write the score rule as one maths line using the variables.", "Methods work inside f-string brackets too: {player.upper()}", "{score:,} adds the thousands commas."],
      };
    },
  },
  {
    id: "m1-playlist", module: 1, difficulty: 3, topics: ["title()", "len()", "//", "%", "f-strings"],
    make(r) {
      const song = r.pick(SONGS), artist = r.pick(PEOPLE).toLowerCase(), secs = r.int(140, 420);
      return {
        title: "Now playing", noHardcode: true,
        scenario: "A music player shows the current song nicely: title-case names and the length in minutes:seconds.",
        steps: [`Keep song = "${song}", artist = "${artist}", length = ${secs} (seconds).`, "Print: Now playing: <Song> by <Artist> (both title-cased).", "Print: Length: <minutes>:<seconds>, with seconds always 2 digits (use :02d).", "Print: Title letters: <length of song>"],
        starter: `song = "${song}"\nartist = "${artist}"\nlength = ${secs}\n\n# Print the 3 lines\n`,
        solution: lines(`song = "${song}"`, `artist = "${artist}"`, `length = ${secs}`, "minutes = length // 60", "seconds = length % 60", 'print(f"Now playing: {song.title()} by {artist.title()}")', 'print(f"Length: {minutes}:{seconds:02d}")', 'print(f"Title letters: {len(song)}")'),
        checks: [given({ song, artist, length: secs })],
        hints: ["Use .title() inside the f-string brackets.", "minutes = length // 60 and seconds = length % 60.", "{seconds:02d} pads with a zero, so 5 shows as 05."],
      };
    },
  },
  {
    id: "m1-word-facts", module: 1, difficulty: 3, topics: ["len()", "indexing", "upper()", "replace()", "f-strings"],
    make(r) {
      const w = r.pick(WORDS), vowel = r.pick(["a", "o", "e"]);
      return {
        title: "Word facts", noHardcode: true,
        scenario: `A word game shows facts about the word "${w}".`,
        steps: [`Keep word = "${w}".`, "Print: First: <first letter> Last: <last letter>", "Print: Length: <number of letters>", `Print: Shouted: <word in capitals>`, `Print: No ${vowel}: <word with every "${vowel}" replaced by "*">`],
        starter: `word = "${w}"\n\n# Print the 4 lines\n`,
        solution: lines(`word = "${w}"`, 'print(f"First: {word[0]} Last: {word[-1]}")', 'print(f"Length: {len(word)}")', 'print(f"Shouted: {word.upper()}")', `print(f"No ${vowel}: {word.replace('${vowel}', '*')}")`),
        checks: [given({ word: w }), noTyped([w.toUpperCase()], "Use word.upper() rather than typing the capitals.")],
        hints: ["Each line is one f-string with a method or [index] inside the brackets.", "word[0] and word[-1] give the first and last letters.", `word.replace("${vowel}", "*") swaps every ${vowel}. Inside an f-string with double quotes, use single quotes for those.`],
      };
    },
  },
];
