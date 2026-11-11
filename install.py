#!/usr/bin/env python3
"""Install the NymPri 0.80j Russian language patch into a game folder.

With no argument, asks for the folder (a window on Windows, otherwise a typed path).
Accepts the folder that contains Game.exe, the www folder, or www/js/plugins.js.
Copies this patch's www/ over the game www/ (csv and System.json are replaced),
then registers NP_Language and NP_OptionsCategories in plugins.js.

Idempotent. The first plugins.js.bak is kept. csv and System.json are not backed up.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
from datetime import datetime
from pathlib import Path

import patch_plugins_js

ROOT = Path(__file__).resolve().parent
WWW_SRC = ROOT / "www"
LOG_NAME = "install-log.txt"
SUCCESS_RU = "Готово. Русский патч установлен."
SUCCESS_EN = "Done. The Russian patch is installed."
FAIL_RU = "Не получилось."
FAIL_EN = "Failed. Open install-log.txt next to install.bat and send that file."
REPLACED_RU = (
    "Файлы csv и System.json заменены русскими. Установщик не хранит их старые копии. "
    "Если список плагинов менялся, первая копия — plugins.js.bak, повторный запуск её не затирает."
)
REPLACED_EN = (
    "csv and System.json were replaced with the Russian files. This installer does not keep the old copies. "
    "If the plugin list changed, the first copy is plugins.js.bak, and a later run does not overwrite it."
)


def log_path() -> Path:
    override = os.environ.get("NP_INSTALL_LOG")
    return Path(override) if override else (ROOT / LOG_NAME)


class _Tee:
    def __init__(self, stream, handle):
        self.stream = stream
        self.handle = handle

    def write(self, data):
        try:
            self.stream.write(data)
        except Exception:
            pass
        try:
            self.handle.write(data)
            self.handle.flush()
        except Exception:
            pass

    def flush(self):
        try:
            self.stream.flush()
        except Exception:
            pass
        try:
            self.handle.flush()
        except Exception:
            pass


def configure_stdio() -> None:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def open_log():
    path = log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    new = (not path.exists()) or path.stat().st_size == 0
    handle = path.open("a", encoding="utf-8", newline="\n")
    if new:
        handle.write("\ufeff")
    handle.write("\n==== " + datetime.now().isoformat(timespec="seconds") + " ====\n")
    handle.write(f"python {sys.version}\n")
    handle.flush()
    return path, handle


def pack_problem() -> str | None:
    needed = (
        WWW_SRC / "data" / "System.json",
        WWW_SRC / "csv" / "sheet.csv",
        WWW_SRC / "js" / "plugins" / "NP_Language.js",
        WWW_SRC / "js" / "plugins" / "NP_OptionsCategories.js",
        WWW_SRC / "lang" / "en" / "build_info.json",
    )
    if all(path.is_file() for path in needed):
        return None
    return (
        "Похоже, архив распакован не целиком, или install.bat запущен прямо из окна ZIP.\n"
        "Распакуйте весь ZIP в обычную папку и запустите install.bat уже оттуда.\n"
        "The ZIP was not fully extracted, or install.bat was started from inside the ZIP window.\n"
        "Extract the whole ZIP into a normal folder, then start install.bat there.\n"
        + FAIL_RU
        + "\n"
        + FAIL_EN
    )


def resolve_www(raw: str) -> Path:
    """Accept the game folder (with Game.exe), the www folder, or www/js/plugins.js."""
    text = str(raw).strip().strip('"').strip()
    if not text:
        raise ValueError("empty")
    path = Path(text).expanduser()
    if path.is_file():
        if path.name.lower() == "plugins.js" and path.parent.name.lower() == "js":
            www = path.parent.parent
            if www.name.lower() == "www":
                return www.resolve()
        path = path.parent
    candidates = [path, path / "www"]
    if path.name.lower() == "js":
        candidates.append(path.parent)
    seen = set()
    for cand in candidates:
        key = str(cand)
        if key in seen:
            continue
        seen.add(key)
        if (cand / "js" / "plugins.js").is_file():
            return cand.resolve()
    raise FileNotFoundError(text)


def try_folder_dialog() -> str | None:
    """Windows folder picker. Returns None when it is unavailable or cancelled."""
    if os.name != "nt":
        return None
    try:
        import tkinter as tk
        from tkinter import filedialog
    except Exception:
        return None
    root = tk.Tk()
    try:
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except Exception:
            pass
        chosen = filedialog.askdirectory(title="Папка игры / Game folder")
    except Exception:
        return None
    finally:
        try:
            root.destroy()
        except Exception:
            pass
    if not chosen:
        return None
    return str(chosen)


def ask_for_folder() -> str:
    print("Сейчас откроется выбор папки. Если окна нет, введите путь ниже.")
    print("A folder window should open. If it does not, type the path below.")
    picked = try_folder_dialog()
    if picked:
        print(picked)
        return picked
    print("Введите путь к папке игры и нажмите Enter.")
    print("Type the game folder path and press Enter.")
    try:
        return input("> ")
    except EOFError:
        return ""


def stdin_is_console() -> bool:
    try:
        return sys.stdin is not None and sys.stdin.isatty()
    except Exception:
        return False


def wait_if_interactive(prompted: bool) -> None:
    if not prompted or not stdin_is_console():
        return
    try:
        input("Нажмите Enter, чтобы закрыть окно. / Press Enter to close this window.")
    except EOFError:
        pass


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_files() -> list[Path]:
    return sorted(path for path in WWW_SRC.rglob("*") if path.is_file())


def copy_www(www: Path) -> int:
    import shutil

    count = 0
    for src in source_files():
        rel = src.relative_to(WWW_SRC)
        dst = www / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        count += 1
    return count


def copy_errors(www: Path) -> list[str]:
    errors = []
    for src in source_files():
        rel = src.relative_to(WWW_SRC)
        dst = www / rel
        if not dst.is_file():
            errors.append(f"missing {rel.as_posix()}")
            continue
        if dst.stat().st_size != src.stat().st_size or sha256_file(dst) != sha256_file(src):
            errors.append(f"copy mismatch {rel.as_posix()}")
    return errors


def fail(code: int) -> int:
    print(FAIL_RU)
    print(FAIL_EN)
    return code


def main(argv: list[str] | None = None) -> int:
    prompted = {"v": False}
    try:
        return _main(argv, prompted)
    except SystemExit as exc:
        if isinstance(exc.code, int):
            return exc.code
        if exc.code:
            print(exc.code, file=sys.stderr)
        return 1
    finally:
        wait_if_interactive(prompted["v"])


def _main(argv: list[str] | None, prompted: dict) -> int:
    configure_stdio()
    _log_file, handle = open_log()
    stdout, stderr = sys.stdout, sys.stderr
    sys.stdout = _Tee(stdout, handle)
    sys.stderr = _Tee(stderr, handle)
    code = 1
    try:
        try:
            code = _run(argv, prompted)
        except SystemExit as exc:
            # argparse uses SystemExit(0) for --help and SystemExit(2) for bad arguments.
            code = exc.code
            if code is None or code == 0:
                return 0
            if not isinstance(code, int):
                print(code)
                print(FAIL_RU)
                print(FAIL_EN)
                return 1
            print(FAIL_RU)
            print(FAIL_EN)
            return code
        return code
    finally:
        try:
            print(f"Log file: {LOG_NAME}")
            handle.flush()
        except Exception:
            pass
        sys.stdout = stdout
        sys.stderr = stderr
        try:
            handle.close()
        except Exception:
            pass


def _run(argv: list[str] | None, prompted: dict) -> int:
    ap = argparse.ArgumentParser(description="Install the NymPri 0.80j Russian language patch")
    ap.add_argument(
        "game",
        nargs="?",
        help="Game folder (with Game.exe), the www folder, or www/js/plugins.js",
    )
    args = ap.parse_args(argv)
    problem = pack_problem()
    if problem:
        print(problem)
        return 1
    raw = args.game
    if not raw:
        if not stdin_is_console():
            print("Укажите папку игры: install.bat")
            print("Choose the game folder: install.bat")
            return fail(2)
        prompted["v"] = True
        raw = ask_for_folder()
    try:
        www = resolve_www(raw or "")
    except (ValueError, FileNotFoundError):
        print("В этой папке нет игры.")
        print("Нужна папка, где лежит Game.exe, или папка www внутри неё.")
        print("This folder is not the game.")
        print("Choose the folder that contains Game.exe, or the www folder inside it.")
        if raw:
            print(f"Path: {raw}")
        return fail(1)
    plugins_js = www / "js" / "plugins.js"
    try:
        patch_plugins_js.load_plugins(plugins_js)
    except patch_plugins_js.PatchError as exc:
        print("ERROR:", exc)
        print("Файлы игры не изменены.")
        print("No game files were changed.")
        return fail(1)
    print(f"Game folder: {www}")
    print("Copying files…")
    copied = copy_www(www)
    print(f"Copied {copied} files into {www}")
    try:
        print(patch_plugins_js.patch_file(plugins_js))
    except patch_plugins_js.PatchError as exc:
        print("ERROR:", exc)
        print(REPLACED_RU)
        print(REPLACED_EN)
        print("Список плагинов мог не записаться. Смотрите строки выше.")
        print("The plugin list may not have been written. See the lines above.")
        return fail(1)
    errors = copy_errors(www)
    text, _bom = patch_plugins_js.read_plugins_text(plugins_js)
    errors.extend(patch_plugins_js.order_errors(patch_plugins_js.names_of(patch_plugins_js.parse_plugins(text))))
    print(REPLACED_RU)
    print(REPLACED_EN)
    print("Язык по умолчанию: русский. В игре: Настройки → Язык / Language, или кнопка RU | EN на титуле.")
    print("Default language: Russian. In game: Options → Язык / Language, or the RU | EN button on the title screen.")
    if errors:
        for err in errors:
            print("ERROR:", err)
        return fail(1)
    print(SUCCESS_RU)
    print(SUCCESS_EN)
    return 0


if __name__ == "__main__":
    sys.exit(main())
