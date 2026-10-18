// Operandi: the page. Lessons, practice, shop and FAQ on the left, the editor
// and results on the right, and your teammate (DOT or PYRO) roaming the
// screen. No AI: every message comes from content/.

import { Dot, DOT_CSS } from "./dot.js";
import { Runner } from "./runner.js";
import { Store } from "./store.js";
import { SHOP, LEVELS, DIFFS, EARN, WEAR_SLOTS, levelFor, rewardFor, markFor } from "./economy.js";
import { Pet } from "./pet.js";
import { VOICES } from "../content/voices.js";
import { startCloud, cloudConfigured } from "./cloud.js";
import { rng, newSeed } from "./rng.js";
import { MODULES, ALL_LESSONS, ALL_TEMPLATES } from "../content/index.js";
import { HELP, LINT_PENALTY, compareOutput } from "../content/help.js";
import { FAQ } from "../content/faq.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

const store = new Store();
const S = () => store.state;

/* ---------- Your teammate (DOT or PYRO) ---------- */

const dotStyle = document.createElement("style");
dotStyle.textContent = DOT_CSS;
document.head.append(dotStyle);
const V = () => VOICES[S().equipped.teammate] || VOICES.dot;
const wearing = () => WEAR_SLOTS.map((slot) => S().equipped[slot]).filter(Boolean);
const dot = new Pet({
  skin: S().equipped.teammate || "dot",
  accessories: wearing(),
  place: S().pet,
  voice: V,
  onPlace: (p) => { S().pet = p; store.save(); },
});

function applyCosmetics() {
  dot.setSkin(S().equipped.teammate || "dot");
  dot.setAccessory(wearing());
  const theme = S().equipped.theme;
  if (theme) document.documentElement.dataset.editor = theme;
  else delete document.documentElement.dataset.editor;
}

// Say a help message from content/help.js, with a link to its FAQ entry.
function sayHelp(id, d = {}, { mood = "thinking", extra = [] } = {}) {
  const h = HELP[id] || HELP["error-general"];
  const actions = [...extra];
  if (h.faq) actions.push({ label: "Explain more", onClick: () => openFaq(h.faq) });
  dot.say(h.body(d), { title: h.title, mood, actions });
}

let toastTimer;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200); }

/* ---------- Python ---------- */

const runner = new Runner((state, err) => {
  const e = $("engine");
  e.className = "engine" + (state === "ready" ? " ok" : state === "failed" ? " bad" : "");
  e.querySelector("span").textContent = state === "ready" ? "Python 3.12 ready" : state === "failed" ? "Python couldn't load" : "Loading Python…";
  $("runBtn").disabled = $("submitBtn").disabled = state !== "ready";
  if (state === "ready") { prepareTask(); }
  if (state === "failed") dot.say(`I couldn't start Python in this browser: ${err}. Try reloading the page.`, { title: "Python didn't load", mood: "sad" });
});

/* ---------- Content helpers ---------- */

const MODULE_LESSONS = (m) => ALL_LESSONS.filter((l) => l.module === m);
const lessonIndex = (id) => ALL_LESSONS.findIndex((l) => l.id === id);
const lessonDone = (id) => !!S().lessons[id]?.done;
const lessonUnlocked = (i) => i === 0 || lessonDone(ALL_LESSONS[i - 1].id);
const lessonsDoneCount = () => ALL_LESSONS.filter((l) => lessonDone(l.id)).length;
const modulesDone = () => Object.keys(S().modulesDone).length;

// Which lesson a template's topics need (Module 1). Challenges only use what you've learned.
function requiredLessons(t) {
  let need = 1;
  for (const topic of t.topics) {
    const x = topic.toLowerCase();
    if (/f-string|:\.|:,/.test(x)) need = Math.max(need, 5);
    else if (/upper|lower|strip|title|len|index|replace|repetition|joining|string/.test(x)) need = Math.max(need, 4);
    else if (/math|\/\/|%|\+=|division|bracket/.test(x)) need = Math.max(need, 3);
    else if (/variable/.test(x)) need = Math.max(need, 2);
  }
  return need;
}
const availableTemplates = (difficulty) => ALL_TEMPLATES.filter((t) => t.difficulty === difficulty && t.module === 1 && requiredLessons(t) <= lessonsDoneCount());

/* ---------- Current task ---------- */

let view = { kind: "lesson", id: ALL_LESSONS[0].id };
let task = null;       // the lesson task or challenge on screen
let lastRun = null;    // last submit's results, used by Peek

function lessonTask(l) {
  return { key: l.id, kind: "lesson", title: l.title, ...l.task, expected: null };
}

function challengeTask(cur) {
  const t = ALL_TEMPLATES.find((x) => x.id === cur.templateId);
  const c = t.make(rng(cur.seed));
  return { key: `ch:${cur.templateId}:${cur.seed}`, kind: "challenge", template: t, difficulty: t.difficulty, topics: t.topics, ...c, expected: null };
}

// The record that tracks attempts, hints and so on for the task on screen.
function rec() {
  if (task.kind === "lesson") return (S().lessons[task.key] ||= { done: false, attempts: 0, hints: 0, assisted: false, solutionUsed: false, peeked: [] });
  return S().current;
}

