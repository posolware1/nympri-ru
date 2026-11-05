#!/usr/bin/env python3
"""Install the RU language patch into an English Alpha 0.80j game folder.

Usage:
  python install_patch.py
  python install_patch.py "D:\\Games\\Nymphomania Priestess"
"""
import shutil
import subprocess
import sys
from pathlib import Path

PATCH_ROOT = Path(__file__).resolve().parent
WWW_SRC = PATCH_ROOT / "www"
PATCHER = PATCH_ROOT / "patch_plugins_js.py"


def configure_stdio():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def ask_folder():
    if len(sys.argv) >= 2:
        raw = sys.argv[1].strip().strip('"')
        if raw:
            return Path(raw)
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        try:
            root.attributes("-topmost", True)
        except tk.TclError:
            pass
        chosen = filedialog.askdirectory(
            title="Папка игры / Game folder (the folder that contains www)"
        )
        root.destroy()
        if not chosen:
            return None
        return Path(chosen)
    except Exception:
        pass
    if not sys.stdin.isatty():
        print("Укажите папку игры: python install_patch.py \"C:\\Games\\NymPri\"")
        print('Point at the game folder: python install_patch.py "C:\\Games\\NymPri"')
        return None
    print("Укажите папку игры (в ней лежат Game.exe и www).")
    print("Path to the game folder (it contains Game.exe and www).")
    raw = input("> ").strip().strip('"')
    return Path(raw) if raw else None


def backup_replaced_files(game: Path, backup: Path):
    """Copy files this patch will overwrite. plugins.js is copied last."""
    www_game = game / "www"
    for src in WWW_SRC.rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(WWW_SRC)
        current = www_game / rel
        if not current.is_file():
            continue
        target = backup / "www" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(current, target)
    plugins = www_game / "js" / "plugins.js"
    plugins_bak = backup / "www" / "js" / "plugins.js"
    plugins_bak.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(plugins, plugins_bak)


def copy_patch_www(game: Path):
    www_game = game / "www"
    for src in WWW_SRC.rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(WWW_SRC)
        dest = www_game / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


def main():
    configure_stdio()
    game = ask_folder()
    if game is None:
        print("Папка не выбрана.")
        print("No game folder selected.")
        return 1
    try:
        game = game.expanduser().resolve()
    except OSError as exc:
        print("Не удалось открыть папку:", game)
        print(exc)
        return 1

    if game == PATCH_ROOT:
        print("Это папка патча. Укажите папку игры, где лежат Game.exe и www.")
        print("That is the patch folder. Point at the game folder.")
        return 1

    plugins = game / "www" / "js" / "plugins.js"
    if not plugins.is_file():
        if (game / "js" / "plugins.js").is_file():
            print("Это папка www. Укажите папку игры, внутри которой лежит www.")
            print("That is the www folder. Point at the game folder that contains www.")
        else:
            print("Не найден файл:", plugins)
            print("Нужна английская Alpha 0.80j. Укажите папку игры, не архив и не www.")
            print("English Alpha 0.80j required. Point at the game folder, not at www.")
        return 1
    if not WWW_SRC.is_dir() or not PATCHER.is_file():
        print("Запускайте install.bat из папки патча (рядом должны быть www и patch_plugins_js.py).")
        print("Run install.bat from the patch folder.")
        return 1

    backup = game / "RU_Language_Patch_backup"
    plugins_bak = backup / "www" / "js" / "plugins.js"
    if plugins_bak.is_file():
        print("Бэкап уже есть, не перезаписываю:", backup)
    else:
        print("Бэкап файлов, которые патч заменит:")
        print(backup)
        backup_replaced_files(game, backup)
        print("Бэкап готов.")

    print("Копирую www ...")
    copy_patch_www(game)

    print("Прописываю плагины ...")
    rc = subprocess.call([sys.executable, str(PATCHER), str(plugins)])
    if rc != 0:
        print("plugins.js не изменён. www уже скопирован, бэкап на месте.")
        print("Повторите: python patch_plugins_js.py", plugins)
        return rc

    print()
    print("Готово. Запустите игру.")
    print("Done. Start the game.")
    print("Язык: Настройки → «Язык / Language», или кнопка RU | EN на титуле.")
    print("Language: Options → «Язык / Language», or the title button RU | EN.")
    print("Бэкап:", backup)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        sys.exit(1)
