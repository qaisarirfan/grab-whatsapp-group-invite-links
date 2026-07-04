# Grab WhatsApp Group Invite Links — User Guide

## What does this extension do?

This Chrome extension helps you find WhatsApp group invite links. Everything happens inside your own browser. It works in two ways:

1. **On any regular webpage** — it scans the page you are on and instantly shows any WhatsApp group invite links already present on that page.
2. **On Google Search results** — it visits each search result link on your behalf, scrapes its content, and collects any WhatsApp group invite links hidden inside those pages.

You can use the extension two ways: as a **popup** (click the toolbar icon, it closes when you click elsewhere) or as a **side panel** (stays open next to the page while you browse). Both show the exact same features — pick whichever fits how you work.

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
4. If no links are found, a message tells you so (and how many other links were found on the page instead — though those other links aren't listed, since they aren't WhatsApp links).

### On Google Search

1. Search for WhatsApp groups on Google (e.g. `site:chat.whatsapp.com`).
2. Click the extension icon. The popup shows how many search results it found.
3. Click the **Extract** button. You're switched to the **Logs** tab automatically so you can watch progress.
4. The extension visits each search result in the background and collects WhatsApp links. If you switch to the **Links** tab while this is still running, you'll see a loading spinner until it's done. Links start getting validated in the background as soon as they're found, even before extraction finishes.
5. When extraction finishes, you're switched back to the **Links** tab automatically, showing the deduplicated results.
6. If no WhatsApp links were found anywhere, the Links tab will look empty — see the FAQ below for what to do next.

### Auto-validate

There's an **Auto-validate** switch in the action bar. When it's on, every link gets checked automatically the moment it's found — you don't need to click **Validate links** yourself. This setting is remembered between popup opens. It's off by default, since validating hundreds of links automatically takes a while and makes requests to WhatsApp's servers for each one.

### Filtering and de-duplicating the list

Once at least one link has been found, a row of filter buttons appears above the table — **All**, **Active**, **Expired**, **Invalid**, **Rate-limited**, **Pending** — each showing how many links currently have that status. Click one to show only links in that state; click **All** to go back to seeing everything.

A **Hide duplicates** button next to the filters collapses multiple invite links that all point to the same group (recognised by the group name once validated) down to a single entry, so you don't have to look through repeats of the same group found on different pages.

### Help & FAQs, right in the popup

A **Help & FAQs** tab is always available in the popup, on every page and in every mode — you don't need to leave the extension or come back to this guide. It has a short how-to-use recap, the same badge legend as below, and an expandable FAQ list covering the same questions as the section further down this page.

### Using the side panel instead of the popup

If you'd rather keep the extension open while you browse (instead of it closing every time you click elsewhere), open it in Chrome's side panel:

- Click the **Open in side panel** button next to the tabs at the top of the popup, or
- Right-click the extension's toolbar icon (or right-click anywhere on the page) and choose **Open in side panel** from the menu.

The side panel shows the exact same tabs, buttons, and badges as the popup — it just stays docked next to the page instead of closing automatically, and it resizes to however wide you drag it.

---

## What the buttons do

| Button | Where it appears | What it does |
|---|---|---|
| **Open in side panel** | Next to the tabs, popup only | Moves the extension into Chrome's side panel, so it stays open next to the page instead of closing when you click away |
| **Extract** | Before the first extraction (Google Search only) | Starts scraping all Google search results for WhatsApp links |
| **Extract again** | Action bar, once at least one link has been found (Google Search only) | Re-runs the extraction from scratch |
| **Validate links** / **Re-validate links** | Action bar, once at least one link has been found | Checks each found link to see if it's still active or expired |
| **Auto-validate** | Action bar switch, once at least one link has been found | When on, links are validated automatically as they're found, without needing to click Validate links |
| **Export** | Action bar, once at least one link has been found | Opens a menu with **Copy as Text**, **Copy as JSON**, and **Download CSV**, plus a choice of scope — see below |
| **Download csv** (Logs tab) | Logs tab (Google Search only) | Downloads a separate `.csv` file of the scrape log — one row per page visited |

### The Export menu

Clicking **Export** opens a small menu with two parts:

- **Scope** — choose whether Copy/Download applies to **Shown** links (whatever the current status filter and Hide duplicates toggle are displaying) or **Valid only** (just the links currently marked Active). The Valid only option only appears once at least one shown link is Active.
- **Copy as Text** copies the links to your clipboard, one per line. **Copy as JSON** copies them as a JSON array (only available for the Shown scope). **Download CSV** downloads a `.csv` file (filename includes a timestamp) with each link's name, status, last-checked date, and URL.

