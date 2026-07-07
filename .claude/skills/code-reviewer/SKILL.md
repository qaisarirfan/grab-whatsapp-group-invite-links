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
4. Run `npm run lint` and `npm run typecheck` after all edits and fix any new lint/type errors introduced (there is no test suite in this repo). Note: webpack itself uses `babel-loader` (not `ts-loader`, despite it sitting in `devDependencies` unused) to transpile `.ts`/`.tsx`, and Babel's TypeScript preset only strips types — it does not type-check. A clean `npm run build` proves nothing about type correctness; only `npm run typecheck` does.
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
| `src/popup/index.tsx` | Just the `createRoot`/render bootstrap — if this file starts growing state or effects, that logic belongs in `src/components/App.tsx` instead |
| `src/components/App.tsx` + `src/hooks/*` | State/effect correctness on popup open (mount-once `useEffect`), `chrome.scripting.executeScript` injected function scoping (`getAllAnchorTags` can't close over module imports), tab-switching logic, in-flight/loading state across async fetch waves. Logic here is split across `use-google-search-scrape.ts`, `use-link-validation.ts`, `use-cached-validations.ts` — check the right hook, not just `App.tsx` |
| `src/background.ts` | Service worker stays side-effect-light (install/update/uninstall URLs only) — no business logic creep |
| `src/components/*.tsx` (excluding `ui/`) | Props typed explicitly, accessibility of buttons/icons, controlled vs uncontrolled inputs, conditional `className` built with `cn()` (not template literals/ternaries), inline `style` used for anything a Tailwind/theme token or existing component variant could express instead (e.g. status colors — prefer reusing `destructive`/`secondary` tokens over new hardcoded hex) |
| `src/components/ui/*` | This is shadcn CLI-scaffolded (`components.json`) — treat as vendored, not hand-written. When components are added/removed here, check reachability: `grep -rohE "@/components/ui/[a-zA-Z-]+" src --include="*.tsx" --include="*.ts" \| grep -v "src/components/ui/"` against `ls src/components/ui`. Unused primitives don't bloat the shipped JS (webpack tree-shakes unreached modules), but Tailwind's content scanner isn't reachability-aware — it still generates CSS for their classes, and their exclusive npm deps (e.g. `recharts`, `cmdk`, `sonner`) sit unused in `package.json`. A 2026-07-07 audit found 45/59 files unused, costing ~117 KiB of dead CSS and 73 unnecessary packages — worth a periodic check, not just a one-time cleanup |
| `src/analytics.ts` | GA4 Measurement Protocol payload shape, `chrome.storage.local`/`chrome.storage.session` client/session ID handling, event names free of reserved GA4 words, no PII in event params |
| `public/manifest.json` | Permissions stay minimal (`activeTab`, `scripting`, `storage`) and `host_permissions` scope is justified — flag any broadening |
| `webpack/*.js` | Both entry points (`background`, `popup`) still resolve, path aliases (`@components/*`, `@src/*`) stay in sync with `tsconfig.json`. Note `ts-loader` sits in `devDependencies` but isn't wired into any webpack config — `babel-loader` does the actual `.ts`/`.tsx` transpilation (types stripped, not checked) |

## Key Project Facts to Keep in Mind

- **Extension type:** Chrome Extension, Manifest V3, two entry points — `src/background.ts` (service worker, no business logic) and `src/popup/index.tsx` (render bootstrap only; the user-facing app itself is `src/components/App.tsx` and its hooks/components).
- **Stack:** React 19 + TypeScript (`strict: true`) + Webpack, built via `npm run build` / `npm run watch`. No test suite (`npm test` is expected to fail). Use `npm run lint` and `npm run typecheck` to surface issues — `npm run build` alone does not type-check (see Fix Pass note above).
- **Design system:** shadcn CLI-scaffolded (`components.json`, style `base-nova`), Tailwind v4 (`src/styles/globals.css` defines oklch light/dark tokens). The styled-components → Tailwind/shadcn migration (mentioned in `CLAUDE.md`) is now complete — there is no remaining `styled-components` usage anywhere in `src/`.
- **Path aliases:** `@components/*` → `src/components/*`, `@src/*` → `src/*` (defined in both `tsconfig.json` and the webpack `TsconfigPathsPlugin`) — flag relative `../../` imports that should use these.
- **Core flow:** popup injects `getAllAnchorTags` into the active tab via `chrome.scripting.executeScript`; on Google Search pages, links are queued for scraping via `fetchAll()` (`axios` + `Bottleneck` + `p-limit`); on other pages, `inviteLink()` filters anchors directly for `chat.whatsapp.com` invite URLs.
- **Validation:** `validateMultipleLinksWithProgress()` (`src/validation.ts`) fetches each invite page, parses `#main_block` with `cheerio` for group name/icon, and caches results in `chrome.storage.local` for 24 hours, gated by `CACHE_VERSION` — any change to `LinkValidation`'s shape must bump `CACHE_VERSION` or stale cache entries will be served with missing/wrong fields.
- **No custom backend:** all scraping happens client-side from the user's browser session; the only outbound service is Google Analytics (GA4 Measurement Protocol) in `src/analytics.ts`. Review any new network calls for the same rate-limiting and timeout discipline already established (`Bottleneck`, `AbortController` timeouts, `axios-retry`).
- **Permissions surface:** `manifest.json` grants `activeTab`, `scripting`, `storage`, and all-URL `host_permissions` — any change here materially widens what the extension can access and warrants extra scrutiny.
- **Lint stack:** ESLint (`eslint-config-airbnb`-derived, `@typescript-eslint`, `react-hooks`, `jsx-a11y`, `import/order`, `unused-imports`) + Prettier, enforced via `npm run lint`. No pre-commit hook is configured in this repo — review must catch style/import-order issues that CI/hooks would elsewhere.

## Related skills

- Popup UI, link validation, background lifecycle, or manifest permission changes → run [`help-faq-sync`](../help-faq-sync/SKILL.md) afterward to keep `doc/non-technical.md` accurate.
- Commit/PR message drafting for staged changes → [`staged-commit-pr`](../staged-commit-pr/SKILL.md) skill.
