//=============================================================================
// NP_Language.js
//=============================================================================
/*:
 * @plugindesc v1.1 Выбор языка игры: Русский / English (переключатель в Настройках и на титуле).
 * @author NP RU patch
 *
 * @help
 * Язык хранится в ConfigManager.npLanguage ('ru' | 'en', по умолчанию 'ru'),
 * т.е. в config.rpgsave — глобально, а не в сохранении. Сохранения
 * совместимы в обе стороны: структура данных и событий одинакова.
 *
 * Режим EN:
 *  - CSV (./csv/*.csv) читаются из www/lang/en/csv/, если там есть файл
 *    (перехват fs.readFileSync и XHR — работает для MEO_*, KNS_*, TB_*);
 *  - JSON из data/ загружаются как есть, затем поверх кладётся
 *    www/lang/en/data_overlay.json (замена только строк — структура
 *    команд событий не меняется, все исправления мода сохраняются);
 *  - подписи опций/меню из параметров плагинов переводятся на лету;
 *  - плагины NP_* выбирают строку через NP_L(ru, en).
 *
 * Переключение: Настройки → «Язык / Language» или кнопка «RU | EN»
 * на титульном экране (слева от регулятора громкости). После
 * подтверждения игра перезапускается (location.reload()).
 *
 * API для других плагинов (в т.ч. будущего NP_Stress):
 *   NP_Language.lang()      -> 'ru' | 'en'
 *   NP_Language.isEn()      -> true в английском режиме
 *   NP_Language.t(ru, en)   -> строка под текущий язык (то же: NP_L)
 *   Шаблон в начале плагина:
 *     var NP_L = window.NP_L || function(r) { return r; };
 *     ... this.addCommand(NP_L('Стресс', 'Stress'), 'npStress');
 *   Подписи из параметров плагина: добавьте пару в PARAMS_EN ниже
 *   или переводите их через NP_L в самом плагине.
 *
 * Должен стоять в plugins.js сразу после MEO_Util_Node (до любых
 * плагинов, читающих CSV при загрузке, например MEO_VXACE_CSV_LogSheet).
 */
var Imported = Imported || {};
Imported.NP_Language = true;
var NP_Language = NP_Language || {};

