# Moorhead Bros. Christmas Party RSVP 🎄

A retro Christmas RSVP site that runs on **GitHub Pages** and saves every response to a **Google Sheet** that you can share with coworkers.

```
index.html                 the page
css/style.css              all the styling
js/config.js               ← party date, venue, RSVP deadline, Apps Script URL (edit this)
js/main.js                 lights, snow, Santa, countdown, sleigh, jingle
js/rsvp.js                 form logic + sending to the sheet
assets/logo.png            ← your company logo goes here
google-apps-script/Code.gs paste into Google Sheets (the backend)
```

---

## Step 1: Add your logo and party details

1. Save your logo as **`assets/logo.png`** (a PNG with a transparent background looks best). Until it's there, the page shows a "Moorhead Bros." text badge.
   - If your file is a `.jpg` or `.svg`, either rename the `src` in `index.html` (search for `assets/logo.png`) or convert it.
2. Open **`js/config.js`** and change `partyDate`, `venue`, and `rsvpBy`. You can also change the shirt sizes and the guest limit.

## Step 2: Create the Google Sheet (where RSVPs go)

1. Go to [sheets.new](https://sheets.new) **while signed in to the Google account that should own the data** (your company Google Workspace account is best). Name it something like *Christmas Party RSVPs 2026*.
2. Click **Extensions → Apps Script**.
3. Delete what's in the editor, paste in everything from **`google-apps-script/Code.gs`**, and click **Save** (💾).
4. In the function dropdown at the top, choose **`setup`** and click **Run**. Google asks you to authorize it. Approve it (it only needs access to this spreadsheet). This creates the **RSVPs** and **Summary** tabs.
   - If you see "Google hasn't verified this app", click **Advanced → Go to (project name)**. That's normal for your own scripts.
5. Click **Deploy → New deployment**.
   - Click the gear ⚙ next to "Select type" and choose **Web app**.
   - **Execute as:** *Me*
   - **Who has access:** *Anyone* (required so the public website can submit. It only lets people *send* RSVPs; it does **not** let them view the sheet)
   - Click **Deploy** and copy the **Web app URL** (ends in `/exec`).
6. Paste that URL into **`js/config.js`** as `scriptUrl`.

> **Changed `Code.gs` later?** Use **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**. That keeps the same URL. ("New deployment" creates a new URL.)

## Step 3: Share the spreadsheet

Click **Share** in the Google Sheet and add the people who need to see RSVPs as **Viewers** (or Editors if they'll make changes).

- Recommended: share with specific people or with your company domain only. Avoid "Anyone with the link" because the sheet has everyone's names.
- The **Summary** tab updates on every submission: total headcount, who's coming, guest count, and shirt totals by size (employees only, since guests don't get shirts).

## Step 4: Put it on GitHub Pages

1. Create a new repository on GitHub (for example `christmas-rsvp`). It must be **public** for free GitHub Pages (paid plans can publish from private repos).
2. Upload all of these files (drag and drop on the repo page works: **Add file → Upload files**). Keep the folder structure.
3. Go to **Settings → Pages**, set **Source: Deploy from a branch**, **Branch: `main` / `(root)`**, and click **Save**.
4. After a minute it's live at `https://<your-username>.github.io/christmas-rsvp/`. Next, point your domain at it.

## Step 4b: Use your domain (mhchristmas.com)

The `CNAME` file in this folder already tells GitHub Pages the site lives at **mhchristmas.com**. Upload it with everything else.

1. In GitHub, go to **Settings → Pages → Custom domain**, enter `mhchristmas.com`, and click **Save**.
2. At the company where you bought the domain (GoDaddy, Namecheap, Squarespace, etc.), open the domain's **DNS settings** and add these records. Delete any existing "parked" or "forwarding" `A` records for `@` first.

   | Type  | Host / Name | Value |
   |-------|-------------|-------|
   | A     | @           | 185.199.108.153 |
   | A     | @           | 185.199.109.153 |
   | A     | @           | 185.199.110.153 |
   | A     | @           | 185.199.111.153 |
   | CNAME | www         | `<your-username>.github.io` |

3. Wait for DNS to update. That's usually under an hour, but it can take up to a day. GitHub shows a green "DNS check successful" when it's working.
4. Once it's available, check **Enforce HTTPS** in the same Pages settings so the site gets the padlock.

Both `mhchristmas.com` and `www.mhchristmas.com` will then open the RSVP page.

> Tip: GitHub recommends verifying your domain (**Profile Settings → Pages → Add a domain**) so nobody else can claim it for their own GitHub Pages site.

## Step 5: Test it

1. Open the live site and submit a test RSVP (for example, name it "Test Elf").
2. Check that a row shows up in the **RSVPs** tab and that the **Summary** tab updates.
3. Delete the test row, then run **`rebuildSummary`** in Apps Script (or just wait for the next real RSVP) so the totals are correct.

---

## How it behaves

- **One row per person.** If someone submits again with the same name (not case-sensitive), their row is **updated** instead of duplicated. Two people with the exact same name would overwrite each other, so ask them to add a middle initial.
- **Demo mode:** while `scriptUrl` in `config.js` is empty, the form pretends to submit and saves nothing. Handy for previewing.
- **Spam:** a hidden "honeypot" field quietly drops most bots.
- **Headcount banner:** the hero shows "X people are coming so far". It only exposes the number, never names. Turn it off with `showHeadcount: false`.
- **Accessibility:** works with keyboard and screen readers. The flashing "Full Griswold" strobe is skipped for anyone whose computer is set to reduce motion.

## The fun stuff

- Click a light bulb to break it (click again to fix it). Footer button cycles **Twinkle → Chase → Steady → Full Griswold**.
- Poke Santa. His eyes follow your mouse. Keep poking.
- Click the **moon** (or the **Send the sleigh** button in the footer) to send Santa's sleigh across the sky.
- **♫ Play a jingle** plays Jingle Bells with sleigh bells (generated in the browser, no audio files).
- Snow drifts toward your mouse. A sleigh flies past the moon every so often.

## Preview it on your computer

From this folder:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.
