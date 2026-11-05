#!/usr/bin/env python3
"""Patch English 0.80j www/js/plugins.js for the RU Language Patch.
Usage: python patch_plugins_js.py /path/to/game/www/js/plugins.js
Creates plugins.js.bak next to the target (once).
"""
import sys, re, shutil
from pathlib import Path

LANG = '{"name":"NP_Language","status":true,"description":"v1.1 Language: Russian / English (Options + Title).","parameters":{}}'
OPTS = '{"name":"NP_OptionsCategories","status":true,"description":"[RU mod] Options menu categories (load LAST)","parameters":{"showCounts":"true"}}'

ENTRY = re.compile(
    r'\{\s*"name"\s*:\s*"(?P<name>[^"]+)"\s*,\s*"status"\s*:\s*(?:true|false)\s*,\s*'
    r'"description"\s*:\s*"(?:\\.|[^"\\])*"\s*,\s*"parameters"\s*:\s*\{.*?\}\s*\}',
    re.S
)

def entries(text):
    return list(ENTRY.finditer(text))

def main():
    if len(sys.argv) != 2:
        print('Usage: python patch_plugins_js.py /path/to/www/js/plugins.js')
        sys.exit(2)
    p = Path(sys.argv[1])
    t = p.read_text(encoding='utf-8')
    ms = entries(t)
    names = [m.group('name') for m in ms]
    if 'MEO_Util_Node' not in names:
        print('ERROR: MEO_Util_Node entry not found')
        sys.exit(1)

    changed = False

    if 'NP_Language' not in names:
        m = next(x for x in ms if x.group('name') == 'MEO_Util_Node')
        i = m.end()
        while i < len(t) and t[i] in ' \t\r\n':
            i += 1
        if i < len(t) and t[i] == ',':
            i += 1
        t = t[:i] + '\n' + LANG + ',' + t[i:]
        print('Inserted NP_Language after MEO_Util_Node')
        changed = True
        ms = entries(t)
        names = [m.group('name') for m in ms]
    else:
        print('NP_Language already present — skip insert')

    if 'NP_OptionsCategories' not in names:
        last = ms[-1]
        after = t[last.end():]
        after2 = re.sub(r'^\s*,', '', after, count=1)
        m2 = re.match(r'\s*\]', after2)
        if not m2:
            print('ERROR: cannot find ] after last plugin')
            sys.exit(1)
        t = t[:last.end()] + ',\n' + OPTS + after2[m2.start():]
        print('Appended NP_OptionsCategories at end')
        changed = True
    else:
        print('NP_OptionsCategories already present — skip insert')

    if not changed:
        print('Nothing to do')
        return

    bak = p.with_suffix(p.suffix + '.bak')
    if not bak.exists():
        shutil.copy2(p, bak)
        print('Backup:', bak)
    p.write_text(t, encoding='utf-8')
    print('Wrote', p)

if __name__ == '__main__':
    main()
