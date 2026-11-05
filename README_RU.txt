Nymphomania Priestess Alpha 0.80j — патч русской локализации + язык
Сборка: 2026-11-05

ЧТО ЭТО
Лёгкий патч ПОВЕРХ английской www (Alpha 0.80j).
Без Game.exe / аудио / картинок / видео — только перевод, EN-оверлей и 2 плагина.

Плагины геймплея: https://github.com/posolware1/nympri-plugins

ТРЕБОВАНИЯ
• Оригинал Alpha Ver.0.80j (английская www).
• Не ставить поверх полной русской сборки с модом.

УСТАНОВКА (Windows)
1. Бэкап игры (хотя бы www\csv, www\data\System.json, www\js\plugins.js).
2. Скачайте ZIP релиза или распакуйте этот репозиторий.
3. Запустите:
     install.bat "C:\путь\к\игре"
   или: python install.py "C:\путь\к\игре"
4. Запустите игру. Язык по умолчанию: Русский.

Вручную: скопируйте www\ патча в www\ игры с заменой, затем
  python patch_plugins_js.py "C:\путь\к\игре\www\js\plugins.js"
(NP_Language сразу после MEO_Util_Node, NP_OptionsCategories в конце —
 см. plugins_fragment.txt).

ЯЗЫК
Настройки → «Язык / Language» или кнопка «RU | EN» на титуле (перезапуск).
RU — основной; EN читает www\lang\en\.

ОТКАТ
Восстановите бэкап www и удалите www\lang\en, NP_Language.js, NP_OptionsCategories.js.
