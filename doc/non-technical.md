# Grab WhatsApp Group Invite Links — User Guide

## What does this extension do?

This Chrome extension helps you find WhatsApp group invite links. Everything happens inside your own browser. It works in two ways:

1. **On any regular webpage** — it scans the page you are on and instantly shows any WhatsApp group invite links already present on that page.
2. **On Google Search results** — it visits each search result link on your behalf, scrapes its content, and collects any WhatsApp group invite links hidden inside those pages.

---

## How to install

1. Go to `chrome://extensions/` in your Chrome browser.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `dist/` folder from this project.
4. The extension icon will appear in your Chrome toolbar.

A new browser tab opens automatically the first time you install the extension, and again after any future update — this is expected and just shows more information about the extension. You can close it and carry on.

---

## How to use it

### On a regular webpage

1. Navigate to any webpage that may contain WhatsApp group links.
2. Click the extension icon in the Chrome toolbar.
3. If WhatsApp invite links exist on that page, a deduplicated list is shown immediately — no button click needed.
4. If no links are found, a message tells you so, and how many other links were found on the page instead. Click **Show other links** to open a small window listing them, then close it (or click outside it) to go back.

### On Google Search

1. Search for WhatsApp groups on Google (e.g. `site:chat.whatsapp.com`).
2. Click the extension icon. The popup shows how many search results it found.
3. Click the **Extract** button. You're switched to the **Logs** tab automatically so you can watch progress.
4. The extension visits each search result in the background and collects WhatsApp links. If you switch to the **Links** tab while this is still running, you'll see a loading spinner until it's done. Links start getting validated in the background as soon as they're found, even before extraction finishes.
5. When extraction finishes, you're switched back to the **Links** tab automatically, showing the deduplicated results.
6. If no WhatsApp links were found anywhere, the Links tab shows a "No WhatsApp group links found" message with its own **Extract again** button, so you can retry right away — see the FAQ below for more ways to improve your search.

### Tips for searching Google

**Extract** only reads the search results already on the page you're viewing, so a well-aimed Google search matters more than the extension itself:

- **Add `site:chat.whatsapp.com`** to your search to bias results toward pages that link to WhatsApp invites, e.g. `site:chat.whatsapp.com photography`.
- **Add a topic keyword** alongside it to narrow things down, e.g. `site:chat.whatsapp.com crypto trading` or `site:chat.whatsapp.com "football fans"`.
- **Use quotes for an exact phrase**, e.g. `"whatsapp group link" recipes`, to match pages that use that exact wording.
- **Exclude unwanted results with a minus sign**, e.g. `site:chat.whatsapp.com marketing -job`, to drop results mentioning "job."
- **Go past page 1.** Since Extract only sees the current results page, click Google's page 2, 3, etc. (or "More results") and reopen the popup to run Extract again on each one — this is how you collect more than one page's worth of links.

There's no single query that works for every topic — mix and match these based on what you're looking for.

### Auto-validate

There's an **Auto-validate** switch in the action bar. When it's on, every link gets checked automatically the moment it's found — you don't need to click **Validate links** yourself. This setting is remembered between popup opens. It's off by default, since validating hundreds of links automatically takes a while and makes requests to WhatsApp's servers for each one.

### Filtering and de-duplicating the list

Once at least one link has been found, a **Filter** button appears above the table. Opening it shows a status list — **All**, **Active**, **Expired**, **Invalid**, **Rate-limited**, **Pending** — each with a count of how many links currently have that status. Pick one to show only links in that state; pick **All** to go back to seeing everything.

The same Filter menu also has a **Hide duplicates** option that collapses multiple invite links pointing to the same group (recognised by the group name once validated) down to a single entry, so you don't have to look through repeats of the same group found on different pages.

### Clearing cached validation results

Once at least one link has been found, a **Clear cache** button appears in the action bar. It deletes every cached validation result the extension has stored — including links from earlier pages or searches, not just the ones currently shown — so a confirmation window appears first. Confirming clears the cache immediately; the next **Validate links** run then re-checks everything from scratch instead of reusing old results.

### Getting back to the start screen

A **Home** tab appears alongside the others while you're using Google Search mode, or whenever you have **Help & FAQs** open — click it to return to the extension's starting screen (the Extract button, or the "no WhatsApp link" message), for example to run a fresh search.

### Help & FAQs, right in the popup

A **Help & FAQs** tab is always available in the popup, on every page and in every mode — you don't need to leave the extension or come back to this guide. It has a short how-to-use recap, the same badge legend as below, and an expandable FAQ list covering the same questions as the section further down this page.

---

## What the buttons do

