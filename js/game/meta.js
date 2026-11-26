/* Kudzu Survivors v2 - meta.js (ENG-META)
 * Save/load/migrate/sandbox, settings, Parts Counter, unlocks, Work Orders, codex, stats,
 * operators, cosmetics, Locker drawing (drawMachine / drawPortrait), Daily Ticket, name filter.
 * Only this file touches localStorage ("ksv2.*" keys; reads "rsvpDone").
 */
(function (KS) {
  "use strict";

  // ===========================================================================
  // TEXT: every player-facing string (names, hints, jokes) lives here for review.
  // ===========================================================================
  var TEXT = {
    banner: "Progress won't be saved in this browser.",
    defaultName: "OPERATOR",
    ops: {
      foreman:  { name: "The Foreman", title: "Keeps the clipboard and the schedule", trait: "+10% XP, +1 reroll, +1 banish", hint: "Starter crew" },
      mae:      { name: "Mulcher Mae", title: "Never met a stump she liked", trait: "+20 max HP, +15% area, -5% speed", hint: "Starter crew" },
      sergeant: { name: "Saw Sergeant", title: "Sharpens before breakfast", trait: "+1 saw blade, +5% might", hint: "Work Order: Brush Crew (2,000 lifetime kills)" },
      charlie:  { name: "Chipper Charlie", title: "Feeds the chipper, hums along", trait: "+15% magnet, chipper kills nearby give +1 XP", hint: "Clear a stage once" },
      burnboss: { name: "The Burn Boss", title: "Permit in one hand, drip torch in the other", trait: "+50% burn duration and damage", hint: "Work Order: Light a Fire" },
      nell:     { name: "Night Shift Nell", title: "Works best when the sun does not", trait: "+25% might in darkness or after 8:00", hint: "Complete Light the House" },
      dispatcher: { name: "The Dispatcher", title: "Radio always on, coffee always cold", trait: "+1 drone at level 10", hint: "Complete 3 different Signature Objectives" },
      subcontractor: { name: "The Subcontractor", title: "Has a guy for that", trait: "+1 card choice, 10% cheaper prices", hint: "Beat the Overgrowth Eternal" }
    },
    shop: {
      cab: ["Reinforced Cab", "Max HP +10 per rank."],
      teeth: ["Sharpened Teeth", "Might +5% per rank."],
      additive: ["Fuel Treatment", "Speed +4% per rank."],
      bighopper: ["Bigger Hopper", "Pickup radius +10% per rank."],
      extracredit: ["Extra Credit", "XP gain +5% per rank."],
      ppjar: ["Peppermint Jar", "Peppermint Pay +8% per rank."],
      refill: ["Thermos Refill", "Regen +0.1 HP/s per rank."],
      spareblade: ["Spare Blade", "Might +1% per rank. Rank 5: +1 amount."],
      hitch: ["Quick Hitch", "Cooldowns -4% per rank."],
      lugnut: ["Lucky Lug Nut", "Crit +3% and luck +0.05 per rank."],
      rerollticket: ["Reroll Ticket", "+1 reroll per rank."],
      skipslip: ["Red Tag Pad", "+1 banish per rank."],
      secondshift: ["Second Shift", "Max HP +5 (ranks 1, 2, 4). Rank 3: +1 revive. Rank 5: +2 revives."],
      bonuscrate: ["Bonus Crate", "Tinsel +3% (ranks 1-4). Rank 5: crates offer 4 choices."]
    },
    hat: { hardhat: "Hard Hat", santacap: "Santa-style Cap", earflaps: "Trapper Ear-Flaps", elf: "Elf Beanie", antlers: "Antlers", cattleman: "Cattleman Hat", bobble: "Bobble Beanie",
      welding: "Welding Cap", candle: "Candle Crown", holly: "Holly Band", fedora: "Fedora", snowytop: "Snowy Top Hat", orange: "Safety-Orange Knit", golden: "Golden Hard Hat" },
    paint: { brick: "Moorhead Brick", holly: "Holly Green", ochre: "Ochre Gold", galv: "Galvanized", candy: "Candy Stripe", ginger: "Gingerbread", navy: "Midnight Navy",
      frosted: "Frosted Glass", camo: "Camo Pine", sleigh: "Sleigh Lacquer", barn: "Barn Weathered", chrome: "Showroom Chrome" },
    trail: { chips: "Wood Chips", snow: "Snow Puff", candy: "Candy Sparkles", tinsel: "Tinsel Ribbon", sawdust: "Sawdust", twinkle: "Twinkle Lights", needles: "Pine Needles", embers: "Ember Sparks" },
    frame: { ticket: "Ticket Stub", tag: "Paper Tag", brass: "Brass Plate", wreath: "Holly Wreath", neon: "Neon Diner", postcard: "Postcard", gold: "Gold Leaf", wood: "Wood Burned" },
    badWords: ["damn", "hell", "crap", "ass", "shit", "fuck", "bitch", "piss", "bastard", "dick", "sex", "porn", "nazi", "slut", "whore", "boob", "butt", "poop", "fart"]
  };

  // ===========================================================================
  // Constants, defaults
  // ===========================================================================
  var SAVE_VERSION = 1;
  var K_PROFILE = "ksv2.profile", K_BAK = "ksv2.profile.bak", K_SET = "ksv2.settings";
  var RANKS = [1, 3, 6, 10, 20];
  var COSM_KINDS = ["paint", "hat", "trail", "frame"];
  var DEF_COSM = ["paint:brick", "paint:holly", "hat:hardhat", "hat:santacap", "trail:chips", "frame:ticket"];
  var KIND_TABLE = { weapon: "weapons", gear: "gear", item: "items", map: "maps", operator: "operators" };
  var FALLBACK_COND = ["frozen", "rush", "storm", "night", "heavy", "crowded", "inspection", "windy"];
  var MAP_OBJ_FALLBACK = [["backforty", /lot|mound/], ["creek", /dam/], ["easement", /span|tower/], ["homeplace", /house|breaker|light/], ["longleaf", /fire|break|stake/]];
  var MAP_UNLOCK = { creek: 2, easement: 3, homeplace: 4, longleaf: 5 };

  function defaultProfile() {
    return {
      v: SAVE_VERSION, pay: 0, bows: 0, shop: {},
      unlocked: { weapon: [], gear: [], item: [], map: [], operator: [], cosmetic: DEF_COSM.slice(), flag: [] },
      achievements: {}, codex: { enemies: {}, affixes: {}, bosses: {} }, blueprints: {}, logbook: {}, ops: {},
      stats: { runs: 0, time: 0, kills: 0, deaths: 0, bestTime: 0, bestStage: 0, bestSeason: 0, bestTier: 0, bossKills: {}, itemsFound: 0,
        cratesOpened: 0, tinselSpent: 0, payEarned: 0, crits: 0, burnKills: 0, eliteKills: 0, mimicKills: 0, crowKills: 0,
        objectivesDone: {}, opsPlayed: {}, biggestHit: 0 },
      loadout: { operator: "foreman", map: "backforty", overtime: 0, paint: "brick", hat: "hardhat", trail: "chips", frame: "ticket", name: TEXT.defaultName, showName: true },
      daily: { date: "", best: 0, attempted: false }, tips: {}
    };
  }
  function defaultSettings() {
    var rm = false;
    try { rm = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { rm = false; }
    return { v: 1, music: 0.6, sfx: 0.8, shake: true, reducedMotion: rm, dmgNumbers: "auto", cbTelegraphs: false, autoAim: "auto", leftHanded: false, quality: "auto", showFps: false, joystick: "floating" };
  }
  var SETTING_RULES = {
    music: "n01", sfx: "n01", shake: "bool", reducedMotion: "bool", cbTelegraphs: "bool", leftHanded: "bool", showFps: "bool",
    dmgNumbers: ["auto", "on", "off"], autoAim: ["auto", "on", "off"], quality: ["auto", "low", "medium", "high"], joystick: ["floating", "fixed"]
  };

  // ---- small helpers -------------------------------------------------------
  function isObj(o) { return !!o && typeof o === "object" && !Array.isArray(o); }
  function num(v, d) { return typeof v === "number" && v === v && isFinite(v) ? v : d; }
  function dedupe(a) {
    var out = [], seen = {};
    if (!Array.isArray(a)) return out;
    for (var i = 0; i < a.length; i++) { var s = a[i]; if (typeof s !== "string" || seen[s]) continue; seen[s] = 1; out.push(s); }
    return out;
  }
  // fill missing keys of dst from template tpl, recursively for plain objects; unknown keys are kept
  function fill(dst, tpl) {
    for (var k in tpl) {
      var t = tpl[k];
      if (isObj(t)) { if (!isObj(dst[k])) dst[k] = {}; if (k !== "bossKills" && k !== "objectivesDone" && k !== "opsPlayed" && k !== "shop" && k !== "tips") fill(dst[k], t); }
      else if (Array.isArray(t)) { if (!Array.isArray(dst[k])) dst[k] = t.slice(); }
      else if (typeof dst[k] !== typeof t || (typeof t === "number" && !isFinite(dst[k]))) dst[k] = t;
    }
    return dst;
  }
  function normalizeProfile(o) {
    var p = isObj(o) ? o : {};
    fill(p, defaultProfile());
    p.v = SAVE_VERSION;
    var u = p.unlocked, k, i;
    for (k in u) u[k] = dedupe(u[k]);
    for (i = 0; i < DEF_COSM.length; i++) if (u.cosmetic.indexOf(DEF_COSM[i]) < 0) u.cosmetic.push(DEF_COSM[i]);
    p.pay = Math.max(0, num(p.pay, 0)); p.bows = Math.max(0, num(p.bows, 0));
    for (k in p.shop) p.shop[k] = Math.max(0, Math.min(5, Math.floor(num(p.shop[k], 0))));
    if (typeof p.loadout.name !== "string") p.loadout.name = TEXT.defaultName;
    p.loadout.overtime = Math.max(0, Math.min(10, Math.floor(num(p.loadout.overtime, 0))));
    return p;
  }
  function migrate(obj) {
    var o = isObj(obj) ? obj : {};
    var v = typeof o.v === "number" ? o.v : 0;
    if (v < SAVE_VERSION) {
      // v0 / v1-game shapes: nothing worth carrying except pay/bows numbers; normalize does the rest
      o.v = SAVE_VERSION;
    }
    return normalizeProfile(o);
  }

  // ===========================================================================
  // State
  // ===========================================================================
  var store = {
    get: function (k) { return window.localStorage.getItem(k); },
    set: function (k, v) { window.localStorage.setItem(k, v); }
  };
  var profile = null, settings = null, sandboxed = false, rsvpDone = false, rsvpRead = false, saveTimer = 0;
  var recorded = false, dailyFirst = false;
  var pendingAch = [], pendingUnlocks = [], pendingPages = [];
  var runMaxHit = 0, runAffix = {}, runSeen = {}, runLogNew = [];

  function ensure() { if (!profile) { profile = defaultProfile(); settings = defaultSettings(); } return profile; }

  // ===========================================================================
  // Shop (Parts Counter)
  // ===========================================================================
  var COSTS = [200, 400, 800, 1400, 2200];
  function addShop(id, fn) {
    var t = TEXT.shop[id];
    KS.registerShop({ id: id, name: t[0], desc: function (rank) { return t[1] + (rank > 0 ? " (Rank " + rank + ")" : ""); }, max: 5, costs: COSTS.slice(), stats: fn });
  }
  addShop("cab", function (r, S) { S.maxHp += 10 * r; });
  addShop("teeth", function (r, S) { S.might += 0.05 * r; });
  addShop("additive", function (r, S) { S.speed *= 1 + 0.04 * r; });
  addShop("bighopper", function (r, S) { S.magnet *= 1 + 0.10 * r; });
  addShop("extracredit", function (r, S) { S.xpMul += 0.05 * r; });
  addShop("ppjar", function (r, S) { S.payMul += 0.08 * r; });
  addShop("refill", function (r, S) { S.regen += 0.1 * r; });
  addShop("spareblade", function (r, S) { S.might += 0.01 * Math.min(r, 4); if (r >= 5) S.amount += 1; });
  addShop("hitch", function (r, S) { S.cooldown -= 0.04 * r; });
  addShop("lugnut", function (r, S) { S.crit += 0.03 * r; S.luck += 0.05 * r; });
  addShop("rerollticket", function (r, S) { S.rerolls += r; });
  addShop("skipslip", function (r, S) { S.banishes += r; });
  addShop("secondshift", function (r, S) {
    S.maxHp += 5 * ((r >= 1 ? 1 : 0) + (r >= 2 ? 1 : 0) + (r >= 4 ? 1 : 0));
    S.revives += r >= 5 ? 2 : (r >= 3 ? 1 : 0);
  });
  addShop("bonuscrate", function (r, S, run) { S.tinselMul += 0.03 * Math.min(r, 4); if (r >= 5 && run && run.flags) run.flags["meta.bonuscrate"] = true; });

  // ===========================================================================
  // Operators
  // ===========================================================================
  function addOp(id, weapon, ability, color, skin, extra) {
    var t = TEXT.ops[id];
    var d = { id: id, name: t.name, title: t.title, weapon: weapon, ability: ability, trait: t.trait, hint: t.hint, color: color, skin: skin, unlock: null, stats: function () {} };
    for (var k in extra) d[k] = extra[k];
    KS.registerOperator(d);
  }
  addOp("foreman", "cane", "toolbox", "#b3261e", "#e2b48c", { rerolls: 1, banishes: 1, stats: function (S) { S.xpMul += 0.10; } });
  addOp("mae", "mulcher", "fullthrottle", "#c9993b", "#c68b64", { stats: function (S) { S.maxHp += 20; S.area += 0.15; S.speed *= 0.95; } });
  addOp("sergeant", "saws", "fellline", "#2f4a32", "#d9a577", { unlock: "kills2k", weaponBonus: { weaponId: "saws", key: "count", add: 1, minLevel: 1 }, stats: function (S) { S.might += 0.05; } });
  addOp("charlie", "chipper", "feedchipper", "#9a5b2e", "#f0c8a0", {
    unlock: "stage1",
    stats: function (S) { S.magnet *= 1.15; },
    onKill: function (K, run) {
      var s = K && K.src, w = s && s.slot >= 0 && s.slot < 6 && run.weapons ? run.weapons[s.slot] : null;
      if (!w || (w.id !== "chipper" && !(w.def && w.def.from === "chipper"))) return;
      var p = run.player, dx = K.x - p.x, dy = K.y - p.y;
      if (dx * dx + dy * dy <= 14400) KS.addXP(1);
    }
  });
  addOp("burnboss", "burnpile", "backfire", "#c4521a", "#b98a63", { unlock: "fire", stats: function (S) { S.burnStatusMul *= 1.5; } });
  addOp("nell", "snow", "floodlights", "#1f2a44", "#8d5a3b", {
    unlock: { objective: "homeplace" },
    stats: function (S, run) { if (run && ((run.flags && run.flags["maps.dark"]) || run.stageTime >= 480)) S.might += 0.25; }
  });
  addOp("dispatcher", "drone", "callitin", "#4b6a7a", "#e8bf99", { unlock: { objectives: 3 }, weaponBonus: { weaponId: "drone", key: "drones", add: 1, minLevel: 10 } });
  addOp("subcontractor", "stampede", "changeorder", "#5a4a6a", "#c9a07a", { unlock: "season", secret: true, stats: function (S) { S.cards += 1; S.priceMul *= 0.9; } });

  function rankOf(opId) {
    var o = ensure().ops[opId], runs = o ? num(o.runs, 0) : 0, r = 0;
    for (var i = 0; i < RANKS.length; i++) if (runs >= RANKS[i]) r = i + 1;
    return r;
  }

  // ===========================================================================
  // Cosmetics: data
  // ===========================================================================
  function cos(kind, id, unlock, hint, data) {
    var d = { id: id, name: TEXT[kind][id], unlock: unlock, hint: hint };
    for (var k in data) d[k] = data[k];
    KS.registerCosmetic(kind, d);
  }
  var DEFAULT = { default: true };
  cos("paint", "brick", DEFAULT, "Default", { body: "#b3261e", trim: "#2a1f1a" });
  cos("paint", "holly", DEFAULT, "Default", { body: "#2f4a32", trim: "#c9993b" });
  cos("paint", "ochre", { achievement: "stage1" }, "Work Order: Lot's Clear", { body: "#c9993b", trim: "#2a1f1a" });
  cos("paint", "galv", { stat: "kills", n: 1000 }, "1,000 lifetime kills", { body: "#9aa3a8", trim: "#4d5559" });
  cos("paint", "candy", { evolved: "cane_evo" }, "Evolve the Candy Cane", { body: "#f6efe0", trim: "#b3261e", style: "stripe" });
  cos("paint", "ginger", { roster: "backforty" }, "Complete the Back Forty Field Guide roster", { body: "#9a5b2e", trim: "#f6efe0", style: "icing" });
  cos("paint", "navy", { opRank: ["nell", 5] }, "Night Shift Nell rank 5", { body: "#1f2a44", trim: "#f2c36b" });
  cos("paint", "frosted", { achievement: "whiteout" }, "Reach Forecast Whiteout", { body: "#cfe9ef", trim: "#ffffff", alpha: 0.9 });
  cos("paint", "camo", { objective: "longleaf" }, "Complete the Longleaf objective", { body: "#4b5d3a", trim: "#2a1f1a", style: "camo" });
  cos("paint", "sleigh", { bossKills: ["kudzuking", 5] }, "Beat the Kudzu King 5 times", { body: "#7a1010", trim: "#c9993b", style: "scroll" });
  cos("paint", "barn", { stat: "runs", n: 25 }, "Play 25 runs", { body: "#8b3a2f", trim: "#d8cbb0", style: "faded" });
  cos("paint", "chrome", { achievement: "boss_all", bows: 3 }, "Beat all 6 bosses (costs 3 Golden Bows)", { body: "#cfd6da", trim: "#6b747a", style: "chrome" });

  cos("hat", "hardhat", DEFAULT, "Default", { color: "#f2b632" });
  cos("hat", "santacap", DEFAULT, "Default", { color: "#b3261e" });
  cos("hat", "earflaps", { ach: 5 }, "Earn 5 Work Orders", { color: "#7a5a3a" });
  cos("hat", "elf", { ach: 10 }, "Earn 10 Work Orders", { color: "#2f7a3a" });
  cos("hat", "antlers", { ach: 15 }, "Earn 15 Work Orders", { color: "#6b4a2a" });
  cos("hat", "cattleman", { achievement: "onlyhaul" }, "Work Order: Hauling", { color: "#c8a46a" });
  cos("hat", "bobble", { ach: 20 }, "Earn 20 Work Orders", { color: "#2a4a8a" });
  cos("hat", "welding", { opRank: ["burnboss", 3] }, "The Burn Boss rank 3", { color: "#6b7378" });
  cos("hat", "candle", { achievement: "rsvp" }, "Work Order: Party Planner", { color: "#c9993b" });
  cos("hat", "holly", { opRank: ["mae", 3] }, "Mulcher Mae rank 3", { color: "#2f6a36" });
  cos("hat", "fedora", { ach: 30 }, "Earn 30 Work Orders", { color: "#4a4a4f" });
  cos("hat", "snowytop", { ach: 25 }, "Earn 25 Work Orders", { color: "#1d1d22" });
  cos("hat", "orange", { opRank: ["foreman", 3] }, "The Foreman rank 3", { color: "#f26a1b" });
  cos("hat", "golden", { achievement: "allwork", bows: 5 }, "Employee of the Year (costs 5 Golden Bows)", { color: "#e8b830" });

  // trails: fx = core KS.fx kind, colors cycle
  cos("trail", "chips", DEFAULT, "Default", { fx: "chips", colors: ["#d9a066", "#b57a45", "#efe2c4"], rate: 0.07, size: 2.4 });
  cos("trail", "snow", { stat: "bestTier", n: 2 }, "Reach Forecast tier 2", { fx: "snow", colors: ["#ffffff", "#cfe9ef"], rate: 0.07, size: 3 });
  cos("trail", "candy", { achievement: "evo1" }, "Work Order: Overhauled", { fx: "sparks", colors: ["#b3261e", "#ffffff", "#e8b830"], rate: 0.06, size: 2.2 });
  cos("trail", "tinsel", { achievement: "tinsel" }, "Work Order: Tinsel Tycoon", { fx: "sparks", colors: ["#d8d8e0", "#c9993b", "#e8e8f0"], rate: 0.05, size: 2.2 });
  cos("trail", "sawdust", { stat: "kills", n: 500 }, "500 lifetime kills", { fx: "chips", colors: ["#e8cf9a", "#d2b078"], rate: 0.05, size: 1.6 });
  cos("trail", "twinkle", { objective: "homeplace" }, "Complete Light the House", { fx: "sparks", colors: ["#ff5a4a", "#ffd24a", "#5ad07a", "#5aa8ff"], rate: 0.08, size: 2.4 });
  cos("trail", "needles", { achievement: "stage3" }, "Work Order: Three Sites Deep", { fx: "leaves", colors: ["#3f7a3f", "#6aa04a"], rate: 0.09, size: 1.8 });
  cos("trail", "embers", { achievement: "fire" }, "Work Order: Light a Fire", { fx: "embers", colors: ["#ff8a2a", "#ffd24a", "#c4521a"], rate: 0.07, size: 2.2 });

  cos("frame", "ticket", DEFAULT, "Default", { fill: "#efe2c4", edge: "#2a1f1a", text: "#2a1f1a" });
  cos("frame", "tag", { stat: "runs", n: 5 }, "Play 5 runs", { fill: "#d8c9a0", edge: "#6a5a3a", text: "#2a1f1a" });
  cos("frame", "brass", { stat: "bestTime", n: 600 }, "Survive 10:00 in one run", { fill: "#c9993b", edge: "#6b4a14", text: "#2a1f1a" });
  cos("frame", "wreath", { achievement: "season" }, "Work Order: Close Out the Season", { fill: "#2f4a32", edge: "#b3261e", text: "#efe2c4" });
  cos("frame", "neon", { ach: 12 }, "Earn 12 Work Orders", { fill: "#15151f", edge: "#46e0e0", text: "#ff7ad0" });
  cos("frame", "postcard", { achievement: "rsvp" }, "Work Order: Party Planner", { fill: "#f4ecd8", edge: "#b3261e", text: "#2a1f1a" });
  cos("frame", "gold", { ach: 10, bows: 2 }, "Earn 10 Work Orders (costs 2 Golden Bows)", { fill: "#e8c860", edge: "#8a6414", text: "#2a1f1a" });
  cos("frame", "wood", { stat: "kills", n: 5000 }, "5,000 lifetime kills", { fill: "#8a5a32", edge: "#3a2412", text: "#f0dcb4" });

  // ===========================================================================
  // Unlock plumbing
  // ===========================================================================
  function defName(kind, id) {
    var d = null;
    if (kind === "cosmetic") { var p = id.split(":"); d = KS.defs.cosmetics[p[0]] && KS.defs.cosmetics[p[0]][p[1]]; }
    else if (KIND_TABLE[kind]) d = KS.defs[KIND_TABLE[kind]][id];
    return d && (d.name || d.title) ? (d.name || d.title) : id;
  }
  function addUnlock(kind, id) {
    var P = ensure(), list = P.unlocked[kind];
    if (!list) list = P.unlocked[kind] = [];
    if (list.indexOf(id) >= 0) return false;
    list.push(id);
    if (kind !== "flag") pendingUnlocks.push({ kind: kind, id: id, name: defName(kind, id) });
    try { KS.emit("unlock", { kind: kind, id: id }); } catch (e) { /* bus reports */ }
    return true;
  }
  function unlockStr(s) {
    var i = String(s).indexOf(":");
    if (i < 0) return false;
    var kind = s.slice(0, i), id = s.slice(i + 1);
    if (!kind || !id) return false;
    var r = addUnlock(kind, id);
    if (r) metaSave();
    return r;
  }

  function mapOfObjective(id) {
    var k, d, o;
    for (k in KS.defs.maps) { d = KS.defs.maps[k]; o = d && d.objective; if (o && (o === id || o.id === id)) return k; }
    for (var i = 0; i < MAP_OBJ_FALLBACK.length; i++) if (MAP_OBJ_FALLBACK[i][1].test(id)) return MAP_OBJ_FALLBACK[i][0];
    return "";
  }
  function objectiveMaps() {
    var out = {}, k, st = ensure().stats.objectivesDone;
    for (k in st) { var m = mapOfObjective(k); if (m) out[m] = 1; }
    if (st) for (k in out) { /* noop: keeps the loop shape */ }
    return out;
  }
  function distinctObjectives() { var n = 0; for (var k in ensure().stats.objectivesDone) n++; return n; }
  function achCount() { var n = 0; for (var k in ensure().achievements) n++; return n; }

  function rosterDone(mapId) {
    var md = KS.defs.maps[mapId], w = md && md.spawnWeights, any = false, E = ensure().codex.enemies;
    if (!w) return false;
    for (var id in w) { if (!(w[id] > 0)) continue; any = true; var e = E[id]; if (!e || num(e[1], 0) < 10) return false; }
    return any;
  }
  // condition evaluator for cosmetics (and operator/map extras)
  function condMet(u) {
    var P = ensure(), S = P.stats;
    if (!u) return true;
    if (u.default) return true;
    if (u.achievement) return !!P.achievements[u.achievement];
    if (u.stat) return num(S[u.stat], 0) >= (u.n || 1);
    if (u.ach) return achCount() >= u.ach;
    if (u.opRank) return rankOf(u.opRank[0]) >= u.opRank[1];
    if (u.roster) return rosterDone(u.roster);
    if (u.evolved) return !!P.blueprints[u.evolved];
    if (u.objective) return !!objectiveMaps()[u.objective];
    if (u.bossKills) return num(S.bossKills[u.bossKills[0]], 0) >= u.bossKills[1];
    return false;
  }
  function refreshUnlocks() {
    var P = ensure(), k, i, d, r = [];
    for (i = 0; i < COSM_KINDS.length; i++) {
      var t = KS.defs.cosmetics[COSM_KINDS[i]];
      for (k in t) {
        d = t[k]; var key = COSM_KINDS[i] + ":" + k;
        if (!d.unlock || d.unlock.bows || P.unlocked.cosmetic.indexOf(key) >= 0) continue;
        if (condMet(d.unlock)) addUnlock("cosmetic", key);
      }
    }
    // maps
    var objs = objectiveMaps(), reached = num(P.stats.bestStage, 0);
    for (k in MAP_UNLOCK) if (reached >= MAP_UNLOCK[k] || objs[mapPrev(k)]) addUnlock("map", k);
    for (k in KS.defs.maps) {
      d = KS.defs.maps[k]; var u = d && d.unlock;
      if (u && typeof u === "object" && ((u.reachStage && reached >= u.reachStage) || (u.objective && P.stats.objectivesDone[u.objective]))) addUnlock("map", k);
    }
    // operators with non-achievement unlocks
    if (objs.homeplace) addUnlock("operator", "nell");
    if (distinctObjectives() >= 3) addUnlock("operator", "dispatcher");
    return r;
  }
  function mapPrev(k) { return k === "creek" ? "backforty" : k === "easement" ? "creek" : k === "homeplace" ? "easement" : "homeplace"; }
  // note: the Longleaf map is unlocked by completing Light the House (homeplace); Homeplace by Clear the Span (easement)
  // mapPrev maps each map to the map whose objective unlocks it.

  function isUnlocked(kind, id) {
    var P = ensure();
    if (COSM_KINDS.indexOf(kind) >= 0) { id = kind + ":" + id; kind = "cosmetic"; }
    if (kind === "cosmetic") {
      var p = String(id).split(":"), d0 = KS.defs.cosmetics[p[0]] && KS.defs.cosmetics[p[0]][p[1]];
      if (!d0) return false;
      return P.unlocked.cosmetic.indexOf(id) >= 0;
    }
    var tbl = KIND_TABLE[kind];
    if (!tbl) return P.unlocked[kind] ? P.unlocked[kind].indexOf(id) >= 0 : false;
    var def = KS.defs[tbl][id];
    if (!def) return false;
    if (def.unlock == null) return true;
    return P.unlocked[kind].indexOf(id) >= 0;
  }
  function cosmeticState(kind, id) {
    var d = KS.defs.cosmetics[kind] && KS.defs.cosmetics[kind][id];
    if (!d) return "missing";
    if (ensure().unlocked.cosmetic.indexOf(kind + ":" + id) >= 0) return "owned";
    if (d.unlock && d.unlock.bows && condMet(d.unlock)) return "available";
    return "locked";
  }

  // ===========================================================================
  // Save / load
  // ===========================================================================
  function metaSave() {
    if (sandboxed) return;
    if (saveTimer) return;
    try { saveTimer = setTimeout(function () { saveTimer = 0; saveNow(); }, 500); } catch (e) { saveTimer = 0; }
  }
  function saveNow() {
    if (saveTimer) { try { clearTimeout(saveTimer); } catch (e0) { /* ignore */ } saveTimer = 0; }
    if (sandboxed || !profile) return;
    try {
      meta.store.set(K_PROFILE, JSON.stringify(profile));
      meta.store.set(K_SET, JSON.stringify(settings));
      meta.storageOk = true;
    } catch (e) { meta.storageOk = false; }
  }
  function readJson(key) {
    var raw = meta.store.get(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); } catch (e) { return undefined; }   // undefined = corrupt
  }
  function load() {
    if (!rsvpRead) {
      rsvpRead = true;
      try { rsvpDone = window.localStorage.getItem("rsvpDone") === "1"; } catch (e) { rsvpDone = false; }
    }
    if (sandboxed) { profile = defaultProfile(); settings = defaultSettings(); meta.storageOk = false; checkRsvp(); return; }
    var prof = null, set = null, ok = true;
    try {
      prof = readJson(K_PROFILE);
      set = readJson(K_SET);
      if (prof === undefined) {   // corrupt: keep a copy
        try { var raw = meta.store.get(K_PROFILE); if (raw) meta.store.set(K_BAK, raw); } catch (e2) { /* ignore */ }
        prof = null;
      }
      if (set === undefined) set = null;
      if (isObj(prof) && typeof prof.v === "number" && prof.v < SAVE_VERSION) { try { meta.store.set(K_BAK, JSON.stringify(prof)); } catch (e3) { ok = false; } }
    } catch (e1) { ok = false; prof = null; set = null; }
    profile = migrate(prof);
    settings = fill(isObj(set) ? set : {}, defaultSettings());
    for (var k in SETTING_RULES) settings[k] = sanitizeSetting(k, settings[k], defaultSettings()[k]);
    meta.storageOk = ok;
    refreshUnlocks();
    checkRsvp();
  }
  function checkRsvp() { if (rsvpDone && !ensure().achievements.rsvp) { award("rsvp"); } }
  function sanitizeSetting(k, v, d) {
    var rule = SETTING_RULES[k];
    if (rule === "bool") return typeof v === "boolean" ? v : d;
    if (rule === "n01") return typeof v === "number" && v === v ? Math.max(0, Math.min(1, v)) : d;
    if (Array.isArray(rule)) return rule.indexOf(v) >= 0 ? v : d;
    return v;
  }
  function setSetting(key, value) {
    ensure();
    if (!(key in SETTING_RULES)) return;
    var d = defaultSettings()[key], v = sanitizeSetting(key, value, d);
    settings[key] = v;
    metaSave();
    try { KS.emit("settings", { key: key, value: v }); } catch (e) { /* bus reports */ }
  }

  // ===========================================================================
  // Achievements (40 Work Orders)
  // ===========================================================================
  var CTX = { run: null, profile: null, event: "", payload: null };
  var ACH_LIST = [];
  function A(id, title, desc, o) {
    o = o || {};
    var d = { id: id, title: title, desc: desc, hint: desc, hidden: !!o.hidden, check: o.check, on: o.on || [], poll: !!o.poll, reward: { unlock: o.unlock || [], bows: 1 }, progress: o.prog || null };
    if (o.all !== false) d.countsForAllWork = true;
    KS.registerAchievement(d);
    ACH_LIST.push(id);
  }
  function lifeVal(c, key, runVal) { return num(ensure().stats[key], 0) + (recorded ? 0 : num(runVal, 0)); }
  function itemTotal(r) { var n = 0, k; for (k in r.items) n += r.items[k]; return n; }
  function itemMax(r) { var m = 0, k; for (k in r.items) if (r.items[k] > m) m = r.items[k]; return m; }
  function tagOf(id) { var d = KS.defs.weapons[id]; return d ? String(d.tag || "").toLowerCase() : ""; }
  function weaponIds(r) { var out = [], i; for (i = 0; i < r.weapons.length; i++) if (r.weapons[i]) out.push(r.weapons[i].id); return out; }
  function ratio(a, b) { return b > 0 ? Math.max(0, Math.min(1, a / b)) : 0; }

  A("firstday", "First Day on the Job", "Survive 5:00.", { poll: true, unlock: ["item:advent"], check: function (c) { return c.run.time >= 300; }, prog: function (c) { return ratio(num(c.profile.stats.bestTime, 0), 300); } });
  A("tenminutes", "Ten-Minute Break", "Survive 10:00.", { poll: true, unlock: ["gear:chains"], check: function (c) { return c.run.time >= 600; }, prog: function (c) { return ratio(num(c.profile.stats.bestTime, 0), 600); } });
  A("thirty", "Long Haul", "Survive 30:00 in one run.", { poll: true, unlock: ["item:generator"], check: function (c) { return c.run.time >= 1800; }, prog: function (c) { return ratio(num(c.profile.stats.bestTime, 0), 1800); } });
  A("stage1", "Lot's Clear", "Clear 1 stage.", { on: ["stageClear"], unlock: ["operator:charlie", "cosmetic:paint:ochre", "flag:overtimeDial"], check: function (c) { return c.run.stagesCleared >= 1 || c.event === "stageClear"; } });
  A("stage3", "Three Sites Deep", "Clear 3 stages in a run.", { on: ["stageClear"], unlock: ["item:spikes"], check: function (c) { return c.run.stagesCleared >= 3; } });
  A("season", "Close Out the Season", "Beat the Overgrowth Eternal.", { hidden: true, on: ["seasonClear"], unlock: ["operator:subcontractor", "item:stocking"], check: function (c) { return c.event === "seasonClear" || num(c.profile.stats.bossKills.eternal, 0) > 0; } });
  A("overtime3", "Overtime Approved", "Reach season 2 (the 11th stage).", { on: ["stageStart", "stageClear"], unlock: ["item:luckyhat"], check: function (c) { return c.run.season >= 2 || c.run.stagesCleared >= 10; } });
  A("kills2k", "Brush Crew", "2,000 lifetime kills.", { poll: true, on: ["runEnd"], unlock: ["operator:sergeant"], check: function (c) { return lifeVal(c, "kills", c.run.kills) >= 2000; }, prog: function (c) { return ratio(num(c.profile.stats.kills, 0), 2000); } });
  A("kills25k", "Clear-Cutter", "25,000 lifetime kills.", { poll: true, on: ["runEnd"], unlock: ["item:brushpile"], check: function (c) { return lifeVal(c, "kills", c.run.kills) >= 25000; }, prog: function (c) { return ratio(num(c.profile.stats.kills, 0), 25000); } });
  A("runners500", "Runner Down", "500 Kudzu Runners in one run.", { poll: true, unlock: ["weapon:blower"], check: function (c) { return num(c.run.killsByType.runner, 0) >= 500; }, prog: function (c) { return ratio(num(c.run.killsByType.runner, 0), 500); } });
  A("chip", "Chip Off the Old Block", "300 kills within 120 of the player in one run.", { poll: true, unlock: ["weapon:chipper"], check: function (c) { return num(c.run.counters.nearKills, 0) >= 300; }, prog: function (c) { return ratio(num(c.run.counters.nearKills, 0), 300); } });
  A("fire", "Light a Fire", "Burn 1,000 enemies (lifetime burn kills).", { poll: true, on: ["runEnd"], unlock: ["weapon:burnpile", "operator:burnboss"], check: function (c) { return lifeVal(c, "burnKills", c.run.burnKills) >= 1000; }, prog: function (c) { return ratio(num(c.profile.stats.burnKills, 0), 1000); } });
  A("ringin", "Ring It In", "Evolve any Ring or Blade weapon.", { on: ["evolve"], unlock: ["weapon:bells"], check: function (c) { var p = c.payload, t = tagOf(p && p.from) || (p && p.w && p.w.def ? String(p.w.def.tag || "").toLowerCase() : ""); return t === "ring" || t === "blade"; } });
  A("dispatch", "Dispatch Certified", "Complete 2 Signature Objectives.", { on: ["objectiveDone"], unlock: ["weapon:drone"], check: function () { return distinctObjectivesWith(CTX.run, CTX.payload) >= 2; }, prog: function () { return ratio(distinctObjectives(), 2); } });
  A("linesman", "Deck the Lines", "Clear Powerline Easement.", { on: ["stageClear"], unlock: ["weapon:lash"], check: function (c) { return !!c.payload && c.payload.mapId === "easement"; } });
  A("lookup", "Look Up, Look Out", "Kill 50 elites (lifetime).", { poll: true, on: ["runEnd"], unlock: ["weapon:timber"], check: function (c) { return lifeVal(c, "eliteKills", c.run.eliteKills) >= 50; }, prog: function (c) { return ratio(num(c.profile.stats.eliteKills, 0), 50); } });
  A("evo1", "Overhauled", "Your first evolution.", { on: ["evolve"], unlock: ["gear:wishbone"], check: function () { return true; } });
  A("evo3", "Full Shop", "3 evolutions in one run.", { on: ["evolve"], unlock: ["gear:toolbelt"], check: function (c) { return num(c.run.counters.evolutions, 0) >= 3; } });
  A("fusion", "Welded", "Your first fusion.", { on: ["fuse"], unlock: ["item:xmasmorning"], check: function () { return true; } });
  A("items10", "Loaded Up", "Hold 10 items.", { on: ["itemGet"], unlock: ["item:canestash"], check: function (c) { return itemTotal(c.run) >= 10; } });
  A("items30", "Truck Bed Overflow", "Hold 30 items.", { on: ["itemGet"], unlock: ["item:ram"], check: function (c) { return itemTotal(c.run) >= 30; } });
  A("stack10", "Bulk Order", "Hold 10 of one item.", { on: ["itemGet"], unlock: ["item:discount"], check: function (c) { return itemMax(c.run) >= 10; } });
  A("tinsel", "Tinsel Tycoon", "Spend 2,000 Tinsel in one run.", { poll: true, unlock: ["gear:coffeecan"], check: function (c) { return num(c.run.tinselSpent, 0) >= 2000; }, prog: function (c) { return ratio(num(c.run.tinselSpent, 0), 2000); } });
  A("crit", "Sharp Edge", "Land 5,000 crits (lifetime).", { poll: true, on: ["runEnd"], unlock: ["gear:linegloves"], check: function (c) { return lifeVal(c, "crits", c.run.crits) >= 5000; }, prog: function (c) { return ratio(num(c.profile.stats.crits, 0), 5000); } });
  A("chain", "Chain Reaction", "A proc chain reaching depth 5.", { poll: true, unlock: ["item:extcord"], check: function (c) { return num(c.run.maxDepth, 0) >= 5; } });
  A("nohit", "Safety Meeting", "3:00 without taking damage.", { poll: true, unlock: ["item:chaps"], check: function (c) { return Math.max(num(c.run.counters.noHitBest, 0), num(c.run.counters.noHitT, 0)) >= 180; } });
  A("objectives5", "Signature Work", "Complete all 5 objectives (lifetime).", { on: ["objectiveDone"], unlock: ["item:floodlight"], check: function () { return distinctObjectives() >= 5 && mapCountObjectives() >= 5; }, prog: function () { return ratio(distinctObjectives(), 5); } });
  A("kudzuweather", "Kudzu Weather", "Reach Forecast tier 5.", { on: ["tierUp"], unlock: ["flag:kudzu"], check: function (c) { return num(c.run.maxTier, 0) >= 5; } });
  A("whiteout", "Whiteout", "Reach Forecast tier 4.", { on: ["tierUp"], unlock: ["cosmetic:paint:frosted", "item:rocksalt"], check: function (c) { return num(c.run.maxTier, 0) >= 4; } });
  A("mimic", "Re-Gifted", "Kill 10 Present Mimics (lifetime).", { poll: true, on: ["runEnd"], unlock: ["item:mallet"], check: function (c) { return lifeVal(c, "mimicKills", c.run.counters.mimicKills) >= 10; }, prog: function (c) { return ratio(num(c.profile.stats.mimicKills, 0), 10); } });
  A("regifted", "Re-Re-Gifted", "Kill a Regifted elite's copy within 1 second of the elite.", { hidden: true, poll: true, unlock: ["item:wreath"], check: function (c) { return num(c.run.counters.regiftQuick, 0) >= 1; } });
  A("crow", "Crow Bar", "Kill 25 Tinsel Crows (lifetime).", { poll: true, on: ["runEnd"], unlock: ["item:almanac"], check: function (c) { return lifeVal(c, "crowKills", c.run.counters.crowKills) >= 25; }, prog: function (c) { return ratio(num(c.profile.stats.crowKills, 0), 25); } });
  A("boss_kudzuking", "Weed Whacker", "Beat the Kudzu King.", { on: ["bossDeath"], unlock: ["item:stumpremover"], check: function (c) { return (c.payload && c.payload.bossId === "kudzuking") || num(c.profile.stats.bossKills.kudzuking, 0) > 0; } });
  A("boss_all", "Clean Sweep", "Beat all 6 bosses (lifetime).", { on: ["bossDeath", "runEnd"], unlock: [], check: function (c) { return allBosses(c); } });
  A("daily", "Ticket Punched", "Complete a Daily Ticket run (survive 5:00).", { poll: true, unlock: ["gear:flares"], check: function (c) { return !!c.run.daily && c.run.time >= 300; } });
  A("allops", "Full Crew", "Play a run with each of the 8 operators.", { on: ["runEnd"], unlock: ["gear:firstaid", "gear:radio"], check: function (c) { return opsPlayedCount() >= 8; }, prog: function () { return ratio(opsPlayedCount(), 8); } });
  A("nogear", "Bare Hands", "Clear stage 1 with no gear.", { on: ["stageClear"], unlock: ["item:goldstar"], check: function (c) { var r = c.run, i; if (c.payload && c.payload.stageIndex !== 0) return false; for (i = 0; i < r.gear.length; i++) if (r.gear[i]) return false; return true; } });
  A("onlyhaul", "Hauling", "Survive 10:00 using only Haul weapons (at least 2).", { poll: true, unlock: [], check: function (c) {
    if (c.run.time < 600) return false;
    var ids = weaponIds(c.run), i;
    if (ids.length < 2) return false;
    for (i = 0; i < ids.length; i++) if (tagOf(ids[i]) !== "haul" && !haulSecondary(ids[i])) return false;
    return true;
  } });
  A("rsvp", "Party Planner", "Make it to the real party list (RSVP on the main page).", { hidden: true, all: false, unlock: ["cosmetic:hat:candle"], check: function () { return rsvpDone; } });
  A("allwork", "Employee of the Year", "Earn the 38 other Work Orders (Party Planner not required).", { all: false, poll: true, on: ["runEnd"], unlock: [], check: function (c) {
    for (var id in KS.defs.achievements) { var d = KS.defs.achievements[id]; if (d.countsForAllWork && !c.profile.achievements[id]) return false; }
    return true;
  }, prog: function (c) { var n = 0, t = 0; for (var id in KS.defs.achievements) { if (KS.defs.achievements[id].countsForAllWork) { t++; if (c.profile.achievements[id]) n++; } } return ratio(n, t); } });

  // rewards awarded through cosmetic conditions (kept out of unlock strings): hat cattleman, golden hat, chrome are condition-based
  function haulSecondary(id) { var d = KS.defs.weapons[id]; return !!(d && d.tags2 && d.tags2.length && d.tags2.indexOf("haul") >= 0 && String(d.tag).toLowerCase() === "haul"); }
  function distinctObjectivesWith(run, payload) {
    var seen = {}, n = 0, k, i, st = ensure().stats.objectivesDone;
    for (k in st) { seen[k] = 1; n++; }
    if (!recorded && run && run.objectivesDone) for (i = 0; i < run.objectivesDone.length; i++) if (!seen[run.objectivesDone[i]]) { seen[run.objectivesDone[i]] = 1; n++; }
    if (payload && payload.id && !seen[payload.id]) n++;
    return n;
  }
  function mapCountObjectives() { var n = 0, o = objectiveMaps(); for (var k in o) n++; return n; }
  function opsPlayedCount() { var n = 0; for (var k in ensure().stats.opsPlayed) n++; return n; }
  function allBosses(c) {
    var bk = c.profile.stats.bossKills, ids = [], k, n = 0;
    for (k in KS.defs.bosses) ids.push(k);
    if (ids.length >= 6) { for (k = 0; k < ids.length; k++) if (!(num(bk[ids[k]], 0) > 0)) return false; return true; }
    for (k in bk) if (bk[k] > 0) n++;
    return n >= 6;
  }

  function award(id) {
    var P = ensure(), d = KS.defs.achievements[id];
    if (!d || P.achievements[id]) return false;
    P.achievements[id] = Math.floor(Date.now() / 1000);
    P.bows += d.reward && d.reward.bows != null ? d.reward.bows : 1;
    var u = d.reward && d.reward.unlock, i;
    if (u) for (i = 0; i < u.length; i++) unlockStr(u[i]);
    pendingAch.push({ id: id, title: d.title });
    try { KS.emit("achievement", { id: id }); } catch (e) { /* bus */ }
    metaSave();
    return true;
  }
  var evalBusy = false;
  function runAch(event, payload, pollOnly) {
    var P = ensure(), run = KS.run, id, d, any = false;
    if (!run || !run.counters) return;
    if (evalBusy) return;
    evalBusy = true;
    try {
      CTX.run = run; CTX.profile = P; CTX.event = event; CTX.payload = payload;
      for (id in KS.defs.achievements) {
        d = KS.defs.achievements[id];
        if (P.achievements[id] || !d.check) continue;
        if (pollOnly ? !d.poll : (!d.on || d.on.indexOf(event) < 0)) continue;
        var ok = false;
        try { ok = !!d.check(CTX); } catch (e) { KS.reportError("meta", e); }
        if (ok && award(id)) any = true;
      }
      if (any) { // chained: Employee of the Year, Boss sweep
        for (id in KS.defs.achievements) {
          d = KS.defs.achievements[id];
          if (P.achievements[id] || !(d.poll || (d.on && d.on.indexOf("runEnd") >= 0))) continue;
          try { if (d.check(CTX)) award(id); } catch (e2) { KS.reportError("meta", e2); }
        }
      }
    } finally { evalBusy = false; }
  }

  // ===========================================================================
  // Events
  // ===========================================================================
  var COLD = ["runStart", "stageStart", "stageClear", "seasonClear", "bossDeath", "evolve", "fuse", "itemGet", "objectiveDone", "tierUp", "interact", "levelup"];
  function bump(map, id, i, n) { var e = map[id]; if (!e) { e = map[id] = [0, 0]; } e[i] = num(e[i], 0) + n; }
  function wire() {
    var i;
    for (i = 0; i < COLD.length; i++) (function (ev) { KS.on(ev, function (p) { onCold(ev, p); }); })(COLD[i]);
    KS.on("kill", function (K) { if (K.elite && K.enemy) { var a = K.enemy.affix0; if (a) runAffix[a] = (runAffix[a] || 0) + 1; a = K.enemy.affix1; if (a) runAffix[a] = (runAffix[a] || 0) + 1; } });
    KS.on("hit", function (H) { if (H.amount > runMaxHit && H.amount < 1e12) runMaxHit = H.amount; });
    KS.on("tick", onTick);
  }
  function onCold(ev, p) {
    var P = ensure(), r;
    if (ev === "runStart") {
      recorded = false; runMaxHit = 0; runAffix = {}; runSeen = {}; runLogNew = [];
      r = p && p.run;
      if (r && r.daily) {
        var today = todayKey();
        dailyFirst = !(P.daily.date === today && P.daily.attempted);
        P.daily.date = today; P.daily.attempted = true; metaSave();
      } else dailyFirst = false;
    } else if (ev === "itemGet" && p && p.id) {
      if (!P.logbook[p.id]) runLogNew.push(p.id);
      P.logbook[p.id] = num(P.logbook[p.id], 0) + 1; P.stats.itemsFound++;
    } else if (ev === "evolve" || ev === "fuse") {
      var to = p && p.to;
      if (to && !P.blueprints[to]) { P.blueprints[to] = 1; pendingPages.push({ kind: "blueprint", id: to, level: 1 }); refreshUnlocks(); metaSave(); }
    } else if (ev === "interact" && p && /crate|box/.test(String(p.defId || ""))) P.stats.cratesOpened++;
    else if (ev === "bossDeath" && p && p.bossId) { /* counted at recordRun from the summary */ }
    runAch(ev, p, false);
  }
  var tickT = 0;
  function onTick(run) {
    var run2 = run || KS.run;
    if (!run2 || run2.ended) return;
    if (run2.cosmetics_off) return;
    emitTrail(run2);
  }

  // trail particles behind the machine
  var trailC = 0;
  function emitTrail(run) {
    var p = run.player;
    if (!p || !p.alive || !p.moving || KS.headless) return;
    var s = settings || {};
    if (s.reducedMotion) return;
    var ck = p.cosmetics, d = ck && KS.defs.cosmetics.trail[ck.trail];
    if (!d) return;
    p.trailT -= KS.DT;
    if (p.trailT > 0) return;
    p.trailT = d.rate;
    trailC = (trailC + 1) % d.colors.length;
    var fx = Math.cos(p.rot || 0), fy = Math.sin(p.rot || 0);
    KS.fx(d.fx, p.x - fx * 20, p.y - fy * 20, d.colors[trailC], 1, d.size);
  }

  function tick(run) {
    if (!run || run.ended) return;
    var P = ensure(), i, e, id, c, list;
    // sightings for the Field Guide
    list = run.enemies && run.enemies.list;
    if (list) {
      for (i = 0; i < run.enemies.n; i++) {
        e = list[i];
        if (!e || !e.alive) continue;
        id = e.defId;
        if (!runSeen[id]) { runSeen[id] = 1; markSeen(KS.defs.bosses[id] ? P.codex.bosses : P.codex.enemies, id, KS.defs.bosses[id] ? "boss" : "enemy"); }
        if (e.affix0 && !runSeen["a:" + e.affix0]) { runSeen["a:" + e.affix0] = 1; markSeen(P.codex.affixes, e.affix0, "affix"); }
        if (e.affix1 && !runSeen["a:" + e.affix1]) { runSeen["a:" + e.affix1] = 1; markSeen(P.codex.affixes, e.affix1, "affix"); }
      }
    }
    runAch("tick", null, true);
  }
  function markSeen(tbl, id, kind) {
    var e = tbl[id];
    if (!e) { tbl[id] = [1, 0]; pendingPages.push({ kind: kind, id: id, level: 1 }); }
    else if (!e[0]) { e[0] = 1; pendingPages.push({ kind: kind, id: id, level: 1 }); }
  }

  // ===========================================================================
  // recordRun
  // ===========================================================================
  function pageLevel(e, boss) {
    if (!e) return 0;
    var k = num(e[1], 0);
    if (boss) return k >= 1 ? 3 : (e[0] ? 1 : 0);
    return k >= 100 ? 3 : (k >= 10 ? 2 : (e[0] ? 1 : 0));
  }
  function pseudoRun(s) {
    var w = [], g = [], i;
    for (i = 0; i < (s.weapons || []).length; i++) w.push({ id: s.weapons[i].id });
    for (i = 0; i < (s.gear || []).length; i++) g.push({ id: s.gear[i].id });
    return { time: num(s.time, 0), stagesCleared: num(s.stagesCleared, 0), season: num(s.season, 0), killsByType: s.killsByType || {}, counters: s.counters || {},
      maxTier: num(s.maxTier, 0), maxDepth: num(s.counters && s.counters.maxDepth, 0), items: s.items || {}, weapons: w, gear: g, daily: !!s.daily, tinselSpent: num(s.tinselSpent, 0),
      crits: num(s.crits, 0), kills: num(s.kills, 0), burnKills: num(s.burnKills, 0), eliteKills: num(s.eliteKills, 0), bossKills: s.bossKills || {}, objectivesDone: s.objectivesDone || [] };
  }
  function recordRun(s) {
    var P = ensure();
    s = isObj(s) ? s : {};
    var reason = s.reason || "quit", op = s.operatorId || "foreman", i, k;
    var liveRun = KS.run;
    var bossTotal = 0, bk = isObj(s.bossKills) ? s.bossKills : {};
    for (k in bk) bossTotal += num(bk[k], 0);
    var objs = Array.isArray(s.objectivesDone) ? s.objectivesDone : [];
    var minutes = num(s.time, 0) / 60, cleared = num(s.stagesCleared, 0);
    var base = num(s.kills, 0) / 10 + 25 * minutes + 50 * cleared + 100 * bossTotal + 150 * objs.length + 5 * num(s.eliteKills, 0) + 25 * num(s.gilded, 0);
    var payMul = liveRun && liveRun.stats && liveRun.stats.payMul ? liveRun.stats.payMul : (1 + 0.08 * (P.shop.ppjar || 0));
    var gross = base * payMul + num(s.pay, 0);
    gross *= (1 + 0.08 * num(s.overtime, 0)) * (1 + 0.5 * num(s.season, 0));
    var endF = reason === "dead" ? 0.7 : (reason === "clockout" ? 1 + 0.1 * cleared : 0.5);
    gross *= endF;
    var wasFirstDaily = !!(s.daily && dailyFirst);
    if (wasFirstDaily) gross *= 2;
    var payEarned = Math.max(0, Math.round(gross));
    var bowsStart = P.bows, sti = P.stats;

    // page levels before
    var pre = {}, bossIds = [];
    for (k in s.killsByType || {}) pre["e:" + k] = pageLevel(P.codex.enemies[k], false);
    for (k in bk) { pre["b:" + k] = pageLevel(P.codex.bosses[k], true); bossIds.push(k); }
    var affRun = runAffix;
    for (k in affRun) pre["a:" + k] = pageLevel(P.codex.affixes[k], false);

    // lifetime stats
    sti.runs++; sti.time += num(s.time, 0); sti.kills += num(s.kills, 0);
    if (reason === "dead") sti.deaths++;
    sti.bestTime = Math.max(sti.bestTime, num(s.time, 0));
    sti.bestStage = Math.max(sti.bestStage, cleared + 1);
    sti.bestSeason = Math.max(sti.bestSeason, num(s.season, 0));
    sti.bestTier = Math.max(sti.bestTier, num(s.maxTier, 0));
    sti.tinselSpent += num(s.tinselSpent, 0); sti.crits += num(s.crits, 0); sti.burnKills += num(s.burnKills, 0); sti.eliteKills += num(s.eliteKills, 0);
    var cn = isObj(s.counters) ? s.counters : {};
    sti.mimicKills += num(cn.mimicKills, 0); sti.crowKills += num(cn.crowKills, 0);
    sti.biggestHit = Math.max(sti.biggestHit, runMaxHit);
    sti.payEarned += payEarned;
    sti.opsPlayed[op] = num(sti.opsPlayed[op], 0) + 1;
    var firstBossBows = 0, newObjBows = 0;
    for (k in bk) { if (!(num(sti.bossKills[k], 0) > 0) && bk[k] > 0) firstBossBows++; sti.bossKills[k] = num(sti.bossKills[k], 0) + num(bk[k], 0); }
    var mapsBefore = objectiveMaps();
    for (i = 0; i < objs.length; i++) sti.objectivesDone[objs[i]] = num(sti.objectivesDone[objs[i]], 0) + 1;
    var mapsAfter = objectiveMaps();
    for (k in mapsAfter) if (!mapsBefore[k]) newObjBows++;
    P.bows += firstBossBows + newObjBows;
    var o = P.ops[op]; if (!o) o = P.ops[op] = { runs: 0, bestTime: 0 };
    o.runs = num(o.runs, 0) + 1; o.bestTime = Math.max(num(o.bestTime, 0), num(s.time, 0));

    // codex
    var kt = s.killsByType || {};
    for (k in kt) { var ee = P.codex.enemies[k]; if (!ee) ee = P.codex.enemies[k] = [1, 0]; ee[0] = 1; ee[1] = num(ee[1], 0) + num(kt[k], 0); }
    for (k in bk) { var be = P.codex.bosses[k]; if (!be) be = P.codex.bosses[k] = [1, 0]; be[0] = 1; be[1] = num(be[1], 0) + num(bk[k], 0); }
    for (k in affRun) { var ae = P.codex.affixes[k]; if (!ae) ae = P.codex.affixes[k] = [1, 0]; ae[0] = 1; ae[1] = num(ae[1], 0) + affRun[k]; }
    for (k in P.codex.enemies) if (pre["e:" + k] !== undefined && pageLevel(P.codex.enemies[k], false) > pre["e:" + k] && pre["e:" + k] >= 1) pendingPages.push({ kind: "enemy", id: k, level: pageLevel(P.codex.enemies[k], false) });
    for (k in P.codex.bosses) if (pre["b:" + k] !== undefined && pageLevel(P.codex.bosses[k], true) > pre["b:" + k]) pendingPages.push({ kind: "boss", id: k, level: 3 });
    for (k in affRun) if (pageLevel(P.codex.affixes[k], false) > (pre["a:" + k] || 0) && (pre["a:" + k] || 0) >= 1) pendingPages.push({ kind: "affix", id: k, level: pageLevel(P.codex.affixes[k], false) });
    for (i = 0; i < runLogNew.length; i++) pendingPages.push({ kind: "item", id: runLogNew[i], level: 1 });
    for (k in KS.defs.maps) { if (!P.rosters) P.rosters = {}; if (!P.rosters[k] && rosterDone(k)) { P.rosters[k] = 1; if (k !== "backforty") P.bows++; pendingPages.push({ kind: "roster", id: k, level: 3 }); } }

    // daily
    if (s.daily && wasFirstDaily) { P.daily.best = Math.max(num(P.daily.best, 0), num(s.time, 0)); }

    P.pay += payEarned;
    recorded = true;
    refreshUnlocks();
    // full pass over Work Orders (lifetime stats are now committed)
    var fake = liveRun && liveRun.ended ? liveRun : pseudoRun(s);
    if (liveRun && liveRun.counters && !liveRun.ended) fake = pseudoRun(s);
    var saveRun = KS.run;
    try {
      CTX.run = fake; CTX.profile = P; CTX.event = "runEnd"; CTX.payload = s;
      var again = true, guard = 0;
      while (again && guard++ < 4) {
        again = false;
        for (k in KS.defs.achievements) {
          var d = KS.defs.achievements[k];
          if (P.achievements[k] || !d.check) continue;
          var ok = false;
          try { ok = !!d.check(CTX); } catch (e) { KS.reportError("meta", e); }
          if (ok && award(k)) again = true;
        }
      }
    } finally { KS.run = saveRun; }
    refreshUnlocks();

    var newAch = pendingAch.slice(), newUn = pendingUnlocks.slice(), newPg = pendingPages.slice();
    pendingAch.length = 0; pendingUnlocks.length = 0; pendingPages.length = 0;
    var nearest = [], cand = [];
    for (k in KS.defs.achievements) {
      var ad = KS.defs.achievements[k];
      if (P.achievements[k] || ad.hidden || !ad.progress) continue;
      var pr = 0; try { pr = ad.progress(CTX); } catch (e3) { pr = 0; }
      if (pr > 0 && pr < 1) cand.push({ id: k, title: ad.title, progress: pr });
    }
    cand.sort(function (a, b) { return b.progress - a.progress; });
    nearest = cand.slice(0, 3);
    metaSave();
    saveNow();
    return { payEarned: payEarned, bowsEarned: P.bows - bowsStart, newUnlocks: newUn, newPages: newPg, newAchievements: newAch, nearest: nearest };
  }

  // ===========================================================================
  // Misc API
  // ===========================================================================
  function todayKey() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate() + ""; }
  function defaultIds(tbl) { var out = []; for (var k in tbl) if (tbl[k].unlock == null) out.push(k); out.sort(); return out; }
  function daily() {
    var P = ensure(), key = todayKey(), seed = parseInt(key, 10) >>> 0;
    var rng = KS.RNG(seed), ops = defaultIds(KS.defs.operators), maps = defaultIds(KS.defs.maps), cs = [], k;
    if (!ops.length) ops = ["foreman", "mae"];
    if (!maps.length) maps = ["backforty"];
    for (k in KS.defs.conditions) cs.push(k);
    cs.sort();
    if (!cs.length) cs = FALLBACK_COND;
    return { seed: seed, operator: ops[rng.int(0, ops.length - 1)], map: maps[rng.int(0, maps.length - 1)], condition: [cs[rng.int(0, cs.length - 1)]],
      attempted: P.daily.date === key && !!P.daily.attempted, best: P.daily.date === key ? P.daily.best : 0 };
  }
  function setName(str) {
    var s = String(str == null ? "" : str).replace(/[^A-Za-z0-9 .'\-]/g, "").replace(/\s+/g, " ").trim().slice(0, 12).trim();
    var words = s.toLowerCase().split(/[ .'\-]+/), i;
    for (i = 0; i < words.length; i++) if (TEXT.badWords.indexOf(words[i]) >= 0) { s = ""; break; }
    if (!s) s = TEXT.defaultName;
    ensure().loadout.name = s;
    metaSave();
    return s;
  }
  function equip(kind, id) {
    var P = ensure(), lo = P.loadout;
    if (COSM_KINDS.indexOf(kind) >= 0) {
      var st = cosmeticState(kind, id);
      if (st === "available") {
        var cost = KS.defs.cosmetics[kind][id].unlock.bows;
        if (P.bows < cost) return false;
        P.bows -= cost; addUnlock("cosmetic", kind + ":" + id);
      } else if (st !== "owned") return false;
      lo[kind] = id; metaSave(); return true;
    }
    if (kind === "operator" || kind === "map") {
      if (!isUnlocked(kind, id)) return false;
      lo[kind] = id; metaSave(); return true;
    }
    if (kind === "overtime") {
      var n = Math.max(0, Math.min(10, Math.floor(num(id, 0))));
      if (n > 0 && P.unlocked.flag.indexOf("overtimeDial") < 0) return false;
      lo.overtime = n; metaSave(); return true;
    }
    if (kind === "showName") { lo.showName = !!id; metaSave(); return true; }
    return false;
  }
  function buy(id) {
    var P = ensure(), d = KS.defs.shop[id];
    if (!d) return false;
    var r = num(P.shop[id], 0);
    if (r >= (d.max || 5)) return false;
    var cost = d.costs[r];
    if (P.pay < cost) return false;
    P.pay -= cost; P.shop[id] = r + 1; metaSave();
    return true;
  }
  function refundAll() {
    var P = ensure(), k, r, i;
    for (k in P.shop) { var d = KS.defs.shop[k], costs = d ? d.costs : COSTS; r = num(P.shop[k], 0); for (i = 0; i < r; i++) P.pay += costs[i] || 0; P.shop[k] = 0; }
    metaSave();
  }
  function applyStats(S, run) {
    var P = ensure(), op = run && run.opDef, k, d, r;
    if (op) {
      try { if (op.stats) op.stats(S, run); } catch (e) { KS.reportError("meta", e); }
      if (op.rerolls) S.rerolls += op.rerolls;
      if (op.banishes) S.banishes += op.banishes;
    }
    for (k in P.shop) { r = P.shop[k]; d = KS.defs.shop[k]; if (r > 0 && d) { try { d.stats(Math.min(r, 5), S, run); } catch (e2) { KS.reportError("meta", e2); } } }
    if (run && run.operatorId) S.might += 0.02 * rankOf(run.operatorId);
    if (run && run.overtime) S.luck += 0.05 * run.overtime;
  }
  function codexMul(defId) {
    if (!profile) return 1;
    var c = profile.codex, e = c.enemies[defId] || c.bosses[defId] || c.affixes[defId];
    return e && e[1] >= 100 ? 1.05 : 1;
  }
  function board() {
    var out = [], id, d, P = ensure();
    CTX.run = KS.run || pseudoRun({}); CTX.profile = P;
    for (id in KS.defs.achievements) {
      d = KS.defs.achievements[id];
      var pr = 0; if (d.progress && !P.achievements[id]) { try { pr = d.progress(CTX); } catch (e) { pr = 0; } }
      out.push({ id: id, title: d.hidden && !P.achievements[id] ? "???" : d.title, desc: d.hidden && !P.achievements[id] ? "???" : d.desc, hidden: !!d.hidden, done: !!P.achievements[id], at: P.achievements[id] || 0, progress: pr });
    }
    return out;
  }

  // ===========================================================================
  // Locker drawing
  // ===========================================================================
  var TAU = Math.PI * 2;
  function drawHat(ctx, id, r, t, color) {
    var c = color || "#f2b632", i;
    switch (id) {
      case "santacap":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 1.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#f6efe0"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r + 1.2, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.arc(-r - 1, 0, 2.6, 0, TAU); ctx.fill(); break;
      case "earflaps":
        ctx.fillStyle = "#c8b48c"; ctx.fillRect(-3, -r - 3.5, 6, 4); ctx.fillRect(-3, r - 0.5, 6, 4);
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke(); break;
      case "elf":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 1, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#e8c860"; ctx.beginPath(); ctx.arc(-r, 0, 1.8, 0, TAU); ctx.fill(); break;
      case "antlers":
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.lineCap = "round";
        for (i = -1; i <= 1; i += 2) { ctx.beginPath(); ctx.moveTo(-1, i * (r - 1)); ctx.lineTo(-3, i * (r + 5)); ctx.moveTo(-2, i * (r + 2)); ctx.lineTo(3, i * (r + 5)); ctx.moveTo(-3, i * (r + 5)); ctx.lineTo(-7, i * (r + 7)); ctx.stroke(); }
        ctx.fillStyle = "#a07850"; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill(); break;
      case "cattleman":
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r + 4.5, r + 3.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#a88848"; ctx.beginPath(); ctx.ellipse(0, 0, r - 0.5, r - 1.5, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-r + 2, 0); ctx.lineTo(r - 2, 0); ctx.stroke(); break;
      case "bobble":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#f6efe0"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r - 1.2, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill(); break;
      case "welding":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 0.8, 0, TAU); ctx.fill();
        ctx.fillStyle = "#222a2e"; ctx.fillRect(r - 3, -r + 1.5, 5, 2 * r - 3); break;
      case "candle":
        ctx.strokeStyle = c; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        for (i = 0; i < 3; i++) { var a = i * TAU / 3 + 0.5, fl = 1.8 + Math.sin(t * 9 + i) * 0.4; ctx.fillStyle = "#fff3c0"; ctx.fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2); ctx.fillStyle = "#ff9a2a"; ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, fl, 0, TAU); ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1; }
        break;
      case "holly":
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#b3261e"; for (i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 1.6) * r, Math.sin(i * 1.6) * r, 1.5, 0, TAU); ctx.fill(); } break;
      case "fedora":
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r + 3.5, r + 2.4, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#38383d"; ctx.beginPath(); ctx.ellipse(0, 0, r - 1, r - 2, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, r - 1, r - 2, 0, 0, TAU); ctx.stroke(); break;
      case "snowytop":
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, 0, r + 3, r + 2.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = "#2c2c33"; ctx.beginPath(); ctx.arc(0, 0, r - 1.2, 0, TAU); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-1.5, -1.5, 2, 0, TAU); ctx.arc(2, 1.5, 1.4, 0, TAU); ctx.arc(r, -r, 1.2, 0, TAU); ctx.fill(); break;
      case "orange":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 0.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; for (i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, i * (r / 3.6), 0, TAU); ctx.stroke(); } break;
      case "golden":
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 1.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff3b0"; ctx.fillRect(-1, -r + 1, 2, 2 * r - 2); ctx.fillRect(r - 2.2, -r + 2, 3.4, 2 * r - 4);
        ctx.fillStyle = "rgba(255,255,255," + (0.5 + 0.5 * Math.sin(t * 5)) + ")"; ctx.fillRect(-r + 1, -r + 1, 2, 2); break;
      default:   // hardhat
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r + 1.4, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(r - 1.5, -r, 3, 2 * r);
        ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-1, -r, 2, 2 * r);
    }
  }

  function paintBody(ctx, pd) {
    var st = pd.style, i;
    ctx.globalAlpha = pd.alpha || 1;
    ctx.fillStyle = pd.body; ctx.fillRect(-15, -10, 28, 20);
    if (st === "stripe") { ctx.fillStyle = pd.trim; for (i = 0; i < 4; i++) { ctx.fillRect(-13 + i * 7, -10, 3.5, 20); } }
    else if (st === "icing") { ctx.fillStyle = pd.trim; ctx.fillRect(-15, -10, 28, 2); ctx.fillRect(-15, 8, 28, 2); for (i = 0; i < 4; i++) ctx.fillRect(-11 + i * 6.5, -1, 2.4, 2.4); }
    else if (st === "camo") { ctx.fillStyle = "#7a8a52"; ctx.fillRect(-12, -8, 9, 6); ctx.fillRect(2, 2, 9, 6); ctx.fillStyle = "#2e3a24"; ctx.fillRect(-4, 3, 7, 5); ctx.fillRect(5, -8, 6, 5); }
    else if (st === "scroll") { ctx.strokeStyle = pd.trim; ctx.lineWidth = 1; ctx.strokeRect(-13.5, -8.5, 25, 17); ctx.beginPath(); ctx.arc(-6, 0, 3, 0, TAU); ctx.arc(4, 0, 3, 0, TAU); ctx.stroke(); }
    else if (st === "faded") { ctx.fillStyle = pd.trim; ctx.globalAlpha = 0.35; ctx.fillRect(-15, -10, 14, 8); ctx.fillRect(-4, 3, 17, 7); ctx.globalAlpha = pd.alpha || 1; }
    else if (st === "chrome") { ctx.fillStyle = "#f4f8fa"; ctx.fillRect(-15, -10, 28, 5); ctx.fillStyle = "#8e979c"; ctx.fillRect(-15, 5, 28, 5); }
    else { ctx.fillStyle = pd.trim; ctx.fillRect(-15, 8, 28, 2); }
    ctx.globalAlpha = 1;
  }

  var plateKey = "", plateName = "";
  function drawPlate(ctx, name, fd, x, y) {
    if (plateName !== name) { plateName = name; plateKey = "meta:plate:" + name; }
    var spr = null;
    try { spr = KS.textSprite(plateKey + ":" + fd.id, name, "bold 11px Cinzel, serif", fd.text); } catch (e) { spr = null; }
    if (!spr) return;
    var w = spr.width + 10, h = 18, x0 = x - w / 2, y0 = y - h / 2, id = fd.id;
    ctx.save();
    ctx.fillStyle = fd.fill; ctx.strokeStyle = fd.edge; ctx.lineWidth = 1.5;
    if (id === "neon") { ctx.fillRect(x0, y0, w, h); ctx.globalAlpha = 0.35; ctx.lineWidth = 4; ctx.strokeRect(x0, y0, w, h); ctx.globalAlpha = 1; ctx.lineWidth = 1.2; ctx.strokeRect(x0, y0, w, h); }
    else if (id === "tag") { ctx.beginPath(); ctx.moveTo(x0 + 6, y0); ctx.lineTo(x0 + w, y0); ctx.lineTo(x0 + w, y0 + h); ctx.lineTo(x0 + 6, y0 + h); ctx.lineTo(x0, y0 + h / 2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = fd.edge; ctx.beginPath(); ctx.arc(x0 + 6, y0 + h / 2, 1.6, 0, TAU); ctx.fill(); }
    else if (id === "wreath") { ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); ctx.fillStyle = "#b3261e"; ctx.fillRect(x0 + 3, y0 + 2, 3, 3); ctx.fillRect(x0 + w - 6, y0 + h - 5, 3, 3); ctx.fillRect(x0 + w - 8, y0 + 2, 2, 2); }
    else if (id === "postcard") { ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = "#b3261e"; ctx.setLineDash([4, 3]); ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2); ctx.setLineDash([]); ctx.fillStyle = "#2f4a32"; ctx.fillRect(x0 + w - 7, y0 + 2, 5, 6); }
    else if (id === "brass") { ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); ctx.fillStyle = "#6b4a14"; ctx.fillRect(x0 + 2, y0 + 2, 2, 2); ctx.fillRect(x0 + w - 4, y0 + 2, 2, 2); ctx.fillRect(x0 + 2, y0 + h - 4, 2, 2); ctx.fillRect(x0 + w - 4, y0 + h - 4, 2, 2); }
    else if (id === "gold") { ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); ctx.strokeStyle = "#fff3b0"; ctx.lineWidth = 0.8; ctx.strokeRect(x0 + 2, y0 + 2, w - 4, h - 4); }
    else if (id === "wood") { ctx.fillRect(x0, y0, w, h); ctx.strokeRect(x0, y0, w, h); ctx.strokeStyle = "rgba(40,20,8,0.5)"; ctx.beginPath(); ctx.moveTo(x0 + 3, y0 + 5); ctx.lineTo(x0 + w - 3, y0 + 5); ctx.moveTo(x0 + 3, y0 + h - 5); ctx.lineTo(x0 + w - 3, y0 + h - 5); ctx.stroke(); }
    else { ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.arc(x0, y0 + h / 2, 3, 0, TAU); ctx.arc(x0 + w, y0 + h / 2, 3, 0, TAU); ctx.fill(); }
    ctx.drawImage(spr, x - spr.width / 2, y - spr.height / 2);
    ctx.restore();
  }

  function drawMachine(ctx, p, t) {
    var D = KS.defs.cosmetics, ck = p.cosmetics || {}, pd = D.paint[ck.paint] || D.paint.brick, hd = D.hat[ck.hat] || D.hat.hardhat;
    var fd = D.frame[ck.frame] || D.frame.ticket, run = KS.run, skin = (run && run.opDef && run.opDef.skin) || p.skin || "#e2b48c";
    if (!pd || !hd) { if (KS._fallbackMachine) KS._fallbackMachine(ctx, p, t); return; }
    var rot = typeof p.rot === "number" ? p.rot : Math.atan2(p.faceY || 0, p.faceX || 1), odo = p.odo || 0, i;
    ctx.save();
    if (p.iframes > 0 && ((t * 20) | 0) % 2 === 0) ctx.globalAlpha = 0.55;
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(2, 4, 21, 15, 0, 0, TAU); ctx.fill();
    ctx.rotate(rot);
    // tracks
    ctx.fillStyle = "#2a1f1a"; ctx.fillRect(-17, -15, 34, 7); ctx.fillRect(-17, 8, 34, 7);
    ctx.strokeStyle = "#5a4a40"; ctx.lineWidth = 1.2; ctx.beginPath();
    var off = (odo * 0.6) % 6; if (off < 0) off += 6;
    for (i = 0; i < 6; i++) { var tx = -17 + off + i * 6; ctx.moveTo(tx, -15); ctx.lineTo(tx, -8); ctx.moveTo(tx, 8); ctx.lineTo(tx, 15); }
    ctx.stroke();
    // body + paint
    paintBody(ctx, pd);
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 1.4; ctx.strokeRect(-15, -10, 28, 20);
    // drum
    ctx.fillStyle = "#5a5f63"; ctx.fillRect(13, -12, 8, 24);
    ctx.strokeStyle = "#c9993b"; ctx.lineWidth = 1.6; ctx.beginPath();
    var dro = (t * 18) % 4;
    for (i = 0; i < 6; i++) { var dy = -12 + dro + i * 4; if (dy > -12 && dy < 12) { ctx.moveTo(13, dy); ctx.lineTo(21, dy); } }
    ctx.stroke();
    // cab
    ctx.fillStyle = pd.trim; ctx.fillRect(-11, -7, 13, 14);
    ctx.fillStyle = "rgba(210,235,240,0.85)"; ctx.fillRect(-9, -5, 9, 10);
    // operator head + hat
    ctx.save(); ctx.translate(-4, 0);
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(0, 0, 4.4, 0, TAU); ctx.fill();
    drawHat(ctx, ck.hat || "hardhat", 4.6, t, hd.color);
    ctx.restore();
    if (p.hurtFlash > 0) { ctx.globalAlpha = Math.min(0.9, p.hurtFlash * 4); ctx.fillStyle = "#fff"; ctx.fillRect(-15, -10, 28, 20); }
    ctx.restore();
    if (ck.showName !== false && ck.name && p.alive !== false) drawPlate(ctx, ck.name, fd, p.x, p.y - 36);
  }

  var FACE = { foreman: "clip", mae: "tail", sergeant: "stache", charlie: "goggles", burnboss: "soot", nell: "lamp", dispatcher: "headset", subcontractor: "shade" };
  function drawPortrait(ctx, opId, cosmetics, size) {
    var od = KS.defs.operators[opId], s = size || 64, cx = s / 2, cy = s / 2, ck = cosmetics || {}, hatId = ck.hat || "hardhat";
    var hd = KS.defs.cosmetics.hat[hatId] || KS.defs.cosmetics.hat.hardhat;
    ctx.save();
    ctx.fillStyle = od ? od.color : "#8a8a8a"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.48, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = Math.max(1.5, s / 28); ctx.stroke();
    if (!od) {
      ctx.fillStyle = "#efe2c4"; ctx.font = "bold " + Math.round(s * 0.6) + "px 'Playfair Display', serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", cx, cy + s * 0.04);
      ctx.restore(); return;
    }
    var k = s / 64, f = FACE[opId];
    // shoulders
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(cx - 24 * k, cy + 20 * k, 48 * k, 16 * k);
    ctx.fillStyle = od.color; ctx.fillRect(cx - 24 * k, cy + 22 * k, 48 * k, 14 * k);
    ctx.fillStyle = "#efe2c4"; ctx.fillRect(cx - 4 * k, cy + 22 * k, 8 * k, 14 * k);
    // face
    ctx.fillStyle = od.skin; ctx.beginPath(); ctx.ellipse(cx, cy + 3 * k, 15 * k, 17 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a1f1a"; ctx.beginPath(); ctx.arc(cx - 5.5 * k, cy + 1 * k, 1.8 * k, 0, TAU); ctx.arc(cx + 5.5 * k, cy + 1 * k, 1.8 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 1.4 * k; ctx.beginPath(); ctx.arc(cx, cy + 6 * k, 5 * k, 0.2, Math.PI - 0.2); ctx.stroke();
    if (f === "stache") { ctx.fillStyle = "#3a2a1c"; ctx.fillRect(cx - 7 * k, cy + 6 * k, 14 * k, 3 * k); }
    else if (f === "goggles") { ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2 * k; ctx.strokeRect(cx - 11 * k, cy - 4 * k, 9 * k, 7 * k); ctx.strokeRect(cx + 2 * k, cy - 4 * k, 9 * k, 7 * k); ctx.fillStyle = "rgba(160,220,240,0.6)"; ctx.fillRect(cx - 10 * k, cy - 3 * k, 7 * k, 5 * k); ctx.fillRect(cx + 3 * k, cy - 3 * k, 7 * k, 5 * k); }
    else if (f === "soot") { ctx.fillStyle = "rgba(40,30,25,0.45)"; ctx.fillRect(cx - 12 * k, cy + 9 * k, 24 * k, 4 * k); ctx.fillStyle = "#b3261e"; ctx.fillRect(cx - 14 * k, cy + 12 * k, 28 * k, 6 * k); }
    else if (f === "tail") { ctx.fillStyle = "#5a3a24"; ctx.beginPath(); ctx.arc(cx + 17 * k, cy - 2 * k, 6 * k, 0, TAU); ctx.fill(); }
    else if (f === "lamp") { ctx.fillStyle = "#f6efe0"; ctx.beginPath(); ctx.arc(cx, cy - 15 * k, 3.5 * k, 0, TAU); ctx.fill(); }
    else if (f === "headset") { ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2 * k; ctx.beginPath(); ctx.arc(cx, cy + 2 * k, 16 * k, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke(); ctx.fillStyle = "#2a1f1a"; ctx.fillRect(cx - 19 * k, cy - 2 * k, 4 * k, 8 * k); ctx.fillRect(cx + 15 * k, cy - 2 * k, 4 * k, 8 * k); }
    else if (f === "shade") { ctx.fillStyle = "rgba(20,20,30,0.55)"; ctx.fillRect(cx - 12 * k, cy - 4 * k, 24 * k, 8 * k); }
    // hat (seen from the front: draw the top-down glyph scaled and raised)
    ctx.save(); ctx.translate(cx, cy - 12 * k); ctx.scale(k * 2.2, k * 1.4);
    drawHat(ctx, hatId, 6, 0, hd.color);
    ctx.restore();
    ctx.restore();
  }

  // ===========================================================================
  // Public object
  // ===========================================================================
  var meta = {
    load: load, save: metaSave, saveNow: saveNow,
    sandbox: function (on) {
      sandboxed = !!on; meta.sandboxed = sandboxed;
      if (sandboxed) { if (saveTimer) { try { clearTimeout(saveTimer); } catch (e) { /* ignore */ } saveTimer = 0; } profile = defaultProfile(); settings = defaultSettings(); meta.storageOk = false; }
    },
    sandboxed: false, storageOk: false, store: store, TEXT: TEXT,
    get profile() { return ensure(); },
    get settings() { ensure(); return settings; },
    get rsvpDone() { return rsvpDone; },
    migrate: migrate,
    setSetting: setSetting, isUnlocked: isUnlocked, unlock: unlockStr,
    tipSeen: function (id) { return !!ensure().tips[id]; },
    markTip: function (id) { ensure().tips[id] = 1; metaSave(); },
    applyStats: applyStats, codexMul: codexMul, recordRun: recordRun, buy: buy, refundAll: refundAll, equip: equip, setName: setName,
    daily: daily, drawMachine: drawMachine, drawPortrait: drawPortrait, tick: tick,
    rank: rankOf, cosmeticState: cosmeticState, board: board, condMet: condMet, ranks: RANKS
  };
  KS.meta = meta;

  // rsvp is read at script load too, so the title screen can show the right footer even before load()
  try { rsvpDone = window.localStorage.getItem("rsvpDone") === "1"; rsvpRead = true; } catch (e) { rsvpDone = false; }
  wire();
})(window.KS);