async function prepareTask() {
  if (!task || task.expected || !runner.ready) return;
  const t = task;
  const r = await runner.run(t.solution, { checks: t.checks });
  if (t !== task) return;
  t.expected = r.lines;
  const box = $("expectedBox");
  if (box) box.textContent = r.lines.join("\n");
}

function loadEditor() {
  setCode(lsGet("operandi:draft:" + task.key) ?? task.starter);
  resetPanels();
}

/* ---------- Editor ---------- */

const ed = $("code");
let draftTimer, idleTimer;
function updateGutter() {
  const n = ed.value.split("\n").length;
  $("gutter").textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
  $("gutter").scrollTop = ed.scrollTop;
}
function setCode(code) { ed.value = code; updateGutter(); }
function armIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!task || isSolved()) return;
    const v = V().idle();
    dot.say(v.text, { title: v.title, mood: "sleepy", actions: [{ label: "I'm stuck: what should I try?", onClick: () => openFaq("debugging") }] });
  }, 150000);
}
ed.addEventListener("input", () => {
  updateGutter(); armIdle();
  if (dot.figure.dataset.mood === "sleepy") dot.setMood("idle");
  if (S().equipped.prop === "laptop") dot.typing();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => task && lsSet("operandi:draft:" + task.key, ed.value), 400);
});
ed.addEventListener("scroll", () => ($("gutter").scrollTop = ed.scrollTop));
ed.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); doRun(); return; }
  const { selectionStart: s, selectionEnd: en, value: v } = ed;
  if (e.key === "Tab") {
    e.preventDefault();
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    if (e.shiftKey) { const m = v.slice(lineStart).match(/^ {1,4}/); if (m) ed.setRangeText("", lineStart, lineStart + m[0].length, "preserve"); }
    else ed.setRangeText("    ", s, en, "end");
    ed.dispatchEvent(new Event("input"));
  } else if (e.key === "Enter") {
    const line = v.slice(v.lastIndexOf("\n", s - 1) + 1, s);
    let indent = line.match(/^ */)[0];
    if (/:\s*$/.test(line)) indent += "    ";
    e.preventDefault();
    ed.setRangeText("\n" + indent, s, en, "end");
    ed.dispatchEvent(new Event("input"));
  }
});

/* ---------- Panels ---------- */

function showTab(name) {
  ["output", "tests", "feedback"].forEach((t) => {
    $("tab-" + t).setAttribute("aria-selected", String(t === name));
    $("panel-" + t).hidden = t !== name;
  });
}
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

function resetPanels() {
  lastRun = null;
  $("testCount").textContent = "";
  $("panel-output").innerHTML = `<p class="empty">Press Run to see what your program prints.</p>`;
  $("panel-tests").innerHTML = `<p class="empty">Press Submit to check your code.</p>`;
  $("panel-feedback").innerHTML = `<p class="empty">Submit your code and DOT will mark it out of 10.</p>`;
  showTab("output");
}

function showOutput(r) {
  const out = r.output ? `<pre class="out">${esc(r.output)}</pre>` : r.error ? "" : `<p class="empty">Your program ran but printed nothing.</p>`;
  const err = r.error ? `<pre class="out err">${esc(r.error)}</pre>` : "";
  $("panel-output").innerHTML = out + err;
}

function showTests(results) {
  const peeked = new Set(task && rec()?.peeked || []);
  const passed = results.filter((x) => x.passed).length;
  $("testCount").textContent = ` ${passed}/${results.length}`;
  $("panel-tests").innerHTML = `<ul class="tests">${results.map((x) => `<li class="${x.passed ? "ok" : "no"}"><span class="tag">${x.passed ? "PASS" : "FAIL"}</span><span>${esc(x.name)}${!x.passed && x.message ? `<span class="msg">${esc(x.message)}</span>` : ""}${!x.passed && peeked.has(x.name) && x.peek ? `<span class="peeked">Peek: ${esc(x.peek)}</span>` : ""}</span></li>`).join("")}</ul>`;
}

/* ---------- Run ---------- */

let busy = false;
async function doRun() {
  if (busy || !runner.ready || !task) return;
  busy = true;
  try {
    const r = await runner.run(ed.value, { expected: task.expected });
    showOutput(r); showTab("output");
    if (r.diagnosis) sayHelp(r.diagnosis.id, r.diagnosis, { mood: "worried" });
    else if (task.expected && r.lines.join("\n") === task.expected.join("\n")) { const v = V().outputMatches(); dot.say(v.text, { title: v.title, mood: "happy" }); }
    else if (task.expected) {
      const d = compareOutput(r.lines, task.expected);
      if (d) sayHelp(d.id, d, { mood: "thinking" });
    }
  } catch (e) { toast(e.message); }
  finally { busy = false; }
}

/* ---------- Submit ---------- */

function isSolved() {
  if (!task) return false;
  return task.kind === "lesson" ? lessonDone(task.key) : !!S().current?.solved;
}

