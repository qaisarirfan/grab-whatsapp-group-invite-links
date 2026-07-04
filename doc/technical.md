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
| `src/popup/index.tsx` | `dist/popup.html` + `dist/js/popup.js` | Extension popup (browser action, opened by left-clicking the toolbar icon) |
| `src/sidepanel/index.tsx` | `dist/sidepanel.html` + `dist/js/sidepanel.js` | Side panel (opened via the "Open in side panel" button or the right-click context menu) |

Both `src/popup/index.tsx` and `src/sidepanel/index.tsx` are thin mount wrappers — each just calls `createRoot` and renders `<App context="popup" />` or `<App context="sidepanel" />`. All state, orchestration, and rendering lives in the shared `src/components/App.tsx`, so the two surfaces stay behaviorally identical except for the one context-specific button described below.

### Build system

Webpack 5 with two configs:

- `webpack/webpack.common.js` — shared config; defines all three entry points, chunk splitting (`react` chunk, `vendors` chunk), and `TsconfigPathsPlugin` for path aliases.
- `webpack/webpack.prod.js` — extends common; adds `ZipWebpackPlugin` to produce a distributable `.zip` alongside `dist/`.
- `webpack/webpack.dev.js` — extends common; enables watch mode.

### Path aliases (defined in `tsconfig.json` and mirrored in webpack)

| Alias | Resolves to |
|---|---|
| `@components/*` | `src/components/*` |
| `@src/*` | `src/*` |
| `@/*` | `src/*` (used for the shadcn/base-ui import convention — `@/components/ui/*`, `@/lib/utils`, `@/styles/globals.css`) |

---

## Module reference

### `src/background.ts`

Service worker. Stateless — no business logic beyond lifecycle and side-panel wiring.

- `chrome.runtime.onInstalled` (reason: `install` or `update`) → opens an onboarding tab, and registers a `contextMenus` item (`open-side-panel`, contexts: `action` and `page`).
- `chrome.contextMenus.onClicked` → if the clicked item is `open-side-panel`, calls `chrome.sidePanel.open({ windowId })` for the current window.
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
| `getAllAnchorTags` | `() => string[]` | Pure DOM scraper injected into the active tab via `chrome.scripting.executeScript` (called from `App.tsx`). Scopes to `#search a` on Google Search pages, otherwise all `<a>`. Self-contained — cannot close over other module imports since it runs in the page's isolated world — so its URL regex duplicates `isValidURL` intentionally. |

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
  iconUrl?: string; // Group photo URL, scraped from #main_block img
  cacheVersion?: number; // Bumped whenever this shape changes, invalidating older cache entries
}

interface StorageData {
  validations: Record<string, LinkValidation>;
}

