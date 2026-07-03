# Grab WhatsApp Group Invite Links — Technical Reference

## Overview

A **Chrome Extension (Manifest V3)** built with React 19, TypeScript, and Webpack. It extracts `chat.whatsapp.com` group invite links either directly from the current page's DOM or by scraping the HTML of each URL found on a Google Search results page.

Version: `5.0.0`

---

## Architecture

### Entry points

| Source | Output | Runtime context |
|---|---|---|
| `src/background.ts` | `dist/js/background.js` | Service worker |
| `src/popup/index.tsx` | `dist/popup.html` + `dist/js/popup.js` | Extension popup (browser action) |

### Build system

Webpack 5 with two configs:

- `webpack/webpack.common.js` — shared config; defines both entry points, chunk splitting (`react` chunk, `vendors` chunk), and `TsconfigPathsPlugin` for path aliases.
- `webpack/webpack.prod.js` — extends common; adds `ZipWebpackPlugin` to produce a distributable `.zip` alongside `dist/`.
- `webpack/webpack.dev.js` — extends common; enables watch mode.

### Path aliases (defined in `tsconfig.json` and mirrored in webpack)

| Alias | Resolves to |
|---|---|
| `@components/*` | `src/components/*` |
| `@src/*` | `src/*` |

---

## Module reference

### `src/background.ts`

Service worker. Stateless — no business logic.

- `chrome.runtime.onInstalled` (reason: `install` or `update`) → opens an onboarding tab.
- `chrome.runtime.setUninstallURL` → sets a feedback URL shown on uninstall.

---

### `src/constants.ts`

Single export:

```ts
export const GOOGLE_SEARCH_URL = 'https://www.google.com/search';
```

---

### `src/utils.ts`

Core utilities for link extraction, HTTP fetching, and CSV export.

| Export | Signature | Purpose |
|---|---|---|
| `inviteLink` | `(link?: string) => string` | Extracts a canonical `https://chat.whatsapp.com/[A-Za-z0-9]{22}` URL from any string. Strips `/invite` suffixes. Returns `''` if no match. |
| `isValidURL` | `(string: string) => boolean` | Regex-based URL validation. |
| `isGoogle` | `(location?: string) => boolean` | Returns `true` when origin + pathname equals `https://www.google.com/search`. |
| `copyToClipboard` | `(text: string) => Promise<void>` | Writes to `navigator.clipboard`. |
| `sleep` | `(ms: number) => Promise<void>` | Resolves after `ms` milliseconds. |
| `parseUrl` | `(val: string) => { origin, href }` | Wraps `new URL()`. |
| `limiter` | `Bottleneck` instance | 50 max concurrent, 200 ms min spacing between requests. |
| `fetchData` | `(url: string) => Promise<AxiosResponse>` | `axios.get` scheduled through `limiter`. |
| `extractWhatsappLinks` | `(htmlContent: string) => string[]` | Loads HTML with `cheerio`, iterates `<a>` tags, applies `inviteLink()`, deduplicates. |
| `handleError` | `(error: string) => { hasError, errorMessage }` | Strips `AxiosError: ` prefix. |
| `convertToCsv` | `(data: Record[], filename: string) => void` | Uses `@json2csv/plainjs` `StreamParser` to serialise records, creates a `Blob`, and triggers a download via a hidden `<a>` element. Filename includes an ISO timestamp. |

---

### `src/validation.ts`

Link health-check system with caching.

#### Types

```ts
type LinkStatus = 'pending' | 'valid' | 'expired' | 'invalid' | 'rate-limited';

interface LinkValidation {
  link: string;
  status: LinkStatus;
  lastValidated: number; // Unix ms timestamp
  errorDetails?: string;
  name?: string; // Group name, scraped from the invite page's #main_block h3
  memberCount?: number; // Reserved — not currently extracted
  iconUrl?: string; // Group photo URL, scraped from #main_block img
  cacheVersion?: number; // Bumped whenever this shape changes, invalidating older cache entries
}

interface StorageData {
  validations: Record<string, LinkValidation>;
}
```

#### Rate limiter

```ts
const validationLimiter = new Bottleneck({ maxConcurrent: 5, minTime: 1000 });
```

