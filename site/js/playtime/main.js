// Playtime's page (PRD Addendum O): pick a level, write Python, press Run. The code runs in real Python (the course's
// worker, py/playtime.py), which writes down what NOVA does, line by line; this page plays that back on the island,
// then explains what went wrong in plain words, or gives the level's stars and Bits. Progress lives in the course's
// own save (state.playtime), so Bits are shared and it syncs the same way.
import { Runner } from "../runner.js";
import { Store } from "../store.js";
import { PLAYTIME } from "../economy.js";
import { CHAPTERS, LEVELS, layoutsOf, codeLines, levelById } from "../../content/playtime-levels.js";
import * as I from "./island.js";
import { Sky } from "./sky.js";
import { initIntro, openIntro, introOpen, holdIntro } from "./intro.js";

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const STILL = qs.has("still");                         // test hook: fixed frames, see start()
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const STARTER = "# NOVA follows these lines, top to bottom.\n";
const CMDS = { move: 1, turn_left: 1, collect: 1, toggle: 1, is_blocked: 1, on_bit: 1, switch_on: 1 };

const store = new Store();
const P = () => store.state.playtime;
// a host that won't serve .zip files ships Python's standard library under another name (the claude.ai preview)
const stdlib = document.querySelector('meta[name="operandi:stdlib"]')?.content || null;
const runner = new Runner((st) => {
  const s = $("status");
  if (st === "ready") { s.classList.add("gone"); $("run").disabled = false; }
  else if (st === "failed") { s.textContent = "Python couldn't load. Reload the page to try again."; s.classList.remove("gone"); }
  else { s.textContent = "Python is loading…"; s.classList.remove("gone"); }
}, { stdlib });
if (stdlib) $("courseLink").hidden = true;   // the preview has no course page next to it

let level = null, layout = null, hintAt = 0, hintsUsed = false;

// ================================================================ levels and unlocking
const chapterLevels = (c) => LEVELS.filter((l) => l.chapter === c);
const rec = (id) => P().levels[id] || {};
function unlocked(lv) {
  const ls = chapterLevels(lv.chapter), i = ls.indexOf(lv);
  if (i > 0) return !!rec(ls[i - 1].id).done;
  return lv.chapter === 1 || chapterLevels(lv.chapter - 1).every((l) => rec(l.id).done);
}
const firstOpen = () => LEVELS.find((l) => unlocked(l) && !rec(l.id).done) || LEVELS[0];
const nextLevel = (lv) => LEVELS[LEVELS.indexOf(lv) + 1];
const starsOf = (id) => { const r = rec(id); return [!!r.done, !!r.par, !!r.clean]; };

