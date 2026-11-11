# nympri-ru

Russian text patch for **Nymphomania Priestess Alpha 0.80j** (Windows). Not the full game. No `Game.exe`, pictures, or audio.

Gameplay plugins: [nympri-plugins](https://github.com/posolware1/nympri-plugins)

If you also want the plugins pack ([nympri-plugins](https://github.com/posolware1/nympri-plugins)), install that pack first, then this Russian patch. The plugins manual install stops if plugins.js already contains NP_.

Use the English Alpha 0.80j folder, the one that contains `Game.exe`.

## Install

Python 3 is needed only for this automatic way. Install it from https://www.python.org/downloads/ and on the first screen tick **Add python.exe to PATH**. If Windows opens the Store, that is the Store shortcut, not Python.

1. Click **Code**, then **Download ZIP**.
2. Extract the whole ZIP into a normal folder. Open the folder that contains `install.bat`. Do not start `install.bat` from inside the ZIP window.
3. Copy the game's `www\csv` folder, `www\data\System.json`, and `www\js\plugins.js` somewhere outside the game. This patch replaces the text files. The installer does not keep a copy of them.
4. Double-click `install.bat`.
5. When the window asks, choose the game folder (`Game.exe`) or the `www` folder inside it.
6. Wait until you see **Готово. Русский патч установлен.** and **Done. The Russian patch is installed.** Press Enter to close the window.
7. Start the game. The language is Russian. In Options, open **Язык / Language**, or use **RU | EN** on the title screen.

If the window says **Не получилось.**, open `install-log.txt` next to `install.bat` and send that file.

To undo, put those three copies back and delete `www\lang`. Details are in the manual.

No Python: [manual/HOW.txt](manual/HOW.txt). Russian: [README.ru.md](README.ru.md) and [manual/КАК.txt](manual/КАК.txt).
