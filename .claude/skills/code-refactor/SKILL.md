---
name: code-refactor
description: Use when a UI component in src/components/, a top-level logic module in src/ (utils.ts, validation.ts, analytics.ts), or a hook in src/hooks/ of this Chrome extension is over ~250 lines, mixes rendering with chrome.* API calls/state/scraping logic, repeats JSX blocks, or is hard to follow - detects refactor candidates, splits UI into components, extracts stateful logic into hooks, extracts pure logic into existing or new top-level modules, preserves props/state/chrome API/analytics/caching behavior, and verifies with npm run typecheck and npm run lint.
---

# Refactoring Large Components

## Overview

Decompose large files in this Chrome Extension (Manifest V3) **without changing product behavior**. Improve maintainability by separating UI, state, and business logic while preserving the existing public surface: component props, chrome.* API usage, link extraction/validation logic, and analytics events.

Before editing, read [CLAUDE.md](../../../CLAUDE.md) and [doc/technical.md](../../../doc/technical.md) for the architecture (entry points, extension flow, path aliases, key files).

## When to Use

Use when asked to refactor, split, simplify, decompose, or modularize:

- A component in [src/components/](../../../src/components/) — e.g. `App.tsx`, `Links.tsx`, `Actions.tsx`, `Logs.tsx`, `HelpFaq.tsx`.
- A top-level logic module in `src/` — `utils.ts`, `validation.ts`, `analytics.ts` — once it mixes multiple concerns (extraction + validation + analytics all inline, for instance).
- A hook in `src/hooks/`.
- A file mixing rendering, `chrome.*` API calls (`scripting`, `storage`, `sidePanel`, `tabs`), link extraction/validation logic, or analytics event firing all in one place.

**When NOT to use:** `public/manifest.json` changes (permissions/entry points are out of scope); `webpack/*.js` config changes; `src/components/ui/*` shadcn/ui primitives (vendored, excluded from `tsconfig.json`'s `include`/lint scope — don't restructure them, only add new ones via the shadcn CLI convention); `doc/*.md`-only edits (that's the `help-faq-sync` skill's job); cosmetic-only tidying with no real coupling problem.

## Detection Heuristics

Flag a file as a candidate when any apply — and report the specific triggers before editing:

- File over ~250 lines, or a single component/handler function over ~150 lines. (`App.tsx` at ~350 lines and `Actions.tsx`/`Links.tsx` at ~250-270 lines are the current largest files.)
- Render return contains several unrelated sections, dialogs, list rows, tabs, or empty/loading/error states.
- Local state, `chrome.*` API calls, link extraction/validation, and JSX all live in the same component (this is the shape of `App.tsx` today: tab state, `chrome.scripting`/`chrome.storage`/`chrome.sidePanel` calls, `fetchAll`/`validateAllLinks` orchestration, and the render tree all in one file).
- A top-level `src/*.ts` module mixes unrelated concerns — e.g. HTML parsing, HTTP fetching, and CSV conversion all inline (see `utils.ts`), or caching plus HTTP plus status-formatting (see `validation.ts`).
- JSX blocks repeat with only small prop/value differences (e.g. status badge rows, filter buttons).
- Inline callbacks (`onClick`, `useEffect`, promise handlers) contain multi-step behavior — sequencing multiple `fetch`/`axios` calls, updating several `useState` values, driving `chrome.storage.local` reads/writes — that belongs in a hook or helper.
- Many imports from unrelated concerns in one file (rendering + scraping + analytics + caching).

Do not refactor only because a file feels untidy.

## Required Inputs

Run the scan script that ships with this skill to find and rank candidates:

```bash
node .claude/skills/code-refactor/scripts/scan-large-components.mjs
# Override thresholds if needed:
LINE_THRESHOLD=200 MAX_RESULTS=20 node .claude/skills/code-refactor/scripts/scan-large-components.mjs
```

It scans `src/` (skipping `src/components/ui/`), flags `.tsx` files that look like components and `.ts` modules that mix 3+ concerns (state, effects, chrome API, fetch/scrape, validation, analytics, clipboard/CSV, mapping, conditionals), and ranks them by line count plus concern/handler density.

Before editing, confirm: (1) target file(s); (2) whether extraction targets a new/existing component in `src/components/`, a hook in `src/hooks/`, or a pure helper folded into an existing top-level module (`utils.ts`, `validation.ts`, `analytics.ts`) vs. a new flat `src/<purpose>.ts` module; (3) boundaries between the container component, presentational pieces, hooks, and pure helpers; (4) the verification command (`npm run typecheck`, `npm run lint`). If any cannot be inferred safely, ask the user one concise question.