type StatusFilter = 'all' | LinkStatus;
```

#### Rate limiter

```ts
const validationLimiter = new Bottleneck({ maxConcurrent: 10, minTime: 500 });
```

Deliberately conservative (up to 10 in-flight requests, roughly 2 new requests launched per second) since these requests hit WhatsApp's own servers directly. `axios-retry` is configured globally with exponential backoff, retrying on `429` responses and network/idempotent-request errors.

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
| `getStatusCounts(links, validations)` | Reduces `links` into a `Record<StatusFilter, number>` (including `all`), used to render per-status counts in the filter bar. |
| `filterLinksByStatus(links, validations, statusFilter)` | Returns the subset of `links` matching `statusFilter` (`'all'` returns everything). |
| `dedupeLinksByGroupName(links, validations)` | Collapses links that share the same validated `name` down to one representative link; links with no resolved name (not yet validated, or validation found no name) are always kept. Powers the "Hide duplicates" toggle. |

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

## Hooks (`src/hooks/`)

State and side effects that used to live directly in the popup component are now split into small hooks, each owning one concern. `App.tsx` composes them.

### `useLinkValidation(links, setLinks)` — `src/hooks/use-link-validation.ts`

Owns the "validate all" flow and the auto-validate setting.

| Returned value | Purpose |
|---|---|
| `autoValidate` / `autoValidateRef` | State + ref mirror of the auto-validate toggle; the ref exists so async callbacks (e.g. inside `useGoogleSearchScrape`) can read the current value without becoming a `useEffect` dependency. |
| `loadAutoValidateSetting()` | Reads the persisted `autoValidate` flag from `chrome.storage.local` on mount. |
| `toggleAutoValidate(value)` | Updates state, the ref, and persists the new value to `chrome.storage.local`. |
| `validateAllLinks(targetLinks?)` | Calls `validateMultipleLinksWithProgress`, tracking `isValidating`, `validationProgress` (`{ done, total }`), and `inFlightLinks` (links currently being fetched, added on `onStart` and removed on completion). Fires `validate_links_started` / `validate_links_completed` / an error event on failure. |
| `isValidating` | True while a validation pass is running. |

### `useGoogleSearchScrape({ autoValidateRef, currentURL, searchLinks, setCurrentTab, setLinks, validateAllLinks })` — `src/hooks/use-google-search-scrape.ts`

Owns the Google Search bulk-extract flow.

- `getWhatsappLink(url)` — fetches `url` via `fetchData`, extracts links with `extractWhatsappLinks`, logs the result (`Log` entry with origin/href/count/error), and **also** fires off `validateLinkWithStorage(link)` for each newly-found link immediately (fire-and-forget) so status badges can start filling in before the whole scrape finishes.
- `fetchAll()` — switches to the Logs tab, calls `setHasFetched(true)`, maps `searchLinks` through `getWhatsappLink` (concurrency capped by `fetchData`'s `Bottleneck` limiter, not here), awaits `Promise.allSettled`, dedupes into `links`, and — if `autoValidateRef.current` is on — kicks off `validateAllLinks(uniqueLinks)` once extraction completes. Switches back to the Links tab in a `finally` block.
- `hasFetched` — reactive state recording whether an extraction has ever been triggered in this popup session; used to decide whether the Logs/Links tabs should be offered at all, since `logs` is intentionally reset to `[]` at the start of every `fetchAll()` run and can't distinguish "never fetched" from "mid-fetch."

### `useCachedValidations(links)` — `src/hooks/use-cached-validations.ts`

Re-reads `chrome.storage.local`'s `"validations"` entry whenever `links` changes and returns a `Record<string, LinkValidation>` scoped to just those links. Used by `Links.tsx` to drive status badges, the filter bar, and dedupe — it does not itself trigger any network requests.

### `useSystemTheme()` — `src/hooks/use-system-theme.ts`

Listens to `prefers-color-scheme` and toggles a `.dark` class on `document.documentElement`, since `globals.css` gates dark tokens behind `@custom-variant dark (&:is(.dark *))` rather than a media query. Called once from `App.tsx`.

### `use-mobile.ts`

A shadcn scaffold hook (`useIsMobile`, media-query based). Only consumer is `src/components/ui/sidebar.tsx`, which is itself unused scaffolding — no screen in this extension renders a sidebar. Kept for parity with the shadcn component library; safe to remove alongside `sidebar.tsx` if neither is adopted.

---

## App component (`src/components/App.tsx`)

Shared root component rendered by both `src/popup/index.tsx` (`context="popup"`) and `src/sidepanel/index.tsx` (`context="sidepanel"`). It owns the top-level state below and wires the hooks above together; the two entry points differ only in:

- Container sizing via `cn()`: the popup keeps a fixed width (`max-w-162.5 min-w-162.5`), the side panel is fluid (`max-w-none min-w-auto`) so it can be resized by the user. A centered layout (`flex flex-col justify-center`) is used for the initial/empty screen before anything has been fetched.
- An "Open in side panel" button rendered next to the tab bar only when `context === 'popup'`. Clicking it calls `chrome.sidePanel.open({ windowId })` using a window ID captured once at mount (`currentWindowIdRef`), then closes the popup window — see the note below on why it doesn't re-query the window at click time.

### State (owned directly by `App.tsx`)

| State variable | Type | Purpose |
|---|---|---|
| `currentURL` | `string \| undefined` | URL of the active tab |
| `googleSearchLinks` | `string[]` | All `<a>` hrefs scraped from the Google search DOM |
| `links` | `string[]` | Final deduplicated WhatsApp invite links |
| `otherLinks` | `string[]` | Non-WhatsApp links found on a non-Google page; shown in a collapsible list in `EmptyState.tsx` (`http`/`https` entries are clickable, other schemes render as plain text) |
| `currentTab` | `'links' \| 'logs' \| 'help'` | Active tab |
| `currentWindowIdRef` | `MutableRefObject<number \| undefined>` | Window ID captured on mount, used by `openInSidePanel` |

`isLoading`/`logs` come from `useGoogleSearchScrape`; `isValidating`/`validationProgress`/`inFlightLinks`/`autoValidate` come from `useLinkValidation`.

### Why `openInSidePanel` uses a ref instead of querying at click time

`chrome.sidePanel.open()` must be called synchronously within the click event's call stack. An `await chrome.tabs.query(...)` before calling it can drop the browser's "user gesture" requirement, causing the call to silently fail. So the window ID is captured once during the mount effect (which does have time to await) and read synchronously from a ref when the button is clicked.

### Operational modes

#### Direct page mode (non-Google)

1. `chrome.scripting.executeScript` injects `getAllAnchorTags` into the active tab.
2. `getAllAnchorTags` queries all `<a>` elements and returns unique valid hrefs.
3. Results are filtered through `inviteLink()`. Matches populate `links` (and, if `autoValidate` is on, immediately call `validateAllLinks`); everything else populates `otherLinks`.
4. UI renders the `<Links>` component, or `<EmptyState>` with the "no links found" message.

#### Google Search mode

1. `getAllAnchorTags` queries `#search a` elements only.
2. Links excluding `GOOGLE_SEARCH_URL` itself become `searchLinks` (via `useMemo`).
3. User clicks **Extract** (in `<EmptyState>`) → `useGoogleSearchScrape`'s `fetchAll()` runs, as described above.
4. UI renders `<Tabs>` + `<Links>` / `<Logs>` / `<HelpFaq>` depending on `currentTab`, falling back to `<EmptyState>` when the selected tab isn't available for the current state (`showFallback` in `App.tsx`).

