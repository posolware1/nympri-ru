# nympri-ru

Russian localization patch for Nymphomania Priestess Alpha 0.80j, plus the NP_Language switch.

Install: see README_RU.txt.

Companion plugins: https://github.com/posolware1/nympri-plugins

Ready-to-download archive (same contents as this tree): NymPri_080j_RU_Language_Patch.zip

---

Nymphomania Priestess Alpha 0.80j — Russian localization PATCH + language switch
Patch date: 2026-11-05

Drop-in patch for the English original www folder (Alpha 0.80j).
No Game.exe / audio / images / movies — translation data + 2 plugins only.

Install
1. Backup your game (at least www/csv, www/data/System.json, www/js/plugins.js).
2. Copy this archive's www/ into the game's www/ (overwrite).
3. Register plugins in www/js/plugins.js:
   - Insert NP_Language immediately after MEO_Util_Node
   - Append NP_OptionsCategories at the end of the plugins list
   Or run: python patch_plugins_js.py path/to/www/js/plugins.js
   See plugins_fragment.txt for exact JSON lines.

Usage
Default language: Russian. Switch via Options → «Язык / Language»
or the Title screen «RU | EN» button (reloads the game).

Architecture: RU is primary (csv + System terms). EN mode reads www/lang/en/.

Not included: gameplay mods (battle HUD, elites, diary, Yarizo quests, etc.).
For the full RU+mod build, use the separate Drive release.
