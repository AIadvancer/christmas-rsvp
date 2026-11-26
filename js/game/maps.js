/* Kudzu Survivors v2 - maps.js (ENG-MAP)
 * 5 maps, map hazards (m_*), 10 interactables, 8 site conditions, dam/tower/fueldrum enemies,
 * Lowboy trailer + Work Order, objectives, season finale hand-off, darkness, ground art, previews. */
(function (KS) {
  "use strict";

  // ---------------------------------------------------------------------------
  // TEXT: every player-facing joke / line lives here for review.
  // ---------------------------------------------------------------------------
  var TEXT = {
    maps: {
      backforty: { name: "The Back Forty", sub: "Red clay, fresh snow, and a lot that will not clear itself." },
      creek: { name: "Creek Bottom", sub: "Mud to the ankles and ice that has opinions." },
      easement: { name: "Powerline Easement", sub: "One long strip under the wires. Nowhere to go but forward." },
      homeplace: { name: "The Old Homeplace", sub: "Nobody has lived here in years. Somebody is still decorating." },
      longleaf: { name: "Longleaf Pines", sub: "Tall pines, slash piles, and a dry wind. Mind the embers." }
    },
    obj: {
      backforty: { name: "Clear the Lot", desc: "Stand on the 3 marked kudzu mounds to clear each one." },
      creek: { name: "Bust the Dams", desc: "Break all 4 debris dams and the creek drains." },
      easement: { name: "Clear the Span", desc: "Cut down the 4 overgrown towers along the line." },
      homeplace: { name: "Light the House", desc: "Stand on all 5 breaker boxes to bring the lights back on." },
      longleaf: { name: "Firebreak", desc: "Drive the 3 firebreak stakes to stop the burn." }
    },
    cond: {
      frozen: ["Frozen Ground", "Pickup radius is halved."],
      rush: ["Rush Job", "Kills count double toward the load. Enemies move 30% faster."],
      storm: ["Storm Damage", "Twice the toolboxes. Twice the elites."],
      night: ["Night Shift", "Lights out. You can only see so far."],
      heavy: ["Heavy Timber", "Enemy HP +25%, wood chips worth +25%."],
      crowded: ["Crowded Site", "More crews on site. More of everything."],
      inspection: ["Surprise Inspection", "The trailer shows up at 1:00, but the load is 25% bigger."],
      windy: ["High Wind", "Projectiles slow down. Pickups drift with the wind."]
    },
    lowboy: {
      locked: "Trailer arriving ", ready: "Lowboy ready: stand on the pad", loading: "Loading ", haul: "Hauling out ",
      arrivedT: "TRAILER ARRIVED", arrivedS: "Stand on the pad to start loading.",
      loadT: "LOADING UP", loadS: "Kills near the trailer fill the load. The foreman is on his way.",
      forcedT: "DISPATCH", forcedS: "The trailer's leaving with or without you.",
      haulT: "HAUL OUT", haulS: "Grab everything you can. Ten seconds.",
      arrow: "Trailer", arrowReady: "Trailer ready", arrowLoad: "Loading "
    },
    tips: {
      interact: "Stand next to a Toolbox for a moment to spend Tinsel on a free upgrade.",
      lowboy: "The Lowboy arrives at 2:00. Stand on its pad, then clear the crowd around it.",
      objective: "Each site has an optional job. Finishing it adds 15% to the load.",
      confirm: "Costly stops need a Confirm. Press E, Enter or tap the chip."
    },
    ia: {
      toolbox: "Toolbox", gangbox: "Gang Box", trailer: "Job Trailer", counter: "Parts Counter", elephant: "White Elephant",
      lunchwagon: "Lunch Wagon", raffle: "Raffle Bucket", burnbarrel: "Burn Barrel", kudzushrine: "Stump Shrine", bench: "Shop Bench",
      free: "FREE", spent: "Closed", risky: "Too risky", full: "Already full", noItems: "Nothing to swap", noFuse: "Nothing to fuse yet",
      hp: " HP", confirmChip: "Press E to confirm",
      raffleLose: "Better luck next year. Keep your stub.", raffleStub: "Raffle stub ", raffleWin: "Winner winner! A free upgrade for your stubs.",
      raffleHit: "A winner! Pocket your prize.", lunch: "Lunch break. Back to full strength.", barrel: "Warm hands, light wallet. The next 3 stops are free.",
      swap: "Swapped ", swapFor: " for ", noRefund: "No refunds at the counter."
    },
    banners: {
      dusk: ["DUSK", "The lights are out at the Homeplace. Find the breaker boxes."],
      moundT: "MOUND CLEARED", damT: "DAM BROKEN", towerT: "TOWER DOWN", breakerT: "BREAKER ON", stakeT: "STAKE DRIVEN",
      done: "JOB COMPLETE", drain: "The creek is draining.", fireOut: "Firebreak holds. The fires are dying out."
    },
    drum: "Fuel Drum", dam: "Debris Dam", tower: "Overgrown Tower",
    codex: {
      dam: { notes: "A pile of snagged logs and old tires holding back the creek. Somebody's idea of a bridge.", joke: "Beavers would like a word about your methods.", tip: "Only the dams count toward the objective. Hit them with everything." },
      tower: { notes: "A steel lattice tower so wrapped in kudzu the lineman gave up and left a note.", joke: "The note says 'Not my circuit.'", tip: "Each one that falls sets off a short surge. Be ready." },
      fueldrum: { notes: "A red fuel drum with a hazard diamond. It means it.", joke: "Safety data sheet recommends not shooting it.", tip: "Shoot it when enemies are close. The blast counts as your own damage." }
    },
    labels: { drum: "Fuel Drum" }
  };

  var TAU = Math.PI * 2, U = KS.util, abs = Math.abs, sqrt = Math.sqrt, sin = Math.sin, cos = Math.cos, min = Math.min, max = Math.max, floor = Math.floor;
  var HAS_DOC = typeof document !== "undefined";

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  function mkR(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0; var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hf(i, j) {
    var h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function hasCond(run, id) { return run.condition.indexOf(id) >= 0; }
  function say(title, sub, sec) { try { if (KS.ui && KS.ui.banner) KS.ui.banner(title, sub, sec || 3); } catch (e) { /* ui may be a stub */ } }
  function toast(text, kind) { try { if (KS.ui && KS.ui.toast) KS.ui.toast(text, kind || "info"); } catch (e) { /* ui may be a stub */ } }
  function tip(id, text) { try { if (KS.ui && KS.ui.tip) KS.ui.tip(id, text); } catch (e) { /* ui may be a stub */ } }
  function sfx(n, a) { try { KS.sfx(n, a); } catch (e) { /* audio may be a stub */ } }
  function distSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = 0;
    if (l2 > 0) { t = ((px - x1) * dx + (py - y1) * dy) / l2; t = t < 0 ? 0 : (t > 1 ? 1 : t); }
    var qx = x1 + dx * t - px, qy = y1 + dy * t - py;
    return sqrt(qx * qx + qy * qy);
  }

  // ---------------------------------------------------------------------------
  // Painter helpers + sprite cache (everything is drawn once to offscreen canvases at 2x)
  // ---------------------------------------------------------------------------
  function C(g, x, y, r, f) { g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  function E(g, x, y, rx, ry, f, rot) { g.fillStyle = f; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); }
  function R(g, x, y, w, h, f) { g.fillStyle = f; g.fillRect(x, y, w, h); }
  function RR(g, x, y, w, h, r, f) { g.fillStyle = f; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); }
  function P(g, pts, f) { g.fillStyle = f; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  function L(g, x1, y1, x2, y2, c, w) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function shadow(g, x, y, rx, ry) { E(g, x, y, rx, ry, "rgba(42,31,26,0.28)"); }
  function bulbs(g, x1, y1, x2, y2, n, sag, ph) {
    var cols = ["#d6402f", "#f6d24a", "#5ad07a", "#5aa8ff"];
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t + sin(t * Math.PI) * sag;
      C(g, x, y, 2.4, cols[(i + (ph || 0)) % 4]);
    }
  }

  var SD = {}, SPR = {};
  function spr(name) {
    var s = SPR[name]; if (s) return s;
    var d = SD[name]; if (!d || !HAS_DOC) return null;
    var c = document.createElement("canvas"); c.width = d.w * 2; c.height = d.h * 2;
    var g = c.getContext("2d"); g.scale(2, 2); d.p(g, d.w, d.h);
    s = { c: c, w: d.w, h: d.h }; SPR[name] = s; return s;
  }
  function blit(ctx, s, x, y, sc) { sc = sc || 1; ctx.drawImage(s.c, x - s.w * sc * 0.5, y - s.h * sc * 0.5, s.w * sc, s.h * sc); }
  function def(name, w, h, p) { SD[name] = { w: w, h: h, p: p }; }

  // --- environment props ---
  function pine(g, w, h, a, b, snow) {
    shadow(g, w / 2 + 4, h - 10, 22, 8); R(g, w / 2 - 3, h - 22, 6, 12, "#5a3a22");
    P(g, [w / 2, 4, w / 2 + 24, 34, w / 2 - 24, 34], a); P(g, [w / 2, 18, w / 2 + 28, 52, w / 2 - 28, 52], b);
    P(g, [w / 2, 34, w / 2 + 31, h - 18, w / 2 - 31, h - 18], a);
    if (snow) { P(g, [w / 2, 4, w / 2 + 9, 16, w / 2 - 9, 16], "#f4f1ea"); P(g, [w / 2, 22, w / 2 + 14, 34, w / 2 - 14, 34], "rgba(244,241,234,0.9)"); P(g, [w / 2, 40, w / 2 + 18, 54, w / 2 - 18, 54], "rgba(244,241,234,0.85)"); }
    C(g, w / 2 - 8, 40, 2.2, "#d6402f"); C(g, w / 2 + 10, 56, 2.2, "#f6d24a");
  }
  def("pine", 64, 82, function (g, w, h) { pine(g, w, h, "#2f6b3a", "#2a5b33", true); });
  def("pine2", 64, 82, function (g, w, h) { pine(g, w, h, "#3a7a43", "#2f6b3a", true); });
  def("stump_s", 46, 40, function (g) {
    shadow(g, 24, 32, 18, 6); E(g, 23, 22, 17, 13, "#6a4526"); E(g, 23, 19, 17, 12, "#7a5230"); E(g, 23, 19, 12, 8, "#a3754a"); E(g, 23, 19, 6, 4, "#7a5230");
    E(g, 19, 13, 12, 5, "rgba(244,241,234,0.92)", -0.2);
  });
  def("pallet", 60, 50, function (g) {
    shadow(g, 31, 42, 26, 5); R(g, 6, 8, 48, 34, "#a67c4e");
    for (var i = 0; i < 4; i++) R(g, 6, 8 + i * 9, 48, 6, i % 2 ? "#b98d5c" : "#9a7145");
    R(g, 10, 8, 4, 34, "#7b5732"); R(g, 28, 8, 4, 34, "#7b5732"); R(g, 46, 8, 4, 34, "#7b5732");
    E(g, 20, 8, 14, 4, "rgba(244,241,234,0.85)");
  });
  def("barrel", 36, 46, function (g) {
    shadow(g, 18, 40, 13, 4); RR(g, 7, 12, 22, 28, 3, "#3f3a36"); R(g, 7, 18, 22, 3, "#2a2623"); R(g, 7, 30, 22, 3, "#2a2623"); E(g, 18, 12, 11, 4, "#26211e");
    E(g, 18, 12, 8, 2.6, "#d9632a"); P(g, [14, 11, 18, 2, 22, 11], "#f6a23a"); P(g, [16, 11, 18, 6, 21, 11], "#ffe28a");
    C(g, 10, 6, 1.6, "#ffcf6a"); C(g, 25, 4, 1.4, "#ffcf6a");
  });
  def("jobtrailer", 180, 84, function (g) {
    shadow(g, 92, 72, 80, 8); RR(g, 8, 14, 164, 52, 5, "#e8e4da"); R(g, 8, 52, 164, 14, "#b9b3a4"); R(g, 8, 14, 164, 6, "#c9c3b4");
    for (var i = 0; i < 4; i++) { RR(g, 22 + i * 34, 26, 22, 18, 2, "#ffd98a"); R(g, 22 + i * 34, 34, 22, 1.6, "#c9993b"); }
    RR(g, 150, 28, 14, 30, 2, "#7a5230"); C(g, 120, 69, 8, "#2a1f1a"); C(g, 120, 69, 3.5, "#9a9488"); C(g, 56, 69, 8, "#2a1f1a"); C(g, 56, 69, 3.5, "#9a9488");
    bulbs(g, 10, 14, 170, 14, 22, 5, 0); R(g, 4, 60, 6, 4, "#6a655c");
  });
  def("snowdrift", 76, 32, function (g) { E(g, 38, 20, 34, 9, "rgba(120,110,100,0.18)"); E(g, 36, 16, 32, 10, "#f6f3ec"); E(g, 30, 13, 16, 5, "#ffffff"); });
  def("cattail", 34, 48, function (g) {
    shadow(g, 17, 42, 11, 3);
    for (var i = 0; i < 4; i++) { var a = -0.4 + i * 0.28; L(g, 17, 42, 17 + Math.sin(a) * 26, 42 - Math.cos(a) * 36, "#5f7a3a", 2); }
    L(g, 12, 42, 10, 12, "#6f8a42", 2.2); RR(g, 7.5, 6, 5, 14, 2.5, "#6b4423"); L(g, 22, 42, 25, 18, "#6f8a42", 2.2); RR(g, 22.5, 10, 5, 12, 2.5, "#6b4423");
  });
  def("sweetgum", 100, 100, function (g) {
    shadow(g, 52, 90, 32, 8); R(g, 46, 70, 8, 20, "#5a3a22");
    C(g, 50, 44, 36, "#6f4a3a"); C(g, 34, 36, 22, "#8a5a3f"); C(g, 66, 40, 22, "#7e5240"); C(g, 52, 56, 20, "#6a4536");
    for (var i = 0; i < 14; i++) { var a = i * 2.4, r = 10 + (i % 4) * 8; C(g, 50 + cos(a) * r, 44 + sin(a) * r, 2.6, "#c9a36a"); }
    E(g, 38, 24, 14, 5, "rgba(244,241,234,0.7)", -0.3);
  });
  def("log", 150, 46, function (g) {
    shadow(g, 76, 38, 62, 5); RR(g, 10, 8, 130, 28, 13, "#6a4526"); R(g, 24, 8, 100, 4, "#8a5a33"); R(g, 24, 30, 100, 4, "#4f321b");
    E(g, 18, 22, 8, 14, "#b98d5c"); E(g, 18, 22, 5, 9, "#a3754a"); E(g, 18, 22, 2, 4, "#7a5230");
    E(g, 70, 8, 40, 4, "rgba(244,241,234,0.85)"); R(g, 90, 14, 10, 3, "#8a9a62");
  });
  def("tower", 72, 72, function (g) {
    shadow(g, 38, 58, 28, 6);
    P(g, [36, 6, 62, 62, 10, 62], "rgba(0,0,0,0)"); L(g, 14, 62, 30, 8, "#6c7480", 4); L(g, 58, 62, 42, 8, "#6c7480", 4); L(g, 30, 8, 42, 8, "#6c7480", 4);
    L(g, 18, 46, 54, 46, "#8a929d", 3); L(g, 24, 30, 48, 30, "#8a929d", 3); L(g, 16, 54, 46, 30, "#5f6772", 2); L(g, 56, 54, 26, 30, "#5f6772", 2); L(g, 24, 30, 54, 46, "#5f6772", 2);
    L(g, 6, 22, 66, 22, "#7a828d", 4); C(g, 8, 22, 3, "#e8e4da"); C(g, 64, 22, 3, "#e8e4da");
  });
  def("stubble", 34, 26, function (g) { for (var i = 0; i < 9; i++) { var x = 4 + i * 3.3; L(g, x, 22, x + (i % 3 - 1) * 3, 10 + (i % 4) * 2, i % 2 ? "#8f8a5c" : "#a39d6a", 1.4); } });
  def("gravel", 44, 30, function (g) { for (var i = 0; i < 12; i++) E(g, 6 + (i * 13) % 34, 6 + (i * 7) % 20, 3 + (i % 3), 2.4, i % 2 ? "#8f897b" : "#d0cabb", i); });
  def("house", 480, 380, function (g, w, h) {
    shadow(g, 244, 346, 210, 16);
    RR(g, 30, 60, 420, 280, 8, "#7d6a4e"); RR(g, 24, 40, 432, 240, 10, "#8e8478"); R(g, 24, 40, 432, 14, "#6f675c");
    for (var i = 0; i < 12; i++) { R(g, 24, 54 + i * 19, 432, 2, "rgba(0,0,0,0.16)"); }
    P(g, [24, 40, 240, 12, 456, 40, 456, 120, 24, 120], "rgba(255,255,255,0.05)"); R(g, 330, 4, 36, 70, "#6a5a4e"); R(g, 326, 0, 44, 10, "#4f453b");
    RR(g, 60, 150, 70, 80, 4, "#27323a"); RR(g, 350, 150, 70, 80, 4, "#27323a"); R(g, 64, 154, 28, 72, "rgba(242,195,107,0.55)"); R(g, 354, 154, 28, 72, "rgba(242,195,107,0.35)");
    RR(g, 200, 160, 80, 120, 4, "#3b2a1e"); R(g, 206, 168, 68, 100, "#5a3f2a");
    RR(g, 150, 268, 180, 62, 6, "#9a8a6e"); R(g, 150, 268, 180, 10, "#6f604a"); for (var k = 0; k < 7; k++) R(g, 154 + k * 26, 278, 6, 50, "#6f604a");
    E(g, 240, 330, 130, 20, "rgba(242,195,107,0.35)"); C(g, 240, 252, 6, "#f2c36b"); C(g, 240, 252, 14, "rgba(242,195,107,0.35)");
    bulbs(g, 24, 120, 456, 120, 30, 10, 1);
    for (var v = 0; v < 22; v++) { var vx = 40 + (v * 53) % 400, vy = 80 + (v * 37) % 200; C(g, vx, vy, 6 + (v % 3) * 3, v % 2 ? "rgba(34,60,34,0.72)" : "rgba(52,92,48,0.62)"); }
  });
  def("fence", 112, 18, function (g) {
    for (var i = 0; i < 4; i++) R(g, 6 + i * 32, 3, 5, 14, i === 2 ? "#5a3f2a" : "#7a5a3a");
    L(g, 4, 6, 108, 7, "#6a655c", 1.2); L(g, 4, 11, 108, 10, "#6a655c", 1.2); L(g, 40, 6, 52, 11, "#6a655c", 1);
  });
  def("swing", 130, 80, function (g) {
    shadow(g, 66, 70, 52, 5); L(g, 10, 70, 30, 10, "#7a6a5a", 4); L(g, 50, 70, 30, 10, "#7a6a5a", 4); L(g, 80, 70, 100, 10, "#7a6a5a", 4); L(g, 120, 70, 100, 10, "#7a6a5a", 4); L(g, 30, 10, 100, 10, "#8a7a68", 5);
    L(g, 44, 10, 40, 52, "#6a6358", 1.4); L(g, 58, 10, 62, 44, "#6a6358", 1.4); R(g, 34, 52, 14, 3, "#5a3f2a"); L(g, 58, 10, 66, 40, "#6a6358", 1.2);
  });
  def("tangle", 104, 72, function (g) {
    g.strokeStyle = "#2a2a28"; g.lineWidth = 1.6; g.beginPath(); g.moveTo(6, 40); g.bezierCurveTo(26, 4, 44, 70, 64, 30); g.bezierCurveTo(78, 6, 90, 60, 100, 24); g.stroke();
    g.beginPath(); g.moveTo(8, 56); g.bezierCurveTo(30, 66, 40, 20, 70, 50); g.stroke();
    var cols = ["#d6402f", "#f6d24a", "#5ad07a", "#5aa8ff"]; for (var i = 0; i < 16; i++) { var t = i / 15; C(g, 6 + t * 94, 36 + sin(t * 9) * 20, 2.6, cols[i % 4]); }
  });
  def("vines", 72, 64, function (g) {
    for (var i = 0; i < 9; i++) { var a = i * 0.8; C(g, 36 + cos(a) * (6 + i * 2.6), 32 + sin(a) * (5 + i * 2.2), 8 + (i % 3) * 2, i % 2 ? "rgba(36,70,40,0.78)" : "rgba(58,102,52,0.7)"); }
  });
  def("bush", 54, 46, function (g) { shadow(g, 28, 38, 20, 5); C(g, 20, 24, 14, "#3a5a38"); C(g, 34, 22, 15, "#46683f"); C(g, 27, 28, 13, "#34502f"); E(g, 22, 15, 10, 4, "rgba(244,241,234,0.7)", -0.3); });
  def("lpine", 76, 76, function (g) {
    shadow(g, 40, 56, 22, 10);
    for (var i = 0; i < 16; i++) { var a = i * TAU / 16; L(g, 38, 36, 38 + cos(a) * 30, 36 + sin(a) * 30, i % 2 ? "#3c6a34" : "#2f5a2c", 3.2); }
    C(g, 38, 36, 12, "#3f7036"); C(g, 38, 36, 5, "#6b4423"); C(g, 34, 32, 3, "#8a5a33");
  });
  def("slash", 74, 52, function (g) {
    shadow(g, 38, 44, 30, 5);
    for (var i = 0; i < 12; i++) { var a = i * 0.7; L(g, 14 + (i * 9) % 46, 36 - (i % 4) * 6, 24 + (i * 11) % 40, 18 + (i % 3) * 5, i % 2 ? "#6b4423" : "#8a5a33", 4); }
    for (var k = 0; k < 6; k++) L(g, 20 + k * 8, 30, 26 + k * 8, 14 + (k % 3) * 4, "#3c6a34", 2.4);
  });
  def("cone", 20, 16, function (g) { E(g, 10, 8, 7, 4.5, "#6b4423"); L(g, 5, 8, 15, 8, "#4a2e18", 1); L(g, 7, 5, 13, 11, "#4a2e18", 1); });
  def("needles", 44, 32, function (g) { for (var i = 0; i < 10; i++) L(g, 6 + (i * 11) % 32, 6 + (i * 7) % 20, 14 + (i * 13) % 28, 10 + (i * 5) % 18, i % 2 ? "#7f4f26" : "#cf9150", 1.4); });

  // --- objective and interactable sprites ---
  def("mound", 112, 96, function (g) {
    shadow(g, 56, 80, 46, 9); E(g, 56, 56, 46, 32, "#2f6b3a"); E(g, 56, 50, 42, 28, "#3f8f3a"); E(g, 44, 40, 20, 12, "#58a84a");
    for (var i = 0; i < 10; i++) { var a = i * 0.7; L(g, 56, 52, 56 + cos(a) * 40, 52 + sin(a) * 26, "#2a5e27", 2.2); }
    L(g, 80, 56, 80, 8, "#5a3a22", 3); P(g, [80, 8, 106, 16, 80, 26], "#d6402f"); C(g, 80, 8, 2.5, "#f6d24a");
  });
  def("breaker", 56, 70, function (g) {
    shadow(g, 28, 62, 20, 5); RR(g, 10, 8, 36, 50, 4, "#7d838c"); RR(g, 14, 12, 28, 42, 3, "#a2a8b0"); R(g, 22, 20, 12, 18, "#3a3f46"); R(g, 26, 22, 4, 8, "#d6402f");
    R(g, 16, 44, 24, 6, "#5f6772"); C(g, 20, 16, 2, "#5ad07a"); C(g, 36, 16, 2, "#f6d24a"); P(g, [10, 8, 28, 2, 46, 8], "#5f6772");
  });
  def("stake", 36, 70, function (g) {
    shadow(g, 18, 62, 12, 4); P(g, [14, 62, 22, 62, 20, 12, 16, 12], "#e0b04a"); P(g, [14, 62, 18, 62, 17, 12, 16, 12], "#c9993b");
    P(g, [16, 12, 20, 12, 18, 4], "#d6402f"); R(g, 15, 24, 6, 5, "#d6402f"); R(g, 15, 38, 6, 5, "#d6402f");
  });
  def("dam", 220, 80, function (g) {
    shadow(g, 110, 66, 100, 9); R(g, 16, 22, 188, 40, "rgba(60,140,140,0.55)");
    for (var i = 0; i < 9; i++) { var y = 18 + (i % 4) * 11; RR(g, 14 + i * 18 + (i % 2) * 6, y, 78, 13, 6, i % 2 ? "#6a4526" : "#7a5230"); E(g, 16 + i * 18 + (i % 2) * 6, y + 6.5, 4, 6, "#a3754a"); }
    E(g, 110, 40, 22, 14, "#2a2623"); E(g, 110, 40, 12, 7, "#3f3a36"); E(g, 40, 30, 10, 7, "#2a2623"); R(g, 150, 14, 6, 44, "#5a3a22");
    E(g, 70, 22, 50, 4, "rgba(244,241,234,0.6)"); E(g, 170, 56, 30, 3, "rgba(255,255,255,0.45)");
  });
  def("towerobj", 96, 100, function (g) {
    shadow(g, 48, 86, 34, 8); L(g, 20, 86, 40, 12, "#6c7480", 5); L(g, 76, 86, 56, 12, "#6c7480", 5); L(g, 40, 12, 56, 12, "#6c7480", 5);
    L(g, 24, 64, 72, 64, "#8a929d", 4); L(g, 32, 42, 64, 42, "#8a929d", 4); L(g, 26, 76, 60, 42, "#5f6772", 3); L(g, 70, 76, 36, 42, "#5f6772", 3);
    for (var i = 0; i < 18; i++) { var a = i * 0.9; C(g, 48 + cos(a) * (10 + i * 1.6), 56 + sin(a * 1.3) * (6 + i * 2.2), 8 + (i % 3) * 2.4, i % 2 ? "rgba(36,78,40,0.82)" : "rgba(63,143,58,0.78)"); }
    C(g, 40, 30, 2.4, "#d6402f"); C(g, 60, 52, 2.4, "#f6d24a"); C(g, 34, 66, 2.4, "#5aa8ff");
  });
  def("drum", 34, 46, function (g) {
    shadow(g, 17, 40, 12, 4); RR(g, 6, 8, 22, 32, 4, "#b3261e"); R(g, 6, 16, 22, 3, "#8e1a14"); R(g, 6, 30, 22, 3, "#8e1a14"); E(g, 17, 8, 11, 4, "#d6402f"); E(g, 17, 8, 5, 2, "#5a1410");
    P(g, [17, 18, 24, 25, 17, 32, 10, 25], "#f6d24a"); R(g, 16, 21, 2, 6, "#2a1f1a"); C(g, 17, 29, 1, "#2a1f1a"); R(g, 9, 10, 3, 28, "rgba(255,255,255,0.22)");
  });
  def("lowboy", 252, 100, function (g) {
    shadow(g, 126, 86, 118, 9);
    RR(g, 78, 40, 166, 18, 3, "#3c4048"); R(g, 78, 38, 166, 4, "#5a606a"); R(g, 200, 24, 4, 16, "#5a606a"); R(g, 222, 24, 4, 16, "#5a606a");
    for (var i = 0; i < 5; i++) { C(g, 120 + i * 24, 66, 10, "#1f1c19"); C(g, 120 + i * 24, 66, 4, "#8a857a"); }
    RR(g, 10, 22, 66, 46, 6, "#b3261e"); RR(g, 14, 28, 26, 20, 3, "#cfe9ef"); R(g, 12, 56, 62, 6, "#8e1a14"); RR(g, 40, 14, 22, 14, 2, "#c9993b");
    C(g, 28, 70, 10, "#1f1c19"); C(g, 28, 70, 4, "#8a857a"); C(g, 56, 70, 10, "#1f1c19"); C(g, 56, 70, 4, "#8a857a"); R(g, 8, 34, 4, 10, "#f6d24a");
    C(g, 44, 36, 9, "#2f4a32"); C(g, 44, 36, 5, "#3f6b42"); C(g, 41, 31, 1.6, "#d6402f"); C(g, 48, 40, 1.6, "#d6402f"); P(g, [44, 40, 40, 48, 48, 48], "#d6402f");
    bulbs(g, 80, 38, 244, 38, 18, 5, 2);
    for (var k = 0; k < 4; k++) E(g, 100 + k * 34, 34, 12, 5, "#2f4a32");
  });
  def("ia_toolbox", 56, 50, function (g) {
    shadow(g, 28, 42, 22, 5); RR(g, 6, 14, 44, 26, 3, "#b3261e"); R(g, 6, 14, 44, 8, "#d6402f"); RR(g, 20, 6, 16, 8, 2, "rgba(0,0,0,0)");
    g.strokeStyle = "#8a8f98"; g.lineWidth = 2.4; g.beginPath(); g.moveTo(18, 14); g.lineTo(18, 8); g.lineTo(38, 8); g.lineTo(38, 14); g.stroke();
    RR(g, 23, 20, 10, 8, 1.5, "#d7dce3"); R(g, 26, 22, 4, 3, "#6a7078"); R(g, 6, 30, 44, 2, "#8e1a14"); R(g, 9, 17, 3, 20, "rgba(255,255,255,0.22)");
  });
  def("ia_toolbox_open", 56, 50, function (g) {
    shadow(g, 28, 42, 22, 5); RR(g, 6, 22, 44, 18, 3, "#8e1a14"); R(g, 9, 24, 38, 6, "#2a1f1a"); RR(g, 6, 2, 44, 10, 2, "#b3261e"); R(g, 6, 2, 44, 3, "#d6402f");
    L(g, 8, 12, 8, 22, "#6a7078", 2); L(g, 48, 12, 48, 22, "#6a7078", 2);
  });
  def("ia_gangbox", 76, 58, function (g) {
    shadow(g, 38, 50, 32, 5); RR(g, 5, 14, 66, 34, 4, "#2f5a38"); RR(g, 5, 14, 66, 12, 4, "#3a7046"); R(g, 5, 26, 66, 3, "#1f3c25");
    for (var i = 0; i < 4; i++) { C(g, 12 + i * 17.3, 38, 1.8, "#a8b0a2"); }
    RR(g, 31, 20, 14, 12, 2, "#d7dce3"); R(g, 36, 23, 4, 5, "#4a5058"); R(g, 7, 40, 62, 3, "#d7dce3"); R(g, 7, 17, 4, 28, "rgba(255,255,255,0.18)");
    P(g, [14, 6, 24, 14, 4, 14], "#c9993b");
  });
  def("ia_trailer", 96, 64, function (g) {
    shadow(g, 48, 56, 42, 5); RR(g, 6, 12, 84, 36, 4, "#f1eee6"); R(g, 6, 38, 84, 10, "#c9c3b4"); RR(g, 14, 20, 18, 14, 2, "#a8c8d4"); R(g, 62, 20, 20, 24, "#7a5230");
    C(g, 28, 52, 6, "#2a1f1a"); C(g, 28, 52, 2.4, "#9a9488"); C(g, 68, 52, 6, "#2a1f1a"); C(g, 68, 52, 2.4, "#9a9488");
    C(g, 48, 28, 9, "#2f4a32"); C(g, 48, 28, 5, "#f1eee6"); C(g, 45, 24, 1.6, "#d6402f"); C(g, 52, 31, 1.6, "#d6402f"); P(g, [48, 34, 44, 42, 52, 42], "#d6402f");
    RR(g, 40, 38, 16, 12, 2, "#c9993b"); g.strokeStyle = "#8a8f98"; g.lineWidth = 2; g.beginPath(); g.arc(48, 38, 5, Math.PI, 0); g.stroke(); C(g, 48, 44, 1.6, "#2a1f1a");
  });
  def("ia_counter", 80, 60, function (g) {
    shadow(g, 40, 52, 34, 5); RR(g, 6, 22, 68, 28, 3, "#8a5a33"); R(g, 6, 22, 68, 7, "#a3754a"); for (var i = 0; i < 5; i++) R(g, 12 + i * 13, 31, 2, 16, "rgba(0,0,0,0.2)");
    C(g, 24, 18, 6, "#c9993b"); R(g, 22, 12, 4, 3, "#8a6a1f"); RR(g, 38, 2, 34, 14, 2, "#f1ece0"); R(g, 38, 2, 34, 2, "#b3261e");
    g.fillStyle = "#2a1f1a"; g.font = "bold 8px serif"; g.textAlign = "center"; g.fillText("PARTS", 55, 12);
    L(g, 40, 16, 40, 22, "#5a3a22", 1.4); L(g, 70, 16, 70, 22, "#5a3a22", 1.4);
  });
  def("ia_elephant", 84, 64, function (g) {
    shadow(g, 42, 56, 36, 5); RR(g, 8, 26, 68, 22, 2, "#f1ece0"); R(g, 8, 26, 68, 4, "#d9d2c0"); L(g, 14, 48, 14, 58, "#6a4526", 3); L(g, 70, 48, 70, 58, "#6a4526", 3);
    RR(g, 16, 14, 18, 14, 2, "#b3261e"); R(g, 24, 14, 2, 14, "#f6d24a"); R(g, 16, 20, 18, 2, "#f6d24a"); RR(g, 40, 10, 16, 18, 2, "#2f5a38"); R(g, 47, 10, 2, 18, "#d7dce3"); R(g, 40, 17, 16, 2, "#d7dce3");
    RR(g, 58, 16, 14, 12, 2, "#c9993b"); R(g, 64, 16, 2, 12, "#b3261e"); P(g, [10, 4, 74, 4, 70, 12, 14, 12], "#b3261e"); bulbs(g, 14, 12, 70, 12, 10, 2, 0);
  });
  def("ia_lunchwagon", 100, 68, function (g) {
    shadow(g, 50, 60, 44, 5); RR(g, 6, 14, 88, 40, 5, "#e8e4da"); R(g, 6, 40, 88, 14, "#c9c3b4"); R(g, 14, 22, 52, 18, "#2a1f1a"); R(g, 16, 24, 48, 14, "#ffd98a");
    for (var i = 0; i < 7; i++) P(g, [10 + i * 12.4, 14, 22.4 + i * 12.4, 14, 22.4 + i * 12.4, 24, 10 + i * 12.4, 24], i % 2 ? "#f1ece0" : "#b3261e");
    RR(g, 70, 20, 20, 16, 3, "#a8c8d4"); C(g, 26, 56, 7, "#1f1c19"); C(g, 26, 56, 3, "#9a9488"); C(g, 74, 56, 7, "#1f1c19"); C(g, 74, 56, 3, "#9a9488");
    g.fillStyle = "#2a1f1a"; g.font = "bold 7px serif"; g.textAlign = "center"; g.fillText("LUNCH", 40, 36); R(g, 20, 44, 40, 3, "#b3261e");
  });
  def("ia_raffle", 44, 52, function (g) {
    shadow(g, 22, 46, 16, 4); P(g, [8, 14, 36, 14, 33, 44, 11, 44], "#a9b2ba"); R(g, 8, 14, 28, 3, "#d0d6dc"); R(g, 10, 26, 24, 1.6, "#7a838c"); R(g, 11, 35, 22, 1.6, "#7a838c");
    E(g, 22, 14, 14, 4, "#6a7078"); for (var i = 0; i < 6; i++) RR(g, 10 + i * 4, 4 + (i % 3) * 2, 5, 9, 1, i % 2 ? "#f6d24a" : "#e8707a");
    R(g, 8, 18, 3, 24, "rgba(255,255,255,0.28)");
  });
  def("ia_burnbarrel", 44, 58, function (g) {
    shadow(g, 22, 52, 16, 4); RR(g, 8, 18, 28, 34, 3, "#3f3a36"); R(g, 8, 26, 28, 3, "#26211e"); R(g, 8, 40, 28, 3, "#26211e"); E(g, 22, 18, 14, 5, "#26211e");
    E(g, 22, 18, 10, 3.4, "#d9632a"); P(g, [16, 17, 22, 4, 28, 17], "#f6a23a"); P(g, [19, 17, 22, 9, 26, 17], "#ffe28a"); R(g, 10, 20, 3, 30, "rgba(255,255,255,0.14)");
    P(g, [22, 28, 28, 36, 22, 44, 16, 36], "#f6d24a"); R(g, 21, 31, 2, 7, "#2a1f1a");
  });
  def("ia_shrine", 70, 66, function (g) {
    shadow(g, 35, 58, 28, 5); E(g, 35, 38, 22, 18, "#5a3f2a"); E(g, 35, 30, 22, 16, "#6f4a2f"); E(g, 35, 30, 14, 9, "#8a5a33"); E(g, 35, 30, 7, 4, "#5a3f2a");
    for (var i = 0; i < 12; i++) { var a = i * 0.55; L(g, 35 + cos(a) * 6, 40, 35 + cos(a) * 28, 14 + sin(a) * 28 + 22, i % 2 ? "#1f3c25" : "#2f5a38", 3); }
    for (var k = 0; k < 8; k++) C(g, 12 + k * 6.4, 26 + (k % 3) * 10, 4, k % 2 ? "rgba(36,70,40,0.9)" : "rgba(22,46,28,0.9)");
    C(g, 30, 22, 2, "#7bd36a"); C(g, 42, 34, 1.8, "#7bd36a");
  });
  def("ia_bench", 84, 60, function (g) {
    shadow(g, 42, 52, 36, 5); RR(g, 8, 22, 68, 14, 2, "#a67c4e"); R(g, 8, 22, 68, 4, "#b98d5c"); L(g, 14, 36, 14, 52, "#6a4526", 4); L(g, 70, 36, 70, 52, "#6a4526", 4); R(g, 12, 44, 60, 3, "#6a4526");
    RR(g, 16, 10, 12, 14, 2, "#6a7078"); R(g, 18, 6, 8, 5, "#4a5058"); R(g, 24, 12, 14, 3, "#8a8f98"); L(g, 56, 22, 70, 8, "#8a8f98", 3); C(g, 70, 7, 3, "#d6402f"); P(g, [74, 6, 82, 2, 80, 10], "#6ab4ff");
    C(g, 42, 20, 3, "#c9993b");
  });

  // ---------------------------------------------------------------------------
  // Ground tiles (one 512x512 canvas per map, built once, wrapped so it tiles)
  // ---------------------------------------------------------------------------
  var TILES = {};
  function bl(g, x, y, rx, ry, f, rot) {
    for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) {
      if (x + ox + rx < 0 || x + ox - rx > 512 || y + oy + ry < 0 || y + oy - ry > 512) continue;
      E(g, x + ox, y + oy, rx, ry, f, rot);
    }
  }
  function wl(g, x1, y1, x2, y2, c, w) {
    for (var ox = -512; ox <= 512; ox += 512) for (var oy = -512; oy <= 512; oy += 512) L(g, x1 + ox, y1 + oy, x2 + ox, y2 + oy, c, w);
  }
  var TB = {
    backforty: function (g, r) {
      R(g, 0, 0, 512, 512, "#e9e4d8");
      var i;
      for (i = 0; i < 8; i++) { var x = r() * 512, y = r() * 512, rx = 40 + r() * 60, ry = 26 + r() * 40, a = r() * 3; bl(g, x, y, rx + 6, ry + 6, "#c98a62", a); bl(g, x, y, rx, ry, "#a65a3b", a); bl(g, x + 6, y - 4, rx * 0.5, ry * 0.5, "#96502f", a); }
      for (i = 0; i < 40; i++) bl(g, r() * 512, r() * 512, 2 + r() * 3, 1.6 + r() * 2, "rgba(244,241,234,0.8)", r());
      g.save(); g.globalAlpha = 0.5;
      for (var s = 0; s < 3; s++) {
        var px = 0, py = 0;
        for (var x2 = 0; x2 <= 512; x2 += 16) { var yy = 150 + s * 3 + sin(x2 / 512 * TAU) * 48; if (x2) { wl(g, px, py, x2, yy, "#8a6a52", 3.6); wl(g, px, py + 12, x2, yy + 12, "#8a6a52", 3.6); } px = x2; py = yy; }
      }
      for (var x3 = 0; x3 <= 512; x3 += 16) { var xx = 380 + sin(x3 / 512 * TAU * 2) * 22; wl(g, xx, x3, 380 + sin((x3 + 16) / 512 * TAU * 2) * 22, x3 + 16, "#9a7a62", 3.4); wl(g, xx + 11, x3, 391 + sin((x3 + 16) / 512 * TAU * 2) * 22, x3 + 16, "#9a7a62", 3.4); }
      g.restore();
      for (i = 0; i < 70; i++) bl(g, r() * 512, r() * 512, 1.6, 1.2, "rgba(120,100,90,0.45)", r());
    },
    creek: function (g, r) {
      R(g, 0, 0, 512, 512, "#9aa586");
      var i;
      for (i = 0; i < 14; i++) bl(g, r() * 512, r() * 512, 30 + r() * 50, 18 + r() * 30, "rgba(182,193,166,0.55)", r() * 3);
      for (i = 0; i < 8; i++) { var x = r() * 512, y = r() * 512; bl(g, x, y, 22 + r() * 30, 14 + r() * 18, "rgba(107,81,54,0.5)", r() * 3); }
      for (i = 0; i < 90; i++) { var gx = r() * 512, gy = r() * 512; wl(g, gx, gy, gx + (r() - 0.5) * 6, gy - 7 - r() * 6, i % 2 ? "#7d8a5e" : "#8d9a6c", 1.6); }
      for (i = 0; i < 50; i++) bl(g, r() * 512, r() * 512, 1.8, 1.4, "rgba(223,234,238,0.85)", r());
    },
    easement: function (g, r) {
      R(g, 0, 0, 512, 512, "#b8b2a2");
      var i;
      R(g, 162, 0, 52, 512, "rgba(150,144,128,0.35)"); R(g, 172, 0, 5, 512, "rgba(110,104,92,0.35)"); R(g, 199, 0, 5, 512, "rgba(110,104,92,0.35)");
      for (i = 0; i < 520; i++) bl(g, r() * 512, r() * 512, 1.2 + r() * 2, 1 + r() * 1.6, r() < 0.5 ? "#8f897b" : (r() < 0.5 ? "#d6d1c3" : "#a39d8d"), r() * 3);
      for (i = 0; i < 46; i++) { var sx = r() * 512, sy = r() * 512; for (var k = 0; k < 5; k++) wl(g, sx + k * 2, sy, sx + k * 2 + (k - 2), sy - 7 - r() * 4, k % 2 ? "#8f8a5c" : "#a39d6a", 1.3); }
    },
    homeplace: function (g, r) {
      R(g, 0, 0, 512, 512, "#5a6b4a");
      var i;
      for (i = 0; i < 12; i++) bl(g, r() * 512, r() * 512, 36 + r() * 60, 22 + r() * 36, r() < 0.5 ? "rgba(76,92,62,0.6)" : "rgba(107,125,87,0.45)", r() * 3);
      for (i = 0; i < 6; i++) bl(g, r() * 512, r() * 512, 26 + r() * 32, 16 + r() * 20, "rgba(107,90,62,0.5)", r() * 3);
      for (i = 0; i < 260; i++) { var gx = r() * 512, gy = r() * 512; wl(g, gx, gy, gx + (r() - 0.5) * 7, gy - 6 - r() * 6, i % 3 ? "#6b7d57" : "#4c5c3e", 1.5); }
      for (i = 0; i < 40; i++) bl(g, r() * 512, r() * 512, 3, 1.8, r() < 0.5 ? "#8a6a3a" : "#a8793b", r() * 3);
    },
    longleaf: function (g, r) {
      R(g, 0, 0, 512, 512, "#b5783a");
      var i;
      for (i = 0; i < 10; i++) bl(g, r() * 512, r() * 512, 40 + r() * 50, 26 + r() * 30, "rgba(165,106,49,0.6)", r() * 3);
      for (i = 0; i < 8; i++) bl(g, r() * 512, r() * 512, 30 + r() * 40, 18 + r() * 24, "rgba(207,145,80,0.4)", r() * 3);
      for (i = 0; i < 760; i++) { var nx = r() * 512, ny = r() * 512, a = r() * TAU; wl(g, nx, ny, nx + cos(a) * 9, ny + sin(a) * 9, i % 3 === 0 ? "#9b6230" : (i % 3 === 1 ? "#cf9150" : "#7f4f26"), 1.2); }
      for (i = 0; i < 7; i++) bl(g, r() * 512, r() * 512, 6, 4, "#6b4423", r() * 3);
    }
  };
  function getTile(id) {
    if (TILES[id] || !HAS_DOC) return TILES[id] || null;
    var c = document.createElement("canvas"); c.width = 512; c.height = 512;
    var g = c.getContext("2d"); var seed = 0; for (var i = 0; i < id.length; i++) seed = seed * 31 + id.charCodeAt(i);
    TB[id](g, mkR(seed)); TILES[id] = c; return c;
  }

  // ---------------------------------------------------------------------------
  // Prop store (decorations + solid scenery drawn on the ground layer)
  // ---------------------------------------------------------------------------
  var PN = ["pine", "pine2", "stump_s", "pallet", "barrel", "jobtrailer", "snowdrift", "cattail", "sweetgum", "log", "tower", "stubble", "gravel", "house",
    "fence", "swing", "tangle", "vines", "bush", "lpine", "slash", "cone", "needles"];
  var PIDX = {}; for (var pi = 0; pi < PN.length; pi++) PIDX[PN[pi]] = pi;
  var PMAX = 1800, PT = new Uint8Array(PMAX), PX = new Float32Array(PMAX), PY = new Float32Array(PMAX), PS = new Float32Array(PMAX), PA = new Float32Array(PMAX), pN = 0;
  var PSP = new Array(PN.length);
  function addProp(name, x, y, s, a) {
    if (pN >= PMAX) return;
    PT[pN] = PIDX[name]; PX[pN] = x; PY[pN] = y; PS[pN] = s || 1; PA[pN] = a || 0; pN++;
  }
  function drawProps(ctx, cam) {
    var vx0 = cam.x - cam.w / 2, vx1 = cam.x + cam.w / 2, vy0 = cam.y - cam.h / 2, vy1 = cam.y + cam.h / 2;
    for (var i = 0; i < pN; i++) {
      var t = PT[i], sp = PSP[t]; if (!sp) { sp = PSP[t] = spr(PN[t]); if (!sp) continue; }
      var s = PS[i], hw = sp.w * s * 0.5, hh = sp.h * s * 0.5, x = PX[i], y = PY[i];
      if (x + hw < vx0 || x - hw > vx1 || y + hh < vy0 || y - hh > vy1) continue;
      if (PA[i] !== 0) { ctx.save(); ctx.translate(x, y); ctx.rotate(PA[i]); ctx.drawImage(sp.c, -hw, -hh, hw * 2, hh * 2); ctx.restore(); }
      else ctx.drawImage(sp.c, x - hw, y - hh, hw * 2, hh * 2);
    }
  }

  // Edge wall: a dense overgrowth band the player cannot cross (core blocks at bounds)
  function drawWall(ctx, cam, run, md) {
    var b = run.bounds, wl2 = md.wall, cols = wl2.c, nc = cols.length, tri = wl2.tri;
    var vx0 = cam.x - cam.w / 2 - 70, vx1 = cam.x + cam.w / 2 + 70, vy0 = cam.y - cam.h / 2 - 70, vy1 = cam.y + cam.h / 2 + 70, side, l, pos, k;
    for (side = 0; side < 4; side++) {
      var horiz = side < 2, lo, hi, edge;
      if (horiz) { edge = side === 0 ? b.y0 : b.y1; if (edge < vy0 - 60 || edge > vy1 + 60) continue; lo = max(vx0, b.x0 - 130); hi = min(vx1, b.x1 + 130); }
      else { edge = side === 2 ? b.x0 : b.x1; if (edge < vx0 - 60 || edge > vx1 + 60) continue; lo = max(vy0, b.y0 - 130); hi = min(vy1, b.y1 + 130); }
      var dir = (side === 0 || side === 2) ? 1 : -1;
      for (l = 0; l < 3; l++) {
        var off = dir * (54 - l * 46);
        for (pos = floor(lo / 34) * 34; pos <= hi; pos += 34) {
          k = (pos / 34) | 0;
          var jx = hf(k, l * 7 + side) * 20 - 10, jr = 30 + hf(k, l + 11 + side * 3) * 18, c = cols[(k + l + side) % nc];
          var x = horiz ? pos + jx : edge + off + jx * 0.6, y = horiz ? edge + off + jx * 0.6 : pos + jx;
          if (tri) {
            ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - jr * 1.15); ctx.lineTo(x + jr * 0.8, y + jr * 0.7); ctx.lineTo(x - jr * 0.8, y + jr * 0.7); ctx.closePath(); ctx.fill();
          } else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, jr, 0, TAU); ctx.fill(); }
          if (l === 0 && (k & 3) === 0) { ctx.fillStyle = wl2.bulb[(k >> 2) & 3]; ctx.beginPath(); ctx.arc(x + 6, y - 4, 3, 0, TAU); ctx.fill(); }
        }
      }
    }
  }

  function drawGroundCommon(ctx, cam, run, md) {
    var b = run.bounds, hw = cam.w / 2 + 8, hh = cam.h / 2 + 8;
    var x0 = max(b.x0, cam.x - hw), x1 = min(b.x1, cam.x + hw), y0 = max(b.y0, cam.y - hh), y1 = min(b.y1, cam.y + hh);
    if (x1 > x0 && y1 > y0) {
      if (!md._pat) { var t = getTile(md.id); if (t) md._pat = ctx.createPattern(t, "repeat"); }
      ctx.fillStyle = md._pat || md.palette.ground; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      if (md.groundA) md.groundA(ctx, cam, run, x0, y0, x1, y1);
      drawProps(ctx, cam);
      if (md.groundB) md.groundB(ctx, cam, run, x0, y0, x1, y1);
      var sa = min(0.35, 0.1 * run.season);
      if (sa > 0) { ctx.globalAlpha = sa; ctx.fillStyle = "#f4f1ea"; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.globalAlpha = 1; }
    }
    drawWall(ctx, cam, run, md);
  }

  // ---------------------------------------------------------------------------
  // Per-stage state (reset in setup). Pre-allocated typed arrays; no per-frame allocation.
  // ---------------------------------------------------------------------------
  var S = {
    t: 0, seedA: 0, rs: null, drained: false, creekN: 0, arcT: 0, iceT: 0, lastLbl: "", dusk: false, stormT: 0, fireOut: 0, fireSpread: 0, fireN: 0,
    blocked: null, lbl: "", lblSec: -1, aLbl: "", aLblSec: -1, aLbl2: "", aLbl2K: -1, nearD: 0
  };
  var RESN = 0, RX = new Float32Array(300), RY = new Float32Array(300), RRAD = new Float32Array(300);
  function reserve(x, y, r) { if (RESN < 300) { RX[RESN] = x; RY[RESN] = y; RRAD[RESN] = r; RESN++; } }
  // objective elements (mounds, breakers, stakes, dams, towers)
  var OB = { n: 0, x: new Float32Array(8), y: new Float32Array(8), prog: new Float32Array(8), done: new Uint8Array(8), uid: new Int32Array(8), need: 8, sr: 60, kind: "" };
  var CREEK = new Float32Array(2 * 42), LS = new Float32Array(12 * 4), lsN = 0, lsCd = 0;
  var FIRE_W = 55, FIRE_N = FIRE_W * FIRE_W, FIRE = new Uint8Array(FIRE_N), FBURNT = new Uint8Array(FIRE_N), FT = new Float32Array(FIRE_N), FLIST = new Int16Array(80), fireTickT = 0, fireHurtT = 0;
  var MIMICS = 0;

  function okSpot(run, x, y, rad, sep, minSp) {
    var b = run.bounds, m = 150, i, dx, dy;
    if (x < b.x0 + m || x > b.x1 - m || y < b.y0 + m || y > b.y1 - m) return false;
    var sp = run.mapDef.spawn; dx = x - sp.x; dy = y - sp.y; if (dx * dx + dy * dy < minSp * minSp) return false;
    for (i = 0; i < RESN; i++) { dx = x - RX[i]; dy = y - RY[i]; var s = sep > 0 ? max(sep, RRAD[i] + rad) : RRAD[i] + rad; if (dx * dx + dy * dy < s * s) return false; }
    var obs = run.obstacles;
    for (i = 0; i < obs.length; i++) { var o = obs[i]; dx = x - o.x; dy = y - o.y; var rr = o.r + rad + 24; if (dx * dx + dy * dy < rr * rr) return false; }
    if (S.blocked && S.blocked(x, y)) return false;
    return true;
  }
  function findSpot(run, rad, sep, minSp, minD, maxD) {
    var rng = KS.rng, b = run.bounds, sp = run.mapDef.spawn, i, x, y, a, d;
    for (i = 0; i < 90; i++) {
      if (maxD > 0) { a = rng.next() * TAU; d = minD + rng.next() * (maxD - minD); x = sp.x + cos(a) * d; y = sp.y + sin(a) * d; }
      else { x = b.x0 + 150 + rng.next() * (b.x1 - b.x0 - 300); y = b.y0 + 150 + rng.next() * (b.y1 - b.y0 - 300); }
      if (okSpot(run, x, y, rad, i > 60 ? 140 : sep, minSp)) { S.fx = x; S.fy = y; return true; }
    }
    S.fx = U.clamp(sp.x + (rng.next() - 0.5) * 1200, b.x0 + 200, b.x1 - 200); S.fy = U.clamp(sp.y + (rng.next() - 0.5) * 1200, b.y0 + 200, b.y1 - 200);
    return false;
  }
  function addObstacle(run, x, y, r) { run.obstacles.push({ x: x, y: y, r: r }); }

  // ---------------------------------------------------------------------------
  // Hazards (m_*)
  // ---------------------------------------------------------------------------
  var ARCSRC = KS.makeSrc(); ARCSRC.slot = 7; ARCSRC.tag = ""; ARCSRC.procCoef = 0; ARCSRC.canCrit = false;
  var FIRESRC = KS.makeSrc(); FIRESRC.slot = 7; FIRESRC.tag = "fire"; FIRESRC.procCoef = 0; FIRESRC.canCrit = false;

  KS.registerHazard({
    id: "m_mud", team: "enemy", terrain: true, slowMul: 0.65, r: 90, life: 1e9,
    init: function (h, run) { h.life = 1e9; h.data.q = 0; h.data.sd = (h.uid * 0.6180339) % 1; },
    update: function (h, dt, run) {
      h.data.q -= dt; if (h.data.q > 0) return; h.data.q = 0.25;
      var n = KS.grid.query(h.x, h.y, h.r, KS.tmp.b, 120);
      for (var i = 0; i < n; i++) {
        var e = KS.tmp.b[i]; if (e.flying || e.stationary) continue;
        var st = e.st; if (st.slow <= 0 || 0.8 < st.slowMul) st.slowMul = 0.8; if (st.slow < 0.35) st.slow = 0.35;
      }
    },
    draw: function (ctx, h, t) {
      if (!KS.onScreen(h.x, h.y, h.r + 20)) return;
      var r = h.r, a = h.data.sd * 3;
      ctx.fillStyle = "#4f3a26"; ctx.beginPath(); ctx.ellipse(h.x, h.y + 3, r + 4, r * 0.78 + 4, a, 0, TAU); ctx.fill();
      ctx.fillStyle = "#6b5136"; ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.78, a, 0, TAU); ctx.fill();
      ctx.fillStyle = "#594328"; ctx.beginPath(); ctx.ellipse(h.x + r * 0.12, h.y + r * 0.08, r * 0.66, r * 0.5, a + 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(190,160,120,0.35)"; ctx.beginPath(); ctx.ellipse(h.x - r * 0.28, h.y - r * 0.22, r * 0.26, r * 0.12, a, 0, TAU); ctx.fill();
      var ph = (t * 0.7 + h.data.sd * 5) % 1; ctx.strokeStyle = "rgba(190,160,120," + (0.5 - 0.5 * ph).toFixed(2) + ")"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(h.x + r * 0.2, h.y, 4 + ph * 12, 0, TAU); ctx.stroke();
    }
  });
  KS.registerHazard({
    id: "m_water", team: "enemy", terrain: true, slowMul: 0.5, r: 80, life: 8,
    init: function (h, run) { h.tele = 0; h.data.sd = (h.uid * 0.6180339) % 1; },
    draw: function (ctx, h, t) {
      if (!KS.onScreen(h.x, h.y, h.r + 20)) return;
      var f = min(1, h.life / 1.2), r = h.r;
      ctx.globalAlpha = 0.9 * f; ctx.fillStyle = "#cfe9ef"; ctx.beginPath(); ctx.ellipse(h.x, h.y, r + 6, r * 0.8 + 6, h.data.sd * 3, 0, TAU); ctx.fill();
      ctx.fillStyle = "#3c8c8c"; ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.8, h.data.sd * 3, 0, TAU); ctx.fill();
      var ph = (t * 0.8 + h.data.sd) % 1; ctx.strokeStyle = "rgba(223,242,246," + (0.7 - 0.7 * ph).toFixed(2) + ")"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, r * (0.3 + 0.6 * ph), r * (0.24 + 0.48 * ph), h.data.sd * 3, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
  });
  KS.registerHazard({
    id: "m_ice", team: "enemy", terrain: true, slowMul: 1, r: 80, life: 1e9,
    init: function (h, run) { h.life = 1e9; h.data.still = 0; h.data.cr = 0; h.data.sd = (h.uid * 0.6180339) % 1; },
    update: function (h, dt, run) {
      if (h.data.cr) {
        if (h.tele <= 0) { KS.spawnHazard("m_water", h.x, h.y, { r: h.r * 0.95 }); h.alive = false; }
        return;
      }
      var p = run.player, dx = p.x - h.x, dy = p.y - h.y, rr = h.r + p.r * 0.5;
      if (dx * dx + dy * dy < rr * rr) {
        KS.playerOnIce();
        if (!p.moving) h.data.still += dt; else h.data.still = max(0, h.data.still - dt);
        if (h.data.still >= 2) { h.data.cr = 1; h.tele = 0.8; sfx("telegraph"); }
      } else h.data.still = max(0, h.data.still - dt);
    },
    draw: function (ctx, h, t) {
      if (!KS.onScreen(h.x, h.y, h.r + 20)) return;
      var r = h.r, a = h.data.sd * 3;
      ctx.fillStyle = "rgba(120,170,190,0.55)"; ctx.beginPath(); ctx.ellipse(h.x, h.y + 3, r + 4, r * 0.78 + 4, a, 0, TAU); ctx.fill();
      ctx.fillStyle = "#cfe9ef"; ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.78, a, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.ellipse(h.x - r * 0.25, h.y - r * 0.2, r * 0.4, r * 0.14, a - 0.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(90,140,160,0.45)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(h.x - r * 0.5, h.y + r * 0.2); ctx.lineTo(h.x, h.y - r * 0.1); ctx.lineTo(h.x + r * 0.4, h.y + r * 0.1); ctx.stroke();
    },
    drawTele: function (ctx, h, t) {
      var r = h.r, f = 1 - h.tele / 0.8, pulse = 0.5 + 0.5 * sin(t * 30);
      ctx.strokeStyle = "rgba(42,31,26," + (0.6 + 0.4 * pulse).toFixed(2) + ")"; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(h.x, h.y, r, r * 0.78, h.data.sd * 3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 2; ctx.beginPath();
      for (var i = 0; i < 6; i++) { var an = i * 1.05 + h.data.sd * 6, rr = r * (0.3 + 0.7 * f); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + cos(an) * rr, h.y + sin(an) * rr * 0.8); }
      ctx.stroke();
    }
  });
  KS.registerHazard({
    id: "m_arc", team: "both", life: 1.6,
    init: function (h, run) {
      if (!(h.w > 0)) { h.w = 1500; h.h = 60; } h.data.fired = 0;
      if (!(h.dmg > 0)) h.dmg = 15 * run.dmgMul;
    },
    update: function (h, dt, run) {
      if (h.data.fired || h.tele > 0) return;
      h.data.fired = 1; h.life = min(h.life, 0.4); sfx("zap"); KS.shake(3);
      var p = run.player;
      if (p.alive && KS.hazardHits(h, p.x, p.y, p.r)) KS.hurtPlayer(h.dmg, "hazard", h.x, h.y);
      var R2 = sqrt(h.w * h.w + h.h * h.h) * 0.5, n = KS.grid.query(h.x, h.y, R2, KS.tmp.b, 256);
      for (var i = 0; i < n; i++) { var e = KS.tmp.b[i]; if (e.alive && KS.hazardHits(h, e.x, e.y, e.r)) { ARCSRC.depth = 0; KS.damage(e, 50, ARCSRC); } }
    },
    draw: function (ctx, h, t) {
      if (!h.data.fired) return;
      var f = max(0, h.life / 0.4), hw = h.w / 2, c = cos(h.ang), s = sin(h.ang);
      if (!KS.onScreen(h.x, h.y, hw + 100)) return;
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      ctx.fillStyle = "rgba(200,230,255," + (0.55 * f).toFixed(2) + ")"; ctx.fillRect(-hw, -h.h / 2, h.w, h.h);
      ctx.strokeStyle = "rgba(255,255,255," + f.toFixed(2) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-hw, 0);
      for (var x = -hw + 40; x <= hw; x += 40) ctx.lineTo(x, ((((x * 7.3 + t * 90) | 0) % 21) - 10) * 1.2);
      ctx.stroke(); ctx.restore();
    },
    drawTele: function (ctx, h, t) {
      var hw = h.w / 2, f = 1 - h.tele / 1.2, pulse = 0.5 + 0.5 * sin(t * 24 * (0.5 + f));
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.ang);
      ctx.fillStyle = "rgba(90,168,255," + (0.14 + 0.16 * f + 0.1 * pulse).toFixed(2) + ")"; ctx.fillRect(-hw, -h.h / 2, h.w, h.h);
      ctx.strokeStyle = "#2a1f1a"; ctx.lineWidth = 3; ctx.strokeRect(-hw, -h.h / 2, h.w, h.h);
      ctx.strokeStyle = "rgba(160,210,255,0.9)"; ctx.lineWidth = 1.6; ctx.beginPath();
      for (var x = -hw; x < hw; x += 30) { ctx.moveTo(x, h.h / 2); ctx.lineTo(x + 30, -h.h / 2); }
      ctx.stroke(); ctx.restore();
    }
  });

  // ---------------------------------------------------------------------------
  // Enemy defs owned by maps: dam, tower (objective destructibles), fueldrum
  // ---------------------------------------------------------------------------
  function hpBar(ctx, e, w, yOff) {
    if (e.hp >= e.maxHp) return;
    var f = e.hp / e.maxHp, x = e.x - w / 2, y = e.y + yOff;
    ctx.fillStyle = "rgba(42,31,26,0.85)"; ctx.fillRect(x - 2, y - 2, w + 4, 9); ctx.fillStyle = "#b3261e"; ctx.fillRect(x, y, w * f, 5);
  }
  function objInit(e, run) { e.ai.idx = -1; e.noContact = true; e.stationary = true; }
  KS.registerEnemy({
    id: "dam", name: TEXT.dam, hp: 400, speed: 0, r: 40, dmg: 0, xp: 0, tinsel: 0, mass: 1e6, spawnable: false, stationary: true, noKnockback: true, noRecycle: true,
    objective: true, noXp: true, noKill: true, noContact: true, codex: TEXT.codex.dam, color: "#7a5230",
    init: objInit, update: function () { },
    draw: function (ctx, e, t) {
      if (!KS.onScreen(e.x, e.y, 130)) return;
      var s = spr("dam"), sh = e.flash > 0 ? sin(t * 90) * 2 : 0; if (s) blit(ctx, s, e.x + sh, e.y, 1);
      hpBar(ctx, e, 90, 38);
    },
    onDeath: function (e, src, run) { objDeath(e, run); }
  });
  KS.registerEnemy({
    id: "tower", name: TEXT.tower, hp: 500, speed: 0, r: 34, dmg: 0, xp: 0, tinsel: 0, mass: 1e6, spawnable: false, stationary: true, noKnockback: true, noRecycle: true,
    objective: true, noXp: true, noKill: true, noContact: true, codex: TEXT.codex.tower, color: "#6c7480",
    init: objInit, update: function () { },
    draw: function (ctx, e, t) {
      if (!KS.onScreen(e.x, e.y, 90)) return;
      var s = spr("towerobj"), sh = e.flash > 0 ? sin(t * 90) * 2 : 0; if (s) blit(ctx, s, e.x + sh, e.y - 8, 1);
      hpBar(ctx, e, 70, 36);
    },
    onDeath: function (e, src, run) { objDeath(e, run); }
  });
  var DR_BUF = [new Array(128), new Array(128), new Array(128), new Array(128), new Array(128), new Array(128), new Array(128)], drLvl = 0;
  var DR_SRC = KS.makeSrc(); DR_SRC.slot = 7; DR_SRC.tag = "blast"; DR_SRC.procCoef = 1; DR_SRC.canCrit = false;
  KS.registerEnemy({
    id: "fueldrum", name: TEXT.drum, hp: 1, speed: 0, r: 14, dmg: 0, xp: 0, tinsel: 0, mass: 1e6, spawnable: false, stationary: true, noKnockback: true, noRecycle: true,
    noXp: true, noKill: true, noContact: true, codex: TEXT.codex.fueldrum, color: "#b3261e",
    init: function (e, run) { e.hp = 1; e.maxHp = 1; e.noContact = true; e.stationary = true; e.ai.idx = -1; },
    update: function () { },
    draw: function (ctx, e, t) {
      if (!KS.onScreen(e.x, e.y, 40)) return;
      var s = spr("drum"); if (s) blit(ctx, s, e.x, e.y - 4, 1);
      if (e.flash > 0) { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(e.x - 10, e.y - 18, 20, 26); }
    },
    onDeath: function (e, src, run) {
      var depth = src ? min(KS.MAX_DEPTH, (src.depth || 0) + 1) : 1;
      KS.fx("burst", e.x, e.y, "#f6a23a", 16, 4); KS.fx("sparks", e.x, e.y, "#ffe28a", 10, 3); KS.fx("ring", e.x, e.y, "#ffd27a", 1, 20); KS.shake(7); sfx("explode");
      if (drLvl >= DR_BUF.length) return;
      var buf = DR_BUF[drLvl++], n = KS.grid.query(e.x, e.y, 140, buf, 128), dmg = 6 * KS.itemBase();
      for (var i = 0; i < n; i++) { var o = buf[i]; if (!o.alive || o === e) continue; DR_SRC.depth = depth; DR_SRC.x = e.x; DR_SRC.y = e.y; KS.damage(o, dmg, DR_SRC); }
      drLvl--;
    }
  });

  // ---------------------------------------------------------------------------
  // Conditions (data only; every module reads run.condition)
  // ---------------------------------------------------------------------------
  var CIC = { frozen: "❄", rush: "⏱", storm: "⛈", night: "🌙", heavy: "🪵", crowded: "👷", inspection: "📋", windy: "💨" };
  (function () { for (var id in CIC) KS.registerCondition({ id: id, name: TEXT.cond[id][0], desc: TEXT.cond[id][1], icon: CIC[id] }); })();

  // ---------------------------------------------------------------------------
  // Interactables
  // ---------------------------------------------------------------------------
  function iaPrice(it, run) {
    var d = it.def, base = d.costFn ? d.costFn(it, run) : (it.cost != null ? it.cost : d.baseCost);
    return KS.price(base, d.costKind || "tinsel");
  }
  function iaAfford(it, run, cost) {
    var k = it.def.costKind || "tinsel";
    if (k === "free") return true;
    if (k === "hp") return run.player.hp > cost;
    return run.freeOpens > 0 || run.tinsel >= cost;
  }
  function drawIA(ctx, it, t, name, sc, openName) {
    if (!KS.onScreen(it.x, it.y, it.r + 70)) return;
    var run = KS.run, p = run.player, d = it.def, spent = it.state === "spent" || it.state === "disabled";
    var s = spr(spent && openName ? openName : name);
    if (s) { if (spent) ctx.globalAlpha = 0.55; blit(ctx, s, it.x, it.y - 4, sc); ctx.globalAlpha = 1; }
    var dx = p.x - it.x, dy = p.y - it.y, d2 = dx * dx + dy * dy;
    if (d2 > 330 * 330) return;
    var D = it.data;
    if (!D.key) { D.key = "ia" + it.uid; D.txt = ""; D.tt = -9; D.col = "#efe2c4"; D.ok = true; D.spent = false; }
    if (t - D.tt > 0.25 || t < D.tt || D.spent !== spent) {
      D.tt = t; D.spent = spent;
      var nm = d.label ? d.label(it, run) : d.name, kind = d.costKind || "tinsel", txt = nm, ok = true;
      if (spent) { txt = nm + " · " + TEXT.ia.spent; D.col = "#b9ad94"; }
      else if (run.pendingConfirm === it) { txt = TEXT.ia.confirmChip; D.col = "#f6d24a"; }
      else {
        var cost = iaPrice(it, run); ok = iaAfford(it, run, cost);
        if (run.freeOpens > 0 && kind === "tinsel") txt = nm + " · " + TEXT.ia.free;
        else if (kind === "free") txt = nm + " · " + TEXT.ia.free;
        else if (kind === "hp") txt = nm + " · −" + cost + TEXT.ia.hp;
        else txt = nm + " · " + U.fmt(cost);
        D.col = ok ? "#f3ead2" : "#ff8a7a";
        if (d.canOpen) { var co = true; try { co = d.canOpen(it, run); } catch (e0) { co = false; } if (!co) D.col = "#b9ad94"; }
      }
      D.ok = ok; D.txt = txt;
    }
    var ls = KS.textSprite(D.key, D.txt, "bold 12px Cinzel, serif", D.col);
    if (ls && d2 < 300 * 300) { ctx.globalAlpha = d2 > 220 * 220 ? 0.5 : 1; ctx.drawImage(ls, it.x - ls.width / 2, it.y - it.r - 28); ctx.globalAlpha = 1; }
    if (!spent && it.standT > 0.02) {
      var need = d.confirm ? 1.5 : (d.standTime != null ? d.standTime : 0.5), f = min(1, it.standT / need);
      ctx.lineWidth = 5; ctx.strokeStyle = "rgba(42,31,26,0.55)"; ctx.beginPath(); ctx.arc(it.x, it.y + 4, it.r + 12, 0, TAU); ctx.stroke();
      ctx.strokeStyle = D.ok ? "#7bd36a" : "#9a8f7c"; ctx.beginPath(); ctx.arc(it.x, it.y + 4, it.r + 12, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.stroke();
    }
  }
  function giveRoll(table, run, src) {
    if (!KS.loot || !KS.loot.roll) return null;
    var id = KS.loot.roll(table, run); if (id) KS.items.give(id, 1, src); return id;
  }
  function openChoice(kind, run) { if (KS.loot && KS.loot.openCrate) KS.loot.openCrate(kind, run); }
  function cooldown(it) { it.standT = -1.5; }
  function pop(it, col) { KS.fx("burst", it.x, it.y - 6, col || "#f6d24a", 10, 3); KS.fx("ring", it.x, it.y, col || "#f6d24a", 1, 16); }

  KS.registerInteractable({
    id: "toolbox", name: TEXT.ia.toolbox, baseCost: 25, r: 24, uses: 1,
    onOpen: function (it, run) { giveRoll("toolbox", run, "toolbox"); pop(it); },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_toolbox", 1, "ia_toolbox_open"); }
  });
  KS.registerInteractable({
    id: "gangbox", name: TEXT.ia.gangbox, baseCost: 50, r: 32, uses: 1,
    onOpen: function (it, run) { openChoice("gangbox", run); pop(it, "#7bd36a"); },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_gangbox", 1, "ia_gangbox"); }
  });
  KS.registerInteractable({
    id: "trailer", name: TEXT.ia.trailer, baseCost: 400, r: 40, uses: 1,
    onOpen: function (it, run) { giveRoll("trailer", run, "trailer"); pop(it, "#f1ece0"); KS.shake(3); },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_trailer", 1, "ia_trailer"); }
  });
  KS.registerInteractable({
    id: "counter", name: TEXT.ia.counter, baseCost: 35, r: 34, uses: 2,
    onOpen: function (it, run) { cooldown(it); openChoice("counter", run); sfx("gem"); },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_counter", 1, "ia_counter"); }
  });
  function swappable(run) {
    var out = 0, ord = run.itemOrder, seen = "";
    for (var i = 0; i < ord.length; i++) { var d = KS.defs.items[ord[i]]; if (d && d.rarity !== "kudzu" && run.items[ord[i]] > 0) out++; }
    return out;
  }
  KS.registerInteractable({
    id: "elephant", name: TEXT.ia.elephant, baseCost: 0, costKind: "free", confirm: true, r: 36, uses: 3,
    label: function (it, run) { return swappable(run) > 0 ? TEXT.ia.elephant + " (" + (3 - it.uses) + ")" : TEXT.ia.elephant + ": " + TEXT.ia.noItems; },
    canOpen: function (it, run) { return swappable(run) > 0; },
    onOpen: function (it, run) {
      var ord = run.itemOrder, pool = [], i, id, d;
      for (i = 0; i < ord.length; i++) { id = ord[i]; d = KS.defs.items[id]; if (d && d.rarity !== "kudzu" && run.items[id] > 0 && pool.indexOf(id) < 0) pool.push(id); }
      cooldown(it);
      if (!pool.length) return;
      var old = KS.rng.pick(pool), rar = KS.defs.items[old].rarity, cand = [];
      for (id in KS.defs.items) {
        d = KS.defs.items[id]; if (id === old || d.rarity !== rar) continue;
        var okU = true; try { okU = KS.meta.isUnlocked("item", id); } catch (e) { okU = true; }
        if (okU) cand.push(id);
      }
      if (!cand.length) return;
      var nw = KS.rng.pick(cand);
      KS.items.remove(old, 1); KS.items.give(nw, 1, "elephant");
      toast(TEXT.ia.swap + KS.defs.items[old].name + TEXT.ia.swapFor + KS.defs.items[nw].name, "info"); pop(it, "#e8707a");
    },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_elephant", 1, "ia_elephant"); }
  });
  KS.registerInteractable({
    id: "lunchwagon", name: TEXT.ia.lunchwagon, baseCost: 15, r: 40, uses: 1,
    label: function (it, run) { return run.player.hp >= run.player.maxHp - 0.5 ? TEXT.ia.lunchwagon + ": " + TEXT.ia.full : TEXT.ia.lunchwagon; },
    canOpen: function (it, run) { return run.player.hp < run.player.maxHp - 0.5; },
    onOpen: function (it, run) { KS.healPlayer(run.player.maxHp, "lunch"); toast(TEXT.ia.lunch, "info"); sfx("heal"); pop(it, "#7bd36a"); },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_lunchwagon", 1, "ia_lunchwagon"); }
  });
  KS.registerInteractable({
    id: "raffle", name: TEXT.ia.raffle, baseCost: 15, r: 22, uses: 4,
    costFn: function (it, run) { return 15 / (Math.pow(max(1, run.coeff), 1.1) * max(0.05, run.stats.priceMul || 1)); },
    onOpen: function (it, run) {
      cooldown(it);
      if (KS.rng.chance(0.4)) { giveRoll("raffle", run, "raffle"); toast(TEXT.ia.raffleHit, "info"); pop(it, "#f6d24a"); return; }
      run.raffleStubs++;
      if (run.raffleStubs % 3 === 0) { giveRoll("uncommon", run, "raffle"); toast(TEXT.ia.raffleWin, "info"); pop(it, "#e8707a"); }
      else toast(TEXT.ia.raffleLose + " (" + TEXT.ia.raffleStub + (run.raffleStubs % 3) + "/3)", "info");
    },
    draw: function (ctx, it, t) { drawIA(ctx, it, t, "ia_raffle", 1, "ia_raffle"); }
  });
  KS.registerInteractable({
    id: "burnbarrel", name: TEXT.ia.burnbarrel, baseCost: 0, costKind: "hp", confirm: true, r: 22, uses: 1,
    label: function (it, run) { return run.player.hp < 0.4 * run.player.maxHp ? TEXT.ia.burnbarrel + ": " + TEXT.ia.risky : TEXT.ia.burnbarrel; },
    canOpen: function (it, run) { return run.player.hp >= 0.4 * run.player.maxHp; },
    onOpen: function (it, run) { run.freeOpens += 3; toast(TEXT.ia.barrel, "info"); pop(it, "#f6a23a"); },
    draw: function (ctx, it, t) {
      if (KS.onScreen(it.x, it.y, 60) && it.state !== "spent") {
        for (var i = 0; i < 3; i++) { var ph = (t * 0.8 + i * 0.33) % 1; ctx.fillStyle = "rgba(90,84,80," + (0.4 * (1 - ph)).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(it.x + sin(t * 2 + i) * 5, it.y - 22 - ph * 34, 4 + ph * 7, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#ffcf6a"; ctx.beginPath(); ctx.arc(it.x + sin(t * 9) * 8, it.y - 24 - ((t * 40) % 16), 1.6, 0, TAU); ctx.fill();
      }
      drawIA(ctx, it, t, "ia_burnbarrel", 1, "ia_burnbarrel");
    }
  });
  KS.registerInteractable({
    id: "kudzushrine", name: TEXT.ia.kudzushrine, baseCost: 0, costKind: "free", r: 30, uses: 1,
    onOpen: function (it, run) { openChoice("shrine", run); pop(it, "#7bd36a"); },
    draw: function (ctx, it, t) {
      if (KS.onScreen(it.x, it.y, 70) && it.state !== "spent") {
        var f = 0.5 + 0.5 * sin(t * 2.2); ctx.fillStyle = "rgba(123,211,106," + (0.1 + 0.08 * f).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(it.x, it.y, 48 + 4 * f, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(160,240,140," + (0.12 + 0.1 * f).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(it.x, it.y, 30, 0, TAU); ctx.fill();
      }
      drawIA(ctx, it, t, "ia_shrine", 1, "ia_shrine");
    }
  });
  KS.registerInteractable({
    id: "bench", name: TEXT.ia.bench, baseCost: 0, costKind: "free", r: 34, uses: 1,
    label: function (it, run) { var n = 0; try { n = KS.loot.eligibleFusions(run).length; } catch (e) { n = 0; } return n > 0 ? TEXT.ia.bench : TEXT.ia.bench + ": " + TEXT.ia.noFuse; },
    canOpen: function (it, run) { try { return KS.loot.eligibleFusions(run).length > 0; } catch (e) { return false; } },
    onOpen: function (it, run) { openChoice("bench", run); pop(it, "#6ab4ff"); },
    draw: function (ctx, it, t) {
      if (KS.onScreen(it.x, it.y, 70) && it.state !== "spent" && ((t * 6) | 0) % 3 !== 0) { ctx.fillStyle = "#9ad2ff"; ctx.beginPath(); ctx.arc(it.x + 30 + sin(t * 20) * 3, it.y - 20, 2, 0, TAU); ctx.fill(); }
      drawIA(ctx, it, t, "ia_bench", 1, "ia_bench");
    }
  });

  // ---------------------------------------------------------------------------
  // Placement (interactables, fuel drums, mimics)
  // ---------------------------------------------------------------------------
  var IR = { toolbox: 24, gangbox: 32, trailer: 40, counter: 34, elephant: 36, lunchwagon: 40, raffle: 22, burnbarrel: 22, kudzushrine: 30, bench: 34 };
  var DEFCOUNT = { toolbox: 10, gangbox: 3, counter: 2, elephant: 1, lunchwagon: 1, raffle: 2, burnbarrel: 1 };
  var PLACE_ORDER = ["trailer", "gangbox", "counter", "bench", "kudzushrine", "elephant", "lunchwagon", "burnbarrel", "raffle", "toolbox"];
  function edgeSpot(run) {
    var rng = KS.rng, b = run.bounds;
    for (var i = 0; i < 40; i++) {
      var side = rng.int(0, 3), off = 220 + rng.next() * 140, x, y;
      if (side < 2) { x = b.x0 + 220 + rng.next() * (b.x1 - b.x0 - 440); y = side === 0 ? b.y0 + off : b.y1 - off; }
      else { y = b.y0 + 220 + rng.next() * (b.y1 - b.y0 - 440); x = side === 2 ? b.x0 + off : b.x1 - off; }
      if (okSpot(run, x, y, 40, 250, 400)) { S.fx = x; S.fy = y; return; }
    }
    findSpot(run, 40, 250, 400, 0, 0);
  }
  function placeInteractables(run) {
    var md = run.mapDef; if (!md) return;
    var storm = hasCond(run, "storm"), ov = md.interactables || null, rng = KS.rng, i, j, n, id;
    var shrineRoll = rng.chance(0.5), shrineOk = false;
    try { shrineOk = KS.meta.isUnlocked("flag", "kudzu"); } catch (e0) { shrineOk = false; }
    MIMICS = 0;
    for (i = 0; i < PLACE_ORDER.length; i++) {
      id = PLACE_ORDER[i];
      if (id === "trailer") n = 1;
      else if (id === "bench") n = run.stageIndex >= 1 ? 1 : 0;
      else if (id === "kudzushrine") n = (shrineRoll && shrineOk) ? 1 : 0;
      else { n = ov && ov[id] != null ? ov[id] : DEFCOUNT[id]; if (storm) n *= 2; }
      for (j = 0; j < n; j++) {
        if (run.interactables.length >= 58) break;
        if (id === "trailer") edgeSpot(run); else findSpot(run, IR[id], 250, 400, 0, 0);
        if (id === "toolbox" && MIMICS < 2 && rng.chance(0.06 * (md.mimicMul || 1))) {
          var m = KS.spawnEnemy("mimic", S.fx, S.fy, { noRecycle: true });
          if (m) { MIMICS++; reserve(S.fx, S.fy, IR.toolbox); continue; }
        }
        KS.spawnInteractable(id, S.fx, S.fy); reserve(S.fx, S.fy, IR[id]);
      }
    }
    n = 8 * (storm ? 2 : 1);
    for (j = 0; j < n; j++) {
      findSpot(run, 16, 150, 300, 0, 0);
      var d = KS.spawnEnemy("fueldrum", S.fx, S.fy, { noRecycle: true });
      if (d) reserve(S.fx, S.fy, 20);
    }
  }

  // ---------------------------------------------------------------------------
  // Objectives
  // ---------------------------------------------------------------------------
  var PROG_EV = { id: "", done: 0, total: 0 }, DONE_EV = { id: "" }, WO_EV = { state: "", forced: false };
  function progress(run) {
    var ob = run.objective; PROG_EV.id = ob.id; PROG_EV.done = ob.done; PROG_EV.total = ob.total; KS.emit("objectiveProgress", PROG_EV);
  }
  function addObjCharge(run) {
    var wo = run.workOrder, add = 0.15 * wo.need;
    if (wo.state === "loading") wo.charge = min(wo.need, wo.charge + add);
    else if (wo.state === "locked" || wo.state === "ready") wo.bank += add;
  }
  function completeObj(run, rx, ry, gang) {
    var ob = run.objective; if (ob.complete) return;
    ob.complete = true; ob.done = ob.total;
    if (run.objectivesDone.indexOf(ob.id) < 0) run.objectivesDone.push(ob.id);
    KS.bump("objectives", 1); KS.addPay(150); addObjCharge(run);
    DONE_EV.id = ob.id; KS.emit("objectiveDone", DONE_EV);
    say(TEXT.banners.done, ob.label, 3); sfx("objective");
    if (gang) KS.spawnInteractable("gangbox", rx, ry, { cost: 0 });
  }
  function step1(run, i) {
    var ob = run.objective; ob.done++; OB.done[i] = 1; progress(run); sfx("objective");
    KS.fx("burst", OB.x[i], OB.y[i], "#f6d24a", 14, 4); KS.fx("ring", OB.x[i], OB.y[i], "#f6d24a", 1, 24);
  }
  function drain(run) {
    S.drained = true;
    var pool = run.hazards, l = pool.list;
    for (var i = 0; i < pool.n; i++) { var h = l[i]; if (h.alive && h.defId === "m_mud") { h.alive = false; KS.fx("burst", h.x, h.y, "#6b5136", 6, 3); } }
    toast(TEXT.banners.drain, "info");
  }
  function objDeath(e, run) {
    run = run || KS.run; if (!run) return;
    var ob = run.objective, i = e.ai ? e.ai.idx : -1;
    if (i >= 0 && i < 8 && !OB.done[i]) OB.done[i] = 1;
    ob.done = min(ob.total, ob.done + 1); progress(run); sfx("objective");
    KS.fx("burst", e.x, e.y, e.defId === "dam" ? "#7a5230" : "#6c7480", 18, 4); KS.fx("leaves", e.x, e.y, "#3f8f3a", 10, 3); KS.shake(5);
    say(e.defId === "dam" ? TEXT.banners.damT : TEXT.banners.towerT, ob.done + "/" + ob.total, 2);
    if (e.defId === "tower") { try { KS.director.surge(run, "sparker"); } catch (e1) { /* director may be a stub */ } }
    if (ob.done >= ob.total && !ob.complete) {
      if (e.defId === "dam") { completeObj(run, e.x, e.y, false); drain(run); } else completeObj(run, e.x, e.y, true);
    }
  }
  function channelTick(dt, run) {
    var p = run.player; if (!p.alive) return;
    for (var i = 0; i < OB.n; i++) {
      if (OB.done[i]) continue;
      var dx = p.x - OB.x[i], dy = p.y - OB.y[i];
      if (dx * dx + dy * dy > OB.sr * OB.sr) continue;
      OB.prog[i] += dt;
      if (OB.prog[i] >= OB.need) {
        OB.prog[i] = OB.need; step1(run, i);
        if (OB.kind === "mound") { KS.addTinsel(50 * run.coeff); say(TEXT.banners.moundT, run.objective.done + "/" + run.objective.total, 2); }
        else if (OB.kind === "breaker") { say(TEXT.banners.breakerT, run.objective.done + "/" + run.objective.total, 2); KS.fx("sparks", OB.x[i], OB.y[i], "#ffe28a", 14, 3); }
        else say(TEXT.banners.stakeT, run.objective.done + "/" + run.objective.total, 2);
        if (run.objective.done >= run.objective.total) {
          completeObj(run, OB.x[i] + 90, OB.y[i], OB.kind === "mound");
          if (OB.kind === "stake") { S.fireStop = true; toast(TEXT.banners.fireOut, "info"); for (var k = 0; k < S.fireN; k++) FT[FLIST[k]] = 2 + KS.rng.next() * 18; }
        }
      }
    }
  }
  function objPlace(run, kind, n, rad, minD, maxD, sep, need, sr) {
    OB.n = n; OB.kind = kind; OB.need = need; OB.sr = sr;
    for (var i = 0; i < n; i++) { findSpot(run, rad, sep, 0, minD, maxD); OB.x[i] = S.fx; OB.y[i] = S.fy; OB.prog[i] = 0; OB.done[i] = 0; reserve(S.fx, S.fy, rad + 60); }
  }
  function drawProgRing(ctx, x, y, r, f, col) {
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(42,31,26,0.45)"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    if (f > 0) { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TAU * min(1, f)); ctx.stroke(); }
  }
  function drawChannelObj(ctx, cam, run, t) {
    var kind = OB.kind, nm = kind === "mound" ? "mound" : (kind === "breaker" ? "breaker" : "stake");
    var s = spr(nm); if (!s) return;
    for (var i = 0; i < OB.n; i++) {
      var x = OB.x[i], y = OB.y[i];
      if (!KS.onScreen(x, y, 340)) continue;
      if (kind === "breaker" && OB.done[i]) {
        ctx.fillStyle = "rgba(242,195,107,0.10)"; ctx.beginPath(); ctx.arc(x, y, 300, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(242,195,107,0.5)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 300, 0, TAU); ctx.stroke();
      }
      if (OB.done[i]) ctx.globalAlpha = kind === "mound" ? 0.35 : 1;
      blit(ctx, s, x, y - (kind === "mound" ? 0 : 12), 1);
      ctx.globalAlpha = 1;
      if (!OB.done[i]) {
        drawProgRing(ctx, x, y + 6, OB.sr, OB.prog[i] / OB.need, "#7bd36a");
        if (kind === "breaker" && ((t * 2) | 0) % 2 === 0) { ctx.fillStyle = "#ff6a4a"; ctx.beginPath(); ctx.arc(x - 8, y - 38, 2.4, 0, TAU); ctx.fill(); }
      } else if (kind === "breaker") { ctx.fillStyle = "#7bd36a"; ctx.beginPath(); ctx.arc(x - 8, y - 38, 2.6, 0, TAU); ctx.fill(); }
    }
  }

  // ---------------------------------------------------------------------------
  // Lowboy + Work Order
  // ---------------------------------------------------------------------------
  function finale(run) { return run.stagesCleared % 5 === 4; }
  function addCharge(run, n) {
    var wo = run.workOrder; if (wo.state !== "loading") return;
    wo.charge = min(wo.need, wo.charge + n);
  }
  function spawnSiteBoss(run) {
    var wo = run.workOrder, p = run.player, b = run.bounds, dx = wo.x - p.x, dy = wo.y - p.y, d = sqrt(dx * dx + dy * dy);
    if (d < 1) { dx = 1; dy = 0; d = 1; }
    var x = U.clamp(wo.x + dx / d * 300, b.x0 + 120, b.x1 - 120), y = U.clamp(wo.y + dy / d * 300, b.y0 + 120, b.y1 - 120);
    KS.spawnBoss(run.mapDef.boss, x, y);
  }
  function spawnEternal(run) {
    var b = run.bounds, p = run.player, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, dx = cx - p.x, dy = cy - p.y, d = sqrt(dx * dx + dy * dy);
    if (d < 400) { var a = KS.rng.next() * TAU; dx = cos(a); dy = sin(a); d = 1; }
    var x = U.clamp(p.x + dx / d * 450, b.x0 + 150, b.x1 - 150), y = U.clamp(p.y + dy / d * 450, b.y0 + 150, b.y1 - 150);
    KS.spawnBoss("eternal", x, y);
  }
  function startWO(run, forced) {
    var wo = run.workOrder;
    wo.state = "loading"; wo.forced = forced; wo.stand = 0; wo.charge = min(wo.need, wo.charge + wo.bank); S.trickT = 0;
    WO_EV.state = "loading"; WO_EV.forced = forced; KS.emit("workOrder", WO_EV);
    if (forced) { say(TEXT.lowboy.forcedT, TEXT.lowboy.forcedS, 4); if (!run.bossSpawned) spawnSiteBoss(run); }
    else say(TEXT.lowboy.loadT, TEXT.lowboy.loadS, 3.5);
    sfx("radio");
  }
  function workOrderUpdate(dt, run) {
    var wo = run.workOrder; if (!wo || wo.state === "done") return;
    var p = run.player, dx = p.x - wo.x, dy = p.y - wo.y, d2 = dx * dx + dy * dy;
    if (wo.state === "locked" && run.stageTime >= wo.unlockAt) {
      wo.state = "ready"; WO_EV.state = "ready"; WO_EV.forced = false; KS.emit("workOrder", WO_EV); say(TEXT.lowboy.arrivedT, TEXT.lowboy.arrivedS, 3); sfx("radio");
    }
    if ((wo.state === "locked" || wo.state === "ready") && run.stageTime >= 600) startWO(run, true);
    else if (KS.headless && wo.state === "ready") startWO(run, false);
    if (wo.state === "ready") {
      if (p.alive && d2 <= 3600) { wo.stand += dt; if (wo.stand >= 1) startWO(run, false); }
      else if (wo.stand > 0) wo.stand = max(0, wo.stand - dt * 2);
    } else if (wo.state === "loading") {
      if (d2 <= 48400 || wo.forced || KS.headless) { S.trickT += dt; if (S.trickT >= 2) { S.trickT -= 2; addCharge(run, 1); } } else S.trickT = 0;
      if (!run.bossSpawned && wo.charge >= wo.need * 0.5) spawnSiteBoss(run);
      if (run.bossSpawned && run.bossDone && finale(run) && !run.flags["maps.eternal"]) {
        run.flags["maps.eternal"] = 1; run.bossDone = false; spawnEternal(run);
      }
      if (wo.charge >= wo.need && run.bossSpawned && run.bossDone) {
        wo.state = "haulout"; wo.haulT = 10; S.magT = 0; WO_EV.state = "haulout"; WO_EV.forced = wo.forced; KS.emit("workOrder", WO_EV);
        say(TEXT.lowboy.haulT, TEXT.lowboy.haulS, 3); sfx("radio");
      }
    } else if (wo.state === "haulout") {
      wo.haulT -= dt; S.magT -= dt;
      if (S.magT <= 0) { S.magT = 2; KS.magnetAll(1200, 2.5); }
      if (wo.haulT <= 0) { wo.state = "done"; KS.clearStage(); }
    }
  }
  KS.on("kill", function (k) {
    var run = KS.run; if (!run) return;
    var wo = run.workOrder; if (!wo || wo.state !== "loading") return;
    var d = k.enemy.def; if (d.objective || d.noKill || k.defId === "fueldrum") return;
    var dx = k.x - wo.x, dy = k.y - wo.y;
    if (dx * dx + dy * dy <= 48400 || KS.headless) addCharge(run, hasCond(run, "rush") ? 2 : 1);
  });
  function placeLowboy(run, md) {
    var wo = run.workOrder, sp = md.spawn, hd = sqrt(md.w * md.w + md.h * md.h) / 2, b = run.bounds, rng = KS.rng, obs = run.obstacles, x = sp.x, y = sp.y, i, j;
    var ok = false;
    for (i = 0; i < 160 && !ok; i++) {
      var d = hd * (0.6 + 0.3 * rng.next());
      if (md.corridor) { x = b.x0 + 260 + rng.next() * (b.x1 - b.x0 - 520); y = sp.y + (rng.chance(0.5) ? 1 : -1) * d; }
      else { var a = rng.next() * TAU; x = sp.x + cos(a) * d; y = sp.y + sin(a) * d; }
      if (x < b.x0 + 200 || x > b.x1 - 200 || y < b.y0 + 200 || y > b.y1 - 200) continue;
      ok = true;
      for (j = 0; j < obs.length; j++) { var o = obs[j], dx = x - o.x, dy = y - o.y, rr = o.r + 130; if (dx * dx + dy * dy < rr * rr) { ok = false; break; } }
      if (ok && S.blocked && S.blocked(x, y)) ok = false;
    }
    if (!ok) { x = U.clamp(x, b.x0 + 200, b.x1 - 200); y = U.clamp(y, b.y0 + 200, b.y1 - 200); }
    wo.x = x; wo.y = y; wo.charge = 0; wo.stand = 0; reserve(x, y, 300);
  }
  function drawLowboy(ctx, run, t) {
    var wo = run.workOrder; if (wo.state === "done" || !KS.onScreen(wo.x, wo.y, 300)) return;
    var st = wo.state, x = wo.x, y = wo.y;
    if (st === "ready" || st === "loading" || st === "haulout") {
      ctx.fillStyle = "rgba(201,153,59,0.07)"; ctx.beginPath(); ctx.arc(x, y, 220, 0, TAU); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(42,31,26,0.5)"; ctx.beginPath(); ctx.arc(x, y, 220, 0, TAU); ctx.stroke();
      var f = st === "ready" ? 0 : min(1, wo.charge / wo.need);
      ctx.strokeStyle = st === "haulout" ? "#7bd36a" : "#e0b04a"; ctx.lineWidth = 6; ctx.beginPath();
      if (st === "ready") { ctx.setLineDash(DASH); ctx.arc(x, y, 220, t * 0.1, t * 0.1 + TAU); ctx.stroke(); ctx.setLineDash(NODASH); }
      else { ctx.arc(x, y, 220, -Math.PI / 2, -Math.PI / 2 + TAU * (st === "haulout" ? 1 : f)); ctx.stroke(); }
    }
    ctx.fillStyle = st === "locked" ? "rgba(185,173,148,0.3)" : "rgba(240,200,110,0.22)"; ctx.beginPath(); ctx.arc(x, y, 60, 0, TAU); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = st === "locked" ? "rgba(42,31,26,0.4)" : "#2a1f1a"; ctx.beginPath(); ctx.arc(x, y, 60, 0, TAU); ctx.stroke();
    if (st === "ready" && wo.stand > 0.02) { ctx.lineWidth = 6; ctx.strokeStyle = "#7bd36a"; ctx.beginPath(); ctx.arc(x, y, 60, -Math.PI / 2, -Math.PI / 2 + TAU * min(1, wo.stand)); ctx.stroke(); }
    var s = spr("lowboy"); if (s) { if (st === "locked") ctx.globalAlpha = 0.6; blit(ctx, s, x, y - 24, 1); ctx.globalAlpha = 1; }
    var sec = 0, txt;
    if (st === "locked") { sec = (wo.unlockAt - run.stageTime) | 0; txt = null; if (sec !== S.lblSec) { S.lblSec = sec; S.lbl = TEXT.lowboy.locked + U.fmtTime(max(0, wo.unlockAt - run.stageTime)); } }
    else if (st === "ready") S.lbl = TEXT.lowboy.ready;
    else if (st === "loading") { sec = (100 * wo.charge / wo.need) | 0; if (sec !== S.lblSec) { S.lblSec = sec; S.lbl = TEXT.lowboy.loading + sec + "%"; } }
    else { sec = ceil10(wo.haulT); if (sec !== S.lblSec) { S.lblSec = sec; S.lbl = TEXT.lowboy.haul + sec; } }
    var ls = KS.textSprite("wo_lbl", S.lbl, "bold 15px Cinzel, serif", st === "haulout" ? "#9be58a" : "#f6d24a");
    if (ls) ctx.drawImage(ls, x - ls.width / 2, y - 112);
  }
  function ceil10(v) { return Math.ceil(v); }
  var DASH = [18, 16], NODASH = [];

  function arrows(out) {
    var run = KS.run; if (!run || !run.workOrder) return 0;
    var wo = run.workOrder, n = 0, o;
    if (wo.state !== "done" && out.length > 0) {
      o = out[n++]; o.x = wo.x; o.y = wo.y;
      if (wo.state === "locked") {
        o.color = "#b9ad94"; var sec = (wo.unlockAt - run.stageTime) | 0;
        if (sec !== S.aLblSec) { S.aLblSec = sec; S.aLbl = TEXT.lowboy.arrow + " " + U.fmtTime(max(0, wo.unlockAt - run.stageTime)); }
        o.label = S.aLbl;
      } else if (wo.state === "ready") { o.color = "#f0c35a"; o.label = TEXT.lowboy.arrowReady; }
      else if (wo.state === "loading") {
        o.color = "#f0a53a"; var pc = (100 * wo.charge / wo.need) | 0;
        if (pc !== S.aLbl2K) { S.aLbl2K = pc; S.aLbl2 = TEXT.lowboy.arrowLoad + pc + "%"; }
        o.label = S.aLbl2;
      } else { o.color = "#7bd36a"; o.label = TEXT.lowboy.haul + "..."; }
    }
    if (!run.objective.complete && OB.n > 0 && n < out.length) {
      var p = run.player, best = -1, bd = 1e18;
      for (var i = 0; i < OB.n; i++) {
        if (OB.done[i]) continue;
        var dx = OB.x[i] - p.x, dy = OB.y[i] - p.y, d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; best = i; }
      }
      if (best >= 0) { o = out[n++]; o.x = OB.x[best]; o.y = OB.y[best]; o.color = "#6fd0e0"; o.label = run.objective.label; }
    }
    return n;
  }

  // ---------------------------------------------------------------------------
  // Darkness (Night Shift, Homeplace dusk): drawn at 1/4 resolution on layer 6, so telegraphs,
  // enemy projectiles and particles (layers 7-8) stay fully visible.
  // ---------------------------------------------------------------------------
  var DK = { c: null, g: null, hole: null, w: 0, h: 0 };
  function ensureDark(sw, sh) {
    var w = Math.ceil(sw / 4), h = Math.ceil(sh / 4);
    if (!DK.c) { DK.c = document.createElement("canvas"); DK.g = DK.c.getContext("2d"); }
    if (DK.w !== w || DK.h !== h) { DK.c.width = w; DK.c.height = h; DK.w = w; DK.h = h; }
    if (!DK.hole) {
      var hc = document.createElement("canvas"); hc.width = hc.height = 128; var g = hc.getContext("2d");
      var gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(0.62, "rgba(0,0,0,0.92)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128); DK.hole = hc;
    }
  }
  function hole(x, y, r) {
    var c = KS.cam, z = c.zoom, sx = (x - c.x - c.sx + c.w / 2) * z / 4, sy = (y - c.y - c.sy + c.h / 2) * z / 4, rr = r * z / 4;
    DK.g.drawImage(DK.hole, sx - rr, sy - rr, rr * 2, rr * 2);
  }
  function lit(x, y, run) {
    var i, dx, dy, wo = run.workOrder;
    if (S.house) { dx = x - S.house.x; dy = y - S.house.y; if (dx * dx + dy * dy < 220 * 220) return true; }
    if (OB.kind === "breaker") for (i = 0; i < OB.n; i++) if (OB.done[i]) { dx = x - OB.x[i]; dy = y - OB.y[i]; if (dx * dx + dy * dy < 90000) return true; }
    if (wo.state !== "locked" && wo.state !== "done") { dx = x - wo.x; dy = y - wo.y; if (dx * dx + dy * dy < 240 * 240) return true; }
    return false;
  }
  function darkHook(ctx, cam, run) {
    if (!run.flags["maps.dark"] || !HAS_DOC) return;
    ensureDark(cam.sw, cam.sh);
    var g = DK.g, p = run.player, i, wo = run.workOrder;
    g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, DK.w, DK.h); g.fillStyle = "rgba(8,12,26,0.88)"; g.fillRect(0, 0, DK.w, DK.h);
    g.globalCompositeOperation = "destination-out";
    hole(p.x, p.y, 340);
    if (S.house) hole(S.house.x, S.house.y, 240);
    if (OB.kind === "breaker") for (i = 0; i < OB.n; i++) if (OB.done[i]) hole(OB.x[i], OB.y[i], 320);
    if (wo.state !== "locked" && wo.state !== "done") hole(wo.x, wo.y, 250);
    ctx.save(); ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); ctx.drawImage(DK.c, 0, 0, cam.sw, cam.sh); ctx.restore();
    var pool = run.enemies, l = pool.list, t = KS.G.realTime;
    ctx.fillStyle = "#ffe08a";
    for (i = 0; i < pool.n; i++) {
      var e = l[i]; if (!e.alive || e.untargetable || e.defId === "fueldrum" || e.objective) continue;
      var dx = e.x - p.x, dy = e.y - p.y; if (dx * dx + dy * dy < 340 * 340) continue;
      if (!KS.onScreen(e.x, e.y, 20) || lit(e.x, e.y, run)) continue;
      if (((t * 1.5 + e.uid * 0.37) % 4) < 0.25) continue;
      var er = max(2, e.r * 0.28);
      ctx.beginPath(); ctx.arc(e.x - er * 1.4, e.y - e.r * 0.15, 2.1, 0, TAU); ctx.arc(e.x + er * 1.4, e.y - e.r * 0.15, 2.1, 0, TAU); ctx.fill();
    }
  }
  KS.addDrawHook(6, function (ctx, cam, run) { darkHook(ctx, cam, run); });
  KS.addDrawHook(3, function (ctx, cam, run) {
    var t = KS.G.realTime;
    if (run.mapDef && run.mapDef._kindMap) {
      if (OB.n > 0 && (OB.kind === "mound" || OB.kind === "breaker" || OB.kind === "stake")) drawChannelObj(ctx, cam, run, t);
      drawLowboy(ctx, run, t);
    }
  });

  // ---------------------------------------------------------------------------
  // Maps
  // ---------------------------------------------------------------------------
  function resetStage(run, md) {
    pN = 0; RESN = 0; OB.n = 0; OB.kind = ""; OB.done.fill(0); OB.prog.fill(0); OB.uid.fill(0); MIMICS = 0; lsN = 0; lsCd = 0;
    FIRE.fill(0); FBURNT.fill(0); S.fireN = 0; S.fireStop = false; fireTickT = 0; fireHurtT = 0;
    S.t = 0; S.drained = false; S.arcT = 8; S.iceT = 20; S.dusk = false; S.blocked = null; S.house = null; S.trickT = 0; S.magT = 0; S.lblSec = -1; S.aLblSec = -1; S.aLbl2K = -1;
    S.fireTimer = 6; S.emberT = 0; S.stormT = 6;
    S.rs = mkR(((run.seed >>> 0) ^ (run.stageIndex * 7919 + 13)) >>> 0);
  }
  function scatter(run, name, n, s0, s1, solidR, dy, game, margin, clearSpawn) {
    var b = run.bounds, sp = run.mapDef.spawn, rg = game ? KS.rng : null, w = b.x1 - b.x0 - 2 * margin, h = b.y1 - b.y0 - 2 * margin;
    for (var i = 0; i < n; i++) {
      var x = b.x0 + margin + (rg ? rg.next() : S.rs()) * w, y = b.y0 + margin + (rg ? rg.next() : S.rs()) * h, s = s0 + (rg ? rg.next() : S.rs()) * (s1 - s0);
      var dx = x - sp.x, dy2 = y - sp.y; if (dx * dx + dy2 * dy2 < clearSpawn * clearSpawn) continue;
      if (S.blocked && S.blocked(x, y)) continue;
      addProp(name, x, y, s, 0);
      if (solidR > 0) addObstacle(run, x, y + dy * s, solidR * s);
    }
  }
  function stageSetup(run, md, o) {
    resetStage(run, md);
    var wo = run.workOrder, insp = hasCond(run, "inspection");
    wo.need = Math.round(75 * (1 + 0.5 * run.stagesCleared) * (insp ? 1.25 : 1)); wo.unlockAt = insp ? 60 : 120;
    run.flags["maps.dark"] = false;
    o.build(run, md);
    placeLowboy(run, md);
    o.objective(run, md);
    KS.maps.placeInteractables(run);
    if (o.post) o.post(run, md);
    if (run.stageIndex === 0) tip("interact", TEXT.tips.interact);
  }
  function stageUpdate(dt, run, md, o) {
    S.t += dt;
    var dark = hasCond(run, "night") || (!!o.duskDark && run.stageTime >= 480);
    run.flags["maps.dark"] = dark;
    if (o.duskDark && !S.dusk && run.stageTime >= 480 && !hasCond(run, "night")) { S.dusk = true; say(TEXT.banners.dusk[0], TEXT.banners.dusk[1], 4); }
    KS.maps.workOrderUpdate(dt, run);
    if (o.tick) o.tick(dt, run, md);
    var st = run.stageTime;
    if (st >= 45 && !run.flags["maps.tipL"]) { run.flags["maps.tipL"] = true; tip("lowboy", TEXT.tips.lowboy); }
    if (st >= 90 && !run.flags["maps.tipO"]) { run.flags["maps.tipO"] = true; tip("objective", TEXT.tips.objective); }
    if (run.pendingConfirm && !run.flags["maps.tipC"]) { run.flags["maps.tipC"] = true; tip("confirm", TEXT.tips.confirm); }
    if (hasCond(run, "storm") && !KS.headless) { S.stormT -= dt; if (S.stormT <= 0) { S.stormT = 9 + KS.frand() * 12; KS.flash("rgba(220,235,255,0.5)", 0.12); KS.shake(2); } }
  }
  function drawPreviewCommon(ctx, w, h, t, md, o) {
    var tile = getTile(md.id);
    if (!tile) { ctx.fillStyle = md.palette.ground; ctx.fillRect(0, 0, w, h); return; }
    if (!md._pPat || md._pCtx !== ctx) { md._pPat = ctx.createPattern(tile, "repeat"); md._pCtx = ctx; }
    var ox = -((t * 26) % 1024), oy = -((t * 9) % 1024);
    ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = md._pPat; ctx.fillRect(-ox, -oy, w, h); ctx.restore();
    if (o.preview) o.preview(ctx, w, h, t, ox, oy);
    var pp = o.pp;
    if (pp) {
      for (var i = 0; i < pp.length; i++) {
        var q = pp[i], s = spr(q[0]); if (!s) continue;
        var x = (((q[1] + ox) % 1024) + 1024) % 1024 - 80, y = (((q[2] + oy) % 1024) + 1024) % 1024 - 80;
        for (var rx = 0; rx < 2; rx++) for (var ry = 0; ry < 2; ry++) {
          var px = x + rx * 1024, py = y + ry * 1024; if (px > w + 120 || py > h + 120) continue;
          blit(ctx, s, px, py, q[3] || 1);
        }
      }
    }
    if (o.tint) { ctx.fillStyle = o.tint; ctx.fillRect(0, 0, w, h); }
  }

  var MAPS = {};
  function regMap(o) {
    var tm = TEXT.maps[o.id], to = TEXT.obj[o.id];
    var md = {
      id: o.id, name: tm.name, subtitle: tm.sub, order: o.order, w: o.w, h: o.h, spawn: o.spawn, corridor: o.corridor || null, density: 1,
      palette: o.palette, spawnWeights: o.sw, bias: o.bias, surgeTypes: o.surge, boss: o.boss,
      objective: { id: o.id, name: to.name, desc: to.desc, total: o.total }, music: o.music, unlock: o.unlock,
      wall: o.wall, mimicMul: o.mimicMul || 1, _kindMap: true, groundA: o.groundA, groundB: o.groundB,
      setup: function (run) { stageSetup(run, md, o); },
      update: function (dt, run) { stageUpdate(dt, run, md, o); },
      drawGround: function (ctx, cam, run) { drawGroundCommon(ctx, cam, run, md); },
      drawPreview: function (ctx, w, h, t) { drawPreviewCommon(ctx, w, h, t, md, o); }
    };
    if (o.ia) md.interactables = o.ia;
    if (o.overhead) md.drawOverhead = o.overhead;
    if (o.zoneMul) md.zoneMul = o.zoneMul;
    MAPS[o.id] = md;
    return KS.registerMap(md);
  }
  var SW_BULB = ["#d6402f", "#f6d24a", "#5ad07a", "#5aa8ff"];

  // --- M1 The Back Forty ---
  regMap({
    id: "backforty", order: 1, w: 4000, h: 4000, spawn: { x: 2000, y: 2000 }, palette: { ground: "#e9e4d8", accent: "#a65a3b", edge: "#2f4a32" },
    sw: { runner: 1.5, sweetgum: 1.5, sapling: 1.5, stump: 1.2, spitter: 0 }, bias: {}, surge: ["runner", "sweetgum"], boss: "kudzuking", total: 3, music: "jingle", unlock: null,
    wall: { c: ["#2f5a2c", "#3f7a38", "#27492a", "#4f9142"], bulb: SW_BULB, tri: false },
    pp: [["pine", 120, 160, 1], ["pine2", 540, 700, 1.1], ["pine", 880, 300, 0.9], ["stump_s", 300, 520, 1], ["pallet", 700, 120, 1], ["barrel", 420, 880, 1], ["snowdrift", 160, 800, 1], ["pine2", 960, 860, 1]],
    build: function (run, md) {
      var sp = md.spawn, i;
      scatter(run, "snowdrift", 40, 0.8, 1.5, 0, 0, false, 120, 120);
      scatter(run, "pallet", 26, 0.9, 1.1, 0, 0, false, 200, 260);
      var tx = sp.x - 360, ty = sp.y - 280; addProp("jobtrailer", tx, ty, 1, 0);
      addObstacle(run, tx - 56, ty + 8, 32); addObstacle(run, tx, ty + 8, 32); addObstacle(run, tx + 56, ty + 8, 32);
      scatter(run, "stump_s", 34, 0.9, 1.3, 15, 4, true, 160, 260);
      scatter(run, "barrel", 14, 1, 1, 12, 6, true, 200, 280);
      for (i = 0; i < 90; i++) {
        var x = 160 + KS.rng.next() * 3680, y = 160 + KS.rng.next() * 3680, s = 0.9 + KS.rng.next() * 0.45, dx = x - sp.x, dy = y - sp.y;
        if (dx * dx + dy * dy < 300 * 300) continue;
        addProp(i % 3 ? "pine" : "pine2", x, y, s, 0); if (i < 40) addObstacle(run, x, y + 18 * s, 13 * s);
      }
    },
    objective: function (run, md) { objPlace(run, "mound", 3, 50, 600, 1500, 500, 8, 60); },
    tick: function (dt, run) { channelTick(dt, run); }
  });

  // --- M2 Creek Bottom ---
  function creekDist(x, y) {
    var best = 1e9;
    for (var i = 0; i < 41; i++) { var d = distSeg(x, y, CREEK[2 * i], CREEK[2 * i + 1], CREEK[2 * i + 2], CREEK[2 * i + 3]); if (d < best) best = d; }
    return best;
  }
  function creekAt(f, out) {
    var u = f * 41, i = min(40, u | 0), k = u - i;
    out.x = CREEK[2 * i] + (CREEK[2 * i + 2] - CREEK[2 * i]) * k; out.y = CREEK[2 * i + 1] + (CREEK[2 * i + 3] - CREEK[2 * i + 1]) * k;
    var dx = CREEK[2 * i + 2] - CREEK[2 * i], dy = CREEK[2 * i + 3] - CREEK[2 * i + 1], l = sqrt(dx * dx + dy * dy) || 1; out.nx = -dy / l; out.ny = dx / l;
  }
  var CP = { x: 0, y: 0, nx: 0, ny: 1 };
  function creekPatches(run, id, n, offMin, offMax, rMin, rMax) {
    var rng = KS.rng, b = run.bounds, sp = run.mapDef.spawn;
    for (var i = 0, tries = 0; i < n && tries < n * 12; tries++) {
      creekAt(0.04 + rng.next() * 0.92, CP);
      var off = (offMin + rng.next() * (offMax - offMin)) * (rng.chance(0.5) ? 1 : -1), x = CP.x + CP.nx * off, y = CP.y + CP.ny * off;
      if (x < b.x0 + 140 || x > b.x1 - 140 || y < b.y0 + 140 || y > b.y1 - 140) continue;
      var dx = x - sp.x, dy = y - sp.y; if (dx * dx + dy * dy < 340 * 340) continue;
      KS.spawnHazard(id, x, y, { r: rMin + rng.next() * (rMax - rMin) }); i++;
    }
  }
  regMap({
    id: "creek", order: 2, w: 4000, h: 4000, spawn: { x: 2000, y: 2300 }, palette: { ground: "#9aa586", accent: "#3c8c8c", edge: "#2c5a50" },
    sw: { snare: 2, rootwad: 2, sweetgum: 1.5, spitter: 2 }, bias: { frost: 1.5, fire: 1.5 }, surge: ["snare", "spitter"], boss: "granddaddy", total: 4, music: "waltz",
    unlock: { reachStage: 2, objective: "backforty" },
    wall: { c: ["#2c5a50", "#3a6f60", "#244a40", "#46806c"], bulb: ["#cfe9ef", "#9ad2c8", "#f6d24a", "#cfe9ef"], tri: false },
    pp: [["sweetgum", 200, 220, 1], ["cattail", 560, 600, 1], ["cattail", 600, 640, 1], ["log", 800, 300, 1], ["cattail", 120, 760, 1], ["sweetgum", 760, 900, 0.9]],
    preview: function (ctx, w, h, t, ox, oy) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (var pass = 0; pass < 3; pass++) {
        ctx.strokeStyle = pass === 0 ? "#6b5136" : (pass === 1 ? "#cfe9ef" : "#3c8c8c"); ctx.lineWidth = pass === 0 ? 120 : (pass === 1 ? 100 : 80);
        ctx.beginPath(); for (var x = -40; x <= w + 40; x += 30) { var y = h * 0.62 - x * 0.22 + sin((x - ox) / 140) * 40; if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
      }
    },
    groundA: function (ctx, cam, run) {
      var t = KS.G.realTime; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(CREEK[0], CREEK[1]); for (var i = 1; i < 42; i++) ctx.lineTo(CREEK[2 * i], CREEK[2 * i + 1]);
      if (!S.drained) {
        ctx.strokeStyle = "#6b5136"; ctx.lineWidth = 350; ctx.stroke(); ctx.strokeStyle = "#cfe9ef"; ctx.lineWidth = 305; ctx.stroke();
        ctx.strokeStyle = "#3c8c8c"; ctx.lineWidth = 255; ctx.stroke(); ctx.strokeStyle = "#4aa0a0"; ctx.lineWidth = 170; ctx.stroke();
        ctx.strokeStyle = "rgba(223,242,246,0.45)"; ctx.lineWidth = 3; ctx.setLineDash(DASH); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash(NODASH);
      } else {
        ctx.strokeStyle = "#6b5136"; ctx.lineWidth = 350; ctx.stroke(); ctx.strokeStyle = "rgba(90,67,44,0.7)"; ctx.lineWidth = 280; ctx.stroke();
        ctx.strokeStyle = "#3c8c8c"; ctx.lineWidth = 56; ctx.stroke(); ctx.strokeStyle = "rgba(223,242,246,0.4)"; ctx.lineWidth = 2; ctx.setLineDash(DASH); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash(NODASH);
      }
    },
    build: function (run, md) {
      for (var i = 0; i < 42; i++) { var f = i / 41; CREEK[2 * i] = 150 + 3700 * f; CREEK[2 * i + 1] = 400 + 3200 * f + 380 * sin(TAU * 1.6 * f + 0.6); }
      S.blocked = function (x, y) { return creekDist(x, y) < 190; };
      scatter(run, "cattail", 120, 0.9, 1.4, 0, 0, false, 120, 140);
      var rng = KS.rng, n = 0, b = run.bounds, sp = md.spawn, x, y, k;
      for (k = 0; k < 60 && n < 14; k++) {
        x = 200 + rng.next() * 3600; y = 200 + rng.next() * 3600; var dx = x - sp.x, dy = y - sp.y;
        if (dx * dx + dy * dy < 340 * 340 || creekDist(x, y) < 210) continue;
        var r = 30 + rng.next() * 20, s = r * 2.3 / 150, a = rng.next() * Math.PI;
        addProp("log", x, y, s, a); addObstacle(run, x, y, r); n++;
      }
      for (k = 0, n = 0; k < 80 && n < 16; k++) {
        x = 200 + rng.next() * 3600; y = 200 + rng.next() * 3600; var dx2 = x - sp.x, dy2 = y - sp.y;
        if (dx2 * dx2 + dy2 * dy2 < 340 * 340 || creekDist(x, y) < 230) continue;
        addProp("sweetgum", x, y, 1, 0); addObstacle(run, x, y + 16, 20); n++;
      }
      creekPatches(run, "m_mud", 14, 190, 430, 70, 115);
      creekPatches(run, "m_ice", 8, 110, 320, 62, 88);
    },
    objective: function (run, md) {
      OB.n = 4; OB.kind = "dam"; OB.need = 1; OB.sr = 0;
      var fr = [0.2, 0.4, 0.6, 0.8];
      for (var i = 0; i < 4; i++) {
        creekAt(fr[i], CP); OB.x[i] = CP.x; OB.y[i] = CP.y; OB.done[i] = 0; reserve(CP.x, CP.y, 160);
        var e = KS.spawnEnemy("dam", CP.x, CP.y, { noRecycle: true }); if (e) { e.ai.idx = i; OB.uid[i] = e.uid; }
      }
    },
    tick: function (dt, run) {
      if (S.drained) return;
      S.iceT -= dt;
      if (S.iceT <= 0) {
        S.iceT = 20; var pool = run.hazards, c = 0; for (var i = 0; i < pool.n; i++) if (pool.list[i].alive && pool.list[i].defId === "m_ice") c++;
        if (c < 8) creekPatches(run, "m_ice", 1, 110, 320, 62, 88);
      }
    }
  });

  // --- M3 Powerline Easement ---
  var TY = [400, 1200, 2000, 2800, 3600, 4400, 5200];
  regMap({
    id: "easement", order: 3, w: 1400, h: 6000, corridor: "vertical", spawn: { x: 700, y: 3000 }, palette: { ground: "#b8b2a2", accent: "#6c7480", edge: "#1a2f22" },
    sw: { sparker: 3, creeper: 2, willwreath: 1.5, crow: 2, spitter: 0 }, bias: { haul: 1.5, ring: 1.5 }, surge: ["sparker", "creeper"], boss: "tangled", total: 4, music: "hum",
    unlock: { reachStage: 3, objective: "creek" },
    ia: { toolbox: 8, gangbox: 2, counter: 2, elephant: 1, lunchwagon: 1, raffle: 2, burnbarrel: 1 },
    wall: { c: ["#1a2f22", "#223d2b", "#16281e", "#2a4a33"], bulb: ["#e8e4da", "#9ad2ff", "#e8e4da", "#f6d24a"], tri: true },
    pp: [["tower", 200, 300, 1], ["stubble", 540, 620, 1.2], ["gravel", 760, 180, 1], ["stubble", 160, 800, 1], ["gravel", 880, 760, 1.2], ["tower", 700, 900, 1]],
    preview: function (ctx, w, h, t, ox, oy) {
      ctx.strokeStyle = "rgba(42,31,26,0.35)"; ctx.lineWidth = 2;
      for (var k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(0, h * 0.3 + k * 24); ctx.quadraticCurveTo(w / 2, h * 0.3 + 70 + k * 24, w, h * 0.3 + k * 24); ctx.stroke(); }
    },
    overhead: function (ctx, cam, run) {
      var b = run.bounds, vy0 = cam.y - cam.h / 2 - 100, vy1 = cam.y + cam.h / 2 + 100;
      ctx.strokeStyle = "rgba(42,31,26,0.32)"; ctx.lineWidth = 2;
      for (var k = -1; k < TY.length; k++) {
        var y0 = k < 0 ? b.y0 - 200 : TY[k], y1 = k + 1 < TY.length ? TY[k + 1] : b.y1 + 200;
        if (y1 < vy0 || y0 > vy1) continue;
        for (var w = -1; w <= 1; w++) {
          var x = 700 + w * 34; ctx.beginPath(); ctx.moveTo(x, y0); ctx.quadraticCurveTo(x + (w === 0 ? 0 : w * 16), (y0 + y1) / 2 + 30, x, y1); ctx.stroke();
        }
      }
    },
    build: function (run, md) {
      var i, idx = [0, 1, 2, 4, 5, 6]; KS.rng.shuffle(idx); S.towerIdx = idx.slice(0, 4);
      for (i = 0; i < TY.length; i++) {
        if (S.towerIdx.indexOf(i) >= 0) continue;
        addProp("tower", 700, TY[i], 1, 0); addObstacle(run, 700, TY[i], 26);
      }
      scatter(run, "gravel", 90, 0.8, 1.4, 0, 0, false, 120, 100);
      scatter(run, "stubble", 160, 0.8, 1.4, 0, 0, false, 110, 100);
      scatter(run, "bush", 30, 0.8, 1.2, 0, 0, false, 140, 160);
    },
    objective: function (run, md) {
      OB.n = 4; OB.kind = "tower"; OB.need = 1; OB.sr = 0;
      for (var i = 0; i < 4; i++) {
        var y = TY[S.towerIdx[i]]; OB.x[i] = 700; OB.y[i] = y; OB.done[i] = 0; reserve(700, y, 150);
        var e = KS.spawnEnemy("tower", 700, y, { noRecycle: true }); if (e) { e.ai.idx = i; OB.uid[i] = e.uid; }
      }
    },
    tick: function (dt, run) {
      S.arcT -= dt;
      if (S.arcT <= 0) {
        S.arcT = 12; var p = run.player;
        KS.spawnHazard("m_arc", 700, U.clamp(p.y + (KS.rng.next() - 0.5) * 300, 80, run.bounds.y1 - 80), { w: 1500, h: 60, ang: 0, tele: 1.2, life: 1.6, dmg: 15 * run.dmgMul });
      }
    }
  });

  // --- M4 The Old Homeplace ---
  function lightGroundB(ctx, cam, run) {
    var t = KS.G.realTime;
    for (var i = 0; i < lsN; i++) {
      var x1 = LS[4 * i], y1 = LS[4 * i + 1], x2 = LS[4 * i + 2], y2 = LS[4 * i + 3], mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      if (!KS.onScreen(mx, my, 190)) continue;
      ctx.strokeStyle = "#2a2a28"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(mx, my + 16, x2, y2); ctx.stroke();
      var len = sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)), nb = (len / 20) | 0;
      for (var k = 0; k <= nb; k++) {
        var f = k / nb, bx = x1 + (x2 - x1) * f, by = y1 + (y2 - y1) * f + sin(f * Math.PI) * 8;
        var on = (((t * 2.2 + i + k * 0.5) | 0) & 3);
        ctx.fillStyle = SW_BULB[(k + on) & 3]; ctx.globalAlpha = on === 0 ? 0.55 : 1;
        ctx.beginPath(); ctx.arc(bx, by, 3.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  regMap({
    id: "homeplace", order: 4, w: 4000, h: 4000, spawn: { x: 2000, y: 2650 }, palette: { ground: "#5a6b4a", accent: "#f2c36b", edge: "#243a2a" },
    sw: { caroler: 2, willwreath: 2, ivy: 2, spitter: 0 }, bias: { fire: 1.3, ring: 1.3 }, surge: ["willwreath", "mistletoe"], boss: "inflatable", total: 5, music: "porch",
    unlock: { reachStage: 4, objective: "easement" }, mimicMul: 2, duskDark: true,
    wall: { c: ["#243a2a", "#2f4a32", "#1c2e22", "#3a5a3a"], bulb: SW_BULB, tri: false },
    pp: [["house", 300, 300, 0.7], ["fence", 700, 600, 1], ["tangle", 160, 780, 1], ["swing", 760, 860, 0.9], ["bush", 540, 120, 1], ["vines", 880, 200, 1]],
    tint: "rgba(40,30,70,0.18)",
    groundB: lightGroundB,
    zoneMul: function (x, y, run) {
      if (OB.kind !== "breaker") return 1;
      for (var i = 0; i < OB.n; i++) if (OB.done[i]) { var dx = x - OB.x[i], dy = y - OB.y[i]; if (dx * dx + dy * dy < 90000) return 1.2; }
      return 1;
    },
    build: function (run, md) {
      var hx = 2000, hy = 1750, i, j; S.house = { x: hx, y: hy + 130 };
      scatter(run, "vines", 60, 0.9, 1.6, 0, 0, false, 100, 120);
      scatter(run, "tangle", 26, 0.9, 1.3, 0, 0, false, 160, 220);
      addProp("house", hx, hy, 1, 0);
      for (i = -1; i <= 2; i++) for (j = -1; j <= 1; j++) addObstacle(run, hx + (i - 0.5) * 100, hy + j * 90 - 10, 62);
      var rng = KS.rng, k, a, d, x, y;
      for (k = 0; k < 24; k++) {
        a = rng.next() * TAU; d = 480 + rng.next() * 700; x = hx + cos(a) * d; y = hy + 60 + sin(a) * d * 0.9;
        if (x < 160 || x > 3840 || y < 160 || y > 3840) continue; addProp("fence", x, y, 1.1, rng.next() * 3.14);
      }
      addProp("swing", 1480, 2250, 1, 0); addObstacle(run, 1450, 2250, 26); addObstacle(run, 1510, 2250, 26);
      scatter(run, "bush", 32, 0.9, 1.3, 13, 6, true, 160, 280);
      lsN = 0;
      for (k = 0; k < 40 && lsN < 12; k++) {
        x = 300 + rng.next() * 3400; y = 300 + rng.next() * 3400; a = rng.next() * TAU; d = 150 + rng.next() * 150;
        var dx = x - md.spawn.x, dy = y - md.spawn.y, hx2 = x - hx, hy2 = y - hy;
        if (dx * dx + dy * dy < 350 * 350 || hx2 * hx2 + hy2 * hy2 < 330 * 330) continue;
        LS[4 * lsN] = x; LS[4 * lsN + 1] = y; LS[4 * lsN + 2] = x + cos(a) * d; LS[4 * lsN + 3] = y + sin(a) * d; lsN++;
      }
    },
    objective: function (run, md) { objPlace(run, "breaker", 5, 36, 450, 1800, 450, 3, 50); },
    tick: function (dt, run) {
      channelTick(dt, run);
      lsCd -= dt; var p = run.player;
      if (lsCd <= 0 && p.alive) {
        for (var i = 0; i < lsN; i++) {
          if (distSeg(p.x, p.y, LS[4 * i], LS[4 * i + 1], LS[4 * i + 2], LS[4 * i + 3]) < p.r + 4) {
            KS.hurtPlayer(8 * run.dmgMul, "hazard", p.x, p.y); KS.fx("sparks", p.x, p.y, "#ffe28a", 8, 2); sfx("zap"); lsCd = 1; break;
          }
        }
      }
    }
  });

  // --- M5 Longleaf Pines ---
  function igniteCell(idx) {
    if (FIRE[idx] || S.fireN >= 40) return false;
    FIRE[idx] = 1; FBURNT[idx] = 1; FT[idx] = S.fireStop ? 2 + KS.rng.next() * 18 : 99; FLIST[S.fireN++] = idx; return true;
  }
  function fireGroundB(ctx, cam, run) {
    var b = run.bounds, t = KS.G.realTime, cx0 = max(0, ((cam.x - cam.w / 2 - b.x0) / 80) | 0), cx1 = min(FIRE_W - 1, ((cam.x + cam.w / 2 - b.x0) / 80) | 0);
    var cy0 = max(0, ((cam.y - cam.h / 2 - b.y0) / 80) | 0), cy1 = min(FIRE_W - 1, ((cam.y + cam.h / 2 - b.y0) / 80) | 0), cx, cy, idx;
    ctx.fillStyle = "rgba(34,22,14,0.32)";
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) if (FBURNT[cy * FIRE_W + cx]) ctx.fillRect(cx * 80 + 3, cy * 80 + 3, 74, 74);
    for (cy = cy0; cy <= cy1; cy++) for (cx = cx0; cx <= cx1; cx++) {
      idx = cy * FIRE_W + cx; if (!FIRE[idx]) continue;
      var x = cx * 80, y = cy * 80, ph = idx * 1.7, fade = S.fireStop ? min(1, FT[idx] / 2) : 1;
      ctx.globalAlpha = fade; ctx.fillStyle = "rgba(255,150,60,0.16)"; ctx.fillRect(x - 6, y - 6, 92, 92);
      ctx.fillStyle = "rgba(217,99,42,0.55)"; ctx.fillRect(x + 2, y + 2, 76, 76);
      for (var k = 0; k < 4; k++) {
        var fx = x + 14 + k * 17 + sin(t * 3 + ph + k) * 4, fy = y + 60 - (k % 2) * 14, fh = 26 + 16 * sin(t * 9 + ph + k * 2);
        ctx.fillStyle = "#f6761e"; ctx.beginPath(); ctx.moveTo(fx - 9, fy); ctx.quadraticCurveTo(fx - 3, fy - fh * 0.5, fx + sin(t * 7 + k) * 3, fy - fh); ctx.quadraticCurveTo(fx + 4, fy - fh * 0.5, fx + 9, fy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffd25a"; ctx.beginPath(); ctx.moveTo(fx - 4.5, fy); ctx.quadraticCurveTo(fx - 1, fy - fh * 0.3, fx, fy - fh * 0.62); ctx.quadraticCurveTo(fx + 2, fy - fh * 0.3, fx + 4.5, fy); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
  regMap({
    id: "longleaf", order: 5, w: 4400, h: 4400, spawn: { x: 2200, y: 2200 }, palette: { ground: "#b5783a", accent: "#d9632a", edge: "#2c4a28" },
    sw: { pitcher: 2.5, briar: 2, wisteria: 1.5, antmound: 1.5, spitter: 1 }, bias: { blade: 1.5 }, surge: ["briar", "pitcher"], boss: "matriarch", total: 3, music: "shadows",
    unlock: { reachStage: 5, objective: "homeplace" }, tint: "rgba(255,120,40,0.10)",
    wall: { c: ["#2c4a28", "#385a30", "#22381f", "#436a38"], bulb: ["#f6a23a", "#d9632a", "#f6d24a", "#f6a23a"], tri: false },
    pp: [["lpine", 140, 140, 1], ["lpine", 280, 140, 1], ["lpine", 420, 140, 1], ["lpine", 140, 360, 1], ["lpine", 280, 360, 1], ["lpine", 560, 360, 1], ["slash", 700, 260, 1], ["lpine", 840, 140, 1], ["lpine", 840, 360, 1], ["cone", 480, 260, 1.4], ["slash", 300, 760, 1], ["lpine", 140, 600, 1], ["lpine", 420, 600, 1]],
    groundB: fireGroundB,
    build: function (run, md) {
      var j, k, x, y;
      scatter(run, "needles", 150, 0.9, 1.5, 0, 0, false, 100, 100);
      scatter(run, "cone", 60, 0.9, 1.4, 0, 0, false, 100, 100);
      scatter(run, "slash", 44, 0.9, 1.3, 0, 0, false, 160, 220);
      for (k = 0; k < 20; k++) {
        y = 110 + 220 * k;
        for (j = 0; j < 31; j++) {
          if (j % 5 === 4) continue; x = 70 + 140 * j;
          addProp("lpine", x, y, 0.95 + hf(j, k) * 0.22, 0); addObstacle(run, x, y, 14);
        }
      }
    },
    objective: function (run, md) { objPlace(run, "stake", 3, 40, 500, 1700, 500, 6, 50); },
    post: function (run, md) {
      var rng = KS.rng, wo = run.workOrder, sp = md.spawn;
      for (var k = 0, n = 0; k < 80 && n < 3; k++) {
        var cx = rng.int(4, FIRE_W - 5), cy = rng.int(4, FIRE_W - 5), x = cx * 80 + 40, y = cy * 80 + 40, dx = x - sp.x, dy = y - sp.y, lx = x - wo.x, ly = y - wo.y;
        if (dx * dx + dy * dy < 450 * 450 || lx * lx + ly * ly < 350 * 350) continue;
        if (igniteCell(cy * FIRE_W + cx)) n++;
      }
    },
    tick: function (dt, run) {
      channelTick(dt, run);
      var rng = KS.rng, i, idx;
      if (S.fireStop) {
        for (i = S.fireN - 1; i >= 0; i--) { idx = FLIST[i]; FT[idx] -= dt; if (FT[idx] <= 0) { FIRE[idx] = 0; FLIST[i] = FLIST[--S.fireN]; } }
      } else {
        S.fireTimer -= dt;
        if (S.fireTimer <= 0) {
          S.fireTimer = run.stageTime >= 480 ? 3 : 6;
          if (S.fireN > 0 && S.fireN < 40) {
            for (var tr = 0; tr < 4; tr++) {
              idx = FLIST[rng.int(0, S.fireN - 1)]; var d = rng.int(0, 3), cx = idx % FIRE_W, cy = (idx / FIRE_W) | 0;
              if (d === 0) cx++; else if (d === 1) cx--; else if (d === 2) cy++; else cy--;
              if (cx < 0 || cy < 0 || cx >= FIRE_W || cy >= FIRE_W) continue;
              if (igniteCell(cy * FIRE_W + cx)) break;
            }
          }
        }
      }
      var p = run.player; fireHurtT -= dt; fireTickT -= dt;
      if (fireHurtT <= 0) {
        fireHurtT = 0.5;
        var pcx = (p.x / 80) | 0, pcy = (p.y / 80) | 0;
        if (p.alive && pcx >= 0 && pcy >= 0 && pcx < FIRE_W && pcy < FIRE_W && FIRE[pcy * FIRE_W + pcx]) { KS.hurtPlayer(3 * run.dmgMul, "hazard", p.x, p.y); KS.fx("embers", p.x, p.y, "#ffb347", 3, 2); }
      }
      if (fireTickT <= 0) {
        fireTickT = 0.25;
        for (i = 0; i < S.fireN; i++) {
          idx = FLIST[i]; var fx = (idx % FIRE_W) * 80 + 40, fy = ((idx / FIRE_W) | 0) * 80 + 40, n = KS.grid.query(fx, fy, 60, KS.tmp.b, 120);
          for (var k = 0; k < n; k++) {
            var e = KS.tmp.b[k]; if (!e.alive || e.objective || abs(e.x - fx) > 40 + e.r * 0.5 || abs(e.y - fy) > 40 + e.r * 0.5) continue;
            FIRESRC.depth = 0; FIRESRC.x = fx; FIRESRC.y = fy; KS.damage(e, 5, FIRESRC); if (e.alive) KS.applyStatus(e, "burn", 8, 2, FIRESRC);
          }
        }
      }
      S.emberT -= dt;
      if (S.emberT <= 0 && S.fireN > 0 && !KS.headless) { S.emberT = 0.2; idx = FLIST[(KS.frand() * S.fireN) | 0]; KS.fx("embers", (idx % FIRE_W) * 80 + 40, ((idx / FIRE_W) | 0) * 80 + 50, "#ffb347", 2, 2); }
    }
  });

  // ---------------------------------------------------------------------------
  // KS.maps (whole object replaces the core stub)
  // ---------------------------------------------------------------------------
  KS.maps = { placeInteractables: placeInteractables, workOrderUpdate: workOrderUpdate, arrows: arrows };

})(window.KS);
