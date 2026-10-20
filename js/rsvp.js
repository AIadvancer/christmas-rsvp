/* ============================================================
   RSVP form: sizes, guests, validation, sending to Google Sheets
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.PARTY_CONFIG || {};
  const F = window.Festive;
  const sfx = (name, arg) => { if (window.Sound) window.Sound.play(name, arg); };
  const $ = (sel) => document.querySelector(sel);
  const form = $("#rsvp-form");
  const sizes = CFG.shirtSizes || [["S", "Small"], ["M", "Medium"], ["L", "Large"], ["XL", "XL"]];
  const namedGuests = Number(CFG.namedGuests) || 2;
  const maxExtra = Number(CFG.maxExtraGuests) || 10;

  const SIZE_QUIPS = {
    XS: "Tiny but mighty. Like a well-caffeinated elf.",
    S: "Pa-rum-pum-pum-pum. Nice choice.",
    M: "The Goldilocks of shirts. Just right.",
    L: "Built like a snowman, warm like one too. Wait, no.",
    XL: "Room for second helpings. Smart.",
    "2XL": "The official size of Santa himself. Respect.",
    "3XL": "Planning ahead for the dessert table. We see you."
  };
  const GUEST_QUIPS = [
    "Flying solo. Respect.",
    "Me + 1. Classic.",
    "Bringing a crew!",
    "That's a whole sleigh-full.",
    "Santa's impressed. And slightly worried."
  ];
  const ORNAMENT_COLORS = ["#c8312b", "#1f5a43", "#e2a63b", "#3b82f6", "#d946ef"];

  /* ---------- Shirt size tags ---------- */
  const sizeBox = $("#sizes");
  sizes.forEach(([value, label]) => {
    const l = document.createElement("label");
    l.className = "size-tag";
    l.innerHTML = `<input type="radio" name="shirtSize"><span><b></b><small></small></span>`;
    l.querySelector("input").value = value;
    l.querySelector("b").textContent = value;
    l.querySelector("small").textContent = label;
    sizeBox.appendChild(l);
  });
  sizeBox.addEventListener("change", (e) => {
    sfx("sizeNote", sizes.findIndex(([v]) => v === e.target.value));
    $("#size-quip").textContent = SIZE_QUIPS[e.target.value] || "Excellent choice.";
    clearError("shirtSize");
  });

  /* ---------- Attending toggle ---------- */
  const attendingBox = $("#if-attending");
  form.addEventListener("change", (e) => {
    if (e.target.name !== "attending") return;
    clearError("attending");
    sfx(e.target.value === "Yes" ? "yes" : "no");
    const coming = e.target.value === "Yes";
    attendingBox.classList.toggle("collapsed", !coming);
    attendingBox.inert = !coming;
    $("#notes-num").textContent = coming ? "5" : "3";
    F.santaSay(coming
      ? "Excellent! I'll tell the elves to make more cookies."
      : "Bah humbug? Fine. I'll eat your share of the cookies.");
  });

  /* ---------- Guests ---------- */
  const guestBox = $("#guests");
  const countEl = $("#guest-count");
  const extraBox = $("#extra-guests");
  const extraSel = $("#extra-count");
  let guestCount = 0;

  extraSel.add(new Option("No, that's everyone", "0"));
  for (let i = 1; i <= maxExtra; i++) extraSel.add(new Option(`${i} more`, String(i)));
  extraSel.addEventListener("change", () => { sfx(extraSel.value === "0" ? "unpop" : "pop"); renderGuestControls(); });

  function extraCount() {
    return extraBox.hidden ? 0 : Number(extraSel.value) || 0;
  }

  function renderGuestControls() {
    const showExtra = guestCount >= namedGuests;
    if (showExtra && extraBox.hidden) extraBox.hidden = false;
    if (!showExtra && !extraBox.hidden) { extraBox.hidden = true; extraSel.value = "0"; }
    const total = guestCount + extraCount();
    countEl.textContent = guestCount;
    $("#guest-minus").disabled = guestCount === 0;
    $("#guest-plus").disabled = guestCount >= namedGuests;
    $("#guest-quip").textContent = GUEST_QUIPS[Math.min(total, GUEST_QUIPS.length - 1)];
  }

  function addGuest() {
    if (guestCount >= namedGuests) return;
    guestCount++;
    sfx("pop");
    const n = guestCount;
    const row = document.createElement("div");
    row.className = "guest";

    const orn = document.createElement("span");
    orn.className = "guest-ornament";
    orn.setAttribute("aria-hidden", "true");
    orn.style.setProperty("--oc", ORNAMENT_COLORS[(n - 1) % ORNAMENT_COLORS.length]);

    const name = document.createElement("input");
    name.type = "text";
    name.className = "guest-name";
    name.maxLength = 80;
    name.placeholder = `Guest ${n}'s full name`;
    name.setAttribute("aria-label", `Guest ${n} full name`);

    row.append(orn, name);

    guestBox.appendChild(row);
    name.focus();
    renderGuestControls();
    clearError("guests");
  }

  function removeGuest() {
    if (guestCount === 0) return;
    guestCount--;
    sfx("unpop");
    const rows = guestBox.querySelectorAll(".guest:not(.leaving)");
    const last = rows[rows.length - 1];
    if (last) {
      last.classList.add("leaving");
      setTimeout(() => last.remove(), 300);
    }
    renderGuestControls();
  }

  $("#guest-plus").addEventListener("click", addGuest);
  $("#guest-minus").addEventListener("click", removeGuest);
  renderGuestControls();

  /* ---------- Validation ---------- */
  function setError(key, msg) {
    const el = form.querySelector(`.error[data-for="${key}"]`);
    if (el) el.textContent = msg;
  }
  function clearError(key) { setError(key, ""); }
  $("#name").addEventListener("input", () => clearError("name"));

  function collect() {
    const fd = new FormData(form);
    const attending = fd.get("attending") || "";
    const coming = attending === "Yes";
    const guests = coming
      ? [...guestBox.querySelectorAll(".guest:not(.leaving)")].map((row) => ({
          name: row.querySelector(".guest-name").value.trim().replace(/\s+/g, " ")
        }))
      : [];
    return {
      name: (fd.get("name") || "").trim().replace(/\s+/g, " "),
      attending,
      shirtSize: coming ? fd.get("shirtSize") || "" : "",
      guests,
      extraGuests: coming ? extraCount() : 0,
      notes: (fd.get("notes") || "").trim(),
      website: fd.get("website") || ""
    };
  }

  function validate(d) {
    let ok = true;
    let first = null;
    const fail = (key, msg, focusEl) => { setError(key, msg); ok = false; first = first || focusEl; };

    ["name", "attending", "shirtSize", "guests"].forEach(clearError);
    if (d.name.length < 2) fail("name", "Santa needs your name. Even he can't guess this one.", $("#name"));
    if (!d.attending) fail("attending", "Pick one: festive or humbug?", form.querySelector('input[name="attending"]'));
    if (d.attending === "Yes") {
      if (!d.shirtSize) fail("shirtSize", "Pick a shirt size. No judgment. (Some judgment.)", form.querySelector('input[name="shirtSize"]'));
      const rows = [...guestBox.querySelectorAll(".guest:not(.leaving)")];
      d.guests.forEach((g, i) => {
        if (g.name.length < 2) fail("guests", `Guest ${i + 1} needs a name. "Plus one" is not a name.`, rows[i].querySelector(".guest-name"));      });
    }
    if (first) first.focus();
    return ok;
  }

  /* ---------- Submit ---------- */
  const btn = $("#submit-btn");
  const status = $("#form-status");

  async function send(d) {
    const body = new URLSearchParams({
      name: d.name,
      attending: d.attending,
      shirtSize: d.shirtSize,
      guestCount: String(d.guests.length + d.extraGuests),
      extraGuests: String(d.extraGuests),
      guests: JSON.stringify(d.guests),
      notes: d.notes,
      website: d.website
    });

    if (!CFG.scriptUrl) {
      console.info("[RSVP demo mode] Nothing saved. Add your Apps Script URL in js/config.js.", Object.fromEntries(body));
      await new Promise((r) => setTimeout(r, 1200));
      return { ok: true, demo: true };
    }

    try {
      const res = await fetch(CFG.scriptUrl, { method: "POST", body });
      return await res.json();
    } catch (err) {
      // Some networks/browsers block reading Google's redirect. The sheet still
      // receives the data, and re-sending the same name just updates that row.
      await fetch(CFG.scriptUrl, { method: "POST", body, mode: "no-cors" });
      return { ok: true, opaque: true };
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    const d = collect();
    if (!validate(d)) {
      sfx("error");
      F.santaSay("Hmm, something's missing. Check the red writing.");
      return;
    }

    btn.classList.add("sending");
    sfx("whoosh");
    btn.disabled = true;
    try {
      const result = await send(d);
      if (!result || !result.ok) throw new Error((result && result.error) || "Unknown error");
      showSuccess(d, result);
    } catch (err) {
      console.error(err);
      sfx("error");
      status.textContent = "The elves dropped your RSVP in the snow. Please try again in a moment.";
      F.santaSay("Uh oh. The North Pole Wi-Fi is acting up. Try again?");
    } finally {
      btn.classList.remove("sending");
      btn.disabled = false;
    }
  });

  /* ---------- Success card ---------- */
  function showSuccess(d, result) {
    const esc = F.escapeHtml;
    const first = d.name.split(" ")[0];
    const coming = d.attending === "Yes";

    $("#success-title").textContent = coming ? "You're on the Nice List!" : "We'll miss you!";
    $("#success-msg").textContent = coming
      ? `See you there, ${first}! Santa's saving you a cookie.${result.updated ? " (We updated your earlier RSVP.)" : ""}`
      : `Santa is sad but understanding, ${first}. If plans change, come back and update your RSVP.`;

    const total = coming ? 1 + d.guests.length + d.extraGuests : 0;
    const sizeLabel = (v) => {
      const s = sizes.find(([val]) => val === v);
      return s ? `${s[0]} (${s[1]})` : v;
    };
    let rows = `
      <div class="stub-head"><span>${coming ? `ADMIT ${total}` : "REGRETS"}</span><span>No. ${String(Math.floor(Math.random() * 9000) + 1000)}</span></div>
      <div class="stub-row"><span>Name</span><span>${esc(d.name)}</span></div>
      <div class="stub-row"><span>Coming?</span><span>${coming ? "Yes!" : "Not this year"}</span></div>`;
    if (coming) {
      rows += `<div class="stub-row"><span>Shirt</span><span>${esc(sizeLabel(d.shirtSize))}</span></div>`;
      const guestLines = d.guests.map((g) => esc(g.name));
      if (d.extraGuests) guestLines.push(`+ ${d.extraGuests} more`);
      rows += `<div class="stub-row"><span>Guests</span><span>${guestLines.length ? guestLines.join("<br>") : "Just me"}</span></div>`;
    }
    if (result.demo) rows += `<div class="stub-row"><span>Note</span><span>Demo mode: not saved</span></div>`;
    $("#ticket-stub").innerHTML = rows;

    form.hidden = true;
    const success = $("#success");
    success.hidden = false;
    success.focus({ preventScroll: true });
    $("#rsvp").scrollIntoView({ behavior: "smooth", block: "start" });

    if (coming) {
      sfx("fanfare");
      setTimeout(() => sfx("ho"), 900);
      F.confetti();
      F.flySleigh();
      F.santaSay(`Ho ho ho! ${first} is officially on my list!`, { wink: true });
    } else {
      sfx("sadTrombone");
      F.santaSay("I'll save you a candy cane anyway.");
    }
    F.refreshHeadcount();
    try { localStorage.setItem("rsvpDone", "1"); } catch (_) { /* only used to tailor the game's reminder */ }
  }

  $("#edit-btn").addEventListener("click", () => {
    $("#success").hidden = true;
    form.hidden = false;
    $("#name").focus();
    F.santaSay("Changed your mind? Happens to the best of us. Even me.");
  });
})();
