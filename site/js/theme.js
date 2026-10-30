// Light or dark (revamp, Isaac 2026-10-30): the site follows the device until you press the sun/moon button, then
// remembers your pick in this browser ("operandi:theme"). Each page sets data-theme in <head> before it paints, so it
// never flashes the wrong theme. The switch spreads out in a circle from the button where the browser can do it.

const KEY = "operandi:theme";
const deviceDark = matchMedia("(prefers-color-scheme: dark)");
const root = document.documentElement;

export const isDark = () => (root.dataset.theme || (deviceDark.matches ? "dark" : "light")) === "dark";

function label() {
  const dark = isDark();
  document.querySelectorAll("[data-theme-btn]").forEach((b) => {
    b.dataset.mode = dark ? "dark" : "light";
    b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    b.title = dark ? "Light mode" : "Dark mode";
  });
}

export function toggleTheme(from) {
  const next = isDark() ? "light" : "dark";
  const apply = () => { root.dataset.theme = next; try { localStorage.setItem(KEY, next); } catch {} label(); };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
  const r = from?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth - 40, y = r ? r.top + r.height / 2 : 40;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add("theming");   // css: no cross-fade, and the lesson isn't animated on its own
  const t = document.startViewTransition(apply);
  t.ready.then(() => root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
  t.finished.finally(() => root.classList.remove("theming"));
}

// A sun/moon button: <button data-theme-btn> with both icons inside (css shows the right one).
export function wireThemeButton(btn) {
  btn.addEventListener("click", () => toggleTheme(btn));
  label();
}
deviceDark.addEventListener("change", label);

// The two icons, for the pages to drop into their buttons.
export const THEME_ICONS = `<svg class="i-sun" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M4.2 15.8l1.5-1.5M14.3 5.7l1.5-1.5"/></svg><svg class="i-moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 12.4A7 7 0 0 1 7.6 3.5a7 7 0 1 0 8.9 8.9z"/></svg>`;
