/**
 * Moorhead Bros. Christmas Party RSVP: Google Sheets backend
 *
 * Paste this whole file into Extensions > Apps Script in your RSVP Google Sheet.
 * Then: run setup() once, and deploy as a Web App (see README.md, step 2).
 *
 * - Each person gets one row. Submitting again with the same name updates that row.
 * - The "Summary" tab is rebuilt after every RSVP (headcount + shirt totals).
 */

const RSVP_SHEET = 'RSVPs';
const SUMMARY_SHEET = 'Summary';
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const HEADERS = [
  'Submitted', 'Last Updated', 'Name', 'Attending', 'Shirt Size',
  '# Guests', 'Guest Names', 'Extra Guests (unnamed)', 'Total Headcount', 'Notes', 'key'
];
const COL = { submitted: 1, updated: 2, name: 3, guestNames: 7, notes: 10, key: 11 };

/** Run this once from the Apps Script editor to create the tabs and headers. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RSVP_SHEET);
  if (!sheet) sheet = ss.insertSheet(RSVP_SHEET, 0);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#c8312b').setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.hideColumns(COL.key);
  sheet.setColumnWidth(COL.name, 180);
  sheet.setColumnWidth(COL.guestNames, 260);
  sheet.setColumnWidth(COL.notes, 260);
  if (!ss.getSheetByName(SUMMARY_SHEET)) ss.insertSheet(SUMMARY_SHEET, 1);
  rebuildSummary();
}

/** Receives the form POST from the website. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const p = (e && e.parameter) || {};

    // Bots fill hidden fields; humans don't.
    if (p.website) return json({ ok: true });

    const name = clean(p.name, 80).replace(/\s+/g, ' ');
    const attending = p.attending === 'Yes' ? 'Yes' : p.attending === 'No' ? 'No' : '';
    if (name.length < 2 || !attending) return json({ ok: false, error: 'Missing name or attendance.' });

    const coming = attending === 'Yes';
    const shirt = coming ? clean(p.shirtSize, 10) : '';
    let guests = [];
    if (coming) {
      try { guests = JSON.parse(p.guests || '[]'); } catch (err) { guests = []; }
      guests = (Array.isArray(guests) ? guests : []).slice(0, 10).map(function (g) {
        return { name: clean(g && g.name, 80) };
      }).filter(function (g) { return g.name; });
    }

    const extra = coming ? Math.max(0, Math.min(20, parseInt(p.extraGuests, 10) || 0)) : 0;
    const totalGuests = guests.length + extra;

    const now = new Date();
    const key = name.toLowerCase();
    const row = [
      now, now, name, attending, shirt,
      totalGuests,
      guests.map(function (g) { return g.name; }).join(', '),
      extra,
      coming ? 1 + totalGuests : 0,
      clean(p.notes, 500),
      key
    ];

    const sheet = getRsvpSheet();
    const existing = findRow(sheet, key);
    let updated = false;
    if (existing) {
      row[0] = sheet.getRange(existing, COL.submitted).getValue(); // keep original submit time
      sheet.getRange(existing, 1, 1, row.length).setValues([row]);
      updated = true;
    } else {
      sheet.appendRow(row);
    }

    rebuildSummary();
    return json({ ok: true, updated: updated });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** GET ?action=stats returns the headcount only (no names) for the website banner. */
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === 'stats') {
    const s = stats();
    return json({ ok: true, headcount: s.headcount, attending: s.coming });
  }
  return ContentService.createTextOutput('Moorhead Bros. RSVP endpoint is up. Ho ho ho.');
}

/** Rebuilds the Summary tab. You can also run this by hand any time. */
function rebuildSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sum = ss.getSheetByName(SUMMARY_SHEET);
  if (!sum) sum = ss.insertSheet(SUMMARY_SHEET);
  const s = stats();

  const out = [
    ['Moorhead Bros. Christmas Party: RSVP Summary', ''],
    ['Last refreshed', new Date()],
    ['', ''],
    ['Total RSVPs received', s.total],
    ['Employees coming', s.coming],
    ['Employees not coming', s.notComing],
    ['Guests coming', s.guests],
    ['TOTAL HEADCOUNT', s.headcount],
    ['', ''],
    ['Shirt Size (employees only)', 'Count']
  ];
  const sizes = SIZE_ORDER.slice();
  Object.keys(s.shirts).forEach(function (k) { if (sizes.indexOf(k) === -1) sizes.push(k); });
  let totalShirts = 0;
  sizes.forEach(function (size) {
    const n = s.shirts[size] || 0;
    out.push([size, n]);
    totalShirts += n;
  });
  out.push(['Total shirts', totalShirts]);

  sum.clear();
  sum.getRange(1, 1, out.length, 2).setValues(out);
  sum.getRange('A1').setFontWeight('bold').setFontSize(14).setFontColor('#c8312b');
  sum.getRange('B2').setNumberFormat('mmm d, yyyy h:mm am/pm');
  sum.getRange('A8:B8').setFontWeight('bold').setBackground('#f6d27a');
  sum.getRange(10, 1, 1, 2).setFontWeight('bold').setBackground('#1f5a43').setFontColor('#ffffff');
  sum.getRange(out.length, 1, 1, 2).setFontWeight('bold');
  sum.setColumnWidth(1, 220);
}

/* ---------- helpers ---------- */

function stats() {
  const sheet = getRsvpSheet();
  const last = sheet.getLastRow();
  const res = { total: 0, coming: 0, notComing: 0, guests: 0, headcount: 0, shirts: {} };
  if (last < 2) return res;
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  rows.forEach(function (r) {
    if (!r[2]) return;
    res.total++;
    if (r[3] === 'Yes') {
      res.coming++;
      res.guests += Number(r[5]) || 0;
      const size = String(r[4] || '');
      if (size) res.shirts[size] = (res.shirts[size] || 0) + 1;
    } else {
      res.notComing++;
    }
  });
  res.headcount = res.coming + res.guests;
  return res;
}

function getRsvpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(RSVP_SHEET);
  if (!sheet) { setup(); sheet = ss.getSheetByName(RSVP_SHEET); }
  return sheet;
}

function findRow(sheet, key) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const keys = sheet.getRange(2, COL.key, last - 1, 1).getValues();
  for (let i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) return i + 2;
  }
  return 0;
}

/** Trims, length-limits, and stops spreadsheet formula injection (=, +, -, @). */
function clean(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