function openLevel(id) {
  stopRun(true);
  level = levelById(id) || LEVELS[0]; layout = layoutsOf(level)[0];
  I.loadIsland(layout);
  hintAt = 0; hintsUsed = false;
  const ch = CHAPTERS.find((c) => c.id === level.chapter), n = chapterLevels(level.chapter).indexOf(level) + 1;
  $("crumb").innerHTML = `Chapter ${ch.id}: ${esc(ch.title)} · <b>${esc(level.id)} ${esc(level.title)}</b><span class="caret" aria-hidden="true">▾</span>`;
  $("lvTitle").textContent = level.title + (level.challenge ? " (challenge)" : "");
  $("lvNew").innerHTML = level.fresh.map((c) => `<span>${esc(c)}</span>`).join("");
  $("lvGoal").innerHTML = `<b>Goal:</b> ${level.goal}`;
  $("lvSteps").innerHTML = level.steps.map((s) => `<li><span>${s}</span></li>`).join("");
  const r = rec(level.id);
  $("lvPar").textContent = `Level ${n} of ${chapterLevels(level.chapter).length} · par ${level.par} lines` + (r.best ? ` · your best ${r.best}` : "");
  $("chips").innerHTML = `<span class="lab">Tap to add</span>` + level.commands.map((c) => `<button class="chip" type="button" data-cmd="${c}">${c}</button>`).join("");
  let draft = null; try { draft = localStorage.getItem("operandi:playtime:draft:" + level.id); } catch {}
  const fromUrl = STILL ? qs.get("code") : null;
  code.value = fromUrl ?? draft ?? STARTER;
  paintCode(); hideCard(); lineHL(0); resetWorld();
  P().last = level.id; store.save();
  if (!STILL) history.replaceState(null, "", "#level-" + level.id.replace(".", "-"));
}
function resetWorld() {
  I.resetIsland(layout); setCounts();
  const n = I.novaOf(); if (n) I.moodOf(n, "idle");
}
function setCounts(pop) {
  const got = I.bits.filter((b) => b.s < .05).length, on = I.sws.filter((s) => s.on > .5).length;
  $("count").textContent = `${got}/${I.bits.length}`; $("swCount").textContent = `${on}/${I.sws.length}`;
  $("counter").dataset.switches = I.sws.length;
  if (pop) { const c = $("counter"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop"); }
}
function showBits(animate) {
  const el = $("bitsTop"), to = store.state.bits, from = +el.textContent || 0;
  if (!animate || REDUCED || to <= from) { el.textContent = to; return; }
  const t0 = performance.now(), step = (now) => { const k = Math.min(1, (now - t0) / 900); el.textContent = Math.round(from + (to - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

// ================================================================ playing the run back
const SPEED = { k: 1 };
let tweens = [], playing = null;
const easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const tween = (ms, fn) => new Promise((done) => tweens.push({ t: 0, ms: ms / SPEED.k, fn, done }));
const wait = (ms) => tween(ms, () => {});
function stepTweens(dt) {
  tweens = tweens.filter((tw) => { tw.t = Math.min(tw.ms, tw.t + dt * 1000); tw.fn(tw.ms ? tw.t / tw.ms : 1); if (tw.t >= tw.ms) { tw.done(); return false; } return true; });
}
function lineHL(line, bad) {
  const hl = $("hl");
  if (!line) { hl.classList.remove("on", "bad"); markGutter(0); return; }
  hl.style.transform = `translateY(${(line - 1) * 26}px)`; hl.classList.add("on"); hl.classList.toggle("bad", !!bad); markGutter(line);
  const ed = $("editor"), y = 14 + (line - 1) * 26;
  if (y < ed.scrollTop + 10 || y > ed.scrollTop + ed.clientHeight - 60) ed.scrollTo({ top: y - ed.clientHeight / 3, behavior: REDUCED ? "auto" : "smooth" });
}
function markGutter(line) { [...$("gutter").children].forEach((s, i) => s.classList.toggle("on", i + 1 === line)); }
async function play(events, token) {
  const N = I.N, nova = I.novaOf();
  for (const e of events) {
    if (playing !== token) return;
    lineHL(e.line);
    if (e.kind === "move") {
      const [x0, z0] = e.frm, [x1, z1] = e.to;
      await tween(470, (k) => { const q = easeIO(k); N.x = x0 + (x1 - x0) * q; N.z = z0 + (z1 - z0) * q; N.lean = Math.sin(k * Math.PI) * -.18; });
    } else if (e.kind === "turn") {
      const a0 = N.yaw, a1 = a0 + Math.PI / 2;
      await tween(320, (k) => { N.yaw = a0 + (a1 - a0) * easeIO(k); });
    } else if (e.kind === "collect") {
      const b = I.bits.find((x) => x.x === e.at[0] && x.z === e.at[1] && x.s > .5);
      if (b) { flyCoin(b); await tween(520, (k) => { b.lift = easeIO(k) * .7; b.s = 1 - easeIO(Math.max(0, k - .35) / .65); }); }
      setCounts(true);
    } else if (e.kind === "toggle") {
      const s = I.sws.find((x) => x.x === e.at[0] && x.z === e.at[1]);
      if (s) { const a = s.on, b = e.on ? 1 : 0; await tween(380, (k) => { s.on = a + (b - a) * easeIO(k); }); }
      setCounts(true);
    } else if (e.kind === "check") {
      await wait(260);
    } else if (e.kind === "nudge") {
      await wait(420);
    } else if (e.kind === "bump") {
      const [dx, dz] = I.DIRS[e.dir], x0 = N.x, z0 = N.z;
      nova.setMood("angry");
      await tween(480, (k) => { const q = Math.sin(Math.min(1, k * 1.6) * Math.PI) * .28; N.x = x0 + dx * q; N.z = z0 + dz * q; N.lean = Math.sin(k * 30) * .15 * (1 - k); });
    } else if (e.kind === "miss") {
      nova.setMood("sad"); await wait(420);
    }
    await wait(70);
  }
}
function flyCoin(b) {
  const r = $("world").getBoundingClientRect(), [sx, sy] = I.project(I.bitPos(b).slice(0, 3)), c = $("counter").querySelector(".coin").getBoundingClientRect();
  const el = document.createElement("span"); el.className = "coin flycoin"; el.textContent = "B"; document.body.append(el);
  const x0 = r.left + sx - 11, y0 = r.top + sy - 11, x1 = c.left - 1, y1 = c.top - 1;
  el.animate([{ transform: `translate(${x0}px, ${y0}px) scale(.6)`, opacity: 0 }, { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 60}px) scale(1.2)`, opacity: 1, offset: .45 },
    { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1 }], { duration: 760 / SPEED.k, easing: "cubic-bezier(.5,0,.3,1)", delay: 160 / SPEED.k }).onfinish = () => el.remove();
}

// ================================================================ the card over the world: hints, problems, the win
const card = $("card");
function showCard(kind, html) {
  card.className = "card " + kind; card.innerHTML = `<button class="x" type="button" aria-label="Close">×</button>` + html;
  card.querySelector(".x").onclick = hideCard;
  requestAnimationFrame(() => card.classList.add("show"));
}
function hideCard() { card.classList.remove("show"); }
function showHint() {
  hintsUsed = true;
  const H = level.hints;
  showCard("hint", `<h3>Hint ${hintAt + 1} of ${H.length}</h3><p>${H[hintAt]}</p>
    <div class="foot"><span class="dots">${H.map((_, i) => `<i class="${i === hintAt ? "on" : ""}"></i>`).join("")}</span>
    ${hintAt < H.length - 1 ? '<button class="link" type="button" id="moreHint">Next hint</button>' : ""}</div>`);
  const m = $("moreHint"); if (m) m.onclick = () => { hintAt++; showHint(); };
}
const WHY = { water: "into the water", edge: "off the edge of the island", wall: "into a raised block", tree: "into a tree", rock: "into a rock", bush: "into a bush" };
// Python's own message, then what it means here, in plain words
function explainError(err, ran) {
  const msg = `<code>${esc(err.type)}: ${esc(err.msg)}</code>`, after = ran ? "Nothing after that line ran." : "Nothing ran.";
  let tip = "";
  if (err.type === "NameError") {
    if (err.name === "turn_right") tip = "There's no <code>turn_right()</code>. Three <code>turn_left()</code> face the same way.";
    else if (err.suggest) tip = `Did you mean <code>${esc(err.suggest)}()</code>? Names must match exactly, small letters and all.`;
    else tip = "Python doesn't know that name. Check the spelling, or that it's one of the commands below the code.";
  } else if (err.type === "IndentationError") tip = "Lines only move in (indent) when they belong to a <code>for</code>, <code>if</code> or <code>def</code> above them.";
  else if (err.type === "TypeError") tip = "These commands don't take anything inside their brackets: write <code>move()</code>, not <code>move(2)</code>.";
  else if (err.type === "SyntaxError") tip = "Check the brackets, colons and spelling on that line.";
  else if (err.type === "RecursionError") tip = "A function that calls itself never stops.";
  return [err.line ? `Python stopped on line ${err.line}` : "Python stopped", `${msg}<br>${tip} ${after}`];
}
function explainStop(run, line) {
  const after = "Nothing after that line ran.";
  if (run.stop === "tired") return ["NOVA got tired", "She did 1,000 commands without finishing. Is there a loop that never ends?"];
  if (run.stop === "no bit") return ["No Bit here", `Line ${line}: <code>collect()</code> only works on a tile with a Bit, and NOVA's tile is empty. ${after}`];
  if (run.stop === "no switch") return ["No switch here", `Line ${line}: <code>toggle()</code> only works on a switch, and NOVA isn't standing on one. ${after}`];
  return ["NOVA can't go there", `Line ${line}: <code>move()</code> would take her ${WHY[run.stop] || "off the path"}. ${after}`];
}

// ================================================================ running your code
async function runCode() {
  if (playing) { stopRun(); return; }
  if (!runner.ready) { showCard("hint", "<h3>One moment</h3><p>Python is still loading. Try again in a few seconds.</p>"); return; }
  const src = code.value, token = {};
  hideCard(); I.cam.auto = false; resetWorld(); lineHL(0);
  playing = token; setRunning(true);
  let res;
  try { res = await runner.runPlaytime(src, layoutsOf(level)); }
  catch (e) { res = { failed: String(e.message || e) }; }
  if (playing !== token) return;
  if (res.failed) { finish(); showCard("bad", `<h3>Python stopped</h3><p>${esc(res.failed)}</p>`); return; }
  if (res.timedOut) { finish(); I.novaOf().setMood("sad"); showCard("bad", "<h3>NOVA got stuck</h3><p>Your code ran for more than 5 seconds without finishing. Is there a loop that never ends?</p>"); return; }
  if (res.syntax) { finish(); I.novaOf().setMood("sad"); lineHL(res.syntax.line, true); const [h, p] = explainError(res.syntax, false); showCard("bad", `<h3>${h}</h3><p>${p}</p>`); return; }
  // play the first layout it fails on (all of them pass: the first one)
  const run = res.runs.find((r) => !r.won) || res.runs[0];
  await wait(200);
  await play(run.stop === "tired" ? run.events.slice(0, 24) : run.events, token);
  if (playing !== token) return;
  finish();
  const last = run.events[run.events.length - 1], nova = I.novaOf();
  if (run.error) { lineHL(run.error.line, true); nova.setMood("sad"); const [h, p] = explainError(run.error, run.events.length > 0); showCard("bad", `<h3>${h}</h3><p>${p}</p>`); }
  else if (run.stop) { lineHL(last?.line, true); if (run.stop !== "tired") nova.setMood(run.stop.startsWith("no ") ? "sad" : "angry"); const [h, p] = explainStop(run, last?.line); showCard("bad", `<h3>${h}</h3><p>${p}</p>`); }
  else if (res.won) win(src);
  else {
    lineHL(0); nova.setMood("sad");
    const left = [], nudge = run.events.find((e) => e.kind === "nudge");
    if (run.bits < run.totalBits) left.push(`${run.totalBits - run.bits} of ${run.totalBits} Bits still to collect`);
    if (run.switchesOn < run.totalSwitches) left.push(`${run.totalSwitches - run.switchesOn} of ${run.totalSwitches} switches still off`);
    showCard("bad", `<h3>Not quite</h3><p>Your code finished, with ${left.join(" and ")}. ${nudge
      ? `Line ${nudge.line} says <code>${esc(nudge.name)}</code> without <code>()</code>, so it didn't run.` : "Add the missing steps and run it again."}</p>`);
  }
}
function finish() { playing = null; setRunning(false); }
function stopRun(quiet) { playing = null; tweens = []; I.cam.auto = false; setRunning(false); if (!quiet && layout) { resetWorld(); lineHL(0); } }
function setRunning(on) {
  const b = $("run"); b.classList.toggle("stop", on); b.querySelector("span").textContent = on ? "Stop" : "Run my code";
  b.querySelector("svg").innerHTML = on ? '<rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor"/>' : '<path d="M3 1.5v11l9-5.5z" fill="currentColor"/>';
}
// The level is won: stars (solved, within par, no hints), Bits the first time each is earned, a chapter bonus.
function win(src) {
  const nova = I.novaOf(), id = level.id, lines = codeLines(src), parOk = lines <= level.par, clean = !hintsUsed;
  const before = rec(id), chapterWasDone = chapterLevels(level.chapter).every((l) => rec(l.id).done);
  let earned = 0;
  if (!before.done) earned += PLAYTIME.level;
  if (parOk && !before.par) earned += PLAYTIME.par;
  P().levels[id] = { done: true, par: !!before.par || parOk, clean: !!before.clean || clean, best: Math.min(before.best || Infinity, lines) };
  if (!chapterWasDone && chapterLevels(level.chapter).every((l) => rec(l.id).done)) earned += PLAYTIME.chapter;
  if (earned) store.earn(earned);
  store.save(); showBits(true);
  lineHL(0); I.moodOf(nova, "happy"); I.N.hideArrow = true;
  if (!REDUCED) I.lapCamera(tween, easeIO);
  const nx = nextLevel(level), chapterDone = !chapterWasDone && chapterLevels(level.chapter).every((l) => rec(l.id).done);
  const [s1, s2, s3] = starsOf(id);
  showCard("win", `<h3>${level.challenge ? "Challenge complete!" : "Level complete!"}</h3>
    <p>NOVA did exactly what you wrote, in exactly the order you wrote it.${chapterDone ? ` That's Chapter ${level.chapter} done.` : ""}</p>
    <div class="stars"><span class="${s1 ? "got" : ""}">Solved</span><span class="${s2 ? "got" : ""}">${level.par} lines or fewer${parOk ? "" : ` (yours: ${lines})`}</span><span class="${s3 ? "got" : ""}">No hints</span></div>
    <div class="foot"><span class="earn">${earned ? `<span class="coin">B</span>+${earned} Bits` : "Bits already earned here"}</span>
      <button class="link" type="button" id="again">Play again</button>
      ${nx && nx.chapter === level.chapter ? `<button class="next" type="button" id="nextLv">Next level →</button>` : `<span class="earn">More chapters soon</span>`}</div>`);
  $("again").onclick = () => { hideCard(); resetWorld(); };
  $("nextLv")?.addEventListener("click", () => openLevel(nx.id));
  $("lvPar").textContent = $("lvPar").textContent.replace(/ · your best \d+|$/, ` · your best ${rec(id).best}`);
}

// ================================================================ the editor
const code = $("code");
const KW = /^(for|in|range|def|pass|if|else|elif|while|and|or|not|True|False|return)$/;
function paintCode() {
  const src = code.value;
  $("pre").innerHTML = src.split("\n").map((line) => {
    const m = line.match(/^(.*?)(#.*)?$/), body = m[1], com = m[2] || "";
    return body.replace(/[A-Za-z_]\w*(?=\s*\()|\b\d+\b|[A-Za-z_]\w*|[&<>]/g, (t) => {
      if (/^[&<>]$/.test(t)) return esc(t);
      if (/^\d/.test(t)) return `<span class="tk-num">${t}</span>`;
      if (KW.test(t)) return `<span class="tk-kw">${t}</span>`;
      if (CMDS[t]) return `<span class="tk-fn">${t}</span>`;
      return t;
    }) + (com ? `<span class="tk-com">${esc(com)}</span>` : "");
  }).join("\n") + "\n";
  const n = Math.max(1, src.split("\n").length);
  $("gutter").innerHTML = Array.from({ length: n }, (_, i) => `<span>${i + 1}</span>`).join("");
  code.style.height = "0px"; code.style.height = Math.max(code.parentElement.clientHeight, code.scrollHeight) + "px";
}
code.addEventListener("input", () => { paintCode(); try { localStorage.setItem("operandi:playtime:draft:" + level.id, code.value); } catch {} });
code.addEventListener("keydown", (e) => {
  if (e.key === "Tab") { e.preventDefault(); insertText("    "); }
  if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {   // keep the indent; one more after a colon
    e.preventDefault(); const v = code.value, i = code.selectionStart, ls = v.lastIndexOf("\n", i - 1) + 1, line = v.slice(ls, i);
    insertText("\n" + (line.match(/^\s*/)[0]) + (/:\s*$/.test(line) ? "    " : ""));
  }
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runCode(); }
});
function insertText(t) {
  const s = code.selectionStart, e = code.selectionEnd;
  code.setRangeText(t, s, e, "end"); code.dispatchEvent(new Event("input"));
}
// a command button adds the command on its own line, at the indent of the line you're on
$("chips").addEventListener("click", (ev) => {
  const b = ev.target.closest(".chip"); if (!b) return;
  const v = code.value, i = code.selectionStart, ls = v.lastIndexOf("\n", i - 1) + 1, le = v.indexOf("\n", i) < 0 ? v.length : v.indexOf("\n", i);
  const line = v.slice(ls, le), ind = line.match(/^\s*/)[0] + (/:\s*$/.test(line) ? "    " : "");
  if (line.trim()) { code.setSelectionRange(le, le); insertText("\n" + ind + b.dataset.cmd); }
  else { code.setSelectionRange(ls, le); insertText(ind + b.dataset.cmd); }
  if (!matchMedia("(pointer: coarse)").matches) code.focus();
});

// ================================================================ the level picker
function renderPicker() {
  $("chapters").innerHTML = CHAPTERS.map((c) => {
    if (c.soon) return `<section class="chap soon"><h3>Chapter ${c.id}: ${esc(c.title)}<small>coming soon</small></h3><p>${esc(c.idea)}</p></section>`;
    const ls = chapterLevels(c.id), doneN = ls.filter((l) => rec(l.id).done).length;
    return `<section class="chap"><h3>Chapter ${c.id}: ${esc(c.title)}<small>${doneN} of ${ls.length} done</small></h3><p>${esc(c.idea)}</p>
      <div class="tiles">${ls.map((l) => { const st = starsOf(l.id), open = unlocked(l);
        return `<button class="tile ${l === level ? "cur" : ""} ${l.challenge ? "challenge" : ""}" type="button" data-level="${l.id}" ${open ? "" : "disabled"}>
          <span class="n">${l.id}${open ? "" : " · locked"}</span><b>${esc(l.title)}</b><span class="st" aria-label="${st.filter(Boolean).length} of 3 stars">${st.map((g) => `<i class="${g ? "got" : ""}">★</i>`).join("")}</span></button>`; }).join("")}</div></section>`;
  }).join("");
}
function openPicker() { renderPicker(); $("picker").hidden = false; $("pickerClose").focus(); }
function closePicker() { $("picker").hidden = true; }
$("chapters").addEventListener("click", (e) => { const t = e.target.closest(".tile"); if (t && !t.disabled) { closePicker(); openLevel(t.dataset.level); } });
$("pickerClose").onclick = closePicker;
$("picker").addEventListener("click", (e) => { if (e.target === $("picker")) closePicker(); });
$("crumb").onclick = openPicker; $("levelsBtn").onclick = openPicker;
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("picker").hidden) closePicker(); });

// ================================================================ wiring and the frame loop
$("run").onclick = runCode;
$("hint").onclick = () => (card.classList.contains("show") && card.classList.contains("hint") ? hideCard() : showHint());
$("speed").onclick = () => { SPEED.k = SPEED.k === 1 ? 2 : 1; $("speed").textContent = SPEED.k + "×"; };
$("camLeft").onclick = () => I.turnCamera(1); $("camRight").onclick = () => I.turnCamera(-1); $("camReset").onclick = I.resetCamera;
$("replayIntro").onclick = () => openIntro(0);
let hintT = 0;
const showDragHint = () => { if (STILL) return; $("dragHint").classList.remove("gone"); clearTimeout(hintT); hintT = setTimeout(hideDragHint, 6000); };
const hideDragHint = () => $("dragHint").classList.add("gone");

const world = $("world"), sky = new Sky($("skyCv"));
I.initIsland({ world, pixCv: $("pixCv"), dirCv: $("dirCv"), novaHost: $("novaHost") });
I.wireCamera({ onDragStart: hideDragHint });
function resize() { I.sizeIsland(); sky.resize(Math.round(I.view.WW / I.view.art), Math.round(I.view.WH / I.view.art)); }
new ResizeObserver(resize).observe(world);

// slower devices: if frames take more than about 30 ms for two seconds, draw with bigger art pixels (once)
let last = performance.now(), slow = 0, watched = 0;
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!introOpen() && !document.hidden) {
    if (!REDUCED) I.view.time += dt;
    stepTweens(dt); I.stepCamera(dt);
    sky.draw(I.view.time, I.cam.yaw + I.cam.spin, dt);
    I.drawIsland();
    if (I.view.art === 2 && watched < 8) { watched += dt; slow = slow * .95 + (dt > .03 ? .05 : 0); if (watched > 2 && slow > .6) { I.setArtPixel(3); resize(); } }
  }
  requestAnimationFrame(loop);
}

async function start() {
  initIntro({ closed: () => { P().intro = true; store.save(); if (matchMedia("(pointer: fine)").matches) code.focus({ preventScroll: true }); setTimeout(showDragHint, 700); } });
  const m = location.hash.match(/^#level-(\d+)-(\d+)$/), asked = m && levelById(`${m[1]}.${m[2]}`);
  const first = (STILL && levelById(qs.get("level"))) || (asked && unlocked(asked) ? asked : null) || (P().last && levelById(P().last) && unlocked(levelById(P().last)) ? levelById(P().last) : firstOpen());
  resize(); openLevel(first.id); showBits(false);
  $("run").disabled = !runner.ready;
  if (STILL) return still();
  if (!P().intro) openIntro(0);
  requestAnimationFrame(loop);
}
// test hook: ?still&level=1.2&code=...&run (waits for Python, then plays the run instantly)&at=<event>&spin=<0..1>
// &pitch=<radians>&hint=<n>&intro=<page>&it=<seconds into its scene>&t=<seconds>&art=3
async function still() {
  I.view.time = +(qs.get("t") || 3);
  if (qs.has("art")) { I.setArtPixel(+qs.get("art")); resize(); }
  if (qs.has("intro")) { holdIntro(+(qs.get("it") || 30)); openIntro(+qs.get("intro")); }
  I.cam.spin = (+(qs.get("spin") || 0)) * Math.PI * 2; if (qs.has("pitch")) I.cam.pitch = +qs.get("pitch");
  if (qs.has("run")) {
    while (!runner.ready) await new Promise((r) => setTimeout(r, 200));
    const res = await runner.runPlaytime(code.value, layoutsOf(level)), run = res.runs?.[0];
    const events = run ? run.events : [], upto = qs.has("at") ? +qs.get("at") : events.length;
    events.slice(0, upto).forEach((e) => {
      if (e.kind === "move") { I.N.x = e.to[0]; I.N.z = e.to[1]; }
      if (e.kind === "turn") I.N.yaw += Math.PI / 2;
      if (e.kind === "collect") { const b = I.bits.find((x) => x.x === e.at[0] && x.z === e.at[1]); if (b) b.s = 0; }
      if (e.kind === "toggle") { const s = I.sws.find((x) => x.x === e.at[0] && x.z === e.at[1]); if (s) s.on = e.on ? 1 : 0; }
    });
    setCounts();
    if (upto >= events.length) {
      if (res.won) win(code.value);
      else if (res.syntax || run?.error) { const err = res.syntax || run.error; lineHL(err.line, true); const [h, p] = explainError(err, events.length > 0); showCard("bad", `<h3>${h}</h3><p>${p}</p>`); }
      else if (run?.stop) { const l = events[events.length - 1]; lineHL(l?.line, true); const [h, p] = explainStop(run, l?.line); showCard("bad", `<h3>${h}</h3><p>${p}</p>`); }
    } else if (events[upto - 1]) lineHL(events[upto - 1].line);
  }
  if (qs.has("hint")) { hintAt = +qs.get("hint"); showHint(); }
  if (qs.has("picker")) openPicker();
  setTimeout(() => { I.drawIsland(); sky.draw(I.view.time, I.cam.yaw + I.cam.spin, 0); }, 700);
  setTimeout(() => { I.drawIsland(); window.__ready = true; }, 1500);
}
start();
