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
| Link validation | Fetches each invite page and reads its group name/icon to decide active vs. expired |
| Auto-validate | Optional toggle (persisted in `chrome.storage.local`) that validates links automatically as soon as they're extracted, instead of waiting for a manual click |
| Status filter bar | Filter the links table to one status at a time (Active/Expired/Invalid/Rate-limited/Pending), with live counts per status |
| Hide duplicates | Collapses invite links that resolve to the same validated group name |
| Group name & photo | Validated links show the scraped group name and icon inline, not just the raw URL |
| Validation progress | Live progress bar with done/total count, which link(s) are currently in flight, and an ETA hint |
| Export menu | Single dropdown for Copy as Text, Copy as JSON, and Download CSV — scoped to either the currently shown/filtered links or valid-only links |
| Virtualized links table | Table rows are windowed (`react-virtuoso`) so lists with thousands of links stay smooth |
| Scrape logs | Shows per-URL progress and errors during extraction |
| Validation caching | Results cached for 24 hours in `chrome.storage.local` (bypassed for rate-limited results, which always retry) |
| Help & FAQs tab | Always-available in-popup how-to and FAQ list, no need to leave the extension |
| Analytics | Anonymous GA4 usage tracking (Measurement Protocol) |

---

## Project structure

```
grab-whatsapp-group-invite-links/
├── src/
│   ├── background.ts          # Service worker — install/update lifecycle
│   ├── constants.ts           # Shared constants (Google Search URL)
│   ├── utils.ts               # Core: link regex, axios fetch, cheerio, CSV
│   ├── validation.ts          # Link health checking, storage cache, filter/dedupe helpers
│   ├── analytics.ts           # GA4 Measurement Protocol client
│   ├── hooks/
│   │   ├── use-link-validation.ts       # Validate-all orchestration, auto-validate setting
│   │   ├── use-google-search-scrape.ts  # Google Search fetchAll()/getWhatsappLink() + logs
│   │   ├── use-cached-validations.ts    # Reads cached LinkValidation per link from storage
│   │   ├── use-system-theme.ts          # Toggles `.dark` class from prefers-color-scheme
│   │   └── use-mobile.ts                # shadcn scaffold hook — only used by the unused Sidebar UI component
│   ├── lib/
│   │   └── utils.ts           # `cn()` — clsx + tailwind-merge, used for all conditional classNames
│   ├── styles/
│   │   └── globals.css        # Tailwind v4 + shadcn theme tokens, light/dark via `.dark` class
│   ├── popup/
│   │   ├── index.tsx          # Mounts <App />
│   │   └── index.html         # Popup HTML shell
│   └── components/
│       ├── App.tsx            # Shared root — owns top-level state, wires the hooks above
│       ├── Header.tsx         # Logo + Buy Me a Coffee
│       ├── EmptyState.tsx     # Initial/fallback screen (no-links message or Extract button)
│       ├── Links.tsx          # Virtualized links table (react-virtuoso) + filter bar
│       ├── LinkFilterBar.tsx  # Status filter chips + "Hide duplicates" toggle
│       ├── LinkRow.tsx        # One link's row: group name/photo, URL, status badge, last-checked
│       ├── Actions.tsx        # Sticky action bar (validate, auto-validate switch, export)
│       ├── ExportMenu.tsx     # Copy as Text/JSON + Download CSV, scoped to shown or valid-only
│       ├── ValidationProgress.tsx # Live validate-all progress bar with ETA
│       ├── Logs.tsx           # Scrape progress log table
│       ├── HelpFaq.tsx        # In-popup how-to-use + FAQ accordion
│       ├── Tabs.tsx           # Links / Logs / Help & FAQs tab switcher
│       └── ui/                # shadcn/base-ui component library (button, table, tabs, dropdown-menu, etc.)
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── images/                # Toolbar/extension icons
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
| UI | React 19 + Tailwind CSS v4 + shadcn/base-ui | Popup interface (fully migrated off styled-components) |
| Language | TypeScript 5 | Type safety across all modules |
| Build | Webpack 5 | Bundles two entry points (background, popup); splits react/vendor chunks |
| Icons | lucide-react | Deep-imported per-icon (not the barrel export) to avoid bundling the whole icon set |
| Virtualization | react-virtuoso | Windows the links table so large result sets stay smooth |
| HTTP | axios + Bottleneck | Fetching pages with rate limiting and concurrency capping |
| HTML parsing | cheerio | Extracts links (and group name/icon during validation) from fetched page HTML |
| CSV | @json2csv/plainjs | Converts link arrays to downloadable CSV |
| Analytics | GA4 Measurement Protocol | Anonymous event tracking |
| Retry | axios-retry | Exponential backoff on 429/network errors during validation |

---

## Data flow

### Bulk extract (Google Search mode)

```
popup opens
    → chrome.scripting.executeScript injects getAllAnchorTags()
    → returns all <a> hrefs from #search
    → user clicks "Extract"
    → fetchAll() maps each URL through fetchData(), rate-limited by Bottleneck
        → axios.get(url) fetches full HTML
        → cheerio finds all <a href="chat.whatsapp.com/...">
        → inviteLink() validates and normalises each URL
    → Promise.allSettled() collects results
    → deduplicated list stored in links state
    → rendered in Links table
```

### Validation

```
user clicks "Validate links" (or auto-validate is on, so this runs automatically per link as it's found)
    → validateMultipleLinksWithProgress(links)
        → per link: check chrome.storage.local cache (24h TTL + cacheVersion match; rate-limited results never served from cache)
        → if stale: axios.get() the invite page (axios-retry on 429/network errors)
            → cheerio reads #main_block h3 (group name) and #main_block img (group icon)
            → name present → 'valid'; page loads with no name → 'expired'
        → write result (status, name, iconUrl) back to chrome.storage.local
        → onStart/onProgress callbacks drive the live ValidationProgress bar and "currently validating" list
    → Links table re-reads storage via useCachedValidations and re-renders
    → status filter bar + "Hide duplicates" narrow what's displayed; status badges (Active / Expired / Invalid / Rate-limited) rendered per row
```

During Google Search scraping, each link is also individually queued for validation the moment it's extracted (independent of the bulk "Validate links" button), so status badges start filling in while extraction is still running.

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
npm run lint         # Lint with ESLint (ts/tsx)
npm run typecheck    # Type-check with tsc (no emit)
node server.js       # Preview dist/ at http://localhost:5000
```

There is no test suite defined; `npm test` will fail.

**Load in Chrome:**
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

---

## Planned features

| Plan | Document |
|---|---|
| Community & channel link extraction | [plan/feature-community-channel-links.md](../plan/feature-community-channel-links.md) |

---

## Further reading

| Document | Audience |
|---|---|
| [doc/non-technical.md](non-technical.md) | End users — how to install and use the extension |
| [doc/technical.md](technical.md) | Developers — full module reference, component API, data flow |