async function doSubmit() {
  if (busy || !runner.ready || !task) return;
  busy = true;
  $("submitBtn").disabled = true;
  try {
    await prepareTask();
    const r = rec();
    const already = isSolved();
    r.attempts = (r.attempts || 0) + 1;
    const run = await runner.run(ed.value, { checks: task.checks, expected: task.expected });
    const diff = run.error ? null : compareOutput(run.lines, task.expected);
    const results = [...run.results, { name: "Output matches the expected output", passed: !run.error && !diff, message: diff ? HELP[diff.id].body(diff) : run.error ? "Your code stopped with an error." : "", peek: "" }];
    lastRun = { results };
    showOutput(run); showTests(results);

    const passedCount = results.filter((x) => x.passed).length;
    const allPass = passedCount === results.length;
    const hardcoded = task.noHardcode && run.lint.find((l) => l.id === "lint-hardcoded");
    const passed = allPass && !hardcoded;
    const styleLint = run.lint.filter((l) => LINT_PENALTY[l.id]);
    const mark = hardcoded ? 5 : markFor({ passedCount, total: results.length, lintIds: styleLint.map((l) => l.id), attempt: r.attempts, penalties: LINT_PENALTY });

    let rewardLine = "", rewardParts = [];
    if (passed && !already) {
      const repeat = task.kind === "challenge" && task.difficulty < 3 && (S().solves[`1:${task.difficulty}`] || 0) >= EARN.repeatAfter;
      const rw = rewardFor({ kind: task.kind, difficulty: task.difficulty, attempt: r.attempts, mark, assisted: r.assisted, solved: r.solutionUsed, repeat });
      store.earn(rw.total);
      rewardParts = rw.parts;
      const daily = store.markActiveToday();
      if (daily) rewardParts.push(`+${daily} first pass today`);
      rewardLine = `+${rw.total + daily} Bits`;
      if (task.kind === "lesson") {
        Object.assign(r, { done: true, mark, at: new Date().toISOString() });
        const moduleId = ALL_LESSONS[lessonIndex(task.key)].module;
        if (MODULE_LESSONS(moduleId).every((l) => lessonDone(l.id)) && !S().modulesDone[moduleId]) {
          const before = levelFor(modulesDone());
          S().modulesDone[moduleId] = new Date().toISOString();
          store.earn(EARN.moduleComplete);
          rewardParts.push(`+${EARN.moduleComplete} module complete`);
          rewardLine = `+${rw.total + daily + EARN.moduleComplete} Bits`;
          const after = levelFor(modulesDone());
          if (after > before) setTimeout(() => toast(`Level up: you're now ${LEVELS[after].name}!`), 600);
        }
      } else {
        Object.assign(r, { solved: true, mark });
        S().solves[`1:${task.difficulty}`] = (S().solves[`1:${task.difficulty}`] || 0) + 1;
      }
    }

    store.log({ kind: task.kind, id: task.key, title: task.title, attempt: r.attempts, passed, mark, diagnosis: run.diagnosis?.id || diff?.id || (hardcoded ? "lint-hardcoded" : null), failed: results.filter((x) => !x.passed).map((x) => x.name).slice(0, 3) });
    store.save();

    renderFeedback({ passed, mark, rewardLine, rewardParts, run, diff, hardcoded, styleLint, already, attempts: r.attempts });
    showTab(passed ? "feedback" : run.error ? "output" : diff ? "tests" : "tests");
    dotReact({ passed, mark, rewardLine, run, diff, hardcoded, styleLint, already, attempts: r.attempts, results });
    renderTop(); renderRail();
    if (task.kind === "challenge") renderChallenge();
    else if (passed) renderLessonFooter();
  } catch (e) {
    toast(e.message || "Something went wrong running your code.");
  } finally {
    busy = false;
    $("submitBtn").disabled = !runner.ready;
  }
}

function nextAction() {
  if (task.kind === "lesson") {
    const i = lessonIndex(task.key);
    const next = ALL_LESSONS[i + 1];
    if (next) return { label: `Next: ${next.title} →`, onClick: () => openLesson(next.id) };
    return { label: "Practice challenges →", onClick: () => openView("practice") };
  }
  return { label: "Another challenge →", onClick: () => openView("practice") };
}

function dotReact({ passed, mark, rewardLine, run, diff, hardcoded, styleLint, already, attempts, results }) {
  if (passed) {
    const v = V().passed(mark);
    const praise = mark === 10 || !styleLint.length ? v.text : `${v.text} ${styleLint.length === 1 ? "One small style tip" : "A few style tips"} in Feedback.`;
    const paid = already ? "You'd already finished this one, so no Bits this time." : rec().solutionUsed ? "You used the solution, so no Bits for this one. Typing it out yourself still counts for learning." : `${rewardLine}.`;
    dot.say(`${praise} ${paid}`, { title: v.title, mood: mark >= 9 ? "celebrate" : "happy", actions: [nextAction()] });
    dot.setMood(mark >= 9 ? "celebrate" : "happy", { revertAfter: 3500 });
    return;
  }
  const extra = [];
  const r = rec();
  if (attempts >= 3 && (r.hints || 0) < task.hints.length) extra.push({ label: `Use a hint (${S().items.hint} left)`, onClick: useHint });
  if (run.diagnosis) return sayHelp(run.diagnosis.id, run.diagnosis, { mood: "worried", extra });
  if (hardcoded) return sayHelp("lint-hardcoded", hardcoded, { mood: "thinking", extra });
  const failedCheck = results.find((x) => !x.passed && x.name !== "Output matches the expected output");
  if (failedCheck) {
    if (failedCheck.peek && S().items.peek > 0) extra.unshift({ label: `Peek (${S().items.peek} left)`, onClick: usePeek });
    return dot.say(failedCheck.message, { title: V().notYet().title, mood: "thinking", actions: extra });
  }
  if (diff) return sayHelp(diff.id, diff, { mood: "thinking", extra });
}

