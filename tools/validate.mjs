// Proves every lesson and challenge template works, before it ever reaches
// the learner. For each lesson, and for each template across many random
// seeds, it checks that:
//   - the reference solution runs, passes every check and prints something
//   - the solution earns a full 10/10 (no style problems DOT would flag)
//   - the starter code does NOT already pass
// Run: node tools/validate.mjs [seedsPerTemplate]

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ALL_LESSONS, ALL_TEMPLATES } from "../site/content/index.js";
import { rng } from "../site/js/rng.js";
import { LINT_PENALTY } from "../site/content/help.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEEDS = Number(process.argv[2] || 60);

const py = spawn("python3", [join(root, "site/py/harness.py")], { stdio: ["pipe", "pipe", "inherit"] });
const rl = createInterface({ input: py.stdout });
const waiting = [];
rl.on("line", (line) => waiting.shift()(JSON.parse(line)));
const run = (code, checks = [], expected = null) => new Promise((res) => { waiting.push(res); py.stdin.write(JSON.stringify({ code, checks, expected }) + "\n"); });

const failures = [];
const fail = (where, why) => failures.push(`${where}: ${why}`);
const sameLines = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

async function checkTask(where, task) {
  const sol = await run(task.solution, task.checks);
  if (sol.error) return fail(where, `solution errors:\n${sol.error}`);
  const bad = sol.results.filter((r) => !r.passed);
  if (bad.length) return fail(where, `solution fails checks: ${bad.map((b) => b.name + " (" + b.message + ")").join("; ")}`);
  if (!sol.lines.length) return fail(where, "solution prints nothing");
  const linted = await run(task.solution, [], sol.lines);
  const style = linted.lint.filter((l) => LINT_PENALTY[l.id] || (l.id === "lint-hardcoded" && task.noHardcode));
  if (style.length) return fail(where, `solution has style findings: ${style.map((s) => s.id + "@" + s.line).join(", ")}`);
  const st = await run(task.starter, task.checks);
  const starterPasses = !st.error && st.results.every((r) => r.passed) && sameLines(st.lines, sol.lines);
  if (starterPasses) fail(where, "starter code already passes");
  if (!task.hints || task.hints.length < 3) fail(where, "needs 3 hints");
}

let count = 0;
for (const l of ALL_LESSONS) { await checkTask(`lesson ${l.id}`, l.task); count++; }
for (const t of ALL_TEMPLATES) {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const c = t.make(rng(seed * 7919 + 13));
    await checkTask(`template ${t.id} seed ${seed}`, c);
    count++;
  }
}
py.stdin.end();

const ids = ALL_TEMPLATES.map((t) => t.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) fail("templates", `duplicate ids: ${dupes.join(", ")}`);

console.log(`Checked ${ALL_LESSONS.length} lessons and ${ALL_TEMPLATES.length} templates (${count} runs).`);
const byDiff = [1, 2, 3].map((d) => ALL_TEMPLATES.filter((t) => t.difficulty === d).length);
console.log(`Templates by difficulty: Easy ${byDiff[0]}, Medium ${byDiff[1]}, Hard ${byDiff[2]}.`);
if (failures.length) {
  const shown = [...new Set(failures.map((f) => f.replace(/ seed \d+/, "")))];
  console.error(`\n${failures.length} problem(s):\n` + shown.slice(0, 40).map((f) => " - " + f).join("\n"));
  process.exit(1);
}
console.log("All good.");
