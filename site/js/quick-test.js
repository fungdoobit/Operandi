// A quick test under time pressure (the Abyssal Maw's Constrict): a small panel hangs from the bottom of the battle stage with a
// few lines of code and three answers; a bar runs down. Click an answer or press 1, 2 or 3.
// Resolves with { correct, timedOut }. After the answer it shows which one was right for a moment (you learn from a miss),
// then goes away. Test hook: window.__qte = "right" | "wrong" | "time" answers by itself after a beat.
import { sound } from "./sound.js";

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const CSS = `
.qte { position: fixed; z-index: 61; width: min(440px, calc(100vw - 32px)); transform: translate(-50%, 0); padding: 12px 14px 12px;
  border-radius: 14px; background: #0b0d14f2; border: 2px solid #b83f3f; box-shadow: 0 10px 34px #000b, 0 0 26px -6px #f59a90;
  color: #eceff5; font: 500 13px/1.4 var(--font-body, system-ui, sans-serif); animation: qteIn .32s cubic-bezier(.2,1.3,.4,1) backwards; }
@keyframes qteIn { from { opacity: 0; transform: translate(-50%, 18px) scale(.94); } }
.qte.out { animation: qteOut .25s ease-in forwards; }
@keyframes qteOut { to { opacity: 0; transform: translate(-50%, 10px) scale(.96); } }
.qte .top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.qte .top b { font: 800 17px var(--font-display, system-ui); letter-spacing: .08em; color: #ff8f84; }
.qte .top span { color: #a9b1c2; font-size: 12px; }
.qte pre { margin: 0 0 10px; padding: 9px 11px; border-radius: 8px; background: #05060a; border: 1px solid #ffffff14; color: #f1f3f8;
  font: 500 13px/1.45 var(--font-mono, ui-monospace, monospace); white-space: pre; overflow-x: auto; }
.qte .opts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.qte button { display: flex; align-items: center; gap: 7px; min-height: 40px; padding: 7px 9px; border-radius: 9px; border: 1px solid #ffffff26;
  background: #171b26; color: #f1f3f8; font: 600 13px var(--font-mono, ui-monospace, monospace); text-align: left; cursor: pointer;
  transition: transform .12s, background .15s, border-color .15s; overflow-wrap: anywhere; }
.qte button:hover, .qte button:focus-visible { background: #222839; border-color: #f59a90; transform: translateY(-2px); outline: none; }
.qte button kbd { flex: none; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 5px; background: #2a3042; color: #b8c0d2;
  font: 700 11px var(--font-body, system-ui); }
.qte button.right { background: #12351f; border-color: #4ee08a; }
.qte button.wrong { background: #3a1416; border-color: #ff6b6b; }
.qte .bar { height: 6px; margin-top: 10px; border-radius: 99px; background: #1d2230; overflow: hidden; }
.qte .bar i { display: block; height: 100%; width: 100%; background: linear-gradient(90deg, #b83f3f, #f59a90); transform-origin: left; }
.qte.late .bar i { background: #ff5a4a; animation: qteBlink .3s steps(2) infinite; }
@keyframes qteBlink { 50% { opacity: .45; } }
.qte .res { margin-top: 8px; min-height: 18px; font: 800 14px var(--font-display, system-ui); text-align: center; }
.qte .res.ok { color: #4ee08a; } .qte .res.no { color: #ff8f84; }
@media (max-width: 520px) { .qte .opts { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .qte, .qte.out, .qte button { animation: none; transition: none; } }
`;

// stage: the battle stage element (the panel hangs from its bottom edge). q: { code, answer, wrong: [a, b] }.
export function quickTest(stage, q, { ms = 10000, title = "CONSTRICT" } = {}) {
  if (!document.getElementById("qteCss")) { const st = document.createElement("style"); st.id = "qteCss"; st.textContent = CSS; document.head.append(st); }
  const opts = [q.answer, ...q.wrong].sort(() => Math.random() - 0.5);
  const el = document.createElement("div");
  el.className = "qte"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Quick test: what does this code print?");
  el.innerHTML = `<div class="top"><b>${esc(title)}</b><span>What does this print? Answer to break free.</span></div>
    <pre>${esc(q.code)}</pre>
    <div class="opts">${opts.map((o, i) => `<button type="button" data-i="${i}"><kbd>${i + 1}</kbd><span>${esc(o)}</span></button>`).join("")}</div>
    <div class="bar"><i></i></div><div class="res" aria-live="assertive"></div>`;
  document.body.append(el);
  const place = () => { const r = stage.getBoundingClientRect(); el.style.left = r.left + r.width / 2 + "px"; el.style.top = Math.max(8, r.bottom - 26) + "px"; };
  place();
  const bar = el.querySelector(".bar i"), buttons = [...el.querySelectorAll("button")];
  buttons[0].focus({ preventScroll: true });
  sound.sfx("lockOn");

  return new Promise((resolve) => {
    const t0 = performance.now();
    let done = false, raf = 0, ticked = 0;
    const tick = () => {
      if (done) return;
      const left = Math.max(0, 1 - (performance.now() - t0) / ms);
      bar.style.transform = `scaleX(${left})`;
      place();
      if (left < 0.3) el.classList.add("late");
      const sec = Math.ceil(left * ms / 1000);
      if (left < 0.3 && sec !== ticked) { ticked = sec; sound.sfx("block"); }   // the last few seconds tick
      raf = requestAnimationFrame(tick);
    };
    const finish = (i) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(auto);
      window.removeEventListener("keydown", key, true);
      buttons.forEach((b) => (b.disabled = true));
      const right = opts.indexOf(q.answer), correct = i === right, timedOut = i == null;
      buttons[right].classList.add("right");
      if (!correct && !timedOut) buttons[i].classList.add("wrong");
      const res = el.querySelector(".res");
      res.className = "res " + (correct ? "ok" : "no");
      res.textContent = correct ? "Right! You break free!" : timedOut ? `Too slow! It prints ${q.answer}` : `Not quite: it prints ${q.answer}`;
      if (!correct) sound.sfx("errorPop");
      resolve({ correct, timedOut });
      setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 260); }, correct ? 900 : 1700);
    };
    const key = (e) => { const n = +e.key; if (n >= 1 && n <= 3) { e.preventDefault(); e.stopPropagation(); finish(n - 1); } };
    window.addEventListener("keydown", key, true);
    buttons.forEach((b) => b.addEventListener("click", () => finish(+b.dataset.i)));
    const timer = setTimeout(() => finish(null), ms);
    const hook = window.__qte;   // tests
    const auto = hook && hook !== "time" ? setTimeout(() => finish(hook === "right" ? opts.indexOf(q.answer) : opts.indexOf(q.wrong[0])), 1600) : 0;
    raf = requestAnimationFrame(tick);
  });
}
