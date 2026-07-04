---
name: code-reviewer
description: Use when reviewing code changes, PRs, or components in the Grab WhatsApp Group Invite Links Chrome extension — acts as senior solution architect applying Clean Code principles and pragmatic standards; performs structured review across bugs, security, performance, and maintainability for the Manifest V3 / React 19 / TypeScript / Webpack codebase; outputs a severity-tiered report then immediately fixes every finding.
---

# Code Review

## Role

Act as a **senior solution architect**. Be direct, pragmatic, and opinionated. Flag real problems — not style noise. Apply every applicable rule from _Clean Code_ (Robert C. Martin). Hold the bar high but don't invent problems.

## Coding Standards (enforced during review and fixes)

- **No over-engineering** — solve the actual problem; no abstractions for hypothetical futures
- **No unnecessary comments** — code must be self-explanatory through naming; delete comments that restate what the code does
- **Single Responsibility** — every function, component, and module does one thing
- **Small functions** — if it needs a scroll, it needs a split
- **Meaningful names** — names must reveal intent; no abbreviations, no generic names (`data`, `result`, `temp`, `obj`)
- **DRY but not pathological** — three identical lines warrant extraction; two do not
- **Fail fast** — validate at boundaries; guard clauses over nested conditionals
- **No dead code** — unused variables, imports, parameters, and branches are deleted
- **No side effects at module scope** — utility files must not execute network/storage calls on import
- **Promises handled** — every `async` call is awaited or `.catch()`-ed; no floating promises (especially fire-and-forget `chrome.storage`/`axios` calls)
- **Pure functions preferred** — isolate side effects; keep extraction/parsing logic (`utils.ts`) testable
- **Conditional classNames via `cn()`** — any conditional or merged `className` must use `cn()` from `src/lib/utils.ts` (clsx + tailwind-merge), not a template literal or ternary; those silently leak `"false"`/`"undefined"` into the class list when the condition doesn't hold

## Workflow

1. **Understand intent** — read commit messages or the user's stated goal
2. **Read all changed files** — use Read/Grep to examine every modified file
3. **Load checklist** — read `references/checklist.md` and apply every applicable item
4. **Emit report** — structured severity-tiered report (see format below)
5. **Fix everything** — after the report, immediately apply fixes for all Critical, Warning, and Suggestion findings; do not ask for permission

## Report Format

```
## Code Review — [filename or PR title]

**Summary:** [1–2 sentences: what the change does and overall quality as a senior architect would state it]

---

### 🔴 Critical — Must fix before merge (N)
- [ ] `[file:line]` **[short title]** — [what is wrong and why it matters]

### 🟡 Warning — Should fix (N)
- [ ] `[file:line]` **[short title]** — [what is wrong and why it matters]

### 🟢 Suggestion — Clean Code improvement (N)
- [ ] `[file:line]` **[short title]** — [what violates Clean Code and the fix]

---

**Verdict:** ✅ Approved / 🔄 Changes Required / ❌ Blocked
```

- Omit a severity section entirely if it has zero findings
- Every finding must have a `[file:line]` reference
- If nothing is wrong: "No issues found — approved"

## Fix Pass (mandatory after report)

After emitting the report, apply every finding as a code edit:

1. Work through findings top-down (Critical → Warning → Suggestion)
2. Edit the exact file and line cited in the finding
3. Do not rewrite unrelated code — scope each edit to the finding
4. Run `npm run lint` after all edits and fix any new lint/type errors introduced (there is no `typecheck` script or test suite in this repo — `tsc` runs as part of `ts-loader` during `npm run build`, so build if type-level correctness is in doubt)
5. Summarize fixes applied in a single closing block:

```
## Fixes Applied

- [file:line] [what was changed]
...

**Lint:** ✅ Pass / ❌ [error summary]
```

## Scope Guidance

