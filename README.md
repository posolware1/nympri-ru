# nympri-ru

Russian language patch for Nymphomania Priestess. You need the English Alpha 0.80j.

It adds Russian text and a language switch. It is not a full game build.

## Install

Run `install.bat` and point it at the game folder (the folder with `Game.exe` and `www`).
Python 3 is required (`Add python.exe to PATH` when you install it).

The script backs up the files it replaces, copies `www`, and registers the plugins.

By hand, if you prefer:

1. Back up the game folder.
2. Copy this patch's `www` into the game's `www` (overwrite).
3. Run `python patch_plugins_js.py path\to\www\js\plugins.js`
4. Play.

## Language

Russian is the default. Switch in Options → «Язык / Language», or the title-screen button RU | EN.

Optional, separate mod plugins: https://github.com/posolware1/nympri-plugins

Advanced: `plugins_fragment.txt` shows the `plugins.js` lines if you edit that file yourself.

Same files, packed: `NymPri_080j_RU_Language_Patch.zip`
