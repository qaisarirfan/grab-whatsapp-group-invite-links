# Code Review Checklist — Grab WhatsApp Group Invite Links

Apply every applicable item. Mark Critical / Warning / Suggestion per the severity definitions below.

---

## Severity Definitions

| Level | Meaning |
| --- | --- |
| 🔴 Critical | Causes a crash, data loss, security breach, or breaks the extension's core function. Block merge. |
| 🟡 Warning | Bug-prone, degrades performance, or violates project conventions. Should fix. |
| 🟢 Suggestion | Style, readability, or minor maintainability. Optional but encouraged. |

---

## 1. Correctness & Bugs

### Chrome Extension APIs (Critical)

- [ ] `chrome.scripting.executeScript` injected functions (`getAllAnchorTags`) are self-contained — they run in the page context and cannot close over popup-scope variables/imports
- [ ] `chrome.tabs.query` / `chrome.scripting` callbacks guard against a missing active tab (`tabs[0]` undefined, no `id`) before using it
- [ ] `chrome.storage.local` / `chrome.storage.session` reads are typed and default safely when the key has never been set (e.g. `stored.autoValidate ?? false`)
- [ ] `chrome.runtime.onInstalled` / `setUninstallURL` logic in `src/background.ts` stays side-effect-free beyond opening the onboarding/uninstall URLs — no business logic added to the service worker

### Link Extraction & Validation (Critical)

- [ ] `inviteLink()` regex changes are tested against real `chat.whatsapp.com/XXXXXXXXXXXXXXXXXXXXXX` URLs (22-char code) and don't accidentally match `/invite` or non-invite paths
- [ ] `extractWhatsappLinks()` still dedupes results (`[...new Set(...)]`) after any change
- [ ] Any change to `LinkValidation`'s shape (`src/validation.ts`) bumps `CACHE_VERSION` — otherwise stale cached entries are served with missing/incorrect fields
- [ ] `validateLink()` failure branches map to the correct `LinkStatus` (`expired` for 404/410, `rate-limited` for 429/abort, `invalid` for everything else) — new error handling must preserve this distinction
- [ ] Cheerio selectors (`#main_block h3`, `#main_block img`) are re-verified against the real WhatsApp invite page markup if the parsing logic changes — a wrong selector silently returns `expired` for valid links

### React Correctness (Critical)

- [ ] `useEffect` that fires once on popup mount (`src/popup/index.tsx`) has an empty dependency array intentionally, and doesn't leak subscriptions if the popup closes mid-fetch
- [ ] No state update racing an unmounted popup — Chrome popups can close mid-`await`; fire-and-forget `chrome.storage`/`axios` calls after that point should not throw unhandled
- [ ] Keys in mapped lists (`links.map`, `logs.map`) are stable and unique — not array index when the underlying array can reorder or dedupe
- [ ] Progress/loading state (`isLoading`, `isValidating`, `validationProgress`, `inFlightLinks`) is reset in a `finally` block so a thrown error can't leave the UI stuck mid-operation

### Logic Bugs (Critical / Warning)

- [ ] `isGoogle()` comparison stays exact-match on origin+pathname — a change here silently breaks Google-search-mode detection for every user
- [ ] Async loops over links (`fetchAll`, `validateMultipleLinksWithProgress`) use `Promise.allSettled`/`Promise.all` correctly so one failing link doesn't abort the whole batch (unless that's the intended behavior)
- [ ] Rate limiter and concurrency settings (`Bottleneck`, `p-limit`) are not silently changed in ways that could hammer WhatsApp's servers or Google search results

---

## 2. Security

> Note: this extension has no custom backend — it scrapes pages using the user's own browser session and reports usage to Google Analytics (GA4 Measurement Protocol).