function renderFeedback({ passed, mark, rewardLine, rewardParts, run, diff, hardcoded, styleLint, already, attempts }) {
  let h = `<div class="fb"><div class="fb-head"><div class="score">${mark}<small>/10</small></div><div class="verdict"><span class="pill ${passed ? "ok" : "no"}">${passed ? "Passed" : "Not yet"}</span><span>Attempt ${attempts}</span></div></div>`;
  if (rewardLine) h += `<div class="reward">${esc(rewardLine)} · ${esc(rewardParts.join(" · "))}</div>`;
  if (already && passed) h += `<p class="empty">Already completed, so no extra Bits. Practice challenges keep paying.</p>`;
  const problems = [];
  if (run.diagnosis) problems.push(HELP[run.diagnosis.id] ? [HELP[run.diagnosis.id].title, HELP[run.diagnosis.id].body(run.diagnosis)] : null);
  if (diff) problems.push([HELP[diff.id].title, HELP[diff.id].body(diff)]);
  if (hardcoded) problems.push([HELP["lint-hardcoded"].title, HELP["lint-hardcoded"].body(hardcoded)]);
  if (problems.filter(Boolean).length) h += `<div><h5>What went wrong</h5><ul>${problems.filter(Boolean).map(([t, b]) => `<li><b>${esc(t)}</b><span class="why">${esc(b)}</span></li>`).join("")}</ul></div>`;
  if (passed) {
    const good = ["Every test passed."];
    if (!styleLint.length) good.push("No style problems: clear and tidy.");
    if (attempts === 1) good.push("First try.");
    h += `<div><h5>What works</h5><ul>${good.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>`;
  }
  if (styleLint.length) h += `<div><h5>To improve</h5><ul>${styleLint.map((l) => `<li><b>${esc(HELP[l.id].title)}</b><span class="why">${esc(HELP[l.id].body(l))}</span></li>`).join("")}</ul></div>`;
  h += `</div>`;
  $("panel-feedback").innerHTML = h;
}

/* ---------- Items: hint, peek, solution ---------- */

function useHint() {
  if (!task) return;
  const r = rec();
  if (isSolved() && task.kind === "challenge") return;
  if ((r.hints || 0) >= task.hints.length) return dot.say("That was the last hint for this task. A full solution is the next step if you're really stuck.", { title: "No more hints here", mood: "thinking" });
  if (!store.useItem("hint")) return dot.say("You're out of hints. You can buy more in the Shop for 10 Bits each.", { title: "No hints left", mood: "sad", actions: [{ label: "Open the Shop", onClick: () => openView("shop") }] });
  r.hints = (r.hints || 0) + 1;
  r.assisted = true;
  store.save();
  const text = task.hints[r.hints - 1];
  dot.say(text, { title: `Hint ${r.hints} of ${task.hints.length}`, mood: "thinking" });
  renderHints();
  renderTop();
}

function usePeek() {
  if (!task) return;
  const failing = lastRun?.results.filter((x) => !x.passed && x.peek) || [];
  const r = rec();
  const target = failing.find((x) => !(r.peeked || []).includes(x.name));
  if (!lastRun) return dot.say("Submit your code first, then I can show you what a failing test expected.", { title: "Nothing to peek at yet", mood: "thinking" });
  if (!target) return dot.say(failing.length ? "You've already peeked at the failing tests. Check the Tests tab." : "None of the tests you're failing have anything hidden. The difference is in your output, which I already showed you for free.", { title: "No peek needed", mood: "thinking" });
  if (!store.useItem("peek")) return dot.say("You're out of peeks. They're 15 Bits each in the Shop.", { title: "No peeks left", mood: "sad", actions: [{ label: "Open the Shop", onClick: () => openView("shop") }] });
  (r.peeked ||= []).push(target.name);
  r.assisted = true;
  store.save();
  showTests(lastRun.results); showTab("tests");
  dot.say(target.peek, { title: `Peek: ${target.name}`, mood: "thinking" });
  renderTop();
}

function useSolution() {
  if (!task) return;
  const r = rec();
  if (r.solutionUsed) return renderSolutionBlock();
  if (S().items.solution <= 0) return dot.say("You're out of solutions. They're 60 Bits in the Shop.", { title: "No solutions left", mood: "sad", actions: [{ label: "Open the Shop", onClick: () => openView("shop") }] });
  dot.say(`This shows the full answer and ${task.kind === "lesson" ? "the lesson" : "this challenge"} will pay no Bits. You have ${S().items.solution} left. Sure?`, {
    title: "Show the solution?", mood: "worried",
    actions: [
      { label: "Show it", onClick: () => { if (!store.useItem("solution")) return; r.solutionUsed = true; store.save(); renderSolutionBlock(); renderTop(); dot.say("Read it line by line and work out why each line is there. Then type it yourself rather than pasting. That's how it sticks.", { title: "Here's the solution", mood: "idle" }); } },
      { label: "Keep trying", onClick: () => dot.say(V().keepTrying().text, { mood: "happy" }) },
    ],
  });
}

function renderHints() {
  const box = $("hintBox");
  if (!box || !task) return;
  const n = rec()?.hints || 0;
  box.innerHTML = task.hints.slice(0, n).map((h, i) => `<div class="hint"><b>Hint ${i + 1}</b>${esc(h)}</div>`).join("");
}

