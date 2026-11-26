/* Kudzu Survivors v2 - bosses.js (ENG-BOSS). Six bosses, three boss minions, seven boss hazards.
   Owns the encounter end: KS.bossDone is called exactly once per encounter (guarded by boss.ai.done). */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT: every joke / flavor string in this file lives here for owner review.
  // ---------------------------------------------------------------------------
  var TEXT = {
    kudzuking: {
      name: "The Kudzu King", title: "THE KUDZU KING", subtitle: "Ruler of the Back Forty",
      notes: "A green tangle in a leaf crown. Slams the ground every few seconds and sends out a shockwave ring with two rotating gaps. Later it plants vine pillars that grow runners, then swings a vine whip.",
      joke: "He insists the crown is a natural growth pattern, not a promotion.",
      tip: "Watch the gaps. They are drawn as breaks in the ring during the wind-up. Step through one or stay outside the ring."
    },
    granddaddy: {
      name: "Ol' Granddaddy Stump", title: "OL' GRANDDADDY STUMP", subtitle: "Eighty years rooted, zero years retired",
      notes: "A huge stump that burrows under the site and surfaces beneath you. Takes half damage while underground. At the end it splits into three Stumplings that must all fall together.",
      joke: "Was here before the county road, the county, and the county's opinion on stumps.",
      tip: "Hit him while he is up. Kill the Stumplings within ten seconds of each other or they regrow."
    },
    tangled: {
      name: "The Tangled Transformer", title: "THE TANGLED TRANSFORMER", subtitle: "Somebody left the lights on",
      notes: "A utility pole wrapped in holiday lights, humming along the easement. Fires blue lightning lanes, then sparking orbs, then a site-wide overload that only the orange insulator pads can shield you from.",
      joke: "The lights are on a timer. Nobody remembers who set it.",
      tip: "During Overload, stand inside an orange pad before the countdown reaches zero. The pads stay put until the flash."
    },
    inflatable: {
      name: "Feral Yard Inflatable", title: "FERAL YARD INFLATABLE", subtitle: "Came loose in the ice storm",
      notes: "A runaway lawn Santa that hops after you. Deflates and re-inflates larger twice, picking up a horn blast and a present barrage that hides mimics.",
      joke: "Still plugged in somehow. The cord has been trailing since the storm.",
      tip: "It cannot be hurt while deflated. Watch the cone before the horn and the landing circles before gifts drop."
    },
    matriarch: {
      name: "The Briar Matriarch", title: "THE BRIAR MATRIARCH", subtitle: "Queen of the Longleaf thicket",
      notes: "A towering bramble in a red rose crown. Fires spiralling thorn streams with walkable gaps, closes a bramble wall around you, and calls Briar Bundle elites in the final phase.",
      joke: "Prunes anyone who calls her a bush.",
      tip: "Move with the spiral, not against it. The bramble wall pushes you back in, so fight near the middle."
    },
    eternal: {
      name: "The Overgrowth Eternal", title: "THE OVERGROWTH ETERNAL", subtitle: "Every weed we ever cleared, rolled into one",
      notes: "Season finale. A rolling mass of kudzu, holly, briar and light strands. Each quarter of its health borrows a different boss attack. At ten percent it wraps itself up and closes an ivy ring around the arena.",
      joke: "Has been on the clearing list since before there was a clearing list.",
      tip: "At ten percent it cannot be hurt. Stay inside the shrinking safe circle for 45 seconds and the fight is won."
    },
    stumpling: { name: "Stumpling", notes: "A piece of Granddaddy that has opinions.", joke: "Doesn't want to talk about it.", tip: "All three must fall within ten seconds." },
    vinepillar: { name: "Vine Pillar", notes: "A sprouting pillar planted by the Kudzu King. Releases runners.", joke: "Grows faster than the permit paperwork.", tip: "Cut them down to stop the runners." },
    minimimic: { name: "Mini Mimic", notes: "A small present with a big appetite.", joke: "Bows are not a good sign.", tip: "Small and fast. Handle it before the next barrage." },
    barks: {
      kudzuking: ["", "Rise, my vines!", "Kneel before the crown!"],
      granddaddy: ["", "Back in my day we sprouted standing up.", "Fine. We'll do this the family way."],
      tangled: ["", "Zzzt. Merry something.", "Surge protection is for quitters."],
      inflatable: ["", "Ho. Ho. Pfffft.", "Bigger. Louder. Merrier."],
      matriarch: ["", "You are standing in my garden.", "Come closer, dear."],
      eternal: ["", "", "", "Everything grows back."]
    },
    wrap: "WRAP IT ALL UP",
    wrapSub: "Stay inside the circle"
  };

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------
  var TAU = Math.PI * 2, PI = Math.PI, INK = "#2a1f1a";
  var SRC = KS.makeSrc ? KS.makeSrc() : null;
  if (SRC) { SRC.slot = 7; SRC.procCoef = 0; SRC.noProc = true; SRC.noOnKill = true; SRC.canCrit = false; }

  var F = { priority: true, tele: 0, life: 1, dmg: 0, r: 30, w: 0, h: 0, ang: 0, tick: 0.5, data: null };
  var FD = { k: 0, a: 0, b: 0, c: 0, d: 0 };
  F.data = FD;
  // Spawn a boss hazard (always priority). data: k kind, a/b/c free, d = telegraph length.
  function hz(id, x, y, tele, life, dmg, r, w, h, ang, k, a, b, c) {
    F.tele = tele; F.life = life; F.dmg = dmg; F.r = r; F.w = w; F.h = h; F.ang = ang;
    FD.k = k; FD.a = a; FD.b = b; FD.c = c; FD.d = tele;
    return KS.spawnHazard(id, x, y, F);
  }
  var lastTone = -9;
  function tone(run) { if (run.time - lastTone > 0.3 || run.time < lastTone) { lastTone = run.time; KS.sfx("telegraph"); } }
  function A(run, v) { return v * run.dmgMul; }
  function chase(e, spd, p) {
    var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 2) { e.vx = dx / d * spd; e.vy = dy / d * spd; } else { e.vx = 0; e.vy = 0; }
    e.face = Math.atan2(dy, dx);
  }
  function stopE(e) { e.vx = 0; e.vy = 0; }
  function clampB(run, v, lo, hi, m) { var a = lo + m, b = hi - m; return v < a ? a : (v > b ? b : v); }
  function angDiff(a, b) { var d = (a - b) % TAU; if (d > PI) d -= TAU; else if (d < -PI) d += TAU; return d; }

  function initCommon(e) {
    var a = e.ai;
    a.barkT = 0; a.bark = ""; a.barkKey = ""; a.done = 0; a.cd = 0;
    if (!a.ref) { a.ref = [null, null, null, null, null, null, null, null]; a.ru = new Float64Array(8); }
    for (var i = 0; i < 8; i++) { a.ref[i] = null; a.ru[i] = 0; }
  }
  function trk(e, i, o) { e.ai.ref[i] = o; e.ai.ru[i] = o ? o.uid : 0; }
  function live(e, i) { var o = e.ai.ref[i]; return !!(o && o.alive && o.uid === e.ai.ru[i]); }
  function setBark(e, i) {
    var arr = TEXT.barks[e.defId];
    if (arr && arr[i]) { e.ai.bark = arr[i]; e.ai.barkKey = "bk:" + e.defId + i; e.ai.barkT = 3; }
  }
  function drawBark(ctx, e, dy) {
    var a = e.ai; if (a.barkT <= 0 || !a.bark) return;
    var s = KS.textSprite(a.barkKey, a.bark, "bold 15px 'Libre Caslon Text', serif", "#fff6dc");
    if (!s) return;
    var w = s.width, h = s.height, x = e.x - w / 2, y = e.y - e.r - dy - h - 6;
    ctx.globalAlpha = Math.min(1, a.barkT);
    ctx.fillStyle = "rgba(42,31,26,0.85)"; ctx.fillRect(x - 6, y - 3, w + 12, h + 6);
    ctx.drawImage(s, x, y);
    ctx.globalAlpha = 1;
  }
  function liveCount(run, defId) {
    var n = 0, l = run.enemies.list;
    for (var i = 0; i < run.enemies.n; i++) { var o = l[i]; if (o.alive && o.defId === defId) n++; }
    return n;
  }
  // Encounter end: clear boss attacks, then fire bossDone exactly once.
  function finish(e) {
    var run = KS.run; if (!run || e.ai.done) return;
    e.ai.done = 1;
    var i, l = run.hazards.list;
    for (i = 0; i < run.hazards.n; i++) { var h = l[i]; if (h.alive && h.defId.charCodeAt(0) === 98 && h.defId.charCodeAt(1) === 95) h.alive = false; }
    l = run.eprojectiles.list;
    for (i = 0; i < run.eprojectiles.n; i++) { var q = l[i]; if (q.alive && q.owner === e.uid) q.alive = false; }
    l = run.enemies.list;
    for (i = 0; i < run.enemies.n; i++) { var o = l[i]; if (o.alive && o !== e && o.bossPart) KS.removeEnemy(o); }
    KS.bossDone(run, e.x, e.y);
  }
  function killBoss(e) { e.invuln = false; e.untargetable = false; if (SRC) KS.killEnemy(e, SRC); else finish(e); }

  // Shared telegraph look: outline + fill + hatch (path must already be built).
  var HATCH = null;
  function hatch(ctx) {
    if (!HATCH) {
      var c = document.createElement("canvas"); c.width = c.height = 10;
      var g = c.getContext("2d"); g.strokeStyle = "rgba(42,31,26,0.6)"; g.lineWidth = 2; g.beginPath();
      g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.stroke();
      HATCH = ctx.createPattern(c, "repeat");
    }
    return HATCH;
  }
  function teleFill(ctx, color, f) {
    ctx.globalAlpha = 0.14 + 0.22 * f; ctx.fillStyle = color; ctx.fill();
    ctx.globalAlpha = 0.45; ctx.fillStyle = hatch(ctx); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 5 + 2 * f; ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = 2.5 + 2 * f; ctx.stroke();
  }
  function ell(ctx, x, y, rx, ry, rot, fill, stroke, lw) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function col(e, c) { return e.flash > 0 ? "#ffffff" : c; }

  // ---------------------------------------------------------------------------
  // Hazards
  // ---------------------------------------------------------------------------
  // Slam ring with two rotating 45 degree gaps.
  KS.registerHazard({
    id: "b_ring", team: "enemy", autoDamage: false, r: 320, life: 3,
    init: function (h) { var d = h.data; d.hit = 0; d.rad = 0; d.gap = d.a; },
    update: function (h, dt, run) {
      var d = h.data; d.gap += d.b * dt;
      if (h.tele > 0) return;
      d.rad += 280 * dt;
      if (d.rad >= d.c) { h.alive = false; return; }
      if (d.hit) return;
      var p = run.player; if (!p.alive) return;
      var dx = p.x - h.x, dy = p.y - h.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dist - d.rad) > 9 + p.r) return;
      var ang = Math.atan2(dy, dx), half = PI / 8 + 0.5 * p.r / Math.max(30, d.rad);
      if (Math.abs(angDiff(ang, d.gap)) <= half || Math.abs(angDiff(ang, d.gap + PI)) <= half) return;
      d.hit = 1; KS.hurtPlayer(h.dmg, "hazard", h.x, h.y);
    },
    draw: function (ctx, h) {
      if (h.tele > 0) return;
      var d = h.data, rad = d.rad, g = d.gap, hw = PI / 8, fade = 1 - rad / d.c * 0.4;
      ctx.globalAlpha = fade;
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? "#9bdc5a" : INK; ctx.lineWidth = pass ? 11 : 19; ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(h.x, h.y, rad, g + hw, g + PI - hw);
        ctx.moveTo(h.x + Math.cos(g + PI + hw) * rad, h.y + Math.sin(g + PI + hw) * rad);
        ctx.arc(h.x, h.y, rad, g + PI + hw, g + TAU - hw);
        ctx.stroke();
      }
      ctx.lineCap = "butt"; ctx.globalAlpha = 1;
    },
    drawTele: function (ctx, h) {
      var d = h.data, f = 1 - h.tele / d.d, g = d.gap, hw = PI / 8, R = d.c;
      ctx.beginPath();
      ctx.arc(h.x, h.y, R, g + hw, g + PI - hw);
      ctx.arc(h.x, h.y, R * 0.94, g + PI - hw, g + hw, true); ctx.closePath();
      ctx.moveTo(h.x + Math.cos(g + PI + hw) * R, h.y + Math.sin(g + PI + hw) * R);
      ctx.arc(h.x, h.y, R, g + PI + hw, g + TAU - hw);
      ctx.arc(h.x, h.y, R * 0.94, g + TAU - hw, g + PI + hw, true); ctx.closePath();
      teleFill(ctx, "#ffb02e", f);
      // growing shadow = the wind-up
      ctx.globalAlpha = 0.25; ell(ctx, h.x, h.y + 4, 30 + f * 30, 14 + f * 12, 0, INK); ctx.globalAlpha = 1;
      // clear gap markers
      ctx.strokeStyle = "#9bdc5a"; ctx.lineWidth = 3; ctx.beginPath();
      for (var k = 0; k < 2; k++) for (var s = -1; s <= 1; s += 2) {
        var a = g + k * PI + s * hw;
        ctx.moveTo(h.x + Math.cos(a) * R * 0.5, h.y + Math.sin(a) * R * 0.5); ctx.lineTo(h.x + Math.cos(a) * R * 1.04, h.y + Math.sin(a) * R * 1.04);
      }
      ctx.stroke();
    }
  });

  // Strip: root cross (k 0) and line arcs (k 1). Rotated rectangle, centre (x,y), w long, h wide.
  KS.registerHazard({
    id: "b_strip", team: "enemy", autoDamage: true, tick: 0.5, r: 100, life: 2,
    init: function (h) { h.r = h.w * 0.5 + h.h; },
    draw: function (ctx, h) {
      if (h.tele > 0) return;
      var d = h.data, f = Math.min(1, (h.t - d.d) / 0.35), w = h.w, th = h.h;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      if (d.k === 0) {
        ctx.globalAlpha = 1 - f * 0.4;
        ctx.fillStyle = INK; ctx.fillRect(-w / 2 - 2, -th / 2 - 2, w + 4, th + 4);
        ctx.fillStyle = "#7a4e26"; ctx.fillRect(-w / 2, -th / 2, w, th);
        ctx.fillStyle = "#3f8f3a"; ctx.fillRect(-w / 2, -th * 0.12, w, th * 0.24);
        ctx.fillStyle = "#4b2e16"; ctx.beginPath();
        for (var x = -w / 2 + 14; x < w / 2; x += 28) { ctx.moveTo(x - 8, -th / 2); ctx.lineTo(x, -th / 2 - 14); ctx.lineTo(x + 8, -th / 2); ctx.moveTo(x - 8, th / 2); ctx.lineTo(x, th / 2 + 14); ctx.lineTo(x + 8, th / 2); }
        ctx.fill();
      } else {
        ctx.globalAlpha = 1 - f * 0.5;
        ctx.fillStyle = "rgba(111,200,255,0.35)"; ctx.fillRect(-w / 2, -th / 2, w, th);
        for (var pass = 0; pass < 2; pass++) {
          ctx.strokeStyle = pass ? "#ffffff" : "#59b8ff"; ctx.lineWidth = pass ? 3 : 9; ctx.beginPath(); ctx.moveTo(-w / 2, 0);
          for (var xx = -w / 2 + 28; xx <= w / 2; xx += 28) ctx.lineTo(xx, (KS.frand() - 0.5) * th * 0.7);
          ctx.stroke();
        }
      }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    drawTele: function (ctx, h) {
      var d = h.data, f = 1 - h.tele / d.d;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      ctx.beginPath(); ctx.rect(-h.w / 2, -h.h / 2, h.w, h.h);
      teleFill(ctx, d.k === 0 ? "#c9993b" : "#6fc8ff", f);
      ctx.restore();
    }
  });

  // Bramble wall: circle of radius d.a, touching it hurts and pushes you back.
  KS.registerHazard({
    id: "b_wall", team: "enemy", autoDamage: false, r: 420, life: 22,
    init: function (h) { h.data.tk = 0; if (!(h.data.a > 0)) h.data.a = 380; if (!(h.data.d > 0)) h.data.d = 1; h.r = h.data.a + 40; },
    update: function (h, dt, run) {
      var d = h.data; if (d.tk > 0) d.tk -= dt;
      if (h.tele > 0) return;
      var p = run.player; if (!p.alive) return;
      var dx = p.x - h.x, dy = p.y - h.y, dist = Math.sqrt(dx * dx + dy * dy), band = 14 + p.r;
      if (Math.abs(dist - d.a) >= band || dist < 1) return;
      if (d.tk <= 0) { d.tk = 0.5; KS.hurtPlayer(h.dmg, "hazard", h.x + dx, h.y + dy); }
      var target = dist < d.a ? d.a - band - 1 : d.a + band + 1;
      p.x = h.x + dx / dist * target; p.y = h.y + dy / dist * target;
    },
    draw: function (ctx, h) {
      if (h.tele > 0) return;
      var R = h.data.a, al = h.life < 1.5 ? 0.4 + 0.6 * h.life / 1.5 : 1, i, a;
      ctx.globalAlpha = al;
      ctx.strokeStyle = INK; ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "#2f5a2c"; ctx.lineWidth = 16; ctx.stroke();
      ctx.strokeStyle = "#4a7d3a"; ctx.lineWidth = 5; ctx.setLineDash([22, 14]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#a82a2a"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
      var n = 72, sh = h.t * 0.1;
      for (i = 0; i < n; i++) {
        a = i * TAU / n + sh; var cx = h.x + Math.cos(a) * R, cy = h.y + Math.sin(a) * R;
        if (!KS.onScreen(cx, cy, 30)) continue;
        var s = (i & 1) ? 15 : 10, ox = Math.cos(a), oy = Math.sin(a);
        ctx.moveTo(cx - oy * 5, cy + ox * 5); ctx.lineTo(cx + ox * s, cy + oy * s); ctx.lineTo(cx + oy * 5, cy - ox * 5);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    drawTele: function (ctx, h) {
      var d = h.data, f = 1 - h.tele / d.d, R = d.a;
      ctx.beginPath(); ctx.arc(h.x, h.y, R + 16, 0, TAU); ctx.moveTo(h.x + R - 16, h.y); ctx.arc(h.x, h.y, R - 16, 0, TAU, true);
      teleFill(ctx, "#d6453a", f);
    }
  });

  // Ivy: safe circle shrinks from d.a to d.b over d.c seconds; outside hurts.
  KS.registerHazard({
    id: "b_ivy", team: "enemy", autoDamage: false, r: 100000, life: 50,
    init: function (h) { h.data.tk = 0; h.data.cur = h.data.a; h.r = 100000; },
    update: function (h, dt, run) {
      var d = h.data, k = Math.min(1, h.t / d.c); d.cur = d.a + (d.b - d.a) * k;
      if (d.tk > 0) d.tk -= dt;
      var p = run.player; if (!p.alive) return;
      var dx = p.x - h.x, dy = p.y - h.y;
      if (dx * dx + dy * dy > d.cur * d.cur && d.tk <= 0) { d.tk = 0.5; KS.hurtPlayer(h.dmg, "hazard", h.x, h.y); }
    },
    draw: function (ctx, h, t) {
      var d = h.data, b = KS.run.bounds, R = d.cur, i;
      ctx.globalAlpha = 0.3; ctx.fillStyle = "#2f7a35"; ctx.beginPath();
      ctx.rect(b.x0 - 600, b.y0 - 600, b.x1 - b.x0 + 1200, b.y1 - b.y0 + 1200); ctx.arc(h.x, h.y, R, 0, TAU);
      ctx.fill("evenodd"); ctx.globalAlpha = 1;
      ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(h.x, h.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "#8fd05a"; ctx.lineWidth = 5; ctx.stroke();
      var n = Math.max(24, Math.min(90, (R * 0.14) | 0));
      ctx.fillStyle = "#3f8f3a"; ctx.beginPath();
      for (i = 0; i < n; i++) {
        var a = i * TAU / n + t * 0.05, cx = h.x + Math.cos(a) * R, cy = h.y + Math.sin(a) * R;
        if (!KS.onScreen(cx, cy, 24)) continue;
        ctx.moveTo(cx + 12, cy); ctx.ellipse(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 11, 5, a + 0.6, 0, TAU);
      }
      ctx.fill();
    }
  });

  // Blast: circle telegraph then one instant hit. k 0 crack ring, 1 landing shock, 2 falling gift (a = mimic flag).
  KS.registerHazard({
    id: "b_blast", team: "enemy", autoDamage: false, r: 60, life: 2,
    init: function (h) { h.data.done = 0; },
    update: function (h, dt, run) {
      var d = h.data; if (h.tele > 0 || d.done) return;
      d.done = 1;
      var p = run.player, dx = p.x - h.x, dy = p.y - h.y, rr = h.r + p.r;
      if (p.alive && dx * dx + dy * dy <= rr * rr) KS.hurtPlayer(h.dmg, "hazard", h.x, h.y);
      KS.fx("burst", h.x, h.y, d.k === 0 ? "#8a5a2b" : (d.k === 2 ? "#d6453a" : "#efe2c4"), 10, 4); KS.shake(d.k === 1 ? 3 : 2);
      if (d.k === 2 && d.a) {
        var b = run.boss;
        if (b && b.alive && b.defId === "inflatable" && !b.ai.done) {
          var slot = !live(b, 0) ? 0 : (!live(b, 1) ? 1 : -1);
          if (slot >= 0) { var m = KS.spawnEnemy("minimimic", h.x, h.y, { bossPart: true, parentUid: b.uid }); if (m) trk(b, slot, m); }
        }
      }
      h.life = Math.min(h.life, 0.35);
    },
    draw: function (ctx, h) {
      var d = h.data; if (h.tele > 0) return;
      var f = Math.min(1, (h.t - d.d) / 0.35), r = h.r * (0.6 + 0.6 * f);
      ctx.globalAlpha = 1 - f;
      ell(ctx, h.x, h.y, r, r * 0.85, 0, d.k === 0 ? "rgba(138,90,43,0.5)" : "rgba(255,255,255,0.45)", d.k === 2 ? "#d6453a" : INK, 4);
      ctx.globalAlpha = 1;
    },
    drawTele: function (ctx, h, t) {
      var d = h.data, f = 1 - h.tele / d.d, r = h.r;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU);
      teleFill(ctx, d.k === 0 ? "#c9993b" : (d.k === 2 ? "#d6453a" : "#ffffff"), f);
      if (d.k === 0) {
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
        for (var i = 0; i < 6; i++) { var a = i * 1.05 + 0.3; ctx.moveTo(h.x + Math.cos(a) * 6, h.y + Math.sin(a) * 6); ctx.lineTo(h.x + Math.cos(a + 0.2) * r * 0.5 * f, h.y + Math.sin(a + 0.2) * r * 0.5 * f); ctx.lineTo(h.x + Math.cos(a) * r * 0.9 * f, h.y + Math.sin(a) * r * 0.9 * f); }
        ctx.stroke();
      } else if (d.k === 2) {
        var gy = h.y - h.tele / d.d * 240, s = 15;
        ctx.fillStyle = "#c62d2d"; ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.fillRect(h.x - s, gy - s, s * 2, s * 2); ctx.strokeRect(h.x - s, gy - s, s * 2, s * 2);
        ctx.fillStyle = "#f2e9c9"; ctx.fillRect(h.x - 3, gy - s, 6, s * 2); ctx.fillRect(h.x - s, gy - 3, s * 2, 6);
        ell(ctx, h.x - 6, gy - s - 4, 6, 4, -0.5, "#f2e9c9", INK, 1.5); ell(ctx, h.x + 6, gy - s - 4, 6, 4, 0.5, "#f2e9c9", INK, 1.5);
      } else {
        ell(ctx, h.x, h.y, r * f, r * f * 0.85, 0, "rgba(42,31,26,0.35)");
      }
    }
  });

  // Sector: whip (k 0, arc a) and Ho-Ho-Horn (k 1, pushes c units). One instant hit when the telegraph ends.
  KS.registerHazard({
    id: "b_sector", team: "enemy", autoDamage: false, r: 260, life: 2,
    init: function (h) { h.data.done = 0; },
    update: function (h, dt, run) {
      var d = h.data; if (h.tele > 0 || d.done) return;
      d.done = 1;
      var p = run.player; if (!p.alive) return;
      var dx = p.x - h.x, dy = p.y - h.y, dist = Math.sqrt(dx * dx + dy * dy);
      KS.shake(d.k === 0 ? 4 : 3);
      if (dist > h.r + p.r || Math.abs(angDiff(Math.atan2(dy, dx), h.ang)) > d.a * 0.5 + (dist > 1 ? p.r / dist : 0)) return;
      KS.hurtPlayer(h.dmg, "hazard", h.x, h.y);
      if (d.c > 0) KS.dash(Math.cos(h.ang) * d.c, Math.sin(h.ang) * d.c, 0.35, false);
    },
    draw: function (ctx, h) {
      if (h.tele > 0) return;
      var d = h.data, f = Math.min(1, (h.t - d.d) / 0.35), a0 = h.ang - d.a / 2;
      ctx.globalAlpha = 1 - f * 0.6;
      if (d.k === 0) {
        ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, h.r, a0, a0 + d.a * Math.min(1, f * 2.5)); ctx.closePath();
        ctx.fillStyle = "rgba(111,170,60,0.4)"; ctx.fill();
        var a = a0 + d.a * Math.min(1, f * 2.5);
        ctx.strokeStyle = INK; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r); ctx.stroke();
        ctx.strokeStyle = "#8fd05a"; ctx.lineWidth = 6; ctx.stroke();
      } else {
        ctx.strokeStyle = "#fff6dc"; ctx.lineWidth = 6;
        for (var i = 1; i <= 3; i++) { var rr = h.r * (i / 3) * (0.5 + 0.5 * f); ctx.beginPath(); ctx.arc(h.x, h.y, rr, a0, a0 + d.a); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    },
    drawTele: function (ctx, h) {
      var d = h.data, f = 1 - h.tele / d.d;
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.arc(h.x, h.y, h.r, h.ang - d.a / 2, h.ang + d.a / 2); ctx.closePath();
      teleFill(ctx, d.k === 0 ? "#8fd05a" : "#ff6f6f", f);
    }
  });

  // Insulator pad (Overload safe spot). Purely visual; boss logic checks the position.
  KS.registerHazard({
    id: "b_pad", team: "enemy", autoDamage: false, r: 50, life: 6,
    draw: function (ctx, h, t) {
      var p = 1 + Math.sin(t * 5 + h.x) * 0.05, r = h.r * p;
      ell(ctx, h.x, h.y, r, r, 0, "rgba(255,150,40,0.22)");
      ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = 5; ctx.setLineDash([16, 8]); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#ffd9a0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.55, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(h.x - 8, h.y - 8); ctx.lineTo(h.x + 8, h.y + 8); ctx.moveTo(h.x + 8, h.y - 8); ctx.lineTo(h.x - 8, h.y + 8); ctx.stroke();
    }
  });

  // ---------------------------------------------------------------------------
  // Minions
  // ---------------------------------------------------------------------------
  KS.registerEnemy({
    id: "vinepillar", name: "Vine Pillar", hp: 200, speed: 0, r: 18, dmg: 8, xp: 0, tinsel: 0, mass: 5, spawnable: false, bossPart: true,
    stationary: true, noXp: true, noKnockback: true, untargetableStates: ["sprout"], color: "#3f8f3a",
    codex: { notes: TEXT.vinepillar.notes, joke: TEXT.vinepillar.joke, tip: TEXT.vinepillar.tip },
    init: function (e) { e.state = "sprout"; e.stateT = 0; e.ai.sp = 2; e.untargetable = true; },
    update: function (e, dt, run) {
      e.stateT += dt; e.vx = 0; e.vy = 0;
      if (e.state === "sprout") { if (e.stateT >= 1) { e.state = "grow"; e.untargetable = false; } return; }
      e.ai.sp -= dt;
      if (e.ai.sp <= 0) {
        e.ai.sp = 2;
        if (run.enemies.n < KS.device.caps.enemies * 0.85) {
          var a = KS.frand() * TAU; KS.spawnEnemy("runner", e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, { parentUid: e.uid });
        }
      }
    },
    draw: function (ctx, e, t) {
      var g = e.state === "sprout" ? Math.min(1, e.stateT) : 1, h = 52 * g, x = e.x, y = e.y + 8, w = Math.sin(t * 3 + e.uid) * 3;
      ell(ctx, x, y, 22, 9, 0, "#6b4a2b", INK, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 15; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w * 2, y - h * 0.5, x + w, y - h); ctx.stroke();
      ctx.strokeStyle = col(e, "#3f8f3a"); ctx.lineWidth = 10; ctx.stroke();
      ctx.strokeStyle = "#8fd05a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 2, y - 4); ctx.quadraticCurveTo(x + w * 2 - 2, y - h * 0.5, x + w - 2, y - h + 4); ctx.stroke(); ctx.lineCap = "butt";
      ell(ctx, x - 12, y - h * 0.5, 9, 4, -0.5 + w * 0.05, "#5fb34a", INK, 1.5); ell(ctx, x + 12, y - h * 0.7, 9, 4, 0.5, "#5fb34a", INK, 1.5);
      ell(ctx, x + w, y - h - 5, 9, 9, 0, col(e, "#f4c542"), INK, 2); ell(ctx, x + w, y - h - 5, 3, 3, 0, "#c24a2b");
      if (e.state === "sprout") { ctx.globalAlpha = 0.5; ell(ctx, x, y, 28, 11, 0, "#6b4a2b"); ctx.globalAlpha = 1; }
    }
  });

  KS.registerEnemy({
    id: "stumpling", name: "Stumpling", hp: 1200, speed: 70, r: 26, dmg: 18, xp: 40, tinsel: 0, mass: 6, spawnable: false, bossPart: true,
    noKnockback: true, color: "#8a5a2b",
    codex: { notes: TEXT.stumpling.notes, joke: TEXT.stumpling.joke, tip: TEXT.stumpling.tip },
    init: function (e) { e.state = "chase"; e.ai.hop = 0; },
    update: function (e, dt, run) { chase(e, e.speed, run.player); e.ai.hop += dt; },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y - Math.abs(Math.sin(e.ai.hop * 5)) * 5;
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath();
      for (var i = -2; i <= 2; i++) { ctx.moveTo(x + i * r * 0.3, y + r * 0.4); ctx.quadraticCurveTo(x + i * r * 0.6, y + r * 0.8, x + i * r * 0.8, y + r * 0.85); }
      ctx.stroke(); ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = 3; ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = col(e, "#8a5a2b"); ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.rect(x - r * 0.8, y - r * 0.6, r * 1.6, r * 1.1); ctx.fill(); ctx.stroke();
      ell(ctx, x, y - r * 0.6, r * 0.8, r * 0.3, 0, col(e, "#c79a5e"), INK, 2.5);
      ell(ctx, x, y - r * 0.6, r * 0.45, r * 0.15, 0, null, "#9b6a35", 1.5);
      ell(ctx, x - r * 0.3, y - r * 0.05, 4, 3, 0, "#fff3b0", INK, 1.5); ell(ctx, x + r * 0.3, y - r * 0.05, 4, 3, 0, "#fff3b0", INK, 1.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.25); ctx.lineTo(x - r * 0.12, y - r * 0.12); ctx.moveTo(x + r * 0.5, y - r * 0.25); ctx.lineTo(x + r * 0.12, y - r * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y + r * 0.45, r * 0.22, PI * 1.1, PI * 1.9); ctx.stroke();
    }
  });

  KS.registerEnemy({
    id: "minimimic", name: "Mini Mimic", hp: 40, speed: 95, r: 14, dmg: 12, xp: 0, tinsel: 0, mass: 1, spawnable: false, bossPart: true,
    noXp: true, color: "#c62d2d",
    codex: { notes: TEXT.minimimic.notes, joke: TEXT.minimimic.joke, tip: TEXT.minimimic.tip },
    init: function (e) { e.state = "chase"; e.ai.hop = 0; },
    update: function (e, dt, run) { chase(e, e.speed, run.player); e.ai.hop += dt; },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y - Math.abs(Math.sin(e.ai.hop * 9)) * 7, open = (Math.sin(e.ai.hop * 9) + 1) * 0.5;
      ctx.fillStyle = col(e, "#c62d2d"); ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.fillRect(x - r, y - r * 0.2, r * 2, r * 1.1); ctx.strokeRect(x - r, y - r * 0.2, r * 2, r * 1.1);
      ctx.fillStyle = "#fff6dc"; ctx.beginPath(); for (var i = -2; i <= 2; i++) { ctx.moveTo(x + i * r * 0.36 - 3, y - r * 0.2); ctx.lineTo(x + i * r * 0.36, y + r * 0.2); ctx.lineTo(x + i * r * 0.36 + 3, y - r * 0.2); } ctx.fill();
      ctx.save(); ctx.translate(x - r, y - r * 0.2); ctx.rotate(-open * 0.7);
      ctx.fillStyle = col(e, "#d6453a"); ctx.fillRect(0, -r * 0.5, r * 2, r * 0.5); ctx.strokeRect(0, -r * 0.5, r * 2, r * 0.5);
      ctx.fillStyle = "#f2e9c9"; ctx.fillRect(r - 2, -r * 0.5, 4, r * 0.5); ctx.restore();
      ell(ctx, x - 4, y + r * 0.2, 2, 2, 0, "#ffe066"); ell(ctx, x + 4, y + r * 0.2, 2, 2, 0, "#ffe066");
    }
  });

  // ---------------------------------------------------------------------------
  // B1 THE KUDZU KING
  // ---------------------------------------------------------------------------
  function plantPillars(e, run) {
    var b = run.bounds;
    for (var i = 0; i < 4; i++) {
      if (live(e, i)) continue;
      var a = i * PI / 2 + KS.rng.range(-0.3, 0.3);
      var px = clampB(run, e.x + Math.cos(a) * 200, b.x0, b.x1, 30), py = clampB(run, e.y + Math.sin(a) * 200, b.y0, b.y1, 30);
      var o = KS.spawnEnemy("vinepillar", px, py, { bossPart: true, parentUid: e.uid });
      if (o) { trk(e, i, o); KS.fx("leaves", px, py, "#5fb34a", 8, 4); }
    }
  }
  KS.registerBoss({
    id: "kudzuking", name: TEXT.kudzuking.name, title: TEXT.kudzuking.title, subtitle: TEXT.kudzuking.subtitle,
    hp: 3000, speed: 45, r: 50, dmg: 25, xp: 250, tinsel: 0, color: "#3f8f3a", phases: [1, 0.6, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.kudzuking.notes, joke: TEXT.kudzuking.joke, tip: TEXT.kudzuking.tip },
    init: function (e, run) {
      initCommon(e); e.state = "chase"; e.stateT = 0; e.ai.cd = 2.5; e.ai.nx = 0; e.ai.plT = 99; e.ai.aim = 0; e.speed = 45 * run.spdMul; e.baseSpeed = e.speed;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph);
      if (ph === 1) e.ai.plT = 1.5;
      if (ph === 2) { e.speed = 60 * run.spdMul; e.baseSpeed = e.speed; e.ai.nx = 1; }
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player; e.stateT += dt; a.barkT -= dt;
      if (e.state === "chase") {
        chase(e, e.speed, p); a.cd -= dt;
        if (a.cd <= 0) {
          e.stateT = 0; stopE(e);
          if (e.phase >= 2 && a.nx === 1) {
            e.state = "whip"; a.aim = Math.atan2(p.y - e.y, p.x - e.x); a.nx = 0;
            hz("b_sector", e.x, e.y, 1.0, 1.4, A(run, 30), 260, 0, 0, a.aim, 0, PI, 0, 0);
          } else {
            e.state = "slam"; if (e.phase >= 2) a.nx = 1;
            hz("b_ring", e.x, e.y, 1.0, 2.4, A(run, 20), 320, 0, 0, 0, 0, KS.rng.range(0, TAU), 60 * PI / 180, 320);
          }
          tone(run);
        }
      } else {
        stopE(e);
        if (e.stateT >= (e.state === "slam" ? 1.4 : 1.45)) { e.state = "chase"; e.stateT = 0; a.cd = e.phase >= 2 ? 4 : 6; }
      }
      if (e.phase >= 1) { a.plT -= dt; if (a.plT <= 0) { plantPillars(e, run); a.plT = 20; } }
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, lift = 0, raise = 0, f, i, a;
      if (e.state === "slam") {
        f = Math.min(1, e.stateT / 1.0);
        lift = e.stateT < 1 ? Math.sin(f * PI / 2) * 30 : Math.max(0, 30 * (1 - (e.stateT - 1) / 0.12));
        if (e.stateT < 1) { ctx.globalAlpha = 0.3; ell(ctx, x, e.y + r * 0.7, r * (1 + f * 0.7), r * 0.4 * (1 + f * 0.7), 0, INK); ctx.globalAlpha = 1; }
        raise = f;
      } else if (e.state === "whip") raise = Math.min(1, e.stateT) * (e.stateT < 1.2 ? 1 : 0.3);
      var y = e.y - lift, wob = Math.sin(t * 3 + e.uid) * 0.05, c1 = col(e, "#3f8f3a"), c2 = col(e, "#2f7a35");
      // arms
      ctx.lineCap = "round";
      for (i = -1; i <= 1; i += 2) {
        var hx = x + i * r * 1.05, hy = y + r * 0.2 - raise * r * 1.0 + Math.sin(t * 2 + i) * 3;
        ctx.strokeStyle = INK; ctx.lineWidth = r * 0.34; ctx.beginPath(); ctx.moveTo(x + i * r * 0.6, y + r * 0.1); ctx.quadraticCurveTo(x + i * r * 1.0, y + r * 0.5, hx, hy); ctx.stroke();
        ctx.strokeStyle = c2; ctx.lineWidth = r * 0.24; ctx.stroke();
        ell(ctx, hx, hy, r * 0.2, r * 0.2, 0, c1, INK, 2);
      }
      ctx.lineCap = "butt";
      for (i = 0; i < 12; i++) { a = i * TAU / 12 + t * 0.2 + wob; ell(ctx, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.76, r * 0.42, r * 0.26, a, (i & 1) ? c1 : c2, INK, 2); }
      ell(ctx, x, y, r * 0.88, r * 0.84, 0, col(e, "#2f6b2f"), INK, 3);
      ell(ctx, x - r * 0.2, y - r * 0.3, r * 0.4, r * 0.25, -0.4, "rgba(150,220,100,0.35)");
      ctx.strokeStyle = "rgba(20,50,20,0.7)"; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(x - r * 0.7, y + r * 0.3); ctx.quadraticCurveTo(x, y + r * 0.7, x + r * 0.7, y + r * 0.2); ctx.moveTo(x - r * 0.6, y + r * 0.6); ctx.quadraticCurveTo(x, y + r * 0.2, x + r * 0.6, y + r * 0.62); ctx.stroke();
      // crown crest
      ctx.fillStyle = col(e, "#8fd05a"); ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (i = -2; i <= 2; i++) {
        var cx = x + i * r * 0.24, cy = y - r * 0.78 + Math.abs(i) * r * 0.08, hh = r * (0.55 - Math.abs(i) * 0.08);
        ctx.beginPath(); ctx.moveTo(cx - r * 0.12, cy); ctx.lineTo(cx, cy - hh); ctx.lineTo(cx + r * 0.12, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
        ell(ctx, cx, cy - hh, 3.5, 3.5, 0, "#f4c542", INK, 1.5);
      }
      // eyes
      var fx = Math.cos(e.face) * 3, fy = Math.sin(e.face) * 3;
      for (i = -1; i <= 1; i += 2) {
        ell(ctx, x + i * r * 0.3, y - r * 0.1, r * 0.17, r * 0.13, i * 0.25, "#ffe45a", INK, 2);
        ell(ctx, x + i * r * 0.3 + fx, y - r * 0.1 + fy, r * 0.06, r * 0.1, 0, INK);
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.32); ctx.lineTo(x - r * 0.12, y - r * 0.2); ctx.moveTo(x + r * 0.5, y - r * 0.32); ctx.lineTo(x + r * 0.12, y - r * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + r * 0.25); for (i = 1; i <= 6; i++) ctx.lineTo(x - r * 0.3 + i * r * 0.1, y + r * (i & 1 ? 0.35 : 0.25)); ctx.stroke();
      drawBark(ctx, e, lift + 40);
    }
  });

  // ---------------------------------------------------------------------------
  // B2 OL' GRANDDADDY STUMP
  // ---------------------------------------------------------------------------
  function gdSplit(e, run) {
    var a = e.ai, share = Math.max(3, e.hp / 3);
    for (var i = 0; i < 3; i++) {
      var ang = i * TAU / 3 + 0.5, sx = e.x + Math.cos(ang) * 70, sy = e.y + Math.sin(ang) * 70;
      var s = KS.spawnEnemy("stumpling", sx, sy, { bossPart: true, parentUid: e.uid });
      if (s) { s.hp = share; s.maxHp = share; trk(e, i, s); a.sx[i] = sx; a.sy[i] = sy; a.dead[i] = 0; }
      else a.dead[i] = 1;
    }
    a.share = share; a.fd = -1; e.state = "split"; e.untargetable = true; e.noContact = true; e.stationary = true; e.noXp = true; e.tinsel = 0; e.invuln = false;
    stopE(e); e.segments = 3;
    KS.fx("burst", e.x, e.y, "#8a5a2b", 24, 6); KS.fx("leaves", e.x, e.y, "#5fb34a", 14, 5); KS.shake(6);
  }
  KS.registerBoss({
    id: "granddaddy", name: TEXT.granddaddy.name, title: TEXT.granddaddy.title, subtitle: TEXT.granddaddy.subtitle,
    hp: 3600, speed: 80, r: 46, dmg: 24, xp: 250, tinsel: 0, color: "#8a5a2b", phases: [1, 0.6, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.granddaddy.notes, joke: TEXT.granddaddy.joke, tip: TEXT.granddaddy.tip },
    init: function (e, run) {
      initCommon(e); var a = e.ai;
      a.bT = 3.5; a.crossT = 99; a.tx = 0; a.ty = 0; a.share = 0; a.fd = -1; e.segments = 1;
      if (!a.sx) { a.sx = new Float64Array(3); a.sy = new Float64Array(3); a.dead = new Uint8Array(3); }
      for (var i = 0; i < 3; i++) { a.sx[i] = 0; a.sy[i] = 0; a.dead[i] = 0; }
      e.state = "burrow"; e.stateT = 0; e.dmgTaken = 0.5; e.noContact = true; e.speed = 80 * run.spdMul; e.baseSpeed = e.speed;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph);
      if (ph === 1) e.ai.crossT = 3;
      if (ph === 2) { e.dmgTaken = 1; gdSplit(e, run); }
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, i; e.stateT += dt; a.barkT -= dt;
      if (e.state === "split") {
        var n = 0, sumHp = 0, cx = 0, cy = 0;
        for (i = 0; i < 3; i++) {
          if (live(e, i)) { var s = e.ai.ref[i]; n++; sumHp += s.hp; cx += s.x; cy += s.y; a.sx[i] = s.x; a.sy[i] = s.y; a.dead[i] = 0; }
          else a.dead[i] = 1;
        }
        if (n === 0) { killBoss(e); return; }
        e.hp = Math.max(1, sumHp); e.x = cx / n; e.y = cy / n; stopE(e);
        if (n < 3 && a.fd < 0) a.fd = 10;
        else if (n === 3) a.fd = -1;
        if (a.fd >= 0) {
          a.fd -= dt;
          if (a.fd <= 0) {
            for (i = 0; i < 3; i++) {
              if (!a.dead[i]) continue;
              var s2 = KS.spawnEnemy("stumpling", a.sx[i], a.sy[i], { bossPart: true, parentUid: e.uid });
              if (s2) { s2.hp = Math.max(2, a.share * 0.5); s2.maxHp = a.share; trk(e, i, s2); KS.fx("leaves", a.sx[i], a.sy[i], "#5fb34a", 10, 4); }
            }
            a.fd = -1;
          }
        }
        return;
      }
      if (e.phase >= 1) { a.crossT -= dt; if (a.crossT <= 0) {
        a.crossT = 7; var base = KS.rng.range(0, PI / 2);
        for (i = 0; i < 4; i++) { var an = base + i * PI / 2; hz("b_strip", e.x + Math.cos(an) * 200, e.y + Math.sin(an) * 200, 1.0, 1.4, A(run, 24), 120, 400, 36, an, 0, 0, 0, 0); }
        tone(run);
      } }
      if (e.state === "burrow") {
        chase(e, e.speed, p); a.bT -= dt;
        if (a.bT <= 0) {
          a.tx = p.x; a.ty = p.y; stopE(e); e.state = "crack"; e.stateT = 0;
          hz("b_blast", a.tx, a.ty, 0.9, 1.4, A(run, 28), 60, 0, 0, 0, 0, 0, 0, 0); tone(run);
        }
      } else if (e.state === "crack") {
        stopE(e);
        if (e.stateT >= 0.9) {
          e.x = a.tx; e.y = a.ty; e.state = "up"; e.stateT = 0; e.dmgTaken = 1; e.noContact = false;
          KS.fx("burst", e.x, e.y, "#8a5a2b", 16, 5); KS.shake(4);
        }
      } else {
        chase(e, 28 * run.spdMul, p);
        if (e.stateT >= 2.5) { e.state = "burrow"; e.stateT = 0; e.dmgTaken = 0.5; e.noContact = true; a.bT = 5; }
      }
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, i;
      if (e.state === "split") return;
      if (e.state === "burrow" || e.state === "crack") {
        for (i = 0; i < 3; i++) { var k = ((t * 0.8 + i / 3) % 1); ctx.globalAlpha = 1 - k; ell(ctx, x, y + 10, r * (0.7 + k * 0.9), r * (0.3 + k * 0.4), 0, null, "#6b4a2b", 3); }
        ctx.globalAlpha = 1;
        ell(ctx, x, y + 10, r * 0.75, r * 0.32, 0, col(e, "#6b4a2b"), INK, 2.5);
        ell(ctx, x - r * 0.25, y - 2, 5, 3.5, 0, "#fff3b0", INK, 1.5); ell(ctx, x + r * 0.25, y - 2, 5, 3.5, 0, "#fff3b0", INK, 1.5);
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - 9); ctx.lineTo(x - r * 0.1, y - 5); ctx.moveTo(x + r * 0.45, y - 9); ctx.lineTo(x + r * 0.1, y - 5); ctx.stroke();
        return;
      }
      var rise = e.state === "up" ? Math.min(1, 0.45 + e.stateT * 2.2) : 1;
      ctx.save(); ctx.translate(x, y + r * 0.6); ctx.scale(rise, rise); ctx.translate(-x, -(y + r * 0.6));
      ctx.lineCap = "round"; ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.beginPath();
      for (i = -3; i <= 3; i++) { ctx.moveTo(x + i * r * 0.22, y + r * 0.4); ctx.quadraticCurveTo(x + i * r * 0.55, y + r * 0.85, x + i * r * 0.85, y + r * 0.8); }
      ctx.stroke(); ctx.strokeStyle = col(e, "#6b4a2b"); ctx.lineWidth = 5; ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = col(e, "#8a5a2b"); ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - r * 0.85, y - r * 0.8); ctx.lineTo(x - r * 0.95, y + r * 0.5); ctx.lineTo(x + r * 0.95, y + r * 0.5); ctx.lineTo(x + r * 0.85, y - r * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(60,35,15,0.55)"; ctx.lineWidth = 2.5; ctx.beginPath();
      for (i = -3; i <= 3; i++) { ctx.moveTo(x + i * r * 0.26, y - r * 0.7); ctx.lineTo(x + i * r * 0.3, y + r * 0.45); }
      ctx.stroke();
      ell(ctx, x, y - r * 0.8, r * 0.85, r * 0.3, 0, col(e, "#c79a5e"), INK, 3);
      ell(ctx, x, y - r * 0.8, r * 0.55, r * 0.19, 0, null, "#9b6a35", 2); ell(ctx, x, y - r * 0.8, r * 0.25, r * 0.08, 0, null, "#9b6a35", 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + r * 0.3, y - r * 0.9); ctx.quadraticCurveTo(x + r * 0.45, y - r * 1.25, x + r * 0.65, y - r * 1.2); ctx.stroke();
      ell(ctx, x + r * 0.55, y - r * 1.17, 7, 3.5, -0.4, "#5fb34a", INK, 1.5);
      var ex = Math.cos(e.face) * 2, ey = Math.sin(e.face) * 2;
      ell(ctx, x - r * 0.32, y - r * 0.35, r * 0.17, r * 0.1, 0, "#fff3b0", INK, 2); ell(ctx, x + r * 0.32, y - r * 0.35, r * 0.17, r * 0.1, 0, "#fff3b0", INK, 2);
      ell(ctx, x - r * 0.32 + ex, y - r * 0.35 + ey, 3, 3, 0, INK); ell(ctx, x + r * 0.32 + ex, y - r * 0.35 + ey, 3, 3, 0, INK);
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - r * 0.62, y - r * 0.62); ctx.lineTo(x - r * 0.12, y - r * 0.42); ctx.moveTo(x + r * 0.62, y - r * 0.62); ctx.lineTo(x + r * 0.12, y - r * 0.42); ctx.stroke();
      ell(ctx, x, y - r * 0.12, r * 0.1, r * 0.14, 0, "#6b4a2b", INK, 2);
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + r * 0.32, r * 0.3, PI * 1.12, PI * 1.88); ctx.stroke();
      ctx.restore();
      drawBark(ctx, e, 20);
    }
  });

  // ---------------------------------------------------------------------------
  // B3 THE TANGLED TRANSFORMER
  // ---------------------------------------------------------------------------
  function lineArcs(e, run, corridor) {
    var p = run.player, b = run.bounds, i;
    if (corridor) {
      var cx = (b.x0 + b.x1) / 2, len = b.x1 - b.x0 + 100;
      for (i = 0; i < 3; i++) hz("b_strip", cx, p.y + (i - 1) * 170 + KS.rng.range(-30, 30), 1.0, 1.4, A(run, 22), 100, len, 40, 0, 1, 0, 0, 0);
    } else {
      var ang = KS.rng.range(0, PI), nx = -Math.sin(ang), ny = Math.cos(ang);
      for (i = 0; i < 3; i++) { var off = (i - 1) * 170 + KS.rng.range(-30, 30); hz("b_strip", p.x + nx * off, p.y + ny * off, 1.0, 1.4, A(run, 22), 100, 1800, 40, ang, 1, 0, 0, 0); }
    }
    tone(run);
  }
  function placePads(e, run) {
    var a = e.ai, p = run.player, b = run.bounds, i, j, tries;
    for (i = 0; i < 3; i++) {
      var px = 0, py = 0;
      for (tries = 0; tries < 8; tries++) {
        var an = KS.rng.range(0, TAU), di = i === 0 ? KS.rng.range(60, 180) : KS.rng.range(200, 400);
        px = clampB(run, p.x + Math.cos(an) * di, b.x0, b.x1, 60); py = clampB(run, p.y + Math.sin(an) * di, b.y0, b.y1, 60);
        var ok = true;
        for (j = 0; j < i; j++) { var dx = px - a.padX[j], dy = py - a.padY[j]; if (dx * dx + dy * dy < 130 * 130) ok = false; }
        if (ok) break;
      }
      a.padX[i] = px; a.padY[i] = py;
      trk(e, 3 + i, hz("b_pad", px, py, 0, 6, 0, 50, 0, 0, 0, 0, 0, 0, 0));
    }
  }
  function clearPads(e) { for (var i = 3; i < 6; i++) { if (live(e, i)) e.ai.ref[i].alive = false; trk(e, i, null); } }
  var DIG = ["", "ov1", "ov2", "ov3"];
  KS.registerBoss({
    id: "tangled", name: TEXT.tangled.name, title: TEXT.tangled.title, subtitle: TEXT.tangled.subtitle,
    hp: 4200, speed: 25, r: 44, dmg: 24, xp: 300, tinsel: 0, color: "#6fc8ff", phases: [1, 0.6, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.tangled.notes, joke: TEXT.tangled.joke, tip: TEXT.tangled.tip },
    init: function (e, run) {
      initCommon(e); var a = e.ai;
      a.arcT = 3; a.orbCd = 1; a.ovT = 99; a.tele = 0; a.dig = 0; a.hold = 0;
      if (!a.padX) { a.padX = new Float64Array(3); a.padY = new Float64Array(3); }
      for (var i = 0; i < 3; i++) { a.padX[i] = 0; a.padY[i] = 0; }
      e.state = "move"; e.stateT = 0;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph);
      if (ph === 1) e.ai.orbCd = 0.5;
      if (ph === 2) { e.ai.ovT = 0; e.ai.tele = 0; placePads(e, run); }
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player, b = run.bounds, i; e.stateT += dt; a.barkT -= dt;
      var corridor = run.mapDef && run.mapDef.corridor === "vertical";
      if (corridor) { var cx = (b.x0 + b.x1) / 2; e.vx = Math.max(-80, Math.min(80, (cx - e.x) * 2)); e.vy = p.y > e.y ? e.speed : -e.speed; if (Math.abs(p.y - e.y) < 4) e.vy = 0; e.face = Math.atan2(p.y - e.y, p.x - e.x); }
      else chase(e, e.speed, p);
      a.arcT -= dt;
      if (a.arcT <= 0 && !(a.tele > 0)) { a.arcT = 4; lineArcs(e, run, corridor); }
      if (e.phase >= 1) {
        a.orbCd -= dt;
        if (a.orbCd <= 0) {
          a.orbCd = 1;
          for (i = 0; i < 3; i++) {
            if (live(e, i)) continue;
            var an = KS.rng.range(0, TAU), q = KS.spawnEProj("orb", e.x, e.y, Math.cos(an) * 180, Math.sin(an) * 180, A(run, 15), 18, 12, e.uid, true);
            if (q) { q.color = "#6fc8ff"; trk(e, i, q); break; }
          }
        }
      }
      if (e.phase >= 2) {
        a.ovT += dt;
        if (a.ovT >= 3.5 && !(a.tele > 0)) { a.tele = 1.5; a.dig = 0; tone(run); }
        if (a.tele > 0) {
          a.tele -= dt;
          var dg = Math.ceil(Math.max(0, a.tele) / 0.5);
          if (dg !== a.dig && dg > 0) { a.dig = dg; KS.flash("#9fd8ff", 0.12); }
        }
        if (a.ovT >= 5) {
          a.ovT = 0; a.tele = 0; a.dig = 0;
          var inPad = false;
          for (i = 0; i < 3; i++) { var dx = p.x - a.padX[i], dy = p.y - a.padY[i]; if (dx * dx + dy * dy <= 50 * 50) inPad = true; }
          var ex = p.x - e.x, ey = p.y - e.y;
          KS.flash("#ffffff", 0.25); KS.shake(8); KS.fx("ring", e.x, e.y, "#9fd8ff", 1, 600);
          if (p.alive && !inPad && ex * ex + ey * ey <= 600 * 600) KS.hurtPlayer(A(run, 40), "boss", e.x, e.y);
          clearPads(e); placePads(e, run);
        }
      }
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, a = e.ai, i;
      if (a.tele > 0) {
        var fl = (Math.floor(t * 12) & 1) ? 0.9 : 0.5;
        ctx.beginPath(); ctx.arc(x, y, 600, 0, TAU); ctx.globalAlpha = 0.07 * fl; ctx.fillStyle = "#9fd8ff"; ctx.fill();
        ctx.globalAlpha = fl; ctx.strokeStyle = "#ff9a2e"; ctx.lineWidth = 4; ctx.setLineDash([24, 14]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      // pole
      ctx.fillStyle = col(e, "#6b4a2b"); ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.fillRect(x - r * 0.26, y - r * 1.9, r * 0.52, r * 2.6); ctx.strokeRect(x - r * 0.26, y - r * 1.9, r * 0.52, r * 2.6);
      ctx.strokeStyle = "rgba(42,31,26,0.4)"; ctx.lineWidth = 2; ctx.beginPath(); for (i = 0; i < 5; i++) { ctx.moveTo(x - r * 0.26, y - r * 1.6 + i * r * 0.5); ctx.lineTo(x + r * 0.26, y - r * 1.6 + i * r * 0.5 + 4); } ctx.stroke();
      // crossarm and insulators
      ctx.fillStyle = col(e, "#7a5a36"); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.fillRect(x - r * 0.95, y - r * 1.65, r * 1.9, r * 0.2); ctx.strokeRect(x - r * 0.95, y - r * 1.65, r * 1.9, r * 0.2);
      for (i = -1; i <= 1; i++) ell(ctx, x + i * r * 0.8, y - r * 1.78, 5, 8, 0, "#bfe6ff", INK, 2);
      // transformer can
      ctx.fillStyle = col(e, "#8b949e"); ctx.fillRect(x - r * 0.4, y - r * 1.2, r * 0.8, r * 0.85); ctx.strokeRect(x - r * 0.4, y - r * 1.2, r * 0.8, r * 0.85);
      ell(ctx, x, y - r * 1.2, r * 0.4, r * 0.12, 0, "#aab3bc", INK, 2.5);
      var bl = (Math.sin(t * 7) > 0);
      ell(ctx, x - r * 0.15, y - r * 0.85, 6, 6, 0, bl ? "#fff08a" : "#ffb02e", INK, 2); ell(ctx, x + r * 0.15, y - r * 0.85, 6, 6, 0, bl ? "#ffb02e" : "#fff08a", INK, 2);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 0.28, y - r * 1.0); ctx.lineTo(x - r * 0.05, y - r * 0.95); ctx.moveTo(x + r * 0.28, y - r * 1.0); ctx.lineTo(x + r * 0.05, y - r * 0.95); ctx.stroke();
      // light strands
      var cols = ["#e04a3a", "#4ac26a", "#f4c542", "#59b8ff"];
      for (var s = 0; s < 3; s++) {
        ctx.strokeStyle = "#1f3a22"; ctx.lineWidth = 2; ctx.beginPath();
        for (i = 0; i <= 12; i++) { var yy = y - r * 1.5 + i * r * 0.2, xx = x + Math.sin(i * 0.9 + s * 2.1) * r * 0.38; if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
        ctx.stroke();
        for (i = 0; i <= 12; i += 2) {
          var bx = x + Math.sin(i * 0.9 + s * 2.1) * r * 0.38, by = y - r * 1.5 + i * r * 0.2, lit = ((i + s + Math.floor(t * 4)) & 1);
          ell(ctx, bx, by + 3, 3.5, 4.5, 0, lit ? cols[(i + s) & 3] : "#4a4a4a", INK, 1);
        }
      }
      // sparks
      ctx.strokeStyle = "#e6f6ff"; ctx.lineWidth = 2; ctx.beginPath();
      for (i = 0; i < 3; i++) { var sx = x + (KS.frand() - 0.5) * r * 1.8, sy = y - r * 1.7 + KS.frand() * r * 0.4; ctx.moveTo(sx, sy); ctx.lineTo(sx + (KS.frand() - 0.5) * 14, sy - 6 - KS.frand() * 8); ctx.lineTo(sx + (KS.frand() - 0.5) * 18, sy - 14 - KS.frand() * 8); }
      ctx.stroke();
      if (a.tele > 0 && a.dig > 0) {
        var sp = KS.textSprite(DIG[a.dig], String(a.dig), "bold 44px Cinzel, serif", "#ffd24a");
        if (sp) { ctx.globalAlpha = 0.95; ctx.drawImage(sp, x - sp.width / 2, y - r * 2.7); ctx.globalAlpha = 1; }
      }
      drawBark(ctx, e, r * 1.1);
    }
  });

  // ---------------------------------------------------------------------------
  // B4 FERAL YARD INFLATABLE
  // ---------------------------------------------------------------------------
  var INF_R = [40, 52, 64], INF_S = [1, 1.3, 1.6];
  function infNext(e, run) {
    var a = e.ai;
    e.state = "hop"; e.stateT = 0; a.hx0 = e.x; a.hy0 = e.y;
    var b = run.bounds, p = run.player;
    a.hx1 = clampB(run, p.x, b.x0, b.x1, e.r); a.hy1 = clampB(run, p.y, b.y0, b.y1, e.r);
    hz("b_blast", a.hx1, a.hy1, 0.8, 1.3, A(run, 16), 70 * INF_S[e.phase], 0, 0, 0, 1, 0, 0, 0); tone(run);
  }
  KS.registerBoss({
    id: "inflatable", name: TEXT.inflatable.name, title: TEXT.inflatable.title, subtitle: TEXT.inflatable.subtitle,
    hp: 3800, speed: 0, r: 40, dmg: 22, xp: 300, tinsel: 0, color: "#c62d2d", phases: [1, 0.6, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.inflatable.notes, joke: TEXT.inflatable.joke, tip: TEXT.inflatable.tip },
    init: function (e, run) {
      initCommon(e); var a = e.ai;
      a.hx0 = e.x; a.hy0 = e.y; a.hx1 = e.x; a.hy1 = e.y; a.hornT = 99; a.brgT = 99; a.vs = 1; a.tvs = 1; a.cx = e.x; a.cy = e.y; a.dT = 0; a.hop = 0;
      e.state = "rest"; e.stateT = -2.2; e.r = INF_R[0]; e.flying = true;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph);
      var a = e.ai; e.state = "deflate"; e.stateT = 0; a.dT = 2; e.invuln = true; e.noContact = true; a.tvs = 0.45;
      if (ph === 1) a.hornT = 2; else a.brgT = 2;
      KS.fx("burst", e.x, e.y, "#efe2c4", 14, 5);
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player; e.stateT += dt; a.barkT -= dt;
      a.vs += (a.tvs - a.vs) * Math.min(1, dt * 6);
      a.cx += (e.x - a.cx) * Math.min(1, dt * 4); a.cy += (e.y - a.cy) * Math.min(1, dt * 4);
      var f = Math.atan2(p.y - e.y, p.x - e.x); e.face = f;
      if (e.phase >= 1) a.hornT -= dt;
      if (e.phase >= 2) a.brgT -= dt;
      if (e.state === "hop") {
        var k = Math.min(1, e.stateT / 0.8), s = k * k * (3 - 2 * k);
        e.x = a.hx0 + (a.hx1 - a.hx0) * s; e.y = a.hy0 + (a.hy1 - a.hy0) * s; stopE(e); a.hop = Math.sin(k * PI);
        if (k >= 1) { e.state = "rest"; e.stateT = 0; a.hop = 0; KS.shake(2); }
      } else if (e.state === "rest") {
        stopE(e);
        if (e.stateT >= 0.4) {
          if (e.phase >= 1 && a.hornT <= 0) {
            e.state = "horn"; e.stateT = 0; a.hornT = 5;
            hz("b_sector", e.x, e.y, 0.8, 1.2, A(run, 22), 300, 0, 0, f, 1, PI / 3, 0, 300); tone(run);
          } else if (e.phase >= 2 && a.brgT <= 0) {
            e.state = "barrage"; e.stateT = 0; a.brgT = 6;
            var m1 = KS.rng.int(0, 5), m2 = (m1 + KS.rng.int(1, 5)) % 6, b = run.bounds, a0 = KS.rng.range(0, TAU);
            for (var i = 0; i < 6; i++) {
              var an = a0 + i * PI / 3, gx = clampB(run, p.x + Math.cos(an) * 130, b.x0, b.x1, 40), gy = clampB(run, p.y + Math.sin(an) * 130, b.y0, b.y1, 40);
              hz("b_blast", gx, gy, 1.0, 1.4, A(run, 18), 40, 0, 0, 0, 2, (i === m1 || i === m2) ? 1 : 0, 0, 0);
            }
            tone(run);
          } else infNext(e, run);
        }
      } else if (e.state === "horn") {
        stopE(e); if (e.stateT >= 1.1) { e.state = "rest"; e.stateT = 0; }
      } else if (e.state === "barrage") {
        stopE(e); if (e.stateT >= 1.3) { e.state = "rest"; e.stateT = 0; }
      } else if (e.state === "deflate") {
        var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1; e.vx = dx / d * 18; e.vy = dy / d * 18;
        if (e.stateT >= 2) {
          e.invuln = false; e.noContact = false; e.r = INF_R[e.phase]; a.tvs = INF_S[e.phase]; a.vs = 0.6;
          e.state = "rest"; e.stateT = 0; stopE(e); KS.fx("ring", e.x, e.y, "#efe2c4", 1, e.r * 1.4); KS.shake(3);
        }
      }
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var a = e.ai, s = a.vs * (e.r / (INF_R[e.phase] || 40)) * (INF_R[e.phase] || 40) / 40, hop = a.hop * 55 * s, i;
      var defl = e.state === "deflate", x = e.x, y = e.y - hop;
      var sq = defl ? 0.5 : 1 + Math.sin(t * 9 + e.uid) * 0.025;
      // cable
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, e.y + 20 * s); ctx.quadraticCurveTo((x + a.cx) / 2, e.y + 55 * s, a.cx, a.cy + 30 * s); ctx.stroke();
      ctx.strokeStyle = "#e8e0c8"; ctx.lineWidth = 2.5; ctx.stroke();
      ell(ctx, a.cx, a.cy + 30 * s, 6, 4, 0, "#e8e0c8", INK, 2);
      if (hop > 2) { ctx.globalAlpha = 0.3; ell(ctx, x, e.y + 34 * s, 28 * s, 9 * s, 0, INK); ctx.globalAlpha = 1; }
      ctx.save(); ctx.translate(x, y + 34 * s); ctx.scale(s * (defl ? 1.25 : 1), s * sq); ctx.translate(0, -34);
      var red = col(e, defl ? "#e07a7a" : "#c62d2d"), white = col(e, "#f6f0dc");
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ell(ctx, -14, 32, 11, 6, 0, "#2a1f1a"); ell(ctx, 14, 32, 11, 6, 0, "#2a1f1a");
      ell(ctx, -32, 6, 12, 18, 0.35, red, INK, 3); ell(ctx, 32, 6, 12, 18, -0.35, red, INK, 3);
      ell(ctx, -36, 20, 8, 8, 0, white, INK, 2.5); ell(ctx, 36, 20, 8, 8, 0, white, INK, 2.5);
      ell(ctx, 0, 6, 30, 31, 0, red, INK, 3.5);
      ctx.fillStyle = white; ctx.fillRect(-5, -22, 10, 52);
      ctx.fillStyle = "#2a1f1a"; ctx.fillRect(-29, 12, 58, 8); ctx.fillStyle = "#f4c542"; ctx.fillRect(-6, 11, 12, 10);
      ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(-22, -10 + Math.sin(t * 3) * 2); ctx.quadraticCurveTo(-26, 4, -22, 22); ctx.moveTo(22, -10 + Math.sin(t * 3 + 1) * 2); ctx.quadraticCurveTo(26, 4, 22, 22); ctx.stroke();
      ell(ctx, 0, -22, 16, 14, 0, col(e, "#f2c9a0"), INK, 3);
      ell(ctx, 0, -13, 17, 11, 0, white, INK, 2.5);
      ell(ctx, -6, -24, 2.6, 3, 0, INK); ell(ctx, 6, -24, 2.6, 3, 0, INK); ell(ctx, 0, -19, 3.5, 3, 0, "#e8806a", INK, 1.5);
      ctx.save(); if (defl) { ctx.translate(14, -34); ctx.rotate(0.9); ctx.translate(-14, 34); }
      ctx.fillStyle = red; ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, -30); ctx.lineTo(16, -30); ctx.quadraticCurveTo(18, -46, 14, -58); ctx.quadraticCurveTo(-4, -52, -16, -30); ctx.fill(); ctx.stroke();
      ell(ctx, 0, -30, 19, 6, 0, white, INK, 2.5); ell(ctx, 14, -58, 6, 6, 0, white, INK, 2.5);
      ctx.restore();
      ctx.restore();
      drawBark(ctx, e, 70 * s);
    }
  });

  // ---------------------------------------------------------------------------
  // B5 THE BRIAR MATRIARCH  +  spiral emitter shared with the Eternal
  // ---------------------------------------------------------------------------
  // st is the emitter record {cyc, rot, fire} (stored in boss.ai); returns nothing.
  function spiral(e, run, dt, arms, rate, slow) {
    var a = e.ai; a.cyc += dt / slow;
    if (a.cyc >= 5) a.cyc -= 5;
    if (a.cyc >= 3) { a.on = 0; return; }
    a.on = 1; a.rot += 0.6981 * dt; a.fire -= dt;
    if (a.fire <= 0) {
      a.fire += 0.3 * slow / rate;
      var dmg = A(run, 10), n = arms, rr = e.r * 0.9;
      for (var k = 0; k < n; k++) {
        var an = a.rot + k * TAU / n, c = Math.cos(an), s = Math.sin(an);
        KS.spawnEProj("thorn", e.x + c * rr, e.y + s * rr, c * 160, s * 160, dmg, 7, 2.5, e.uid, true);
      }
    }
  }
  KS.registerBoss({
    id: "matriarch", name: TEXT.matriarch.name, title: TEXT.matriarch.title, subtitle: TEXT.matriarch.subtitle,
    hp: 4800, speed: 22, r: 48, dmg: 26, xp: 350, tinsel: 0, color: "#a82a2a", phases: [1, 0.6, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.matriarch.notes, joke: TEXT.matriarch.joke, tip: TEXT.matriarch.tip },
    init: function (e, run) {
      initCommon(e); var a = e.ai;
      a.arms = 8; a.cyc = 2.5; a.rot = 0; a.fire = 0; a.on = 0; a.wallT = 99; a.sumT = 99; a.enr = 0;
      e.state = "move"; e.stateT = 0;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph); var a = e.ai;
      if (ph === 1) { a.arms = 6; a.wallT = 0.5; }
      if (ph === 2) { a.arms = 8; a.enr = 1; a.sumT = 1.5; }
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player; e.stateT += dt; a.barkT -= dt;
      chase(e, e.speed, p);
      spiral(e, run, dt, a.arms, a.enr ? 1.3 : 1, 1);
      if (e.phase >= 1) {
        a.wallT -= dt;
        if (a.wallT <= 0) {
          a.wallT = 35;
          if (live(e, 0)) e.ai.ref[0].alive = false;
          trk(e, 0, hz("b_wall", p.x, p.y, 1.5, 21.5, A(run, 10), 420, 0, 0, 0, 0, 380, 0, 0)); tone(run);
        }
      }
      if (e.phase >= 2) {
        a.sumT -= dt;
        if (a.sumT <= 0) {
          a.sumT = 15;
          for (var i = 0; i < 2; i++) {
            var an = KS.rng.range(0, TAU), af = KS.rng.chance(0.5) ? "thorny" : "overtimed";
            KS.spawnEnemy("briar", e.x + Math.cos(an) * (e.r + 40), e.y + Math.sin(an) * (e.r + 40), { elite: true, affixes: [af] });
          }
          KS.fx("leaves", e.x, e.y, "#a82a2a", 14, 5);
        }
      }
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, a = e.ai, i, an;
      ctx.lineCap = "round";
      for (i = 0; i < 14; i++) {
        an = i * TAU / 14 + Math.sin(t * 0.7 + i) * 0.05; var c = Math.cos(an), s = Math.sin(an), l = r * (1.12 + (i % 3) * 0.1);
        ctx.strokeStyle = INK; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + c * l * 0.5 - s * 10, y + s * l * 0.5 + c * 10, x + c * l, y + s * l); ctx.stroke();
        ctx.strokeStyle = col(e, "#3d6b34"); ctx.lineWidth = 6; ctx.stroke();
      }
      ctx.lineCap = "butt";
      ctx.fillStyle = "#a82a2a"; ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
      for (i = 0; i < 20; i++) {
        an = i * TAU / 20 + 0.1; var c2 = Math.cos(an), s2 = Math.sin(an), rr = r * (0.95 + (i % 2) * 0.12);
        ctx.moveTo(x + c2 * rr - s2 * 5, y + s2 * rr + c2 * 5); ctx.lineTo(x + c2 * (rr + 13), y + s2 * (rr + 13)); ctx.lineTo(x + c2 * rr + s2 * 5, y + s2 * rr - c2 * 5);
      }
      ctx.fill(); ctx.stroke();
      ell(ctx, x, y, r * 0.88, r * 0.84, 0, col(e, "#2d4a2a"), INK, 3.5);
      ell(ctx, x - r * 0.2, y - r * 0.25, r * 0.4, r * 0.22, -0.4, "rgba(120,180,90,0.25)");
      // spiral nozzles
      for (i = 0; i < a.arms; i++) {
        an = a.rot + i * TAU / a.arms; ell(ctx, x + Math.cos(an) * r * 0.9, y + Math.sin(an) * r * 0.9, 6, 6, 0, a.on ? "#ffcf5a" : "#6b7a4a", INK, 2);
      }
      ell(ctx, x - r * 0.28, y + r * 0.1, 7, 4, 0.2, "#ffe45a", INK, 1.5); ell(ctx, x + r * 0.28, y + r * 0.1, 7, 4, -0.2, "#ffe45a", INK, 1.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - r * 0.4, y - r * 0.02); ctx.lineTo(x - r * 0.12, y + r * 0.06); ctx.moveTo(x + r * 0.4, y - r * 0.02); ctx.lineTo(x + r * 0.12, y + r * 0.06); ctx.stroke();
      // rose crown
      var ry = y - r * 0.62;
      ctx.fillStyle = "#3f8f3a"; ctx.lineWidth = 2;
      for (i = 0; i < 5; i++) { an = -PI / 2 + (i - 2) * 0.6; ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + Math.cos(an - 0.2) * r * 0.55, ry + Math.sin(an - 0.2) * r * 0.5); ctx.lineTo(x + Math.cos(an + 0.2) * r * 0.55, ry + Math.sin(an + 0.2) * r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      var rc = ["#8e1c1c", "#b3261e", "#d6453a", "#e8654f"];
      for (i = 0; i < 4; i++) ell(ctx, x, ry, r * (0.36 - i * 0.07), r * (0.3 - i * 0.06), 0, col(e, rc[i]), INK, 2);
      ctx.strokeStyle = "rgba(60,10,10,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, ry, r * 0.1, 0.5, 4.8); ctx.arc(x, ry, r * 0.2, 2.5, 6.9); ctx.stroke();
      drawBark(ctx, e, r * 0.9);
    }
  });

  // ---------------------------------------------------------------------------
  // B6 THE OVERGROWTH ETERNAL
  // attacks: 0 slam rings, 1 root cross, 2 line arcs (random lanes), 3 thorn spiral
  // ---------------------------------------------------------------------------
  var ET_PERIOD = [6, 7, 4];
  function etAttack(e, run, id) {
    var p = run.player, i, an;
    if (id === 0) hz("b_ring", e.x, e.y, 1.0, 2.4, A(run, 20), 320, 0, 0, 0, 0, KS.rng.range(0, TAU), 60 * PI / 180, 320);
    else if (id === 1) { var base = KS.rng.range(0, PI / 2); for (i = 0; i < 4; i++) { an = base + i * PI / 2; hz("b_strip", e.x + Math.cos(an) * 200, e.y + Math.sin(an) * 200, 1.0, 1.4, A(run, 24), 120, 400, 36, an, 0, 0, 0, 0); } }
    else if (id === 2) { for (i = 0; i < 3; i++) { an = KS.rng.range(0, PI); hz("b_strip", p.x + KS.rng.range(-110, 110), p.y + KS.rng.range(-110, 110), 1.0, 1.4, A(run, 22), 100, 1800, 40, an, 1, 0, 0, 0); } }
    tone(run);
  }
  function etStep(e, run, dt, id, slow) {
    var a = e.ai;
    if (id === 3) { spiral(e, run, dt, 8, 1, slow); return; }
    a.tm[id] -= dt;
    if (a.tm[id] <= 0) { a.tm[id] = ET_PERIOD[id] * slow; etAttack(e, run, id); }
  }
  KS.registerBoss({
    id: "eternal", name: TEXT.eternal.name, title: TEXT.eternal.title, subtitle: TEXT.eternal.subtitle,
    hp: 9000, speed: 32, r: 60, dmg: 30, xp: 600, tinsel: 0, color: "#2f5d2b", phases: [1, 0.75, 0.5, 0.25], music: "boss", noKnockback: true,
    codex: { notes: TEXT.eternal.notes, joke: TEXT.eternal.joke, tip: TEXT.eternal.tip },
    init: function (e, run) {
      initCommon(e); var a = e.ai;
      if (!a.order) { a.order = [0, 1, 2, 3]; a.tm = [0, 0, 0, 0]; }
      a.order[0] = 0; a.order[1] = 1; a.order[2] = 2; a.order[3] = 3; KS.rng.shuffle(a.order);
      a.tm[0] = 3; a.tm[1] = 3; a.tm[2] = 3; a.tm[3] = 3;
      a.cyc = 2.5; a.rot = 0; a.fire = 0; a.on = 0; a.wrap = 0; a.wrapT = 0; a.w1 = 0; a.w2 = 0;
      e.state = "roll"; e.stateT = 0;
    },
    onPhase: function (e, ph, run) {
      setBark(e, ph); var a = e.ai; a.tm[0] = 2.5; a.tm[1] = 2.5; a.tm[2] = 2.5; a.cyc = 2.5; a.fire = 0;
    },
    update: function (e, dt, run) {
      var a = e.ai, p = run.player; e.stateT += dt; a.barkT -= dt;
      if (!a.wrap && e.hp <= e.maxHp * 0.1) {
        a.wrap = 1; a.wrapT = 45; e.invuln = true; e.stationary = true; stopE(e);
        a.w1 = KS.rng.int(0, 3); a.w2 = (a.w1 + KS.rng.int(1, 3)) % 4; a.tm[0] = 3; a.tm[1] = 3; a.tm[2] = 3; a.cyc = 2.5; a.fire = 0;
        var b = run.bounds;
        trk(e, 0, hz("b_ivy", (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0, 46, A(run, 15), 100000, 0, 0, 0, 0, 700, 150, 45));
        KS.flash("#2f7a35", 0.4); KS.shake(8); KS.sfx("telegraph");
      }
      if (a.wrap) {
        stopE(e); a.wrapT -= dt;
        etStep(e, run, dt, a.w1, 2); if (a.w2 !== a.w1) etStep(e, run, dt, a.w2, 2);
        if (a.wrapT <= 0) killBoss(e);
        return;
      }
      chase(e, e.speed, p);
      etStep(e, run, dt, a.order[Math.min(e.phase, 3)], 1);
    },
    onDeath: function (e) { finish(e); },
    draw: function (ctx, e, t) {
      var r = e.r, x = e.x, y = e.y, a = e.ai, i, an, rot = t * 0.35;
      var lc = ["#e04a3a", "#4ac26a", "#f4c542", "#59b8ff"];
      ell(ctx, x, y, r * 0.95, r * 0.9, 0, col(e, "#2f5d2b"), INK, 4);
      for (i = 0; i < 18; i++) {
        an = rot + i * TAU / 18; var rr = r * (0.72 + 0.2 * Math.sin(i * 1.7)), px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * 0.95, ty = i & 3;
        if (ty === 0) { ell(ctx, px, py, r * 0.3, r * 0.17, an, col(e, "#5fb34a"), INK, 2); ctx.strokeStyle = "#2f7a35"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px - Math.cos(an) * r * 0.25, py - Math.sin(an) * r * 0.25); ctx.lineTo(px + Math.cos(an) * r * 0.25, py + Math.sin(an) * r * 0.25); ctx.stroke(); }
        else if (ty === 1) { ell(ctx, px, py, r * 0.22, r * 0.2, an, col(e, "#1f5a2c"), INK, 2); ell(ctx, px + 4, py - 3, 3.5, 3.5, 0, "#d6453a", INK, 1); ell(ctx, px - 4, py + 3, 3.5, 3.5, 0, "#d6453a", INK, 1); }
        else if (ty === 2) { ctx.fillStyle = col(e, "#7d2a1d"); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); for (var k = 0; k < 5; k++) { var ka = an + k * 1.26; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ka) * r * 0.28, py + Math.sin(ka) * r * 0.28); ctx.lineTo(px + Math.cos(ka + 0.4) * r * 0.12, py + Math.sin(ka + 0.4) * r * 0.12); } ctx.fill(); ctx.stroke(); }
        else { ell(ctx, px, py, 5, 6, 0, ((i + Math.floor(t * 4)) & 1) ? lc[(i >> 2) & 3] : "#4a4a4a", INK, 1.5); }
      }
      ell(ctx, x, y, r * 0.45, r * 0.4, 0, col(e, "#22421f"), INK, 3);
      var fx = Math.cos(e.face) * 3, fy = Math.sin(e.face) * 3;
      for (i = -1; i <= 1; i += 2) { ell(ctx, x + i * r * 0.17, y - r * 0.04, r * 0.12, r * 0.14, 0, "#ffe45a", INK, 2); ell(ctx, x + i * r * 0.17 + fx, y - r * 0.04 + fy, 3.5, 5, 0, "#b3261e"); }
      if (a.wrap) {
        ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = 10; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x, y, r * 0.98, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r * 1.08, -PI / 2, -PI / 2 + TAU * (a.wrapT / 45)); ctx.stroke();
        ctx.strokeStyle = "#f4c542"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, r * 1.08, -PI / 2, -PI / 2 + TAU * (a.wrapT / 45)); ctx.stroke();
        var sp = KS.textSprite("et:wrap", TEXT.wrap, "bold 20px Cinzel, serif", "#f4c542");
        if (sp) { ctx.fillStyle = "rgba(42,31,26,0.85)"; ctx.fillRect(x - sp.width / 2 - 8, y - r - 44, sp.width + 16, sp.height + 6); ctx.drawImage(sp, x - sp.width / 2, y - r - 41); }
      }
      drawBark(ctx, e, 12);
    }
  });

})(window.KS);
