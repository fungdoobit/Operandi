// Runs Python off the main thread, so a runaway program can be stopped by
// terminating this worker. The course's logic lives in py/harness.py; Playtime's
// (NOVA's puzzle island) in py/playtime.py. Both share one Python.
// ?stdlib=<file> names the standard library file when a host won't serve .zip
// (the claude.ai preview of Playtime ships it as python_stdlib.zip.wasm).

importScripts("../pyodide/pyodide.js");

const ready = (async () => {
  const base = new URL("../pyodide/", self.location).href;
  const stdlib = new URLSearchParams(self.location.search).get("stdlib");
  const py = await loadPyodide({ indexURL: base, ...(stdlib ? { stdLibURL: base + stdlib } : {}) });
  const src = async (file) => (await fetch(new URL("../py/" + file, self.location))).text();
  py.runPython(await src("harness.py"));
  // Playtime's harness gets its own namespace, so its helpers never replace the course's
  const playtime = py.globals.get("dict")();
  py.runPython(await src("playtime.py"), { globals: playtime });
  return { py, playtime };
})();

self.onmessage = async (ev) => {
  const { id, code, checks, expected, layouts } = ev.data;
  try {
    const { py, playtime } = await ready;
    const fn = layouts ? playtime.get("run_playtime") : py.globals.get("run_code");
    const out = layouts ? fn(code, JSON.stringify(layouts)) : fn(code, JSON.stringify(checks || []), JSON.stringify(expected ?? null));
    fn.destroy();
    self.postMessage({ id, ok: true, result: JSON.parse(out) });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};

ready.then(
  () => self.postMessage({ type: "ready" }),
  (e) => self.postMessage({ type: "failed", error: String((e && e.message) || e) })
);
