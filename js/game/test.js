/* Kudzu Survivors v2 — test harness (ENG-CORE). CONTRACT.md §14.
 * Works with only core stubs present and grows automatically as modules register content.
 * Every sim is headless, sandboxed and spied: any localStorage write during a sim fails it.
 */
(function (KS) {
  "use strict";
  if (!KS) return;
  var T = KS.test = {};
  function now() { return typeof performance !== "undefined" ? performance.now() : Date.now(); }
  function yieldNow() { return new Promise(function (r) { setTimeout(r, 0); }); }
  function keys(o) { return o ? Object.keys(o) : []; }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; if (b) for (k in b) if (b[k] !== undefined) o[k] = b[k]; return o; }
  function fileMissing(name) {
    var le = window.KS_LOAD_ERRORS || [], i;
    for (i = 0; i < le.length; i++) if (String(le[i]).indexOf("js/game/" + name + ".js") >= 0) return true;
    var sk = KS.params && KS.params.skip;
    return !!(sk && String(sk).split(",").indexOf(name) >= 0);
  }
  T.fileMissing = fileMissing;

  // ---------------------------------------------------------------------------
  // validateDefs
  // ---------------------------------------------------------------------------
  var TAGS = ["blade", "blast", "frost", "fire", "haul", "ring"];
  var RARITY = ["common", "uncommon", "rare", "legendary", "kudzu"];
  var CREW = ["freshedge", "chainreaction", "fullload", "partyline", "coldsnap", "steamline"];
  var CONDS = ["frozen", "rush", "storm", "night", "heavy", "crowded", "inspection", "windy"];
  var COLD = ["runStart", "stageStart", "stageClear", "seasonClear", "bossDeath", "evolve", "fuse", "itemGet", "objectiveDone", "tierUp", "interact", "levelup", "runEnd"];
  var STUB_OWNER = { ui: "ui", audio: "audio", meta: "meta", items: "items", levelup: "levelup", loot: "levelup", director: "enemies", maps: "maps" };
  var REWARD_KIND = { weapon: "weapons", gear: "gear", item: "items", map: "maps", operator: "operators" };
  var REWARD_FILE = { weapon: "weapons", gear: "items", item: "items", map: "maps", operator: "meta", cosmetic: "meta" };

  T.validateDefs = function () {
    var D = KS.defs, errors = [], warnings = [], k, d, i;
    function err(s) { errors.push(s); }
    function need(kind, def) {
      var r = KS._defReq[kind];
      for (var j = 0; j < r.length; j++) { var v = def[r[j]]; if (v === undefined || (v === null && r[j] !== "ability" && r[j] !== "boss" && r[j] !== "unlock")) err(kind + " " + def.id + ": missing " + r[j]); }
    }
    function ref(file, table, id, label) {
      if (id == null || id === "") return;
      if (table && table[id]) return;
      if (fileMissing(file)) warnings.push(label + " -> " + id + " (js/game/" + file + ".js not loaded)");
      else err(label + ": unknown id " + id);
    }
    function unlock(def, label) {
      var u = def.unlock;
      if (u == null || typeof u !== "string") return;
      ref("meta", D.achievements, u, label + " unlock");
    }
    function idOk(table, kind) {
      for (var key in table) { var x = table[key]; if (!x || x.id !== key) err(kind + " " + key + ": id mismatch"); else if (!/^[a-z0-9_]+$/.test(key)) err(kind + " " + key + ": bad id"); }
    }
    var counts = { weapons: 0, evolved: 0, fusions: 0, gear: 0, items: 0, enemies: 0, affixes: 0, bosses: 0, maps: 0, hazards: 0, interactables: 0,
      conditions: 0, operators: 0, achievements: 0, shop: 0, cosmetics: 0, eprojStyles: 0 };
    for (k in D) if (k !== "cosmetics" && k !== "procs") idOk(D[k], k);

    for (k in D.weapons) {
      d = D.weapons[k]; need("weapon", d);
      if (d.evolved) counts.evolved++; else if (d.fusion) counts.fusions++; else counts.weapons++;
      if (TAGS.indexOf(d.tag) < 0) err("weapon " + k + ": bad tag " + d.tag);
      var want = d.evolved || d.fusion ? 1 : 8;
      if (!d.levels || d.levels.length !== want) err("weapon " + k + ": levels must have " + want + " entries");
      if (d.partner) ref("items", D.gear, d.partner, "weapon " + k + " partner");
      if (d.evolvesTo) ref("weapons_evo", D.weapons, d.evolvesTo, "weapon " + k + " evolvesTo");
      if (d.from) ref("weapons", D.weapons, d.from, "weapon " + k + " from");
      if (d.fusion) {
        if (!d.recipe || !d.recipe.weapons || d.recipe.weapons.length !== 2) err("weapon " + k + ": fusion needs recipe.weapons [a,b]");
        else for (i = 0; i < 2; i++) ref("weapons", D.weapons, d.recipe.weapons[i], "weapon " + k + " recipe");
      }
      if (d.tags2) for (i = 0; i < d.tags2.length; i++) if (TAGS.indexOf(d.tags2[i]) < 0) err("weapon " + k + ": bad tags2 " + d.tags2[i]);
      unlock(d, "weapon " + k);
    }
    for (k in D.gear) { d = D.gear[k]; need("gear", d); counts.gear++; if (d.partnerOf) ref("weapons", D.weapons, d.partnerOf, "gear " + k + " partnerOf"); unlock(d, "gear " + k); }
    for (k in D.items) { d = D.items[k]; need("item", d); counts.items++; if (RARITY.indexOf(d.rarity) < 0) err("item " + k + ": bad rarity " + d.rarity); unlock(d, "item " + k); }
    for (k in D.crewBonuses) { d = D.crewBonuses[k]; need("crewBonus", d); if (CREW.indexOf(k) < 0) err("crewBonus " + k + ": id not in " + CREW.join("/")); }
    for (k in D.enemies) {
      d = D.enemies[k]; need("enemy", d); counts.enemies++;
      if (d.spawnable !== false && d.firstMin == null) err("enemy " + k + ": needs firstMin or spawnable:false");
      if (D.bosses[k]) err("enemy " + k + ": id also used by a boss");
    }
    for (k in D.bosses) { d = D.bosses[k]; need("boss", d); counts.bosses++; if (!d.phases || !d.phases.length || d.phases[0] !== 1) err("boss " + k + ": phases must start with 1"); }
    for (k in D.affixes) { need("affix", D.affixes[k]); counts.affixes++; }
    for (k in D.eprojStyles) { need("eprojStyle", D.eprojStyles[k]); counts.eprojStyles++; }
    for (k in D.maps) {
      d = D.maps[k]; need("map", d); counts.maps++;
      for (var sw in (d.spawnWeights || {})) ref("enemies", D.enemies, sw, "map " + k + " spawnWeights");
      if (d.surgeTypes) for (i = 0; i < d.surgeTypes.length; i++) ref("enemies", D.enemies, d.surgeTypes[i], "map " + k + " surgeTypes");
      if (d.boss) ref("bosses", D.bosses, d.boss, "map " + k + " boss");
      for (var ia in (d.interactables || {})) ref("maps", D.interactables, ia, "map " + k + " interactables");
      if (d.bias) for (var bt in d.bias) if (TAGS.indexOf(bt) < 0) err("map " + k + ": bad bias tag " + bt);
    }
    for (k in D.hazards) {
      d = D.hazards[k]; need("hazard", d); counts.hazards++;
      if (!/^(w|i|e|b|m)_/.test(k)) err("hazard " + k + ": id must be prefixed w_/i_/e_/b_/m_");
      if (["enemy", "player", "both"].indexOf(d.team) < 0) err("hazard " + k + ": bad team " + d.team);
    }
    for (k in D.interactables) {
      d = D.interactables[k]; need("interactable", d); counts.interactables++;
      if (d.costKind && ["tinsel", "hp", "free"].indexOf(d.costKind) < 0) err("interactable " + k + ": bad costKind " + d.costKind);
    }
    for (k in D.conditions) { need("condition", D.conditions[k]); counts.conditions++; if (CONDS.indexOf(k) < 0) err("condition " + k + ": id not in " + CONDS.join("/")); }
    for (k in D.operators) {
      d = D.operators[k]; need("operator", d); counts.operators++;
      ref("weapons", D.weapons, d.weapon, "operator " + k + " weapon");
      if (d.ability) ref("weapons_evo", D.abilities, d.ability, "operator " + k + " ability");
      unlock(d, "operator " + k);
    }
    for (k in D.achievements) {
      d = D.achievements[k]; need("achievement", d); counts.achievements++;
      if (d.on) for (i = 0; i < d.on.length; i++) if (COLD.indexOf(d.on[i]) < 0) err("achievement " + k + ": event " + d.on[i] + " is not a cold event");
      var rw = d.reward && d.reward.unlock;
      if (rw) for (i = 0; i < rw.length; i++) checkReward(rw[i], "achievement " + k);
    }
    function checkReward(s, label) {
      var parts = String(s).split(":");
      if (parts[0] === "flag") { if (parts[1] !== "kudzu" && parts[1] !== "overtimeDial") err(label + ": bad flag reward " + s); return; }
      if (parts[0] === "cosmetic") {
        var t = D.cosmetics[parts[1]];
        if (!t) { err(label + ": bad cosmetic kind in " + s); return; }
        ref("meta", t, parts[2], label + " reward");
        return;
      }
      var tk = REWARD_KIND[parts[0]];
      if (!tk || parts.length !== 2) { err(label + ": unparseable reward " + s); return; }
      ref(REWARD_FILE[parts[0]], D[tk], parts[1], label + " reward");
    }
    for (var ck in D.cosmetics) for (k in D.cosmetics[ck]) { need("cosmetic", D.cosmetics[ck][k]); counts.cosmetics++; }
    for (k in D.shop) {
      d = D.shop[k]; need("shop", d); counts.shop++;
      if (d.costs && d.costs.length !== (d.max || 5)) err("shop " + k + ": costs must have max entries");
    }
    for (k in D.abilities) need("ability", D.abilities[k]);
    for (k in STUB_OWNER) {
      if (KS[k] && KS[k]._stub) {
        if (fileMissing(STUB_OWNER[k])) warnings.push("stub KS." + k + " in use (js/game/" + STUB_OWNER[k] + ".js not loaded)");
        else err("stub: KS." + k + " is still the core stub although js/game/" + STUB_OWNER[k] + ".js loaded");
      }
    }
    return { errors: errors, counts: counts, warnings: warnings };
  };

  // ---------------------------------------------------------------------------
  // Sim plumbing
  // ---------------------------------------------------------------------------
  var SIM_DEF = { seconds: 120, map: "backforty", operator: "foreman", seed: 12345, autoPick: true, god: false, weapons: [], gear: [], items: {}, evolveAll: false,
    overtime: 0, stage: 0, tier: null, maxErrors: 20, condition: null, pilot: true };
  function silentUi(real) {
    var o = {}, k;
    for (k in real) o[k] = typeof real[k] === "function" ? function () {} : real[k];
    o.current = function () { return null; }; o.isOpen = function () { return false; }; o.samples = function () { return {}; };
    return o;
  }
  function spyStorage(passThrough) {
    var SP = window.Storage && window.Storage.prototype; if (!SP) return null;
    var o = { set: SP.setItem, rem: SP.removeItem, writes: [] };
    SP.setItem = function (k, v) { o.writes.push(String(k)); if (passThrough) return o.set.call(this, k, v); };
    SP.removeItem = function (k) { o.writes.push(String(k)); if (passThrough) return o.rem.call(this, k); };
    return o;
  }
  function unspy(o) { if (!o) return; var SP = window.Storage.prototype; SP.setItem = o.set; SP.removeItem = o.rem; }
  function sandboxState() { return typeof KS.meta.sandboxed === "boolean" ? KS.meta.sandboxed : !!(KS.params && KS.params.test !== null); }
  var depth = 0, saved = null;
  function enterSim(tier) {
    if (depth++ > 0) { if (tier) KS.setTier(tier); return; }
    saved = { headless: KS.headless, tier: KS.device.tier, sandbox: sandboxState(), ui: KS.ui, god: KS._god, spy: null };
    KS.headless = true; KS.G.simLock = true;
    try { KS.meta.sandbox(true); } catch (e) { KS.reportError("meta", e); }
    KS.setTier(tier || saved.tier);
    KS.setView(960, 540);
    KS.ui = silentUi(saved.ui);
    saved.spy = spyStorage(false);
  }
  function exitSim() {
    if (--depth > 0) return [];
    var s = saved, writes = s.spy ? s.spy.writes : [];
    unspy(s.spy);
    KS.ui = s.ui; KS._god = s.god; simPilot = true; KS.input.mx = 0; KS.input.my = 0; KS.input.moving = false;
    try { KS.meta.sandbox(s.sandbox); } catch (e) { KS.reportError("meta", e); }
    KS.headless = s.headless;
    KS.setTier(s.tier);
    KS.G.simLock = false;
    KS.toMenu();
    if (KS.params && KS.params.test !== null && KS.params.test !== "manual") { try { KS.ui.hide(); } catch (e2) { /* ignore */ } }
    return writes;
  }
  function finite(v) { return typeof v === "number" && v === v && v !== Infinity && v !== -Infinity; }
  function checkPool(pool, label, cap, out, t, hp) {
    var n = 0;
    for (var i = 0; i < pool.n; i++) {
      var o = pool.list[i]; if (!o.alive) continue; n++;
      if (!finite(o.x) || !finite(o.y) || (hp && !(o.hp === o.hp))) { out.push({ t: t, module: "test", msg: label + " NaN position/hp (" + (o.defId || o.type || o.style || "") + ")", stack: "" }); return n; }
    }
    if (cap != null && n > cap) out.push({ t: t, module: "test", msg: label + " count " + n + " > cap " + cap, stack: "" });
    return n;
  }
  function checkSecond(run, out) {
    var p = run.player, c = KS.device.caps, t = run.time;
    if (!finite(p.x) || !finite(p.y) || !(p.hp === p.hp)) out.push({ t: t, module: "test", msg: "player NaN", stack: "" });
    checkPool(run.enemies, "enemies", null, out, t, true);
    if (KS.enemyCount() > c.enemies) out.push({ t: t, module: "test", msg: "enemies " + KS.enemyCount() + " > cap " + c.enemies, stack: "" });
    checkPool(run.projectiles, "projectiles", c.projectiles, out, t, false);
    checkPool(run.eprojectiles, "eprojectiles", c.eprojectiles, out, t, false);
    checkPool(run.pickups, "pickups", c.pickups, out, t, false);
    checkPool(run.hazards, "hazards", c.hazards, out, t, false);
    if (run.telegraphs.n > 64) out.push({ t: t, module: "test", msg: "telegraphs > 64", stack: "" });
    if (!(run.coeff <= 500)) out.push({ t: t, module: "test", msg: "coeff " + run.coeff + " > 500", stack: "" });
    if (!(run.tinsel <= 1e9)) out.push({ t: t, module: "test", msg: "tinsel > 1e9", stack: "" });
  }
  function hashRun(run) {
    var h = 2166136261 >>> 0;
    function mix(v) { v = Math.round(v * 100) | 0; h ^= v; h = Math.imul(h, 16777619) >>> 0; h ^= (v >>> 16); h = Math.imul(h, 16777619) >>> 0; }
    var p = run.player; mix(run.time); mix(p.x); mix(p.y); mix(p.hp); mix(run.kills); mix(run.level); mix(run.tinsel); mix(run.stagesCleared);
    var l = run.enemies.list;
    for (var i = 0; i < run.enemies.n; i++) { var e = l[i]; if (!e.alive) continue; mix(e.x); mix(e.y); mix(Math.min(e.hp, 1e9)); }
    return (h >>> 0).toString(16);
  }
  function prepRun(o) {
    KS._god = !!o.god;
    var run = KS.startRun({ operator: o.operator, map: o.map, seed: o.seed, overtime: o.overtime, condition: o.condition || null });
    if (o.stage > 0) {
      run.stagesCleared = o.stage; run.stageIndex = o.stage; run.season = Math.floor(o.stage / 5);
      KS.loadStage(run.mapOrder[o.stage % run.mapOrder.length], o.condition || null);
    }
    var i, w;
    for (i = 0; i < o.weapons.length; i++) { w = KS.weaponsOwned(run, o.weapons[i]) || KS.addWeapon(o.weapons[i]); if (w) KS.levelWeapon(w, 7); }
    for (i = 0; i < o.gear.length; i++) { var g = KS.addGear(o.gear[i]); if (g) KS.levelGear(g, 4); }
    for (var id in o.items) { try { KS.items.give(id, o.items[id], "test"); } catch (e) { KS.reportError("items", e); } }
    if (o.evolveAll) evolveAll(run);
    return run;
  }
  function evolveAll(run) {
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i];
      if (w && w.def.evolvesTo && KS.defs.weapons[w.def.evolvesTo]) { KS.levelWeapon(w, 8); KS.replaceWeapon(w, w.def.evolvesTo); }
    }
  }
  /** Deterministic autopilot (sim only): walk to the nearest pickup within 600 px, else
   *  sidestep the nearest enemy closer than 90 px, else drift on a slow circle. Writes KS.input.mx/my
   *  (frame() normally owns them; it does not run during a sim). Off with sim({pilot:false}). */
  var simPilot = true;
  function pilot(run, i) {
    var p = run.player, inp = KS.input, pk = run.pickups, best = 360000, tx = 0, ty = 0, found = false, j, dx, dy, d;
    for (j = 0; j < pk.n; j++) {
      var g = pk.list[j]; if (!g.alive) continue;
      dx = g.x - p.x; dy = g.y - p.y; d = dx * dx + dy * dy;
      if (d < best) { best = d; tx = dx; ty = dy; found = true; }
    }
    if (!found) {
      var en = run.enemies; best = 8100;
      for (j = 0; j < en.n; j++) {
        var e = en.list[j]; if (!e.alive) continue;
        dx = p.x - e.x; dy = p.y - e.y; d = dx * dx + dy * dy;
        if (d < best) { best = d; tx = -dy; ty = dx; found = true; }
      }
    }
    if (!found) { var a = i * 0.004; tx = Math.cos(a); ty = Math.sin(a); }
    d = Math.sqrt(tx * tx + ty * ty);
    if (d > 1e-6) { inp.mx = tx / d; inp.my = ty / d; } else { inp.mx = 0; inp.my = 0; }
    inp.moving = inp.mx !== 0 || inp.my !== 0;
  }
  /** Steps the current run for `seconds`; returns {steps, sumMs, maxMs, peaks}. */
  async function stepFor(run, seconds, problems, errStart, maxErrors, perSecond) {
    var steps = Math.round(Math.min(300, seconds) * 60), r = { steps: 0, sumMs: 0, maxMs: 0, projPeak: 0, eprojPeak: 0, hazardPeak: 0 };
    for (var i = 1; i <= steps; i++) {
      if (KS.run !== run || run.ended) break;
      if (KS.G.mode !== "play") {
        problems.push({ t: run.time, module: "test", msg: "overlay not resolved headlessly: mode " + KS.G.mode, stack: "" });
        KS.closeOverlay();
        if (KS.G.mode !== "play") break;
      }
      if (simPilot) pilot(run, i);
      var t0 = now(); KS.step(); var dt = now() - t0;
      r.sumMs += dt; if (dt > r.maxMs) r.maxMs = dt; r.steps++;
      if (run.projectiles.n > r.projPeak) r.projPeak = run.projectiles.n;
      if (run.eprojectiles.n > r.eprojPeak) r.eprojPeak = run.eprojectiles.n;
      if (run.hazards.n > r.hazardPeak) r.hazardPeak = run.hazards.n;
      if (i % 60 === 0) { checkSecond(run, problems); if (perSecond) perSecond(run, i / 60); }
      if (i % 600 === 0) await yieldNow();
      if (KS.errors.length - errStart + problems.length >= maxErrors) break;
    }
    return r;
  }

  T.sim = async function (opts) {
    var o = merge(SIM_DEF, opts);
    o.seconds = Math.min(300, o.seconds);
    var errStart = KS.errors.length, problems = [], stats = null, writes = [];
    enterSim(o.tier === "phone" ? "phone" : (o.tier === "desktop" ? "desktop" : null));
    simPilot = o.pilot !== false;
    try {
      var run = prepRun(o);
      var r = await stepFor(run, o.seconds, problems, errStart, o.maxErrors, null);
      var ws = [];
      for (var i = 0; i < 6; i++) { var w = run.weapons[i]; if (w) ws.push({ id: w.id, level: w.level, dmgDealt: Math.round(w.dmgDealt), kills: w.kills }); }
      var itemN = 0; for (var k in run.items) itemN += run.items[k];
      stats = { simSeconds: Math.round(run.time * 100) / 100, dead: run.ended && !run.player.alive, deathTime: run.ended && !run.player.alive ? Math.round(run.time) : null,
        level: run.level, kills: run.kills, stagesCleared: run.stagesCleared, tier: run.tier, enemyPeak: run.perf.enemyPeak, projPeak: r.projPeak, eprojPeak: r.eprojPeak,
        hazardPeak: r.hazardPeak, procMax: run.perf.procMax, procDrops: run.perf.procDrops, itemProjDrops: run.perf.itemProjDrops,
        avgStepMs: r.steps ? Math.round(r.sumMs / r.steps * 1000) / 1000 : 0, maxStepMs: Math.round(r.maxMs * 100) / 100, hp: Math.round(run.player.hp),
        weapons: ws, items: itemN, errorsByModule: {}, hash: hashRun(run) };
    } catch (e) {
      problems.push({ t: KS.run ? KS.run.time : 0, module: "test", msg: "sim threw: " + (e && e.message), stack: String(e && e.stack || "").slice(0, 300) });
    } finally { writes = exitSim(); }
    var errors = KS.errors.slice(errStart).concat(problems);
    if (writes.length) errors.push({ t: 0, module: "test", msg: "storage written during sandboxed sim: " + writes.slice(0, 5).join(", "), stack: "" });
    if (stats) for (var j = 0; j < errors.length; j++) stats.errorsByModule[errors[j].module] = (stats.errorsByModule[errors[j].module] || 0) + 1;
    return { ok: errors.length === 0 && !!stats, errors: errors.slice(0, 50), stats: stats };
  };

  T.determinism = async function (opts) {
    var o = merge({ seconds: 60 }, opts);
    var a = await T.sim(o), b = await T.sim(o);
    return !!(a.stats && b.stats && a.stats.hash === b.stats.hash);
  };

  // ---------------------------------------------------------------------------
  // spawnAll: every def exercised in isolation (segments attribute errors per def)
  // ---------------------------------------------------------------------------
  var TSRC = null;
  T.spawnAll = async function (opts) {
    var o = merge({ seed: 4242, map: null }, opts);
    var D = KS.defs, perDef = {}, all = [], k, i;
    if (!TSRC) { TSRC = KS.makeSrc(); TSRC.slot = 7; TSRC.tag = "test"; TSRC.canCrit = false; }
    enterSim(null);
    async function seg(label, seconds, setup, every) {
      var errStart = KS.errors.length, problems = [];
      try {
        KS._god = true;
        var run = KS.startRun({ operator: "foreman", map: o.map || firstMap(), seed: o.seed });
        if (setup) setup(run);
        await stepFor(run, seconds, problems, errStart, 10, every || null);
      } catch (e) { problems.push({ t: 0, module: "test", msg: label + " threw: " + (e && e.message), stack: String(e && e.stack || "").slice(0, 300) }); }
      var errs = KS.errors.slice(errStart).concat(problems);
      perDef[label] = errs.length ? (errs[0].module + ": " + errs[0].msg) : "ok";
      for (var j = 0; j < errs.length; j++) all.push(errs[j]);
      return errs.length === 0;
    }
    function ring(run, n, r) { var p = run.player; var out = []; for (var j = 0; j < n; j++) { var a = j / n * Math.PI * 2; out.push([p.x + Math.cos(a) * r, p.y + Math.sin(a) * r]); } return out; }
    function targets(run, n) { var pts = ring(run, n || 12, 220); for (var j = 0; j < pts.length; j++) KS.spawnEnemy("_dummy", pts[j][0], pts[j][1], { hpMul: 20 }); }
    try {
      // (a) enemies + affixes
      var enemyIds = ["_dummy"].concat(keys(D.enemies));
      for (i = 0; i < enemyIds.length; i++) {
        var eid = enemyIds[i];
        await seg("enemy:" + eid, 10, function (run) { var pts = ring(run, 3, 260); for (var j = 0; j < 3; j++) KS.spawnEnemy(eid, pts[j][0], pts[j][1], null); });
      }
      var spawnables = keys(D.enemies).filter(function (id) { return D.enemies[id].spawnable !== false; });
      for (k in D.affixes) {
        var aid = k, base = spawnables.length ? spawnables[0] : "_dummy";
        await seg("affix:" + aid, 10, function (run) { var p = run.player; KS.spawnEnemy(base, p.x + 240, p.y, { elite: true, affixes: [aid] }); });
      }
      // (b) bosses
      for (k in D.bosses) {
        var bid = k, deaths = 0, boss = null;
        var onDeath = function () { deaths++; };
        KS.on("bossDeath", onDeath);
        await seg("boss:" + bid, 20, function (run) { var p = run.player; boss = KS.spawnBoss(bid, p.x + 300, p.y); }, function (run, sec) {
          if (!boss || !boss.alive) return;
          if (sec === 5) boss.hp = Math.min(boss.hp, boss.maxHp * 0.59);
          if (sec === 10) boss.hp = Math.min(boss.hp, boss.maxHp * 0.24);
          if (sec >= 14) {
            boss.invuln = false; KS.damage(boss, 1e12, TSRC);
            var l = run.enemies.list; for (var j = 0; j < run.enemies.n; j++) { var e = l[j]; if (e.alive && e.bossPart) { e.invuln = false; e.untargetable = false; KS.damage(e, 1e12, TSRC); } }
          }
        });
        KS.off("bossDeath", onDeath);
        if (deaths !== 1) { perDef["boss:" + bid] = "bossDeath fired " + deaths + " times (expected 1)"; all.push({ t: 0, module: "test", msg: perDef["boss:" + bid], stack: "" }); }
      }
      // (c) weapons: base in batches of 6 at Lv8, then evolved; then fusions
      var base = keys(D.weapons).filter(function (id) { return !D.weapons[id].evolved && !D.weapons[id].fusion; });
      base.unshift("_pea");
      for (i = 0; i < base.length; i += 6) {
        var batch = base.slice(i, i + 6);
        await seg("weapons:" + batch.join(","), 10, function (run) {
          for (var j = 0; j < 6; j++) if (run.weapons[j]) KS.removeWeapon(run.weapons[j]);
          for (j = 0; j < batch.length; j++) { var w = KS.addWeapon(batch[j]); if (w) KS.levelWeapon(w, 7); }
          targets(run, 16);
        });
        await seg("evolved:" + batch.join(","), 10, function (run) {
          for (var j = 0; j < 6; j++) if (run.weapons[j]) KS.removeWeapon(run.weapons[j]);
          for (j = 0; j < batch.length; j++) { var w = KS.addWeapon(batch[j]); if (w) KS.levelWeapon(w, 7); }
          evolveAll(run); targets(run, 16);
        });
      }
      for (k in D.weapons) {
        if (!D.weapons[k].fusion) continue;
        var fid = k, rec = D.weapons[k].recipe.weapons;
        await seg("fusion:" + fid, 10, function (run) {
          for (var j = 0; j < 6; j++) if (run.weapons[j]) KS.removeWeapon(run.weapons[j]);
          var a = KS.addWeapon(rec[0]), b = KS.addWeapon(rec[1]);
          if (a) { KS.levelWeapon(a, 7); KS.replaceWeapon(a, fid); }
          if (b) KS.removeWeapon(b);
          targets(run, 16);
        });
      }
      // (d) items x3 then x99
      for (k in D.items) {
        var iid = k;
        await seg("item:" + iid, 15, function (run) { KS.items.give(iid, 3, "test"); targets(run, 12); });
        await seg("item99:" + iid, 15, function (run) { KS.items.give(iid, 99, "test"); targets(run, 12); });
      }
      // (e) interactables
      for (k in D.interactables) {
        var xid = k;
        await seg("interactable:" + xid, 4, function (run) { run.tinsel = 1e6; var p = run.player; KS.spawnInteractable(xid, p.x, p.y, null); },
          function (run) { if (run.pendingConfirm) KS.confirmInteract(); });
      }
      // (f) hazards
      for (k in D.hazards) {
        var hid = k;
        await seg("hazard:" + hid, 5, function (run) { var p = run.player; targets(run, 8); KS.spawnHazard(hid, p.x + 40, p.y, { src: TSRC, dmg: 5 }); });
      }
      // (g) maps
      for (k in D.maps) { var mid = k; o.map = mid; await seg("map:" + mid, 10, null); o.map = null; }
      // (h) conditions
      for (k in D.conditions) {
        var cid = k;
        await seg("condition:" + cid, 10, function (run) { KS.loadStage(run.mapId, [cid]); });
      }
    } finally {
      var writes = exitSim();
      if (writes.length) all.push({ t: 0, module: "test", msg: "storage written during spawnAll: " + writes.slice(0, 5).join(", "), stack: "" });
    }
    return { ok: all.length === 0, errors: all.slice(0, 50), perDef: perDef };
  };
  function firstMap() { var best = null; for (var k in KS.defs.maps) { if (!best || (KS.defs.maps[k].order || 0) < (KS.defs.maps[best].order || 0)) best = k; } return best || "backforty"; }

  // ---------------------------------------------------------------------------
  // storage, ui, re-entry, bench
  // ---------------------------------------------------------------------------
  T.storage = function () {
    var notes = [], ok = true, m = KS.meta;
    if (m._stub) return { ok: true, notes: ["meta.js not loaded: core stub never touches storage"] };
    var prevStore = m.store, prevSandbox = sandboxState();
    try {
      m.store = { get: function () { throw new Error("blocked"); }, set: function () { throw new Error("blocked"); } };
      try { m.sandbox(false); } catch (e0) { notes.push("sandbox(false) threw"); ok = false; }
      try { m.load(); } catch (e1) { ok = false; notes.push("load threw with blocked storage: " + e1.message); }
      try { m.save(); m.saveNow(); } catch (e2) { ok = false; notes.push("save threw with blocked storage: " + e2.message); }
      try { m.recordRun({ reason: "quit", time: 1, stagesCleared: 0, season: 0, level: 1, kills: 0, killsByType: {}, bossKills: {}, eliteKills: 0, operatorId: "foreman", mapId: "backforty",
        startMap: "backforty", overtime: 0, daily: false, weapons: [], gear: [], items: {}, tinselSpent: 0, pay: 0, maxTier: 0, crits: 0, burnKills: 0, objectivesDone: [], counters: {} }); }
      catch (e3) { ok = false; notes.push("recordRun threw with blocked storage: " + e3.message); }
      if (m.storageOk !== false) { ok = false; notes.push("storageOk should be false with blocked storage"); }
    } finally { m.store = prevStore; }
    // key spy on a real save; previous values restored afterwards
    var snap = {}, had = {}, i, key;
    try { for (i = 0; i < localStorage.length; i++) { key = localStorage.key(i); if (key.indexOf("ksv2.") === 0) { snap[key] = localStorage.getItem(key); had[key] = true; } } }
    catch (e4) { notes.push("localStorage unavailable; key spy skipped"); try { m.sandbox(prevSandbox); } catch (e5) { /* ignore */ } return { ok: ok, notes: notes }; }
    var spy = spyStorage(true);
    try { m.sandbox(false); m.load(); m.saveNow(); } catch (e6) { ok = false; notes.push("real save threw: " + e6.message); }
    finally { unspy(spy); }
    for (i = 0; i < spy.writes.length; i++) if (spy.writes[i].indexOf("ksv2.") !== 0) { ok = false; notes.push("non-ksv2 key written: " + spy.writes[i]); }
    try {
      for (i = 0; i < spy.writes.length; i++) { key = spy.writes[i]; if (key.indexOf("ksv2.") !== 0) continue; if (had[key]) localStorage.setItem(key, snap[key]); else localStorage.removeItem(key); }
    } catch (e7) { notes.push("restore failed: " + e7.message); }
    try { m.sandbox(prevSandbox); if (prevSandbox) m.load(); } catch (e8) { /* ignore */ }
    notes.push(spy.writes.length + " write(s) observed");
    return { ok: ok, notes: notes };
  };

  T.ui = function () {
    var errStart = KS.errors.length, errors = [], samples = {};
    try { samples = KS.ui.samples() || {}; } catch (e) { errors.push("samples threw: " + e.message); }
    for (var id in samples) {
      try { KS.ui.show(id, samples[id]); } catch (e1) { errors.push(id + ": " + e1.message); }
    }
    try { KS.ui.hide(); } catch (e2) { errors.push("hide: " + e2.message); }
    var es = KS.errors.slice(errStart); for (var i = 0; i < es.length; i++) errors.push(es[i].module + ": " + es[i].msg);
    return { ok: errors.length === 0, errors: errors };
  };

  /** HIT/KILL re-entry: damage inside an onHit listener must not clobber the outer HIT object. */
  T.reentry = function () {
    var notes = [], ok = true;
    enterSim(null);
    var errStart = KS.errors.length;
    try {
      var run = KS.startRun({ operator: "foreman", map: firstMap(), seed: 99 });
      KS.step();
      var p = run.player, a = KS.spawnEnemy("_dummy", p.x + 200, p.y, { hpMul: 1000 }), b = KS.spawnEnemy("_dummy", p.x - 200, p.y, { hpMul: 1000 });
      var src = KS.makeSrc(), inner = KS.makeSrc(); inner.depth = 1; inner.canCrit = false; src.canCrit = false;
      var seen = 0, nestedOk = true;
      var fn = function (H) {
        seen++;
        if (H.enemy === a && H.src === src) {
          var outer = H;
          KS.damage(b, 1, inner);
          if (outer.enemy !== a || outer.src !== src) nestedOk = false;
          var kill = KS.spawnEnemy("_dummy", p.x, p.y + 200, null);
          if (kill) KS.damage(kill, 1e9, inner);
          if (outer.enemy !== a) nestedOk = false;
        }
      };
      KS.on("hit", fn);
      KS.damage(a, 1, src);
      KS.off("hit", fn);
      if (seen < 3) { ok = false; notes.push("expected 3 hit events, saw " + seen); }
      if (!nestedOk) { ok = false; notes.push("outer HIT object clobbered by nested damage"); }
    } catch (e) { ok = false; notes.push("threw: " + e.message); }
    var es = KS.errors.slice(errStart);
    if (es.length) { ok = false; notes.push(es[0].module + ": " + es[0].msg); }
    exitSim();
    return { ok: ok, notes: notes };
  };

  T.bench = function (opts) {
    var o = merge({ seconds: 10, enemies: 400 }, opts);
    return new Promise(function (resolve) {
      var prevGod = KS._god; KS._god = true;
      var run = KS.startRun({ operator: "foreman", map: firstMap(), seed: 777 });
      var t0 = now(), lastT = t0, frames = 0, sum = 0, minFps = 1e9, stepSum = 0, renderSum = 0;
      function top() {
        var p = run.player, need = Math.min(80, o.enemies - KS.enemyCount());
        for (var j = 0; j < need; j++) { var a = KS.frand() * Math.PI * 2, r = 250 + KS.frand() * 350; KS.spawnEnemy("_dummy", p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, { hpMul: 50 }); }
      }
      function tick() {
        var t = now(), ft = t - lastT; lastT = t;
        if (frames > 0 && ft > 0) { sum += ft; var f = 1000 / ft; if (f < minFps) minFps = f; stepSum += KS.perfStats.stepMs; renderSum += KS.perfStats.renderMs; }
        frames++;
        if (KS.run === run && KS.G.mode === "play") top();
        if (t - t0 < o.seconds * 1000 && KS.run === run) window.requestAnimationFrame(tick);
        else {
          KS._god = prevGod; KS.toMenu();
          var n = Math.max(1, frames - 1);
          resolve({ fpsAvg: Math.round(1000 / (sum / n) * 10) / 10, fpsMin: Math.round(minFps * 10) / 10, stepMsAvg: Math.round(stepSum / n * 100) / 100, renderMsAvg: Math.round(renderSum / n * 100) / 100 });
        }
      }
      window.requestAnimationFrame(tick);
    });
  };

  function brief(r) { return r ? { ok: r.ok, errors: (r.errors || []).slice(0, 10), stats: r.stats } : null; }
  T.runAll = async function () {
    var out = {}, t0 = now();
    show("Kudzu Survivors test run in progress...");
    out.validate = T.validateDefs();
    out.sim = brief(await T.sim({}));
    out.determinism = await T.determinism({ seconds: 60 });
    out.spawnAll = await T.spawnAll({});
    out.phoneSim = brief(await T.sim({ tier: "phone", seconds: 300 }));
    out.simLong = brief(await T.sim({ seconds: 300, god: false, stage: 2 }));
    out.storage = T.storage();
    out.ui = T.ui();
    out.reentry = T.reentry();
    out.ok = out.validate.errors.length === 0 && out.sim.ok && out.determinism && out.spawnAll.ok && out.phoneSim.ok && out.simLong.ok && out.storage.ok && out.ui.ok && out.reentry.ok;
    out.seconds = Math.round((now() - t0) / 100) / 10;
    window.KS_TEST_RESULT = out;
    var lines = ["KUDZU SURVIVORS v2 TEST RUN: " + (out.ok ? "ALL GREEN" : "FAILURES") + " (" + out.seconds + " s)", "",
      "validate     " + (out.validate.errors.length ? "FAIL " + out.validate.errors.length : "ok") + "  counts " + JSON.stringify(out.validate.counts),
      "sim 120s     " + okStr(out.sim), "determinism  " + (out.determinism ? "ok" : "FAIL"), "spawnAll     " + (out.spawnAll.ok ? "ok" : "FAIL") + " (" + keys(out.spawnAll.perDef).length + " segments)",
      "phoneSim     " + okStr(out.phoneSim), "simLong      " + okStr(out.simLong), "storage      " + (out.storage.ok ? "ok" : "FAIL"), "ui           " + (out.ui.ok ? "ok" : "FAIL"),
      "reentry      " + (out.reentry.ok ? "ok" : "FAIL"), "", JSON.stringify(out, null, 1)];
    show(lines.join("\n"));
    return out;
  };
  function okStr(r) { return !r ? "FAIL" : (r.ok ? "ok" : "FAIL") + (r.stats ? "  lvl " + r.stats.level + " kills " + r.stats.kills + " stages " + r.stats.stagesCleared + " avgStep " + r.stats.avgStepMs + "ms" : ""); }
  function show(text) {
    if (!(KS.params && KS.params.test !== null && KS.params.test !== "manual")) return;
    var pre = document.getElementById("ks-test-out");
    if (!pre) {
      pre = document.createElement("pre"); pre.id = "ks-test-out";
      pre.style.cssText = "position:fixed;inset:0;margin:0;padding:16px;overflow:auto;z-index:9999;background:#f4ead5;color:#2a1f1a;font:12px/1.4 Consolas,monospace;white-space:pre-wrap";
      document.body.appendChild(pre);
    }
    pre.textContent = text;
  }
})(window.KS);
