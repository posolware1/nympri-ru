#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PLUGIN = path.join(__dirname, "..", "www", "js", "plugins", "NP_Language.js");
const REAL_BYPASS = path.join(__dirname, "..", "www", "lang", "ru", "bypass.json");

function fail(message) {
  console.error("FAIL:", message);
  process.exit(1);
}

function load(wwwDir, lang) {
  const base = {
    console,
    Object,
    JSON,
    Array,
    String,
    Number,
    Boolean,
    Error,
    TypeError,
    Math,
    Date,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    Infinity,
    NaN,
    StorageManager: {
      load() {
        if (!lang) return null;
        return JSON.stringify({ npLanguage: lang });
      },
    },
    require(name) {
      if (name === "fs") return fs;
      if (name === "path") return path;
      throw new Error("unexpected require " + name);
    },
    process: { mainModule: { filename: path.join(wwwDir, "index.html") } },
    PluginManager: { _parameters: {} },
    Game_Message: function Game_Message() {},
    Scene_Boot: function Scene_Boot() {},
    XMLHttpRequest: function XMLHttpRequest() {},
  };
  base.Game_Message.prototype.add = function(text) {
    this._texts = this._texts || [];
    this._texts.push(text);
  };
  base.Game_Message.prototype.setChoices = function(choices, defaultType, cancelType) {
    this._choices = choices;
    this._choiceDefaultType = defaultType;
    this._choiceCancelType = cancelType;
  };
  base.Scene_Boot.prototype = { create() {} };
  base.XMLHttpRequest.prototype.open = function() {};
  base.XMLHttpRequest.prototype.overrideMimeType = function() {};
  base.XMLHttpRequest.prototype.send = function() {
    this.status = 404;
    this.responseText = "";
  };
  const sandbox = new Proxy(base, {
    has(target, prop) {
      if (prop in target) return true;
      return typeof prop === "string";
    },
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver);
      if (typeof prop !== "string") return undefined;
      const Ctor = function() {};
      Ctor.prototype = {};
      target[prop] = Ctor;
      return Ctor;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
  base.window = sandbox;
  base.global = sandbox;
  vm.runInNewContext(fs.readFileSync(PLUGIN, "utf8"), sandbox, { filename: "NP_Language.js" });
  return sandbox;
}

function message(sandbox) {
  return new sandbox.Game_Message();
}

const bypass = JSON.parse(fs.readFileSync(REAL_BYPASS, "utf8"));
if (Object.keys(bypass).length !== 258) fail("bypass.json should have 258 entries");
const codedKey = "ご主人様の仰せのままに……\\I[122]";
if (!Object.prototype.hasOwnProperty.call(bypass, codedKey)) fail("missing control-code key");
const codedRu = bypass[codedKey];
if (!codedRu.includes("\\I[122]")) fail("Russian value dropped the control code");

const www = fs.mkdtempSync(path.join(require("os").tmpdir(), "np-bypass-"));
fs.mkdirSync(path.join(www, "lang", "ru"), { recursive: true });
fs.writeFileSync(path.join(www, "index.html"), "");
fs.copyFileSync(REAL_BYPASS, path.join(www, "lang", "ru", "bypass.json"));

const ru = load(www, "ru");
const ruMsg = message(ru);
ruMsg.add("OFF");
ruMsg.add("not a bypass key");
ruMsg.add(codedKey);
ruMsg.add("ご主人様の仰せのままに……");
if (ruMsg._texts[0] !== "Выкл") fail("RU exact match OFF -> Выкл, got " + ruMsg._texts[0]);
if (ruMsg._texts[1] !== "not a bypass key") fail("RU changed a non-key");
if (ruMsg._texts[2] !== codedRu) fail("RU control-code line was not replaced exactly");
if (!ruMsg._texts[2].includes("\\I[122]")) fail("replacement lost \\I[122]");
if (ruMsg._texts[3] !== "ご主人様の仰せのままに……") fail("partial line without the control code was replaced");

const ruChoices = message(ru);
ruChoices.setChoices(["OFF", "English", "not a bypass key"], 1, 2);
if (JSON.stringify(ruChoices._choices) !== JSON.stringify(["Выкл", "English", "not a bypass key"])) {
  fail("RU choices: " + JSON.stringify(ruChoices._choices));
}
if (ruChoices._choiceDefaultType !== 1 || ruChoices._choiceCancelType !== 2) fail("choice indexes were not kept");

const en = load(www, "en");
const enMsg = message(en);
enMsg.add("OFF");
enMsg.add(codedKey);
if (enMsg._texts[0] !== "OFF" || enMsg._texts[1] !== codedKey) fail("EN mode changed text");
const enChoices = message(en);
enChoices.setChoices(["OFF", "English"], 0, -1);
if (JSON.stringify(enChoices._choices) !== JSON.stringify(["OFF", "English"])) fail("EN mode changed choices");

const empty = fs.mkdtempSync(path.join(require("os").tmpdir(), "np-bypass-missing-"));
fs.writeFileSync(path.join(empty, "index.html"), "");
let missing;
try {
  missing = load(empty, "ru");
} catch (err) {
  fail("missing bypass.json threw: " + err);
}
const missMsg = message(missing);
missMsg.add("OFF");
missMsg.setChoices(["OFF"], 0, 0);
if (missMsg._texts[0] !== "OFF" || JSON.stringify(missMsg._choices) !== JSON.stringify(["OFF"])) {
  fail("missing bypass file changed text");
}

console.log("bypass checks ok");
