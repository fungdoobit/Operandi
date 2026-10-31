# Playtime's Python harness (PRD Addendum O). The learner's code drives NOVA round a puzzle island. Each command
# checks the island's rules, changes a model of the island, and writes down what happened together with the line it
# came from; the page then plays those events back on the island, line by line.
# A level can have several layouts (the levels that teach if and while do): the same code runs on each, and the level
# is only won if it wins on every one of them, so writing the moves out for one layout doesn't pass.
# Used by the browser (Pyodide, js/worker.js) and by tools/validate.mjs (CPython), so: standard library only.

import ast
import builtins
import difflib
import json
import sys
import traceback

DIRS = [(1, 0), (0, -1), (-1, 0), (0, 1)]   # east, north, west, south (north is away from the camera)
COMMANDS = ["move", "turn_left", "collect", "toggle", "is_blocked", "on_bit", "switch_on"]
STEP_LIMIT = 1000                          # commands per run, so an endless loop stops with a message
GROUND_BLOCKS = {" ": "edge", "~": "water", "#": "wall", "H": "wall"}
THING_BLOCKS = {"T": "tree", "P": "tree", "R": "rock", "B": "bush"}


class Blocked(Exception):
    """NOVA can't do what the line asks (walk into water, collect where there's no Bit): the run stops there."""


class Tired(Exception):
    """Too many commands: almost always a loop that never ends."""


def _line():
    # the line of the learner's code that is running right now (inside one of their functions, its line there)
    f = sys._getframe(2)
    while f is not None and f.f_code.co_filename != "main.py":
        f = f.f_back
    return f.f_lineno if f is not None else None


class World:
    def __init__(self, layout):
        self.ground = layout["ground"]
        self.things = layout["things"]
        self.x, self.z, self.dir = layout["start"]
        self.bits = {tuple(b) for b in layout["bits"]}
        self.total_bits = len(self.bits)
        self.switches = {(s[0], s[1]): bool(s[2]) for s in layout["switches"]}
        self.events = []
        self.steps = 0

    def at(self, grid, x, z, empty=" "):
        if z < 0 or z >= len(grid) or x < 0 or x >= len(grid[z]):
            return empty
        return grid[z][x]

    def blocked(self, x, z):
        g = self.at(self.ground, x, z)
        if g in GROUND_BLOCKS:
            return GROUND_BLOCKS[g]
        return THING_BLOCKS.get(self.at(self.things, x, z, "."), "")

    def event(self, kind, **data):
        data["kind"] = kind
        data["line"] = _line()
        self.events.append(data)

    def tick(self):
        self.steps += 1
        if self.steps > STEP_LIMIT:
            raise Tired()

    # ----- the commands the learner calls -----
    def move(self):
        self.tick()
        dx, dz = DIRS[self.dir]
        nx, nz = self.x + dx, self.z + dz
        why = self.blocked(nx, nz)
        if why:
            self.event("bump", frm=[self.x, self.z], dir=self.dir, why=why)
            raise Blocked(why)
        self.event("move", frm=[self.x, self.z], to=[nx, nz])
        self.x, self.z = nx, nz

    def turn_left(self):
        self.tick()
        self.event("turn", frm=self.dir, to=(self.dir + 1) % 4)
        self.dir = (self.dir + 1) % 4

    def collect(self):
        self.tick()
        here = (self.x, self.z)
        if here not in self.bits:
            self.event("miss", at=[self.x, self.z], what="bit")
            raise Blocked("no bit")
        self.bits.discard(here)
        self.event("collect", at=[self.x, self.z])

    def toggle(self):
        self.tick()
        here = (self.x, self.z)
        if here not in self.switches:
            self.event("miss", at=[self.x, self.z], what="switch")
            raise Blocked("no switch")
        self.switches[here] = not self.switches[here]
        self.event("toggle", at=[self.x, self.z], on=self.switches[here])

    # ----- the checks (for if and while) -----
    def is_blocked(self):
        self.tick()
        dx, dz = DIRS[self.dir]
        ans = bool(self.blocked(self.x + dx, self.z + dz))
        self.event("check", what="is_blocked", answer=ans)
        return ans

    def on_bit(self):
        self.tick()
        ans = (self.x, self.z) in self.bits
        self.event("check", what="on_bit", answer=ans)
        return ans

    def switch_on(self):
        self.tick()
        ans = self.switches.get((self.x, self.z), False)
        self.event("check", what="switch_on", answer=ans)
        return ans

    def nudge(self, name):
        # a command written without its brackets: Python just looks the name up and nothing happens
        self.event("nudge", name=name)