Deliberately conservative (roughly one new request launched per second) since these requests hit WhatsApp's own servers directly. `axios-retry` is configured globally with exponential backoff, retrying on `429` responses and network/idempotent-request errors.

#### Cache duration

24 hours (`24 * 60 * 60 * 1000` ms) **and** a matching `CACHE_VERSION` (currently `2`). Stored in `chrome.storage.local` under the key `"validations"`. A cached entry is only reused if both the TTL and the version check pass — bumping `CACHE_VERSION` forces every existing cache entry to be re-fetched the next time it's checked, which is how the `name`/`iconUrl` fields were safely added without stale data lingering for 24 hours.

#### Functions

| Export | Purpose |
|---|---|
| `validateLink(link)` | `axios.get()`s the invite page directly (real `host_permissions`, no CORS workaround needed) with an 8-second `AbortController` timeout. Loads the HTML with `cheerio`: if `#main_block h3` has text, the link is `'valid'` (captures `name` and `iconUrl` from `#main_block img`); if the page loads with no name, it's `'expired'`. `404`/`410` → `'expired'`; `429`/timeout → `'rate-limited'`; anything else → `'invalid'`. |
| `validateLinkWithStorage(link, onStart?)` | Wraps `validateLink` in `validationLimiter`. Reads cache first (TTL + version check); only fetches if stale. Writes the result back to `chrome.storage.local`. The optional `onStart` callback fires the moment the rate limiter actually admits the job — not when it's merely queued — so callers can track which links are currently in flight. |
| `validateMultipleLinks(links)` | `Promise.all` over `validateLinkWithStorage` for each link, no progress reporting. |
| `validateMultipleLinksWithProgress(links, onProgress, onStart?)` | Same as above, but calls `onProgress(doneCount, link)` after each link settles and `onStart(link)` when each link's validation actually begins — powers the live progress bar and "currently validating" indicator in the popup. |
| `getValidationStatus(link)` | Reads `chrome.storage.local` and returns the cached `LinkValidation` or `null`. |
| `clearValidationCache()` | Removes the `"validations"` key from `chrome.storage.local`. |
| `getStatusColor(status)` | Returns a hex colour string for UI display. |
| `getStatusLabel(status)` | Returns a human-readable label (`Active`, `Expired`, `Invalid`, `Rate-limited`, `Pending`). |
| `getStatusTooltip(status)` | Returns a one-sentence explanation of what the status means, used as a `title` attribute on badges and filter chips. |

---

### `src/analytics.ts`

GA4 Measurement Protocol client. Singleton exported as `default new Analytics()`.

- Stores a persistent `clientId` (UUID) in `chrome.storage.local`.
- Stores session data in `chrome.storage.session` (in-memory only). Sessions expire after 30 minutes of inactivity.
- `fireEvent(name, params)` — POST to the GA4 endpoint with client/session IDs automatically attached.
- `firePageViewEvent(pageTitle, pageLocation, params)` — fires a `page_view` event.
- `fireErrorEvent(error, params)` — fires an `extension_error` event (avoids reserved name `error`).

Events fired across the app:

| Event name | Where |
|---|---|
| `extension_loaded` | Popup mount |
| `page_view` | Popup mount (active tab title/URL) |
| `page_type_detected` | After tab query |
| `dom_links_extracted` | After `executeScript` |
| `non_google_page_detected` / `google_search_page_detected` | Mode branching |
| `fetch_started` / `fetch_completed` | `fetchAll()` |
| `loading_started` / `loading_finished` | `fetchAll()` |
| `page_fetch_initiated` / `page_fetch_success` | Per-URL scrape |
| `extension_error` | Axios errors |
| `no_links_found` | Zero results |
| `validate_links_started` / `validate_links_completed` / `validate_links_error` | Validation flow |
| `validate_all_clicked` | Actions component |
| `tab_changed` | Tab switch |
| `extract_clicked` | Extract button |
| `log_recorded` | Per-log entry |
| `text_link_copied` / `json_link_copied` | Copy buttons |
| `links_downloaded` | CSV download |

---

## Popup application (`src/popup/index.tsx`)

### State