- [ ] No hardcoded credentials beyond the existing GA4 `MEASUREMENT_ID`/`API_SECRET` pattern in `src/analytics.ts` — no new API keys, tokens, or secrets added in source
- [ ] User-controlled or scraped content (page HTML, extracted links) is never passed to `eval()`, `dangerouslySetInnerHTML`, or inserted into the DOM unescaped
- [ ] `manifest.json` permissions (`activeTab`, `scripting`, `storage`) and `host_permissions` (`https://*/*`, `http://*/*`) are not broadened without a clear justification in the PR/commit
- [ ] Injected content-script functions (`getAllAnchorTags`) only read DOM data (`href` attributes) — they must not write to or modify the host page
- [ ] Analytics events (`Analytics.fireEvent`) do not include PII — extracted WhatsApp links, page URLs, and error messages sent as event params should not leak user-identifying data beyond what's already established
- [ ] No `console.log`/`console.error` left in hot paths that could leak scraped data into the browser devtools console in production builds (ESLint's `no-console: warn` should catch most of this)

---

## 3. Performance

### Network & Rate Limiting (Warning)

- [ ] New network calls reuse the existing `Bottleneck`/`p-limit` rate-limiting pattern rather than firing unbounded concurrent requests
- [ ] `axios` calls that scrape external pages set a timeout (see `fetchData()`'s 10s timeout, `validateLink()`'s 8s `AbortController`) — an unbounded request can hang `Promise.allSettled()` batches indefinitely
- [ ] `axios-retry` retry conditions stay scoped to transient failures (429, network/idempotent errors) — don't retry on 4xx client errors that won't change on retry

### React Rendering (Warning)

- [ ] No expensive synchronous work (large regex over big HTML strings, heavy `cheerio` parsing) run directly in a render body — keep it in effects/handlers
- [ ] `useMemo`/`useCallback` used where referential stability actually matters (e.g. `searchLinks` memoization) — don't add memoization that isn't load-bearing
- [ ] Popup UI doesn't re-render the full link list unnecessarily during a validation pass — updates should be incremental (as `inFlightLinks`/`validationProgress` already do)

### Storage (Warning)

- [ ] `chrome.storage.local` reads/writes for the validation cache don't grow unbounded — expired/invalid entries older than `VALIDATION_CACHE_DURATION` should be treated as stale, not accumulate forever
- [ ] Bulk `chrome.storage.local.set()` calls write the whole `validations` object each time — avoid adding patterns that read-modify-write this object more than necessary in a tight loop

---

## 4. Maintainability & Style

### TypeScript (Warning)

- [ ] No `any` type — use `unknown` and narrow, or define a proper type/interface (`@typescript-eslint/no-explicit-any` is only a warning in this repo, so review must catch it)
- [ ] Component props are typed explicitly (interface/type), not inferred from usage
- [ ] Shared types (`LinkStatus`, `LinkValidation`, `StorageData`) are imported from `src/validation.ts`, not redefined inline elsewhere

### Component Architecture (Warning / Suggestion)

- [ ] `src/popup/index.tsx` stays the orchestration layer — presentational concerns belong in `src/components/*`, not inlined further into the root popup component
- [ ] Components receive data/handlers via props rather than reaching into `chrome.storage`/`axios` directly, except where a component is explicitly a data-fetching boundary
- [ ] Styled-components definitions are colocated with the component that uses them, not duplicated across files

### Component Quality (Suggestion)

- [ ] Component does one thing — if a component file grows past ~200 lines, consider extracting sub-components
- [ ] No dead code (commented-out blocks, unused imports, unused state variables) — `unused-imports/no-unused-imports` should already catch most of this
- [ ] Magic strings/numbers (tab keys, cache durations, concurrency limits) are named constants, ideally in `src/constants.ts`, not inlined repeatedly

### Utilities (`src/utils.ts`, `src/validation.ts`) (Warning / Suggestion)

- [ ] Functions stay pure where possible (`inviteLink`, `isValidURL`, `parseUrl`) — side-effecting functions (`fetchData`, `copyToClipboard`, storage calls) are clearly separated from pure parsing helpers
- [ ] No side effects at module scope beyond intentional singleton setup already established (the `Bottleneck` limiter instance, `axiosRetry(axios, ...)` interceptor registration)

---

## 5. Accessibility

- [ ] Interactive elements (buttons, tabs, icon actions) have accessible names — visible text, `aria-label`, or `title` — not icon-only with no label
- [ ] Touch/click targets are reasonably sized — icon buttons in `Actions.tsx`/`Tabs.tsx` aren't so small they're hard to hit
- [ ] Status indicators (link validation colors from `getStatusColor`) are not the only signal — `getStatusLabel`/`getStatusTooltip` text must accompany color so the state isn't color-only
- [ ] Loading states (`isLoading`, `isValidating`) are communicated in text, not just a spinner class, for screen reader users

---

## 6. Test Coverage

> This project has no test suite (`npm test` is expected to fail) and none is being introduced as part of routine changes.

- [ ] New parsing/regex logic (`inviteLink`, `isValidURL`, `extractWhatsappLinks`) is exercised manually against representative sample inputs before merge (paste into a scratch script or the browser console) since there's no automated safety net
- [ ] If the user is introducing a test runner for the first time, confirm it's scoped intentionally rather than incidental — flag as a Suggestion, not a blocker, since none is currently expected

---

## 7. Project Conventions

- [ ] Path aliases (`@components/*`, `@src/*`) used consistently — no relative `../../../` imports
- [ ] `import/order` grouping (builtin → external → internal → parent/sibling/index, alphabetized) matches the ESLint config — don't hand-order imports differently
- [ ] ESLint + Prettier pass (`npm run lint`) — there is no pre-commit hook in this repo, so review must catch what CI/hooks would catch elsewhere
- [ ] No new dependencies added without noting the reason — keep the extension bundle size in check (`webpack-bundle-analyzer` is available if size is in question)
- [ ] Changes to `src/popup/index.tsx`, `src/components/*`, `src/validation.ts`, `src/background.ts`, or `public/manifest.json` should prompt a follow-up run of the `help-faq-sync` skill to keep `doc/non-technical.md` in sync
