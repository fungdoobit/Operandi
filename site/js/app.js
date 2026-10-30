// Operandi: the page. Lessons, practice, shop and FAQ on the left, the editor
// and results on the right, and your teammate (NOVA for now) roaming the
// screen. No AI: every message comes from content/.

import { Dot, DOT_CSS } from "./dot.js";
import { Runner } from "./runner.js";
import { Store } from "./store.js";
import { SHOP, LEVELS, DIFFS, EARN, BOSS, MANA, TIERS, LEVEL, WEAR_SLOTS, levelFor, rewardFor, markFor } from "./economy.js";
import { MODULE_BIOME } from "./enemies.js";
import { BattleStage, pixelateOut } from "./boss-fight.js";
import { sound } from "./sound.js";
import { newFight, difficultyFor, nextSpecial, specialApplies, applySpecial, manaFor, castCard, countersFirewall, specialName } from "./boss-rules.js";
import { Pet } from "./pet.js";
import { NovaMate, NOVA_CSS } from "./pixel/nova-mate.js";
import { PyroMate, PYRO_CSS } from "./pixel/pyro-mate.js";
import { VOICES } from "../content/voices.js";
import { startCloud, cloudConfigured } from "./cloud.js";
import { rng, newSeed } from "./rng.js";
import { MODULES, ALL_LESSONS, ALL_TEMPLATES } from "../content/index.js";
import { HELP, LINT_PENALTY, compareOutput } from "../content/help.js";
import { FAQ } from "../content/faq.js";
import { initPalette } from "./palette.js";
import { wireThemeButton, toggleTheme, isDark, THEME_ICONS } from "./theme.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
// Key caps say ⌘ on Apple devices and Ctrl elsewhere (css: kbd[data-mod]).
document.documentElement.dataset.os = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent) ? "mac" : "pc";
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const PHONE = matchMedia("(max-width: 900px)");
// Moving between pages (a lesson, the Shop...) cross-fades with the View Transitions API where the browser has it.
// Only for moves you make yourself: the render runs a moment later, so code right after it mustn't rely on it.
const swap = (render) => (document.startViewTransition && !REDUCED.matches ? document.startViewTransition(render) : render());

const store = new Store();
const S = () => store.state;

/* ---------- Your teammate ---------- */

// Who you can have (Isaac 2026-10-29: one character while a few people test Modules 1 and 2): NOVA roams with you and
// fights the bosses. PYRO and Kaela are in storage like DOT: hidden everywhere, their code kept. Add an id back here
// to bring them back ("pyro" as a teammate and fighter, "kaela" as a fighter); a save that had them gets them back too.
const ROSTER = ["nova"];
const mate = () => (ROSTER.includes(S().equipped.teammate) ? S().equipped.teammate : ROSTER[0]);
// The Shop's Looks (hats, glasses...) only show on the old DOT body, so they're hidden while testers play (Isaac
// 2026-10-29). Set to true to sell them again; anything already bought stays owned.
const SHOW_LOOKS = false;

const dotStyle = document.createElement("style");
dotStyle.textContent = DOT_CSS + NOVA_CSS + PYRO_CSS;
document.head.append(dotStyle);
const V = () => VOICES[mate()];
const wearing = () => WEAR_SLOTS.map((slot) => S().equipped[slot]).filter(Boolean);
const dot = new Pet({
  skin: mate(),
  accessories: wearing(),
  place: S().pet,
  voice: V,
  onPlace: (p) => { S().pet = p; store.save(); },
});
window.operandiPet = dot;   // for trying things by hand in the console (idles, warps, moods)
// PYRO's "reads your code" idle (pixel/pyro-read.js) asks for the editor and how the last run went
let codeStatus = null, lastEdit = 0;   // codeStatus: { kind: "ok" | "bad", line } after a run, null once you edit
Pet.codeInfo = () => ({ el: document.getElementById("code"), status: codeStatus, lastEdit });
const errLine = (e) => { const m = [...String(e || "").matchAll(/line (\d+)/g)]; return m.length ? +m[m.length - 1][1] : null; };
Pet.hasNova = () => true;   // NOVA counts as won while Isaac tests her (like the Shop's owned checks); with her real unlock this becomes S().owned.nova

function applyCosmetics() {
  dot.setSkin(mate());
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
// A lesson is split into sections, each with its own explanation and task.
// Each section is saved under "<lesson id>.<n>"; the lesson's own record is
// written once its last section passes. (A lesson without sections is one section.)
const sectionsOf = (l) => l.sections || [{ title: l.title, html: l.html, task: l.task }];
const sectionKey = (l, i) => (l.sections ? `${l.id}.${i + 1}` : l.id);
const sectionDone = (l, i) => lessonDone(l.id) || !!S().lessons[sectionKey(l, i)]?.done;
const firstOpenSection = (l) => { const n = sectionsOf(l).findIndex((_, i) => !sectionDone(l, i)); return n < 0 ? 0 : n; };
const lessonsDoneCount = () => ALL_LESSONS.filter((l) => lessonDone(l.id)).length;
const modulesDone = () => Object.keys(S().modulesDone).length;
// Each module ends with a boss: its lessons unlock him, and beating him completes the module.
// foe: the battle stage's model (boss-fight.js); Module 2's is THE ABYSSAL MAW (Mittens, the cat with tentacles in his mouth).
const BOSSES = { 1: { name: "GOLEM", foe: "golem" }, 2: { name: "THE ABYSSAL MAW", foe: "maw" } };
const BOSS_ICON = `<svg class="ico-boss" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3.5 13.5 13M16 3.5 6.5 13M11 15.5l4.5-4.5M4.5 11 9 15.5M3.5 16.5 6 14M16.5 16.5 14 14"/></svg>`;
const bossUnlocked = (m) => MODULE_LESSONS(m).length > 0 && MODULE_LESSONS(m).every((l) => lessonDone(l.id));
const bossBeaten = (m) => !!S().bossWins[m] || !!S().modulesDone[m];

// Which lesson (counted inside its module) a template's topics need. Challenges only use what you've learned.
function requiredLessons(t) {
  let need = 1;
  for (const topic of t.topics) {
    const x = topic.toLowerCase();
    if (t.module === 2) {   // Module 2 topics are named exactly: booleans, comparisons, if, else, elif, and, or, not
      need = Math.max(need, { if: 2, else: 3, elif: 4, and: 5, or: 5, not: 5 }[x] || 1);
      continue;
    }
    if (/f-string|:\.|:,/.test(x)) need = Math.max(need, 5);
    else if (/upper|lower|strip|title|len|index|replace|repetition|joining|string/.test(x)) need = Math.max(need, 4);
    else if (/math|\/\/|%|\+=|division|bracket/.test(x)) need = Math.max(need, 3);
    else if (/variable/.test(x)) need = Math.max(need, 2);
  }
  return need;
}
const lessonsDoneIn = (m) => MODULE_LESSONS(m).filter((l) => lessonDone(l.id)).length;
const availableTemplates = (difficulty) => ALL_TEMPLATES.filter((t) => t.difficulty === difficulty && requiredLessons(t) <= lessonsDoneIn(t.module));

/* ---------- Current task ---------- */

let view = { kind: "lesson", id: ALL_LESSONS[0].id };
let task = null;       // the lesson task or challenge on screen
let lastRun = null;    // last submit's results, used by Peek

function lessonTask(l, i) {
  const sec = sectionsOf(l)[i];
  return { key: sectionKey(l, i), kind: "lesson", lessonId: l.id, section: i, title: l.sections ? `${l.title}: ${sec.title}` : l.title, ...sec.task, expected: null };
}

function challengeTask(cur) {
  const t = ALL_TEMPLATES.find((x) => x.id === cur.templateId);
  const c = t.make(rng(cur.seed));
  return { key: `ch:${cur.templateId}:${cur.seed}`, kind: "challenge", template: t, difficulty: t.difficulty, topics: t.topics, ...c, expected: null };
}

// The record that tracks attempts, hints and so on for the task on screen.
function rec() {
  if (task.kind === "boss") return S().boss.cur;
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
  codeStatus = null; lastEdit = performance.now();
  updateGutter(); armIdle();
  if (dot.figure.dataset.mood === "sleepy") dot.setMood("idle");
  if (S().equipped.prop === "laptop") dot.typing();
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => task && lsSet("operandi:draft:" + task.key, ed.value), 400);
});
ed.addEventListener("scroll", () => ($("gutter").scrollTop = ed.scrollTop));
ed.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); e.shiftKey ? doSubmit() : doRun(); return; }
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
  $("panel-feedback").innerHTML = `<p class="empty">Submit your code and your teammate will mark it out of 10.</p>`;
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
  $("panel-tests").innerHTML = `<ul class="tests">${results.map((x, i) => `<li class="${x.passed ? "ok" : "no"}" style="--i:${i}"><span class="tag">${x.passed ? "PASS" : "FAIL"}</span><span>${esc(x.name)}${!x.passed && x.message ? `<span class="msg">${esc(x.message)}</span>` : ""}${!x.passed && peeked.has(x.name) && x.peek ? `<span class="peeked">Peek: ${esc(x.peek)}</span>` : ""}</span></li>`).join("")}</ul>`;
}