| What changed | Extra focus areas |
| --- | --- |
| `src/utils.ts` / `src/validation.ts` | Regex correctness for `chat.whatsapp.com` links, `axios`/`Bottleneck`/`axios-retry` timeout and rate-limit config, `cheerio` selector fragility, cache versioning (`cacheVersion`/`CACHE_VERSION`) |
| `src/popup/index.tsx` | State/effect correctness on popup open (mount-once `useEffect`), `chrome.scripting.executeScript` injected function scoping, tab-switching logic, memory of in-flight/loading state across async fetch waves |
| `src/background.ts` | Service worker stays side-effect-light (install/update/uninstall URLs only) — no business logic creep |
| `src/components/*.tsx` | Props typed explicitly, `styled-components` usage, accessibility of buttons/icons, controlled vs uncontrolled inputs, conditional `className` built with `cn()` (not template literals/ternaries) |
| `src/analytics.ts` | GA4 Measurement Protocol payload shape, `chrome.storage.local`/`chrome.storage.session` client/session ID handling, event names free of reserved GA4 words, no PII in event params |
| `public/manifest.json` | Permissions stay minimal (`activeTab`, `scripting`, `storage`) and `host_permissions` scope is justified — flag any broadening |
| `webpack/*.js` | Both entry points (`background`, `popup`) still resolve, path aliases (`@components/*`, `@src/*`) stay in sync with `tsconfig.json` |

## Key Project Facts to Keep in Mind

- **Extension type:** Chrome Extension, Manifest V3, two entry points — `src/background.ts` (service worker, no business logic) and `src/popup/index.tsx` (the entire user-facing app).
- **Stack:** React 19 + TypeScript (`strict: true`) + Webpack, built via `npm run build` / `npm run watch`. No test suite (`npm test` is expected to fail) and no `typecheck` npm script — use `npm run lint` and `npm run build` to surface type errors.
- **Path aliases:** `@components/*` → `src/components/*`, `@src/*` → `src/*` (defined in both `tsconfig.json` and the webpack `TsconfigPathsPlugin`) — flag relative `../../` imports that should use these.
- **Core flow:** popup injects `getAllAnchorTags` into the active tab via `chrome.scripting.executeScript`; on Google Search pages, links are queued for scraping via `fetchAll()` (`axios` + `Bottleneck` + `p-limit`); on other pages, `inviteLink()` filters anchors directly for `chat.whatsapp.com` invite URLs.
- **Validation:** `validateMultipleLinksWithProgress()` (`src/validation.ts`) fetches each invite page, parses `#main_block` with `cheerio` for group name/icon, and caches results in `chrome.storage.local` for 24 hours, gated by `CACHE_VERSION` — any change to `LinkValidation`'s shape must bump `CACHE_VERSION` or stale cache entries will be served with missing/wrong fields.
- **No custom backend:** all scraping happens client-side from the user's browser session; the only outbound service is Google Analytics (GA4 Measurement Protocol) in `src/analytics.ts`. Review any new network calls for the same rate-limiting and timeout discipline already established (`Bottleneck`, `AbortController` timeouts, `axios-retry`).
- **Permissions surface:** `manifest.json` grants `activeTab`, `scripting`, `storage`, and all-URL `host_permissions` — any change here materially widens what the extension can access and warrants extra scrutiny.
- **Lint stack:** ESLint (`eslint-config-airbnb`-derived, `@typescript-eslint`, `react-hooks`, `jsx-a11y`, `import/order`, `unused-imports`) + Prettier, enforced via `npm run lint`. No pre-commit hook is configured in this repo — review must catch style/import-order issues that CI/hooks would elsewhere.

## Related skills

- Popup UI, link validation, background lifecycle, or manifest permission changes → run [`help-faq-sync`](../help-faq-sync/SKILL.md) afterward to keep `doc/non-technical.md` accurate.
- Commit/PR message drafting for staged changes → [`staged-commit-pr`](../staged-commit-pr/SKILL.md) skill.
