// Talks to the Python worker. One program runs at a time; anything running
// longer than LIMIT_MS is stopped and the worker is restarted.

const LIMIT_MS = 5000;

export class Runner {
  // stdlib: the standard library's file name when the host won't serve python_stdlib.zip (see worker.js)
  constructor(onState, { stdlib = null } = {}) {
    this.onState = onState;
    this.stdlib = stdlib;
    this.pending = new Map();
    this.nextId = 1;
    this.start();
  }

  start() {
    this.ready = false;
    this.onState("loading");
    const url = new URL("./worker.js", import.meta.url);
    if (this.stdlib) url.searchParams.set("stdlib", this.stdlib);
    this.worker = new Worker(url);
    this.worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.type === "ready") { this.ready = true; this.onState("ready"); return; }
      if (m.type === "failed") { this.onState("failed", m.error); return; }
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      clearTimeout(p.timer);
      m.ok ? p.resolve(m.result) : p.reject(new Error(m.error));
    };
    this.worker.onerror = (e) => this.onState("failed", e.message || "The Python worker crashed.");
  }

  // Playtime: run the code on each layout of a level (py/playtime.py). Stopped like any run after LIMIT_MS.
  runPlaytime(code, layouts) {
    return new Promise((resolve, reject) => {
      if (!this.ready) return reject(new Error("Python is still loading."));
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.worker.terminate();
        this.start();
        resolve({ timedOut: true, syntax: null, won: false, runs: [] });
      }, LIMIT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, code, layouts });
    });
  }

  run(code, { checks = [], expected = null } = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ready) return reject(new Error("Python is still loading."));
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.worker.terminate();
        this.start();
        resolve({
          output: "", lines: [], lint: [], timedOut: true,
          error: `Your program ran for more than ${LIMIT_MS / 1000} seconds, so it was stopped.`,
          errorInfo: { type: "Timeout", msg: "", line: null, text: "" },
          diagnosis: { id: "timeout", line: null },
          results: checks.map((c) => ({ name: c.name, passed: false, message: "Stopped: the program took too long.", peek: c.peek || "" })),
        });
      }, LIMIT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, code, checks, expected });
    });
  }
}
