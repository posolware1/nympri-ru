# nympri-ru

Патч русского текста для **Nymphomania Priestess Alpha 0.80j** (Windows). Это не полная игра. Нет `Game.exe`, картинок и звука.

Плагины геймплея: [nympri-plugins](https://github.com/posolware1/nympri-plugins)

Если нужен ещё набор плагинов ([nympri-plugins](https://github.com/posolware1/nympri-plugins)), сначала поставьте его, потом этот русский патч. Ручная установка плагинов останавливается, если в plugins.js уже есть NP_.

Нужна английская Alpha 0.80j. Папка игры — та, где лежит `Game.exe`.

## Установка

Python 3 нужен только этому способу. Скачайте его с https://www.python.org/downloads/ и на первом экране отметьте **Add python.exe to PATH**. Если открывается Store, это заглушка, а не сам Python.

1. Нажмите **Code**, затем **Download ZIP**.
2. Распакуйте весь ZIP в обычную папку. Откройте папку, где лежит `install.bat`. Не запускайте `install.bat` прямо из окна ZIP.
3. Скопируйте из игры в другое место папку `www\csv`, файл `www\data\System.json` и файл `www\js\plugins.js`. Патч заменяет тексты. Установщик их старые копии не хранит.
4. Дважды щёлкните `install.bat`.
5. Когда окно спросит папку, укажите папку игры (`Game.exe`) или папку `www` внутри неё.
6. Дождитесь строк **Готово. Русский патч установлен.** и **Done. The Russian patch is installed.** Нажмите Enter, чтобы закрыть окно.
7. Запустите игру. Язык — русский. В настройках пункт **Язык / Language**, на титуле кнопка **RU | EN**.

Если написано **Не получилось.**, откройте `install-log.txt` рядом с `install.bat` и пришлите этот файл.

Чтобы вернуть английский текст, положите обратно три свои копии и удалите `www\lang`. Подробно в руководстве.

Без Python: [manual/КАК.txt](manual/КАК.txt). English: [README.md](README.md) и [manual/HOW.txt](manual/HOW.txt).