### `getAllAnchorTags` (injected function)

Defined in `src/utils.ts` and injected into the page via `chrome.scripting.executeScript({ func: getAllAnchorTags })`. Runs inside the page's content script context. Detects Google Search pages and scopes the query to `#search a`. Returns a deduplicated array of valid URLs.

---

## Components

### `Header`

Displays the logo, extension name, and a "Buy Me a Coffee" link. Shown on the initial/empty state screen (inside `<EmptyState>`).

### `EmptyState`

Props: `isGoogleSearchPage`, `searchLinksCount`, `otherLinks`, `isLoading`, `showExtractAgain`, `onExtractClick`.

Renders the initial/fallback screen shown by `App.tsx` whenever no tab (links/logs/help) is active for the current state: `<Header>`, plus either the "no WhatsApp group link on this page" message (direct-page mode, with a collapsible list of `otherLinks` if non-empty — `http`/`https` entries render as clickable links, other schemes render as plain text) or the Google Search "Extract"/"Extract again" button and result count (Google Search mode). `onExtractClick` is wired by `App.tsx` to fire the `extract_clicked` analytics event before calling `fetchAll()`.

### `Links`

Props: `links`, `isLoading`, `fetchAll`, `isGoogleSearch`, `onValidateAll`, `isValidating`, `validationProgress`, `inFlightLinks`, `autoValidate`, `onToggleAutoValidate`.

