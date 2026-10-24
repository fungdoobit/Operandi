# Operandi's Python harness. Runs the learner's code, captures what it
# prints, runs the hidden checks, and works out which beginner mistake
# (if any) caused a problem. Used by the browser (Pyodide) and by
# tools/validate.mjs (CPython), so it must only use the standard library.

import ast
import builtins
import difflib
import io
import json
import keyword
import re
import sys
import traceback

BUILTIN_NAMES = [n for n in dir(builtins) if not n.startswith("_")]
COMMON = ["print", "input", "len", "str", "int", "float", "round", "type", "range", "list", "dict", "sum", "max", "min", "abs", "sorted", "True", "False", "None"]


def _no_input(prompt=""):
    raise RuntimeError("input() doesn't work in Operandi. Put the value in a variable instead.")


def _error_info(e, code):
    lines = code.splitlines()
    info = {"type": type(e).__name__, "msg": str(e), "line": None, "text": ""}
    if isinstance(e, SyntaxError):
        info["msg"] = e.msg
        info["line"] = e.lineno
        info["offset"] = e.offset
    else:
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "main.py"]
        if frames:
            info["line"] = frames[-1].lineno
    if info["line"] and 0 < info["line"] <= len(lines):
        info["text"] = lines[info["line"] - 1].strip()
    return info


def _format_error(info):
    out = []
    if info["type"] in ("SyntaxError", "IndentationError", "TabError"):
        out.append(f'  File "main.py", line {info["line"]}')
        if info["text"]:
            out.append("    " + info["text"])
        out.append(f'{info["type"]}: {info["msg"]}')
    else:
        out.append("Traceback (most recent call last):")
        if info["line"]:
            out.append(f'  File "main.py", line {info["line"]}')
            if info["text"]:
                out.append("    " + info["text"])
        out.append(f'{info["type"]}: {info["msg"]}' if info["msg"] else info["type"])
    return "\n".join(out)


def _close(word, options, cutoff=0.75):
    m = difflib.get_close_matches(word, options, n=1, cutoff=cutoff)
    return m[0] if m else None


def _user_names(g):
    return [k for k in g if not k.startswith("__") and k not in ("input",)]