## Target Structure

This is a single-package extension, not a monorepo — there are no feature folders. Everything lives directly under `src/`:

- **UI** — `src/components/<Name>.tsx`, flat, PascalCase (`App.tsx`, `Actions.tsx`, `Links.tsx`, `Logs.tsx`, `Tabs.tsx`, `Header.tsx`, `EmptyState.tsx`, `HelpFaq.tsx`). Split a large component into sibling files in the same folder — use product-concept names, not mechanics.
  - Good: `src/components/LinkStatusBadge.tsx`, `src/components/ValidationProgress.tsx`
  - Avoid: `PartOne.tsx`, `RenderStuff.tsx`, `ExtractedSection.tsx`
- **shadcn/ui primitives** — `src/components/ui/*` (Radix + `class-variance-authority` + `tailwind-merge`). Reuse these; don't hand-roll equivalents. Don't restructure them as part of a refactor.
- **Hooks** — `src/hooks/use-<purpose>.ts`, kebab-case, matching the existing `use-mobile.ts` convention. Use for stateful React logic: multi-step `useState`/`useEffect` sequences, `chrome.storage.local` read/write orchestration, polling/progress tracking.
- **Pure logic** — this repo groups helpers by *domain*, not by generic `lib/` dumping ground:
  - `src/utils.ts` — link extraction/parsing, DOM anchor collection, `fetchData`, CSV conversion.
  - `src/validation.ts` — link health checking, `chrome.storage.local` caching, status color/label helpers.
  - `src/analytics.ts` — GA4 Measurement Protocol client.
  - `src/constants.ts` — shared constants (e.g. `GOOGLE_SEARCH_URL`).
  - If extracted logic clearly belongs to one of these existing concerns, add it there. Only create a new flat `src/<purpose>.ts` module for a genuinely new concern — don't nest a new `lib/` subfolder; `src/lib/utils.ts` is the shadcn-init `cn()` helper file, not a general-purpose location.

Prefer existing project patterns: shadcn/ui `components/ui` primitives, Tailwind classes, `cn` from `@/lib/utils` for merging classNames. This repo is mid-migration from `styled-components` to Tailwind/shadcn (see the side-panel commit) — for genuinely new or extracted UI, prefer Tailwind/shadcn over adding new `styled-components` blocks; only follow the local `styled-components` pattern when doing a narrow, same-file split of code that's already styled-components-based. Do not introduce Redux, Context, React Query, or new state libraries — there are none in this codebase and none are needed.

**Conditional classNames:** always build them with `cn()` from `@/lib/utils` (clsx + tailwind-merge) — never a template literal or ternary string concatenation. `` className={`btn ${isLoading && 'with-loader'}`} `` silently leaks the literal string `"false"` into the class list when the condition is falsy; `cn('btn', isLoading && 'with-loader')` is exactly equivalent when truthy and correct when falsy. Apply this whenever a refactor touches or extracts a component with a conditional/merged `className`, even outside the specific file targeted by the refactor.

## Path Aliases

From `tsconfig.json`:

- `@/*` → `src/*`
- `@components/*` → `src/components/*`
- `@src/*` → `src/*`

Match whichever alias the surrounding file already uses for that target (e.g. `@/components/ui/*` for shadcn primitives, `@src/validation` for logic modules). The `import/order` ESLint rule enforces builtin → external → internal (`@components/**`, `@src/**`) → parent → sibling → index groups, alphabetized within each group — keep new imports consistent with it.

## Refactor Workflow

1. **Read context** — read the target file fully; nearby components/hooks/modules it depends on. Check `git status --short` and avoid touching unrelated user changes.
2. **Build a boundary plan** — what stays in the container component (top-level orchestration, `chrome.*` calls that must stay synchronous with a user gesture); which UI sections become components; which logic becomes a hook/helper; props/params for each extraction; files created/modified.
3. **Preserve behavior exactly** — see the checklist below.
4. **Extract components** — explicit TypeScript props (no `any`); use existing shadcn/ui `components/ui` primitives and Tailwind classes; use `cn` from `@/lib/utils` for any conditional or merged `className` — never a template literal or ternary.
5. **Extract hooks/helpers** — only when it reduces real coupling. Hooks: return a stable typed API, keep dependency arrays correct for `react-hooks/exhaustive-deps`. Helpers: pure, no side effects, no floating promises; don't extract trivial one-liners.
6. **Update imports/exports** — use the alias the surrounding code already uses; keep `import/order` grouping/alphabetization intact; remove unused imports (`unused-imports/no-unused-imports` is an error, not a warning); check for circular imports between the component and its new hooks/helpers.
7. **Verify** — run `npm run typecheck` and `npm run lint` (or `npm run lint:fix`). There is no test suite in this repo (`npm test` fails by design) — don't invent one. For UI-heavy refactors, run `npm run build` then `node server.js` to preview `dist/`, or load `dist/` unpacked in `chrome://extensions/` and manually exercise both the popup and side panel: a Google Search results page (extract → logs → links), a non-Google page with a WhatsApp invite link, link validation (including cached results), and the Links/Logs/Help & FAQs tabs. If verification fails due to the refactor, fix it; if failures are pre-existing and unrelated, report them with context and don't claim a clean result.

