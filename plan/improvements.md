# Future Improvement Plans

Identified during code review on 2026-06-23. Re-scanned against the codebase on 2026-07-04, after the Tailwind/shadcn migration and the split of `src/popup/index.tsx`'s logic into `src/components/App.tsx` + `src/hooks/*`. Ordered by priority; status reflects the 2026-07-04 re-scan.

---

## Resolved since 2026-06-23

- **BUG-2** — `validateLink` now makes a real `axios.get()` request (not `mode: 'no-cors'`), so `404`/`410`/`429` checks are reachable and meaningful. Already documented in `doc/technical.md`.
- **CLEAN-1** — `src/Untitled-1.ts` no longer exists in the repo.
- **ARCH-2** — `getAllAnchorTags` is now a module-scope export in `src/utils.ts`, imported wherever it's injected (`src/components/App.tsx`). No longer redefined per render.

---

## Bug Fixes

### BUG-1 — `convertToCsv` may throw and may produce empty files — STILL OPEN

**File:** `src/utils.ts` (`convertToCsv`, currently lines 92–117)

**Problems (unchanged from the original review):**
1. `pom` (the hidden `<a>` element) is still never appended to `document.body` before `.click()` is called, and `document.body.removeChild(pom)` is still called on it afterwards — this throws a `NotFoundError` since `pom` was never a child of `document.body`.
2. `StreamParser` is event-driven. `parser.onEnd` only logs to the console; the actual `Blob`/download-trigger code runs synchronously right after the `parser.write()` loop, and `parser.end()` is never called at all, so the parser is never told the input is finished.

**Fix:** Same as originally proposed — append `pom` to the DOM before clicking (then remove it), and move the `Blob` creation + download trigger into `parser.onEnd`, calling `parser.end()` after the `write()` loop so `onEnd` actually fires:

```ts
parser.onEnd = () => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const pom = document.createElement('a');
  pom.setAttribute('href', url);
  pom.setAttribute('download', fileName);
  document.body.appendChild(pom);
  pom.click();
  document.body.removeChild(pom);
  URL.revokeObjectURL(url);
};
data.forEach(record => parser.write(record));
parser.end();
```

---

### BUG-2 — `validateLink` status code checks are unreachable — RESOLVED

See "Resolved since 2026-06-23" above.

---

## Dead Code Removal

### CLEAN-1 — Delete `src/Untitled-1.ts` — RESOLVED

See "Resolved since 2026-06-23" above.

---

### CLEAN-2 — Delete `src/logs.ts` — STILL OPEN

File still contains only `export default [];`. Confirmed via repo-wide search that nothing imports it (not to be confused with `src/components/Logs.tsx`, the log-table component, which is unrelated and in active use). Safe to delete.

---

### CLEAN-3 — `otherLinks` state is collected but never shown — STILL OPEN

**Files:** `src/components/App.tsx` (state declaration and the `setOtherLinks` call in the mount effect), `src/components/EmptyState.tsx` (only `otherLinksCount` is rendered, in the "no WhatsApp group link on this page" message)

`otherLinks` is populated when a non-Google page has no WhatsApp links, but only its `.length` (passed down as `otherLinksCount`) is shown to the user. The links themselves are never rendered.

**Options (pick one):**
- Render the links in a collapsible section so the user can inspect what was found on the page.
- Drop the state entirely and replace with a simple counter variable if only the count matters.

---

## Architecture

### ARCH-1 — Redundant concurrency limiting — STILL OPEN (numbers changed)

**Files:** `src/hooks/use-google-search-scrape.ts` (`fetchAll`, `pLimit(100)`), `src/utils.ts` (`limiter`, `Bottleneck({ maxConcurrent: 50, minTime: 200 })` inside `fetchData`)

`fetchAll` wraps requests in both `pLimit(100)` and `fetchData`'s `Bottleneck(maxConcurrent: 50, minTime: 200ms)`. Since `Bottleneck`'s ceiling (50 concurrent) is tighter than `pLimit`'s (100), the `pLimit` wrapper never actually binds — it's dead weight. `Bottleneck` alone is sufficient.

**Fix:** Remove the `p-limit` dependency and the `limit()` wrapper in `fetchAll`. Let `Bottleneck` inside `fetchData` handle concurrency.

---

### ARCH-2 — `getAllAnchorTags` defined inside the React component — RESOLVED

See "Resolved since 2026-06-23" above.

---

### ARCH-3 — `ref.current` boolean flag is an implicit hidden state — STILL OPEN (original fix no longer sufficient)

**File:** `src/hooks/use-google-search-scrape.ts` (`hasFetchedRef`), consumed in `src/components/App.tsx` (`showLogsTab`, `showLinksTab`, `showCenteredLayout`)

`hasFetchedRef.current` is set to `true` at the start of `fetchAll` and gates whether the Logs/Links tabs are offered at all. The originally proposed fix (`logs.length > 0`) no longer works: `fetchAll` now calls `setLogs([])` at the start of every run, so `logs.length` is `0` both "before the first extraction" and "mid-extraction, log rows not in yet" — two states the UI needs to tell apart (the ref is what lets `showLinksTab` stay true, showing a loading spinner, instead of falling back to the empty state mid-scrape).

**Fix:** If still worth de-implicitizing, replace the ref with explicit reactive state (e.g. `hasFetched` state set via `setHasFetched(true)` alongside `setLogs([])`), rather than trying to derive it from `logs.length`.

---

## Security / Config Practice

### SEC-1 — GA4 credentials hardcoded in source — STILL OPEN

**File:** `src/analytics.ts` (lines 5–6)

`MEASUREMENT_ID` (`G-9S9H43Y54R`) and `API_SECRET` (`g6w2emsLSLuACC3e443xaQ`) are still committed in plain text; `webpack/webpack.common.js` has no `DefinePlugin` wiring for them. While GA4 Measurement Protocol secrets are lower-risk than database credentials, they can be abused to inject false analytics events.

**Fix:**
1. Add `.env` to `.gitignore`.
2. Define values in `.env`:
   ```
   GA_MEASUREMENT_ID=G-9S9H43Y54R
   GA_API_SECRET=g6w2emsLSLuACC3e443xaQ
   ```
3. Inject at build time via webpack `DefinePlugin` in `webpack/webpack.common.js`:
   ```js
   new webpack.DefinePlugin({
     'process.env.GA_MEASUREMENT_ID': JSON.stringify(process.env.GA_MEASUREMENT_ID),
     'process.env.GA_API_SECRET': JSON.stringify(process.env.GA_API_SECRET),
   })
   ```
4. Reference in `src/analytics.ts`:
   ```ts
   const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
   const API_SECRET = process.env.GA_API_SECRET;
   ```

---

## Summary

| ID | Priority | Category | Status | File |
|---|---|---|---|---|
| BUG-1 | High | Bug | Open | `src/utils.ts` |
| BUG-2 | High | Bug | Resolved | `src/validation.ts` |
| CLEAN-1 | Low | Clean-up | Resolved | `src/Untitled-1.ts` |
| CLEAN-2 | Low | Clean-up | Open | `src/logs.ts` |
| CLEAN-3 | Low | Clean-up | Open | `src/components/App.tsx`, `src/components/EmptyState.tsx` |
| ARCH-1 | Medium | Architecture | Open | `src/hooks/use-google-search-scrape.ts`, `src/utils.ts` |
| ARCH-2 | Low | Architecture | Resolved | `src/utils.ts` |
| ARCH-3 | Low | Architecture | Open | `src/hooks/use-google-search-scrape.ts` |
| SEC-1 | Medium | Security | Open | `src/analytics.ts` |
