/* ============================================================
   Kudzu Survivors v2 - audio.js (ENG-AUDIO)
   SFX synth + procedural music sequencer, all Web Audio, no files.
   Owns KS.audio (replaces the core stub whole). Never touches
   storage or DOM. Nothing is created before the first gesture.
   ============================================================ */
(function (KS) {
  "use strict";

  // ---- TEXT/config table (no joke strings here; audio has none) ----
  var VOL_MUSIC = 0.5, VOL_SFX = 0.7;          // scale applied on top of settings
  var BUDGET_STARTS = 12, BUDGET_WINDOW = 0.1, BUDGET_VOICES = 24;
  var LOOKAHEAD = 0.1, TIMER_MS = 25;

  var ctx = null, out = null, musicGain = null, sfxGain = null, noiseBuf = null;
  var unlocked = false, started = false;
  var volMusic = 0.6, volSfx = 0.8, duck = 1;
  var wantTrack = null, wantFade = 1, curTrackId = null, intens = 0;
  var decks = [], timer = 0, listenersOn = false;
  var startRing = [], startRingI = 0, voiceEnds = [], lastPlay = {}, warned = {};
  var i0;
  for (i0 = 0; i0 < BUDGET_STARTS; i0++) startRing.push(-1);
  for (i0 = 0; i0 < BUDGET_VOICES; i0++) voiceEnds.push(0);

  function muted() { return !window.Sound || window.Sound.muted === true; }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function rnd() { return KS.frand(); }

  // ============================================================
  // Context and buses
  // ============================================================
  function ensure() {
    if (!window.Sound || muted()) return false;
    if (ctx) { if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} } return true; }
    var c = null, o = null;
    try { c = window.Sound.context(); o = window.Sound.output(); } catch (e2) { return false; }
    if (!c || !o) return false;
    ctx = c; out = o;
    musicGain = ctx.createGain(); sfxGain = ctx.createGain();
    musicGain.gain.value = 0; sfxGain.gain.value = 0;
    musicGain.connect(out); sfxGain.connect(out);
    var len = ctx.sampleRate | 0, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), i;
    for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;   // cosmetic buffer fill, load-once
    noiseBuf = b;
    applyGains(0);
    return true;
  }
  function applyGains(tc) {
    if (!ctx) return;
    var m = muted();
    var mg = m ? 0 : volMusic * VOL_MUSIC * duck, sg = m ? 0 : volSfx * VOL_SFX;
    var t = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(t); sfxGain.gain.cancelScheduledValues(t);
    if (tc > 0) { musicGain.gain.setTargetAtTime(mg, t, tc); sfxGain.gain.setTargetAtTime(sg, t, tc); }
    else { musicGain.gain.setValueAtTime(mg, t); sfxGain.gain.setValueAtTime(sg, t); }
  }

  // ============================================================
  // SFX building blocks
  // ============================================================
  function tone(f, dur, type, vol, at, slide, att, dest) {
    var t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain(), a = att || 0.004;
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(25, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function noise(dur, vol, ftype, f, q, at, fslide, dest) {
    var t = ctx.currentTime + (at || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    fl.type = ftype || "lowpass"; fl.Q.value = q || 0.7;
    fl.frequency.setValueAtTime(f || 1000, t);
    if (fslide) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f + fslide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.006, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest || sfxGain);
    s.start(t, rnd() * 0.8); s.stop(t + dur + 0.03);
  }
  function bell(f, dur, vol, at) {
    tone(f, dur, "sine", vol, at, 0, 0.003);
    tone(f * 2.76, dur * 0.55, "sine", vol * 0.35, at, 0, 0.002);
    tone(f * 5.4, dur * 0.25, "sine", vol * 0.12, at, 0, 0.002);
  }
  function arp(base, semis, step, dur, vol, type) {
    var i;
    for (i = 0; i < semis.length; i++) tone(base * Math.pow(2, semis[i] / 12), dur, type || "triangle", vol, i * step, 0, 0.005);
  }
  function jit(r) { return 1 + (rnd() * 2 - 1) * (r || 0.08); }

  // ============================================================
  // SFX table: name -> { dur (voice length, s), gap (rate limit, s), free (bypass budget), fn(arg) }
  // ============================================================
  var SFX = {
    hit:    { dur: 0.07, gap: 0.05, fn: function () { noise(0.06, 0.22, "lowpass", 900 * jit(0.2), 0.8); tone(150 * jit(0.1), 0.05, "sine", 0.12, 0, -60); } },
    crit:   { dur: 0.1, gap: 0.05, fn: function () { noise(0.07, 0.24, "lowpass", 1800 * jit(0.1), 1); tone(1500, 0.05, "square", 0.07, 0, 0, 0.001); tone(260, 0.07, "sine", 0.12, 0, -80); } },
    kill:   { dur: 0.08, gap: 0.05, fn: function () { noise(0.07, 0.26, "bandpass", 700 * jit(0.3), 1.2, 0, -300); tone(110 * jit(0.2), 0.06, "triangle", 0.1, 0, -40); } },
    gem:    { dur: 0.09, gap: 0.05, fn: function () { tone((880 + rnd() * 220) | 0, 0.09, "triangle", 0.14, 0, 0, 0.003); } },
    tinsel: { dur: 0.3, gap: 0.04, fn: function () { tone(1318, 0.14, "sine", 0.13, 0); tone(1760, 0.22, "sine", 0.12, 0.06); tone(3520, 0.1, "sine", 0.03, 0.06); } },
    hurt:   { dur: 0.25, gap: 0.08, fn: function () { tone(140, 0.22, "sawtooth", 0.2, 0, -60); noise(0.12, 0.12, "lowpass", 500, 1); } },
    heal:   { dur: 0.3, gap: 0.08, fn: function () { tone(440, 0.28, "sine", 0.15, 0, 330, 0.02); tone(660, 0.22, "sine", 0.06, 0.05, 220, 0.02); } },
    levelup: { dur: 0.7, free: true, fn: function () { arp(523.25, [0, 4, 7, 12], 0.09, 0.3, 0.17, "triangle"); bell(1046.5, 0.5, 0.06, 0.27); } },
    cardPick: { dur: 0.2, free: true, fn: function () { noise(0.12, 0.12, "bandpass", 3000, 0.6, 0, -2000); tone(180, 0.1, "sine", 0.2, 0.1, -80); noise(0.04, 0.1, "lowpass", 1200, 1, 0.1); } },
    reroll: { dur: 0.3, fn: function () { var i; for (i = 0; i < 5; i++) noise(0.05, 0.1, "bandpass", 2200 + i * 300, 0.8, i * 0.045); } },
    banish: { dur: 0.25, fn: function () { tone(110, 0.2, "sine", 0.28, 0, -50); noise(0.1, 0.18, "lowpass", 400, 1); } },
    evolve: { dur: 1.3, free: true, fn: function () { arp(261.63, [0, 4, 7, 12, 16, 19, 24], 0.07, 0.35, 0.14, "triangle"); bell(523.25, 1.1, 0.11, 0.5); bell(659.25, 1.1, 0.09, 0.5); bell(783.99, 1.1, 0.09, 0.5); bell(1046.5, 1.1, 0.07, 0.5); } },
    chestOpen: { dur: 0.3, free: true, fn: function () { tone(90, 0.12, "square", 0.2, 0, -30); noise(0.02, 0.2, "highpass", 3000, 1, 0.1); tone(60, 0.18, "square", 0.16, 0.11, -15); } },
    itemCommon:    { dur: 0.6, free: true, fn: function () { bell(784, 0.5, 0.14, 0); bell(988, 0.5, 0.1, 0.0); } },
    itemUncommon:  { dur: 0.8, free: true, fn: function () { bell(784, 0.6, 0.14, 0); bell(988, 0.6, 0.1, 0); bell(1175, 0.7, 0.1, 0.07); } },
    itemRare:      { dur: 1.0, free: true, fn: function () { bell(659, 0.8, 0.14, 0); bell(831, 0.8, 0.1, 0); bell(988, 0.8, 0.1, 0.06); bell(1318, 0.9, 0.09, 0.12); } },
    itemLegendary: { dur: 1.6, free: true, fn: function () { bell(523, 1.4, 0.14, 0); bell(659, 1.4, 0.11, 0); bell(784, 1.4, 0.11, 0.05); bell(1047, 1.4, 0.1, 0.1); bell(1319, 1.4, 0.08, 0.16); tone(130.8, 1.3, "sine", 0.14, 0, 0, 0.1); } },
    explode: { dur: 0.4, fn: function () { noise(0.35, 0.42, "lowpass", 900, 0.7, 0, -700); tone(70, 0.3, "sine", 0.3, 0, -35); } },
    zap:    { dur: 0.16, fn: function () { noise(0.12, 0.18, "bandpass", 2800 * jit(0.15), 3, 0, -1500); tone(900, 0.1, "square", 0.07, 0, -500); } },
    chime:  { dur: 0.5, fn: function (semi) { bell(659.25 * Math.pow(2, (+semi || 0) / 12), 0.45, 0.13, 0); } },
    freeze: { dur: 0.4, fn: function () { tone(2637, 0.3, "sine", 0.1, 0, -400); tone(3951, 0.2, "sine", 0.05, 0.02); } },
    burn:   { dur: 0.2, gap: 0.1, fn: function () { var i; for (i = 0; i < 4; i++) noise(0.02, 0.1, "highpass", 3500 + rnd() * 2000, 1, i * 0.04 + rnd() * 0.02); } },
    saw:    { dur: 0.1, gap: 0.09, fn: function () { tone(190 * jit(0.05), 0.08, "sawtooth", 0.06, 0, 30); noise(0.07, 0.07, "bandpass", 2200, 2); } },
    throw:  { dur: 0.2, fn: function () { noise(0.18, 0.12, "bandpass", 600, 1.5, 0, 1800); } },
    deer:   { dur: 0.4, fn: function () { bell(392, 0.3, 0.12, 0); bell(523, 0.3, 0.12, 0.12); } },
    telegraph: { dur: 0.8, gap: 0.2, fn: function () { tone(300, 0.8, "sine", 0.1, 0, 500, 0.15); } },
    bossIntro: { dur: 1.3, free: true, fn: function () { tone(73.4, 1.1, "sawtooth", 0.2, 0, 0, 0.05); tone(55, 1.2, "sawtooth", 0.2, 0.45, 0, 0.05); noise(0.6, 0.1, "lowpass", 200, 1, 0.4); } },
    bossPhase: { dur: 0.9, free: true, fn: function () { noise(0.15, 0.3, "lowpass", 800, 1); tone(60, 0.5, "sine", 0.35, 0, -25); noise(0.7, 0.15, "lowpass", 160, 1, 0.1); } },
    bossDeath: { dur: 2.0, free: true, fn: function () { arp(392, [0, -3, -7, -12, -15, -19], 0.14, 0.7, 0.12, "triangle"); noise(1.2, 0.36, "lowpass", 1200, 0.7, 0.2, -1000); tone(55, 1.2, "sine", 0.3, 0.2, -25); } },
    radio:  { dur: 0.4, fn: function () { noise(0.14, 0.12, "bandpass", 2000, 1.5); tone(1040, 0.1, "square", 0.06, 0.15); tone(1040, 0.1, "square", 0.06, 0.28); } },
    objective: { dur: 0.9, free: true, fn: function () { bell(784, 0.5, 0.13, 0); bell(988, 0.5, 0.11, 0.1); bell(1319, 0.7, 0.12, 0.2); } },
    stageClear: { dur: 1.4, free: true, fn: function () { arp(392, [0, 4, 7, 12, 7, 12, 16], 0.1, 0.4, 0.15, "triangle"); bell(1568, 1.0, 0.07, 0.5); tone(196, 0.9, "sine", 0.12, 0.5); } },
    uiClick: { dur: 0.05, free: true, fn: function () { tone(1200, 0.04, "square", 0.05, 0, -300, 0.001); } },
    uiBack:  { dur: 0.08, free: true, fn: function () { tone(700, 0.07, "square", 0.05, 0, -300, 0.001); } },
    tink:   { dur: 0.15, gap: 0.04, fn: function () { tone(2200 * jit(0.05), 0.12, "triangle", 0.1, 0, 0, 0.001); tone(3300, 0.08, "sine", 0.05); noise(0.02, 0.1, "highpass", 4000, 1); } },
    denied: { dur: 0.2, free: true, gap: 0.12, fn: function () { tone(95, 0.18, "square", 0.12, 0, -10, 0.005); } },
    abilityReady: { dur: 0.4, free: true, fn: function () { bell(1568, 0.35, 0.1, 0); } },
    ability: { dur: 0.5, free: true, fn: function () { noise(0.4, 0.2, "bandpass", 400, 1.5, 0, 2500); tone(220, 0.4, "triangle", 0.12, 0, 440); } },
    revive: { dur: 1.6, free: true, fn: function () {
      var t = ctx.currentTime, i, ff = [261.63, 329.63, 392, 523.25];
      for (i = 0; i < 4; i++) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = ff[i] * (1 + (i - 1.5) * 0.002); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.1, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + 1.55); }
      bell(1046.5, 0.9, 0.06, 0.8);
    } }
  };

  function sfx(name, arg) {
    var s = SFX[name];
    if (!s) { if (KS.debug && !warned[name]) { warned[name] = 1; KS.log("audio", "unknown sfx " + name); } return; }
    if (!unlocked || muted() || !ensure()) return;
    var now = ctx.currentTime, i, n = 0;
    if (s.gap) { var lp = lastPlay[name] || -1; if (now - lp < s.gap) return; lastPlay[name] = now; }
    if (!s.free) {
      if (now - startRing[startRingI] < BUDGET_WINDOW && startRing[startRingI] >= 0) return;
      for (i = 0; i < BUDGET_VOICES; i++) if (voiceEnds[i] > now) n++;
      if (n >= BUDGET_VOICES) return;
    }
    startRing[startRingI] = now; startRingI = (startRingI + 1) % BUDGET_STARTS;
    for (i = 0; i < BUDGET_VOICES; i++) if (voiceEnds[i] <= now) { voiceEnds[i] = now + s.dur; break; }
    s.fn(arg);
  }

  // ============================================================
  // Music
  // ============================================================
  // chord quality: 0 major, 1 minor. chords: [rootSemi, quality]. pent: pentatonic of the mode.
  var MAJ = [0, 2, 4, 7, 9], MIN = [0, 3, 5, 7, 10], MIX = [0, 2, 4, 7, 10];
  var TRACKS = {
    menu: { name: "Jingle Shuffle (music box)", bpm: 76, steps: 8, root: 60, pent: MAJ, seed: 1225, chords: [[0, 0], [5, 0], [0, 0], [7, 0]],
      lead: { type: "sine", vol: 0.1, dur: 0.7, den: 0.55, box: true }, bass: { kind: "none" }, pad: 0, tick: 0, hat: 0, drone: 0 },
    jingle: { name: "Jingle Shuffle", bpm: 120, steps: 8, root: 60, pent: MAJ, seed: 4021, chords: [[0, 0], [7, 0], [9, 1], [5, 0]],
      lead: { type: "square", vol: 0.05, dur: 0.2, den: 0.78 }, bass: { kind: "walk", type: "triangle", vol: 0.16 }, pad: 0, tick: 0, hat: 1, drone: 0, swing: 0.16 },
    waltz: { name: "Creekside Waltz", bpm: 96, steps: 6, root: 57, pent: MIN, seed: 777, chords: [[0, 1], [8, 0], [3, 0], [10, 0]],
      lead: { type: "triangle", vol: 0.1, dur: 0.38, den: 0.62 }, bass: { kind: "waltz", type: "triangle", vol: 0.15 }, pad: 0, tick: 0, hat: 0, drone: 0 },
    hum: { name: "Hum & Hymn", bpm: 110, steps: 8, root: 62, pent: MIX, seed: 9090, chords: [[0, 0], [10, 0], [5, 0], [10, 0]],
      lead: { type: "sine", vol: 0.08, dur: 0.5, den: 0.7, bell: true, arp: true }, bass: { kind: "pulse", type: "sawtooth", vol: 0.085 }, pad: 0, tick: 0, hat: 1, drone: 60 },
    porch: { name: "Porch Light", bpm: 84, steps: 8, root: 65, pent: MAJ, seed: 314, chords: [[0, 0], [9, 1], [2, 1], [7, 0]],
      lead: { type: "sine", vol: 0.1, dur: 0.6, den: 0.5, box: true }, bass: { kind: "root", type: "sine", vol: 0.13 }, pad: 1, tick: 1, hat: 0, drone: 0 },
    shadows: { name: "Long Shadows", bpm: 100, steps: 8, root: 64, pent: MIN, seed: 6502, chords: [[0, 1], [8, 0], [10, 0], [7, 1]],
      lead: { type: "square", vol: 0.045, dur: 0.14, den: 0.6, pluck: true }, bass: { kind: "root2", type: "triangle", vol: 0.15 }, pad: 0, tick: 0, hat: 0, drone: 82.4 }
  };
  var MAP_TRACK = { backforty: "jingle", creek: "waltz", easement: "hum", homeplace: "porch", longleaf: "shadows" };
  var MAP_ORDER = ["jingle", "waltz", "hum", "porch", "shadows"];

  function lcg(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // Build the per-chord lead patterns once per track (seeded, so every run of a map sounds the same).
  function buildTrack(id) {
    var T = TRACKS[id];
    if (T.built) return T;
    var r = lcg(T.seed), c, s, pitches = [], o, k, ch, tones;
    for (o = 0; o < 2; o++) for (k = 0; k < 5; k++) pitches.push(T.pent[k] + o * 12);
    T.pat = [];
    var idx = 4;
    for (c = 0; c < T.chords.length; c++) {
      ch = T.chords[c];
      tones = [ch[0] % 12, (ch[0] + (ch[1] ? 3 : 4)) % 12, (ch[0] + 7) % 12];
      var row = [];
      for (s = 0; s < T.steps; s++) {
        if (s === 0 || (s % 2 === 0 && r() < T.lead.den) || (s % 2 === 1 && r() < T.lead.den * 0.5)) {
          if (s === 0) {   // land on a chord tone
            var best = idx, bd = 99, j;
            for (j = 0; j < pitches.length; j++) {
              if (tones.indexOf(pitches[j] % 12) >= 0 && Math.abs(j - idx) < bd) { bd = Math.abs(j - idx); best = j; }
            }
            idx = best;
          } else {
            idx += ((r() * 5) | 0) - 2;
            if (idx < 0) idx = 1; if (idx > pitches.length - 1) idx = pitches.length - 2;
          }
          row.push(pitches[idx]);
        } else row.push(-1);
      }
      T.pat.push(row);
    }
    T.built = true;
    return T;
  }

  function newDeck(id, fade) {
    var T = buildTrack(id), d = { id: id, T: T, step: 0, chord: 0, next: ctx.currentTime + 0.06, stepDur: 60 / T.bpm / 2, dead: false };
    d.gain = ctx.createGain(); d.filter = ctx.createBiquadFilter(); d.filter.type = "lowpass"; d.filter.Q.value = 0.6;
    d.filter.frequency.value = 3500 + intens * 9000;
    d.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    d.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + Math.max(0.05, fade));
    d.filter.connect(d.gain); d.gain.connect(musicGain);
    d.det = null;
    if (ctx.createConstantSource) { d.det = ctx.createConstantSource(); d.det.offset.value = 0; d.det.start(); }
    if (T.drone) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = id === "hum" ? "sawtooth" : "sine"; o.frequency.value = T.drone;
      g.gain.value = id === "hum" ? 0.03 : 0.05;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = id === "hum" ? 220 : 160;
      o.connect(lp); lp.connect(g); g.connect(d.gain); o.start(); d.drone = o;
      if (d.det) d.det.connect(o.detune);
    }
    return d;
  }
  function killDeck(d, fade) {
    var t = ctx.currentTime;
    d.dead = true;
    d.gain.gain.cancelScheduledValues(t);
    d.gain.gain.setValueAtTime(Math.max(0.0001, d.gain.gain.value), t);
    d.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
    setTimeout(function () {
      try { if (d.drone) d.drone.stop(); if (d.det) d.det.stop(); d.gain.disconnect(); d.filter.disconnect(); } catch (e) {}
    }, (fade + 0.6) * 1000);
  }

  // one music voice: note through the deck's filter
  function mnote(d, f, t, dur, type, vol, pluck) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (pluck) o.frequency.exponentialRampToValueAtTime(f * 0.985, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (pluck ? 0.003 : 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(d.filter);
    if (d.det) d.det.connect(o.detune);
    o.start(t); o.stop(t + dur + 0.03);
  }
  function mnoise(d, t, dur, vol, ftype, f) {
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; fl.type = ftype; fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(d.filter);
    s.start(t, rnd() * 0.8); s.stop(t + dur + 0.02);
  }

  function playStep(d, t) {
    var T = d.T, s = d.step, ch = T.chords[d.chord], r = T.root, cm = ch[1], sd = d.stepDur, L = T.lead, B = T.bass;
    var croot = r + ch[0], third = croot + (cm ? 3 : 4), fifth = croot + 7, v = intens, i;
    // lead
    var p = T.pat[d.chord][s];
    if (p >= 0) {
      var lm = r + 12 + p;
      if (L.arp) {   // bell arpeggio: chord tones climbing
        var at = [croot, third, fifth, croot + 12][(s >> 1) & 3] + 12;
        bell2(d, mtof(at + (s % 2 ? 12 : 0)), t, sd * 2.2, L.vol);
      }
      if (L.box || L.bell) bell2(d, mtof(lm), t, sd * (L.box ? 3.2 : 2.2), L.vol);
      else if (!L.arp) mnote(d, mtof(lm), t, L.dur, L.type, L.vol, !!L.pluck);
    }
    // bass
    var bt = B.type, bv = B.vol, bl = croot - 24;
    if (B.kind === "walk" && s % 2 === 0) {
      var wn = [croot, third, fifth, third][s >> 1] - 12;
      mnote(d, mtof(wn), t, sd * 1.8, bt, bv, true);
    } else if (B.kind === "waltz") {
      if (s === 0) mnote(d, mtof(bl + 12), t, sd * 2.2, bt, bv, true);
      else if (s === 2 || s === 4) { mnote(d, mtof(third + 0), t, sd * 0.9, "triangle", bv * 0.35, true); mnote(d, mtof(fifth), t, sd * 0.9, "triangle", bv * 0.3, true); }
    } else if (B.kind === "pulse") {
      mnote(d, mtof(bl + 12 + (s % 4 === 3 ? 12 : 0)), t, sd * 0.85, bt, bv * (s % 2 ? 0.7 : 1), false);
    } else if (B.kind === "root" && s % 4 === 0) {
      mnote(d, mtof(bl + 12), t, sd * 3.5, bt, bv, false);
    } else if (B.kind === "root2" && (s === 0 || s === 3 || s === 6)) {
      mnote(d, mtof(bl + (s === 3 ? 7 : 0) + 12), t, sd * 2.5, bt, bv, true);
    }
    // pad (slow, per chord bar)
    if (T.pad && s === 0) {
      var tn = [croot, third, fifth], pl = sd * T.steps;
      for (i = 0; i < 3; i++) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle"; o.frequency.value = mtof(tn[i]);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + pl * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + pl);
        o.connect(g); g.connect(d.filter); if (d.det) d.det.connect(o.detune);
        o.start(t); o.stop(t + pl + 0.05);
      }
    }
    // gentle tick
    if (T.tick && s % 2 === 0) mnoise(d, t, 0.02, 0.03, "highpass", 5000);
    // off-beat hat
    if ((T.hat && s % 2 === 1) || (v > 0.5 && s % 2 === 1)) mnoise(d, t, 0.035, 0.025 + 0.02 * v, "highpass", 7000);
    // boss drum layer
    if (v > 0.5) {
      var beat = T.steps === 6 ? (s === 0 || s === 3) : (s === 0 || s === 4), snare = T.steps === 6 ? false : (s === 2 || s === 6);
      if (beat) { mnote(d, 120, t, 0.14, "sine", 0.22, false); }
      if (snare) mnoise(d, t, 0.1, 0.1, "bandpass", 1800);
      if (T.steps === 6 && s === 3) mnoise(d, t, 0.08, 0.08, "bandpass", 1800);
    }
  }
  function bell2(d, f, t, dur, vol) {
    mnote(d, f, t, dur, "sine", vol, false);
    mnote(d, f * 2.76, t, dur * 0.4, "sine", vol * 0.25, false);
  }

  function schedule() {
    if (!ctx) return;
    var now = ctx.currentTime, i, d, m = muted();
    for (i = decks.length - 1; i >= 0; i--) {
      d = decks[i];
      if (d.dead) { decks.splice(i, 1); continue; }
      while (d.next < now + LOOKAHEAD) {
        var tt = d.next;
        if (d.T.swing && d.step % 2 === 1) tt += d.stepDur * d.T.swing;
        if (!m && tt > now - 0.01) playStep(d, tt);
        d.next += d.stepDur;
        d.step++;
        if (d.step >= d.T.steps) { d.step = 0; d.chord = (d.chord + 1) % d.T.chords.length; }
      }
    }
    if (decks.length === 0 && timer) { clearInterval(timer); timer = 0; }
  }
  function startTimer() { if (!timer) timer = setInterval(schedule, TIMER_MS); }

  function music(id, fade) {
    if (id === "boss") { intensity(1); return; }
    if (id && !TRACKS[id]) id = null;
    wantTrack = id; wantFade = fade == null ? 1 : fade;
    if (!unlocked || !ensure()) return;
    if (id === curTrackId && decks.length && !decks[decks.length - 1].dead) return;
    var i, f = Math.max(0.05, wantFade);
    for (i = 0; i < decks.length; i++) if (!decks[i].dead) killDeck(decks[i], f);
    curTrackId = id;
    if (id) { decks.push(newDeck(id, f)); startTimer(); started = true; }
  }
  function stopWithPitchDown() {
    if (!ctx) { wantTrack = null; return; }
    var i, t = ctx.currentTime;
    for (i = 0; i < decks.length; i++) {
      var d = decks[i];
      if (d.dead) continue;
      if (d.det) { d.det.offset.cancelScheduledValues(t); d.det.offset.setValueAtTime(0, t); d.det.offset.linearRampToValueAtTime(-1200, t + 1.2); }
      killDeck(d, 1.2);
    }
    curTrackId = null; wantTrack = null;
  }
  function intensity(v) {
    v = v < 0 ? 0 : v > 1 ? 1 : (+v || 0);
    intens = v;
    if (!ctx) return;
    var i, t = ctx.currentTime;
    for (i = 0; i < decks.length; i++) decks[i].filter.frequency.setTargetAtTime(3500 + v * 9000, t, 0.4);
  }
  function setVolumes(m, s) {
    if (m != null && isFinite(m)) volMusic = Math.max(0, Math.min(1, +m));
    if (s != null && isFinite(s)) volSfx = Math.max(0, Math.min(1, +s));
    applyGains(0.05);
  }
  function setDuck(v) { duck = v; applyGains(0.12); }

  // ============================================================
  // Event wiring
  // ============================================================
  function trackForMap(mapId) {
    var md = KS.defs && KS.defs.maps && KS.defs.maps[mapId];
    if (md && typeof md.music === "string" && TRACKS[md.music]) return md.music;
    if (MAP_TRACK[mapId]) return MAP_TRACK[mapId];
    if (md && md.order > 0) return MAP_ORDER[(md.order - 1) % 5];
    var h = 0, i; mapId = String(mapId || "");
    for (i = 0; i < mapId.length; i++) h = (h * 31 + mapId.charCodeAt(i)) | 0;
    return MAP_ORDER[Math.abs(h) % 5];
  }
  function readSettings() {
    try { var s = KS.meta && KS.meta.settings; if (s) { if (typeof s.music === "number") volMusic = s.music; if (typeof s.sfx === "number") volSfx = s.sfx; } } catch (e) {}
  }
  function wire() {
    if (listenersOn) return;
    listenersOn = true;
    KS.on("modeChange", function (ev) {
      var to = ev.to;
      if (to === "menu" || to === "results") { intensity(0); duck = 1; music("menu", 1); applyGains(0.1); }
      else if (to === "paused") setDuck(0.3);
      else if (to === "levelup" || to === "crate") setDuck(0.55);
      else if (to === "play") setDuck(1);
    });
    KS.on("stageStart", function (ev) { intensity(0); music(trackForMap(ev.mapId), 1); });
    KS.on("bossSpawn", function () { intensity(1); });
    KS.on("bossDeath", function () { intensity(0); });
    KS.on("runEnd", function (ev) {
      intensity(0);
      if (ev && ev.reason === "death") stopWithPitchDown(); else music(null, 1.2);
    });
    KS.on("settings", function (ev) {
      if (!ev) return;
      if (ev.key === "music") setVolumes(ev.value, null);
      else if (ev.key === "sfx") setVolumes(null, ev.value);
    });
    if (window.Sound && window.Sound.onChange) {
      window.Sound.onChange(function () {
        if (!unlocked) return;
        if (muted()) { applyGains(0.02); return; }
        if (ensure()) {
          applyGains(0.05);
          if (wantTrack && (!decks.length || decks[decks.length - 1].dead)) { curTrackId = null; music(wantTrack, 0.5); }
        }
      });
    }
  }

  KS.audio = {
    init: function () { readSettings(); wire(); },
    sfx: sfx,
    music: music,
    intensity: intensity,
    setVolumes: setVolumes,
    unlock: function () {
      if (!window.Sound) return;
      unlocked = true;
      readSettings();
      if (!ensure()) return;
      applyGains(0);
      if (wantTrack && !decks.length) { curTrackId = null; music(wantTrack, 0.6); }
    },
    _tracks: TRACKS
  };
})(window.KS);
