/* ============================================================
   Opening animation: a present unwraps to reveal the Moorhead logo,
   the string lights power on, then the scene lifts away.
   Tap the present to open it now (with sound), or it opens itself.
   ============================================================ */
(function () {
  "use strict";

  const intro = document.getElementById("intro");
  if (!intro) return;
  const gift = document.getElementById("intro-gift");
  const sfx = (name) => { if (window.Sound) window.Sound.play(name); };
  const lightsOn = () => { if (window.Festive && window.Festive.powerOnLights) window.Festive.powerOnLights(); };
  let stage = "waiting"; // waiting -> opening -> open -> leaving -> done
  const timers = [];
  const hold = /[?&]introhold/.test(location.search); // testing aid: stay on the opened present
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function finish() {
    if (stage === "done") return;
    stage = "done";
    timers.forEach(clearTimeout);
    intro.remove();
    document.body.classList.remove("intro-running");
    lightsOn();
    document.removeEventListener("keydown", onKey);
  }

  function leave() {
    if (stage === "leaving" || stage === "done") return;
    stage = "leaving";
    timers.forEach(clearTimeout);
    lightsOn();
    sfx("whoosh");
    intro.classList.add("leaving");
    document.body.classList.remove("intro-running");
    later(finish, 950);
  }

  function open() {
    if (stage !== "waiting") return;
    stage = "opening";
    intro.classList.add("opening");
    sfx("tear");
    later(() => {
      stage = "open";
      intro.classList.add("open");
      sfx("fanfare");
      if (window.Festive) window.Festive.confetti(70);
    }, 450);
    later(lightsOn, 900);
    later(() => sfx("ho"), 1500);
    if (!hold) later(leave, 3600);
  }

  function onKey(e) {
    if (e.key === "Escape") leave();
    else if ((e.key === "Enter" || e.key === " ") && stage === "waiting") { e.preventDefault(); open(); }
  }

  // Coming back from the game's RSVP buttons: go straight to the form.
  if (location.hash === "#rsvp") { finish(); return; }

  gift.addEventListener("click", (e) => { e.stopPropagation(); open(); });
  intro.addEventListener("click", (e) => {
    if (e.target.closest(".intro-skip")) return;
    if (stage === "waiting") open();
    else if (stage === "open") leave();
  });
  intro.querySelector(".intro-skip").addEventListener("click", leave);
  document.addEventListener("keydown", onKey);

  later(open, 8000);   // opens by itself if nobody taps within 8 seconds
})();
