// The command palette (revamp, PRD Addendum N): Ctrl/Cmd+K opens a search box that jumps to any lesson or page,
// runs an action (Run, Submit, a hint...), flips a setting or opens a FAQ answer. The page decides what's in it:
// items(query) returns [{ group, label, sub, icon, keys, run }], already filtered for the query.
// Keys: up and down move, Enter picks, Esc closes.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function initPalette({ items }) {
  const dlg = document.createElement("dialog");
  dlg.className = "palette";
  dlg.setAttribute("aria-label", "Search and jump");
  dlg.innerHTML = `<div class="pal-in"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>
      <input type="text" placeholder="Search lessons, pages, actions and the FAQ…" aria-label="Search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="palList">
      <kbd class="kc">Esc</kbd></div>
    <div class="pal-list" id="palList" role="listbox"></div>
    <div class="pal-foot"><span><kbd class="kc">↑</kbd><kbd class="kc">↓</kbd> move</span><span><kbd class="kc">↵</kbd> open</span><span><kbd class="kc">Esc</kbd> close</span></div>`;
  document.body.append(dlg);
  const input = dlg.querySelector("input"), list = dlg.querySelector(".pal-list");
  let shown = [], sel = 0;

  function render() {
    shown = items(input.value.trim());
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    if (!shown.length) { list.innerHTML = `<div class="pal-none">Nothing matches “${esc(input.value)}”. Try a shorter word.</div>`; return; }
    let html = "", group = null;
    shown.forEach((it, i) => {
      if (it.group !== group) { group = it.group; html += `<div class="pal-group">${esc(group)}</div>`; }
      html += `<button type="button" class="pal-item" role="option" data-i="${i}" aria-selected="${i === sel}">
        <span class="pal-ico" aria-hidden="true">${esc(it.icon || "·")}</span>
        <span class="pal-txt">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ""}</span>
        ${it.keys ? `<kbd class="kc" ${it.keys.mod ? "data-mod" : ""} ${it.keys.shift ? "data-shift" : ""}>${esc(it.keys.key)}</kbd>` : ""}</button>`;
    });
    list.innerHTML = html;
  }
  function move(d) {
    if (!shown.length) return;
    sel = (sel + d + shown.length) % shown.length;
    list.querySelectorAll(".pal-item").forEach((b) => b.setAttribute("aria-selected", String(+b.dataset.i === sel)));
    list.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }
  function pick(i) {
    const it = shown[i];
    if (!it) return;
    close();
    setTimeout(() => it.run(), 0);   // after the dialog has closed, so focus lands in the page
  }
  function open() {
    if (dlg.open) return;
    input.value = ""; sel = 0; render();
    dlg.showModal();
    input.focus();
  }
  function close() { if (dlg.open) dlg.close(); }

  input.addEventListener("input", () => { sel = 0; render(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); pick(sel); }
  });
  list.addEventListener("click", (e) => { const b = e.target.closest(".pal-item"); if (b) pick(+b.dataset.i); });
  list.addEventListener("pointermove", (e) => {
    const b = e.target.closest(".pal-item");
    if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; list.querySelectorAll(".pal-item").forEach((x) => x.setAttribute("aria-selected", String(x === b))); }
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });   // a click on the backdrop
  return { open, close, get isOpen() { return dlg.open; } };
}
