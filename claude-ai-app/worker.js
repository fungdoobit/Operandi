// Operandi code runner. Runs Python (Pyodide) off the main thread so a
// runaway program can be stopped by terminating this worker.

importScripts("./pyodide/pyodide.js");

const HARNESS = `
import sys, io, json, traceback, builtins

def _no_input(prompt=""):
    raise RuntimeError("input() doesn't work in Operandi yet. Put the value in a variable instead.")

def _clean_tb(e, code=""):
    # Keep only the lines that point at the learner's own file.
    if isinstance(e, SyntaxError):
        return "".join(traceback.format_exception_only(type(e), e)).rstrip()
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "main.py"]
    out = ["Traceback (most recent call last):"]
    for f in frames:
        out.append(f'  File "main.py", line {f.lineno}')
        src = code.splitlines()
        if 0 < f.lineno <= len(src) and src[f.lineno - 1].strip():
            out.append("    " + src[f.lineno - 1].strip())
    out.extend("".join(traceback.format_exception_only(type(e), e)).rstrip().splitlines())
    return "\\n".join(out)

def run_code(code, tests_json):
    tests = json.loads(tests_json)
    buf = io.StringIO()
    g = {"__name__": "__main__", "__builtins__": builtins}
    g["input"] = _no_input
    old = sys.stdout
    sys.stdout = buf
    error = None
    try:
        exec(compile(code, "main.py", "exec"), g)
    except BaseException as e:
        error = _clean_tb(e, code)
    finally:
        sys.stdout = old
    output = buf.getvalue()
    results = []
    for t in tests:
        if error:
            results.append({"name": t["name"], "passed": False, "message": "Your code stopped with an error before this could be checked."})
            continue
        env = dict(g)
        env["OUTPUT"] = output
        env["LINES"] = [ln.rstrip() for ln in output.strip().splitlines()]
        try:
            exec(t["code"], env)
            results.append({"name": t["name"], "passed": True, "message": ""})
        except AssertionError as e:
            results.append({"name": t["name"], "passed": False, "message": str(e) or t.get("fail", "")})
        except Exception as e:
            results.append({"name": t["name"], "passed": False, "message": t.get("fail") or f"{type(e).__name__}: {e}"})
    return json.dumps({"output": output, "error": error, "results": results})
`;

let ready = (async () => {
  const base = new URL("./pyodide/", self.location).href;
  // The artifact host doesn't serve .zip files, so the standard library ships
  // under a served extension and Pyodide is pointed at it directly.
  const py = await loadPyodide({ indexURL: base, stdLibURL: base + "python_stdlib.zip.wasm" });
  py.runPython(HARNESS);
  return py;
})();

self.onmessage = async (ev) => {
  const { id, code, tests } = ev.data;
  try {
    const py = await ready;
    const runCode = py.globals.get("run_code");
    const json = runCode(code, JSON.stringify(tests || []));
    runCode.destroy();
    self.postMessage({ id, ok: true, result: JSON.parse(json) });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message || e) });
  }
};

ready.then(
  () => self.postMessage({ type: "ready" }),
  (e) => self.postMessage({ type: "failed", error: String(e && e.message || e) })
);
