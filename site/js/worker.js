// Runs Python off the main thread, so a runaway program can be stopped by
// terminating this worker. The real logic lives in py/harness.py.

importScripts("../pyodide/pyodide.js");

const ready = (async () => {
  const py = await loadPyodide({ indexURL: new URL("../pyodide/", self.location).href });
  const src = await (await fetch(new URL("../py/harness.py", self.location))).text();
  py.runPython(src);
  return py;
})();

self.onmessage = async (ev) => {
  const { id, code, checks, expected } = ev.data;
  try {
    const py = await ready;
    const runCode = py.globals.get("run_code");
    const out = runCode(code, JSON.stringify(checks || []), JSON.stringify(expected ?? null));
    runCode.destroy();
    self.postMessage({ id, ok: true, result: JSON.parse(out) });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String((e && e.message) || e) });
  }
};

ready.then(
  () => self.postMessage({ type: "ready" }),
  (e) => self.postMessage({ type: "failed", error: String((e && e.message) || e) })
);
