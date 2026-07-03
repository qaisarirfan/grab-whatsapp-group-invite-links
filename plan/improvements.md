# Future Improvement Plans

Identified during code review on 2026-06-23. Ordered by priority.

---

## Bug Fixes

### BUG-1 — `convertToCsv` crashes and may produce empty files

**File:** `src/utils.ts` (lines 88–93)

**Problems:**
1. `pom` (the hidden `<a>` element) is never appended to `document.body` before `.click()` is called. `document.body.removeChild(pom)` always throws a `NotFoundError`.
2. `StreamParser` is event-driven. The `Blob` is constructed synchronously right after `parser.write()` calls, before the parser has flushed all data. The resulting CSV may be empty.

**Fix:**
- Append `pom` to the DOM before clicking, then remove it after.
- Move the `Blob` creation and download trigger inside the `onEnd` callback so the full CSV string is available.

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

### BUG-2 — `validateLink` status code checks are unreachable

**File:** `src/validation.ts` (lines 44–48)

**Problem:**
With `mode: 'no-cors'`, the browser always returns an opaque response with `status === 0`. The checks for `404`, `410`, and `429` can never be true. All reachable servers are returned as `'valid'`, regardless of their actual HTTP status. The existing code comment (line 38) acknowledges this.

**Options (pick one):**
- **Option A (minimal):** Remove the dead status-code branches and document explicitly that opaque = server reachable = `'valid'` by convention.
- **Option B (correct):** Route validation requests through the background service worker using `chrome.runtime.sendMessage` so they are not subject to CORS restrictions and real status codes are available.

---

## Dead Code Removal

### CLEAN-1 — Delete `src/Untitled-1.ts`

Entirely commented-out scratch code. No imports reference it. Safe to delete.

---

### CLEAN-2 — Delete `src/logs.ts`

File contains only `export default [];`. Nothing in the codebase imports it. Safe to delete.

---

### CLEAN-3 — `otherLinks` state is collected but never shown

**File:** `src/popup/index.tsx` (line 51, line 220–225)

`otherLinks` is populated when a non-Google page has no WhatsApp links, but only its `.length` is shown to the user. The links themselves are never rendered.

**Options (pick one):**
- Render the links in a collapsible section so the user can inspect what was found on the page.
- Drop the state entirely and replace with a simple counter variable if only the count matters.

---

## Architecture

### ARCH-1 — Redundant concurrency limiting

**Files:** `src/popup/index.tsx` (line 170), `src/utils.ts` (lines 45–48)

`fetchAll` wraps requests in both `pLimit(50)` and `Bottleneck(maxConcurrent: 50, minTime: 200ms)`. These enforce the same ceiling. `Bottleneck` alone is sufficient.

**Fix:** Remove the `pLimit` import and the `limit()` wrapper in `fetchAll`. Let `Bottleneck` inside `fetchData` handle concurrency.

---

### ARCH-2 — `getAllAnchorTags` defined inside the React component

**File:** `src/popup/index.tsx` (lines 58–74)

The function is serialised and injected into the page via `chrome.scripting.executeScript`. It does not close over any React state, so defining it inside the component serves no purpose — it is re-created on every render unnecessarily.

**Fix:** Move `getAllAnchorTags` outside the `Popup` component (module scope).

---

### ARCH-3 — `ref.current` boolean flag is an implicit hidden state

**File:** `src/popup/index.tsx` (line 44, line 167)

`ref.current` is set to `true` at the start of `fetchAll` and gates several UI branches to determine "has extraction been run". This information is already derivable from `logs.length > 0`, which is reactive state.

**Fix:** Replace `ref.current` checks with `logs.length > 0`. Remove the `ref`.

---

## Security / Config Practice

### SEC-1 — GA4 credentials hardcoded in source

**File:** `src/analytics.ts` (lines 5–6)

`MEASUREMENT_ID` (`G-9S9H43Y54R`) and `API_SECRET` (`g6w2emsLSLuACC3e443xaQ`) are committed in plain text. While GA4 Measurement Protocol secrets are lower-risk than database credentials, they can be abused to inject false analytics events.

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

| ID | Priority | Category | File |
|---|---|---|---|
| BUG-1 | High | Bug | `src/utils.ts` |
| BUG-2 | High | Bug | `src/validation.ts` |
| CLEAN-1 | Low | Clean-up | `src/Untitled-1.ts` |
| CLEAN-2 | Low | Clean-up | `src/logs.ts` |
| CLEAN-3 | Low | Clean-up | `src/popup/index.tsx` |
| ARCH-1 | Medium | Architecture | `src/popup/index.tsx`, `src/utils.ts` |
| ARCH-2 | Low | Architecture | `src/popup/index.tsx` |
| ARCH-3 | Low | Architecture | `src/popup/index.tsx` |
| SEC-1 | Medium | Security | `src/analytics.ts` |
