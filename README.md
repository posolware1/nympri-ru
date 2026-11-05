# nympri-ru

Russian localization **patch** for Nymphomania Priestess **Alpha 0.80j**, plus the `NP_Language` switch.

Not a full game. No `Game.exe`, audio, images, or movies — translation data + 2 plugins only.

Gameplay plugins (battle HUD, diary, elites, …): [nympri-plugins](https://github.com/posolware1/nympri-plugins)

Ready ZIP: [Releases](https://github.com/posolware1/nympri-ru/releases) → `NymPri_080j_RU_Language_Patch.zip`

## Requirements

- English **Alpha 0.80j** install (folder that contains `www\`).
- Do **not** drop this on top of the full RU+mod build — that is a different package.

## Install (Windows)

1. Backup the game (at least `www\csv`, `www\data\System.json`, `www\js\plugins.js`).
2. Download the release ZIP **or** clone/unpack this repo.
3. Run:
   ```bat
   install.bat "C:\path\to\game"
   ```
   Or: `python install.py "C:\path\to\game"`
4. Start the game. Default language: **Russian**.

Manual: copy this repo’s `www\` into the game’s `www\` (overwrite), then  
`python patch_plugins_js.py "C:\path\to\game\www\js\plugins.js"`  
(`NP_Language` right after `MEO_Util_Node`, `NP_OptionsCategories` last — see `plugins_fragment.txt`).

## Language switch

Options → **Язык / Language**, or title button **RU | EN** (reloads). Choice is saved in `config.rpgsave`.

RU is primary (`csv` + System terms). EN mode reads `www\lang\en\`.

## Rollback

Restore your backup of `www` (or `csv` / `System.json` / `plugins.js.bak`) and delete `www\lang\en`, `NP_Language.js`, `NP_OptionsCategories.js`.