function renderSolutionBlock() {
  const box = $("solutionBox");
  if (!box) return;
  box.innerHTML = `<h3>Solution</h3><div class="example"><pre>${esc(task.solution)}</pre></div>`;
}

$("runBtn").addEventListener("click", doRun);
$("submitBtn").addEventListener("click", doSubmit);
$("hintBtn").addEventListener("click", useHint);
$("peekBtn").addEventListener("click", usePeek);
$("solBtn").addEventListener("click", useSolution);
$("resetBtn").addEventListener("click", () => {
  if (!task) return;
  const b = $("resetBtn");
  if (b.dataset.confirm !== "1") { b.dataset.confirm = "1"; b.textContent = "Click again to reset"; setTimeout(() => { b.dataset.confirm = ""; b.textContent = "Reset"; }, 2500); return; }
  b.dataset.confirm = ""; b.textContent = "Reset";
  setCode(task.starter); lsSet("operandi:draft:" + task.key, task.starter);
});

/* ---------- Views ---------- */

function setWorkVisible(on) { $("work").hidden = !on; document.querySelector(".body").classList.toggle("no-work", !on); }

function wireExamples() {
  document.querySelectorAll("#briefInner pre[data-run]").forEach((pre) => {
    const code = pre.textContent;
    const wrap = document.createElement("div");
    wrap.className = "example";
    const p = document.createElement("pre"); p.textContent = code;
    const bar = document.createElement("div"); bar.className = "bar";
    const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Run example";
    btn.addEventListener("click", async () => {
      try { const r = await runner.run(code); showOutput(r); showTab("output"); } catch (e) { toast(e.message); }
    });
    bar.append(btn); wrap.append(p, bar); pre.replaceWith(wrap);
  });
}

function openLesson(id) {
  view = { kind: "lesson", id };
  const l = ALL_LESSONS.find((x) => x.id === id);
  task = lessonTask(l);
  setWorkVisible(true);
  const i = lessonIndex(id), mod = MODULES.find((m) => m.id === l.module);
  $("briefInner").innerHTML = `
    <p class="eyebrow">Module ${mod.id} · Lesson ${MODULE_LESSONS(l.module).indexOf(l) + 1} of ${MODULE_LESSONS(l.module).length}${lessonDone(id) ? " · completed" : ""}</p>
    <h1>${esc(l.title)}</h1>
    ${l.html}
    <div class="task"><h3>Your turn</h3>${l.task.text}
      <div class="expected"><span>Expected output</span><pre id="expectedBox">…</pre></div>
      <div class="chips"><span class="chip gold">◆ ${EARN.lesson} Bits · ×2 first try without help</span></div>
      <div class="hints" id="hintBox"></div>
      <div id="solutionBox"></div>
    </div>
    <div id="lessonFooter"></div>`;
  wireExamples();
  renderHints();
  if (rec().solutionUsed) renderSolutionBlock();
  renderLessonFooter();
  loadEditor();
  prepareTask();
  renderRail();
  $("brief").scrollTop = 0;
  armIdle();
  if (!S().seenIntro) {
    S().seenIntro = true; store.save();
    const v = V().welcome(S().items);
    dot.say(`${v.text} I wander around the screen: drag me anywhere if I'm in the way.`, { title: v.title, mood: "happy" });
  } else if (!lessonDone(id)) {
    dot.say(V().lessonIntro(i + 1, l.title).text, { mood: "idle" });
  }
}

function renderLessonFooter() {
  const f = $("lessonFooter");
  if (!f || task?.kind !== "lesson") return;
  const l = ALL_LESSONS[lessonIndex(task.key)];
  const mod = MODULE_LESSONS(l.module);
  if (lessonDone(l.id) && mod[mod.length - 1].id === l.id) f.innerHTML = `<div class="note"><b>Module ${l.module} complete</b>Keep sharpening your skills in Practice. Module ${l.module + 1} is on its way.</div>`;
  else f.innerHTML = "";
}

function openView(kind) {
  if (kind === "practice") return openPractice();
  view = { kind };
  task = null;
  setWorkVisible(false);
  if (kind === "shop") renderShop();
  if (kind === "faq") renderFaqView();
  renderRail();
  $("brief").scrollTop = 0;
}

let difficulty = 1;
function openPractice() {
  view = { kind: "practice" };
  const cur = S().current;
  if (cur && ALL_TEMPLATES.some((t) => t.id === cur.templateId)) {
    task = challengeTask(cur);
    setWorkVisible(true);
    renderChallenge();
    loadEditor();
    prepareTask();
  } else {
    task = null;
    setWorkVisible(false);
    renderPracticeHome();
  }
  renderRail();
  $("brief").scrollTop = 0;
}

