---
name: documentation-sync
description: Incrementally syncs README.md, doc/overview.md, doc/technical.md, and plan/*.md with recent code changes in this Chrome extension. Detects what changed in git, maps changes to affected docs, and updates only what is stale — without rewriting everything. Defers doc/non-technical.md and HelpFaq.tsx to help-faq-sync.
user-invocable: true
---

# Documentation Sync

Keep `README.md`, `doc/overview.md`, `doc/technical.md`, and `plan/*.md` in sync with recent code changes. **Diff-first:** detect what changed, update only stale sections.

**Boundary with other skills:**
- `doc/non-technical.md` (end-user guide/FAQ) and `src/components/HelpFaq.tsx` are owned by `help-faq-sync` — don't edit them here, just flag in the report that it should be run.
- Use `documentation-reviewer` instead when docs are missing entirely, not just stale.

## Phase 1 — Detect Scope

Pick a mode (default **Incremental**):

| Mode | Command |
| --- | --- |
| **Incremental** (default) | `git diff --staged --name-only && git log --oneline -5 && git diff HEAD~5 --name-only` |
| **Release** (before bumping version) | Find the last version-bump commit — `git log --oneline -- package.json public/manifest.json \| head -5` — then `git diff <sha>..HEAD --name-only`. This repo has no git tags and no CHANGELOG.md; `package.json`'s `version` and `public/manifest.json`'s `version` are the source of truth and must match. |
| **Full drift** (periodic) | `git ls-files` |

If no changes, stop and report "Docs are current".

## Phase 2 — Map Changes → Affected Docs

Only touch docs in the matching row. Skip everything else.

| Changed | Docs affected |
| --- | --- |
| New/changed component in `src/components/*.tsx` or hook in `src/hooks/*.ts` | `README.md` Features, `doc/overview.md` (Key features table, Project structure tree) — also flag `help-faq-sync` if it's popup-facing |
| New export or changed signature in `src/utils.ts`, `src/validation.ts`, `src/analytics.ts`, `src/constants.ts` | `doc/technical.md` Module reference tables |
| New `LinkStatus` value or changed caching/validation behavior in `src/validation.ts` | `doc/technical.md` Types section — also flag `help-faq-sync` (badge legend + FAQ) |
| `public/manifest.json` permissions changed | `doc/overview.md` Extension permissions table — also flag `help-faq-sync` |
| `package.json` scripts changed | `README.md` Build/Setup sections, `doc/overview.md` Build & development section |
| `package.json` dependency added/removed/swapped | `doc/overview.md` Tech stack table |
| `.env.example` or analytics config changed | `README.md` Setup section |
| New path alias in `tsconfig.json` / `webpack/*.js` | `doc/technical.md` Path aliases table |
| New/moved/deleted file or folder under `src/` | `doc/overview.md` Project structure tree |
| A `plan/*.md` feature is now implemented in `src/` | Delete the `plan/*.md` file; remove its row from `README.md`/`doc/overview.md` "Planned features" table |
| New `plan/*.md` file added | `README.md` and `doc/overview.md` "Planned features" tables (add a row linking to it) |
| Breaking change (removed permission, removed feature, changed data shape) | `README.md` warning, `doc/overview.md` note — this repo has no CHANGELOG.md; do not create one unless explicitly asked |
| Bug fix with no documented-behavior change | none — skip (no CHANGELOG.md exists here) |
| Chore/lint/internal refactor (webpack internals, concurrency tuning, ref-to-state swaps) | none — skip |

## Phase 3 — Read Source + Affected Docs

Read only the changed source files and the affected docs. Note renames, removed exports, new params, changed signatures, new permissions.

## Phase 4 — Surgical Updates

Update only stale sections. Preserve existing tone/style.

**README.md** — Features list matches shipped features, Setup section's env vars match `.env.example`/`src/analytics.ts`, Build commands match `package.json` `scripts` exactly (`watch`, `build`, `clean`, `style`, `lint`, `lint:fix`, `typecheck` — no `test`), Planned features table matches existing `plan/*.md` files, Further reading links stay valid. No speculative ("coming soon") content outside the Planned features table.

**doc/overview.md** — Key features table matches shipped behavior, Project structure tree matches actual `src/`/`public/`/`webpack/` layout, Tech stack table matches `package.json` dependencies, Extension permissions table matches `public/manifest.json`, data-flow diagrams (Bulk extract / Validation) match current `App.tsx`/hooks orchestration, Build & development section matches `package.json` scripts, Planned features table matches existing `plan/*.md` files.

**doc/technical.md** — Module reference tables (exports, signatures, purpose) match actual code in `src/utils.ts`, `src/validation.ts`, `src/analytics.ts`, `src/constants.ts`, `src/background.ts`. Types section matches `LinkStatus`/`LinkValidation` shapes. Path aliases table matches `tsconfig.json`. Entry points table matches webpack config.

**plan/*.md** — When a plan's feature is confirmed fully implemented in `src/` (not partially), delete the file — this project's convention is that shipped plans are removed, not archived. Never delete a plan file for a feature that's only partially shipped.

**doc/non-technical.md / src/components/HelpFaq.tsx** — Do not edit. If the diff touches popup UI, `src/validation.ts`, `src/background.ts`, or `public/manifest.json`, note in the report that `help-faq-sync` should be run.

## Phase 5 — Validate

- Scripts named in `README.md`/`doc/overview.md` exist verbatim in `package.json` `scripts`
- Env vars named in `README.md` are actually read in `src/analytics.ts`/`.env.example`
- Module reference tables in `doc/technical.md` match real exports (spot-check with `grep -n "^export"` on the relevant file)
- Project structure tree in `doc/overview.md` matches `find src public webpack -maxdepth 2`
- Permissions table in `doc/overview.md` matches `public/manifest.json`
- Planned features tables only list `plan/*.md` files that still exist
- `package.json` version and `public/manifest.json` version still match (Release mode)
- No CHANGELOG.md entries were invented — this repo doesn't have one

## Phase 6 — Report

```
## Sync Report — <mode>
Commits: <shas>

Updated:
- doc/overview.md — Key features table, Project structure tree
- README.md — Features section

Checked, no changes needed:
- doc/technical.md

Flagged for help-faq-sync:
- src/components/Actions.tsx changed (new button) — doc/non-technical.md and HelpFaq.tsx may need updates

Removed:
- plan/feature-x.md (shipped in src/, per project convention)
```

## Guardrails

- Evidence-based: every update grounded in actual code
- Surgical edits only — never rewrite accurate sections
- Never invent a CHANGELOG.md entry or file — this repo doesn't keep one
- Never edit `doc/non-technical.md` or `HelpFaq.tsx` — that's `help-faq-sync`'s job, just flag it
- Never delete a `plan/*.md` file unless its feature is fully implemented in `src/`, not partially
- Never remove documented features without confirming removal in code
- Never touch docs outside the Phase 2 mapping