| State variable | Type | Purpose |
|---|---|---|
| `currentURL` | `string \| undefined` | URL of the active tab |
| `googleSearchLinks` | `string[]` | All `<a>` hrefs scraped from the Google search DOM |
| `links` | `string[]` | Final deduplicated WhatsApp invite links |
| `otherLinks` | `string[]` | Non-WhatsApp links found on a non-Google page |
| `logs` | `Log[]` | Per-URL scrape results for the Logs tab |
| `isLoading` | `boolean` | True while `fetchAll` is running |
| `isValidating` | `boolean` | True while `validateAllLinks` is running |
| `currentTab` | `'links' \| 'logs'` | Active tab in Google Search mode |

### Operational modes

#### Direct page mode (non-Google)

1. `chrome.scripting.executeScript` injects `getAllAnchorTags` into the active tab.
2. `getAllAnchorTags` queries all `<a>` elements and returns unique valid hrefs.
3. Results are filtered through `inviteLink()`. Matches populate `links`; everything else populates `otherLinks`.
4. UI renders the `<Links>` component or a "no links found" message.

#### Google Search mode

1. `getAllAnchorTags` queries `#search a` elements only.
2. Links excluding `GOOGLE_SEARCH_URL` itself become `searchLinks`.
3. User clicks **Extract** → `fetchAll()`:
   - Switches to the Logs tab.
   - Creates a `pLimit(50)` concurrency limiter.
   - Maps `searchLinks` → `getWhatsappLink()` (fetches each URL via `fetchData`, parses HTML with `extractWhatsappLinks`).
   - Settles all promises (`Promise.allSettled`), deduplicates results into `links`.
4. UI renders `<Tabs>` + `<Links>` / `<Logs>` depending on `currentTab`.

### `getAllAnchorTags` (injected function)

Runs inside the page's content script context. Detects Google Search pages and scopes the query to `#search a`. Returns a deduplicated array of valid URLs.

---

## Components

### `Header`

Displays the logo, extension name, and a "Buy Me a Coffee" link. Shown on the initial/empty state screen.

### `Links`

Props: `links`, `isLoading`, `fetchAll`, `isGoogleSearch`, `onValidateAll`, `isValidating`.

- On mount and whenever `links` changes, calls `getValidationStatus` for each link and stores results in local state.
- Renders a spinner while loading.
- Renders the `<Actions>` bar above a `<table>` listing each link with its validation badge (`StatusBadge`) and last-checked timestamp.

### `Actions`

Sticky action bar rendered above the links table. Contains:

- Total link count.
- **Extract again** button (Google Search mode only, shown after first extraction).
- **Validate links** button (shows spinner while validating).
- **Copy as Text** / **Copy as JSON** buttons (toggle green on success).
- **Download CSV** button.

### `Logs`

Props: `logs`, `progress`, `isLoading`.

- Shows `progress` counter (`completed/total`) and a spinner while loading.
- **Download csv** button exports the log.
- Table rows: index, origin link, and result (`finds N links` or error message in red).

### `Tabs`

Generic tab selector. Renders tab buttons and calls `onTabSelected` with the chosen key.

---

## Permissions (manifest.json)

| Permission | Why |
|---|---|
| `activeTab` | Read the URL and title of the currently focused tab |
| `scripting` | Inject `getAllAnchorTags` into the active tab's DOM |
| `storage` | Persist `clientId`, `sessionData`, and validation cache |
| `https://*/*`, `http://*/*` | Fetch arbitrary URLs in Google Search mode |

---

## Development workflow

```bash
npm install          # Install dependencies
npm run watch        # Incremental build (webpack --watch)
npm run build        # Production build → dist/ + dist.zip
npm run clean        # Delete dist* directories
npm run style        # Format with Prettier
node server.js       # Serve dist/ at http://localhost:5000
```

Load the unpacked extension from `dist/` in `chrome://extensions/` with Developer mode enabled. Reload the extension after each build.

---

## Key dependencies

| Package | Role |
|---|---|
| `react` / `react-dom` 19 | Popup UI |
| `styled-components` 6 | Component-scoped CSS |
| `axios` | HTTP fetching in Google Search mode |
| `bottleneck` | Rate limiting for both fetch and validation |
| `p-limit` | Additional concurrency cap (50) for `fetchAll` |
| `cheerio` | Server-side HTML parsing to extract links from fetched pages |
| `@json2csv/plainjs` | CSV serialisation |
| `fictoan.min.css` | Vendored utility CSS (tables, shapes, loaders) |
