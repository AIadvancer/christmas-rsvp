/* ============================================================
   Festive stuff: lights, snow, Santa, countdown, sleigh, jingle
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.PARTY_CONFIG || {};
  const $ = (sel) => document.querySelector(sel);
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sfx = (name, arg) => { if (window.Sound) window.Sound.play(name, arg); };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, ms = 2800) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }

  /* ---------- Old-school C9 string lights ---------- */
  const BULB_COLORS = ["#ff3b30", "#2ecc71", "#3b82f6", "#ff9f1c", "#ffd60a"];
  const BREAK_LINES = [
    "You broke one. That's coming out of your bonus.",
    "Pop! Facilities has been notified. (They have not.)",
    "Another one bites the dust. Click it again to screw it back in.",
    "That bulb survived since 1962. Until you.",
    "The whole strand is on one circuit. Kidding. Probably."
  ];
  const FIX_LINES = ["Screwed it back in. Good as new-ish.", "Fixed! Put that on your resume.", "Let there be light."];
  const MODES = ["Twinkle", "Chase", "Steady", "Full Griswold"];
  let mode = 0;
  let bulbs = [];
  let tick = 0;
  let powered = !document.body.classList.contains("intro-running");

  function drawLights() {
    const svg = $("#lights-svg");
    const w = window.innerWidth;
    const h = 78;
    const ns = "http://www.w3.org/2000/svg";
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = "";
    bulbs = [];

    const target = w < 600 ? 120 : 170;
    const segs = Math.max(2, Math.round(w / target));
    const span = w / segs;
    const top = 4;
    const sag = w < 600 ? 22 : 30;
    const perSeg = span > 140 ? 4 : 3;

    let d = `M -10 ${top}`;
    const curves = [];
    for (let i = 0; i < segs; i++) {
      const x0 = i * span, x2 = (i + 1) * span;
      const p0 = [x0, top], p1 = [(x0 + x2) / 2, top + sag * 2], p2 = [x2, top];
      d += ` L ${x0} ${top} Q ${p1[0]} ${p1[1]} ${x2} ${top}`;
      curves.push([p0, p1, p2]);
    }
    d += ` L ${w + 10} ${top}`;
    const wire = document.createElementNS(ns, "path");
    wire.setAttribute("d", d);
    wire.setAttribute("class", "wire");
    svg.appendChild(wire);

    let ci = 0;
    curves.forEach(([p0, p1, p2]) => {
      for (let k = 0; k < perSeg; k++) {
        const t = (k + 0.5) / perSeg;
        const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
        const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
        const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
        const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const color = BULB_COLORS[ci++ % BULB_COLORS.length];

        const holder = document.createElementNS(ns, "g");
        holder.setAttribute("transform", `translate(${x.toFixed(1)} ${(y - 1).toFixed(1)}) rotate(${angle.toFixed(1)})`);
        const g = document.createElementNS(ns, "g");
        g.setAttribute("class", powered ? "bulb on" : "bulb off");
        g.style.setProperty("--c", color);
        g.innerHTML =
          `<rect class="socket" x="-4.5" y="-1" width="9" height="10" rx="1.5"/>` +
          `<path class="glass" fill="${color}" d="M-6 8 C -10 17, -6 27, 0 35 C 6 27, 10 17, 6 8 Z"/>` +
          `<ellipse class="shine" cx="-2.5" cy="17" rx="1.6" ry="5"/>`;
        holder.appendChild(g);
        svg.appendChild(holder);

        const bulb = { el: g, broken: false, holder };
        g.addEventListener("click", () => toggleBroken(bulb));
        bulbs.push(bulb);
      }
    });
  }

  function toggleBroken(bulb) {
    if (bulb.broken) {
      bulb.broken = false;
      bulb.el.classList.remove("broken");
      sfx("screw");
      toast(pick(FIX_LINES));
      return;
    }
    bulb.broken = true;
    bulb.el.classList.add("broken");
    sfx("shatter");
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 6; i++) {
      const s = document.createElementNS(ns, "path");
      s.setAttribute("class", "shard");
      s.setAttribute("d", "M0 0 l4 1 l-2 4 z");
      s.setAttribute("transform", "translate(0 20)");
      s.style.setProperty("--dx", `${rand(-24, 24)}px`);
      s.style.setProperty("--dy", `${rand(10, 45)}px`);
      s.style.setProperty("--rot", `${rand(-180, 180)}deg`);
      bulb.holder.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
    const left = bulbs.filter((b) => !b.broken).length;
    toast(left === 0 ? "You broke every single light. Impressive. Concerning, but impressive." : pick(BREAK_LINES));
  }

  function animateLights() {
    if (!powered) return;
    tick++;
    const m = MODES[mode];
    bulbs.forEach((b, i) => {
      if (b.broken) return;
      let on = true;
      if (m === "Twinkle") on = b.el.classList.contains("on") ? Math.random() > 0.12 : Math.random() > 0.5;
      else if (m === "Chase") on = (i + tick) % 3 !== 0;
      b.el.classList.toggle("on", on);
      b.el.classList.toggle("off", !on);
    });
  }

  function setMode(next) {
    mode = next;
    if (MODES[mode] === "Full Griswold") sfx("plugIn");
    document.body.classList.toggle("griswold", MODES[mode] === "Full Griswold");
    $("#mode-btn").textContent = `Lights: ${MODES[mode]}`;
    animateLights();
  }

  // Lights flick on one by one, left to right (used when the intro finishes).
  function powerOnLights() {
    if (powered) return;
    sfx("plugIn");
    bulbs.forEach((b, i) => {
      setTimeout(() => {
        b.el.classList.remove("off");
        b.el.classList.add("on");
        sfx("bulbOn", i);
        if (i === bulbs.length - 1) powered = true;
      }, 120 + i * 45);
    });
    if (!bulbs.length) powered = true;
  }

  /* ---------- Snow ---------- */
  function startSnow() {
    const canvas = $("#snow");
    const hero = document.querySelector(".hero");
    const ctx = canvas.getContext("2d");
    let flakes = [];
    let w = 0, h = 0, wind = 0, windTarget = 0, running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function size() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.round((w * h) / 8000));
      flakes = Array.from({ length: count }, () => newFlake(true));
    }
    function newFlake(anywhere) {
      const r = rand(0.8, 3.4);
      return { x: rand(0, w), y: anywhere ? rand(0, h) : -5, r, vy: r * 0.35 + rand(0.2, 0.6), phase: rand(0, 6.28), a: rand(0.5, 0.95) };
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      wind += (windTarget - wind) * 0.02;
      for (const f of flakes) {
        f.phase += 0.01;
        f.y += f.vy;
        f.x += Math.sin(f.phase) * 0.4 + wind * f.r * 0.6;
        if (f.y > h + 5) Object.assign(f, newFlake(false));
        if (f.x > w + 5) f.x = -5;
        if (f.x < -5) f.x = w + 5;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${f.a})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    function loop() {
      if (running) draw();
      requestAnimationFrame(loop);
    }
    size();
    window.addEventListener("resize", debounce(size, 200));
    window.addEventListener("pointermove", (e) => { windTarget = (e.clientX / window.innerWidth - 0.5) * 2.2; });
    new IntersectionObserver(([entry]) => { running = entry.isIntersecting; }).observe(hero);
    loop();
  }

  /* ---------- Santa ---------- */
  const SANTA_LINES = [
    "Ho ho ho! RSVP or it's coal in your inbox.",
    "I've checked my list twice. Your name's not on it yet.",
    "Yes, the shirts are free. No, you can't have three.",
    "Plus-ones welcome. Plus-twelves, let's talk.",
    "Please don't reply-all. Just use the form.",
    "The elves unionized. I'm handling RSVPs myself this year.",
    "Rudolph is the designated driver. Again.",
    "Be honest on the shirt size. I've seen what 'medium' does to people.",
    "I know when you're sleeping. I also know you haven't RSVP'd.",
    "Mrs. Claus says I need to stop eating the cookies. Not happening.",
    "I'm just a big guy in a red suit who loves a good spreadsheet.",
    "Every time you poke me, an elf gets a paper cut."
  ];
  let lastLine = -1;
  let pokes = 0;
  let typingTimer;

  function santaSay(text, { wink = false } = {}) {
    const bubble = $("#speech");
    const svg = document.querySelector(".santa");
    clearInterval(typingTimer);
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
    if (wink) {
      svg.classList.add("wink");
      setTimeout(() => svg.classList.remove("wink"), 500);
    }
    svg.classList.add("talking");
    let i = 0;
    bubble.textContent = "";
    typingTimer = setInterval(() => {
      bubble.textContent = text.slice(0, ++i);
      if (i % 2 === 0 && text[i - 1] !== " ") sfx("blip");
      if (i >= text.length) {
        clearInterval(typingTimer);
        svg.classList.remove("talking");
      }
    }, 28);
  }

  function randomSantaLine() {
    let i;
    do { i = Math.floor(Math.random() * SANTA_LINES.length); } while (i === lastLine);
    lastLine = i;
    return SANTA_LINES[i];
  }

  function floatHo(x, y) {
    const el = document.createElement("span");
    el.className = "hohoho";
    el.textContent = pick(["Ho!", "Ho ho!", "Ho ho ho!", "Oof!", "Hee hee!"]);
    el.style.left = `${x - 30}px`;
    el.style.top = `${y - 20}px`;
    el.style.setProperty("--r", `${rand(-20, 20)}deg`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function initSanta() {
    const btn = $("#santa");
    const svg = btn.querySelector(".santa");
    const pupils = [...svg.querySelectorAll(".pupil")];
    const centers = pupils.map((p) => [+p.dataset.cx, +p.dataset.cy]);

    btn.addEventListener("click", (e) => {
      pokes++;
      svg.classList.remove("jiggle");
      void svg.getBoundingClientRect();
      svg.classList.add("jiggle");
      sfx(pokes % 3 === 1 ? "ho" : "boing");
      const r = btn.getBoundingClientRect();
      floatHo(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 3);
      if (pokes === 7) santaSay("Okay, that tickles. Go fill out the form, you goof.", { wink: true });
      else if (pokes === 15) santaSay("Fifteen pokes. I'm adding you to a special list. Not the nice one.");
      else santaSay(randomSantaLine(), { wink: Math.random() < 0.3 });
    });

    // Eyes follow the cursor
    window.addEventListener("pointermove", (e) => {
      const box = svg.getBoundingClientRect();
      if (!box.width) return;
      const scale = box.width / 400;
      pupils.forEach((p, i) => {
        const [cx, cy] = centers[i];
        const ex = box.left + cx * scale;
        const ey = box.top + cy * scale;
        const ang = Math.atan2(e.clientY - ey, e.clientX - ex);
        const dist = Math.min(4, Math.hypot(e.clientX - ex, e.clientY - ey) / 40);
        p.setAttribute("transform", `translate(${(Math.cos(ang) * dist).toFixed(2)} ${(Math.sin(ang) * dist * 0.7).toFixed(2)})`);
      });
    });

    // Blink now and then
    (function blink() {
      setTimeout(() => {
        svg.classList.add("blink");
        setTimeout(() => svg.classList.remove("blink"), 140);
        blink();
      }, rand(2500, 6000));
    })();
  }

  /* ---------- Countdown + party details ---------- */
  function initDetails() {
    const date = CFG.partyDate ? new Date(CFG.partyDate) : null;
    const valid = date && !isNaN(date);
    const parts = [];
    if (valid) {
      const day = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
      const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      parts.push(`<strong>${day}</strong> at ${time}`);
    }
    if (CFG.venue) parts.push(escapeHtml(CFG.venue));
    if (CFG.rsvpBy) parts.push(`RSVP by <strong>${escapeHtml(CFG.rsvpBy)}</strong>`);
    $("#party-details").innerHTML = parts.join(" &bull; ") || "Details coming soon.";

    if (!valid) {
      $("#countdown").hidden = true;
      $("#cd-caption").hidden = true;
      return;
    }
    const cells = {};
    document.querySelectorAll(".cd-num").forEach((el) => (cells[el.dataset.unit] = el));
    function update() {
      let diff = Math.max(0, date - new Date());
      const vals = {
        days: Math.floor(diff / 864e5),
        hours: Math.floor((diff / 36e5) % 24),
        mins: Math.floor((diff / 6e4) % 60),
        secs: Math.floor((diff / 1e3) % 60)
      };
      for (const k in vals) {
        const txt = String(vals[k]).padStart(2, "0");
        if (cells[k].textContent !== txt) {
          cells[k].textContent = txt;
          cells[k].classList.remove("tick");
          void cells[k].offsetWidth;
          cells[k].classList.add("tick");
        }
      }
      if (diff === 0) $("#cd-caption").textContent = "It's party time! Why are you reading this?";
    }
    update();
    setInterval(update, 1000);
  }

  /* ---------- Live headcount from the sheet ---------- */
  async function refreshHeadcount() {
    if (!CFG.scriptUrl || !CFG.showHeadcount) return;
    try {
      const res = await fetch(`${CFG.scriptUrl}?action=stats`);
      const data = await res.json();
      if (!data.ok) return;
      const el = $("#headcount");
      const n = data.headcount;
      el.textContent = n === 0
        ? "Be the first one on Santa's list!"
        : `🎅 ${n} ${n === 1 ? "person is" : "people are"} coming so far`;
      el.hidden = false;
    } catch (_) { /* no headcount is fine */ }
  }

  /* ---------- Sleigh fly-by ---------- */
  function flySleigh() {
    const s = $("#sleigh");
    s.classList.remove("fly");
    void s.getBoundingClientRect();
    s.classList.add("fly");
    sfx("sleigh");
  }

  /* ---------- Confetti / snow burst ---------- */
  function confetti(count = 90) {
    sfx("confetti");
    const colors = ["#c8312b", "#1f5a43", "#e2a63b", "#fbf4e6", "#3b82f6"];
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.style.background = pick(colors);
      if (Math.random() < 0.3) el.style.borderRadius = "50%";
      document.body.appendChild(el);
      const x0 = w / 2 + rand(-60, 60), y0 = h * 0.45;
      const x1 = x0 + rand(-w * 0.5, w * 0.5), y1 = y0 + rand(-h * 0.45, -h * 0.1);
      const x2 = x1 + rand(-80, 80), y2 = h + 40;
      el.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${x1}px, ${y1}px) rotate(${rand(180, 540)}deg)`, opacity: 1, offset: 0.3 },
          { transform: `translate(${x2}px, ${y2}px) rotate(${rand(540, 1080)}deg)`, opacity: 0.8 }
        ],
        { duration: rand(1800, 3200), easing: "cubic-bezier(.2,.6,.4,1)" }
      ).onfinish = () => el.remove();
    }
  }

  /* ---------- Jingle Bells (synthesized, no audio files) ---------- */
  let jingleNodes = null;
  let jingleTimer = null;
  function stopJingle() {
    if (!jingleNodes) return;
    jingleNodes.forEach((n) => { try { n.stop(); } catch (_) { /* already stopped */ } });
    jingleNodes = null;
    clearTimeout(jingleTimer);
    const btn = $("#jingle-btn");
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = "&#9835; Play a jingle";
  }
  function playJingle() {
    if (jingleNodes) { stopJingle(); return; }
    if (!window.Sound) return;
    if (window.Sound.muted) window.Sound.setMuted(false); // asking for music means sound on
    const ctx = window.Sound.context();
    const out = window.Sound.output();
    if (!ctx || !out) return;
    const btn = $("#jingle-btn");
    btn.setAttribute("aria-pressed", "true");
    btn.textContent = "■ Stop the jingle";
    jingleNodes = [];
    const N = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99 };
    const tune =
      "E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 E1 D1 D1 E1 D2 G2 " +
      "E1 E1 E2 E1 E1 E2 E1 G1 C1.5 D.5 E4 F1 F1 F1.5 F.5 F1 E1 E1 E.5 E.5 G1 G1 F1 D1 C4";
    const beat = 0.24;
    let t = ctx.currentTime + 0.1;
    tune.split(" ").forEach((tok) => {
      const freq = N[tok[0]];
      const len = parseFloat(tok.slice(1)) * beat;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.95);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + len);
      jingleNodes.push(osc, sleighBell(ctx, out, t));
      t += len;
    });
    const mine = jingleNodes;
    jingleTimer = setTimeout(() => { if (jingleNodes === mine) { jingleNodes = null; playJingle(); } }, (t - ctx.currentTime) * 1000 + 200);
  }
  function sleighBell(ctx, out, t) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.value = 0.18;
    src.connect(hp).connect(g).connect(out);
    src.start(t);
    return src;
  }

  /* ---------- Easter eggs ---------- */
  function initEasterEggs() {
    const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let typed = "";
    let kIdx = 0;
    document.addEventListener("keydown", (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      typed = (typed + e.key.toLowerCase()).slice(-6);
      if (typed === "hohoho") {
        typed = "";
        flySleigh();
        confetti(60);
        santaSay("HO HO HO! You found my secret. Tell no one.", { wink: true });
      }
      kIdx = e.key === konami[kIdx] ? kIdx + 1 : e.key === konami[0] ? 1 : 0;
      if (kIdx === konami.length) {
        kIdx = 0;
        setMode(MODES.indexOf("Full Griswold"));
        toast("Full Griswold mode engaged. The power company thanks you.");
      }
    });
  }

  /* ---------- Helpers ---------- */
  function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- Boot ---------- */
  drawLights();
  window.addEventListener("resize", debounce(drawLights, 250));
  setInterval(animateLights, 450);
  $("#mode-btn").addEventListener("click", () => {
    setMode((mode + 1) % MODES.length);
    if (MODES[mode] === "Full Griswold") toast("Full Griswold mode. The neighbors hate this one trick.");
  });
  $("#jingle-btn").addEventListener("click", playJingle);
  if (window.Sound) window.Sound.onChange((m) => { if (m) stopJingle(); });

  const MOON_LINES = [
    "Ho ho ho! You found the moon button. The sleigh is on its way!",
    "Dasher! Dancer! Somebody clicked the moon again!",
    "Rudolph's nose is fully charged. Off we go!"
  ];
  function summonSleigh() {
    sfx("sparkle");
    flySleigh();
    confetti(40);
    santaSay(pick(MOON_LINES), { wink: true });
  }
  $("#moon").addEventListener("click", summonSleigh);
  $("#sleigh-btn").addEventListener("click", () => {
    document.querySelector(".hero").scrollIntoView({ behavior: "smooth" });
    setTimeout(summonSleigh, 500);
  });

  startSnow();
  initSanta();
  initDetails();
  initEasterEggs();
  refreshHeadcount();

  setTimeout(flySleigh, powered ? 3500 : 9000);
  setInterval(flySleigh, 38000);

  window.Festive = { toast, confetti, santaSay, flySleigh, refreshHeadcount, escapeHtml, powerOnLights };
})();