- Calls `useCachedValidations(links)` to read cached statuses for the current link set.
- Holds local `statusFilter` (`StatusFilter`, default `'all'`) and `hideDuplicates` (boolean) UI state.
- Derives `statusCounts` (`getStatusCounts`), `filteredLinks` (`filterLinksByStatus`), and `displayedLinks` (`dedupeLinksByGroupName` applied on top, when `hideDuplicates` is on).
- Renders a spinner while loading.
- Renders a sticky header (`<Actions>` + `<LinkFilterBar>`, shown only once there's at least one link) above a `TableVirtuoso` (`react-virtuoso`) — rows beyond the visible viewport (420px tall) aren't mounted, so extraction results in the thousands don't bloat the DOM. Each row is rendered by `<LinkRow>`.

### `LinkFilterBar`

Props: `hideDuplicates`, `onStatusFilterChange`, `onToggleHideDuplicates`, `statusCounts`, `statusFilter`.

Renders one button per `StatusFilter` value that currently has at least one match (plus `'all'`, always shown), each labelled with its count and coloured via `getStatusColor`/tinted background when inactive. A trailing **Hide duplicates** toggle button collapses links that resolved to the same group name (`dedupeLinksByGroupName`).

### `LinkRow`

Props: `index`, `link`, `validation?`.

Renders one table row: row number, the group's avatar (`validation.iconUrl`, if scraped) and name (`validation.name`, if scraped) above the raw URL, and — once a validation exists — a coloured status `<Badge>` (`getStatusColor`/`getStatusLabel`/`getStatusTooltip`) plus a "Last checked" date.

### `Actions`

Sticky action bar rendered above the links table (and above `<LinkFilterBar>`). Contains:

- Link count — `Total: N`, or `Showing M of N` once the filter bar/dedupe toggle have narrowed what's visible (`isScoped`).
- **Extract again** button (Google Search mode only, shown after first extraction).
- **Validate links** / **Re-validate links** button (label depends on whether any validation exists yet; shows a spinner while validating).
- **Auto-validate** switch (only rendered when `onToggleAutoValidate` is passed) — persists the setting via `useLinkValidation`.
- `<ExportMenu>` — copy/download actions.
- `<ValidationProgress>` — rendered inline while `isValidating` is true.

Copy/download always operate on `visibleLinks` (whatever the filter bar + dedupe toggle currently show), not the full extracted `links` array — exports match what's on screen. A `valid`-scoped export (see `ExportMenu` below) further narrows to links whose cached status is `'valid'`.

### `ExportMenu`

Props: `exportScope` (`'shown' | 'valid'`), `hasCopyAsJSON`/`hasCopyAsText`/`isCopyAsJSON`/`isCopyAsText` (label/spinner state), `isOpen`, `onCopy`, `onDownload`, `onOpenChange`, `onScopeChange`, `validLinksCount`, `visibleLinksCount`.

A single dropdown (shadcn `DropdownMenu`) replacing the old standalone Copy/Download buttons:

- **Scope** radio group — `Shown (N)` vs. `Valid only (N)` (only offered once at least one visible link is `'valid'`).
- **Copy as Text** — one URL per line. **Copy as JSON** — only offered when scope is `'shown'` (JSON copy doesn't currently support the valid-only scope). **Download CSV** — exports `{ Name, Status, LastValidated, URL }` rows for the active scope.
- If the valid-only scope's link count drops to zero (e.g. after re-validating), `Actions` resets `exportScope` back to `'shown'` automatically.

### `ValidationProgress`

Props: `fallbackTotal`, `inFlightLinks?`, `validationProgress?` (`{ done, total }`).

Renders a `<Progress>` bar plus a status line showing which link is currently being validated (and how many more are in flight) and a `done/total (pct%)` counter. Estimates remaining time assuming ~120 validations/minute (matching `validationLimiter`'s `minTime: 500`ms pacing), shown once more than a minute's worth of work remains.

### `Logs`

Props: `logs`, `progress`, `isLoading`.

- Shows `progress` counter (`completed/total`) and a spinner while loading.
- **Download csv** button exports the log.
- Table rows: index, origin link, and result (`finds N links` or error message in red).

### `HelpFaq`

No props. Always-available tab (`currentTab === 'help'`) covering: a short how-to-use recap, the status badge legend (reusing `getStatusColor`/`getStatusLabel`/`getStatusTooltip`), and an accordion FAQ list. Fires a `faq_item_toggled` analytics event when a question is expanded/collapsed.

### `Tabs`

Generic tab selector (wraps shadcn `Tabs`/`TabsList`/`TabsTrigger`). Renders tab buttons and calls `onTabSelected` with the chosen key. `App.tsx` builds the tab list dynamically: Logs and Links tabs only appear once relevant (`hasFetched` in Google Search mode, `links.length > 0` otherwise); "Help & FAQs" is always present.

### `ui/` (shadcn / base-ui component library)

Scaffolded via the `shadcn` CLI. Only a subset is actually wired into the app — `button`, `label`, `switch`, `dropdown-menu`, `badge`, `avatar`, `table`, `tabs`, `spinner`, `progress`, `accordion` — imported via the `@/components/ui/*` alias. The remaining scaffolded components (`sidebar`, `sheet`, `calendar`, `chart`, `carousel`, etc.) aren't currently imported anywhere outside `ui/` itself; they're available for future screens but carry no runtime cost unless imported (webpack only bundles what's referenced).

---

## Permissions (manifest.json)

| Permission | Why |
|---|---|
| `activeTab` | Read the URL and title of the currently focused tab |
| `scripting` | Inject `getAllAnchorTags` into the active tab's DOM |
| `storage` | Persist `clientId`, `sessionData`, and validation cache |
| `sidePanel` | Register `side_panel.default_path` and call `chrome.sidePanel.open()` |
| `contextMenus` | Register the "Open in side panel" right-click item on the toolbar icon and on the page |
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
| `tailwindcss` 4 / `shadcn` / `@base-ui/react` | Utility CSS + headless component primitives (replaced `styled-components` and vendored `fictoan.min.css`) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variant + conditional className handling for shadcn components and `cn()` |
| `lucide-react` | Icons, always deep-imported per-icon (`lucide-react/dist/esm/icons/*.mjs`) to avoid the un-tree-shaken barrel export |
| `react-virtuoso` | Virtualizes the links table (`TableVirtuoso`) |
| `axios` | HTTP fetching in Google Search mode and link validation |
| `axios-retry` | Exponential backoff on 429/network errors during validation |
| `bottleneck` | Sole concurrency/rate limiter for both fetch (`utils.ts`) and validation (`validation.ts`) |
| `cheerio` | Server-side HTML parsing to extract links, and to read group name/icon during validation |
| `@json2csv/plainjs` | CSV serialisation |

Several other packages (`recharts`, `sonner`, `embla-carousel-react`, `cmdk`, `input-otp`, `date-fns`, `next-themes`, `react-day-picker`, `react-resizable-panels`) were pulled in by the `shadcn` component scaffold but aren't yet used by any wired-in feature — see the `ui/` note above.
