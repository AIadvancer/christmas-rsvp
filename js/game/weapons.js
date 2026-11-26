/* Kudzu Survivors v2 - weapons.js (ENG-WEAP): the 16 base weapons (DESIGN 4.4 - 4.5).
 * Owns: weapon defs, hazards w_grinder / w_burnpile, buff "catch". Evolutions/fusions live in weapons_evo.js. */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT (all player-facing strings for review)
  // ---------------------------------------------------------------------------
  var TEXT = {
    cane:      { name: "Candy Cane Javelin", desc: "Hurls a candy cane straight through the brush. Sweet, sticky and fully OSHA-adjacent.", ms: "On its first hit, a cane splits into two half-canes." },
    mulcher:   { name: "Mulcher Head", desc: "A toothed ring that chews up everything within reach. Please keep lunches out of the radius.", ms: "Every 4 seconds a pulse hits for double and shoves enemies back." },
    saws:      { name: "Orbiting Saw Blades", desc: "Saw blades circle you on a short leash. The safety committee has been notified.", ms: "The orbit reverses direction every 3 seconds." },
    bombs:     { name: "Ornament Bombs", desc: "Lobbed glass baubles that go off with a bang. Handle with festive care.", ms: "Each blast scatters four shards that pop into mini blasts." },
    snow:      { name: "Snowball Flurry", desc: "A fan of snowballs aimed at the nearest vine. Chills whatever it touches.", ms: "Enough chill in a row freezes the target solid." },
    stampede:  { name: "Reindeer Stampede", desc: "A herd of reindeer crosses the job site at speed. They have the right of way.", ms: "The herd turns around and crosses back for a second pass." },
    grinder:   { name: "Stump Grinder", desc: "Leaves spinning grinder disks wherever you have been standing. Stump removal, on the go.", ms: "Disks last twice as long." },
    polesaw:   { name: "Pole Saw", desc: "A wide sweeping cut for limbs and overgrowth. Reach is a safety feature.", ms: "A second sweep goes out behind you." },
    chipper:   { name: "Wood Chipper Cannon", desc: "Feeds on nearby casualties and spits the chips back out. The more mess, the more ammo.", ms: "" },
    fruitcake: { name: "Fruitcake Boomerang", desc: "Dense enough to be structural. Comes back every time, unlike most gifts.", ms: "Catching it gives +20% might for 3 seconds." },
    burnpile:  { name: "Burn Pile", desc: "Drops brush fires on the thickest patch of growth. Permit is pending.", ms: "Burning enemies pass the fire to a neighbour." },
    bells:     { name: "Sleigh Bell Ricochet", desc: "A jingle bell that ricochets from one vine to the next, a little higher each time.", ms: "The final bounce stuns for 0.8 seconds." },
    drone:     { name: "Radio Drone", desc: "A little hovering unit that zaps what it spots. Dispatch calls it 'handsfree'.", ms: "Bolts chain to one more enemy nearby." },
    blower:    { name: "Leaf Blower", desc: "A steady cone of wind that pushes the crowd back and chills it. Very loud, very effective.", ms: "Every 3 seconds a Gust wave rolls out along the cone." },
    lash:      { name: "String-Light Lash", desc: "A strand of holiday lights that arcs from vine to vine. Do not plug into a damp extension cord.", ms: "Hits apply shock: the next damage taken is boosted." },
    timber:    { name: "Timber!", desc: "Fells a pine on top of the crowd. Yelling the name is mandatory.", ms: "Pinecones roll out where the tree lands." },
    pea:       "Candy Cane"
  };
  var L = { dmg: "Damage", cd: "Cooldown", count: "Count", pierce: "Pierce", radius: "Radius", tick: "Tick damage", reach: "Reach", pellets: "Pellets",
    maxAmmo: "Max ammo", burnDps: "Burn / s", bounces: "Bounces", drones: "Drones", len: "Length", angle: "Cone angle", jumps: "Chain jumps", spin: "Spin", dur: "Duration", interval: "Interval" };

  // ---------------------------------------------------------------------------
  // helpers
  // ---------------------------------------------------------------------------
  var TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, atan2 = Math.atan2, sqrt = Math.sqrt, PI = Math.PI, min = Math.min, max = Math.max;
  var Q = new Array(256), Q2 = new Array(128), DP = { x: 0, y: 0, n: 0 };

  function tbl(keys, rows, extra) {
    var out = [], i, j, k, o;
    for (i = 0; i < rows.length; i++) {
      o = {};
      for (j = 0; j < keys.length; j++) o[keys[j]] = rows[i][j];
      if (extra) for (k in extra) o[k] = extra[k];
      out.push(o);
    }
    return out;
  }
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
  function hasSlot(w) { return w && w.slot >= 0; }

  // ---------------------------------------------------------------------------
  // Buff "catch" (Fruitcake milestone): +20% might for 3 s
  // ---------------------------------------------------------------------------
  KS.registerBuff({ id: "catch", name: "Good Catch", stats: function (S) { S.might *= 1.2; } });

  // ---------------------------------------------------------------------------
  // W1 Candy Cane Javelin
  // ---------------------------------------------------------------------------
  var CANE = {
    id: "cane", name: TEXT.cane.name, icon: "🍭", tag: "blade", desc: TEXT.cane.desc, milestone: TEXT.cane.ms,
    levels: tbl(["dmg", "cd", "count", "pierce"], [[12, 0.85, 1, 2], [15, 0.85, 1, 2], [15, 0.8, 2, 2], [18, 0.8, 2, 2], [21, 0.75, 2, 3], [21, 0.7, 3, 3], [25, 0.7, 3, 3], [30, 0.65, 3, 4]], { speed: 520, life: 1.2 }),
    labels: { dmg: L.dmg, cd: L.cd, count: L.count, pierce: L.pierce },
    partner: "file", evolvesTo: "cane_evo", unlock: null, procCoef: 1,
    init: function (w) { w.cd = 0.2; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, base = aimAt(p, 520), n = Math.max(1, Math.round(KS.wstat(w, "count")));
      var dmg = KS.wstat(w, "dmg"), pr = Math.round(KS.wstat(w, "pierce")), spd = KS.wstat(w, "speed"), life = KS.wstat(w, "life"), ms = w.level >= 4 ? 1 : 0;
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * 0.1396;
        var q = KS.spawnProj(CANE, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 7; q.dmg = dmg; q.pierce = pr; q.life = life; q.kb = 90; q.data.ms = ms; q.data.ch = 0;
      }
      KS.sfx("throw");
    },
    projHit: function (p, e, run) {
      if (p.data.ms === 1 && p.data.ch === 0 && p.hitN === 0) {
        for (var s = -1; s <= 1; s += 2) {
          var a = p.ang + s * 0.4363, q = KS.spawnProj(CANE, p.slot, p.x, p.y, cos(a) * 480, sin(a) * 480, null);
          if (!q) break;
          q.r = 5; q.dmg = p.dmg * 0.5; q.pierce = 1; q.life = 0.7; q.kb = 50; q.procCoef = 0.5; q.data.ms = 0; q.data.ch = 1;
          q.hitUids[0] = e.uid; q.hitN = 1;
        }
      }
      return true;
    },
    projDraw: function (ctx, p) {
      var ch = p.data.ch === 1, sc = ch ? 0.7 : 1, i;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * (ch ? 15 : 11)); ctx.scale(sc, sc); ctx.globalAlpha = 1;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#f4ecd8"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(9, 0); ctx.arc(9, -5, 5, PI * 0.5, -PI * 0.9, true); ctx.stroke();
      ctx.strokeStyle = "#b3261e"; ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (i = 0; i < 4; i++) { ctx.moveTo(-14 + i * 6, 2); ctx.lineTo(-11 + i * 6, -2); }
      ctx.stroke();
      ctx.restore();
    }
  };
  KS.registerWeapon(CANE);

  // ---------------------------------------------------------------------------
  // W2 Mulcher Head
  // ---------------------------------------------------------------------------
  var MUL_SRC = mkSrc("blade", 0.5);
  var MULCHER = {
    id: "mulcher", name: TEXT.mulcher.name, icon: "⚙️", tag: "blade", desc: TEXT.mulcher.desc, milestone: TEXT.mulcher.ms,
    levels: tbl(["radius", "tick"], [[55, 5], [62, 6], [70, 7], [70, 8], [78, 9], [86, 11], [94, 12], [104, 14]], { interval: 0.5 }),
    labels: { radius: L.radius, tick: L.tick },
    partner: "bar", evolvesTo: "mulcher_evo", unlock: null, procCoef: 0.5,
    init: function (w) { var s = w.state; s.tickT = 0.3; s.pulseT = 4; s.rot = 0; s.fx = 0; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      s.rot += dt * 3.2; if (s.fx > 0) s.fx -= dt;
      var ms = w.level >= 4; if (ms) s.pulseT -= dt;
      s.tickT -= dt; if (s.tickT > 0) return;
      s.tickT += KS.wstat(w, "interval");
      var R = KS.wstat(w, "radius"), dmg = KS.wstat(w, "tick"), pulse = ms && s.pulseT <= 0, mult = 1, kb = 0;
      if (pulse) { s.pulseT = 4; mult = 2; kb = 260; s.fx = 0.3; KS.fx("ring", p.x, p.y, "#c9993b", 1, R); KS.shake(1.5); }
      var n = KS.grid.query(p.x, p.y, R, Q, 256);
      for (var i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        setSrc(MUL_SRC, w, p.x, p.y, kb, e.x - p.x, e.y - p.y, 0.5, true);
        KS.damage(e, dmg * mult, MUL_SRC);
      }
      if (n > 0) KS.fx("chips", p.x + cos(s.rot * 2) * R * 0.8, p.y + sin(s.rot * 2) * R * 0.8, "#8a5a2b", 2, 2);
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, R = KS.wstat(w, "radius");
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.16; ctx.fillStyle = "#c9993b"; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#8a6a22"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.9; drawTeeth(ctx, 0, 0, R - 6, R + 4, 14, s.rot, "#c9993b");
      ctx.globalAlpha = 0.35; ctx.strokeStyle = "#efe2c4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * 0.55, s.rot, s.rot + 2.2); ctx.stroke();
      if (s.fx > 0) { ctx.globalAlpha = s.fx * 2.5; ctx.strokeStyle = "#fff6d8"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, R * (1 + (0.3 - s.fx) * 2), 0, TAU); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1;
    },
    projDraw: function () { }
  };
  KS.registerWeapon(MULCHER);

  // ---------------------------------------------------------------------------
  // W3 Orbiting Saw Blades
  // ---------------------------------------------------------------------------
  var SAW_SRC = mkSrc("blade", 1);
  var SAW_MAX = 12, SAW_RING = 16;
  var SAWS = {
    id: "saws", name: TEXT.saws.name, icon: "🪚", tag: "blade", desc: TEXT.saws.desc, milestone: TEXT.saws.ms,
    levels: tbl(["count", "dmg", "spin"], [[2, 9, 3.0], [2, 11, 3.2], [3, 11, 3.2], [3, 13, 3.4], [3, 15, 3.6], [4, 15, 3.8], [4, 18, 4.0], [5, 21, 4.2]], { orbit: 70 }),
    labels: { count: L.count, dmg: L.dmg, spin: L.spin },
    partner: "overtime", evolvesTo: "saws_evo", unlock: null, procCoef: 1,
    init: function (w) {
      var s = w.state;
      s.ang = 0; s.dir = 1; s.revT = 3; s.n = 0;
      s.bx = new Float32Array(SAW_MAX); s.by = new Float32Array(SAW_MAX);
      s.ru = new Int32Array(SAW_MAX * SAW_RING); s.rt = new Float32Array(SAW_MAX * SAW_RING);
    },
    onStageStart: function (w) { var s = w.state; if (s.ru) { s.ru.fill(0); s.rt.fill(-99); } },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (!s.ru) SAWS.init(w);
      var n = max(1, min(SAW_MAX, Math.round(KS.wstat(w, "count")))), orbit = KS.wstat(w, "orbit"), spin = KS.wstat(w, "spin"), dmg = KS.wstat(w, "dmg");
      s.n = n;
      if (w.level >= 4) { s.revT -= dt; if (s.revT <= 0) { s.revT = 3; s.dir = -s.dir; } }
      s.ang += s.dir * spin * dt;
      var now = run.time, slot = w.slot, i, j, k, base, found, e, cnt, hit;
      for (i = 0; i < n; i++) {
        var a = s.ang + i * TAU / n, bx = p.x + cos(a) * orbit, by = p.y + sin(a) * orbit;
        s.bx[i] = bx; s.by[i] = by;
        cnt = KS.grid.query(bx, by, 12, Q, 128);
        base = i * SAW_RING;
        for (k = 0; k < cnt; k++) {
          e = Q[k]; if (!e.alive) continue;
          if (now - e.hitStamp[slot] < 0.15) continue;
          hit = false; found = -1;
          for (j = 0; j < SAW_RING; j++) {
            if (s.ru[base + j] === e.uid) { found = j; if (now - s.rt[base + j] < 0.4) hit = true; break; }
          }
          if (hit) continue;
          if (found < 0) {
            var oldest = 0, ot = 1e9;
            for (j = 0; j < SAW_RING; j++) { if (s.rt[base + j] < ot) { ot = s.rt[base + j]; oldest = j; } }
            found = oldest;
          }
          s.ru[base + found] = e.uid; s.rt[base + found] = now;
          setSrc(SAW_SRC, w, bx, by, 60, -sin(a) * s.dir, cos(a) * s.dir, 1, true);
          KS.damage(e, dmg, SAW_SRC);
          KS.sfx("saw");
        }
      }
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, i, n = s.n || 0;
      if (!n) return;
      var orbit = KS.wstat(w, "orbit");
      ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = "#8a8f95"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, orbit, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      for (i = 0; i < n; i++) {
        var x = s.bx[i], y = s.by[i], rot = run.time * 14 * s.dir + i;
        drawTeeth(ctx, x, y, 10, 15.5, 9, rot, "#9aa0a6");
        ctx.fillStyle = "#c8cdd2"; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#5a5f66"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#c9993b"; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#6b7076"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + cos(rot) * 4, y + sin(rot) * 4); ctx.lineTo(x + cos(rot) * 9.5, y + sin(rot) * 9.5); ctx.stroke();
      }
      ctx.restore();
    },
    projDraw: function () { }
  };
  KS.registerWeapon(SAWS);

  // ---------------------------------------------------------------------------
  // W4 Ornament Bombs
  // ---------------------------------------------------------------------------
  var BOMB_SRC = mkSrc("blast", 0.6), MINI_SRC = mkSrc("blast", 0.2);
  var BAUBLE = ["#b3261e", "#2f6a3a", "#c9993b"];
  function bombBoom(p, run, rad, dmg, src, kb, big) {
    var cx = p.x, cy = p.y, n = KS.grid.query(cx, cy, rad, Q, 256), i, e;
    for (i = 0; i < n; i++) {
      e = Q[i]; if (!e.alive) continue;
      setSrc(src, null, cx, cy, kb, e.x - cx, e.y - cy, null, true); src.slot = p.slot; src.weaponId = "bombs";
      KS.damage(e, dmg, src);
    }
    KS.fx("ring", cx, cy, big ? "#e8c35a" : "#efe2c4", 1, rad);
    KS.fx("burst", cx, cy, BAUBLE[p.data.col % 3], big ? 14 : 5, big ? 4 : 2.5);
    if (big) { KS.shake(2.5); KS.sfx("explode"); }
  }
  var BOMBS = {
    id: "bombs", name: TEXT.bombs.name, icon: "🔮", tag: "blast", desc: TEXT.bombs.desc, milestone: TEXT.bombs.ms,
    levels: tbl(["count", "dmg", "radius", "cd"], [[1, 20, 56, 2.6], [1, 26, 60, 2.5], [2, 26, 60, 2.4], [2, 30, 64, 2.3], [2, 36, 70, 2.2], [3, 36, 74, 2.1], [3, 44, 80, 2.0], [4, 52, 88, 1.8]]),
    labels: { count: L.count, dmg: L.dmg, radius: L.radius, cd: L.cd },
    partner: "fuel", evolvesTo: "bombs_evo", unlock: null, procCoef: 0.6,
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = Math.max(1, Math.round(KS.wstat(w, "count"))), rad = KS.wstat(w, "radius"), dmg = KS.wstat(w, "dmg"), fired = 0;
      for (var k = 0; k < n; k++) {
        var tx, ty, ok = false;
        if (KS.rng.chance(0.5) && KS.densestPoint(100, DP) && DP.n > 0) { tx = DP.x; ty = DP.y; ok = true; }
        else { var e = KS.randomEnemyNear(p.x, p.y, 400); if (e) { tx = e.x; ty = e.y; ok = true; } }
        if (!ok) continue;
        tx += KS.rng.range(-14, 14); ty += KS.rng.range(-14, 14);
        var q = KS.spawnProj(BOMBS, w.slot, p.x, p.y, 0, 0, null);
        if (!q) break;
        q.noCollide = true; q.life = 1; q.dmg = dmg; q.r = 8; q.kind = 0; q.procCoef = 0.6;
        q.data.sx = p.x; q.data.sy = p.y; q.data.tx = tx; q.data.ty = ty; q.data.rad = rad; q.data.col = KS.rng.int(0, 2); q.data.ms = w.level >= 4 ? 1 : 0;
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
          bombBoom(p, run, d.rad, p.dmg, BOMB_SRC, 180, true);
          if (d.ms === 1) {
            var base = KS.rng.range(0, TAU);
            for (var k = 0; k < 4; k++) {
              var a = base + k * PI / 2, q = KS.spawnProj(BOMBS, p.slot, p.x, p.y, cos(a) * 190, sin(a) * 190, null);
              if (!q) break;
              q.noCollide = true; q.kind = 1; q.life = 1; q.dmg = p.dmg * 0.3; q.r = 3; q.procCoef = 0.2;
              q.data.fuse = 0.26; q.data.rad = 28 * area(); q.data.col = p.data.col;
            }
          }
          p.alive = false; return true;
        }
        p.x = d.sx + (d.tx - d.sx) * u; p.y = d.sy + (d.ty - d.sy) * u;
        return true;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t >= d.fuse) { bombBoom(p, run, d.rad, p.dmg, MINI_SRC, 0, false); p.alive = false; }
      return true;
    },
    projDraw: function (ctx, p) {
      var d = p.data;
      ctx.globalAlpha = 1;
      if (p.kind === 1) { ctx.fillStyle = "#e8c35a"; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill(); return; }
      var u = min(1, p.t / 0.6), z = sin(PI * u) * 80;
      ctx.globalAlpha = 0.22; ctx.strokeStyle = BAUBLE[d.col % 3]; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(d.tx, d.ty, d.rad, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 9 - z * 0.04, 4.5 - z * 0.02, 0, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
      var y = p.y - z;
      ctx.fillStyle = BAUBLE[d.col % 3]; ctx.beginPath(); ctx.arc(p.x, y, 9, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(42,31,26,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#c9993b"; ctx.fillRect(p.x - 3, y - 13, 6, 5);
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(p.x - 3, y - 3, 2.4, 0, TAU); ctx.fill();
    }
  };
  KS.registerWeapon(BOMBS);

  // ---------------------------------------------------------------------------
  // W5 Snowball Flurry
  // ---------------------------------------------------------------------------
  var SNOW_SRC = mkSrc("frost", 1);
  var SNOW = {
    id: "snow", name: TEXT.snow.name, icon: "❄️", tag: "frost", desc: TEXT.snow.desc, milestone: TEXT.snow.ms,
    levels: tbl(["count", "dmg", "cd"], [[3, 6, 1.35], [4, 6, 1.3], [4, 8, 1.25], [5, 8, 1.2], [5, 10, 1.15], [6, 10, 1.1], [6, 12, 1.05], [8, 13, 1.0]], { speed: 420, life: 0.9 }),
    labels: { count: L.count, dmg: L.dmg, cd: L.cd },
    partner: "cocoa", evolvesTo: "snow_evo", unlock: null, procCoef: 1,
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = Math.max(1, Math.round(KS.wstat(w, "count"))), base = aimAt(p, 450);
      var dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), life = KS.wstat(w, "life"), ms = w.level >= 4 ? 1 : 0;
      w.cd = KS.wstat(w, "cd");
      var step = n > 1 ? 0.5236 / (n - 1) : 0;
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * step, q = KS.spawnProj(SNOW, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 6; q.dmg = dmg; q.life = life; q.kb = 220; q.pierce = 0; q.data.ms = ms;
      }
      KS.sfx("throw");
    },
    projHit: function (p, e, run) {
      var w = run.weapons[p.slot];
      setSrc(SNOW_SRC, w, p.x, p.y, 0, p.vx, p.vy, 1, false);
      KS.applyStatus(e, "chill", p.data.ms === 1 ? 1.5 : 0, 2, SNOW_SRC);
      return true;
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 1; ctx.fillStyle = "rgba(160,205,235,0.5)"; ctx.beginPath(); ctx.arc(p.x - p.vx * 0.012, p.y - p.vy * 0.012, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = "#f3f8fb"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#9cc3de"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 1.8, 0, TAU); ctx.fill();
    }
  };
  KS.registerWeapon(SNOW);

  // ---------------------------------------------------------------------------
  // W6 Reindeer Stampede
  // ---------------------------------------------------------------------------
  var STAMPEDE = {
    id: "stampede", name: TEXT.stampede.name, icon: "🦌", tag: "haul", desc: TEXT.stampede.desc, milestone: TEXT.stampede.ms,
    levels: tbl(["count", "dmg", "cd"], [[1, 50, 6.0], [1, 60, 5.8], [1, 70, 5.5], [1, 78, 5.2], [2, 78, 5.0], [2, 90, 4.7], [2, 104, 4.4], [3, 120, 4.0]], { speed: 700 }),
    labels: { count: L.count, dmg: L.dmg, cd: L.cd },
    partner: "boots", evolvesTo: "stampede_evo", unlock: null, procCoef: 1,
    init: function (w) { w.cd = 1.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, c = KS.cam, n = Math.max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed");
      var D = 0.5 * sqrt(c.w * c.w + c.h * c.h) + 70, ms = w.level >= 4 ? 1 : 0;
      w.cd = KS.wstat(w, "cd");
      var th = KS.rng.range(0, TAU), dx = cos(th), dy = sin(th), tx = p.x + KS.rng.range(-80, 80), ty = p.y + KS.rng.range(-80, 80);
      var span = 2 * D / spd;
      for (var k = 0; k < n; k++) {
        var off = (k - (n - 1) / 2) * 56 + KS.rng.range(-8, 8), sx = tx - dx * D - dy * off, sy = ty - dy * D + dx * off;
        var q = KS.spawnProj(STAMPEDE, w.slot, sx, sy, dx * spd, dy * spd, null);
        if (!q) break;
        q.r = 22; q.dmg = dmg; q.pierce = -1; q.kb = 300; q.life = (ms ? 2 : 1) * span + 0.1; q.data.turn = span; q.data.pass = ms ? 0 : 1;
      }
      KS.sfx("deer");
    },
    projUpdate: function (p, dt, run) {
      var d = p.data;
      if (d.pass === 0 && p.t >= d.turn) { d.pass = 1; p.vx = -p.vx; p.vy = -p.vy; p.hitN = 0; p.ang = atan2(p.vy, p.vx); }
      return false;
    },
    projDraw: function (ctx, p) {
      var leg = sin(p.t * 20) * 5, flip = cos(p.ang) < 0 ? -1 : 1, i;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang); ctx.scale(1, flip); ctx.globalAlpha = 1;
      ctx.fillStyle = "#6b4a2b";
      ctx.beginPath(); ctx.ellipse(0, 0, 21, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#4a3320"; ctx.lineWidth = 3.5; ctx.lineCap = "round";
      ctx.beginPath();
      for (i = 0; i < 4; i++) { var lx = (i < 2 ? -13 : 11) + (i & 1) * 4, sg = (i & 1) ? -1 : 1; ctx.moveTo(lx, 6); ctx.lineTo(lx + leg * sg, 17); }
      ctx.stroke();
      ctx.strokeStyle = "#6b4a2b"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(15, -3); ctx.lineTo(24, -10); ctx.stroke();
      ctx.fillStyle = "#6b4a2b"; ctx.beginPath(); ctx.ellipse(27, -11, 6.5, 4.5, -0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(32, -10, 2.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#d9c9a3"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(25, -15); ctx.lineTo(21, -25); ctx.moveTo(23, -20); ctx.lineTo(28, -24); ctx.moveTo(25, -15); ctx.lineTo(30, -26); ctx.moveTo(28, -21); ctx.lineTo(33, -22); ctx.stroke();
      ctx.restore();
    }
  };
  KS.registerWeapon(STAMPEDE);

  // ---------------------------------------------------------------------------
  // W7 Stump Grinder (+ hazard w_grinder)
  // ---------------------------------------------------------------------------
  var GR_SRC = mkSrc("blade", 0.5);
  var GR_FIELDS = { r: 26, dmg: 6, life: 2.5, src: GR_SRC, data: { slot: 0, grow: 0, maxR: 80, q: 0 } };
  KS.registerHazard({
    id: "w_grinder", team: "player", r: 26, life: 2.5,
    update: function (h, dt, run) {
      var d = h.data;
      if (d.grow > 0 && h.r < d.maxR) h.r = min(d.maxR, h.r + d.grow * dt);
      d.q -= dt; if (d.q > 0) return;
      d.q = 0.08;
      var n = KS.grid.query(h.x, h.y, h.r, Q, 128), now = run.time, slot = d.slot;
      for (var i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive || now - e.hitStamp[slot] < 0.33) continue;
        h.src.slot = slot; h.src.weaponId = "grinder"; h.src.x = e.x; h.src.y = e.y; h.src.kb = 0; h.src.canCrit = true;
        KS.damage(e, h.dmg, h.src);
      }
      if (n > 0) KS.sfx("saw");
    },
    draw: function (ctx, h, t) {
      var fade = h.life < 0.5 ? max(0, h.life * 2) : 1, r = h.r, rot = t * 9 + h.uid;
      ctx.save(); ctx.globalAlpha = 0.4 * fade; ctx.fillStyle = "#1c1410"; ctx.beginPath(); ctx.arc(h.x, h.y + 2, r + 2, 0, TAU); ctx.fill();
      ctx.globalAlpha = fade;
      drawTeeth(ctx, h.x, h.y, r * 0.8, r * 1.18, 12, rot, "#7a8087");
      ctx.fillStyle = "#9aa0a6"; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#4e535a"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#c9993b"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.55, rot, rot + 4.2); ctx.stroke();
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(h.x, h.y, max(3, r * 0.18), 0, TAU); ctx.fill();
      ctx.restore();
    }
  });
  var GRINDER = {
    id: "grinder", name: TEXT.grinder.name, icon: "🛞", tag: "blade", desc: TEXT.grinder.desc, milestone: TEXT.grinder.ms,
    levels: tbl(["interval", "radius", "dmg", "dur"], [[1.2, 26, 6, 2.5], [1.1, 26, 7, 2.5], [1.0, 30, 8, 2.5], [1.0, 30, 9, 5], [0.9, 34, 10, 5], [0.8, 34, 12, 5], [0.8, 38, 13, 5], [0.7, 42, 15, 5]]),
    labels: { interval: L.interval, radius: L.radius, dmg: L.dmg, dur: L.dur },
    partner: "hardhat", evolvesTo: "grinder_evo", unlock: null, procCoef: 0.5,
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      w.cd = KS.wstat(w, "interval");
      var p = run.player, pool = run.hazards, i, cnt = 0, old = null, ou = 1e18;
      for (i = 0; i < pool.n; i++) {
        var h = pool.list[i];
        if (h.alive && h.defId === "w_grinder" && h.data.slot === w.slot) { cnt++; if (h.uid < ou) { ou = h.uid; old = h; } }
      }
      if (cnt >= 12 && old) old.alive = false;
      GR_SRC.slot = w.slot; GR_SRC.weaponId = "grinder";
      GR_FIELDS.r = KS.wstat(w, "radius"); GR_FIELDS.dmg = KS.wstat(w, "dmg"); GR_FIELDS.life = KS.wstat(w, "dur");
      GR_FIELDS.data.slot = w.slot; GR_FIELDS.data.grow = 0; GR_FIELDS.data.q = 0.05;
      KS.spawnHazard("w_grinder", p.x, p.y, GR_FIELDS);
    },
    projDraw: function () { }
  };
  KS.registerWeapon(GRINDER);

  // ---------------------------------------------------------------------------
  // W8 Pole Saw
  // ---------------------------------------------------------------------------
  var POLE_SRC = mkSrc("blade", 1);
  var SWEEP_T = 0.18, SWEEP_ARC = 2.0944;
  var POLESAW = {
    id: "polesaw", name: TEXT.polesaw.name, icon: "🪓", tag: "blade", desc: TEXT.polesaw.desc, milestone: TEXT.polesaw.ms,
    levels: tbl(["reach", "dmg", "cd"], [[90, 40, 1.6], [95, 46, 1.55], [100, 52, 1.5], [100, 58, 1.5], [110, 64, 1.4], [115, 72, 1.35], [120, 80, 1.3], [130, 92, 1.2]]),
    labels: { reach: L.reach, dmg: L.dmg, cd: L.cd },
    partner: "hire", evolvesTo: "polesaw_evo", unlock: null, procCoef: 1,
    init: function (w) {
      var s = w.state; w.cd = 0.3;
      s.on = new Uint8Array(2); s.a = new Float32Array(2); s.t = new Float32Array(2); s.n = new Int32Array(2); s.hits = new Int32Array(2 * 128); s.reach = 100;
    },
    onStageStart: function (w) { var s = w.state; if (s.on) { s.on[0] = 0; s.on[1] = 0; } },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i;
      if (!s.on) POLESAW.init(w);
      w.cd -= dt;
      if (w.cd <= 0) {
        var a = aimAt(p, 260);
        w.cd = KS.wstat(w, "cd");
        s.on[0] = 1; s.a[0] = a; s.t[0] = 0; s.n[0] = 0;
        if (w.level >= 4) { s.on[1] = 1; s.a[1] = a + PI; s.t[1] = -0.1; s.n[1] = 0; }
        KS.sfx("throw");
      }
      var reach = KS.wstat(w, "reach"), dmg = KS.wstat(w, "dmg"); s.reach = reach;
      for (i = 0; i < 2; i++) {
        if (!s.on[i]) continue;
        s.t[i] += dt;
        if (s.t[i] < 0) continue;
        var prog = min(1, s.t[i] / SWEEP_T), swept = -SWEEP_ARC / 2 + SWEEP_ARC * prog, n = KS.grid.query(p.x, p.y, reach, Q, 256), k, j;
        for (k = 0; k < n; k++) {
          var e = Q[k]; if (!e.alive) continue;
          var dx = e.x - p.x, dy = e.y - p.y, dd = sqrt(dx * dx + dy * dy) || 1, da = wrapA(atan2(dy, dx) - s.a[i]) , pad = min(0.6, e.r / dd);
          if (da > swept + pad || da < -SWEEP_ARC / 2 - pad) continue;
          var seen = false, base = i * 128;
          for (j = 0; j < s.n[i]; j++) if (s.hits[base + j] === e.uid) { seen = true; break; }
          if (seen) continue;
          if (s.n[i] < 128) { s.hits[base + s.n[i]] = e.uid; s.n[i]++; }
          setSrc(POLE_SRC, w, p.x, p.y, 200, dx, dy, 1, true);
          KS.damage(e, dmg, POLE_SRC);
        }
        if (s.t[i] >= SWEEP_T + 0.12) s.on[i] = 0;
      }
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, i;
      if (!s.on) return;
      for (i = 0; i < 2; i++) {
        if (!s.on[i] || s.t[i] < 0) continue;
        var prog = min(1, s.t[i] / SWEEP_T), cur = s.a[i] - SWEEP_ARC / 2 + SWEEP_ARC * prog, R = s.reach, fade = s.t[i] > SWEEP_T ? max(0, 1 - (s.t[i] - SWEEP_T) / 0.12) : 1;
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.globalAlpha = 0.32 * fade; ctx.fillStyle = "#e9eef2"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, s.a[i] - SWEEP_ARC / 2, cur); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = fade; ctx.strokeStyle = "#8b5a2b"; ctx.lineWidth = 4; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cos(cur) * R * 0.78, sin(cur) * R * 0.78); ctx.stroke();
        ctx.strokeStyle = "#cfd4d9"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cos(cur) * R * 0.78, sin(cur) * R * 0.78); ctx.lineTo(cos(cur) * R, sin(cur) * R); ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    projDraw: function () { }
  };
  KS.registerWeapon(POLESAW);

  // ---------------------------------------------------------------------------
  // W9 Wood Chipper Cannon
  // ---------------------------------------------------------------------------
  var CHIP_SRC = mkSrc("haul", 0.7);
  var CHIPPER = {
    id: "chipper", name: TEXT.chipper.name, icon: "🪵", tag: "haul", desc: TEXT.chipper.desc, milestone: TEXT.chipper.ms,
    levels: tbl(["pellets", "dmg", "maxAmmo", "pierce"], [[4, 8, 20, 0], [5, 8, 24, 0], [5, 10, 28, 0], [5, 11, 28, 1], [6, 12, 32, 1], [6, 14, 36, 1], [7, 15, 40, 1], [8, 17, 48, 1]], { speed: 600, life: 0.4 }),
    labels: { pellets: L.pellets, dmg: L.dmg, maxAmmo: L.maxAmmo, pierce: L.pierce },
    partner: "sticker", evolvesTo: "chipper_evo", unlock: "chip", procCoef: 0.7,
    init: function (w) { var s = w.state; s.ammo = KS.wstat(w, "maxAmmo"); s.aim = 0; s.fire = 0.25; s.kick = 0; w.hudFrac = 1; },
    onStageStart: function (w) { w.state.ammo = KS.wstat(w, "maxAmmo"); w.hudFrac = 1; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, mx = KS.wstat(w, "maxAmmo");
      if (s.ammo == null) CHIPPER.init(w);
      s.ammo = min(mx, s.ammo + 3 * dt);
      if (s.kick > 0) s.kick -= dt;
      s.fire -= dt;
      if (s.fire <= 0 && s.ammo >= 1) {
        var e = KS.nearestEnemy(p.x, p.y, 460);
        if (e) {
          s.fire = 0.25;
          var shots = min(Math.floor(s.ammo), Math.max(1, Math.round(KS.wstat(w, "pellets"))));
          var base = atan2(e.y - p.y, e.x - p.x), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), life = KS.wstat(w, "life"), pr = Math.round(KS.wstat(w, "pierce"));
          s.aim = base; s.ammo -= shots; s.kick = 0.1;
          for (var k = 0; k < shots; k++) {
            var a = base + (shots > 1 ? (k / (shots - 1) - 0.5) * 0.7854 : 0) + KS.rng.range(-0.03, 0.03), sp = spd * KS.rng.range(0.92, 1.08);
            var q = KS.spawnProj(CHIPPER, w.slot, p.x + cos(base) * 18, p.y + sin(base) * 18, cos(a) * sp, sin(a) * sp, null);
            if (!q) break;
            q.r = 5; q.dmg = dmg; q.pierce = pr; q.life = life; q.kb = 70; q.procCoef = 0.7;
          }
          KS.fx("chips", p.x + cos(base) * 22, p.y + sin(base) * 22, "#c9a46a", 3, 2);
          KS.sfx("throw");
        } else s.fire = 0.1;
      }
      w.hudFrac = mx > 0 ? s.ammo / mx : 0;
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, a = s.aim || 0, kick = s.kick > 0 ? 3 : 0;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalAlpha = 1;
      ctx.fillStyle = "#4e535a"; ctx.fillRect(10 - kick, -5, 17, 10);
      ctx.fillStyle = "#e07a1f"; ctx.fillRect(6 - kick, -7, 9, 14);
      ctx.fillStyle = "#2a1f1a"; ctx.fillRect(25 - kick, -3.5, 4, 7);
      ctx.restore();
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 1; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang + p.t * 18);
      ctx.fillStyle = "#d8b878"; ctx.fillRect(-4, -2.5, 8, 5);
      ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-4, -2.5, 3, 5);
      ctx.restore();
    }
  };
  KS.registerWeapon(CHIPPER);
  KS.on("kill", function (k) {
    var run = KS.run; if (!run) return;
    var p = run.player, dx = k.x - p.x, dy = k.y - p.y;
    if (dx * dx + dy * dy > 14400) return;
    for (var i = 0; i < 6; i++) {
      var w = run.weapons[i];
      if (w && w.id === "chipper" && w.state && w.state.ammo != null) w.state.ammo = min(KS.wstat(w, "maxAmmo"), w.state.ammo + 1);
    }
  });

  // ---------------------------------------------------------------------------
  // W10 Fruitcake Boomerang
  // ---------------------------------------------------------------------------
  var FRUIT = {
    id: "fruitcake", name: TEXT.fruitcake.name, icon: "🍰", tag: "haul", desc: TEXT.fruitcake.desc, milestone: TEXT.fruitcake.ms,
    levels: tbl(["count", "dmg", "cd"], [[1, 22, 2.2], [1, 28, 2.1], [1, 34, 2.0], [1, 38, 2.0], [2, 38, 1.9], [2, 44, 1.8], [2, 50, 1.7], [3, 56, 1.6]], { speed: 520 }),
    labels: { count: L.count, dmg: L.dmg, cd: L.cd },
    partner: "eggnog", evolvesTo: "fruitcake_evo", unlock: null, procCoef: 1,
    init: function (w) { w.cd = 0.4; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, e = KS.nearestEnemy(p.x, p.y, 520);
      if (!e) { w.cd = 0.15; return; }
      var n = Math.max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), base = atan2(e.y - p.y, e.x - p.x);
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        var a = base + (k - (n - 1) / 2) * 0.32, q = KS.spawnProj(FRUIT, w.slot, p.x, p.y, 0, 0, null);
        if (!q) break;
        q.r = 16; q.dmg = dmg; q.pierce = -1; q.kb = 150; q.life = 8; q.data.dx = cos(a); q.data.dy = sin(a); q.data.spd = spd; q.data.ph = 0; q.data.ms = w.level >= 4 ? 1 : 0;
      }
      KS.sfx("throw");
    },
    projUpdate: function (p, dt, run) {
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
        if (d.ms === 1) { KS.addBuff("catch", 3); KS.fx("ring", pl.x, pl.y, "#c9993b", 1, 22); }
        KS.sfx("chime", 0);
      }
      return true;
    },
    projDraw: function (ctx, p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 9); ctx.globalAlpha = 1;
      ctx.fillStyle = "#6b3f1f"; ctx.fillRect(-13, -10, 26, 20);
      ctx.fillStyle = "#4a2a14"; ctx.fillRect(-13, -10, 26, 4);
      ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2; ctx.strokeRect(-13, -10, 26, 20);
      ctx.fillStyle = "#b3261e"; ctx.beginPath(); ctx.arc(-6, 0, 3, 0, TAU); ctx.arc(7, 5, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#2f6a3a"; ctx.beginPath(); ctx.arc(3, -3, 2.6, 0, TAU); ctx.arc(-4, 6, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e8d6a0"; ctx.fillRect(8, -2, 3, 3);
      ctx.restore();
    }
  };
  KS.registerWeapon(FRUIT);

  // ---------------------------------------------------------------------------
  // W11 Burn Pile (+ hazard w_burnpile)
  // ---------------------------------------------------------------------------
  var BP_SRC = mkSrc("fire", 0.3), BP_FIELDS = { r: 50, dmg: 4, life: 3, tick: 0.5, src: BP_SRC, data: { bd: 4, ms: 0, slot: 0 } };
  var JT_U = new Int32Array(24), JT_T = new Float32Array(24), jtI = 0;
  KS.registerHazard({
    id: "w_burnpile", team: "player", autoDamage: true, r: 50, life: 3, tick: 0.5,
    onEnemy: function (h, e, run) {
      var d = h.data;
      KS.applyStatus(e, "burn", d.bd, 3, h.src);
      if (d.ms !== 1) return;
      var now = run.time, i;
      for (i = 0; i < 24; i++) if (JT_U[i] === e.uid && now - JT_T[i] < 1) return;
      var n = KS.grid.query(e.x, e.y, 80, Q2, 64), best = null, bd = 1e18;
      for (i = 0; i < n; i++) {
        var t = Q2[i]; if (!t.alive || t === e || t.st.burn > 0) continue;
        var dx = t.x - e.x, dy = t.y - e.y, dd = dx * dx + dy * dy;
        if (dd < bd) { bd = dd; best = t; }
      }
      if (best) { JT_U[jtI] = e.uid; JT_T[jtI] = now; jtI = (jtI + 1) % 24; KS.applyStatus(best, "burn", d.bd, 3, h.src); KS.fx("sparks", best.x, best.y, "#f08a2a", 3, 2); }
    },
    draw: function (ctx, h, t) {
      var fade = h.life < 0.5 ? max(0, h.life * 2) : 1, r = h.r, i;
      ctx.save();
      ctx.globalAlpha = 0.3 * fade; ctx.fillStyle = "#7a2a10"; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = "#e07a1f"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = fade; ctx.fillStyle = "#3a2518";
      ctx.fillRect(h.x - r * 0.35, h.y - 2, r * 0.7, 5); ctx.fillRect(h.x - 3, h.y - r * 0.3, 6, r * 0.6);
      for (i = 0; i < 7; i++) {
        var a = i * TAU / 7 + h.uid, rr = r * (0.2 + 0.5 * ((i * 37) % 7) / 7), fx = h.x + cos(a) * rr, fy = h.y + sin(a) * rr * 0.7;
        var hh = 12 + 10 * sin(t * 9 + i * 1.7) + r * 0.12;
        ctx.fillStyle = "#c8341a"; ctx.beginPath(); ctx.moveTo(fx - 6, fy); ctx.lineTo(fx, fy - hh); ctx.lineTo(fx + 6, fy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f4a62a"; ctx.beginPath(); ctx.moveTo(fx - 3.5, fy); ctx.lineTo(fx, fy - hh * 0.65); ctx.lineTo(fx + 3.5, fy); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  });
  var BURNPILE = {
    id: "burnpile", name: TEXT.burnpile.name, icon: "🔥", tag: "fire", desc: TEXT.burnpile.desc, milestone: TEXT.burnpile.ms,
    levels: tbl(["count", "radius", "tick", "burnDps", "cd"], [[1, 50, 4, 4, 5.0], [1, 55, 5, 5, 4.8], [1, 60, 6, 6, 4.6], [1, 60, 7, 7, 4.4], [1, 66, 8, 8, 4.2], [2, 72, 9, 10, 4.0], [2, 78, 10, 11, 3.8], [2, 86, 12, 13, 3.5]], { dur: 3 }),
    labels: { count: L.count, radius: L.radius, tick: L.tick, burnDps: L.burnDps, cd: L.cd },
    partner: "vest", evolvesTo: "burnpile_evo", unlock: "fire", procCoef: 0.3,
    init: function (w) { w.cd = 0.5; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, n = Math.max(1, Math.round(KS.wstat(w, "count")));
      w.cd = KS.wstat(w, "cd");
      BP_SRC.slot = w.slot; BP_SRC.weaponId = "burnpile";
      BP_FIELDS.r = KS.wstat(w, "radius"); BP_FIELDS.dmg = KS.wstat(w, "tick"); BP_FIELDS.life = KS.wstat(w, "dur");
      BP_FIELDS.data.bd = KS.wstat(w, "burnDps"); BP_FIELDS.data.ms = w.level >= 4 ? 1 : 0; BP_FIELDS.data.slot = w.slot;
      for (var k = 0; k < n; k++) {
        var x = p.x, y = p.y, e;
        if (k === 0 && KS.densestPoint(60, DP) && DP.n > 0 && (DP.x - p.x) * (DP.x - p.x) + (DP.y - p.y) * (DP.y - p.y) < 62500) { x = DP.x; y = DP.y; }
        else { e = KS.randomEnemyNear(p.x, p.y, 250); if (e) { x = e.x; y = e.y; } else if (k > 0) { x = p.x + KS.rng.range(-90, 90); y = p.y + KS.rng.range(-90, 90); } }
        KS.spawnHazard("w_burnpile", x, y, BP_FIELDS);
        KS.fx("embers", x, y, "#f08a2a", 6, 2.5);
      }
      KS.sfx("burn");
    },
    projDraw: function () { }
  };
  KS.registerWeapon(BURNPILE);

  // ---------------------------------------------------------------------------
  // W12 Sleigh Bell Ricochet
  // ---------------------------------------------------------------------------
  var BELL_SRC = mkSrc("ring", 1);
  var BELLS = {
    id: "bells", name: TEXT.bells.name, icon: "🔔", tag: "ring", desc: TEXT.bells.desc, milestone: TEXT.bells.ms,
    levels: tbl(["count", "dmg", "bounces", "cd"], [[1, 10, 4, 1.6], [1, 12, 4, 1.55], [1, 12, 5, 1.5], [1, 14, 8, 1.5], [2, 14, 8, 1.45], [2, 17, 9, 1.4], [2, 19, 10, 1.35], [2, 22, 11, 1.3]], { speed: 600 }),
    labels: { count: L.count, dmg: L.dmg, bounces: L.bounces, cd: L.cd },
    partner: "wishbone", evolvesTo: "bells_evo", unlock: "ringin", procCoef: 1,
    init: function (w) { w.cd = 0.3; },
    update: function (w, dt, run) {
      w.cd -= dt; if (w.cd > 0) return;
      var p = run.player, e = KS.nearestEnemy(p.x, p.y, 480);
      if (!e) { w.cd = 0.15; return; }
      var n = Math.max(1, Math.round(KS.wstat(w, "count"))), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), bn = Math.round(KS.wstat(w, "bounces")) + KS.items.extraBounces();
      var rg = 180 * rangeMul(), ex = 0, tgt = e;
      w.cd = KS.wstat(w, "cd");
      for (var k = 0; k < n; k++) {
        if (k > 0) { tgt = KS.nearestEnemy(p.x, p.y, 480, ex) || e; }
        ex = tgt.uid;
        var a = atan2(tgt.y - p.y, tgt.x - p.x), q = KS.spawnProj(BELLS, w.slot, p.x, p.y, cos(a) * spd, sin(a) * spd, null);
        if (!q) break;
        q.r = 8; q.dmg = dmg; q.baseDmg = dmg; q.pierce = 0; q.bounces = bn; q.bounceRange = rg; q.life = min(8, 1 + 0.45 * bn); q.kb = 40;
      }
      KS.sfx("throw");
    },
    projHit: function (p, e, run) {
      KS.sfx("chime", min(12, p.bounceIndex));
      if (run.weapons[p.slot] && run.weapons[p.slot].level >= 4 && p.bounces <= 0) {
        setSrc(BELL_SRC, run.weapons[p.slot], p.x, p.y, 0, 0, 0, 1, false);
        KS.applyStatus(e, "stun", 0, 0.8, BELL_SRC);
      }
      return true;
    },
    projDraw: function (ctx, p) {
      var sw = sin(p.t * 22) * 0.25;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(sw); ctx.globalAlpha = 1;
      ctx.fillStyle = "#d9a935"; ctx.beginPath(); ctx.moveTo(-9, 6); ctx.quadraticCurveTo(-9, -9, 0, -9); ctx.quadraticCurveTo(9, -9, 9, 6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#8a6a22"; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = "#b3261e"; ctx.fillRect(-10, 5, 20, 3);
      ctx.fillStyle = "#6b4a1b"; ctx.beginPath(); ctx.arc(0, 9, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.arc(-3, -3, 1.8, 0, TAU); ctx.fill();
      ctx.restore();
    }
  };
  KS.registerWeapon(BELLS);

  // ---------------------------------------------------------------------------
  // W13 Radio Drone
  // ---------------------------------------------------------------------------
  var DRONE_SRC = mkSrc("ring", 1), DRONE_CH = mkSrc("ring", 0.3);
  var DR_MAX = 12;
  var DRONE = {
    id: "drone", name: TEXT.drone.name, icon: "🚁", tag: "ring", desc: TEXT.drone.desc, milestone: TEXT.drone.ms,
    levels: tbl(["drones", "dmg", "cd"], [[1, 9, 0.9], [1, 11, 0.85], [1, 13, 0.8], [1, 14, 0.8], [2, 14, 0.8], [2, 17, 0.75], [2, 19, 0.7], [3, 21, 0.65]], { speed: 700 }),
    labels: { drones: L.drones, dmg: L.dmg, cd: L.cd },
    partner: "radio", evolvesTo: "drone_evo", unlock: "dispatch", procCoef: 1,
    init: function (w) {
      var s = w.state; s.rot = 0; s.n = 0;
      s.dx = new Float32Array(DR_MAX); s.dy = new Float32Array(DR_MAX); s.dc = new Float32Array(DR_MAX);
    },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i;
      if (!s.dx) DRONE.init(w);
      var n = max(1, min(DR_MAX, Math.round(KS.wstat(w, "drones")))), cd = KS.wstat(w, "cd"), dmg = KS.wstat(w, "dmg"), spd = KS.wstat(w, "speed"), kk = min(1, 8 * dt);
      for (i = s.n; i < n; i++) { s.dx[i] = p.x; s.dy[i] = p.y; s.dc[i] = 0.2 + i * 0.15; }
      s.n = n; s.rot += dt * 1.4;
      for (i = 0; i < n; i++) {
        var a = s.rot + i * TAU / n;
        s.dx[i] += (p.x + cos(a) * 60 - s.dx[i]) * kk; s.dy[i] += (p.y + sin(a) * 60 - s.dy[i]) * kk;
        s.dc[i] -= dt;
        if (s.dc[i] > 0) continue;
        var e = KS.nearestEnemy(s.dx[i], s.dy[i], 320);
        if (!e) { s.dc[i] = 0.1; continue; }
        s.dc[i] = cd;
        var ang = atan2(e.y - s.dy[i], e.x - s.dx[i]), q = KS.spawnProj(DRONE, w.slot, s.dx[i], s.dy[i], cos(ang) * spd, sin(ang) * spd, null);
        if (!q) continue;
        q.r = 5; q.dmg = dmg; q.pierce = 0; q.life = 0.65; q.kb = 30; q.data.ms = w.level >= 4 ? 1 : 0;
        KS.sfx("zap");
      }
    },
    projHit: function (p, e, run) {
      if (p.data.ms === 1) {
        var t = KS.nearestEnemy(e.x, e.y, 140 * rangeMul(), e.uid);
        if (t) {
          setSrc(DRONE_CH, run.weapons[p.slot], e.x, e.y, 0, 0, 0, 0.3, true);
          KS.fx("sparks", t.x, t.y, "#8fe0ff", 3, 2);
          KS.damage(t, p.dmg * 0.6, DRONE_CH);
        }
      }
      return true;
    },
    draw: function (ctx, w, run) {
      var s = w.state, i, n = s.n || 0, t = run.time;
      ctx.globalAlpha = 1;
      for (i = 0; i < n; i++) {
        var x = s.dx[i], y = s.dy[i];
        ctx.fillStyle = "#2b4a4a"; ctx.fillRect(x - 6, y - 3.5, 12, 7);
        ctx.fillStyle = "#c9993b"; ctx.fillRect(x - 6, y - 3.5, 12, 2);
        ctx.strokeStyle = "#1c1410"; ctx.lineWidth = 1; ctx.strokeRect(x - 6, y - 3.5, 12, 7);
        ctx.fillStyle = "rgba(220,235,235,0.55)";
        ctx.beginPath(); ctx.ellipse(x - 8, y - 5, 5.5, 1.6 + (sin(t * 50 + i) > 0 ? 0.6 : 0), 0, 0, TAU); ctx.ellipse(x + 8, y - 5, 5.5, 1.6 + (sin(t * 50 + i + 1) > 0 ? 0.6 : 0), 0, 0, TAU); ctx.fill();
        ctx.fillStyle = sin(t * 6 + i) > 0 ? "#e8412e" : "#5a1a12"; ctx.beginPath(); ctx.arc(x, y + 1, 1.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#2b4a4a"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 4, y - 3.5); ctx.lineTo(x + 6, y - 10); ctx.stroke();
      }
    },
    projDraw: function (ctx, p) {
      var nx = p.vx * 0.014, ny = p.vy * 0.014;
      ctx.globalAlpha = 1; ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(120,220,255,0.45)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(p.x - nx, p.y - ny); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.strokeStyle = "#e9fbff"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(p.x - nx * 0.6, p.y - ny * 0.6); ctx.lineTo(p.x, p.y); ctx.stroke();
    }
  };
  KS.registerWeapon(DRONE);

  // ---------------------------------------------------------------------------
  // W14 Leaf Blower
  // ---------------------------------------------------------------------------
  var BLOW_SRC = mkSrc("frost", 0.4), GUST_SRC = mkSrc("frost", 0.5);
  var BLOWER = {
    id: "blower", name: TEXT.blower.name, icon: "🍃", tag: "frost", desc: TEXT.blower.desc, milestone: TEXT.blower.ms,
    levels: tbl(["dmg", "len", "angle"], [[3, 130, 45], [4, 140, 45], [4, 150, 50], [5, 150, 50], [6, 160, 55], [7, 170, 55], [8, 180, 60], [9, 200, 65]], { interval: 0.25 }),
    labels: { dmg: L.dmg, len: L.len, angle: L.angle },
    partner: "diesel", evolvesTo: "blower_evo", unlock: "runners500", procCoef: 0.4,
    init: function (w) { var s = w.state; s.ang = atan2(KS.run.player.aimY, KS.run.player.aimX); s.tickT = 0.1; s.gustT = 3; s.len = 130; s.half = 0.4; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (s.len == null) BLOWER.init(w);
      var tgt = aimAt(p, 330), da = wrapA(tgt - s.ang), step = 12 * dt;
      s.ang += da > step ? step : (da < -step ? -step : da);
      var len = KS.wstat(w, "len"), half = KS.wstat(w, "angle") * PI / 360, cs = cos(s.ang), sn = sin(s.ang), cosHalf = cos(half);
      s.len = len; s.half = half;
      s.tickT -= dt;
      var doTick = s.tickT <= 0;
      if (doTick) s.tickT += KS.wstat(w, "interval");
      var n = KS.grid.query(p.x, p.y, len, Q, 256), dmg = KS.wstat(w, "dmg");
      for (var i = 0; i < n; i++) {
        var e = Q[i]; if (!e.alive) continue;
        var dx = e.x - p.x, dy = e.y - p.y, dd = sqrt(dx * dx + dy * dy) || 1, c = (dx * cs + dy * sn) / dd;
        if (c < cosHalf - min(0.5, e.r / dd)) continue;
        if (!e.isBoss && !e.bossPart && !e.stationary && !e.def.noKnockback) { e.x += cs * 160 * dt; e.y += sn * 160 * dt; }
        if (doTick) {
          setSrc(BLOW_SRC, w, p.x, p.y, 0, dx, dy, 0.4, true);
          KS.applyStatus(e, "chill", 0, 2, BLOW_SRC);
          KS.damage(e, dmg, BLOW_SRC);
        }
      }
      if (w.level >= 4) {
        s.gustT -= dt;
        if (s.gustT <= 0) {
          s.gustT = 3;
          var q = KS.spawnProj(BLOWER, w.slot, p.x + cs * 20, p.y + sn * 20, cs * 300, sn * 300, null);
          if (q) { q.kind = 2; q.r = 30; q.dmg = 30 * run.stats.might; q.pierce = -1; q.life = 1.0; q.kb = 120; q.procCoef = 0.5; }
        }
      }
      if ((run.stepN & 7) === 0) KS.fx("leaves", p.x + cs * len * KS.frand(), p.y + sn * len * KS.frand(), "#7fbf4f", 1, 3);
    },
    draw: function (ctx, w, run) {
      var s = w.state, p = run.player, t = run.time;
      if (s.len == null) return;
      var len = s.len, half = s.half, a0 = s.ang - half, a1 = s.ang + half, i;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.globalAlpha = 0.14; ctx.fillStyle = "#cfeaf6"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, a0, a1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = "#e9f6fb"; ctx.lineWidth = 2; ctx.lineCap = "round";
      for (i = 0; i < 4; i++) {
        var f = ((t * 1.6 + i * 0.25) % 1), r0 = len * f, off = (i / 3 - 0.5) * 2 * half * 0.8;
        ctx.beginPath(); ctx.arc(0, 0, r0, s.ang + off - 0.1, s.ang + off + 0.1); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = "#e07a1f"; ctx.save(); ctx.rotate(s.ang); ctx.fillRect(8, -4, 16, 8); ctx.fillStyle = "#2a1f1a"; ctx.fillRect(22, -3, 5, 6); ctx.restore();
      ctx.restore();
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 0.65; ctx.strokeStyle = "#e9f6fb"; ctx.lineWidth = 4; ctx.lineCap = "round";
      var a = p.ang;
      ctx.beginPath(); ctx.arc(p.x - cos(a) * 14, p.y - sin(a) * 14, 28, a - 0.9, a + 0.9); ctx.stroke();
      ctx.globalAlpha = 0.3; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(p.x - cos(a) * 22, p.y - sin(a) * 22, 28, a - 0.8, a + 0.8); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  };
  KS.registerWeapon(BLOWER);

  // ---------------------------------------------------------------------------
  // W15 String-Light Lash
  // ---------------------------------------------------------------------------
  var LASH_SRC = mkSrc("ring", 0.6), LASH_SEEN = new Int32Array(24);
  var BULB = ["#e8412e", "#4fb04f", "#f4c242", "#4aa3e8"];
  var LASH = {
    id: "lash", name: TEXT.lash.name, icon: "💡", tag: "ring", desc: TEXT.lash.desc, milestone: TEXT.lash.ms,
    levels: tbl(["dmg", "jumps", "cd"], [[14, 2, 1.4], [16, 2, 1.35], [16, 3, 1.3], [18, 3, 1.3], [20, 4, 1.2], [23, 4, 1.15], [26, 5, 1.1], [30, 6, 1.0]]),
    labels: { dmg: L.dmg, jumps: L.jumps, cd: L.cd },
    partner: "linegloves", evolvesTo: "lash_evo", unlock: "linesman", procCoef: 0.6,
    init: function (w) { var s = w.state; w.cd = 0.4; s.px = new Float32Array(24); s.py = new Float32Array(24); s.n = 0; s.vis = 0; },
    update: function (w, dt, run) {
      var s = w.state, p = run.player;
      if (!s.px) LASH.init(w);
      if (s.vis > 0) s.vis -= dt;
      w.cd -= dt; if (w.cd > 0) return;
      var rm = rangeMul(), cur = KS.nearestEnemy(p.x, p.y, 260 * rm);
      if (!cur) { w.cd = 0.15; return; }
      w.cd = KS.wstat(w, "cd");
      var jumps = Math.max(0, Math.round(KS.wstat(w, "jumps")) + KS.items.extraJumps()), total = min(20, 1 + jumps), dmg = KS.wstat(w, "dmg"), shock = w.level >= 4;
      var hits = 0, px = p.x, py = p.y, range = 140 * rm;
      s.px[0] = p.x; s.py[0] = p.y; s.n = 1;
      while (cur && hits < total) {
        LASH_SEEN[hits++] = cur.uid;
        var cx = cur.x, cy = cur.y;
        s.px[s.n] = cx; s.py[s.n] = cy; s.n++;
        setSrc(LASH_SRC, w, px, py, 0, 0, 0, 0.6, true);
        if (shock) KS.applyStatus(cur, "shock", 0, 5, LASH_SRC);
        KS.damage(cur, dmg, LASH_SRC);
        px = cx; py = cy;
        if (hits >= total) break;
        var n = KS.grid.query(px, py, range, Q2, 128), best = null, bd = 1e18;
        for (var i = 0; i < n; i++) {
          var e = Q2[i]; if (!e.alive) continue;
          var seen = false; for (var j = 0; j < hits; j++) if (LASH_SEEN[j] === e.uid) { seen = true; break; }
          if (seen) continue;
          var dx = e.x - px, dy = e.y - py, dd = dx * dx + dy * dy;
          if (dd < bd) { bd = dd; best = e; }
        }
        cur = best;
      }
      s.vis = 0.15;
      KS.sfx("zap");
    },
    draw: function (ctx, w, run) {
      var s = w.state, i, k;
      if (!s.px || s.vis <= 0 || s.n < 2) return;
      ctx.globalAlpha = min(1, s.vis / 0.15 + 0.2); ctx.lineCap = "round";
      var jit = run.time * 90;
      for (i = 1; i < s.n; i++) {
        var x0 = i === 1 ? run.player.x : s.px[i - 1], y0 = i === 1 ? run.player.y : s.py[i - 1], x1 = s.px[i], y1 = s.py[i], dx = x1 - x0, dy = y1 - y0, L2 = sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / L2, ny = dx / L2, segs = max(3, Math.floor(L2 / 14));
        ctx.strokeStyle = "#2f4a32"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0);
        for (k = 1; k < segs; k++) {
          var f = k / segs, o = (k & 1 ? 1 : -1) * 5 * sin(jit + k);
          ctx.lineTo(x0 + dx * f + nx * o, y0 + dy * f + ny * o);
        }
        ctx.lineTo(x1, y1); ctx.stroke();
        for (k = 1; k < segs; k++) {
          var f2 = k / segs, o2 = (k & 1 ? 1 : -1) * 5 * sin(jit + k);
          ctx.fillStyle = BULB[(k + i) & 3]; ctx.beginPath(); ctx.arc(x0 + dx * f2 + nx * o2, y0 + dy * f2 + ny * o2, 3.2, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
    projDraw: function () { }
  };
  KS.registerWeapon(LASH);

  // ---------------------------------------------------------------------------
  // W16 Timber!
  // ---------------------------------------------------------------------------
  var TIM_SRC = mkSrc("blast", 0.6), CONE_SRC = mkSrc("blast", 0.5);
  var TIM_MAX = 10;
  var TIMBER = {
    id: "timber", name: TEXT.timber.name, icon: "🌲", tag: "blast", desc: TEXT.timber.desc, milestone: TEXT.timber.ms,
    levels: tbl(["count", "dmg", "len", "cd"], [[1, 45, 200, 4.0], [1, 55, 200, 3.8], [1, 65, 220, 3.6], [1, 70, 220, 3.5], [2, 70, 240, 3.4], [2, 82, 240, 3.2], [2, 95, 260, 3.0], [3, 110, 280, 2.8]]),
    labels: { count: L.count, dmg: L.dmg, len: L.len, cd: L.cd },
    partner: "toolbelt", evolvesTo: "timber_evo", unlock: "lookup", procCoef: 0.6,
    init: function (w) {
      var s = w.state; w.cd = 0.8;
      s.x = new Float32Array(TIM_MAX); s.y = new Float32Array(TIM_MAX); s.a = new Float32Array(TIM_MAX); s.l = new Float32Array(TIM_MAX); s.t = new Float32Array(TIM_MAX);
      s.d = new Float32Array(TIM_MAX); s.on = new Uint8Array(TIM_MAX); s.wd = new Float32Array(TIM_MAX);
    },
    onStageStart: function (w) { var s = w.state; if (s.on) s.on.fill(0); },
    update: function (w, dt, run) {
      var s = w.state, p = run.player, i, k;
      if (!s.on) TIMBER.init(w);
      w.cd -= dt;
      if (w.cd <= 0) {
        var n = Math.max(1, Math.round(KS.wstat(w, "count"))), len = KS.wstat(w, "len"), dmg = KS.wstat(w, "dmg"), wd = 36 * area(), made = 0;
        for (k = 0; k < n; k++) {
          var e = KS.randomEnemyNear(p.x, p.y, 380);
          if (!e || !KS.onScreen(e.x, e.y, 0)) continue;
          for (i = 0; i < TIM_MAX && s.on[i]; i++) { }
          if (i >= TIM_MAX) break;
          var ang = KS.rng.range(0, PI);
          s.on[i] = 1; s.x[i] = e.x; s.y[i] = e.y; s.a[i] = ang; s.l[i] = len; s.t[i] = 0; s.d[i] = dmg; s.wd[i] = wd;
          KS.telegraph("rect", e.x, e.y, len, wd, ang, 0.5, "#b3261e");
          made++;
        }
        w.cd = made ? KS.wstat(w, "cd") : 0.4;
      }
      for (i = 0; i < TIM_MAX; i++) {
        if (!s.on[i]) continue;
        var prev = s.t[i]; s.t[i] += dt;
        if (prev < 0.5 && s.t[i] >= 0.5) TIMBER.land(w, i, run);
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
        setSrc(TIM_SRC, w, cx, cy, 220, dx, dy, 0.6, true);
        KS.damage(e, dmg, TIM_SRC);
      }
      KS.shake(3); KS.sfx("explode");
      KS.fx("burst", cx + ca * len * 0.4, cy + sa * len * 0.4, "#8a5a2b", 10, 3);
      KS.fx("leaves", cx, cy, "#2f6a3a", 10, 4);
      if (w.level >= 4) {
        var tx = cx + ca * len * 0.5, ty = cy + sa * len * 0.5, base = KS.rng.range(0, TAU);
        for (j = 0; j < 6; j++) {
          var b = base + j * TAU / 6, q = KS.spawnProj(TIMBER, w.slot, tx, ty, cos(b) * 260, sin(b) * 260, null);
          if (!q) break;
          q.kind = 1; q.r = 7; q.dmg = dmg * 0.2; q.pierce = 2; q.life = 0.6; q.kb = 60; q.procCoef = 0.5;
        }
      }
    },
    draw: function (ctx, w, run) {
      var s = w.state, i;
      if (!s.on) return;
      for (i = 0; i < TIM_MAX; i++) {
        if (!s.on[i] || s.t[i] < 0.5) continue;
        var u = s.t[i] - 0.5, f = min(1, u / 0.12), fade = u > 0.3 ? max(0, 1 - (u - 0.3) / 0.2) : 1, len = s.l[i] * (0.25 + 0.75 * f), a = s.a[i];
        ctx.save(); ctx.translate(s.x[i], s.y[i]); ctx.rotate(a); ctx.globalAlpha = fade;
        var x0 = -s.l[i] * 0.5;
        ctx.fillStyle = "#6b4a2b"; ctx.fillRect(x0, -5, len * 0.9, 10);
        ctx.fillStyle = "#4a3320"; ctx.fillRect(x0, -5, len * 0.9, 3);
        ctx.fillStyle = "#2f6a3a";
        for (var k = 0; k < 3; k++) {
          var bx = x0 + len * (0.55 + k * 0.15), bw = len * 0.2 + 4, bh = 24 - k * 4;
          ctx.beginPath(); ctx.moveTo(bx, -bh); ctx.lineTo(bx + bw, 0); ctx.lineTo(bx, bh); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
    projDraw: function (ctx, p) {
      ctx.globalAlpha = 1;
      if (p.kind === 1) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.t * 14);
        ctx.fillStyle = "#7a4a22"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = "#4a2c12"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-3, 4); ctx.moveTo(1, -5); ctx.lineTo(1, 5); ctx.moveTo(5, -3); ctx.lineTo(5, 3); ctx.stroke();
        ctx.restore();
      }
    }
  };
  KS.registerWeapon(TIMBER);

})(window.KS);