| Button | Where it appears | What it does |
|---|---|---|
| **Extract** | Before the first extraction (Google Search only) | Starts scraping all Google search results for WhatsApp links |
| **Extract again** | Action bar, once at least one link has been found (Google Search only) | Re-runs the extraction from scratch |
| **Validate links** / **Re-validate links** | Action bar, once at least one link has been found | Checks each found link to see if it's still active or expired |
| **Auto-validate** | Action bar switch, always visible once the Links tab is showing | When on, links are validated automatically as they're found, without needing to click Validate links |
| **Export** | Action bar, once at least one link has been found | Opens a menu with **Copy as Text**, **Copy as JSON**, and **Download CSV**, plus a choice of scope — see below |
| **Clear cache** | Action bar, once at least one link has been found | After you confirm, deletes every cached validation result (not just what's currently shown) so the next validation re-checks everything from scratch |
| **Download csv** (Logs tab) | Logs tab (Google Search only) | Downloads a separate `.csv` file of the scrape log — one row per page visited |

### The Export menu

Clicking **Export** opens a small menu with two parts:

- **Scope** — choose whether Copy/Download applies to **Shown** links (whatever the current status filter and Hide duplicates toggle are displaying) or **Valid only** (just the links currently marked Active). The Valid only option only appears once at least one shown link is Active.
- **Copy as Text** copies the links to your clipboard, one per line. **Copy as JSON** copies them as a JSON array (only available for the Shown scope). **Download CSV** downloads a `.csv` file (filename includes a timestamp) with each link's name, status, last-checked date, and URL.

Since Copy and Download always follow the current filter/dedupe settings, if you only want expired links exported, filter to **Expired** first, then use Export.

The **Auto-validate** switch stays visible even when the list is empty (this can happen in Google Search mode if nothing is found), so you can turn it on ahead of the next extraction. **Validate links**, **Extract again**, the total link count, and the **Export** menu only appear once at least one link has been found.

The popup header also shows an optional "Support me on Buy Me a Coffee" link if you'd like to support the developer — this is entirely optional and unrelated to the extension's function.

---

## Link status badges

After clicking **Validate links**, each link gets a coloured badge:

| Badge | Colour | Meaning |
|---|---|---|
| Active | Green | The extension could reach the link's server. This confirms the server responded — it doesn't fully confirm the group itself is still joinable (see FAQ below) |
| Expired | Red | The invite is no longer active — either WhatsApp reported it as gone, or the page loaded without showing a group name (usually because the invite was revoked or fully used) |
| Invalid | Yellow | The check failed in an unexpected way, such as a network problem (rare) |
| Rate-limited | Grey | The check took longer than 8 seconds without a response, or WhatsApp temporarily rate-limited the request. Try validating again later |
| *(no badge yet)* | — | The link hasn't been checked yet — nothing shows until you click **Validate links** (or Auto-validate runs). Pick **Pending** in the Filter menu above the table to see how many are left |

Each validated link also shows a "Last checked" date, and — when the extension could read it — the group's name and photo above the raw link, instead of just a bare URL. Validation results are cached for **24 hours** per link (except Rate-limited results, which always retry on the next check rather than being reused), so re-checking the same link within a day usually reuses the previous result instead of making a new request.

While validation is running, a window appears with a progress bar showing how many links are done out of the total, which link is currently being checked, and (for larger batches) a rough time estimate for how much longer it'll take. Click the arrow in its corner (or press Escape, or click outside it) to minimize it to a small floating button in the corner of the popup — validation keeps running in the background, and clicking that button brings the full window back. Starting a new validation run always reopens the full window, even if you'd minimized the previous one.

If validation shows no progress for about 12 seconds, a warning appears explaining that WhatsApp is likely rate-limiting the requests, with **Retry** and **Cancel** buttons. **Retry** restarts checking on just the links that haven't finished yet (not the ones already done); **Cancel** stops waiting on the rest — links already checked keep their results either way.

---

## Logs tab (Google Search mode only)

While extraction runs, the **Logs** tab shows:

- Which page is being processed
- How many links were found on that page
- Any errors, shown in red (e.g. a page that couldn't be reached) — extraction automatically skips failed pages and continues with the rest
- A progress counter (`completed / total`)

You can download the full log as its own CSV file from this tab, separate from the links CSV.

---

## Privacy note

- **Reading the current page**: When you open the popup, it briefly reads the links on the page you're currently viewing so it can check for WhatsApp group links. This only happens while the popup is open.
- **Fetching pages (Google Search mode)**: Clicking Extract makes ordinary web requests to each Google search result to read its content — the same as if you'd opened each page yourself.
- **Checking link status**: Clicking Validate links sends a small request to each WhatsApp link to see if it responds.
- **Local storage**: Validation results (cached for 24 hours) and an anonymous usage ID are stored only inside your own browser, using Chrome's storage permission — never uploaded anywhere except as anonymous analytics, below.
- **Analytics**: Every time you open the popup, the web address and title of whichever page you're currently on are sent to Google Analytics, along with anonymous usage events (such as which buttons you click and how many links were found). This is used only to understand how the extension is used. It isn't tied to your name or Google account, and it never includes passwords, form content, or the WhatsApp links you find.
- The extension does not sell your data, and there is no separate server run by the developer that stores what you browse.

---

## Frequently Asked Questions

**Why does it say there's no WhatsApp group link on this page?**
The page you're on doesn't contain any `chat.whatsapp.com` links. If other links were found, the message tells you how many — click **Show other links** underneath to open a small window listing them.

**I clicked Extract but got an empty list — what do I do?**
None of the Google search results contained a WhatsApp link. The Links tab shows this directly, with its own **Extract again** button so you can retry right away — or try a more specific search (see **Tips for searching Google** above).

**What should I search for on Google to find more WhatsApp groups?**
Start with `site:chat.whatsapp.com` plus a topic keyword (e.g. `site:chat.whatsapp.com yoga`), or an exact phrase like `"whatsapp group link"` alongside your topic. See **Tips for searching Google** above for more examples. Since Extract only reads the current results page, page through Google's results (page 2, 3, …) and extract again on each page for more links.

**What is the Home tab for?**
It appears while you're using Google Search mode, or whenever **Help & FAQs** is open, as a way back to the extension's starting screen — handy if you want to run a fresh search or just start over.

**Why does a search result show an error in red in the Logs tab?**
That specific page couldn't be reached or scraped (for example, it was down or blocked the request). Extraction automatically skips it and continues with the rest — no action needed on your part.

**Can I fully trust the Active/Expired badges?**
Not completely. The check can only tell whether WhatsApp's server responds at all — it can't yet confirm whether that specific invite has been used up or revoked. This means some expired invites may still show as Active. If a link matters to you, click it to confirm before relying on the badge.

**Why is a link marked Rate-limited?**
The check took longer than 8 seconds without a response, or WhatsApp temporarily rate-limited the request. Rate-limited results are never reused from cache, so the next time you click Validate links (or Auto-validate checks it again), it retries automatically.

**Why did a warning appear saying there's no progress during validation?**
If validation shows no progress for about 12 seconds, WhatsApp is likely rate-limiting the requests. A warning appears with **Retry** (re-checks just the links that haven't finished yet) and **Cancel** (stops waiting on those; whatever finished already keeps its result) buttons.

**Why didn't Validate links re-check a link I just validated?**
Results are cached for 24 hours per link (except Rate-limited ones, which always retry). Validating again within that window reuses the earlier result instead of re-checking. The "Last checked" date under each link shows when it was last actually verified.

**What does Clear cache do, and when should I use it?**
It deletes every cached validation result the extension has stored — not just the links currently shown, all of them — so the next validation run re-checks everything from scratch instead of reusing old results. Use it if you suspect cached results are stale, for example a group you know is active is still showing as Expired from an old check. It asks you to confirm first, since it can't be undone.

**I clicked Copy as Text (or Copy as JSON) but nothing was copied — what happened?**
If your browser blocks clipboard access, the menu item quietly returns to its normal label without any error message. Try opening **Export** and clicking it again, check that Chrome hasn't blocked clipboard permissions for the extension, or use **Download CSV** instead.

**What's the difference between the "Shown" and "Valid only" export scopes?**
"Shown" exports whatever the current status filter and Hide duplicates toggle are currently displaying. "Valid only" further narrows that to just the links marked Active. If you want to export a specific subset (say, only Expired links), filter to that status first, then open Export.

**Should I turn on Auto-validate?**
It's handy if you always want to know link status without an extra click, but it means every found link gets checked immediately, which takes longer for large result sets and makes more requests to WhatsApp's servers. It's off by default; turn it on if you'd rather not remember to click Validate links yourself.

**Can I keep using the extension while links are validating?**
Yes. Click the arrow in the corner of the validating window (or press Escape, or click outside it) to minimize it to a small floating button — validation keeps running in the background, and clicking that button brings the full progress window back.

**Can I redo an extraction or re-check links?**
Yes. **Extract again** re-runs the scrape from scratch (Google Search mode, once at least one link has been found), and **Validate links** can be clicked again any time — though results within 24 hours reuse the cached result rather than re-checking.

**A new tab opened when I installed or updated the extension — is that normal?**
Yes. It opens automatically on install and on update to show more information about the extension. You can close it at any time.

**What happens when I remove the extension?**
Chrome opens a short feedback page. This is optional — you can close it without filling anything in.

**Does this extension track what websites I visit?**
It sends the address and title of whichever page you have open to Google Analytics each time you open the popup, plus anonymous click/usage counts — see the Privacy note above for full details. It does not read passwords or anything you type, and the WhatsApp links you find are never sent anywhere except to your own clipboard or downloaded file.
