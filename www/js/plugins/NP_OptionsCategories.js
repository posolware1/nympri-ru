//=============================================================================
// NP_OptionsCategories.js  (RU mod for Nymphomania Priestess)
//=============================================================================
/*:
 * @plugindesc [NP] Options menu split into categories (Sound / Battle / Mechanics / UI / Language / Other). Load LAST.
 * @author RU mod
 *
 * @param showCounts
 * @text Show option counts
 * @type boolean
 * @default true
 *
 * @help
 * Must be placed AFTER every plugin that adds options (all NP_*, CustomizeConfigItem,
 * StartUpFullScreen, TB_OptionWindow, Mano_InputConfig, TerraxLighting...).
 *
 * No plugin is edited: the full command list is still built by
 * Window_Options.prototype.makeCommandList (with every plugin hook), then
 * grouped by symbol. Rendering and value changes are the original ones
 * (Window_NpOptionsSub is a subclass of Window_Options, filtered by symbol).
 *
 * Unknown symbols are guessed by keywords; anything still unknown goes to
 * «Прочее / Other», so options added later never disappear.
 *
 * API for other plugins:
 *   NP_OptionsCategories.register('mySymbol', 'battle');   // sound|battle|mech|ui|lang|misc
 *   NP_OptionsCategories.categoryOf('mySymbol', 'name')
 *   NP_OptionsCategories.allCommands()   // full unfiltered list of the open scene
 */
var Imported = Imported || {};
Imported.NP_OptionsCategories = true;
var NP_OptionsCategories = window.NP_OptionsCategories = {};

