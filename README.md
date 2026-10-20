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

The site's repo is **https://github.com/AIadvancer/christmas-rsvp**. It must stay **public** for free GitHub Pages.

- To update the site later, open the repo and use **Add file → Upload files** to drag in the changed files (keep the folder structure). Click **Commit changes**. The live site updates within a minute or two.
- Then follow Step 4b to turn on Pages and connect the domain.

## Step 4b: Use your domain (mhchristmas.com)

The `CNAME` file in this folder already tells GitHub Pages the site lives at **mhchristmas.com**. Upload it with everything else.

### A. Turn on GitHub Pages

1. Open the repo at https://github.com/AIadvancer/christmas-rsvp and click **Settings**, then **Pages** in the left sidebar.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*. Set **Branch** to `main`, the folder to `/ (root)`, and click **Save**.
3. Under **Custom domain**, make sure it says `mhchristmas.com`. GitHub usually fills this in from the `CNAME` file. If not, type it in and click **Save**. It will show a DNS error until you finish part B. That's expected.

### B. Point the domain at GitHub (Namecheap)

1. Sign in at [namecheap.com](https://www.namecheap.com) and go to **Account → Domain List**.
2. Next to **mhchristmas.com**, click **Manage**.
3. On the **Domain** tab, find **Nameservers** and make sure it's set to **Namecheap BasicDNS**. If you change it, click the green ✓ to save.
4. Click the **Advanced DNS** tab at the top.
5. Under **Host Records**, delete Namecheap's parking records by clicking the 🗑 trash icon on each one:
   - **URL Redirect Record** for `@` (redirects to `http://www.mhchristmas.com/`)
   - **CNAME Record** for `www` pointing to `parkingpage.namecheap.com`
6. Click **Add New Record** for each row below. Pick the type from the dropdown, fill in **Host** and **Value**, leave **TTL** on *Automatic*, and click the green ✓ to save each row.

   | Type         | Host  | Value                   |
   |--------------|-------|-------------------------|
   | A Record     | `@`   | `185.199.108.153`       |
   | A Record     | `@`   | `185.199.109.153`       |
   | A Record     | `@`   | `185.199.110.153`       |
   | A Record     | `@`   | `185.199.111.153`       |
   | CNAME Record | `www` | `aiadvancer.github.io.` |

   Type the Host exactly as shown: just `@` or `www`. Namecheap adds `.mhchristmas.com` for you, so don't type the full domain. The trailing dot on the CNAME value is fine; Namecheap accepts it with or without the dot.
7. When you're done, **Host Records** should list exactly those 5 records and nothing else for `@` or `www`. Leave any **Mail Settings** alone.

### C. Finish up in GitHub

1. Wait for the DNS change to spread. On Namecheap this is usually 15–30 minutes, but it can take a few hours.
2. Go back to **Settings → Pages** in GitHub. When it shows **"DNS check successful"**, check **Enforce HTTPS**. If that box is grayed out, GitHub is still issuing the security certificate. Check back in an hour or so.
3. Visit https://mhchristmas.com and https://www.mhchristmas.com. Both should show the RSVP page with the padlock.

> **Optional, recommended:** verify the domain so nobody else can attach it to their own GitHub Pages site. In GitHub, click your profile picture → **Settings → Pages → Add a domain** and enter `mhchristmas.com`. GitHub shows a **TXT record** to add. In Namecheap's **Advanced DNS**, click **Add New Record → TXT Record**. For **Host**, paste only the part *before* `.mhchristmas.com` (it starts with `_github-pages-challenge-`). For **Value**, paste the code GitHub gave you. Save it, then click **Verify** in GitHub.

**If something's off:**
- *Namecheap parking page still shows up:* one of the parking records from step B5 is still there, or your browser cached the old page. Try a private/incognito window.
- *GitHub says "improperly configured":* double-check the four `A` records for typos, and make sure no other `A`, `AAAA`, or `URL Redirect` records exist for `@`.
- *A 404 page from GitHub:* Pages is pointed at the wrong branch or folder. Re-check part A, step 2.

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
