/* Kudzu Survivors v2 — core engine (ENG-CORE).
 * CONTRACT.md §2–§10, §12.4, §13. Creates window.KS. No other globals.
 * Notes for other engineers (see ks-build/progress/core.md for the full list):
 *  - KS.cam.x / KS.cam.y are the CENTER of the view in world units; cam.w / cam.h are the view size in world units.
 *  - enemy.affix0 / affix1 hold affix ids (strings) or null.
 *  - def.update(e) sets e.vx / e.vy as the DESIRED velocity (units/s); core multiplies by status speed factors and integrates.
 *  - pooled objects keep their `data` / `ai` objects across reuse: assign every key you read.
 *  - telegraph angles are radians.
 */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT (owner review): tier names are provisional pending owner approval (DESIGN §1.4).
  // ---------------------------------------------------------------------------
  var TEXT = {
    tiers: ["Clear Skies", "Light Frost", "Flurries", "Sleet", "Whiteout", "Kudzu Weather", "Ice Storm", "Polar Vortex",
      "Double Shift", "Christmas Eve Shift", "Yule Log Jam", "Blizzard of Record", "Hundred-Year Storm", "Overgrowth Watch",
      "Overgrowth Warning", "Total Overgrowth", "Snowed In", "OFF THE CHARTS"],
    plainMap: "Open Lot",
    plainSub: "Fallback job site",
    pea: "Pea Shooter",
    dummy: "Practice Vine"
  };

  KS.VERSION = "2.0.0"; KS.SAVE_VERSION = 1; KS.DT = 1 / 60; KS.MAX_DEPTH = 5;
  KS.debug = false; KS.headless = false; KS._booted = false;
  KS.TIER_NAMES = TEXT.tiers;
  var DT = KS.DT, MAX_DEPTH = KS.MAX_DEPTH, TAU = Math.PI * 2;
  var hasPerf = typeof performance !== "undefined" && performance.now;
  function perfNow() { return hasPerf ? performance.now() : Date.now(); }
  KS.now = perfNow;

  // ---------------------------------------------------------------------------
  // §3.1 Util
  // ---------------------------------------------------------------------------
  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function short(x) { return x >= 100 ? "" + Math.floor(x) : "" + (Math.floor(x * 10) / 10); }
  KS.util = {
    TAU: TAU,
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    dist2: function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    angle: function (ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); },
    norm: function (out, x, y) { var l = Math.sqrt(x * x + y * y); if (l > 0) { out.x = x / l; out.y = y / l; } else { out.x = 0; out.y = 0; } return l; },
    fmt: function (n) {
      if (n !== n) return "0";
      var s = n < 0 ? "-" : ""; n = Math.abs(n);
      if (n >= 1e12) return s + "∞";
      if (n < 1000) return s + Math.floor(n);
      if (n < 1e6) return s + short(n / 1e3) + "k";
      if (n < 1e9) return s + short(n / 1e6) + "M";
      return s + short(n / 1e9) + "B";
    },
    fmtTime: function (sec) {
      sec = Math.max(0, Math.floor(sec || 0));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : pad2(m) + ":" + pad2(s);
    },
    hyper: function (k, n) { return 1 - 1 / (1 + k * n); },
    weighted: function (rng, arr) {
      var t = 0, i;
      for (i = 0; i < arr.length; i++) if (arr[i] > 0) t += arr[i];
      if (t <= 0) return -1;
      var r = rng.next() * t;
      for (i = 0; i < arr.length; i++) { if (arr[i] > 0) { r -= arr[i]; if (r < 0) return i; } }
      return arr.length - 1;
    }
  };
  KS.log = function (module) {
    if (!KS.debug || typeof console === "undefined") return;
    var a = Array.prototype.slice.call(arguments, 1); a.unshift("[KS:" + module + "]");
    console.log.apply(console, a);
  };
  KS.frand = function () { return Math.random(); };
  KS.validateDefs = function () { return KS.test ? KS.test.validateDefs() : null; };

  // ---------------------------------------------------------------------------
  // §3.2 RNG (mulberry32)
  // ---------------------------------------------------------------------------
  function hashStr(s) { var h = 2166136261 >>> 0; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
  function Rng(seed) { this.seed = seed >>> 0; this.s = seed >>> 0; }
  Rng.prototype.next = function () {
    var t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  Rng.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  Rng.prototype.chance = function (p) { return this.next() < p; };
  Rng.prototype.pick = function (arr) { return arr && arr.length ? arr[Math.floor(this.next() * arr.length)] : undefined; };
  Rng.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(this.next() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
  Rng.prototype.fork = function (salt) { return new Rng((this.s ^ hashStr(String(salt)) ^ 0x9E3779B9) >>> 0); };
  KS.RNG = function (seed) { return new Rng(seed >>> 0); };
  KS.rng = new Rng((Math.random() * 4294967296) >>> 0);
  KS._hashStr = hashStr;

  // ---------------------------------------------------------------------------
  // Errors (§4.5 step guard)
  // ---------------------------------------------------------------------------
  KS.errors = []; KS.errorCount = 0;
  var errLast = {};
  KS.reportError = function (module, err) {
    module = module || "?";
    var msg = err && err.message ? err.message : String(err);
    var stack = err && err.stack ? String(err.stack).split("\n").slice(0, 4).join("\n") : "";
    KS.errorCount++;
    if (KS.errors.length < 500) KS.errors.push({ t: KS.run ? KS.run.time : 0, module: module, msg: msg, stack: stack });
    var now = perfNow();
    if (errLast[module] !== undefined && now - errLast[module] < 1000) return;
    errLast[module] = now;
    if (typeof console !== "undefined") console.error("[KS:" + module + "] " + msg + (stack ? "\n" + stack : ""));
  };

  // ---------------------------------------------------------------------------
  // §10 Event bus
  // ---------------------------------------------------------------------------
  var listeners = {};
  KS.on = function (name, fn) { if (typeof fn !== "function") return; var a = listeners[name]; listeners[name] = a ? a.concat([fn]) : [fn]; };
  KS.off = function (name, fn) {
    var a = listeners[name]; if (!a) return;
    var i = a.indexOf(fn); if (i < 0) return;
    var b = a.slice(); b.splice(i, 1); listeners[name] = b;
  };
  KS.emit = function (name, payload) {
    var a = listeners[name]; if (!a) return;
    for (var i = 0; i < a.length; i++) { try { a[i](payload); } catch (e) { KS.reportError("event:" + name, e); } }
  };

  // ---------------------------------------------------------------------------
  // §3 Namespace state
  // ---------------------------------------------------------------------------
  var CAPS = {
    phone: { enemies: 260, eprojectiles: 160, eprojReserve: 60, projectiles: 300, hazards: 80, hazardReserve: 16, pickups: 250, particles: 300, texts: 30, procs: 120, telegraphs: 64, dpr: 1.5 },
    desktop: { enemies: 400, eprojectiles: 220, eprojReserve: 60, projectiles: 600, hazards: 160, hazardReserve: 16, pickups: 400, particles: 900, texts: 80, procs: 250, telegraphs: 64, dpr: 2 }
  };
  KS._CAPS = CAPS;
  function copyCaps(tier) { var s = CAPS[tier], o = {}; for (var k in s) o[k] = s[k]; return o; }
  function isTouch() { try { return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0); } catch (e) { return false; } }
  KS.device = { tier: "desktop", touch: false, caps: copyCaps("desktop") };
  KS.detectTier = function () {
    var q = "auto";
    try { q = (KS.meta.settings && KS.meta.settings.quality) || "auto"; } catch (e) { q = "auto"; }
    if (q === "low") return "phone";
    if (q === "high") return "desktop";
    var coarse = false;
    try { coarse = window.matchMedia && window.matchMedia("(pointer:coarse)").matches; } catch (e2) { coarse = false; }
    return coarse && Math.min(window.innerWidth, window.innerHeight) < 820 ? "phone" : "desktop";
  };
  /** Extra (core/test): force a tier and reset caps to its base values. */
  KS.setTier = function (tier) {
    if (!CAPS[tier]) tier = "desktop";
    KS.device.tier = tier; KS.device.touch = isTouch(); KS.device.caps = copyCaps(tier);
    perfLevel = 0;
    if (KS.resize) KS.resize();
  };
  var perfLevel = 0;

  KS.defs = {
    weapons: {}, gear: {}, items: {}, procs: {}, enemies: {}, affixes: {}, bosses: {}, maps: {}, hazards: {}, eprojStyles: {},
    interactables: {}, conditions: {}, operators: {}, abilities: {}, buffs: {}, cosmetics: { paint: {}, hat: {}, trail: {}, frame: {} },
    achievements: {}, shop: {}, crewBonuses: {}
  };
  KS.abilities = KS.defs.abilities;
  KS.G = { mode: "boot", prevMode: "", frame: 0, realTime: 0, fps: 60, simLock: false };
  KS.run = null;
  KS.cam = { x: 0, y: 0, zoom: 1, w: 960, h: 540, sw: 960, sh: 540, dpr: 1, shake: 0, sx: 0, sy: 0 };
  KS.input = { mx: 0, my: 0, moving: false, ability: false, pause: false, confirm: false, gamepad: false, touchStick: { active: false, ox: 0, oy: 0, x: 0, y: 0 } };
  KS.pad = {
    connected: false, axes: [0, 0],
    pressed: { a: false, b: false, x: false, y: false, lb: false, rb: false, start: false, up: false, down: false, left: false, right: false },
    justPressed: { a: false, b: false, x: false, y: false, lb: false, rb: false, start: false, up: false, down: false, left: false, right: false }
  };
  KS.perfStats = { stepMs: 0, renderMs: 0, frameMs: 16.7, perfLevel: 0 };

  // ---------------------------------------------------------------------------
  // §7 Pools
  // ---------------------------------------------------------------------------
  var UID = 0;
  function Pool(factory, cap) {
    if (!(this instanceof Pool)) return new Pool(factory, cap);
    this.list = []; this.n = 0; this.cap = cap; this.factory = factory;
  }
  Pool.prototype.alloc = function () {
    var o;
    if (this.n < this.list.length) o = this.list[this.n];
    else if (this.n < this.cap) { o = this.factory(); this.list.push(o); }
    else return null;
    this.n++; o.alive = true; o.t = 0; o.uid = ++UID;
    return o;
  };
  Pool.prototype.compact = function () {
    var l = this.list, j = 0, n = this.n;
    for (var i = 0; i < n; i++) { var o = l[i]; if (o.alive) { if (i !== j) { l[i] = l[j]; l[j] = o; } j++; } }
    this.n = j;
  };
  Pool.prototype.clear = function () { for (var i = 0; i < this.n; i++) this.list[i].alive = false; this.n = 0; };
  KS.Pool = Pool;
  function reuse(o) { o.alive = true; o.t = 0; o.uid = ++UID; return o; }

  function newStatus() { return { burn: 0, burnDps: 0, splinter: 0, splinterDps: 0, splinterN: 0, chill: 0, chillStacks: 0, chillT: 0, freeze: 0, freezeImm: 0, stun: 0, stunImm: 0, strung: 0, shock: 0, slow: 0, slowMul: 1, dotTick: 0, dotDepth: 0 }; }
  function newEnemy() {
    return { uid: 0, alive: false, t: 0, defId: "", def: null, isBoss: false, bossPart: false, x: 0, y: 0, vx: 0, vy: 0, kbx: 0, kby: 0, r: 10, mass: 1, speed: 0, baseSpeed: 0,
      hp: 1, maxHp: 1, dmg: 0, xp: 0, tinsel: 0, elite: false, affix0: null, affix1: null, dropCrate: false, shieldHits: 0, dmgTaken: 1, invuln: false, rammed: false,
      state: "", stateT: 0, ai: {}, face: 0, flash: 0, contactCd: 0, hitStamp: new Float32Array(8), lastHitT: -99, st: newStatus(),
      untargetable: false, noContact: false, objective: false, flying: false, stationary: false, noRecycle: false, noXp: false, recycleT: 0,
      parentUid: 0, children: 0, stolen: 0, phase: 0, dmgTextAcc: 0, dmgTextT: 0, _staggerT: 0, _phasePending: -1, _plate: null, _cell: -1 };
  }
  function newProj() {
    return { uid: 0, alive: false, t: 0, x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 0, pierce: 0, life: 1, slot: -1, weaponId: "", def: null, tag: "",
      procCoef: 1, depth: 0, kb: 0, canCrit: true, noOnKill: false, itemId: "", bounces: 0, bounceIndex: 0, baseDmg: 0, bounceRange: 160, homing: 0, ang: 0, spin: 0, kind: 0,
      hitN: 0, hitUids: new Int32Array(16), data: {}, color: "", alpha: 1, noCollide: false, blockable: true, _tx: 0, _ty: 0, _tOk: false };
  }
  function newEProj() { return { uid: 0, alive: false, t: 0, x: 0, y: 0, vx: 0, vy: 0, r: 6, dmg: 0, life: 1, style: "", color: "", owner: 0, priority: false, data: {}, _sdef: null }; }
  function newPickup() { return { uid: 0, alive: false, t: 0, type: "xp", x: 0, y: 0, vx: 0, vy: 0, value: 0, mag: false }; }
  function newHazard() {
    return { uid: 0, alive: false, t: 0, defId: "", def: null, team: "enemy", x: 0, y: 0, r: 30, w: 0, h: 0, ang: 0, life: 1, tele: 0, dmg: 0, tick: 0.5, tickT: 0,
      slowMul: 1, priority: false, cosmetic: false, src: null, data: {} };
  }
  function newParticle() { return { uid: 0, t: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: "#fff", kind: 0, grav: 0, alive: false }; }
  function newText() { return { uid: 0, t: 0, x: 0, y: 0, val: 0, crit: false, life: 0, alive: false, targetUid: 0, str: "" }; }
  function newTele() { return { uid: 0, t: 0, alive: false, kind: "circle", x: 0, y: 0, a: 0, b: 0, c: 0, dur: 1, color: "" }; }

  // ---------------------------------------------------------------------------
  // §4.5 Sprites
  // ---------------------------------------------------------------------------
  var iconCache = {}, textCache = {};
  function mkCanvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  KS.iconSprite = function (icon, sizePx) {
    if (typeof document === "undefined") return null;
    sizePx = sizePx || 48;
    var key = icon + "|" + sizePx;
    var c = iconCache[key]; if (c) return c;
    c = mkCanvas(sizePx, sizePx);
    var g = c.getContext("2d");
    g.textAlign = "center"; g.textBaseline = "middle";
    g.font = Math.floor(sizePx * 0.78) + "px \"Segoe UI Emoji\",\"Apple Color Emoji\",\"Noto Color Emoji\",sans-serif";
    g.fillStyle = "#2a1f1a";
    g.fillText(String(icon), sizePx / 2, sizePx / 2 + sizePx * 0.04);
    iconCache[key] = c;
    return c;
  };
  KS.textSprite = function (key, text, font, color) {
    if (typeof document === "undefined") return null;
    var e = textCache[key];
    text = String(text);
    if (e && e.text === text && e.font === font && e.color === color) return e.canvas;
    var c = e ? e.canvas : mkCanvas(4, 4);
    var g = c.getContext("2d");
    g.font = font || "14px serif";
    var w = Math.ceil(g.measureText(text).width) + 8;
    var m = /(\d+)px/.exec(g.font); var h = m ? Math.ceil(parseInt(m[1], 10) * 1.4) + 4 : 24;
    c.width = w; c.height = h;
    g = c.getContext("2d");
    g.font = font || "14px serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineWidth = 3; g.strokeStyle = "rgba(42,31,26,0.85)"; g.strokeText(text, w / 2, h / 2);
    g.fillStyle = color || "#efe2c4"; g.fillText(text, w / 2, h / 2);
    textCache[key] = { canvas: c, text: text, font: font, color: color };
    return c;
  };

  // ---------------------------------------------------------------------------
  // §9 Registration
  // ---------------------------------------------------------------------------
  var REQ = {
    weapon: ["id", "name", "icon", "tag", "desc", "levels", "init", "update"],
    gear: ["id", "name", "icon", "maxLevel", "desc", "stats"],
    item: ["id", "name", "icon", "rarity", "desc"],
    crewBonus: ["id", "name", "desc", "test"],
    enemy: ["id", "name", "hp", "speed", "r", "dmg", "xp", "codex", "color", "init", "update", "draw"],
    boss: ["id", "name", "hp", "speed", "r", "dmg", "xp", "codex", "color", "init", "update", "draw", "title", "phases", "onPhase"],
    affix: ["id", "name", "color", "glyph"],
    eprojStyle: ["id", "draw"],
    map: ["id", "name", "order", "w", "h", "spawn", "palette", "spawnWeights", "boss", "objective", "setup", "update", "drawGround", "drawPreview"],
    hazard: ["id", "team", "draw"],
    interactable: ["id", "name", "baseCost", "r", "onOpen", "draw"],
    condition: ["id", "name", "desc", "icon"],
    operator: ["id", "name", "weapon", "ability", "stats", "color"],
    cosmetic: ["id", "name", "unlock"],
    achievement: ["id", "title", "desc", "check", "reward"],
    shop: ["id", "name", "desc", "costs", "stats"],
    ability: ["id", "name", "cd", "fire"],
    buff: ["id"]
  };
  KS._defReq = REQ;
  var ID_RE = /^[a-z0-9_]+$/;
  function reg(table, kind, def, module) {
    if (!def || typeof def !== "object") { KS.reportError("defs", kind + ": registration is not an object"); return null; }
    var id = def.id, req = REQ[kind], i;
    if (typeof id !== "string" || !ID_RE.test(id)) KS.reportError("defs", kind + " " + id + ": bad id");
    for (i = 0; i < req.length; i++) {
      var v = def[req[i]];
      if (v === undefined || (v === null && req[i] !== "ability" && req[i] !== "boss" && req[i] !== "unlock")) KS.reportError("defs", kind + " " + id + ": missing " + req[i]);
    }
    if (table[id] && table[id] !== def) KS.reportError("defs", kind + " " + id + ": duplicate id");
    def._kind = kind; def._module = module || kind;
    table[id] = def;
    if (def.icon && !KS.headless && typeof document !== "undefined") { try { KS.iconSprite(def.icon, 48); } catch (e) { /* cosmetic */ } }
    return def;
  }
  KS.registerWeapon = function (def) {
    var d = reg(KS.defs.weapons, "weapon", def, "weapons"); if (!d) return null;
    d._noScale = {};
    if (d.noScale) for (var i = 0; i < d.noScale.length; i++) d._noScale[d.noScale[i]] = true;
    if (d.procCoef == null) d.procCoef = 1;
    return d;
  };
  KS.registerGear = function (def) { return reg(KS.defs.gear, "gear", def, "items"); };
  KS.registerItem = function (def) { return reg(KS.defs.items, "item", def, "items"); };
  KS.registerCrewBonus = function (def) { return reg(KS.defs.crewBonuses, "crewBonus", def, "items"); };
  function prepEnemy(d) {
    if (!d) return d;
    d._untarg = d.untargetableStates && d.untargetableStates.length ? d.untargetableStates : null;
    if (d.tinsel == null) d.tinsel = 1;
    if (d.mass == null) d.mass = 1;
    if (d.weight == null) d.weight = 1;
    return d;
  }
  KS.registerEnemy = function (def) {
    if (def && def.spawnable !== false && def.firstMin == null) KS.reportError("defs", "enemy " + def.id + ": missing firstMin (or spawnable:false)");
    return prepEnemy(reg(KS.defs.enemies, "enemy", def, "enemies"));
  };
  KS.registerBoss = function (def) { var d = prepEnemy(reg(KS.defs.bosses, "boss", def, "bosses")); if (d) d._isBossDef = true; return d; };
  KS.registerAffix = function (def) { return reg(KS.defs.affixes, "affix", def, "enemies"); };
  KS.registerEProjStyle = function (def) { return reg(KS.defs.eprojStyles, "eprojStyle", def, "enemies"); };
  KS.registerMap = function (def) { return reg(KS.defs.maps, "map", def, "maps"); };
  KS.registerHazard = function (def) {
    if (def && typeof def.id === "string" && !/^(w|i|e|b|m)_/.test(def.id)) KS.reportError("defs", "hazard " + def.id + ": id must be prefixed w_/i_/e_/b_/m_");
    return reg(KS.defs.hazards, "hazard", def, "hazards");
  };
  KS.registerInteractable = function (def) { return reg(KS.defs.interactables, "interactable", def, "maps"); };
  KS.registerCondition = function (def) { return reg(KS.defs.conditions, "condition", def, "maps"); };
  KS.registerOperator = function (def) { return reg(KS.defs.operators, "operator", def, "meta"); };
  KS.registerCosmetic = function (kind, def) {
    var t = KS.defs.cosmetics[kind];
    if (!t) { KS.reportError("defs", "cosmetic kind " + kind + " unknown"); return null; }
    var d = reg(t, "cosmetic", def, "meta"); if (d) d._cosKind = kind; return d;
  };
  KS.registerAchievement = function (def) { return reg(KS.defs.achievements, "achievement", def, "meta"); };
  KS.registerShop = function (def) { return reg(KS.defs.shop, "shop", def, "meta"); };
  KS.registerAbility = function (def) { return reg(KS.defs.abilities, "ability", def, "weapons_evo"); };
  KS.registerBuff = function (def) { return reg(KS.defs.buffs, "buff", def, "buffs"); };
  KS.registerProc = function (kind, fn) {
    if (typeof kind !== "string" || typeof fn !== "function") { KS.reportError("defs", "registerProc " + kind + ": bad args"); return; }
    if (KS.defs.procs[kind] && KS.defs.procs[kind] !== fn) KS.reportError("defs", "proc " + kind + ": duplicate kind");
    KS.defs.procs[kind] = fn;
  };

  // ---------------------------------------------------------------------------
  // §13 Stubs (owners replace the whole objects)
  // ---------------------------------------------------------------------------
  var stubProfile = {
    v: 1, pay: 0, bows: 0, shop: {},
    unlocked: { weapon: [], gear: [], item: [], map: [], operator: [], cosmetic: ["paint:brick", "paint:holly", "hat:hardhat", "hat:santacap", "trail:chips", "frame:ticket"], flag: [] },
    achievements: {}, codex: { enemies: {}, affixes: {}, bosses: {} }, blueprints: {}, logbook: {}, ops: {},
    stats: { runs: 0, time: 0, kills: 0, deaths: 0, bestTime: 0, bestStage: 0, bestSeason: 0, bestTier: 0, bossKills: {}, itemsFound: 0, cratesOpened: 0, tinselSpent: 0,
      payEarned: 0, crits: 0, burnKills: 0, eliteKills: 0, mimicKills: 0, crowKills: 0, objectivesDone: {}, opsPlayed: {}, biggestHit: 0 },
    loadout: { operator: "foreman", map: "backforty", overtime: 0, paint: "brick", hat: "hardhat", trail: "chips", frame: "ticket", name: "OPERATOR", showName: true },
    daily: { date: "", best: 0, attempted: false }, tips: {}
  };
  var stubSettings = { v: 1, music: 0.6, sfx: 0.8, shake: true, reducedMotion: false, dmgNumbers: "auto", cbTelegraphs: false, autoAim: "auto", leftHanded: false, quality: "auto", showFps: false, joystick: "floating" };
  try { stubSettings.reducedMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { /* ignore */ }

  function coreFallbackMachine(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.faceY, p.faceX));
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2, 4, 20, 14, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a1f1a"; ctx.fillRect(-15, -14, 26, 6); ctx.fillRect(-15, 8, 26, 6);
    ctx.fillStyle = "#b3261e"; ctx.fillRect(-14, -9, 28, 18);
    ctx.fillStyle = "#efe2c4"; ctx.fillRect(-8, -6, 10, 12);
    ctx.fillStyle = "#c9993b"; ctx.fillRect(14, -12, 6, 24);
    if (p.hurtFlash > 0) { ctx.globalAlpha = Math.min(1, p.hurtFlash * 4); ctx.fillStyle = "#fff"; ctx.fillRect(-14, -9, 28, 18); }
    ctx.restore();
  }
  KS._fallbackMachine = coreFallbackMachine;

  KS.ui = { _stub: true, init: function () {}, show: function () {}, hide: function () {}, current: function () { return null; }, isOpen: function () { return false; },
    drawHUD: function () {}, drawAttract: function () {}, toast: function () {}, banner: function () {}, tip: function () {}, bossBar: function () {},
    refreshHUD: function () {}, samples: function () { return {}; } };
  KS.audio = { _stub: true, init: function () {}, sfx: function () {}, music: function () {}, intensity: function () {}, setVolumes: function () {}, unlock: function () {} };
  KS.sfx = function (name, arg) { if (!KS.headless) { try { KS.audio.sfx(name, arg); } catch (e) { KS.reportError("audio", e); } } };
  KS.meta = {
    _stub: true,
    get profile() { return stubProfile; }, get settings() { return stubSettings; }, get rsvpDone() { return false; },
    storageOk: false, store: null, sandboxed: false,
    load: function () {}, save: function () {}, saveNow: function () {}, sandbox: function (on) { this.sandboxed = !!on; },
    setSetting: function (k, v) { stubSettings[k] = v; KS.emit("settings", { key: k, value: v }); },
    isUnlocked: function () { return true; }, unlock: function () {}, tipSeen: function () { return true; }, markTip: function () {},
    applyStats: function () {}, codexMul: function () { return 1; },
    recordRun: function () { return { payEarned: 0, bowsEarned: 0, newUnlocks: [], newPages: [], newAchievements: [], nearest: [] }; },
    buy: function () { return false; }, refundAll: function () {}, equip: function () {}, setName: function (s) { return s; },
    daily: function () { return { seed: 1, operator: "foreman", map: "backforty", condition: [], attempted: false }; },
    drawMachine: coreFallbackMachine, drawPortrait: function () {}, tick: function () {}
  };
  KS.items = { _stub: true, onHit: function () {}, onKill: function () {}, onHurt: function () {}, onLethal: function () { return false; }, tick: function () {},
    applyStats: function () {}, applyContracts: function () {}, dmgMul: function () { return 1; },
    bounceMul: function (i) { return Math.pow(0.8, i); }, extraBounces: function () { return 0; }, extraJumps: function () { return 0; }, rangeMul: function () { return 1; },
    give: function () {}, remove: function () {}, count: function () { return 0; }, onStageStart: function () {}, onLevelUp: function () {} };
  KS.levelup = {
    _stub: true,
    open: function (run) {
      for (var i = 0; i < 6; i++) {
        var w = run.weapons[i];
        if (w && w.level < 8 && w.def && !w.def.evolved && !w.def.fusion) { KS.levelWeapon(w, 1); return false; }
      }
      return false;
    },
    act: function () {},
    autoPick: function () { KS.closeOverlay(); }
  };
  KS.loot = { _stub: true, roll: function () { return null; }, openCrate: function () {}, tryEvolve: function () { return []; }, eligibleFusions: function () { return []; },
    fuse: function () {}, offerChoice: function () {} };
  var stubDir = { t: 0 };
  KS.director = {
    _stub: true,
    update: function (dt, run) {
      stubDir.t += dt;
      if (stubDir.t < 1) return;
      stubDir.t -= 1;
      var p = run.player, cam = KS.cam;
      var rad = Math.sqrt(cam.w * cam.w + cam.h * cam.h) * 0.5 + 60;
      var a = KS.rng.next() * TAU;
      var b = run.bounds;
      var x = KS.util.clamp(p.x + Math.cos(a) * rad, b.x0 + 40, b.x1 - 40), y = KS.util.clamp(p.y + Math.sin(a) * rad, b.y0 + 40, b.y1 - 40);
      KS.spawnEnemy("_dummy", x, y, null);
    },
    onStageStart: function () { stubDir.t = 0; }, forceElite: function () {}, surge: function () {}
  };
  KS.maps = { _stub: true, placeInteractables: function () {}, workOrderUpdate: function () {}, arrows: function () { return 0; } };

  // ---------------------------------------------------------------------------
  // Fallback content (§13): plain map, pea shooter, _dummy enemy, crew operator
  // ---------------------------------------------------------------------------
  var PEA_LEVELS = [];
  for (var pl = 0; pl < 8; pl++) PEA_LEVELS.push({ dmg: 10 + 3 * pl, cd: 0.6 - 0.03 * pl, speed: 440, count: 1 + (pl >= 3 ? 1 : 0), pierce: pl >= 5 ? 1 : 0, life: 1.2 });
  var PEA = {
    id: "_pea", name: TEXT.pea, icon: "•", tag: "blade", desc: "Fallback weapon.", milestone: "", levels: PEA_LEVELS, labels: { dmg: "Damage", cd: "Cooldown" },
    procCoef: 1, _noScale: {}, _kind: "weapon", _module: "core",
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player;
      var e = KS.nearestEnemy(p.x, p.y, 520);
      if (!e) { w.cd = 0.1; return; }
      w.cd = KS.wstat(w, "cd");
      var n = Math.max(1, Math.round(KS.wstat(w, "count"))), spd = KS.wstat(w, "speed");
      var base = Math.atan2(e.y - p.y, e.x - p.x);
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * 0.14;
        var q = KS.spawnProj(PEA, w.slot, p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, null);
        if (!q) break;
        q.dmg = KS.wstat(w, "dmg"); q.pierce = Math.round(KS.wstat(w, "pierce")); q.life = KS.wstat(w, "life"); q.r = 5; q.kb = 60;
      }
    },
    projDraw: function (ctx, q) { ctx.fillStyle = "#3f7a2e"; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
  };
  var DUMMY = {
    id: "_dummy", name: TEXT.dummy, hp: 8, speed: 62, r: 12, dmg: 5, xp: 1, tinsel: 1, mass: 1, weight: 1, spawnable: false,
    codex: { notes: "", joke: "", tip: "" }, color: "#4c8a3a", _kind: "enemy", _module: "core", _untarg: null,
    init: function (e) { e.ai.k = 0; },
    update: function (e, dt, run) {
      var p = run.player, dx = p.x - e.x, dy = p.y - e.y, l = Math.sqrt(dx * dx + dy * dy) || 1;
      e.vx = dx / l * e.speed; e.vy = dy / l * e.speed; e.face = Math.atan2(dy, dx);
    },
    draw: function (ctx, e) {
      ctx.fillStyle = e.flash > 0 ? "#ffffff" : "#4c8a3a";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2f4a32"; ctx.beginPath(); ctx.ellipse(e.x + e.r * 0.3, e.y - e.r * 0.5, e.r * 0.5, e.r * 0.25, 0.6, 0, TAU); ctx.fill();
    }
  };
  var PLAIN = {
    id: "_plain", name: TEXT.plainMap, subtitle: TEXT.plainSub, order: 99, w: 4000, h: 4000, spawn: { x: 2000, y: 2000 }, corridor: null, density: 1,
    palette: { ground: "#cdbf9c", accent: "#b8a983", edge: "#5d4a35" }, spawnWeights: {}, bias: {}, surgeTypes: [], boss: null,
    objective: { id: "_none", name: "", desc: "", total: 0 }, music: "jingle", unlock: null, _kind: "map", _module: "core",
    setup: function (run) { run.flags["core.plainBoss"] = false; },
    update: function (dt, run) {
      if (!run.bossSpawned && run.stageTime >= 30) {
        var bid = null; for (var k in KS.defs.bosses) { bid = k; break; }
        if (bid) {
          var p = run.player;
          KS.spawnBoss(bid, KS.util.clamp(p.x + 300, run.bounds.x0 + 80, run.bounds.x1 - 80), p.y);
          run.flags["core.plainBoss"] = true;
        }
      }
      if (run.stageTime >= 60 && !run.flags["core.plainBoss"] && !run.bossDone) run.bossDone = true;
      if (run.stageTime >= 60 && run.bossDone) KS.clearStage();
    },
    drawGround: function (ctx, cam, run) {
      var b = run.bounds;
      ctx.fillStyle = this.palette.ground; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
      ctx.strokeStyle = this.palette.accent; ctx.lineWidth = 2; ctx.beginPath();
      var x0 = Math.max(b.x0, Math.floor((cam.x - cam.w / 2) / 200) * 200), x1 = Math.min(b.x1, cam.x + cam.w / 2 + 200);
      var y0 = Math.max(b.y0, Math.floor((cam.y - cam.h / 2) / 200) * 200), y1 = Math.min(b.y1, cam.y + cam.h / 2 + 200);
      for (var x = x0; x <= x1; x += 200) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
      for (var y = y0; y <= y1; y += 200) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
      ctx.stroke();
      ctx.strokeStyle = this.palette.edge; ctx.lineWidth = 8; ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    },
    drawPreview: function (ctx, w, h) { ctx.fillStyle = "#cdbf9c"; ctx.fillRect(0, 0, w, h); }
  };
  var FALLBACK_OP = { id: "_crew", name: "Crew", title: "", weapon: "cane", ability: null, trait: "", stats: function () {}, unlock: null, color: "#b3261e", hint: "" };
  KS._fallback = { map: PLAIN, weapon: PEA, enemy: DUMMY, operator: FALLBACK_OP };
  function weaponDef(id) { return KS.defs.weapons[id] || (id === "_pea" ? PEA : null); }
  function enemyDef(id) { return KS.defs.enemies[id] || (id === "_dummy" ? DUMMY : null); }

  // ---------------------------------------------------------------------------
  // §3.3 Stats
  // ---------------------------------------------------------------------------
  var BASE = { maxHp: 100, regen: 0, armor: 0, dr: 0, speed: 150, magnet: 70, might: 1, area: 1, duration: 1, cooldown: 1, amount: 0, pierce: 0, projSpeed: 1,
    crit: 0, critMult: 2, luck: 0, xpMul: 1, tinselMul: 1, payMul: 1, statusMul: 1, knockback: 1, healMul: 1, abilityCdMul: 1, eliteDmg: 1, priceMul: 1, cards: 3, revives: 0,
    burnStatusMul: 1, freezeDurMul: 1, hazardSlowRes: 0, iceImmune: 0, healPickupMul: 1, luckItems: 0, rerolls: 2, banishes: 1, bubbleWrap: 0 };
  var CLAMP = { maxHp: [1, 9999], regen: [0, 15], armor: [0, 20], dr: [0, 0.75], speed: [60, 330], magnet: [30, 600], might: [0.1, 50], area: [0.5, 3], duration: [0.5, 3],
    cooldown: [0.35, 2], amount: [0, 6], pierce: [0, 8], projSpeed: [0.5, 2.5], crit: [0, 1], critMult: [2, 6], luck: [0, 3], xpMul: [0.5, 5], tinselMul: [0.5, 5], payMul: [1, 4],
    statusMul: [1, 3], knockback: [0, 3], healMul: [0.1, 3], abilityCdMul: [0.4, 1], eliteDmg: [1, 10], priceMul: [0.3, 1], cards: [3, 5], revives: [0, 5],
    burnStatusMul: [1, 3], freezeDurMul: [1, 3], hazardSlowRes: [0, 1], iceImmune: [0, 1], healPickupMul: [1, 3], luckItems: [0, 5], rerolls: [0, 20], banishes: [0, 20], bubbleWrap: [0, 99] };
  var STAT_KEYS = Object.keys(BASE);
  KS.STAT_BASE = BASE; KS.STAT_CLAMP = CLAMP;

  KS.recalcStats = function () {
    var run = KS.run; if (!run) return;
    var S = run.stats, i, k, v;
    for (i = 0; i < STAT_KEYS.length; i++) { k = STAT_KEYS[i]; S[k] = BASE[k]; }
    try { KS.meta.applyStats(S, run); } catch (e1) { KS.reportError("meta", e1); }
    try { KS.items.applyStats(S, run); } catch (e2) { KS.reportError("items", e2); }
    for (i = 0; i < run._buffIds.length; i++) {
      var bd = KS.defs.buffs[run._buffIds[i]];
      if (bd && bd.stats) { try { bd.stats(S, run); } catch (e3) { KS.reportError("buff:" + bd.id, e3); } }
    }
    for (i = 0; i < STAT_KEYS.length; i++) {
      k = STAT_KEYS[i]; v = S[k]; var c = CLAMP[k];
      if (typeof v !== "number" || v !== v) v = BASE[k];
      S[k] = v < c[0] ? c[0] : (v > c[1] ? c[1] : v);
    }
    try { KS.items.applyContracts(S, run); } catch (e4) { KS.reportError("items", e4); }
    for (i = 0; i < STAT_KEYS.length; i++) { k = STAT_KEYS[i]; if (typeof S[k] !== "number" || S[k] !== S[k]) S[k] = BASE[k]; }
    var p = run.player, old = p.maxHp;
    p.maxHp = S.maxHp;
    if (run._hpInit && S.maxHp > old) p.hp += S.maxHp - old;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
    var ab = run.opDef && run.opDef.ability ? KS.abilities[run.opDef.ability] : null;
    p.abilityMax = ab ? ab.cd * S.abilityCdMul : 0;
  };

  // ---------------------------------------------------------------------------
  // §5 Run creation, §4.3 overlays, §4.4 lifecycle
  // ---------------------------------------------------------------------------
  var poolCache = {};
  function getPools(tier) {
    var c = CAPS[tier], P = poolCache[tier];
    if (!P) {
      P = poolCache[tier] = {
        enemies: new Pool(newEnemy, c.enemies + 64), projectiles: new Pool(newProj, c.projectiles), eprojectiles: new Pool(newEProj, c.eprojectiles),
        pickups: new Pool(newPickup, c.pickups), hazards: new Pool(newHazard, c.hazards), particles: new Pool(newParticle, c.particles),
        texts: new Pool(newText, c.texts), telegraphs: new Pool(newTele, c.telegraphs)
      };
    }
    for (var k in P) P[k].clear();
    return P;
  }
  function makePlayer() {
    var lo = {}; try { lo = KS.meta.profile.loadout || {}; } catch (e) { lo = {}; }
    return { x: 0, y: 0, vx: 0, vy: 0, r: 16, hp: 100, maxHp: 100, barrier: 0, barrierHoldT: 0, alive: true, iframes: 0, faceX: 1, faceY: 0, aimX: 1, aimY: 0, rot: 0,
      slowAcc: 1, onIce: false, stillT: 0, odo: 0, dashT: 0, dashVX: 0, dashVY: 0, dashInvuln: false, contactImmuneStep: -1, magnetT: 0, magnetR: 0,
      abilityCd: 0, abilityMax: 0, revivesUsed: 0, bubbleT: 0, moving: false,
      cosmetics: { paint: lo.paint || "brick", hat: lo.hat || "hardhat", trail: lo.trail || "chips", frame: lo.frame || "ticket", name: lo.name || "OPERATOR", showName: lo.showName !== false },
      trailT: 0, hurtFlash: 0 };
  }
  function buildMapOrder(start) {
    var ids = [], k, md;
    for (k in KS.defs.maps) {
      if (k === start) continue;
      var ok = true; try { ok = KS.meta.isUnlocked("map", k); } catch (e) { ok = true; }
      if (ok) ids.push(k);
    }
    ids.sort(function (a, b) { return (KS.defs.maps[a].order || 0) - (KS.defs.maps[b].order || 0); });
    md = KS.defs.maps[start];
    if (!md) return ids.length && !start ? ids : [start || "_plain"];
    // wrap around: maps after the start's order first, then the rest
    var after = [], before = [];
    for (var i = 0; i < ids.length; i++) { if ((KS.defs.maps[ids[i]].order || 0) > (md.order || 0)) after.push(ids[i]); else before.push(ids[i]); }
    return [start].concat(after, before);
  }

  KS.startRun = function (opts) {
    opts = opts || {};
    ovQueue.length = 0; ovCur = null;
    var seed = opts.seed != null ? (Number(opts.seed) >>> 0) : ((Math.random() * 4294967296) >>> 0);
    KS.rng = new Rng(seed);
    var opId = opts.operator || "foreman";
    var opDef = KS.defs.operators[opId] || FALLBACK_OP;
    var P = getPools(KS.device.tier);
    var run = {
      seed: seed, daily: !!opts.daily, operatorId: opId, opDef: opDef, overtime: Math.max(0, Math.min(10, opts.overtime | 0)), condition: [],
      time: 0, stageTime: 0, stepN: 0, stagesCleared: 0, season: 0, stageIndex: 0, mapId: "", startMap: "", mapOrder: [], mapDef: null,
      coeff: 1, tier: 0, maxTier: 0, threatMin: 0, hpMul: 1, dmgMul: 1, spdMul: 1, spawnMul: 1, timeScaleForecast: 1,
      bounds: { x0: 0, y0: 0, x1: 4000, y1: 4000 }, obstacles: [], obstacleGrid: null,
      player: makePlayer(),
      weapons: [null, null, null, null, null, null], gear: [null, null, null, null, null, null],
      items: {}, itemOrder: [], itemCounters: {}, contracts: { up: null, down: null },
      genUsed: 0, raffleStubs: 0, grease: 0,
      level: 1, xp: 0, xpNext: xpNextFor(1), pendingLevels: 0,
      rerolls: 0, banishes: 0, banished: {}, held: null,
      tinsel: 0, tinselAcc: 0, tinselSpent: 0, pay: 0, freeOpens: 0,
      kills: 0, killsByType: {}, eliteKills: 0, bossKills: {}, crits: 0, burnKills: 0, maxDepth: 0, objectivesDone: [],
      boss: null, bossUid: 0, bossDone: false, bossSpawned: false,
      workOrder: { state: "locked", forced: false, x: 0, y: 0, charge: 0, need: 75, haulT: 0, stand: 0, unlockAt: 120, bank: 0 },
      objective: { id: "", done: 0, total: 0, complete: false, label: "" },
      pendingConfirm: null, crew: {}, buffs: {},
      enemies: P.enemies, projectiles: P.projectiles, eprojectiles: P.eprojectiles, pickups: P.pickups, hazards: P.hazards, interactables: [],
      particles: P.particles, texts: P.texts, telegraphs: P.telegraphs,
      stats: {}, flags: {},
      counters: { nearKills: 0, mimicKills: 0, crowKills: 0, regiftQuick: 0, evolutions: 0, fusions: 0, noHitT: 0, noHitBest: 0, objectives: 0 },
      perf: { procMax: 0, procDrops: 0, stepMsMax: 0, enemyPeak: 0, itemProjDrops: 0 },
      ended: false,
      // core-private
      _buffIds: [], _nextCond: null, _cleared: false, _dark: false, _late: false, _fT: 0, _windX: 0, _windY: 0, _hpInit: false, _abStage: -1,
      _stage: { kills: 0, elites: 0, bosses: 0 }, _startCond: opts.condition ? opts.condition.slice() : null,
      _cRush: false, _cFrozen: false, _cHeavy: false, _cWindy: false, _cNight: false
    };
    for (var i = 0; i < STAT_KEYS.length; i++) run.stats[STAT_KEYS[i]] = BASE[STAT_KEYS[i]];
    KS.run = run;
    run.mapOrder = buildMapOrder(opts.map || "backforty");
    run.startMap = run.mapOrder[0];
    KS.recalcStats();
    run.player.hp = run.player.maxHp; run._hpInit = true;
    run.rerolls = Math.round(run.stats.rerolls); run.banishes = Math.round(run.stats.banishes);
    var wid = opDef.weapon; if (!weaponDef(wid)) wid = "_pea";
    KS.addWeapon(wid);
    run.player.abilityCd = 0;
    KS.loadStage(run.mapOrder[0], opts.condition || null);
    KS.emit("runStart", { run: run });
    uiHide();
    setMode("play");
    return run;
  };

  function rollConditions(run) {
    var n = run.season >= 2 ? 2 : (run.season >= 1 ? 1 : 0);
    var out = [];
    if (!n) return out;
    var ids = Object.keys(KS.defs.conditions);
    KS.rng.shuffle(ids);
    for (var i = 0; i < ids.length && out.length < n; i++) out.push(ids[i]);
    return out;
  }
  function hasCond(run, id) { return run.condition.indexOf(id) >= 0; }

  var STAGE_EV = { run: null, mapId: "", stageIndex: 0, season: 0, condition: null };
  KS.loadStage = function (mapId, forcedCond) {
    var run = KS.run; if (!run) return;
    var md = KS.defs.maps[mapId] || PLAIN;
    run.mapId = md.id; run.mapDef = md;
    var k;
    run.enemies.clear(); run.projectiles.clear(); run.eprojectiles.clear(); run.pickups.clear(); run.hazards.clear();
    run.particles.clear(); run.texts.clear(); run.telegraphs.clear();
    run.interactables.length = 0;
    KS.procs.clear();
    enemyAlive = 0;
    run.stageTime = 0; run._cleared = false;
    run.boss = null; run.bossUid = 0; run.bossDone = false; run.bossSpawned = false; run.pendingConfirm = null;
    var wo = run.workOrder; wo.state = "locked"; wo.forced = false; wo.x = 0; wo.y = 0; wo.charge = 0; wo.need = 75; wo.haulT = 0; wo.stand = 0; wo.unlockAt = 120; wo.bank = 0;
    var ob = run.objective, mo = md.objective || {};
    ob.id = mo.id || ""; ob.done = 0; ob.total = mo.total || 0; ob.complete = false; ob.label = mo.name || "";
    run._stage.kills = 0; run._stage.elites = 0; run._stage.bosses = 0;
    for (k in run.flags) { if (k.indexOf("maps.") === 0 || k.indexOf("core.") === 0) delete run.flags[k]; }
    run.bounds.x0 = 0; run.bounds.y0 = 0; run.bounds.x1 = md.w || 4000; run.bounds.y1 = md.h || 4000;
    run.obstacles.length = 0;
    run.condition = forcedCond ? forcedCond.slice() : (run._nextCond ? run._nextCond : rollConditions(run));
    run._nextCond = null;
    run._cRush = hasCond(run, "rush"); run._cFrozen = hasCond(run, "frozen"); run._cHeavy = hasCond(run, "heavy");
    run._cWindy = hasCond(run, "windy"); run._cNight = hasCond(run, "night");
    if (run._cWindy) { var wa = KS.rng.next() * TAU; run._windX = Math.cos(wa); run._windY = Math.sin(wa); } else { run._windX = 0; run._windY = 0; }
    var p = run.player, sp = md.spawn || { x: run.bounds.x1 / 2, y: run.bounds.y1 / 2 };
    p.x = sp.x; p.y = sp.y; p.vx = 0; p.vy = 0; p.dashT = 0; p.dashInvuln = false; p.magnetT = 0;
    gridResize(run.bounds);
    try { md.setup(run); } catch (e1) { KS.reportError("map:" + md.id, e1); }
    buildObstacleGrid(run);
    try { KS.items.onStageStart(run); } catch (e2) { KS.reportError("items", e2); }
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i];
      if (w && w.def.onStageStart) { try { w.def.onStageStart(w, run); } catch (e3) { KS.reportError("weapon:" + w.id, e3); } }
    }
    try { KS.director.onStageStart(run); } catch (e4) { KS.reportError("director", e4); }
    KS.recalcStats();
    KS.cam.x = p.x; KS.cam.y = p.y;
    STAGE_EV.run = run; STAGE_EV.mapId = run.mapId; STAGE_EV.stageIndex = run.stageIndex; STAGE_EV.season = run.season; STAGE_EV.condition = run.condition;
    KS.emit("stageStart", STAGE_EV);
  };

  function nightPay(run, cleared) {
    if (!run._cNight) return;
    var s = run._stage;
    KS.addPay(0.25 * (s.kills / 10 + 25 * run.stageTime / 60 + (cleared ? 50 : 0) + 5 * s.elites + 100 * s.bosses));
  }

  KS.clearStage = function () {
    var run = KS.run;
    if (!run || run.ended || run._cleared) return;
    run._cleared = true;
    nightPay(run, true);
    run.stagesCleared++;
    KS.emit("stageClear", { run: run, mapId: run.mapId, stageIndex: run.stageIndex });
    KS.sfx("stageClear");
    var seasonDone = run.stagesCleared % 5 === 0;
    if (seasonDone) { run.season++; KS.emit("seasonClear", { season: run.season }); }
    var nextId = run.mapOrder[(run.stageIndex + 1) % run.mapOrder.length];
    run._nextCond = rollConditions(run);
    var nd = KS.defs.maps[nextId] || PLAIN;
    if (seasonDone) KS.openOverlay("season", "season", { season: run.season, onContinue: KS.closeOverlay });
    KS.openOverlay("stageclear", "stageclear", {
      run: run, next: { mapId: nextId, name: nd.name, condition: run._nextCond }, bank: run.workOrder.bank,
      onNext: KS.nextStage, onClockOut: function () { KS.endRun("clockout"); }
    });
  };

  KS.nextStage = function () {
    var run = KS.run; if (!run || run.ended) return;
    run.stageIndex++;
    var p = run.player; p.hp = Math.min(p.maxHp, p.hp + 0.2 * p.maxHp);
    KS.loadStage(run.mapOrder[run.stageIndex % run.mapOrder.length]);
    if (ovCur && ovCur.mode === "stageclear") KS.closeOverlay();
  };

  function buildSummary(run, reason) {
    var ws = [], gs = [], i;
    for (i = 0; i < 6; i++) { var w = run.weapons[i]; if (w) ws.push({ id: w.id, level: w.level, evolved: !!w.evolved, dmgDealt: w.dmgDealt, kills: w.kills }); }
    for (i = 0; i < 6; i++) { var g = run.gear[i]; if (g) gs.push({ id: g.id, level: g.level }); }
    var items = {}; for (var k in run.items) items[k] = run.items[k];
    var counters = {}; for (k in run.counters) counters[k] = run.counters[k];
    counters.noHitBest = Math.max(counters.noHitBest, counters.noHitT);
    return { reason: reason, time: run.time, stagesCleared: run.stagesCleared, season: run.season, level: run.level, kills: run.kills,
      killsByType: run.killsByType, bossKills: run.bossKills, eliteKills: run.eliteKills, operatorId: run.operatorId, mapId: run.mapId, startMap: run.startMap,
      overtime: run.overtime, daily: run.daily, weapons: ws, gear: gs, items: items, tinselSpent: run.tinselSpent, pay: run.pay, maxTier: run.maxTier,
      crits: run.crits, burnKills: run.burnKills, objectivesDone: run.objectivesDone.slice(), counters: counters };
  }

  KS.endRun = function (reason) {
    var run = KS.run; if (!run || run.ended) return;
    run.ended = true;
    if (!run._cleared) nightPay(run, false);
    var summary = buildSummary(run, reason || "quit");
    var reward = null;
    try { reward = KS.meta.recordRun(summary); } catch (e) { KS.reportError("meta", e); }
    if (!reward) reward = { payEarned: 0, bowsEarned: 0, newUnlocks: [], newPages: [], newAchievements: [], nearest: [] };
    KS.emit("runEnd", { run: run, reason: summary.reason, summary: summary });
    ovQueue.length = 0; ovCur = null;
    setMode("results");
    var again = { operator: run.operatorId, map: run.startMap, overtime: run.overtime, daily: run.daily, seed: run.daily ? run.seed : undefined,
      condition: run.daily ? run._startCond : undefined };
    uiShow("results", { summary: summary, reward: reward, rsvpDone: !!KS.meta.rsvpDone, onAgain: function () { KS.startRun(again); }, onTitle: KS.toMenu });
  };

  KS.toMenu = function () {
    KS.run = null; ovQueue.length = 0; ovCur = null;
    KS.rng = new Rng((Math.random() * 4294967296) >>> 0);
    setMode("menu");
    uiShow("title", {});
  };

  var MODE_EV = { from: "", to: "" };
  function setMode(m) {
    var g = KS.G; if (g.mode === m) return;
    g.prevMode = g.mode; g.mode = m;
    MODE_EV.from = g.prevMode; MODE_EV.to = m;
    KS.emit("modeChange", MODE_EV);
  }
  KS.setMode = setMode;
  function uiShow(id, data) { if (KS.headless) return; try { KS.ui.show(id, data); } catch (e) { KS.reportError("ui", e); } }
  function uiHide() { if (KS.headless) return; try { KS.ui.hide(); } catch (e) { KS.reportError("ui", e); } }

  var ovQueue = [], ovCur = null, ovSeq = 0;
  KS.overlayOpen = function () { return ovCur !== null; };
  KS._overlayState = function () { return { current: ovCur ? ovCur.mode : null, queued: ovQueue.length }; };
  KS.openOverlay = function (mode, screenId, data) {
    var e = { mode: mode, screenId: screenId, data: data || {}, seq: ++ovSeq };
    if (ovCur) { ovQueue.push(e); return; }
    showOverlay(e);
  };
  function showOverlay(e) {
    ovCur = e; setMode(e.mode);
    if (KS.headless) {
      var d = e.data;
      try {
        if (e.mode === "levelup") KS.levelup.autoPick(KS.run);
        else if (e.mode === "crate") { if (d.onPick) d.onPick(0); }
        else if (e.mode === "stageclear") { if (d.onNext) d.onNext(); }
        else if (e.mode === "season") { if (d.onContinue) d.onContinue(); }
      } catch (err) { KS.reportError("overlay:" + e.mode, err); }
      if (ovCur === e) KS.closeOverlay();
    } else uiShow(e.screenId, e.data);
  }
  function openLevels(run) {
    for (var guard = 0; guard < 20; guard++) {
      if (run.pendingLevels <= 0 || run.ended) return false;
      var r = false;
      try { r = KS.levelup.open(run) === true; } catch (e) { KS.reportError("levelup", e); r = false; }
      if (r) return true;
      run.pendingLevels--;
    }
    return false;
  }
  KS.closeOverlay = function () {
    var e = ovCur; if (!e) return;
    ovCur = null;
    var run = KS.run;
    if (e.mode === "levelup" && run) {
      run.pendingLevels--; if (run.pendingLevels < 0) run.pendingLevels = 0;
      if (run.pendingLevels > 0 && !run.ended && openLevels(run)) return;
      if (ovCur) return;
    }
    if (ovQueue.length) { showOverlay(ovQueue.shift()); return; }
    uiHide();
    if (run && !run.ended) setMode("play");
  };
  KS.pause = function () {
    if (KS.G.mode !== "play" || !KS.run) return;
    setMode("paused"); uiShow("pause", { run: KS.run });
  };
  KS.resume = function () {
    if (KS.G.mode !== "paused") return;
    uiHide(); setMode("play");
  };

  // ---------------------------------------------------------------------------
  // §6.1 Player helpers, buffs
  // ---------------------------------------------------------------------------
  var HURT_EV = { amount: 0, raw: 0, kind: "", blocked: false };
  KS.hurtPlayer = function (raw, srcKind, srcX, srcY) {
    var run = KS.run; if (!run || run.ended) return 0;
    var p = run.player;
    if (!p.alive || !(raw > 0)) return 0;
    if (p.iframes > 0 || (p.dashT > 0 && p.dashInvuln)) return 0;
    var S = run.stats;
    var taken = Math.max(1, Math.max(raw * 0.5, raw - S.armor)) * (1 - S.dr);
    if (taken > 1e12) taken = 1e12;
    HURT_EV.raw = raw; HURT_EV.kind = srcKind || "contact";
    if (S.bubbleWrap > 0 && p.bubbleT <= 0) {
      p.bubbleT = Math.max(5, 15 / (1 + 0.15 * (S.bubbleWrap - 1)));
      p.iframes = 0.35;
      HURT_EV.amount = 0; HURT_EV.blocked = true;
      KS.emit("hurt", HURT_EV); KS.sfx("tink");
      return 0;
    }
    var left = taken;
    if (p.barrier > 0) { var b = p.barrier < left ? p.barrier : left; p.barrier -= b; left -= b; }
    p.hp -= left;
    p.iframes = 0.35; p.hurtFlash = 0.2;
    var c = run.counters; if (c.noHitT > c.noHitBest) c.noHitBest = c.noHitT; c.noHitT = 0;
    HURT_EV.amount = taken; HURT_EV.blocked = false;
    KS.emit("hurt", HURT_EV);
    try { KS.items.onHurt(taken); } catch (e) { KS.reportError("items", e); }
    KS.sfx("hurt");
    KS.shake(Math.min(8, 2 + taken * 0.1));
    return taken;
  };
  var HEAL_EV = { amount: 0, sourceId: "" };
  KS.healPlayer = function (amount, sourceId) {
    var run = KS.run; if (!run || !(amount > 0)) return 0;
    var p = run.player, S = run.stats;
    if (!p.alive) return 0;
    var h = amount * S.healMul * (sourceId === "pickup" ? S.healPickupMul : 1);
    if (h > p.maxHp - p.hp) h = p.maxHp - p.hp;
    if (!(h > 0)) return 0;
    p.hp += h;
    HEAL_EV.amount = h; HEAL_EV.sourceId = sourceId || "";
    KS.emit("heal", HEAL_EV);
    return h;
  };
  KS.addBarrier = function (amount, holdSeconds) {
    var run = KS.run; if (!run || !(amount > 0)) return;
    var p = run.player, cap = 0.25 * p.maxHp;
    p.barrier = Math.min(cap, p.barrier + amount);
    if (holdSeconds > 0 && holdSeconds > p.barrierHoldT) p.barrierHoldT = holdSeconds;
  };
  KS.playerSlow = function (mul, terrain) {
    var run = KS.run; if (!run || !(mul >= 0)) return;
    if (terrain) mul = 1 - (1 - mul) * (1 - run.stats.hazardSlowRes);
    run.player.slowAcc *= mul;
  };
  KS.playerOnIce = function () { if (KS.run && !KS.run.stats.iceImmune) KS.run.player.onIce = true; };
  KS.dash = function (dx, dy, dur, invuln) {
    var run = KS.run; if (!run) return;
    var p = run.player; dur = dur > 0 ? dur : 0.2;
    p.dashT = dur; p.dashVX = dx / dur; p.dashVY = dy / dur; p.dashInvuln = !!invuln;
  };
  KS.setContactImmune = function () { if (KS.run) KS.run.player.contactImmuneStep = KS.run.stepN; };
  KS.magnetAll = function (radius, dur) {
    var run = KS.run; if (!run) return;
    var p = run.player; p.magnetR = radius; p.magnetT = dur > 0 ? dur : 0.1;
  };
  KS.addBuff = function (id, seconds) {
    var run = KS.run; if (!run) return;
    var had = run.buffs[id] !== undefined;
    var s = seconds == null ? Infinity : seconds;
    if (!had) { run._buffIds.push(id); run.buffs[id] = s; }
    else if (s > run.buffs[id]) run.buffs[id] = s;
    var d = KS.defs.buffs[id];
    if (!had && d && d.stats) KS.recalcStats();
  };
  KS.hasBuff = function (id) { return !!(KS.run && KS.run.buffs[id] !== undefined); };
  KS.removeBuff = function (id) {
    var run = KS.run; if (!run || run.buffs[id] === undefined) return;
    delete run.buffs[id];
    var i = run._buffIds.indexOf(id); if (i >= 0) run._buffIds.splice(i, 1);
    var d = KS.defs.buffs[id]; if (d && d.stats) KS.recalcStats();
  };
  KS.revivesLeft = function () { var run = KS.run; return run ? Math.max(0, Math.round(run.stats.revives) - run.player.revivesUsed) : 0; };

  // ---------------------------------------------------------------------------
  // §8.2 XP, Tinsel, pay, price, counters
  // ---------------------------------------------------------------------------
  function xpNextFor(L) { var l = L - 1; return Math.round(6 + 4.5 * l + 0.12 * l * l); }
  KS.xpNextFor = xpNextFor;
  var xpStep = 0;
  var LVL_EV = { level: 0 };
  KS.addXP = function (n) {
    var run = KS.run; if (!run || !(n > 0)) return;
    n *= run.stats.xpMul;
    run.xp += n; xpStep += n;
    var guard = 0;
    while (run.xp >= run.xpNext && run.level < 300 && guard++ < 500) {
      run.xp -= run.xpNext; run.level++; run.xpNext = xpNextFor(run.level); run.pendingLevels++;
      LVL_EV.level = run.level;
      KS.emit("levelup", LVL_EV);
      try { KS.items.onLevelUp(run); } catch (e) { KS.reportError("items", e); }
    }
    if (run.level >= 300 && run.xp > run.xpNext) run.xp = run.xpNext;
  };
  KS.xpValue = function (e) {
    var run = KS.run; if (!run) return 0;
    var v = (e.xp || 0) * (1 + 0.03 * run.time / 60);
    if (v > 50) v = 50;
    if (e.elite) v *= 6;
    if (run._cHeavy) v *= 1.25;
    return v;
  };
  var TIN_EV = { total: 0, delta: 0 };
  KS.addTinsel = function (n) {
    var run = KS.run; if (!run || !(n > 0)) return;
    run.tinselAcc += n * run.stats.tinselMul;
    var whole = Math.floor(run.tinselAcc);
    if (whole <= 0) return;
    run.tinselAcc -= whole;
    var before = run.tinsel;
    run.tinsel = Math.min(1e9, run.tinsel + whole);
    if (run.tinsel !== before) { TIN_EV.total = run.tinsel; TIN_EV.delta = run.tinsel - before; KS.emit("tinsel", TIN_EV); }
  };
  KS.spendTinsel = function (n) {
    var run = KS.run; if (!run) return false;
    if (run.freeOpens > 0) { run.freeOpens--; return true; }
    if (!(n >= 0) || run.tinsel < n) return false;
    if (n === 0) return true;
    run.tinsel -= n; run.tinselSpent += n;
    TIN_EV.total = run.tinsel; TIN_EV.delta = -n; KS.emit("tinsel", TIN_EV);
    return true;
  };
  KS.addPay = function (n) { var run = KS.run; if (!run || !(n > 0)) return; run.pay = Math.min(1e9, run.pay + n * run.stats.payMul); };
  KS.price = function (base, costKind) {
    var run = KS.run;
    if (costKind === "free") return 0;
    if (costKind === "hp") return run ? Math.ceil(0.25 * run.player.hp) : 0;
    if (!run) return Math.round(base || 0);
    return Math.round((base || 0) * Math.pow(run.coeff, 1.1) * run.stats.priceMul);
  };
  KS.bump = function (name, n) { var run = KS.run; if (!run) return; var c = run.counters; if (typeof c[name] === "number") c[name] += (n == null ? 1 : n); };

  // ---------------------------------------------------------------------------
  // §6.3 Spawning helpers
  // ---------------------------------------------------------------------------
  var enemyAlive = 0;
  KS.enemyCount = function () { return enemyAlive; };
  var ELITE_EV = { enemy: null };
  function firstRuns() { try { return KS.meta.profile.stats.runs < 3; } catch (e) { return false; } }
  function initEnemy(e, def, x, y, opts, isBoss, run) {
    var elite = !!(opts && opts.elite);
    e.defId = def.id; e.def = def; e.isBoss = isBoss; e.bossPart = !!((opts && opts.bossPart) || def.bossPart);
    e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.kbx = 0; e.kby = 0;
    e.r = def.r * (elite ? 1.3 : 1); e.mass = isBoss ? Infinity : (def.mass || 1);
    e.speed = def.speed * run.spdMul; e.baseSpeed = e.speed;
    var hp;
    if (isBoss) hp = def.hp * run.hpMul * (1 + 0.5 * run.season) * (firstRuns() && run.stageIndex === 0 ? 0.7 : 1);
    else hp = def.hp * run.hpMul * (run._cHeavy ? 1.25 : 1) * ((opts && opts.hpMul) || 1) * (elite ? 3.5 : 1);
    if (!(hp > 0)) hp = 1; if (hp > 1e13) hp = 1e13;
    e.hp = hp; e.maxHp = hp;
    e.dmg = (def.dmg || 0) * run.dmgMul; e.xp = def.xp || 0; e.tinsel = (def.tinsel == null ? 1 : def.tinsel) * (elite ? 4 : 1);
    e.elite = elite;
    var af = opts && opts.affixes;
    e.affix0 = af && af.length > 0 ? af[0] : null; e.affix1 = af && af.length > 1 ? af[1] : null;
    e.dropCrate = !!(opts && opts.dropCrate); e.shieldHits = 0; e.dmgTaken = 1; e.invuln = false; e.rammed = false;
    e.state = ""; e.stateT = 0; e.face = 0; e.flash = 0; e.contactCd = 0; e.lastHitT = -99;
    var hs = e.hitStamp; for (var i = 0; i < 8; i++) hs[i] = -99;
    var st = e.st;
    st.burn = 0; st.burnDps = 0; st.splinter = 0; st.splinterDps = 0; st.splinterN = 0; st.chill = 0; st.chillStacks = 0; st.chillT = 0; st.freeze = 0; st.freezeImm = 0;
    st.stun = 0; st.stunImm = 0; st.strung = 0; st.shock = 0; st.slow = 0; st.slowMul = 1; st.dotTick = 0; st.dotDepth = 0;
    e.untargetable = false; e.noContact = !!def.noContact; e.objective = !!def.objective; e.flying = !!def.flying; e.stationary = !!def.stationary;
    e.noRecycle = !!(def.noRecycle || (opts && opts.noRecycle) || isBoss); e.noXp = !!def.noXp; e.recycleT = 0;
    e.parentUid = (opts && opts.parentUid) || 0; e.children = 0; e.stolen = 0; e.phase = 0; e.dmgTextAcc = 0; e.dmgTextT = 0;
    e._staggerT = 0; e._phasePending = -1; e._plate = null;
    if (!e.bossPart && !isBoss) enemyAlive++;
    try { def.init(e, run); } catch (err) { KS.reportError("enemy:" + def.id, err); }
    if (e.affix0) affixInit(e, e.affix0, run);
    if (e.affix1) affixInit(e, e.affix1, run);
    if (elite && !KS.headless) {
      var a0 = e.affix0 ? KS.defs.affixes[e.affix0] : null, a1 = e.affix1 ? KS.defs.affixes[e.affix1] : null;
      var label = (a0 ? a0.name : "Elite") + (a1 ? " · " + a1.name : "");
      try { e._plate = KS.textSprite("plate:" + (e.affix0 || "") + "|" + (e.affix1 || ""), label, "bold 12px Cinzel, serif", "#f3d27a"); } catch (e2) { e._plate = null; }
    }
    if (elite) { ELITE_EV.enemy = e; KS.emit("eliteSpawn", ELITE_EV); }
  }
  function affixInit(e, id, run) {
    var a = KS.defs.affixes[id];
    if (a && a.init) { try { a.init(e, run); } catch (err) { KS.reportError("affix:" + id, err); } }
  }
  KS.spawnEnemy = function (defId, x, y, opts) {
    var run = KS.run; if (!run) return null;
    var def = enemyDef(defId);
    if (!def) { KS.log("core", "spawnEnemy: unknown " + defId); return null; }
    var part = !!((opts && opts.bossPart) || def.bossPart);
    if (!part && enemyAlive >= KS.device.caps.enemies) return null;
    var e = run.enemies.alloc(); if (!e) return null;
    initEnemy(e, def, x, y, opts, false, run);
    return e;
  };
  var BOSS_EV = { enemy: null, bossId: "" };
  KS.spawnBoss = function (bossId, x, y) {
    var run = KS.run; if (!run) return null;
    var def = KS.defs.bosses[bossId];
    if (!def) { KS.log("core", "spawnBoss: no boss def " + bossId + "; encounter skipped"); run.bossSpawned = true; run.bossDone = true; return null; }
    var e = run.enemies.alloc(); if (!e) return null;
    initEnemy(e, def, x, y, null, true, run);
    run.boss = e; run.bossUid = e.uid; run.bossSpawned = true;
    var p = run.player; if (p.iframes < 2) p.iframes = 2;
    BOSS_EV.enemy = e; BOSS_EV.bossId = bossId;
    KS.emit("bossSpawn", BOSS_EV);
    if (!KS.headless) { try { KS.ui.bossBar(e); } catch (err) { KS.reportError("ui", err); } }
    KS.sfx("bossIntro");
    return e;
  };
  var BOSSDEATH_EV = { enemy: null, bossId: "" };
  KS.bossDone = function (run, x, y) {
    run = run || KS.run; if (!run) return;
    run.bossDone = true;
    var b = run.boss;
    if (x == null) { x = b ? b.x : run.player.x; y = b ? b.y : run.player.y; }
    KS.spawnPickup("goldbox", x, y, 1);
    KS.addTinsel(100 * run.coeff);
    run._stage.bosses++;
    BOSSDEATH_EV.enemy = b; BOSSDEATH_EV.bossId = b ? b.defId : "";
    KS.emit("bossDeath", BOSSDEATH_EV);
    KS.sfx("bossDeath");
    if (!KS.headless) { try { KS.ui.bossBar(null); } catch (err) { KS.reportError("ui", err); } }
  };
  KS.removeEnemy = function (e) {
    if (!e || !e.alive) return;
    e.alive = false;
    if (!e.bossPart && !e.isBoss) enemyAlive--;
  };

  KS.spawnProj = function (def, slot, x, y, vx, vy, fields) {
    var run = KS.run; if (!run || !def) return null;
    var p = run.projectiles.alloc(); if (!p) return null;
    if (run._cWindy) { vx *= 0.85; vy *= 0.85; }
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.r = 6; p.dmg = 0; p.pierce = 0; p.life = 2; p.slot = slot == null ? -1 : slot;
    p.weaponId = def.id || ""; p.def = def; p.tag = def.tag || ""; p.procCoef = def.procCoef != null ? def.procCoef : 1; p.depth = 0; p.kb = 0;
    p.canCrit = true; p.noOnKill = false; p.itemId = ""; p.bounces = 0; p.bounceIndex = 0; p.baseDmg = 0; p.bounceRange = 160; p.homing = 0;
    p.ang = Math.atan2(vy, vx); p.spin = 0; p.kind = 0; p.hitN = 0; p.color = ""; p.alpha = 1; p.noCollide = false; p.blockable = true; p._tOk = false;
    if (fields) {
      for (var k in fields) {
        if (k === "data") { var d = fields.data; for (var j in d) p.data[j] = d[j]; }
        else p[k] = fields[k];
      }
    }
    return p;
  };
  KS.spawnEProj = function (styleId, x, y, vx, vy, dmg, r, life, ownerUid, priority) {
    var run = KS.run; if (!run) return null;
    var pool = run.eprojectiles, c = KS.device.caps;
    if (!priority && pool.n >= c.eprojectiles - c.eprojReserve) return null;
    var q = pool.alloc(); if (!q) return null;
    if (run._cWindy) { vx *= 0.85; vy *= 0.85; }
    q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.dmg = dmg || 0; q.r = r > 0 ? r : 6; q.life = life > 0 ? life : 3; q.style = styleId || "";
    q._sdef = KS.defs.eprojStyles[styleId] || null; q.color = "#7a2a1e"; q.owner = ownerUid || 0; q.priority = !!priority;
    return q;
  };
  function evictHazard(pool) {
    var best = null, bt = -1, i, h;
    for (i = 0; i < pool.n; i++) { h = pool.list[i]; if (h.alive && !h.priority && h.cosmetic && h.t > bt) { best = h; bt = h.t; } }
    if (!best) for (i = 0; i < pool.n; i++) { h = pool.list[i]; if (h.alive && !h.priority && h.t > bt) { best = h; bt = h.t; } }
    return best ? reuse(best) : null;
  }
  KS.spawnHazard = function (defId, x, y, fields) {
    var run = KS.run; if (!run) return null;
    var def = KS.defs.hazards[defId];
    if (!def) { KS.log("core", "spawnHazard: unknown " + defId); return null; }
    var pool = run.hazards, c = KS.device.caps, pri = !!(fields && fields.priority);
    var h = null;
    if (!pri && pool.n >= c.hazards - c.hazardReserve) h = evictHazard(pool);
    else { h = pool.alloc(); if (!h) h = evictHazard(pool); }
    if (!h) return null;
    h.defId = defId; h.def = def; h.team = def.team || "enemy"; h.x = x; h.y = y; h.r = def.r || 30; h.w = 0; h.h = 0; h.ang = 0;
    h.life = def.life || 5; h.tele = 0; h.dmg = def.dmg || 0; h.tick = def.tick || 0.5; h.tickT = 0; h.slowMul = def.slowMul || 1;
    h.priority = pri; h.cosmetic = !!def.cosmetic; h.src = null;
    if (fields) {
      for (var k in fields) {
        if (k === "data") { var d = fields.data; for (var j in d) h.data[j] = d[j]; }
        else h[k] = fields[k];
      }
    }
    if (def.init) { try { def.init(h, run); } catch (err) { KS.reportError("hazard:" + defId, err); } }
    return h;
  };
  function findGem(pool, x, y, maxR) {
    var best = null, bd = maxR * maxR, old = null, ot = -1;
    for (var i = 0; i < pool.n; i++) {
      var g = pool.list[i]; if (!g.alive || g.type !== "xp") continue;
      var dx = g.x - x, dy = g.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = g; }
      if (g.t > ot) { ot = g.t; old = g; }
    }
    return best || old;
  }
  KS.spawnPickup = function (type, x, y, value) {
    var run = KS.run; if (!run) return null;
    var pool = run.pickups, k = pool.alloc();
    if (!k) {
      var g = findGem(pool, x, y, 120);
      if (!g) return null;
      if (type === "xp") { g.value += value; return g; }
      k = reuse(g);
    }
    k.type = type; k.x = x; k.y = y; k.vx = 0; k.vy = 0; k.value = value || 0; k.mag = false;
    return k;
  };
  KS.spawnInteractable = function (defId, x, y, fields) {
    var run = KS.run; if (!run) return null;
    var def = KS.defs.interactables[defId];
    if (!def) { KS.log("core", "spawnInteractable: unknown " + defId); return null; }
    if (run.interactables.length >= 64) return null;
    var it = { uid: ++UID, alive: true, defId: defId, def: def, x: x, y: y, r: def.r || 24, cost: def.baseCost || 0, standT: 0, uses: 0, state: "idle", data: {}, _denied: false, _in: false };
    if (fields) for (var k in fields) it[k] = fields[k];
    run.interactables.push(it);
    return it;
  };

  var fxMul = 1;
  function particle(x, y, vx, vy, life, size, color, kind, grav) {
    var run = KS.run; var q = run.particles.alloc(); if (!q) return;
    q.x = x; q.y = y; q.vx = vx; q.vy = vy; q.life = life; q.max = life; q.size = size; q.color = color; q.kind = kind; q.grav = grav;
  }
  KS.fx = function (kind, x, y, color, count, size) {
    var run = KS.run; if (!run || KS.headless) return;
    var n = Math.max(1, Math.round((count || 6) * fxMul)), s = size || 3, i, a, sp, fr = KS.frand;
    color = color || "#efe2c4";
    if (kind === "ring") { particle(x, y, 0, 0, 0.35, s, color, 2, 0); return; }
    for (i = 0; i < n; i++) {
      a = fr() * TAU;
      if (kind === "sparks") { sp = 180 + fr() * 220; particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.25 + fr() * 0.15, s, color, 3, 0); }
      else if (kind === "leaves") { sp = 40 + fr() * 90; particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, 0.7 + fr() * 0.5, s + 1, color, 4, 120); }
      else if (kind === "chips") { sp = 80 + fr() * 160; particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, 0.5 + fr() * 0.3, s, color, 1, 420); }
      else if (kind === "snow") { particle(x + (fr() - 0.5) * 40, y + (fr() - 0.5) * 40, (fr() - 0.5) * 30, 20 + fr() * 30, 0.8 + fr() * 0.6, s, color, 0, 0); }
      else if (kind === "embers") { particle(x + (fr() - 0.5) * 20, y, (fr() - 0.5) * 40, -40 - fr() * 60, 0.6 + fr() * 0.6, s, color, 0, -20); }
      else { sp = 60 + fr() * 160; particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3 + fr() * 0.3, s, color, 0, 0); }
    }
  };
  function setting(k) { try { var s = KS.meta.settings; return s ? s[k] : undefined; } catch (e) { return undefined; } }
  KS._setting = setting;
  KS.shake = function (amount) {
    if (KS.headless || setting("shake") === false || setting("reducedMotion")) return;
    var c = KS.cam; if (amount > c.shake) c.shake = Math.min(20, amount);
  };
  var flashColor = "#fff", flashT = 0, flashMax = 1;
  KS.flash = function (color, seconds) {
    if (KS.headless) return;
    flashColor = color || "#fff"; flashMax = Math.max(0.01, (seconds || 0.2) * (setting("reducedMotion") ? 0.5 : 1)); flashT = flashMax;
  };
  KS.dmgText = function (e, amount, crit) {
    var run = KS.run; if (!run || KS.headless) return;
    var mode = setting("dmgNumbers"); if (mode === "off") return;
    e.dmgTextAcc += amount;
    if (e.dmgTextT > 0 && !crit) return;
    var q = run.texts.alloc();
    if (!q) { var l = run.texts.list, o = null, ot = -1; for (var i = 0; i < run.texts.n; i++) if (l[i].alive && l[i].t > ot) { ot = l[i].t; o = l[i]; } if (!o) return; q = reuse(o); }
    q.x = e.x + (KS.frand() - 0.5) * e.r; q.y = e.y - e.r; q.val = e.dmgTextAcc; q.crit = !!crit; q.life = crit ? 0.9 : 0.6; q.targetUid = e.uid;
    q.str = KS.util.fmt(e.dmgTextAcc);
    e.dmgTextAcc = 0; e.dmgTextT = 0.15;
  };
  var itemProjN = 0;
  KS.itemProjOk = function () {
    var run = KS.run; if (!run) return false;
    if (itemProjN >= 64) { run.perf.itemProjDrops++; return false; }
    itemProjN++; return true;
  };

  // ---------------------------------------------------------------------------
  // §7 Spatial grid (enemies only) + static obstacle grid
  // ---------------------------------------------------------------------------
  var CELL = 64;
  var GR = { cols: 1, rows: 1, x0: 0, y0: 0, total: 1, start: new Int32Array(2), cnt: new Int32Array(1), items: new Int32Array(512), maxR: 16 };
  function gridResize(b) {
    GR.x0 = b.x0 - CELL; GR.y0 = b.y0 - CELL;
    GR.cols = Math.ceil((b.x1 - b.x0) / CELL) + 3; GR.rows = Math.ceil((b.y1 - b.y0) / CELL) + 3;
    GR.total = GR.cols * GR.rows;
    if (GR.start.length < GR.total + 1) { GR.start = new Int32Array(GR.total + 1); GR.cnt = new Int32Array(GR.total); }
  }
  function cx(x) { var c = Math.floor((x - GR.x0) / CELL); return c < 0 ? 0 : (c >= GR.cols ? GR.cols - 1 : c); }
  function cy(y) { var c = Math.floor((y - GR.y0) / CELL); return c < 0 ? 0 : (c >= GR.rows ? GR.rows - 1 : c); }
  function gridRebuild(run) {
    var pool = run.enemies, list = pool.list, n = pool.n, i, c, e;
    if (GR.items.length < list.length) GR.items = new Int32Array(Math.max(list.length, GR.items.length * 2));
    var cnt = GR.cnt, start = GR.start, total = GR.total;
    cnt.fill(0, 0, total);
    var alive = 0, maxR = 8;
    for (i = 0; i < n; i++) {
      e = list[i];
      if (!e.alive) { e._cell = -1; continue; }
      if (!e.bossPart && !e.isBoss) alive++;
      c = cy(e.y) * GR.cols + cx(e.x); e._cell = c; cnt[c]++;
      if (e.r > maxR) maxR = e.r;
    }
    enemyAlive = alive; GR.maxR = maxR;
    start[0] = 0;
    for (c = 0; c < total; c++) start[c + 1] = start[c] + cnt[c];
    for (c = 0; c < total; c++) cnt[c] = start[c];
    for (i = 0; i < n; i++) { e = list[i]; if (e._cell >= 0) GR.items[cnt[e._cell]++] = i; }
    if (alive > run.perf.enemyPeak) run.perf.enemyPeak = alive;
  }
  function gridQuery(x, y, r, out, max, all) {
    var run = KS.run; if (!run) return 0;
    if (!max || max > out.length) max = out.length;
    var R = r + GR.maxR, list = run.enemies.list, items = GR.items, start = GR.start, cols = GR.cols;
    var x0 = cx(x - R), x1 = cx(x + R), y0 = cy(y - R), y1 = cy(y + R), n = 0;
    for (var gy = y0; gy <= y1; gy++) {
      for (var gx = x0; gx <= x1; gx++) {
        var c = gy * cols + gx;
        for (var k = start[c], ke = start[c + 1]; k < ke; k++) {
          var e = list[items[k]];
          if (!e.alive || (!all && e.untargetable)) continue;
          var dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy <= rr * rr) { out[n++] = e; if (n >= max) return n; }
        }
      }
    }
    return n;
  }
  KS.grid = {
    // §4.5: core calls this once per step (enemies only). Exposed so a module
    // that moves/spawns enemies mid-step can refresh the grid; safe with no run.
    rebuild: function (run) { run = run || KS.run; if (run && run.enemies) gridRebuild(run); },
    query: function (x, y, r, out, max) { return gridQuery(x, y, r, out, max, false); },
    queryAll: function (x, y, r, out, max) { return gridQuery(x, y, r, out, max, true); }
  };
  function targetOk(e, p) {
    if (!e.alive || e.untargetable || e.defId === "fueldrum") return false;
    if (e.objective) { var dx = e.x - p.x, dy = e.y - p.y; if (dx * dx + dy * dy > 22500) return false; }
    return true;
  }
  KS.nearestEnemy = function (x, y, maxR, exA, exB) {
    var run = KS.run; if (!run) return null;
    var p = run.player, list = run.enemies.list, items = GR.items, start = GR.start, cols = GR.cols, rows = GR.rows;
    if (!(maxR > 0)) maxR = 1e6;
    var best = null, bestD = maxR * maxR;
    var ccx = cx(x), ccy = cy(y);
    var maxRing = Math.min(Math.ceil(maxR / CELL) + 1, Math.max(cols, rows));
    for (var ring = 0; ring <= maxRing; ring++) {
      if (best && ring > 1) { var lim = (ring - 1) * CELL; if (lim * lim > bestD) break; }
      for (var gy = ccy - ring; gy <= ccy + ring; gy++) {
        if (gy < 0 || gy >= rows) continue;
        var edge = (gy === ccy - ring || gy === ccy + ring);
        var step = (edge || ring === 0) ? 1 : 2 * ring;
        for (var gx = ccx - ring; gx <= ccx + ring; gx += step) {
          if (gx < 0 || gx >= cols) continue;
          var c = gy * cols + gx;
          for (var k = start[c], ke = start[c + 1]; k < ke; k++) {
            var e = list[items[k]];
            if (e.uid === exA || e.uid === exB || !targetOk(e, p)) continue;
            var dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = e; }
          }
        }
      }
    }
    return best;
  };
  var SCR = new Array(512), SCR2 = new Array(256), SCRD = new Float64Array(512);
  KS.nearestN = function (x, y, n, maxR, out) {
    var run = KS.run; if (!run) return 0;
    var p = run.player, cnt = gridQuery(x, y, maxR, SCR, 512, false), m = 0, i, j;
    for (i = 0; i < cnt; i++) { var e = SCR[i]; if (!targetOk(e, p)) continue; var dx = e.x - x, dy = e.y - y; SCR[m] = e; SCRD[m] = dx * dx + dy * dy; m++; }
    var lim = Math.min(n, m, out.length);
    for (i = 0; i < lim; i++) {
      var bi = i;
      for (j = i + 1; j < m; j++) if (SCRD[j] < SCRD[bi]) bi = j;
      var te = SCR[i]; SCR[i] = SCR[bi]; SCR[bi] = te; var td = SCRD[i]; SCRD[i] = SCRD[bi]; SCRD[bi] = td;
      out[i] = SCR[i];
    }
    return lim;
  };
  KS.randomEnemyNear = function (x, y, maxR) {
    var run = KS.run; if (!run) return null;
    var p = run.player, cnt = gridQuery(x, y, maxR, SCR, 512, false), m = 0;
    for (var i = 0; i < cnt; i++) if (targetOk(SCR[i], p)) SCR[m++] = SCR[i];
    return m ? SCR[KS.rng.int(0, m - 1)] : null;
  };
  KS.densestPoint = function (radius, out) {
    var run = KS.run; if (!run) return false;
    var p = run.player, cnt = gridQuery(p.x, p.y, 520, SCR, 512, false);
    out.n = 0;
    if (!cnt) return false;
    var stride = Math.max(1, Math.floor(cnt / 40));
    for (var i = 0; i < cnt; i += stride) {
      var e = SCR[i];
      var n = gridQuery(e.x, e.y, radius, SCR2, 256, false);
      if (n > out.n) { out.n = n; out.x = e.x; out.y = e.y; }
    }
    return out.n > 0;
  };
  KS.onScreen = function (x, y, r) {
    var c = KS.cam; r = r || 0;
    return x + r > c.x - c.w * 0.5 && x - r < c.x + c.w * 0.5 && y + r > c.y - c.h * 0.5 && y - r < c.y + c.h * 0.5;
  };
  KS.inBounds = function (x, y, margin) {
    var run = KS.run; if (!run) return false; var b = run.bounds; margin = margin || 0;
    return x >= b.x0 + margin && x <= b.x1 - margin && y >= b.y0 + margin && y <= b.y1 - margin;
  };
  var OCELL = 128;
  function buildObstacleGrid(run) {
    var b = run.bounds, cols = Math.ceil((b.x1 - b.x0) / OCELL) + 1, rows = Math.ceil((b.y1 - b.y0) / OCELL) + 1;
    var g = { cols: cols, rows: rows, x0: b.x0, y0: b.y0, maxR: 0, cells: [] };
    var obs = run.obstacles, i;
    for (i = 0; i < cols * rows; i++) g.cells.push(null);
    for (i = 0; i < obs.length; i++) {
      var o = obs[i]; if (o.r > g.maxR) g.maxR = o.r;
      var ax = Math.max(0, Math.floor((o.x - o.r - b.x0) / OCELL)), bx = Math.min(cols - 1, Math.floor((o.x + o.r - b.x0) / OCELL));
      var ay = Math.max(0, Math.floor((o.y - o.r - b.y0) / OCELL)), by = Math.min(rows - 1, Math.floor((o.y + o.r - b.y0) / OCELL));
      for (var yy = ay; yy <= by; yy++) for (var xx = ax; xx <= bx; xx++) { var c = yy * cols + xx; if (!g.cells[c]) g.cells[c] = []; g.cells[c].push(o); }
    }
    run.obstacleGrid = g;
  }
  KS.rebuildObstacles = function () { if (KS.run) buildObstacleGrid(KS.run); };
  KS.pushOutObstacles = function (ent) {
    var run = KS.run; if (!run) return; var g = run.obstacleGrid; if (!g || !run.obstacles.length) return;
    var gx = Math.floor((ent.x - g.x0) / OCELL), gy = Math.floor((ent.y - g.y0) / OCELL);
    if (gx < 0 || gy < 0 || gx >= g.cols || gy >= g.rows) return;
    var cell = g.cells[gy * g.cols + gx]; if (!cell) return;
    var er = ent.r || 0;
    for (var i = 0; i < cell.length; i++) {
      var o = cell[i], dx = ent.x - o.x, dy = ent.y - o.y, rr = o.r + er, d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        var d = Math.sqrt(d2);
        if (d < 0.001) { ent.x = o.x + rr; continue; }
        ent.x = o.x + dx / d * rr; ent.y = o.y + dy / d * rr;
      }
    }
  };
  KS.segmentHitsCircle = function (x1, y1, x2, y2, px, py, r) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = 0;
    if (l2 > 0) { t = ((px - x1) * dx + (py - y1) * dy) / l2; t = t < 0 ? 0 : (t > 1 ? 1 : t); }
    var qx = x1 + dx * t - px, qy = y1 + dy * t - py;
    return qx * qx + qy * qy <= r * r;
  };
  KS.tmp = { a: new Array(512), b: new Array(512), c: new Array(64), v: { x: 0, y: 0 }, w: { x: 0, y: 0 }, p: { x: 0, y: 0, n: 0 } };

  // ---------------------------------------------------------------------------
  // §8 Damage pipeline, kills, status
  // ---------------------------------------------------------------------------
  KS.makeSrc = function () {
    return { team: "player", slot: -1, weaponId: "", itemId: "", tag: "", procCoef: 1, depth: 0, canCrit: true, kb: 0, kbx: 0, kby: 0, isDot: false, x: 0, y: 0,
      noProc: false, noOnKill: false, chainLeft: 0, restarts: 0, bounceIndex: 0 };
  };
  var HIT = [], KILL = [], dmgLevel = 0, killLevel = 0;
  for (var hl = 0; hl < MAX_DEPTH + 2; hl++) {
    HIT.push({ enemy: null, amount: 0, crit: false, src: null, killed: false });
    KILL.push({ enemy: null, src: null, x: 0, y: 0, defId: "", elite: false, boss: false, depth: 0 });
  }
  var DOT = KS.makeSrc(); DOT.isDot = true; DOT.procCoef = 0; DOT.canCrit = false; DOT.slot = 6;
  var sfxHitStep = -1;
  KS.zoneMul = function (x, y) { var run = KS.run; var md = run && run.mapDef; return md && md.zoneMul ? md.zoneMul(x, y, run) : 1; };

  KS.damage = function (e, baseAmount, src) {
    var run = KS.run;
    if (!run || !e || !e.alive || e.untargetable) return 0;
    if (e.invuln) { e.flash = 0.08; KS.sfx("tink"); return 0; }
    var S = run.stats, st = e.st;
    var amt = baseAmount;
    if (!(amt > 0)) return 0;
    if (st.freeze > 0 && src.tag === "blade") amt *= 1.25;
    if (st.shock > 0) { amt *= 1.25; st.shock = 0; }
    var md = run.mapDef; if (md.zoneMul) amt *= md.zoneMul(e.x, e.y, run);
    amt *= e.dmgTaken;
    if (e.elite || e.isBoss || e.bossPart) amt *= S.eliteDmg;
    amt *= KS.meta.codexMul(e.defId);
    amt *= KS.items.dmgMul(e, src);
    var crit = false;
    if (src.canCrit && !src.isDot && S.crit > 0 && KS.rng.next() < S.crit) { amt *= S.critMult; crit = true; run.crits++; }
    if (!(amt === amt)) amt = 0;
    if (amt > 1e12) amt = 1e12;
    var level = dmgLevel, H = HIT[level < MAX_DEPTH + 1 ? level : MAX_DEPTH + 1];
    var evts = level <= MAX_DEPTH + 1;
    // Gift-Wrapped shield (affix decides; returning true from onHit blocks the hit)
    if (e.shieldHits > 0 && (e.affix0 || e.affix1)) {
      H.enemy = e; H.amount = amt; H.crit = crit; H.src = src; H.killed = false;
      if (affixBlock(e, e.affix0, H, run) || affixBlock(e, e.affix1, H, run)) { e.flash = 0.08; KS.sfx("tink"); return 0; }
    }
    var killed = e.hp - amt <= 0;
    e.hp -= amt;
    e.flash = 0.1; e.lastHitT = run.time;
    var slot = src.slot;
    if (slot >= 0 && slot < 8) e.hitStamp[slot] = run.time;
    if (slot >= 0 && slot < 6) { var w = run.weapons[slot]; if (w) w.dmgDealt += amt; }
    if (src.kb > 0 && !e.isBoss && !e.stationary && !e.def.noKnockback && e.mass < Infinity) {
      var kx = src.kbx, ky = src.kby;
      if (kx === 0 && ky === 0) { kx = e.x - src.x; ky = e.y - src.y; }
      var kl = Math.sqrt(kx * kx + ky * ky);
      if (kl > 0) { var imp = src.kb * S.knockback / (e.mass || 1); e.kbx += kx / kl * imp; e.kby += ky / kl * imp; }
    }
    KS.dmgText(e, amt, crit);
    if (run.stepN !== sfxHitStep) { sfxHitStep = run.stepN; KS.sfx(crit ? "crit" : "hit"); }
    if (e.def.onHurt) { try { e.def.onHurt(e, amt, src, run); } catch (err0) { KS.reportError("enemy:" + e.defId, err0); } }
    if (evts) {
      dmgLevel++;
      try {
        H.enemy = e; H.amount = amt; H.crit = crit; H.src = src; H.killed = killed;
        KS.emit("hit", H);
        if (src.depth < MAX_DEPTH && src.procCoef > 0 && !src.isDot && !src.noProc) {
          try { KS.items.onHit(H); } catch (err1) { KS.reportError("items", err1); }
          if (e.affix0) affixHit(e, e.affix0, H, run);
          if (e.affix1) affixHit(e, e.affix1, H, run);
        }
      } finally { dmgLevel--; }
    }
    // burn x Blast synergy: one extra burn tick
    if (src.tag === "blast" && !src.isDot && st.burn > 0 && st.burnDps > 0 && e.alive && e.hp > 0) {
      DOT.depth = st.dotDepth; DOT.x = e.x; DOT.y = e.y; DOT.slot = 6;
      KS.damage(e, st.burnDps * 0.5, DOT);
    }
    if (e.alive && e.hp <= 0) KS.killEnemy(e, src);
    return amt;
  };
  function affixBlock(e, id, H, run) {
    if (!id) return false; var a = KS.defs.affixes[id]; if (!a || !a.onHit) return false;
    try { return a.onHit(e, H, run) === true; } catch (err) { KS.reportError("affix:" + id, err); return false; }
  }
  function affixHit(e, id, H, run) {
    var a = KS.defs.affixes[id]; if (!a || !a.onHit) return;
    try { a.onHit(e, H, run); } catch (err) { KS.reportError("affix:" + id, err); }
  }

  KS.killEnemy = function (e, src) {
    var run = KS.run;
    if (!run || !e || !e.alive) return;
    e.alive = false;
    if (!e.bossPart && !e.isBoss) enemyAlive--;
    src = src || DOT;
    var def = e.def;
    if (def.onDeath) { try { def.onDeath(e, src, run); } catch (err) { KS.reportError("enemy:" + e.defId, err); } }
    if (e.affix0) affixDeath(e, e.affix0, src, run);
    if (e.affix1) affixDeath(e, e.affix1, src, run);
    if (!e.noXp) KS.spawnPickup("xp", e.x, e.y, KS.xpValue(e));
    if (e.tinsel > 0) KS.addTinsel(e.tinsel * 0.25 * (1 + 0.1 * run.coeff));
    if (e.dropCrate) KS.spawnPickup("supplycrate", e.x, e.y, 1);
    if (def.noKill) return;
    run.kills++; run._stage.kills++;
    run.killsByType[e.defId] = (run.killsByType[e.defId] || 0) + 1;
    if (e.elite) { run.eliteKills++; run._stage.elites++; }
    if (e.isBoss) run.bossKills[e.defId] = (run.bossKills[e.defId] || 0) + 1;
    if (e.st.burn > 0) run.burnKills++;
    var p = run.player, dx = e.x - p.x, dy = e.y - p.y;
    if (dx * dx + dy * dy < 14400) KS.bump("nearKills", 1);
    if (e.defId === "mimic") KS.bump("mimicKills", 1);
    else if (e.defId === "crow") KS.bump("crowKills", 1);
    if (src.slot >= 0 && src.slot < 6) { var w = run.weapons[src.slot]; if (w) w.kills++; }
    if (src.depth > run.maxDepth) run.maxDepth = src.depth;
    var level = killLevel;
    if (level > MAX_DEPTH + 1) return;
    var K = KILL[level];
    K.enemy = e; K.src = src; K.x = e.x; K.y = e.y; K.defId = e.defId; K.elite = e.elite; K.boss = e.isBoss; K.depth = src.depth;
    killLevel++;
    try {
      KS.emit("kill", K);
      if (run.opDef && run.opDef.onKill) { try { run.opDef.onKill(K, run); } catch (err2) { KS.reportError("meta", err2); } }
      if (src.depth < MAX_DEPTH && !src.noOnKill) {
        inOnKill++;
        try { KS.items.onKill(K); } catch (err3) { KS.reportError("items", err3); } finally { inOnKill--; }
      }
    } finally { killLevel--; }
  };
  function affixDeath(e, id, src, run) {
    var a = KS.defs.affixes[id]; if (!a || !a.onDeath) return;
    try { a.onDeath(e, src, run); } catch (err) { KS.reportError("affix:" + id, err); }
  }

  var STATUS_EV = { enemy: null, kind: "", src: null };
  KS.applyStatus = function (e, kind, power, dur, src) {
    var run = KS.run; if (!run || !e || !e.alive) return;
    var S = run.stats, st = e.st, big = e.isBoss || e.bossPart, depth = src ? src.depth : 0;
    if (!(dur > 0)) dur = 0;
    if (!(power >= 0)) power = 0;
    switch (kind) {
      case "burn":
        dur *= S.statusMul * S.burnStatusMul; power *= S.statusMul * S.burnStatusMul;
        if (power > st.burnDps) st.burnDps = power;
        if (dur > st.burn) st.burn = dur;
        if (st.dotTick <= 0) st.dotTick = 0.5;
        st.dotDepth = depth; break;
      case "splinter":
        dur *= S.statusMul; power *= S.statusMul;
        if (st.splinterN < 10) { st.splinterDps += power; st.splinterN++; }
        if (dur > st.splinter) st.splinter = dur;
        if (st.dotTick <= 0) st.dotTick = 0.5;
        st.dotDepth = depth; break;
      case "chill":
        dur *= S.statusMul;
        if (dur > st.chill) st.chill = dur;
        st.chillStacks++; st.chillT = 2;
        // power > 0 means the source "freezes": power = freeze duration at 3 stacks
        if (power > 0 && st.chillStacks >= 3) { st.chillStacks = 0; KS.applyStatus(e, "freeze", 0, power, src); return; }
        break;
      case "freeze":
        if (big) { applySlow(st, 0.5, dur * 0.5 * S.statusMul); break; }
        if (st.freezeImm > 0) return;
        dur *= S.statusMul * S.freezeDurMul;
        if (dur > st.freeze) st.freeze = dur;
        st.chillStacks = 0; break;
      case "stun":
        if (big) { applySlow(st, 0.5, dur * 0.5 * S.statusMul); break; }
        if (st.stunImm > 0) return;
        dur *= S.statusMul;
        if (dur > st.stun) st.stun = dur; break;
      case "strung": if (dur > st.strung) st.strung = dur; break;
      case "shock": st.shock = dur > 0 ? dur : 5; break;
      case "slow": applySlow(st, power > 0 && power < 1 ? power : 0.7, dur * S.statusMul); break;
      default: return;
    }
    STATUS_EV.enemy = e; STATUS_EV.kind = kind; STATUS_EV.src = src || null;
    KS.emit("status", STATUS_EV);
  };
  function applySlow(st, mul, dur) {
    if (st.slow <= 0 || mul < st.slowMul) st.slowMul = mul;
    if (dur > st.slow) st.slow = dur;
  }
  function statusTick(e) {
    var st = e.st;
    if (st.burn > 0 || st.splinter > 0) {
      st.dotTick -= DT;
      if (st.dotTick <= 0) {
        st.dotTick += 0.5;
        var d = 0;
        if (st.burn > 0) d += st.burnDps * 0.5;
        if (st.splinter > 0) d += st.splinterDps * 0.5;
        if (d > 0) { DOT.depth = st.dotDepth; DOT.x = e.x; DOT.y = e.y; DOT.slot = 6; KS.damage(e, d, DOT); }
      }
      if (st.burn > 0) { st.burn -= DT; if (st.burn <= 0) { st.burn = 0; st.burnDps = 0; } }
      if (st.splinter > 0) { st.splinter -= DT; if (st.splinter <= 0) { st.splinter = 0; st.splinterDps = 0; st.splinterN = 0; } }
    }
    if (st.chill > 0) { st.chill -= DT; if (st.chill < 0) st.chill = 0; }
    if (st.chillT > 0) { st.chillT -= DT; if (st.chillT <= 0) { st.chillT = 0; st.chillStacks = 0; } }
    if (st.freeze > 0) { st.freeze -= DT; if (st.freeze <= 0) { st.freeze = 0; st.freezeImm = 1; } } else if (st.freezeImm > 0) st.freezeImm -= DT;
    if (st.stun > 0) { st.stun -= DT; if (st.stun <= 0) { st.stun = 0; st.stunImm = 2; } } else if (st.stunImm > 0) st.stunImm -= DT;
    if (st.strung > 0) st.strung -= DT;
    if (st.shock > 0) { st.shock -= DT; if (st.shock < 0) st.shock = 0; }
    if (st.slow > 0) { st.slow -= DT; if (st.slow <= 0) { st.slow = 0; st.slowMul = 1; } }
  }

  KS.itemBase = function () {
    var run = KS.run; if (!run) return 12;
    return 12 * (1 + 0.08 * (run.level - 1)) * run.stats.might;
  };

  // ---------------------------------------------------------------------------
  // §8.3 Proc queue
  // ---------------------------------------------------------------------------
  var PROC_CAP = 2048, PQ = [], pqHead = 0, pqLen = 0, inOnKill = 0, onKillPushes = 0;
  for (var pi = 0; pi < PROC_CAP; pi++) PQ.push({ kind: "", x: 0, y: 0, a: 0, b: 0, c: 0, coef: 0, depth: 0, itemId: "", slot: -1, targetUid: 0, restarts: 0 });
  var PEV = { kind: "", x: 0, y: 0, a: 0, b: 0, c: 0, coef: 0, depth: 0, itemId: "", slot: -1, targetUid: 0, restarts: 0 };
  KS.procs = {
    push: function (kind, x, y, a, b, c, coef, src, targetUid) {
      var run = KS.run; if (!run) return false;
      var d = (src ? src.depth : 0) + 1;
      if (d > MAX_DEPTH) return false;
      if (inOnKill > 0) { if (onKillPushes >= 60) return false; onKillPushes++; }
      if (pqLen >= PROC_CAP) { run.perf.procDrops++; return false; }
      var q = PQ[(pqHead + pqLen) % PROC_CAP]; pqLen++;
      q.kind = kind; q.x = x; q.y = y; q.a = a || 0; q.b = b || 0; q.c = c || 0; q.coef = coef || 0; q.depth = d;
      q.itemId = src ? (src.itemId || "") : ""; q.slot = src ? src.slot : -1; q.restarts = src ? (src.restarts || 0) : 0; q.targetUid = targetUid || 0;
      if (pqLen > run.perf.procMax) run.perf.procMax = pqLen;
      if (d > run.maxDepth) run.maxDepth = d;
      return true;
    },
    flush: function (budget) {
      var run = KS.run; if (!run) return;
      for (var n = 0; n < budget && pqLen > 0; n++) {
        var q = PQ[pqHead]; pqHead = (pqHead + 1) % PROC_CAP; pqLen--;
        PEV.kind = q.kind; PEV.x = q.x; PEV.y = q.y; PEV.a = q.a; PEV.b = q.b; PEV.c = q.c; PEV.coef = q.coef; PEV.depth = q.depth;
        PEV.itemId = q.itemId; PEV.slot = q.slot; PEV.targetUid = q.targetUid; PEV.restarts = q.restarts;
        var fn = KS.defs.procs[PEV.kind];
        if (fn) { try { fn(PEV, run); } catch (err) { KS.reportError("proc:" + PEV.kind, err); } }
      }
    },
    clear: function () { pqHead = 0; pqLen = 0; },
    size: function () { return pqLen; }
  };
  var PSRC_B = KS.makeSrc(), PSRC_A = KS.makeSrc(), PBUF = new Array(256), ARC_HIT = new Int32Array(24);
  function procSrc(s, ev, tag) {
    s.team = "player"; s.slot = ev.slot; s.weaponId = ""; s.itemId = ev.itemId; s.tag = tag; s.procCoef = ev.coef; s.depth = ev.depth; s.canCrit = false;
    s.kb = 0; s.kbx = 0; s.kby = 0; s.isDot = false; s.x = ev.x; s.y = ev.y; s.noProc = false; s.noOnKill = false; s.chainLeft = 0; s.restarts = ev.restarts; s.bounceIndex = 0;
  }
  KS.registerProc("blast", function (ev, run) {
    procSrc(PSRC_B, ev, "blast");
    var n = gridQuery(ev.x, ev.y, ev.a, PBUF, 256, false);
    for (var i = 0; i < n; i++) KS.damage(PBUF[i], ev.b, PSRC_B);
    KS.fx("ring", ev.x, ev.y, "#c9993b", 1, ev.a);
  });
  KS.registerProc("arc", function (ev, run) {
    procSrc(PSRC_A, ev, "ring");
    var cur = null, i, n = gridQuery(ev.x, ev.y, 80, PBUF, 256, false);
    for (i = 0; i < n; i++) if (PBUF[i].uid === ev.targetUid) { cur = PBUF[i]; break; }
    if (!cur) cur = KS.nearestEnemy(ev.x, ev.y, ev.c > 0 ? ev.c : 160);
    var jumps = Math.min(20, Math.max(1, Math.round(ev.a))), range = ev.c > 0 ? ev.c : 160, hits = 0, px = ev.x, py = ev.y;
    while (cur && hits < jumps) {
      ARC_HIT[hits++] = cur.uid;
      if (!KS.headless) arcFx(px, py, cur.x, cur.y);
      px = cur.x; py = cur.y;
      PSRC_A.x = px; PSRC_A.y = py;
      KS.damage(cur, ev.b, PSRC_A);
      n = gridQuery(px, py, range, PBUF, 256, false);
      var best = null, bd = 1e18;
      for (i = 0; i < n; i++) {
        var e = PBUF[i]; if (!e.alive) continue;
        var seen = false; for (var j = 0; j < hits; j++) if (ARC_HIT[j] === e.uid) { seen = true; break; }
        if (seen) continue;
        var dx = e.x - px, dy = e.y - py, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
  });
  function arcFx(x0, y0, x1, y1) {
    var run = KS.run;
    for (var k = 1; k <= 4; k++) {
      var t = k / 5;
      particle(x0 + (x1 - x0) * t + (KS.frand() - 0.5) * 8, y0 + (y1 - y0) * t + (KS.frand() - 0.5) * 8, 0, 0, 0.18, 2.5, "#f6e27a", 0, 0);
    }
    if (!run) return;
  }

  // ---------------------------------------------------------------------------
  // §9.1 wstat, acquisition helpers
  // ---------------------------------------------------------------------------
  var WKEY = { dmg: 1, tick: 1, burnDps: 1, contact: 1, cd: 2, interval: 2, radius: 3, reach: 3, len: 3, orbit: 3, width: 3, angle: 4, dur: 5, life: 5,
    count: 6, pellets: 6, drones: 6, pierce: 7, speed: 8 };
  function hasTag(def, t) { return def.tag === t || !!(def.tags2 && def.tags2.indexOf(t) >= 0); }
  function wcalc(def, level, key, run) {
    var L = def && def.levels; if (!L || !L.length) return 0;
    var li = level < 1 ? 1 : (level > L.length ? L.length : level);
    var row = L[li - 1]; if (!row) return 0;
    var v = row[key]; if (typeof v !== "number") return 0;
    var op = run && run.opDef && run.opDef.weaponBonus;
    if (op && op.key === key && (def.id === op.weaponId || def.from === op.weaponId) && run.level >= (op.minLevel || 0)) v += op.add;
    if (def._noScale && def._noScale[key]) return v;
    var S = run ? run.stats : BASE;
    switch (WKEY[key]) {
      case 1: return v * S.might;
      case 2: v *= S.cooldown; return v < 0.05 ? 0.05 : v;
      case 3: return v * S.area;
      case 4: v *= S.area; return v > 360 ? 360 : v;
      case 5: return v * S.duration;
      case 6: v += S.amount; if (run && run.crew && run.crew.fullload && hasTag(def, "haul")) v += 1; return v;
      case 7: return v + S.pierce;
      case 8: return v * S.projSpeed;
    }
    return v;
  }
  KS.wstat = function (w, key) { return wcalc(w.def, w.level, key, KS.run); };
  KS.wstatAt = function (def, level, key) { return wcalc(def, level, key, KS.run); };
  KS.weaponsOwned = function (run, id) {
    run = run || KS.run; if (!run) return null;
    for (var i = 0; i < 6; i++) { var w = run.weapons[i]; if (w && w.id === id) return w; }
    return null;
  };
  function makeWeapon(slot, id, def, level) {
    return { slot: slot, id: id, def: def, level: level, evolved: !!def.evolved, fused: !!def.fusion, cd: 0, t: 0, state: {}, dmgDealt: 0, kills: 0, hudFrac: -1, hudPips: -1 };
  }
  KS.addWeapon = function (id) {
    var run = KS.run; if (!run) return null;
    var def = weaponDef(id); if (!def) { KS.log("core", "addWeapon: unknown " + id); return null; }
    var slot = run.weapons.indexOf(null); if (slot < 0) return null;
    var w = makeWeapon(slot, id, def, 1);
    run.weapons[slot] = w;
    try { def.init(w, run); } catch (err) { KS.reportError("weapon:" + id, err); }
    KS.emit("weaponAdd", { w: w });
    KS.recalcStats();
    return w;
  };
  KS.levelWeapon = function (w, levels) {
    var run = KS.run; if (!run || !w) return;
    var target = Math.min(8, w.level + (levels || 1));
    while (w.level < target) {
      w.level++;
      if (w.def.onLevel) { try { w.def.onLevel(w, w.level, run); } catch (err) { KS.reportError("weapon:" + w.id, err); } }
      KS.emit("weaponLevel", { w: w, level: w.level });
    }
  };
  KS.replaceWeapon = function (w, newId) {
    var run = KS.run; if (!run || !w) return null;
    var nd = weaponDef(newId); if (!nd) { KS.log("core", "replaceWeapon: unknown " + newId); return null; }
    var od = w.def;
    if (od.onRemove) { try { od.onRemove(w, run); } catch (err) { KS.reportError("weapon:" + w.id, err); } }
    var nw = makeWeapon(w.slot, newId, nd, w.level);
    nw.dmgDealt = w.dmgDealt; nw.kills = w.kills;
    run.weapons[w.slot] = nw;
    try { nd.init(nw, run); } catch (err2) { KS.reportError("weapon:" + newId, err2); }
    if (nd.fusion) {
      var r = nd.recipe && nd.recipe.weapons ? nd.recipe.weapons : [];
      KS.emit("fuse", { w: nw, a: r[0] || od.id, b: r[1] || "", to: newId }); KS.bump("fusions", 1);
    } else {
      KS.emit("evolve", { w: nw, from: od.id, to: newId }); KS.bump("evolutions", 1);
    }
    KS.sfx("evolve");
    KS.recalcStats();
    return nw;
  };
  KS.removeWeapon = function (w) {
    var run = KS.run; if (!run || !w || run.weapons[w.slot] !== w) return;
    if (w.def.onRemove) { try { w.def.onRemove(w, run); } catch (err) { KS.reportError("weapon:" + w.id, err); } }
    run.weapons[w.slot] = null;
    KS.recalcStats();
  };
  KS.addGear = function (id) {
    var run = KS.run; if (!run) return null;
    var def = KS.defs.gear[id]; if (!def) { KS.log("core", "addGear: unknown " + id); return null; }
    var slot = run.gear.indexOf(null); if (slot < 0) return null;
    var g = { slot: slot, id: id, def: def, level: 1 };
    run.gear[slot] = g;
    if (def.onAdd) { try { def.onAdd(1, run); } catch (err) { KS.reportError("gear:" + id, err); } }
    KS.emit("gearAdd", { g: g });
    KS.recalcStats();
    return g;
  };
  KS.levelGear = function (g, n) {
    var run = KS.run; if (!run || !g) return;
    var max = g.def.maxLevel || 5, target = Math.min(max, g.level + (n || 1));
    while (g.level < target) {
      g.level++;
      if (g.def.onLevel) { try { g.def.onLevel(g.level, run); } catch (err) { KS.reportError("gear:" + g.id, err); } }
      KS.emit("gearLevel", { g: g, level: g.level });
    }
    KS.recalcStats();
  };
  KS.pressAbility = function () { abilityPressed = true; };
  var abilityPressed = false;

  var TELE_SFX_T = -1;
  KS.telegraph = function (kind, x, y, a, b, c, dur, color) {
    var run = KS.run; if (!run) return null;
    var pool = run.telegraphs, q = pool.alloc();
    if (!q) {
      var best = null, bt = -1;
      for (var i = 0; i < pool.n; i++) { var o = pool.list[i]; if (o.alive && o.t > bt) { bt = o.t; best = o; } }
      if (!best) return null;
      q = reuse(best);
    }
    q.kind = kind; q.x = x; q.y = y; q.a = a || 0; q.b = b || 0; q.c = c || 0; q.dur = dur > 0 ? dur : 0.8; q.color = color || "#c9993b";
    if (run.time - TELE_SFX_T > 0.25 || run.time < TELE_SFX_T) { TELE_SFX_T = run.time; KS.sfx("telegraph"); }
    return q;
  };
  var hooks = []; for (var hk = 0; hk < 12; hk++) hooks.push([]);
  KS.addDrawHook = function (layer, fn) { if (layer >= 0 && layer < 12 && typeof fn === "function") hooks[layer].push(fn); };

  // ---------------------------------------------------------------------------
  // §4.5 Step
  // ---------------------------------------------------------------------------
  var LN14 = Math.log(1.4);
  var TIER_EV = { tier: 0, name: "" }, XP_EV = { amount: 0 }, ABILITY_EV = { id: "" }, REV_EV = { source: "" }, PICK_EV = { type: "", value: 0 }, PHASE_EV = { enemy: null, phase: 0 };
  var INTER_EV = { i: null, defId: "", cost: 0 };
  var curRun = null;

  function stepDifficulty() {
    var run = curRun;
    run._fT += DT * (run.timeScaleForecast > 0 ? run.timeScaleForecast : 1);
    var minutes = run._fT / 60, realMin = run.time / 60;
    var coeff = (1 + 0.055 * minutes) * Math.pow(1.15, run.stagesCleared) * (1 + 0.10 * run.overtime);
    if (!(coeff >= 1)) coeff = 1; if (coeff > 500) coeff = 500;
    run.coeff = coeff;
    run.threatMin = run.stageTime / 60 + 4 * run.stagesCleared + 1.5 * run.overtime;
    run.hpMul = coeff;
    run.dmgMul = Math.min(60, 0.6 + 0.4 * coeff);
    run.spdMul = Math.min(1.35, 1 + 0.01 * realMin) * (run._cRush ? 1.3 : 1);
    run.spawnMul = Math.sqrt(coeff);
    var tier = Math.floor(Math.log(coeff) / LN14); if (tier < 0) tier = 0; if (tier > 17) tier = 17;
    if (tier > run.tier) {
      run.tier = tier; if (tier > run.maxTier) run.maxTier = tier;
      TIER_EV.tier = tier; TIER_EV.name = TEXT.tiers[tier];
      KS.emit("tierUp", TIER_EV); KS.sfx("radio");
    } else run.tier = tier;
    var dark = !!run.flags["maps.dark"], late = run.stageTime >= 480;
    if (dark !== run._dark || late !== run._late) { run._dark = dark; run._late = late; KS.recalcStats(); }
  }

  var keys = {};
  function readInput() {
    var inp = KS.input, mx = 0, my = 0;
    if (KS.G.mode === "play" && !uiOpen()) {
      var ts = inp.touchStick;
      if (ts.active) {
        var dx = ts.x - ts.ox, dy = ts.y - ts.oy, l = Math.sqrt(dx * dx + dy * dy);
        if (l > 10) { var m = Math.min(1, l / 60); mx = dx / l * m; my = dy / l * m; }
      } else if (KS.pad.connected && (Math.abs(KS.pad.axes[0]) > 0.2 || Math.abs(KS.pad.axes[1]) > 0.2)) {
        mx = KS.pad.axes[0]; my = KS.pad.axes[1];
        var pl = Math.sqrt(mx * mx + my * my); if (pl > 1) { mx /= pl; my /= pl; }
      } else {
        mx = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
        my = ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0);
        var p = KS.pad.pressed;
        if (KS.pad.connected) { mx += (p.right ? 1 : 0) - (p.left ? 1 : 0); my += (p.down ? 1 : 0) - (p.up ? 1 : 0); }
        var kl = Math.sqrt(mx * mx + my * my); if (kl > 1) { mx /= kl; my /= kl; }
      }
      inp.ability = !!(keys.Space || keys.ShiftLeft || keys.ShiftRight || (KS.pad.connected && KS.pad.pressed.a));
    } else inp.ability = false;
    inp.mx = mx; inp.my = my; inp.moving = mx !== 0 || my !== 0;
  }
  function uiOpen() { try { return !!KS.ui.isOpen(); } catch (e) { return false; } }

  function stepPlayer() {
    var run = curRun, p = run.player, S = run.stats, inp = KS.input, b = run.bounds;
    var slow = p.slowAcc < 0.5 ? 0.5 : p.slowAcc, ice = p.onIce && !S.iceImmune;
    p.slowAcc = 1; p.onIce = false;
    var spd = S.speed * slow, tx = inp.mx * spd, ty = inp.my * spd;
    if (ice) { p.vx += (tx - p.vx) * 0.04; p.vy += (ty - p.vy) * 0.04; } else { p.vx = tx; p.vy = ty; }
    var ox = p.x, oy = p.y;
    p.x += p.vx * DT; p.y += p.vy * DT;
    if (p.dashT > 0) {
      p.x += p.dashVX * DT; p.y += p.dashVY * DT; p.dashT -= DT;
      if (p.dashT <= 0) { p.dashT = 0; p.dashInvuln = false; }
    }
    KS.pushOutObstacles(p);
    if (p.x < b.x0 + p.r) p.x = b.x0 + p.r; if (p.x > b.x1 - p.r) p.x = b.x1 - p.r;
    if (p.y < b.y0 + p.r) p.y = b.y0 + p.r; if (p.y > b.y1 - p.r) p.y = b.y1 - p.r;
    var mdx = p.x - ox, mdy = p.y - oy;
    p.odo += Math.sqrt(mdx * mdx + mdy * mdy);
    p.moving = inp.mx !== 0 || inp.my !== 0;
    if (p.moving) { var l = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my); p.faceX = inp.mx / l; p.faceY = inp.my / l; p.stillT = 0; }
    else p.stillT += DT;
    p.aimX = p.faceX; p.aimY = p.faceY; p.rot = Math.atan2(p.faceY, p.faceX);
  }
  function stepGrid() { gridRebuild(curRun); }
  function stepTick() { KS.emit("tick", curRun); }
  function stepWeapons() {
    var run = curRun;
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i]; if (!w) continue;
      try { w.def.update(w, DT, run); } catch (err) { KS.reportError("weapon:" + w.id, err); }
    }
  }
  function stepItems() { KS.items.tick(DT, curRun); }
  function stepAbility() {
    var run = curRun, p = run.player;
    if (p.abilityCd > 0) { p.abilityCd -= DT; if (p.abilityCd <= 0) { p.abilityCd = 0; KS.sfx("abilityReady"); } }
    var want = abilityPressed || KS.input.ability;
    abilityPressed = false;
    if (!want) return;
    var id = run.opDef && run.opDef.ability, ab = id ? KS.abilities[id] : null;
    if (!ab || p.abilityCd > 0 || (ab.perStage && run._abStage === run.stageIndex)) return;
    var ok = ab.fire(run);
    if (ok === false) return;
    p.abilityCd = p.abilityMax > 0 ? p.abilityMax : ab.cd;
    if (ab.perStage) run._abStage = run.stageIndex;
    ABILITY_EV.id = id; KS.emit("ability", ABILITY_EV); KS.sfx("ability");
  }
  function stepDirector() { KS.director.update(DT, curRun); }

  var SEP = new Array(8);
  function stepEnemies() {
    var run = curRun, pool = run.enemies, list = pool.list, p = run.player, half = run.stepN & 1, b = run.bounds;
    var pr = p.r, step = run.stepN;
    for (var i = 0; i < pool.n; i++) {
      var e = list[i]; if (!e.alive) continue;
      e.t += DT;
      statusTick(e);
      if (!e.alive) continue;
      if (e.flash > 0) e.flash -= DT;
      if (e.contactCd > 0) e.contactCd -= DT;
      if (e.dmgTextT > 0) e.dmgTextT -= DT;
      var def = e.def, st = e.st, sm = 1;
      if (def._untarg) e.untargetable = def._untarg.indexOf(e.state) >= 0;
      if (e.isBoss && def.phases) {
        if (e._staggerT > 0) {
          e._staggerT -= DT; sm = 0;
          if (e._staggerT <= 0 && e._phasePending >= 0) {
            var ph = e._phasePending; e._phasePending = -1;
            if (def.onPhase) { try { def.onPhase(e, ph, run); } catch (err0) { KS.reportError("boss:" + e.defId, err0); } }
          }
        } else {
          var nx = def.phases[e.phase + 1];
          if (nx !== undefined && e.hp <= e.maxHp * nx) {
            e.phase++; e._phasePending = e.phase; e._staggerT = 1; e.flash = 0.3; sm = 0;
            PHASE_EV.enemy = e; PHASE_EV.phase = e.phase; KS.emit("bossPhase", PHASE_EV); KS.sfx("bossPhase");
          }
        }
      }
      if (st.freeze > 0 || st.stun > 0) sm = 0;
      if (sm > 0) {
        try { def.update(e, DT, run); } catch (err) { KS.reportError("enemy:" + e.defId, err); }
        if (!e.alive) continue;
        if (e.affix0) affixUpdate(e, e.affix0, run);
        if (e.affix1) affixUpdate(e, e.affix1, run);
        if (!e.alive) continue;
        if (st.chill > 0) sm *= 0.7;
        if (st.slow > 0) sm *= st.slowMul;
      }
      if (!e.stationary) {
        var vx = sm > 0 ? e.vx * sm : 0, vy = sm > 0 ? e.vy * sm : 0;
        e.x += (vx + e.kbx) * DT; e.y += (vy + e.kby) * DT;
        e.kbx *= 0.85; e.kby *= 0.85;
        if (e.kbx < 0.5 && e.kbx > -0.5) e.kbx = 0; if (e.kby < 0.5 && e.kby > -0.5) e.kby = 0;
        if (!e.flying) KS.pushOutObstacles(e);
        if (e.x < b.x0 + e.r) e.x = b.x0 + e.r; else if (e.x > b.x1 - e.r) e.x = b.x1 - e.r;
        if (e.y < b.y0 + e.r) e.y = b.y0 + e.r; else if (e.y > b.y1 - e.r) e.y = b.y1 - e.r;
        if ((i & 1) === half && e.mass < Infinity) separate(e);
      }
      if (!e.noContact && p.alive && e.contactCd <= 0 && p.contactImmuneStep !== step) {
        var dx = e.x - p.x, dy = e.y - p.y, rr = e.r + pr;
        if (dx * dx + dy * dy < rr * rr) { KS.hurtPlayer(e.dmg, e.isBoss ? "boss" : "contact", e.x, e.y); e.contactCd = 0.5; }
      }
    }
  }
  function separate(e) {
    var n = gridQuery(e.x, e.y, e.r, SEP, 7, true), checked = 0;
    for (var k = 0; k < n && checked < 6; k++) {
      var o = SEP[k]; if (o === e) continue;
      checked++;
      if (o.flying !== e.flying) continue;
      var dx = e.x - o.x, dy = e.y - o.y, rr = e.r + o.r, d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 < 1e-6) continue;
      var d = Math.sqrt(d2), push = (rr - d) * 0.5, ux = dx / d, uy = dy / d;
      if (o.mass === Infinity || o.stationary) { e.x += ux * push * 2; e.y += uy * push * 2; }
      else { e.x += ux * push; e.y += uy * push; o.x -= ux * push; o.y -= uy * push; }
    }
  }
  function affixUpdate(e, id, run) {
    var a = KS.defs.affixes[id]; if (!a || !a.update) return;
    try { a.update(e, DT, run); } catch (err) { KS.reportError("affix:" + id, err); }
  }

  var PC = new Array(64), BQ = new Array(64), PSRC = KS.makeSrc();
  function projHitBefore(p, uid) { var n = p.hitN < 16 ? p.hitN : 16, h = p.hitUids; for (var j = 0; j < n; j++) if (h[j] === uid) return true; return false; }
  function projRecord(p, uid) { p.hitUids[p.hitN & 15] = uid; p.hitN++; }
  function retarget(p, from) {
    var n = gridQuery(from.x, from.y, p.bounceRange, BQ, 64, false), best = null, bd = 1e18;
    for (var k = 0; k < n; k++) {
      var e = BQ[k]; if (e === from || !e.alive || projHitBefore(p, e.uid)) continue;
      var dx = e.x - from.x, dy = e.y - from.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) return false;
    var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 300, dx2 = best.x - p.x, dy2 = best.y - p.y, l = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
    p.vx = dx2 / l * spd; p.vy = dy2 / l * spd; p.ang = Math.atan2(p.vy, p.vx);
    p.bounces--; p.bounceIndex++;
    p.dmg = p.baseDmg * KS.items.bounceMul(p.bounceIndex);
    return true;
  }
  function stepProjectiles() {
    var run = curRun, pool = run.projectiles, list = pool.list, b = run.bounds;
    for (var i = 0; i < pool.n; i++) {
      var p = list[i]; if (!p.alive) continue;
      var d = p.def, skip = false;
      if (d.projUpdate) { try { skip = d.projUpdate(p, DT, run) === true; } catch (err) { KS.reportError("weapon:" + (d.id || "?"), err); } }
      if (!p.alive) continue;
      if (!skip) {
        if (p.homing > 0) homing(p, run);
        p.x += p.vx * DT; p.y += p.vy * DT;
      }
      p.t += DT; p.life -= DT;
      if (p.life <= 0 || p.x < b.x0 - 200 || p.x > b.x1 + 200 || p.y < b.y0 - 200 || p.y > b.y1 + 200) { p.alive = false; continue; }
      if (p.noCollide) continue;
      var n = gridQuery(p.x, p.y, p.r, PC, 64, false);
      for (var k = 0; k < n; k++) {
        var e = PC[k];
        if (!e.alive || projHitBefore(p, e.uid)) continue;
        var fb = e.def.frontBlock;
        if (fb && p.blockable) {
          var ang = Math.atan2(p.y - e.y, p.x - e.x) - e.face;
          while (ang > Math.PI) ang -= TAU; while (ang < -Math.PI) ang += TAU;
          if (Math.abs(ang) <= (fb.arc || 1.5) * 0.5) { p.alive = false; KS.sfx("tink"); KS.fx("sparks", p.x, p.y, "#efe2c4", 4, 2); break; }
        }
        var def2 = p.def, dflt = true;
        if (def2.projHit) { try { dflt = def2.projHit(p, e, run) !== false; } catch (err2) { KS.reportError("weapon:" + (def2.id || "?"), err2); } }
        projRecord(p, e.uid);
        if (!p.alive) break;
        if (!dflt) continue;
        if (p.baseDmg <= 0) p.baseDmg = p.dmg;
        PSRC.team = "player"; PSRC.slot = p.slot; PSRC.weaponId = p.weaponId; PSRC.itemId = p.itemId; PSRC.tag = p.tag; PSRC.procCoef = p.procCoef;
        PSRC.depth = p.depth; PSRC.canCrit = p.canCrit; PSRC.kb = p.kb; PSRC.kbx = p.vx; PSRC.kby = p.vy; PSRC.isDot = false; PSRC.x = p.x; PSRC.y = p.y;
        PSRC.noProc = false; PSRC.noOnKill = p.noOnKill; PSRC.chainLeft = 0; PSRC.restarts = 0; PSRC.bounceIndex = p.bounceIndex;
        KS.damage(e, p.dmg, PSRC);
        if (!p.alive) break;
        if (p.bounces > 0 && retarget(p, e)) break;
        if (p.pierce < 0) continue;
        if (p.pierce === 0) { p.alive = false; break; }
        p.pierce--;
      }
    }
  }
  function homing(p, run) {
    if (((p.uid + run.stepN) & 3) === 0) {
      var t = KS.nearestEnemy(p.x, p.y, 420);
      if (t) { p._tx = t.x; p._ty = t.y; p._tOk = true; } else p._tOk = false;
    }
    if (!p._tOk) return;
    var want = Math.atan2(p._ty - p.y, p._tx - p.x), cur = Math.atan2(p.vy, p.vx), diff = want - cur;
    while (diff > Math.PI) diff -= TAU; while (diff < -Math.PI) diff += TAU;
    var mx = p.homing * DT; if (diff > mx) diff = mx; else if (diff < -mx) diff = -mx;
    var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy), a = cur + diff;
    p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd; p.ang = a;
  }
  function stepEProj() {
    var run = curRun, pool = run.eprojectiles, list = pool.list, b = run.bounds, pl = run.player;
    for (var i = 0; i < pool.n; i++) {
      var q = list[i]; if (!q.alive) continue;
      var s = q._sdef, skip = false;
      if (s && s.update) { try { skip = s.update(q, DT, run) === true; } catch (err) { KS.reportError("eproj:" + q.style, err); } }
      if (!q.alive) continue;
      if (!skip) { q.x += q.vx * DT; q.y += q.vy * DT; }
      q.t += DT; q.life -= DT;
      if (q.life <= 0 || q.x < b.x0 - 100 || q.x > b.x1 + 100 || q.y < b.y0 - 100 || q.y > b.y1 + 100) { q.alive = false; continue; }
      if (q.r <= 0 || !pl.alive) continue;
      var dx = q.x - pl.x, dy = q.y - pl.y, rr = q.r + pl.r;
      if (dx * dx + dy * dy < rr * rr) { KS.hurtPlayer(q.dmg, "proj", q.x, q.y); q.alive = false; }
    }
  }
  function hazardHits(h, x, y, r) {
    if (h.w > 0 && h.h > 0) {
      var dx = x - h.x, dy = y - h.y, c = Math.cos(-h.ang), s = Math.sin(-h.ang);
      var lx = dx * c - dy * s, ly = dx * s + dy * c;
      return Math.abs(lx) <= h.w * 0.5 + r && Math.abs(ly) <= h.h * 0.5 + r;
    }
    var ddx = x - h.x, ddy = y - h.y, rr = h.r + r;
    return ddx * ddx + ddy * ddy <= rr * rr;
  }
  KS.hazardHits = hazardHits;
  var HZ = new Array(256);
  function stepHazards() {
    var run = curRun, pool = run.hazards, list = pool.list, p = run.player;
    for (var i = 0; i < pool.n; i++) {
      var h = list[i]; if (!h.alive) continue;
      var def = h.def;
      h.t += DT; h.life -= DT; if (h.tele > 0) h.tele -= DT;
      if (def.update) { try { def.update(h, DT, run); } catch (err) { KS.reportError("hazard:" + h.defId, err); } }
      if (!h.alive) continue;
      if (h.life <= 0) { h.alive = false; continue; }
      if (h.tele > 0) continue;
      var inP = h.team !== "player" && p.alive && hazardHits(h, p.x, p.y, p.r);
      if (inP) {
        if (h.slowMul < 1) KS.playerSlow(h.slowMul, !!def.terrain);
        if (def.onPlayer) { try { def.onPlayer(h, run); } catch (err2) { KS.reportError("hazard:" + h.defId, err2); } }
      }
      if (!def.autoDamage) continue;
      h.tickT -= DT;
      if (h.tickT > 0) continue;
      h.tickT += h.tick > 0 ? h.tick : 0.5;
      if (inP && h.dmg > 0) KS.hurtPlayer(h.dmg, "hazard", h.x, h.y);
      if (h.team !== "enemy" && h.src) {
        var R = h.w > 0 && h.h > 0 ? Math.sqrt(h.w * h.w + h.h * h.h) * 0.5 : h.r;
        var n = gridQuery(h.x, h.y, R, HZ, 256, false);
        for (var k = 0; k < n; k++) {
          var e = HZ[k]; if (!e.alive || !hazardHits(h, e.x, e.y, e.r)) continue;
          if (h.dmg > 0) KS.damage(e, h.dmg, h.src);
          if (def.onEnemy) { try { def.onEnemy(h, e, run); } catch (err3) { KS.reportError("hazard:" + h.defId, err3); } }
        }
      }
    }
  }

  function interPrice(it, run) {
    var def = it.def, base = def.costFn ? def.costFn(it, run) : (it.cost != null ? it.cost : def.baseCost);
    return KS.price(base, def.costKind || "tinsel");
  }
  function canAfford(it, cost, run) {
    var k = it.def.costKind || "tinsel";
    if (k === "free") return true;
    if (k === "hp") return run.player.hp > cost;
    return run.freeOpens > 0 || run.tinsel >= cost;
  }
  function openInteractable(it, cost, run) {
    var k = it.def.costKind || "tinsel";
    if (k === "tinsel") { if (!KS.spendTinsel(cost)) return false; }
    else if (k === "hp") { run.player.hp = Math.max(1, run.player.hp - cost); }
    it.uses++; it.standT = 0; it._denied = false;
    INTER_EV.i = it; INTER_EV.defId = it.defId; INTER_EV.cost = cost;
    KS.emit("interact", INTER_EV);
    try { it.def.onOpen(it, run); } catch (err) { KS.reportError("interact:" + it.defId, err); }
    KS.sfx("chestOpen");
    var u = it.def.uses == null ? 1 : it.def.uses;
    if (it.state === "idle" && it.uses >= u) it.state = "spent";
    return true;
  }
  function stepInteract() {
    var run = curRun, arr = run.interactables, p = run.player, dead = false;
    for (var i = 0; i < arr.length; i++) {
      var it = arr[i];
      if (!it.alive) { dead = true; continue; }
      if (it.state === "spent" || it.state === "disabled") { if (run.pendingConfirm === it) run.pendingConfirm = null; continue; }
      var def = it.def, rr = it.r + 16, dx = it.x - p.x, dy = it.y - p.y;
      if (dx * dx + dy * dy > rr * rr) {
        if (it._in) { it._in = false; it.standT = 0; it._denied = false; if (run.pendingConfirm === it) run.pendingConfirm = null; }
        continue;
      }
      it._in = true;
      if (run.pendingConfirm === it) continue;
      var need = def.confirm ? 1.5 : (def.standTime != null ? def.standTime : 0.5);
      it.standT += DT;
      if (it.standT < need) continue;
      it.standT = need;
      if (def.canOpen) { var okc = true; try { okc = def.canOpen(it, run); } catch (err) { KS.reportError("interact:" + it.defId, err); okc = false; } if (!okc) continue; }
      var cost = interPrice(it, run);
      if (!canAfford(it, cost, run)) { if (!it._denied) { it._denied = true; KS.sfx("denied"); } continue; }
      if (def.confirm) { run.pendingConfirm = it; continue; }
      openInteractable(it, cost, run);
    }
    if (dead) { for (var j = arr.length - 1; j >= 0; j--) if (!arr[j].alive) arr.splice(j, 1); }
  }
  KS.confirmInteract = function () {
    var run = KS.run; if (!run) return false;
    var it = run.pendingConfirm; if (!it || !it.alive) { run.pendingConfirm = null; return false; }
    var cost = interPrice(it, run);
    if (!canAfford(it, cost, run)) { KS.sfx("denied"); return false; }
    run.pendingConfirm = null;
    return openInteractable(it, cost, run);
  };
  function stepMap() { curRun.mapDef.update(DT, curRun); }
  function collect(k, run) {
    k.alive = false;
    var t = k.type, v = k.value;
    if (t === "xp") { KS.addXP(v); KS.sfx("gem"); }
    else if (t === "heal") { KS.healPlayer(v, "pickup"); KS.sfx("heal"); }
    else if (t === "magnet") { KS.magnetAll(1e5, 1.5); }
    else if (t === "tinsel") { KS.addTinsel(v); KS.sfx("tinsel"); }
    else if (t === "supplycrate" || t === "goldbox") { try { KS.loot.openCrate(t, run); } catch (err) { KS.reportError("loot", err); } }
    PICK_EV.type = t; PICK_EV.value = v;
    KS.emit("pickup", PICK_EV);
  }
  function stepPickups() {
    var run = curRun, pool = run.pickups, list = pool.list, p = run.player, S = run.stats, b = run.bounds;
    var rad = S.magnet * (run._cFrozen ? 0.5 : 1), r2 = rad * rad, mr2 = -1;
    if (p.magnetT > 0) { p.magnetT -= DT; mr2 = p.magnetR * p.magnetR; }
    var cr = p.r + 10, cr2 = cr * cr;
    for (var i = 0; i < pool.n; i++) {
      var k = list[i]; if (!k.alive) continue;
      k.t += DT;
      var dx = p.x - k.x, dy = p.y - k.y, d2 = dx * dx + dy * dy;
      if (!k.mag && (d2 < r2 || d2 < mr2)) k.mag = true;
      if (k.mag && p.alive) {
        var d = Math.sqrt(d2) || 1, spd = (mr2 > 0 ? 900 : 420);
        var stp = spd * DT;
        if (stp >= d) { k.x = p.x; k.y = p.y; } else { k.x += dx / d * stp; k.y += dy / d * stp; }
        d2 = (p.x - k.x) * (p.x - k.x) + (p.y - k.y) * (p.y - k.y);
      } else if (run._cWindy) {
        k.x += run._windX * 20 * DT; k.y += run._windY * 20 * DT;
        if (k.x < b.x0 + 10) k.x = b.x0 + 10; else if (k.x > b.x1 - 10) k.x = b.x1 - 10;
        if (k.y < b.y0 + 10) k.y = b.y0 + 10; else if (k.y > b.y1 - 10) k.y = b.y1 - 10;
      }
      if (d2 < cr2 && p.alive) collect(k, run);
    }
  }
  function stepProcs() { KS.procs.flush(KS.device.caps.procs); }
  function stepFx() {
    var run = curRun, pool = run.particles, list = pool.list, i;
    for (i = 0; i < pool.n; i++) {
      var q = list[i]; if (!q.alive) continue;
      q.life -= DT; if (q.life <= 0) { q.alive = false; continue; }
      q.vy += q.grav * DT; q.x += q.vx * DT; q.y += q.vy * DT; q.vx *= 0.97; q.vy *= 0.97;
    }
    var tp = run.texts, tl = tp.list;
    for (i = 0; i < tp.n; i++) { var t = tl[i]; if (!t.alive) continue; t.t += DT; t.life -= DT; t.y -= 32 * DT; if (t.life <= 0) t.alive = false; }
    var gp = run.telegraphs, gl = gp.list;
    for (i = 0; i < gp.n; i++) { var g = gl[i]; if (!g.alive) continue; g.t += DT; if (g.t >= g.dur) g.alive = false; }
  }
  function stepCompact() {
    var run = curRun;
    run.enemies.compact(); run.projectiles.compact(); run.eprojectiles.compact(); run.pickups.compact(); run.hazards.compact();
    run.particles.compact(); run.texts.compact(); run.telegraphs.compact();
  }
  function stepVitals() {
    var run = curRun, p = run.player, S = run.stats, i;
    if (S.regen > 0 && p.hp > 0 && p.hp < p.maxHp) { p.hp += S.regen * DT; if (p.hp > p.maxHp) p.hp = p.maxHp; }
    if (p.barrierHoldT > 0) p.barrierHoldT -= DT;
    else if (p.barrier > 0) { p.barrier -= 0.02 * p.maxHp * DT; if (p.barrier < 0) p.barrier = 0; }
    if (p.iframes > 0) p.iframes -= DT;
    if (p.hurtFlash > 0) p.hurtFlash -= DT;
    if (p.bubbleT > 0) p.bubbleT -= DT;
    var ids = run._buffIds, changed = false;
    for (i = ids.length - 1; i >= 0; i--) {
      var id = ids[i], left = run.buffs[id];
      if (left === Infinity) continue;
      left -= DT;
      if (left <= 0) {
        delete run.buffs[id]; ids.splice(i, 1);
        var bd = KS.defs.buffs[id]; if (bd && bd.stats) changed = true;
      } else run.buffs[id] = left;
    }
    if (changed) KS.recalcStats();
    if (KS._god) { p.hp = p.maxHp; }
    if (p.hp <= 0 && p.alive) {
      if (KS.revivesLeft() > 0) {
        p.revivesUsed++; p.hp = p.maxHp * 0.5; p.iframes = 2;
        REV_EV.source = "revive"; KS.emit("revive", REV_EV); KS.sfx("revive"); KS.fx("ring", p.x, p.y, "#c9993b", 1, 120);
      } else {
        var saved = false;
        try { saved = KS.items.onLethal(run) === true; } catch (err) { KS.reportError("items", err); }
        if (saved) { if (p.hp <= 0) p.hp = 1; REV_EV.source = "item"; KS.emit("revive", REV_EV); KS.sfx("revive"); }
        else { p.alive = false; p.hp = 0; KS.endRun("dead"); }
      }
    }
    run.counters.noHitT += DT;
  }
  function stepMeta() { if (curRun.stepN % 60 === 0) KS.meta.tick(curRun); }
  function stepEnd() {
    var run = curRun;
    if (xpStep > 0) { XP_EV.amount = xpStep; xpStep = 0; KS.emit("xp", XP_EV); }
    if (run.pendingLevels > 0 && !ovCur && !run.ended) openLevels(run);
  }
  function guard(fn, mod) { try { fn(); } catch (err) { KS.reportError(mod, err); } }

  KS.step = function () {
    var run = KS.run; if (!run || run.ended) return;
    var t0 = perfNow();
    curRun = run;
    run.time += DT; run.stageTime += DT; run.stepN++;
    itemProjN = 0; onKillPushes = 0; xpStep = 0;
    guard(stepDifficulty, "core");
    guard(stepPlayer, "core");
    guard(stepGrid, "core");
    guard(stepTick, "core");
    guard(stepWeapons, "weapons");
    if (run.ended || KS.run !== run) return;
    guard(stepItems, "items");
    guard(stepAbility, "abilities");
    guard(stepDirector, "director");
    guard(stepEnemies, "enemies");
    guard(stepProjectiles, "projectiles");
    guard(stepEProj, "eprojectiles");
    guard(stepHazards, "hazards");
    guard(stepInteract, "interactables");
    if (run.ended || KS.run !== run) return;
    guard(stepMap, "maps");
    if (run.ended || KS.run !== run) return;
    guard(stepPickups, "pickups");
    guard(stepProcs, "procs");
    guard(stepFx, "core");
    guard(stepCompact, "core");
    guard(stepVitals, "core");
    if (run.ended || KS.run !== run) return;
    guard(stepMeta, "meta");
    guard(stepEnd, "core");
    var ms = perfNow() - t0;
    if (ms > run.perf.stepMsMax) run.perf.stepMsMax = ms;
    KS.perfStats.stepMs = ms;
  };

  // ---------------------------------------------------------------------------
  // §4.6 Render
  // ---------------------------------------------------------------------------
  var canvas = null, ctx = null, hatch = null;
  KS.resize = function () {
    if (!canvas || typeof window === "undefined") return;
    var cw = window.innerWidth || 960, ch = window.innerHeight || 540;
    var dpr = Math.min(window.devicePixelRatio || 1, KS.device.caps.dpr);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    var c = KS.cam;
    c.sw = canvas.width; c.sh = canvas.height; c.dpr = dpr;
    c.zoom = Math.max(0.55, Math.min(1, Math.min(cw, ch) / 700));
    c.w = cw / c.zoom; c.h = ch / c.zoom;
    KS.viewCss = { w: cw, h: ch };
  };
  /** Extra (test): fixed world view size for headless sims. */
  KS.setView = function (w, h) { var c = KS.cam; c.zoom = 1; c.w = w; c.h = h; };
  function updateCamera(run, rdt) {
    var c = KS.cam, p = run.player, b = run.bounds;
    var tx = p.x, ty = p.y;
    if (b.x1 - b.x0 > c.w) tx = Math.max(b.x0 + c.w / 2, Math.min(b.x1 - c.w / 2, tx)); else tx = (b.x0 + b.x1) / 2;
    if (b.y1 - b.y0 > c.h) ty = Math.max(b.y0 + c.h / 2, Math.min(b.y1 - c.h / 2, ty)); else ty = (b.y0 + b.y1) / 2;
    var k = Math.min(1, rdt * 12);
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
    if (Math.abs(tx - c.x) > c.w) { c.x = tx; c.y = ty; }
    if (c.shake > 0.1) { c.sx = (KS.frand() - 0.5) * 2 * c.shake; c.sy = (KS.frand() - 0.5) * 2 * c.shake; c.shake *= 0.88; }
    else { c.shake = 0; c.sx = 0; c.sy = 0; }
  }
  function makeHatch() {
    var h = mkCanvas(10, 10), g = h.getContext("2d");
    g.fillStyle = "rgba(201,153,59,0.35)"; g.fillRect(0, 0, 10, 10);
    g.strokeStyle = "rgba(42,31,26,0.55)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke();
    return ctx.createPattern(h, "repeat");
  }
  function runHooks(L, run) { var a = hooks[L]; for (var i = 0; i < a.length; i++) a[i](ctx, KS.cam, run); }
  function layer(L, run, t) {
    ctx.save();
    try { LAYERS[L](run, t); runHooks(L, run); } catch (err) { KS.reportError("render:" + L, err); }
    ctx.restore();
  }
  var GEM_COL = ["#7fbf4f", "#3c8fd6", "#c9993b", "#b3261e"];
  var LAYERS = [
    function (run) { run.mapDef.drawGround(ctx, KS.cam, run); },
    function (run, t) {
      var l = run.hazards.list, n = run.hazards.n;
      for (var i = 0; i < n; i++) { var h = l[i]; if (!h.alive || !KS.onScreen(h.x, h.y, h.r + h.w + h.h)) continue; h.def.draw(ctx, h, t); }
    },
    function (run, t) {
      var l = run.pickups.list, n = run.pickups.n;
      for (var i = 0; i < n; i++) {
        var k = l[i]; if (!k.alive || !KS.onScreen(k.x, k.y, 14)) continue;
        if (k.type === "xp") {
          var ci = k.value < 3 ? 0 : (k.value < 12 ? 1 : (k.value < 40 ? 2 : 3)), s = ci === 0 ? 4 : 5 + ci;
          ctx.fillStyle = GEM_COL[ci];
          ctx.beginPath(); ctx.moveTo(k.x, k.y - s); ctx.lineTo(k.x + s * 0.7, k.y); ctx.lineTo(k.x, k.y + s); ctx.lineTo(k.x - s * 0.7, k.y); ctx.closePath(); ctx.fill();
        } else if (k.type === "heal") {
          ctx.fillStyle = "#efe2c4"; ctx.fillRect(k.x - 8, k.y - 8, 16, 16); ctx.fillStyle = "#b3261e"; ctx.fillRect(k.x - 2, k.y - 6, 4, 12); ctx.fillRect(k.x - 6, k.y - 2, 12, 4);
        } else if (k.type === "magnet") {
          ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(k.x, k.y, 7, Math.PI, 0); ctx.stroke();
        } else if (k.type === "tinsel") {
          ctx.fillStyle = "#e7c55b"; ctx.beginPath(); ctx.arc(k.x, k.y, 5, 0, TAU); ctx.fill();
        } else {
          var gold = k.type === "goldbox", bob = Math.sin(t * 4 + k.uid) * 2;
          ctx.fillStyle = gold ? "#c9993b" : "#8a5a2b"; ctx.fillRect(k.x - 12, k.y - 10 + bob, 24, 20);
          ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2; ctx.strokeRect(k.x - 12, k.y - 10 + bob, 24, 20);
          ctx.fillStyle = gold ? "#f6e27a" : "#efe2c4"; ctx.fillRect(k.x - 2, k.y - 10 + bob, 4, 20);
        }
      }
    },
    function (run, t) {
      var a = run.interactables;
      for (var i = 0; i < a.length; i++) {
        var it = a[i]; if (!it.alive || !KS.onScreen(it.x, it.y, it.r + 40)) continue;
        it.def.draw(ctx, it, t);
        if (it.standT > 0 && it.state === "idle") {
          var need = it.def.confirm ? 1.5 : (it.def.standTime != null ? it.def.standTime : 0.5);
          ctx.strokeStyle = it._denied ? "#8b8378" : "#c9993b"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, it.standT / need)); ctx.stroke();
        }
      }
    },
    function (run, t) {
      var l = run.enemies.list, n = run.enemies.n, i, e;
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.beginPath();
      for (i = 0; i < n; i++) { e = l[i]; if (!e.alive || e.flying || !KS.onScreen(e.x, e.y, e.r)) continue; ctx.moveTo(e.x + e.r, e.y + e.r * 0.7); ctx.ellipse(e.x, e.y + e.r * 0.7, e.r, e.r * 0.4, 0, 0, TAU); }
      ctx.fill();
      for (i = 0; i < n; i++) {
        e = l[i]; if (!e.alive || !KS.onScreen(e.x, e.y, e.r + 20)) continue;
        e.def.draw(ctx, e, t);
        var st = e.st;
        if (st.freeze > 0) { ctx.fillStyle = "rgba(150,210,255,0.45)"; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); }
        else if (st.stun > 0) { ctx.fillStyle = "#f6d24a"; for (var s = 0; s < 3; s++) { var a = t * 5 + s * 2.1; ctx.fillRect(e.x + Math.cos(a) * e.r - 2, e.y - e.r - 6 + Math.sin(a) * 3, 4, 4); } }
        if (e.elite) { ctx.strokeStyle = "#c9993b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke(); if (e._plate) ctx.drawImage(e._plate, e.x - e._plate.width / 2, e.y - e.r - 12 - e._plate.height); }
      }
    },
    function (run) {
      ctx.globalAlpha = 0.85;
      for (var w = 0; w < 6; w++) { var wp = run.weapons[w]; if (wp && wp.def.draw) wp.def.draw(ctx, wp, run); }
      var l = run.projectiles.list, n = run.projectiles.n;
      for (var i = 0; i < n; i++) {
        var p = l[i]; if (!p.alive || !KS.onScreen(p.x, p.y, p.r + 30)) continue;
        if (p.def.projDraw) p.def.projDraw(ctx, p, run);
        else { ctx.fillStyle = p.color || "#efe2c4"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
      }
    },
    function (run, t) { var p = run.player; if (p.alive || run.ended) KS.meta.drawMachine(ctx, p, t); },
    function (run, t) {
      var l = run.eprojectiles.list, n = run.eprojectiles.n, i;
      for (i = 0; i < n; i++) {
        var q = l[i]; if (!q.alive || !KS.onScreen(q.x, q.y, q.r + 20)) continue;
        if (q._sdef) q._sdef.draw(ctx, q, t);
        else { ctx.fillStyle = q.color || "#7a2a1e"; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(2, q.r), 0, TAU); ctx.fill(); }
      }
      if (!hatch) hatch = makeHatch();
      var g = run.telegraphs, gl = g.list;
      for (i = 0; i < g.n; i++) { var tg = gl[i]; if (tg.alive) drawTele(tg); }
      var hl = run.hazards.list, hn = run.hazards.n;
      for (i = 0; i < hn; i++) { var h = hl[i]; if (h.alive && h.tele > 0 && h.def.drawTele) h.def.drawTele(ctx, h, t); }
    },
    function (run) {
      var l = run.particles.list, n = run.particles.n;
      for (var i = 0; i < n; i++) {
        var q = l[i]; if (!q.alive) continue;
        var f = q.life / q.max; ctx.globalAlpha = f < 0 ? 0 : f;
        if (q.kind === 2) { ctx.strokeStyle = q.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, q.size * (1 - f) + 4), 0, TAU); ctx.stroke(); }
        else if (q.kind === 3) { ctx.strokeStyle = q.color; ctx.lineWidth = q.size * 0.7; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); ctx.stroke(); }
        else { ctx.fillStyle = q.color; if (q.kind === 0) { ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); } else ctx.fillRect(q.x - q.size, q.y - q.size * (q.kind === 4 ? 0.5 : 1), q.size * 2, q.size * (q.kind === 4 ? 1 : 2)); }
      }
      ctx.globalAlpha = 1;
    },
    function (run) { var md = run.mapDef; if (md.drawOverhead) md.drawOverhead(ctx, KS.cam, run); }
  ];
  function drawTele(g) {
    var f = Math.min(1, g.t / g.dur);
    ctx.beginPath();
    if (g.kind === "circle") ctx.arc(g.x, g.y, g.a, 0, TAU);
    else if (g.kind === "ring") { ctx.arc(g.x, g.y, g.b, 0, TAU); ctx.moveTo(g.x + g.a, g.y); ctx.arc(g.x, g.y, g.a, 0, TAU, true); }
    else if (g.kind === "line") { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.a); ctx.rect(0, -g.c / 2, g.b, g.c); ctx.restore(); }
    else if (g.kind === "sector") { ctx.moveTo(g.x, g.y); ctx.arc(g.x, g.y, g.b, g.a - g.c / 2, g.a + g.c / 2); ctx.closePath(); }
    else if (g.kind === "rect") { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.c); ctx.rect(-g.a / 2, -g.b / 2, g.a, g.b); ctx.restore(); }
    ctx.globalAlpha = 0.5 + 0.4 * f; ctx.fillStyle = hatch; ctx.fill("evenodd");
    ctx.globalAlpha = 1; ctx.strokeStyle = g.color; ctx.lineWidth = 2 + 2 * f; ctx.stroke();
  }
  KS.render = function () {
    if (KS.headless || !ctx) return;
    var run = KS.run, t = KS.G.realTime, c = KS.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    if (!run) {
      ctx.fillStyle = "#2a1f1a"; ctx.fillRect(0, 0, c.sw, c.sh);
      ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
      try { KS.ui.drawAttract(ctx, t); } catch (err) { KS.reportError("ui", err); }
      return;
    }
    updateCamera(run, lastRealDt);
    ctx.fillStyle = (run.mapDef.palette && run.mapDef.palette.edge) || "#2a1f1a"; ctx.fillRect(0, 0, c.sw, c.sh);
    var z = c.zoom * c.dpr;
    ctx.setTransform(z, 0, 0, z, (c.w / 2 - c.x - c.sx) * z, (c.h / 2 - c.y - c.sy) * z);
    for (var L = 0; L < 10; L++) layer(L, run, t);
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    ctx.save();
    try {
      var tl = run.texts.list, tn = run.texts.n;
      ctx.textAlign = "center"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(42,31,26,0.9)";
      for (var i = 0; i < tn; i++) {
        var q = tl[i]; if (!q.alive) continue;
        var sx = (q.x - c.x + c.w / 2) * c.zoom, sy = (q.y - c.y + c.h / 2) * c.zoom;
        ctx.globalAlpha = Math.min(1, q.life * 3);
        ctx.font = q.crit ? "bold 18px Cinzel, serif" : "bold 13px Cinzel, serif";
        ctx.fillStyle = q.crit ? "#f6d24a" : "#fff8e8";
        ctx.strokeText(q.str, sx, sy); ctx.fillText(q.str, sx, sy);
      }
      runHooks(10, run);
    } catch (err2) { KS.reportError("render:10", err2); }
    ctx.restore();
    if (flashT > 0) {
      flashT -= lastRealDt;
      ctx.globalAlpha = Math.max(0, flashT / flashMax) * 0.5; ctx.fillStyle = flashColor; ctx.fillRect(0, 0, c.sw / c.dpr, c.sh / c.dpr); ctx.globalAlpha = 1;
    }
    ctx.save();
    try { KS.ui.drawHUD(ctx, run, c); runHooks(11, run); } catch (err3) { KS.reportError("render:11", err3); }
    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // Perf guard (DESIGN §14.1)
  // ---------------------------------------------------------------------------
  var pgAcc = 0, pgN = 0, pgLowT = 0;
  function applyPerfLevel() {
    var base = CAPS[KS.device.tier], c = KS.device.caps, L = perfLevel;
    fxMul = Math.pow(0.7, L);
    c.particles = Math.round(base.particles * fxMul);
    c.procs = Math.max(60, Math.round(base.procs * Math.pow(0.8, L)));
    c.enemies = Math.max(180, Math.round(base.enemies * Math.pow(0.9, L)));
    var d = Math.max(1, base.dpr - 0.25 * L);
    if (d !== c.dpr) { c.dpr = d; KS.resize(); }
    KS.perfStats.perfLevel = L;
  }
  function perfGuard(rdt) {
    if (KS.G.mode !== "play" || document.hidden) { pgAcc = 0; pgN = 0; return; }
    pgAcc += rdt; pgN++;
    if (pgAcc < 1) return;
    var avg = pgAcc / pgN * 1000; pgAcc = 0; pgN = 0;
    if (avg > 20 && perfLevel < 4) { perfLevel++; pgLowT = 0; applyPerfLevel(); }
    else if (avg < 14) { pgLowT++; if (pgLowT >= 10 && perfLevel > 0) { perfLevel--; pgLowT = 0; applyPerfLevel(); } }
    else pgLowT = 0;
  }

  // ---------------------------------------------------------------------------
  // Input (keyboard, pointer stick, gamepad), lifecycle listeners
  // ---------------------------------------------------------------------------
  var PAD_MAP = ["a", "b", "x", "y", "lb", "rb", null, null, null, "start", null, null, "up", "down", "left", "right"];
  function pollPad() {
    var pad = KS.pad, jp = pad.justPressed, pr = pad.pressed, k;
    for (k in jp) jp[k] = false;
    if (!navigator.getGamepads) return;
    var list = null; try { list = navigator.getGamepads(); } catch (e) { list = null; }
    var g = null;
    if (list) for (var i = 0; i < list.length; i++) if (list[i] && list[i].connected) { g = list[i]; break; }
    if (!g) { if (pad.connected) { pad.connected = false; for (k in pr) pr[k] = false; } return; }
    pad.connected = true; KS.input.gamepad = true;
    pad.axes[0] = g.axes[0] || 0; pad.axes[1] = g.axes[1] || 0;
    for (var b = 0; b < PAD_MAP.length; b++) {
      var name = PAD_MAP[b]; if (!name) continue;
      var down = !!(g.buttons[b] && g.buttons[b].pressed);
      if (down && !pr[name]) jp[name] = true;
      pr[name] = down;
    }
    if (KS.G.mode === "play" && !uiOpen()) {
      if (jp.start) KS.pause();
      else if (jp.x) KS.confirmInteract();
    }
  }
  function onKeyDown(ev) {
    var c = ev.code; keys[c] = true;
    if (KS.G.mode !== "play" || uiOpen()) return;
    if (c === "Escape" || c === "KeyP") { KS.pause(); ev.preventDefault(); }
    else if (c === "KeyE" || c === "Enter" || c === "NumpadEnter") { KS.confirmInteract(); }
    else if (c === "Space" || c === "ShiftLeft" || c === "ShiftRight") { abilityPressed = true; ev.preventDefault(); }
    else if (c.indexOf("Arrow") === 0) ev.preventDefault();
  }
  function onKeyUp(ev) { keys[ev.code] = false; }
  function clearKeys() { for (var k in keys) keys[k] = false; KS.input.touchStick.active = false; }
  var stickId = -1;
  function onPointerDown(ev) {
    if (KS.G.mode !== "play" || !KS.run) return;
    var h = window.innerHeight || 1;
    if (ev.pointerType !== "mouse" && ev.clientY < h * 0.4) return;
    var ts = KS.input.touchStick;
    stickId = ev.pointerId; ts.active = true; ts.ox = ts.x = ev.clientX; ts.oy = ts.y = ev.clientY;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    ev.preventDefault();
  }
  function onPointerMove(ev) {
    var ts = KS.input.touchStick; if (!ts.active || ev.pointerId !== stickId) return;
    ts.x = ev.clientX; ts.y = ev.clientY;
    var dx = ts.x - ts.ox, dy = ts.y - ts.oy, l = Math.sqrt(dx * dx + dy * dy);
    if (l > 60) { ts.ox = ts.x - dx / l * 60; ts.oy = ts.y - dy / l * 60; }
  }
  function onPointerUp(ev) { if (ev.pointerId === stickId) { KS.input.touchStick.active = false; stickId = -1; } }
  function unlockAudio() {
    var ok = true;
    try { KS.audio.unlock(); } catch (e) { ok = false; KS.reportError("audio", e); }
    if (ok) { window.removeEventListener("pointerdown", unlockAudio, true); window.removeEventListener("keydown", unlockAudio, true); }
  }
  function onHide() {
    try { KS.meta.saveNow(); } catch (e) { KS.reportError("meta", e); }
    clearKeys();
    if (KS.G.mode === "play" && !KS.G.simLock) KS.pause();
  }

  // ---------------------------------------------------------------------------
  // Loop
  // ---------------------------------------------------------------------------
  var last = 0, acc = 0, lastRealDt = 1 / 60;
  function frame(now) {
    window.requestAnimationFrame(frame);
    if (!last) last = now;
    var rdt = (now - last) / 1000; last = now;
    if (rdt > 0.1) rdt = 0.1; if (rdt < 0) rdt = 0;
    lastRealDt = rdt;
    var G = KS.G; G.frame++; G.realTime += rdt;
    if (rdt > 0) G.fps = G.fps * 0.95 + (1 / rdt) * 0.05;
    KS.perfStats.frameMs = rdt * 1000;
    if (G.simLock) return;
    pollPad(); readInput();
    acc += rdt;
    var steps = 0, ts = perfNow();
    while (acc >= DT && steps < 5) { if (G.mode === "play" && KS.run) KS.step(); acc -= DT; steps++; }
    if (steps === 5) acc = 0;
    var tr = perfNow();
    KS.render();
    var te = perfNow();
    KS.perfStats.stepMs = tr - ts; KS.perfStats.renderMs = te - tr;
    if (!KS.headless) perfGuard(rdt);
  }

  // ---------------------------------------------------------------------------
  // §4.1 Boot, §12.4 URL params
  // ---------------------------------------------------------------------------
  function parseParams() {
    var o = { test: null, play: null, seed: null, headless: false, skip: null };
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.has("test")) o.test = q.get("test") || "";
      if (q.has("play")) o.play = q.get("play");
      if (q.has("seed")) o.seed = q.get("seed");
      o.headless = q.has("headless");
      if (q.has("skip")) o.skip = q.get("skip");
    } catch (e) { /* ignore */ }
    return o;
  }
  KS.boot = function () {
    if (KS._booted) return;
    KS._booted = true;
    var P = KS.params = parseParams();
    KS.setTier(KS.detectTier());
    canvas = document.getElementById("ks-canvas");
    ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    KS.canvas = canvas; KS.ctx = ctx;
    if (P.test !== null) { try { KS.meta.sandbox(true); } catch (e1) { KS.reportError("meta", e1); } }
    try { KS.meta.load(); } catch (e2) { KS.reportError("meta", e2); }
    KS.setTier(KS.detectTier());
    KS.resize();
    try { KS.audio.init(); } catch (e3) { KS.reportError("audio", e3); }
    try { KS.ui.init(); } catch (e4) { KS.reportError("ui", e4); }
    var v = null;
    try { v = KS.validateDefs(); } catch (e5) { KS.reportError("test", e5); }
    if (v && v.errors && v.errors.length && typeof console !== "undefined") console.warn("[KS] validateDefs: " + v.errors.length + " problem(s)", v.errors.slice(0, 20));
    if (window.KS_LOAD_ERRORS && window.KS_LOAD_ERRORS.length && typeof console !== "undefined") console.info("[KS] scripts not loaded: " + window.KS_LOAD_ERRORS.join(", "));
    if (P.test === "manual") KS.debug = true;
    if (P.test !== null && P.test !== "manual" && P.headless) KS.headless = true;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onHide);
    window.addEventListener("pagehide", function () { try { KS.meta.saveNow(); } catch (e) { KS.reportError("meta", e); } });
    document.addEventListener("visibilitychange", function () { if (document.hidden) onHide(); });
    window.addEventListener("resize", KS.resize);
    window.addEventListener("pointerdown", unlockAudio, true);
    window.addEventListener("keydown", unlockAudio, true);
    if (canvas) {
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
    }
    setMode("menu");
    if (P.test !== null && P.test !== "manual") {
      setTimeout(function () { if (KS.test && KS.test.runAll) KS.test.runAll(); }, 0);
    } else if (P.play) {
      var parts = String(P.play).split(":");
      KS.startRun({ map: parts[0] || "backforty", operator: parts[1] || "foreman", seed: P.seed != null ? (parseInt(P.seed, 10) >>> 0) : undefined });
    } else uiShow("title", {});
    window.requestAnimationFrame(frame);
  };
})(window.KS = {});
