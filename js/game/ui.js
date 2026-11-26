/* Kudzu Survivors v2: ui.js (ENG-UI). Injected CSS, DOM screens, canvas HUD, toasts, banners, tips. */
(function (KS) {
  "use strict";

  // ===========================================================================
  // TEXT: every joke / quip / label that is not a plain UI word. Owner reviews this table.
  // ===========================================================================
  var TEXT = {
    tierQuips: [
      "Dispatch says the sky looks fine. Dispatch has been wrong before.",
      "A little frost on the mulcher. Nothing to write home about.",
      "Flurries at the job site. Somebody turn on the radio.",
      "Sleet. The kind that finds the gap in every collar.",
      "Whiteout rolling in. Mind the stumps you cannot see.",
      "Kudzu weather. The vines are growing while you watch.",
      "Ice storm. The chipper is not rated for this. Neither are we.",
      "Polar vortex. Dispatch says to keep moving.",
      "Double shift. The coffee has formed a skin.",
      "Christmas Eve shift. Somebody is missing a stocking.",
      "Yule log jam on the haul road. Everything is festive and stuck.",
      "Blizzard of record. Dispatch has stopped answering.",
      "Hundred-year storm. Again. That is the third one this month.",
      "Overgrowth Watch is posted. That means it is already here.",
      "Overgrowth Warning. Y'all should've left an hour ago.",
      "Total Overgrowth. The map is just green now.",
      "Snowed in. The crew vote is unanimous: keep clearing.",
      "Off the charts. The chart-maker went home."
    ],
    tips: {
      tinsel: "Tinsel buys toolboxes. Stand on one to open it.",
      toolbox: "A toolbox is in view. Stand on it to open it.",
      lowboy: "Get to the trailer once it arrives. Kills near it load the truck.",
      levelup: "Pick a card to improve your machine. Re-bid shuffles the hand.",
      elite: "Outlined foes hit harder and drop more. Worth the trouble.",
      crate: "Supply crates hold a choice. Walk over one to open it."
    },
    credits: [
      ["Site Foreman", "who owns the clipboard and the schedule"],
      ["Chipper Wrangler", "who feeds the machine and hums along"],
      ["Saw Sergeant", "who sharpens before breakfast"],
      ["Burn Boss", "permit in one hand, drip torch in the other"],
      ["Night Shift", "who works best when the sun does not"],
      ["Dispatch", "radio always on, coffee always cold"],
      ["Subcontractor", "who has a guy for that"],
      ["Fuel Truck Driver", "the most welcome sight on any job"],
      ["The Whole Office", "who kept the cocoa coming"]
    ],
    seasonGreet: "Season's Greetings from the whole crew",
    seasonSub: "One whole season of clearing, and the vines are still out there.",
    welcomeKicker: "Moorhead Bros. Land Clearing presents",
    titleLine: "KUDZU SURVIVORS",
    titleScript: "Holiday Overtime",
    blurb: "Clear the overgrowth. Survive the shift. Make it home for the party.",
    storage: "Progress won't be saved in this browser.",
    rsvpNudge: "Don't forget to RSVP for the real party!",
    rsvpLink: "Back to the RSVP",
    levelHead: "Level Up",
    levelSub: "Pick one. The vines will wait. (They won't.)",
    siteCleared: "SITE CLEARED",
    shiftOver: "SHIFT OVER",
    clockedOut: "CLOCKED OUT",
    headHome: "Head Home",
    headHomeAsk: "Head home for good? You keep 50% of the pay.",
    refundAsk: "Refund every rank?",
    resetAsk: "Erase ALL progress on this browser?",
    empty: "Nothing here yet.",
    ranks: ["Rookie", "Hand", "Crew Lead", "Foreman", "Legend"]
  };

  var C_CREAM = "#f4ead5", C_BRICK = "#b3261e", C_HOLLY = "#2f4a32", C_OCHRE = "#c9993b", C_INK = "#2a1f1a";
  var RARITY = { common: "#8a7f6a", uncommon: "#2f4a32", rare: "#2a5d8f", legendary: "#c9993b", kudzu: "#6b7a1e" };
  var QUALITY = { normal: "", polished: "#9aa7ad", gilded: "#c9993b" };
  var LN14 = Math.log(1.4);

  // ===========================================================================
  // CSS (one style element)
  // ===========================================================================
  var CSS = [
    "#ks-ui{position:fixed;inset:0;z-index:5;pointer-events:none;font-family:'Libre Caslon Text',Georgia,serif;color:#2a1f1a;-webkit-tap-highlight-color:transparent;font-size:16px}",
    "#ks-ui *{box-sizing:border-box}",
    ".ks-scr{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;pointer-events:none;padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) 70px max(14px,env(safe-area-inset-left));display:flex;flex-direction:column;align-items:center;overscroll-behavior:contain}",
    ".ks-scr.dim{background:rgba(42,31,26,.6)}.ks-scr.dark{background:rgba(26,18,14,.8)}",
    ".ks-scr>*{margin-top:auto;margin-bottom:auto;flex:none}",
    ".ks-ticket{pointer-events:auto;position:relative;width:min(100%,600px);background-color:#f4ead5;background-image:repeating-radial-gradient(circle at 17% 23%,rgba(42,31,26,.04) 0 1px,transparent 1px 3px),repeating-radial-gradient(circle at 73% 61%,rgba(42,31,26,.03) 0 1px,transparent 1px 4px);border:3px double #2a1f1a;box-shadow:0 0 0 3px #f4ead5,0 0 0 5px #2a1f1a,6px 9px 0 5px rgba(0,0,0,.34);padding:26px 18px 22px}",
    ".ks-ticket.wide{width:min(100%,1060px)}.ks-ticket.mid{width:min(100%,780px)}",
    ".ks-ticket::before,.ks-ticket::after{content:'';position:absolute;left:14px;right:14px;height:6px;background:radial-gradient(circle,rgba(42,31,26,.55) 1.6px,transparent 2.1px) 0 0/12px 6px repeat-x;pointer-events:none}",
    ".ks-ticket::before{top:6px}.ks-ticket::after{bottom:6px}",
    ".ks-orn{position:absolute;color:#b3261e;font-size:13px;line-height:1;pointer-events:none}",
    ".ks-orn.a{left:6px;top:14px}.ks-orn.b{right:6px;top:14px}.ks-orn.c{left:6px;bottom:14px}.ks-orn.d{right:6px;bottom:14px}",
    ".ks-kicker{font:700 .72rem Cinzel,serif;letter-spacing:.22em;text-transform:uppercase;color:#b3261e;text-align:center;margin:0}",
    ".ks-h1{font:900 clamp(2.2rem,9vw,3.6rem)/.92 'Playfair Display',serif;text-align:center;margin:.15em 0 0;color:#2a1f1a;letter-spacing:.01em}",
    ".ks-h2{font:700 1.45rem/1.1 'Playfair Display',serif;margin:0;color:#2a1f1a}",
    ".ks-h3{font:700 1rem/1.15 'Playfair Display',serif;margin:0}",
    ".ks-script{font:400 clamp(2rem,8vw,3rem)/1 'Pinyon Script',cursive;color:#b3261e;text-align:center;margin:.1em 0 0}",
    ".ks-center{text-align:center}.ks-small{font-size:.82rem}.ks-dim{opacity:.7}.ks-ital{font-style:italic}",
    ".ks-rule{border:0;border-top:3px double #2a1f1a;margin:.75rem 0}",
    ".ks-btn{font:700 .92rem Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;color:#2a1f1a;background:#c9993b;border:2px solid #2a1f1a;box-shadow:3px 3px 0 #2a1f1a;padding:.65rem 1rem;min-height:48px;cursor:pointer;pointer-events:auto;touch-action:manipulation;transition:transform .06s,box-shadow .06s;position:relative;overflow:hidden;line-height:1.1}",
    ".ks-btn:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #2a1f1a}",
    ".ks-btn.primary{background:#b3261e;color:#f4ead5}.ks-btn.holly{background:#2f4a32;color:#f4ead5}.ks-btn.ghost{background:transparent}",
    ".ks-btn.big{font-size:1.15rem;min-height:60px}.ks-btn.sm{min-height:48px;padding:.4rem .7rem;font-size:.78rem}",
    ".ks-btn[disabled]{opacity:.45;cursor:default;box-shadow:2px 2px 0 #2a1f1a}",
    ".ks-btn:focus-visible,.ks-tile:focus-visible,.ks-card:focus-visible,.ks-chipbtn:focus-visible,#ks-rsvp:focus-visible,.ks-link:focus-visible{outline:4px solid #2f4a32;outline-offset:2px}",
    ".ks-btn .fill{position:absolute;left:0;top:0;bottom:0;width:0;background:rgba(42,31,26,.35);pointer-events:none}",
    ".ks-btn .fill.go{width:100%;transition:width .5s linear}",
    ".ks-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.ks-row.c{justify-content:center}.ks-row.sb{justify-content:space-between}",
    ".ks-col{display:flex;flex-direction:column;gap:10px}",
    ".ks-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}",
    ".ks-grid.s{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}.ks-grid.t{grid-template-columns:repeat(auto-fill,minmax(112px,1fr))}",
    "@media (min-width:720px){.ks-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}}",
    ".ks-tile{position:relative;border:2px solid #2a1f1a;background:rgba(255,255,255,.34);padding:.6rem .7rem;min-height:64px;cursor:pointer;text-align:left;font:inherit;color:inherit;pointer-events:auto;touch-action:manipulation;display:block;width:100%}",
    ".ks-tile.sel{outline:4px solid #2f4a32;outline-offset:1px;background:rgba(201,153,59,.22)}.ks-tile.lock{filter:grayscale(.65);opacity:.78}",
    ".ks-tile .nm{font:700 1rem 'Playfair Display',serif}.ks-tile .sub{font-size:.8rem;opacity:.85;margin-top:.15rem}",
    ".ks-ico{font-size:1.6rem;line-height:1;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif}",
    ".ks-stamp{display:inline-block;font:700 .78rem Cinzel,serif;letter-spacing:.16em;text-transform:uppercase;color:#b3261e;border:2px double #b3261e;padding:.12rem .45rem;transform:rotate(-4deg);background:rgba(244,234,213,.75)}",
    ".ks-stamp.big{font-size:clamp(1.5rem,7vw,2.6rem);border-width:4px;padding:.15rem .8rem;animation:ksStamp .35s cubic-bezier(.2,1.6,.4,1) both}.ks-stamp.green{color:#2f4a32;border-color:#2f4a32}.ks-stamp.ink{color:#2a1f1a;border-color:#2a1f1a}",
    ".ks-tile>.ks-stamp{position:absolute;right:6px;top:6px}",
    "@keyframes ksStamp{from{transform:rotate(-4deg) scale(1.9);opacity:0}to{transform:rotate(-4deg) scale(1);opacity:1}}",
    "@keyframes ksIn{from{transform:translateY(-14px);opacity:0}to{transform:none;opacity:1}}@keyframes ksOut{to{opacity:0;transform:translateY(-8px)}}",
    "@keyframes ksFade{from{opacity:0}to{opacity:1}}@keyframes ksRise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}",
    ".ks-pips{display:inline-flex;gap:3px;vertical-align:middle}.ks-pip{width:10px;height:10px;border-radius:50%;border:2px solid #2a1f1a;background:transparent}.ks-pip.on{background:#b3261e}.ks-pip.gold{background:#c9993b}",
    ".ks-bar{height:14px;border:2px solid #2a1f1a;background:rgba(42,31,26,.12);position:relative;overflow:hidden}.ks-bar>i{display:block;height:100%;background:#2f4a32}.ks-bar.brick>i{background:#b3261e}.ks-bar.ochre>i{background:#c9993b}",
    ".ks-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:.6rem 0}.ks-tabs .ks-btn{box-shadow:2px 2px 0 #2a1f1a;min-height:44px}.ks-tabs .ks-btn.on{background:#2f4a32;color:#f4ead5}",
    ".ks-chip{display:inline-block;font:700 .62rem Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;border:1px solid #2a1f1a;padding:.08rem .35rem;margin:0 .25rem .2rem 0;background:rgba(255,255,255,.4)}",
    ".ks-stat{display:flex;justify-content:space-between;gap:10px;border-bottom:1px dotted rgba(42,31,26,.45);padding:.2rem 0;font-size:.9rem}.ks-stat b{font-family:Cinzel,serif}",
    ".ks-cork{background:#b98d5b;background-image:repeating-radial-gradient(circle at 30% 40%,rgba(60,35,10,.18) 0 1px,transparent 1px 3px);border:6px solid #6b4a2a;padding:12px}",
    ".ks-pin{background:#f4ead5;border:1px dashed #2a1f1a;padding:.5rem .6rem;position:relative;box-shadow:2px 3px 0 rgba(0,0,0,.3)}.ks-pin.done{background:#e3efd0}.ks-pin.hid{opacity:.7}",
    ".ks-pin::before{content:'';position:absolute;top:-5px;left:50%;width:10px;height:10px;border-radius:50%;background:#b3261e;border:2px solid #2a1f1a}",
    ".ks-mute{font:700 .8rem Cinzel,serif}",
    ".ks-input{font:inherit;font-size:1rem;padding:.55rem .6rem;border:2px solid #2a1f1a;background:#fffaf0;min-height:48px;width:100%;pointer-events:auto}",
    "input[type=range].ks-range{width:100%;min-height:48px;accent-color:#b3261e;pointer-events:auto}",
    ".ks-seg{display:flex;flex-wrap:wrap;gap:6px}.ks-seg .ks-btn{box-shadow:2px 2px 0 #2a1f1a;padding:.4rem .7rem;font-size:.75rem;background:#e7d9b6}.ks-seg .ks-btn.on{background:#2f4a32;color:#f4ead5}",
    ".ks-banner-sto{background:#2a1f1a;color:#f4ead5;font:700 .8rem Cinzel,serif;letter-spacing:.06em;text-align:center;padding:.35rem .6rem;margin-bottom:.6rem}",
    ".ks-rsvpbox{border:2px dashed #b3261e;padding:.6rem .8rem;text-align:center;background:rgba(179,38,30,.07)}",
    ".ks-link{color:#b3261e;font-weight:700;text-decoration:underline;pointer-events:auto}",
    ".ks-rsvp{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:6;font:700 .78rem Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;color:#f4ead5;background:#2a1f1a;border:2px solid #c9993b;padding:.7rem .9rem;text-decoration:none;min-height:44px;display:flex;align-items:center;pointer-events:auto}",
    "body.ks-hide-rsvp .ks-rsvp{display:none}",
    ".ks-card{position:relative;border:3px solid #2a1f1a;background:#f9f1de;padding:.7rem .75rem;cursor:pointer;pointer-events:auto;text-align:left;font:inherit;color:inherit;display:flex;flex-direction:column;gap:.3rem;touch-action:manipulation;flex:1 1 200px;min-width:0;box-shadow:4px 5px 0 rgba(0,0,0,.35)}",
    ".ks-card.sel{outline:5px solid #2f4a32;outline-offset:1px;transform:translateY(-3px)}",
    ".ks-card.polished{border-color:#9aa7ad;box-shadow:0 0 0 2px #2a1f1a,4px 5px 0 rgba(0,0,0,.35)}.ks-card.gilded{border-color:#c9993b;box-shadow:0 0 0 2px #2a1f1a,0 0 14px 2px rgba(201,153,59,.8),4px 5px 0 rgba(0,0,0,.35);background:#fbf0cf}",
    ".ks-card .top{display:flex;gap:.6rem;align-items:center}.ks-card .nm{font:700 1.1rem/1.1 'Playfair Display',serif}.ks-card .lv{font:700 .72rem Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;color:#b3261e}",
    ".ks-card .ds{font-size:.82rem;font-style:italic;line-height:1.3}.ks-card .dl{font-size:.82rem;display:flex;justify-content:space-between;gap:.5rem;border-bottom:1px dotted rgba(42,31,26,.4)}",
    ".ks-card .evo{font-size:.76rem;color:#2f4a32;font-weight:700}.ks-card .key{position:absolute;right:6px;bottom:4px;font:700 .7rem Cinzel,serif;opacity:.55}",
    ".ks-cards{display:flex;flex-wrap:wrap;gap:12px}.ks-guard .ks-card,.ks-guard .ks-btn.act{opacity:.55}",
    "@media (orientation:portrait),(max-width:719px){.ks-cards{flex-direction:column}.ks-card{flex:none;flex-direction:row;flex-wrap:wrap;align-items:center}.ks-card .top{flex:1 1 100%}.ks-card .ds{flex:1 1 100%}}",
    ".ks-actions{position:sticky;bottom:0;margin-top:auto;padding:10px 0 2px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;pointer-events:none}.ks-actions .ks-btn{min-height:56px;pointer-events:auto}",
    ".ks-ctr{position:absolute;right:6px;top:4px;font:700 .7rem Cinzel,serif}",
    ".ks-slot{display:flex;gap:.5rem;align-items:center;border:2px solid #2a1f1a;padding:.3rem .45rem;background:rgba(255,255,255,.3);min-height:48px}.ks-slot.empty{opacity:.4;border-style:dashed}.ks-slot .grow{flex:1;min-width:0}",
    ".ks-itemcell{border:2px solid #2a1f1a;padding:.25rem .15rem;text-align:center;background:rgba(255,255,255,.35);font-size:.7rem;line-height:1.15}.ks-itemcell .ks-ico{font-size:1.4rem;display:block}",
    "#ks-toasts{position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:8;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none;width:min(92vw,420px)}",
    ".ks-toast{background:#f4ead5;border:2px solid #2a1f1a;box-shadow:3px 3px 0 rgba(0,0,0,.4);padding:.4rem .8rem;font:700 .8rem Cinzel,serif;letter-spacing:.06em;text-align:center;animation:ksIn .25s both;max-width:100%}",
    ".ks-toast.out{animation:ksOut .3s both}.ks-toast.achievement{background:#c9993b}.ks-toast.warn{background:#b3261e;color:#f4ead5}",
    "#ks-banner{position:fixed;left:0;right:0;top:26%;z-index:8;display:flex;justify-content:center;pointer-events:none}",
    ".ks-ban{background:#f4ead5;border-top:4px double #2a1f1a;border-bottom:4px double #2a1f1a;padding:.5rem 2rem;text-align:center;max-width:94vw;box-shadow:0 6px 0 rgba(0,0,0,.3);animation:ksRise .3s both}.ks-ban.out{animation:ksOut .4s both}",
    ".ks-ban b{display:block;font:900 clamp(1.4rem,6vw,2.4rem)/1 'Playfair Display',serif;color:#b3261e}.ks-ban span{font:italic .95rem 'Libre Caslon Text',serif}",
    "body.ks-rm .ks-ban,body.ks-rm .ks-ban.out,body.ks-rm .ks-toast,body.ks-rm .ks-toast.out{animation:ksFade .3s both}",
    "body.ks-rm *{animation-duration:.01s !important;transition:none !important}",
    "#ks-tip{position:fixed;left:50%;transform:translateX(-50%);z-index:7;pointer-events:none;background:#f4ead5;border:2px dashed #2a1f1a;padding:.45rem .9rem;font:italic .85rem 'Libre Caslon Text',serif;max-width:min(92vw,420px);text-align:center;box-shadow:3px 3px 0 rgba(0,0,0,.35);animation:ksIn .3s both}",
    "#ks-tip b{font:700 .62rem Cinzel,serif;letter-spacing:.16em;color:#b3261e;display:block;text-transform:uppercase}",
    "#ks-touch{position:fixed;inset:0;z-index:6;pointer-events:none}",
    ".ks-tb{position:absolute;pointer-events:auto;border:3px solid #2a1f1a;background:#f4ead5;color:#2a1f1a;font:700 .6rem Cinzel,serif;letter-spacing:.06em;text-transform:uppercase;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;box-shadow:3px 3px 0 rgba(0,0,0,.4);padding:0;cursor:pointer;-webkit-user-select:none;user-select:none}",
    ".ks-tb.round{border-radius:50%}.ks-tb .ks-ico{font-size:1.5rem}",
    "#ks-pause{left:max(8px,env(safe-area-inset-left));top:max(8px,env(safe-area-inset-top));width:44px;height:44px;font-size:1.1rem}",
    "#ks-abil{width:76px;height:76px;right:max(24px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));overflow:hidden}body.ks-left #ks-abil{right:auto;left:max(24px,env(safe-area-inset-left))}",
    "#ks-abil .sweep{position:absolute;inset:0;border-radius:50%;pointer-events:none}",
    "#ks-confirm{left:50%;transform:translateX(-50%);bottom:30%;min-height:52px;padding:.5rem 1.1rem;background:#b3261e;color:#f4ead5;flex-direction:row;gap:.5rem;font-size:.8rem;animation:ksRise .2s both;max-width:90vw}",
    "#ks-truck{left:max(8px,env(safe-area-inset-left));min-height:44px;padding:.3rem .7rem;font-size:.72rem;flex-direction:row}",
    ".ks-hidden{display:none !important}"
  ].join("\n");

  // ===========================================================================
  // State
  // ===========================================================================
  var doc = (typeof document !== "undefined") ? document : null;
  var root = null, toastBox = null, banBox = null, tipBox = null, touch = null;
  var bPause = null, bAbil = null, bConfirm = null, bTruck = null, abilSweep = null, abilIco = null, abilTxt = null, confTxt = null;
  var cur = null, curData = null, scrEl = null, backFn = null, guardUntil = 0, padFrameDone = -1;
  var animRaf = 0, animFn = null, holdTimer = 0, holdBtnFill = null, holdKey = "";
  var muteBtns = [], muteHooked = false, inited = false;
  var bossRef = null, bossUid = 0;
  var stageKills0 = 0, stageItems = 0, stageT0 = 0;
  var recent = {};
  var NO_RSVP = { levelup: 1, crate: 1, stageclear: 1, season: 1, pause: 1 };

  function nowMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }
  function S() { try { return KS.meta.settings || {}; } catch (e) { return {}; } }
  function profile() { try { return KS.meta.profile || {}; } catch (e) { return {}; } }
  function D(kind) { return (KS.defs && KS.defs[kind]) || {}; }
  function keys(o) { var a = [], k; for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) a.push(k); return a; }
  function fmt(n) { try { return KS.util.fmt(n); } catch (e) { return String(Math.floor(n || 0)); } }
  function fmtTime(s) { try { return KS.util.fmtTime(s); } catch (e) { return String(Math.floor(s || 0)); } }
  function sfx(n, a) { try { KS.sfx(n, a); } catch (e) { /* ignore */ } }
  function isPhone() { return !!(KS.device && (KS.device.tier === "phone")) || Math.min(window.innerWidth, window.innerHeight) < 560; }

  // ===========================================================================
  // DOM helpers (menus are not hot; innerHTML is never used with data)
  // ===========================================================================
  function h(tag, cls, txt, attrs) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function guarded() { return nowMs() < guardUntil; }
  function btn(label, cls, fn) {
    var b = h("button", "ks-btn " + (cls || ""), label, { type: "button" });
    b.addEventListener("click", function (ev) { if (guarded()) return; sfx("uiClick"); fn(ev, b); });
    return b;
  }
  function ticket(cls) {
    var t = h("div", "ks-ticket " + (cls || ""));
    add(t, h("span", "ks-orn a", "✦"), h("span", "ks-orn b", "✦"), h("span", "ks-orn c", "✦"), h("span", "ks-orn d", "✦"));
    return t;
  }
  function rule() { return h("hr", "ks-rule"); }
  function pips(n, max, cls) {
    var p = h("span", "ks-pips");
    for (var i = 0; i < max; i++) p.appendChild(h("i", "ks-pip" + (i < n ? " on" : "") + (cls ? " " + cls : "")));
    return p;
  }
  function bar(frac, cls) {
    var b = h("div", "ks-bar " + (cls || "")), i = h("i");
    i.style.width = Math.max(0, Math.min(1, frac || 0)) * 100 + "%";
    return add(b, i);
  }
  function stat(label, val) { var r = h("div", "ks-stat"); return add(r, h("span", "", label), h("b", "", String(val))); }
  function stampEl(text, cls) { return h("span", "ks-stamp " + (cls || ""), text); }
  function iconSpan(icon) { return h("span", "ks-ico", icon || "✦"); }
  function nameOf(kind, id) { var d = D(kind)[id]; return d ? (d.name || id) : id; }
  function weaponOf(id) { return D("weapons")[id] || null; }
  function rsvpLink(cls) { var a = h("a", cls || "ks-link", TEXT.rsvpLink, { href: "index.html#rsvp" }); a.textContent = "← " + TEXT.rsvpLink; return a; }
  function canvasEl(w, h2) { var c = h("canvas"); c.width = w; c.height = h2; c.style.width = (w / 2) + "px"; c.style.height = (h2 / 2) + "px"; return c; }

  // mute control (hidden when window.Sound is missing)
  function muteBtn() {
    var S2 = window.Sound;
    if (!S2 || typeof S2.toggle !== "function") return null;
    var b = h("button", "ks-btn sm ks-mute ghost", "", { type: "button" });
    function lab() { b.textContent = S2.muted ? "🔇 Sound off" : "🔊 Sound on"; }
    lab(); b._lab = lab;
    b.addEventListener("click", function () { try { S2.toggle(); } catch (e) { /* ignore */ } lab(); });
    muteBtns.push(b);
    if (!muteHooked) {
      muteHooked = true;
      try { if (typeof S2.onChange === "function") S2.onChange(function () { for (var i = 0; i < muteBtns.length; i++) if (muteBtns[i].isConnected) muteBtns[i]._lab(); }); } catch (e2) { /* ignore */ }
    }
    return b;
  }

  // ===========================================================================
  // Navigation: keyboard, gamepad, focus
  // ===========================================================================
  function focusables() {
    if (!scrEl) return [];
    var list = scrEl.querySelectorAll("button:not([disabled]),[data-nav],input,a[href]"), out = [], i, r;
    for (i = 0; i < list.length; i++) { r = list[i].getBoundingClientRect(); if (r.width > 0 && r.height > 0) out.push(list[i]); }
    return out;
  }
  function moveFocus(dx, dy) {
    var list = focusables(), a = doc.activeElement, i;
    if (!list.length) return;
    if (!a || list.indexOf(a) < 0) { list[0].focus(); return; }
    var ra = a.getBoundingClientRect(), ax = ra.left + ra.width / 2, ay = ra.top + ra.height / 2, best = null, bd = 1e9;
    for (i = 0; i < list.length; i++) {
      if (list[i] === a) continue;
      var r = list[i].getBoundingClientRect(), x = r.left + r.width / 2 - ax, y = r.top + r.height / 2 - ay;
      var along = x * dx + y * dy; if (along <= 2) continue;
      var perp = Math.abs(dx ? y : x), d = along + perp * 2.2;
      if (d < bd) { bd = d; best = list[i]; }
    }
    if (best) { best.focus(); try { best.scrollIntoView({ block: "nearest" }); } catch (e) { /* ignore */ } }
  }
  function goBack() { if (backFn) { sfx("uiBack"); backFn(); } }
  function isTyping(t) { return t && (t.tagName === "INPUT" && t.type !== "range" || t.tagName === "TEXTAREA"); }
  function cancelHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = 0; }
    if (holdBtnFill) { holdBtnFill.classList.remove("go"); holdBtnFill = null; }
  }
  function startHold(fillEl, fn) {
    cancelHold();
    if (fillEl) { void fillEl.offsetWidth; fillEl.classList.add("go"); holdBtnFill = fillEl; }
    holdTimer = setTimeout(function () { holdTimer = 0; if (holdBtnFill) { holdBtnFill.classList.remove("go"); holdBtnFill = null; } fn(); }, 500);
  }
  function onKeyDown(ev) {
    if (!cur) return;
    var k = ev.key, t = ev.target;
    if (isTyping(t)) { if (k === "Escape") { t.blur(); ev.preventDefault(); } return; }
    if (k === "Escape") { goBack(); ev.preventDefault(); return; }
    if (k === "ArrowUp" || k === "ArrowDown" || k === "ArrowLeft" || k === "ArrowRight") {
      if (t && t.type === "range" && (k === "ArrowLeft" || k === "ArrowRight")) return;
      moveFocus(k === "ArrowRight" ? 1 : k === "ArrowLeft" ? -1 : 0, k === "ArrowDown" ? 1 : k === "ArrowUp" ? -1 : 0);
      ev.preventDefault(); return;
    }
    if (scrEl && scrEl._keys && !ev.repeat) { if (scrEl._keys(k, true, ev)) ev.preventDefault(); }
  }
  function onKeyUp(ev) { if (cur && scrEl && scrEl._keys && !isTyping(ev.target)) scrEl._keys(ev.key, false, ev); }
  var padHold = 0;
  function padPoll() {
    if (!cur || !KS.pad || !KS.pad.connected) { padHold = 0; return; }
    var jp = KS.pad.justPressed, pr = KS.pad.pressed;
    if (jp.up) moveFocus(0, -1); else if (jp.down) moveFocus(0, 1); else if (jp.left) moveFocus(-1, 0); else if (jp.right) moveFocus(1, 0);
    if (jp.a) { var a = doc.activeElement; if (a && a !== doc.body && scrEl && scrEl.contains(a)) a.click(); else { var f = focusables(); if (f[0]) f[0].focus(); } }
    if (jp.b) goBack();
    if (scrEl && scrEl._pad) scrEl._pad(jp, pr);
  }

  // ===========================================================================
  // Show / hide
  // ===========================================================================
  var SCREENS = {};
  function stopAnim() { if (animRaf) { cancelAnimationFrame(animRaf); animRaf = 0; } animFn = null; }
  function startAnim(fn) {
    stopAnim(); animFn = fn;
    function loop(t) { if (!animFn) return; try { animFn(t / 1000); } catch (e) { animFn = null; return; } animRaf = requestAnimationFrame(loop); }
    animRaf = requestAnimationFrame(loop);
  }
  function ensureRoot() {
    if (root || !doc) return;
    root = doc.getElementById("ks-ui");
    if (!root) { root = h("div"); root.id = "ks-ui"; doc.body.appendChild(root); }
  }
  function syncChrome() {
    if (!doc) return;
    var b = doc.body, inRun = !!KS.run;
    var hide = (inRun && (!cur || NO_RSVP[cur])) || (cur === "test");
    b.classList.toggle("ks-hide-rsvp", hide);
    var s = S();
    b.classList.toggle("ks-rm", !!s.reducedMotion);
    b.classList.toggle("ks-left", !!s.leftHanded);
    syncTouch();
  }
  KS.ui = {};
  KS.ui.show = function (id, data) {
    if (!doc) return;
    ensureRoot();
    cancelHold(); stopAnim();
    var build = SCREENS[id];
    if (!build) { KS.log("ui", "unknown screen " + id); return; }
    var keepScroll = (cur === id && scrEl) ? scrEl.scrollTop : 0;
    clear(root);
    cur = id; curData = data || {}; backFn = null;
    scrEl = h("div", "ks-scr ks-s-" + id);
    root.appendChild(scrEl);
    if (id === "levelup" || id === "crate" || id === "stageclear" || id === "season") { scrEl.classList.add("dim"); guardUntil = nowMs() + 400; scrEl.classList.add("ks-guard"); setTimeout(function () { if (scrEl) scrEl.classList.remove("ks-guard"); }, 410); }
    else if (id === "pause") scrEl.classList.add("dark");
    else guardUntil = 0;
    build(scrEl, curData);
    if (keepScroll) scrEl.scrollTop = keepScroll;
    syncChrome();
  };
  KS.ui.hide = function () {
    cancelHold(); stopAnim();
    if (root) clear(root);
    cur = null; curData = null; scrEl = null; backFn = null;
    syncChrome();
  };
  KS.ui.current = function () { return cur; };
  KS.ui.isOpen = function () { return cur !== null; };

  // ===========================================================================
  // Menu screens
  // ===========================================================================
  function go(id, data) { KS.ui.show(id, data); }
  function header(scrEl2, title, kicker, backTo) {
    var t = ticket("wide");
    var top = h("div", "ks-row sb");
    var left = h("div");
    add(left, h("p", "ks-kicker", kicker || "").cloneNode(true));
    left.firstChild.style.textAlign = "left";
    add(left, h("h2", "ks-h2", title));
    add(top, left);
    var pr = profile(), cnt = h("div", "ks-small ks-center");
    add(cnt, h("div", "", "Peppermint Pay: " + fmt(pr.pay || 0)), h("div", "", "Golden Bows: " + fmt(pr.bows || 0)));
    add(top, cnt);
    add(t, top, rule());
    scrEl2.appendChild(t);
    backFn = function () { if (backTo) backTo(); else go("title"); };
    return t;
  }
  function footerRow(t, backLabel) {
    var r = h("div", "ks-row c"); r.style.marginTop = "14px";
    add(r, btn(backLabel || "Back", "ghost", function () { goBack(); }));
    t.appendChild(r); return r;
  }
  function selectable(tile, fn) { tile.setAttribute("data-nav", "1"); tile.addEventListener("click", function (ev) { if (guarded()) return; fn(ev); }); tile.setAttribute("tabindex", "0"); tile.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); fn(ev); } }); }

  SCREENS.title = function (scr) {
    var P = profile(), t = ticket(), meta = KS.meta;
    if (!meta.storageOk && !meta.sandboxed) add(t, h("div", "ks-banner-sto", TEXT.storage));
    add(t, h("p", "ks-kicker", TEXT.welcomeKicker), h("h1", "ks-h1", TEXT.titleLine), h("p", "ks-script", TEXT.titleScript), rule());
    var cnt = h("div", "ks-row c ks-small");
    add(cnt, h("span", "ks-chip", "Peppermint Pay " + fmt(P.pay || 0)), h("span", "ks-chip", "Golden Bows " + fmt(P.bows || 0)));
    add(t, cnt, h("p", "ks-center ks-ital ks-small", TEXT.blurb));
    var col = h("div", "ks-col"); col.style.marginTop = "6px";
    add(col, btn("Clock In", "primary big", function () { go("operators"); }));
    var dl = null; try { dl = meta.daily(); } catch (e) { dl = null; }
    if (dl) {
      add(col, btn(dl.attempted ? "Daily Ticket (best " + fmt(dl.best || 0) + ")" : "Daily Ticket (double pay)", "holly", function () {
        KS.startRun(Object.assign({ daily: true }, dl));
      }));
    }
    var g = h("div", "ks-grid s");
    add(g, btn("Locker", "", function () { go("locker"); }), btn("Parts Counter", "", function () { go("shop"); }), btn("Office", "", function () { go("office"); }), btn("Settings", "", function () { go("settings", { back: { id: "title" } }); }));
    add(col, g);
    var mb = muteBtn(); var foot = h("div", "ks-row sb"); add(foot, rsvpLink(), mb);
    add(t, col, rule(), foot, h("div", "ks-small ks-dim ks-center", "v" + (KS.VERSION || "2.0")));
    scr.appendChild(t);
  };

  // ---- operators -------------------------------------------------------------
  function paintPortrait(c, id, locked, size) {
    var g = c.getContext("2d"), lo = profile().loadout || {};
    g.clearRect(0, 0, c.width, c.height);
    try { KS.meta.drawPortrait(g, id, lo, size); } catch (e) { g.fillStyle = (D("operators")[id] && D("operators")[id].color) || "#888"; g.beginPath(); g.arc(size / 2, size / 2, size * 0.45, 0, 6.3); g.fill(); }
    if (locked) { g.globalCompositeOperation = "source-in"; g.fillStyle = "#2a1f1a"; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "source-over"; }
  }
  SCREENS.operators = function (scr) {
    var ops = keys(D("operators")), lo = profile().loadout || {}, sel = lo.operator, meta = KS.meta;
    if (!ops.length) ops = ["foreman"];
    function unl(id) { try { return meta.isUnlocked("operator", id); } catch (e) { return true; } }
    if (ops.indexOf(sel) < 0 || !unl(sel)) sel = ops[0];
    var t = header(scr, "Pick Your Operator", "Crew roster");
    var grid = h("div", "ks-grid"), tiles = {};
    function proceed() { meta.equip("operator", sel); go("maps", { operatorId: sel }); }
    ops.forEach(function (id) {
      var od = D("operators")[id] || { name: id }, locked = !unl(id), tile = h("div", "ks-tile" + (locked ? " lock" : "")), row = h("div", "ks-row");
      var c = canvasEl(128, 128); paintPortrait(c, id, locked, 128);
      var info = h("div"); info.style.flex = "1"; info.style.minWidth = "0";
      add(info, h("div", "nm", locked && od.secret ? "???" : od.name), h("div", "sub ks-ital", locked ? "" : od.title || ""));
      if (!locked) {
        var wd = weaponOf(od.weapon), ab = D("abilities")[od.ability];
        add(info, h("div", "sub", "Starts with: " + (wd ? (wd.icon || "") + " " + wd.name : od.weapon)), h("div", "sub", od.trait || ""));
        if (ab) add(info, h("div", "sub", "Shift: " + (ab.icon || "") + " " + ab.name + (ab.desc ? " – " + ab.desc : "")));
        var rk = 0; try { rk = meta.rank(id); } catch (e) { rk = 0; }
        add(info, h("div", "sub", (TEXT.ranks[Math.max(0, rk - 1)] || "New hire") + " "), pips(rk, 5, "gold"));
      } else { add(info, h("div", "sub", od.hint || "Locked")); tile.appendChild(stampEl("Locked", "ink")); }
      add(row, c, info); tile.appendChild(row);
      selectable(tile, function () {
        if (locked) { sfx("denied"); sel = id; refresh(); return; }
        if (sel === id) { sfx("cardPick"); proceed(); return; }
        sfx("uiClick"); sel = id; refresh();
      });
      tiles[id] = tile; grid.appendChild(tile);
    });
    function refresh() { for (var k in tiles) tiles[k].classList.toggle("sel", k === sel); go_btn.disabled = !unl(sel); }
    var go_btn = btn("Pick a Map", "primary", proceed);
    add(t, grid);
    var r = footerRow(t, "Back"); r.insertBefore(go_btn, r.firstChild);
    refresh();
  };

  // ---- maps ------------------------------------------------------------------
  function drawMapSwatch(c, def, t) {
    var g = c.getContext("2d"), w = c.width, hh = c.height;
    g.save(); g.fillStyle = (def.palette && def.palette.ground) || "#6a8a5a"; g.fillRect(0, 0, w, hh);
    try { if (def.drawPreview) def.drawPreview(g, w, hh, t || 0); } catch (e) { /* palette swatch only */ }
    g.restore();
    g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(0, hh - 6, w, 6);
  }
  function mapHint(def) {
    var u = def.unlock; if (!u) return "";
    if (u.reachStage) return "Reach stage " + u.reachStage + " on any map";
    if (u.objective) { var m = D("maps"), k; for (k in m) if (m[k].objective && m[k].objective.id === u.objective) return "Complete: " + m[k].objective.name; return "Complete a Signature Objective"; }
    return "Locked";
  }
  SCREENS.maps = function (scr, data) {
    var meta = KS.meta, lo = profile().loadout || {}, opId = data.operatorId || lo.operator || "foreman";
    var ids = keys(D("maps")).sort(function (a, b) { return (D("maps")[a].order || 0) - (D("maps")[b].order || 0); });
    if (!ids.length) ids = ["backforty"];
    function unl(id) { try { return meta.isUnlocked("map", id); } catch (e) { return true; } }
    var sel = lo.map; if (ids.indexOf(sel) < 0 || !unl(sel)) sel = ids[0];
    var ot = Math.min(10, Math.max(0, lo.overtime | 0));
    var t = header(scr, "Pick a Job Site", "Operator: " + nameOf("operators", opId), function () { go("operators"); });
    var grid = h("div", "ks-grid"), tiles = {};
    function start() {
      meta.equip("map", sel); meta.equip("overtime", ot);
      KS.startRun({ operator: opId, map: sel, overtime: ot });
    }
    ids.forEach(function (id) {
      var def = D("maps")[id] || { name: "The Back Forty", subtitle: "A plain, honest lot" }, locked = !unl(id), tile = h("div", "ks-tile" + (locked ? " lock" : ""));
      var c = canvasEl(192, 112); c.style.width = "96px"; c.style.height = "56px"; drawMapSwatch(c, def, 3);
      var row = h("div", "ks-row"), info = h("div"); info.style.flex = "1"; info.style.minWidth = "0";
      add(info, h("div", "nm", def.name), h("div", "sub ks-ital", def.subtitle || ""));
      if (locked) { add(info, h("div", "sub", mapHint(def))); tile.appendChild(stampEl("Locked", "ink")); }
      else {
        if (def.objective) add(info, h("div", "sub", "Objective: " + def.objective.name));
        var bs = D("bosses")[def.boss]; if (bs) add(info, h("div", "sub", "Boss: " + bs.name));
      }
      add(row, c, info); tile.appendChild(row);
      selectable(tile, function () {
        if (locked) { sfx("denied"); sel = id; refresh(); return; }
        if (sel === id) { sfx("cardPick"); start(); return; }
        sfx("uiClick"); sel = id; refresh();
      });
      tiles[id] = tile; grid.appendChild(tile);
    });
    add(t, grid);
    var dialOn = false; try { dialOn = (profile().unlocked.flag || []).indexOf("overtimeDial") >= 0; } catch (e) { dialOn = false; }
    if (dialOn) {
      var dial = h("div", "ks-row c"), lab = h("b", "ks-h3", ""), minus = btn("−", "sm", function () { ot = Math.max(0, ot - 1); upd(); }), plus = btn("+", "sm", function () { ot = Math.min(10, ot + 1); upd(); });
      function upd() { lab.textContent = "Overtime Hours: " + ot; sub.textContent = ot ? "+" + ot * 10 + "% foe strength, +" + ot * 8 + "% pay, richer crates" : "Standard shift"; }
      var sub = h("div", "ks-small ks-dim"); dial.style.marginTop = "12px";
      add(dial, minus, lab, plus); add(t, dial, h("div", "ks-center")); t.lastChild.appendChild(sub); upd();
    }
    var go_btn = btn("Start Shift", "primary big", start);
    function refresh() { for (var k in tiles) tiles[k].classList.toggle("sel", k === sel); go_btn.disabled = !unl(sel); }
    var r = footerRow(t, "Back"); r.insertBefore(go_btn, r.firstChild); refresh();
  };

  // ---- locker ----------------------------------------------------------------
  var FAKE = { x: 0, y: 0, vx: 0, vy: 0, r: 16, rot: 0, faceX: 1, faceY: 0, aimX: 1, aimY: 0, moving: false, hurtFlash: 0, trailT: 0, iframes: 0, cosmetics: null, hp: 1, maxHp: 1, alive: true, barrier: 0 };
  function drawFake(g, cos, t, scale, cx, cy, rot) {
    FAKE.cosmetics = cos; FAKE.rot = rot || 0; FAKE.faceX = Math.cos(rot || 0); FAKE.faceY = Math.sin(rot || 0);
    g.save(); g.translate(cx, cy); g.scale(scale, scale);
    try { KS.meta.drawMachine(g, FAKE, t); } catch (e) { g.fillStyle = "#b3261e"; g.beginPath(); g.arc(0, 0, 14, 0, 6.3); g.fill(); }
    g.restore();
  }
  SCREENS.locker = function (scr) {
    var meta = KS.meta, tab = "paint", t = header(scr, "The Locker", "Paint, hats and nameplates");
    var wrap = h("div", "ks-two"), left = h("div", "ks-center"), right = h("div");
    var pv = canvasEl(320, 320); pv.style.width = "160px"; pv.style.height = "160px";
    add(left, pv); add(wrap, left, right); add(t, wrap);
    var g = pv.getContext("2d");
    startAnim(function (tt) { g.clearRect(0, 0, 320, 320); drawFake(g, profile().loadout || {}, tt, 6, 160, 160, tt * 0.8); });
    var body = h("div");
    function render() {
      clear(right);
      var tabs = h("div", "ks-tabs");
      [["paint", "Paint"], ["hat", "Hats"], ["trail", "Trails"], ["name", "Nameplate"]].forEach(function (p) {
        var b = btn(p[1], "sm" + (tab === p[0] ? " on" : ""), function () { tab = p[0]; render(); }); tabs.appendChild(b);
      });
      add(right, tabs, body); clear(body);
      var lo = profile().loadout || {};
      if (tab === "name") {
        var inp = h("input", "ks-input", null, { type: "text", maxlength: "12", "aria-label": "Nameplate" }); inp.value = lo.name || "";
        function commit() { inp.value = meta.setName(inp.value); }
        inp.addEventListener("change", commit); inp.addEventListener("blur", commit);
        var show = btn(lo.showName ? "Nameplate: shown" : "Nameplate: hidden", "sm", function () { meta.equip("showName", !lo.showName); render(); });
        add(body, h("p", "ks-small", "Letters, numbers and spaces, up to 12."), inp, h("div", "", ""), show, h("h3", "ks-h3", "Frames"));
        body.lastChild.style.margin = "10px 0 6px";
        body.appendChild(cosGrid("frame"));
      } else body.appendChild(cosGrid(tab));
    }
    function cosGrid(kind) {
      var defs = D("cosmetics")[kind] || {}, lo = profile().loadout || {}, gr = h("div", "ks-grid t");
      keys(defs).forEach(function (id) {
        var d = defs[id], st = "owned"; try { st = meta.cosmeticState(kind, id); } catch (e) { st = "owned"; }
        var tile = h("div", "ks-tile" + (st === "locked" ? " lock" : "") + (lo[kind] === id ? " sel" : "")); tile.style.minHeight = "96px"; tile.style.textAlign = "center";
        if (kind === "paint" || kind === "hat") {
          var c = canvasEl(112, 112); c.style.width = "56px"; c.style.height = "56px"; var cg = c.getContext("2d");
          var co = Object.assign({}, lo); co[kind] = id; drawFake(cg, co, 0, 2.2, 56, 56, -0.5); tile.appendChild(c);
        } else tile.appendChild(iconSpan(kind === "trail" ? "✨" : "▣"));
        add(tile, h("div", "nm ks-small", d.name || id));
        var sub = st === "owned" ? (lo[kind] === id ? "Equipped" : "Tap to equip") : st === "available" ? "Buy: " + (d.unlock && d.unlock.bows) + " bows" : (d.hint || "Locked");
        add(tile, h("div", "sub", sub));
        selectable(tile, function () {
          if (st === "locked") { sfx("denied"); return; }
          if (meta.equip(kind, id)) { sfx("cardPick"); render(); } else sfx("denied");
        });
        gr.appendChild(tile);
      });
      return gr;
    }
    render(); footerRow(t, "Back");
  };

  // ---- shop ------------------------------------------------------------------
  SCREENS.shop = function (scr) {
    var meta = KS.meta, t = header(scr, "Parts Counter", "Spend your Peppermint Pay"), box = h("div"), armed = false, armT = 0;
    function render() {
      clear(box); var pr = profile(), defs = D("shop"), gr = h("div", "ks-grid");
      keys(defs).forEach(function (id) {
        var d = defs[id], rank = (pr.shop && pr.shop[id]) || 0, max = d.max || 5, tile = h("div", "ks-tile"); tile.style.cursor = "default";
        var cost = rank < max ? d.costs[rank] : 0, can = rank < max && (pr.pay || 0) >= cost;
        var desc = ""; try { desc = d.desc(Math.min(max, rank + 1)); } catch (e) { desc = ""; }
        add(tile, h("div", "nm", d.name), h("div", "sub", desc), pips(rank, max));
        var b = btn(rank >= max ? "Maxed" : "Buy: " + fmt(cost), "sm" + (can ? "" : " ghost"), function () { if (meta.buy(id)) { sfx("tinsel"); render(); hdrRefresh(); } else sfx("denied"); });
        b.disabled = rank >= max; b.style.marginTop = "6px"; tile.appendChild(b); gr.appendChild(tile);
      });
      box.appendChild(gr);
    }
    function hdrRefresh() { var c = t.querySelector(".ks-small"); if (c) { clear(c); add(c, h("div", "", "Peppermint Pay: " + fmt(profile().pay || 0)), h("div", "", "Golden Bows: " + fmt(profile().bows || 0))); } }
    render(); t.appendChild(box);
    var r = footerRow(t, "Back"), rf = btn("Refund All", "ghost", function () {
      if (!armed) { armed = true; rf.textContent = TEXT.refundAsk + " Tap again"; clearTimeout(armT); armT = setTimeout(function () { armed = false; rf.textContent = "Refund All"; }, 3500); return; }
      armed = false; rf.textContent = "Refund All"; meta.refundAll(); render(); hdrRefresh();
    });
    r.appendChild(rf);
  };

  // ---- office ----------------------------------------------------------------
  function sil(color) { var s = h("span", "ks-ico", "●"); s.style.color = "#2a1f1a"; s.style.opacity = ".75"; if (color) s.style.textShadow = "0 0 0 " + color; return s; }
  SCREENS.office = function (scr, data) {
    var tab = (data && data.tab) || "orders", t = header(scr, "The Office", "Cork board, field guide and files"), body = h("div");
    var tabs = h("div", "ks-tabs"), names = [["orders", "Work Orders"], ["guide", "Field Guide"], ["blueprints", "Blueprint Book"], ["log", "Logbook"], ["stats", "Stats"]];
    function render() {
      clear(tabs); names.forEach(function (n) { tabs.appendChild(btn(n[1], "sm" + (tab === n[0] ? " on" : ""), function () { tab = n[0]; render(); })); });
      clear(body); var P = profile();
      if (tab === "orders") {
        var list = []; try { list = KS.meta.board(); } catch (e) { list = []; }
        var done = 0; list.forEach(function (a) { if (a.done) done++; });
        add(body, h("p", "ks-small", done + " of " + list.length + " Work Orders complete. Each one pays a Golden Bow."));
        var cork = h("div", "ks-cork"), gr = h("div", "ks-grid s"); cork.appendChild(gr);
        list.forEach(function (a) {
          var p = h("div", "ks-pin" + (a.done ? " done" : "") + (a.hidden && !a.done ? " hid" : ""));
          add(p, h("div", "ks-h3", a.title), h("div", "ks-small", a.desc));
          if (a.done) p.appendChild(stampEl("Done", "green")); else if (a.progress > 0) p.appendChild(bar(a.progress, "ochre"));
          gr.appendChild(p);
        });
        body.appendChild(cork);
      } else if (tab === "guide") {
        var cx = P.codex || { enemies: {}, affixes: {}, bosses: {} }, hidden = 0;
        [["enemies", "Foes", cx.enemies, false], ["affixes", "Elite Marks", cx.affixes, true], ["bosses", "Bosses", cx.bosses, false]].forEach(function (sec) {
          var defs = D(sec[0]), gr = h("div", "ks-grid"), shown = 0;
          keys(defs).forEach(function (id) {
            var d = defs[id], e = sec[2][id]; if (id.charAt(0) === "_" || d.noKill && !d.codex) return;
            if (!e || !e[0]) { hidden++; return; }
            var kills = e[1] || 0, full = sec[0] === "bosses" ? kills >= 1 : kills >= 10, tile = h("div", "ks-tile"); tile.style.cursor = "default"; shown++;
            var row = h("div", "ks-row"), info = h("div"); info.style.flex = "1";
            var sw = full ? iconSpan(d.glyph || d.icon || "●") : sil(); if (full && d.color) sw.style.color = d.color;
            add(info, h("div", "nm", full ? d.name : "???"), h("div", "sub", "Cleared: " + fmt(kills)));
            if (full && d.codex) { add(info, h("div", "sub", d.codex.notes || ""), h("div", "sub ks-ital", d.codex.joke || "")); if (kills >= 100) { add(info, h("div", "sub", "Tip: " + (d.codex.tip || ""))); tile.appendChild(stampEl("+5% dmg", "green")); } }
            add(row, sw, info); tile.appendChild(row); gr.appendChild(tile);
          });
          if (shown) add(body, h("h3", "ks-h3", sec[1]), gr);
        });
        add(body, h("p", "ks-small ks-dim", hidden ? hidden + " entries not yet sighted. Clear 10 of a foe for the full page, 100 for a lasting bonus." : TEXT.empty));
      } else if (tab === "blueprints") {
        var gr2 = h("div", "ks-grid"), W = D("weapons");
        keys(W).forEach(function (id) {
          var d = W[id]; if (!d.evolved && !d.fusion) return;
          var found = !!(P.blueprints && P.blueprints[id]), tile = h("div", "ks-tile" + (found ? "" : " lock")); tile.style.cursor = "default";
          var base = d.fusion ? (d.recipe && W[d.recipe.weapons[0]]) : W[d.from], other = null;
          if (d.fusion) other = d.recipe && W[d.recipe.weapons[1]]; else if (base && base.partner) other = D("gear")[base.partner];
          var line = (base ? (base.icon || "") + " " + base.name : "?");
          if (found) { line += " + " + (other ? (other.icon || "") + " " + other.name : "?"); add(tile, h("div", "nm", (d.icon || "") + " " + d.name), h("div", "sub", line + " → " + d.name), h("div", "sub ks-ital", d.fusion ? "Fusion" : "Evolution")); }
          else add(tile, h("div", "nm", "??? Blueprint"), h("div", "sub", "Starts from: " + line));
          gr2.appendChild(tile);
        });
        body.appendChild(gr2);
      } else if (tab === "log") {
        var gr3 = h("div", "ks-grid t"), I = D("items"), lg = P.logbook || {}, n = 0;
        keys(I).forEach(function (id) {
          var d = I[id], c = lg[id] || 0, tile = h("div", "ks-tile" + (c ? "" : " lock")); tile.style.cursor = "default"; tile.style.textAlign = "center"; tile.style.minHeight = "92px";
          if (c) { n++; tile.style.borderColor = RARITY[d.rarity] || C_INK; add(tile, iconSpan(d.icon), h("div", "nm ks-small", d.name), h("div", "sub", "Found x" + fmt(c))); }
          else add(tile, sil(), h("div", "nm ks-small", "???"));
          gr3.appendChild(tile);
        });
        add(body, h("p", "ks-small", n + " of " + keys(I).length + " items logged."), gr3);
      } else {
        var s = P.stats || {}, st = body;
        var fav = "-", best = 0, k2; for (k2 in (s.opsPlayed || {})) if (s.opsPlayed[k2] > best) { best = s.opsPlayed[k2]; fav = nameOf("operators", k2); }
        var rows = [["Shifts worked", s.runs], ["Total time", fmtTime(s.time || 0)], ["Foes cleared", fmt(s.kills || 0)], ["Times knocked out", s.deaths], ["Best shift", fmtTime(s.bestTime || 0)], ["Best stage", s.bestStage], ["Best season", s.bestSeason],
          ["Best forecast", (KS.TIER_NAMES && KS.TIER_NAMES[s.bestTier | 0]) || "-"], ["Items found", fmt(s.itemsFound || 0)], ["Crates opened", fmt(s.cratesOpened || 0)], ["Tinsel spent", fmt(s.tinselSpent || 0)], ["Pay earned", fmt(s.payEarned || 0)],
          ["Biggest hit", fmt(s.biggestHit || 0)], ["Favourite operator", fav]];
        rows.forEach(function (r) { st.appendChild(stat(r[0], r[1] == null ? 0 : r[1])); });
        var bk = s.bossKills || {}; keys(bk).forEach(function (id) { st.appendChild(stat("Boss: " + nameOf("bosses", id), bk[id])); });
      }
    }
    add(t, tabs, body); render(); footerRow(t, "Back");
  };

  // ---- settings --------------------------------------------------------------
  SCREENS.settings = function (scr, data) {
    var meta = KS.meta, back = (data && data.back) || { id: "title" };
    var t = ticket("mid"); backFn = function () { go(back.id, back.data); };
    add(t, h("p", "ks-kicker", "Foreman's preferences"), h("h2", "ks-h2 ks-center", "Settings"), rule());
    function row(label, ctl) { var r = h("div", "ks-col"); r.style.marginBottom = "12px"; add(r, h("div", "ks-h3", label), ctl); t.appendChild(r); }
    function slider(key) { var i = h("input", "ks-range", null, { type: "range", min: "0", max: "1", step: "0.05", "aria-label": key }); i.value = S()[key]; i.addEventListener("input", function () { meta.setSetting(key, parseFloat(i.value)); }); i.addEventListener("change", function () { if (key === "sfx") sfx("uiClick"); }); return i; }
    function seg(key, opts) {
      var s = h("div", "ks-seg"), bs = [];
      opts.forEach(function (o) { var b = btn(o[1], "", function () { meta.setSetting(key, o[0]); paint(); }); b._v = o[0]; bs.push(b); s.appendChild(b); });
      function paint() { var v = S()[key]; bs.forEach(function (b) { b.classList.toggle("on", b._v === v); }); }
      paint(); return s;
    }
    var mb = muteBtn(); if (mb) row("Sound", mb);
    row("Music volume", slider("music")); row("Effects volume", slider("sfx"));
    var onoff = [[true, "On"], [false, "Off"]];
    row("Screen shake", seg("shake", onoff)); row("Reduced motion", seg("reducedMotion", onoff));
    row("Damage numbers", seg("dmgNumbers", [["auto", "Auto"], ["on", "On"], ["off", "Off"]]));
    row("Colour-blind telegraphs", seg("cbTelegraphs", onoff));
    row("Auto-aim", seg("autoAim", [["auto", "Auto"], ["on", "On"], ["off", "Off"]]));
    row("Left-handed controls", seg("leftHanded", onoff));
    row("Quality", seg("quality", [["auto", "Auto"], ["low", "Low"], ["medium", "Medium"], ["high", "High"]]));
    row("FPS counter", seg("showFps", onoff));
    var armed = false, armT = 0;
    var rs = btn("Reset Profile", "primary", function () {
      if (!armed) { armed = true; rs.textContent = TEXT.resetAsk + " Tap again"; clearTimeout(armT); armT = setTimeout(function () { armed = false; rs.textContent = "Reset Profile"; }, 4000); return; }
      armed = false; resetProfile(); rs.textContent = "Profile erased";
    });
    row("Danger zone", rs);
    var r = footerRow(t, "Back"); void r;
    scr.appendChild(t);
    scr._keys = null;
  };
  function resetProfile() {
    var meta = KS.meta;
    if (meta.sandboxed) { KS.ui.toast("Sandbox profile: nothing erased", "info"); return; }
    try {
      if (typeof meta.reset === "function") meta.reset();
      else if (meta.store) { meta.store.set("ksv2.profile", "{}"); meta.store.set("ksv2.settings", "{}"); meta.load(); }
      KS.ui.toast("Profile erased", "warn");
    } catch (e) { KS.ui.toast("Could not erase the profile", "warn"); }
  }

  // ===========================================================================
  // In-run screens: pause (Build Sheet), levelup, crate, stageclear, season, results, test
  // ===========================================================================
  var STAT_ROWS = [["maxHp", "Max HP", 0], ["regen", "Regen per sec", 1], ["armor", "Armor", 0], ["dr", "Damage reduction", 2], ["speed", "Speed", 0], ["magnet", "Pickup reach", 0], ["might", "Might", 2], ["area", "Area", 2],
    ["duration", "Duration", 2], ["cooldown", "Cooldown", 2], ["amount", "Extra projectiles", 0], ["pierce", "Pierce", 0], ["crit", "Crit chance", 2], ["critMult", "Crit damage", 3], ["luck", "Luck", 1], ["xpMul", "XP gain", 2],
    ["tinselMul", "Tinsel gain", 2], ["statusMul", "Status power", 2], ["priceMul", "Prices", 2], ["cards", "Card choices", 0], ["revives", "Revives", 0]];
  function statStr(v, mode) {
    if (v == null || v !== v) return "-";
    if (mode === 2) return Math.round(v * 100) + "%";
    if (mode === 3) return "x" + (Math.round(v * 100) / 100);
    if (mode === 1) return String(Math.round(v * 10) / 10);
    return String(Math.round(v));
  }
  function sampleRun() {
    if (KS.run) return KS.run;
    var W = D("weapons"), G = D("gear"), I = D("items"), wi = keys(W).filter(function (k) { return !W[k].evolved && !W[k].fusion; }), gi = keys(G), ii = keys(I), r = { operatorId: "foreman", stageIndex: 0, time: 125, stageTime: 125, level: 4, weapons: [null, null, null, null, null, null], gear: [null, null, null, null, null, null], items: {}, itemOrder: [], itemCounters: {}, crew: {}, stats: { maxHp: 100, speed: 150, might: 1, crit: 0.05, critMult: 2, cards: 3 }, kills: 40 };
    wi.slice(0, 2).forEach(function (id, i) { r.weapons[i] = { slot: i, id: id, def: W[id], level: 3 + i, evolved: false, dmgDealt: 1234, kills: 12 }; });
    gi.slice(0, 2).forEach(function (id, i) { r.gear[i] = { slot: i, id: id, def: G[id], level: 2 }; });
    ii.slice(0, 3).forEach(function (id) { r.items[id] = 2; r.itemOrder.push(id); });
    return r;
  }
  function slotBox(icon, name, sub, level, max, extra) {
    var s = h("div", "ks-slot"), g = h("div", "grow");
    add(g, h("div", "ks-h3", name)); if (sub) add(g, h("div", "ks-small", sub));
    add(s, iconSpan(icon), g);
    if (extra) s.appendChild(extra); else if (level) s.appendChild(pips(level, max, "gold"));
    return s;
  }
  SCREENS.pause = function (scr, data) {
    var run = data.run || sampleRun(), t = ticket("wide"); backFn = function () { KS.resume(); };
    var top = h("div", "ks-row sb"), l = h("div");
    var od = D("operators")[run.operatorId], tm = run.time || 0;
    add(l, h("p", "ks-kicker", "Build Sheet").cloneNode(true)); l.firstChild.style.textAlign = "left";
    add(l, h("h2", "ks-h2", "Paused: " + (od ? od.name : "Operator")), h("div", "ks-small", "Site " + ((run.stageIndex | 0) + 1) + " · " + fmtTime(tm) + " on the clock"));
    var bt = h("div", "ks-row"); add(bt, muteBtn());
    add(top, l, bt); add(t, top, rule());
    var cols = h("div", "ks-two"), a = h("div", "ks-col"), b = h("div", "ks-col");
    // weapons
    add(a, h("h3", "ks-h3", "Machines"));
    for (var i = 0; i < 6; i++) {
      var w = run.weapons && run.weapons[i];
      if (!w) { a.appendChild(h("div", "ks-slot empty", "Empty slot")); continue; }
      var d = w.def || weaponOf(w.id) || { name: w.id }, sub = "", extra = null;
      if (w.evolved) extra = stampEl("Overhauled", "green");
      else if (w.fused) extra = stampEl("Fused", "green");
      else if (d.partner) {
        var gd = D("gear")[d.partner], have = false;
        for (var j = 0; j < 6; j++) if (run.gear && run.gear[j] && run.gear[j].id === d.partner) have = true;
        sub = "Overhaul: Lv 8 + " + (gd ? gd.name : d.partner) + (have ? " ✔" : " (missing)") + (w.level >= 8 ? "" : "");
      }
      if (w.dmgDealt) sub += (sub ? " · " : "") + fmt(w.dmgDealt) + " dmg, " + fmt(w.kills || 0) + " kills";
      a.appendChild(slotBox(d.icon, d.name, sub, w.level, d.evolved || d.fusion ? 1 : 8, extra));
    }
    add(a, h("h3", "ks-h3", "Gear"));
    for (var k = 0; k < 6; k++) {
      var g = run.gear && run.gear[k];
      if (!g) { a.appendChild(h("div", "ks-slot empty", "Empty slot")); continue; }
      var gdef = g.def || D("gear")[g.id] || { name: g.id };
      a.appendChild(slotBox(gdef.icon, gdef.name, "", g.level, gdef.maxLevel || 5));
    }
    // items, crew, stats
    add(b, h("h3", "ks-h3", "Truck Bed"));
    var ig = h("div", "ks-grid t"), order = run.itemOrder || [];
    if (!order.length) ig.appendChild(h("div", "ks-small ks-dim", TEXT.empty));
    for (var m = 0; m < order.length; m++) {
      var id = order[m], idf = D("items")[id] || { name: id }, n = (run.items && run.items[id]) || 0; if (!n) continue;
      var cell = h("div", "ks-itemcell"); cell.style.borderColor = RARITY[idf.rarity] || C_INK;
      add(cell, iconSpan(idf.icon), h("b", "", idf.name + " x" + (n >= 99 ? "99+" : n)));
      var ctr = run.itemCounters && run.itemCounters[id]; if (ctr) cell.appendChild(h("div", "", fmt(ctr) + " " + (idf.counterLabel || "")));
      ig.appendChild(cell);
    }
    b.appendChild(ig);
    var crew = keys(run.crew || {}).filter(function (x) { return run.crew[x]; });
    if (crew.length) { add(b, h("h3", "ks-h3", "Crew Bonuses")); crew.forEach(function (id) { var cd = D("crewBonuses")[id]; add(b, h("div", "ks-small", "★ " + (cd ? cd.name + ": " + cd.desc : id))); }); }
    add(b, h("h3", "ks-h3", "Current Stats"));
    var sb = h("div"), S2 = run.stats || {};
    STAT_ROWS.forEach(function (r) { if (S2[r[0]] != null) sb.appendChild(stat(r[1], statStr(S2[r[0]], r[2]))); });
    b.appendChild(sb);
    add(cols, a, b); add(t, cols, rule());
    var act = h("div", "ks-row c"), armed = false, armT = 0, hh = null;
    add(act, btn("Resume", "primary big", function () { KS.resume(); }));
    add(act, btn("Settings", "", function () { go("settings", { back: { id: "pause", data: data } }); }));
    hh = btn(TEXT.headHome, "ghost", function () {
      if (!armed) { armed = true; hh.textContent = TEXT.headHomeAsk + " Tap again"; clearTimeout(armT); armT = setTimeout(function () { armed = false; hh.textContent = TEXT.headHome; }, 4000); return; }
      KS.endRun("quit");
    });
    act.appendChild(hh);
    var rv = h("div", "ks-center"); rv.style.marginTop = "12px"; rv.appendChild(rsvpLink());
    add(t, act, rv); scr.appendChild(t);
  };

  // ---- level-up --------------------------------------------------------------
  function evoLine(c) {
    var e = c.evoHint; if (!e) return null;
    return h("div", "evo", "Overhauls with " + (e.partnerIcon || "") + " " + nameOf("gear", e.partnerId) + (e.owned ? " ✔" : ""));
  }
  SCREENS.levelup = function (scr, data) {
    var o = data.offer || { cards: [] }, act = data.onAction || function () {}, sel = -1, done = false, cards = o.cards || [], els = [];
    var t = ticket("wide"), run = KS.run;
    add(t, h("p", "ks-kicker", "Promotion"), h("h2", "ks-h2 ks-center", TEXT.levelHead + (run ? " · Lv " + run.level : "")), h("p", "ks-center ks-small ks-ital", TEXT.levelSub));
    var box = h("div", "ks-cards"); t.appendChild(box); box.style.marginTop = "10px";
    function send(a) { if (done || guarded()) return; sfx(a.type === "reroll" ? "reroll" : a.type === "banish" ? "banish" : "cardPick"); if (a.type === "pick" || a.type === "skip") done = true; act(a); }
    function pick(i) { send({ type: "pick", index: i }); }
    function cur2() { var a = doc.activeElement, i = a && a.getAttribute ? parseInt(a.getAttribute("data-i"), 10) : NaN; return sel >= 0 ? sel : (i === i ? i : -1); }
    function setSel(i) { sel = i; els.forEach(function (e, j) { e.classList.toggle("sel", j === i); }); }
    cards.forEach(function (c, i) {
      var q = QUALITY[c.quality] != null ? c.quality : "normal", b = h("button", "ks-card " + q, null, { type: "button", "data-i": String(i) });
      var top = h("div", "top"), nm = h("div"); nm.style.flex = "1";
      add(nm, h("div", "nm", c.name), h("div", "lv", (c.kind === "weapon" ? "Machine" : c.kind === "gear" ? "Gear" : "Odd Job") + (c.isNew ? "" : " · Lv " + c.fromLevel + " → " + c.toLevel)));
      add(top, iconSpan(c.icon), nm); if (c.isNew) top.appendChild(stampEl("New")); else if (q !== "normal") top.appendChild(stampEl(q, q === "gilded" ? "" : "ink"));
      b.appendChild(top);
      if (c.desc) b.appendChild(h("div", "ds", c.desc));
      (c.deltas || []).forEach(function (d) { var r = h("div", "dl"); add(r, h("span", "", d[0]), h("b", "", d[1] + " → " + d[2])); b.appendChild(r); });
      if (c.tags && c.tags.length) { var tg = h("div"); c.tags.forEach(function (x) { tg.appendChild(h("span", "ks-chip", x)); }); b.appendChild(tg); }
      var ev = evoLine(c); if (ev) b.appendChild(ev);
      if (o.heldId && c.cardId === o.heldId) b.appendChild(h("span", "ks-chip", "On hold"));
      b.appendChild(h("span", "key", String(i + 1)));
      b.addEventListener("click", function (e) { if (guarded()) return; if (e.detail === 0 || sel === i) pick(i); else { sfx("uiClick"); setSel(i); } });
      els.push(b); box.appendChild(b);
    });
    var bar2 = h("div", "ks-actions"), cl = o.rerolls | 0, bn = o.banishes | 0;
    function plain(label, cls, fn, dis) { var b = btn(label, "act " + cls, fn); b.disabled = !!dis; return b; }
    function needSel() { var i = cur2(); if (i < 0 || !cards[i]) { KS.ui.toast("Tap a card first", "info"); return -1; } return i; }
    function doBanish() { var i = needSel(); if (i >= 0) send({ type: "banish", index: i }); }
    function doHold() { var i = needSel(); if (i >= 0) send({ type: "hold", index: i }); }
    function doReroll() { if (cl > 0) send({ type: "reroll" }); else sfx("denied"); }
    var rr = plain("Re-bid (" + cl + ")", "", doReroll, cl <= 0);
    bar2.appendChild(rr);
    var bnb = null;
    if (o.showBanishHold) {
      bnb = h("button", "ks-btn act ghost", "Red Tag (" + bn + ")", { type: "button" });
      var fill = h("span", "fill"); bnb.appendChild(fill); bnb.disabled = bn <= 0;
      bnb.addEventListener("pointerdown", function (e) { if (guarded() || bnb.disabled) return; e.preventDefault(); startHold(fill, doBanish); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(function (n) { bnb.addEventListener(n, cancelHold); });
      bnb.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      bnb.addEventListener("click", function (e) { if (e.detail === 0) { KS.ui.toast("Hold B to Red Tag a card", "info"); } });
      bar2.appendChild(bnb);
      if (o.canHold) bar2.appendChild(plain("Hold Order", "ghost", doHold, false));
    }
    bar2.appendChild(plain("Skip", "ghost", function () { send({ type: "skip" }); }, false));
    t.appendChild(bar2); scr.appendChild(t);
    scr._keys = function (k, down) {
      var lk = k.toLowerCase();
      if (down && lk >= "1" && lk <= "5" && cards[parseInt(lk, 10) - 1]) { if (!guarded()) pick(parseInt(lk, 10) - 1); return true; }
      if (down && lk === "r") { if (!guarded()) doReroll(); return true; }
      if (down && lk === "h" && o.canHold && o.showBanishHold) { if (!guarded()) doHold(); return true; }
      if (down && lk === "k") { if (!guarded()) send({ type: "skip" }); return true; }
      if (lk === "b" && o.showBanishHold && bn > 0) { if (down) { if (!guarded()) startHold(bnb && bnb.firstChild.nextSibling, doBanish); } else cancelHold(); return true; }
      return false;
    };
    scr._pad = function (jp, pr) {
      if (guarded()) return;
      if (jp.x) doReroll(); else if (jp.rb) send({ type: "skip" }); else if (jp.lb && o.canHold) doHold();
      if (pr.y && o.showBanishHold && bn > 0) { padHold++; if (padHold === 30) doBanish(); } else padHold = 0;
    };
    var first = els[0]; if (first && KS.pad && KS.pad.connected) first.focus();
  };

  // ---- crate -----------------------------------------------------------------
  SCREENS.crate = function (scr, data) {
    var t = ticket("mid"), mode = data.mode || "choose", pick = data.onPick || function () {}, done = false, sel = -1, els = [];
    function send(i) { if (done || guarded()) return; done = true; sfx("cardPick"); pick(i); }
    add(t, h("p", "ks-kicker", mode === "evolve" ? "Workshop miracle" : "Supply drop"));
    if (mode === "evolve") {
      var st = h("div", "ks-center"); st.appendChild(stampEl("OVERHAULED!", "big")); add(t, st, rule());
      (data.evolutions || []).forEach(function (e) {
        var a = weaponOf(e.from) || { name: e.from, icon: "" }, b = weaponOf(e.to) || { name: e.to, icon: "" }, r = h("div", "ks-row c");
        add(r, iconSpan(a.icon), h("b", "ks-h3", a.name), h("span", "ks-h2", "→"), iconSpan(b.icon), h("b", "ks-h3", b.name)); r.style.marginBottom = "10px"; t.appendChild(r);
        if (b.desc) t.appendChild(h("div", "ks-center ks-small ks-ital", b.desc));
      });
      if (data.note) t.appendChild(h("p", "ks-center ks-small", data.note));
      var rr = h("div", "ks-row c"); rr.appendChild(btn("Sign Off", "primary big", function () { send(0); })); t.appendChild(rr);
    } else {
      add(t, h("h2", "ks-h2 ks-center", data.title || "Supply Crate"));
      if (data.note) t.appendChild(h("p", "ks-center ks-small ks-ital", data.note));
      var box = h("div", "ks-cards"); box.style.margin = "10px 0";
      (data.choices || []).forEach(function (c, i) {
        var b = h("button", "ks-card", null, { type: "button", "data-i": String(i) }); b.style.borderColor = RARITY[c.rarity] || C_INK;
        var top = h("div", "top"), nm = h("div"); nm.style.flex = "1";
        add(nm, h("div", "nm", c.name), h("div", "lv", c.rarity || "")); nm.lastChild.style.color = RARITY[c.rarity] || C_INK;
        add(top, iconSpan(c.icon), nm); b.appendChild(top);
        if (c.desc) b.appendChild(h("div", "ds", c.desc));
        b.appendChild(h("span", "key", String(i + 1)));
        b.addEventListener("click", function (e) { if (guarded()) return; if (mode === "takeLeave" || e.detail === 0 || sel === i) send(i); else { sfx("uiClick"); sel = i; els.forEach(function (x, j) { x.classList.toggle("sel", j === i); }); } });
        els.push(b); box.appendChild(b);
      });
      t.appendChild(box);
      var r2 = h("div", "ks-row c");
      if (mode === "takeLeave" && !(data.choices && data.choices.length)) r2.appendChild(btn("Take It", "primary", function () { send(0); }));
      r2.appendChild(btn(mode === "takeLeave" ? "Leave It" : "Walk Away", "ghost", function () { send(-1); }));
      t.appendChild(r2);
    }
    scr.appendChild(t);
    scr._keys = function (k, down) { var n = parseInt(k, 10); if (down && n >= 1 && els[n - 1]) { send(n - 1); return true; } return false; };
    if (els[0] && KS.pad && KS.pad.connected) els[0].focus();
  };

  // ---- stage clear / season / results / test ---------------------------------
  function condRow(ids) {
    var out = h("div", "ks-col");
    (ids || []).forEach(function (id) { var c = D("conditions")[id]; if (c) out.appendChild(h("div", "ks-small", (c.icon || "❄") + " " + c.name + (c.desc ? ": " + c.desc : ""))); });
    return out;
  }
  SCREENS.stageclear = function (scr, data) {
    var run = data.run || sampleRun(), t = ticket("mid"), nx = data.next || {}, done = false;
    var st = h("div", "ks-center"); st.appendChild(stampEl(TEXT.siteCleared, "big"));
    add(t, h("p", "ks-kicker", "Stage " + ((run.stageIndex | 0) + 1)), st, rule());
    var obj = run.objective;
    add(t, stat("Time on site", fmtTime(run.stageTime || 0)), stat("Foes cleared", fmt(Math.max(0, (run.kills || 0) - stageKills0))), stat("Items gained", stageItems), stat("Objective", obj && obj.complete ? "✔ " + (obj.label || "Done") : "Not done"), stat("Level", run.level || 1));
    add(t, h("h3", "ks-h3", "Next site: " + (nx.name || "Unknown")));
    t.lastChild.style.marginTop = "12px"; t.appendChild(condRow(nx.condition));
    var r = h("div", "ks-row c"); r.style.marginTop = "14px";
    add(r, btn("Next Site", "primary big", function () { if (done) return; done = true; (data.onNext || function () {})(); }));
    add(r, btn("Clock Out" + (data.bank != null ? " (+" + fmt(data.bank) + " pay)" : ""), "", function () { if (done) return; done = true; (data.onClockOut || function () {})(); }));
    add(t, r); scr.appendChild(t);
  };
  SCREENS.season = function (scr, data) {
    var t = ticket("mid"), done = false;
    add(t, h("p", "ks-kicker", "Season " + ((data.season | 0) + 1) + " complete"), h("div", "ks-script", TEXT.seasonGreet), h("p", "ks-center ks-small ks-ital", TEXT.seasonSub), rule());
    TEXT.credits.forEach(function (c) { var r = h("div", "ks-center"); add(r, h("div", "ks-h3", c[0]), h("div", "ks-small ks-ital", c[1])); r.style.marginBottom = "8px"; t.appendChild(r); });
    var r2 = h("div", "ks-row c"); r2.appendChild(btn("Keep Clearing", "primary big", function () { if (done) return; done = true; (data.onContinue || function () {})(); }));
    add(t, rule(), r2); scr.appendChild(t);
  };
  var PAGE_KIND = { enemy: "Field Guide", affix: "Field Guide", boss: "Field Guide", blueprint: "Blueprint Book", item: "Logbook" };
  function pageName(p) { var d = D("enemies")[p.id] || D("affixes")[p.id] || D("bosses")[p.id] || D("weapons")[p.id] || D("items")[p.id]; return d ? d.name : p.id; }
  SCREENS.results = function (scr, data) {
    var sm = data.summary || {}, rw = data.reward || {}, t = ticket("mid");
    var dead = sm.reason === "dead", st = h("div", "ks-center"); st.appendChild(stampEl(dead ? TEXT.shiftOver : TEXT.clockedOut, dead ? "big" : "big green"));
    add(t, h("p", "ks-kicker", nameOf("operators", sm.operatorId) + " at " + nameOf("maps", sm.mapId)), st, rule());
    add(t, stat("Time", fmtTime(sm.time || 0)), stat("Stage reached", (sm.stagesCleared | 0) + 1), stat("Season", (sm.season | 0) + 1), stat("Foes cleared", fmt(sm.kills || 0)), stat("Level", sm.level || 1), stat("Forecast", (KS.TIER_NAMES && KS.TIER_NAMES[sm.maxTier | 0]) || "-"));
    var ws = (sm.weapons || []).slice().sort(function (a, b) { return (b.dmgDealt || 0) - (a.dmgDealt || 0); }), mx = ws.length ? (ws[0].dmgDealt || 1) : 1;
    if (ws.length) {
      add(t, h("h3", "ks-h3", "Damage by machine")); t.lastChild.style.marginTop = "12px";
      ws.forEach(function (w) { var d = weaponOf(w.id) || { name: w.id, icon: "" }, r = h("div"); add(r, h("div", "ks-small", (d.icon || "") + " " + d.name + " – " + fmt(w.dmgDealt || 0)), bar((w.dmgDealt || 0) / mx, "brick")); r.style.marginBottom = "4px"; t.appendChild(r); });
    }
    var kt = keys(sm.killsByType || {}).sort(function (a, b) { return sm.killsByType[b] - sm.killsByType[a]; }).slice(0, 5);
    if (kt.length) { add(t, h("h3", "ks-h3", "Most cleared")); t.lastChild.style.marginTop = "12px"; kt.forEach(function (id) { t.appendChild(stat(nameOf("enemies", id), fmt(sm.killsByType[id]))); }); }
    add(t, rule(), h("h3", "ks-h3", "Peppermint Pay earned: " + fmt(rw.payEarned || 0)));
    var fac = sm.reason === "dead" ? "Knocked out: 70% of the run's pay kept" : sm.reason === "quit" ? "Headed home early: 50% kept" : "Clocked out: 100% kept, plus 10% per site cleared";
    add(t, h("div", "ks-small ks-ital", fac + (sm.daily ? ". Daily Ticket bonus applies on the first try." : "")));
    if (rw.bowsEarned) t.appendChild(h("div", "ks-small", "Golden Bows earned: " + rw.bowsEarned));
    (rw.newPages || []).forEach(function (p) { t.appendChild(h("div", "ks-small", "NEW PAGE: " + (PAGE_KIND[p.kind] || "Field Guide") + " – " + pageName(p))); });
    (rw.newAchievements || []).forEach(function (a) { t.appendChild(h("div", "ks-small", "★ WORK ORDER COMPLETE: " + (typeof a === "string" ? (D("achievements")[a] || { title: a }).title : (a.title || a.id)))); });
    if ((rw.newUnlocks || []).length) {
      add(t, h("h3", "ks-h3", "New in the pool")); t.lastChild.style.marginTop = "10px";
      rw.newUnlocks.forEach(function (u) { var r = h("div", "ks-small"); r.appendChild(stampEl("New", "green")); r.appendChild(doc.createTextNode(" " + (u.name || u.id) + " (" + u.kind + ")")); r.style.marginBottom = "4px"; t.appendChild(r); });
    }
    if ((rw.nearest || []).length) {
      add(t, h("h3", "ks-h3", "Closest Work Orders")); t.lastChild.style.marginTop = "10px";
      rw.nearest.forEach(function (n) { var r = h("div"); add(r, h("div", "ks-small", n.title), bar(n.progress, "ochre")); r.style.marginBottom = "4px"; t.appendChild(r); });
    }
    if (!data.rsvpDone) { var nb = h("div", "ks-rsvpbox"); add(nb, h("div", "ks-h3", TEXT.rsvpNudge), rsvpLink()); nb.style.marginTop = "14px"; t.appendChild(nb); }
    var r2 = h("div", "ks-row c"); r2.style.marginTop = "14px";
    add(r2, btn("Clock In Again", "primary", function () { (data.onAgain || function () { go("operators"); })(); }), btn("Title", "", function () { (data.onTitle || function () { KS.toMenu(); })(); }));
    add(t, r2); scr.appendChild(t);
  };
  SCREENS.test = function (scr, data) {
    var pre = h("pre", "", (data && data.text) || ""); pre.style.cssText = "pointer-events:auto;background:#1a120e;color:#d7e8c0;font:12px monospace;padding:10px;max-width:96vw;white-space:pre-wrap;margin:0";
    scr.appendChild(pre); scr.classList.add("dark");
  };

  // ===========================================================================
  // Toasts, banners, Safety Briefing tips
  // ===========================================================================
  function dedupe(key, ms) { var t = nowMs(); if (recent[key] && t - recent[key] < ms) return true; recent[key] = t; return false; }
  KS.ui.toast = function (text, kind) {
    if (!doc || !toastBox || !text || dedupe("t:" + text, 1500)) return;
    var k = kind || "info", e = h("div", "ks-toast" + (k.indexOf("item:") === 0 ? "" : " " + k), text);
    if (k.indexOf("item:") === 0) { e.style.borderColor = RARITY[k.slice(5)] || C_INK; e.style.borderWidth = "3px"; }
    toastBox.appendChild(e);
    while (toastBox.childNodes.length > 4) toastBox.removeChild(toastBox.firstChild);
    setTimeout(function () { e.classList.add("out"); }, 2200);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 2550);
  };
  KS.ui.banner = function (title, sub, seconds) {
    if (!doc || !banBox || !title || dedupe("b:" + title, 2000)) return;
    clear(banBox);
    var e = h("div", "ks-ban"); add(e, h("b", "", title)); if (sub) e.appendChild(h("span", "", sub));
    banBox.appendChild(e);
    var ms = (seconds || 2.5) * 1000;
    setTimeout(function () { e.classList.add("out"); }, ms - 400);
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e); }, ms);
  };
  var tipQ = [], tipBusy = false;
  function tipNext() {
    if (tipBusy || !tipQ.length || !tipBox) return;
    var t = tipQ.shift(); tipBusy = true; clear(tipBox); add(tipBox, h("b", "", "Safety Briefing"), doc.createTextNode(t));
    tipBox.classList.remove("ks-hidden");
    setTimeout(function () { tipBox.classList.add("ks-hidden"); tipBusy = false; tipNext(); }, 4000);
  }
  KS.ui.tip = function (id, text) {
    try { if (KS.meta.tipSeen(id)) return; KS.meta.markTip(id); } catch (e) { return; }
    var s = text || TEXT.tips[id]; if (!s) return;
    tipQ.push(s); tipNext();
  };
  KS.ui.bossBar = function (e) { bossRef = e || null; bossUid = e ? e.uid : 0; };

  // ===========================================================================
  // Touch buttons (DOM): pause, ability, confirm, truck bed
  // ===========================================================================
  function tb(id, cls, html) { var b = h("button", "ks-tb " + cls, null, { type: "button", id: id }); if (html) b.appendChild(html); return b; }
  function buildTouch() {
    touch = h("div"); touch.id = "ks-touch"; doc.body.appendChild(touch);
    bPause = tb("ks-pause", "", doc.createTextNode("❚❚")); bPause.setAttribute("aria-label", "Pause");
    bPause.addEventListener("click", function () { KS.pause(); });
    bAbil = tb("ks-abil", "round"); abilIco = iconSpan("⚡"); abilTxt = h("span", "", "Shift"); abilSweep = h("span", "sweep");
    add(bAbil, abilSweep, abilIco, abilTxt); bAbil.setAttribute("aria-label", "Shift ability");
    bAbil.addEventListener("pointerdown", function (e) { e.preventDefault(); KS.pressAbility(); });
    bConfirm = tb("ks-confirm", ""); confTxt = h("span", "", "Confirm"); bConfirm.appendChild(confTxt);
    bConfirm.addEventListener("pointerdown", function (e) { e.preventDefault(); KS.confirmInteract(); });
    bTruck = tb("ks-truck", "", doc.createTextNode("Truck Bed ▾")); bTruck.addEventListener("click", function () { KS.pause(); });
    add(touch, bPause, bAbil, bConfirm, bTruck);
    touch.classList.add("ks-hidden");
  }
  var touchOn = false, lastConf = 0, lastAbil = -1, lastReady = null;
  function syncTouch() {
    if (!touch) return;
    var on = !!KS.run && KS.G.mode === "play" && !cur;
    if (on !== touchOn) { touchOn = on; touch.classList.toggle("ks-hidden", !on); }
    if (toastBox) toastBox.style.top = (KS.run ? L.toastTop || 58 : 8) + "px";
    if (tipBox) tipBox.style.top = (KS.run ? L.tipTop || 100 : 8) + "px";
  }
  function updateTouch(run) {
    if (!touchOn) { syncTouch(); if (!touchOn) return; }
    var p = run.player, ad = run.opDef && D("abilities")[run.opDef.ability];
    if (ad && abilTxt.textContent !== (ad.name || "Shift")) { abilTxt.textContent = ad.name || "Shift"; abilIco.textContent = ad.icon || "⚡"; }
    var q = p && p.abilityMax > 0 ? Math.max(0, Math.min(1, p.abilityCd / p.abilityMax)) : 0, qi = Math.round(q * 50);
    if (qi !== lastAbil) { lastAbil = qi; abilSweep.style.background = qi ? "conic-gradient(rgba(42,31,26,.7) " + (q * 360) + "deg,transparent 0)" : "none"; }
    var ready = qi === 0; if (ready !== lastReady) { lastReady = ready; bAbil.style.background = ready ? "#c9993b" : "#f4ead5"; }
    var pc = run.pendingConfirm, show = !!pc && pc.alive !== false;
    if (show) {
      var uid = pc.uid || 1; if (uid !== lastConf || (run.stepN % 30) === 0) {
        lastConf = uid; var d = pc.def || {}, nm = d.name || "Interact", cost = "";
        try { var base = d.costFn ? d.costFn(pc, run) : d.baseCost, kind = d.costKind || "tinsel", pr = KS.price(base, kind); cost = kind === "hp" ? pr + " HP" : kind === "free" ? "free" : fmt(pr) + " tinsel"; } catch (e) { cost = ""; }
        var s = "Confirm: " + nm + (cost ? " (" + cost + ")" : ""); if (confTxt.textContent !== s) confTxt.textContent = s;
      }
    } else lastConf = 0;
    bConfirm.classList.toggle("ks-hidden", !show);
    var showTruck = !L.showItems && !!L.compact; if (bTruck.classList.contains("ks-hidden") === showTruck) bTruck.classList.toggle("ks-hidden", !showTruck);
    if (showTruck) bTruck.style.top = (L.truckTop || 100) + "px";
  }

  // ===========================================================================
  // HUD (canvas, screen space). Strings are cached and only rebuilt when values change.
  // ===========================================================================
  var L = { w: 0, h: 0, wide: false, port: false, compact: false, cell: 34, showItems: false, toastTop: 58, tipTop: 100, truckTop: 100 };
  var TC = {}, SPR = {}, ARR = [], FCBG = [], LV = [], XN = [];
  var F = { b16: "700 16px Cinzel,serif", b14: "700 14px Cinzel,serif", b12: "700 12px Cinzel,serif", b11: "700 11px Cinzel,serif", b9: "700 9px Cinzel,serif", t12: "12px 'Libre Caslon Text',serif", b20: "900 20px 'Playfair Display',serif", b13: "700 13px Cinzel,serif" };
  var i0;
  for (i0 = 0; i0 < 8; i0++) ARR.push({ x: 0, y: 0, color: "#c9993b", label: "" });
  for (i0 = 0; i0 <= 18; i0++) { var q0 = Math.min(1, i0 / 17); FCBG.push("rgb(" + Math.round(244 + (42 - 244) * q0) + "," + Math.round(234 + (31 - 234) * q0) + "," + Math.round(213 + (26 - 213) * q0) + ")"); }
  for (i0 = 0; i0 < 100; i0++) { LV.push(String(i0)); XN.push(i0 >= 99 ? "x99+" : "x" + i0); }
  function txt(key, val, fn) { var e = TC[key]; if (!e) e = TC[key] = { v: NaN, s: "" }; if (e.v !== val) { e.v = val; e.s = fn(val); } return e.s; }
  function fHp(v) { return Math.floor(v / 100000) + "/" + (v % 100000); }
  function fTime(v) { return fmtTime(v); }
  function fStage(v) { return "Site " + v; }
  function fNum(v) { return fmt(v); }
  var HR = null;
  function fObj2() { var ob = HR.objective; return (ob.complete ? "✔ " : "") + (ob.label || "Objective") + " " + ob.done + "/" + ob.total; }
  function fLow(v) { return "Lowboy arrives in " + fmtTime(v); }
  function fRdy() { return "Lowboy is here: get to the trailer"; }
  function fLoad(v) { return "Loading the truck " + v + "%"; }
  function fHaul(v) { return "Haul out! " + v + "s"; }
  function fCond() { var o = [], run = HR; for (var k = 0; k < run.condition.length; k++) { var cd = D("conditions")[run.condition[k]]; o.push(cd ? (cd.icon || "") + " " + cd.name : run.condition[k]); } return o.join("  "); }
  function fBoss() { var d = bossRef && bossRef.def || {}; return d.title || d.name || "Boss"; }
  function fFps(v) { return v + " fps"; }
  function sprOf(icon) { var s = SPR[icon]; if (!s) { try { s = KS.iconSprite(icon, 32); } catch (e) { s = null; } SPR[icon] = s || false; } return s || null; }
  function layout(W, H) {
    L.w = W; L.h = H; var wide = W >= 720 && H >= 420, port = !wide && H >= W;
    L.wide = wide; L.port = port; L.compact = !wide;
    if (port) {
      L.cell = Math.max(22, Math.min(28, Math.floor((W - 16 - 24) / 12)));
      L.hpX = 58; L.hpY = 12; L.hpW = Math.max(70, Math.min(120, W * 0.28)); L.hpH = 16;
      L.tinW = 62; L.tinX = W - 8 - L.tinW; L.tinY = 11; L.clockX = (L.hpX + 30 + L.hpW + L.tinX) / 2; L.clockY = 22;
      L.fcX = 8; L.fcY = 38; L.fcW = W - 16; L.fcH = 18;
      L.wpX = 8; L.wpY = 62; L.gearX = 8 + 6 * (L.cell + 2) + 8; L.gearY = 62;
      L.objX = 8; L.objY = 62 + L.cell + 14; L.objAlign = "left"; L.woY = L.objY + 15;
      L.bossY = L.woY + 22; L.bossW = W - 16; L.showItems = false; L.truckTop = L.objY - 8; L.toastTop = L.bossY + 40; L.tipTop = L.bossY + 40;
    } else {
      L.cell = wide ? 36 : 28;
      L.hpX = 58; L.hpY = 14; L.hpW = wide ? 230 : 150; L.hpH = 18;
      L.clockX = W / 2; L.clockY = 24;
      L.fcW = wide ? 210 : 170; L.fcX = W - 8 - L.fcW; L.fcY = 12; L.fcH = 44;
      L.tinW = 96; L.tinX = W - 8 - L.tinW; L.tinY = L.fcY + L.fcH + 6;
      L.wpX = 8; L.wpY = L.hpY + L.hpH + 16; L.gearX = 8; L.gearY = L.wpY + L.cell + 6;
      L.objX = W - 8; L.objY = L.tinY + 38; L.objAlign = "right"; L.woY = L.objY + 16;
      L.bossY = 52; L.bossW = Math.max(160, Math.min(440, W - 2 * (L.fcW + 24))); L.showItems = wide;
      L.truckTop = L.gearY + L.cell + 6; L.toastTop = 78; L.tipTop = wide ? 112 : 96;
    }
    syncTouch();
  }
  function plate(ctx, x, y, w, hh, fill) { ctx.fillStyle = fill || "rgba(244,234,213,.92)"; ctx.fillRect(x, y, w, hh); ctx.strokeStyle = C_INK; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, hh - 2); }
  function otext(ctx, s, x, y) { ctx.lineWidth = 3; ctx.strokeStyle = "rgba(42,31,26,.9)"; ctx.strokeText(s, x, y); ctx.fillStyle = "#f4ead5"; ctx.fillText(s, x, y); }
  function iconCell(ctx, x, y, size, icon, border, lvStr, frac) {
    ctx.fillStyle = "rgba(244,234,213,.88)"; ctx.fillRect(x, y, size, size);
    var s = sprOf(icon); if (s) ctx.drawImage(s, x + 2, y + 2, size - 4, size - 4);
    if (frac >= 0 && frac < 1) { ctx.fillStyle = "rgba(42,31,26,.55)"; ctx.fillRect(x, y, size, (1 - frac) * size); }
    ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
    if (lvStr) { ctx.font = F.b11; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; otext(ctx, lvStr, x + size - 2, y + size - 2); }
  }
  function drawHUD(ctx, run, cam) {
    padPoll();
    var W = cam.sw / cam.dpr, H = cam.sh / cam.dpr;
    if (W !== L.w || H !== L.h) layout(W, H);
    var p = run.player, s = run.stats, i, w, g, hp = p ? Math.max(0, Math.ceil(p.hp)) : 0, mh = p ? Math.ceil(p.maxHp) : 1;
    HR = run; updateTouch(run);
    // XP bar (top edge)
    ctx.fillStyle = "rgba(42,31,26,.8)"; ctx.fillRect(0, 0, W, 8);
    ctx.fillStyle = C_OCHRE; ctx.fillRect(0, 0, W * Math.min(1, run.xp / Math.max(1, run.xpNext)), 7);
    ctx.fillStyle = C_INK; ctx.fillRect(0, 7, W, 1);
    ctx.textBaseline = "middle";
    // level badge + HP
    var bx = L.hpX, by = L.hpY, bh = L.hpH, hw = L.hpW;
    ctx.fillStyle = C_OCHRE; ctx.beginPath(); ctx.arc(bx + 12, by + bh / 2, 13, 0, 6.2832); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = C_INK; ctx.stroke();
    ctx.fillStyle = C_INK; ctx.font = F.b13; ctx.textAlign = "center"; ctx.fillText(LV[Math.min(99, run.level)] || "99", bx + 12, by + bh / 2 + 1);
    var hx = bx + 28; plate(ctx, hx, by, hw, bh, "rgba(42,31,26,.85)");
    var fr = mh > 0 ? Math.min(1, hp / mh) : 0; ctx.fillStyle = fr < 0.3 ? "#d8321f" : C_BRICK; ctx.fillRect(hx + 2, by + 2, (hw - 4) * fr, bh - 4);
    if (p && p.barrier > 0) { ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(hx + 2, by + 2, (hw - 4) * Math.min(1, p.barrier / Math.max(1, p.maxHp)), 4); }
    ctx.font = F.b11; ctx.textAlign = "center"; ctx.fillStyle = "#f4ead5"; ctx.fillText(txt("hp", hp * 100000 + mh, fHp), hx + hw / 2, by + bh / 2 + 1);
    // clock
    ctx.font = F.b16; ctx.textAlign = "center"; otext(ctx, txt("clk", Math.floor(run.time), fTime), L.clockX, L.clockY);
    ctx.font = F.b11; otext(ctx, txt("stg", (run.stageIndex | 0) + 1, fStage), L.clockX, L.clockY + 15);
    // forecast
    var tier = Math.max(0, Math.min(17, run.tier | 0)), dark = tier >= 9, fcol = dark ? "#f4ead5" : C_INK, nm = (KS.TIER_NAMES && KS.TIER_NAMES[tier]) || "Forecast";
    var tf = Math.max(0, Math.min(1, Math.log(Math.max(1, run.coeff)) / LN14 - tier)); if (tier >= 17) tf = 1;
    plate(ctx, L.fcX, L.fcY, L.fcW, L.fcH, FCBG[tier]);
    ctx.fillStyle = fcol; ctx.textAlign = "left";
    if (L.port) {
      ctx.font = F.b11; ctx.fillText(nm, L.fcX + 8, L.fcY + L.fcH / 2 + 1);
      var bw = L.fcW * 0.35; ctx.fillStyle = "rgba(128,128,128,.35)"; ctx.fillRect(L.fcX + L.fcW - bw - 8, L.fcY + 6, bw, L.fcH - 12); ctx.fillStyle = C_BRICK; ctx.fillRect(L.fcX + L.fcW - bw - 8, L.fcY + 6, bw * tf, L.fcH - 12);
    } else {
      ctx.font = F.b9; ctx.fillText("FORECAST", L.fcX + 8, L.fcY + 10); ctx.font = F.b13; ctx.fillText(nm, L.fcX + 8, L.fcY + 24);
      ctx.fillStyle = "rgba(128,128,128,.35)"; ctx.fillRect(L.fcX + 8, L.fcY + L.fcH - 10, L.fcW - 16, 5); ctx.fillStyle = C_BRICK; ctx.fillRect(L.fcX + 8, L.fcY + L.fcH - 10, (L.fcW - 16) * tf, 5);
    }
    // tinsel
    plate(ctx, L.tinX, L.tinY, L.tinW, 24); ctx.fillStyle = C_OCHRE; ctx.beginPath(); ctx.arc(L.tinX + 12, L.tinY + 12, 6, 0, 6.2832); ctx.fill(); ctx.strokeStyle = C_INK; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = C_INK; ctx.font = F.b12; ctx.textAlign = "right"; ctx.fillText(txt("tin", Math.floor(run.tinsel || 0), fNum), L.tinX + L.tinW - 6, L.tinY + 13);
    // weapons + gear
    var cell = L.cell, cx = L.wpX;
    for (i = 0; i < 6; i++) {
      w = run.weapons[i]; if (!w) continue;
      iconCell(ctx, cx + i * (cell + 2), L.wpY, cell, w.def.icon, w.evolved || w.fused ? C_OCHRE : C_INK, w.evolved || w.fused ? "★" : LV[Math.min(99, w.level)], w.hudFrac);
    }
    var gc = L.port ? cell : Math.max(22, cell - 6);
    for (i = 0; i < 6; i++) { g = run.gear[i]; if (g) iconCell(ctx, L.gearX + i * (gc + 2), L.gearY, gc, g.def.icon, C_INK, LV[Math.min(99, g.level)], -1); }
    // objective + work order
    var ob = run.objective, wo = run.workOrder, oy = L.objY;
    ctx.font = F.t12; ctx.textAlign = L.objAlign;
    if (ob && ob.total > 0) otext(ctx, txt("obj", ob.done * 1000 + ob.total + (ob.complete ? 1e6 : 0), fObj2), L.objX, oy);
    if (wo && wo.state !== "done") {
      var wt = "", wv = 0;
      if (wo.state === "locked") { wv = Math.max(0, Math.ceil(wo.unlockAt - run.stageTime)); wt = txt("wol", wv, fLow); }
      else if (wo.state === "ready") { wt = txt("wor", 1, fRdy); }
      else if (wo.state === "loading") { wv = Math.floor(100 * wo.charge / Math.max(1, wo.need)); wt = txt("wod", wv, fLoad); }
      else if (wo.state === "haulout") { wv = Math.ceil(wo.haulT); wt = txt("woh", wv, fHaul); }
      if (wt) otext(ctx, wt, L.objX, L.woY);
    }
    // conditions (small icons under the clock)
    if (run.condition && run.condition.length && !L.port) {
      ctx.font = F.b9; ctx.textAlign = "center"; var cs = txt("cnd", run.condition.length * 7 + (run.stageIndex | 0), fCond);
      otext(ctx, cs, L.clockX, L.clockY + 29);
    }
    // item strip
    if (L.showItems && run.itemOrder && run.itemOrder.length) {
      var n = run.itemOrder.length, st = Math.max(0, n - 8), sx = W / 2 - (Math.min(8, n) * 36) / 2;
      for (i = st; i < n; i++) {
        var id = run.itemOrder[i], idf = D("items")[id]; if (!idf) continue;
        iconCell(ctx, sx + (i - st) * 36, H - 44, 34, idf.icon, RARITY[idf.rarity] || C_INK, XN[Math.min(99, run.items[id] || 0)], -1);
      }
    }
    // boss bar
    if (bossRef) {
      if (bossRef.alive && bossRef.uid === bossUid) {
        var bw2 = L.bossW, bx2 = W / 2 - bw2 / 2, by2 = L.bossY, bd = bossRef.def || {}, bf = Math.max(0, Math.min(1, bossRef.hp / Math.max(1, bossRef.maxHp)));
        plate(ctx, bx2, by2, bw2, 26, "rgba(42,31,26,.88)"); ctx.fillStyle = C_BRICK; ctx.fillRect(bx2 + 3, by2 + 14, (bw2 - 6) * bf, 9);
        if (bd.phases) { ctx.fillStyle = "#f4ead5"; for (i = 1; i < bd.phases.length; i++) ctx.fillRect(bx2 + 3 + (bw2 - 6) * bd.phases[i] - 1, by2 + 12, 2, 12); }
        ctx.font = F.b12; ctx.textAlign = "center"; ctx.fillStyle = "#f4ead5"; ctx.fillText(txt("boss", bossUid, fBoss), W / 2, by2 + 8);
      } else bossRef = null;
    }
    // edge arrows
    var na = 0; try { na = KS.maps.arrows(ARR) | 0; } catch (e) { na = 0; }
    if (na > 0) {
      var mt = L.port ? L.bossY + 30 : 70, mb = L.port ? H * 0.26 : 60, rw = W / 2 - 26, rh = (H - mt - mb) / 2, ccx = W / 2, ccy = mt + rh;
      ctx.font = F.b11; ctx.textBaseline = "middle";
      for (i = 0; i < na && i < 8; i++) {
        var a = ARR[i], ax = (a.x - cam.x + cam.w / 2) * cam.zoom, ay = (a.y - cam.y + cam.h / 2) * cam.zoom;
        if (ax > 24 && ax < W - 24 && ay > mt && ay < H - mb) continue;
        var dx = ax - ccx, dy = ay - ccy, sc = Math.min(Math.abs(dx) > 0.01 ? rw / Math.abs(dx) : 1e9, Math.abs(dy) > 0.01 ? rh / Math.abs(dy) : 1e9), px = ccx + dx * sc, py = ccy + dy * sc, an = Math.atan2(dy, dx);
        ctx.save(); ctx.translate(px, py); ctx.rotate(an); ctx.fillStyle = a.color || C_OCHRE; ctx.strokeStyle = C_INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        if (a.label) { ctx.textAlign = "center"; otext(ctx, a.label, px - Math.cos(an) * 26, py - Math.sin(an) * 26); }
      }
    }
    // touch stick + fps
    var ts = KS.input.touchStick;
    if (ts && ts.active) {
      ctx.globalAlpha = 0.4; ctx.fillStyle = C_CREAM; ctx.strokeStyle = C_INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ts.ox, ts.oy, 60, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.fillStyle = C_OCHRE; ctx.beginPath(); ctx.arc(ts.x, ts.y, 26, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (S().showFps) { ctx.font = F.b11; ctx.textAlign = "left"; otext(ctx, txt("fps", Math.round(KS.G.fps || 0), fFps), 8, H - 10); }
    void s;
  }

  // ===========================================================================
  // Attract mode (title background): map preview with wandering foes
  // ===========================================================================
  var MOBS = [], mobDefs = null, badDef = {}, vig = null, vigW = 0, vigH = 0, FOE = { x: 0, y: 0, vx: 0, vy: 0, r: 14, hp: 10, maxHp: 10, face: 0, flash: 0, t: 0, defId: "", def: null, state: "", stateT: 0, elite: false, affix0: null, affix1: null, ai: {}, st: {}, isBoss: false };
  function drawAttract(ctx, t) {
    padPoll();
    var c = KS.cam, W = c.sw / c.dpr, H = c.sh / c.dpr, maps = D("maps"), ids = keys(maps).sort(function (a, b) { return (maps[a].order || 0) - (maps[b].order || 0); });
    var idx = ids.length ? Math.floor(t / 16) % ids.length : 0, loc = t % 16, def = ids.length ? maps[ids[idx]] : null, ok = false;
    if (def && def.drawPreview && !badDef["map" + idx]) { try { ctx.save(); def.drawPreview(ctx, W, H, t); ctx.restore(); ok = true; } catch (e) { ctx.restore(); badDef["map" + idx] = true; } }
    if (!ok) {
      ctx.fillStyle = (def && def.palette && def.palette.ground) || "#5f7f4f"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.07)"; for (var k = 0; k < 60; k++) { var fx = ((k * 97) % 101) / 101 * W, fy = ((k * 53 + 17) % 89) / 89 * H; ctx.fillRect((fx + t * 6) % W, fy, 14, 2); }
    }
    if (!mobDefs) {
      mobDefs = []; var E = D("enemies"), ek = keys(E).filter(function (x) { return x.charAt(0) !== "_" && E[x].spawnable !== false && typeof E[x].draw === "function"; });
      for (var m = 0; m < 10; m++) { var id = ek.length ? ek[(m * 3) % ek.length] : ""; MOBS.push({ id: id, x0: (m * 211) % 900, y: 0.12 + ((m * 37) % 76) / 100, vx: 14 + (m % 5) * 7, ph: m * 1.7 }); }
      mobDefs = 1;
    }
    var span = W + 240;
    for (var i = 0; i < MOBS.length; i++) {
      var mb = MOBS[i], ex = ((mb.x0 + t * mb.vx) % span) - 120, ey = mb.y * H + Math.sin(t * 1.3 + mb.ph) * 14, ed = mb.id ? D("enemies")[mb.id] : null, drew = false;
      if (ed && !badDef["e" + mb.id]) {
        FOE.x = ex; FOE.y = ey; FOE.vx = mb.vx; FOE.vy = 0; FOE.r = ed.r || 14; FOE.defId = mb.id; FOE.def = ed; FOE.t = t; FOE.face = 0; FOE.hp = FOE.maxHp = 10;
        ctx.save(); try { ed.draw(ctx, FOE, t); drew = true; } catch (e2) { badDef["e" + mb.id] = true; } ctx.restore();
      }
      if (!drew) { ctx.fillStyle = (ed && ed.color) || "#3f6b2f"; ctx.strokeStyle = C_INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ex, ey, 13, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#f4ead5"; ctx.beginPath(); ctx.arc(ex - 4, ey - 3, 2.5, 0, 6.2832); ctx.arc(ex + 4, ey - 3, 2.5, 0, 6.2832); ctx.fill(); }
    }
    if (!vig || vigW !== W || vigH !== H) { vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75); vig.addColorStop(0, "rgba(42,31,26,.25)"); vig.addColorStop(1, "rgba(42,31,26,.78)"); vigW = W; vigH = H; }
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    if (loc < 0.7) { ctx.globalAlpha = 1 - loc / 0.7; ctx.fillStyle = C_INK; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  // ===========================================================================
  // Samples (KS.test.ui), init, exports
  // ===========================================================================
  function noop() {}
  function samples() {
    var W = D("weapons"), wi = keys(W), I = D("items"), ii = keys(I), run = sampleRun(), ops = keys(D("operators"));
    var cards = [0, 1, 2].map(function (n) {
      var id = wi[n] || "cane", d = W[id] || { name: "Candy Cane", icon: "🍬" };
      return { cardId: "w:" + id, kind: "weapon", id: id, name: d.name, icon: d.icon, fromLevel: n, toLevel: n + 1, quality: n === 2 ? "gilded" : n === 1 ? "polished" : "normal", isNew: n === 0, deltas: [["Damage", "10", "12"], ["Cooldown", "1.0s", "0.9s"]], tags: ["blade"], evoHint: n === 1 ? { partnerId: "file", partnerIcon: "🔧", owned: false } : null, desc: "A sample card for layout testing." };
    });
    var choices = [0, 1, 2].map(function (n) { var id = ii[n] || "x", d = I[id] || { name: "Sample Item", icon: "✨", rarity: "common" }; return { id: id, name: d.name, icon: d.icon, rarity: d.rarity || "common", desc: "A sample item." }; });
    var mapIds = keys(D("maps")), nextMap = mapIds[1] || mapIds[0] || "backforty", cnd = keys(D("conditions"));
    return {
      title: {}, operators: {}, maps: { operatorId: ops[0] || "foreman" }, locker: {}, shop: {}, office: {}, settings: { back: { id: "title" } },
      pause: { run: run },
      levelup: { offer: { cards: cards, rerolls: 2, banishes: 1, canHold: true, heldId: "", showBanishHold: true }, onAction: noop },
      crate: { mode: "choose", title: "Supply Crate", note: "Take one.", choices: choices, onPick: noop },
      stageclear: { run: run, next: { mapId: nextMap, name: nameOf("maps", nextMap), condition: cnd.slice(0, 1) }, bank: 120, onNext: noop, onClockOut: noop },
      season: { season: 0, onContinue: noop },
      results: { summary: { reason: "dead", time: 300, stagesCleared: 1, season: 0, level: 9, kills: 400, killsByType: {}, bossKills: {}, operatorId: ops[0] || "foreman", mapId: nextMap, maxTier: 3, weapons: [{ id: wi[0] || "cane", level: 3, evolved: false, dmgDealt: 5000, kills: 100 }] }, reward: { payEarned: 120, bowsEarned: 0, newUnlocks: [], newPages: [], newAchievements: [], nearest: [] }, rsvpDone: false, onAgain: noop, onTitle: noop },
      test: { text: "sample test output" }
    };
  }
  function init() {
    if (inited || !doc) return; inited = true;
    var st = h("style"); st.id = "ks-css"; st.textContent = CSS; doc.head.appendChild(st);
    ensureRoot();
    toastBox = h("div"); toastBox.id = "ks-toasts"; doc.body.appendChild(toastBox);
    banBox = h("div"); banBox.id = "ks-banner"; doc.body.appendChild(banBox);
    tipBox = h("div", "ks-hidden"); tipBox.id = "ks-tip"; doc.body.appendChild(tipBox);
    buildTouch();
    window.addEventListener("keydown", onKeyDown, true); window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("resize", function () { L.w = 0; });
    var tf = { tinsel: 0, elite: 0, levelup: 0, crate: 0 };
    KS.on("modeChange", function () { syncChrome(); });
    KS.on("settings", function () { syncChrome(); });
    KS.on("runStart", function () { L.w = 0; TC = {}; bossRef = null; stageKills0 = 0; stageItems = 0; tipQ.length = 0; syncChrome(); });
    KS.on("stageStart", function (e) { stageKills0 = e && e.run ? e.run.kills : 0; stageItems = 0; });
    KS.on("runEnd", function () { bossRef = null; syncChrome(); });
    KS.on("itemGet", function () { stageItems++; });
    KS.on("tierUp", function (e) { var q = TEXT.tierQuips[Math.max(0, Math.min(17, e.tier | 0))]; KS.ui.banner(e.name || (KS.TIER_NAMES && KS.TIER_NAMES[e.tier]) || "Forecast", q, 3); });
    KS.on("surge", function (e) { var d = D("enemies")[e && e.typeId]; KS.ui.banner("SURGE!", d ? d.name + " incoming" : "Something big is coming", 2.5); });
    KS.on("bossSpawn", function (e) { var d = e && D("bosses")[e.bossId]; if (d) KS.ui.banner(d.title || d.name, d.subtitle || "", 3); });
    KS.on("achievement", function (e) { var d = D("achievements")[e && e.id]; KS.ui.toast("WORK ORDER COMPLETE: " + (d ? d.title : e.id), "achievement"); sfx("objective"); });
    KS.on("unlock", function (e) { if (e) KS.ui.toast("NEW IN THE POOL: " + nameOf(e.kind === "weapon" ? "weapons" : e.kind === "gear" ? "gear" : e.kind === "item" ? "items" : e.kind === "map" ? "maps" : "operators", e.id), "info"); });
    KS.on("objectiveDone", function () { KS.ui.toast("Objective complete", "achievement"); });
    KS.on("workOrder", function (e) { if (e && e.forced) KS.ui.banner("WORK ORDER", "The Lowboy is rolling. Get to the trailer!", 2.5); else if (e && e.state === "ready") KS.ui.tip("lowboy"); });
    KS.on("tinsel", function () { if (!tf.tinsel) { tf.tinsel = 1; KS.ui.tip("tinsel"); } });
    KS.on("eliteSpawn", function () { if (!tf.elite) { tf.elite = 1; KS.ui.tip("elite"); } });
    KS.on("levelup", function () { if (!tf.levelup) { tf.levelup = 1; KS.ui.tip("levelup"); } });
    KS.on("pickup", function (e) { if (!tf.crate && e && e.type === "supplycrate") { tf.crate = 1; KS.ui.tip("crate"); } });
    syncChrome();
  }

  KS.ui.init = init;
  KS.ui.drawHUD = drawHUD;
  KS.ui.drawAttract = drawAttract;
  KS.ui.refreshHUD = function () { L.w = 0; TC = {}; };
  KS.ui.samples = samples;
  KS.ui.TEXT = TEXT;
})(window.KS);