/* ---------- Run ---------- */

let busy = false;
async function doRun() {
  if (busy || !runner.ready || !task) return;
  busy = true;
  try {
    const r = await runner.run(ed.value, { expected: task.expected });
    codeStatus = r.diagnosis || r.error ? { kind: "bad", line: r.diagnosis?.line ?? errLine(r.error) } : { kind: "ok" };
    showOutput(r); showTab("output");
    if (quietTry()) {   // a boss fight: no tips until the third Submit
      if (task.expected && r.lines.join("\n") === task.expected.join("\n")) { const v = V().outputMatches(); dot.say(v.text, { title: v.title, mood: "happy" }); }
    } else if (r.diagnosis) sayHelp(r.diagnosis.id, r.diagnosis, { mood: "worried" });
    else if (task.expected && r.lines.join("\n") === task.expected.join("\n")) { const v = V().outputMatches(); dot.say(v.text, { title: v.title, mood: "happy" }); }
    else if (task.expected) {
      const d = compareOutput(r.lines, task.expected);
      if (d) sayHelp(d.id, d, { mood: "thinking" });
    }
  } catch (e) { toast(e.message); }
  finally { busy = false; }
}

/* ---------- Submit ---------- */

// No tips on the first two Submits in a boss fight (Addendum J). Lessons and practice
// get help straight away (Addendum M: they're not fights any more). Hints and peeks
// always work. tries = Submits so far (including the one just made).
const QUIET_TRIES = 2;
function quietTry(tries = (rec()?.attempts || 0) + 1) { return task?.kind === "boss" && tries <= QUIET_TRIES; }