function diffPicker() {
  return `<div class="diff" role="group" aria-label="Difficulty">${[1, 2, 3].map((d) => {
    const n = availableTemplates(d).length, solved = S().solves[`1:${d}`] || 0;
    const half = d < 3 && solved >= EARN.repeatAfter;
    return `<button type="button" data-d="${d}" aria-pressed="${d === difficulty}" ${n ? "" : "disabled"}>${DIFFS[d]}<small>◆ ${EARN.challenge[d]} Bits${half ? " (half now)" : ""} · ${solved} solved · ${n ? n + " kinds" : "unlocks later"}</small></button>`;
  }).join("")}</div>`;
}
function wireDiff() {
  document.querySelectorAll(".diff button").forEach((b) => b.addEventListener("click", () => {
    difficulty = Number(b.dataset.d);
    document.querySelectorAll(".diff button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
  if (!availableTemplates(difficulty).length) difficulty = [1, 2, 3].find((d) => availableTemplates(d).length) || 1;
  document.querySelectorAll(".diff button").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.d) === difficulty)));
}

function renderPracticeHome() {
  const total = ALL_TEMPLATES.length, open = [1, 2, 3].reduce((a, d) => a + availableTemplates(d).length, 0);
  $("briefInner").innerHTML = `<p class="eyebrow">Practice</p><h1>Challenges</h1>
    <p>Every challenge is built from a template with fresh random values, so no two play-throughs are the same. You'll only get challenges that use what you've already learned: <b>${open} of ${total}</b> challenge types are open to you right now.</p>
    <h3>Pick a difficulty</h3>${diffPicker()}
    <button class="btn primary" id="startBtn">Start a challenge</button>
    <p class="empty" style="margin-top:14px">First try without hints or peeks doubles the Bits. A 8/10 or better adds a bonus. After ${EARN.repeatAfter} solves at Easy or Medium, that difficulty pays half, so it pays to move up.</p>`;
  wireDiff();
  $("startBtn").addEventListener("click", startChallenge);
  dot.say(V().practice(lessonsDoneCount() >= ALL_LESSONS.length).text, { mood: "happy" });
}

async function startChallenge() {
  const pool = availableTemplates(difficulty);
  if (!pool.length) return;
  const fresh = pool.filter((t) => !S().recent.includes(t.id));
  const choices = fresh.length ? fresh : pool;
  for (let tries = 0; tries < 3; tries++) {
    const t = choices[Math.floor(Math.random() * choices.length)];
    const cur = { templateId: t.id, seed: newSeed(), attempts: 0, hints: 0, assisted: false, solutionUsed: false, solved: false, peeked: [] };
    const candidate = challengeTask(cur);
    // Double-check the generated challenge before showing it.
    if (runner.ready) {
      const r = await runner.run(candidate.solution, { checks: candidate.checks });
      if (r.error || !r.results.every((x) => x.passed) || !r.lines.length) continue;
      candidate.expected = r.lines;
    }
    S().current = cur;
    S().recent = [t.id, ...S().recent.filter((x) => x !== t.id)].slice(0, 10);
    store.save();
    task = candidate;
    setWorkVisible(true);
    renderChallenge();
    loadEditor();
    prepareTask();
    renderRail();
    dot.say(V().challenge(DIFFS[t.difficulty], candidate.title).text, { mood: "idle" });
    return;
  }
  toast("Couldn't build a working challenge. Try again.");
}

function renderChallenge() {
  const cur = S().current, c = task;
  $("briefInner").innerHTML = `
    <p class="eyebrow">Practice · ${DIFFS[c.difficulty]}${cur.solved ? " · solved" : ""}</p>
    <h1>${esc(c.title)}</h1>
    <p>${esc(c.scenario)}</p>
    <div class="task"><h3>Your task</h3><ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="expected"><span>Expected output</span><pre id="expectedBox">${c.expected ? esc(c.expected.join("\n")) : "…"}</pre></div>
      <div class="chips">${c.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}<span class="chip gold">◆ ${EARN.challenge[c.difficulty]} Bits base</span>${cur.attempts ? `<span class="chip">Attempt ${cur.attempts}</span>` : ""}</div>
      <div class="hints" id="hintBox"></div>
      <div id="solutionBox"></div>
    </div>
    ${cur.solved ? `<h3>Next challenge</h3>${diffPicker()}<button class="btn primary" id="startBtn">Give me another</button>` : `<div style="margin-top:20px"><button class="btn" id="skipBtn">Skip this challenge</button><div id="skipConfirm"></div></div>`}`;
  renderHints();
  if (cur.solutionUsed) renderSolutionBlock();
  if (cur.solved) { wireDiff(); $("startBtn").addEventListener("click", startChallenge); }
  $("skipBtn")?.addEventListener("click", () => {
    $("skipConfirm").innerHTML = `<div class="inline-confirm"><span>Skip it? Items you used on it aren't refunded.</span><button class="btn" id="skipYes">Skip</button><button class="btn" id="skipNo">Keep going</button></div>`;
    $("skipYes").addEventListener("click", () => { store.log({ kind: "challenge", id: task.key, title: task.title, skipped: true, attempt: cur.attempts }); S().current = null; store.save(); openPractice(); });
    $("skipNo").addEventListener("click", () => ($("skipConfirm").innerHTML = ""));
  });
}

