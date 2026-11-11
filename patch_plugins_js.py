#!/usr/bin/env python3
"""Register NP_Language and NP_OptionsCategories in a 0.80j plugins.js.

NP_Language is placed immediately after MEO_Util_Node.
NP_OptionsCategories is placed last.
The first plugins.js.bak is kept. Later runs do not replace it.
A second run that is already in order does not rewrite plugins.js.
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

LANG = {
    "name": "NP_Language",
    "status": True,
    "description": "v1.1 Language: Russian / English (Options + Title).",
    "parameters": {},
}
OPTS = {
    "name": "NP_OptionsCategories",
    "status": True,
    "description": "[RU mod] Options menu categories (load LAST)",
    "parameters": {"showCounts": "true"},
}
MANAGED = ("NP_Language", "NP_OptionsCategories")

ENTRY = re.compile(
    r'\{\s*"name"\s*:\s*"(?P<name>[^"]+)"\s*,\s*"status"\s*:\s*(?:true|false)\s*,\s*'
    r'"description"\s*:\s*"(?:\\.|[^"\\])*"\s*,\s*"parameters"\s*:\s*\{.*?\}\s*\}',
    re.S,
)
NAME_MARK = re.compile(r'\{\s*"name"\s*:')


class PatchError(Exception):
    pass


def _line(obj: dict, comma: bool) -> str:
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return text + ("," if comma else "") + "\n"


def manual_paste_texts() -> tuple[str, str]:
    """Exact Notepad paste: language line after MEO_Util_Node, options line before ]."""
    return _line(LANG, True), _line(OPTS, False)


def names_of(entries: list[dict]) -> list[str]:
    return [obj.get("name", "") for obj in entries]


def order_errors(names: list[str]) -> list[str]:
    errors = []
    if names.count("NP_Language") != 1:
        errors.append(f"NP_Language count is {names.count('NP_Language')}, expected 1")
    if names.count("NP_OptionsCategories") != 1:
        errors.append(
            f"NP_OptionsCategories count is {names.count('NP_OptionsCategories')}, expected 1"
        )
    if "MEO_Util_Node" not in names:
        errors.append("MEO_Util_Node missing")
    else:
        index = names.index("MEO_Util_Node")
        if index + 1 >= len(names) or names[index + 1] != "NP_Language":
            errors.append("NP_Language is not immediately after MEO_Util_Node")
    if not names or names[-1] != "NP_OptionsCategories":
        errors.append("NP_OptionsCategories is not last")
    return errors


def parse_plugins(text: str) -> list[dict]:
    parsed = []
    for match in ENTRY.finditer(text):
        try:
            obj = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise PatchError(f"could not read plugin entry {match.group('name')}: {exc}") from exc
        if "name" not in obj:
            raise PatchError("plugin entry without a name")
        parsed.append(obj)
    return parsed


def read_plugins_text(path: Path) -> tuple[str, bool]:
    try:
        raw = path.read_bytes()
    except OSError as exc:
        raise PatchError(f"cannot read {path}: {exc}") from exc
    bom = raw.startswith(b"\xef\xbb\xbf")
    try:
        return raw.decode("utf-8-sig"), bom
    except UnicodeDecodeError as exc:
        raise PatchError(f"plugins.js is not UTF-8: {exc}") from exc


def write_plugins_text(path: Path, text: str, bom: bool) -> None:
    data = text.encode("utf-8")
    if bom:
        data = b"\xef\xbb\xbf" + data
    path.write_bytes(data)


def _entry_count_mismatch(text: str, parsed: list[dict]) -> bool:
    return len(parsed) != len(NAME_MARK.findall(text))


def load_plugins(path: Path) -> tuple[str, bool, list[dict]]:
    """Read plugins.js. Refuse to continue when an entry would be dropped."""
    if not path.is_file():
        raise PatchError(f"missing plugins.js at {path}")
    text, bom = read_plugins_text(path)
    parsed = parse_plugins(text)
    if _entry_count_mismatch(text, parsed):
        raise PatchError(
            "plugins.js has entries the installer could not read safely.\n"
            "В plugins.js есть записи, которые установщик не смог прочитать целиком.\n"
            "Use the manual steps: manual/HOW.txt and manual/КАК.txt"
        )
    if not any(obj.get("name") == "MEO_Util_Node" for obj in parsed):
        raise PatchError(
            "MEO_Util_Node not found in plugins.js. This does not look like NymPri 0.80j.\n"
            "В plugins.js нет MEO_Util_Node. Похоже, это не www от NymPri 0.80j."
        )
    return text, bom, parsed


def plugin_entry(name: str, existing: dict | None) -> dict:
    default = LANG if name == "NP_Language" else OPTS
    if existing:
        description = existing.get("description")
        parameters = existing.get("parameters")
        return {
            "name": name,
            "status": bool(existing.get("status", True)),
            "description": description if description not in (None, "") else default["description"],
            "parameters": parameters if isinstance(parameters, dict) else default["parameters"],
        }
    return {
        "name": default["name"],
        "status": default["status"],
        "description": default["description"],
        "parameters": dict(default["parameters"]),
    }


def arrange_plugins(parsed: list[dict]) -> tuple[list[dict], list[str]]:
    managed = set(MANAGED)
    found: dict[str, dict] = {}
    duplicates: list[str] = []
    base: list[dict] = []
    for obj in parsed:
        name = obj.get("name")
        if name in managed:
            if name in found:
                duplicates.append(name)
                continue
            found[name] = obj
        else:
            base.append(obj)
    out: list[dict] = []
    placed = False
    for obj in base:
        out.append(obj)
        if obj.get("name") == "MEO_Util_Node":
            out.append(plugin_entry("NP_Language", found.get("NP_Language")))
            placed = True
    if not placed:
        raise PatchError(
            "MEO_Util_Node not found in plugins.js. This does not look like NymPri 0.80j.\n"
            "В plugins.js нет MEO_Util_Node. Похоже, это не www от NymPri 0.80j."
        )
    out.append(plugin_entry("NP_OptionsCategories", found.get("NP_OptionsCategories")))
    return out, duplicates


def replace_plugin_array(text: str, entries: list[dict]) -> str:
    match = re.search(r"var\s+\$plugins\s*=\s*\[", text)
    if not match:
        raise PatchError("plugins.js has no var $plugins = [")
    start = match.end()
    i = start
    depth = 1
    in_str = False
    esc = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == "[":
                depth += 1
            elif ch == "]":
                depth -= 1
                if depth == 0:
                    break
        i += 1
    else:
        raise PatchError("plugins.js array is not closed")
    nl = "\r\n" if "\r\n" in text else "\n"
    body = ("," + nl).join(
        json.dumps(obj, ensure_ascii=False, separators=(",", ":")) for obj in entries
    )
    return text[:start] + nl + body + nl + text[i:]


def backup_path(path: Path) -> Path:
    return path.with_suffix(path.suffix + ".bak")


def patch_file(path: Path) -> str:
    """Patch one plugins.js. Keep the first .bak. Return status lines."""
    text, bom, parsed = load_plugins(path)
    arranged, duplicates = arrange_plugins(parsed)
    messages = []
    if duplicates:
        messages.append("Removed duplicate plugin entries: " + ", ".join(duplicates))
    if names_of(arranged) == names_of(parsed) and not duplicates:
        messages.append("plugins.js: order already correct")
        return "\n".join(messages)
    new_text = replace_plugin_array(text, arranged)
    bak = backup_path(path)
    if not bak.exists():
        shutil.copy2(path, bak)
        messages.append(f"Backup: {bak}")
    else:
        messages.append(f"Backup already kept: {bak}")
    write_plugins_text(path, new_text, bom)
    written, _bom = read_plugins_text(path)
    errors = order_errors(names_of(parse_plugins(written)))
    if errors:
        raise PatchError("plugins.js order is still wrong after writing: " + "; ".join(errors))
    messages.append(f"Wrote {path}")
    return "\n".join(messages)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if len(args) == 1 and args[0] in ("-h", "--help"):
        print("Usage: python patch_plugins_js.py /path/to/www/js/plugins.js")
        return 0
    if len(args) != 1:
        print("Usage: python patch_plugins_js.py /path/to/www/js/plugins.js")
        return 2
    try:
        print(patch_file(Path(args[0])))
    except PatchError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