function isSolved() {
  if (!task) return false;
  if (task.kind === "boss") return false;
  return task.kind === "lesson" ? sectionDone(ALL_LESSONS[lessonIndex(task.lessonId)], task.section) : !!S().current?.solved;
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
    const quiet = quietTry(r.attempts);
    const results = [...run.results, { name: "Output matches the expected output", passed: !run.error && !diff, message: diff ? HELP[diff.id].body(diff) : run.error ? "Your code stopped with an error." : "", peek: "" }];
    if (quiet) for (const x of results) x.message = "";   // only pass / fail, and Python's own error in Output
    lastRun = { results };
    showOutput(run); showTests(results);

    const passedCount = results.filter((x) => x.passed).length;
    const allPass = passedCount === results.length;
    const hardcoded = task.noHardcode && run.lint.find((l) => l.id === "lint-hardcoded");
    const passed = allPass && !hardcoded;
    codeStatus = run.diagnosis || run.error ? { kind: "bad", line: run.diagnosis?.line ?? errLine(run.error) } : passed ? { kind: "ok" } : null;
    const styleLint = run.lint.filter((l) => LINT_PENALTY[l.id]);
    const mark = hardcoded ? 5 : markFor({ passedCount, total: results.length, lintIds: styleLint.map((l) => l.id), attempt: r.attempts, penalties: LINT_PENALTY });

    let rewardLine = "", rewardParts = [];
    if (passed && !already && task.kind !== "boss") {
      const repeat = task.kind === "challenge" && task.difficulty < 3 && (S().solves[`1:${task.difficulty}`] || 0) >= EARN.repeatAfter;
      const rw = rewardFor({ kind: task.kind, difficulty: task.difficulty, attempt: r.attempts, mark, assisted: r.assisted, solved: r.solutionUsed, repeat });
      store.earn(rw.total);
      rewardParts = rw.parts;
      const daily = store.markActiveToday();
      if (daily) rewardParts.push(`+${daily} first pass today`);
      rewardLine = `+${rw.total + daily} Bits`;
      if (task.kind === "lesson") {
        Object.assign(r, { done: true, mark, at: new Date().toISOString() });
        const l = ALL_LESSONS[lessonIndex(task.lessonId)], secs = sectionsOf(l);
        // Last section done: the whole lesson is complete, marked as the average of its sections.
        if (l.sections && secs.every((_, i) => S().lessons[sectionKey(l, i)]?.done)) {
          const avg = Math.round(secs.reduce((a, _, i) => a + (S().lessons[sectionKey(l, i)].mark || 0), 0) / secs.length);
          S().lessons[l.id] = { done: true, mark: avg, at: new Date().toISOString() };
        }
        const moduleId = l.module;
        if (BOSSES[moduleId] && lessonDone(l.id) && bossUnlocked(moduleId) && !bossBeaten(moduleId)) {
          setTimeout(() => toast(`Boss unlocked: ${BOSSES[moduleId].name}. Beat him to complete Module ${moduleId}.`), 600);
        } else if (!BOSSES[moduleId] && lessonDone(l.id) && MODULE_LESSONS(moduleId).every((l) => lessonDone(l.id)) && !S().modulesDone[moduleId]) {
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

    renderFeedback({ passed, mark, rewardLine, rewardParts, run, diff, hardcoded, styleLint, already, attempts: r.attempts, quiet });
    if (passed && task.kind !== "boss") celebrate(rewardLine);
    showTab(passed ? "feedback" : run.error ? "output" : diff ? "tests" : "tests");
    if (quiet && !passed) battle?.say(`${passedCount} of ${results.length} tests passed. No tips on tries 1 and 2 in a fight: read Python's error in Output and the failing tests. From your third Submit I can help again${r.attempts === QUIET_TRIES ? " (that's the next one)" : ""}.`, { title: `Not yet · try ${r.attempts}`, mood: "worried" });
    else if (!passed) dotReact({ passed, mark, rewardLine, run, diff, hardcoded, styleLint, already, attempts: r.attempts, results });
    renderTop(); renderRail();
    if (task.kind === "challenge") renderChallenge();
    if (task.kind === "boss") await bossTurn(passed, mark, r);
    else {
      if (passed && task.kind === "lesson") renderLessonFooter();
      if (passed) dotReact({ passed, mark, rewardLine, run, diff, hardcoded, styleLint, already, attempts: r.attempts, results });
    }
  } catch (e) {
    toast(e.message || "Something went wrong running your code.");
  } finally {
    busy = false;
    $("submitBtn").disabled = !runner.ready;
  }
}

function nextAction() {
  if (task.kind === "lesson") {
    const i = lessonIndex(task.lessonId), l = ALL_LESSONS[i];
    const nextSec = sectionsOf(l)[task.section + 1];
    if (nextSec) return { label: `Next: ${nextSec.title} →`, onClick: () => openLesson(l.id, task.section + 1) };
    const next = ALL_LESSONS[i + 1];
    if ((!next || next.module !== l.module) && BOSSES[l.module] && bossUnlocked(l.module) && !bossBeaten(l.module)) return { label: `Fight ${BOSSES[l.module].name} →`, onClick: () => openBoss(l.module) };
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

function renderFeedback({ passed, mark, rewardLine, rewardParts, run, diff, hardcoded, styleLint, already, attempts, quiet }) {
  let h = `<div class="fb"><div class="fb-head"><div class="score">${mark}<small>/10</small></div><div class="verdict"><span class="pill ${passed ? "ok" : "no"}">${passed ? "Passed" : "Not yet"}</span><span>Attempt ${attempts}</span></div></div>`;
  if (rewardLine) h += `<div class="reward">${esc(rewardLine)} · ${esc(rewardParts.join(" · "))}</div>`;
  if (already && passed) h += `<p class="empty">Already completed, so no extra Bits. Practice challenges keep paying.</p>`;
  if (quiet && !passed) {   // a fight, tries 1 and 2: no explanations
    h += `<p class="empty">No tips on tries 1 and 2 in a fight. Python's own error message is in Output, and Tests shows which tests failed. From your third Submit, the usual help comes back.</p>`;
    $("panel-feedback").innerHTML = h + `</div>`;
    return;
  }
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
  countUp(document.querySelector("#panel-feedback .score"), mark);
}

// The mark counts up from 0 (revamp).
function countUp(el, to) {
  if (!el || REDUCED.matches) return;
  const small = el.querySelector("small")?.outerHTML || "", t0 = performance.now(), ms = 650;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    el.innerHTML = Math.round(to * (1 - Math.pow(1 - k, 3))) + small;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// A pass (revamp): a small burst from the Submit button, and the Bits you earned fly up to the counter.
function celebrate(bitsText) {
  if (REDUCED.matches) return;
  const b = $("submitBtn").getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
  const colours = ["#2f5bd3", "#f2c14e", "#5cc48a", "#f08b78", "#ecebe6", "#8ea8f2"];
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("i");
    p.className = "burst";
    Object.assign(p.style, { left: x + "px", top: y + "px", background: colours[i % colours.length] });
    document.body.append(p);
    const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 90;
    p.animate([
      { transform: "translate(-50%, -50%) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r - 40}px)) scale(.4) rotate(${Math.random() * 540}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.2, .8, .3, 1)" }).finished.then(() => p.remove());
  }
  const m = /\+\d+/.exec(bitsText || ""), target = document.querySelector(".stat.bits");
  if (!m || !target) return;
  const t = target.getBoundingClientRect(), f = document.createElement("span");
  f.className = "fly"; f.textContent = `${m[0]} ◆`;
  Object.assign(f.style, { left: x + "px", top: y + "px" });
  document.body.append(f);
  f.animate([
    { transform: "translate(-50%, -50%) scale(.6)", opacity: 0 },
    { transform: "translate(-50%, -130%) scale(1.1)", opacity: 1, offset: .25 },
    { transform: `translate(calc(-50% + ${t.left + t.width / 2 - x}px), calc(-50% + ${t.top + t.height / 2 - y}px)) scale(.7)`, opacity: .9 },
  ], { duration: 1000, easing: "cubic-bezier(.5, 0, .2, 1)" }).finished.then(() => { f.remove(); target.classList.remove("bump"); void target.offsetWidth; target.classList.add("bump"); });
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
  if (task.kind === "boss") return dot.say("Solutions are switched off in boss fights. Hints and peeks still work, but they cancel your crit.", { title: "No solutions here", mood: "thinking" });
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

function setWorkVisible(on) { $("work").hidden = !on; $("bodyGrid").classList.toggle("no-work", !on); $("paneSwitch").hidden = !on; }
// Phones and iPad portrait show the lesson or the code; the switch at the bottom flips between them.
function setPane(p) {
  $("bodyGrid").dataset.pane = p;
  document.querySelectorAll("#paneSwitch [data-pane]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.pane === p)));
}
$("paneSwitch").addEventListener("click", (e) => { const b = e.target.closest("[data-pane]"); if (b) setPane(b.dataset.pane); });

function wireExamples() {
  document.querySelectorAll("#briefInner pre[data-run]").forEach((pre) => {
    const code = pre.textContent;
    const wrap = document.createElement("div");
    wrap.className = "example";
    const p = document.createElement("pre"); p.textContent = code;
    const bar = document.createElement("div"); bar.className = "bar";
    const btn = document.createElement("button"); btn.type = "button"; btn.textContent = "Run example";
    btn.addEventListener("click", async () => {
      try { const r = await runner.run(code); showOutput(r); showTab("output"); if (PHONE.matches) setPane("code"); } catch (e) { toast(e.message); }
    });
    bar.append(btn); wrap.append(p, bar); pre.replaceWith(wrap);
  });
}

function openLesson(id, section) {
  const l = ALL_LESSONS.find((x) => x.id === id);
  const secs = sectionsOf(l);
  if (section == null) section = firstOpenSection(l);
  view = { kind: "lesson", id, section };
  task = lessonTask(l, section);
  setWorkVisible(true);
  setPane("lesson");
  const sec = secs[section];
  const i = lessonIndex(id), mod = MODULES.find((m) => m.id === l.module);
  crumbs(`Module ${mod.id}`, l.title, ...(l.sections ? [sec.title] : []));
  // Section tabs: done ones are ticked, a section opens once the one before it is done.
  const steps = l.sections ? `<div class="sections" role="tablist" aria-label="Sections">${secs.map((x, n) => {
    const open = n === 0 || sectionDone(l, n - 1);
    return `<button class="sec ${sectionDone(l, n) ? "done" : ""}" data-sec="${n}" role="tab" aria-selected="${n === section}" ${open ? "" : "disabled"}><span class="n">${sectionDone(l, n) ? "✓" : n + 1}</span>${esc(x.title)}</button>`;
  }).join("")}</div>` : "";
  $("briefInner").innerHTML = `<div class="bsay" id="bossSay" hidden></div>
    <p class="eyebrow">Module ${mod.id} · Lesson ${MODULE_LESSONS(l.module).indexOf(l) + 1} of ${MODULE_LESSONS(l.module).length}${l.sections ? ` · Section ${section + 1} of ${secs.length}` : ""}${sectionDone(l, section) ? " · completed" : ""}</p>
    <h1>${esc(l.title)}</h1>
    ${steps}
    ${l.sections ? `<h2 class="sec-title">${esc(sec.title)}</h2>` : ""}
    ${sec.html}
    <div class="task"><h3>Your turn</h3>${sec.task.text}
      <div class="expected"><span>Expected output</span><pre id="expectedBox">…</pre></div>
      <div class="chips"><span class="chip gold">◆ ${EARN.lesson} Bits · ×2 first try without help</span></div>
      <div class="hints" id="hintBox"></div>
      <div id="solutionBox"></div>
    </div>
    ${testFill()}
    <div id="lessonFooter"></div>`;
  calmView();
  $("briefInner").querySelectorAll("[data-sec]").forEach((b) => b.addEventListener("click", () => { if (!busy && !b.disabled) openLesson(id, +b.dataset.sec); }));
  wireExamples();
  $("testFill")?.addEventListener("click", fillAnswer);
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
    dot.say(v.text, { title: v.title, mood: "happy" });
  } else if (!sectionDone(l, section) && section === 0) {
    dot.say(V().lessonIntro(MODULE_LESSONS(l.module).indexOf(l) + 1, l.title).text, { mood: "idle" });
  }
}

function renderLessonFooter() {
  const f = $("lessonFooter");
  if (!f || task?.kind !== "lesson") return;
  const l = ALL_LESSONS[lessonIndex(task.lessonId)];
  const mod = MODULE_LESSONS(l.module);
  // Tick off sections as soon as they pass, and open the next one.
  document.querySelectorAll(".sections .sec").forEach((b) => {
    const n = +b.dataset.sec, done = sectionDone(l, n);
    b.classList.toggle("done", done);
    b.querySelector(".n").textContent = done ? "✓" : n + 1;
    b.disabled = !(n === 0 || sectionDone(l, n - 1));
  });
  if (lessonDone(l.id) && mod[mod.length - 1].id === l.id && BOSSES[l.module] && !bossBeaten(l.module)) {
    f.innerHTML = `<div class="note"><b>Boss unlocked: ${BOSSES[l.module].name}</b>Beat him to complete Module ${l.module}.<div style="margin-top:10px"><button class="btn primary" id="bossGo">Fight ${BOSSES[l.module].name} →</button></div></div>`;
    $("bossGo").addEventListener("click", () => openBoss(l.module));
  }
  else if (lessonDone(l.id) && mod[mod.length - 1].id === l.id) f.innerHTML = `<div class="note"><b>Module ${l.module} complete</b>Keep sharpening your skills in Practice. Module ${l.module + 1} is on its way.</div>`;
  else f.innerHTML = "";
}

function openView(kind) {
  if (kind === "practice") return openPractice();
  leaveBoss();
  view = { kind };
  task = null;
  setWorkVisible(false);
  if (kind === "shop") { crumbs("Shop"); renderShop(); }
  if (kind === "faq") { crumbs("FAQ & glossary"); renderFaqView(); }
  if (kind === "course") { crumbs("Overview"); renderCourseHome(); }
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
    calmView();
    loadEditor();
    prepareTask();
  } else {
    leaveBoss();
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
  crumbs("Practice");
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
    setPane("lesson");
    renderChallenge();
    calmView();
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
  crumbs("Practice", c.title);
  $("briefInner").innerHTML = `<div class="bsay" id="bossSay" hidden></div>
    <p class="eyebrow">Practice · ${DIFFS[c.difficulty]}${cur.solved ? " · solved" : ""}</p>
    <h1>${esc(c.title)}</h1>
    <p>${esc(c.scenario)}</p>
    <div class="task"><h3>Your task</h3><ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="expected"><span>Expected output</span><pre id="expectedBox">${c.expected ? esc(c.expected.join("\n")) : "…"}</pre></div>
      <div class="chips">${c.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}<span class="chip gold">◆ ${EARN.challenge[c.difficulty]} Bits base</span>${cur.attempts ? `<span class="chip">Attempt ${cur.attempts}</span>` : ""}</div>
      <div class="hints" id="hintBox"></div>
      <div id="solutionBox"></div>
    </div>
    ${testFill()}
    ${cur.solved ? `<h3>Next challenge</h3>${diffPicker()}<button class="btn primary" id="startBtn">Give me another</button>` : `<div style="margin-top:20px"><button class="btn" id="skipBtn">Skip this challenge</button><div id="skipConfirm"></div></div>`}`;
  if (battle) battle.sayHost = $("bossSay");
  $("testFill")?.addEventListener("click", fillAnswer);
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
  const team = mate();
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
  const TEAMMATES = [
    ["pyro", "PYRO", "PYthon Runtime Operative. Fiery, energetic, very competitive."],
    ["nova", "NOVA", "A living shadow with blank, glowing eyes. She roams the page with you, helps when you're stuck, and fights the bosses."],
  ].filter(([id]) => ROSTER.includes(id));
  const teamCard = (id, name, desc) => {
    // everyone in the ROSTER is yours from the start (NOVA's planned unlock, GOLEM first try or 1,500 Bits, is on hold)
    const owned = id === "pyro" || id === "nova" || st.owned[id];
    const btn = !owned
      ? `<button class="btn primary" data-buy="${id}" ${st.bits < pyro.price ? "disabled" : ""}>Buy for ◆ ${pyro.price}</button>`
      : team === id ? `<span class="owned">With you now</span>` : `<button class="btn" data-team="${id}">Switch to ${name}</button>`;
    return `<div class="team-card ${team === id ? "active" : ""}"><div class="team-dot" id="team-${id}"></div><div><h4>${name}</h4><p>${desc}</p>${btn}</div></div>`;
  };
  $("briefInner").innerHTML = `<p class="eyebrow">Shop</p><h1>Spend your Bits</h1>
    <p>You have <b>◆ ${st.bits} Bits</b>. Error explanations, typo spotting and the FAQ are always free. Items here give you an extra push${SHOW_LOOKS ? ", or make your teammate look sharp" : ", or a new look for your editor"}.</p>
    ${ROSTER.includes("kaela") ? `<h3>Characters</h3>
    <div class="team-grid">
      <div class="team-card char-card"><img class="char-portrait" src="assets/kaela/portrait-red.png" alt="Kaela's portrait"><div><h4>Kaela</h4><p>A red-haired swordswoman, quick and fierce. She fights the bosses: pick her when a boss fight starts.</p><span class="owned">Yours</span></div></div>
    </div>` : ""}
    <h3>Your teammate</h3>
    <div class="team-grid">
      ${TEAMMATES.map(([id, n, d]) => teamCard(id, n, d)).join("")}
    </div>
    <h3>Help items</h3><div class="shop-grid">${SHOP.filter((e) => e.kind === "item").map(card).join("")}</div>
    ${SHOW_LOOKS ? `<h3>Looks</h3><p class="empty">Wear one hat, one pair of glasses, one moustache and one prop at the same time. (They don't show on NOVA yet.)</p>
    <div class="shop-grid">${SHOP.filter((e) => e.kind === "dot").map(card).join("")}</div>` : ""}
    <h3>Editor themes</h3><div class="shop-grid">${SHOP.filter((e) => e.kind === "theme").map(card).join("")}</div>`;
  for (const [id] of TEAMMATES) {
    const d = id === "nova" ? new NovaMate($("team-" + id), { size: 96, idles: false }) : new PyroMate($("team-" + id), { size: 72, idles: false });
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

/* ---------- Test mode ---------- */

// Lessons and practice are not fights any more (PRD Addendum M, 2026-10-23): the
// roaming companion helps, and each module ends in one boss fight. (The level-fight
// code from Addendum K is in git history.)
// Test mode: a button that fills in a correct answer.
function testFill() { return S().testMode ? `<div class="note"><b>Test mode</b>Fills the editor with a correct answer.<div style="margin-top:10px"><button class="btn" id="testFill">Fill in the answer</button></div></div>` : ""; }
function fillAnswer() { if (!task) return; setCode(task.solution); lsSet("operandi:draft:" + task.key, task.solution); }

/* ---------- Boss fight ---------- */

// The fight's state is S().boss (boss-rules.js newFight). Each challenge is a
// turn: a pass is your strike, a failed Submit is a miss and the boss hits back.
let battle = null;
let battleKey = null;   // which lesson / challenge fight the stage on screen belongs to

// Lessons and practice (Addendum M): no battle band, the roaming companion is back,
// and the forest theme plays if "Music in lessons" is on (off by default).
function calmView() {
  leaveBoss({ keepMusic: true });
  sound.music(sound.settings.lessonMusic ? "forest" : null);
}

// keepMusic: we're going straight into another fight view, so the music carries on.
function leaveBoss({ keepMusic = false } = {}) {
  battle = null; battleKey = null;
  if (!keepMusic) sound.music(null);
  $("arena").hidden = true;
  $("arena").replaceChildren();          // stops the battle's animation loops
  document.querySelector(".body").classList.remove("boss-mode");
  dot.root.style.visibility = "";
  dot.sayOverride = null;
}

// Pick the next challenge: harder as the boss weakens, and one that a pending
// Typo Swarm or Glitch Text can actually be planted in.
function makeBossCur(f) {
  const special = f.pending;
  f.pending = null;
  const pool = ALL_TEMPLATES.filter((t) => t.module === f.module && t.difficulty === difficultyFor(f));
  const fresh = pool.filter((t) => !(f.recent || []).includes(t.id));
  const choices = fresh.length ? fresh : pool;
  for (let tries = 0; tries < 40; tries++) {
    const t = choices[Math.floor(Math.random() * choices.length)], seed = newSeed();
    if (special && tries < 39 && !specialApplies(special, t.make(rng(seed)).starter)) continue;
    f.recent = [t.id, ...(f.recent || [])].slice(0, 8);
    const fits = !special || specialApplies(special, t.make(rng(seed)).starter);
    return { templateId: t.id, seed, attempts: 0, hints: 0, assisted: false, solutionUsed: false, peeked: [], special: fits ? special : null };
  }
}

function bossTask(cur) {
  const base = challengeTask(cur);
  const t = { ...base, kind: "boss", key: `boss:${cur.templateId}:${cur.seed}` };
  if (cur.special) { const m = applySpecial(cur.special, base.starter, rng(cur.seed + 7)); t.starter = m.starter; t.specialNote = m.note; }
  return t;
}

function startFight(m) {
  S().bossFights[m] = (S().bossFights[m] || 0) + 1;
  const f = newFight(m, S().bossFights[m]);
  f.cur = makeBossCur(f);
  S().boss = f;
  store.save();
}

// again: a fresh fight from the result screen, so the entrance plays again.
async function openBoss(m = 1, { again = false } = {}) {
  if (busy || !bossUnlocked(m)) return;
  const entering = view.kind !== "boss" || again;
  sound.music("battle");   // the music starts with the transition
  // The entry transition: the page breaks up into big blocks, then the arena resolves.
  if (entering && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    busy = true;
    try { await pixelateOut($("briefInner")); } finally { busy = false; $("briefInner").style.filter = ""; }
  }
  leaveBoss({ keepMusic: true });
  view = { kind: "boss", module: m };
  let f = S().boss;
  if (!f || f.module !== m) { if (bossBeaten(m)) return renderBossPanel("beaten"); startFight(m); f = S().boss; }
  // a fresh fight (or a rematch): pick who goes in; a fighter now in storage hands over to your teammate
  if (f.fighter && !ROSTER.includes(f.fighter)) { f.fighter = mate(); store.save(); }
  if (!f.fighter) {
    if (f.turn > 0 || f.cur.attempts || ROSTER.length < 2) f.fighter = mate();   // a fight saved before the picker existed, or only one fighter
    else { f.fighter = await chooseFighter(m); if (view.kind !== "boss") return; }
    store.save();
  }
  // the page was closed while the Maw's Constrict was squeezing: that counts as too slow
  if (f.squeeze) { f.me = Math.max(0, f.me - f.squeeze); f.squeeze = 0; if (f.me <= 0) f.over = "lost"; store.save(); }
  renderBossStage({ entering });
  if (f.over === "lost") return renderBossPanel("lost");
  task = bossTask(f.cur);
  setWorkVisible(true);
  renderBossBody();
  loadEditor();
  prepareTask();
  renderRail();
  $("brief").scrollTop = 0;
  if (entering) battle.intro();
  // A pass was saved but no card picked yet (the page was closed): back to the hand.
  if (f.hand) { busy = true; castTurn().finally(() => { busy = false; }); return; }
  battle.say(f.turn === 0 && !f.cur.attempts
    ? `Every challenge you pass gives mana: ${MANA.flawless} for a flawless pass (10/10 on your first Submit, no hints or peeks), less otherwise. Mana saves up to ${MANA.cap}. Then you pick an ability card to cast: the basic strike is free, bigger ones cost mana and rest for a few turns. A flawless pass makes it a crit (×${BOSS.critTimes}) and staggers him; otherwise he strikes back for ${BOSS.strikeBack}. A failed Submit is a miss: he hits for ${BOSS.bossHit}. No tips on your first two tries of each challenge. Run is free: only Submit counts.`
    : "Welcome back. The fight's right where you left it.", { title: f.turn === 0 && !f.cur.attempts ? `${BOSSES[m].name} blocks the way` : "Fight resumed", mood: "fierce" });
}

// Who fights the boss (Addendum M): anyone in the ROSTER. The last pick is remembered. (Skipped with only one.)
function chooseFighter(m) {
  const st = S(), name = BOSSES[m].name;
  const owned = (id) => ROSTER.includes(id);
  const all = [
    ["kaela", "Kaela", "A red-haired swordswoman. Fast blade cuts, a blood orb and a skyfall slam."],
    ["pyro", "PYRO", "Fire: embers, eruptions and a sunfire halo."],
    ["nova", "NOVA", "Void: shadow bolts, grasping hands, chains and Planetfall."],
  ].filter(([id]) => owned(id));
  const last = all.some(([id]) => id === st.lastFighter) ? st.lastFighter : all[0][0];
  setWorkVisible(false);
  $("arena").hidden = true;
  $("briefInner").innerHTML = `<p class="eyebrow">Module ${m} · Boss fight</p><h1>Who fights ${esc(name)}?</h1>
    <p>Pick your fighter. Each one has their own seven ability cards.</p>
    <div class="team-grid pick-grid">${all.map(([id, n, d]) => `<button class="team-card pick ${id === last ? "active" : ""}" data-fighter="${id}">
      ${id === "kaela" ? `<img class="char-portrait" src="assets/kaela/portrait-red.png" alt="">` : `<div class="team-dot" id="pick-${id}"></div>`}
      <div><h4>${n}</h4><p>${d}</p></div></button>`).join("")}</div>`;
  for (const [id] of all) if (id !== "kaela") id === "nova" ? new NovaMate($(`pick-${id}`), { size: 96, idles: false }) : new PyroMate($(`pick-${id}`), { size: 72, idles: false });
  return new Promise((res) => $("briefInner").querySelectorAll("[data-fighter]").forEach((b) => b.addEventListener("click", () => {
    st.lastFighter = b.dataset.fighter; res(b.dataset.fighter);
  })));
}

// entering: the fight is starting, so the entrance plays (the Maw is still called MITTENS until he opens his mouth).
function renderBossStage({ entering = false } = {}) {
  const f = S().boss;
  $("briefInner").innerHTML = `<div class="bsay" id="bossSay" hidden></div><p class="eyebrow">Module ${view.module} · Boss fight${f && f.number > 1 ? ` · attempt ${f.number}` : ""}</p><div id="bossBody"></div>`;
  // The battle sits in its own band across the top, so it stays in view while
  // you scroll the instructions and type.
  $("arena").hidden = false;
  $("bodyGrid").classList.add("boss-mode");
  crumbs(`Module ${view.module}`, `Boss: ${BOSSES[view.module].name}`);
  battle = new BattleStage($("arena"), $("bossSay"), { skin: ROSTER.includes(f?.fighter) ? f.fighter : mate(), accessories: wearing(), name: BOSSES[view.module].name, foe: BOSSES[view.module].foe, entering });
  if (f) battle.hp(f.me, f.foe); else battle.hp(BOSS.hp, BOSS.hp);
  battle.mana(f?.mana || 0);
  if (f?.dome) battle.restoreDome();
  // Your roaming teammate steps into the arena: messages show under the stage.
  dot.root.style.visibility = "hidden";
  dot.sayOverride = (text, opts) => battle?.say(text, opts);
}

function renderBossBody() {
  const f = S().boss, c = task, name = BOSSES[f.module].name;
  const shield = specialName("firewall", f.module);
  const banners = [c.specialNote, f.dome ? `${name}'s ${shield} is up: every hit is halved until a crit or a card that breaks it smashes it.` : ""].filter(Boolean);
  $("bossBody").innerHTML = `${banners.map((b) => `<div class="bspecial">${esc(b)}</div>`).join("")}
    <h1>${esc(c.title)}</h1>
    <p>${esc(c.scenario)}</p>
    <div class="task"><h3>Your task</h3><ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="expected"><span>Expected output</span><pre id="expectedBox">${c.expected ? esc(c.expected.join("\n")) : "…"}</pre></div>
      <div class="chips">${c.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}<span class="chip gold">Pass: up to ${MANA.flawless} mana · flawless = crit</span>${f.cur.attempts ? `<span class="chip">Attempt ${f.cur.attempts}</span>` : ""}</div>
      <div class="hints" id="hintBox"></div>
      <div id="solutionBox"></div>
    </div>
    ${S().testMode ? `<div class="note"><b>Test mode</b>Fills the editor with a correct answer. Submit it to strike, or submit the starter code as it is to see a miss.<div style="margin-top:10px"><button class="btn" id="testFill">Fill in the answer</button></div></div>` : ""}`;
  $("testFill")?.addEventListener("click", () => { setCode(task.solution); lsSet("operandi:draft:" + task.key, task.solution); });
  renderHints();
}

// One turn of the fight, after a Submit. The new state is saved before the
// animation plays, so closing the page mid-fight loses nothing.
async function bossTurn(passed, mark, r) {
  const f = S().boss, name = BOSSES[f.module].name;
  if (!battle || !f) return;
  if (!passed) {
    f.me = Math.max(0, f.me - BOSS.bossHit);
    if (f.me <= 0) f.over = "lost";
    store.save();
    await battle.counter(BOSS.bossHit, () => battle.hp(f.me, f.foe), { miss: true });
    if (f.over === "lost") { await battle.defeat(); renderBossPanel("lost"); }
    else renderBossBody();
    return;
  }
  // A pass gives mana by how clean it was (it saves up, to a cap); then you
  // pick an ability card. Saved first, so a reload brings the hand back.
  const flawless = mark === 10 && r.attempts === 1 && !r.assisted;
  const gain = manaFor(mark, r);
  f.mana = Math.min(MANA.cap, (f.mana || 0) + gain);
  f.hand = { mark, flawless, gain };
  store.save();
  await castTurn();
}

// The card hand, then the cast ability plays out and the turn finishes.
async function castTurn() {
  const f = S().boss, name = BOSSES[f.module].name, { mark, flawless, gain } = f.hand;
  battle.mana(f.mana);
  const v = V().passed(mark);
  const why = !flawless && mark === 10 ? " (A crit needs 10/10 on the first Submit with no hints or peeks.)" : "";
  battle.say(`${flawless ? "Flawless: whatever you cast now is a critical hit!" : v.text + why} Pick an ability card.`, { title: `${mark}/10 · +${gain} mana`, mood: "fierce" });
  const card = await battle.pickCard(f, { gain, crit: flawless, dome: f.dome });
  const strike = castCard(f, card, { crit: flawless });
  f.hand = null;
  f.foe = Math.max(0, f.foe - strike.dmg);
  f.turn += 1;
  if (strike.result === "crit" || countersFirewall(card)) f.dome = false;   // only a crit or a counter card breaks the Firewall
  // He strikes back after every hit, unless it was a crit (that staggers him). The Abyssal Maw's strike back can be his
  // Constrict instead (once a fight): its hit waits in f.squeeze until you answer its quick test.
  let back = f.foe > 0 && strike.result !== "crit" ? BOSS.strikeBack : 0;
  const squeeze = back && battle.maw && !f.constricted && f.turn >= 2 && Math.random() < BOSS.constrictChance ? BOSS.constrictHit : 0;
  if (squeeze) { back = 0; f.constricted = true; f.squeeze = squeeze; }
  f.me = Math.max(0, f.me - back);
  if (f.foe <= 0) f.over = "won"; else if (f.me <= 0) f.over = "lost";
  const special = f.over ? null : nextSpecial(f);
  if (special) { f.lastSpecial = special; if (special === "firewall") f.dome = true; else f.pending = special; }
  const reward = f.over === "won" ? winFight(f) : null;
  if (!f.over) f.cur = makeBossCur(f);
  store.save();
  battle.mana(f.mana);
  battle.say(strike.result === "crit" ? `${card.name}: critical hit!` : strike.result === "blocked" ? `${card.name}. The ${battle.shield} soaked up half of it.` : `${card.name}!`, { title: `${strike.dmg} damage`, mood: "fierce" });
  // The save already counts his strike back; the bars show each hit as it lands.
  await battle.attack(strike, () => battle.hp(f.me + back, f.foe), card, { lethal: f.foe <= 0 });
  if (reward) { await battle.victory(); renderBossPanel("won", reward); renderTop(); renderRail(); return; }
  if (squeeze) {
    const free = await battle.constrict(squeeze, () => battle.hp(Math.max(0, f.me - squeeze), f.foe), { ms: BOSS.constrictMs });
    f.squeeze = 0;
    if (!free) { f.me = Math.max(0, f.me - squeeze); if (f.me <= 0) f.over = "lost"; }
    store.save();
  } else if (back) await battle.counter(back, () => battle.hp(f.me, f.foe));
  else battle.staggered();
  if (f.over === "lost") { await battle.defeat(); renderBossPanel("lost"); return; }
  if (special) await battle.special(special);
  task = bossTask(f.cur);
  renderBossBody();
  loadEditor();
  prepareTask();
  const shield = specialName("firewall", f.module);
  if (special && special !== "firewall") corruptEditor(special);
  if (special === "firewall") battle.say(`The ${shield} halves every hit until it's broken. Only a crit (10/10 on the first Submit, no hints or peeks) or a card that breaks it smashes it.`, { title: `${name} raised the ${shield}`, mood: "worried" });
  else if (special) battle.say(task.specialNote, { title: `${specialName(special, f.module)}!`, mood: "worried" });
}

// The special lands in your code: the editor jolts and flashes as the corrupted starter arrives.
function corruptEditor(kind) {
  const c = { typos: "255,77,126", glitch: "95,227,255" }[kind] || "245,154,144";   // the Maw's: the rose of his tentacles
  document.querySelector(".editor").animate([
    { transform: "none", boxShadow: `inset 0 0 0 0 rgba(${c},0)` },
    { transform: "translateX(-8px)", boxShadow: `inset 0 0 0 3px rgba(${c},.9)`, filter: "hue-rotate(40deg) saturate(2)" },
    { transform: "translateX(6px) skewX(-2deg)", filter: "invert(.12)" },
    { transform: "translateX(-4px)", boxShadow: `inset 0 0 0 2px rgba(${c},.6)` },
    { transform: "translateX(2px)", filter: "none" },
    { transform: "none", boxShadow: `inset 0 0 0 0 rgba(${c},0)` },
  ], { duration: 650, easing: "ease-out" });
}

// Rewards for a win: Bits (first try or retry), the module, the level.
function winFight(f) {
  const m = f.module, already = !!S().bossWins[m];
  const firstTry = !already && f.number === 1;
  const lines = [];
  let bits = 0;
  if (!already) { bits += firstTry ? BOSS.reward.firstTry : BOSS.reward.retry; lines.push(`+${bits} Bits for ${firstTry ? "a first-try win" : "the win"}`); }
  let levelUp = null;
  if (!S().modulesDone[m]) {
    const before = levelFor(modulesDone());
    S().modulesDone[m] = new Date().toISOString();
    bits += EARN.moduleComplete;
    lines.push(`+${EARN.moduleComplete} Bits: Module ${m} complete`);
    const after = levelFor(modulesDone());
    if (after > before) levelUp = LEVELS[after].name;
  }
  store.earn(bits);
  if (!already) S().bossWins[m] = { at: new Date().toISOString(), firstTry, number: f.number };
  S().boss = null;
  return { lines, levelUp, firstTry, already };
}

function renderBossPanel(kind, reward) {
  const m = view.module, name = BOSSES[m].name;
  task = null;
  setWorkVisible(false);
  if (!$("bossBody")) renderBossStage();
  let h = "";
  if (kind === "won") {
    h = `<h1>${name} defeated!</h1>
      ${reward.lines.length ? `<div class="note"><b>Rewards</b><ul>${reward.lines.map((l) => `<li>${esc(l)}</li>`).join("")}${reward.levelUp ? `<li>Level up: you're now <b>${esc(reward.levelUp)}</b></li>` : ""}</ul></div>` : `<p>A rematch win. Rewards only come from the first win.</p>`}
      ${reward.already ? "" : m === 2 ? `<p class="empty">The tentacles are gone and Mittens is just a cat again, purring. He wants to come with you: Mittens joins you as a roaming companion as soon as he's ready.</p>` : `<p class="empty">${reward.firstTry ? `${name}'s exclusive accessory is still being designed. You won on your first try, so it's yours as soon as it's ready.` : `${name}'s exclusive accessory is still being designed. It'll be in the Shop for ${BOSS.exclusivePrice.toLocaleString()} Bits once it's ready (a first-try win would have given it free).`}</p>`}
      <button class="btn primary" id="bossNext">Practice challenges →</button>`;
    if (reward.levelUp) setTimeout(() => toast(`Level up: you're now ${reward.levelUp}!`), 400);
  } else if (kind === "lost") {
    h = `<h1>${name} won this round</h1><p>Losing costs nothing. Your HP and his are reset, and you get a fresh set of challenges.</p>
      <button class="btn primary" id="bossAgain">Fight again</button>`;
  } else {
    h = `<h1>${name} is defeated</h1><p>You've already beaten him. A rematch is just for fun: no rewards.</p>
      <button class="btn primary" id="bossAgain">Rematch</button>`;
  }
  $("bossBody").innerHTML = h;
  $("bossNext")?.addEventListener("click", () => openView("practice"));
  $("bossAgain")?.addEventListener("click", () => { startFight(m); openBoss(m, { again: true }); });
  renderRail();
}

/* ---------- Top bar and rail ---------- */

// Where you are, in the top bar: "Course / Module 1 / Your first program / Printing text". "Course" opens the overview.
function crumbs(...parts) {
  $("crumbs").innerHTML = [`<button type="button" data-crumb="course">Course</button>`,
    ...parts.map((p, i) => `<span class="${i === parts.length - 1 ? "here" : ""}">${esc(p)}</span>`)].join(`<span class="sep">/</span>`);
}
$("crumbs").addEventListener("click", (e) => { if (e.target.closest("[data-crumb]") && !busy) swap(() => openView("course")); });

// The course overview (revamp): where to carry on, your numbers, and each module as a path of lessons ending in its boss.
function renderCourseHome() {
  const st = S(), li = levelFor(modulesDone());
  const nextIdx = ALL_LESSONS.findIndex((l, i) => lessonUnlocked(i) && !lessonDone(l.id));
  const readyBoss = MODULES.find((m) => BOSSES[m.id] && bossUnlocked(m.id) && !bossBeaten(m.id));
  let go;
  if (readyBoss && (nextIdx < 0 || ALL_LESSONS[nextIdx].module > readyBoss.id)) {
    go = { k: `Module ${readyBoss.id} · Boss fight`, title: `Fight ${BOSSES[readyBoss.id].name}`, sub: "Every lesson in this module is done. Time for the boss.", btn: "Fight →", m: readyBoss.id, run: () => openBoss(readyBoss.id) };
  } else if (nextIdx >= 0) {
    const l = ALL_LESSONS[nextIdx], ml = MODULE_LESSONS(l.module);
    go = { k: `Module ${l.module} · Lesson ${ml.indexOf(l) + 1} of ${ml.length}`, title: l.title, sub: l.sub, btn: lessonsDoneCount() ? "Continue →" : "Start →", m: l.module, run: () => swap(() => openLesson(l.id)) };
  } else {
    go = { k: "Every lesson done", title: "Practice challenges", sub: "Keep sharpening your skills: fresh challenges every time.", btn: "Practice →", m: null, run: () => swap(() => openView("practice")) };
  }
  const pct = go.m ? Math.round((lessonsDoneIn(go.m) / MODULE_LESSONS(go.m).length) * 100) : 100;
  const mods = MODULES.filter((m) => !m.soon).map((m) => {
    const ls = MODULE_LESSONS(m.id), B = BOSSES[m.id];
    const nodes = ls.map((l, n) => {
      const done = lessonDone(l.id), open = lessonUnlocked(lessonIndex(l.id)), cur = open && !done;
      return `<button type="button" class="node ${done ? "done" : ""} ${cur ? "cur" : ""}" data-lesson="${l.id}" ${open ? "" : "disabled"}><span class="orb">${done ? "✓" : n + 1}</span><span class="lbl">${esc(l.title)}<small>${done ? `Marked ${st.lessons[l.id].mark}/10` : cur ? "Up next" : "Locked"}</small></span></button>`;
    }).join("");
    const bossNode = !B ? "" : `<button type="button" class="node boss ${bossBeaten(m.id) ? "done" : ""} ${bossUnlocked(m.id) && !bossBeaten(m.id) ? "cur" : ""}" data-boss="${m.id}" ${bossUnlocked(m.id) ? "" : "disabled"}><span class="orb">${bossBeaten(m.id) ? "✓" : BOSS_ICON}</span><span class="lbl">${esc(B.name)}<small>${bossBeaten(m.id) ? "Defeated" : bossUnlocked(m.id) ? "Ready to fight" : "The boss"}</small></span></button>`;
    return `<section class="ov-mod spot"><header><h3>Module ${m.id} · ${esc(m.title)}</h3><span>${lessonsDoneIn(m.id)}/${ls.length} lessons${B ? ` · boss ${bossBeaten(m.id) ? "beaten" : "ahead"}` : ""}</span></header><div class="path">${nodes}${bossNode}</div></section>`;
  }).join("");
  const soon = MODULES.filter((m) => m.soon);
  $("briefInner").innerHTML = `<p class="eyebrow">Course overview</p><h1>Your path through Python</h1>
    <div class="ov-hero spot"><div class="k">${esc(go.k)}</div><h2>${esc(go.title)}</h2><p>${esc(go.sub || "")}</p>${go.m ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}<button class="btn primary" id="ovGo">${go.btn}</button></div>
    <div class="ov-stats">
      <div class="ov-stat spot"><b>${LEVELS[li].name}</b><span>Level</span></div>
      <div class="ov-stat spot"><b>◆ ${st.bits}</b><span>Bits</span></div>
      <div class="ov-stat spot"><b>${store.streakNow()}</b><span>Day streak</span></div>
      <div class="ov-stat spot"><b>${lessonsDoneCount()}/${ALL_LESSONS.length}</b><span>Lessons done</span></div>
    </div>
    ${mods}
    ${soon.length ? `<section class="ov-mod soon"><header><h3>Coming next</h3><span>${soon.length} modules</span></header><p class="empty">${soon.map((m) => `${m.id} · ${esc(m.title)}`).join(" &nbsp;·&nbsp; ")}</p></section>` : ""}`;
  $("ovGo").addEventListener("click", () => { if (!busy) go.run(); });
  $("briefInner").querySelectorAll(".node").forEach((b) => b.addEventListener("click", () => {
    if (b.disabled || busy) return;
    if (b.dataset.lesson) swap(() => openLesson(b.dataset.lesson)); else openBoss(+b.dataset.boss);
  }));
}

// The command palette (Ctrl/Cmd+K, or /): what's in it right now, filtered by the words typed.
const palette = initPalette({ items: paletteItems });
function paletteItems(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
  const add = (group, it) => { if (!words.length || words.every((w) => `${it.label} ${it.sub || ""} ${group} ${it.tags || ""}`.toLowerCase().includes(w))) out.push({ group, ...it }); };
  const go = (fn) => () => { if (!busy) swap(fn); };
  if (!$("work").hidden && task) {
    add("Actions", { label: "Run my code", icon: "▶", keys: { mod: true, key: "↵" }, run: doRun, tags: "execute" });
    add("Actions", { label: "Submit for a mark", icon: "✓", keys: { mod: true, shift: true, key: "↵" }, run: doSubmit, tags: "check mark" });
    add("Actions", { label: "Use a hint", sub: `${S().items.hint} left`, icon: "?", run: useHint });
    add("Actions", { label: "Peek at a failing test", sub: `${S().items.peek} left`, icon: "◎", run: usePeek });
    add("Actions", { label: "Reset this task's code", icon: "↺", run: () => $("resetBtn").click() });
  }
  add("Go to", { label: "Course overview", icon: "⌂", run: go(() => openView("course")), tags: "home dashboard progress path" });
  if (!$("practiceBtn").disabled) add("Go to", { label: "Practice challenges", icon: "∞", run: go(() => openView("practice")), tags: "challenge" });
  add("Go to", { label: "Shop", sub: `◆ ${S().bits} Bits`, icon: "◆", run: go(() => openView("shop")), tags: "buy hints items themes" });
  add("Go to", { label: "FAQ & glossary", icon: "?", run: go(() => openView("faq")), tags: "help" });
  ALL_LESSONS.forEach((l, i) => {
    if (lessonUnlocked(i)) add("Lessons", { label: l.title, sub: `Module ${l.module}${lessonDone(l.id) ? " · done" : ""}`, icon: lessonDone(l.id) ? "✓" : String(MODULE_LESSONS(l.module).indexOf(l) + 1), run: go(() => openLesson(l.id)), tags: l.sub });
  });
  MODULES.forEach((m) => { if (BOSSES[m.id] && bossUnlocked(m.id)) add("Lessons", { label: `Boss: ${BOSSES[m.id].name}`, sub: `Module ${m.id}${bossBeaten(m.id) ? " · beaten" : ""}`, icon: "⚔", run: () => { if (!busy) openBoss(m.id); }, tags: "fight" }); });
  add("Settings", { label: `Switch to ${isDark() ? "light" : "dark"} mode`, icon: isDark() ? "☀" : "☾", run: () => toggleTheme($("themeBtn")), tags: "theme dark light night" });
  const s = sound.settings;
  add("Settings", { label: `${s.music ? "Turn off" : "Turn on"} music`, icon: "♪", run: () => $("setMusic").click(), tags: "sound" });
  add("Settings", { label: `${s.sfx ? "Turn off" : "Turn on"} sound effects`, icon: "♫", run: () => $("setSfx").click(), tags: "sound" });
  add("Settings", { label: `${$("setRoam").checked ? "Keep" : "Let"} ${V().name} ${$("setRoam").checked ? "still" : "roam the screen"}`, icon: "✦", run: () => $("setRoam").click(), tags: "companion pet" });
  if (words.length) search(q).slice(0, 6).forEach((f) => out.push({ group: "FAQ", label: f.q, icon: f.kind === "term" ? "Aa" : "?", run: () => openFaq(f.id) }));
  return out;
}
$("cmdkBtn").addEventListener("click", () => palette.open());
$("themeBtn").innerHTML = THEME_ICONS; wireThemeButton($("themeBtn"));
document.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey, typing = e.target.closest?.("input, textarea, select, [contenteditable]");
  if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); palette.isOpen ? palette.close() : palette.open(); return; }
  if (e.key === "/" && !typing && !document.querySelector("dialog[open]")) { e.preventDefault(); palette.open(); return; }
  // Run and Submit from anywhere on the page (the editor handles its own keys)
  if (mod && e.key === "Enter" && e.target !== ed && !$("work").hidden && !document.querySelector("dialog[open]")) { e.preventDefault(); e.shiftKey ? doSubmit() : doRun(); }
});

// The cursor spotlight on cards: the soft glow follows the pointer (css: .spot::after).
document.addEventListener("pointermove", (e) => {
  const el = e.target.closest?.(".spot, .task, .shop-card, .team-card");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}, { passive: true });

// The level, Bits and streak at the top of the course list.
function renderTop() {
  const st = S(), li = levelFor(modulesDone()), l = LEVELS[li], next = LEVELS[li + 1];
  // Progress inside the current level: modules done plus lessons into the next module.
  let pct = 100;
  if (next) {
    const cur = MODULES.find((m) => !m.soon && !S().modulesDone[m.id]), n = cur ? MODULE_LESSONS(cur.id).length : 1;
    const partial = modulesDone() - l.modules + (cur ? lessonsDoneIn(cur.id) % n : 0) / n;
    pct = Math.min(100, (partial / (next.modules - l.modules)) * 100);
  }
  $("lvl").innerHTML = `<div class="lvl-row"><b>${l.name}</b><span>${next ? `next: ${next.name}` : "top level"}</span></div><div class="lvl-bar" title="Levels: ${LEVELS.map((x) => x.name).join(" → ")}"><i style="width:${pct}%"></i></div>`;
  $("bitsVal").textContent = st.bits;
  $("streakVal").textContent = store.streakNow();
  $("hintCount").textContent = st.items.hint;
  $("peekCount").textContent = st.items.peek;
  $("solCount").textContent = st.items.solution;
}

function renderRail() {
  const mods = MODULES.map((m) => {
    if (m.soon) return `<div class="module-soon"><span>${m.id} · ${esc(m.title)}</span><span>Soon</span></div>`;
    const lessons = MODULE_LESSONS(m.id);
    const B = BOSSES[m.id], f = S().boss;
    const bossItem = !B ? "" : `<li><button class="rail-item boss ${bossBeaten(m.id) ? "done" : ""}" data-boss="${m.id}" ${bossUnlocked(m.id) ? "" : "disabled"} aria-current="${view.kind === "boss" && view.module === m.id}"><span class="n">${bossBeaten(m.id) ? "✓" : BOSS_ICON}</span><span class="t">Boss: ${B.name}<span class="sub">${bossBeaten(m.id) ? "Defeated" : !bossUnlocked(m.id) ? "Finish the lessons to unlock" : f?.module === m.id && !f.over ? `Fight in progress · ${f.foe} HP left` : "Ready to fight"}</span></span></button></li>`;
    return `<div class="rail-group"><h4>Module ${m.id} · ${esc(m.title)}</h4><ol>${lessons.map((l) => {
      const i = lessonIndex(l.id), done = lessonDone(l.id), open = lessonUnlocked(i);
      const cur = view.kind === "lesson" && view.id === l.id;
      return `<li><button class="rail-item ${done ? "done" : ""}" data-lesson="${l.id}" ${open ? "" : "disabled"} aria-current="${cur}"><span class="n">${done ? "✓" : String(lessons.indexOf(l) + 1).padStart(2, "0")}</span><span class="t">${esc(l.title)}<span class="sub">${done ? `Marked ${S().lessons[l.id].mark}/10` : !open ? "Locked" : l.sections && sectionDone(l, 0) ? `Section ${firstOpenSection(l) + 1} of ${l.sections.length}` : esc(l.sub)}</span></span></button></li>`;
    }).join("")}${bossItem}</ol></div>`;
  });
  const live = mods.filter((_, i) => !MODULES[i].soon), soon = mods.filter((_, i) => MODULES[i].soon);
  $("moduleList").innerHTML = live.join("") + `<div class="rail-group" style="margin-top:14px"><h4>Coming next</h4>${soon.join("")}</div>`;
  const unlocked = lessonDone(ALL_LESSONS[0].id);
  $("practiceBtn").disabled = !unlocked;
  const solved = Object.values(S().solves).reduce((a, b) => a + b, 0);
  $("practiceSub").textContent = unlocked ? `${solved} solved · endless` : "Finish lesson 1 to unlock";
  document.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-current", String(view.kind === b.dataset.view)));
}

$("moduleList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lesson]"); if (b && !b.disabled && !busy) { closeDrawer(); openLesson(b.dataset.lesson); }
  const bb = e.target.closest("[data-boss]"); if (bb && !bb.disabled && !busy) { closeDrawer(); openBoss(+bb.dataset.boss); }
});
document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { if (!busy && !b.disabled) { closeDrawer(); openView(b.dataset.view); } }));

// The course list (rail): on wide screens the ☰ button collapses it (remembered);
// up to 1400px (iPad and smaller) it's hidden and the button slides it in over the page.
const NARROW = matchMedia("(max-width: 1400px)");
const appEl = document.querySelector(".app");
const railOpen = () => (NARROW.matches ? appEl.classList.contains("rail-open") : !appEl.classList.contains("rail-closed"));
function setRail(open) {
  if (NARROW.matches) {
    appEl.classList.toggle("rail-open", open); appEl.classList.remove("rail-closed");
    $("railBackdrop").hidden = !open;
  } else {
    appEl.classList.toggle("rail-closed", !open); appEl.classList.remove("rail-open");
    $("railBackdrop").hidden = true;
    lsSet("operandi:rail", open ? "open" : "closed");
  }
  $("railToggle").setAttribute("aria-expanded", String(open));
}
function closeDrawer() { if (NARROW.matches) setRail(false); }
$("railToggle").addEventListener("click", () => setRail(!railOpen()));
$("railBackdrop").addEventListener("click", () => setRail(false));
// Settings in the course list: music and sound effects (on/off and volume,
// saved per device by sound.js) and whether your teammate roams the screen.
function wireSettings() {
  const s = sound.settings;
  const bind = (sw, vol, onKey, volKey) => {
    $(sw).checked = s[onKey]; $(vol).value = Math.round(s[volKey] * 100); $(vol).disabled = !s[onKey];
    $(sw).addEventListener("change", () => { sound.set({ [onKey]: $(sw).checked }); $(vol).disabled = !$(sw).checked; });
    $(vol).addEventListener("input", () => sound.set({ [volKey]: $(vol).value / 100 }));
  };
  bind("setMusic", "setMusicVol", "music", "musicVol");
  $("setLessonMusic").checked = s.lessonMusic;
  $("setLessonMusic").addEventListener("change", () => { sound.set({ lessonMusic: $("setLessonMusic").checked }); sound.unlock(); if (!battle) sound.music(s.lessonMusic ? "forest" : null); });
  bind("setSfx", "setSfxVol", "sfx", "sfxVol");
  // a short test sound when you let go of the effects slider
  $("setSfxVol").addEventListener("change", () => sound.sfx("hit"));
  // your teammate's own sounds, each with its own volume (under the effects volume)
  const team = () => ({ pyro: "fire", nova: "void" })[mate()] || "void";
  for (const [id, key, test] of [["setRoamVol", "roamVol", "hop"], ["setGrabVol", "grabVol", "plop"]]) {
    $(id).value = Math.round(s[key] * 100);
    $(id).addEventListener("input", () => sound.set({ [key]: $(id).value / 100 }));
    $(id).addEventListener("change", () => sound.sfx(test, { theme: team() }));
  }
  const sub = () => ["setRoamVol", "setGrabVol"].forEach((id) => ($(id).disabled = !$("setSfx").checked));
  sub(); $("setSfx").addEventListener("change", sub);
  // the Settings section folds away; remember whether it was open
  $("settings").open = lsGet("operandi:settings-open") === "1";
  $("settings").addEventListener("toggle", () => lsSet("operandi:settings-open", $("settings").open ? "1" : "0"));
  const roam = lsGet("operandi:roam") !== "off";
  $("setRoam").checked = roam;
  if (!roam) dot.setRoaming(false);
  $("setRoam").addEventListener("change", () => { lsSet("operandi:roam", $("setRoam").checked ? "on" : "off"); dot.setRoaming($("setRoam").checked); });
}
wireSettings();

const railDefault = () => setRail(NARROW.matches ? false : lsGet("operandi:rail") !== "closed");
NARROW.addEventListener("change", railDefault);
railDefault();

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
          if (used === "cloud") { applyCosmetics(); renderTop(); renderRail(); if (view.kind === "lesson") openLesson(view.id, view.section); toast("Progress synced from your account."); }
        } else {
          store.cloud = null;
        }
      },
    });
  } catch (e) {
    $("saveState").textContent = "Couldn't reach the sync service. Progress is saved in this browser.";
  }
}

