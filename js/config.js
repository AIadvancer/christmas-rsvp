/*
 * ============================================================
 *  PARTY SETTINGS: edit this file, nothing else needs to change
 * ============================================================
 */
window.PARTY_CONFIG = {
  // Paste the Web App URL from Google Apps Script here (see README.md, step 2).
  // While this is empty the form runs in DEMO MODE: it pretends to submit and saves nothing.
  scriptUrl: "https://script.google.com/macros/s/AKfycbz6dPoS6WKyzLHDC7yqx7JXx5w_UCc8ocsPpi6cD6IRq4eZrvA-Zz3RMJqpaUEu2sbkdA/exec",

  // Party start, in your local time. Format: "YYYY-MM-DDTHH:MM"
  partyDate: "2026-12-18T18:00",   // <-- CHANGE ME

  // Shown under the title. Leave any of these "" to hide that part.
  venue: "The Shop",           // <-- CHANGE ME
  rsvpBy: "December 14",            // <-- CHANGE ME

  // How many guests people list by name. Once they hit this,
  // a dropdown asks how many MORE guests to expect (no names needed).
  namedGuests: 2,
  maxExtraGuests: 10,

  // Shirt sizes: [value saved to the sheet, funny name on the button]
  shirtSizes: [
    ["XS",  "Elf"],
    ["S",   "Little Drummer"],
    ["M",   "Mid-Size Reindeer"],
    ["L",   "Snowman"],
    ["XL",  "Big Fella"],
    ["2XL", "Full Santa"],
    ["3XL", "Santa After Cookies"]
  ],

  // Show "X people are coming so far" on the page (pulled from the sheet).
  showHeadcount: true
};
