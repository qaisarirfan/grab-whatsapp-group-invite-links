# Grab WhatsApp Group Invite Links — User Guide

## What does this extension do?

This Chrome extension helps you find WhatsApp group invite links. It works in two ways:

1. **On any regular webpage** — it scans the page you are on and instantly shows any WhatsApp group invite links already present on that page.
2. **On Google Search results** — it visits each search result link on your behalf, scrapes its content, and collects any WhatsApp group invite links hidden inside those pages.

---

## How to install

1. Go to `chrome://extensions/` in your Chrome browser.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the `dist/` folder from this project.
4. The extension icon will appear in your Chrome toolbar.

---

## How to use it

### On a regular webpage

1. Navigate to any webpage that may contain WhatsApp group links.
2. Click the extension icon in the Chrome toolbar.
3. If WhatsApp invite links exist on that page, they are shown immediately in a list.
4. If no links are found, a message tells you so (and how many other links were found on the page).

### On Google Search

1. Search for WhatsApp groups on Google (e.g. `site:chat.whatsapp.com`).
2. Click the extension icon.
3. Click the **Extract** button.
4. The extension visits each search result in the background and collects WhatsApp links.
5. Progress is shown in the **Logs** tab. Results appear in the **Links** tab when done.

---

## What the buttons do

| Button | What it does |
|---|---|
| **Extract** | Starts scraping all links from Google search results |
| **Extract again** | Re-runs the extraction after you've already done it once |
| **Validate links** | Checks each found link to see if it's still active or expired |
| **Copy as Text** | Copies all links to your clipboard, one per line |
| **Copy as JSON** | Copies all links to your clipboard as a JSON array |
| **Download CSV** | Downloads a `.csv` file of all links (with a timestamp in the filename) |

---

## Link status badges

After clicking **Validate links**, each link gets a coloured badge:

| Badge | Colour | Meaning |
|---|---|---|
| Active | Green | The link is reachable and likely still working |
| Expired | Red | The link is no longer active (404 or 410 response, or unreachable) |
| Invalid | Yellow | The link returned an unexpected response |
| Limited | Grey | Too many requests were made; the check was rate-limited or timed out |
| Checking... | Grey | Validation is in progress |

Validation results are cached for **24 hours**, so re-opening the extension shows previous results without making new requests.

---

## Logs tab (Google Search mode only)

While extraction runs, the **Logs** tab shows:

- Which page is being processed
- How many links were found on that page
- Any errors (e.g. a page that couldn't be reached)
- A progress counter (`completed / total`)

You can also download the full log as a CSV file.

---

## Privacy note

The extension reads the page you are currently viewing and, in Google Search mode, sends HTTP requests to each search result URL. It does not send your browsing history or personal data to any external servers other than Google Analytics (used anonymously to measure how the extension is used).
