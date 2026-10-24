// Module 2 lessons: Decisions. Same shape as Module 1: each lesson is split into
// sections, each with a short explanation and a task that practises exactly that.
// The expected output comes from running the solution in Python.
//
// Most checks use rerun(name=value): it runs the learner's program again with a
// top-level variable swapped for another value. That tests the LOGIC (does it
// work for other numbers?) and not just the one example, so a typed-in answer
// can't pass. (rerun lives in py/harness.py.)

export const MODULE_2 = {
  id: 2,
  title: "Decisions",
  blurb: "True and False, comparisons, if / elif / else, and / or / not.",
  topics: ["booleans", "comparisons", "if", "else", "elif", "and / or / not"],
};

export const M2_LESSONS = [
  {
    id: "m2l1", module: 2, title: "True or False", sub: "Comparing values",
    sections: [
      {
        title: "Booleans and comparisons",
        html: `
<p>So far every line has run, one after another. Programs get useful when they can <b>decide</b> things. Every decision starts with a question that has a yes-or-no answer.</p>
<h3>True and False</h3>
<p>Python has two special values, <code>True</code> and <code>False</code>. They are called <b>booleans</b>. They start with a capital letter and have no quotes.</p>
<pre data-run>print(True)
print(False)</pre>
<h3>Asking a question</h3>
<p>A <b>comparison</b> asks a question about two values and gives back a boolean:</p>
<table class="ops"><tr><td><code>==</code></td><td>equal to</td></tr><tr><td><code>!=</code></td><td>not equal to</td></tr><tr><td><code>&gt;</code></td><td>greater than</td></tr><tr><td><code>&lt;</code></td><td>less than</td></tr><tr><td><code>&gt;=</code></td><td>greater than or equal to</td></tr><tr><td><code>&lt;=</code></td><td>less than or equal to</td></tr></table>
<pre data-run>age = 16
print(age &gt; 18)     # False
print(age &gt;= 16)    # True
print(age == 16)    # True
print(age != 16)    # False</pre>
<div class="note"><b>Two equals signs</b><br>One <code>=</code> <i>stores</i> a value: <code>age = 16</code>. Two <code>==</code> <i>asks</i> whether two things are equal: <code>age == 16</code>. Mixing them up is the most common mistake in this module.</div>`,
        task: {
          text: `<p>The starter code sets <code>speed</code> and <code>limit</code>. Print three lines, each one the answer to a question:</p><ol><li>Is the speed above the limit?</li><li>Is the speed exactly equal to the limit?</li><li>Is the speed at most the limit (less than or equal)?</li></ol><p>Let Python work out each answer with a comparison. Don't type <code>True</code> or <code>False</code> yourself.</p>`,
          starter: "speed = 72\nlimit = 70\n\n# Print the three answers\n",
          solution: "speed = 72\nlimit = 70\nprint(speed > limit)\nprint(speed == limit)\nprint(speed <= limit)",
          noHardcode: true,
          checks: [
            { name: "Starter values unchanged", code: `assert (speed, limit) == (72, 70), "Keep speed and limit as they are in the starter code."`, peek: "speed = 72 and limit = 70 must stay." },
            { name: "Python answers, not you", code: `s = SOURCE.replace(" ", "")\nassert "print(True" not in s and "print(False" not in s, "Don't type True or False. Print a comparison like speed > limit and let Python answer."`, peek: "Use print(speed > limit), not print(True)." },
            { name: "Works for other speeds", code: `assert rerun(speed=60) == ["False", "False", "True"], "Try speed = 60: the answers should be False, False, True. Compare the variables instead of typing the answers."`, peek: "The three lines are speed > limit, speed == limit and speed <= limit." },
          ],
          hints: [
            "Each line is a print() with a comparison inside, like print(speed > limit).",
            "Line 2 asks about equality, so it needs two equals signs: speed == limit.",
            "Line 3 is print(speed <= limit): less than or equal.",
          ],
        },
      },
      {
        title: "Comparing text and saving the answer",
        html: `<h3>Text can be compared too</h3>
<pre data-run>colour = "blue"
print(colour == "blue")   # True
print(colour == "Blue")   # False: capital letters count
print(colour != "red")    # True</pre>
<p>Capital letters matter: <code>"Blue"</code> and <code>"blue"</code> are different text. A method like <code>.lower()</code> (from Module 1) makes the comparison fair.</p>
<pre data-run>typed = "BLUE"
print(typed.lower() == "blue")   # True</pre>
<h3>A comparison is a value</h3>
<p>A comparison gives back a boolean, and a boolean can be stored in a variable like anything else.</p>
<pre data-run>age = 20
is_adult = age &gt;= 18
print(is_adult)        # True
print(f"Adult: {is_adult}")</pre>`,
        task: {
          text: `<p>The starter code sets <code>entered</code> (what a user typed) and <code>secret</code> (the password, already in lowercase).</p><ol><li>Make a variable <code>exact</code> that holds whether they are exactly equal.</li><li>Make a variable <code>loose</code> that holds whether they are equal once <code>entered</code> is made lowercase.</li><li>Print both on one line: <code>print(exact, loose)</code>.</li></ol>`,
          starter: 'entered = "Sesame"\nsecret = "sesame"\n\n# Make exact and loose, then print them\n',
          solution: 'entered = "Sesame"\nsecret = "sesame"\nexact = entered == secret\nloose = entered.lower() == secret\nprint(exact, loose)',
          noHardcode: true,
          checks: [
            { name: "Starter values unchanged", code: `assert (entered, secret) == ("Sesame", "sesame"), "Keep entered and secret as they are in the starter code."`, peek: 'entered = "Sesame" and secret = "sesame" must stay.' },
            { name: "exact is right", code: `assert "exact" in globals(), "Make a variable called exact."\nassert exact == (entered == secret), "exact should hold the answer to entered == secret."`, peek: "exact = entered == secret" },
            { name: "loose is right", code: `assert "loose" in globals(), "Make a variable called loose."\nassert loose == (entered.lower() == secret), "loose should compare entered.lower() with secret."`, peek: "loose = entered.lower() == secret" },
            { name: "Works for other passwords", code: `assert rerun(entered="sesame") == ["True True"], "Try entered = 'sesame': both answers should be True. Print the variables instead of typing the answers."`, peek: "print(exact, loose)" },
          ],
          hints: [
            "Store a comparison like any value: exact = entered == secret.",
            "For loose, make entered lowercase first: entered.lower() == secret.",
            "Finish with print(exact, loose): both variables, separated by a comma.",
          ],
        },
      },
    ],
  },
  {
    id: "m2l2", module: 2, title: "if", sub: "Doing something only when…",
    sections: [
      {
        title: "The if statement",
        html: `
<p>An <code>if</code> statement runs some code <b>only when a condition is True</b>.</p>
<pre data-run>temperature = 35
if temperature &gt; 30:
    print("It's hot!")
print("Done")</pre>
<p>Read it as: <i>if the temperature is above 30, print "It's hot!"</i>. Three things make it work:</p>
<ol>
<li>The first line is <code>if</code>, then the condition (any comparison), then a <b>colon</b> <code>:</code></li>
<li>The lines that belong to the <code>if</code> are <b>indented</b> by 4 spaces. This block only runs when the condition is True.</li>
<li>A line that is <i>not</i> indented, like <code>print("Done")</code>, is outside the block. It runs every time.</li>
</ol>
<p>Change <code>temperature</code> to <code>20</code> and run it again. The hot message disappears, but Done stays.</p>`,
        task: {
          text: `<p>The starter code sets <code>score</code>.</p><ol><li>If the score is 80 or more, print <code>Great score!</code></li><li>Then, whatever the score is, print <code>Game over</code></li></ol>`,
          starter: "score = 82\n\n# If the score is 80 or more, print Great score!\n\n# Always print Game over\n",
          solution: 'score = 82\nif score >= 80:\n    print("Great score!")\nprint("Game over")',
          noHardcode: true,
          checks: [
            { name: "Starter value unchanged", code: `assert score == 82, "Keep score = 82 as in the starter code."`, peek: "score = 82 must stay." },
            { name: "Skips the message for a low score", code: `assert rerun(score=40) == ["Game over"], "With score = 40 only Game over should print. Put the Great score! line inside an if."`, peek: "if score >= 80: then the print on an indented line." },
            { name: "80 counts", code: `assert rerun(score=80) == ["Great score!", "Game over"], "With score = 80 both lines should print: 'or more' includes 80, so use >=."`, peek: "Use >= (greater than or equal), not >." },
            { name: "Game over always prints", code: `assert rerun(score=95) == ["Great score!", "Game over"], "Game over should print for every score. Make sure it isn't indented under the if."`, peek: "Game over is not indented." },
          ],
          hints: [
            "Start with if score >= 80: and don't forget the colon.",
            "Indent the Great score! print by 4 spaces so it belongs to the if.",
            "The Game over print starts at the left edge, with no indent, so it always runs.",
          ],
        },
      },
      {
        title: "Several lines in one block",
        html: `<h3>A block can hold many lines</h3>
<p>Every indented line under the <code>if</code> belongs to its block, and they all run (or are all skipped) together. The block ends at the first line that is not indented.</p>
<pre data-run>coins = 3
if coins &lt; 5:
    print("Low on coins")
    print("Visit the shop")
print("Back to the game")</pre>
<p>Use the same number of spaces for every line in the block (4 is the usual). The editor's Tab key adds them for you.</p>
<div class="note"><b>Common mistakes</b><ul>
<li>Forgetting the colon: <code>if coins &lt; 5</code></li>
<li>Forgetting to indent the line under the <code>if</code>: Python says it "expected an indented block".</li>
<li>Using one <code>=</code>: <code>if coins = 5:</code> asks nothing, it tries to store. Use <code>==</code>.</li>
</ul>Your teammate spots all of these for you.</div>`,
          task: {
            text: `<p>The starter code sets <code>battery</code>.</p><ol><li>If the battery is below 20, print two lines: <code>Battery low</code> then <code>Please charge</code></li><li>Then, for every battery level, print <code>Status checked</code></li></ol>`,
            starter: "battery = 15\n\n# If the battery is below 20, print two lines\n\n# Always print Status checked\n",
            solution: 'battery = 15\nif battery < 20:\n    print("Battery low")\n    print("Please charge")\nprint("Status checked")',
            noHardcode: true,
            checks: [
              { name: "Starter value unchanged", code: `assert battery == 15, "Keep battery = 15 as in the starter code."`, peek: "battery = 15 must stay." },
              { name: "Nothing extra for a full battery", code: `assert rerun(battery=80) == ["Status checked"], "With battery = 80 only Status checked should print."`, peek: "Both warning lines belong inside the if." },
              { name: "Both lines are in the block", code: `assert rerun(battery=19) == ["Battery low", "Please charge", "Status checked"], "With battery = 19 you should see Battery low, Please charge, then Status checked."`, peek: "Indent both warning prints under the if." },
              { name: "20 is not low", code: `assert rerun(battery=20) == ["Status checked"], "Below 20 means 20 itself is not low. Use < not <=."`, peek: "if battery < 20:" },
            ],
            hints: [
              "Start with if battery < 20: (with the colon).",
              "Put both warning prints under it, each indented by 4 spaces.",
              "Status checked goes last, with no indent, so it runs every time.",
            ],
          },
      },
    ],
  },
  {
    id: "m2l3", module: 2, title: "else", sub: "Two paths",
    sections: [
      {
        title: "if and else",
        html: `
<p>Often you want one thing when a condition is true <i>and a different thing when it isn't</i>. That's what <code>else</code> is for.</p>
<pre data-run>age = 15
if age &gt;= 18:
    print("You can vote")
else:
    print("Too young to vote")</pre>
<p>Exactly one of the two blocks runs, never both and never neither.</p>
<ul>
<li><code>else</code> has <b>no condition</b>: it means "in every other case".</li>
<li>It lines up with its <code>if</code> (same indent) and ends in a colon too.</li>
<li>Its own lines are indented underneath, like before.</li>
</ul>`,
        task: {
          text: `<p>The starter code sets <code>age</code>. A cinema sells tickets:</p><ul><li>Under 12: print <code>Child ticket: $5</code></li><li>Everyone else: print <code>Adult ticket: $12</code></li></ul>`,
          starter: "age = 9\n\n# Print the right ticket\n",
          solution: 'age = 9\nif age < 12:\n    print("Child ticket: $5")\nelse:\n    print("Adult ticket: $12")',
          noHardcode: false,
          checks: [
            { name: "Starter value unchanged", code: `assert age == 9, "Keep age = 9 as in the starter code."`, peek: "age = 9 must stay." },
            { name: "An adult gets the adult ticket", code: `assert rerun(age=30) == ["Adult ticket: $12"], "With age = 30 you should only see Adult ticket: $12."`, peek: "The adult print goes under else:" },
            { name: "12 is not a child", code: `assert rerun(age=12) == ["Adult ticket: $12"], "Under 12 means 12 itself is an adult ticket. Use < not <=."`, peek: "if age < 12:" },
            { name: "11 is still a child", code: `assert rerun(age=11) == ["Child ticket: $5"], "With age = 11 you should only see Child ticket: $5."`, peek: "if age < 12:" },
          ],
          hints: [
            "Start with if age < 12: and print the child ticket indented under it.",
            "Then a line with just else: at the same indent as the if.",
            "Indent the adult print under the else, so it only runs for everyone else.",
          ],
        },
      },
      {
        title: "Calculating inside the branches",
        html: `<h3>Branches can change variables</h3>
<p>A block can do anything, including calculating a new value. A common pattern: decide a value inside the <code>if</code> / <code>else</code>, then use it afterwards.</p>
<pre data-run>distance = 12
if distance &gt; 10:
    fee = 8
else:
    fee = 5
print(f"Delivery fee: \${fee}")</pre>
<p>Whichever branch runs, <code>fee</code> gets a value, so the last line always works. The last line isn't indented because it runs in both cases.</p>`,
        task: {
          text: `<p>A shop gives 10% off orders of 100 or more. The starter code sets <code>total</code>.</p><ol><li>Make a variable <code>final</code>: if <code>total</code> is 100 or more it's <code>total * 0.9</code>, otherwise it's just <code>total</code>.</li><li>Print <code>Total to pay: $</code> followed by <code>final</code> with 2 decimal places, using an f-string.</li></ol>`,
          starter: "total = 120\n\n# Work out final\n\n# Print the total to pay\n",
          solution: 'total = 120\nif total >= 100:\n    final = total * 0.9\nelse:\n    final = total\nprint(f"Total to pay: ${final:.2f}")',
          noHardcode: true,
          checks: [
            { name: "Starter value unchanged", code: `assert total == 120, "Keep total = 120 as in the starter code."`, peek: "total = 120 must stay." },
            { name: "A small order has no discount", code: `assert rerun(total=50) == ["Total to pay: $50.00"], "With total = 50 there's no discount: Total to pay: $50.00"`, peek: "else: final = total" },
            { name: "A big order is 10% off", code: `assert rerun(total=200) == ["Total to pay: $180.00"], "With total = 200 the discount applies: Total to pay: $180.00"`, peek: "final = total * 0.9 in the if block." },
            { name: "Exactly 100 gets the discount", code: `assert rerun(total=100) == ["Total to pay: $90.00"], "100 or more includes 100: use >="`, peek: "if total >= 100:" },
          ],
          hints: [
            "Use if total >= 100: to set final = total * 0.9, and else: for final = total.",
            "Both branches make the same variable, final, so you can print it after the if / else.",
            'The print is not indented: print(f"Total to pay: ${final:.2f}")',
          ],
        },
      },
    ],
  },
  {
    id: "m2l4", module: 2, title: "elif", sub: "Many paths",
    sections: [
      {
        title: "Choosing between many options",
        html: `
<p>What if there are more than two outcomes? Add <code>elif</code> (short for "else if") between the <code>if</code> and the <code>else</code>.</p>
<pre data-run>mark = 76
if mark &gt;= 90:
    print("Distinction")
elif mark &gt;= 70:
    print("Merit")
elif mark &gt;= 50:
    print("Pass")
else:
    print("Try again")</pre>
<p>Python checks from the top. The <b>first</b> condition that is True runs, and all the rest are skipped. <code>else</code> at the end catches everything that's left. You can have as many <code>elif</code>s as you like.</p>`,
        task: {
          text: `<p>The starter code sets <code>score</code>. Make a variable <code>grade</code> using this table, then print <code>Grade: </code> followed by the grade:</p><ul><li>90 or more: <code>"A"</code></li><li>80 or more: <code>"B"</code></li><li>70 or more: <code>"C"</code></li><li>anything lower: <code>"F"</code></li></ul>`,
          starter: "score = 76\n\n# Work out grade\n\n# Print it\n",
          solution: 'score = 76\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\nprint(f"Grade: {grade}")',
          noHardcode: true,
          checks: [
            { name: "Starter value unchanged", code: `assert score == 76, "Keep score = 76 as in the starter code."`, peek: "score = 76 must stay." },
            { name: "Top grade", code: `assert rerun(score=95) == ["Grade: A"], "95 should print Grade: A"`, peek: "if score >= 90:" },
            { name: "Edges of each grade", code: `assert rerun(score=80) == ["Grade: B"] and rerun(score=70) == ["Grade: C"], "80 is a B and 70 is a C: the limits count, so use >="`, peek: "elif score >= 80 and elif score >= 70" },
            { name: "Fail", code: `assert rerun(score=69) == ["Grade: F"] and rerun(score=0) == ["Grade: F"], "Below 70 should print Grade: F"`, peek: "else: grade = \"F\"" },
          ],
          hints: [
            "Start with if score >= 90: grade = \"A\", then use elif for the other grades.",
            "Go from the highest limit down: elif score >= 80, then elif score >= 70.",
            "Finish with else: for \"F\", then print(f\"Grade: {grade}\") with no indent.",
          ],
        },
      },
      {
        title: "Order matters",
        html: `<h3>The first match wins</h3>
<p>Because Python stops at the first True condition, the <b>order</b> of your <code>elif</code>s matters. Look at this broken program:</p>
<pre data-run>mark = 95
if mark &gt;= 50:
    print("Pass")
elif mark &gt;= 90:
    print("Distinction")</pre>
<p>It prints <code>Pass</code> even for 95, because <code>95 &gt;= 50</code> is True and Python never looks at the next line. The fix is to put the strictest condition first.</p>
<p>When your conditions are limits like "over 10", "over 5", go from the <b>biggest</b> limit to the smallest.</p>`,
        task: {
          text: `<p>A courier charges by weight: over 10 kg is <code>$25</code>, over 5 kg is <code>$15</code>, over 1 kg is <code>$8</code>, and anything lighter is <code>$3</code>. It prints <code>Fee: </code> and the amount.</p><p>The starter code has the right fees but the conditions are in the wrong order, so heavy parcels get the cheap fee. Fix it. <b>Don't change the fees or the numbers</b>, only the order.</p>`,
          starter: 'weight = 12\n\nif weight > 1:\n    print("Fee: $8")\nelif weight > 5:\n    print("Fee: $15")\nelif weight > 10:\n    print("Fee: $25")\nelse:\n    print("Fee: $3")\n',
          solution: 'weight = 12\n\nif weight > 10:\n    print("Fee: $25")\nelif weight > 5:\n    print("Fee: $15")\nelif weight > 1:\n    print("Fee: $8")\nelse:\n    print("Fee: $3")',
          noHardcode: false,
          checks: [
            { name: "Starter value unchanged", code: `assert weight == 12, "Keep weight = 12 as in the starter code."`, peek: "weight = 12 must stay." },
            { name: "Heavy parcel", code: `assert rerun(weight=12) == ["Fee: $25"], "12 kg is over 10, so Fee: $25"`, peek: "Put weight > 10 first." },
            { name: "Medium parcels", code: `assert rerun(weight=7) == ["Fee: $15"] and rerun(weight=3) == ["Fee: $8"], "7 kg is Fee: $15 and 3 kg is Fee: $8"`, peek: "The order is > 10, then > 5, then > 1." },
            { name: "Light parcel", code: `assert rerun(weight=1) == ["Fee: $3"] and rerun(weight=0.5) == ["Fee: $3"], "1 kg or less is Fee: $3"`, peek: "else: is last." },
          ],
          hints: [
            "Python stops at the first True condition. Which one should be checked first?",
            "The biggest limit goes first: weight > 10, then weight > 5, then weight > 1.",
            "Swap the lines so the order is: $25, $15, $8, then else with $3.",
          ],
        },
      },
    ],
  },
  {
    id: "m2l5", module: 2, title: "and, or, not", sub: "Combining conditions",
    sections: [
      {
        title: "and",
        html: `
<p>Sometimes one question isn't enough. <code>and</code> joins two conditions and is True only when <b>both</b> are True.</p>
<pre data-run>age = 11
height = 125
if age &gt;= 10 and height &gt;= 120:
    print("You can ride")
else:
    print("Sorry, not this time")</pre>
<table class="ops"><tr><td><code>True and True</code></td><td>True</td></tr><tr><td><code>True and False</code></td><td>False</td></tr><tr><td><code>False and False</code></td><td>False</td></tr></table>
<p>Each side of <code>and</code> is a full comparison. <code>age and height &gt;= 10</code> doesn't work the way it reads, so repeat the variable: <code>age &gt;= 10 and height &gt;= 120</code>.</p>`,
        task: {
          text: `<p>A rollercoaster needs riders to be at least 10 years old <b>and</b> at least 120 cm tall. The starter code sets <code>age</code> and <code>height</code>. Print <code>You can ride!</code> when both are true, otherwise <code>Sorry, not this time.</code></p>`,
          starter: "age = 11\nheight = 125\n\n# Decide who can ride\n",
          solution: 'age = 11\nheight = 125\nif age >= 10 and height >= 120:\n    print("You can ride!")\nelse:\n    print("Sorry, not this time.")',
          noHardcode: true,
          checks: [
            { name: "Starter values unchanged", code: `assert (age, height) == (11, 125), "Keep age and height as in the starter code."`, peek: "age = 11 and height = 125 must stay." },
            { name: "Both true", code: `assert rerun(age=10, height=120) == ["You can ride!"], "10 years old and 120 cm is allowed: the limits count, so use >="`, peek: "age >= 10 and height >= 120" },
            { name: "Too young", code: `assert rerun(age=9, height=150) == ["Sorry, not this time."], "Age 9 is too young, even if tall enough."`, peek: "Both conditions must be true." },
            { name: "Too short", code: `assert rerun(age=14, height=110) == ["Sorry, not this time."], "110 cm is too short, even if old enough."`, peek: "Both conditions must be true." },
          ],
          hints: [
            "One if with both questions: if age >= 10 and height >= 120:",
            "Repeat the variable on each side of and: each side is a full comparison.",
            "Put the Sorry message under else: for every case where either one fails.",
          ],
        },
      },
      {
        title: "or and not",
        html: `<h3>or: at least one</h3>
<p><code>or</code> is True when <b>at least one</b> side is True.</p>
<pre data-run>day = "Sunday"
if day == "Saturday" or day == "Sunday":
    print("Weekend!")</pre>
<h3>not: flip it</h3>
<p><code>not</code> turns True into False and False into True. It reads well with a boolean variable.</p>
<pre data-run>raining = False
if not raining:
    print("Leave the umbrella")</pre>
<h3>Mixing them: use brackets</h3>
<p>When you mix <code>and</code> with <code>or</code>, put brackets round the part that should be worked out first, so it's clear (to you and to Python).</p>
<pre data-run>day = "Sunday"
raining = False
if (day == "Saturday" or day == "Sunday") and not raining:
    print("Picnic!")</pre>`,
        task: {
          text: `<p>A family goes for a picnic if it's the weekend (Saturday <b>or</b> Sunday) <b>and</b> it's <b>not</b> raining. The starter code sets <code>day</code> and <code>raining</code>. Print <code>Picnic time!</code> if they go, otherwise <code>Stay in</code>.</p>`,
          starter: 'day = "Saturday"\nraining = False\n\n# Decide whether to go\n',
          solution: 'day = "Saturday"\nraining = False\nif (day == "Saturday" or day == "Sunday") and not raining:\n    print("Picnic time!")\nelse:\n    print("Stay in")',
          noHardcode: true,
          checks: [
            { name: "Starter values unchanged", code: `assert (day, raining) == ("Saturday", False), "Keep day and raining as in the starter code."`, peek: 'day = "Saturday" and raining = False must stay.' },
            { name: "Sunday works too", code: `assert rerun(day="Sunday", raining=False) == ["Picnic time!"], "Sunday with no rain should be Picnic time!"`, peek: 'day == "Saturday" or day == "Sunday"' },
            { name: "Rain cancels", code: `assert rerun(day="Sunday", raining=True) == ["Stay in"], "Rain should cancel the picnic."`, peek: "and not raining" },
            { name: "Weekdays are out", code: `assert rerun(day="Monday", raining=False) == ["Stay in"], "A Monday is not the weekend."`, peek: "The weekend part needs both days joined by or." },
          ],
          hints: [
            'The weekend part: day == "Saturday" or day == "Sunday". Repeat day on each side of or.',
            "Wrap that part in brackets, then add and not raining after it.",
            "Put Picnic time! under the if and Stay in under the else.",
          ],
        },
      },
      {
        title: "Putting it all together",
        html: `<h3>One program, every tool</h3>
<p>Real decisions often use several tools at once: an <code>if</code> / <code>elif</code> chain to pick a value, then another <code>if</code> afterwards to adjust it.</p>
<pre data-run>age = 30
is_member = True
if is_member and age &gt;= 60:
    fee = 5
elif is_member:
    fee = 10
else:
    fee = 20
if age &lt; 12:
    fee = 0     # children are always free
print(f"Fee: \${fee}")</pre>
<p>Two separate <code>if</code>s both get checked. An <code>elif</code> only happens when the <code>if</code> above it was False. That's the difference to keep in mind.</p>`,
        task: {
          text: `<p>A cinema ticket price depends on the rules below, checked in this order. The starter code sets <code>age</code>, <code>is_student</code> and <code>is_weekend</code>.</p><ul><li>Under 12: <code>6</code></li><li>65 or older: <code>7</code></li><li>A student: <code>8</code></li><li>Everyone else: <code>12</code></li></ul><p>Then, a second separate rule: on a weekend, anyone aged 12 or over pays <code>2</code> extra. Make a variable <code>price</code> and print <code>Ticket: $</code> followed by the price.</p>`,
          starter: "age = 20\nis_student = True\nis_weekend = False\n\n# Work out price\n\n# Print it\n",
          solution: 'age = 20\nis_student = True\nis_weekend = False\nif age < 12:\n    price = 6\nelif age >= 65:\n    price = 7\nelif is_student:\n    price = 8\nelse:\n    price = 12\nif is_weekend and age >= 12:\n    price += 2\nprint(f"Ticket: ${price}")',
          noHardcode: true,
          checks: [
            { name: "Starter values unchanged", code: `assert (age, is_student, is_weekend) == (20, True, False), "Keep age, is_student and is_weekend as in the starter code."`, peek: "age = 20, is_student = True, is_weekend = False must stay." },
            { name: "Child and senior prices", code: `assert rerun(age=8, is_student=True, is_weekend=False) == ["Ticket: $6"] and rerun(age=70, is_student=False, is_weekend=False) == ["Ticket: $7"], "Under 12 pays 6 and 65 or older pays 7, even if they're also students."`, peek: "Check age < 12 first, then age >= 65, then is_student." },
            { name: "Student and standard prices", code: `assert rerun(age=20, is_student=True, is_weekend=False) == ["Ticket: $8"] and rerun(age=40, is_student=False, is_weekend=False) == ["Ticket: $12"], "A student pays 8 and everyone else pays 12."`, peek: "elif is_student: price = 8, else: price = 12" },
            { name: "Weekend extra", code: `assert rerun(age=40, is_student=False, is_weekend=True) == ["Ticket: $14"] and rerun(age=8, is_student=False, is_weekend=True) == ["Ticket: $6"], "The weekend extra of 2 is only for ages 12 and up (a child still pays 6)."`, peek: "A second, separate if: if is_weekend and age >= 12:" },
          ],
          hints: [
            "Pick the price with if / elif / else, in the same order as the rules in the task.",
            "is_student is already a boolean, so write elif is_student: with no comparison.",
            "After the chain, add a separate if is_weekend and age >= 12: with price += 2 inside, then print.",
          ],
        },
      },
    ],
  },
];
