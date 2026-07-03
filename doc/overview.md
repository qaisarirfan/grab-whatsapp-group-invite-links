# Project Overview — Grab WhatsApp Group Invite Links

**Type:** Chrome Extension (Manifest V3)  
**Version:** 5.0.0  
**Stack:** React 19 · TypeScript · Webpack 5  
**Author:** Qaisar Irfan

---

## What it is

A Chrome browser extension that finds and collects WhatsApp group invite links. It works on any webpage and has a dedicated power mode for Google Search results, where it scrapes each search result page to harvest links in bulk.

---

## The problem it solves

WhatsApp group invite links (`chat.whatsapp.com/...`) are scattered across websites, forums, and Google Search results. Collecting them manually — clicking each page, copying each link — is tedious. This extension automates that entirely: open the popup, click Extract, get a clean deduplicated list you can copy or download.

---

## Two operating modes

```
┌─────────────────────────────────────────────────────────────┐
│                     User opens popup                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
   Regular webpage                 Google Search page
          │                               │
   Scan page DOM                  Show "Extract" button
   instantly for WA links                │
          │                         User clicks Extract
          │                               │
   Show links list              Visit each result URL
                                Scrape HTML for WA links
                                         │
                                 Show deduplicated links
```

### Mode 1 — Direct page scan

Works on any website. When the popup opens, the extension reads all `<a>` tags on the current page and instantly filters for WhatsApp invite links. No button click needed — results appear immediately.

### Mode 2 — Google Search bulk extract

When on `google.com/search`, the extension collects all result URLs and lets you trigger a bulk scrape. It fetches each result page using axios, parses the HTML with cheerio, and extracts every WhatsApp link found. Runs up to 50 requests concurrently with rate limiting.

---

## Key features

| Feature | Detail |
|---|---|
| Instant scan | Detects links on current page without any user action |
| Bulk Google extraction | Scrapes all Google Search result pages in parallel |
| Link validation | Checks whether each link is still active or expired |
| Copy as Text | Copies all links to clipboard, one per line |
| Copy as JSON | Copies links as a JSON array |
| Download CSV | Exports links (with status + timestamp) to a `.csv` file |
| Scrape logs | Shows per-URL progress and errors during extraction |
| Validation caching | Results cached for 24 hours in `chrome.storage.local` |
| Analytics | Anonymous GA4 usage tracking (Measurement Protocol) |

---

## Project structure

```
grab-whatsapp-group-invite-links/
├── src/
│   ├── background.ts          # Service worker — install/update lifecycle
│   ├── constants.ts           # Shared constants (Google Search URL)
│   ├── utils.ts               # Core: link regex, axios fetch, cheerio, CSV
│   ├── validation.ts          # Link health checking + storage cache
│   ├── analytics.ts           # GA4 Measurement Protocol client
│   ├── popup/
│   │   ├── index.tsx          # Root React app — all state and orchestration
│   │   └── index.html         # Popup HTML shell
│   └── components/
│       ├── Header.tsx         # Logo + Buy Me a Coffee
│       ├── Links.tsx          # Links table with status badges
│       ├── Actions.tsx        # Sticky action bar (copy, download, validate)
│       ├── Logs.tsx           # Scrape progress log table
│       └── Tabs.tsx           # Links / Logs tab switcher
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── fictoan.min.css        # Vendored utility CSS
├── webpack/
│   ├── webpack.common.js      # Shared webpack config + path aliases
│   ├── webpack.dev.js         # Watch mode
│   └── webpack.prod.js        # Production build + zip output
├── doc/                       # Documentation
├── plan/                      # Future feature plans
└── server.js                  # Dev server to preview dist/ at :5000
```

---

## Tech stack

| Layer | Technology | Purpose |
|---|---|---|
| UI | React 19 + styled-components | Popup interface |
| Language | TypeScript 5 | Type safety across all modules |
| Build | Webpack 5 | Bundles two entry points; splits react/vendor chunks |
| HTTP | axios + Bottleneck | Fetching pages with rate limiting |
| Concurrency | p-limit | Additional concurrency cap for bulk extract |
| HTML parsing | cheerio | Extracts links from fetched page HTML |
| CSV | @json2csv/plainjs | Converts link arrays to downloadable CSV |
| Analytics | GA4 Measurement Protocol | Anonymous event tracking |
| Retry | axios-retry | Exponential backoff on 429/network errors during validation |
| CSS utilities | fictoan.min.css | Tables, loaders, shapes, colours |

---

## Data flow

### Bulk extract (Google Search mode)

```
popup opens
    → chrome.scripting.executeScript injects getAllAnchorTags()
    → returns all <a> hrefs from #search
    → user clicks "Extract"
    → fetchAll() maps each URL through pLimit(50) + Bottleneck
        → axios.get(url) fetches full HTML
        → cheerio finds all <a href="chat.whatsapp.com/...">
        → inviteLink() validates and normalises each URL
    → Promise.allSettled() collects results
    → deduplicated list stored in links state
    → rendered in Links table
```

### Validation

```
user clicks "Validate links"
    → validateMultipleLinksWithProgress(links)
        → per link: check chrome.storage.local cache (24h TTL + cacheVersion match)
        → if stale: axios.get() the invite page (axios-retry on 429/network errors)
            → cheerio reads #main_block h3 (group name) and #main_block img (group icon)
            → name present → 'valid'; page loads with no name → 'expired'
        → write result (status, name, iconUrl) back to chrome.storage.local
    → Links component re-reads storage on state change
    → status badges (Active / Expired / Invalid / Rate-limited) rendered
```

---

## Extension permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the URL and title of the currently open tab |
| `scripting` | Inject the anchor-tag collector into the active tab's DOM |
| `storage` | Cache validation results and persist analytics IDs |
| `https://*/*` `http://*/*` | Fetch arbitrary pages during bulk Google Search extraction |

---

## Build & development

```bash
npm install          # Install all dependencies
npm run watch        # Start incremental webpack build (dev)
npm run build        # Production build → dist/ + dist.zip
npm run clean        # Delete dist* directories
npm run style        # Format all files with Prettier
node server.js       # Preview dist/ at http://localhost:5000
```

**Load in Chrome:**
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

---

## Planned features

| Plan | Document |
|---|---|
| Community & channel link extraction | [plan/feature-community-channel-links.md](../plan/feature-community-channel-links.md) |
| Bug fixes and code quality improvements | [plan/improvements.md](../plan/improvements.md) |

---

## Further reading

| Document | Audience |
|---|---|
| [doc/non-technical.md](non-technical.md) | End users — how to install and use the extension |
| [doc/technical.md](technical.md) | Developers — full module reference, component API, data flow |