/* ---------- Test links ---------- */

// For trying things out on a real device:
//   ?test=boss   load a save with Module 1's lessons done and GOLEM ready to fight
//   ?test=boss2  load a save with Modules 1 and 2 done up to THE ABYSSAL MAW (GOLEM beaten), ready to fight him
//   ?test=reset  wipe everything back to the very beginning
//   ?test=nova   switch your teammate to NOVA, with her idles every 8-12 s instead of 20-40 s
// boss, boss2 and reset ask first. The link is cleaned from the address bar either way.
let bootBoss = 0;   // the module whose boss to open straight away
const testMode = new URLSearchParams(location.search).get("test");
if (testMode) {
  history.replaceState(null, "", location.pathname);
  const m = { boss: 1, boss2: 2 }[testMode];
  if (m && confirm(m === 1
    ? "Load the boss test save?\n\nThis replaces your lesson progress with: every Module 1 lesson done, and GOLEM ready to fight. Your Bits and Shop items stay."
    : "Load the Module 2 boss test save?\n\nThis replaces your lesson progress with: every Module 1 and 2 lesson done, GOLEM beaten, and THE ABYSSAL MAW ready to fight. Your Bits and Shop items stay.")) {
    const at = new Date().toISOString();
    for (let mod = 1; mod <= m; mod++) for (const l of MODULE_LESSONS(mod)) {
      sectionsOf(l).forEach((_, i) => { S().lessons[sectionKey(l, i)] = { done: true, mark: 9, attempts: 1, hints: 0, assisted: false, solutionUsed: false, peeked: [], at }; });
      S().lessons[l.id] = { done: true, mark: 9, at };
    }
    // testMode: boss challenges get a "Fill in the answer" button. ?test=reset clears it with everything else.
    const beaten = m === 2 ? { 1: { at, firstTry: true, number: 1 } } : {};
    Object.assign(S(), { modulesDone: m === 2 ? { 1: at } : {}, boss: null, bossWins: beaten, bossFights: {}, seenIntro: true, testMode: true });
    store.save();
    bootBoss = m;
  }
  if (testMode === "nova") {
    store.equip("teammate", "nova");
    Pet.fastIdles = true;
    window.operandiPet = dot;   // for trying idles by hand: operandiPet.dot.idle("orrery")
  }
  if (testMode === "reset" && confirm("Reset ALL your progress to the very beginning?\n\nBits, items, lessons, Shop purchases, boss fights and saved code are all wiped. This can't be undone.")) {
    store.reset();
  }
}

/* ---------- Start ---------- */

applyCosmetics();
renderTop();
const firstOpen = ALL_LESSONS.find((l, i) => lessonUnlocked(i) && !lessonDone(l.id));
openLesson((firstOpen || ALL_LESSONS[ALL_LESSONS.length - 1]).id);
// A pass still waiting for its ability card (the page was closed mid-choice): straight back to the fight.
if (bootBoss || (S().boss?.hand && !S().boss.over)) openBoss(S().boss?.module || bootBoss || 1);
initCloud();
