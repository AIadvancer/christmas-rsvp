/* ============================================================
   Kudzu Survivors: Holiday Overtime
   A Moorhead land-clearing Christmas game. Survive the overgrowth.
   ============================================================ */
(function () {
  "use strict";

  const cvs = document.getElementById("game");
  const ctx = cvs.getContext("2d");
  const overlay = document.getElementById("overlay");
  const panel = document.getElementById("panel");
  const TAU = Math.PI * 2;
  const rand = (a, b) => Math.random() * (b - a) + a;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Screen ---------- */
  let W = 0, H = 0, DPR = 1, ZOOM = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cvs.width = Math.round(W * DPR);
    cvs.height = Math.round(H * DPR);
    ZOOM = clamp(Math.min(W, H) / 620, 0.62, 1.15);
  }
  window.addEventListener("resize", resize);
  resize();
  const viewW = () => W / ZOOM;
  const viewH = () => H / ZOOM;

  /* ---------- Storage (best runs) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* fine */ } }
  };

  /* ---------- Sound (tiny synth, no files) ---------- */
  let muted = store.get("kudzuMuted", false);
  let actx = null;
  let soundBudget = 0;
  function audio() {
    if (muted) return null;
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return null; } }
    if (actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type = "square", vol = 0.05, slide = 0) {
    const a = audio(); if (!a) return;
    const t = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
  }
  function noise(dur, vol = 0.06, hp = 800) {
    const a = audio(); if (!a) return;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = buf;
    const f = a.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(a.destination); s.start();
  }
  const sfx = {
    kill() { if (soundBudget > 0) { soundBudget--; noise(0.06, 0.035, 1500); } },
    gem() { if (soundBudget > 0) { soundBudget--; tone(rand(880, 1100), 0.05, "triangle", 0.025); } },
    hurt() { tone(140, 0.18, "sawtooth", 0.06, -60); },
    boom() { noise(0.35, 0.09, 200); },
    level() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, "triangle", 0.06), i * 70)); },
    heal() { tone(660, 0.12, "sine", 0.06, 300); },
    boss() { tone(110, 0.6, "sawtooth", 0.07, -40); setTimeout(() => tone(98, 0.7, "sawtooth", 0.07, -40), 350); },
    deer() { [988, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.08, "triangle", 0.04), i * 60)); }
  };

  /* ---------- Input ---------- */
  const keys = new Set();
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    keys.add(k);
    if ((k === "escape" || k === "p") && (S.mode === "play" || S.mode === "paused")) togglePause();
    if (S.mode === "choose" && ["1", "2", "3"].includes(k)) {
      const btn = panel.querySelectorAll(".card")[+k - 1];
      if (btn) btn.click();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => { keys.clear(); if (S.mode === "play") togglePause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && S.mode === "play") togglePause(); });

  const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  cvs.addEventListener("pointerdown", (e) => {
    if (S.mode !== "play") return;
    stick.active = true; stick.id = e.pointerId;
    stick.ox = stick.x = e.clientX; stick.oy = stick.y = e.clientY;
    cvs.setPointerCapture(e.pointerId);
  });
  cvs.addEventListener("pointermove", (e) => { if (stick.active && e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; } });
  const endStick = (e) => { if (e.pointerId === stick.id) stick.active = false; };
  cvs.addEventListener("pointerup", endStick);
  cvs.addEventListener("pointercancel", endStick);

  function inputDir() {
    let x = 0, y = 0;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    if (stick.active) {
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
      const d = Math.hypot(dx, dy);
      if (d > 8) { const m = Math.min(1, d / 60); x = (dx / d) * m; y = (dy / d) * m; }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  /* ---------- Upgrades ---------- */
  // Weapons: every stat is an array indexed by level-1 (max level 5).
  const WEAPONS = {
    cane: {
      name: "Candy Cane Javelin", icon: "🍬",
      blurb: ["Hurls a sharpened candy cane at the nearest weed.", "+damage, pierces 2", "Throws 2 at once", "+damage, pierces 3", "Throws 3, pierces 4. Peppermint fury."],
      cd: 0.8, count: [1, 1, 2, 2, 3], dmg: [12, 15, 17, 20, 25], pierce: [1, 2, 2, 3, 4]
    },
    mulch: {
      name: "Mulcher Head", icon: "⚙️",
      blurb: ["Spinning drum shreds anything that gets close.", "+range, +damage", "+range, +damage", "+range, +damage", "Max shred. Leaves only wood chips."],
      radius: [58, 68, 78, 90, 106], dmg: [5, 7, 9, 12, 15], tick: 0.45
    },
    saw: {
      name: "Orbiting Saw Blades", icon: "🪚",
      blurb: ["A saw blade circles your machine.", "2 blades", "+damage, faster spin", "3 blades", "4 blades. OSHA has questions."],
      count: [1, 2, 2, 3, 4], dmg: [9, 11, 14, 16, 20], spin: [3, 3.2, 3.7, 4, 4.5], orbit: 88
    },
    bomb: {
      name: "Ornament Bombs", icon: "🔴",
      blurb: ["Lobs a glass ornament that shatters in a blast.", "+blast size, +damage", "Lobs 2 ornaments", "+blast size, faster", "3 ornaments. Fragile: handle with chaos."],
      count: [1, 1, 2, 2, 3], radius: [56, 66, 70, 80, 96], dmg: [20, 27, 32, 40, 52], cd: [2.6, 2.4, 2.2, 1.9, 1.7]
    },
    snow: {
      name: "Snowball Flurry", icon: "❄️",
      blurb: ["Fires a spread of snowballs where you're headed. Big knockback.", "4 snowballs", "5 snowballs, +damage", "6 snowballs", "8 snowballs. Snow day!"],
      count: [3, 4, 5, 6, 8], dmg: [6, 7, 9, 10, 12], cd: 1.35
    },
    deer: {
      name: "Rudolph Stampede", icon: "🦌",
      blurb: ["Every few seconds a reindeer charges through the job site.", "More often, +damage", "More often, +damage", "Two reindeer at once", "Full team. Nose to the grindstone."],
      count: [1, 1, 1, 2, 3], dmg: [40, 55, 70, 90, 120], cd: [9, 8, 7, 6, 5.5]
    }
  };
  const PASSIVES = {
    hardhat: { name: "Hard Hat", icon: "⛑️", blurb: "Take 1 less damage per hit. Safety first." },
    boots: { name: "Steel-Toe Boots", icon: "🥾", blurb: "+8% move speed." },
    cocoa: { name: "Hot Cocoa Thermos", icon: "☕", blurb: "Regenerate 0.35 HP per second." },
    vest: { name: "Hi-Vis Vest", icon: "🦺", blurb: "+30% pickup range. The wood chips see you coming." },
    overtime: { name: "Overtime", icon: "⏱️", blurb: "Weapons fire 8% faster. Time and a half!" },
    eggnog: { name: "Eggnog", icon: "🥛", blurb: "+20 max HP and heal 20. Questionable recipe." },
    bonus: { name: "Christmas Bonus", icon: "💰", blurb: "+12% XP from wood chips." }
  };
  const MAX_LVL = 5;

  const ENEMIES = {
    kudzu: { hp: 9, spd: 52, r: 13, dmg: 5, xp: 1 },
    gum: { hp: 5, spd: 98, r: 9, dmg: 4, xp: 1 },
    tree: { hp: 28, spd: 44, r: 18, dmg: 10, xp: 3 },
    stump: { hp: 80, spd: 30, r: 21, dmg: 14, xp: 6 },
    boss: { hp: 1400, spd: 42, r: 50, dmg: 25, xp: 80 }
  };

  /* ---------- Game state ---------- */
  let S;
  function newGame() {
    S = {
      mode: "play", t: 0, kills: 0, level: 1, xp: 0, xpNext: 5, shake: 0, hurtFlash: 0,
      player: { x: 0, y: 0, r: 16, hp: 100, maxHp: 100, speed: 150, fx: 1, fy: 0, ang: 0, inv: 0, armor: 0, regen: 0, magnet: 90, cdMul: 1, xpMul: 1 },
      weapons: { cane: { lvl: 1, cd: 0.4 } },
      passives: {},
      enemies: [], projs: [], gems: [], pickups: [], parts: [], texts: [],
      spawnAcc: 0, nextSwarm: 90, nextBoss: 180, boss: null, banner: null, pendingLevels: 0, chests: 0
    };
  }

  /* ---------- Spatial grid for fast hit checks ---------- */
  const CELL = 64;
  const grid = new Map();
  function buildGrid() {
    grid.clear();
    for (const e of S.enemies) {
      if (e.dead) continue;
      const k = Math.floor(e.x / CELL) + "," + Math.floor(e.y / CELL);
      let a = grid.get(k);
      if (!a) { a = []; grid.set(k, a); }
      a.push(e);
    }
  }
  function query(x, y, r, fn) {
    const x0 = Math.floor((x - r - 50) / CELL), x1 = Math.floor((x + r + 50) / CELL);
    const y0 = Math.floor((y - r - 50) / CELL), y1 = Math.floor((y + r + 50) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = grid.get(cx + "," + cy);
        if (!a) continue;
        for (const e of a) {
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y, rr = r + e.r;
          if (dx * dx + dy * dy < rr * rr && fn(e, dx, dy) === false) return;
        }
      }
    }
  }
  function nearest(n, maxD = 520) {
    const p = S.player, list = [];
    for (const e of S.enemies) {
      if (e.dead) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < maxD * maxD) list.push([d, e]);
    }
    list.sort((a, b) => a[0] - b[0]);
    return list.slice(0, n).map((x) => x[1]);
  }

  /* ---------- Spawning ---------- */
  function hpMul() { return 1 + S.t / 240 + (S.t / 400) ** 2; }
  function spawnRadius() { return Math.hypot(viewW(), viewH()) / 2 + 40; }
  function spawn(type, x, y, elite = false) {
    const d = ENEMIES[type];
    const m = type === "boss" ? hpMul() * 1.2 : hpMul();
    if (x === undefined) {
      const a = rand(0, TAU), R = spawnRadius();
      x = S.player.x + Math.cos(a) * R; y = S.player.y + Math.sin(a) * R;
    }
    const e = {
      type, x, y, vx: 0, vy: 0, r: d.r * (elite ? 1.3 : 1), spd: d.spd * rand(0.9, 1.1) * (1 + Math.min(S.t / 900, 0.35)),
      hp: d.hp * m * (elite ? 4 : 1), maxHp: d.hp * m * (elite ? 4 : 1), dmg: d.dmg * (1 + S.t / 600), xp: d.xp * (elite ? 5 : 1),
      elite, flash: 0, wob: rand(0, TAU), sawHit: 0
    };
    S.enemies.push(e);
    return e;
  }
  function spawnTick(dt) {
    const cap = Math.min(W < 700 ? 220 : 320, 40 + S.t * 1.1);
    const rate = 0.8 + S.t / 50 + (S.t / 240) ** 2;
    S.spawnAcc += rate * dt;
    while (S.spawnAcc >= 1) {
      S.spawnAcc -= 1;
      if (S.enemies.length >= cap) continue;
      const t = S.t;
      const pool = [["kudzu", 10]];
      if (t > 40) pool.push(["gum", 6]);
      if (t > 25) pool.push(["tree", t > 90 ? 6 : 2]);
      if (t > 140) pool.push(["stump", 3 + t / 120]);
      let tot = pool.reduce((s, p) => s + p[1], 0), r = Math.random() * tot, type = "kudzu";
      for (const [k, w] of pool) { r -= w; if (r <= 0) { type = k; break; } }
      spawn(type, undefined, undefined, (type === "tree" || type === "stump") && Math.random() < 0.025);
    }
    if (S.t >= S.nextSwarm) {
      S.nextSwarm += 60;
      const n = 24 + Math.floor(S.t / 10);
      const R = spawnRadius() - 20;
      const gap = rand(0, TAU);
      for (let i = 0; i < n; i++) {
        const a = gap + 0.7 + (i / n) * (TAU - 1.4); // leave an escape gap
        spawn(S.t > 200 ? "gum" : "kudzu", S.player.x + Math.cos(a) * R, S.player.y + Math.sin(a) * R);
      }
      banner("The kudzu is closing in!", 2);
    }
    if (S.t >= S.nextBoss) {
      S.nextBoss += 180;
      S.boss = spawn("boss");
      banner("KUDZILLA has entered the job site!", 3);
      sfx.boss();
    }
  }

  /* ---------- Damage & death ---------- */
  function hurt(e, dmg, nx = 0, ny = 0, kb = 0) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.09;
    if (kb && e.type !== "boss") { e.vx += nx * kb; e.vy += ny * kb; }
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true;
    S.kills++;
    sfx.kill();
    chips(e.x, e.y, e.type === "boss" ? 40 : 7, e.type);
    dropGem(e.x, e.y, e.xp);
    if (e.type === "boss") {
      S.boss = null;
      banner("Kudzilla got mulched!", 3);
      S.pickups.push({ type: "present", x: e.x, y: e.y });
      S.shake = 12;
    } else if (e.elite) {
      S.pickups.push({ type: "present", x: e.x, y: e.y });
    } else {
      const r = Math.random();
      if (r < 0.012) S.pickups.push({ type: "cocoa", x: e.x, y: e.y });
      else if (r < 0.016) S.pickups.push({ type: "star", x: e.x, y: e.y });
    }
  }
  function dropGem(x, y, v) {
    if (S.gems.length > 450) {
      const g = S.gems[Math.floor(Math.random() * S.gems.length)];
      g.v += v;
      return;
    }
    S.gems.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), v, pull: false });
  }
  function chips(x, y, n, type) {
    const cols = type === "gum" ? ["#6b4a2b", "#3b2716"] : type === "stump" ? ["#8a5a32", "#c49a6c"] : type === "tree" ? ["#1e6b34", "#e2a63b", "#c8312b"] : ["#3f8f3a", "#6cbf4a", "#8a5a32"];
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(40, 180);
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.6), max: 0.6, c: pick(cols), sz: rand(2, 4.5) });
    }
  }
  function text(x, y, str, color = "#fff", size = 16) {
    S.texts.push({ x, y, str, color, size, life: 1 });
  }
  function banner(str, dur) { S.banner = { str, life: dur, max: dur }; }

  /* ---------- Weapons ---------- */
  function fireWeapons(dt) {
    const p = S.player;
    for (const id in S.weapons) {
      const w = S.weapons[id], d = WEAPONS[id], L = w.lvl - 1;
      if (id === "mulch") {
        w.cd -= dt;
        w.spin = (w.spin || 0) + dt * 9;
        if (w.cd <= 0) {
          w.cd = d.tick * p.cdMul;
          query(p.x, p.y, d.radius[L], (e, dx, dy) => {
            const m = Math.hypot(dx, dy) || 1;
            hurt(e, d.dmg[L], dx / m, dy / m, 50);
          });
        }
        continue;
      }
      if (id === "saw") {
        w.ang = (w.ang || 0) + d.spin[L] * dt;
        const n = d.count[L];
        for (let i = 0; i < n; i++) {
          const a = w.ang + (i / n) * TAU;
          const bx = p.x + Math.cos(a) * d.orbit, by = p.y + Math.sin(a) * d.orbit;
          query(bx, by, 13, (e, dx, dy) => {
            if (e.sawHit > S.t) return;
            e.sawHit = S.t + 0.3;
            const m = Math.hypot(dx, dy) || 1;
            hurt(e, d.dmg[L], dx / m, dy / m, 120);
          });
        }
        continue;
      }
      w.cd -= dt;
      if (w.cd > 0) continue;
      const base = Array.isArray(d.cd) ? d.cd[L] : d.cd;
      w.cd = base * p.cdMul;

      if (id === "cane") {
        const targets = nearest(d.count[L]);
        for (let i = 0; i < d.count[L]; i++) {
          const t = targets[i] || targets[0];
          let dx = p.fx, dy = p.fy;
          if (t) { dx = t.x - p.x; dy = t.y - p.y; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; }
          if (!t && i > 0) { const a = Math.atan2(dy, dx) + (i % 2 ? 0.25 : -0.25); dx = Math.cos(a); dy = Math.sin(a); }
          S.projs.push({ type: "cane", x: p.x, y: p.y, vx: dx * 430, vy: dy * 430, r: 8, dmg: d.dmg[L], pierce: d.pierce[L], life: 1.5, hit: new Set(), kb: 70 });
        }
      } else if (id === "snow") {
        const n = d.count[L], spread = 0.55 + n * 0.04, a0 = Math.atan2(p.fy, p.fx);
        for (let i = 0; i < n; i++) {
          const a = a0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
          S.projs.push({ type: "snow", x: p.x, y: p.y, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360, r: 7, dmg: d.dmg[L], pierce: 1, life: 0.85, hit: new Set(), kb: 260 });
        }
      } else if (id === "bomb") {
        const visible = S.enemies.filter((e) => !e.dead && Math.abs(e.x - p.x) < viewW() / 2 && Math.abs(e.y - p.y) < viewH() / 2);
        for (let i = 0; i < d.count[L]; i++) {
          const t = visible.length ? pick(visible) : null;
          const tx = t ? t.x : p.x + rand(-160, 160), ty = t ? t.y : p.y + rand(-160, 160);
          S.projs.push({ type: "bomb", sx: p.x, sy: p.y, x: p.x, y: p.y, tx, ty, t: 0, dur: 0.55, r: d.radius[L], dmg: d.dmg[L], c: pick(["#c8312b", "#1f6fc5", "#e2a63b", "#1f8a4c", "#b04ac8"]) });
        }
      } else if (id === "deer") {
        sfx.deer();
        for (let i = 0; i < d.count[L]; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          S.projs.push({ type: "deer", x: p.x - dir * (viewW() / 2 + 80), y: p.y + rand(-140, 140) + (i - (d.count[L] - 1) / 2) * 70, vx: dir * 820, vy: 0, r: 30, dmg: d.dmg[L], pierce: 9999, life: 2.2, hit: new Set(), kb: 300 });
        }
      }
    }
  }

  function updateProjs(dt) {
    for (const pr of S.projs) {
      if (pr.type === "bomb") {
        pr.t += dt;
        const k = Math.min(1, pr.t / pr.dur);
        pr.x = pr.sx + (pr.tx - pr.sx) * k;
        pr.y = pr.sy + (pr.ty - pr.sy) * k;
        pr.h = Math.sin(k * Math.PI) * 70;
        if (k >= 1) {
          pr.dead = true;
          sfx.boom();
          S.shake = Math.max(S.shake, 4);
          query(pr.tx, pr.ty, pr.r, (e, dx, dy) => { const m = Math.hypot(dx, dy) || 1; hurt(e, pr.dmg, dx / m, dy / m, 160); });
          S.parts.push({ ring: true, x: pr.tx, y: pr.ty, r: pr.r, life: 0.35, max: 0.35, c: pr.c });
          for (let i = 0; i < 14; i++) {
            const a = rand(0, TAU), s = rand(80, 240);
            S.parts.push({ x: pr.tx, y: pr.ty, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.5), max: 0.5, c: pick([pr.c, "#fff6c8", "#f6d27a"]), sz: rand(2, 4) });
          }
        }
        continue;
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) { pr.dead = true; continue; }
      const m = Math.hypot(pr.vx, pr.vy) || 1;
      query(pr.x, pr.y, pr.r, (e) => {
        if (pr.hit.has(e)) return;
        pr.hit.add(e);
        hurt(e, pr.dmg, pr.vx / m, pr.vy / m, pr.kb);
        if (pr.type === "snow") for (let i = 0; i < 4; i++) S.parts.push({ x: pr.x, y: pr.y, vx: rand(-90, 90), vy: rand(-90, 90), life: 0.3, max: 0.3, c: "#ffffff", sz: 2.5 });
        if (--pr.pierce <= 0) { pr.dead = true; return false; }
      });
    }
    S.projs = S.projs.filter((p) => !p.dead);
  }

  /* ---------- Level ups & choices ---------- */
  function ownedCount(obj) { return Object.keys(obj).length; }
  function choices(n = 3) {
    const pool = [];
    for (const id in WEAPONS) {
      const w = S.weapons[id];
      if (w ? w.lvl < MAX_LVL : ownedCount(S.weapons) < 6) pool.push({ kind: "w", id, weight: w ? 3 : 2 });
    }
    for (const id in PASSIVES) {
      const lv = S.passives[id] || 0;
      if (lv < MAX_LVL) pool.push({ kind: "p", id, weight: lv ? 2 : 1.5 });
    }
    const out = [];
    while (out.length < n && pool.length) {
      const tot = pool.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * tot, i = 0;
      for (; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) break; }
      out.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    if (!out.length) out.push({ kind: "heal" }, { kind: "bonusxp" });
    return out;
  }
  function describe(c) {
    if (c.kind === "heal") return { icon: "🍪", name: "Cookie Break", tag: "", desc: "Heal 40 HP. You earned it." };
    if (c.kind === "bonusxp") return { icon: "🎁", name: "Bonus Wood Chips", tag: "", desc: "Instantly gain half a level of XP." };
    if (c.kind === "w") {
      const d = WEAPONS[c.id], cur = S.weapons[c.id] ? S.weapons[c.id].lvl : 0;
      return { icon: d.icon, name: d.name, tag: cur ? `Lv ${cur} → ${cur + 1}` : "NEW", desc: d.blurb[cur] };
    }
    const d = PASSIVES[c.id], cur = S.passives[c.id] || 0;
    return { icon: d.icon, name: d.name, tag: cur ? `Lv ${cur} → ${cur + 1}` : "NEW", desc: d.blurb };
  }
  function apply(c) {
    const p = S.player;
    if (c.kind === "heal") { p.hp = Math.min(p.maxHp, p.hp + 40); return; }
    if (c.kind === "bonusxp") { S.xp += Math.floor(S.xpNext / 2); return; }
    if (c.kind === "w") {
      if (S.weapons[c.id]) S.weapons[c.id].lvl++;
      else S.weapons[c.id] = { lvl: 1, cd: 0.3 };
      return;
    }
    S.passives[c.id] = (S.passives[c.id] || 0) + 1;
    if (c.id === "hardhat") p.armor += 1;
    if (c.id === "boots") p.speed *= 1.08;
    if (c.id === "cocoa") p.regen += 0.35;
    if (c.id === "vest") p.magnet *= 1.3;
    if (c.id === "overtime") p.cdMul *= 0.92;
    if (c.id === "eggnog") { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); }
    if (c.id === "bonus") p.xpMul *= 1.12;
  }
  function openChoice(title, sub) {
    S.mode = "choose";
    keys.clear();
    stick.active = false;
    const opts = choices(3);
    panel.innerHTML = `<p class="kicker">${sub}</p><h2>${title}</h2><div class="cards"></div>`;
    const box = panel.querySelector(".cards");
    opts.forEach((c, i) => {
      const d = describe(c);
      const b = document.createElement("button");
      b.className = "card";
      b.type = "button";
      b.innerHTML = `<span class="card-icon">${d.icon}</span><span><kbd>${i + 1}</kbd><b></b>${d.tag ? `<span class="lvl ${d.tag === "NEW" ? "new" : ""}">${d.tag}</span>` : ""}<small></small></span>`;
      b.querySelector("b").textContent = d.name;
      b.querySelector("small").textContent = d.desc;
      b.addEventListener("click", () => {
        apply(c);
        overlay.hidden = true;
        S.mode = "play";
        last = performance.now();
        checkLevels();
      });
      box.appendChild(b);
    });
    overlay.hidden = false;
    setTimeout(() => { const f = panel.querySelector(".card"); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  const LEVEL_SUBS = ["Promotion!", "Performance review: glowing", "The foreman is impressed", "Employee of the minute", "Raise approved (in spirit)"];
  function checkLevels() {
    if (S.mode !== "play") return;
    if (S.chests > 0) { S.chests--; openChoice("A present from the office!", "Unwrap one"); return; }
    if (S.xp >= S.xpNext) {
      S.xp -= S.xpNext;
      S.level++;
      S.xpNext = Math.floor(3 + S.level * 2.4 + Math.pow(S.level, 1.5));
      sfx.level();
      openChoice(`Level ${S.level}!`, pick(LEVEL_SUBS));
    }
  }

  /* ---------- Main update ---------- */
  function update(dt) {
    S.t += dt;
    soundBudget = Math.min(soundBudget + dt * 14, 6);
    const p = S.player;

    // move
    const dir = inputDir();
    p.x += dir.x * p.speed * dt;
    p.y += dir.y * p.speed * dt;
    if (dir.x || dir.y) {
      const m = Math.hypot(dir.x, dir.y);
      p.fx = dir.x / m; p.fy = dir.y / m;
      const target = Math.atan2(p.fy, p.fx);
      let diff = ((target - p.ang + Math.PI * 3) % TAU) - Math.PI;
      p.ang += diff * Math.min(1, dt * 12);
      p.moving = true;
    } else p.moving = false;
    p.inv = Math.max(0, p.inv - dt);
    if (p.regen) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    spawnTick(dt);
    buildGrid();
    fireWeapons(dt);
    updateProjs(dt);

    // enemies
    const far = spawnRadius() * 1.6;
    const decay = Math.pow(0.02, dt);
    for (const e of S.enemies) {
      if (e.dead) continue;
      let dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > far && e.type !== "boss") {
        // wandered off screen: move it back into the action, ahead of the player
        const a = Math.atan2(p.fy, p.fx) + rand(-1.2, 1.2), R = spawnRadius();
        e.x = p.x + Math.cos(a) * R; e.y = p.y + Math.sin(a) * R;
        continue;
      }
      e.x += ((dx / d) * e.spd + e.vx) * dt;
      e.y += ((dy / d) * e.spd + e.vy) * dt;
      e.vx *= decay; e.vy *= decay;
      e.flash = Math.max(0, e.flash - dt);
      e.wob += dt * 6;
      if (d < e.r + p.r && p.inv <= 0) {
        const dmg = Math.max(1, e.dmg - p.armor);
        p.hp -= dmg;
        p.inv = 0.5;
        S.hurtFlash = 0.25;
        S.shake = Math.max(S.shake, 5);
        sfx.hurt();
        text(p.x, p.y - 26, `-${Math.round(dmg)}`, "#ff6b5e", 18);
        if (p.hp <= 0) { gameOver(); return; }
      }
    }
    // light separation so they don't stack into one blob
    for (const [, cell] of grid) {
      for (let i = 0; i < cell.length; i++) {
        const a = cell[i];
        for (let j = i + 1; j < cell.length && j < i + 6; j++) {
          const b = cell[j];
          const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy;
          if (dd > 0 && dd < rr * rr) {
            const d = Math.sqrt(dd), push = (rr - d) * 0.25;
            const nx = dx / d, ny = dy / d;
            if (a.type !== "boss") { a.x -= nx * push; a.y -= ny * push; }
            if (b.type !== "boss") { b.x += nx * push; b.y += ny * push; }
          }
        }
      }
    }
    S.enemies = S.enemies.filter((e) => !e.dead);

    // gems
    const mag2 = p.magnet * p.magnet;
    for (const g of S.gems) {
      const dx = p.x - g.x, dy = p.y - g.y, dd = dx * dx + dy * dy;
      if (dd < mag2) g.pull = true;
      if (g.pull) {
        const d = Math.sqrt(dd) || 1;
        g.sp = (g.sp || 120) + 900 * dt;
        g.x += (dx / d) * g.sp * dt; g.y += (dy / d) * g.sp * dt;
        if (d < p.r + 6) { g.dead = true; S.xp += g.v * p.xpMul; sfx.gem(); }
      }
    }
    S.gems = S.gems.filter((g) => !g.dead);

    // pickups
    for (const k of S.pickups) {
      const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy);
      if (d < p.r + 16) {
        k.dead = true;
        if (k.type === "cocoa") { p.hp = Math.min(p.maxHp, p.hp + 30); text(p.x, p.y - 30, "+30 cocoa", "#7cf29a", 18); sfx.heal(); }
        if (k.type === "star") { S.gems.forEach((g) => (g.pull = true)); banner("Christmas star! All wood chips incoming.", 2); sfx.heal(); }
        if (k.type === "present") { S.chests++; }
      }
    }
    S.pickups = S.pickups.filter((k) => !k.dead);

    // particles & text
    for (const q of S.parts) {
      q.life -= dt;
      if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; }
    }
    S.parts = S.parts.filter((q) => q.life > 0);
    for (const tx of S.texts) { tx.life -= dt; tx.y -= 30 * dt; }
    S.texts = S.texts.filter((tx) => tx.life > 0);
    if (S.banner) { S.banner.life -= dt; if (S.banner.life <= 0) S.banner = null; }
    S.shake = Math.max(0, S.shake - dt * 30);
    S.hurtFlash = Math.max(0, S.hurtFlash - dt);

    checkLevels();
  }

  /* ---------- Drawing ---------- */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function drawGround(cx, cy) {
    const vw = viewW(), vh = viewH();
    ctx.fillStyle = "#e8eef1";
    ctx.fillRect(cx - vw / 2 - 2, cy - vh / 2 - 2, vw + 4, vh + 4);
    const C = 180;
    const x0 = Math.floor((cx - vw / 2) / C) - 1, x1 = Math.floor((cx + vw / 2) / C) + 1;
    const y0 = Math.floor((cy - vh / 2) / C) - 1, y1 = Math.floor((cy + vh / 2) / C) + 1;
    for (let gx = x0; gx <= x1; gx++) {
      for (let gy = y0; gy <= y1; gy++) {
        const h = hash(gx, gy), h2 = hash(gy * 7 + 3, gx * 13 + 1);
        const x = gx * C + h2 * C, y = gy * C + h * C;
        // snow drift shading
        ctx.fillStyle = "rgba(170,195,215,.25)";
        ctx.beginPath(); ctx.ellipse(x, y, 60 + h * 40, 26 + h2 * 16, h * 3, 0, TAU); ctx.fill();
        if (h < 0.2) drawDecoStump(x + 40, y - 30);
        else if (h < 0.32) drawDecoPine(x - 30, y + 20, 0.7 + h2 * 0.5);
        else if (h < 0.4) drawTracks(x, y, h2);
        else if (h < 0.46) drawDecoMound(x, y);
      }
    }
  }
  function drawDecoStump(x, y) {
    ctx.fillStyle = "#8a5a32"; ctx.beginPath(); ctx.ellipse(x, y + 3, 14, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c49a6c"; ctx.beginPath(); ctx.ellipse(x, y, 13, 6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#8a5a32"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(x - 3, y - 2, 6, 2.5, 0, 0, TAU); ctx.fill();
  }
  function drawDecoPine(x, y, s) {
    ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.beginPath(); ctx.ellipse(x, y + 4, 18 * s, 6 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2f6e48";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x, y - 40 * s + i * 11 * s); ctx.lineTo(x - (12 + i * 5) * s, y - 14 * s + i * 8 * s); ctx.lineTo(x + (12 + i * 5) * s, y - 14 * s + i * 8 * s); ctx.fill();
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(x, y - 40 * s); ctx.lineTo(x - 5 * s, y - 31 * s); ctx.lineTo(x + 5 * s, y - 31 * s); ctx.fill();
  }
  function drawTracks(x, y, h) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(h * 3);
    ctx.fillStyle = "rgba(120,140,160,.18)";
    for (let i = -4; i <= 4; i++) { ctx.fillRect(i * 14, -16, 8, 6); ctx.fillRect(i * 14, 10, 8, 6); }
    ctx.restore();
  }
  function drawDecoMound(x, y) {
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(x, y, 24, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(160,185,205,.35)"; ctx.beginPath(); ctx.ellipse(x + 4, y + 3, 20, 6, 0, 0, Math.PI); ctx.fill();
  }

  function eyes(x, y, s, angry = true) {
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x - 4 * s, y, 3 * s, 0, TAU); ctx.arc(x + 4 * s, y, 3 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c8312b";
    ctx.beginPath(); ctx.arc(x - 4 * s, y + 0.6 * s, 1.5 * s, 0, TAU); ctx.arc(x + 4 * s, y + 0.6 * s, 1.5 * s, 0, TAU); ctx.fill();
    if (angry) {
      ctx.strokeStyle = "#1b1b1b"; ctx.lineWidth = 1.6 * s;
      ctx.beginPath(); ctx.moveTo(x - 7 * s, y - 4 * s); ctx.lineTo(x - 2 * s, y - 2.5 * s); ctx.moveTo(x + 7 * s, y - 4 * s); ctx.lineTo(x + 2 * s, y - 2.5 * s); ctx.stroke();
    }
  }

  function drawEnemy(e) {
    const { x, y, r } = e;
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.8, r, r * 0.35, 0, 0, TAU); ctx.fill();
    if (e.elite) {
      ctx.strokeStyle = "#f6d27a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r + 5 + Math.sin(e.wob) * 2, 0, TAU); ctx.stroke();
    }
    const w = Math.sin(e.wob) * 0.12;
    if (e.type === "kudzu" || e.type === "boss") {
      const s = r / 13;
      ctx.fillStyle = "#2f7d32";
      for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + w + e.wob * 0.05;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, 7 * s, 4 * s, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "#4caf50";
      ctx.beginPath(); ctx.arc(x, y, r * (1 + w * 0.3), 0, TAU); ctx.fill();
      ctx.strokeStyle = "#1e5a22"; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(x - r * 0.3, y + r * 0.2, r * 0.45, 0.2, 2.4); ctx.stroke();
      eyes(x, y - 2 * s, s);
      if (e.type === "boss") {
        // Santa hat for the big guy
        ctx.fillStyle = "#c8312b";
        ctx.beginPath(); ctx.moveTo(x - r * 0.6, y - r * 0.7); ctx.quadraticCurveTo(x + r * 0.1, y - r * 1.8, x + r * 0.9, y - r * 1.2); ctx.lineTo(x + r * 0.6, y - r * 0.65); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.ellipse(x, y - r * 0.68, r * 0.68, r * 0.16, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + r * 0.95, y - r * 1.15, r * 0.16, 0, TAU); ctx.fill();
      }
    } else if (e.type === "gum") {
      ctx.strokeStyle = "#3b2716"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * 0.628 + e.wob * 0.4; ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.lineTo(x + Math.cos(a) * r * 1.45, y + Math.sin(a) * r * 1.45); }
      ctx.stroke();
      ctx.fillStyle = "#6b4a2b"; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      eyes(x, y - 1, 0.7);
    } else if (e.type === "tree") {
      const s = r / 18;
      ctx.fillStyle = "#6b4a2b"; ctx.fillRect(x - 3 * s, y + 10 * s, 6 * s, 7 * s);
      ctx.fillStyle = "#1e6b34";
      for (let i = 0; i < 3; i++) {
        const top = y - 22 * s + i * 9 * s, half = (10 + i * 5) * s;
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x - half + w * 6, top + 16 * s); ctx.lineTo(x + half + w * 6, top + 16 * s); ctx.fill();
      }
      ctx.strokeStyle = "#e2a63b"; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(x - 11 * s, y + 1 * s); ctx.quadraticCurveTo(x, y + 6 * s, x + 12 * s, y - 2 * s); ctx.stroke();
      ctx.fillStyle = "#f6d27a"; star(x, y - 24 * s, 5 * s);
      ctx.fillStyle = "#c8312b"; ctx.beginPath(); ctx.arc(x - 8 * s, y + 8 * s, 2.4 * s, 0, TAU); ctx.arc(x + 9 * s, y + 6 * s, 2.4 * s, 0, TAU); ctx.fill();
      eyes(x, y - 6 * s, s);
    } else if (e.type === "stump") {
      const s = r / 21;
      ctx.fillStyle = "#6e4526"; ctx.beginPath(); ctx.ellipse(x, y + 4 * s, r, r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#c49a6c"; ctx.beginPath(); ctx.ellipse(x, y - 2 * s, r * 0.9, r * 0.62, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#8a5a32"; ctx.lineWidth = 1.5 * s;
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(x, y - 2 * s, r * 0.22 * i, r * 0.15 * i, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = "#6e4526"; ctx.lineWidth = 3 * s;
      const step = Math.sin(e.wob) * 4 * s;
      ctx.beginPath(); ctx.moveTo(x - 8 * s, y + 14 * s); ctx.lineTo(x - 10 * s, y + 20 * s + step); ctx.moveTo(x + 8 * s, y + 14 * s); ctx.lineTo(x + 10 * s, y + 20 * s - step); ctx.stroke();
      eyes(x, y - 3 * s, s * 1.1);
    }
    if (e.flash > 0) {
      ctx.globalAlpha = 0.7; ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.elite || e.type === "stump") {
      const k = e.hp / e.maxHp;
      if (k < 1) {
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(x - r, y - r - 10, r * 2, 4);
        ctx.fillStyle = "#e2a63b"; ctx.fillRect(x - r, y - r - 10, r * 2 * k, 4);
      }
    }
  }
  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  function drawPlayer() {
    const p = S.player;
    const blink = p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0;
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 14, 22, 8, 0, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.ang);
    ctx.scale(1.3, 1.3);
    if (blink) ctx.globalAlpha = 0.5;
    // tracks
    ctx.fillStyle = "#2a2a2a";
    roundRect(-18, -19, 30, 9, 3); roundRect(-18, 10, 30, 9, 3);
    ctx.fillStyle = "#555";
    const off = (S.t * (p.moving ? 40 : 0)) % 6;
    for (let i = -18 + off; i < 12; i += 6) { ctx.fillRect(i, -19, 2, 9); ctx.fillRect(i, 10, 2, 9); }
    // body (Moorhead blue)
    ctx.fillStyle = "#1f6fc5"; roundRect(-16, -12, 28, 24, 4);
    ctx.fillStyle = "#15559b"; ctx.fillRect(-16, 6, 28, 6);
    // cab
    ctx.fillStyle = "#f2f2f2"; roundRect(-14, -9, 13, 18, 3);
    ctx.fillStyle = "#9fd3ff"; roundRect(-4, -7, 3, 14, 1);
    // mulching drum
    ctx.fillStyle = "#3d3d3d"; roundRect(13, -16, 9, 32, 2);
    ctx.strokeStyle = "#bdbdbd"; ctx.lineWidth = 2;
    const sp = (S.t * 30) % 6;
    ctx.beginPath();
    for (let i = -16 + sp; i < 16; i += 6) { ctx.moveTo(14, i); ctx.lineTo(21, i + 3); }
    ctx.stroke();
    ctx.fillStyle = "#e2a63b"; ctx.fillRect(10, -14, 3, 28);
    // santa hat on the cab
    ctx.fillStyle = "#c8312b";
    ctx.beginPath(); ctx.moveTo(-14, -6); ctx.lineTo(-24, -1); ctx.lineTo(-14, 5); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-25, -1, 3, 0, TAU); ctx.fill();
    ctx.fillRect(-15, -7, 3, 13);
    ctx.restore();
    ctx.globalAlpha = 1;
    // HP bar
    const k = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(p.x - 22, p.y + 30, 44, 5);
    ctx.fillStyle = k > 0.5 ? "#38c172" : k > 0.25 ? "#e2a63b" : "#e3342f";
    ctx.fillRect(p.x - 22, p.y + 30, 44 * k, 5);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.fill();
  }

  function drawWeaponsFx() {
    const p = S.player;
    const m = S.weapons.mulch;
    if (m) {
      const R = WEAPONS.mulch.radius[m.lvl - 1];
      ctx.fillStyle = "rgba(226,166,59,.10)";
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(139,90,50,.55)"; ctx.lineWidth = 3;
      ctx.setLineDash([8, 10]); ctx.lineDashOffset = -(m.spin || 0) * 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    const s = S.weapons.saw;
    if (s) {
      const d = WEAPONS.saw, n = d.count[s.lvl - 1];
      for (let i = 0; i < n; i++) {
        const a = (s.ang || 0) + (i / n) * TAU;
        const bx = p.x + Math.cos(a) * d.orbit, by = p.y + Math.sin(a) * d.orbit;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(S.t * 18);
        ctx.fillStyle = "#cfd6dc";
        star(0, 0, 13);
        ctx.fillStyle = "#7d868e"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawProj(pr) {
    if (pr.type === "cane") {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.lineCap = "round";
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.arc(8, -5, 5, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
      ctx.strokeStyle = "#d62f2f"; ctx.lineWidth = 5; ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(8, 0); ctx.arc(8, -5, 5, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    } else if (pr.type === "snow") {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#9cc3e0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.x, pr.y, 7, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (pr.type === "bomb") {
      ctx.fillStyle = "rgba(0,0,0,.15)";
      ctx.beginPath(); ctx.ellipse(pr.x, pr.y, 8, 3, 0, 0, TAU); ctx.fill();
      const y = pr.y - (pr.h || 0);
      ctx.fillStyle = pr.c; ctx.beginPath(); ctx.arc(pr.x, y, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = "#e2a63b"; ctx.fillRect(pr.x - 3, y - 13, 6, 5);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.arc(pr.x - 3, y - 3, 2.5, 0, TAU); ctx.fill();
      // target marker
      ctx.strokeStyle = "rgba(200,49,43,.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pr.tx, pr.ty, pr.r * Math.min(1, pr.t / pr.dur), 0, TAU); ctx.stroke();
    } else if (pr.type === "deer") {
      const dir = Math.sign(pr.vx);
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.scale(dir, 1);
      const bob = Math.sin(S.t * 30) * 3;
      ctx.fillStyle = "#8a5a32";
      ctx.beginPath(); ctx.ellipse(0, bob, 26, 12, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#6e4526"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-16, 8 + bob); ctx.lineTo(-22, 22); ctx.moveTo(14, 8 + bob); ctx.lineTo(22, 22); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(28, -10 + bob, 11, 8, -0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#5a3a1a"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(24, -16 + bob); ctx.lineTo(18, -30 + bob); ctx.lineTo(12, -32 + bob); ctx.moveTo(19, -26 + bob); ctx.lineTo(24, -34 + bob); ctx.stroke();
      ctx.fillStyle = "#ff3b30"; ctx.shadowColor = "#ff3b30"; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(39, -8 + bob, 4.5, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function drawGem(g) {
    const s = Math.min(1.8, 0.8 + g.v * 0.08);
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(0.6);
    ctx.fillStyle = g.v >= 5 ? "#e2a63b" : "#c49a6c";
    ctx.fillRect(-4 * s, -2.5 * s, 8 * s, 5 * s);
    ctx.fillStyle = "#8a5a32"; ctx.fillRect(-4 * s, 1 * s, 8 * s, 1.5 * s);
    ctx.restore();
  }
  function drawPickup(k) {
    const bob = Math.sin(S.t * 4 + k.x) * 3;
    const x = k.x, y = k.y + bob;
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.ellipse(k.x, k.y + 12, 12, 4, 0, 0, TAU); ctx.fill();
    if (k.type === "cocoa") {
      ctx.fillStyle = "#fff"; roundRect(x - 9, y - 9, 16, 18, 3);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 8, y, 5, -1.2, 1.2); ctx.stroke();
      ctx.fillStyle = "#c8312b"; ctx.fillRect(x - 9, y - 2, 16, 4);
      ctx.fillStyle = "#6b4a2b"; ctx.fillRect(x - 7, y - 8, 12, 3);
    } else if (k.type === "star") {
      ctx.fillStyle = "#f6d27a"; ctx.shadowColor = "#f6d27a"; ctx.shadowBlur = 12;
      star(x, y, 12); ctx.shadowBlur = 0;
    } else if (k.type === "present") {
      ctx.fillStyle = "#c8312b"; ctx.fillRect(x - 13, y - 11, 26, 22);
      ctx.fillStyle = "#f6d27a"; ctx.fillRect(x - 3, y - 11, 6, 22); ctx.fillRect(x - 13, y - 3, 26, 6);
      ctx.beginPath(); ctx.ellipse(x - 6, y - 14, 6, 4, -0.5, 0, TAU); ctx.ellipse(x + 6, y - 14, 6, 4, 0.5, 0, TAU); ctx.fill();
    }
  }

  // screen-space falling snow
  const flakes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: rand(1, 2.6), v: rand(0.03, 0.08) }));

  function draw() {
    const p = S.player;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sx = S.shake ? rand(-S.shake, S.shake) : 0, sy = S.shake ? rand(-S.shake, S.shake) : 0;
    ctx.save();
    ctx.translate(W / 2 + sx, H / 2 + sy);
    ctx.scale(ZOOM, ZOOM);
    ctx.translate(-p.x, -p.y);

    drawGround(p.x, p.y);
    for (const g of S.gems) drawGem(g);
    for (const k of S.pickups) drawPickup(k);
    drawWeaponsFx();
    const sorted = S.enemies.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) drawEnemy(e);
    drawPlayer();
    for (const pr of S.projs) drawProj(pr);
    for (const q of S.parts) {
      const a = Math.max(0, q.life / q.max);
      if (q.ring) {
        ctx.strokeStyle = q.c; ctx.globalAlpha = a; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.15 - a * 0.4), 0, TAU); ctx.stroke();
      } else {
        ctx.globalAlpha = a; ctx.fillStyle = q.c; ctx.fillRect(q.x, q.y, q.sz, q.sz);
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    for (const tx of S.texts) {
      ctx.globalAlpha = Math.min(1, tx.life * 2);
      ctx.font = `900 ${tx.size}px Nunito, sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(0,0,0,.6)"; ctx.strokeText(tx.str, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.str, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // snow overlay
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of flakes) {
      f.y += f.v * 0.016; f.x += Math.sin(S.t + f.y * 6) * 0.0006;
      if (f.y > 1) { f.y = 0; f.x = Math.random(); }
      ctx.beginPath(); ctx.arc(f.x * W, f.y * H, f.s, 0, TAU); ctx.fill();
    }
    if (S.hurtFlash > 0) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, "rgba(200,30,30,0)"); g.addColorStop(1, `rgba(200,30,30,${S.hurtFlash * 1.6})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    drawHud();
    if (stick.active) {
      ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 50, 0, TAU); ctx.stroke();
      const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy), m = Math.min(1, 50 / (d || 1));
      ctx.fillStyle = "rgba(255,255,255,.6)";
      ctx.beginPath(); ctx.arc(stick.ox + dx * m, stick.oy + dy * m, 20, 0, TAU); ctx.fill();
    }
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function drawHud() {
    // XP bar
    const k = Math.min(1, S.xp / S.xpNext);
    ctx.fillStyle = "rgba(20,33,61,.85)"; ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = "#38c172"; ctx.fillRect(0, 0, W * k, 14);
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(0, 0, W * k, 5);
    ctx.textAlign = "left"; ctx.font = "900 11px Nunito, sans-serif"; ctx.fillStyle = "#fff";
    ctx.fillText(`LV ${S.level}`, 8, 11);

    ctx.textAlign = "center";
    ctx.font = "26px 'Alfa Slab One', Georgia, serif";
    ctx.lineWidth = 5; ctx.strokeStyle = "rgba(20,33,61,.8)";
    ctx.strokeText(fmtTime(S.t), W / 2, 48); ctx.fillStyle = "#fff"; ctx.fillText(fmtTime(S.t), W / 2, 48);

    ctx.textAlign = "left";
    ctx.font = "15px 'Special Elite', monospace";
    const label = `🌿 ${S.kills} cleared`;
    ctx.strokeText(label, 12, 40); ctx.fillStyle = "#fff"; ctx.fillText(label, 12, 40);

    // owned items
    let x = 12;
    ctx.font = "18px sans-serif";
    const items = [...Object.keys(S.weapons).map((id) => [WEAPONS[id].icon, S.weapons[id].lvl]), ...Object.keys(S.passives).map((id) => [PASSIVES[id].icon, S.passives[id]])];
    for (const [icon, lv] of items) {
      ctx.fillStyle = "rgba(251,244,230,.9)"; ctx.fillRect(x, H - 40, 30, 30);
      ctx.strokeStyle = "#2b1d14"; ctx.lineWidth = 2; ctx.strokeRect(x, H - 40, 30, 30);
      ctx.textAlign = "center"; ctx.fillStyle = "#000"; ctx.fillText(icon, x + 15, H - 18);
      ctx.font = "900 10px Nunito, sans-serif"; ctx.fillStyle = "#c8312b"; ctx.fillText(lv, x + 25, H - 12);
      ctx.font = "18px sans-serif";
      x += 34;
      if (x > W - 40) break;
    }

    // boss bar
    if (S.boss && !S.boss.dead) {
      const bw = Math.min(420, W - 40), bx = (W - bw) / 2, by = 64;
      ctx.fillStyle = "rgba(0,0,0,.5)"; ctx.fillRect(bx, by, bw, 12);
      ctx.fillStyle = "#4caf50"; ctx.fillRect(bx, by, bw * (S.boss.hp / S.boss.maxHp), 12);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, 12);
      ctx.textAlign = "center"; ctx.font = "13px 'Alfa Slab One', serif"; ctx.fillStyle = "#fff";
      ctx.fillText("KUDZILLA", W / 2, by + 28);
    }

    if (S.banner) {
      const a = Math.min(1, S.banner.life, (S.banner.max - S.banner.life) * 4);
      ctx.globalAlpha = a;
      ctx.textAlign = "center";
      ctx.font = `${Math.min(30, W / 18)}px Lobster, cursive`;
      ctx.lineWidth = 6; ctx.strokeStyle = "rgba(20,33,61,.85)";
      ctx.strokeText(S.banner.str, W / 2, H * 0.28);
      ctx.fillStyle = "#f6d27a"; ctx.fillText(S.banner.str, W / 2, H * 0.28);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- Screens ---------- */
  const OVER_TITLES = ["Shift's over!", "The kudzu won this round.", "OSHA would like a word.", "Mulched it. Barely.", "Back to the break room."];
  const TIPS = [
    "Tip: kudzu grows up to a foot a day. RSVP faster than that.",
    "Tip: Hard Hats stack. Safety meetings were right all along.",
    "Tip: Presents always contain an upgrade. Unlike the office white elephant.",
    "Tip: Snowballs knock things back. Use them to make some elbow room.",
    "Tip: Kudzilla shows up every 3 minutes. Save your best gear for him.",
    "Tip: Keep moving. Stumps are slow; sweetgum balls are not."
  ];

  function bestLine() {
    const b = store.get("kudzuBest", null);
    return b ? `<p class="best">Your best: ${fmtTime(b.t)} survived • ${b.kills} cleared • level ${b.level}</p>` : "";
  }

  function showTitle() {
    S = null;
    newGame();
    S.mode = "title";
    panel.innerHTML = `
      <p class="kicker">A Moorhead Holiday Clearing Operation</p>
      <h1>Kudzu Survivors<span>Holiday Overtime</span></h1>
      <p class="story">It's Christmas week and the job site is overrun with festive overgrowth. Hop in the mulcher and clear as much as you can before your shift ends. Your weapons fire on their own. You just drive.</p>
      <div class="controls"><span>Move: WASD / Arrows</span><span>Phone: drag anywhere</span><span>Pause: Esc</span></div>
      ${bestLine()}
      <div class="btns">
        <button class="btn" id="start-btn" type="button">Start Clearing</button>
        <a class="btn alt" href="index.html#rsvp">Back to RSVP</a>
      </div>`;
    overlay.hidden = false;
    panel.querySelector("#start-btn").addEventListener("click", start);
    panel.querySelector("#start-btn").focus();
  }

  function start() {
    newGame();
    overlay.hidden = true;
    audio();
    banner("Clear the site!", 2);
    last = performance.now();
  }

  function togglePause() {
    if (S.mode === "play") {
      S.mode = "paused";
      keys.clear();
      stick.active = false;
      panel.innerHTML = `
        <p class="kicker">Coffee break</p><h2>Paused</h2>
        <p>${pick(TIPS)}</p>
        <div class="btns">
          <button class="btn" id="resume-btn" type="button">Back to work</button>
          <button class="btn alt" id="quit-btn" type="button">Quit run</button>
          <a class="btn gold" href="index.html#rsvp">RSVP</a>
        </div>`;
      overlay.hidden = false;
      panel.querySelector("#resume-btn").addEventListener("click", togglePause);
      panel.querySelector("#quit-btn").addEventListener("click", showTitle);
      panel.querySelector("#resume-btn").focus();
    } else if (S.mode === "paused") {
      S.mode = "play";
      overlay.hidden = true;
      last = performance.now();
    }
  }

  function gameOver() {
    S.mode = "over";
    sfx.boom();
    const best = store.get("kudzuBest", null);
    const isBest = !best || S.t > best.t;
    if (isBest) store.set("kudzuBest", { t: S.t, kills: S.kills, level: S.level });
    const rsvped = (() => { try { return localStorage.getItem("rsvpDone") === "1"; } catch (_) { return false; } })();
    panel.innerHTML = `
      <p class="kicker">${isBest ? "New personal best!" : "Clock out"}</p>
      <h2>${pick(OVER_TITLES)}</h2>
      <div class="stats">
        <div class="stat"><b>${fmtTime(S.t)}</b><span>Survived</span></div>
        <div class="stat"><b>${S.kills}</b><span>Cleared</span></div>
        <div class="stat"><b>${S.level}</b><span>Level</span></div>
      </div>
      ${isBest ? "" : bestLine()}
      <p class="story">${pick(TIPS)}</p>
      <div class="btns">
        <button class="btn" id="again-btn" type="button">Run it back</button>
        <a class="btn gold" href="index.html#rsvp">${rsvped ? "Update my RSVP" : "RSVP for the party"}</a>
      </div>
      ${rsvped ? "" : `<p class="rsvp-nudge">Reminder: the real party needs your RSVP. <a href="index.html#rsvp">Do it now</a>, then come back for revenge.</p>`}`;
    overlay.hidden = false;
    panel.querySelector("#again-btn").addEventListener("click", start);
    panel.querySelector("#again-btn").focus();
  }

  /* ---------- Buttons ---------- */
  const muteBtn = document.getElementById("mute-btn");
  function renderMute() { muteBtn.textContent = muted ? "🔇 Muted" : "🔊 Sound"; muteBtn.setAttribute("aria-pressed", String(muted)); }
  muteBtn.addEventListener("click", () => { muted = !muted; store.set("kudzuMuted", muted); renderMute(); });
  renderMute();
  document.getElementById("pause-btn").addEventListener("click", () => { if (S.mode === "play" || S.mode === "paused") togglePause(); });

  /* ---------- Loop ---------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode === "play") update(dt);
    if (S.mode !== "title") draw();
    else drawAttract(now / 1000);
    requestAnimationFrame(frame);
  }

  // Simple animated backdrop behind the title screen
  function drawAttract(t) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(ZOOM, ZOOM);
    S.player.x = Math.cos(t * 0.2) * 300; S.player.y = Math.sin(t * 0.13) * 300;
    ctx.translate(-S.player.x, -S.player.y);
    S.t = t;
    drawGround(S.player.x, S.player.y);
    ctx.restore();
  }

  showTitle();
  requestAnimationFrame(frame);

  // Debug/testing hook (harmless): lets the page be inspected from the console.
  window.__kudzu = {
    get state() { return S; },
    step(seconds) { for (let i = 0; i < seconds * 60 && S.mode === "play"; i++) update(1 / 60); draw(); }
  };
})();