def diagnose(info, code, g):
    """Turn an error into a specific beginner-mistake id plus details."""
    t, msg, line = info["type"], info["msg"], info["line"]
    text = info.get("text", "")
    d = {"line": line}

    if t == "NameError":
        m = re.search(r"name '(\w+)' is not defined", msg)
        name = m.group(1) if m else ""
        d["name"] = name
        consts = {"true": "True", "false": "False", "none": "None"}
        if name in consts:
            return {"id": "name-case", **d, "suggest": consts[name]}
        if name != name.lower() and name.lower() in BUILTIN_NAMES:
            return {"id": "name-case", **d, "suggest": name.lower()}
        guess = _close(name, _user_names(g)) or _close(name, COMMON) or _close(name.lower(), _user_names(g) + COMMON)
        if guess and guess != name:
            return {"id": "name-typo", **d, "suggest": guess}
        if re.search(r"\b" + re.escape(name) + r"\b", text) and re.search(r"print\s*\(\s*" + re.escape(name), text):
            return {"id": "name-missing-quotes", **d}
        return {"id": "name-undefined", **d}

    if t == "AttributeError":
        m = re.search(r"'(\w+)' object has no attribute '(\w+)'", msg)
        if m:
            tname, attr = m.groups()
            options = [a for a in dir({"str": "", "int": 0, "float": 0.0, "list": [], "dict": {}}.get(tname, "")) if not a.startswith("_")]
            guess = _close(attr, options, 0.6)
            d.update(tname=tname, attr=attr)
            if guess:
                return {"id": "attr-typo", **d, "suggest": guess}
            return {"id": "attr-missing", **d}

    if t in ("SyntaxError", "IndentationError", "TabError"):
        low = msg.lower()
        if "unterminated string" in low or "eol while scanning" in low or "unterminated triple" in low:
            return {"id": "syntax-quote", **d}
        if "was never closed" in low or "unexpected eof" in low:
            return {"id": "syntax-bracket-open", **d}
        if "unmatched" in low or "does not match opening parenthesis" in low:
            return {"id": "syntax-bracket-close", **d}
        if "expected ':'" in low:
            return {"id": "syntax-colon", **d}
        if "missing parentheses in call to 'print'" in low:
            return {"id": "syntax-print-parens", **d}
        if "perhaps you forgot a comma" in low:
            return {"id": "syntax-comma", **d}
        if t == "IndentationError" or "indent" in low:
            return {"id": "syntax-indent", **d}
        if "invalid decimal literal" in low or "invalid syntax" in low and re.match(r"^\s*\d+[A-Za-z_]", text):
            return {"id": "syntax-name-digit", **d}
        if "cannot assign to" in low or "maybe you meant '=='" in low:
            if re.search(r"\b(if|elif|while)\b", text):
                return {"id": "syntax-eq-vs-assign", **d}
            return {"id": "syntax-assign-target", **d}
        if "invalid character" in low:
            return {"id": "syntax-smart-quote", **d}
        if re.search(r"\b\w+\s+\w+\s*=", text) and not re.search(r"\b(if|for|while|def|return|in|not|and|or|is)\b", text):
            return {"id": "syntax-space-in-name", **d}
        if "f-string" in low:
            return {"id": "syntax-fstring", **d}
        return {"id": "syntax-general", **d}

    if t == "TypeError":
        if "can only concatenate str" in msg or ("unsupported operand" in msg and "str" in msg):
            return {"id": "type-str-plus-num", **d}
        if "object is not callable" in msg:
            return {"id": "type-not-callable", **d}
        if "not subscriptable" in msg:
            return {"id": "type-not-subscriptable", **d}
        if "positional argument" in msg or "takes" in msg and "given" in msg:
            return {"id": "type-arg-count", **d}
        if "can't multiply sequence by non-int" in msg:
            return {"id": "type-str-times-float", **d}
        return {"id": "type-general", **d}

    if t == "ValueError":
        if "invalid literal for int()" in msg or "could not convert string to float" in msg:
            return {"id": "value-convert", **d}
        return {"id": "value-general", **d}
    if t == "ZeroDivisionError":
        return {"id": "zero-division", **d}
    if t == "IndexError":
        return {"id": "index-range", **d}
    if t == "KeyError":
        return {"id": "key-missing", **d}
    if t == "RuntimeError" and "input()" in msg:
        return {"id": "input-unsupported", **d}
    return {"id": "error-general", **d}


def lint(code, expected_lines=None):
    """Static checks on code that runs. Returns a list of style findings."""
    out = []
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return out
    assigned, loaded = {}, set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Store):
                assigned.setdefault(node.id, node.lineno)
            else:
                loaded.add(node.id)
    # Strings that look like they wanted to be f-strings.
    fstring_parts = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for v in node.values:
                fstring_parts.add(id(v))
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str) and id(node) not in fstring_parts:
            for name in re.findall(r"\{([A-Za-z_]\w*)(?:[:!][^}]*)?\}", node.value):
                if name in assigned:
                    out.append({"id": "lint-missing-f", "line": node.lineno, "name": name})
                    break
    for name, ln in assigned.items():
        if name not in loaded and not name.startswith("_"):
            out.append({"id": "lint-unused", "line": ln, "name": name})
        if re.search(r"[A-Z]", name) and not name.isupper():
            out.append({"id": "lint-snake-case", "line": ln, "name": name, "suggest": re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()})
        if len(name) == 1 and name not in ("i", "j", "k", "x", "y", "n", "_"):
            out.append({"id": "lint-short-name", "line": ln, "name": name})
        if name in BUILTIN_NAMES:
            out.append({"id": "lint-shadow-builtin", "line": ln, "name": name})
    # Hard-coded answers: print() given a literal that is exactly an expected line.
    if expected_lines:
        exp = set(x.strip() for x in expected_lines if x.strip())
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "print" and node.args:
                if all(isinstance(a, ast.Constant) for a in node.args):
                    text = " ".join(str(a.value) for a in node.args).strip()
                    if text in exp and re.search(r"\d", text):
                        out.append({"id": "lint-hardcoded", "line": node.lineno, "text": text})
    return out