function renderShop() {
  const st = S();
  const team = st.equipped.teammate || "dot";
  const card = (e) => {
    const has = e.kind === "item" ? true : st.owned[e.id];
    const on = e.slot && st.equipped[e.slot] === e.id;
    const status = e.kind === "item" ? `You have ${st.items[e.id] || 0}` : on ? "Wearing" : st.owned[e.id] ? "Owned" : "";
    const btn = e.kind !== "item" && has
      ? `<button class="btn" data-equip="${e.id}" data-slot="${e.slot}">${on ? "Take off" : "Use"}</button>`
      : `<button class="btn primary" data-buy="${e.id}" ${st.bits < e.price ? "disabled" : ""}>Buy</button>`;
    return `<div class="shop-card"><h4>${esc(e.name)}</h4><p>${esc(e.desc)}</p><div class="row"><span class="price">◆ ${e.price}</span>${btn}</div><span class="owned">${status}</span></div>`;
  };
  const pyro = SHOP.find((e) => e.id === "pyro");
  const teamCard = (id, name, desc) => {
    const owned = id === "dot" || st.owned[id];
    const btn = !owned
      ? `<button class="btn primary" data-buy="${id}" ${st.bits < pyro.price ? "disabled" : ""}>Buy for ◆ ${pyro.price}</button>`
      : team === id ? `<span class="owned">With you now</span>` : `<button class="btn" data-team="${id}">Switch to ${name}</button>`;
    return `<div class="team-card ${team === id ? "active" : ""}"><div class="team-dot" id="team-${id}"></div><div><h4>${name}</h4><p>${desc}</p>${btn}</div></div>`;
  };
  $("briefInner").innerHTML = `<p class="eyebrow">Shop</p><h1>Spend your Bits</h1>
    <p>You have <b>◆ ${st.bits} Bits</b>. Error explanations, typo spotting and the FAQ are always free. Items here are for an extra push, or to make your teammate look sharp.</p>
    <h3>Your teammate</h3>
    <div class="team-grid">
      ${teamCard("dot", "DOT", "Digital Operandi Teammate. Calm, patient, a little goopy.")}
      ${teamCard("pyro", "PYRO", "PYthon Runtime Operative. Fiery, energetic, very competitive.")}
    </div>
    <h3>Help items</h3><div class="shop-grid">${SHOP.filter((e) => e.kind === "item").map(card).join("")}</div>
    <h3>Looks</h3><p class="empty">Wear one hat, one pair of glasses, one moustache and one prop at the same time. Your teammate shows them off while roaming.</p>
    <div class="shop-grid">${SHOP.filter((e) => e.kind === "dot").map(card).join("")}</div>
    <h3>Editor themes</h3><div class="shop-grid">${SHOP.filter((e) => e.kind === "theme").map(card).join("")}</div>`;
  for (const id of ["dot", "pyro"]) {
    const d = new Dot($("team-" + id), { size: 96, skin: id });
    d.setAccessory(wearing());
    d.setMood(team === id ? "happy" : "idle");
  }
  document.querySelectorAll("[data-buy]").forEach((b) => b.addEventListener("click", () => {
    const e = SHOP.find((x) => x.id === b.dataset.buy);
    if (store.buy(e)) {
      toast(`Bought: ${e.name}`);
      if (e.kind === "teammate") {
        store.equip("teammate", e.id);
        applyCosmetics();
        const v = V().switchIn();
        dot.say(v.text, { title: v.title, mood: "celebrate" });
      } else if (e.kind === "item") {
        dot.say(`${e.name} added to your items.`, { mood: "happy" });
      } else {
        dot.say(V().bought(e.name).text, { mood: "happy" });
      }
    }
    renderShop(); renderTop();
  }));
  document.querySelectorAll("[data-equip]").forEach((b) => b.addEventListener("click", () => {
    store.equip(b.dataset.slot, b.dataset.equip);
    applyCosmetics(); renderShop();
  }));
  document.querySelectorAll("[data-team]").forEach((b) => b.addEventListener("click", () => {
    store.equip("teammate", b.dataset.team);
    applyCosmetics();
    const v = V().switchIn();
    dot.say(v.text, { title: v.title, mood: "happy" });
    renderShop();
  }));
}

function faqHtml(list, openId) {
  return list.map((f) => `<details id="faq-${f.id}" ${f.id === openId ? "open" : ""}><summary>${esc(f.q)}<span class="kind">${f.kind === "term" ? "glossary" : ""}</span></summary><div>${f.a}</div></details>`).join("") || `<p class="empty">Nothing matches. Try a shorter word.</p>`;
}
function search(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return FAQ;
  return FAQ.filter((f) => words.every((w) => (f.q + " " + f.tags + " " + f.a).toLowerCase().includes(w)));
}
function renderFaqView() {
  $("briefInner").innerHTML = `<p class="eyebrow">Always free</p><h1>FAQ &amp; glossary</h1>
    <input class="faq-search" id="faqSearch" type="search" placeholder="Search, e.g. f-string, NameError, Bits">
    <div class="faq-list" id="faqList">${faqHtml(FAQ)}</div>`;
  $("faqSearch").addEventListener("input", (e) => ($("faqList").innerHTML = faqHtml(search(e.target.value))));
}
function openFaq(id) {
  const body = $("faqDialogBody");
  body.innerHTML = `<input class="faq-search" id="faqDlgSearch" type="search" placeholder="Search the FAQ"><div class="faq-list" id="faqDlgList">${faqHtml(FAQ, id)}</div>`;
  $("faqDlgSearch").addEventListener("input", (e) => ($("faqDlgList").innerHTML = faqHtml(search(e.target.value))));
  $("faqDialog").showModal();
  document.getElementById("faq-" + id)?.scrollIntoView({ block: "start" });
}

/* ---------- Top bar and rail ---------- */