(function() {
    'use strict';
    var P = PluginManager.parameters('NP_OptionsCategories');
    var SHOW_COUNTS = String(P.showCounts || 'true') !== 'false';
    var C = NP_OptionsCategories;

    function isEn() {
        try { return !!(window.NP_Language && NP_Language.isEn && NP_Language.isEn()); } catch (e) { return false; }
    }
    function L(ru, en) { return isEn() ? en : ru; }

    // ---- categories ---------------------------------------------------------
    C.CATS = [
        { id: 'sound',  ru: 'Звук',          en: 'Sound',
          dru: 'Громкость музыки, фона и эффектов, музыка привала, озвучка.',
          den: 'Music, ambience and effect volume, camp music, voice extras.' },
        { id: 'battle', ru: 'Бой',           en: 'Battle',
          dru: 'Скорость и автоматизация боя, супер-удары, рваная одежда, боевая графика.',
          den: 'Battle speed and automation, super attacks, torn clothing, battle graphics.' },
        { id: 'mech',   ru: 'Механики',      en: 'Mechanics',
          dru: 'Напряжение, привал, разговоры, сохранения, утренние намёки, контент.',
          den: 'Stress, camp, conversations, saving, morning hints, content.' },
        { id: 'ui',     ru: 'Интерфейс',     en: 'Interface',
          dru: 'Управление, уведомления, подсказки, метки заданий, лавка, экран.',
          den: 'Controls, notifications, hints, quest markers, shop, screen.' },
        { id: 'lang',   ru: 'Язык и текст',  en: 'Language & Text',
          dru: 'Язык игры и всё, что касается текста.',
          den: 'Game language and text-related settings.' },
        { id: 'misc',   ru: 'Прочее',        en: 'Other',
          dru: 'Настройки, которые не попали в другие разделы.',
          den: 'Settings that do not belong to other sections.' }
    ];
    C.catById = function(id) { for (var i = 0; i < C.CATS.length; i++) if (C.CATS[i].id === id) return C.CATS[i]; return null; };
    C.catName = function(id) { var c = C.catById(id); return c ? L(c.ru, c.en) : id; };
    C.catDesc = function(id) { var c = C.catById(id); return c ? L(c.dru, c.den) : ''; };

    // symbol -> category, built from every addCommand in js/plugins (original + mod)
    C.MAP = {
        // rpg_windows.js (core)
        bgmVolume: 'sound', bgsVolume: 'sound', meVolume: 'sound', seVolume: 'sound',
        alwaysDash: 'ui', commandRemember: 'ui',
        // original game plugins
        hideBattleGraphic: 'battle',          // TB_OptionWindow (S197)
        startUpFullScreen: 'ui',              // StartUpFullScreen (NW.js only)
        TxLighting: 'ui',                     // TerraxLighting (when enabled)
        // our NP_* plugins
        npLanguage: 'lang',
        npCampMusic: 'sound', npVoiceExtras: 'sound',
        npFastBattle: 'battle', npBattleSpeed2: 'battle', npAutoBattle: 'battle', npBattleAuto: 'battle',
        npClothDamage: 'battle', npSuperAttackAuto: 'battle', npSuperAuto: 'battle', npQteAuto: 'battle', npSuperAttack: 'battle',
        npStress: 'mech', npCampSkills: 'mech', npCampTalk: 'mech', npOutfitTalk: 'mech',
        npSaveAnywhere: 'mech', npAutoSave: 'mech', npMorningHints: 'mech',
        npTitlePopup: 'ui', npTitleProgress: 'ui', npShopCompare: 'ui', npQuestHints: 'ui', npQuestMarkers: 'ui'
    };
    // CustomizeConfigItem generates symbols Boolean1.. / Number1..; match those by their name.
    C.NAME_RULES = [
        [/TP Auto Heal|疲労値/i, 'battle'],
        [/Scat|スカトロ/i, 'mech'],
        [/Graphic Sync/i, 'ui'],
        [/KEYBOARD_CONFIG|GAMEPAD_CONFIG|キーコンフィグ|ゲームパッド/i, 'ui']   // Mano_InputConfig
    ];
    C.KEYWORDS = [
        [/volume|sound|audio|music|bgm|bgs|\bse\b|\bme\b|voice|громк|звук|музык|озвуч|голос/i, 'sound'],
        [/battle|combat|qte|super|strike|enemy|бой|боя|битв|сражен|удар|атак/i, 'battle'],
        [/lang|text|message|msg|font|язык|текст|сообщ|шрифт/i, 'lang'],
        [/dash|remember|window|display|hud|graphic|screen|marker|popup|cursor|keyboard|gamepad|control|notif|interface|shop|интерфейс|экран|окн|граф|управлен|уведом|метк|лавк/i, 'ui'],
        [/save|hint|camp|stress|ntr|event|talk|сохран|привал|подсказ|намёк|напряж|реплик|разговор/i, 'mech']
    ];
    C.FIRST = ['bgmVolume', 'bgsVolume', 'meVolume', 'seVolume'];
    C.register = function(symbol, cat) { if (symbol && C.catById(cat)) C.MAP[symbol] = cat; };
    C.categoryOf = function(symbol, name) {
        symbol = String(symbol || ''); name = String(name || '');
        if (Object.prototype.hasOwnProperty.call(C.MAP, symbol)) return C.MAP[symbol];
        var s = symbol + ' ' + name, i;
        for (i = 0; i < C.NAME_RULES.length; i++) if (C.NAME_RULES[i][0].test(s)) return C.NAME_RULES[i][1];
        for (i = 0; i < C.KEYWORDS.length; i++) if (C.KEYWORDS[i][0].test(s)) return C.KEYWORDS[i][1];
        return 'misc';
    };

    // translated labels for original, untranslated option names (display only)
    C.LABELS = [
        [/^Hide Battle Graphic$/, 'Скрыть боевую графику', 'Hide battle graphics'],
        [/TP Auto Heal/, 'Автовосстановление усталости', 'Fatigue (TP) auto-recovery'],
        [/^スカトロ\/Scat$/, 'Скатология', 'Scat'],
        [/^Disable Graphic Sync$/, 'Отключить синхронизацию графики', 'Disable graphic sync'],
        [/^Full Screenで起動$|フルスクリーンで起動/, 'Запуск в полноэкранном режиме', 'Start in full screen']
    ];
    function displayName(name) {
        for (var i = 0; i < C.LABELS.length; i++) if (C.LABELS[i][0].test(name)) return L(C.LABELS[i][1], C.LABELS[i][2]);
        return name;
    }

    C._resume = null;   // {cat, index} when we leave the scene from inside a category (e.g. key config)
    C.allCommands = function() {
        var s = SceneManager._scene, w = s && s._npOptSub;
        return w ? (w._npAll || []).slice() : [];
    };

    // An options-core plugin (YEP_OptionsCore etc.) already has its own categories:
    // then only the symbol->category API above is provided, the scene is left to it.
    if (Imported.YEP_OptionsCore || Imported.PP_Option || Imported.SRD_OptionsUpgrade) {
        console.warn('[NP_OptionsCategories] options-core plugin detected; leaving Scene_Options to it.');
        C.disabled = true;
        return;
    }

    // ---- Window_NpOptionsSub : Window_Options filtered by category ---------
    function Window_NpOptionsSub() { this.initialize.apply(this, arguments); }
    Window_NpOptionsSub.prototype = Object.create(Window_Options.prototype);
    Window_NpOptionsSub.prototype.constructor = Window_NpOptionsSub;
    window.Window_NpOptionsSub = Window_NpOptionsSub;

    Window_NpOptionsSub.prototype.initialize = function(rect) {
        this._npRect = rect;
        this._npCat = null;
        this._npAll = [];
        Window_Options.prototype.initialize.call(this);
        this.x = rect.x; this.y = rect.y;
    };
    Window_NpOptionsSub.prototype.windowWidth = function() { return this._npRect.width; };
    Window_NpOptionsSub.prototype.windowHeight = function() { return this._npRect.height; };
    Window_NpOptionsSub.prototype.updatePlacement = function() { this.x = this._npRect.x; this.y = this._npRect.y; };
    Window_NpOptionsSub.prototype.statusWidth = function() { return 150; };
    Window_NpOptionsSub.prototype.makeCommandList = function() {
        Window_Options.prototype.makeCommandList.call(this);
        var all = this._list.slice(), seen = {}, out = [];
        // safety: a symbol added twice by misconfigured plugins is shown once
        all = all.filter(function(c) { if (seen[c.symbol]) return false; seen[c.symbol] = true; return true; });
        all.forEach(function(c) { c.npCat = C.categoryOf(c.symbol, c.name); });
        this._npAll = all;
        var cat = this._npCat;
        if (cat) {
            out = all.filter(function(c) { return c.npCat === cat; });
            // core volume sliders first in «Звук» (stable, everything else keeps plugin order)
            var pri = function(c) { var i = C.FIRST.indexOf(c.symbol); return i < 0 ? 99 : i; };
            out = out.map(function(c, i) { return [c, i]; })
                .sort(function(a, b) { return (pri(a[0]) - pri(b[0])) || (a[1] - b[1]); })
                .map(function(x) { return x[0]; });
        }
        this._list = out;
    };
    Window_NpOptionsSub.prototype.commandName = function(index) {
        return displayName(Window_Options.prototype.commandName.call(this, index));
    };
    Window_NpOptionsSub.prototype.setCategory = function(cat) {
        if (this._npCat === cat) return;
        this._npCat = cat;
        this.refresh();
        this.setTopRow(0);
        if (this.index() >= this.maxItems()) this.select(this.maxItems() - 1);
    };
    Window_NpOptionsSub.prototype.countFor = function(cat) {
        return this._npAll.filter(function(c) { return c.npCat === cat; }).length;
    };
    // Legacy code/tests that do findSymbol('x') on the scene's options window: jump to x's category.
    Window_NpOptionsSub.prototype.findSymbol = function(symbol) {
        var i = Window_Command.prototype.findSymbol.call(this, symbol);
        if (i >= 0) {   // keep the category list + help in sync with the shown section
            if (this._npScene && this._npCat) { this._npScene.npSyncCategory(this._npCat); this._npScene.npUpdateHelp(); }
            return i;
        }
        for (var k = 0; k < this._npAll.length; k++) {
            if (this._npAll[k].symbol === symbol) {
                this.setCategory(this._npAll[k].npCat);
                if (this._npScene) { this._npScene.npSyncCategory(this._npAll[k].npCat); this._npScene.npUpdateHelp(); }
                return Window_Command.prototype.findSymbol.call(this, symbol);
            }
        }
        return -1;
    };
    Window_NpOptionsSub.prototype.processOk = function() {
        var cat = this._npCat, idx = this.index();
        Window_Options.prototype.processOk.call(this);
        if (SceneManager.isSceneChanging()) C._resume = { cat: cat, index: idx };
    };
    Window_NpOptionsSub.prototype.updateHelp = function() {
        if (this._npScene) this._npScene.npUpdateHelp();
    };

    // ---- Window_NpOptionsCategory -------------------------------------------
    function Window_NpOptionsCategory() { this.initialize.apply(this, arguments); }
    Window_NpOptionsCategory.prototype = Object.create(Window_Command.prototype);
    Window_NpOptionsCategory.prototype.constructor = Window_NpOptionsCategory;
    window.Window_NpOptionsCategory = Window_NpOptionsCategory;

    Window_NpOptionsCategory.prototype.initialize = function(rect, sub) {
        this._npRect = rect; this._npSub = sub;
        Window_Command.prototype.initialize.call(this, rect.x, rect.y);
    };
    Window_NpOptionsCategory.prototype.windowWidth = function() { return this._npRect.width; };
    Window_NpOptionsCategory.prototype.windowHeight = function() { return this._npRect.height; };
    Window_NpOptionsCategory.prototype.makeCommandList = function() {
        var sub = this._npSub, self = this;
        C.CATS.forEach(function(c) {
            var n = sub ? sub.countFor(c.id) : 0;
            if (n > 0) self.addCommand(L(c.ru, c.en), c.id, true, n);   // empty categories are hidden
        });
    };
    Window_NpOptionsCategory.prototype.drawItem = function(index) {
        var rect = this.itemRectForText(index);
        this.resetTextColor();
        this.changePaintOpacity(true);
        if (SHOW_COUNTS) {
            this.drawText(this.commandName(index), rect.x, rect.y, rect.width - 44, 'left');
            this.changeTextColor(this.systemColor());
            this.drawText(String(this._list[index].ext), rect.x, rect.y, rect.width, 'right');
            this.resetTextColor();
        } else {
            this.drawText(this.commandName(index), rect.x, rect.y, rect.width, 'left');
        }
    };
    Window_NpOptionsCategory.prototype.select = function(index) {
        Window_Command.prototype.select.call(this, index);
        if (this._npScene) this._npScene.npPreview();
    };
    Window_NpOptionsCategory.prototype.updateHelp = function() {
        if (this._npScene) this._npScene.npUpdateHelp();
    };
    // → also opens the category (keyboard / gamepad)
    Window_NpOptionsCategory.prototype.cursorRight = function() {
        if (this.isOpenAndActive() && this.index() >= 0) this.processOk();
    };

    // ---- help window: shrinks the font so a long line never gets cut -------
    function Window_NpOptionsHelp() { this.initialize.apply(this, arguments); }
    Window_NpOptionsHelp.prototype = Object.create(Window_Help.prototype);
    Window_NpOptionsHelp.prototype.constructor = Window_NpOptionsHelp;
    Window_NpOptionsHelp.prototype.standardFontSize = function() {
        return this._npFs || Window_Help.prototype.standardFontSize.call(this);
    };
    Window_NpOptionsHelp.prototype.refresh = function() {
        this.contents.clear();
        var lines = String(this._text || '').split('\n');
        var base = Window_Help.prototype.standardFontSize.call(this);
        for (var i = 0; i < lines.length; i++) {
            var plain = lines[i].replace(/\\C\[\d+\]/gi, '');
            this._npFs = base;
            this.resetFontSettings();
            while (this._npFs > 16 && this.textWidth(plain) > this.contentsWidth() - this.textPadding() * 2) {
                this._npFs -= 1; this.contents.fontSize = this._npFs;
            }
            this.drawTextEx(lines[i], this.textPadding(), i * this.lineHeight());
        }
        this._npFs = 0; this.resetFontSettings();
    };
    C.Window_NpOptionsHelp = Window_NpOptionsHelp;

    // ---- Scene_Options --------------------------------------------------------
    Scene_Options.prototype.createOptionsWindow = function() {
        var bw = Graphics.boxWidth, bh = Graphics.boxHeight, m = 12;
        var W = Math.min(bw - m * 2, 960);
        var catW = Math.max(220, Math.min(300, Math.floor(W * 0.3)));
        var subW = W - catW;
        var help = new Window_NpOptionsHelp(2);
        var lh = help.lineHeight();
        var maxRows = Math.max(6, Math.min(14, Math.floor((bh - help.height - m * 2 - help.standardPadding() * 2) / lh)));
        var tmp = new Window_Base(0, 0, 1, 1);
        var sub = new Window_NpOptionsSub({ x: 0, y: 0, width: subW, height: tmp.fittingHeight(maxRows) });
        sub._npScene = this;
        sub.setHandler('cancel', this.npOnSubCancel.bind(this));
        // fit the body to the biggest section (no huge empty frame), within the screen
        var need = 0;
        Object.keys(C.CATS).forEach(function(k) { need = Math.max(need, sub.countFor(k)); });
        need = Math.max(need, Object.keys(C.CATS).length);
        var rows = Math.max(6, Math.min(maxRows, need + 1));
        var bodyH = tmp.fittingHeight(rows);
        var totalH = help.height + bodyH;
        var x0 = Math.floor((bw - W) / 2), y0 = Math.max(0, Math.floor((bh - totalH) / 2));
        help.move(x0, y0, W, help.height); help.createContents();
        this._helpWindow = help;
        this.addWindow(help);
        sub._npRect = { x: x0 + catW, y: y0 + help.height, width: subW, height: bodyH };
        sub.move(x0 + catW, y0 + help.height, subW, bodyH);
        sub.createContents(); sub.refresh();

        var cat = new Window_NpOptionsCategory({ x: x0, y: y0 + help.height, width: catW, height: bodyH }, sub);
        cat._npScene = this;
        cat.setHandler('ok', this.npOnCategoryOk.bind(this));
        cat.setHandler('cancel', this.popScene.bind(this));
        this._npOptSub = sub;
        this._npOptCat = cat;
        this._optionsWindow = sub;      // NP_Language confirm & other plugins re-activate this
        this.addWindow(cat);
        this.addWindow(sub);

        var r = C._resume; C._resume = null;
        var ci = r ? cat.findSymbol(r.cat) : -1;
        cat.select(ci >= 0 ? ci : 0);
        if (ci >= 0) {
            this.npEnterCategory(Math.min(r.index, Math.max(0, sub.maxItems() - 1)));
        } else {
            cat.activate(); sub.deactivate(); sub.deselect();
        }
        this.npUpdateHelp();
    };
    Scene_Options.prototype.npCurrentCat = function() {
        var c = this._npOptCat; return c ? c.currentSymbol() : null;
    };
    Scene_Options.prototype.npSyncCategory = function(catId) {
        var c = this._npOptCat; if (!c) return;
        var i = c.findSymbol(catId);
        if (i >= 0 && c.index() !== i) Window_Command.prototype.select.call(c, i);
    };
    Scene_Options.prototype.npPreview = function() {
        var sub = this._npOptSub, cat = this.npCurrentCat();
        if (!sub || !cat) return;
        sub.setCategory(cat);
        if (!sub.active) sub.deselect();
        this.npUpdateHelp();
    };
    Scene_Options.prototype.npEnterCategory = function(index) {
        var sub = this._npOptSub, cat = this._npOptCat;
        sub.setCategory(cat.currentSymbol());
        cat.deactivate();
        sub.activate();
        sub.select(Math.max(0, Math.min(index || 0, sub.maxItems() - 1)));
        this.npUpdateHelp();
    };
    Scene_Options.prototype.npOnCategoryOk = function() { this.npEnterCategory(0); };
    Scene_Options.prototype.npOnSubCancel = function() {
        var sub = this._npOptSub, cat = this._npOptCat;
        sub.deactivate(); sub.deselect();
        cat.activate();
        this.npUpdateHelp();
    };
    Scene_Options.prototype.npUpdateHelp = function() {
        var help = this._helpWindow, cat = this._npOptCat, sub = this._npOptSub;
        if (!help || !cat || !sub) return;
        var id = cat.currentSymbol();
        if (!id) { help.setText(''); return; }
        var t;
        if (sub.active) {
            t = '\\C[16]' + C.catName(id) + '\\C[0]  ' + C.catDesc(id) + '\n' +
                L('←/→ или Enter — изменить,  Esc — назад к разделам', '←/→ or Enter — change,  Esc — back to sections');
        } else {
            t = C.catDesc(id) + '\n' +
                L('Enter или → — открыть раздел,  Esc — выйти и сохранить', 'Enter or → — open section,  Esc — exit and save');
        }
        if (help._text !== t) help.setText(t);
    };
    // mouse / touch: tap the inactive window to switch focus
    var _Scene_Options_update = Scene_Options.prototype.update;
    Scene_Options.prototype.update = function() {
        var cat = this._npOptCat, sub = this._npOptSub;
        if (cat && sub && TouchInput.isTriggered() && !this.npModalOpen()) {
            if (cat.active && sub.isOpen() && sub.isTouchedInsideFrame() && sub.maxItems() > 0) {
                var hi = sub.hitTest(sub.canvasToLocalX(TouchInput.x), sub.canvasToLocalY(TouchInput.y));
                if (hi >= 0) { SoundManager.playCursor(); this.npEnterCategory(hi); sub._touching = false; TouchInput._triggered = false; }
            } else if (sub.active && cat.isTouchedInsideFrame()) {
                var hc = cat.hitTest(cat.canvasToLocalX(TouchInput.x), cat.canvasToLocalY(TouchInput.y));
                if (hc >= 0) {
                    SoundManager.playCursor();
                    this.npOnSubCancel();
                    cat.select(hc);
                    TouchInput._triggered = false;
                }
            }
        }
        _Scene_Options_update.apply(this, arguments);
    };
    Scene_Options.prototype.npModalOpen = function() {
        var w = this._npLangConfirm;   // NP_Language confirm dialog
        return !!(w && w.isOpen && w.isOpen() && w.active);
    };

})();
