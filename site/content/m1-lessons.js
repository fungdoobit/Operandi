// Module 1 lessons. Each lesson is split into sections: a short explanation
// and a task that practises exactly that. The expected output of each task
// comes from running its solution, so it can never disagree with what Python
// really prints.

export const MODULE_1 = {
  id: 1,
  title: "Basics",
  blurb: "Printing, variables, maths, text and f-strings.",
  topics: ["print()", "variables", "numbers and maths", "strings", "f-strings"],
};

export const M1_LESSONS = [
  {
    id: "m1l1", module: 1, title: "Your first program", sub: "print() and text",
    sections: [
      {
        title: "Printing text",
        html: `
<p>A program is a list of instructions. Python reads them from the top line to the bottom line, one at a time, and does what each line says.</p>
<h3>print() shows something on the screen</h3>
<pre data-run>print("Hello!")</pre>
<p><code>print</code> is a <b>function</b>: a named action Python already knows. You use it by writing its name, then brackets. Whatever you put inside the brackets gets shown.</p>
<h3>Text goes inside quotes</h3>
<p>A piece of text in Python is called a <b>string</b>. You make one by wrapping the text in quotes. Double quotes and single quotes both work, as long as you start and end with the same kind.</p>
<pre data-run>print("I can use double quotes.")
print('Or single quotes.')</pre>
<p>Each <code>print()</code> starts a new line.</p>`,
        task: {
      text: `<p>Print these two lines, exactly as shown. Spelling, capital letters and punctuation all count.</p>`,
      starter: "# Print two lines below\n",
      solution: 'print("Hello, Operandi!")\nprint("I am learning Python.")',
      noHardcode: false,
      checks: [],
      hints: [
        "You need two print() lines, one for each line of output.",
        "Text goes inside quotes, inside the brackets: print(\"...\").",
        "Line 1 is print(\"Hello, Operandi!\"). Copy that pattern for line 2 and check the full stop.",
      ],
    },
      },
      {
        title: "Numbers and sums",
        html: `<h3>Numbers don't need quotes</h3>
<pre data-run>print(42)
print(3.5)
print(10 + 5)</pre>
<p>Python works out <code>10 + 5</code> first, then prints the answer. Put it in quotes, <code>"10 + 5"</code>, and Python treats it as text and prints it exactly as written.</p>`,
        task: {
      text: `<p>Print three lines:</p><ol><li>The number <code>2026</code>, as a number (no quotes).</li><li>How many hours are in a year: let Python work out <code>365 * 24</code>.</li><li>The text <code>365 * 24</code>, exactly as written.</li></ol>`,
      starter: "# Line 1: the number 2026\n\n# Line 2: let Python calculate 365 * 24\n\n# Line 3: the text 365 * 24\n",
      solution: 'print(2026)\nprint(365 * 24)\nprint("365 * 24")',
      noHardcode: false,
      checks: [
        { name: "2026 is printed as a number", code: `assert not print_has_literal("2026"), "Print 2026 as a number: no quotes around it."`, peek: "Line 1 is print(2026), with no quotes." },
        { name: "Python does the maths", code: `assert "8760" not in SOURCE, "Don't type the answer in. Write 365 * 24 inside print() without quotes and let Python work it out."`, peek: "Line 2 is print(365 * 24): no quotes, so Python calculates it." },
      ],
      hints: [
        "Numbers go inside print() without quotes.",
        "Without quotes Python calculates: print(365 * 24) shows the answer.",
        "With quotes it's just text: print(\"365 * 24\") shows it exactly as written.",
      ],
    },
      },
      {
        title: "Comments",
        html: `<h3>Comments are notes for humans</h3>
<p>Anything after a <code>#</code> is a <b>comment</b>. Python skips it.</p>
<pre data-run># This whole line is skipped
print("This line runs")  # a comment can sit at the end of a line too</pre>
<div class="note"><b>Common mistakes</b><ul>
<li><code>Print("hi")</code>: Python is case-sensitive, so <code>print</code> must be lowercase.</li>
<li><code>print("hi)</code>: the closing quote is missing.</li>
<li><code>print(hi)</code>: without quotes, Python looks for something <i>named</i> hi.</li>
</ul>Don't worry about memorising these. DOT spots them for you.</div>`,
        task: {
      text: `<p>The starter code prints three lines. Change it so that:</p><ol><li>The middle line becomes a comment, so it doesn't run. Don't delete it.</li><li>A new first line is a comment that says what the program does (any words you like).</li></ol>`,
      starter: 'print("Line one")\nprint("Line two")\nprint("Line three")\n',
      solution: '# This program prints two lines\nprint("Line one")\n# print("Line two")\nprint("Line three")',
      noHardcode: false,
      checks: [
        { name: "Line two is commented out, not deleted", code: `assert any(ln.strip().startswith("#") and "Line two" in ln for ln in SOURCE.splitlines()), "Keep the Line two print, but put a # at the start of its line."`, peek: 'The middle line should read # print("Line two").' },
        { name: "A comment on the first line", code: `top = [ln for ln in SOURCE.splitlines() if ln.strip()][0]\nassert top.strip().startswith("#") and "Line" not in top, "Add a new first line that starts with # and says what the program does."`, peek: "The first line should be a comment, like # This program prints two lines." },
      ],
      hints: [
        "A # at the start of a line turns the whole line into a comment.",
        "Put # in front of print(\"Line two\") so Python skips it.",
        "Add a new top line such as # This program prints two lines.",
      ],
    },
      },
    ],
  },
  {
    id: "m1l2", module: 1, title: "Variables", sub: "Giving values a name",
    sections: [
      {
        title: "Making and changing variables",
        html: `
<p>A <b>variable</b> is a name that points to a value. You create one with <code>=</code>.</p>
<pre data-run>hero = "Ada"
print(hero)</pre>
<p>Read <code>hero = "Ada"</code> as "<i>hero</i> now holds Ada". In Python, <code>=</code> means <b>store this</b>, not "is equal to".</p>
<h3>Name versus text</h3>
<pre data-run>hero = "Ada"
print(hero)    # no quotes: the variable, prints Ada
print("hero")  # quotes: just the text, prints hero</pre>
<h3>Variables can change</h3>
<pre data-run>score = 10
print(score)
score = 25
print(score)</pre>`,
        task: {
      text: `<ol><li>Make a variable <code>pet</code> that holds <code>"cat"</code>, and print it.</li><li>Change <code>pet</code> to <code>"dog"</code>, and print it again.</li></ol><p>Use the variable inside both <code>print()</code>s, not the words typed in.</p>`,
      starter: "# Make pet, then print it\n\n# Change pet, then print it again\n",
      solution: 'pet = "cat"\nprint(pet)\npet = "dog"\nprint(pet)',
      noHardcode: true,
      checks: [
        { name: "Prints the variable, not the words", code: `assert not print_has_literal("cat") and not print_has_literal("dog"), "Print the variable pet, without quotes, instead of typing cat or dog."`, peek: "Both prints should be print(pet)." },
        { name: "pet ends up as \"dog\"", code: `assert globals().get("pet") == "dog", "By the end, pet should hold \\"dog\\"."`, peek: 'Set pet = "dog" before the second print.' },
      ],
      hints: [
        "Make the variable with pet = \"cat\", then print(pet).",
        "To change it, store a new value in the same name: pet = \"dog\".",
        "Then print(pet) again: the same line as before, with a different value inside.",
      ],
    },
      },
      {
        title: "Printing several things",
        html: `<h3>Printing several things at once</h3>
<p>Separate values with commas inside <code>print()</code>. Python puts one space between each.</p>
<pre data-run>name = "Sam"
age = 21
print(name, "is", age, "years old")</pre>
<h3>Naming rules</h3>
<ul>
<li>Letters, digits and underscores only. No spaces: <code>favourite_food</code>.</li>
<li>Can't start with a digit: <code>second_place</code>, not <code>2nd_place</code>.</li>
<li>Case-sensitive: <code>Score</code> and <code>score</code> are different.</li>
<li>Python style is <b>snake_case</b>: lowercase words joined by underscores. Pick names that say what the value is.</li>
</ul>`,
        task: {
      text: `<ol><li>Make a variable <code>hero</code> that holds <code>"Ada"</code>.</li><li>Make a variable <code>power</code> that holds <code>"coding"</code>.</li><li>Print the sentence below using <b>the two variables</b> and commas. Don't type Ada or coding inside the print.</li></ol>`,
      starter: "# 1. Make the hero variable\n\n# 2. Make the power variable\n\n# 3. Print the sentence\n",
      solution: 'hero = "Ada"\npower = "coding"\nprint(hero, "has the power of", power)',
      noHardcode: true,
      checks: [
        { name: "Uses the variables in print()", code: `assert not print_has_literal("Ada") and not print_has_literal("coding"), "Use the variables hero and power inside print(), not the words typed again."`, peek: "Inside print(), write hero and power without quotes. The only typed text is \"has the power of\"." },
        { name: "hero holds \"Ada\"", code: `assert globals().get("hero") == "Ada", "Make a variable called hero that holds \\"Ada\\"."`, peek: 'hero should be "Ada" (capital A).' },
        { name: "power holds \"coding\"", code: `assert globals().get("power") == "coding", "Make a variable called power that holds \\"coding\\"."`, peek: 'power should be "coding" (all lowercase).' },
      ],
      hints: [
        "Create each variable with name = \"value\" on its own line.",
        "print() can take several things separated by commas, and it adds the spaces for you.",
        "The middle part is the text \"has the power of\". Put hero before it and power after it, all inside one print().",
      ],
    },
      },
    ],
  },
  {
    id: "m1l3", module: 1, title: "Numbers and maths", sub: "Calculating with Python",
    sections: [
      {
        title: "The maths operators",
        html: `
<p>Python has two main kinds of number. An <b>int</b> is a whole number like <code>7</code>. A <b>float</b> has a decimal point, like <code>2.5</code>.</p>
<h3>The maths operators</h3>
<pre data-run>print(7 + 2)   # add: 9
print(7 - 2)   # subtract: 5
print(7 * 2)   # multiply: 14
print(7 / 2)   # divide: 3.5
print(7 // 2)  # whole-number divide: 3
print(7 % 2)   # remainder: 1
print(7 ** 2)  # power: 49</pre>
<p><code>/</code> always gives a float, even when it divides evenly: <code>10 / 2</code> is <code>5.0</code>.</p>
<h3>Order of operations</h3>
<pre data-run>print(2 + 3 * 4)    # 14: 3 * 4 happens first
print((2 + 3) * 4)  # 20: brackets go first</pre>`,
        task: {
      text: `<p>A party has <code>pizzas = 2</code> pizzas with 8 slices each, shared by <code>friends = 3</code> friends.</p><ol><li>Make <code>slices</code>: the total number of slices, <b>calculated</b> from <code>pizzas</code>.</li><li>Print how many whole slices each friend gets.</li><li>Print how many slices are left over.</li></ol>`,
      starter: "pizzas = 2\nfriends = 3\n\n# Calculate slices\n\n# Print the slices each, then the slices left over\n",
      solution: "pizzas = 2\nfriends = 3\nslices = pizzas * 8\nprint(slices // friends)\nprint(slices % friends)",
      noHardcode: true,
      checks: [
        { name: "pizzas and friends unchanged", code: `assert globals().get("pizzas") == 2 and globals().get("friends") == 3, "Keep pizzas = 2 and friends = 3."`, peek: "pizzas must stay 2 and friends must stay 3." },
        { name: "slices is right", code: `assert "slices" in globals(), "Make a variable called slices."\nassert slices == 16, "slices isn't right yet: there are 8 slices per pizza."`, peek: "slices should be 16 (2 × 8)." },
        { name: "Uses // and %", code: `assert "//" in SOURCE and "%" in SOURCE, "Use // for the whole slices each and % for the leftovers."`, peek: "print(slices // friends), then print(slices % friends)." },
      ],
      hints: [
        "slices = pizzas * 8",
        "// divides and drops the remainder, which gives the whole slices each.",
        "% gives only the remainder: the slices left over. print(slices % friends).",
      ],
    },
      },
      {
        title: "Maths with variables",
        html: `<h3>Maths with variables</h3>
<pre data-run>price = 8
quantity = 3
total = price * quantity
print(total)</pre>
<h3>Numbers versus text that looks like a number</h3>
<pre data-run>print(5 + 5)       # 10: maths
print("5" + "5")   # 55: two pieces of text joined
print(type(5), type("5"), type(2.5))</pre>`,
        task: {
      text: `<p>A cinema charges 12 for an adult ticket and 8 for a child ticket.</p><ol><li>Make <code>adults = 2</code> and <code>children = 3</code>.</li><li>Make <code>total</code> that <b>calculates</b> the cost from those variables.</li><li>Print <code>total</code>.</li><li>The 5 people split the cost equally. Make <code>per_person</code> by dividing <code>total</code> by 5, and print it.</li></ol>`,
      starter: "adults = 2\nchildren = 3\n\n# Calculate total, then print it\n\n# Calculate per_person, then print it\n",
      solution: "adults = 2\nchildren = 3\ntotal = adults * 12 + children * 8\nprint(total)\nper_person = total / 5\nprint(per_person)",
      noHardcode: true,
      checks: [
        { name: "adults and children unchanged", code: `assert globals().get("adults") == 2 and globals().get("children") == 3, "Keep adults = 2 and children = 3."`, peek: "adults must stay 2 and children must stay 3." },
        { name: "total is right", code: `assert "total" in globals(), "Make a variable called total."\nassert total == 48, "total isn't right yet. Check the prices: adult 12, child 8."`, peek: "total should be 48 (2 × 12 + 3 × 8)." },
        { name: "per_person is right", code: `assert "per_person" in globals(), "Make a variable called per_person."\nassert abs(per_person - 9.6) < 1e-9, "per_person isn't right yet."`, peek: "per_person should be 9.6 (48 / 5)." },
      ],
      hints: [
        "Multiply each group by its price, then add the two results.",
        "total = adults * 12 + children * 8. Python does the * before the +.",
        "per_person = total / 5, then print(per_person) on the next line.",
      ],
    },
      },
      {
        title: "Updating a variable",
        html: `<p>To change a number in a variable, store the new value back. <code>+=</code> is a shortcut.</p>
<pre data-run>coins = 10
coins = coins + 5   # 15
coins += 5          # 20
coins -= 3          # 17
print(coins)</pre>`,
        task: {
      text: `<p>You start with <code>coins = 10</code>.</p><ol><li>You win 15 coins: add them with <code>+=</code>.</li><li>You spend 7 coins: take them away with <code>-=</code>.</li><li>Print <code>coins</code>.</li></ol>`,
      starter: "coins = 10\n\n# Add 15, then take away 7\n\n# Print coins\n",
      solution: "coins = 10\ncoins += 15\ncoins -= 7\nprint(coins)",
      noHardcode: true,
      checks: [
        { name: "Uses += and -=", code: `assert "+=" in SOURCE and "-=" in SOURCE, "Change coins with += and -=."`, peek: "coins += 15 on one line, coins -= 7 on the next." },
        { name: "coins is right", code: `assert globals().get("coins") == 18, "coins isn't right yet: 10, plus 15, minus 7."`, peek: "coins should end at 18." },
      ],
      hints: [
        "+= adds to what's already in the variable: coins += 15.",
        "-= takes away: coins -= 7.",
        "Then print(coins). It should show 18.",
      ],
    },
      },
    ],
  },
  {
    id: "m1l4", module: 1, title: "Working with text", sub: "Joining, measuring, cleaning",
    sections: [
      {
        title: "Joining and measuring",
        html: `
<h3>Joining strings</h3>
<p><code>+</code> sticks two strings together. It adds no space by itself.</p>
<pre data-run>first = "Grace"
last = "Hopper"
print(first + " " + last)
print("ha" * 3)   # * repeats a string: hahaha</pre>
<h3>Text and numbers don't mix with +</h3>
<pre data-run>age = 30
print("Age: " + str(age))   # str() turns a number into text
print(int("42") + 1)        # int() turns text into a whole number: 43</pre>
<h3>len() counts characters</h3>
<pre data-run>print(len("hello"))     # 5
print(len("hi there"))  # 8: the space counts too</pre>`,
        task: {
      text: `<p>The starter code sets <code>first</code> and <code>last</code>.</p><ol><li>Make <code>full</code> by joining them with <code>+</code>, with a space in between, and print it.</li><li>Print <code>Letters: </code> followed by the length of <code>full</code>, joined with <code>+</code> and <code>str()</code>.</li></ol>`,
      starter: 'first = "Grace"\nlast = "Hopper"\n\n# Make full and print it\n\n# Print the Letters line\n',
      solution: 'first = "Grace"\nlast = "Hopper"\nfull = first + " " + last\nprint(full)\nprint("Letters: " + str(len(full)))',
      noHardcode: true,
      checks: [
        { name: "first and last unchanged", code: `assert globals().get("first") == "Grace" and globals().get("last") == "Hopper", "Keep first and last as they are in the starter code."`, peek: "first must stay \"Grace\" and last must stay \"Hopper\"." },
        { name: "full is right", code: `assert "full" in globals(), "Make a variable called full."\nassert full == "Grace Hopper", "full should be first, then a space, then last."`, peek: 'full should be "Grace Hopper".' },
        { name: "Uses len() and str()", code: `assert "len(" in SOURCE and "str(" in SOURCE, "Use len() to count, and str() to turn the number into text before joining."`, peek: 'print("Letters: " + str(len(full)))' },
      ],
      hints: [
        "Join with +, and add the space as its own piece: first + \" \" + last.",
        "len(full) counts the characters, and the space counts too.",
        "len() gives a number, so wrap it in str() before joining: \"Letters: \" + str(len(full)).",
      ],
    },
      },
      {
        title: "Cleaning and picking characters",
        html: `<h3>String methods</h3>
<p>A <b>method</b> is a function that belongs to a value. You call it with a dot: <code>value.method()</code>.</p>
<pre data-run>word = "  Hello World  "
print(word.upper())
print(word.lower())
print(word.strip())     # spaces at both ends removed
print("ada lovelace".title())
print("I like tea".replace("tea", "coffee"))</pre>
<p>Methods give you a <b>new</b> string. Store it to keep it: <code>word = word.strip()</code>. You can chain them: <code>"  hi  ".strip().upper()</code> gives <code>"HI"</code>.</p>
<h3>Picking out one character</h3>
<p>Positions (called <b>indexes</b>) start at <b>0</b>. Negative numbers count from the end.</p>
<pre data-run>word = "python"
print(word[0])    # p
print(word[1])    # y
print(word[-1])   # n</pre>`,
        task: {
      text: `<p>Someone typed a title badly. The starter code stores it in <code>raw</code>.</p><ol><li>Make <code>clean</code>: <code>raw</code> with the spaces at both ends removed and each word starting with a capital letter.</li><li>Print <code>clean</code>.</li><li>Print how many characters <code>clean</code> has.</li><li>Print the first character of <code>clean</code>.</li></ol>`,
      starter: 'raw = "  pYTHON is FUN  "\n\n# Make clean from raw\n\n# Print clean, its length, and its first character\n',
      solution: 'raw = "  pYTHON is FUN  "\nclean = raw.strip().title()\nprint(clean)\nprint(len(clean))\nprint(clean[0])',
      noHardcode: true,
      checks: [
        { name: "raw unchanged", code: `assert globals().get("raw") == "  pYTHON is FUN  ", "Keep raw exactly as it is in the starter code."`, peek: "raw must stay exactly as the starter code has it." },
        { name: "clean is right", code: `assert "clean" in globals(), "Make a variable called clean."\nassert clean == "Python Is Fun", "clean isn't right yet. Which two methods remove the spaces and fix the capitals?"`, peek: 'clean should be "Python Is Fun".' },
      ],
      hints: [
        "You need two methods: one removes outside spaces, one capitalises each word.",
        "Chain them: raw.strip().title()",
        "Then print(clean), print(len(clean)) and print(clean[0]).",
      ],
    },
      },
    ],
  },
  {
    id: "m1l5", module: 1, title: "f-strings", sub: "Putting values inside text",
    sections: [
      {
        title: "Values inside text",
        html: `
<p>Joining text with <code>+</code> and <code>str()</code> gets messy fast:</p>
<pre data-run>name = "Lin"
age = 25
print("Hi " + name + ", you are " + str(age) + ".")</pre>
<p>An <b>f-string</b> is cleaner. Put an <code>f</code> right before the opening quote, then put values inside <code>{curly brackets}</code>.</p>
<pre data-run>name = "Lin"
age = 25
print(f"Hi {name}, you are {age}.")</pre>
<h3>Calculations inside the brackets</h3>
<pre data-run>price = 3
qty = 4
print(f"{qty} items cost {price * qty}")</pre>
<div class="note"><b>Common mistake</b>Forgetting the <code>f</code>: <code>"Hi {name}"</code> prints the curly brackets literally. DOT will point it out.</div>`,
        task: {
      text: `<p>The starter code sets <code>name</code> and <code>age</code>. Print the sentence below with <b>one f-string</b>, working out the age in ten years inside the curly brackets.</p>`,
      starter: 'name = "Lin"\nage = 25\n\n# Print the sentence with an f-string\n',
      solution: 'name = "Lin"\nage = 25\nprint(f"{name} will be {age + 10} in ten years.")',
      noHardcode: true,
      checks: [
        { name: "Starter values unchanged", code: `assert (name, age) == ("Lin", 25), "Keep name and age as they are in the starter code."`, peek: "name and age must keep their starter values." },
        { name: "Uses an f-string", code: `assert 'f"' in SOURCE or "f'" in SOURCE, "Put an f right before the opening quote."`, peek: 'The line starts with print(f"' },
        { name: "Python fills in the values", code: `assert "35" not in SOURCE and not print_has_literal("Lin"), "Put {name} and {age + 10} inside the brackets instead of typing Lin or 35."`, peek: "Inside the f-string use {name} and {age + 10}." },
      ],
      hints: [
        "Start with print(f\" and put variables inside {curly brackets}.",
        "You can calculate inside the brackets: {age + 10}.",
        "The rest of the sentence is ordinary text around the brackets: \" will be \" and \" in ten years.\"",
      ],
    },
      },
      {
        title: "Formatting numbers",
        html: `<h3>Formatting numbers</h3>
<pre data-run>cost = 7.5
print(f"{cost:.2f}")     # 7.50: always 2 decimal places
big = 1234567
print(f"{big:,}")        # 1,234,567
money = 1234.5
print(f"{money:,.2f}")   # 1,234.50</pre>`,
        task: {
      text: `<p>Write a mini receipt. The starter code sets <code>item</code>, <code>price</code>, <code>qty</code> and <code>budget</code>.</p><ol><li>Print the first line below with one f-string. Work out the total from <code>price</code> and <code>qty</code>, shown with 2 decimal places.</li><li>Work out what's left of the budget after paying, and print the second line with a thousands comma and 2 decimal places.</li></ol>`,
      starter: 'item = "Coffee"\nprice = 4.5\nqty = 3\nbudget = 1250\n\n# Print the receipt line\n\n# Print the budget line\n',
      solution: 'item = "Coffee"\nprice = 4.5\nqty = 3\nbudget = 1250\ntotal = price * qty\nprint(f"{qty} x {item} = ${total:.2f}")\nprint(f"Budget left: ${budget - total:,.2f}")',
      noHardcode: true,
      checks: [
        { name: "Starter values unchanged", code: `assert (item, price, qty, budget) == ("Coffee", 4.5, 3, 1250), "Keep item, price, qty and budget as they are in the starter code."`, peek: "item, price, qty and budget must keep their starter values." },
      ],
      hints: [
        "Start the line with print(f\" and use {qty}, {item} and a total inside.",
        "Work out total = price * qty first. Show it with {total:.2f}. The $ is just text before the brackets.",
        "Budget left is budget - total. Format it with {left:,.2f} to get both the comma and 2 decimals.",
      ],
    },
      },
    ],
  },
];