def _print_has_literal(code):
    """For checks: does any print() call contain this text as typed-in text?"""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return lambda text: False
    literals = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "print":
            for sub in ast.walk(node):
                if isinstance(sub, ast.Constant) and isinstance(sub.value, str):
                    literals.append(sub.value)
    return lambda text: any(text in lit for lit in literals)


def _make_rerun(code):
    """For checks: run the learner's program again with some top-level variables swapped for new values.

    rerun(score=40) re-runs the code with its `score = ...` line replaced by `score = 40` and returns the
    printed lines (or None if it errored). This tests the LOGIC (does it still work for other numbers?)
    and not just the one example, so typed-in answers don't pass.
    """
    def rerun(**values):
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return None
        for node in tree.body:
            if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) and node.targets[0].id in values:
                node.value = ast.Constant(values[node.targets[0].id])
        ast.fix_missing_locations(tree)
        buf, old = io.StringIO(), sys.stdout
        sys.stdout = buf
        try:
            exec(compile(tree, "main.py", "exec"), {"__name__": "__main__", "__builtins__": builtins, "input": _no_input})
        except BaseException:
            return None
        finally:
            sys.stdout = old
        out = buf.getvalue()
        return [ln.rstrip() for ln in out.strip("\n").splitlines()] if out.strip() else []
    return rerun


def run_code(code, checks_json="[]", expected_json="null"):
    checks = json.loads(checks_json)
    expected = json.loads(expected_json)
    buf = io.StringIO()
    g = {"__name__": "__main__", "__builtins__": builtins, "input": _no_input}
    old = sys.stdout
    sys.stdout = buf
    info = None
    try:
        exec(compile(code, "main.py", "exec"), g)
    except BaseException as e:  # learner code can raise anything, even SystemExit
        info = _error_info(e, code)
    finally:
        sys.stdout = old
    output = buf.getvalue()
    lines = [ln.rstrip() for ln in output.strip("\n").splitlines()] if output.strip() else []
    results = []
    for c in checks:
        if info:
            results.append({"name": c["name"], "passed": False, "message": "Your code stopped with an error before this could be checked.", "peek": c.get("peek", "")})
            continue
        env = dict(g)
        env["OUTPUT"] = output
        env["LINES"] = lines
        env["SOURCE"] = code
        env["print_has_literal"] = _print_has_literal(code)
        env["rerun"] = _make_rerun(code)
        try:
            exec(c["code"], env)
            results.append({"name": c["name"], "passed": True, "message": "", "peek": ""})
        except AssertionError as e:
            results.append({"name": c["name"], "passed": False, "message": str(e) or c.get("fail", "This check didn't pass."), "peek": c.get("peek", "")})
        except Exception as e:
            results.append({"name": c["name"], "passed": False, "message": c.get("fail") or "This check didn't pass.", "peek": c.get("peek", "")})
    return json.dumps({
        "output": output,
        "lines": lines,
        "error": _format_error(info) if info else None,
        "errorInfo": info,
        "diagnosis": diagnose(info, code, g) if info else None,
        "lint": [] if info else lint(code, expected),
        "results": results,
    })


if __name__ == "__main__" and sys.platform != "emscripten":
    # CLI used by tools/validate.mjs: reads {"code","checks","expected"} JSON lines on stdin.
    for raw in sys.stdin:
        job = json.loads(raw)
        print(run_code(job["code"], json.dumps(job.get("checks", [])), json.dumps(job.get("expected"))), flush=True)