class _Brackets(ast.NodeTransformer):
    """`move` on a line by itself does nothing in Python. Swap it for a call that notes it, so the playback can show
    NOVA waiting on that line and the card can say why."""

    def visit_Expr(self, node):
        if isinstance(node.value, ast.Name) and node.value.id in COMMANDS:
            call = ast.Call(func=ast.Name(id="__nudge", ctx=ast.Load()), args=[ast.Constant(node.value.id)], keywords=[])
            return ast.copy_location(ast.Expr(value=ast.copy_location(call, node)), node)
        return node


def _error(e, code, names):
    lines = code.splitlines()
    info = {"type": type(e).__name__, "msg": str(e), "line": None, "text": "", "suggest": None}
    if isinstance(e, SyntaxError):
        info["msg"] = e.msg
        info["line"] = e.lineno
    else:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "main.py"]
        if frames:
            info["line"] = frames[-1].lineno
    if isinstance(e, NameError):
        name = getattr(e, "name", None) or (str(e).split("'")[1] if "'" in str(e) else "")
        close = difflib.get_close_matches(name.lower(), names, n=1, cutoff=0.6)
        info["name"] = name
        info["suggest"] = close[0] if close else None
    if isinstance(e, RecursionError):
        info["msg"] = "maximum recursion depth exceeded"
    if info["line"] and 0 < info["line"] <= len(lines):
        info["text"] = lines[info["line"] - 1].strip()
    return info


def _command(w, name):
    # a plain function with the command's own name, so a mistake reads "move() takes 0 positional arguments"
    method = getattr(w, name)
    def command():
        return method()
    command.__name__ = command.__qualname__ = name
    return command


def _no_input(prompt=""):
    raise RuntimeError("input() doesn't work in Playtime.")


def _run_one(compiled, code, layout):
    w = World(layout)
    g = {"__name__": "__main__", "__builtins__": builtins, "input": _no_input, "__nudge": w.nudge}
    for name in COMMANDS:
        g[name] = _command(w, name)
    error = stop = None
    old = sys.getrecursionlimit()
    sys.setrecursionlimit(min(old, 300))   # a function that calls itself stops early, not by crashing the page
    try:
        exec(compiled, g)
    except Blocked as e:
        stop = str(e)
    except Tired:
        stop = "tired"
    except Exception as e:   # the learner's own mistake: shown with Python's message, explained in plain words
        names = COMMANDS + [k for k in g if not k.startswith("_") and callable(g[k]) and k not in COMMANDS]
        error = _error(e, code, names)
    finally:
        sys.setrecursionlimit(old)
    switches_on = sum(1 for on in w.switches.values() if on)
    won = not error and not stop and not w.bits and switches_on == len(w.switches)
    return {"events": w.events, "won": won, "stop": stop, "error": error,
            "bits": w.total_bits - len(w.bits), "totalBits": w.total_bits,
            "switchesOn": switches_on, "totalSwitches": len(w.switches)}


def run_playtime(code, layouts_json):
    layouts = json.loads(layouts_json)
    try:
        tree = ast.parse(code, "main.py")
    except SyntaxError as e:
        return json.dumps({"syntax": _error(e, code, COMMANDS), "runs": [], "won": False})
    tree = ast.fix_missing_locations(_Brackets().visit(tree))
    compiled = compile(tree, "main.py", "exec")
    runs = [_run_one(compiled, code, layout) for layout in layouts]
    return json.dumps({"syntax": None, "runs": runs, "won": all(r["won"] for r in runs)})


if __name__ == "__main__" and sys.platform != "emscripten":
    # CLI used by tools/validate.mjs: reads {"code","layouts"} JSON lines on stdin.
    for raw in sys.stdin:
        job = json.loads(raw)
        print(run_playtime(job["code"], json.dumps(job["layouts"])), flush=True)
