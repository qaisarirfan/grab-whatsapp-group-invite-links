# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Production build → dist/
npm run watch        # Development build with watch mode
npm run clean        # Delete dist/ directories
npm run style        # Format with Prettier
npm run lint         # Lint with ESLint (ts/tsx)
npm run lint:fix     # Lint and auto-fix
node server.js       # Serve dist/ at http://localhost:5000 for inspecting build output
```

There is no test suite defined; `npm test` will fail.

To load the extension in Chrome: open `chrome://extensions/`, enable Developer mode, then "Load unpacked" → select the `dist/` folder.

## Architecture

This is a **Chrome Extension (Manifest V3)** built with React + TypeScript + Webpack.

### Two entry points compiled by Webpack

- **`src/background.ts`** → `dist/js/background.js` (service worker): Opens an onboarding tab on install/update; sets the uninstall URL. No business logic.
- **`src/popup/index.tsx`** → `dist/popup.html` + `dist/js/popup.js` (popup UI): The entire user-facing application.

### Extension flow

1. When the popup opens, it uses `chrome.scripting.executeScript` to inject `getAllAnchorTags` into the active tab and collect all `<a>` hrefs.
2. If the current page is a Google Search results page (`https://www.google.com/search`), the collected links are treated as targets to scrape — the user clicks "Extract" to fetch each one.
3. On non-Google pages, links are filtered immediately via `inviteLink()` in `src/utils.ts` for `chat.whatsapp.com` invite URLs.
4. For Google search mode, `fetchAll()` uses `axios` with `Bottleneck` rate limiting (100 concurrent, 100ms between requests) and `p-limit` (concurrency cap of 100) to scrape each search result. `cheerio` parses the HTML server-side to extract WhatsApp links.
5. After links are found, users can validate them via `validateMultipleLinksWithProgress()` in `src/validation.ts`, which `axios.get()`s each invite page and uses `cheerio` to read the group name/icon from `#main_block`, caching results (with a `cacheVersion` check) in `chrome.storage.local` for 24 hours.

### Path aliases (tsconfig.json + TsconfigPathsPlugin in webpack)

- `@components/*` → `src/components/*`
- `@src/*` → `src/*`

### Key files

| File | Purpose |
|---|---|
| `src/utils.ts` | `inviteLink()` (regex extraction), `fetchData()` (axios+Bottleneck), `extractWhatsappLinks()` (cheerio), `convertToCsv()` |
| `src/validation.ts` | Link health checking; `LinkStatus` type; `chrome.storage.local` caching; `getStatusColor/Label()` |
| `src/analytics.ts` | GA4 Measurement Protocol client; wraps `chrome.storage.local/session` for client/session IDs |
| `src/constants.ts` | `GOOGLE_SEARCH_URL` constant |
| `public/manifest.json` | Extension manifest — permissions: `activeTab`, `scripting`, `storage`; host permissions: all HTTP/HTTPS |
| `webpack/webpack.common.js` | Shared webpack config; defines both entry points, chunk splitting (react / vendors), path aliases |
| `webpack/webpack.prod.js` | Adds `ZipWebpackPlugin` to produce a distributable zip alongside `dist/` |

### Styling

Uses `styled-components` for component-level styles and `fictoan.min.css` (vendored in `public/`) for utility classes (e.g., `ff-table`, `shape-rounded`, `with-loader`).
