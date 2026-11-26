/* Kudzu Survivors v2 - levelup.js (ENG-LOOT)
 * KS.levelup: level-up offers (weights, quality, hold, reroll, banish, skip, filler, Elbow Grease)
 * KS.loot: item rolls, crates, evolutions, fusions, counter / gang box / shrine / bench choices.
 * Everything cross-module is resolved at call time (CONTRACT 2.8). */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT (all player-facing strings live here for review)
  // ---------------------------------------------------------------------------
  var TEXT = {
    cookieName: "Cookie Break", cookieDesc: "Sit down for five. Heal 30% of your max HP.", cookieIcon: "🍪",
    chipsName: "Bonus Chips", chipsDesc: "Cashing in the chip bag. +40% of the next level in XP.", chipsIcon: "🥔",
    cashName: "Petty Cash", cashDesc: "Found in the cab cupholder. A little Tinsel for the road.", cashIcon: "💵",
    skipToast: "Clocked out early: +{pay} Peppermint Pay",
    greaseNames: ["Elbow Grease: might +2%", "Elbow Grease: area +2%", "Elbow Grease: cooldown -1%", "Elbow Grease: max HP +5", "Elbow Grease: magnet +3%"],
    overhaulReady: "{name} is ready to overhaul. Find a Supply Crate.",
    crateEvolveTitle: "Overhaul Complete", crateEvolveNote: "The crew ran a full service on your gear.",
    crateTitle: "Supply Crate", crateNote: "Pick one. The rest goes back on the shelf.",
    goldTitle: "Gold Toolbox", goldNote: "Boss bonus. Pick one.",
    counterTitle: "Parts Counter", counterNote: "No refunds at the counter. Pick one.",
    gangTitle: "Gang Box", gangNote: "Take one of the two. No refunds at the box.",
    shrineTitle: "Overgrown Stump Shrine", shrineNote: "Take the deal for this stage, pay for it on the next. Or leave it be.",
    benchTitle: "Shop Bench", benchNote: "Fuse two maxed tools into one. No refunds at the bench.",
    benchNone: "Nothing to fuse yet. You need two weapons at level 8.",
    shrineBusy: "The shrine is humming. Finish your current contract first.",
    shrineEmpty: "The shrine has nothing to offer right now."
  };
  KS.LEVELUP_TEXT = TEXT;

  var RARITY_ORDER = ["common", "uncommon", "rare", "legendary"];

  function defs() { return KS.defs; }
  function unlocked(kind, id) {
    try { return KS.meta.isUnlocked(kind, id) !== false; } catch (e) { return true; }
  }
  function toast(text, kind) {
    if (KS.headless) return;
    try { KS.ui.toast(text, kind || "info"); } catch (e) { /* ui may be a stub */ }
  }

  // ---------------------------------------------------------------------------
  // Elbow Grease: the bonus after everything is maxed. Registered as a buff.
  // ---------------------------------------------------------------------------
  KS.registerBuff({
    id: "grease",
    stats: function (S, run) {
      var n = run.grease | 0; if (n <= 0) return;
      var c0 = Math.floor((n + 4) / 5), c1 = Math.floor((n + 3) / 5), c2 = Math.floor((n + 2) / 5), c3 = Math.floor((n + 1) / 5), c4 = Math.floor(n / 5);
      S.might += 0.02 * c0;
      S.area += 0.02 * c1;
      S.cooldown -= 0.01 * c2;
      S.maxHp += 5 * c3;
      S.magnet *= 1 + 0.03 * c4;
    }
  });

  function applyGrease(run) {
    var i = run.grease % 5;
    run.grease++;
    KS.addBuff("grease", Infinity);
    KS.recalcStats();
    KS.sfx("pickup");
    toast(TEXT.greaseNames[i], "info");
  }

  // ---------------------------------------------------------------------------
  // Offer construction
  // ---------------------------------------------------------------------------
  function fmt(v) {
    if (typeof v !== "number" || v !== v) return "0";
    var a = Math.abs(v);
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return String(Math.round(v * 10) / 10);
    return String(Math.round(v * 100) / 100);
  }

  // candidate pool entry: {cardId, kind, id, w/g owned ref, weight, def}
  function buildPool(run) {
    var D = defs(), out = [], i, id, def, w, g, wt;
    var bias = run.mapDef && run.mapDef.bias ? run.mapDef.bias : null;
    var freeW = run.weapons.indexOf(null) >= 0, freeG = run.gear.indexOf(null) >= 0;
    var ownedBase = {};
    for (i = 0; i < 6; i++) { w = run.weapons[i]; if (w) ownedBase[w.def.from || w.id] = true; ownedBase[w ? w.id : "_"] = true; }
    var ownedGear = {};
    for (i = 0; i < 6; i++) { g = run.gear[i]; if (g) ownedGear[g.id] = g; }
    // owned weapons below max
    for (i = 0; i < 6; i++) {
      w = run.weapons[i];
      if (!w || w.def.evolved || w.def.fusion || w.level >= 8) continue;
      wt = 10;
      if (w.def.partner && ownedGear[w.def.partner]) wt *= 1.5;
      if (bias && bias[w.def.tag]) wt *= bias[w.def.tag];
      out.push({ cardId: "w:" + w.id, kind: "weapon", id: w.id, def: w.def, owned: w, weight: wt });
    }
    // new weapons
    if (freeW) {
      for (id in D.weapons) {
        def = D.weapons[id];
        if (def.evolved || def.fusion || ownedBase[id] || id.charAt(0) === "_") continue;
        if (!unlocked("weapon", id)) continue;
        wt = 7;
        if (def.partner && ownedGear[def.partner]) wt *= 1.5;
        if (bias && bias[def.tag]) wt *= bias[def.tag];
        out.push({ cardId: "w:" + id, kind: "weapon", id: id, def: def, owned: null, weight: wt });
      }
    }
    // gear: owned below max, new if slot free
    for (i = 0; i < 6; i++) {
      g = run.gear[i];
      if (!g || g.level >= (g.def.maxLevel || 5)) continue;
      out.push({ cardId: "g:" + g.id, kind: "gear", id: g.id, def: g.def, owned: g, weight: 8 * (gearPartnered(run, g.def) ? 1.5 : 1) });
    }
    if (freeG) {
      for (id in D.gear) {
        if (ownedGear[id]) continue;
        def = D.gear[id];
        if (!unlocked("gear", id)) continue;
        out.push({ cardId: "g:" + id, kind: "gear", id: id, def: def, owned: null, weight: 6 * (gearPartnered(run, def) ? 1.5 : 1) });
      }
    }
    // exclusions
    var n = 0;
    for (i = 0; i < out.length; i++) if (!run.banished[out[i].cardId]) out[n++] = out[i];
    out.length = n;
    return out;
  }
  function gearPartnered(run, gdef) {
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i];
      if (w && (w.def.partner === gdef.id || gdef.partnerOf === w.id)) return true;
    }
    return false;
  }

  function makeCard(run, ent) {
    var S = run.stats, def = ent.def, owned = ent.owned, luck = S.luck || 0;
    var max = ent.kind === "weapon" ? 8 : (def.maxLevel || 5);
    var from = owned ? owned.level : 0, quality = "normal", extra = 0;
    if (owned && from + 1 < max) {
      var r = KS.rng.next();
      if (r < 0.02 * (1 + luck)) { quality = "gilded"; extra = 2; }
      else if (r < 0.02 * (1 + luck) + 0.08 * (1 + luck)) { quality = "polished"; extra = 1; }
    }
    var to = Math.min(max, from + 1 + extra);
    if (to === from + 1) quality = "normal";
    var deltas = [], i;
    var evo = null, tags = def.tag ? [def.tag] : [];
    if (ent.kind === "weapon") {
      var labels = def.labels || {}, k, cnt = 0;
      for (k in labels) {
        if (cnt >= 4) break;
        var b = KS.wstatAt(def, to, k);
        if (owned) {
          var a = KS.wstatAt(def, from, k);
          if (a === b) continue;
          deltas.push([labels[k], fmt(a), fmt(b)]);
        } else {
          deltas.push([labels[k], "-", fmt(b)]);
        }
        cnt++;
      }
      if (def.tags2) for (i = 0; i < def.tags2.length; i++) tags.push(def.tags2[i]);
      if (def.partner) {
        var pg = defs().gear[def.partner];
        if (pg) {
          var own = false;
          for (i = 0; i < 6; i++) if (run.gear[i] && run.gear[i].id === def.partner) own = true;
          evo = { partnerId: def.partner, partnerIcon: pg.icon, owned: own };
        }
      }
    } else {
      var dl = null;
      if (typeof def.deltas === "function") { try { dl = def.deltas(to); } catch (e) { dl = null; } }
      if (dl && dl.length) { for (i = 0; i < dl.length && i < 4; i++) deltas.push(dl[i]); }
      var pw = null, pid = def.partnerOf;
      if (!pid) {
        for (var wid in defs().weapons) { if (defs().weapons[wid].partner === def.id && !defs().weapons[wid].evolved) { pid = wid; break; } }
      }
      if (pid) pw = defs().weapons[pid];
      if (pw) {
        var ow = false;
        for (i = 0; i < 6; i++) if (run.weapons[i] && (run.weapons[i].id === pid || run.weapons[i].def.from === pid)) ow = true;
        evo = { partnerId: pid, partnerIcon: pw.icon, owned: ow };
      }
    }
    var desc = "";
    try { desc = ent.kind === "gear" ? (typeof def.desc === "function" ? def.desc(to) : String(def.desc || "")) : String(def.desc || ""); } catch (e2) { desc = ""; }
    return { cardId: ent.cardId, kind: ent.kind, id: ent.id, name: def.name, icon: def.icon, fromLevel: from, toLevel: to, quality: quality,
      isNew: !owned, deltas: deltas, tags: tags, evoHint: evo, desc: desc };
  }

  function fillerCard(kind) {
    var name, desc, icon;
    if (kind === "cookie") { name = TEXT.cookieName; desc = TEXT.cookieDesc; icon = TEXT.cookieIcon; }
    else if (kind === "chips") { name = TEXT.chipsName; desc = TEXT.chipsDesc; icon = TEXT.chipsIcon; }
    else { name = TEXT.cashName; desc = TEXT.cashDesc; icon = TEXT.cashIcon; }
    return { cardId: "f:" + kind, kind: "filler", id: kind, name: name, icon: icon, fromLevel: 0, toLevel: 0, quality: "normal", isNew: false,
      deltas: [], tags: [], evoHint: null, desc: desc };
  }
  var FILLERS = ["cookie", "chips", "cash"];

  // Weighted draw (no replacement) of up to `count` cards, skipping ids in `skip` (object map).
  function draw(run, pool, count, skip) {
    var cards = [], tries = 0;
    var avail = [], i;
    for (i = 0; i < pool.length; i++) if (!skip[pool[i].cardId]) avail.push(pool[i]);
    while (cards.length < count && avail.length && tries++ < 20) {
      var tot = 0;
      for (i = 0; i < avail.length; i++) tot += avail[i].weight;
      var r = KS.rng.next() * tot, pick = avail.length - 1;
      for (i = 0; i < avail.length; i++) { r -= avail[i].weight; if (r <= 0) { pick = i; break; } }
      var ent = avail.splice(pick, 1)[0];
      cards.push(makeCard(run, ent));
    }
    return cards;
  }

  var cur = null; // { run, cards, holdUsed }

  function offerData(run) {
    var prof = null; try { prof = KS.meta.profile; } catch (e) { prof = null; }
    var runs = prof && prof.stats ? prof.stats.runs : 1;
    return {
      cards: cur.cards, rerolls: run.rerolls, banishes: run.banishes, canHold: !cur.holdUsed, heldId: run.held,
      showBanishHold: runs > 0 || run.stagesCleared > 0 || run.level > 8
    };
  }

  // Build the card list. keep = array of cards to retain at the same positions (null = redraw).
  function buildCards(run, keep) {
    var pool = buildPool(run), count = Math.round(run.stats.cards) || 3;
    if (count < 3) count = 3; if (count > 5) count = 5;
    if (!pool.length) return [];
    var cards = [], skip = {}, i;
    // held card first, if still valid
    if (run.held) {
      var found = null;
      for (i = 0; i < pool.length; i++) if (pool[i].cardId === run.held) found = pool[i];
      if (found) { cards.push(makeCard(run, found)); skip[found.cardId] = true; } else run.held = null;
    }
    if (keep) {
      for (i = 0; i < keep.length; i++) if (keep[i] && !skip[keep[i].cardId]) { cards.push(keep[i]); skip[keep[i].cardId] = true; }
    }
    var more = draw(run, pool, count - cards.length, skip);
    for (i = 0; i < more.length; i++) cards.push(more[i]);
    // filler to at least 3 cards
    var f = 0;
    while (cards.length < 3 && f < FILLERS.length) cards.push(fillerCard(FILLERS[f++]));
    return cards;
  }

  function show(run, reopen) {
    var data = { offer: offerData(run), onAction: KS.levelup.act };
    if (reopen) { if (!KS.headless) { try { KS.ui.show("levelup", data); } catch (e) { KS.reportError("levelup", e); } } }
    else KS.openOverlay("levelup", "levelup", data);
  }

  function open(run) {
    run = run || KS.run; if (!run) return false;
    var cards = buildCards(run, null);
    if (!cards.length) { applyGrease(run); return false; }
    cur = { run: run, cards: cards, holdUsed: false };
    show(run, false);
    return true;
  }

  function applyCard(run, card) {
    var w, g;
    if (card.kind === "weapon") {
      w = KS.weaponsOwned(run, card.id);
      if (w) KS.levelWeapon(w, card.toLevel - w.level);
      else {
        w = KS.addWeapon(card.id);
        if (w && card.toLevel > 1) KS.levelWeapon(w, card.toLevel - 1);
      }
      if (w && w.level >= 8 && w.def.partner && !w.def.evolved) {
        var have = false;
        for (var i = 0; i < 6; i++) if (run.gear[i] && run.gear[i].id === w.def.partner) have = true;
        if (have) toast(TEXT.overhaulReady.replace("{name}", w.def.name), "info");
      }
    } else if (card.kind === "gear") {
      g = null;
      for (var j = 0; j < 6; j++) if (run.gear[j] && run.gear[j].id === card.id) g = run.gear[j];
      if (g) KS.levelGear(g, card.toLevel - g.level);
      else { g = KS.addGear(card.id); if (g && card.toLevel > 1) KS.levelGear(g, card.toLevel - 1); }
    } else if (card.id === "cookie") {
      KS.healPlayer(run.stats.maxHp * 0.3, "filler");
    } else if (card.id === "chips") {
      KS.addXP(Math.max(1, run.xpNext * 0.4 / (run.stats.xpMul || 1)));
    } else {
      KS.addTinsel(25 * run.coeff);
    }
  }

  function act(action) {
    if (!cur || !action) return;
    var run = cur.run, i, idx = action.index | 0, card = cur.cards[idx];
    if (action.type === "pick") {
      if (!card) return;
      if (run.held === card.cardId) run.held = null;
      cur = null;
      applyCard(run, card);
      KS.sfx("levelup");
      KS.closeOverlay();
    } else if (action.type === "skip") {
      cur = null;
      var pay = 5 * (1 + 0.1 * run.stagesCleared);
      KS.addPay(pay);
      KS.healPlayer(10, "skip");
      toast(TEXT.skipToast.replace("{pay}", fmt(pay * run.stats.payMul)), "info");
      KS.closeOverlay();
    } else if (action.type === "reroll") {
      if (run.rerolls <= 0) return;
      run.rerolls--;
      var keep = [];
      cur.cards = buildCards(run, keep);
      if (!cur.cards.length) { cur = null; KS.closeOverlay(); return; }
      show(run, true);
    } else if (action.type === "banish") {
      if (run.banishes <= 0 || !card || card.kind === "filler") return;
      run.banishes--;
      run.banished[card.cardId] = true;
      if (run.held === card.cardId) run.held = null;
      var keepc = [];
      for (i = 0; i < cur.cards.length; i++) if (i !== idx && cur.cards[i].kind !== "filler") keepc.push(cur.cards[i]);
      cur.cards = buildCards(run, keepc);
      if (!cur.cards.length) { cur = null; applyGrease(run); KS.closeOverlay(); return; }
      show(run, true);
    } else if (action.type === "hold") {
      if (!card || card.kind === "filler") return;
      if (run.held === card.cardId) run.held = null;
      else if (!cur.holdUsed) { run.held = card.cardId; cur.holdUsed = true; }
      else return;
      show(run, true);
    }
  }

  function autoPick(run) {
    run = run || KS.run;
    if (!cur) { if (!run || !open(run)) { if (KS.overlayOpen()) KS.closeOverlay(); return; } }
    if (!cur) { KS.closeOverlay(); return; }
    var best = -1, bw = -1, i;
    for (i = 0; i < cur.cards.length; i++) {
      var c = cur.cards[i], sc = c.kind === "weapon" ? 3 : (c.kind === "gear" ? 2 : 0.5);
      sc += KS.rng.next() * 2 + (c.quality === "gilded" ? 1 : 0);
      if (sc > bw) { bw = sc; best = i; }
    }
    act({ type: "pick", index: best < 0 ? 0 : best });
  }

  KS.levelup = { open: open, act: act, autoPick: autoPick };

  // ---------------------------------------------------------------------------
  // KS.loot
  // ---------------------------------------------------------------------------
  function itemsOfRarity(rar) {
    var out = [], I = defs().items, id;
    for (id in I) if (I[id].rarity === rar && unlocked("item", id)) out.push(id);
    return out;
  }
  function rarityPick(table, luck) {
    var r = KS.rng.next() * 100, s;
    switch (table) {
      case "toolbox":
        s = Math.min(25, 50 * luck);
        if (r < 3 + s * 0.16) return "rare";
        if (r < 3 + s * 0.16 + 27 + s * 0.84) return "uncommon";
        return "common";
      case "gangbox": return r < 25 ? "rare" : "uncommon";
      case "trailer": return r < 6 ? "legendary" : "rare";
      case "supplycrate": return r < 5 ? "rare" : (r < 40 ? "uncommon" : "common");
      case "goldbox": return r < 10 ? "legendary" : "rare";
      case "uncommon": return "uncommon";
      case "kudzu": return "kudzu";
      default: return "common"; // counter, raffle
    }
  }

  // Returns an item id or null. `skip` (optional object map) excludes ids.
  function roll(table, run, skip) {
    run = run || KS.run;
    var luck = run && run.stats ? run.stats.luck : 0;
    var rar = rarityPick(table, luck);
    var tries = 0, list, ids;
    ids = [rar];
    if (rar !== "kudzu") {
      var ri = RARITY_ORDER.indexOf(rar), k;
      for (k = ri - 1; k >= 0; k--) ids.push(RARITY_ORDER[k]);
      for (k = ri + 1; k < RARITY_ORDER.length; k++) ids.push(RARITY_ORDER[k]);
    }
    for (; tries < ids.length; tries++) {
      list = itemsOfRarity(ids[tries]);
      if (skip) { var f = []; for (var i = 0; i < list.length; i++) if (!skip[list[i]]) f.push(list[i]); list = f; }
      if (list.length) return KS.rng.pick(list);
    }
    return null;
  }

  function choiceFor(id) {
    var d = defs().items[id], n = KS.items.count(id) + 1, desc = "";
    try { desc = typeof d.desc === "function" ? d.desc(n) : String(d.desc || ""); } catch (e) { desc = ""; }
    return { id: id, name: d.name, icon: d.icon, rarity: d.rarity, desc: desc };
  }
  function rollMany(table, run, n) {
    var ids = [], skip = {}, i;
    for (i = 0; i < n; i++) {
      var id = roll(table, run, skip);
      if (!id) break;
      skip[id] = true; ids.push(id);
    }
    return ids;
  }

  function tryEvolve(run, max) {
    run = run || KS.run; var out = [];
    if (!run) return out;
    for (var i = 0; i < 6 && out.length < max; i++) {
      var w = run.weapons[i];
      if (!w || w.def.evolved || w.def.fusion || w.level < 8 || !w.def.evolvesTo) continue;
      if (!defs().weapons[w.def.evolvesTo]) continue;
      var have = false;
      for (var j = 0; j < 6; j++) if (run.gear[j] && run.gear[j].id === w.def.partner) have = true;
      if (!have) continue;
      var from = w.id, to = w.def.evolvesTo;
      if (KS.replaceWeapon(w, to)) out.push({ from: from, to: to });
    }
    return out;
  }
  // The contract says tryEvolve returns ids; keep an id view and a pair view.
  function tryEvolveIds(run, max) {
    var pairs = tryEvolve(run, max), ids = [];
    tryEvolveIds.last = pairs;
    for (var i = 0; i < pairs.length; i++) ids.push(pairs[i].to);
    return ids;
  }
  tryEvolveIds.last = [];

  function ownedForRecipe(run, id) {
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i];
      if (w && w.level >= 8 && (w.id === id || w.def.from === id)) return w;
    }
    return null;
  }
  function eligibleFusions(run) {
    run = run || KS.run; var out = [], id;
    if (!run) return out;
    for (id in defs().weapons) {
      var d = defs().weapons[id];
      if (!d.fusion || !d.recipe || !d.recipe.weapons || !unlocked("weapon", id)) continue;
      var a = ownedForRecipe(run, d.recipe.weapons[0]), b = ownedForRecipe(run, d.recipe.weapons[1]);
      if (a && b && a !== b) out.push(id);
    }
    return out;
  }
  function fuse(id, run) {
    run = run || KS.run;
    var d = defs().weapons[id];
    if (!run || !d || !d.fusion || !d.recipe) return;
    var a = ownedForRecipe(run, d.recipe.weapons[0]), b = ownedForRecipe(run, d.recipe.weapons[1]);
    if (!a || !b || a === b) return;
    var keep = a.slot < b.slot ? a : b, drop = keep === a ? b : a;
    KS.removeWeapon(drop);
    KS.replaceWeapon(keep, id);
  }

  function chooseOverlay(title, note, ids, onTake) {
    var choices = [];
    for (var i = 0; i < ids.length; i++) choices.push(choiceFor(ids[i]));
    KS.openOverlay("crate", "crate", { mode: "choose", title: title, note: note, choices: choices, onPick: function (index) {
      if (index >= 0 && index < ids.length) onTake(ids[index]);
      KS.closeOverlay();
    } });
  }

  function openCrate(kind, run) {
    run = run || KS.run; if (!run) return;
    var ids, i;
    if (kind === "supplycrate" || kind === "goldbox") {
      var gold = kind === "goldbox";
      var evoIds = tryEvolveIds(run, gold ? 2 : 1);
      if (evoIds.length) {
        var pairs = tryEvolveIds.last;
        KS.openOverlay("crate", "crate", { mode: "evolve", title: TEXT.crateEvolveTitle, note: TEXT.crateEvolveNote, evolutions: pairs,
          onPick: function () { KS.closeOverlay(); } });
        return;
      }
      ids = rollMany(kind, run, 3);
      if (!ids.length) return;
      chooseOverlay(gold ? TEXT.goldTitle : TEXT.crateTitle, gold ? TEXT.goldNote : TEXT.crateNote, ids, function (id) { KS.items.give(id, 1, kind); });
    } else if (kind === "counter") {
      ids = rollMany("counter", run, 3);
      if (ids.length) chooseOverlay(TEXT.counterTitle, TEXT.counterNote, ids, function (id) { KS.items.give(id, 1, "counter"); });
    } else if (kind === "gangbox") {
      ids = rollMany("gangbox", run, 2);
      if (ids.length) chooseOverlay(TEXT.gangTitle, TEXT.gangNote, ids, function (id) { KS.items.give(id, 1, "gangbox"); });
    } else if (kind === "shrine") {
      if (run.contracts && run.contracts.up) { toast(TEXT.shrineBusy, "warn"); return; }
      var kid = roll("kudzu", run);
      if (!kid) { toast(TEXT.shrineEmpty, "info"); return; }
      var ch = choiceFor(kid);
      KS.openOverlay("crate", "crate", { mode: "takeLeave", title: TEXT.shrineTitle, note: TEXT.shrineNote, choices: [ch], onPick: function (index) {
        if (index === 0) KS.items.give(kid, 1, "shrine");
        KS.closeOverlay();
      } });
    } else if (kind === "bench") {
      var fs = eligibleFusions(run);
      if (!fs.length) { toast(TEXT.benchNone, "info"); return; }
      var bc = [];
      for (i = 0; i < fs.length; i++) {
        var fd = defs().weapons[fs[i]];
        bc.push({ id: fs[i], name: fd.name, icon: fd.icon, rarity: "legendary", desc: fd.desc });
      }
      KS.openOverlay("crate", "crate", { mode: "choose", title: TEXT.benchTitle, note: TEXT.benchNote, choices: bc, onPick: function (index) {
        if (index >= 0 && index < fs.length) fuse(fs[index], run);
        KS.closeOverlay();
      } });
    }
  }

  KS.loot = {
    roll: roll, openCrate: openCrate, tryEvolve: tryEvolveIds, eligibleFusions: eligibleFusions, fuse: fuse,
    offerChoice: function (kind, run) { openCrate(kind, run); }
  };
})(window.KS);