function renderTop() {
  const st = S(), li = levelFor(modulesDone());
  $("trackSteps").innerHTML = LEVELS.map((l, k) => `<span class="step ${k <= li ? "reached" : ""} ${k === li ? "current" : ""}" title="${l.name}: ${l.modules} module${l.modules === 1 ? "" : "s"} done">${l.name}</span>`).join("");
  const doneLessons = lessonsDoneCount();
  $("trackBar").innerHTML = LEVELS.map((l, k) => {
    const next = LEVELS[k + 1];
    let pct = k < li ? 100 : 0;
    if (k === li && next) {
      // Progress inside the current level: modules done plus lessons into the next module.
      const span = next.modules - l.modules;
      const partial = modulesDone() - l.modules + (doneLessons % ALL_LESSONS.length) / Math.max(1, ALL_LESSONS.length);
      pct = Math.min(100, (partial / span) * 100);
    }
    if (k === li && !next) pct = 100;
    return `<span class="seg"><i style="width:${pct}%"></i></span>`;
  }).join("");
  $("bitsVal").textContent = st.bits;
  $("invVal").textContent = `${st.items.hint}·${st.items.peek}·${st.items.solution}`;
  $("streakVal").textContent = store.streakNow();
  $("hintCount").textContent = st.items.hint;
  $("peekCount").textContent = st.items.peek;
  $("solCount").textContent = st.items.solution;
}

function renderRail() {
  const mods = MODULES.map((m) => {
    if (m.soon) return `<div class="module-soon"><span>${m.id} · ${esc(m.title)}</span><span>Soon</span></div>`;
    const lessons = MODULE_LESSONS(m.id);
    return `<div class="rail-group"><h4>Module ${m.id} · ${esc(m.title)}</h4><ol>${lessons.map((l) => {
      const i = lessonIndex(l.id), done = lessonDone(l.id), open = lessonUnlocked(i);
      const cur = view.kind === "lesson" && view.id === l.id;
      return `<li><button class="rail-item ${done ? "done" : ""}" data-lesson="${l.id}" ${open ? "" : "disabled"} aria-current="${cur}"><span class="n">${done ? "✓" : String(lessons.indexOf(l) + 1).padStart(2, "0")}</span><span class="t">${esc(l.title)}<span class="sub">${done ? `Marked ${S().lessons[l.id].mark}/10` : open ? esc(l.sub) : "Locked"}</span></span></button></li>`;
    }).join("")}</ol></div>`;
  });
  $("moduleList").innerHTML = mods[0] + `<div class="rail-group" style="margin-top:14px"><h4>Coming next</h4>${mods.slice(1).join("")}</div>`;
  const unlocked = lessonDone(ALL_LESSONS[0].id);
  $("practiceBtn").disabled = !unlocked;
  const solved = Object.values(S().solves).reduce((a, b) => a + b, 0);
  $("practiceSub").textContent = unlocked ? `${solved} solved · endless` : "Finish lesson 1 to unlock";
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-current", String(view.kind === b.dataset.view)));
}

$("moduleList").addEventListener("click", (e) => { const b = e.target.closest("[data-lesson]"); if (b && !b.disabled && !busy) openLesson(b.dataset.lesson); });
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { if (!busy && !b.disabled) openView(b.dataset.view); }));

/* ---------- Account and sync ---------- */

let cloud = null;
function renderAccount(user) {
  const a = $("account");
  if (!cloudConfigured()) { a.innerHTML = ""; $("saveState").textContent = "Progress is saved in this browser."; return; }
  if (!user) {
    a.innerHTML = `<button class="btn" id="signInBtn">Sign in with Google</button>`;
    $("signInBtn").addEventListener("click", () => cloud?.signIn().catch((e) => toast("Sign-in didn't work: " + (e.code || e.message))));
    $("saveState").textContent = "Not signed in: progress stays in this browser. Sign in to sync your laptop, desktop and iPad.";
  } else {
    const letter = (user.displayName || user.email || "?").trim()[0].toUpperCase();
    a.innerHTML = `<span class="avatar" title="${esc(user.email || "")}">${esc(letter)}</span><button class="btn ghost" id="signOutBtn">Sign out</button>`;
    $("signOutBtn").addEventListener("click", () => cloud?.signOut());
    $("saveState").textContent = "Signed in: progress syncs across your devices.";
  }
}

store.onChange(() => { renderTop(); });

async function initCloud() {
  renderAccount(null);
  if (!cloudConfigured()) return;
  try {
    await startCloud({
      async onUser(user, api) {
        cloud = api;
        renderAccount(user);
        if (user) {
          store.cloud = api;
          const remote = await api.pull().catch(() => null);
          const used = store.adoptCloud(remote);
          if (used === "cloud") { applyCosmetics(); renderTop(); renderRail(); if (view.kind === "lesson") openLesson(view.id); toast("Progress synced from your account."); }
        } else {
          store.cloud = null;
        }
      },
    });
  } catch (e) {
    $("saveState").textContent = "Couldn't reach the sync service. Progress is saved in this browser.";
  }
}

/* ---------- Start ---------- */

applyCosmetics();
renderTop();
const firstOpen = ALL_LESSONS.find((l, i) => lessonUnlocked(i) && !lessonDone(l.id));
openLesson((firstOpen || ALL_LESSONS[ALL_LESSONS.length - 1]).id);
initCloud();
