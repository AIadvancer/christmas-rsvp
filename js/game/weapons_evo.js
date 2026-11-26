/* Kudzu Survivors v2 - weapons_evo.js (ENG-WEAP2): 16 evolutions, 4 fusions, 8 operator Shift Abilities (DESIGN 4.5, 9).
 * Owns: evolved/fusion weapon defs, abilities, buff "toolboxtalk", hazards w_mint / w_starburn / w_bedrock / w_permit / w_dashhit / w_callin.
 * Evolved defs do not carry base milestones unless DESIGN says so (only Fruitcake Fling keeps the catch buff). */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT (all player-facing strings for review)
  // ---------------------------------------------------------------------------
  var TEXT = {
    cane_evo:      { name: "Peppermint Harpoon", desc: "Flies out, turns around and comes home, leaving a sticky mint trail. Returns to sender every time.", ms: "Pierces everything, hits again on the way back, and slows whatever stands in the mint." },
    mulcher_evo:   { name: "Right-of-Way Mulcher", desc: "A huge mulching ring that drags the whole thicket toward the middle. The easement has been claimed.", ms: "Wide aura, fast ticks, pulls enemies in, and keeps the double-damage pulse." },
    saws_evo:      { name: "Twelve-Blade Ring", desc: "Two counter-rotating rings of saw blades. The safety committee has stopped sending memos.", ms: "Two rings of six blades spin in opposite directions." },
    bombs_evo:     { name: "Tree-Topper Starburst", desc: "A glittering star-topped bauble that bursts into shards and leaves a burning star on the ground.", ms: "Each blast throws five star shards and leaves a burning star outline." },
    snow_evo:      { name: "Blizzard Shift", desc: "A nonstop stream of snowballs from a very cold night shift. Frozen enemies shatter into something almost restorative.", ms: "Twelve snowballs a second that freeze. Shattering a frozen enemy heals a little." },
    stampede_evo:  { name: "Midnight Delivery Run", desc: "The herd and a loaded sleigh retrace your last two seconds of footwork at full speed. Deliveries are never late.", ms: "A herd and a sleigh follow your recent path. Damage scales with your speed." },
    grinder_evo:   { name: "Bedrock Grinder", desc: "Heavy carbide disks that keep growing under your boots. The ground is simply not an issue anymore.", ms: "Disks grow as they sit, and you take no contact damage while standing on one." },
    polesaw_evo:   { name: "Full Crew Sweep", desc: "Three pole saws swing at once and clear a full circle. Everybody on the crew pitched in.", ms: "Three sweeps, 120 degrees apart, make a full circle." },
    chipper_evo:   { name: "Year-End Chipper", desc: "Bigger hopper, bigger spray, and every tidy cleanup pays an extra bonus.", ms: "Enemies it kills drop double XP." },
    fruitcake_evo: { name: "Fruitcake Fling", desc: "Comes back, breaks into three small cakes, and sends them out again. Leftovers never looked so useful.", ms: "Splits into three small cakes on return. Each catch heals a little and gives a damage boost." },
    burnpile_evo:  { name: "Permitted Burn", desc: "A big, fully permitted brush fire that draws the whole job site toward it. Paperwork on file.", ms: "Huge, long-lived fire that pulls enemies and pickups toward the center." },
    bells_evo:     { name: "Twelve-Bell Peal", desc: "A full peal of sleigh bells, and sometimes one rings so hard it splits in two.", ms: "Three bells with long chains. Bounces can fork a child bell." },
    drone_evo:     { name: "Dispatch Squadron", desc: "A full squadron of radio drones with homing bolts. Please keep radio chatter to a minimum.", ms: "Four drones with homing bolts that chain twice." },
    blower_evo:    { name: "Nor'easter", desc: "A cold front pointing both directions. Anything that stands in the draft too long freezes in place.", ms: "Front and back cones. Enemies that stay in a cone for 1.5 seconds freeze." },
    lash_evo:      { name: "Main Street Display", desc: "Three strands of lights chain through the crowd and leave bulbs that pop. The neighborhood is thrilled.", ms: "Three arcs with long chains. Every enemy hit gets a bulb that pops after one second." },
    timber_evo:    { name: "Clear-Cut", desc: "Five pines come down in a fan, all at once. Every tree leaves a wood chip behind.", ms: "Five trees fall in a fan, and each drops a 1 XP wood chip." },
    fuse_mulchfire: { name: "Mulch Fire", desc: "A smoldering mulch ring. What the mulcher chews up, the fire finishes. Burn permit sold separately.", ms: "Burning kills inside the ring spawn an ember burst." },
    fuse_carillon:  { name: "Ring Saw Carillon", desc: "Brass saw blades that ring when they bite and throw bells at the next vine over.", ms: "Blade hits sometimes launch a ricocheting bell." },
    fuse_snowglobe: { name: "Snow Globe Barrage", desc: "Lobbed snow globes that freeze everything in the splash. Shake well, then stand back.", ms: "Shattering a frozen enemy sets off a small blast." },
    fuse_lance:     { name: "Sleigh Lance", desc: "A full sleigh at full charge, right down the line. Reindeer have the right of way.", ms: "A sleigh charges through everything in the aim direction and leaves a mint trail." },
    ab: {
      toolboxtalk: ["Toolbox Talk", "Everyone gets a quick safety briefing. Every weapon cooldown is halved for 5 seconds."],
      fullthrottle: ["Full Throttle", "Dash 240 units, untouchable, and cut down everything you pass."],
      fellline: ["Fell Line", "A line of saws rips straight ahead, through everything."],
      feedchipper: ["Feed the Chipper", "Every XP gem on the map flies straight to you."],
      backfire: ["Backfire", "Sets every enemy within 300 units on fire."],
      floodlights: ["Floodlights", "Stuns everything on screen. Bosses only slow down."],
      callitin: ["Call It In", "Twelve snowball bombs on the thickest cluster."],
      changeorder: ["Change Order", "Swaps up to five of your latest items for new ones of the same rarity. Once per stage."]
    }
  };
  var L = { dmg: "Damage", cd: "Cooldown", count: "Count", pierce: "Pierce", radius: "Radius", tick: "Tick damage", reach: "Reach", pellets: "Pellets",
    maxAmmo: "Max ammo", burnDps: "Burn / s", bounces: "Bounces", drones: "Drones", len: "Length", angle: "Cone angle", jumps: "Chain jumps", spin: "Spin", dur: "Duration", interval: "Interval" };

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  var TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, sqrt = Math.sqrt, PI = Math.PI, min = Math.min, max = Math.max, floor = Math.floor;
  var Q = new Array(256), Q2 = new Array(128), Q3 = new Array(512), DP = { x: 0, y: 0, n: 0 };
  var DASH0 = [], DASH_A = [9, 7];

  function wrapA(a) { while (a > PI) a -= TAU; while (a < -PI) a += TAU; return a; }
  function mkSrc(tag, coef) { var s = KS.makeSrc(); s.tag = tag; s.procCoef = coef; return s; }
  function setSrc(s, w, x, y, kb, kx, ky, coef, canCrit) {
    s.team = "player"; s.slot = w ? w.slot : -1; s.weaponId = w ? w.id : ""; s.x = x; s.y = y; s.kb = kb; s.kbx = kx; s.kby = ky;
    if (coef != null) s.procCoef = coef;
    s.canCrit = canCrit !== false; s.depth = 0; s.isDot = false; s.noProc = false; s.noOnKill = false; s.itemId = "";
    return s;
  }
  function autoAimOn() {
    var st; try { st = KS.meta.settings; } catch (e) { st = null; }
    return !(st && (st.autoAim === "off" || st.autoAim === false || st.autoAim === "manual"));
  }
  function aimAt(p, range) {
    if (autoAimOn()) { var e = KS.nearestEnemy(p.x, p.y, range); if (e) return atan2(e.y - p.y, e.x - p.x); }
    return atan2(p.aimY, p.aimX);
  }
  function rangeMul() { var v = KS.items.rangeMul(); return v > 0 ? v : 1; }
  function area() { return KS.run.stats.area; }
  function drawTeeth(ctx, cx, cy, rIn, rOut, n, rot, color) {
    var step = TAU / n, i, a;
    ctx.fillStyle = color; ctx.beginPath();
    for (i = 0; i < n; i++) {
      a = rot + i * step;
      ctx.moveTo(cx + cos(a - step * 0.28) * rIn, cy + sin(a - step * 0.28) * rIn);
      ctx.lineTo(cx + cos(a) * rOut, cy + sin(a) * rOut);
      ctx.lineTo(cx + cos(a + step * 0.28) * rIn, cy + sin(a + step * 0.28) * rIn);
    }
    ctx.fill();
  }
  var HT = [-99, -99, -99], HN = [0, 0, 0];
  function capHeal(i, amt, cap) {
    var run = KS.run; if (!run) return;
    if (run.time - HT[i] >= 1 || run.time < HT[i]) { HT[i] = run.time; HN[i] = 0; }
    if (HN[i] + amt > cap) return;
    HN[i] += amt; KS.healPlayer(amt, "weapon");
  }
  function defaults(d) {
    d.unlock = null; if (d.procCoef == null) d.procCoef = 1;
    if (!d.projDraw) d.projDraw = function () { };
    return d;
  }
  function drawDeer(ctx, x, y, ang, sc, t, phase) {
    var leg = sin(t * 22 + phase) * 5, flip = cos(ang) < 0 ? -1 : 1, i;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc * flip);
    ctx.fillStyle = "#5a3d24";
    ctx.beginPath(); ctx.ellipse(0, 0, 21, 9, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3d2815"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i < 4; i++) { var lx = (i < 2 ? -13 : 11) + (i & 1) * 4, sg = (i & 1) ? -1 : 1; ctx.moveTo(lx, 6); ctx.lineTo(lx + leg * sg, 17); }
    ctx.stroke();
    ctx.strokeStyle = "#5a3d24"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(24, -10); ctx.stroke();
    ctx.fillStyle = "#5a3d24"; ctx.beginPath(); ctx.ellipse(27, -11, 6.5, 4.5, -0.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(18, 4); ctx.stroke();
    ctx.fillStyle = "#e7c55b"; ctx.beginPath(); ctx.arc(31, -10, 2.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#d9c9a3"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(25, -15); ctx.lineTo(21, -25); ctx.moveTo(23, -20); ctx.lineTo(28, -24); ctx.moveTo(25, -15); ctx.lineTo(30, -26); ctx.moveTo(28, -21); ctx.lineTo(33, -22); ctx.stroke();
    ctx.restore();
  }
  function drawSleigh(ctx, x, y, ang, sc) {
    var flip = cos(ang) < 0 ? -1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc * flip);
    ctx.strokeStyle = "#c9993b"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-26, 15); ctx.lineTo(20, 15); ctx.quadraticCurveTo(30, 15, 28, 6); ctx.stroke();
    ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.moveTo(-24, 12); ctx.lineTo(-24, -6); ctx.quadraticCurveTo(-8, -4, 22, -8); ctx.lineTo(22, 12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e7c55b"; ctx.fillRect(-24, 4, 46, 3);
    ctx.fillStyle = "#2f4a32"; ctx.beginPath(); ctx.arc(-12, -9, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#efe2c4"; ctx.fillRect(-16, -10, 5, 5); ctx.fillStyle = "#b3261e"; ctx.fillRect(-9, -12, 5, 5);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Buff toolboxtalk (Foreman ability)
  // ---------------------------------------------------------------------------
  KS.registerBuff({ id: "toolboxtalk", name: "Toolbox Talk", stats: function (S) { S.cooldown *= 0.5; } });

  // ---------------------------------------------------------------------------
  // Hazard w_mint: a mint streak segment (player team, slows enemies 40%)
  // ---------------------------------------------------------------------------
  var MINT_SRC = mkSrc("blade", 0); MINT_SRC.noProc = true; MINT_SRC.canCrit = false;
  var MINT_F = { w: 40, h: 18, ang: 0, life: 1.5, src: MINT_SRC, data: { q: 0 } };
  KS.registerHazard({
    id: "w_mint", team: "player", r: 20, life: 1.5, cosmetic: true,
    update: function (h, dt, run) {
      var d = h.data; d.q -= dt; if (d.q > 0) return;
      d.q = 0.15;
      var R = sqrt(h.w * h.w + h.h * h.h) * 0.5 + 12, n = KS.grid.query(h.x, h.y, R, Q, 128), c = cos(-h.ang), s = sin(-h.ang), i;
      for (i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        var dx = e.x - h.x, dy = e.y - h.y, lx = dx * c - dy * s, ly = dx * s + dy * c;
        if (lx < -h.w * 0.5 - e.r || lx > h.w * 0.5 + e.r || ly < -h.h * 0.5 - e.r || ly > h.h * 0.5 + e.r) continue;
        KS.applyStatus(e, "slow", 0.6, 0.45, h.src);
      }
    },
    draw: function (ctx, h, t) {
      var f = min(1, h.life / 0.5), k;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      ctx.globalAlpha = 0.5 * f; ctx.fillStyle = "#bfeedd"; ctx.fillRect(-h.w * 0.5, -h.h * 0.5, h.w, h.h);
      ctx.globalAlpha = 0.45 * f; ctx.fillStyle = "#e6574b";
      for (k = -h.w * 0.5 + 4; k < h.w * 0.5 - 6; k += 12) { ctx.beginPath(); ctx.moveTo(k, -h.h * 0.5); ctx.lineTo(k + 6, -h.h * 0.5); ctx.lineTo(k + 2, h.h * 0.5); ctx.lineTo(k - 4, h.h * 0.5); ctx.closePath(); ctx.fill(); }
      ctx.globalAlpha = 0.7 * f; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.strokeRect(-h.w * 0.5, -h.h * 0.5, h.w, h.h);
      ctx.restore();
    }
  });
  function mintSeg(x0, y0, x1, y1) {
    var dx = x1 - x0, dy = y1 - y0, len = sqrt(dx * dx + dy * dy);
    if (len < 4) return;
    MINT_F.w = len + 8; MINT_F.h = 18; MINT_F.ang = atan2(dy, dx); MINT_F.life = 1.5; MINT_F.data.q = 0;
    KS.spawnHazard("w_mint", (x0 + x1) * 0.5, (y0 + y1) * 0.5, MINT_F);
  }

  // ---------------------------------------------------------------------------
  // E1 Peppermint Harpoon
  // ---------------------------------------------------------------------------
  var CANE_EVO = defaults({
    id: "cane_evo", name: TEXT.cane_evo.name, icon: "🍭", tag: "blade", desc: TEXT.cane_evo.desc, milestone: TEXT.cane_evo.ms, evolved: true, from: "cane",
    levels: [{ dmg: 45, cd: 0.6, count: 3, speed: 520, life: 0.9 }],
    labels: { dmg: L.dmg, cd: L.cd, count: L.count },
    init: function (w) { w.cd = 0.2; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, base = aimAt(p, 520), n = max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), out = KS.wstat(w, "life");
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * 0.16, q = KS.spawnProj(CANE_EVO, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 9; q.dmg = dmg; q.pierce = -1; q.life = out + 5; q.kb = 120; q.data.ph = 0; q.data.out = out; q.data.sk = 0.05; q.data.lx = p.x; q.data.ly = p.y;
      }
      KS.sfx("throw");
    },
    projUpdate: function (p, dt, run) {
      var d = p.data, pl = run.player;
      if (d.ph === 0 && p.t >= d.out) { d.ph = 1; p.hitN = 0; }
      if (d.ph === 1) {
        var tx = pl.x - p.x, ty = pl.y - p.y, Ld = sqrt(tx * tx + ty * ty) || 1;
        if (Ld < 28) { p.alive = false; KS.sfx("chime", 0); KS.fx("ring", pl.x, pl.y, "#bfeedd", 1, 22); return true; }
        p.vx = tx / Ld * 600; p.vy = ty / Ld * 600; p.ang = atan2(p.vy, p.vx);
      }
      d.sk -= dt;
      if (d.sk <= 0) { d.sk = 0.16; mintSeg(d.lx, d.ly, p.x, p.y); d.lx = p.x; d.ly = p.y; }
      return false;
    },
    projDraw: function (ctx, p) {
      var pl = KS.run.player, i;
      ctx.globalAlpha = 0.4; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pl.x, pl.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.lineCap = "round";
      ctx.strokeStyle = "#f4ecd8"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 3.4; ctx.beginPath();
      for (i = 0; i < 5; i++) { ctx.moveTo(-21 + i * 7, 3); ctx.lineTo(-17 + i * 7, -3); }
      ctx.stroke();
      ctx.fillStyle = "#9fe3c8"; ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(10, -8); ctx.lineTo(13, 0); ctx.lineTo(10, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  });
  KS.registerWeapon(CANE_EVO);

  // ---------------------------------------------------------------------------
  // E2 Right-of-Way Mulcher
  // ---------------------------------------------------------------------------
  var MULE_SRC = mkSrc("blade", 0.5);
  var MULCHER_EVO = defaults({
    id: "mulcher_evo", name: TEXT.mulcher_evo.name, icon: "⚙️", tag: "blade", desc: TEXT.mulcher_evo.desc, milestone: TEXT.mulcher_evo.ms, evolved: true, from: "mulcher", procCoef: 0.5,
    levels: [{ radius: 208, tick: 18, interval: 0.4 }],
    labels: { radius: L.radius, tick: L.tick },
    init: function (w) { var s = w.state; s.tickT = 0.3; s.pulseT = 4; s.rot = 0; s.fx = 0; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      s.rot += dt * 3.0; if (s.fx > 0) s.fx -= dt;
      s.pulseT -= dt; s.tickT -= dt;
      var doTick = s.tickT <= 0, R = KS.wstat(w, "radius"), dmg = KS.wstat(w, "tick"), mult = 1, kb = 0;
      if (doTick) {
        s.tickT += KS.wstat(w, "interval");
        if (s.pulseT <= 0) { s.pulseT = 4; mult = 2; kb = 260; s.fx = 0.3; KS.fx("ring", p.x, p.y, "#c9993b", 1, R); KS.shake(2); }
      }
      var n = KS.grid.query(p.x, p.y, R, Q, 256), i, hit = 0;
      for (i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        var dx = e.x - p.x, dy = e.y - p.y, dd = sqrt(dx * dx + dy * dy) || 1;
        if (!e.isBoss && !e.bossPart && !e.stationary && !e.objective && dd > 26) { e.x -= dx / dd * 40 * dt; e.y -= dy / dd * 40 * dt; }
        if (doTick) { setSrc(MULE_SRC, w, p.x, p.y, kb, dx, dy, 0.5, true); KS.damage(e, dmg * mult, MULE_SRC); hit++; }
      }
      if (hit > 0) KS.fx("chips", p.x + cos(s.rot * 2) * R * 0.85, p.y + sin(s.rot * 2) * R * 0.85, "#8a5a2b", 2, 2);
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, R = KS.wstat(w, "radius"), t = run.time, i;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.1; ctx.fillStyle = "#c9993b"; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 3; ctx.setLineDash(DASH_A); ctx.lineDashOffset = -t * 30;
      ctx.beginPath(); ctx.arc(0, 0, R - 6, 0, TAU); ctx.stroke(); ctx.setLineDash(DASH0);
      ctx.globalAlpha = 0.9; drawTeeth(ctx, 0, 0, R - 8, R + 5, 26, s.rot, "#c9993b");
      ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 3;
      for (i = 0; i < 8; i++) {
        var f = (t * 0.7 + i / 8) % 1, r = R * (0.95 - 0.8 * f), a = i * TAU / 8 + s.rot * 0.15;
        ctx.globalAlpha = 0.65 * (1 - f);
        ctx.beginPath(); ctx.moveTo(cos(a - 0.09) * (r + 14), sin(a - 0.09) * (r + 14)); ctx.lineTo(cos(a) * r, sin(a) * r); ctx.lineTo(cos(a + 0.09) * (r + 14), sin(a + 0.09) * (r + 14)); ctx.stroke();
      }
      ctx.globalAlpha = 0.4; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 0.5, s.rot, s.rot + 2.2); ctx.stroke();
      if (s.fx > 0) { ctx.globalAlpha = s.fx * 2.5; ctx.strokeStyle = "#fff6d8"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, R * (1 + (0.3 - s.fx) * 1.2), 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    }
  });
  KS.registerWeapon(MULCHER_EVO);

  // ---------------------------------------------------------------------------
  // Shared saw-ring logic (E3 Twelve-Blade Ring, F2 Ring Saw Carillon)
  // ---------------------------------------------------------------------------
  var SAW_MAX = 16, SAW_RING = 16;
  function sawInit(w) {
    var s = w.state;
    s.ang = 0; s.n = 0; s.bellT = 0;
    s.bx = new Float32Array(SAW_MAX); s.by = new Float32Array(SAW_MAX);
    s.ru = new Int32Array(SAW_MAX * SAW_RING); s.rt = new Float32Array(SAW_MAX * SAW_RING); s.rt.fill(-99);
  }
  function bladeCanHit(s, i, e, now, slot) {
    if (now - e.hitStamp[slot] < 0.15) return false;
    var base = i * SAW_RING, j, found = -1;
    for (j = 0; j < SAW_RING; j++) {
      if (s.ru[base + j] === e.uid) { found = j; if (now - s.rt[base + j] < 0.4) return false; break; }
    }
    if (found < 0) {
      var oldest = 0, ot = 1e9;
      for (j = 0; j < SAW_RING; j++) { if (s.rt[base + j] < ot) { ot = s.rt[base + j]; oldest = j; } }
      found = oldest;
    }
    s.ru[base + found] = e.uid; s.rt[base + found] = now;
    return true;
  }
  function drawSawBlade(ctx, x, y, r, rot, steel, accent) {
    drawTeeth(ctx, x, y, r * 0.78, r * 1.25, 10, rot, steel);
    ctx.fillStyle = steel; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.55, rot, rot + 4); ctx.stroke();
    ctx.fillStyle = "#2a1f1a"; ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU); ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // E3 Twelve-Blade Ring
  // ---------------------------------------------------------------------------
  var SAWE_SRC = mkSrc("blade", 1);
  var SAWS_EVO = defaults({
    id: "saws_evo", name: TEXT.saws_evo.name, icon: "🪚", tag: "blade", desc: TEXT.saws_evo.desc, milestone: TEXT.saws_evo.ms, evolved: true, from: "saws",
    levels: [{ count: 6, dmg: 26, spin: 4.5, orbit: 70 }],
    labels: { count: L.count, dmg: L.dmg, spin: L.spin },
    init: sawInit,
    onStageStart: function (w) { var s = w.state; if (s.ru) { s.ru.fill(0); s.rt.fill(-99); } },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (!s.ru) sawInit(w);
      var per = max(1, min(8, Math.round(KS.wstat(w, "count")))), dmg = KS.wstat(w, "dmg"), spin = KS.wstat(w, "spin"), a1 = KS.wstat(w, "orbit"), a2 = a1 * 120 / 70;
      s.n = per * 2; s.ang += spin * dt;
      var now = run.time, slot = w.slot, i, k, cnt, e;
      for (i = 0; i < s.n; i++) {
        var outer = i >= per, idx = outer ? i - per : i, dir = outer ? -1 : 1, orb = outer ? a2 : a1;
        var a = dir * s.ang + idx * TAU / per + (outer ? PI / per : 0), bx = p.x + cos(a) * orb, by = p.y + sin(a) * orb;
        s.bx[i] = bx; s.by[i] = by;
        cnt = KS.grid.query(bx, by, 13, Q, 128);
        for (k = 0; k < cnt; k++) {
          e = Q[k]; if (!e.alive || !bladeCanHit(s, i, e, now, slot)) continue;
          setSrc(SAWE_SRC, w, bx, by, 60, -sin(a) * dir, cos(a) * dir, 1, true);
          KS.damage(e, dmg, SAWE_SRC);
        }
      }
      if (s.n > 0 && (run.stepN & 15) === 0) KS.sfx("saw");
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, i, per = s.n >> 1;
      if (!s.bx || s.n < 2) return;
      ctx.globalAlpha = 0.14; ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, KS.wstat(w, "orbit"), 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, KS.wstat(w, "orbit") * 120 / 70, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      for (i = 0; i < s.n; i++) drawSawBlade(ctx, s.bx[i], s.by[i], 12, s.ang * (i >= per ? -3 : 3) + i, i >= per ? "#c9a24a" : "#aab1b8", i >= per ? "#b3261e" : "#2f4a32");
    }
  });
  KS.registerWeapon(SAWS_EVO);

  // ---------------------------------------------------------------------------
  // Hazard w_starburn: burning star outline (E4)
  // ---------------------------------------------------------------------------
  var STAR_X = new Float32Array(10), STAR_Y = new Float32Array(10);
  (function () { for (var i = 0; i < 10; i++) { var a = -PI / 2 + i * PI / 5, r = (i & 1) ? 0.42 : 1; STAR_X[i] = cos(a) * r; STAR_Y[i] = sin(a) * r; } })();
  var STARB_SRC = mkSrc("fire", 0.3);
  var STARB_F = { r: 46, dmg: 0, life: 3, tick: 0.5, src: STARB_SRC, data: { bd: 15, slot: 0 } };
  KS.registerHazard({
    id: "w_starburn", team: "player", autoDamage: true, r: 46, life: 3, tick: 0.5,
    onEnemy: function (h, e) { KS.applyStatus(e, "burn", h.data.bd, 1.6, h.src); },
    draw: function (ctx, h, t) {
      var fade = h.life < 0.5 ? max(0, h.life * 2) : 1, r = h.r, i, fl = 0.75 + 0.25 * sin(t * 14 + h.uid);
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(0.3 * sin(t + h.uid));
      ctx.globalAlpha = 0.16 * fade; ctx.fillStyle = "#e0701f"; ctx.beginPath();
      for (i = 0; i < 10; i++) ctx.lineTo(STAR_X[i] * r, STAR_Y[i] * r);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = fade * fl; ctx.strokeStyle = "#f4a62a"; ctx.lineWidth = 3.5; ctx.lineJoin = "round"; ctx.beginPath();
      for (i = 0; i < 10; i++) ctx.lineTo(STAR_X[i] * r, STAR_Y[i] * r);
      ctx.closePath(); ctx.stroke();
      ctx.strokeStyle = "#fff2a0"; ctx.lineWidth = 1.2; ctx.stroke();
      for (i = 0; i < 10; i += 2) {
        var hh = 10 + 7 * sin(t * 11 + i * 2);
        ctx.fillStyle = "#c8341a"; ctx.beginPath(); ctx.moveTo(STAR_X[i] * r - 4, STAR_Y[i] * r); ctx.lineTo(STAR_X[i] * r, STAR_Y[i] * r - hh); ctx.lineTo(STAR_X[i] * r + 4, STAR_Y[i] * r); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  });

  // ---------------------------------------------------------------------------
  // E4 Tree-Topper Starburst
  // ---------------------------------------------------------------------------
  var STARBLAST_SRC = mkSrc("blast", 0.6);
  var BAUBLE = ["#e8c35a", "#f6e27a", "#d9a935"];
  var BOMBS_EVO = defaults({
    id: "bombs_evo", name: TEXT.bombs_evo.name, icon: "🔮", tag: "blast", desc: TEXT.bombs_evo.desc, milestone: TEXT.bombs_evo.ms, evolved: true, from: "bombs", procCoef: 0.6,
    levels: [{ count: 4, dmg: 70, radius: 96, cd: 1.8, burnDps: 15 }],
    labels: { count: L.count, dmg: L.dmg, radius: L.radius, cd: L.cd, burnDps: L.burnDps },
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = max(1, Math.round(KS.wstat(w, "count"))), rad = KS.wstat(w, "radius"), dmg = KS.wstat(w, "dmg"), bd = KS.wstat(w, "burnDps"), fired = 0;
      for (var k = 0; k < n; k++) {
        var tx, ty, ok = false;
        if (KS.rng.chance(0.5) && KS.densestPoint(100, DP) && DP.n > 0) { tx = DP.x; ty = DP.y; ok = true; }
        else { var e = KS.randomEnemyNear(p.x, p.y, 420); if (e) { tx = e.x; ty = e.y; ok = true; } }
        if (!ok) continue;
        tx += KS.rng.range(-18, 18); ty += KS.rng.range(-18, 18);
        var q = KS.spawnProj(BOMBS_EVO, w.slot, p.x, p.y, 0, 0, null);
        if (!q) break;
        q.noCollide = true; q.life = 1; q.dmg = dmg; q.r = 8; q.kind = 0; q.procCoef = 0.6;
        q.data.sx = p.x; q.data.sy = p.y; q.data.tx = tx; q.data.ty = ty; q.data.rad = rad; q.data.bd = bd; q.data.col = KS.rng.int(0, 2);
        fired++;
      }
      if (fired) { KS.sfx("throw"); w.cd = KS.wstat(w, "cd"); } else w.cd = 0.3;
    },
    projUpdate: function (p, dt, run) {
      var d = p.data;
      if (p.kind === 0) {
        var u = p.t / 0.6;
        if (u >= 1) {
          p.x = d.tx; p.y = d.ty;
          var cx = p.x, cy = p.y, n = KS.grid.query(cx, cy, d.rad, Q, 256), i, e, k;
          for (i = 0; i < n; i++) {
            e = Q[i]; if (!e.alive) continue;
            setSrc(STARBLAST_SRC, null, cx, cy, 180, e.x - cx, e.y - cy, 0.6, true); STARBLAST_SRC.slot = p.slot; STARBLAST_SRC.weaponId = "bombs_evo";
            KS.damage(e, p.dmg, STARBLAST_SRC);
          }
          KS.fx("ring", cx, cy, "#f6e27a", 1, d.rad); KS.fx("burst", cx, cy, BAUBLE[d.col % 3], 14, 4); KS.fx("sparks", cx, cy, "#fff2a0", 8, 3); KS.shake(2.5); KS.sfx("explode");
          var base = KS.rng.range(0, TAU);
          for (k = 0; k < 5; k++) {
            var a = base + k * TAU / 5, q = KS.spawnProj(BOMBS_EVO, p.slot, cx, cy, cos(a) * 380, sin(a) * 380, null);
            if (!q) break;
            q.kind = 1; q.r = 7; q.dmg = p.dmg * 0.4; q.pierce = 2; q.life = 0.5; q.kb = 60; q.procCoef = 0.4;
          }
          STARB_SRC.slot = p.slot; STARB_SRC.weaponId = "bombs_evo"; STARB_SRC.team = "player"; STARB_F.data.bd = d.bd; STARB_F.data.slot = p.slot; STARB_F.r = 46 * area();
          KS.spawnHazard("w_starburn", cx, cy, STARB_F);
          p.alive = false; return true;
        }
        p.x = d.sx + (d.tx - d.sx) * u; p.y = d.sy + (d.ty - d.sy) * u;
        return true;
      }
      return false;
    },
    projDraw: function (ctx, p) {
      var d = p.data, i;
      ctx.globalAlpha = 1;
      if (p.kind === 1) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 16); ctx.fillStyle = "#f6e27a"; ctx.strokeStyle = "#8a6a22"; ctx.lineWidth = 1; ctx.beginPath();
        for (i = 0; i < 10; i++) ctx.lineTo(STAR_X[i] * 8, STAR_Y[i] * 8);
        ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); return;
      }
      var u = min(1, p.t / 0.6), z = sin(PI * u) * 85;
      ctx.globalAlpha = 0.25; ctx.strokeStyle = "#f4a62a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.tx, d.ty, d.rad, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 9 - z * 0.04, 4.5 - z * 0.02, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      var y = p.y - z;
      ctx.fillStyle = BAUBLE[d.col % 3]; ctx.beginPath(); ctx.arc(p.x, y, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(42,31,26,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.translate(p.x, y - 15); ctx.rotate(p.t * 6); ctx.fillStyle = "#fff2a0"; ctx.beginPath();
      for (i = 0; i < 10; i++) ctx.lineTo(STAR_X[i] * 8, STAR_Y[i] * 8);
      ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(p.x - 3, y - 3, 2.4, 0, TAU); ctx.fill();
    }
  });
  KS.registerWeapon(BOMBS_EVO);

  // ---------------------------------------------------------------------------
  // E5 Blizzard Shift
  // ---------------------------------------------------------------------------
  var SNOWE_SRC = mkSrc("frost", 1);
  var SNOW_EVO = defaults({
    id: "snow_evo", name: TEXT.snow_evo.name, icon: "❄️", tag: "frost", desc: TEXT.snow_evo.desc, milestone: TEXT.snow_evo.ms, evolved: true, from: "snow",
    levels: [{ dmg: 14, cd: 0.08333, speed: 420, life: 0.9 }],
    labels: { dmg: L.dmg, cd: L.cd },
    init: function (w) { w.cd = 0.2; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, base = aimAt(p, 450), cd = KS.wstat(w, "cd"), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), life = KS.wstat(w, "life"), guard = 0;
      while (w.cd <= 0 && guard < 3) {
        guard++; w.cd += cd;
        var a = base + (KS.rng.next() * 2 - 1) * 0.2094, q = KS.spawnProj(SNOW_EVO, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 6; q.dmg = dmg; q.life = life; q.kb = 160; q.pierce = 0;
      }
      if (w.cd < 0) w.cd = 0;
      if ((run.stepN & 7) === 0) KS.sfx("throw");
    },
    projHit: function (p, e, run) {
      setSrc(SNOWE_SRC, run.weapons[p.slot], p.x, p.y, 0, p.vx, p.vy, 1, false);
      KS.applyStatus(e, "chill", 1.5, 2, SNOWE_SRC);
      return true;
    },
    draw: function (ctx, w, run) {
      var p = run.player, t = run.time, i;
      ctx.globalAlpha = 0.5; ctx.strokeStyle = "#e9f6fb"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (i = 0; i < 5; i++) { var a = t * 2.2 + i * TAU / 5; ctx.beginPath(); ctx.arc(p.x, p.y, 28 + 3 * sin(t * 5 + i), a, a + 0.7); ctx.stroke(); }
      ctx.globalAlpha = 1;
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 1; ctx.strokeStyle = "rgba(160,215,245,0.55)"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#7fc4ec"; ctx.lineWidth = 1.5; ctx.stroke();
    }
  });
  KS.registerWeapon(SNOW_EVO);

  // ---------------------------------------------------------------------------
  // E6 Midnight Delivery Run
  // ---------------------------------------------------------------------------
  var PATH_N = 120, PATH_RATE = 180;
  var STAMP_EVO = defaults({
    id: "stampede_evo", name: TEXT.stampede_evo.name, icon: "🦌", tag: "haul", desc: TEXT.stampede_evo.desc, milestone: TEXT.stampede_evo.ms, evolved: true, from: "stampede",
    levels: [{ count: 4, dmg: 130, cd: 3.5 }],
    labels: { count: L.count, dmg: L.dmg, cd: L.cd },
    init: function (w) {
      var s = w.state; w.cd = 1.2;
      s.rx = new Float32Array(PATH_N); s.ry = new Float32Array(PATH_N); s.ri = 0; s.rn = 0; s.cvb = new Float32Array(PATH_N * 4); s.cvi = 0;
    },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, j;
      if (!s.rx) STAMP_EVO.init(w);
      s.rx[s.ri] = p.x; s.ry[s.ri] = p.y; s.ri = (s.ri + 1) % PATH_N; if (s.rn < PATH_N) s.rn++;
      w.cd -= dt; if (w.cd > 0) return;
      if (!KS.nearestEnemy(p.x, p.y, 700)) { w.cd = 0.3; return; }
      w.cd = KS.wstat(w, "cd");
      s.cvi ^= 1;
      var off = s.cvi * PATH_N * 2, len = 0, px = 0, py = 0, idx;
      for (j = 0; j < PATH_N; j++) {
        idx = s.rn < PATH_N ? max(0, j - (PATH_N - s.rn)) : (s.ri + j) % PATH_N;
        s.cvb[off + j * 2] = s.rx[idx]; s.cvb[off + j * 2 + 1] = s.ry[idx];
        if (j > 0) { px = s.rx[idx] - s.cvb[off + j * 2 - 2]; py = s.ry[idx] - s.cvb[off + j * 2 - 1]; len += sqrt(px * px + py * py); }
      }
      if (len < 90) {
        var aa = aimAt(p, 600), ca = cos(aa), sa = sin(aa);
        for (j = 0; j < PATH_N; j++) { var f = (j / (PATH_N - 1) - 0.5) * 520; s.cvb[off + j * 2] = p.x + ca * f; s.cvb[off + j * 2 + 1] = p.y + sa * f; }
      }
      var n = max(1, min(8, Math.round(KS.wstat(w, "count")))), dmg = KS.wstat(w, "dmg") * (run.stats.speed / 150), m, q;
      for (m = 0; m <= n; m++) {
        var sl = m === n;
        q = KS.spawnProj(STAMP_EVO, w.slot, s.cvb[off], s.cvb[off + 1], 0, 0, null);
        if (!q) break;
        q.r = sl ? 30 : 22; q.dmg = dmg; q.pierce = -1; q.life = 3; q.kb = 300; q.noCollide = true;
        q.data.cv = s.cvi; q.data.sl = sl ? 1 : 0; q.data.off = sl ? ((n + 1) >> 1) * 14 + 12 : (m >> 1) * 14; q.data.lat = sl || n === 1 ? 0 : ((m & 1) ? 16 : -16); q.data.act = 0;
      }
      KS.sfx("deer");
    },
    projUpdate: function (p, dt, run) {
      var d = p.data, w = run.weapons[p.slot];
      if (!w || w.id !== "stampede_evo" || !w.state.cvb) { p.alive = false; return true; }
      var buf = w.state.cvb, o = d.cv * PATH_N * 2, f = p.t * PATH_RATE - d.off, i0, fr, x0, y0, x1, y1, bx, by, dx, dy, dl;
      if (f < 0) { p.noCollide = true; d.act = 0; return true; }
      if (f > PATH_N - 1 + 40) { p.alive = false; return true; }
      p.noCollide = false; d.act = 1;
      if (f >= PATH_N - 1) {
        x1 = buf[o + (PATH_N - 1) * 2]; y1 = buf[o + (PATH_N - 1) * 2 + 1];
        dx = x1 - buf[o + (PATH_N - 4) * 2]; dy = y1 - buf[o + (PATH_N - 4) * 2 + 1]; dl = sqrt(dx * dx + dy * dy);
        if (dl > 0.01) { dx /= dl; dy /= dl; p.ang = atan2(dy, dx); } else { dx = cos(p.ang); dy = sin(p.ang); }
        bx = x1 + dx * (f - (PATH_N - 1)) * 4.2; by = y1 + dy * (f - (PATH_N - 1)) * 4.2;
      } else {
        i0 = floor(f); fr = f - i0;
        x0 = buf[o + i0 * 2]; y0 = buf[o + i0 * 2 + 1]; x1 = buf[o + i0 * 2 + 2]; y1 = buf[o + i0 * 2 + 3];
        dx = x1 - x0; dy = y1 - y0; dl = sqrt(dx * dx + dy * dy);
        bx = x0 + dx * fr; by = y0 + dy * fr;
        if (dl > 0.05) p.ang = atan2(dy, dx);
      }
      p.x = bx - sin(p.ang) * d.lat; p.y = by + cos(p.ang) * d.lat;
      return true;
    },
    projDraw: function (ctx, p, run) {
      var d = p.data;
      if (!d.act) return;
      ctx.globalAlpha = 1;
      if (d.sl) drawSleigh(ctx, p.x, p.y, p.ang, 1); else drawDeer(ctx, p.x, p.y, p.ang, 0.9, p.t, p.uid);
    }
  });
  KS.registerWeapon(STAMP_EVO);

  // ---------------------------------------------------------------------------
  // Hazard w_bedrock + E7 Bedrock Grinder
  // ---------------------------------------------------------------------------
  var BED_SRC = mkSrc("blade", 0.5);
  var BED_F = { r: 40, dmg: 18, life: 8, src: BED_SRC, data: { slot: 0, grow: 6, maxR: 80, q: 0 } };
  KS.registerHazard({
    id: "w_bedrock", team: "player", r: 40, life: 8,
    update: function (h, dt, run) {
      var d = h.data;
      if (h.r < d.maxR) h.r = min(d.maxR, h.r + d.grow * dt);
      d.q -= dt; if (d.q > 0) return;
      d.q = 0.08;
      var n = KS.grid.query(h.x, h.y, h.r, Q, 256), now = run.time, slot = d.slot, i, hit = 0;
      for (i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive || now - e.hitStamp[slot] < 0.33) continue;
        h.src.slot = slot; h.src.weaponId = "grinder_evo"; h.src.x = e.x; h.src.y = e.y; h.src.kb = 0; h.src.canCrit = true;
        KS.damage(e, h.dmg, h.src); hit++;
      }
      if (hit > 0) KS.sfx("saw");
    },
    draw: function (ctx, h, t) {
      var fade = h.life < 0.5 ? max(0, h.life * 2) : 1, r = h.r, rot = t * 7 + h.uid;
      ctx.save(); ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.arc(h.x, h.y + 3, r + 3, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade;
      drawTeeth(ctx, h.x, h.y, r * 0.84, r * 1.16, 16, rot, "#e0a82e");
      ctx.fillStyle = "#4e545b"; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#2a2f35"; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = "#8a9096"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.72, rot, rot + 4.6); ctx.stroke();
      ctx.strokeStyle = "#e0a82e"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.45, -rot, -rot + 3.4); ctx.stroke();
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(h.x, h.y, max(4, r * 0.18), 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.22 * fade; ctx.strokeStyle = "#bfae8a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, r + 6 + 3 * sin(t * 5 + h.uid), 0, TAU); ctx.stroke();
      ctx.restore();
    }
  });
  var GRINDER_EVO = defaults({
    id: "grinder_evo", name: TEXT.grinder_evo.name, icon: "🛞", tag: "blade", desc: TEXT.grinder_evo.desc, milestone: TEXT.grinder_evo.ms, evolved: true, from: "grinder", procCoef: 0.5,
    levels: [{ interval: 0.6, radius: 40, dmg: 18, dur: 8 }],
    labels: { interval: L.interval, radius: L.radius, dmg: L.dmg, dur: L.dur },
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      var p = run.player, pool = run.hazards, i, h;
      for (i = 0; i < pool.n; i++) {
        h = pool.list[i];
        if (h.alive && h.defId === "w_bedrock" && h.data.slot === w.slot) {
          var dx = p.x - h.x, dy = p.y - h.y;
          if (dx * dx + dy * dy < (h.r - 2) * (h.r - 2)) { KS.setContactImmune(); break; }
        }
      }
      w.cd -= dt; if (w.cd > 0) return;
      w.cd = KS.wstat(w, "interval");
      var cnt = 0, old = null, ou = 1e18;
      for (i = 0; i < pool.n; i++) {
        h = pool.list[i];
        if (h.alive && h.defId === "w_bedrock" && h.data.slot === w.slot) { cnt++; if (h.uid < ou) { ou = h.uid; old = h; } }
      }
      if (cnt >= 12 && old) old.alive = false;
      BED_SRC.slot = w.slot; BED_SRC.weaponId = "grinder_evo"; BED_SRC.team = "player";
      BED_F.r = KS.wstat(w, "radius"); BED_F.dmg = KS.wstat(w, "dmg"); BED_F.life = KS.wstat(w, "dur");
      BED_F.data.slot = w.slot; BED_F.data.grow = 6 * area(); BED_F.data.maxR = 80 * area(); BED_F.data.q = 0.05;
      KS.spawnHazard("w_bedrock", p.x, p.y, BED_F);
    }
  });
  KS.registerWeapon(GRINDER_EVO);

  // ---------------------------------------------------------------------------
  // E8 Full Crew Sweep
  // ---------------------------------------------------------------------------
  var POLEE_SRC = mkSrc("blade", 1);
  var SWEEP_T = 0.18, SWEEP_ARC = 2.0944;
  var POLESAW_EVO = defaults({
    id: "polesaw_evo", name: TEXT.polesaw_evo.name, icon: "🪓", tag: "blade", desc: TEXT.polesaw_evo.desc, milestone: TEXT.polesaw_evo.ms, evolved: true, from: "polesaw",
    levels: [{ reach: 150, dmg: 110, cd: 1.1 }],
    labels: { reach: L.reach, dmg: L.dmg, cd: L.cd },
    init: function (w) {
      var s = w.state; w.cd = 0.3;
      s.on = new Uint8Array(3); s.a = new Float32Array(3); s.t = new Float32Array(3); s.n = new Int32Array(3); s.hits = new Int32Array(3 * 128); s.reach = 150;
    },
    onStageStart: function (w) { var s = w.state; if (s.on) s.on.fill(0); },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i;
      if (!s.on) POLESAW_EVO.init(w);
      w.cd -= dt;
      if (w.cd <= 0) {
        var a = aimAt(p, 260);
        w.cd = KS.wstat(w, "cd");
        for (i = 0; i < 3; i++) { s.on[i] = 1; s.a[i] = a + i * TAU / 3; s.t[i] = 0; s.n[i] = 0; }
        KS.sfx("throw");
      }
      var reach = KS.wstat(w, "reach"), dmg = KS.wstat(w, "dmg"); s.reach = reach;
      var n = 0, any = false;
      for (i = 0; i < 3; i++) if (s.on[i]) { any = true; break; }
      if (!any) return;
      n = KS.grid.query(p.x, p.y, reach, Q, 256);
      for (i = 0; i < 3; i++) {
        if (!s.on[i]) continue;
        s.t[i] += dt;
        var prog = min(1, s.t[i] / SWEEP_T), swept = -SWEEP_ARC / 2 + SWEEP_ARC * prog, k, j;
        for (k = 0; k < n; k++) {
          var e = Q[k]; if (!e.alive) continue;
          var dx = e.x - p.x, dy = e.y - p.y, dd = sqrt(dx * dx + dy * dy) || 1, da = wrapA(atan2(dy, dx) - s.a[i]), pad = min(0.6, e.r / dd);
          if (da > swept + pad || da < -SWEEP_ARC / 2 - pad) continue;
          var seen = false, base = i * 128;
          for (j = 0; j < s.n[i]; j++) if (s.hits[base + j] === e.uid) { seen = true; break; }
          if (seen) continue;
          if (s.n[i] < 128) { s.hits[base + s.n[i]] = e.uid; s.n[i]++; }
          setSrc(POLEE_SRC, w, p.x, p.y, 200, dx, dy, 1, true);
          KS.damage(e, dmg, POLEE_SRC);
        }
        if (s.t[i] >= SWEEP_T + 0.14) s.on[i] = 0;
      }
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, i;
      if (!s.on) return;
      for (i = 0; i < 3; i++) {
        if (!s.on[i]) continue;
        var prog = min(1, s.t[i] / SWEEP_T), cur = s.a[i] - SWEEP_ARC / 2 + SWEEP_ARC * prog, R = s.reach, fade = s.t[i] > SWEEP_T ? max(0, 1 - (s.t[i] - SWEEP_T) / 0.14) : 1;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.34 * fade; ctx.fillStyle = "#f2a23a"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, s.a[i] - SWEEP_ARC / 2, cur); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 5; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cos(cur) * R * 0.78, sin(cur) * R * 0.78); ctx.stroke();
        ctx.strokeStyle = "#e6ebef"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(cos(cur) * R * 0.78, sin(cur) * R * 0.78); ctx.lineTo(cos(cur) * R, sin(cur) * R); ctx.stroke();
        ctx.fillStyle = "#f2a23a"; ctx.beginPath(); ctx.arc(cos(cur) * R * 0.5, sin(cur) * R * 0.5, 4, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  });
  KS.registerWeapon(POLESAW_EVO);

  // ---------------------------------------------------------------------------
  // E9 Year-End Chipper
  // ---------------------------------------------------------------------------
  var CHIPPER_EVO = defaults({
    id: "chipper_evo", name: TEXT.chipper_evo.name, icon: "🪵", tag: "haul", desc: TEXT.chipper_evo.desc, milestone: TEXT.chipper_evo.ms, evolved: true, from: "chipper", procCoef: 0.7,
    levels: [{ pellets: 10, dmg: 22, maxAmmo: 60, pierce: 2, speed: 600, life: 0.4 }],
    labels: { pellets: L.pellets, dmg: L.dmg, maxAmmo: L.maxAmmo, pierce: L.pierce },
    init: function (w) { var s = w.state; s.ammo = KS.wstat(w, "maxAmmo"); s.aim = 0; s.fire = 0.25; s.kick = 0; w.hudFrac = 1; },
    onStageStart: function (w) { w.state.ammo = KS.wstat(w, "maxAmmo"); w.hudFrac = 1; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, mx = KS.wstat(w, "maxAmmo");
      if (s.ammo == null) CHIPPER_EVO.init(w);
      s.ammo = min(mx, s.ammo + 3 * dt);
      if (s.kick > 0) s.kick -= dt * 6;
      s.fire -= dt;
      if (s.fire <= 0) {
        var e = s.ammo >= 1 ? KS.nearestEnemy(p.x, p.y, 380) : null;
        if (!e) s.fire = 0.1;
        else {
          var n = min(floor(s.ammo), max(1, Math.round(KS.wstat(w, "pellets")))), base = atan2(e.y - p.y, e.x - p.x), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), life = KS.wstat(w, "life"), pr = floor(KS.wstat(w, "pierce")), k;
          s.aim = base;
          for (k = 0; k < n; k++) {
            var a = base + (n > 1 ? (k / (n - 1) - 0.5) * 0.7854 : 0), q = KS.spawnProj(CHIPPER_EVO, w.slot, p.x + cos(a) * 18, p.y + sin(a) * 18, cos(a) * spd, sin(a) * spd, null);
            if (!q) break;
            q.r = 5; q.dmg = dmg; q.life = life; q.pierce = pr; q.kb = 40; q.procCoef = 0.7;
          }
          s.ammo -= n; s.kick = 1; s.fire = max(0.08, 0.25 * run.stats.cooldown);
          KS.sfx("throw");
        }
      }
      w.hudFrac = mx > 0 ? s.ammo / mx : 0;
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player;
      if (s.ammo == null) return;
      var kick = s.kick > 0 ? s.kick * 4 : 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(s.aim); ctx.globalAlpha = 1;
      ctx.fillStyle = "#4e545b"; ctx.fillRect(4 - kick, -5, 22, 10);
      ctx.fillStyle = "#e0701f"; ctx.beginPath(); ctx.moveTo(24 - kick, -9); ctx.lineTo(32 - kick, -5); ctx.lineTo(32 - kick, 5); ctx.lineTo(24 - kick, 9); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 1.5; ctx.strokeRect(4 - kick, -5, 22, 10);
      ctx.fillStyle = "#e7c55b"; ctx.fillRect(10 - kick, -5, 3, 10); ctx.fillRect(17 - kick, -5, 3, 10);
      if (s.kick > 0.6) { ctx.fillStyle = "#fff2a0"; ctx.beginPath(); ctx.arc(36, 0, 5 * s.kick, 0, TAU); ctx.fill(); }
      ctx.restore();
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 1; ctx.fillStyle = "#c9993b"; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 20 + p.uid);
      ctx.fillRect(-4, -2.5, 8, 5); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-4, -2.5, 3, 5); ctx.restore();
    }
  });
  KS.registerWeapon(CHIPPER_EVO);
  KS.on("kill", function (k) {
    var run = KS.run; if (!run) return;
    var p = run.player, dx = k.x - p.x, dy = k.y - p.y, i, w;
    if (dx * dx + dy * dy <= 14400) {
      for (i = 0; i < 6; i++) {
        w = run.weapons[i];
        if (w && w.id === "chipper_evo" && w.state && w.state.ammo != null) w.state.ammo = min(KS.wstat(w, "maxAmmo"), w.state.ammo + 1);
      }
    }
    if (k.src && k.src.weaponId === "chipper_evo" && k.enemy && !k.enemy.noXp) KS.spawnPickup("xp", k.x, k.y, KS.xpValue(k.enemy));
  });

  // ---------------------------------------------------------------------------
  // E10 Fruitcake Fling
  // ---------------------------------------------------------------------------
  function drawCake(ctx, x, y, rot, sc) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = 1;
    ctx.fillStyle = "#6b3f1f"; ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = "#efe2c4"; ctx.fillRect(-13, -10, 26, 5);
    ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2; ctx.strokeRect(-13, -10, 26, 20);
    ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(-6, 1, 3, 0, TAU); ctx.arc(7, 5, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2f6a3a"; ctx.beginPath(); ctx.arc(3, -2, 2.6, 0, TAU); ctx.arc(-4, 6, 2.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  var FRUIT_EVO = defaults({
    id: "fruitcake_evo", name: TEXT.fruitcake_evo.name, icon: "🍰", tag: "haul", desc: TEXT.fruitcake_evo.desc, milestone: TEXT.fruitcake_evo.ms, evolved: true, from: "fruitcake",
    levels: [{ count: 3, dmg: 70, cd: 1.6, speed: 520 }],
    labels: { count: L.count, dmg: L.dmg, cd: L.cd },
    init: function (w) { w.cd = 0.4; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, e = KS.nearestEnemy(p.x, p.y, 520);
      if (!e) { w.cd = 0.15; return; }
      var n = max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), base = atan2(e.y - p.y, e.x - p.x);
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * 0.32, q = KS.spawnProj(FRUIT_EVO, w.slot, p.x, p.y, 0, 0, null);
        if (!q) break;
        q.r = 17; q.dmg = dmg; q.pierce = -1; q.kb = 150; q.life = 8; q.kind = 0; q.data.dx = cos(a); q.data.dy = sin(a); q.data.spd = spd; q.data.ph = 0; q.data.a0 = base;
      }
      KS.sfx("throw");
    },
    projUpdate: function (p, dt, run) {
      if (p.kind === 1) return false;
      var d = p.data, pl = run.player;
      if (d.ph === 0) {
        var f = 1 - p.t / 0.55;
        if (f > 0) { p.x += d.dx * d.spd * f * dt; p.y += d.dy * d.spd * f * dt; return true; }
        d.ph = 1; p.hitN = 0;
      }
      var tx = pl.x - p.x, ty = pl.y - p.y, Ld = sqrt(tx * tx + ty * ty) || 1;
      var sp = min(d.spd * 1.7, 120 + (p.t - 0.55) * 1100);
      p.x += tx / Ld * sp * dt; p.y += ty / Ld * sp * dt;
      if (Ld < 30) {
        p.alive = false;
        KS.addBuff("catch", 3); capHeal(1, 2, 6);
        KS.fx("ring", pl.x, pl.y, "#c9993b", 1, 24); KS.sfx("chime", 0);
        var cnt = KS.nearestN(pl.x, pl.y, 3, 520, Q2), k;
        for (k = 0; k < 3; k++) {
          var a = k < cnt ? atan2(Q2[k].y - pl.y, Q2[k].x - pl.x) : d.a0 + (k - 1) * 0.6, q = KS.spawnProj(FRUIT_EVO, p.slot, pl.x, pl.y, cos(a) * 430, sin(a) * 430, null);
          if (!q) break;
          q.kind = 1; q.r = 11; q.dmg = p.dmg * 0.5; q.pierce = 1; q.life = 0.7; q.kb = 90; q.procCoef = 0.6;
        }
      }
      return true;
    },
    projDraw: function (ctx, p) { if (p.kind === 1) drawCake(ctx, p.x, p.y, p.t * 12, 0.55); else drawCake(ctx, p.x, p.y, p.t * 9, 1.1); }
  });
  KS.registerWeapon(FRUIT_EVO);

  // ---------------------------------------------------------------------------
  // Hazard w_permit + E11 Permitted Burn
  // ---------------------------------------------------------------------------
  var PERM_SRC = mkSrc("fire", 0.3);
  var PERM_F = { r: 120, dmg: 16, life: 5, tick: 0.5, src: PERM_SRC, data: { bd: 18, slot: 0 } };
  KS.registerHazard({
    id: "w_permit", team: "player", autoDamage: true, r: 120, life: 5, tick: 0.5,
    update: function (h, dt, run) {
      var n = KS.grid.query(h.x, h.y, h.r, Q, 256), i, e, dx, dy, dd;
      for (i = 0; i < n; i++) {
        e = Q[i]; if (!e.alive || e.isBoss || e.bossPart || e.stationary || e.objective) continue;
        dx = h.x - e.x; dy = h.y - e.y; dd = sqrt(dx * dx + dy * dy);
        if (dd > 20) { e.x += dx / dd * 30 * dt; e.y += dy / dd * 30 * dt; }
      }
      var pl = run.pickups.list, pn = run.pickups.n, pk, R2 = h.r * h.r;
      for (i = 0; i < pn; i++) {
        pk = pl[i]; if (!pk.alive || pk.type === "supplycrate" || pk.type === "goldbox") continue;
        dx = h.x - pk.x; dy = h.y - pk.y; dd = dx * dx + dy * dy;
        if (dd > R2 || dd < 36) continue;
        dd = sqrt(dd); pk.x += dx / dd * 150 * dt; pk.y += dy / dd * 150 * dt;
      }
    },
    onEnemy: function (h, e) { KS.applyStatus(e, "burn", h.data.bd, 3, h.src); },
    draw: function (ctx, h, t) {
      var fade = h.life < 0.6 ? max(0, h.life / 0.6) : 1, r = h.r, i;
      ctx.save();
      ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = "#4a1c0e"; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.18 * fade; ctx.fillStyle = "#e0701f"; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.7, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 3; ctx.setLineDash(DASH_A); ctx.lineDashOffset = t * 24;
      ctx.beginPath(); ctx.arc(h.x, h.y, r - 3, 0, TAU); ctx.stroke(); ctx.setLineDash(DASH0);
      ctx.strokeStyle = "#f4a62a"; ctx.lineWidth = 2;
      for (i = 0; i < 6; i++) {
        var f = (t * 0.6 + i / 6) % 1, rr = r * (1 - f * 0.8), a = i * TAU / 6 + t * 0.5;
        ctx.globalAlpha = 0.55 * fade * (1 - f);
        ctx.beginPath(); ctx.arc(h.x, h.y, rr, a, a + 0.5); ctx.stroke();
      }
      ctx.globalAlpha = fade; ctx.fillStyle = "#3a2518";
      ctx.fillRect(h.x - 22, h.y - 3, 44, 6); ctx.fillRect(h.x - 3, h.y - 22, 6, 44);
      for (i = 0; i < 9; i++) {
        var a2 = i * TAU / 9 + h.uid, rr2 = 10 + 26 * ((i * 37) % 9) / 9, fx = h.x + cos(a2) * rr2, fy = h.y + sin(a2) * rr2 * 0.7, hh = 22 + 14 * sin(t * 9 + i * 1.7);
        ctx.fillStyle = "#c8341a"; ctx.beginPath(); ctx.moveTo(fx - 8, fy); ctx.lineTo(fx, fy - hh); ctx.lineTo(fx + 8, fy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4a62a"; ctx.beginPath(); ctx.moveTo(fx - 4.5, fy); ctx.lineTo(fx, fy - hh * 0.65); ctx.lineTo(fx + 4.5, fy); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = "#efe2c4"; ctx.fillRect(h.x + r * 0.62, h.y - r * 0.62, 16, 12); ctx.fillStyle = "#b3261e"; ctx.fillRect(h.x + r * 0.62, h.y - r * 0.62, 16, 3);
      ctx.fillStyle = "#2a1f1a"; ctx.fillRect(h.x + r * 0.62 + 3, h.y - r * 0.62 + 5, 10, 1.5); ctx.fillRect(h.x + r * 0.62 + 3, h.y - r * 0.62 + 8, 7, 1.5);
      ctx.restore();
    }
  });
  var BURNPILE_EVO = defaults({
    id: "burnpile_evo", name: TEXT.burnpile_evo.name, icon: "🔥", tag: "fire", desc: TEXT.burnpile_evo.desc, milestone: TEXT.burnpile_evo.ms, evolved: true, from: "burnpile", procCoef: 0.3,
    levels: [{ count: 1, radius: 120, tick: 16, burnDps: 18, cd: 3.5, dur: 5 }],
    labels: { radius: L.radius, tick: L.tick, burnDps: L.burnDps, cd: L.cd, dur: L.dur },
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = max(1, Math.round(KS.wstat(w, "count")));
      w.cd = KS.wstat(w, "cd");
      PERM_SRC.slot = w.slot; PERM_SRC.weaponId = "burnpile_evo"; PERM_SRC.team = "player";
      PERM_F.r = KS.wstat(w, "radius"); PERM_F.dmg = KS.wstat(w, "tick"); PERM_F.life = KS.wstat(w, "dur"); PERM_F.data.bd = KS.wstat(w, "burnDps"); PERM_F.data.slot = w.slot;
      for (var k = 0; k < n; k++) {
        var x = p.x, y = p.y, e;
        if (k === 0 && KS.densestPoint(60, DP) && DP.n > 0 && (DP.x - p.x) * (DP.x - p.x) + (DP.y - p.y) * (DP.y - p.y) < 62500) { x = DP.x; y = DP.y; }
        else { e = KS.randomEnemyNear(p.x, p.y, 250); if (e) { x = e.x; y = e.y; } else if (k > 0) { x = p.x + KS.rng.range(-110, 110); y = p.y + KS.rng.range(-110, 110); } }
        KS.spawnHazard("w_permit", x, y, PERM_F);
        KS.fx("embers", x, y, "#f08a2a", 10, 3);
      }
      KS.sfx("burn");
    }
  });
  KS.registerWeapon(BURNPILE_EVO);

  // ---------------------------------------------------------------------------
  // E12 Twelve-Bell Peal (also the bell shape used by the Carillon)
  // ---------------------------------------------------------------------------
  function drawBell(ctx, x, y, t, sc) {
    var sw = sin(t * 22) * 0.25;
    ctx.save(); ctx.translate(x, y); ctx.rotate(sw); ctx.scale(sc, sc); ctx.globalAlpha = 1;
    ctx.fillStyle = "#d9a935"; ctx.beginPath(); ctx.moveTo(-9, 6); ctx.quadraticCurveTo(-9, -9, 0, -9); ctx.quadraticCurveTo(9, -9, 9, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#8a6a22"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = "#b3261e"; ctx.fillRect(-10, 5, 20, 3);
    ctx.fillStyle = "#6b4a1b"; ctx.beginPath(); ctx.arc(0, 9, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(-3, -3, 1.8, 0, TAU); ctx.fill();
    ctx.restore();
  }
  var BELLS_EVO = defaults({
    id: "bells_evo", name: TEXT.bells_evo.name, icon: "🔔", tag: "ring", desc: TEXT.bells_evo.desc, milestone: TEXT.bells_evo.ms, evolved: true, from: "bells",
    levels: [{ count: 3, dmg: 26, bounces: 12, cd: 1.3, speed: 600 }],
    labels: { count: L.count, dmg: L.dmg, bounces: L.bounces, cd: L.cd },
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, e = KS.nearestEnemy(p.x, p.y, 480);
      if (!e) { w.cd = 0.15; return; }
      var n = max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), bn = Math.round(KS.wstat(w, "bounces")) + KS.items.extraBounces();
      var rg = 180 * rangeMul(), ex = 0, tgt = e;
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        if (k > 0) tgt = KS.nearestEnemy(p.x, p.y, 480, ex) || e;
        ex = tgt.uid;
        var a = atan2(tgt.y - p.y, tgt.x - p.x), q = KS.spawnProj(BELLS_EVO, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 8; q.dmg = dmg; q.baseDmg = dmg; q.pierce = 0; q.bounces = bn; q.bounceRange = rg; q.life = min(8, 1 + 0.45 * bn); q.kb = 40; q.data.ch = 0;
      }
      KS.sfx("throw");
    },
    projHit: function (p, e, run) {
      KS.sfx("chime", min(12, p.bounceIndex));
      if (p.data.ch !== 1 && p.bounces >= 2 && KS.rng.chance(0.1)) {
        var t = KS.nearestEnemy(p.x, p.y, p.bounceRange, e.uid), a = t ? atan2(t.y - p.y, t.x - p.x) : KS.rng.range(0, TAU);
        var q = KS.spawnProj(BELLS_EVO, p.slot, p.x, p.y, cos(a) * 600, sin(a) * 600, null);
        if (q) {
          q.r = 8; q.dmg = p.dmg; q.baseDmg = p.baseDmg; q.pierce = 0; q.bounces = floor(p.bounces / 2); q.bounceIndex = p.bounceIndex; q.bounceRange = p.bounceRange;
          q.life = min(8, 1 + 0.45 * q.bounces); q.kb = 40; q.data.ch = 1; q.hitUids[0] = e.uid; q.hitN = 1;
          KS.fx("sparks", p.x, p.y, "#f6e27a", 5, 2);
        }
      }
      return true;
    },
    projDraw: function (ctx, p) { drawBell(ctx, p.x, p.y, p.t, p.data.ch === 1 ? 0.75 : 1.1); }
  });
  KS.registerWeapon(BELLS_EVO);

  // ---------------------------------------------------------------------------
  // E13 Dispatch Squadron
  // ---------------------------------------------------------------------------
  var DR_MAX = 8;
  var DRONEE_CH = mkSrc("ring", 0.3);
  var DRONE_EVO = defaults({
    id: "drone_evo", name: TEXT.drone_evo.name, icon: "🚁", tag: "ring", desc: TEXT.drone_evo.desc, milestone: TEXT.drone_evo.ms, evolved: true, from: "drone",
    levels: [{ drones: 4, dmg: 28, cd: 0.5, speed: 700 }],
    labels: { drones: L.drones, dmg: L.dmg, cd: L.cd },
    init: function (w) {
      var s = w.state; s.rot = 0; s.n = 0;
      s.dx = new Float32Array(DR_MAX); s.dy = new Float32Array(DR_MAX); s.dc = new Float32Array(DR_MAX);
    },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i;
      if (!s.dx) DRONE_EVO.init(w);
      var n = max(1, min(DR_MAX, Math.round(KS.wstat(w, "drones")))), cd = KS.wstat(w, "cd"), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), kk = min(1, 8 * dt);
      for (i = s.n; i < n; i++) { s.dx[i] = p.x; s.dy[i] = p.y; s.dc[i] = 0.2 + i * 0.1; }
      s.n = n; s.rot += dt * 1.6;
      for (i = 0; i < n; i++) {
        var a = s.rot + i * TAU / n, rr = 64;
        s.dx[i] += (p.x + cos(a) * rr - s.dx[i]) * kk; s.dy[i] += (p.y + sin(a) * rr - s.dy[i]) * kk;
        s.dc[i] -= dt;
        if (s.dc[i] > 0) continue;
        var e = KS.nearestEnemy(s.dx[i], s.dy[i], 340);
        if (!e) { s.dc[i] = 0.1; continue; }
        s.dc[i] = cd;
        var ang = atan2(e.y - s.dy[i], e.x - s.dx[i]), q = KS.spawnProj(DRONE_EVO, w.slot, s.dx[i], s.dy[i], cos(ang) * spd, sin(ang) * spd, null);
        if (!q) continue;
        q.r = 5; q.dmg = dmg; q.pierce = 0; q.life = 0.9; q.kb = 30; q.homing = 7;
        if ((i & 1) === 0) KS.sfx("zap");
      }
    },
    projHit: function (p, e, run) {
      var rm = 140 * rangeMul(), t1 = KS.nearestEnemy(e.x, e.y, rm, e.uid), t2 = null, w = run.weapons[p.slot];
      if (t1) {
        setSrc(DRONEE_CH, w, e.x, e.y, 0, 0, 0, 0.3, true);
        KS.fx("sparks", t1.x, t1.y, "#8fe0ff", 3, 2);
        var x1 = t1.x, y1 = t1.y, u1 = t1.uid;
        KS.damage(t1, p.dmg * 0.6, DRONEE_CH);
        t2 = KS.nearestEnemy(x1, y1, rm, u1, e.uid);
        if (t2) { setSrc(DRONEE_CH, w, x1, y1, 0, 0, 0, 0.3, true); KS.fx("sparks", t2.x, t2.y, "#8fe0ff", 3, 2); KS.damage(t2, p.dmg * 0.6, DRONEE_CH); }
      }
      return true;
    },
    draw: function (ctx, w, run) {
      var s = w.state, i, n = s.n || 0, t = run.time;
      ctx.globalAlpha = 1;
      for (i = 0; i < n; i++) {
        var x = s.dx[i], y = s.dy[i];
        ctx.fillStyle = "#b3261e"; ctx.fillRect(x - 7, y - 4, 14, 8);
        ctx.fillStyle = "#efe2c4"; ctx.fillRect(x - 7, y - 1, 14, 2.5);
        ctx.strokeStyle = "#1c1410"; ctx.lineWidth = 1; ctx.strokeRect(x - 7, y - 4, 14, 8);
        ctx.fillStyle = "rgba(220,235,235,0.55)";
        ctx.beginPath(); ctx.ellipse(x - 9, y - 6, 6, 1.6 + (sin(t * 50 + i) > 0 ? 0.7 : 0), 0, 0, TAU); ctx.ellipse(x + 9, y - 6, 6, 1.6 + (sin(t * 50 + i + 1) > 0 ? 0.7 : 0), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = sin(t * 7 + i) > 0 ? "#7fe8ff" : "#1f4a5a"; ctx.beginPath(); ctx.arc(x, y + 1, 1.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 4, y - 4); ctx.lineTo(x + 6, y - 11); ctx.stroke();
      }
    },
    projDraw: function (ctx, p) {
      var nx = p.vx * 0.016, ny = p.vy * 0.016;
      ctx.globalAlpha = 1; ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(120,220,255,0.45)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(p.x - nx, p.y - ny); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = "#e9fbff"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(p.x - nx * 0.6, p.y - ny * 0.6); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  });
  KS.registerWeapon(DRONE_EVO);

  // ---------------------------------------------------------------------------
  // E14 Nor'easter
  // ---------------------------------------------------------------------------
  var BLOWE_SRC = mkSrc("frost", 0.4);
  var HOLD_N = 192;
  var BLOWER_EVO = defaults({
    id: "blower_evo", name: TEXT.blower_evo.name, icon: "🍃", tag: "frost", desc: TEXT.blower_evo.desc, milestone: TEXT.blower_evo.ms, evolved: true, from: "blower", procCoef: 0.4,
    levels: [{ dmg: 14, len: 240, angle: 65, interval: 0.25 }],
    labels: { dmg: L.dmg, len: L.len, angle: L.angle },
    init: function (w) {
      var s = w.state; s.ang = atan2(KS.run.player.aimY, KS.run.player.aimX); s.tickT = 0.1; s.len = 240; s.half = 0.57;
      s.hu = new Int32Array(HOLD_N); s.hf = new Float32Array(HOLD_N); s.hl = new Float32Array(HOLD_N);
    },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (!s.hu) BLOWER_EVO.init(w);
      var tgt = aimAt(p, 330), da = wrapA(tgt - s.ang), step = 10 * dt;
      s.ang += da > step ? step : (da < -step ? -step : da);
      var len = KS.wstat(w, "len"), half = KS.wstat(w, "angle") * PI / 360, cs = cos(s.ang), sn = sin(s.ang), cosHalf = cos(half), now = run.time;
      s.len = len; s.half = half;
      s.tickT -= dt;
      var doTick = s.tickT <= 0;
      if (doTick) s.tickT += KS.wstat(w, "interval");
      var n = KS.grid.query(p.x, p.y, len, Q, 256), dmg = KS.wstat(w, "dmg"), i;
      for (i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        var dx = e.x - p.x, dy = e.y - p.y, dd = sqrt(dx * dx + dy * dy) || 1, c = (dx * cs + dy * sn) / dd, pad = min(0.5, e.r / dd), side = 0;
        if (c >= cosHalf - pad) side = 1; else if (-c >= cosHalf - pad) side = -1;
        if (side === 0) continue;
        if (!e.isBoss && !e.bossPart && !e.stationary && !e.def.noKnockback) { e.x += cs * side * 70 * dt; e.y += sn * side * 70 * dt; }
        if (doTick) {
          setSrc(BLOWE_SRC, w, p.x, p.y, 0, dx * side, dy * side, 0.4, true);
          KS.applyStatus(e, "chill", 0, 2, BLOWE_SRC);
          var hx = e.uid % HOLD_N;
          if (s.hu[hx] !== e.uid || now - s.hl[hx] > 0.5) { s.hu[hx] = e.uid; s.hf[hx] = now; }
          s.hl[hx] = now;
          if (now - s.hf[hx] >= 1.5) { s.hf[hx] = now; KS.applyStatus(e, "freeze", 0, 1.5, BLOWE_SRC); KS.fx("sparks", e.x, e.y, "#cfeaf6", 4, 2); }
          KS.damage(e, dmg, BLOWE_SRC);
        }
      }
      if ((run.stepN & 7) === 0) KS.fx("snow", p.x + cs * len * KS.frand() * ((run.stepN & 8) ? 1 : -1), p.y + sn * len * KS.frand() * ((run.stepN & 8) ? 1 : -1), "#e9f6fb", 1, 3);
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, t = run.time, i, k;
      if (s.len == null) return;
      ctx.save(); ctx.translate(p.x, p.y);
      for (k = 0; k < 2; k++) {
        var base = s.ang + k * PI, a0 = base - s.half, a1 = base + s.half, len = s.len;
        ctx.globalAlpha = 0.16; ctx.fillStyle = "#bfe0f2"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, a0, a1); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.5; ctx.strokeStyle = "#f2fbff"; ctx.lineWidth = 2; ctx.lineCap = "round";
        for (i = 0; i < 5; i++) {
          var f = ((t * 1.5 + i * 0.2) % 1), r0 = len * f, off = (i / 4 - 0.5) * 2 * s.half * 0.8;
          ctx.beginPath(); ctx.arc(0, 0, r0, base + off - 0.1, base + off + 0.1); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = "#2f6a8a"; ctx.save(); ctx.rotate(base); ctx.fillRect(8, -4, 16, 8); ctx.fillStyle = "#e9f6fb"; ctx.fillRect(22, -3, 5, 6); ctx.restore();
      }
      ctx.restore();
    }
  });
  KS.registerWeapon(BLOWER_EVO);

  // ---------------------------------------------------------------------------
  // E15 Main Street Display
  // ---------------------------------------------------------------------------
  var BULB = ["#e8412e", "#f6c344", "#3c9a5a", "#3c8fd6"];
  var LASHE_SRC = mkSrc("ring", 0.6), BULBP_SRC = mkSrc("ring", 0.2);
  var LSEEN = new Int32Array(48), BULB_N = 96;
  var LASH_EVO = defaults({
    id: "lash_evo", name: TEXT.lash_evo.name, icon: "💡", tag: "ring", desc: TEXT.lash_evo.desc, milestone: TEXT.lash_evo.ms, evolved: true, from: "lash", procCoef: 0.6,
    levels: [{ dmg: 40, jumps: 10, cd: 0.9, arcs: 3 }],
    labels: { dmg: L.dmg, jumps: L.jumps, cd: L.cd },
    init: function (w) {
      var s = w.state, i; w.cd = 0.4; s.vis = 0; s.sn = 0;
      s.sx0 = new Float32Array(40); s.sy0 = new Float32Array(40); s.sx1 = new Float32Array(40); s.sy1 = new Float32Array(40);
      s.bu = new Int32Array(BULB_N); s.bt = new Float32Array(BULB_N); s.be = new Array(BULB_N); s.bx = new Float32Array(BULB_N); s.by = new Float32Array(BULB_N); s.bi = 0;
      for (i = 0; i < BULB_N; i++) { s.bt[i] = -99; s.be[i] = null; }
    },
    onStageStart: function (w) { var s = w.state; if (s.bt) for (var i = 0; i < BULB_N; i++) { s.bt[i] = -99; s.be[i] = null; } },
    addBulb: function (s, e, now) {
      var i;
      for (i = 0; i < BULB_N; i++) if (s.bt[i] > -50 && s.bu[i] === e.uid) return;
      i = s.bi; s.bi = (s.bi + 1) % BULB_N;
      s.bu[i] = e.uid; s.bt[i] = now; s.be[i] = e; s.bx[i] = e.x; s.by[i] = e.y;
    },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i, j, now = run.time;
      if (!s.sx0) LASH_EVO.init(w);
      if (s.vis > 0) s.vis -= dt;
      var dmg = KS.wstat(w, "dmg");
      for (i = 0; i < BULB_N; i++) {
        if (s.bt[i] < -50) continue;
        var be = s.be[i];
        if (be && be.alive && be.uid === s.bu[i]) { s.bx[i] = be.x; s.by[i] = be.y; }
        if (now - s.bt[i] < 1) continue;
        s.bt[i] = -99; s.be[i] = null;
        var bx = s.bx[i], by = s.by[i], n = KS.grid.query(bx, by, 40 * area(), Q, 128), k;
        for (k = 0; k < n; k++) {
          var t = Q[k]; if (!t.alive) continue;
          setSrc(BULBP_SRC, w, bx, by, 0, 0, 0, 0.2, true);
          KS.damage(t, dmg * 0.5, BULBP_SRC);
        }
        KS.fx("ring", bx, by, "#f6c344", 1, 40); KS.fx("sparks", bx, by, BULB[i & 3], 4, 2);
      }
      w.cd -= dt; if (w.cd > 0) return;
      var rm = rangeMul(), cnt = KS.nearestN(p.x, p.y, max(1, Math.round(KS.wstat(w, "arcs"))), 260 * rm, Q2);
      if (cnt <= 0) { w.cd = 0.15; return; }
      w.cd = KS.wstat(w, "cd");
      var jumps = max(0, Math.round(KS.wstat(w, "jumps")) + KS.items.extraJumps()), total = min(14, 1 + jumps), range = 140 * rm, seenN = 0, segN = 0, arc;
      for (arc = 0; arc < cnt; arc++) {
        var cur = Q2[arc], px = p.x, py = p.y, hits = 0;
        if (!cur || !cur.alive) continue;
        var dup = false; for (j = 0; j < seenN; j++) if (LSEEN[j] === cur.uid) { dup = true; break; }
        if (dup) continue;
        while (cur && hits < total && seenN < 47 && segN < 40) {
          LSEEN[seenN++] = cur.uid; hits++;
          var cx = cur.x, cy = cur.y;
          s.sx0[segN] = px; s.sy0[segN] = py; s.sx1[segN] = cx; s.sy1[segN] = cy; segN++;
          setSrc(LASHE_SRC, w, px, py, 0, 0, 0, 0.6, true);
          LASH_EVO.addBulb(s, cur, now);
          KS.damage(cur, dmg, LASHE_SRC);
          px = cx; py = cy;
          if (hits >= total) break;
          var m = KS.grid.query(px, py, range, Q3, 256), best = null, bd = 1e18;
          for (i = 0; i < m; i++) {
            var e = Q3[i]; if (!e.alive) continue;
            var seen = false; for (j = 0; j < seenN; j++) if (LSEEN[j] === e.uid) { seen = true; break; }
            if (seen) continue;
            var dx = e.x - px, dy = e.y - py, dd = dx * dx + dy * dy;
            if (dd < bd) { bd = dd; best = e; }
          }
          cur = best;
        }
      }
      s.sn = segN; s.vis = 0.18;
      KS.sfx("zap");
    },
    draw: function (ctx, w, run) {
      var s = w.state, i, k, t = run.time, now = run.time;
      if (!s.sx0) return;
      if (s.vis > 0 && s.sn > 0) {
        ctx.globalAlpha = min(1, s.vis / 0.18 + 0.2); ctx.lineCap = "round";
        var jit = t * 90;
        for (i = 0; i < s.sn; i++) {
          var x0 = s.sx0[i], y0 = s.sy0[i], x1 = s.sx1[i], y1 = s.sy1[i], dx = x1 - x0, dy = y1 - y0, L2 = sqrt(dx * dx + dy * dy) || 1;
          var nx = -dy / L2, ny = dx / L2, segs = max(3, floor(L2 / 14));
          ctx.strokeStyle = "#2f4a32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0);
          for (k = 1; k < segs; k++) { var f = k / segs, o = (k & 1 ? 1 : -1) * 5 * sin(jit + k); ctx.lineTo(x0 + dx * f + nx * o, y0 + dy * f + ny * o); }
          ctx.lineTo(x1, y1); ctx.stroke();
          for (k = 1; k < segs; k++) {
            var f2 = k / segs, o2 = (k & 1 ? 1 : -1) * 5 * sin(jit + k);
            ctx.fillStyle = BULB[(k + i) & 3]; ctx.beginPath(); ctx.arc(x0 + dx * f2 + nx * o2, y0 + dy * f2 + ny * o2, 3.2, 0, TAU); ctx.fill();
          }
        }
      }
      for (i = 0; i < BULB_N; i++) {
        if (s.bt[i] < -50) continue;
        var age = now - s.bt[i], fl = age > 0.7 ? (sin(age * 50) > 0 ? 1 : 0.4) : 1, rr = 4 + 4 * age;
        ctx.globalAlpha = 0.35 * fl; ctx.fillStyle = BULB[i & 3]; ctx.beginPath(); ctx.arc(s.bx[i], s.by[i] - 10, rr + 4, 0, TAU); ctx.fill();
        ctx.globalAlpha = fl; ctx.beginPath(); ctx.arc(s.bx[i], s.by[i] - 10, rr, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff6d8"; ctx.beginPath(); ctx.arc(s.bx[i] - 1, s.by[i] - 11, rr * 0.35, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  });
  KS.registerWeapon(LASH_EVO);

  // ---------------------------------------------------------------------------
  // E16 Clear-Cut
  // ---------------------------------------------------------------------------
  var TIM_MAX = 8;
  var TIME_SRC = mkSrc("blast", 0.6);
  var TIMBER_EVO = defaults({
    id: "timber_evo", name: TEXT.timber_evo.name, icon: "🌲", tag: "blast", desc: TEXT.timber_evo.desc, milestone: TEXT.timber_evo.ms, evolved: true, from: "timber", procCoef: 0.6,
    levels: [{ count: 5, dmg: 150, len: 320, cd: 2.6 }],
    labels: { count: L.count, dmg: L.dmg, len: L.len, cd: L.cd },
    init: function (w) {
      var s = w.state; w.cd = 0.8;
      s.x = new Float32Array(TIM_MAX); s.y = new Float32Array(TIM_MAX); s.a = new Float32Array(TIM_MAX); s.l = new Float32Array(TIM_MAX); s.t = new Float32Array(TIM_MAX);
      s.d = new Float32Array(TIM_MAX); s.on = new Uint8Array(TIM_MAX); s.wd = new Float32Array(TIM_MAX);
    },
    onStageStart: function (w) { var s = w.state; if (s.on) s.on.fill(0); },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i, k;
      if (!s.on) TIMBER_EVO.init(w);
      w.cd -= dt;
      if (w.cd <= 0) {
        var e = KS.nearestEnemy(p.x, p.y, 420);
        if (!e) w.cd = 0.3;
        else {
          var n = max(1, min(TIM_MAX, Math.round(KS.wstat(w, "count")))), len = KS.wstat(w, "len"), dmg = KS.wstat(w, "dmg"), wd = 36 * area(), base = atan2(e.y - p.y, e.x - p.x), step = n > 1 ? 3.77 / (n - 1) : 0;
          for (k = 0; k < n; k++) {
            for (i = 0; i < TIM_MAX && s.on[i]; i++) { }
            if (i >= TIM_MAX) break;
            var ang = base + (k - (n - 1) / 2) * step, cx = p.x + cos(ang) * len * 0.5, cy = p.y + sin(ang) * len * 0.5;
            s.on[i] = 1; s.x[i] = cx; s.y[i] = cy; s.a[i] = ang; s.l[i] = len; s.t[i] = 0; s.d[i] = dmg; s.wd[i] = wd;
            KS.telegraph("rect", cx, cy, len, wd, ang, 0.5, "#b3261e");
          }
          w.cd = KS.wstat(w, "cd");
        }
      }
      for (i = 0; i < TIM_MAX; i++) {
        if (!s.on[i]) continue;
        var prev = s.t[i]; s.t[i] += dt;
        if (prev < 0.5 && s.t[i] >= 0.5) TIMBER_EVO.land(w, i, run);
        if (s.t[i] > 1.0) s.on[i] = 0;
      }
    },
    land: function (w, i, run) {
      var s = w.state, cx = s.x[i], cy = s.y[i], a = s.a[i], len = s.l[i], wd = s.wd[i], ca = cos(a), sa = sin(a), dmg = s.d[i];
      var n = KS.grid.query(cx, cy, len * 0.5 + 40, Q, 256), j;
      for (j = 0; j < n; j++) {
        var e = Q[j]; if (!e.alive) continue;
        var dx = e.x - cx, dy = e.y - cy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        if (u > len * 0.5 + e.r || u < -len * 0.5 - e.r || v > wd * 0.5 + e.r || v < -wd * 0.5 - e.r) continue;
        setSrc(TIME_SRC, w, cx, cy, 220, dx, dy, 0.6, true);
        KS.damage(e, dmg, TIME_SRC);
      }
      KS.shake(2.5); KS.sfx("explode");
      KS.fx("burst", cx + ca * len * 0.4, cy + sa * len * 0.4, "#8a5a2b", 8, 3);
      KS.fx("leaves", cx + ca * len * 0.4, cy + sa * len * 0.4, "#2f6a3a", 8, 4);
      KS.spawnPickup("xp", cx + ca * len * 0.5, cy + sa * len * 0.5, 1);
    },
    draw: function (ctx, w, run) {
      var s = w.state, i, k;
      if (!s.on) return;
      for (i = 0; i < TIM_MAX; i++) {
        if (!s.on[i] || s.t[i] < 0.5) continue;
        var u = s.t[i] - 0.5, f = min(1, u / 0.12), fade = u > 0.3 ? max(0, 1 - (u - 0.3) / 0.2) : 1, len = s.l[i] * (0.25 + 0.75 * f), a = s.a[i];
        ctx.save(); ctx.translate(s.x[i], s.y[i]); ctx.rotate(a); ctx.globalAlpha = fade;
        var x0 = -s.l[i] * 0.5;
        ctx.fillStyle = "#6b4a2b"; ctx.fillRect(x0, -6, len * 0.9, 12);
        ctx.fillStyle = "#4a3320"; ctx.fillRect(x0, -6, len * 0.9, 3);
        ctx.fillStyle = "#2f6a3a";
        for (k = 0; k < 3; k++) {
          var bx = x0 + len * (0.55 + k * 0.15), bw = len * 0.2 + 4, bh = 26 - k * 4;
          ctx.beginPath(); ctx.moveTo(bx, -bh); ctx.lineTo(bx + bw, 0); ctx.lineTo(bx, bh); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  });
  KS.registerWeapon(TIMBER_EVO);

  // ---------------------------------------------------------------------------
  // F1 Mulch Fire (Mulcher Head + Burn Pile)
  // ---------------------------------------------------------------------------
  var MF_SRC = mkSrc("blade", 0.5), EMBER_SRC = mkSrc("fire", 0.2);
  var MULCHFIRE = defaults({
    id: "fuse_mulchfire", name: TEXT.fuse_mulchfire.name, icon: "🔥", tag: "blade", tags2: ["fire"], desc: TEXT.fuse_mulchfire.desc, milestone: TEXT.fuse_mulchfire.ms,
    fusion: true, recipe: { weapons: ["mulcher", "burnpile"] }, procCoef: 0.5,
    levels: [{ radius: 150, tick: 20, interval: 0.4, burnDps: 20 }],
    labels: { radius: L.radius, tick: L.tick, burnDps: L.burnDps },
    init: function (w) { var s = w.state; s.tickT = 0.3; s.rot = 0; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      s.rot += dt * 2.6; s.tickT -= dt; if (s.tickT > 0) return;
      s.tickT += KS.wstat(w, "interval");
      var R = KS.wstat(w, "radius"), dmg = KS.wstat(w, "tick"), bd = KS.wstat(w, "burnDps"), n = KS.grid.query(p.x, p.y, R, Q, 256), i;
      for (i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        setSrc(MF_SRC, w, p.x, p.y, 0, e.x - p.x, e.y - p.y, 0.5, true);
        KS.applyStatus(e, "burn", bd, 3, MF_SRC);
        KS.damage(e, dmg, MF_SRC);
      }
      if (n > 0) KS.fx("embers", p.x + cos(s.rot * 2) * R * 0.8, p.y + sin(s.rot * 2) * R * 0.8, "#f08a2a", 2, 2);
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, R = KS.wstat(w, "radius"), t = run.time, i;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.13; ctx.fillStyle = "#e0701f"; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#a8481a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.9; drawTeeth(ctx, 0, 0, R - 6, R + 5, 20, s.rot, "#c9993b");
      for (i = 0; i < 12; i++) {
        var a = i * TAU / 12 + s.rot * 0.5, fx = cos(a) * (R - 10), fy = sin(a) * (R - 10), hh = 14 + 9 * sin(t * 10 + i * 1.3);
        ctx.fillStyle = "#c8341a"; ctx.beginPath(); ctx.moveTo(fx - 5, fy + 2); ctx.lineTo(fx, fy - hh); ctx.lineTo(fx + 5, fy + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4a62a"; ctx.beginPath(); ctx.moveTo(fx - 2.5, fy + 2); ctx.lineTo(fx, fy - hh * 0.6); ctx.lineTo(fx + 2.5, fy + 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#fff2a0"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 0.55, s.rot, s.rot + 2.2); ctx.stroke();
      ctx.restore(); ctx.globalAlpha = 1;
    }
  });
  KS.registerWeapon(MULCHFIRE);
  var EMB_STEP = -1, EMB_N = 0;
  KS.on("kill", function (k) {
    var run = KS.run; if (!run || !k.enemy) return;
    var i, w, wm = null, ws = null, wsn = null;
    for (i = 0; i < 6; i++) {
      w = run.weapons[i]; if (!w) continue;
      if (w.id === "fuse_mulchfire") wm = w; else if (w.id === "fuse_snowglobe") ws = w; else if (w.id === "snow_evo") wsn = w;
    }
    var frozen = k.enemy.st && k.enemy.st.freeze > 0;
    if (wsn && frozen && k.src && k.src.weaponId === "snow_evo") capHeal(0, 1, 5);
    if (k.depth >= 3) return;
    if (run.stepN !== EMB_STEP) { EMB_STEP = run.stepN; EMB_N = 0; }
    if (wm && k.enemy.st && k.enemy.st.burn > 0) {
      var p = run.player, dx = k.x - p.x, dy = k.y - p.y, R = KS.wstat(wm, "radius") + 20;
      if (dx * dx + dy * dy <= R * R && ++EMB_N <= 12) {
        var rad = 40 * area(), dmg = KS.wstat(wm, "tick") * 1.5, n = KS.grid.query(k.x, k.y, rad, Q2, 128), j;
        for (j = 0; j < n; j++) {
          var e = Q2[j]; if (!e.alive) continue;
          setSrc(EMBER_SRC, wm, k.x, k.y, 60, e.x - k.x, e.y - k.y, 0.2, true); EMBER_SRC.depth = k.depth + 1;
          KS.damage(e, dmg, EMBER_SRC);
        }
        KS.fx("ring", k.x, k.y, "#f08a2a", 1, rad); KS.fx("embers", k.x, k.y, "#f4a62a", 6, 3);
      }
    }
    if (ws && frozen && k.src && k.src.weaponId === "fuse_snowglobe" && ++EMB_N <= 12) {
      var rad2 = 40 * area(), dmg2 = KS.wstat(ws, "dmg") * KS.wstat(ws, "shatter"), n2 = KS.grid.query(k.x, k.y, rad2, Q2, 128), j2;
      for (j2 = 0; j2 < n2; j2++) {
        var e2 = Q2[j2]; if (!e2.alive) continue;
        setSrc(GLOBE_SRC, ws, k.x, k.y, 80, e2.x - k.x, e2.y - k.y, 0.2, true); GLOBE_SRC.depth = k.depth + 1;
        KS.damage(e2, dmg2, GLOBE_SRC);
      }
      KS.fx("ring", k.x, k.y, "#cfeaf6", 1, rad2); KS.fx("sparks", k.x, k.y, "#e9f6fb", 8, 3); KS.sfx("freeze");
    }
  });

  // ---------------------------------------------------------------------------
  // F2 Ring Saw Carillon (Orbiting Saws + Sleigh Bells)
  // ---------------------------------------------------------------------------
  var CAR_SRC = mkSrc("blade", 1);
  var CARILLON = defaults({
    id: "fuse_carillon", name: TEXT.fuse_carillon.name, icon: "🔔", tag: "blade", tags2: ["ring"], desc: TEXT.fuse_carillon.desc, milestone: TEXT.fuse_carillon.ms,
    fusion: true, recipe: { weapons: ["saws", "bells"] }, procCoef: 1,
    levels: [{ count: 6, dmg: 30, spin: 3.6, orbit: 100, bell: 20, speed: 600 }],
    labels: { count: L.count, dmg: L.dmg, spin: L.spin },
    init: sawInit,
    onStageStart: function (w) { var s = w.state; if (s.ru) { s.ru.fill(0); s.rt.fill(-99); } },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (!s.ru) sawInit(w);
      var n = max(1, min(SAW_MAX, Math.round(KS.wstat(w, "count")))), orb = KS.wstat(w, "orbit"), dmg = KS.wstat(w, "dmg");
      s.n = n; s.ang += KS.wstat(w, "spin") * dt; s.bellT -= dt;
      var now = run.time, slot = w.slot, i, k, cnt, e;
      for (i = 0; i < n; i++) {
        var a = s.ang + i * TAU / n, bx = p.x + cos(a) * orb, by = p.y + sin(a) * orb;
        s.bx[i] = bx; s.by[i] = by;
        cnt = KS.grid.query(bx, by, 13, Q, 128);
        for (k = 0; k < cnt; k++) {
          e = Q[k]; if (!e.alive || !bladeCanHit(s, i, e, now, slot)) continue;
          setSrc(CAR_SRC, w, bx, by, 60, -sin(a), cos(a), 1, true);
          var ex = e.uid;
          KS.damage(e, dmg, CAR_SRC);
          if (s.bellT <= 0 && KS.rng.chance(0.25)) {
            var t = KS.nearestEnemy(bx, by, 320, ex);
            if (t) {
              s.bellT = 0.1;
              var ba = atan2(t.y - by, t.x - bx), spd = KS.wstat(w, "speed"), bn = 8 + KS.items.extraBounces(), q = KS.spawnProj(CARILLON, slot, bx, by, cos(ba) * spd, sin(ba) * spd, null);
              if (q) {
                var bd = KS.wstat(w, "bell") * run.stats.might;
                q.r = 8; q.dmg = bd; q.baseDmg = bd; q.pierce = 0; q.bounces = bn; q.bounceRange = 180 * rangeMul(); q.life = min(8, 1 + 0.45 * bn); q.kb = 40; q.procCoef = 0.6;
                q.hitUids[0] = ex; q.hitN = 1;
                KS.sfx("chime", 0);
              }
            }
          }
        }
      }
      if (n > 0 && (run.stepN & 15) === 0) KS.sfx("saw");
    },
    projHit: function (p) { KS.sfx("chime", min(12, p.bounceIndex)); return true; },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, i;
      if (!s.bx || s.n < 1) return;
      ctx.globalAlpha = 0.16; ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, KS.wstat(w, "orbit"), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      for (i = 0; i < s.n; i++) { drawSawBlade(ctx, s.bx[i], s.by[i], 12, s.ang * 3 + i, "#d4a93a", "#b3261e"); drawBell(ctx, s.bx[i], s.by[i] + 1, run.time + i, 0.45); }
    },
    projDraw: function (ctx, p) { drawBell(ctx, p.x, p.y, p.t, 1); }
  });
  KS.registerWeapon(CARILLON);

  // ---------------------------------------------------------------------------
  // F3 Snow Globe Barrage (Snowball Flurry + Ornament Bombs)
  // ---------------------------------------------------------------------------
  var GLOBE_SRC = mkSrc("blast", 0.6);
  var SNOWGLOBE = defaults({
    id: "fuse_snowglobe", name: TEXT.fuse_snowglobe.name, icon: "🔮", tag: "frost", tags2: ["blast"], desc: TEXT.fuse_snowglobe.desc, milestone: TEXT.fuse_snowglobe.ms,
    fusion: true, recipe: { weapons: ["snow", "bombs"] }, procCoef: 0.6,
    levels: [{ count: 4, dmg: 60, radius: 90, cd: 1.6, freeze: 1.5, shatter: 0.5 }],
    labels: { count: L.count, dmg: L.dmg, radius: L.radius, cd: L.cd },
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = max(1, Math.round(KS.wstat(w, "count"))), rad = KS.wstat(w, "radius"), dmg = KS.wstat(w, "dmg"), fz = KS.wstat(w, "freeze"), fired = 0;
      for (var k = 0; k < n; k++) {
        var tx, ty, ok = false;
        if (KS.rng.chance(0.5) && KS.densestPoint(100, DP) && DP.n > 0) { tx = DP.x; ty = DP.y; ok = true; }
        else { var e = KS.randomEnemyNear(p.x, p.y, 420); if (e) { tx = e.x; ty = e.y; ok = true; } }
        if (!ok) continue;
        tx += KS.rng.range(-18, 18); ty += KS.rng.range(-18, 18);
        var q = KS.spawnProj(SNOWGLOBE, w.slot, p.x, p.y, 0, 0, null);
        if (!q) break;
        q.noCollide = true; q.life = 1; q.dmg = dmg; q.r = 8; q.procCoef = 0.6;
        q.data.sx = p.x; q.data.sy = p.y; q.data.tx = tx; q.data.ty = ty; q.data.rad = rad; q.data.fz = fz;
        fired++;
      }
      if (fired) { KS.sfx("throw"); w.cd = KS.wstat(w, "cd"); } else w.cd = 0.3;
    },
    projUpdate: function (p, dt, run) {
      var d = p.data, u = p.t / 0.6;
      if (u >= 1) {
        p.x = d.tx; p.y = d.ty;
        var cx = p.x, cy = p.y, n = KS.grid.query(cx, cy, d.rad, Q, 256), i, e;
        for (i = 0; i < n; i++) {
          e = Q[i]; if (!e.alive) continue;
          setSrc(GLOBE_SRC, null, cx, cy, 160, e.x - cx, e.y - cy, 0.6, true); GLOBE_SRC.slot = p.slot; GLOBE_SRC.weaponId = "fuse_snowglobe";
          KS.damage(e, p.dmg, GLOBE_SRC);
          if (e.alive) KS.applyStatus(e, "freeze", 0, d.fz, GLOBE_SRC);
        }
        KS.fx("ring", cx, cy, "#cfeaf6", 1, d.rad); KS.fx("burst", cx, cy, "#e9f6fb", 14, 4); KS.fx("snow", cx, cy, "#ffffff", 10, 3); KS.shake(2); KS.sfx("freeze"); KS.sfx("explode");
        p.alive = false; return true;
      }
      p.x = d.sx + (d.tx - d.sx) * u; p.y = d.sy + (d.ty - d.sy) * u;
      return true;
    },
    projDraw: function (ctx, p) {
      var d = p.data, u = min(1, p.t / 0.6), z = sin(PI * u) * 85, y = p.y - z;
      ctx.globalAlpha = 0.25; ctx.strokeStyle = "#7fc4ec"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.tx, d.ty, d.rad, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 10 - z * 0.04, 5 - z * 0.02, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(190,225,245,0.75)"; ctx.beginPath(); ctx.arc(p.x, y, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#5a8fb0"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p.x - 3, y + 1, 1.5, 0, TAU); ctx.arc(p.x + 3, y - 2, 1.3, 0, TAU); ctx.arc(p.x + 1, y + 4, 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(p.x - 6, y + 8, 12, 4);
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.beginPath(); ctx.arc(p.x - 4, y - 5, 2, 0, TAU); ctx.fill();
    }
  });
  KS.registerWeapon(SNOWGLOBE);

  // ---------------------------------------------------------------------------
  // F4 Sleigh Lance (Candy Cane Javelin + Reindeer Stampede)
  // ---------------------------------------------------------------------------
  var LANCE = defaults({
    id: "fuse_lance", name: TEXT.fuse_lance.name, icon: "🛷", tag: "blade", tags2: ["haul"], desc: TEXT.fuse_lance.desc, milestone: TEXT.fuse_lance.ms,
    fusion: true, recipe: { weapons: ["cane", "stampede"] }, procCoef: 1,
    levels: [{ dmg: 120, cd: 1.2, speed: 800, life: 0.75 }],
    labels: { dmg: L.dmg, cd: L.cd },
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player;
      if (!KS.nearestEnemy(p.x, p.y, 700)) { w.cd = 0.25; return; }
      var a = aimAt(p, 600), spd = KS.wstat(w, "speed"), q = KS.spawnProj(LANCE, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
      w.cd = KS.wstat(w, "cd");
      if (!q) return;
      q.r = 26; q.dmg = KS.wstat(w, "dmg"); q.pierce = -1; q.life = KS.wstat(w, "life"); q.kb = 250; q.data.sk = 0.02; q.data.lx = p.x; q.data.ly = p.y;
      KS.sfx("deer");
    },
    projUpdate: function (p, dt) {
      var d = p.data; d.sk -= dt;
      if (d.sk <= 0) { d.sk = 0.12; mintSeg(d.lx, d.ly, p.x, p.y); d.lx = p.x; d.ly = p.y; }
      return false;
    },
    projDraw: function (ctx, p) {
      var ca = cos(p.ang), sa = sin(p.ang), i;
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.beginPath();
      for (i = -1; i <= 1; i++) { ctx.moveTo(p.x - ca * 30 - sa * i * 14, p.y - sa * 30 + ca * i * 14); ctx.lineTo(p.x - ca * 70 - sa * i * 14, p.y - sa * 70 + ca * i * 14); }
      ctx.stroke(); ctx.globalAlpha = 1;
      drawSleigh(ctx, p.x - ca * 8, p.y - sa * 8, p.ang, 1.1);
      drawDeer(ctx, p.x + ca * 32 - sa * 11, p.y + sa * 32 + ca * 11, p.ang, 0.85, p.t, 0);
      drawDeer(ctx, p.x + ca * 32 + sa * 11, p.y + sa * 32 - ca * 11, p.ang, 0.85, p.t, 2);
    }
  });
  KS.registerWeapon(LANCE);

  // ---------------------------------------------------------------------------
  // Operator Shift Abilities (8)
  // ---------------------------------------------------------------------------
  var AB_SRC = mkSrc("blade", 1); AB_SRC.slot = 7;
  var V = { x: 0, y: 0 };
  function dirOf(run) {
    var p = run.player;
    if (KS.input.moving && (KS.input.mx !== 0 || KS.input.my !== 0)) KS.util.norm(V, KS.input.mx, KS.input.my);
    else if (KS.util.norm(V, p.aimX, p.aimY) < 0.01) KS.util.norm(V, p.faceX, p.faceY);
    if (V.x === 0 && V.y === 0) V.x = 1;
    return V;
  }

  // Full Throttle: hazard that rides with the player and cuts whatever it touches
  var DASH_U = new Int32Array(160), DASH_N = 0;
  var DASH_SRC = mkSrc("blade", 1); DASH_SRC.slot = 7;
  var DASH_F = { r: 30, dmg: 60, life: 0.34, src: DASH_SRC, data: { dx: 1, dy: 0 } };
  KS.registerHazard({
    id: "w_dashhit", team: "player", r: 30, life: 0.34,
    init: function () { DASH_N = 0; },
    update: function (h, dt, run) {
      var p = run.player, i, j, n, e;
      h.x = p.x; h.y = p.y;
      n = KS.grid.query(p.x, p.y, p.r + 22, Q, 128);
      for (i = 0; i < n; i++) {
        e = Q[i]; if (!e.alive) continue;
        var seen = false; for (j = 0; j < DASH_N; j++) if (DASH_U[j] === e.uid) { seen = true; break; }
        if (seen) continue;
        if (DASH_N < 160) DASH_U[DASH_N++] = e.uid;
        h.src.slot = 7; h.src.weaponId = ""; h.src.x = p.x; h.src.y = p.y; h.src.kb = 200; h.src.kbx = h.data.dx; h.src.kby = h.data.dy; h.src.canCrit = true;
        KS.damage(e, h.dmg, h.src);
      }
    },
    draw: function (ctx, h, t) {
      var f = max(0, h.life / 0.34), dx = h.data.dx, dy = h.data.dy, i;
      ctx.save(); ctx.globalAlpha = 0.5 * f; ctx.strokeStyle = "#e7c55b"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(h.x, h.y, 26 + (1 - f) * 10, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.6 * f; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
      for (i = -2; i <= 2; i++) { ctx.moveTo(h.x - dx * 24 - dy * i * 9, h.y - dy * 24 + dx * i * 9); ctx.lineTo(h.x - dx * (60 + (i & 1) * 20) - dy * i * 9, h.y - dy * (60 + (i & 1) * 20) + dx * i * 9); }
      ctx.stroke(); ctx.restore();
    }
  });

  // Call It In: twelve snowball bombs on one cluster
  var CI_X = new Float32Array(12), CI_Y = new Float32Array(12), CI_D = new Uint8Array(12);
  var CI_SRC = mkSrc("blast", 0.6); CI_SRC.slot = 7;
  var CI_F = { r: 60, life: 2.0, src: CI_SRC, data: { dmg: 50 } };
  KS.registerHazard({
    id: "w_callin", team: "player", r: 60, life: 2.0,
    init: function (h) {
      for (var i = 0; i < 12; i++) { CI_D[i] = 0; CI_X[i] = h.x + KS.rng.range(-55, 55); CI_Y[i] = h.y + KS.rng.range(-55, 55); }
    },
    update: function (h, dt, run) {
      var i, tl, n, k, e;
      for (i = 0; i < 12; i++) {
        tl = h.t - i * 0.125;
        if (CI_D[i] || tl < 0.35) continue;
        CI_D[i] = 1;
        n = KS.grid.query(CI_X[i], CI_Y[i], 50, Q, 128);
        for (k = 0; k < n; k++) {
          e = Q[k]; if (!e.alive) continue;
          h.src.slot = 7; h.src.weaponId = ""; h.src.x = CI_X[i]; h.src.y = CI_Y[i]; h.src.kb = 120; h.src.kbx = e.x - CI_X[i]; h.src.kby = e.y - CI_Y[i]; h.src.canCrit = true;
          KS.damage(e, h.data.dmg, h.src);
        }
        KS.fx("ring", CI_X[i], CI_Y[i], "#cfeaf6", 1, 50); KS.fx("snow", CI_X[i], CI_Y[i], "#ffffff", 5, 3); KS.shake(1.2);
        if ((i & 3) === 0) KS.sfx("explode");
      }
    },
    draw: function (ctx, h, t) {
      var i, tl, f;
      for (i = 0; i < 12; i++) {
        tl = h.t - i * 0.125;
        if (tl < 0) continue;
        if (tl < 0.35) {
          f = tl / 0.35;
          ctx.globalAlpha = 0.25 + 0.3 * f; ctx.strokeStyle = "#7fc4ec"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(CI_X[i], CI_Y[i], 50 * (0.5 + 0.5 * f), 0, TAU); ctx.stroke();
          ctx.globalAlpha = 0.3; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.ellipse(CI_X[i], CI_Y[i] + 2, 4 + 8 * f, 2 + 4 * f, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(CI_X[i], CI_Y[i] - (1 - f) * 260, 9, 0, TAU); ctx.fill();
          ctx.strokeStyle = "#7fc4ec"; ctx.lineWidth = 1.5; ctx.stroke();
        } else if (tl < 0.6) {
          f = (tl - 0.35) / 0.25;
          ctx.globalAlpha = 0.6 * (1 - f); ctx.fillStyle = "#e9f6fb"; ctx.beginPath(); ctx.arc(CI_X[i], CI_Y[i], 50 * (0.4 + 0.6 * f), 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
  });

  // Fell Line projectile (pseudo-def)
  var FELL = {
    id: "fellline", tag: "blade", procCoef: 1,
    projDraw: function (ctx, p) {
      var ca = cos(p.ang), sa = sin(p.ang), i;
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
      for (i = -1; i <= 1; i++) { ctx.moveTo(p.x - ca * 24 - sa * i * 15, p.y - sa * 24 + ca * i * 15); ctx.lineTo(p.x - ca * 90 - sa * i * 15, p.y - sa * 90 + ca * i * 15); }
      ctx.stroke(); ctx.globalAlpha = 1;
      for (i = -1; i <= 1; i++) drawSawBlade(ctx, p.x - sa * i * 15, p.y + ca * i * 15, 11, p.t * 28 + i, "#aab1b8", "#b3261e");
    }
  };

  var BACK_SRC = mkSrc("fire", 0); BACK_SRC.slot = 7; BACK_SRC.noProc = true; BACK_SRC.canCrit = false;
  var FLOOD_SRC = mkSrc("blade", 0); FLOOD_SRC.slot = 7; FLOOD_SRC.noProc = true; FLOOD_SRC.canCrit = false;
  var CO_IDS = new Array(5), CO_POOL = new Array(160);

  KS.registerAbility({
    id: "toolbox", name: TEXT.ab.toolboxtalk[0], icon: "🧰", cd: 45, desc: TEXT.ab.toolboxtalk[1],
    fire: function (run) {
      var p = run.player;
      KS.addBuff("toolboxtalk", 5);
      KS.fx("ring", p.x, p.y, "#e7c55b", 1, 90); KS.fx("sparks", p.x, p.y, "#fff2a0", 8, 3);
      return true;
    }
  });
  KS.registerAbility({
    id: "fullthrottle", name: TEXT.ab.fullthrottle[0], icon: "💨", cd: 30, desc: TEXT.ab.fullthrottle[1],
    fire: function (run) {
      var p = run.player, v = dirOf(run);
      DASH_SRC.team = "player"; DASH_SRC.slot = 7;
      DASH_F.dmg = 60 * run.stats.might; DASH_F.data.dx = v.x; DASH_F.data.dy = v.y;
      KS.dash(v.x * 240, v.y * 240, 0.3, true);
      KS.spawnHazard("w_dashhit", p.x, p.y, DASH_F);
      KS.fx("burst", p.x, p.y, "#c9993b", 10, 3); KS.shake(2);
      return true;
    }
  });
  KS.registerAbility({
    id: "fellline", name: TEXT.ab.fellline[0], icon: "🪚", cd: 25, desc: TEXT.ab.fellline[1],
    fire: function (run) {
      var p = run.player, v = dirOf(run), q = KS.spawnProj(FELL, 7, p.x + v.x * 20, p.y + v.y * 20, v.x * 800, v.y * 800, null);
      if (!q) return false;
      q.r = 20; q.dmg = 80 * run.stats.might; q.pierce = -1; q.life = 0.5; q.kb = 200; q.procCoef = 1;
      KS.sfx("saw"); KS.shake(2);
      return true;
    }
  });
  KS.registerAbility({
    id: "feedchipper", name: TEXT.ab.feedchipper[0], icon: "🪵", cd: 40, desc: TEXT.ab.feedchipper[1],
    fire: function (run) {
      var p = run.player;
      KS.magnetAll(99999, 3);
      KS.fx("ring", p.x, p.y, "#7fbf4f", 1, 160); KS.fx("chips", p.x, p.y, "#c9993b", 10, 3);
      return true;
    }
  });
  KS.registerAbility({
    id: "backfire", name: TEXT.ab.backfire[0], icon: "🔥", cd: 35, desc: TEXT.ab.backfire[1],
    fire: function (run) {
      var p = run.player, n = KS.grid.query(p.x, p.y, 300, Q3, 512), i, e;
      BACK_SRC.team = "player"; BACK_SRC.depth = 0;
      for (i = 0; i < n; i++) { e = Q3[i]; if (e.alive) KS.applyStatus(e, "burn", 20 * run.stats.might, 4, BACK_SRC); }
      KS.fx("ring", p.x, p.y, "#e0701f", 1, 300); KS.fx("embers", p.x, p.y, "#f4a62a", 14, 4); KS.shake(3); KS.sfx("burn");
      return true;
    }
  });
  KS.registerAbility({
    id: "floodlights", name: TEXT.ab.floodlights[0], icon: "💡", cd: 50, desc: TEXT.ab.floodlights[1],
    fire: function (run) {
      var pool = run.enemies, i, e;
      FLOOD_SRC.team = "player"; FLOOD_SRC.depth = 0;
      for (i = 0; i < pool.n; i++) {
        e = pool.list[i];
        if (e.alive && !e.untargetable && KS.onScreen(e.x, e.y, e.r)) KS.applyStatus(e, "stun", 0, 1.5, FLOOD_SRC);
      }
      KS.flash("#fff6c8", 0.3); KS.fx("ring", run.player.x, run.player.y, "#fff2a0", 1, 260);
      return true;
    }
  });
  KS.registerAbility({
    id: "callitin", name: TEXT.ab.callitin[0], icon: "📻", cd: 45, desc: TEXT.ab.callitin[1],
    fire: function (run) {
      var p = run.player, x = p.x + p.aimX * 160, y = p.y + p.aimY * 160, e;
      if (KS.densestPoint(100, DP) && DP.n > 0) { x = DP.x; y = DP.y; }
      else { e = KS.nearestEnemy(p.x, p.y, 600); if (e) { x = e.x; y = e.y; } }
      CI_SRC.team = "player"; CI_SRC.slot = 7;
      CI_F.data.dmg = 50 * run.stats.might;
      KS.spawnHazard("w_callin", x, y, CI_F);
      KS.fx("ring", p.x, p.y, "#7fc4ec", 1, 50);
      return true;
    }
  });
  KS.registerAbility({
    id: "changeorder", name: TEXT.ab.changeorder[0], icon: "📋", cd: 5, perStage: true, desc: TEXT.ab.changeorder[1],
    fire: function (run) {
      var ord = run.itemOrder, take = 0, i, j, id, def, cnt, changed = 0, defs = KS.defs.items, k, d2, pick;
      for (i = ord.length - 1; i >= 0 && take < 5; i--) { d2 = defs[ord[i]]; if (d2 && d2.rarity !== "kudzu") CO_IDS[take++] = ord[i]; }
      if (!take) return false;
      for (j = 0; j < take; j++) {
        id = CO_IDS[j]; def = defs[id]; cnt = 0;
        for (k in defs) {
          d2 = defs[k];
          if (k === id || d2.rarity !== def.rarity || d2.rarity === "kudzu" || cnt >= 160) continue;
          if (d2.unlock && !KS.meta.isUnlocked("item", k)) continue;
          CO_POOL[cnt++] = k;
        }
        if (!cnt) continue;
        pick = CO_POOL[KS.rng.int(0, cnt - 1)];
        KS.items.remove(id, 1); KS.items.give(pick, 1, "changeorder"); changed++;
      }
      if (!changed) return false;
      KS.fx("ring", run.player.x, run.player.y, "#5a4a6a", 1, 80); KS.fx("sparks", run.player.x, run.player.y, "#c9a07a", 8, 3);
      return true;
    }
  });
})(window.KS);