(function() {
    'use strict';

    // ------------------------------------------------------------- language
    function readConfigLang() {
        try {
            var json = StorageManager.load(-1);
            if (json) {
                var c = JSON.parse(json);
                if (c && (c.npLanguage === 'en' || c.npLanguage === 'ru')) return c.npLanguage;
            }
        } catch (e) { console.warn('NP_Language: config read failed', e); }
        return 'ru';
    }
    var LANG = readConfigLang();
    var EN = LANG === 'en';

    NP_Language.lang = function() { return LANG; };
    NP_Language.isEn = function() { return EN; };
    NP_Language.isRu = function() { return !EN; };
    NP_Language.t = function(ru, en) { return (EN && en != null) ? en : ru; };
    window.NP_L = NP_Language.t;
    var T = NP_Language.t;

    // ------------------------------------------------------------- paths
    var fs = null, pathMod = null, WWW = null;
    try {
        if (typeof require === 'function') { fs = require('fs'); pathMod = require('path'); }
    } catch (e) { fs = null; }
    try {
        if (typeof process === 'object' && process.mainModule && pathMod) {
            WWW = pathMod.dirname(process.mainModule.filename).replace(/\\/g, '/');
        }
    } catch (e) { WWW = null; }
    var EN_DIR_REL = 'lang/en/';                         // relative to index.html (www)
    var EN_DIR_FS = WWW ? WWW + '/' + EN_DIR_REL : './' + EN_DIR_REL;

    function readText(rel) {                             // rel: relative to www
        try {
            if (fs && WWW) return fs.readFileSync(WWW + '/' + rel, 'utf8');
        } catch (e) { /* fall through */ }
        try {
            var x = new XMLHttpRequest();
            x.open('GET', rel, false);
            x.overrideMimeType('application/json; charset=utf-8');
            x.send();
            if (x.status < 400) return x.responseText;
        } catch (e2) { /* ignore */ }
        return null;
    }
    function readJson(rel) {
        var s = readText(rel);
        try { return s ? JSON.parse(s) : null; } catch (e) { console.warn('NP_Language: bad JSON', rel, e); return null; }
    }

    // ------------------------------------------------------------- EN mode
    var EN_CSV = {}, OVERLAY = null;
    if (EN) {
        var info = readJson(EN_DIR_REL + 'build_info.json');
        if (info && info.files) Object.keys(info.files).forEach(function(k) { EN_CSV[k] = true; });
        OVERLAY = readJson(EN_DIR_REL + 'data_overlay.json') || {files: {}, sub: {}};
        if (!Object.keys(EN_CSV).length) console.warn('NP_Language: www/lang/en/build_info.json not found, CSV stay Russian');
    }
    NP_Language.enCsvList = function() { return Object.keys(EN_CSV); };

    // 'path/to/csv/sub/x.csv' -> 'sub/x.csv' if an EN version exists
    function enCsvRel(p) {
        if (!EN || typeof p !== 'string') return null;
        var s = p.replace(/\\/g, '/');
        if (s.indexOf('lang/en/') >= 0) return null;
        var q = s.split(/[?#]/)[0];
        var re = /(^|\/)csv\//g, m, best = null;
        while ((m = re.exec(q))) {
            var rel = q.slice(m.index + m[0].length);
            if (EN_CSV[rel]) best = rel;
        }
        return best;
    }
    NP_Language.mapCsvPath = function(p, forXhr) {
        var rel = enCsvRel(p);
        if (!rel) return p;
        return (forXhr ? EN_DIR_REL : EN_DIR_FS) + 'csv/' + rel;
    };

    if (EN) {
        // fs.readFileSync / existsSync (shared module object: MEO_Util_Node, TB_EroWindow, ...)
        if (fs && fs.readFileSync && !fs.__npLang) {
            var _rfs = fs.readFileSync;
            fs.readFileSync = function(p) {
                var mp = NP_Language.mapCsvPath(p, false);
                if (mp !== p) {
                    var args = Array.prototype.slice.call(arguments); args[0] = mp;
                    try { return _rfs.apply(this, args); } catch (e) { console.warn('NP_Language: EN CSV missing, using RU', mp); }
                }
                return _rfs.apply(this, arguments);
            };
            fs.__npLang = true;
        }
        // global helper from MEO_Util_Node (in case it holds its own fs reference)
        if (typeof LoadFileUTF8Escaped === 'function') {
            var _lf = LoadFileUTF8Escaped;
            window.LoadFileUTF8Escaped = function(p) {
                var mp = NP_Language.mapCsvPath(p, false);
                if (mp !== p) { try { return _lf.call(this, mp); } catch (e) { /* RU fallback */ } }
                return _lf.apply(this, arguments);
            };
        }
        // XHR loaders (TB_NPCWindow, TB_NpcCsvProfileWindow, TB_OptionScene, Test_ProfileWindow, ...)
        var _open = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            var mp = NP_Language.mapCsvPath(url, true);
            if (mp !== url) {
                var args = Array.prototype.slice.call(arguments); args[1] = mp;
                return _open.apply(this, args);
            }
            return _open.apply(this, arguments);
        };
    }

    // ------------------------------------------------------------- plugin parameters (labels)
    var PARAMS_EN = {
        'Torigoya_CommonMenu': {'Сложность': 'Difficulty'},
        'NP_AutoSave': {'Автосохранение': 'Autosave', 'Автосохранение…': 'Autosaving…'},
        'NP_QuestMarker': {'Метки заданий': 'Quest markers'},
        'NP_FastBattle': {'Быстрый бой': 'Fast battle'},
        'NP_TitleProgress': {'Заставка по прогрессу': 'Progress-based title screen'},
        'NP_Voice': {'Озвучка добавок': 'Mod voice effects'},
        'NP_SaveThumb': {'Сохранение везде': 'Save anywhere',
            'Верная жрица,Смятение,Двойная жизнь,Падение': 'Faithful Priestess,Turmoil,Double Life,Fall'},
        'NP_OutfitReact': {'Реплики про одежду': 'Outfit comments'},
        'NP_Campfire': {'Разговоры на привале': 'Campfire talks'},
        'NP_Titles': {'Уведомления о титулах': 'Title notifications', 'Титулы': 'Titles'},
        'NP_ClothDamage': {'Рваная одежда': 'Torn clothing'}
    };
    NP_Language.PARAMS_EN = PARAMS_EN;
    function translateParams() {
        var all = PluginManager._parameters || {};
        Object.keys(PARAMS_EN).forEach(function(name) {
            var p = all[name.toLowerCase()], map = PARAMS_EN[name];
            if (!p) return;
            Object.keys(p).forEach(function(k) {
                var v = p[k];
                if (typeof v !== 'string' || !/[А-Яа-яЁё]/.test(v)) return;
                if (map.hasOwnProperty(v)) { p[k] = map[v]; return; }
                // labels embedded in struct params (Torigoya baseItems)
                Object.keys(map).forEach(function(ru) {
                    var esc = JSON.stringify(ru).slice(1, -1);
                    v = v.split('\\"' + esc + '\\"').join('\\"' + JSON.stringify(map[ru]).slice(1, -1) + '\\"');
                });
                p[k] = v;
            });
        });
    }
    if (EN) translateParams();

    // ------------------------------------------------------------- data overlay (EN)
    var CYR = /[А-Яа-яЁё]/;
    function overlayWalk(obj, exact, subs) {
        var n = 0;
        (function walk(o) {
            if (!o || typeof o !== 'object') return;
            var isCmd = Array.isArray(o.parameters) && typeof o.code === 'number';
            if (isCmd && (o.code === 108 || o.code === 408)) return;        // comments stay as is
            var keys = Array.isArray(o) ? null : Object.keys(o);
            var len = keys ? keys.length : o.length;
            for (var i = 0; i < len; i++) {
                var k = keys ? keys[i] : i, v = o[k];
                if (typeof v === 'string') {
                    if (!CYR.test(v)) continue;
                    var nv = v;
                    if (exact && exact.hasOwnProperty(v)) nv = exact[v];
                    else if (subs) for (var j = 0; j < subs.length; j++) {
                        if (nv.indexOf(subs[j][0]) >= 0) nv = nv.split(subs[j][0]).join(subs[j][1]);
                    }
                    if (nv !== v) { o[k] = nv; n++; }
                } else if (v && typeof v === 'object') walk(v);
            }
        })(obj);
        return n;
    }
    var SUBS = null;
    function subsList() {
        if (!SUBS) {
            var s = (OVERLAY && OVERLAY.sub) || {};
            SUBS = Object.keys(s).sort(function(a, b) { return b.length - a.length; }).map(function(k) { return [k, s[k]]; });
        }
        return SUBS;
    }
    NP_Language.applyOverlay = function(fileName, obj) {
        if (!EN || !OVERLAY || !obj) return 0;
        var exact = OVERLAY.files ? OVERLAY.files[fileName] : null;
        var subs = subsList();
        if (!exact && !subs.length) return 0;
        return overlayWalk(obj, exact, subs);
    };
    NP_Language._overlayCount = {};

    // ------------------------------------------------------------- lazy install (after all plugins)
    var installed = false;
    function install() {
        if (installed) return;
        installed = true;
        installData();
        installConfig();
        installOptions();
        installTitle();
        installStartup();
        installKnsTerms();
    }
    NP_Language.install = install;

    // RU mode: KNS quest plugins pick their terms by language id (1 = English);
    // the RU build runs with id 1, so the journal tabs / receive dialog showed English.
    function installKnsTerms() {
        if (EN) return;
        try {
            var id = 1; // English slot (the RU text lives in the English columns)
            /* global KNS_QuestBase, KNS_QuestReceive -- top-level const, not on window */
            if (typeof KNS_QuestBase !== 'undefined' && KNS_QuestBase.BASE_TERMS && KNS_QuestBase.BASE_TERMS[id]) {
                KNS_QuestBase.BASE_TERMS[id] = ['Задания', 'В процессе', 'Решено', 'Выполнено!'];
            }
            if (typeof KNS_QuestReceive !== 'undefined' && KNS_QuestReceive.BASE_TERMS && KNS_QuestReceive.BASE_TERMS[id]) {
                var en = KNS_QuestReceive.BASE_TERMS[id];
                KNS_QuestReceive.BASE_TERMS[id] = [
                    'Получено: %1!', 'Получено: %1 ×%2!', String(en[2]).replace(/^Obtained /, 'Получено: '),
                    'Принять задание\n«%1»?', 'Задание\n«%1» принято!', 'Да', 'Нет'];
            }
        } catch (e) { console.warn('NP_Language: KNS terms failed', e); }
    }

    // RU mode: the original language CE (CE 1, English branch) hardcodes English
    // $dataSystem.terms (menu/inventory tabs, params, basic) and shop commands.
    // Point those scripts at the Russian System.json values instead.
    var RU_TERMS = null;
    NP_Language.ruTerms = function(key) {
        return RU_TERMS && RU_TERMS[key] ? RU_TERMS[key].slice() : null;
    };
    function snapshotRuTerms(sys) {
        if (!sys || !sys.terms || RU_TERMS) return;
        var t = sys.terms, c = (t.commands || []).slice();
        if (c.length > 3) { c[2] = 'Касание'; c[3] = 'Дыхание'; } // EN: Touch / Breathing
        RU_TERMS = { commands: c, params: (t.params || []).slice(), basic: (t.basic || []).slice() };
    }
    function patchRuCommonEvents(ces) {
        var n = 0;
        var shop = { '"Buy"': 'TextManager.buy', '"Sell"': 'TextManager.sell', '"Cancel"': 'TextManager.cancel' };
        (ces || []).forEach(function(ev) {
            if (!ev || !ev.list) return;
            ev.list.forEach(function(cmd) {
                var p = cmd.parameters;
                if (cmd.code === 355 && typeof p[0] === 'string') {
                    var m = /^\$dataSystem\.terms\.(commands|params|basic)=(\[.*\])\s*$/.exec(p[0]);
                    if (m) { p[0] = '$dataSystem.terms.' + m[1] + '=NP_Language.ruTerms("' + m[1] + '")||' + m[2]; n++; }
                } else if (cmd.code === 655 && typeof p[0] === 'string') {
                    var m2 = /this\.addCommand\(("Buy"|"Sell"|"Cancel"),/.exec(p[0]);
                    if (m2) { p[0] = p[0].replace(m2[1], shop[m2[1]]); n++; }
                } else if (cmd.code === 122 && p[0] === 80 && p[3] === 4 && p[4] === '"Cancel"') {
                    p[4] = 'TextManager.cancel'; n++;
                }
            });
        });
        return n;
    }

    function installData() {
        if (!EN) {
            var _onLoadRu = DataManager.onLoad;
            DataManager.onLoad = function(object) {
                try {
                    if (object === window.$dataSystem) snapshotRuTerms(object);
                    else if (object === window.$dataCommonEvents) NP_Language._overlayCount['CommonEvents.json(ru)'] = patchRuCommonEvents(object);
                } catch (e) { console.warn('NP_Language: RU term patch failed', e); }
                return _onLoadRu.apply(this, arguments);
            };
            return;
        }
        var src = {};
        var _ldf = DataManager.loadDataFile;
        DataManager.loadDataFile = function(name, file) {
            src[name] = file;
            return _ldf.apply(this, arguments);
        };
        var _onLoad = DataManager.onLoad;
        DataManager.onLoad = function(object) {
            try {
                var file = null;
                for (var name in src) { if (window[name] === object) { file = src[name]; break; } }
                if (file) {
                    var n = NP_Language.applyOverlay(file, object);
                    NP_Language._overlayCount[file] = n;
                }
            } catch (e) { console.warn('NP_Language: overlay failed', e); }
            return _onLoad.apply(this, arguments);
        };
    }

    function installConfig() {
        ConfigManager.npLanguage = LANG;
        var _make = ConfigManager.makeData;
        ConfigManager.makeData = function() {
            var config = _make.apply(this, arguments);
            config.npLanguage = this.npLanguage === 'en' ? 'en' : 'ru';
            return config;
        };
        var _apply = ConfigManager.applyData;
        ConfigManager.applyData = function(config) {
            _apply.apply(this, arguments);
            var v = config && config.npLanguage;
            this.npLanguage = (v === 'en' || v === 'ru') ? v : 'ru';
        };
    }

    NP_Language.LABEL = 'Язык / Language';
    NP_Language.langName = function(code) { return code === 'en' ? 'English' : 'Русский'; };
    NP_Language.other = function() { return EN ? 'ru' : 'en'; };
    // switch and restart
    NP_Language.setLanguage = function(code, noReload) {
        code = code === 'en' ? 'en' : 'ru';
        ConfigManager.npLanguage = code;
        ConfigManager.save();
        if (noReload || code === LANG) return;
        NP_Language._reloading = true;
        try { AudioManager.stopAll(); } catch (e) { /* ignore */ }
        setTimeout(function() { location.reload(); }, 50);
    };
    // Both shipped translations occupy the original English CSV slot (V1 = 1).
    // Changing the file language requires a reload; resume the new game once.
    var STARTUP_KEY = 'NP_Language.pendingNewGame';
    NP_Language.chooseStartupLanguage = function(code, interpreter) {
        code = code === 'en' ? 'en' : 'ru';
        if (code !== LANG) {
            try { sessionStorage.setItem(STARTUP_KEY, code); }
            catch (e) { console.warn('NP_Language: startup resume unavailable', e); }
        }
        NP_Language.setLanguage(code);
        if (code !== LANG) interpreter.setWaitMode('npStartupLanguage');
    };
    NP_Language.initializeStartupLanguage = function() {
        $gameVariables.setValue(1, 1);
        $gameVariables.setValue(396, 0);
        $gameVariables.setValue(80, EN ? 'Cancel' : 'Отмена');
        var names = EN ? ['Jimmy', 'Kohaku', 'Yarizo'] : ['Джими', 'Кохаку', 'Яризо'];
        [1, 2, 21].forEach(function(id, i) { $gameActors.actor(id).setName(names[i]); });
        NP_Language.resumeNewGame = false;
    };
    function installStartup() {
        var _start = Scene_Title.prototype.start;
        Scene_Title.prototype.start = function() {
            var pending = null;
            try { pending = sessionStorage.getItem(STARTUP_KEY); sessionStorage.removeItem(STARTUP_KEY); }
            catch (e) { /* Normal title operation remains available without session storage. */ }
            if (pending && pending === LANG) {
                // Other plugins initialize their utility/log windows in this chain.
                _start.apply(this, arguments);
                NP_Language.resumeNewGame = true;
                DataManager.setupNewGame();
                SceneManager.goto(Scene_Map);
                return;
            }
            return _start.apply(this, arguments);
        };
        var _wait = Game_Interpreter.prototype.updateWaitMode;
        Game_Interpreter.prototype.updateWaitMode = function() {
            if (this._waitMode === 'npStartupLanguage') return !!NP_Language._reloading;
            return _wait.apply(this, arguments);
        };
    }
    NP_Language.inGame = function() {
        var st = SceneManager._stack || [];
        for (var i = 0; i < st.length; i++) if (st[i] !== Scene_Title && st[i] !== Scene_Boot) return true;
        return false;
    };

    // ---- confirm dialog (shared by Options and Title)
    function Window_NpLangConfirm() { this.initialize.apply(this, arguments); }
    Window_NpLangConfirm.prototype = Object.create(Window_Command.prototype);
    Window_NpLangConfirm.prototype.constructor = Window_NpLangConfirm;
    Window_NpLangConfirm.prototype.initialize = function() {
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.openness = 0;
        this.deactivate();
    };
    Window_NpLangConfirm.prototype.windowWidth = function() { return 260; };
    Window_NpLangConfirm.prototype.makeCommandList = function() {
        this.addCommand('Да / Yes', 'ok');
        this.addCommand('Нет / No', 'cancel');
    };
    Window_NpLangConfirm.prototype.itemTextAlign = function() { return 'center'; };
    NP_Language.Window_Confirm = Window_NpLangConfirm;

    function createConfirm(scene, onCancel) {
        var help = new Window_Help(3);
        help.width = Math.min(Graphics.boxWidth - 40, 720);
        help.x = (Graphics.boxWidth - help.width) / 2;
        help.openness = 0;
        var win = new Window_NpLangConfirm();
        win.x = (Graphics.boxWidth - win.width) / 2;
        var total = help.height + win.height;
        help.y = Math.max(0, (Graphics.boxHeight - total) / 2);
        win.y = help.y + help.height;
        win.setHandler('ok', function() { NP_Language.setLanguage(NP_Language.other()); });
        win.setHandler('cancel', function() {
            win.close(); help.close(); win.deactivate();
            onCancel();
        });
        scene.addWindow(help);
        scene.addWindow(win);
        scene._npLangHelp = help;
        scene._npLangConfirm = win;
        return win;
    }
    function openConfirm(scene) {
        var to = NP_Language.other();
        var lines = to === 'en'
            ? ['Переключить язык на English?', 'Switch the game to English? It will restart.']
            : ['Переключить язык на Русский?', 'Switch the game to Russian? It will restart.'];
        lines.push(NP_Language.inGame()
            ? 'Несохранённый прогресс будет потерян. / Unsaved progress will be lost.'
            : 'Игра перезапустится. / The game will restart.');
        scene._npLangHelp.setText(lines.join('\n'));
        scene._npLangHelp.open();
        var w = scene._npLangConfirm;
        w.refresh(); w.select(0); w.open(); w.activate();
    }
    NP_Language.openConfirm = openConfirm;

    function installOptions() {
        var _add = Window_Options.prototype.addGeneralOptions;
        Window_Options.prototype.addGeneralOptions = function() {
            this.addCommand(NP_Language.LABEL, 'npLanguage');
            _add.apply(this, arguments);
        };
        var _status = Window_Options.prototype.statusText;
        Window_Options.prototype.statusText = function(index) {
            if (this.commandSymbol(index) === 'npLanguage') return NP_Language.langName(LANG);
            return _status.apply(this, arguments);
        };
        function ask(win) {
            var sc = SceneManager._scene;
            if (!sc || !sc._npLangConfirm) return false;
            SoundManager.playOk();
            win.deactivate();
            openConfirm(sc);
            return true;
        }
        ['processOk', 'cursorRight', 'cursorLeft'].forEach(function(fn) {
            var _f = Window_Options.prototype[fn];
            Window_Options.prototype[fn] = function(wrap) {
                if (this.commandSymbol(this.index()) === 'npLanguage') {
                    if (fn !== 'processOk' && wrap) return;            // no repeat-wrap
                    if (ask(this)) return;
                }
                return _f.apply(this, arguments);
            };
        });
        var _create = Scene_Options.prototype.create;
        Scene_Options.prototype.create = function() {
            _create.apply(this, arguments);
            var self = this;
            createConfirm(this, function() { if (self._optionsWindow) self._optionsWindow.activate(); });
        };
    }

    // ---- title button "RU | EN" (left of NP_TitleVolume)
    var BW = 116, BH = 52, PAD = 16, GAP = 8;
    function Sprite_NpLangButton() { this.initialize.apply(this, arguments); }
    Sprite_NpLangButton.prototype = Object.create(Sprite.prototype);
    Sprite_NpLangButton.prototype.constructor = Sprite_NpLangButton;
    Sprite_NpLangButton.prototype.initialize = function(scene) {
        Sprite.prototype.initialize.call(this, new Bitmap(BW, BH));
        this._scene = scene;
        var right = Graphics.width - PAD;
        if (Imported.NP_TitleVolume) right -= 300 + GAP;
        this.x = right - BW;
        this.y = PAD;
        this._hover = false;
        this.redraw();
    };
    Sprite_NpLangButton.prototype.isInside = function() {
        var x = TouchInput.x - this.x, y = TouchInput.y - this.y;
        return x >= 0 && y >= 0 && x < BW && y < BH;
    };
    Sprite_NpLangButton.prototype.update = function() {
        Sprite.prototype.update.call(this);
        var sc = this._scene, busy = sc._npLangConfirm && sc._npLangConfirm.isOpen();
        var hover = !busy && this.isInside();
        if (hover !== this._hover) { this._hover = hover; this.redraw(); }
        if (!busy && TouchInput.isTriggered() && this.isInside()) {
            SoundManager.playOk();
            NP_Language.titleAsk(sc);
        }
    };
    Sprite_NpLangButton.prototype.redraw = function() {
        var b = this.bitmap, ctx = b._context;
        b.clear();
        ctx.save();
        ctx.globalAlpha = this._hover ? 0.75 : 0.5;
        ctx.fillStyle = '#000000';
        rr(ctx, 0.5, 0.5, BW - 1, BH - 1, 12); ctx.fill();
        ctx.globalAlpha = this._hover ? 0.9 : 0.6;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        // highlight current language
        ctx.fillStyle = 'rgba(255,224,138,0.28)';
        rr(ctx, EN ? BW / 2 + 2 : 6, 8, BW / 2 - 8, BH - 16, 8); ctx.fill();
        ctx.restore();
        b.fontSize = 22;
        b.outlineColor = 'rgba(0,0,0,0.8)'; b.outlineWidth = 3;
        b.textColor = EN ? '#bbbbbb' : '#ffe08a';
        b.drawText('RU', 4, 0, BW / 2 - 4, BH, 'center');
        b.textColor = EN ? '#ffe08a' : '#bbbbbb';
        b.drawText('EN', BW / 2, 0, BW / 2 - 4, BH, 'center');
        b.textColor = 'rgba(255,255,255,0.6)';
        b.drawText('|', 0, 0, BW, BH, 'center');
        b._setDirty && b._setDirty();
    };
    function rr(ctx, x, y, w, h, r) {
        r = Math.min(r, h / 2, w / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }
    NP_Language.Sprite_Button = Sprite_NpLangButton;

    NP_Language.titleAsk = function(sc) {
        sc = sc || SceneManager._scene;
        if (!sc || !sc._npLangConfirm || sc._npLangConfirm.isOpen()) return;
        if (sc._commandWindow) { sc._npLangCmdWasActive = sc._commandWindow.active; sc._commandWindow.deactivate(); }
        openConfirm(sc);
    };

    function installTitle() {
        if (EN) { // EN: title logo without the «Русская версия» caption
            var _lt2 = ImageManager.loadTitle2;
            ImageManager.loadTitle2 = function(filename, hue) {
                if (filename === 'np_title_logo') filename = 'np_title_logo_en';
                return _lt2.call(this, filename, hue);
            };
        }
        var _create = Scene_Title.prototype.create;
        Scene_Title.prototype.create = function() {
            _create.apply(this, arguments);
            var self = this;
            createConfirm(this, function() {
                if (self._commandWindow && self._npLangCmdWasActive !== false) self._commandWindow.activate();
            });
            this._npLangButton = new Sprite_NpLangButton(this);
            this.addChild(this._npLangButton);
        };
    }

    // ------------------------------------------------------------- boot hook
    var _bootCreate = Scene_Boot.prototype.create;
    Scene_Boot.prototype.create = function() {
        install();
        _bootCreate.apply(this, arguments);
    };

    console.log('NP_Language: ' + LANG + (EN ? ' (EN CSV: ' + Object.keys(EN_CSV).length + ')' : ''));
})();