Since Copy and Download always follow the current filter/dedupe settings, if you only want expired links exported, filter to **Expired** first, then use Export.

The Export menu stays visible even when the list is empty (this can happen in Google Search mode if nothing is found). **Validate links**, **Auto-validate**, **Extract again**, and the total link count only appear once at least one link has been found.

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
| Checking... | Grey | Validation is in progress |

Each validated link also shows a "Last checked" date, and — when the extension could read it — the group's name and photo above the raw link, instead of just a bare URL. Validation results are cached for **24 hours** per link (except Rate-limited results, which always retry on the next check rather than being reused), so re-checking the same link within a day usually reuses the previous result instead of making a new request.

While validation is running, a progress bar appears showing how many links are done out of the total, which link(s) are currently being checked, and (for larger batches) a rough time estimate for how much longer it'll take.

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
- **Side panel**: Opening the side panel (via the button or right-click menu) doesn't read or send anything extra — it's the same extension shown in a different part of the browser window.

---

## Frequently Asked Questions

**Why does it say there's no WhatsApp group link on this page?**
The page you're on doesn't contain any `chat.whatsapp.com` links. If other links were found, the message tells you how many, but they aren't listed since they aren't WhatsApp links.

**I clicked Extract but got an empty list — what do I do?**
None of the Google search results contained a WhatsApp link. Because the list is empty, the **Extract again** button won't appear (it only shows once at least one link has been found). Close the popup and reopen it to start over, or try a more specific search.

**Why does a search result show an error in red in the Logs tab?**
That specific page couldn't be reached or scraped (for example, it was down or blocked the request). Extraction automatically skips it and continues with the rest — no action needed on your part.

**Can I fully trust the Active/Expired badges?**
Not completely. The check can only tell whether WhatsApp's server responds at all — it can't yet confirm whether that specific invite has been used up or revoked. This means some expired invites may still show as Active. If a link matters to you, click it to confirm before relying on the badge.

**Why is a link marked Rate-limited?**
The check took longer than 8 seconds without a response, or WhatsApp temporarily rate-limited the request. Rate-limited results are never reused from cache, so the next time you click Validate links (or Auto-validate checks it again), it retries automatically.

**Why didn't Validate links re-check a link I just validated?**
Results are cached for 24 hours per link (except Rate-limited ones, which always retry). Validating again within that window reuses the earlier result instead of re-checking. The "Last checked" date under each link shows when it was last actually verified.

**I clicked Copy as Text (or Copy as JSON) but nothing was copied — what happened?**
If your browser blocks clipboard access, the menu item quietly returns to its normal label without any error message. Try opening **Export** and clicking it again, check that Chrome hasn't blocked clipboard permissions for the extension, or use **Download CSV** instead.

**What's the difference between the "Shown" and "Valid only" export scopes?**
"Shown" exports whatever the current status filter and Hide duplicates toggle are currently displaying. "Valid only" further narrows that to just the links marked Active. If you want to export a specific subset (say, only Expired links), filter to that status first, then open Export.

**Should I turn on Auto-validate?**
It's handy if you always want to know link status without an extra click, but it means every found link gets checked immediately, which takes longer for large result sets and makes more requests to WhatsApp's servers. It's off by default; turn it on if you'd rather not remember to click Validate links yourself.

**Can I redo an extraction or re-check links?**
Yes. **Extract again** re-runs the scrape from scratch (Google Search mode, once at least one link has been found), and **Validate links** can be clicked again any time — though results within 24 hours reuse the cached result rather than re-checking.

**A new tab opened when I installed or updated the extension — is that normal?**
Yes. It opens automatically on install and on update to show more information about the extension. You can close it at any time.

**What's the difference between the popup and the side panel?**
They're the same extension with the same tabs, buttons, and badges. The popup closes as soon as you click elsewhere; the side panel stays docked next to the page until you close it, which is handy if you're checking links while browsing multiple pages. Use whichever fits how you work — nothing about link extraction or validation changes between them.

**What happens when I remove the extension?**
Chrome opens a short feedback page. This is optional — you can close it without filling anything in.

**Does this extension track what websites I visit?**
It sends the address and title of whichever page you have open to Google Analytics each time you open the popup, plus anonymous click/usage counts — see the Privacy note above for full details. It does not read passwords or anything you type, and the WhatsApp links you find are never sent anywhere except to your own clipboard or downloaded file.
