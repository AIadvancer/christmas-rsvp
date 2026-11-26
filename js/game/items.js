/* Kudzu Survivors v2 - items.js (ENG-ITEM)
 * 20 gear, 47 items (4 Kudzu contracts), 6 Crew Bonuses, item proc kinds, KS.items.
 * On-hit / on-kill logic is centralised in KS.items.onHit / onKill for speed; defs carry
 * stats(), desc(), flavor and counterLabel. Effective stack counts live in N (refreshed in applyStats).
 */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT: every flavor line lives here for review (workplace-appropriate).
  // ---------------------------------------------------------------------------
  var TEXT = {
    gear: {
      hardhat: "Regulation-yellow. Dents are a sign of experience.",
      boots: "Steel toes, wool socks, and no regrets about that tree root.",
      cocoa: "Still hot at 4 p.m. Nobody asks how.",
      vest: "If they can see you, they can wave. Mostly.",
      overtime: "Punch in, punch out, punch through the schedule.",
      eggnog: "Strictly a morning-shift beverage. Honest.",
      sticker: "'Safety Is No Accident' - slightly peeling.",
      file: "Twelve strokes a link, every link, every morning.",
      bar: "An extra foot of reach and an extra foot of excuses.",
      fuel: "Two-stroke and two-thirds of a miracle.",
      hire: "Seasonal help: first day, fresh gloves, full of questions.",
      diesel: "Smells like progress and burnt toast.",
      wishbone: "Pulled it at lunch. Both halves, somehow.",
      radio: "Copy that. Say again your twenty?",
      linegloves: "Rated for a lot more than you will ever need.",
      toolbelt: "Forty pounds of tools and one granola bar.",
      chains: "Click-clack all the way up the hill.",
      flares: "Burns red for thirty minutes. Looks festive for all of them.",
      coffeecan: "Quarters, dimes, and a tooth. Don't ask.",
      firstaid: "Band-aids, tape, and a strongly worded pamphlet."
    },
    item: {
      splinters: "Pulled from the same pallet as last Tuesday's lunch table.",
      coal: "From the foreman's stocking. He says it's 'character'.",
      gloves: "Broken in so well they can stand up on their own.",
      chainlinks: "Spares for the spares. The truck is mostly spares.",
      ribbon: "Curls back on itself. Much like the Christmas party planning.",
      tape: "Visible from space, or at least from the next ridge.",
      cider: "Warm, spiced, and technically a vegetable serving.",
      whetstone: "A sharp edge is a safe edge. Also a loud one.",
      bubblewrap: "The foreman says to pop it after the shift. Nobody does.",
      handwarmer: "A small orange miracle in a pocket.",
      magnet: "Collects loose change, loose bolts, and loose gossip.",
      tapemeasure: "Measure twice, hit once, from far away.",
      kneepads: "For the long hours of reaching under brush.",
      advent: "Twenty-four little doors. Behind each: a surprise coupon.",
      canestash: "Hidden in the glovebox, a candy cane a day.",
      mallet: "For tapping stubborn stakes and stubborn opinions.",
      jumper: "Red to red, black to black, and never to the bumper.",
      bellcollar: "Jingles at the exact wrong time. Or right.",
      matches: "Strike anywhere, on anything, including the mulch pile. Please don't.",
      airhorn: "The crew's preferred alarm clock. And alarm.",
      bungee: "Hooks on both ends and a surprising lack of give.",
      lunchbox: "Gingerbread sandwich: sturdy, sweet, a little structural.",
      scraper: "For windshields, and also for opinions.",
      chaps: "Cut-resistant, bramble-resistant, style-resistant.",
      rocksalt: "Spread thin or thrown with feeling.",
      extcord: "Orange, three hundred feet, and still two feet short.",
      spikes: "For climbing and for making a point.",
      almanac: "Predicts weather, frost dates, and mild disappointment.",
      wreath: "Hung on the truck grille, every December, without fail.",
      hopper: "Everything goes in. Some of it comes out in a hurry.",
      bigbulb: "Big, colorful, and a fire marshal's pet peeve.",
      polexfmr: "Humms like a warning. Bangs like a punchline.",
      kerosene: "Does not belong near anything, which is where it goes.",
      generator: "One pull to start. Three, honestly.",
      ram: "Pressure applied once, politely, with great enthusiasm.",
      floodlight: "Turns night into a work site and a work site into a stage.",
      stumpremover: "Overnight soak, next-morning surprise.",
      discount: "Good at any hardware store that still honors it.",
      brushpile: "Today's cleanup is tomorrow's bigger pile.",
      luckyhat: "Worn since 1987. Please do not wash it.",
      xmasmorning: "Everything wrapped, everything opened, everything again.",
      stocking: "Always has one more thing in the toe.",
      goldstar: "Tree topper. Foreman's promotion. Take your pick.",
      kudzucutting: "'Take a little. It'll grow back.' - famous last words.",
      overtimeslip: "Signed in triplicate; the third copy is your problem.",
      fortunecake: "Dense as a fence post, and it will find you again next year.",
      vinecontract: "Fine print is thicker than the vine."
    },
    crewBonus: {
      freshedge: "Three sharp edges make for one sharp crew.",
      chainreaction: "One boom invites the neighbors.",
      fullload: "Everything on the truck, nothing left behind.",
      partyline: "Everybody on the line, everybody in on it.",
      coldsnap: "Frost stays on the job a little longer.",
      steamline: "Hot meets cold. Pipes burst. Enemies too."
    }
  };

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  var MAXD = KS.MAX_DEPTH || 5;
  var U = KS.util;
  function pc(x) { return Math.round(x * 100) + "%"; }
  function plus(x) { return "+" + x; }
  function f1(x) { return String(Math.round(x * 10) / 10); }
  function pick(rng, a) { return a[rng.int(0, a.length - 1)]; }

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  var N = {};                 // effective stack counts (id -> n), refreshed by refresh()
  var ST = { run: null, advT: 24, saltT: 3, floodT: 8, airCd: 0, polexCd: 0, polexN: 0, wreathN: 0, healUsed: 0, luckLeft: 0, kAmt: 0, kUid: 0, spawnedChips: 0 };
  var ITEM_IDS = [];          // all item ids, filled on registration
  var STAT_ITEMS = [];        // items with stats()
  var CREW_IDS = ["freshedge", "chainreaction", "fullload", "partyline", "coldsnap", "steamline"];

  function resetState(run) {
    ST.run = run; ST.advT = 24; ST.saltT = 3; ST.floodT = 8; ST.airCd = 0; ST.polexCd = 0; ST.polexN = 0; ST.wreathN = 0;
    ST.healUsed = 0; ST.luckLeft = run && run.stats ? run.stats.luckItems : 0; ST.kAmt = 0; ST.kUid = 0;
    for (var i = 0; i < ITEM_IDS.length; i++) N[ITEM_IDS[i]] = 0;
  }

  function refresh(run) {
    if (!run) return;
    var cut = run.contracts && run.contracts.up === "kudzucutting";
    var defs = KS.defs.items;
    for (var i = 0; i < ITEM_IDS.length; i++) {
      var id = ITEM_IDS[i], raw = run.items[id] || 0;
      if (raw > 99) raw = 99;
      if (cut && raw > 0 && defs[id].rarity === "common") raw += 2;
      N[id] = raw;
    }
  }

  function cnt(id, v) { var c = ST.run ? ST.run.itemCounters : null; if (c) c[id] = (c[id] || 0) + v; }

  // module-level damage sources (reused; mutate before each call)
  var PS = KS.makeSrc();      // for procs.push
  function ps(src, itemId) { PS.team = "player"; PS.depth = src.depth; PS.slot = src.slot; PS.restarts = src.restarts; PS.itemId = itemId; PS.procCoef = 1; PS.isDot = false; PS.noOnKill = false; PS.noProc = false; PS.canCrit = false; PS.tag = ""; PS.weaponId = ""; }
  var HS_A = KS.makeSrc(), HS_B = KS.makeSrc(), HS_C = KS.makeSrc(), HS_D = KS.makeSrc();
  function hsrc(s, ev, tag) {
    s.team = "player"; s.slot = ev.slot; s.weaponId = ""; s.itemId = ev.itemId; s.tag = tag; s.procCoef = ev.coef; s.depth = ev.depth; s.canCrit = false;
    s.kb = 0; s.kbx = 0; s.kby = 0; s.isDot = false; s.x = ev.x; s.y = ev.y; s.noProc = false; s.noOnKill = false; s.chainLeft = 0; s.restarts = ev.restarts; s.bounceIndex = 0;
  }
  var BUF_A = new Array(256), BUF_B = new Array(256), BUF_C = new Array(256), BUF_D = new Array(256);

  // luck-aware roll. p already includes stack count and the source procCoef.
  function roll(p) {
    if (!(p > 0)) return false;
    if (p >= 1) return true;
    var r = KS.rng.next() < p;
    if (!r && ST.luckLeft > 0 && N.luckyhat > 0) { ST.luckLeft--; r = KS.rng.next() < p; }
    return r;
  }
  function rangeMul() { var e = N.extcord || 0; return 1 + Math.min(1, 0.2 * e); }

  // ---------------------------------------------------------------------------
  // Pseudo projectile defs (item projectiles are not registered weapons)
  // ---------------------------------------------------------------------------
  var CHIP = { id: "i_chip", tag: "", procCoef: 0.25, projDraw: function (ctx, p) {
    var a = p.t * 14;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-5, -3, 10, 6);
    ctx.fillStyle = "#d9b27a"; ctx.fillRect(-5, -3, 10, 2);
    ctx.restore();
  } };
  var SALT = { id: "i_salt", tag: "", procCoef: 0.5, projDraw: function (ctx, p) {
    ctx.fillStyle = "#e8f4f8"; ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
    ctx.fillStyle = "#7fc8e0"; ctx.fillRect(p.x - 2.5, p.y + 0.5, 5, 2);
  } };

  // ---------------------------------------------------------------------------
  // Cosmetic hazards: lightning bolt and zap line
  // ---------------------------------------------------------------------------
  KS.registerHazard({ id: "i_bolt", team: "player", cosmetic: true, life: 0.25, r: 20,
    draw: function (ctx, h) {
      var mx = h.data.max || 0.25, a = h.life > 0 ? Math.min(1, h.life / mx) : 0, k = h.uid * 0.37, x = h.x, y = h.y - 280, i, nx, ny;
      ctx.globalAlpha = a; ctx.lineJoin = "round";
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? "#fffbe0" : "#f2c230"; ctx.lineWidth = pass ? 2 : 6;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (i = 1; i <= 7; i++) {
          nx = h.x + (i < 7 ? Math.sin(k + i * 2.1) * 26 : 0); ny = h.y - 280 + i * 40;
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = "#f2c230"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, h.data.rad || 60, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 1;
    } });
  KS.registerHazard({ id: "i_zap", team: "player", cosmetic: true, life: 0.2, r: 10,
    draw: function (ctx, h) {
      var mx = h.data.max || 0.2, a = h.life > 0 ? Math.min(1, h.life / mx) : 0, x2 = h.data.x2, y2 = h.data.y2, k = h.uid * 0.9;
      ctx.globalAlpha = a; ctx.strokeStyle = "#ffe36b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x, h.y);
      for (var i = 1; i < 5; i++) { var t = i / 5; ctx.lineTo(h.x + (x2 - h.x) * t + Math.sin(k + i * 3) * 8, h.y + (y2 - h.y) * t + Math.cos(k + i * 2) * 8); }
      ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.globalAlpha = 1;
    } });
  function zap(x1, y1, x2, y2) {
    if (KS.headless) return;
    KS.spawnHazard("i_zap", x1, y1, { life: 0.2, data: { max: 0.2, x2: x2, y2: y2 } });
  }

  // ---------------------------------------------------------------------------
  // Buff: chaps
  // ---------------------------------------------------------------------------
  KS.registerBuff({ id: "chaps", name: "Chainsaw Chaps", icon: "🦺", color: "#c9993b", stats: function (S) { S.speed *= 1.4; S.dr += 0.25; } });

  // ---------------------------------------------------------------------------
  // Proc kinds
  // ---------------------------------------------------------------------------
  KS.registerProc("chips", function (ev, run) {
    var count = Math.min(24, Math.round(ev.a)), i, off = KS.rng.next() * 6.2832, sp = 380 * run.stats.projSpeed, bounces = KS.items.extraBounces();
    if (ev.depth > MAXD) return;
    for (i = 0; i < count; i++) {
      if (!KS.itemProjOk()) break;
      var a = off + i * 6.2832 / count;
      var p = KS.spawnProj(CHIP, 6, ev.x, ev.y, Math.cos(a) * sp, Math.sin(a) * sp, {
        dmg: ev.b, baseDmg: ev.b, pierce: 1, life: 0.55, r: 5, procCoef: ev.coef, depth: ev.depth, itemId: "hopper", noOnKill: true, bounces: bounces, kb: 30, slot: 6, bounceRange: 160
      });
      if (!p) break;
      ST.spawnedChips++;
    }
    cnt("hopper", count);
    KS.fx("chips", ev.x, ev.y, "#d9b27a", 4, 3);
  });
  KS.registerProc("strike", function (ev, run) {
    hsrc(HS_A, ev, "blast");
    var n = KS.grid.query(ev.x, ev.y, ev.a, BUF_A, 256);
    for (var i = 0; i < n; i++) KS.damage(BUF_A[i], ev.b, HS_A);
    if (!KS.headless) {
      KS.spawnHazard("i_bolt", ev.x, ev.y, { life: 0.25, data: { max: 0.25, rad: ev.a } });
      KS.fx("sparks", ev.x, ev.y, "#fff2a0", 10, 3); KS.shake(3);
    }
    cnt("polexfmr", 1);
  });
  KS.registerProc("spreadBurn", function (ev, run) {
    var n = KS.grid.query(ev.x, ev.y, 90, BUF_B, 256), left = Math.round(ev.a), i, e;
    hsrc(HS_B, ev, "fire");
    for (i = 0; i < n && left > 0; i++) {
      e = BUF_B[i];
      if (!e.alive || e.st.burn > 0) continue;
      KS.applyStatus(e, "burn", ev.b, ev.c > 0 ? ev.c : 3, HS_B); left--;
      KS.fx("embers", e.x, e.y, "#ff8a2b", 2, 2);
    }
  });
  KS.registerProc("current", function (ev, run) {
    var n = KS.grid.query(ev.x, ev.y, ev.c, BUF_C, 256), left = 20, i, e;
    hsrc(HS_C, ev, "ring");
    var targets = 0;
    for (i = 0; i < n && targets < left; i++) {
      e = BUF_C[i];
      if (!e.alive || !(e.st.strung > 0)) continue;
      targets++;
      zap(ev.x, ev.y, e.x, e.y);
      HS_C.x = e.x; HS_C.y = e.y;
      KS.damage(e, ev.b, HS_C);
    }
    if (targets) cnt("bigbulb", targets);
  });
  KS.registerProc("i_shock", function (ev, run) {
    hsrc(HS_D, ev, "blast");
    var n = KS.grid.query(ev.x, ev.y, ev.a, BUF_D, 256), i, e, dx, dy, l;
    for (i = 0; i < n; i++) {
      e = BUF_D[i]; if (!e.alive) continue;
      dx = e.x - ev.x; dy = e.y - ev.y; l = Math.sqrt(dx * dx + dy * dy) || 1;
      HS_D.kb = ev.c; HS_D.kbx = dx / l; HS_D.kby = dy / l;
      KS.damage(e, ev.b, HS_D);
    }
    HS_D.kb = 0;
    KS.fx("ring", ev.x, ev.y, "#c9993b", 1, ev.a); KS.fx("sparks", ev.x, ev.y, "#f2c230", 6, 3);
    cnt("bellcollar", 1);
  });
  KS.registerProc("i_horn", function (ev, run) {
    hsrc(HS_D, ev, "blast");
    var n = KS.grid.query(ev.x, ev.y, ev.a, BUF_D, 256), i, e, dx, dy, l;
    for (i = 0; i < n; i++) {
      e = BUF_D[i]; if (!e.alive) continue;
      dx = e.x - ev.x; dy = e.y - ev.y; l = Math.sqrt(dx * dx + dy * dy) || 1;
      HS_D.kb = 320; HS_D.kbx = dx / l; HS_D.kby = dy / l;
      KS.damage(e, ev.b, HS_D);
      if (e.alive) KS.applyStatus(e, "slow", 0.35, 1.5, HS_D);
    }
    HS_D.kb = 0;
    KS.fx("ring", ev.x, ev.y, "#b3261e", 1, ev.a); KS.shake(4);
    cnt("airhorn", 1);
  });

  // ---------------------------------------------------------------------------
  // Gear (20)
  // ---------------------------------------------------------------------------
  function gear(id, name, icon, partner, unlock, rows, stats) {
    var def = {
      id: id, name: name, icon: icon, maxLevel: 5, partnerOf: partner || undefined, unlock: unlock || null, flavor: TEXT.gear[id],
      desc: function (level) {
        var L = level > 0 ? level : 1, s = [], i;
        for (i = 0; i < rows.length; i++) s.push(rows[i][0] + " " + rows[i][1](L));
        return s.join(", ");
      },
      deltas: function (level) {
        var out = [], L = level > 0 ? level : 0, i;
        for (i = 0; i < rows.length; i++) out.push([rows[i][0], rows[i][1](L), rows[i][1](L + 1)]);
        return out;
      },
      stats: stats
    };
    KS.registerGear(def);
    return def;
  }
  gear("hardhat", "Hard Hat", "🪖", "grinder", null, [["Armor", function (L) { return plus(L); }]], function (L, S) { S.armor += L; });
  gear("boots", "Steel-Toe Boots", "🥾", "stampede", null, [["Speed", function (L) { return "+" + 8 * L + "%"; }]], function (L, S) { S.speed *= 1 + 0.08 * L; });
  gear("cocoa", "Hot Cocoa Thermos", "☕", "snow", null, [["Regen", function (L) { return "+" + f1(0.3 * L) + "/s"; }]], function (L, S) { S.regen += 0.3 * L; });
  gear("vest", "Hi-Vis Vest", "🦺", "burnpile", null, [["Pickup range", function (L) { return "+" + 20 * L + "%"; }]], function (L, S) { S.magnet *= 1 + 0.2 * L; });
  gear("overtime", "Overtime Card", "🪪", "saws", null, [["Cooldown", function (L) { return "-" + Math.round((1 - Math.pow(0.94, L)) * 100) + "%"; }]], function (L, S) { S.cooldown *= Math.pow(0.94, L); });
  gear("eggnog", "Eggnog", "🥛", "fruitcake", null, [["Max HP", function (L) { return "+" + 20 * L; }]], function (L, S) { S.maxHp += 20 * L; });
  gear("sticker", "Hard-Hat Sticker", "🏷️", "chipper", null, [["XP", function (L) { return "+" + 8 * L + "%"; }]], function (L, S) { S.xpMul += 0.08 * L; });
  gear("file", "Sharpening File", "📐", "cane", null, [["Damage", function (L) { return "+" + 8 * L + "%"; }]], function (L, S) { S.might += 0.08 * L; });
  gear("bar", "Extended Bar", "📏", "mulcher", null, [["Area", function (L) { return "+" + 8 * L + "%"; }]], function (L, S) { S.area += 0.08 * L; });
  gear("fuel", "Fuel Can", "⛽", "bombs", null, [["Duration", function (L) { return "+" + 12 * L + "%"; }]], function (L, S) { S.duration += 0.12 * L; });
  gear("hire", "Seasonal Hire", "👷", "polesaw", null, [
    ["Projectiles", function (L) { return plus((L >= 1 ? 1 : 0) + (L >= 5 ? 1 : 0)); }],
    ["Damage", function (L) { return "+" + 5 * Math.min(3, Math.max(0, L - 1)) + "%"; }]
  ], function (L, S) { S.amount += (L >= 1 ? 1 : 0) + (L >= 5 ? 1 : 0); S.might += 0.05 * Math.min(3, Math.max(0, L - 1)); });
  gear("diesel", "Diesel Additive", "🛢️", "blower", null, [
    ["Projectile speed", function (L) { return "+" + 10 * L + "%"; }],
    ["Knockback", function (L) { return "+" + 5 * L + "%"; }]
  ], function (L, S) { S.projSpeed += 0.1 * L; S.knockback += 0.05 * L; });
  gear("wishbone", "Wishbone", "🦴", "bells", "evo1", [
    ["Luck", function (L) { return "+" + f1(0.1 * L); }],
    ["Rerolls", function (L) { return plus(L); }],
    ["Level-up cards", function (L) { return plus(L >= 3 ? 1 : 0); }]
  ], function (L, S) { S.luck += 0.1 * L; S.rerolls += L; if (L >= 3) S.cards += 1; });
  gear("radio", "Two-Way Radio", "📻", "drone", "allops", [["Ability cooldown", function (L) { return "-" + 8 * L + "%"; }]], function (L, S) { S.abilityCdMul *= 1 - 0.08 * L; });
  gear("linegloves", "Lineman Gloves", "🧤", "lash", "crit", [["Crit chance", function (L) { return "+" + 4 * L + "%"; }]], function (L, S) { S.crit += 0.04 * L; });
  gear("toolbelt", "Tool Belt", "🧰", "timber", "evo3", [
    ["Pierce", function (L) { return plus((L >= 1 ? 1 : 0) + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0)); }],
    ["Damage", function (L) { return "+" + 3 * ((L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0)) + "%"; }]
  ], function (L, S) { S.pierce += (L >= 1 ? 1 : 0) + (L >= 3 ? 1 : 0) + (L >= 5 ? 1 : 0); S.might += 0.03 * ((L >= 2 ? 1 : 0) + (L >= 4 ? 1 : 0)); });
  gear("chains", "Snow Chains", "⛓️", null, "tenminutes", [
    ["Hazard slow ignored", function (L) { return Math.min(100, 20 * L) + "%"; }],
    ["Ice sliding", function (L) { return L >= 3 ? "immune" : "normal"; }]
  ], function (L, S) { S.hazardSlowRes += Math.min(1, 0.2 * L); if (L >= 3) S.iceImmune = 1; });
  gear("flares", "Road Flare Kit", "🚨", null, "daily", [["Status power", function (L) { return "+" + 15 * L + "%"; }]], function (L, S) { S.statusMul += 0.15 * L; });
  gear("coffeecan", "Coffee Can of Coins", "🥫", null, "tinsel", [
    ["Tinsel", function (L) { return "+" + 12 * L + "%"; }],
    ["Peppermint Pay", function (L) { return "+" + 5 * L + "%"; }]
  ], function (L, S) { S.tinselMul += 0.12 * L; S.payMul += 0.05 * L; });
  gear("firstaid", "First-Aid Kit", "⛑️", null, "allops", [
    ["Healing pickups", function (L) { return "+" + 25 * L + "%"; }],
    ["Max HP", function (L) { return "+" + 5 * L + "%"; }],
    ["Revive", function (L) { return L >= 5 ? "+1" : "none"; }]
  ], function (L, S) { S.healPickupMul += 0.25 * L; S.maxHp *= 1 + 0.05 * L; if (L >= 5) S.revives += 1; });

  // ---------------------------------------------------------------------------
  // Items (47)
  // ---------------------------------------------------------------------------
  function item(id, name, icon, rarity, unlock, desc, opts) {
    var def = { id: id, name: name, icon: icon, rarity: rarity, unlock: unlock || null, flavor: TEXT.item[id], desc: desc };
    if (opts) for (var k in opts) def[k] = opts[k];
    KS.registerItem(def);
    ITEM_IDS.push(id); N[id] = 0;
    if (def.stats) STAT_ITEMS.push(id);
    return def;
  }
  function nn(n) { return n > 0 ? n : 1; }

  // ---- Common (16)
  item("splinters", "Splinter Pack", "🪵", "common", null, function (n) { n = nn(n); return "On crit: splinter the target for " + pc(0.5 * n) + " of the hit per second for 2.5 s (stacks to 10)."; }, { counterLabel: "crit splinters this run" });
  item("coal", "Lump of Coal", "🪨", "common", null, function (n) { n = nn(n); return "On kill: a blast for 150% base damage, radius " + (50 + 15 * n) + "."; }, { counterLabel: "blasts this run" });
  item("gloves", "Calloused Work Gloves", "🥊", "common", null, function (n) { return "Damage +" + 10 * nn(n) + "%."; }, { stats: function (n, S) { S.might += 0.1 * n; } });
  item("chainlinks", "Spare Chain Links", "🔗", "common", null, function (n) { return "Cooldowns " + Math.round((1 - 1 / (1 + 0.1 * nn(n))) * 100) + "% shorter."; }, { stats: function (n, S) { S.cooldown *= 1 / (1 + 0.1 * n); } });
  item("ribbon", "Roll of Gift Ribbon", "🎀", "common", null, function (n) { return "Your bouncing shots bounce " + nn(n) + " more time" + (nn(n) > 1 ? "s" : "") + ", at 80% damage per bounce."; });
  item("tape", "Reflective Tape", "🟨", "common", null, function (n) { return "Speed +" + 7 * nn(n) + "%."; }, { stats: function (n, S) { S.speed *= 1 + 0.07 * n; } });
  item("cider", "Thermos of Cider", "🍎", "common", null, function (n) { n = nn(n); return "On kill: below half HP heal " + n + " (max 20/s); otherwise gain " + f1(0.2 * n) + " barrier."; }, { counterLabel: "HP healed this run" });
  item("whetstone", "Whetstone", "🪨", "common", null, function (n) { return "Crit chance +" + 7 * nn(n) + "%."; }, { stats: function (n, S) { S.crit += 0.07 * n; } });
  item("bubblewrap", "Bubble Wrap", "🫧", "common", null, function (n) { n = nn(n); return "Blocks one hit. Recharges in " + f1(Math.max(5, 15 / (1 + 0.15 * (n - 1)))) + " s."; }, { stats: function (n, S) { S.bubbleWrap += n; } });
  item("handwarmer", "Pocket Hand Warmer", "🔥", "common", null, function (n) { return "Regen +" + f1(0.4 * nn(n)) + " HP/s."; }, { stats: function (n, S) { S.regen += 0.4 * n; } });
  item("magnet", "Fridge Magnet on a String", "🧲", "common", null, function (n) { return "Pickup range +" + 18 * nn(n) + "%."; }, { stats: function (n, S) { S.magnet *= 1 + 0.18 * n; } });
  item("tapemeasure", "Tape Measure", "📏", "common", null, function (n) { return "+" + 12 * nn(n) + "% damage to enemies more than 200 away."; });
  item("kneepads", "Knee Pads", "🦵", "common", null, function (n) { return "Armor +" + nn(n) + "."; }, { stats: function (n, S) { S.armor += n; } });
  item("advent", "Advent Calendar", "📅", "common", "firstday", function (n) { n = nn(n); return "Every " + f1(24 / (1 + 0.1 * (n - 1))) + " s a pickup drops beside you (heal, magnet or Tinsel)."; }, { counterLabel: "doors opened this run" });
  item("canestash", "Candy Cane Stash", "🍬", "common", "items10", function (n) { return "XP +" + 6 * nn(n) + "%."; }, { stats: function (n, S) { S.xpMul += 0.06 * n; } });
  item("mallet", "Rubber Mallet", "🔨", "common", "mimic", function (n) { n = nn(n); return "On hit: " + f1(25 * (1 - 1 / (1 + 0.2 * n))) + "% chance to stun for 0.5 s (bosses slow instead)."; }, { counterLabel: "stuns this run" });

  // ---- Uncommon (13)
  item("jumper", "Jumper Cables", "🔌", "uncommon", null, function (n) { n = nn(n); return "On hit vs a chilled or frozen enemy: 30% to arc to " + Math.min(20, 2 + n) + " enemies for 60% damage."; }, { counterLabel: "arcs this run" });
  item("bellcollar", "Sleigh Bell Collar", "🔔", "uncommon", null, function (n) { return "On kill: " + 8 * nn(n) + "% chance of a shockwave (200% base, knockback)."; }, { counterLabel: "shockwaves this run" });
  item("matches", "Strike-Anywhere Matches", "🔥", "uncommon", null, function (n) { n = nn(n); return "On hit: " + 15 * n + "% to ignite (120% over 4 s). Burning kills spread burn to " + Math.min(8, 1 + n) + " neighbors."; }, { counterLabel: "ignitions this run" });
  item("airhorn", "Air Horn", "📯", "uncommon", null, function (n) { n = nn(n); return "When hurt: blast for 400% base, radius 180; foes are shoved and slowed. Cooldown " + f1(6 / (1 + 0.15 * (n - 1))) + " s."; }, { counterLabel: "honks this run" });
  item("bungee", "Bungee Cord", "🪢", "uncommon", null, function (n) { n = nn(n); return "+" + n + " bounce. Bounces hit for " + pc(Math.min(3, 1 + 0.1 * n)) + " per bounce number instead of losing damage."; });
  item("lunchbox", "Gingerbread Lunchbox", "🍱", "uncommon", null, function (n) { n = nn(n); return "Max HP +" + 30 * n + ". Heal " + (20 + 10 * (n - 1)) + "% at stage clear."; }, { stats: function (n, S) { S.maxHp += 30 * n; } });
  item("scraper", "Ice Scraper", "🧊", "uncommon", null, function (n) { return "On hit: " + 12 * nn(n) + "% to chill. Three chills freeze for 1 s."; }, { counterLabel: "chills this run" });
  item("chaps", "Chainsaw Chaps", "🦺", "uncommon", "nohit", function (n) { return "When hurt: +40% speed and +25% damage reduction for " + (1 + nn(n)) + " s."; });
  item("rocksalt", "Bucket of Rock Salt", "🧂", "uncommon", "whiteout", function (n) { n = nn(n); return "Every 3 s: " + Math.min(24, 4 + 2 * (n - 1)) + " salt grains fly at nearby enemies (60% base each)."; }, { counterLabel: "grains thrown this run" });
  item("extcord", "Extension Cord", "🟠", "uncommon", "chain", function (n) { n = nn(n); return "All chains and arcs: +" + n + " jump, +" + Math.min(100, 20 * n) + "% range."; });
  item("spikes", "Climbing Spikes", "📌", "uncommon", "stage3", function (n) { return "Pierce +" + nn(n) + "."; }, { stats: function (n, S) { S.pierce += n; } });
  item("almanac", "Farmers' Almanac", "📖", "uncommon", "crow", function (n) { n = nn(n); return "+" + n + " reroll at each stage start. Luck +" + f1(0.05 * n) + "."; }, { stats: function (n, S) { S.luck += 0.05 * n; } });
  item("wreath", "Holly Wreath", "🎄", "uncommon", "regifted", function (n) { return "Every 10th kill: +" + 4 * nn(n) + " barrier that stops decaying for 3 s."; }, { counterLabel: "barrier granted this run" });

  // ---- Rare (9)
  item("hopper", "Chipper Hopper", "🪓", "rare", null, function (n) { n = nn(n); return "On kill: " + Math.min(24, 4 + 2 * (n - 1)) + " chips fly outward (100% base). Chips trigger on-hit items, not on-kill items."; }, { counterLabel: "chips this run" });
  item("bigbulb", "String of Big-Bulb Lights", "💡", "rare", null, function (n) { n = nn(n); return "On hit: strung 4 s. A strung enemy that dies sends current to every strung enemy within 220 for " + pc(3 * (0.6 + 0.4 * (n - 1))) + " base."; }, { canChain: true, counterLabel: "bulbs lit this run" });
  item("polexfmr", "Pole Transformer", "⚡", "rare", null, function (n) { n = nn(n); return "Every " + Math.max(4, 12 - 2 * (n - 1)) + " solid hits: lightning strikes the target for 600% base, radius 90."; }, { counterLabel: "strikes this run" });
  item("kerosene", "Kerosene Heater", "🛢️", "rare", null, function (n) { n = nn(n); return "Burning or splintered enemies explode on death for " + (25 + 15 * (n - 1)) + "% of their max HP, radius 80."; }, { counterLabel: "explosions this run" });
  item("generator", "Backup Generator", "🔋", "rare", "thirty", function (n) { return "Each stack is a one-time revive (max 3 used per run): 40% HP, shove everything away, then a 15 s shield. Season finale refills 1."; }, { counterLabel: "charges left" });
  item("ram", "Hydraulic Ram", "🐏", "rare", "items30", function (n) { n = nn(n); return "The first hit on each enemy deals +" + (100 + 50 * (n - 1)) + "% damage and shoves it back."; });
  item("floodlight", "Floodlight Tower", "🏗️", "rare", "objectives5", function (n) { n = nn(n); return "Every 8 s: stun enemies within 220 for " + f1(Math.min(2.5, 0.8 + 0.3 * (n - 1))) + " s."; }, { counterLabel: "enemies stunned this run" });
  item("stumpremover", "Stump Remover", "🌰", "rare", "boss_kudzuking", function (n) { return "+" + 40 * nn(n) + "% damage to stationary targets, objectives and Fuel Drums."; });
  item("discount", "Bulk Discount Card", "🏷️", "rare", "stack10", function (n) { return "Prices " + Math.round((1 - 1 / (1 + 0.12 * nn(n))) * 100) + "% lower (min 70% off)."; }, { stats: function (n, S) { S.priceMul *= 1 / (1 + 0.12 * n); } });

  // ---- Legendary (5)
  item("brushpile", "The Brush Pile", "🌿", "legendary", "kills25k", function (n) { n = nn(n); return "On-kill effects trigger " + f1(Math.min(3, 1 + 2 * n / (n + 2))) + " times on average."; });
  item("luckyhat", "Foreman's Lucky Hard Hat", "👷", "legendary", "overtime3", function (n) { return "Failed proc rolls get one reroll (up to " + Math.min(5, nn(n)) + " per second)."; }, { stats: function (n, S) { S.luckItems += Math.min(5, n); } });
  item("xmasmorning", "Christmas Morning", "🎁", "legendary", "fusion", function (n) { return "Chains, bounces and blasts that kill restart at full damage, up to " + Math.min(5, 1 + nn(n)) + " times per chain."; }, { canChain: true });
  item("stocking", "Stocking Stuffer", "🧦", "legendary", "season", function (n) { return "Each level-up: gain " + Math.min(3, nn(n)) + " random Common item" + (nn(n) > 1 ? "s" : "") + "."; }, { counterLabel: "items stuffed this run" });
  item("goldstar", "Golden Star", "⭐", "legendary", "nogear", function (n) { n = nn(n); return "Crit multiplier +" + f1(1 + 0.5 * (n - 1)) + ". Crits flash gold."; }, { stats: function (n, S) { S.critMult += 1 + 0.5 * (n - 1); } });

  // ---- Kudzu contracts (4)
  item("kudzucutting", "Kudzu Cutting", "🌱", "kudzu", "kudzuweather", function () { return "Rest of this stage: every Common item counts +2 stacks. Next stage: healing halved."; });
  item("overtimeslip", "Overtime Slip", "📝", "kudzu", "kudzuweather", function () { return "Rest of this stage: Tinsel x2. Next stage: the Forecast clock runs 1.4x faster."; });
  item("fortunecake", "Fruitcake of Fortune", "🍰", "kudzu", "kudzuweather", function () { return "Rest of this stage: damage x1.4. Next stage: max HP x0.75."; });
  item("vinecontract", "Vine Contract", "🍃", "kudzu", "kudzuweather", function () { return "Rest of this stage: XP +60%. Next stage: enemies +15% speed."; });

  // ---------------------------------------------------------------------------
  // Crew Bonuses (6)
  // ---------------------------------------------------------------------------
  function tagCount(run, tag) {
    var c = 0;
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i]; if (!w) continue;
      var d = w.def; if (d.tag === tag || (d.tags2 && d.tags2.indexOf(tag) >= 0)) c++;
    }
    return c;
  }
  KS.registerCrewBonus({ id: "freshedge", name: "Fresh Edge", desc: "3+ Blade weapons: +15% crit chance.", flavor: TEXT.crewBonus.freshedge, icon: "🗡️", test: function (run) { return tagCount(run, "blade") >= 3; }, stats: function (S) { S.crit += 0.15; } });
  KS.registerCrewBonus({ id: "chainreaction", name: "Chain Reaction", desc: "2+ Blast weapons: Blast kills have a 25% chance to set off a small blast.", flavor: TEXT.crewBonus.chainreaction, icon: "💥", test: function (run) { return tagCount(run, "blast") >= 2; } });
  KS.registerCrewBonus({ id: "fullload", name: "Full Load", desc: "3+ Haul weapons: +1 projectile on Haul weapons.", flavor: TEXT.crewBonus.fullload, icon: "🚛", test: function (run) { return tagCount(run, "haul") >= 3; } });
  KS.registerCrewBonus({ id: "partyline", name: "Party Line", desc: "3+ Ring weapons: chains and bounces get +2 jumps.", flavor: TEXT.crewBonus.partyline, icon: "📞", test: function (run) { return tagCount(run, "ring") >= 3; } });
  KS.registerCrewBonus({ id: "coldsnap", name: "Cold Snap", desc: "2+ Frost weapons: freezes last 50% longer.", flavor: TEXT.crewBonus.coldsnap, icon: "❄️", test: function (run) { return tagCount(run, "frost") >= 2; }, stats: function (S) { S.freezeDurMul += 0.5; } });
  KS.registerCrewBonus({ id: "steamline", name: "Steam Line", desc: "Frost + Fire: fire hits on frozen enemies shatter the ice in a burst.", flavor: TEXT.crewBonus.steamline, icon: "♨️", test: function (run) { return tagCount(run, "frost") >= 1 && tagCount(run, "fire") >= 1; } });

  // ---------------------------------------------------------------------------
  // KS.items
  // ---------------------------------------------------------------------------
  function isChainSrc(src) { return src.tag === "blast" || src.tag === "ring" || src.bounceIndex > 0; }

  function applyStats(S, run) {
    var i, g, id, d;
    resetCrew(run);
    refresh(run);
    for (i = 0; i < 6; i++) { g = run.gear[i]; if (g && g.def && g.def.stats) g.def.stats(g.level, S); }
    for (i = 0; i < STAT_ITEMS.length; i++) { id = STAT_ITEMS[i]; if (N[id] > 0) KS.defs.items[id].stats(N[id], S); }
    for (i = 0; i < CREW_IDS.length; i++) { d = KS.defs.crewBonuses[CREW_IDS[i]]; if (d && d.stats && run.crew[d.id]) d.stats(S); }
  }
  function resetCrew(run) {
    for (var i = 0; i < CREW_IDS.length; i++) {
      var d = KS.defs.crewBonuses[CREW_IDS[i]], on = false;
      if (d) { try { on = !!d.test(run); } catch (e) { on = false; } }
      if (on) run.crew[CREW_IDS[i]] = true; else delete run.crew[CREW_IDS[i]];
    }
  }
  function applyContracts(S, run) {
    var up = run.contracts.up, down = run.contracts.down;
    if (up === "overtimeslip") S.tinselMul *= 2;
    else if (up === "fortunecake") S.might *= 1.4;
    else if (up === "vinecontract") S.xpMul += 0.6;
    if (down === "kudzucutting") S.healMul *= 0.5;
    else if (down === "fortunecake") S.maxHp *= 0.75;
    run.timeScaleForecast = down === "overtimeslip" ? 1.4 : 1;
  }

  function onHit(H) {
    var run = KS.run; if (!run) return;
    var e = H.enemy, src = H.src, cf = src.procCoef, sid = src.itemId, st = e.st, amt = H.amount, n, p, k;
    if (!(cf > 0)) return;
    if (run.crew.steamline && src.tag === "fire" && st.freeze > 0) {
      st.freeze = 0; if (st.freezeImm < 1) st.freezeImm = 1;
      ps(src, "steamline"); KS.procs.push("blast", e.x, e.y, 50, 3 * amt, 0, 0.2, PS, 0);
      KS.fx("sparks", e.x, e.y, "#bfe6f2", 8, 3);
    }
    if (H.crit) {
      n = N.splinters;
      if (n > 0 && sid !== "splinters") { KS.applyStatus(e, "splinter", 0.5 * amt * n, 2.5, src); cnt("splinters", 1); }
      if (N.goldstar > 0) KS.fx("sparks", e.x, e.y, "#f2c230", 3, 2);
    }
    n = N.matches;
    if (n > 0 && sid !== "matches") {
      p = 0.15 * n * cf; k = Math.floor(p); if (k > 3) k = 3;
      if (k < 3 && roll(p - Math.floor(p))) k++;
      if (k > 0) { KS.applyStatus(e, "burn", 0.3 * amt * k, 4, src); cnt("matches", 1); }
    }
    n = N.scraper;
    if (n > 0 && sid !== "scraper" && roll(Math.min(1, 0.12 * n * cf))) { KS.applyStatus(e, "chill", 1, 2, src); cnt("scraper", 1); }
    n = N.mallet;
    if (n > 0 && sid !== "mallet" && roll(0.25 * (1 - 1 / (1 + 0.2 * n)) * cf)) { KS.applyStatus(e, "stun", 0, 0.5, src); cnt("mallet", 1); }
    n = N.jumper;
    if (n > 0 && sid !== "jumper" && (st.chill > 0 || st.freeze > 0 || st.chillStacks > 0 || st.shock > 0) && roll(0.3 * cf)) {
      var rm = rangeMul(), nb = KS.nearestEnemy(e.x, e.y, 140 * rm, e);
      if (nb) {
        ps(src, "jumper");
        KS.procs.push("arc", e.x, e.y, Math.min(20, 2 + n + (N.extcord || 0)), 0.6 * amt, 140 * rm, 0.3, PS, nb.uid);
        cnt("jumper", 1);
      }
    }
    if (N.bigbulb > 0 && st.strung < 3) KS.applyStatus(e, "strung", 0, 4, src);
    n = N.polexfmr;
    if (n > 0 && cf >= 0.5 && sid !== "polexfmr") {
      ST.polexN++;
      if (ST.polexN >= Math.max(4, 12 - 2 * (n - 1)) && run.time >= ST.polexCd) {
        ST.polexN = 0; ST.polexCd = run.time + 0.5;
        ps(src, "polexfmr"); KS.procs.push("strike", e.x, e.y, 90, 6 * KS.itemBase(), 0, 0.2, PS, e.uid);
      }
    }
    ST.kAmt = amt; ST.kUid = e.uid;
  }

  function onKill(K) {
    var run = KS.run; if (!run) return;
    var src = K.src, sid = src.itemId, e = K.enemy, st = e.st, n, i, reps = 1, base, kcf = src.procCoef > 0 ? src.procCoef : 0.5, x = K.x, y = K.y;
    var kAmt = ST.kUid === e.uid ? ST.kAmt : 0;
    base = KS.itemBase();
    n = N.brushpile;
    if (n > 0) {
      var t = Math.min(3, 1 + 2 * n / (n + 2)); reps = Math.floor(t);
      if (KS.rng.next() < t - reps) reps++;
    }
    for (i = 0; i < reps; i++) {
      if (N.coal > 0 && sid !== "coal") {
        ps(src, "coal"); KS.procs.push("blast", x, y, 50 + 15 * N.coal, 1.5 * base, 0, 0.2, PS, 0); cnt("coal", 1);
      }
      n = N.bellcollar;
      if (n > 0 && sid !== "bellcollar" && roll(0.08 * n * kcf)) { ps(src, "bellcollar"); KS.procs.push("i_shock", x, y, 120, 2 * base, 260, 0.2, PS, 0); }
      n = N.cider;
      if (n > 0 && sid !== "cider") {
        var pl = run.player;
        if (pl.hp < pl.maxHp * 0.5) {
          var room = 20 - ST.healUsed;
          if (room > 0) { var h = KS.healPlayer(Math.min(n, room), "cider"); ST.healUsed += h; cnt("cider", h); }
        } else KS.addBarrier(0.2 * n, 0);
      }
      n = N.hopper;
      if (n > 0 && sid !== "hopper") { ps(src, "hopper"); KS.procs.push("chips", x, y, Math.min(24, 4 + 2 * (n - 1)), base, 0, 0.25, PS, 0); }
      n = N.bigbulb;
      if (n > 0 && st.strung > 0) {
        ps(src, "bigbulb"); KS.procs.push("current", x, y, 20, 3 * base * (0.6 + 0.4 * (n - 1)), 220 * rangeMul(), 0.3, PS, 0);
      }
      n = N.kerosene;
      if (n > 0 && sid !== "kerosene" && (st.burn > 0 || st.splinter > 0)) {
        var dmg = Math.min(40 * base, (0.25 + 0.15 * (n - 1)) * e.maxHp);
        ps(src, "kerosene"); KS.procs.push("blast", x, y, 80, dmg, 0, 0.2, PS, 0); cnt("kerosene", 1);
      }
      n = N.matches;
      if (n > 0 && sid !== "matches" && st.burn > 0) {
        ps(src, "matches"); KS.procs.push("spreadBurn", x, y, Math.min(8, 1 + n), st.burnDps > 0 ? st.burnDps : 0.3 * base, 3, 1, PS, 0);
      }
      if (run.crew.chainreaction && src.tag === "blast" && sid !== "chainreaction" && KS.rng.next() < 0.25) {
        ps(src, "chainreaction"); KS.procs.push("blast", x, y, 40, 0.5 * (kAmt > 0 ? kAmt : base), 0, 0.2, PS, 0);
      }
    }
    n = N.wreath;
    if (n > 0 && sid !== "wreath") {
      ST.wreathN++;
      if (ST.wreathN >= 10) { ST.wreathN = 0; KS.addBarrier(4 * n, 3); cnt("wreath", 4 * n); }
    }
    n = N.xmasmorning;
    if (n > 0 && isChainSrc(src) && src.restarts < Math.min(5, 1 + n)) {
      var amt2 = kAmt > 0 ? kAmt : base;
      ps(src, "xmasmorning"); PS.restarts = src.restarts + 1;
      if (src.tag === "ring") {
        var nb = KS.nearestEnemy(x, y, 140 * rangeMul(), e);
        if (nb) KS.procs.push("arc", x, y, 3, amt2, 140 * rangeMul(), 0.3, PS, nb.uid);
      } else KS.procs.push("blast", x, y, 70, amt2, 0, 0.2, PS, 0);
    }
  }

  function onHurt(amount) {
    var run = KS.run; if (!run) return;
    var n = N.airhorn, pl = run.player;
    if (n > 0 && run.time >= ST.airCd) {
      ST.airCd = run.time + 6 / (1 + 0.15 * (n - 1));
      PS.team = "player"; PS.depth = 0; PS.slot = 7; PS.restarts = 0; PS.itemId = "airhorn"; PS.procCoef = 1;
      KS.procs.push("i_horn", pl.x, pl.y, 180, 4 * KS.itemBase(), 0, 0.2, PS, 0);
    }
    if (N.chaps > 0) KS.addBuff("chaps", 1 + N.chaps);
  }

  function onLethal(run) {
    run = run || KS.run; if (!run) return false;
    var raw = run.items.generator || 0, used = run.genUsed || 0;
    if (raw <= used || used >= 3) return false;
    run.genUsed = used + 1;
    var pl = run.player, n = KS.grid.query(pl.x, pl.y, 300, BUF_A, 256), i, e, dx, dy, l;
    pl.hp = 0.4 * pl.maxHp; pl.iframes = 2;
    for (i = 0; i < n; i++) {
      e = BUF_A[i]; if (!e.alive || e.isBoss || e.stationary) continue;
      dx = e.x - pl.x; dy = e.y - pl.y; l = Math.sqrt(dx * dx + dy * dy) || 1;
      e.kbx += dx / l * 700 / (e.mass || 1); e.kby += dy / l * 700 / (e.mass || 1);
    }
    KS.addBarrier(0.25 * pl.maxHp, 15);
    KS.fx("ring", pl.x, pl.y, "#f2c230", 1, 300); KS.fx("sparks", pl.x, pl.y, "#f2c230", 14, 4); KS.flash("#fff6c0", 0.3); KS.shake(10);
    run.itemCounters.generator = Math.max(0, Math.min(3, raw) - run.genUsed);
    return true;
  }

  function tick(dt, run) {
    if (!run) return;
    if (ST.run !== run) { resetState(run); refresh(run); }
    var pl = run.player, n, i, c = run.contracts;
    if (run.stepN % 60 === 0) { ST.healUsed = 0; ST.luckLeft = run.stats.luckItems; }
    if (c.down === "vinecontract") run.spdMul = Math.min(1.8, run.spdMul * 1.15);
    if (!pl.alive) return;
    n = N.advent;
    if (n > 0) {
      ST.advT -= dt;
      if (ST.advT <= 0) {
        ST.advT += 24 / (1 + 0.1 * (n - 1));
        var r = KS.rng.int(0, 2), ox = KS.rng.range(-50, 50), oy = KS.rng.range(-50, 50);
        if (r === 0) KS.spawnPickup("heal", pl.x + ox, pl.y + oy, 20);
        else if (r === 1) KS.spawnPickup("magnet", pl.x + ox, pl.y + oy, 1);
        else KS.spawnPickup("tinsel", pl.x + ox, pl.y + oy, 5 * run.coeff);
        cnt("advent", 1); KS.fx("sparks", pl.x + ox, pl.y + oy, "#b3261e", 6, 3);
      }
    }
    n = N.rocksalt;
    if (n > 0) {
      ST.saltT -= dt;
      if (ST.saltT <= 0) {
        ST.saltT += 3;
        var grains = Math.min(24, 4 + 2 * (n - 1)), base = KS.itemBase() * 0.6, sp = 520 * run.stats.projSpeed;
        for (i = 0; i < grains; i++) {
          var t = KS.randomEnemyNear(pl.x, pl.y, 300); if (!t) break;
          if (!KS.itemProjOk()) break;
          var a = Math.atan2(t.y - pl.y, t.x - pl.x);
          KS.spawnProj(SALT, 6, pl.x, pl.y, Math.cos(a) * sp, Math.sin(a) * sp, { dmg: base, baseDmg: base, pierce: 0, life: 0.9, r: 4, procCoef: 0.5, depth: 1, itemId: "rocksalt", kb: 20, slot: 6, bounces: KS.items.extraBounces() });
          cnt("rocksalt", 1);
        }
      }
    }
    n = N.floodlight;
    if (n > 0) {
      ST.floodT -= dt;
      if (ST.floodT <= 0) {
        ST.floodT += 8;
        var m = KS.grid.query(pl.x, pl.y, 220, BUF_B, 256), dur = Math.min(2.5, 0.8 + 0.3 * (n - 1)), got = 0;
        HS_B.team = "player"; HS_B.depth = 0; HS_B.slot = 7; HS_B.itemId = "floodlight"; HS_B.restarts = 0;
        for (i = 0; i < m; i++) { var fe = BUF_B[i]; if (fe.alive) { KS.applyStatus(fe, "stun", 0, dur, HS_B); got++; } }
        if (got) cnt("floodlight", got);
        KS.fx("ring", pl.x, pl.y, "#fff2a0", 1, 220);
      }
    }
  }

  function give(id, count, source) {
    var run = KS.run, def = KS.defs.items[id];
    if (!run || !def) return;
    count = count > 0 ? Math.floor(count) : 1;
    if (def.rarity === "kudzu") { signContract(id, source); return; }
    var old = run.items[id] || 0, now = Math.min(99, old + count);
    if (now === old) return;
    run.items[id] = now;
    if (!old) run.itemOrder.push(id);
    if (id === "generator") run.itemCounters.generator = Math.max(0, Math.min(3, now) - (run.genUsed || 0));
    refresh(run);
    if (def.onPickup) { try { def.onPickup(now, run); } catch (e) { KS.reportError("items", e); } }
    KS.recalcStats();
    KS.emit("itemGet", { id: id, count: now, rarity: def.rarity, source: source || "" });
  }
  function remove(id, count) {
    var run = KS.run; if (!run) return;
    var old = run.items[id] || 0; if (!old) return;
    var now = old - (count > 0 ? Math.floor(count) : 1);
    if (now <= 0) {
      delete run.items[id];
      var ix = run.itemOrder.indexOf(id); if (ix >= 0) run.itemOrder.splice(ix, 1);
    } else run.items[id] = now;
    refresh(run); KS.recalcStats();
  }
  function signContract(id, source) {
    var run = KS.run; if (!run) return;
    if (run.contracts.up) return;
    run.contracts.up = id;
    run.items[id] = 1; if (run.itemOrder.indexOf(id) < 0) run.itemOrder.push(id);
    refresh(run); KS.recalcStats();
    KS.emit("itemGet", { id: id, count: 1, rarity: "kudzu", source: source || "shrine" });
  }

  KS.items = {
    onHit: onHit, onKill: onKill, onHurt: onHurt, onLethal: onLethal, tick: tick, applyStats: applyStats, applyContracts: applyContracts,
    dmgMul: function (e, src) {
      var run = KS.run, m = 1, n;
      if (!run) return 1;
      n = N.tapemeasure;
      if (n > 0) { var pl = run.player, dx = e.x - pl.x, dy = e.y - pl.y; if (dx * dx + dy * dy > 40000) m *= 1 + 0.12 * n; }
      n = N.stumpremover;
      if (n > 0 && (e.stationary || e.objective || e.defId === "fueldrum")) m *= 1 + 0.4 * n;
      n = N.ram;
      if (n > 0 && !e.rammed && !src.isDot) {
        e.rammed = true; m *= 2 + 0.5 * (n - 1);
        if (!e.isBoss && !e.stationary) {
          var rx = e.x - run.player.x, ry = e.y - run.player.y, rl = Math.sqrt(rx * rx + ry * ry) || 1;
          e.kbx += rx / rl * 200 / (e.mass || 1); e.kby += ry / rl * 200 / (e.mass || 1);
        }
      }
      return m;
    },
    bounceMul: function (i) { var b = N.bungee; return b > 0 ? Math.min(3, 1 + 0.1 * b * i) : Math.pow(0.8, i); },
    extraBounces: function () { return (N.ribbon || 0) + (N.bungee || 0); },
    extraJumps: function () { var r = KS.run; return (N.extcord || 0) + (r && r.crew && r.crew.partyline ? 2 : 0); },
    rangeMul: rangeMul,
    give: give, remove: remove,
    count: function (id) { var r = KS.run; return r ? (r.items[id] || 0) : 0; },
    onStageStart: function (run) {
      if (ST.run !== run) { resetState(run); }
      var c = run.contracts;
      if (c.down) {
        var ix;
        delete run.items[c.down]; ix = run.itemOrder.indexOf(c.down); if (ix >= 0) run.itemOrder.splice(ix, 1);
        c.down = null;
      }
      if (c.up) { c.down = c.up; c.up = null; }
      refresh(run);
      if (N.almanac > 0) run.rerolls += N.almanac;
      ST.polexN = 0;
    },
    onLevelUp: function (run) {
      var n = N.stocking; if (!(n > 0)) return;
      var pool = [], i, id;
      for (i = 0; i < ITEM_IDS.length; i++) {
        id = ITEM_IDS[i];
        if (KS.defs.items[id].rarity !== "common") continue;
        var ok = true; try { ok = KS.meta.isUnlocked("item", id) !== false; } catch (e) { ok = true; }
        if (ok && (run.items[id] || 0) < 99) pool.push(id);
      }
      var give3 = Math.min(3, n);
      for (i = 0; i < give3 && pool.length; i++) { give(pick(KS.rng, pool), 1, "stocking"); cnt("stocking", 1); }
    }
  };

  // events
  KS.on("runStart", function (ev) { resetState(ev.run); refresh(ev.run); });
  KS.on("stageClear", function (ev) {
    var run = ev.run; if (!run || !run.player) return;
    var n = N.lunchbox; if (n > 0) KS.healPlayer(run.player.maxHp * (0.2 + 0.1 * (n - 1)), "lunchbox");
  });
  KS.on("seasonClear", function () {
    var run = KS.run; if (run && run.genUsed > 0) { run.genUsed--; run.itemCounters.generator = Math.max(0, Math.min(3, run.items.generator || 0) - run.genUsed); }
  });
})(window.KS);