## Preserve-Behavior Checklist

- Component props, prop types, and local state names/effect ordering that affect visible behavior.
- `chrome.scripting.executeScript` injection target and the `getAllAnchorTags` function it runs.
- `chrome.storage.local` usage: the `autoValidate` flag, and `validation.ts`'s cache shape (`LinkStatus`/`LinkValidation`/`StorageData`), `cacheVersion` check, and 24-hour TTL.
- `chrome.sidePanel.open()` must stay inside the synchronous click handler (see the comment in `App.tsx` around `currentWindowIdRef`) — an `await` before it can drop the user-gesture requirement.
- `isGoogle()`/`GOOGLE_SEARCH_URL` page-type detection and the branching it drives (Google search scraping vs. direct-page link filtering via `inviteLink()`).
- Concurrency settings: Bottleneck config and `p-limit(100)` in the fetch-all flow — don't change these numbers as a side effect of extraction.
- `cheerio` selectors used for scraping (e.g. `#main_block` in `validation.ts`) and the WhatsApp invite link regex in `inviteLink()`.
- GA4 event names and params fired via `Analytics.fireEvent`/`firePageViewEvent`/`fireErrorEvent` — treat event names as a contract; don't rename, drop, or silently add them.
- The tab/empty-state state machine in `App.tsx` (`showLogsTab`/`showLinksTab`/`showFallback`, `currentTab` transitions).
- The `context: 'popup' | 'sidepanel'` prop and any context-conditional rendering (e.g. the "Open in side panel" button only shown in popup context).
- Loading, empty, disabled, error, validating, and progress-counter states.
- User-visible copy (this repo has no i18n layer — don't add one).

Do not rename public props or exported function signatures unless every reference is updated and `npm run typecheck`/`npm run lint` plus manual verification confirm compatibility.

## Output Format

End with a concise report:

```markdown
## Large File Refactor

**Target:** src/components/<File>.tsx **Reason:** <line count / mixed responsibilities / repeated sections / inline logic>

### Files changed

- src/components/<File>.tsx — now composes extracted components/hooks
- src/components/<Component>.tsx — extracted <section>
- src/hooks/use-<purpose>.ts — extracted <logic> (if applicable)
- src/<module>.ts — extracted <pure logic> into an existing/new module (if applicable)

### Preservation checks

- Props/state flow, chrome.* API usage, link extraction/validation logic, analytics events, loading/empty/error states — all preserved

### Verification

- `npm run typecheck`: clean
- `npm run lint`: clean
- Manual smoke test (dist/ build or dev server): <what was exercised>
```

If no safe refactor is found, report the scanned files and explain why no edit was made.

## Hard Rules

- Never change link extraction/validation behavior (regex, selectors, cache TTL/version, concurrency limits) as part of a cosmetic refactor.
- Never touch `public/manifest.json` or `webpack/*.js` as part of component/module cleanup.
- Never hand-restructure `src/components/ui/*` shadcn primitives.
- Never duplicate business logic (extraction/validation/analytics) in both old and new locations.
- Never leave stale imports, duplicate components, or dead local helpers behind.
- Never rename or drop a GA4 analytics event as a side effect of extracting logic.
- Never skip `npm run typecheck`/`npm run lint` unless the environment blocks it; report the blocker.
- Never build a conditional/merged `className` with a template literal or ternary — always use `cn()` from `@/lib/utils`.

## Related skills

- After refactoring, run the [`code-reviewer`](../code-reviewer/SKILL.md) skill to catch bugs, security, or maintainability issues introduced by the split.
- If the popup UI, its components, or validation/lifecycle behavior changed, run [`help-faq-sync`](../help-faq-sync/SKILL.md) to keep `doc/non-technical.md` accurate.
- Use the `simplify` skill afterward for reuse/efficiency cleanups beyond the structural split.
- Use the `verify` skill or the `run` skill to exercise the refactored flow end-to-end (popup and side panel) before considering the refactor done.
