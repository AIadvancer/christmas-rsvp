/* ============================================================
   Sound effects for the whole site, synthesized in the browser
   (no audio files). One mute setting shared by every page.
   Usage: Sound.play("jingle"), Sound.toggle(), Sound.muted
   ============================================================ */
(function () {
  "use strict";

  const KEY = "mhMuted";
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (_) { /* private mode: default to sound on */ }

  let ctx = null;
  let master = null;
  function ac() {
    if (muted) return null;
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      } catch (_) { return null; }
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // ---- building blocks ----
  function tone(freq, dur, { type = "sine", vol = 0.2, at = 0, slide = 0, vibrato = 0 } = {}) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + at;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    if (vibrato) {
      const lfo = a.createOscillator(), lg = a.createGain();
      lfo.frequency.value = 6; lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + dur);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, { vol = 0.15, at = 0, type = "highpass", freq = 2000, sweepTo = 0, q = 1 } = {}) {
    const a = ac(); if (!a) return;
    const t = a.currentTime + at;
    const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
  }
  function bell(freq, at = 0, vol = 0.12, dur = 0.6) {
    // bright metallic bell: fundamental + inharmonic partials
    tone(freq, dur, { type: "sine", vol, at });
    tone(freq * 2.76, dur * 0.6, { type: "sine", vol: vol * 0.45, at });
    tone(freq * 5.4, dur * 0.35, { type: "sine", vol: vol * 0.25, at });
  }
  function sleighBells(at = 0, n = 6, vol = 0.1) {
    for (let i = 0; i < n; i++) {
      const t = at + i * 0.07 + Math.random() * 0.02;
      noise(0.06, { vol: vol, at: t, freq: 7000 });
      tone(2600 + Math.random() * 900, 0.08, { vol: vol * 0.5, at: t });
    }
  }
  const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI number -> Hz

  // ---- the sound library ----
  const SFX = {
    click() { tone(1400, 0.035, { type: "triangle", vol: 0.08 }); },
    pop() { tone(380, 0.11, { type: "sine", vol: 0.22, slide: 600 }); },
    unpop() { tone(700, 0.12, { type: "sine", vol: 0.18, slide: -420 }); },
    jingle() { sleighBells(0, 5, 0.09); bell(note(88), 0.02, 0.06, 0.4); },
    sleigh() { sleighBells(0, 14, 0.07); noise(1.1, { vol: 0.05, type: "bandpass", freq: 400, sweepTo: 2400, q: 0.8 }); },
    sparkle() { [84, 88, 91, 96, 100].forEach((n, i) => bell(note(n), i * 0.06, 0.07, 0.35)); },
    shatter() {
      noise(0.28, { vol: 0.22, freq: 2500 });
      for (let i = 0; i < 6; i++) tone(3000 + Math.random() * 3000, 0.09, { vol: 0.05, at: 0.02 + i * 0.03 });
    },
    screw() { [0, 0.07, 0.14].forEach((t) => noise(0.025, { vol: 0.2, at: t, type: "bandpass", freq: 3200, q: 4 })); tone(880, 0.12, { type: "triangle", vol: 0.08, at: 0.22 }); },
    boing() { tone(140, 0.4, { type: "sine", vol: 0.28, slide: 360, vibrato: 25 }); },
    ho() {
      // a jolly "ho ho ho": three low formant-ish bursts
      [0, 0.24, 0.48].forEach((t, i) => {
        tone(130 - i * 8, 0.2, { type: "sawtooth", vol: 0.11, at: t, slide: -30 });
        tone(260 - i * 16, 0.2, { type: "sine", vol: 0.12, at: t, slide: -50 });
      });
    },
    blip() { tone(150 + Math.random() * 60, 0.05, { type: "square", vol: 0.035 }); },
    sizeNote(i) { bell(note(84 - i * 2), 0, 0.1, 0.5); },
    yes() { [72, 76, 79].forEach((n, i) => bell(note(n), i * 0.07, 0.09, 0.5)); sleighBells(0.2, 4, 0.06); },
    no() { tone(392, 0.22, { type: "triangle", vol: 0.14, slide: -60 }); tone(311, 0.4, { type: "triangle", vol: 0.14, at: 0.2, slide: -80 }); },
    error() { tone(180, 0.12, { type: "square", vol: 0.08 }); tone(150, 0.18, { type: "square", vol: 0.08, at: 0.12 }); },
    whoosh() { noise(0.45, { vol: 0.12, type: "bandpass", freq: 300, sweepTo: 3000, q: 0.7 }); },
    fanfare() {
      [[67, 0], [72, 0.12], [76, 0.24], [79, 0.36], [84, 0.6]].forEach(([n, t]) => {
        tone(note(n), t === 0.6 ? 0.7 : 0.16, { type: "square", vol: 0.06, at: t });
        bell(note(n), t, 0.05, 0.5);
      });
      sleighBells(0.6, 8, 0.07);
    },
    sadTrombone() {
      [[55, 0], [54, 0.32], [53, 0.64]].forEach(([n, t]) => tone(note(n), 0.3, { type: "sawtooth", vol: 0.07, at: t }));
      tone(note(52), 0.9, { type: "sawtooth", vol: 0.07, at: 0.96, vibrato: 6 });
    },
    tear() { noise(0.35, { vol: 0.2, type: "bandpass", freq: 900, sweepTo: 5000, q: 1.5 }); },
    plugIn() {
      noise(0.08, { vol: 0.35, type: "lowpass", freq: 300 });
      tone(55, 0.9, { type: "sawtooth", vol: 0.03, at: 0.05 });
      tone(110, 0.9, { type: "sine", vol: 0.05, at: 0.05, slide: 10 });
    },
    bulbOn(i) { tone(note(72 + (i % 12)), 0.06, { type: "triangle", vol: 0.04 }); },
    confetti() { for (let i = 0; i < 6; i++) noise(0.05, { vol: 0.12, at: i * 0.05 + Math.random() * 0.03, type: "bandpass", freq: 1800, q: 2 }); }
  };

  // Throttle each sound so rapid repeats don't turn into noise.
  const lastPlayed = {};
  const MIN_GAP = { blip: 0.045, bulbOn: 0.03, click: 0.04 };

  function play(name, arg) {
    if (muted || !SFX[name]) return;
    const now = performance.now() / 1000;
    if (now - (lastPlayed[name] || 0) < (MIN_GAP[name] || 0.06)) return;
    lastPlayed[name] = now;
    try { SFX[name](arg); } catch (_) { /* sound is never worth breaking the page */ }
  }

  const listeners = [];
  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (_) { /* fine */ }
    if (muted && ctx) ctx.suspend();
    if (!muted) { ac(); play("jingle"); }
    listeners.forEach((fn) => fn(muted));
  }

  window.Sound = {
    play,
    get muted() { return muted; },
    setMuted,
    toggle() { setMuted(!muted); },
    onChange(fn) { listeners.push(fn); },
    context: () => ac(),
    output: () => (ac(), master)
  };

  // A floating mute button on any page that includes this script.
  function addButton() {
    if (document.getElementById("sound-toggle") || document.body.dataset.noSoundButton) return;
    const b = document.createElement("button");
    b.id = "sound-toggle";
    b.type = "button";
    b.className = "sound-toggle";
    const render = () => {
      b.innerHTML = muted
        ? '<span aria-hidden="true">🔇</span><span class="st-label">Sound off</span>'
        : '<span aria-hidden="true">🔊</span><span class="st-label">Sound on</span>';
      b.setAttribute("aria-pressed", String(muted));
      b.setAttribute("aria-label", muted ? "Turn sound on" : "Turn sound off");
      b.title = muted ? "Turn sound on" : "Turn sound off";
    };
    b.addEventListener("click", () => window.Sound.toggle());
    window.Sound.onChange(render);
    render();
    document.body.appendChild(b);
  }
  if (document.body) addButton(); else document.addEventListener("DOMContentLoaded", addButton);

  // Little click on every button and chip, site-wide.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, .btn, .chip, a.tb-btn");
    if (el && el.id !== "sound-toggle" && !el.closest(".santa-btn") && !el.classList.contains("step-btn")) play("click");
  }, true);
})();
