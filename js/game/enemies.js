/* Kudzu Survivors v2: enemies.js (ENG-ENEMY)
 * 21 archetypes + minions + mimic, 9 elite affixes, enemy projectile styles, hazards e_*, and the Director.
 * Contract: CONTRACT 9.3 / 17.8, DESIGN 6.1-6.3. Cross-module calls are resolved at call time (rule 8).
 */
(function (KS) {
  "use strict";
  var TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------
  // TEXT: every joke / quip / label lives here for review (rule 10)
  // ---------------------------------------------------------------------------
  var TEXT = {
    surgeTitle: "SURGE: ",
    surgeSub: "Hold the line, crew.",
    surgeNames: {
      runner: "Runner Rush", sweetgum: "Sweetgum Season", sapling: "Volunteer Pine Parade", stump: "Stump Convention",
      hedgehog: "Privet Pile-Up", creeper: "Tinsel Tangle", snare: "Grapevine Gathering", pitcher: "Pinecone Barrage",
      spitter: "Cattail Crowd", briar: "Briar Patch Party", mistletoe: "Mistletoe Mob", holly: "Holly Hedge Row",
      caroler: "Carol Service", rootwad: "Root Wad Rumble", wisteria: "Wisteria Wave", sparker: "Light Show",
      willwreath: "Wreath Wanderers", ivy: "Ivy League", crow: "Murder of Tinsel Crows", antmound: "Ant Picnic"
    },
    codex: {
      runner: { notes: "The most common vine on any job site. Mostly leaf, entirely determined.", joke: "Has never once read the safety sign, because it is a vine.", tip: "Keep moving and let your weapons do the thinking." },
      sweetgum: { notes: "Spiky seed balls that fall off the trees in bunches and roll away from where they land.", joke: "Technically a nuisance, practically a foot-care product.", tip: "Watch the shadow. Nothing hurts you until it lands." },
      sapling: { notes: "A volunteer pine that nobody planted. It will replant itself mid-fight if hurt badly enough.", joke: "Already decorated. We did not ask who by.", tip: "Finish it while it is rooted: it drops double XP then." },
      stump: { notes: "A stump that decided it was not done yet. Slow, heavy and very hard to push around.", joke: "Claims it has seniority.", tip: "Do not try to knock it back. Walk around it." },
      hedgehog: { notes: "A privet bush that curls up and rolls straight at you.", joke: "Trimmed twice a year, still holds a grudge.", tip: "Sidestep the charge, then hit it during the recovery." },
      creeper: { notes: "Silver tinsel vine. Roots down near you and lashes in a ring.", joke: "Festive, shiny and absolutely not a decoration.", tip: "Step out of the ring while it winds up." },
      snare: { notes: "A grapevine that latches on and slows you down.", joke: "Clingy in a way no coworker should be.", tip: "Hit it three times or just keep moving and it lets go." },
      pitcher: { notes: "A cone-shaped pine that lobs pinecones from a distance.", joke: "Never misses a chance to throw a party. Or a cone.", tip: "The red circle is where the cone lands. Leave it." },
      spitter: { notes: "A cattail on a stalk that spits seeds in a three-way fan.", joke: "Fires first, asks questions never.", tip: "Slip between the seeds or close the gap." },
      briar: { notes: "A thorn bundle that bursts into thorns when cleared.", joke: "Gives back everything you give it.", tip: "Kill it at range and sidestep the spray." },
      mistletoe: { notes: "Mistletoe splits into sprigs, which split into berries.", joke: "Everyone is under it eventually.", tip: "Use area damage. It is three fights in one." },
      holly: { notes: "A hedge that faces you and blocks anything thrown at it.", joke: "Deck the halls, then stand in the doorway.", tip: "Auras, zones and melee go through. Flank it." },
      caroler: { notes: "Compost mound with a lantern. Heals and hurries nearby vines.", joke: "Knows all the words and none of the notes.", tip: "Take the caroler first, the chorus follows." },
      rootwad: { notes: "Tunnels toward you, then erupts from the ground.", joke: "Does not do a stand-up job.", tip: "The crack ring shows the blast. Walk out of it." },
      wisteria: { notes: "A drape of lavender that never moves but keeps sending runners.", joke: "Beautiful, and a legal liability.", tip: "Kill it early or the field fills up." },
      sparker: { notes: "A short string of bulbs that charges you and pops.", joke: "Tested by the crew for exactly one season.", tip: "Back away when the blinking speeds up. It hurts vines too." },
      willwreath: { notes: "A glowing wreath that drifts, shimmers and blinks forward.", joke: "Has a very flexible commute.", tip: "When it flickers, step sideways." },
      mimic: { notes: "A toolbox that is a little too interested in you.", joke: "Always reads the manual. Always at the worst time.", tip: "Do not stand next to loose toolboxes." },
      crow: { notes: "Grabs XP gems off the ground and runs.", joke: "Loves tinsel more than payroll does.", tip: "Kill it and you get double back." },
      ivy: { notes: "A wreath of three-leaf ivy that leaves itchy patches behind.", joke: "Leaves a rash of paperwork wherever it goes.", tip: "Do not stand on the patches, and do not chase it into them." },
      antmound: { notes: "A mound that sends out a stream of small fast ants.", joke: "The only crew that never takes a break.", tip: "Destroy the mound or keep your feet moving." },
      mistletoe_sprig: { notes: "A mistletoe cluster, broken in half.", joke: "Smaller. Still pointy.", tip: "They split again." },
      mistletoe_berry: { notes: "The last of the mistletoe.", joke: "A berry nice end.", tip: "Mop up." },
      fireant: { notes: "Tiny, quick and annoyed.", joke: "Clocked in early.", tip: "Take the mound out." }
    }
  };

  // ---------------------------------------------------------------------------
  // Shared helpers (all allocation-free in hot paths)
  // ---------------------------------------------------------------------------
  var INK = "#2a1f1a";
  var QA = new Array(64), QB = new Array(64);
  var ESRC = KS.makeSrc(); ESRC.team = "enemy"; ESRC.slot = -1; ESRC.procCoef = 0; ESRC.canCrit = false; ESRC.noProc = true; ESRC.noOnKill = true;
  var SC = { x: 0, y: 0, r: 14 };
  var PT = { x: 0, y: 0 };

  function hasCond(run, id) { var c = run.condition; return !!(c && c.indexOf(id) >= 0); }
  function chase(e, sp, p) {
    var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx);
    return d;
  }
  function stop(e) { e.vx = 0; e.vy = 0; }
  function go(e, st) { e.state = st; e.stateT = 0; }
  function spd(e) { return e.speed * (e.ai.sb > 0 ? e.ai.sbm : 1); }
  function smul(e) { return e.baseSpeed / (e.def.speed || 1); }
  function throttle(e, run) { return ((e.uid + run.stepN) % 12) === 0; }
  function countKids(run, e) {
    var l = run.enemies.list, n = run.enemies.n, c = 0;
    for (var i = 0; i < n; i++) { var o = l[i]; if (o.alive && o.parentUid === e.uid) c++; }
    return c;
  }
  function body(e, c) { return e.flash > 0 ? "#ffffff" : c; }
  function dot(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function oval(ctx, x, y, rx, ry, rot, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU); ctx.fill(); }
  function tri(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y); ctx.lineTo(x - w, y); ctx.closePath(); ctx.fill(); }
  function spikes(ctx, x, y, r0, r1, n, rot, c, lw) {
    ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath();
    for (var i = 0; i < n; i++) { var a = rot + i * TAU / n, ca = Math.cos(a), sa = Math.sin(a); ctx.moveTo(x + ca * r0, y + sa * r0); ctx.lineTo(x + ca * r1, y + sa * r1); }
    ctx.stroke();
  }
  function ringHit(run, x, y, r) {
    var p = run.player, dx = p.x - x, dy = p.y - y, rr = r + p.r;
    return p.alive && dx * dx + dy * dy <= rr * rr;
  }

  // Register wrapper: gives every enemy a speed-buff timer (ai.sb / ai.sbm) and a running state timer.
  function reg(def) {
    var init = def.init, upd = def.update;
    def.init = function (e, run) { var a = e.ai; a.sb = 0; a.sbm = 1; if (TEXTC[def.id]) { /* codex already on def */ } if (init) init(e, run); };
    def.update = function (e, dt, run) { var a = e.ai; e.stateT += dt; if (a.sb > 0) a.sb -= dt; upd(e, dt, run); };
    if (!def.codex) def.codex = TEXT.codex[def.id] || { notes: "", joke: "", tip: "" };
    def._cnt = 0;
    return KS.registerEnemy(def);
  }
  var TEXTC = {};

  // ---------------------------------------------------------------------------
  // Enemy projectile styles: pinecone, seed, thorn, bullet, orb (dark ink outline, drawn on top)
  // ---------------------------------------------------------------------------
  KS.registerEProjStyle({
    id: "pinecone",
    update: function (q, dt, run) {
      var d = q.data, k = q.t / d.dur;
      if (k >= 1) {
        q.x = d.tx; q.y = d.ty;
        if (ringHit(run, d.tx, d.ty, d.rad)) KS.hurtPlayer(q.dmg, "proj", d.tx, d.ty);
        KS.fx("burst", d.tx, d.ty, "#8a5a2b", 8, 3); KS.fx("ring", d.tx, d.ty, "#efe2c4", 1, d.rad * 0.6); KS.shake(2);
        q.alive = false; return true;
      }
      q.x = d.sx + (d.tx - d.sx) * k; q.y = d.sy + (d.ty - d.sy) * k;
      return true;
    },
    draw: function (ctx, q) {
      var d = q.data, k = Math.min(1, q.t / (d.dur || 1)), h = Math.sin(k * Math.PI) * 90;
      oval(ctx, q.x, q.y + 4, 9 - h * 0.03, 4, 0, "rgba(0,0,0,0.3)");
      var y = q.y - h;
      ctx.fillStyle = "#8a5a2b"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(q.x, y, 8, 11, q.t * 5, 0, TAU); ctx.fill(); ctx.stroke();
      spikes(ctx, q.x, y, 3, 9, 6, q.t * 5, "#5b3a1a", 1.5);
    }
  });
  KS.registerEProjStyle({
    id: "seed",
    draw: function (ctx, q) {
      var a = Math.atan2(q.vy, q.vx);
      ctx.fillStyle = "#c9993b"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(q.x, q.y, 8, 4.5, a, 0, TAU); ctx.fill(); ctx.stroke();
      oval(ctx, q.x - Math.cos(a) * 3, q.y - Math.sin(a) * 3, 3, 1.6, a, "#f6e27a");
    }
  });
  KS.registerEProjStyle({
    id: "thorn",
    draw: function (ctx, q) {
      var a = Math.atan2(q.vy, q.vx), c = Math.cos(a), s = Math.sin(a);
      ctx.fillStyle = "#c2392b"; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(q.x + c * 9, q.y + s * 9); ctx.lineTo(q.x - c * 5 - s * 4, q.y - s * 5 + c * 4); ctx.lineTo(q.x - c * 5 + s * 4, q.y - s * 5 - c * 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  });
  KS.registerEProjStyle({
    id: "bullet",
    draw: function (ctx, q) {
      dot(ctx, q.x, q.y, q.r + 2, INK); dot(ctx, q.x, q.y, q.r, q.color || "#c2392b"); dot(ctx, q.x - q.r * 0.3, q.y - q.r * 0.3, q.r * 0.35, "rgba(255,255,255,0.6)");
    }
  });
  KS.registerEProjStyle({
    id: "orb",
    update: function (q, dt, run) {
      var b = run.bounds;
      if (q.x < b.x0 + q.r) { q.x = b.x0 + q.r; q.vx = Math.abs(q.vx); } else if (q.x > b.x1 - q.r) { q.x = b.x1 - q.r; q.vx = -Math.abs(q.vx); }
      if (q.y < b.y0 + q.r) { q.y = b.y0 + q.r; q.vy = Math.abs(q.vy); } else if (q.y > b.y1 - q.r) { q.y = b.y1 - q.r; q.vy = -Math.abs(q.vy); }
      return false;
    },
    draw: function (ctx, q, t) {
      var pulse = 1 + Math.sin(t * 9 + q.uid) * 0.12;
      dot(ctx, q.x, q.y, (q.r + 3) * pulse, INK);
      dot(ctx, q.x, q.y, q.r * pulse, q.color || "#7a2a1e");
      dot(ctx, q.x, q.y, q.r * 0.55 * pulse, "rgba(255,240,200,0.55)");
    }
  });

  // ---------------------------------------------------------------------------
  // Hazards (e_ prefix): itch patch, ice patch
  // ---------------------------------------------------------------------------
  KS.registerHazard({
    id: "e_itchpatch", team: "enemy", autoDamage: true, dmg: 3, tick: 0.5, slowMul: 0.85, terrain: true, cosmetic: true, r: 28, life: 4,
    draw: function (ctx, h, t) {
      var a = Math.min(1, h.life) * 0.55;
      ctx.globalAlpha = a; oval(ctx, h.x, h.y, h.r, h.r * 0.75, 0, "#6b5a8e"); oval(ctx, h.x, h.y, h.r * 0.65, h.r * 0.5, 0.4, "#8a2e4a");
      ctx.globalAlpha = Math.min(1, h.life) * 0.9; spikes(ctx, h.x, h.y, 4, h.r * 0.85, 9, h.uid, "#d9b7e8", 1.5);
      ctx.globalAlpha = 1;
    }
  });
  KS.registerHazard({
    id: "e_icepatch", team: "enemy", autoDamage: false, slowMul: 0.8, terrain: true, cosmetic: true, r: 30, life: 4,
    draw: function (ctx, h, t) {
      var a = Math.min(1, h.life);
      ctx.globalAlpha = a * 0.55; oval(ctx, h.x, h.y, h.r, h.r * 0.8, 0.3, "#bfe6ff");
      ctx.globalAlpha = a * 0.8; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.8, 0.3, 0, TAU); ctx.stroke();
      spikes(ctx, h.x, h.y, 3, h.r * 0.6, 5, h.uid, "#ffffff", 1.2);
      ctx.globalAlpha = 1;
    }
  });

  // ---------------------------------------------------------------------------
  // Archetypes
  // ---------------------------------------------------------------------------
  // runner
  reg({
    id: "runner", name: "Kudzu Runner", hp: 8, speed: 55, r: 12, dmg: 5, xp: 1, firstMin: 0, lastMin: 14, weight: 10, color: "#3f8f3a",
    init: function (e) { e.ai.orb = 0; e.state = "chase"; },
    update: function (e, dt, run) { if (e.ai.orb > 0) { stop(e); return; } chase(e, spd(e), run.player); },
    draw: function (ctx, e, t) {
      var w = Math.sin(t * 9 + e.uid) * 0.18, f = e.face + w, r = e.r, c = body(e, "#3f8f3a");
      for (var i = -1; i <= 1; i++) {
        var a = f + i * 0.95, cx = e.x + Math.cos(a) * r * 0.4, cy = e.y + Math.sin(a) * r * 0.4;
        oval(ctx, cx, cy, r * 0.8, r * 0.46, a, c);
      }
      ctx.strokeStyle = e.flash > 0 ? "#ddd" : "#2a5e27"; ctx.lineWidth = 1.2; ctx.beginPath();
      for (var j = -1; j <= 1; j++) { var b = f + j * 0.95; ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(b) * r * 1.1, e.y + Math.sin(b) * r * 1.1); }
      ctx.stroke();
    }
  });

  // sweetgum
  reg({
    id: "sweetgum", name: "Sweetgum Ball", hp: 6, speed: 100, r: 9, dmg: 4, xp: 1, firstMin: 0.6, lastMin: 18, weight: 3, group: [5, 5], place: "drop", color: "#6b4423",
    untargetableStates: ["drop"],
    init: function (e) {
      var a = e.ai; a.cx = e.x; a.cy = e.y; a.dx = 1; a.dy = 0; a.sp = 0; a.hs = 0;
      go(e, "drop"); e.noContact = true; e.untargetable = true; a.hs = 0.6 + KS.rng.next() * 0.25;
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, b = run.bounds;
      a.sp += dt * 9;
      if (e.state === "drop") {
        stop(e);
        if (e.stateT >= 0.8) {
          var dx = e.x - a.cx, dy = e.y - a.cy, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 1) { var an = KS.rng.next() * TAU; dx = Math.cos(an); dy = Math.sin(an); d = 1; }
          a.dx = dx / d; a.dy = dy / d; e.noContact = false; e.contactCd = 0.5; go(e, "scatter");
          KS.fx("burst", e.x, e.y, "#6b4423", 3, 2);
        }
      } else if (e.state === "scatter") {
        e.vx = a.dx * 120 * smul(e); e.vy = a.dy * 120 * smul(e);
        if (e.x <= b.x0 + e.r + 2) a.dx = Math.abs(a.dx); else if (e.x >= b.x1 - e.r - 2) a.dx = -Math.abs(a.dx);
        if (e.y <= b.y0 + e.r + 2) a.dy = Math.abs(a.dy); else if (e.y >= b.y1 - e.r - 2) a.dy = -Math.abs(a.dy);
        if (e.stateT >= 1.5) go(e, "chase");
      } else chase(e, spd(e), p);
    },
    draw: function (ctx, e, t) {
      var a = e.ai, r = e.r;
      if (e.state === "drop") {
        var k = Math.min(1, e.stateT / 0.8), h = (1 - k) * (1 - k) * 280;
        ctx.strokeStyle = "rgba(179,38,30," + (0.35 + k * 0.4).toFixed(2) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, r * (0.6 + k * 0.8), r * 0.4 * (0.6 + k * 0.8), 0, 0, TAU); ctx.stroke();
        oval(ctx, e.x, e.y + 4, r * k, r * 0.4 * k, 0, "rgba(0,0,0,0.3)");
        e = { x: e.x, y: e.y - h, r: r, flash: e.flash, ai: a };
      }
      dot(ctx, e.x, e.y, r, body(e, "#6b4423"));
      spikes(ctx, e.x, e.y, r * 0.8, r * 1.35, 10, a.sp, e.flash > 0 ? "#fff" : "#3d2614", 2.2);
      dot(ctx, e.x - r * 0.25, e.y - r * 0.25, r * 0.28, "rgba(255,230,190,0.35)");
    }
  });

  // sapling
  reg({
    id: "sapling", name: "Volunteer Pine", hp: 26, speed: 44, r: 17, dmg: 10, xp: 3, firstMin: 0.4, lastMin: 20, weight: 4, color: "#2f6b3a",
    init: function (e) { var a = e.ai; a.tp = 0; a.regen = 0; e.state = "chase"; },
    update: function (e, dt, run) {
      var a = e.ai;
      if (e.state === "transplant") {
        stop(e); e.stationary = true;
        if (e.stateT >= 3) { e.stationary = false; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3); go(e, "chase"); KS.fx("leaves", e.x, e.y, "#4c8a3a", 6, 3); }
        return;
      }
      if (!a.tp && e.hp <= e.maxHp * 0.5) { a.tp = 1; e.stationary = true; stop(e); go(e, "transplant"); KS.fx("chips", e.x, e.y + 10, "#6b4423", 6, 3); return; }
      chase(e, spd(e), run.player);
    },
    onDeath: function (e, src, run) { if (e.state === "transplant") KS.spawnPickup("xp", e.x + 6, e.y, KS.xpValue(e)); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y + r * 0.3, sway = Math.sin(t * 4 + e.uid) * 1.2;
      if (e.state === "transplant") {
        ctx.strokeStyle = "#5b3a1a"; ctx.lineWidth = 3; ctx.beginPath();
        for (var i = 0; i < 6; i++) { var a = i * TAU / 6 + 0.3; ctx.moveTo(x, y + r * 0.7); ctx.lineTo(x + Math.cos(a) * r * 1.5, y + r * 0.7 + Math.sin(a) * r * 0.7); }
        ctx.stroke(); oval(ctx, x, y + r * 0.8, r * 1.3, r * 0.45, 0, "rgba(90,58,28,0.5)");
      }
      var c = body(e, "#2f6b3a"), c2 = body(e, "#3f8a4a");
      tri(ctx, x + sway, y + r * 0.2, r * 1.0, r * 1.0, c); tri(ctx, x + sway, y - r * 0.35, r * 0.78, r * 0.95, c2); tri(ctx, x + sway, y - r * 0.85, r * 0.5, r * 0.8, c);
      dot(ctx, x - r * 0.35, y + r * 0.05, 2, "#e04a4a"); dot(ctx, x + r * 0.3, y - r * 0.4, 2, "#f6d24a"); dot(ctx, x + sway, y - r * 1.0, 2.4, "#f6e27a");
    }
  });

  // stump
  reg({
    id: "stump", name: "Stump Squatter", hp: 120, speed: 28, r: 22, dmg: 14, xp: 6, firstMin: 2.3, weight: 1.5, mass: 4, color: "#7a5230",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    draw: function (ctx, e) {
      var r = e.r, x = e.x, y = e.y;
      oval(ctx, x, y + 3, r * 1.05, r * 0.9, 0, body(e, "#4e3420"));
      oval(ctx, x, y, r, r * 0.88, 0, body(e, "#7a5230"));
      ctx.strokeStyle = e.flash > 0 ? "#ddd" : "#a3754a"; ctx.lineWidth = 1.6;
      for (var i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, r * i * 0.27, r * i * 0.23, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = e.flash > 0 ? "#ddd" : "#4e3420"; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var j = 0; j < 4; j++) { var a = j * TAU / 4 + 0.7; ctx.moveTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.85); ctx.lineTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.15); }
      ctx.stroke();
      dot(ctx, x - r * 0.25, y - r * 0.15, 2.2, "#2a1f1a"); dot(ctx, x + r * 0.25, y - r * 0.15, 2.2, "#2a1f1a");
    }
  });

  // hedgehog
  reg({
    id: "hedgehog", name: "Privet Hedgehog", hp: 30, speed: 60, r: 14, dmg: 8, xp: 3, firstMin: 3, weight: 2, color: "#2d4f2a",
    init: function (e) { var a = e.ai; a.cd = 1; a.ax = 1; a.ay = 0; e.state = "chase"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player; if (a.cd > 0) a.cd -= dt;
      if (e.state === "chase") {
        var d = chase(e, spd(e), p);
        if (d < 220 && a.cd <= 0) go(e, "curl");
      } else if (e.state === "curl") {
        stop(e);
        if (e.stateT >= 0.6) { var dx = p.x - e.x, dy = p.y - e.y, l = Math.sqrt(dx * dx + dy * dy) || 1; a.ax = dx / l; a.ay = dy / l; e.face = Math.atan2(dy, dx); go(e, "charge"); }
      } else if (e.state === "charge") {
        e.vx = a.ax * 320 * smul(e); e.vy = a.ay * 320 * smul(e);
        if (e.stateT >= 0.7) go(e, "recover");
      } else { stop(e); if (e.stateT >= 1) { a.cd = 1.5; go(e, "chase"); } }
    },
    draw: function (ctx, e, t) {
      var r = e.r, st = e.state, curl = st === "curl", ch = st === "charge";
      var c = body(e, curl ? ((Math.floor(e.stateT * 16) & 1) ? "#d7f0c5" : "#1c3319") : (ch ? "#1f3a1d" : "#2d4f2a"));
      var sq = curl ? 1 - e.stateT * 0.25 : 1, rr = r * (ch ? 1.05 : 1);
      dot(ctx, e.x, e.y, rr * sq, c);
      if (!curl) spikes(ctx, e.x, e.y, rr * 0.85, rr * 1.2, 12, e.uid, e.flash > 0 ? "#fff" : "#1c3319", 2);
      for (var i = 0; i < 7; i++) { var a = i * 2.4 + e.uid * 0.7, d = r * (0.25 + (i % 3) * 0.22); dot(ctx, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 1.6, "#f4f1e6"); }
      if (ch) { ctx.strokeStyle = "rgba(255,255,255,0.4)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x - e.ai.ax * r, e.y - e.ai.ay * r); ctx.lineTo(e.x - e.ai.ax * r * 3, e.y - e.ai.ay * r * 3); ctx.stroke(); }
    }
  });

  // creeper
  reg({
    id: "creeper", name: "Tinsel Creeper", hp: 45, speed: 70, r: 14, dmg: 9, xp: 4, firstMin: 4, weight: 2, color: "#c7ccd4",
    init: function (e) { var a = e.ai; a.cd = 2; a.far = 0; a.wu = 0; e.state = "approach"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (e.state === "approach") {
        chase(e, spd(e), p);
        if (d < 180) { e.stationary = true; stop(e); a.cd = 1.2; a.far = 0; go(e, "rooted"); }
      } else if (e.state === "rooted") {
        stop(e); e.face = Math.atan2(dy, dx);
        a.cd -= dt;
        if (d > 300) { a.far += dt; if (a.far >= 2) { e.stationary = false; go(e, "approach"); return; } } else a.far = 0;
        if (a.cd <= 0) { go(e, "windup"); KS.telegraph("ring", e.x, e.y, 0, 90, 0, 0.8, "#c7ccd4"); }
      } else if (e.state === "windup") {
        stop(e);
        if (e.stateT >= 0.8) {
          if (ringHit(run, e.x, e.y, 90)) KS.hurtPlayer(e.dmg, "proj", e.x, e.y);
          KS.fx("ring", e.x, e.y, "#e8ecf2", 1, 40); KS.fx("sparks", e.x, e.y, "#ffffff", 8, 2);
          a.cd = 2; go(e, "rooted");
        }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, w = e.state === "windup", c = body(e, "#c7ccd4");
      if (e.state === "rooted" || w) { ctx.strokeStyle = "rgba(120,126,138,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + 6, r * 1.5, r * 0.6, 0, 0, TAU); ctx.stroke(); }
      if (w) { ctx.strokeStyle = (Math.floor(e.stateT * 12) & 1) ? "#fff" : "#9aa2ae"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r + 4 + e.stateT * 8, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath();
      for (var i = 0; i < 40; i++) { var a = i * 0.45 + t * 2, rr = r * (0.2 + i / 40 * 0.9); var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.lineCap = "butt";
      ctx.strokeStyle = e.flash > 0 ? "#ddd" : "#8a93a1"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.stroke();
      for (var g = 0; g < 3; g++) { var ph = Math.sin(t * 6 + g * 2 + e.uid); if (ph > 0.5) { var ga = g * 2.1 + e.uid; var gx = x + Math.cos(ga) * r * 0.8, gy = y + Math.sin(ga) * r * 0.8; ctx.fillStyle = "#fff"; ctx.fillRect(gx - 1, gy - 4, 2, 8); ctx.fillRect(gx - 4, gy - 1, 8, 2); } }
    }
  });

  // snare
  reg({
    id: "snare", name: "Grapevine Snare", hp: 18, speed: 85, r: 11, dmg: 0, xp: 2, firstMin: 5, weight: 1.5, max: 6, noContact: true, color: "#5b2a6e",
    init: function (e) { var a = e.ai; a.hits = 0; a.odo0 = 0; a.ox = 0; a.oy = 0; a.tick = 0.5; e.state = "chase"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player;
      if (e.state === "chase") {
        var d = chase(e, spd(e), p);
        if (p.alive && d < e.r + p.r + 2) {
          a.hits = 0; a.odo0 = p.odo; a.tick = 0.5;
          var an = KS.rng.next() * TAU; a.ox = Math.cos(an) * (p.r + 2); a.oy = Math.sin(an) * (p.r + 2);
          e.stationary = true; e.noContact = true; stop(e); go(e, "latched"); KS.sfx("snare");
        }
      } else {
        stop(e); e.x = p.x + a.ox; e.y = p.y + a.oy; e.face = Math.atan2(-a.oy, -a.ox);
        KS.playerSlow(0.6, false);
        a.tick -= dt;
        if (a.tick <= 0) { a.tick += 0.5; KS.hurtPlayer(run.dmgMul, "contact", e.x, e.y); }
        if (a.hits >= 3 || p.odo - a.odo0 >= 250 || !p.alive) { e.noXp = true; KS.fx("leaves", e.x, e.y, "#7a4a8e", 4, 3); KS.removeEnemy(e); }
      }
    },
    onHurt: function (e) { if (e.state === "latched") e.ai.hits++; },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, c = body(e, "#5b2a6e");
      ctx.strokeStyle = c; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath();
      for (var i = 0; i < 26; i++) { var a = i * 0.55 + t * 3, rr = r * (0.15 + i / 26 * 0.9); var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
      ctx.stroke(); ctx.lineCap = "butt";
      ctx.strokeStyle = e.flash > 0 ? "#ddd" : "#8a4aa4"; ctx.lineWidth = 2; ctx.beginPath();
      for (var j = 0; j < 4; j++) { var b = e.face + 0.9 * (j - 1.5) + Math.sin(t * 7 + j) * 0.3; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(b) * r * 1.4, y + Math.sin(b) * r * 1.4, x + Math.cos(b + 0.6) * r * 1.9, y + Math.sin(b + 0.6) * r * 1.9); }
      ctx.stroke();
      dot(ctx, x, y, 3, "#d9b7e8");
      if (e.state === "latched") { ctx.strokeStyle = "rgba(139,74,164,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x - e.ai.ox, e.y - e.ai.oy, 22, 0, TAU); ctx.stroke(); }
    }
  });

  // pinecone pitcher
  reg({
    id: "pitcher", name: "Pinecone Pitcher", hp: 35, speed: 50, r: 15, dmg: 12, xp: 4, firstMin: 6, weight: 2, max: 8, color: "#24452c",
    init: function (e) { var a = e.ai; a.cd = 1 + KS.rng.next() * 1.5; a.dir = KS.rng.chance(0.5) ? 1 : -1; a.ld = 0; e.state = "keepRange"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1, sp = spd(e);
      var hi = Math.min(340, KS.cam.w * 0.5 * 0.8), lo = Math.max(140, hi - 80);
      e.face = Math.atan2(dy, dx);
      if (d < lo) { e.vx = -dx / d * sp; e.vy = -dy / d * sp; }
      else if (d > hi) { e.vx = dx / d * sp; e.vy = dy / d * sp; }
      else { e.vx = -dy / d * sp * 0.4 * a.dir; e.vy = dx / d * sp * 0.4 * a.dir; }
      a.cd -= dt; if (a.ld > 0) a.ld -= dt;
      if (a.cd <= 0 && d < hi + 120) {
        a.cd = 2.6; a.ld = 0.5;
        var tx = p.x + p.vx * 0.5, ty = p.y + p.vy * 0.5, b = run.bounds;
        tx = KS.util.clamp(tx, b.x0 + 20, b.x1 - 20); ty = KS.util.clamp(ty, b.y0 + 20, b.y1 - 20);
        var q = KS.spawnEProj("pinecone", e.x, e.y - 12, 0, 0, e.dmg, 6, 2, e.uid, false);
        if (q) {
          var dd = q.data; dd.sx = e.x; dd.sy = e.y - 12; dd.tx = tx; dd.ty = ty; dd.dur = 0.9; dd.rad = 34; q.r = 0;
          KS.telegraph("circle", tx, ty, 34, 0, 0, 0.9, "#b3261e"); KS.sfx("lob");
        }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y + r * 0.45, lift = e.ai.ld > 0 ? 3 : 0, c = body(e, "#24452c"), c2 = body(e, "#2f5a38");
      tri(ctx, x, y + 2, r * 0.95, r * 1.0, c); tri(ctx, x, y - r * 0.55 - lift, r * 0.72, r * 0.95, c2); tri(ctx, x, y - r * 1.05 - lift, r * 0.45, r * 0.85, c);
      oval(ctx, x - r * 0.45, y - r * 0.1, 3.5, 5, 0.5, "#8a5a2b"); oval(ctx, x + r * 0.4, y - r * 0.6, 3.5, 5, -0.5, "#8a5a2b"); oval(ctx, x + r * 0.1, y + r * 0.35, 3.5, 5, 0.2, "#6b4423");
      if (lift) oval(ctx, x + Math.cos(e.face) * r * 0.8, y - r * 1.2, 5, 7, 0, "#a06a34");
    }
  });

  // cattail spitter
  reg({
    id: "spitter", name: "Cattail Spitter", hp: 28, speed: 40, r: 12, dmg: 7, xp: 3, firstMin: 3.5, weight: 2, max: 10, color: "#7a5230",
    init: function (e) { var a = e.ai; a.cd = 1 + KS.rng.next() * 1.2; a.fl = 0; e.state = "approach"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1, sp = spd(e);
      var rng = Math.min(300, KS.cam.w * 0.5 * 0.8);
      e.face = Math.atan2(dy, dx);
      if (d > rng) { e.vx = dx / d * sp; e.vy = dy / d * sp; e.state = "approach"; } else { stop(e); e.state = "fire"; }
      a.cd -= dt; if (a.fl > 0) a.fl -= dt;
      if (e.state === "fire" && a.cd <= 0) {
        a.cd = 2.2; a.fl = 0.2;
        for (var i = -1; i <= 1; i++) {
          var an = e.face + i * 0.2094;
          KS.spawnEProj("seed", e.x, e.y, Math.cos(an) * 200, Math.sin(an) * 200, e.dmg, 6, 3, e.uid, false);
        }
        KS.sfx("spit");
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, sway = Math.sin(t * 3 + e.uid) * 2, c = body(e, "#4c8a3a");
      ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.quadraticCurveTo(x + sway, y + r * 0.2, x + sway * 1.5, y - r * 0.3); ctx.stroke();
      oval(ctx, x - 6, y + r * 0.7, 8, 2.5, -0.4, c); oval(ctx, x + 6, y + r * 0.5, 8, 2.5, 0.4, c);
      var hx = x + sway * 1.5 + Math.cos(e.face) * 2, hy = y - r * 0.5 + Math.sin(e.face) * 2, sq = e.ai.fl > 0 ? 1.15 : 1;
      oval(ctx, hx, hy, r * 0.55 * sq, r * 0.95 * sq, e.face + Math.PI / 2, body(e, "#7a4a28"));
      oval(ctx, hx - 1, hy - 1, r * 0.25, r * 0.6, e.face + Math.PI / 2, "#a06a3c");
      dot(ctx, hx + Math.cos(e.face) * r * 0.85, hy + Math.sin(e.face) * r * 0.85, 2, "#e8d9a0");
    }
  });

  // briar
  reg({
    id: "briar", name: "Briar Bundle", hp: 40, speed: 46, r: 16, dmg: 8, xp: 4, firstMin: 5.5, weight: 2, color: "#9c2b23",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    onDeath: function (e, src, run) {
      var d = 6 * run.dmgMul, off = KS.rng.next() * TAU;
      for (var i = 0; i < 6; i++) { var a = off + i * TAU / 6; KS.spawnEProj("thorn", e.x, e.y, Math.cos(a) * 220, Math.sin(a) * 220, d, 5, 1, e.uid, false); }
      KS.fx("sparks", e.x, e.y, "#c2392b", 8, 2);
    },
    draw: function (ctx, e, t) {
      var r = e.r;
      spikes(ctx, e.x, e.y, r * 0.7, r * 1.3, 14, t * 0.6 + e.uid, e.flash > 0 ? "#fff" : "#4a1410", 2.6);
      dot(ctx, e.x, e.y, r, body(e, "#9c2b23"));
      spikes(ctx, e.x, e.y, r * 0.3, r * 0.9, 9, -t * 0.8, e.flash > 0 ? "#ddd" : "#6e1c16", 1.6);
      dot(ctx, e.x - r * 0.3, e.y - r * 0.3, r * 0.25, "rgba(255,200,190,0.3)");
    }
  });

  // mistletoe family
  function mistDraw(e, ctx, t, sc, leaves) {
    var r = e.r, x = e.x, y = e.y, c = body(e, "#3f8a4a");
    for (var i = 0; i < leaves; i++) {
      var a = e.face + (i - (leaves - 1) / 2) * 0.9 + Math.sin(t * 5 + e.uid + i) * 0.1;
      oval(ctx, x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.75, r * 0.32, a, c);
    }
    var n = leaves === 1 ? 1 : 3;
    for (var j = 0; j < n; j++) {
      var b = j * TAU / n + e.uid; dot(ctx, x + Math.cos(b) * r * 0.35 * (n > 1 ? 1 : 0), y + Math.sin(b) * r * 0.35 * (n > 1 ? 1 : 0), r * sc, e.flash > 0 ? "#fff" : "#f4f1e6");
      dot(ctx, x + Math.cos(b) * r * 0.35 * (n > 1 ? 1 : 0) - 1, y + Math.sin(b) * r * 0.35 * (n > 1 ? 1 : 0) - 1, r * sc * 0.3, "#fff");
    }
  }
  reg({
    id: "mistletoe", name: "Mistletoe Cluster", hp: 24, speed: 60, r: 15, dmg: 6, xp: 2, firstMin: 7, weight: 2, color: "#f4f1e6",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    onDeath: function (e) { splitInto("mistletoe_sprig", 3, e); },
    draw: function (ctx, e, t) { mistDraw(e, ctx, t, 0.28, 4); }
  });
  reg({
    id: "mistletoe_sprig", name: "Mistletoe Sprig", hp: 10, speed: 75, r: 10, dmg: 4, xp: 1, spawnable: false, weight: 0, tinsel: 0.5, color: "#f4f1e6",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    onDeath: function (e) { splitInto("mistletoe_berry", 3, e); },
    draw: function (ctx, e, t) { mistDraw(e, ctx, t, 0.3, 2); }
  });
  reg({
    id: "mistletoe_berry", name: "Mistletoe Berry", hp: 4, speed: 90, r: 7, dmg: 3, xp: 1, spawnable: false, weight: 0, tinsel: 0.25, color: "#f4f1e6",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    draw: function (ctx, e, t) { mistDraw(e, ctx, t, 0.55, 1); }
  });
  function splitInto(id, n, e) {
    var off = KS.rng.next() * TAU;
    for (var i = 0; i < n; i++) { var a = off + i * TAU / n; KS.spawnEnemy(id, e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12, null); }
  }

  // holly
  reg({
    id: "holly", name: "Holly Hedge", hp: 70, speed: 40, r: 20, dmg: 12, xp: 5, firstMin: 8, weight: 1.5, frontBlock: { arc: 2.0944 }, color: "#2f5a2f",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, f = e.face;
      ctx.fillStyle = body(e, "#2f5a2f"); ctx.strokeStyle = e.flash > 0 ? "#fff" : "#1d3a1d"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.05, r * 0.95, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (var i = 0; i < 8; i++) { var a = i * TAU / 8; oval(ctx, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.58, r * 0.38, r * 0.2, a, body(e, "#3f7a3f")); }
      dot(ctx, x - r * 0.3, y + r * 0.1, 2.6, "#c2392b"); dot(ctx, x + r * 0.25, y - r * 0.3, 2.6, "#c2392b"); dot(ctx, x + r * 0.1, y + r * 0.4, 2.6, "#c2392b");
      ctx.strokeStyle = "#8fd18f"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r * 1.12, f - 1.0472, f + 1.0472); ctx.stroke();
      ctx.strokeStyle = "#e8f6d4"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 1.12, f - 1.0472, f + 1.0472); ctx.stroke();
    }
  });

  // caroler
  reg({
    id: "caroler", name: "Compost Caroler", hp: 60, speed: 45, r: 16, dmg: 6, xp: 6, firstMin: 9, weight: 0.8, max: 4, color: "#6b4423",
    init: function (e) { var a = e.ai; a.cx = e.x; a.cy = e.y; a.has = 0; e.state = "support"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, sp = spd(e), dx, dy, d;
      if (throttle(e, run)) {
        var n = KS.grid.query(e.x, e.y, 300, QA, 40), sx = 0, sy = 0, c = 0;
        for (var i = 0; i < n; i++) {
          var o = QA[i]; if (o === e) continue;
          sx += o.x; sy += o.y; c++;
          var ddx = o.x - e.x, ddy = o.y - e.y;
          if (ddx * ddx + ddy * ddy <= 22500 && !o.isBoss && !o.bossPart && !o.objective) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.02 * 0.2);
            if (o.ai.sb < 0.35 || o.ai.sbm < 1.25) { o.ai.sb = 0.35; o.ai.sbm = 1.25; }
          }
        }
        if (c > 0) { a.cx = sx / c; a.cy = sy / c; a.has = 1; } else a.has = 0;
      }
      dx = p.x - e.x; dy = p.y - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1; e.face = Math.atan2(dy, dx);
      if (d < 200) { e.vx = -dx / d * sp; e.vy = -dy / d * sp; }
      else if (a.has) {
        var tx = a.cx - e.x, ty = a.cy - e.y, td = Math.sqrt(tx * tx + ty * ty);
        if (td > 30) { e.vx = tx / td * sp; e.vy = ty / td * sp; } else stop(e);
      } else if (d > 280) { e.vx = dx / d * sp; e.vy = dy / d * sp; } else stop(e);
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, f = 0.85 + Math.sin(t * 6 + e.uid) * 0.15;
      ctx.fillStyle = "rgba(246,210,106," + (0.05 + 0.02 * Math.sin(t * 3)).toFixed(3) + ")"; ctx.beginPath(); ctx.arc(x, y, 150, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(246,210,106,0.22)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 150, 0, TAU); ctx.stroke();
      oval(ctx, x, y + r * 0.2, r * 1.1, r * 0.85, 0, body(e, "#6b4423"));
      oval(ctx, x - r * 0.3, y + r * 0.35, r * 0.4, r * 0.2, 0.3, body(e, "#4e3420")); oval(ctx, x + r * 0.45, y + r * 0.1, r * 0.35, r * 0.18, -0.3, body(e, "#8a5a36"));
      dot(ctx, x + r * 0.55, y - r * 0.55, r * 0.55, "rgba(246,210,106," + (0.3 * f).toFixed(2) + ")");
      ctx.fillStyle = "#c9993b"; ctx.fillRect(x + r * 0.55 - 3, y - r * 0.55 - 4, 6, 8); dot(ctx, x + r * 0.55, y - r * 0.55, 2.2, "#fff2b0");
      dot(ctx, x - r * 0.2, y - r * 0.15, 2, "#2a1f1a"); dot(ctx, x + r * 0.15, y - r * 0.15, 2, "#2a1f1a"); oval(ctx, x - r * 0.02, y + r * 0.12, 3.5, 2.5 + Math.sin(t * 8) * 1.2, 0, "#2a1f1a");
    }
  });

  // rootwad
  reg({
    id: "rootwad", name: "Root Wad", hp: 50, speed: 120, r: 16, dmg: 15, xp: 5, firstMin: 10, weight: 1.5, max: 6, untargetableStates: ["burrow"], color: "#6b4423",
    init: function (e) { var a = e.ai; a.tx = e.x; a.ty = e.y; a.rt = 0; e.state = "burrow"; e.untargetable = true; e.noContact = true; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player;
      if (e.state === "burrow") {
        e.noContact = true; a.rt -= dt;
        if (a.rt <= 0) { a.rt = 0.5; a.tx = p.x; a.ty = p.y; }
        var dx = a.tx - e.x, dy = a.ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 20) { a.tx = e.x; a.ty = e.y; stop(e); go(e, "surfacing"); e.untargetable = false; KS.telegraph("ring", e.x, e.y, 0, 40, 0, 0.8, "#8a5a36"); }
        else { var sp = spd(e); e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx); }
      } else if (e.state === "surfacing") {
        stop(e);
        if (e.stateT >= 0.8) {
          if (ringHit(run, a.tx, a.ty, 40)) KS.hurtPlayer(e.dmg, "proj", a.tx, a.ty);
          KS.fx("chips", a.tx, a.ty, "#6b4423", 10, 3); KS.fx("ring", a.tx, a.ty, "#a3754a", 1, 30); KS.shake(3);
          e.noContact = false; e.contactCd = 0.5; go(e, "up");
        }
      } else {
        chase(e, e.speed * 0.25, p);
        if (e.stateT >= 3) { e.noContact = true; e.untargetable = true; a.rt = 0; go(e, "burrow"); KS.fx("burst", e.x, e.y, "#6b4423", 5, 3); }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, st = e.state;
      if (st === "burrow") {
        ctx.strokeStyle = "rgba(90,58,28,0.7)"; ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) { var k = ((t * 1.6 + i / 3) % 1); ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(x, y + 4, r * (0.5 + k * 1.1), r * (0.3 + k * 0.5), 0, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1; oval(ctx, x, y + 3, r * 0.55, r * 0.3, 0, "rgba(107,68,35,0.9)");
        return;
      }
      if (st === "surfacing") {
        var k2 = e.stateT / 0.8; ctx.strokeStyle = "#3a2410"; ctx.lineWidth = 2; ctx.beginPath();
        for (var j = 0; j < 7; j++) { var a = j * TAU / 7 + 0.4; ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 4); ctx.lineTo(x + Math.cos(a) * 40 * (0.4 + k2 * 0.6), y + Math.sin(a) * 40 * (0.4 + k2 * 0.6)); }
        ctx.stroke(); oval(ctx, x + Math.sin(t * 40) * 1.5, y, r * 0.7, r * 0.45, 0, "#6b4423"); return;
      }
      oval(ctx, x, y + 3, r * 1.1, r * 0.75, 0, "#3a2410"); oval(ctx, x, y, r, r * 0.8, 0, body(e, "#6b4423"));
      ctx.strokeStyle = e.flash > 0 ? "#fff" : "#a3754a"; ctx.lineWidth = 3; ctx.beginPath();
      for (var m = 0; m < 6; m++) { var b = m * TAU / 6 + Math.sin(t * 5 + m) * 0.15; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(b) * r * 0.9, y + Math.sin(b) * r * 0.5, x + Math.cos(b + 0.3) * r * 1.5, y + Math.sin(b + 0.3) * r * 1.1); }
      ctx.stroke(); dot(ctx, x - 4, y - 3, 2, "#f6d24a"); dot(ctx, x + 4, y - 3, 2, "#f6d24a");
    }
  });

  // wisteria
  reg({
    id: "wisteria", name: "Wisteria Mother", hp: 220, speed: 0, r: 24, dmg: 8, xp: 15, firstMin: 11, weight: 0.5, max: 3, stationary: true, place: "ahead", color: "#9b7fc4",
    init: function (e) { e.ai.cd = 1.5; e.state = "stationary"; },
    update: function (e, dt, run) {
      var a = e.ai; stop(e); a.cd -= dt;
      if (a.cd <= 0) {
        a.cd = 1.5;
        if (countKids(run, e) < 20) {
          var an = KS.rng.next() * TAU, c = KS.spawnEnemy("runner", e.x + Math.cos(an) * 30, e.y + Math.sin(an) * 30, { parentUid: e.uid });
          if (c) KS.fx("leaves", e.x, e.y, "#9b7fc4", 3, 3);
        }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, c = body(e, "#9b7fc4");
      oval(ctx, x, y + r * 0.3, r * 1.3, r * 0.5, 0, "rgba(60,30,80,0.25)");
      ctx.strokeStyle = e.flash > 0 ? "#fff" : "#5a4a2a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + r * 0.4); ctx.lineTo(x + Math.sin(t) * 2, y - r * 0.9); ctx.stroke();
      oval(ctx, x, y - r * 1.0, r * 1.2, r * 0.6, 0, body(e, "#5e8f4a"));
      for (var i = -3; i <= 3; i++) {
        var sw = Math.sin(t * 2 + i * 0.7 + e.uid) * 3, bx = x + i * r * 0.32 + sw, len = r * (1.5 - Math.abs(i) * 0.15);
        ctx.strokeStyle = "#7a9a5a"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx - sw * 0.5, y - r * 0.9); ctx.lineTo(bx, y - r * 0.9 + len); ctx.stroke();
        for (var k = 0; k < 4; k++) oval(ctx, bx + (k & 1 ? 2 : -2), y - r * 0.8 + k * len * 0.22, 3.2, 4.8, 0, k & 1 ? c : body(e, "#b79bdb"));
      }
    }
  });

  // sparker
  reg({
    id: "sparker", name: "String-Light Sparker", hp: 20, speed: 85, r: 10, dmg: 0, xp: 3, firstMin: 6.5, weight: 2, noContact: true, color: "#f6d24a",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) {
      var p = run.player;
      if (e.state === "chase") {
        var d = chase(e, spd(e), p);
        if (d < 60) { stop(e); go(e, "arming"); KS.telegraph("circle", e.x, e.y, 56, 0, 0, 0.8, "#f6d24a"); }
      } else {
        stop(e);
        if (e.stateT >= 0.8) {
          if (ringHit(run, e.x, e.y, 56)) KS.hurtPlayer(18 * run.dmgMul, "proj", e.x, e.y);
          var n = KS.grid.query(e.x, e.y, 56, QB, 48);
          for (var i = 0; i < n; i++) { var o = QB[i]; if (o === e || o.isBoss || o.objective || !o.alive) continue; ESRC.x = e.x; ESRC.y = e.y; KS.damage(o, 30, ESRC); }
          KS.fx("burst", e.x, e.y, "#ffe066", 12, 3); KS.fx("ring", e.x, e.y, "#ffffff", 1, 40); KS.fx("sparks", e.x, e.y, "#ff6a4a", 8, 2); KS.shake(3); KS.sfx("pop");
          e.noXp = true; KS.removeEnemy(e);
        }
      }
    },
    draw: function (ctx, e, t) {
      var x = e.x, y = e.y, f = e.face, cs = Math.cos(f), sn = Math.sin(f), arm = e.state === "arming", rate = arm ? 14 : 4;
      ctx.strokeStyle = "#2a2a2a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - cs * 12, y - sn * 12); ctx.lineTo(x + cs * 10, y + sn * 10); ctx.stroke();
      for (var i = 0; i < 4; i++) {
        var px = x + cs * (i * 7 - 10) + Math.sin(t * 6 + i) * -sn, py = y + sn * (i * 7 - 10) + Math.sin(t * 6 + i) * cs;
        var on = ((Math.floor(t * rate + i) & 3) === 0) || arm, cols = arm ? ((Math.floor(t * 14 + i) % 3) === 0 ? "#ff4a3a" : ((Math.floor(t * 14 + i) % 3) === 1 ? "#4aff7a" : "#ffe066")) : (i & 1 ? "#4aff7a" : "#ff4a3a");
        if (on) dot(ctx, px, py, 8, "rgba(255,240,160,0.22)");
        dot(ctx, px, py, 4.2, e.flash > 0 ? "#fff" : (on ? cols : "#4a4a3a")); dot(ctx, px - 1, py - 1, 1.3, "rgba(255,255,255,0.7)");
      }
      if (arm) { ctx.strokeStyle = "rgba(255,224,102," + (0.3 + 0.3 * Math.sin(t * 30)).toFixed(2) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 56 * Math.min(1, e.stateT / 0.8), 0, TAU); ctx.stroke(); }
    }
  });

  // will-o'-wreath
  reg({
    id: "willwreath", name: "Will-o'-Wreath", hp: 30, speed: 50, r: 14, dmg: 9, xp: 4, firstMin: 12, weight: 1.5, color: "#3fe07a",
    init: function (e) { var a = e.ai; a.cd = 2 + KS.rng.next() * 1.5; a.bx = 0; a.by = 0; a.tr = 0; e.state = "drift"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player;
      if (a.tr > 0) a.tr -= dt;
      if (e.state === "drift") {
        var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1, sp = spd(e), sw = Math.sin(e.t * 2 + e.uid) * 0.6;
        e.vx = (dx / d + -dy / d * sw) * sp; e.vy = (dy / d + dx / d * sw) * sp; e.face = Math.atan2(dy, dx);
        a.cd -= dt; if (a.cd <= 0) { stop(e); go(e, "shimmer"); }
      } else if (e.state === "shimmer") {
        stop(e);
        if (e.stateT >= 0.5) { var ex = p.x - e.x, ey = p.y - e.y, l = Math.sqrt(ex * ex + ey * ey) || 1; a.bx = ex / l; a.by = ey / l; a.tr = 0.3; go(e, "blink"); }
      } else {
        var bs = 120 / 0.15; e.vx = a.bx * bs; e.vy = a.by * bs;
        if (e.stateT >= 0.15) { stop(e); a.cd = 3; go(e, "drift"); }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, sh = e.state === "shimmer", fl = sh ? (0.5 + 0.5 * Math.sin(t * 50)) : 1;
      if (e.ai.tr > 0) { ctx.globalAlpha = 0.35; dot(ctx, x - e.ai.bx * 30, y - e.ai.by * 30, r * 0.8, "#3fe07a"); dot(ctx, x - e.ai.bx * 60, y - e.ai.by * 60, r * 0.5, "#3fe07a"); }
      ctx.globalAlpha = 0.25 * fl; dot(ctx, x, y, r * 1.5, "#7affb0");
      ctx.globalAlpha = fl; ctx.strokeStyle = e.flash > 0 ? "#fff" : "#2fd06a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "#b8ffd0"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#c2392b"; ctx.beginPath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x - 7, y - r * 0.8 - 5); ctx.lineTo(x - 7, y - r * 0.8 + 4); ctx.closePath(); ctx.moveTo(x, y - r * 0.8); ctx.lineTo(x + 7, y - r * 0.8 - 5); ctx.lineTo(x + 7, y - r * 0.8 + 4); ctx.closePath(); ctx.fill();
      dot(ctx, x, y - r * 0.8, 2, "#7a1a14"); ctx.globalAlpha = 1;
    }
  });

  // mimic (placed by maps.js)
  reg({
    id: "mimic", name: "Present Mimic", hp: 150, speed: 90, r: 18, dmg: 20, xp: 10, spawnable: false, noRecycle: true, stationary: true, noContact: true, weight: 0, color: "#b3261e",
    init: function (e) { var a = e.ai; a.wk = 0; e.stationary = true; e.noContact = true; e.state = "dormant"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (e.state === "dormant") {
        stop(e);
        if (d < 70 || a.wk) { e.stationary = false; e.noContact = false; a.wk = 0; a.dx = dx / d; a.dy = dy / d; go(e, "lunge"); KS.fx("burst", e.x, e.y, "#f6d24a", 6, 3); KS.sfx("mimic"); }
      } else if (e.state === "lunge") {
        e.vx = a.dx * 300 * smul(e); e.vy = a.dy * 300 * smul(e); e.face = Math.atan2(a.dy, a.dx);
        if (e.stateT >= 0.35) go(e, "chase");
      } else chase(e, spd(e), p);
    },
    onHurt: function (e) { if (e.state === "dormant") e.ai.wk = 1; },
    onDeath: function (e, src, run) {
      var ids = [], k, d = KS.defs.items;
      for (k in d) if (d[k].rarity === "common") ids.push(k);
      if (ids.length) KS.items.give(KS.rng.pick(ids), 1, "mimic");
      KS.fx("burst", e.x, e.y, "#f6d24a", 14, 3);
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, dorm = e.state === "dormant", open = e.state === "lunge" || e.state === "chase";
      var p = KS.run && KS.run.player, near = dorm && p && ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < 40000);
      ctx.fillStyle = body(e, "#b3261e"); ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 1.3); ctx.strokeRect(x - r, y - r * 0.55, r * 2, r * 1.3);
      ctx.fillStyle = body(e, "#d4453a"); ctx.fillRect(x - r, y - r * 0.55 - (open ? 6 + Math.sin(t * 18) * 2 : 0), r * 2, r * 0.45);
      ctx.strokeStyle = INK; ctx.strokeRect(x - r, y - r * 0.55 - (open ? 6 + Math.sin(t * 18) * 2 : 0), r * 2, r * 0.45);
      ctx.fillStyle = "#c9993b"; ctx.fillRect(x - 3, y - r * 0.55, 6, r * 1.3);
      if (open) { ctx.fillStyle = "#2a0a08"; ctx.fillRect(x - r + 3, y - r * 0.5, r * 2 - 6, 4); ctx.fillStyle = "#fff"; for (var i = 0; i < 5; i++) { tri(ctx, x - r + 6 + i * 6, y - r * 0.5, 2.2, -4, "#fff"); } dot(ctx, x - 6, y - 4, 3, "#f6d24a"); dot(ctx, x + 6, y - 4, 3, "#f6d24a"); }
      var tw = near ? Math.sin(t * 25) * 3 : 0;
      ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.quadraticCurveTo(x - 10 + tw, y - r * 1.4, x - 4 + tw, y - r * 0.9); ctx.moveTo(x, y - r * 0.6); ctx.quadraticCurveTo(x + 10 - tw, y - r * 1.4, x + 4 - tw, y - r * 0.9); ctx.stroke();
      dot(ctx, x, y - r * 0.6, 3, "#f6e27a");
    }
  });

  // crow
  reg({
    id: "crow", name: "Tinsel Crow", hp: 25, speed: 140, r: 12, dmg: 0, xp: 2, firstMin: 4.5, weight: 0.8, max: 3, flying: true, noContact: true, color: "#1e1a1a",
    init: function (e) { var a = e.ai; a.tg = null; a.tgUid = 0; a.off = 0; a.orbit = KS.rng.next() * TAU; e.stolen = 0; e.state = "seek"; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, sp = spd(e), dx, dy, d, half = Math.sqrt(KS.cam.w * KS.cam.w + KS.cam.h * KS.cam.h) * 0.5;
      if (e.state === "seek") {
        var tg = a.tg;
        if (tg && !(tg.alive && tg.uid === a.tgUid && !tg.mag)) { tg = null; a.tg = null; }
        if (!tg && throttle(e, run)) {
          var pl = run.pickups.list, n = run.pickups.n, bd = 1e12;
          for (var i = 0; i < n; i++) {
            var k = pl[i]; if (!k.alive || k.type !== "xp" || k.mag) continue;
            var ax = k.x - p.x, ay = k.y - p.y; if (ax * ax + ay * ay > 360000) continue;
            var bx = k.x - e.x, by = k.y - e.y, dd = bx * bx + by * by; if (dd < bd) { bd = dd; tg = k; }
          }
          if (tg) { a.tg = tg; a.tgUid = tg.uid; }
        }
        if (tg) {
          dx = tg.x - e.x; dy = tg.y - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
          e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx);
          if (d < 14) { e.stolen += tg.value; tg.alive = false; a.tg = null; go(e, "steal"); KS.fx("sparks", e.x, e.y, "#f6e27a", 5, 2); }
        } else {
          a.orbit += dt * 0.8; dx = p.x + Math.cos(a.orbit) * 260 - e.x; dy = p.y + Math.sin(a.orbit) * 260 - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
          e.vx = dx / d * sp * 0.6; e.vy = dy / d * sp * 0.6; e.face = Math.atan2(dy, dx);
        }
      } else if (e.state === "steal") { stop(e); if (e.stateT >= 0.15) go(e, "flee"); }
      else {
        dx = e.x - p.x; dy = e.y - p.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        e.vx = dx / d * sp; e.vy = dy / d * sp; e.face = Math.atan2(dy, dx);
        if (d > half + 80) { a.off += dt; if (a.off >= 10) { KS.removeEnemy(e); } } else a.off = 0;
      }
    },
    onDeath: function (e) { if (e.stolen > 0) KS.spawnPickup("xp", e.x, e.y, e.stolen * 2); },
    draw: function (ctx, e, t) {
      var x = e.x, y = e.y, f = e.face, fl = Math.sin(t * 20 + e.uid) * 0.7, c = body(e, "#1e1a1a");
      oval(ctx, x + 4, y + 16, 8, 3, 0, "rgba(0,0,0,0.2)");
      var px = -Math.sin(f), py = Math.cos(f);
      oval(ctx, x + px * 7, y + py * 7, 11, 4.5, f + 1.3 + fl, c); oval(ctx, x - px * 7, y - py * 7, 11, 4.5, f - 1.3 - fl, c);
      oval(ctx, x, y, 11, 6.5, f, c); dot(ctx, x + Math.cos(f) * 9, y + Math.sin(f) * 9, 4.2, c);
      tri(ctx, x + Math.cos(f) * 14, y + Math.sin(f) * 14 + 3, 2.5, 5, "#e07a1a");
      dot(ctx, x + Math.cos(f) * 10 - py * 2, y + Math.sin(f) * 10 + px * 2, 1.2, "#fff");
      if (e.stolen > 0) { dot(ctx, x - Math.cos(f) * 9, y - Math.sin(f) * 9, 3, "#7ad7ff"); }
      if (((Math.floor(t * 10 + e.uid)) & 3) === 0) { dot(ctx, x - Math.cos(f) * 16, y - Math.sin(f) * 16, 1.8, "#f6e27a"); }
    }
  });

  // poison ivy
  reg({
    id: "ivy", name: "Poison Ivy Wreath", hp: 36, speed: 52, r: 15, dmg: 7, xp: 4, firstMin: 8.5, weight: 1.5, color: "#5a8a3a",
    init: function (e) { e.ai.cd = 1.5; e.state = "chase"; },
    update: function (e, dt, run) {
      var a = e.ai; chase(e, spd(e), run.player); a.cd -= dt;
      if (a.cd <= 0) { a.cd = 1.5; KS.spawnHazard("e_itchpatch", e.x, e.y, { dmg: 3 * run.dmgMul }); }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, rot = t * 0.6 + e.uid;
      ctx.strokeStyle = e.flash > 0 ? "#fff" : "#2f5a2f"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke();
      for (var i = 0; i < 6; i++) {
        var a = rot + i * TAU / 6, cx = x + Math.cos(a) * r * 0.78, cy = y + Math.sin(a) * r * 0.78;
        for (var k = -1; k <= 1; k++) oval(ctx, cx + Math.cos(a + k * 1.1) * 4.2, cy + Math.sin(a + k * 1.1) * 4.2, 4.6, 2.5, a + k * 1.1, e.flash > 0 ? "#fff" : (k === 0 ? "#c2392b" : "#4c8a3a"));
      }
      dot(ctx, x, y, 3, "#8a2e2e");
    }
  });

  // fire ant mound + ants
  reg({
    id: "antmound", name: "Fire Ant Mound", hp: 160, speed: 0, r: 22, dmg: 6, xp: 12, firstMin: 13, weight: 0.5, max: 2, stationary: true, place: "ahead", color: "#8a5a36",
    init: function (e) { e.ai.cd = 1; e.state = "stationary"; },
    update: function (e, dt, run) {
      var a = e.ai; stop(e); a.cd -= dt;
      if (a.cd <= 0) {
        a.cd = 1;
        if (countKids(run, e) < 15) {
          var an = KS.rng.next() * TAU; KS.spawnEnemy("fireant", e.x + Math.cos(an) * e.r, e.y + Math.sin(an) * e.r, { parentUid: e.uid });
        }
      }
    },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y;
      oval(ctx, x, y + r * 0.3, r * 1.3, r * 0.7, 0, "rgba(0,0,0,0.2)");
      oval(ctx, x, y + r * 0.15, r * 1.15, r * 0.8, 0, body(e, "#6b4423"));
      tri(ctx, x, y + r * 0.3, r * 0.95, r * 1.2, body(e, "#8a5a36")); tri(ctx, x, y - r * 0.05, r * 0.55, r * 0.7, body(e, "#a3754a"));
      oval(ctx, x, y - r * 0.95, r * 0.3, r * 0.14, 0, "#2a1f1a");
      for (var i = 0; i < 6; i++) { var a = i * 1.7 + e.uid; dot(ctx, x + Math.cos(a) * r * 0.7, y + r * 0.1 + Math.sin(a) * r * 0.4, 1.8, (Math.floor(t * 3 + i) & 1) ? "#e0402a" : "#b3261e"); }
    }
  });
  reg({
    id: "fireant", name: "Fire Ant", hp: 4, speed: 120, r: 6, dmg: 3, xp: 0, spawnable: false, weight: 0, tinsel: 0.1, noXp: true, color: "#c2392b",
    init: function (e) { e.state = "chase"; },
    update: function (e, dt, run) { chase(e, spd(e), run.player); },
    draw: function (ctx, e, t) {
      var f = e.face, cs = Math.cos(f), sn = Math.sin(f), c = body(e, "#c2392b"), lg = Math.sin(t * 30 + e.uid) * 2;
      ctx.strokeStyle = "#5a1a14"; ctx.lineWidth = 1; ctx.beginPath();
      for (var i = -1; i <= 1; i++) { ctx.moveTo(e.x + cs * i * 2, e.y + sn * i * 2); ctx.lineTo(e.x + cs * i * 2 - sn * (5 + lg), e.y + sn * i * 2 + cs * (5 + lg)); ctx.moveTo(e.x + cs * i * 2, e.y + sn * i * 2); ctx.lineTo(e.x + cs * i * 2 + sn * (5 - lg), e.y + sn * i * 2 - cs * (5 - lg)); }
      ctx.stroke();
      dot(ctx, e.x - cs * 4, e.y - sn * 4, 3.2, c); dot(ctx, e.x, e.y, 2.4, c); dot(ctx, e.x + cs * 3.5, e.y + sn * 3.5, 2.3, body(e, "#8a1a14"));
    }
  });

  // ---------------------------------------------------------------------------
  // Affixes (9). Outline rings + badges are drawn by one layer-4 hook that calls def.draw.
  // ---------------------------------------------------------------------------
  function affRing(ctx, e, color, idx, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7 + (e.affix1 === idx ? 3 : 0), 0, TAU); ctx.stroke();
  }
  function badge(ctx, a, e, off) {
    if (!a._spr) a._spr = KS.iconSprite(a.glyph, 16);
    if (a._spr) ctx.drawImage(a._spr, e.x - 8 + off, e.y + e.r + 6, 16, 16);
  }
  function ringDraw(ctx, e, t) {
    var a = this; ctx.strokeStyle = a.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + (e.affix0 === a.id ? 7 : 10), 0, TAU); ctx.stroke();
    badge(ctx, a, e, e.affix0 === a.id ? -9 : 9);
  }
  function defAffix(o) {
    var d = o; d.draw = o.draw || ringDraw; return KS.registerAffix(d);
  }
  defAffix({
    id: "frosted", name: "Frosted", color: "#9fd8ff", glyph: "❄️",
    init: function (e) { e.ai.fz = 0.3; },
    update: function (e, dt, run) { var a = e.ai; a.fz -= dt; if (a.fz <= 0) { a.fz = 1; KS.spawnHazard("e_icepatch", e.x, e.y, null); } }
  });
  defAffix({
    id: "wired", name: "Wired", color: "#ffe066", glyph: "⚡",
    init: function (e) { var a = e.ai; a.wz = 2; a.wp = 0; },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player;
      if (a.wp > 0) {
        a.wp -= dt;
        if (a.wp <= 0 && ringHit(run, e.x, e.y, 90)) { KS.hurtPlayer(8 * run.dmgMul, "hazard", e.x, e.y); KS.fx("sparks", p.x, p.y, "#ffe066", 6, 2); }
      }
      a.wz -= dt;
      if (a.wz <= 0) {
        a.wz = 2;
        var n = KS.grid.query(e.x, e.y, 150, QA, 12), z = 0;
        for (var i = 0; i < n && z < 2; i++) {
          var o = QA[i]; if (o === e || o.isBoss || o.objective) continue;
          o.ai.sb = 2; o.ai.sbm = 1.2; z++; KS.fx("sparks", o.x, o.y, "#ffe066", 3, 2);
        }
        var dx = p.x - e.x, dy = p.y - e.y;
        if (a.wp <= 0 && dx * dx + dy * dy <= 8100) { a.wp = 0.8; KS.telegraph("line", e.x, e.y, Math.atan2(dy, dx), 90, 10, 0.8, "#ffe066"); }
      }
    },
    onDeath: function (e, src, run) {
      KS.fx("ring", e.x, e.y, "#ffe066", 1, 60); KS.fx("sparks", e.x, e.y, "#ffe066", 10, 2);
      if (ringHit(run, e.x, e.y, 100)) KS.hurtPlayer(10 * run.dmgMul, "hazard", e.x, e.y);
    }
  });
  defAffix({
    id: "rootedkin", name: "Rooted Kin", color: "#d9902a", glyph: "🌱",
    init: function (e, run) {
      var a = e.ai; a.ka = KS.rng.next() * TAU; a.c0 = null; a.c1 = null; a.u0 = 0; a.u1 = 0; a.r0 = 0; a.r1 = 0;
      for (var i = 0; i < 2; i++) {
        var c = KS.spawnEnemy("runner", e.x + Math.cos(i * Math.PI) * 50, e.y + Math.sin(i * Math.PI) * 50, { parentUid: e.uid });
        if (c) { c.ai.orb = 1; if (i === 0) { a.c0 = c; a.u0 = c.uid; } else { a.c1 = c; a.u1 = c.uid; } }
      }
    },
    update: function (e, dt, run) {
      var a = e.ai; a.ka += dt * 1.6;
      var c = a.c0, ok = c && c.alive && c.uid === a.u0;
      if (ok) { c.x = e.x + Math.cos(a.ka) * 50; c.y = e.y + Math.sin(a.ka) * 50; c.vx = 0; c.vy = 0; }
      else { a.c0 = null; a.r0 += dt; if (a.r0 >= 5) { a.r0 = 0; var n0 = KS.spawnEnemy("runner", e.x + 50, e.y, { parentUid: e.uid }); if (n0) { n0.ai.orb = 1; a.c0 = n0; a.u0 = n0.uid; } } }
      c = a.c1; ok = c && c.alive && c.uid === a.u1;
      if (ok) { c.x = e.x + Math.cos(a.ka + Math.PI) * 50; c.y = e.y + Math.sin(a.ka + Math.PI) * 50; c.vx = 0; c.vy = 0; }
      else { a.c1 = null; a.r1 += dt; if (a.r1 >= 5) { a.r1 = 0; var n1 = KS.spawnEnemy("runner", e.x - 50, e.y, { parentUid: e.uid }); if (n1) { n1.ai.orb = 1; a.c1 = n1; a.u1 = n1.uid; } } }
    },
    onDeath: function (e) {
      var a = e.ai, c = a.c0;
      if (c && c.alive && c.uid === a.u0) KS.removeEnemy(c);
      c = a.c1; if (c && c.alive && c.uid === a.u1) KS.removeEnemy(c);
    }
  });
  defAffix({
    id: "regifted", name: "Regifted", color: "#e04a8a", glyph: "🎁",
    onDeath: function (e, src, run) {
      if (e.def.spawnable === false || e.stationary) return;
      var c = KS.spawnEnemy(e.defId, e.x, e.y, { hpMul: 0.5 });
      if (c) { c.r = c.r * 0.5; KS.fx("burst", e.x, e.y, "#e04a8a", 8, 3); }
    }
  });
  defAffix({
    id: "evergreen", name: "Evergreen", color: "#3faa5a", glyph: "🌲",
    update: function (e, dt, run) { if (run.time - e.lastHitT > 2 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.03 * dt); }
  });
  defAffix({
    id: "thorny", name: "Thorny", color: "#7d2a1d", glyph: "🌹",
    init: function (e) { e.ai.th = -9; },
    onHit: function (e, H, run) {
      var a = e.ai, p = run.player;
      if (run.time - a.th >= 0.1667 && p.alive) {
        a.th = run.time;
        var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        KS.spawnEProj("thorn", e.x, e.y, dx / d * 180, dy / d * 180, 6 * run.dmgMul, 5, 3, e.uid, false);
      }
      return false;
    }
  });
  defAffix({
    id: "gilded", name: "Gilded", color: "#c9993b", glyph: "✨",
    onDeath: function (e, src, run) {
      KS.addPay(25 * run.coeff); KS.addTinsel(e.tinsel * 0.25 * (1 + 0.1 * run.coeff) * 3);
      KS.fx("sparks", e.x, e.y, "#f6e27a", 12, 2);
    },
    draw: function (ctx, e, t) {
      ringDraw.call(this, ctx, e, t);
      var a = t * 2 + e.uid; dot(ctx, e.x + Math.cos(a) * (e.r + 7), e.y + Math.sin(a) * (e.r + 7), 2.5, "#fff2b0");
    }
  });
  defAffix({
    id: "overtimed", name: "Overtimed", color: "#ffd400", glyph: "⏱️",
    init: function (e) { e.speed *= 1.5; e.baseSpeed *= 1.5; },
    draw: function (ctx, e, t) {
      if (Math.floor(t * 8) & 1) ringDraw.call(this, ctx, e, t);
      else { ctx.strokeStyle = "#ff8a00"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + (e.affix0 === "overtimed" ? 7 : 10), 0, TAU); ctx.stroke(); badge(ctx, this, e, e.affix0 === "overtimed" ? -9 : 9); }
    }
  });
  defAffix({
    id: "giftwrapped", name: "Gift-Wrapped", color: "#b3261e", glyph: "🎀",
    init: function (e) { e.shieldHits = 3; },
    onHit: function (e) { if (e.shieldHits > 0) { e.shieldHits--; KS.fx("sparks", e.x, e.y, "#e7c55b", 4, 2); return true; } return false; },
    draw: function (ctx, e, t) {
      var r = e.r;
      if (e.shieldHits > 0) {
        ctx.strokeStyle = "rgba(240,230,200,0.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, r + 6, 0, TAU); ctx.stroke();
        ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e.x - r - 6, e.y); ctx.lineTo(e.x + r + 6, e.y); ctx.moveTo(e.x, e.y - r - 6); ctx.lineTo(e.x, e.y + r + 6); ctx.stroke();
        dot(ctx, e.x, e.y - r - 6, 3.2, "#e04a4a");
      }
      for (var i = 0; i < e.shieldHits; i++) dot(ctx, e.x + (i - (e.shieldHits - 1) / 2) * 9, e.y + r + 12, 3.2, "#b3261e");
      badge(ctx, this, e, e.affix0 === "giftwrapped" ? -9 : 9);
    }
  });
  KS.addDrawHook(4, function (ctx, cam, run) {
    var l = run.enemies.list, n = run.enemies.n, t = KS.G.realTime, A = KS.defs.affixes;
    for (var i = 0; i < n; i++) {
      var e = l[i]; if (!e.alive || !e.elite || !e.affix0 || !KS.onScreen(e.x, e.y, e.r + 30)) continue;
      var a = A[e.affix0]; if (a && a.draw) a.draw(ctx, e, t);
      if (e.affix1) { a = A[e.affix1]; if (a && a.draw) a.draw(ctx, e, t); }
    }
  });

  // ---------------------------------------------------------------------------
  // The Director (DESIGN 6.1)
  // ---------------------------------------------------------------------------
  var AFFIX_IDS = ["frosted", "wired", "rootedkin", "regifted", "evergreen", "thorny", "gilded", "overtimed", "giftwrapped"];
  var D = { acc: 0, surgeT: 0, surgeDef: null, nextSurge: 180, nextCrate: 300, roster: [], rosterOk: false, cntT: 0, recT: 0, pendCrate: false };
  var AFS = [];
  var SURGE_EV = { typeId: "" };
  var DRING = { x: 0, y: 0 };

  function buildRoster() {
    D.roster.length = 0;
    var defs = KS.defs.enemies;
    for (var k in defs) {
      var d = defs[k];
      if (d.spawnable === false || d.firstMin == null) continue;
      if (d._cnt === undefined) d._cnt = 0;
      D.roster.push(d);
    }
    D.rosterOk = true;
  }
  function halfDiag() { return Math.sqrt(KS.cam.w * KS.cam.w + KS.cam.h * KS.cam.h) * 0.5; }
  function freeSpot(run, x, y) {
    if (!KS.inBounds(x, y, 40)) return false;
    SC.x = x; SC.y = y; KS.pushOutObstacles(SC);
    return Math.abs(SC.x - x) + Math.abs(SC.y - y) < 0.5;
  }
  function ringPoint(run, ang0, jitter) {
    var p = run.player, rad = halfDiag() + 60, b = run.bounds, x = 0, y = 0, ok = false;
    for (var i = 0; i < 6; i++) {
      var a = i === 0 && ang0 != null ? ang0 : (ang0 != null ? ang0 + (KS.rng.next() - 0.5) * jitter * 2 : KS.rng.next() * TAU);
      x = p.x + Math.cos(a) * rad; y = p.y + Math.sin(a) * rad;
      if (freeSpot(run, x, y)) { ok = true; break; }
    }
    if (!ok) { x = KS.util.clamp(x, b.x0 + 40, b.x1 - 40); y = KS.util.clamp(y, b.y0 + 40, b.y1 - 40); }
    DRING.x = x; DRING.y = y;
    return DRING;
  }
  function aheadAngle(run) {
    var p = run.player;
    if (p.vx * p.vx + p.vy * p.vy > 100) return Math.atan2(p.vy, p.vx);
    return Math.atan2(p.faceY, p.faceX);
  }
  function weightOf(run, d) {
    var map = run.mapDef, sw = map && map.spawnWeights, w = d.weight == null ? 1 : d.weight;
    if (sw && sw[d.id] != null) w *= sw[d.id];
    if (d.lastMin != null && run.threatMin > d.lastMin) w *= 0.25;
    return w;
  }
  function pickDef(run, noStationary) {
    var R = D.roster, tm = run.threatMin, sum = 0, i, d, w;
    for (i = 0; i < R.length; i++) {
      d = R[i]; w = 0;
      if (d.firstMin <= tm && !(d.max != null && d._cnt >= d.max) && !(noStationary && d.stationary)) w = weightOf(run, d);
      AFS[i] = w; sum += w;
    }
    if (sum <= 0) return KS.defs.enemies.runner || null;
    var r = KS.rng.next() * sum;
    for (i = 0; i < R.length; i++) { r -= AFS[i]; if (r <= 0 && AFS[i] > 0) return R[i]; }
    return R[0];
  }
  function chooseAffixes(run, def) {
    var out = [], a0 = KS.rng.pick(AFFIX_IDS);
    if (def.stationary) { var g = 0; while ((a0 === "overtimed" || a0 === "rootedkin") && g++ < 6) a0 = KS.rng.pick(AFFIX_IDS); }
    out.push(a0);
    if (run.threatMin >= 10 && KS.rng.chance(0.3)) { var a1 = KS.rng.pick(AFFIX_IDS), t = 0; while (a1 === a0 && t++ < 8) a1 = KS.rng.pick(AFFIX_IDS); if (a1 !== a0) out.push(a1); }
    return out;
  }
  function spawnDef(run, def, elite, crate) {
    var g0 = def.group ? def.group[0] : 1, g1 = def.group ? def.group[1] : 1, n = g0 === g1 ? g0 : KS.rng.int(g0, g1), x, y, pt;
    if (def.max != null) n = Math.min(n, def.max - def._cnt);
    if (n <= 0) return null;
    var p = run.player, b = run.bounds, first = null, i, e;
    if (def.place === "drop") {
      var a = KS.rng.next() * TAU, rr = 240 + KS.rng.next() * 160;
      x = KS.util.clamp(p.x + Math.cos(a) * rr, b.x0 + 60, b.x1 - 60); y = KS.util.clamp(p.y + Math.sin(a) * rr, b.y0 + 60, b.y1 - 60);
    } else if (def.place === "ahead") {
      var aa = aheadAngle(run) + (KS.rng.next() - 0.5) * 1.2, r2 = 300 + KS.rng.next() * 200;
      x = KS.util.clamp(p.x + Math.cos(aa) * r2, b.x0 + 60, b.x1 - 60); y = KS.util.clamp(p.y + Math.sin(aa) * r2, b.y0 + 60, b.y1 - 60);
      if (!freeSpot(run, x, y)) { pt = ringPoint(run, null, 0); x = pt.x; y = pt.y; }
    } else { pt = ringPoint(run, null, 0); x = pt.x; y = pt.y; }
    var cx = x, cy = y;
    for (i = 0; i < n; i++) {
      var ex = n > 1 ? cx + (KS.rng.next() - 0.5) * 100 : cx, ey = n > 1 ? cy + (KS.rng.next() - 0.5) * 100 : cy;
      if (n > 1) { ex = KS.util.clamp(ex, b.x0 + 20, b.x1 - 20); ey = KS.util.clamp(ey, b.y0 + 20, b.y1 - 20); }
      var opts = null;
      if (i === 0 && elite) opts = { elite: true, affixes: chooseAffixes(run, def), dropCrate: crate || KS.rng.chance(0.35) };
      e = KS.spawnEnemy(def.id, ex, ey, opts);
      if (!e) break;
      def._cnt++;
      if (def.place === "drop") { e.ai.cx = cx; e.ai.cy = cy; }
      if (!first) first = e;
    }
    return first;
  }
  function eliteChance(run) { return Math.min(0.05, 0.004 + 0.0015 * run.threatMin) * (hasCond(run, "storm") ? 2 : 1); }
  function surgeDefFor(run, typeId) {
    var defs = KS.defs.enemies, d = typeId ? defs[typeId] : null;
    if (d && d.spawnable !== false) return d;
    var map = run.mapDef, list = map && map.surgeTypes, best = null, bw = -1;
    if (list) for (var i = 0; i < list.length; i++) {
      var c = defs[list[i]]; if (!c || c.spawnable === false || c.firstMin > run.threatMin) continue;
      var w = weightOf(run, c); if (w > bw) { bw = w; best = c; }
    }
    return best || defs.runner || null;
  }
  function startSurge(run, typeId) {
    var d = surgeDefFor(run, typeId); if (!d) return;
    D.surgeT = 30; D.surgeDef = d;
    var nm = TEXT.surgeNames[d.id] || d.name;
    try { KS.ui.banner(TEXT.surgeTitle + nm, TEXT.surgeSub, 3); } catch (e) { /* ui may be a stub */ }
    SURGE_EV.typeId = d.id; KS.emit("surge", SURGE_EV);
  }
  function recount(run) {
    var R = D.roster, i, l = run.enemies.list, n = run.enemies.n;
    for (i = 0; i < R.length; i++) R[i]._cnt = 0;
    for (i = 0; i < n; i++) { var e = l[i]; if (e.alive && e.def._cnt !== undefined && !e.isBoss) e.def._cnt++; }
  }
  function recycle(run) {
    var l = run.enemies.list, n = run.enemies.n, p = run.player, lim = halfDiag() * 1.6, lim2 = lim * lim, step = 0.1, a0 = aheadAngle(run);
    for (var i = 0; i < n; i++) {
      var e = l[i]; if (!e.alive) continue;
      if (e.noRecycle || e.stationary || e.objective || e.isBoss || e.bossPart || e.parentUid !== 0 || e.state === "latched" || e.state === "drop") { e.recycleT = 0; continue; }
      var dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy > lim2) {
        e.recycleT += step;
        if (e.recycleT > 4) {
          e.recycleT = 0;
          var pt = ringPoint(run, a0, 0.9);
          e.x = pt.x; e.y = pt.y; e.vx = 0; e.vy = 0; e.kbx = 0; e.kby = 0;
        }
      } else e.recycleT = 0;
    }
  }

  KS.director = {
    onStageStart: function (run) {
      D.acc = 0; D.surgeT = 0; D.surgeDef = null; D.nextSurge = 180; D.cntT = 0; D.recT = 0;
      D.nextCrate = run.time <= 300 ? 300 : 300 + 180 * Math.ceil((run.time - 300) / 180);
      buildRoster(); recount(run);
    },
    update: function (dt, run) {
      if (!D.rosterOk) buildRoster();
      var p = run.player; if (!p || !p.alive) return;
      var minutes = run.time / 60, map = run.mapDef, dens = map && map.density != null ? map.density : 1;
      var crowded = hasCond(run, "crowded"), bossAlive = run.boss && run.boss.alive && !run.bossDone;
      // surge scheduling
      if (D.surgeT > 0) { D.surgeT -= dt; if (D.surgeT <= 0) D.surgeDef = null; }
      if (run.stageTime >= D.nextSurge) { D.nextSurge += 180; startSurge(run, null); }
      // periodic bookkeeping
      if (--D.cntT <= 0) { D.cntT = 10; recount(run); }
      if (--D.recT <= 0) { D.recT = 6; recycle(run); }
      // guaranteed crate elite
      if (run.time >= D.nextCrate) {
        var cd = pickDef(run, true);
        if (cd && spawnDef(run, cd, true, true)) D.nextCrate += 180;
      }
      // spawn budget
      var rate = Math.min(30, (1 + 0.5 * minutes) * run.spawnMul * dens) * (crowded ? 1.3 : 1) * (D.surgeT > 0 ? 2.5 : 1);
      var cap = Math.min(KS.device.caps.enemies, (40 + 18 * minutes) * (crowded ? 1.1 : 1) * (bossAlive ? 0.8 : 1));
      D.acc += rate * dt; if (D.acc > 12) D.acc = 12;
      var guard = 0, ec = eliteChance(run), tm = run.threatMin;
      while (D.acc >= 1 && guard++ < 8) {
        if (KS.enemyCount() >= cap) { if (D.acc > 2) D.acc = 2; break; }
        var def = null;
        if (D.surgeDef && !(D.surgeDef.max != null && D.surgeDef._cnt >= D.surgeDef.max)) def = D.surgeDef;
        if (!def) def = pickDef(run, false);
        if (!def) { D.acc = 0; break; }
        var elite = tm >= 4 && KS.rng.next() < ec;
        var e = spawnDef(run, def, elite, false);
        D.acc -= 1;
        if (!e) { if (D.acc > 1) D.acc = 1; break; }
      }
    },
    forceElite: function (run, crate) {
      run = run || KS.run; if (!run) return null;
      if (!D.rosterOk) buildRoster();
      var d = pickDef(run, true); if (!d) return null;
      return spawnDef(run, d, true, !!crate);
    },
    surge: function (run, typeId) { run = run || KS.run; if (run) startSurge(run, typeId); }
  };
})(window.KS);
