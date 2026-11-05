#!/usr/bin/env python3
"""Install the NymPri 0.80j RU Language Patch into a game folder.

Usage:
  python install.py "C:\\Games\\NymPri"
  python install.py /path/to/game

Expects this patch next to install.py (folders: www/, plus patch_plugins_js.py).
Copies patch www/ into <game>/www/ (overwrite), then registers NP_Language
(after MEO_Util_Node) and NP_OptionsCategories (last) in plugins.js.
"""
from __future__ import annotations
import argparse, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("game", help="Path to the game root (folder that contains www/)")
    args = ap.parse_args()
    game = Path(args.game).expanduser().resolve()
    www_dst = game / "www"
    www_src = ROOT / "www"
    if not www_src.is_dir():
        sys.exit(f"ERROR: missing patch www at {www_src}")
    if not www_dst.is_dir():
        sys.exit(f"ERROR: missing game www at {www_dst}")
    print(f"Copying {www_src} → {www_dst} …")
    for src in www_src.rglob("*"):
        if not src.is_file():
            continue
        rel = src.relative_to(www_src)
        dst = www_dst / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
    plugins_js = www_dst / "js" / "plugins.js"
    patcher = ROOT / "patch_plugins_js.py"
    print("Patching", plugins_js)
    r = subprocess.run([sys.executable, str(patcher), str(plugins_js)])
    if r.returncode != 0:
        sys.exit(r.returncode)
    print("Done. Default language: Russian. Switch: Options → Language, or Title RU | EN.")

if __name__ == "__main__":
    main()
