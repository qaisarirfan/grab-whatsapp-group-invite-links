---
name: help-faq-sync
description: Use when the popup UI, its components, link validation logic, background/lifecycle behavior, or manifest permissions change - or to proactively audit Help/FAQ coverage. Builds a full inventory of popup states, buttons, link status badges, tabs, and edge cases, detects undocumented behavior, and keeps doc/non-technical.md (the end-user guide + FAQ) accurate and complete, enforcing a coverage quality gate.
---

# Help FAQ Sync

## Mission

Guarantee that **no popup mode, state, button, action, link status, permission, or edge case is missing from the end-user guide** (`doc/non-technical.md`). This skill is proactive: it discovers the real behavior of the popup and background scripts, diffs it against that doc, and writes the missing guidance — it does not only document what was explicitly requested.

Two non-negotiable boundaries keep this honest:

1. **Discover, never invent.** Document only behavior that exists in `src/`. This project keeps its roadmap in `plan/*.md` (e.g. community/channel link types in `plan/feature-community-channel-links.md`). Those are proposals, not shipped behavior. Before documenting anything a `plan/` file describes, confirm it is actually implemented in `src/`; if it isn't, leave it out of the doc and record it in the coverage report as "planned, not shipped." Once a plan ships, its file is deleted rather than left to rot — e.g. `plan/feature-deep-link-validation.md` (group name/icon validation) shipped and was removed; don't expect every shipped feature to still have a corresponding plan doc.
2. **Comprehensive does not mean noisy.** Every popup state and action must be _accounted for_, but a cosmetic detail (sticky action-bar positioning, a spinner's shape, hover colour) can be "covered by its parent action" rather than getting its own FAQ entry. Nothing is silently skipped; each surface is either documented directly or explicitly mapped to where it is covered.

## Critical Guidelines

To keep the guide trustworthy, inspect `src/popup/`, `src/components/`, `src/background.ts`, `src/validation.ts`, and `public/manifest.json` before editing content. Do not update the guide from memory, commit messages, or `plan/*.md` alone — plans describe intent, not what shipped.

This project has **no in-app Help UI and no localization** — it's a single popup with no i18n library and no `help/` screens. All Help and FAQ content lives in plain markdown at `doc/non-technical.md`, which end users read directly (e.g. on GitHub), not something rendered inside the extension. Do not invent an i18n key structure, a rendered Help screen, or a translation pass — none of that exists in this codebase.

To keep the target audience clear, write for someone who just installed a Chrome extension to find WhatsApp group invite links — not a developer. Use short sentences and concrete steps. Avoid implementation terms such as axios, Bottleneck, cheerio, p-limit, Manifest V3, service worker, React state, or regex unless the user truly needs that word.

## When to Use

Use this skill:

- after changes to `src/popup/index.tsx` (new state, new mode, new render branch)
- after changes to any `src/components/*.tsx` (new button, new badge, new table column, new tab)
- after changes to `src/validation.ts` (a new `LinkStatus` value, new caching/timeout behavior)
- after changes to `src/background.ts` (install/update/uninstall behavior) or `public/manifest.json` (a new permission)
- as a **periodic coverage audit**, even with no specific change in mind, to catch behavior that shipped without a doc update

Skip only for internal-only refactors with no user-visible effect (e.g. concurrency/rate-limiting internals in `src/utils.ts`/`src/hooks/use-google-search-scrape.ts`, or a ref-to-state swap that doesn't change rendered behavior), webpack/build config changes, `src/analytics.ts` internals that add no new user-visible behavior, dead/unused files, formatting-only changes, or tests (this project has none — `npm test` fails by design per `CLAUDE.md`).

## How Help Renders (the data model you must map onto)

There is no in-app renderer here — Help and FAQ are both plain prose in one markdown file. Comprehensive coverage is expressed **through its existing sections**, not by inventing new files, key structures, or formats.

| Primitive | Location in `doc/non-technical.md` | Purpose |
| --- | --- | --- |
| App intro | `## What does this extension do?` | Explains the two operating modes in plain terms |
| Install steps | `## How to install` | Ordered, Chrome-specific steps |
| Usage walkthrough | `## How to use it` (per mode: regular webpage / Google Search) | Ordered steps per mode |
| Action reference | `## What the buttons do` | One row per button that exists in `src/components/Actions.tsx`, `Links.tsx`, `Logs.tsx`, or the inline extract button in `index.tsx` |
| Status reference | `## Link status badges` | One row per `LinkStatus` value in `src/validation.ts` |
| Logs behavior | `## Logs tab` | Progress counter, per-URL error display, CSV export — Google Search mode only |
| Privacy | `## Privacy note` | What leaves the browser (page fetches, GA4 analytics) and what doesn't |
| FAQ | `## Frequently Asked Questions` (add this section if missing — it does not exist yet) | Troubleshooting and edge-case questions, phrased as a user would ask them |

If `doc/non-technical.md` ever grows unwieldy, splitting the FAQ into its own `doc/faq.md` (linked from `doc/overview.md`'s "Further reading" table) is a reasonable future step — but do not fragment it preemptively while the file is still short.

## Phase 1 — Build the surface inventory

Enumerate the **entire** user-facing behavior from source before writing anything.

| Surface class | Source of truth | Discover with |
| --- | --- | --- |
| Popup states & modes | `src/popup/index.tsx` | `rg -n "useState|isGoogleSearchPage|currentTab|ref.current" src/popup/index.tsx` |
| Buttons & actions | `src/components/Actions.tsx`, `src/components/Links.tsx`, `src/components/Logs.tsx`, `src/popup/index.tsx` | `rg -n "onClick=|<button|<ExtractButton" src/components src/popup` |
| Tabs | `src/components/Tabs.tsx` | `rg -n "tabs=\[" src/popup/index.tsx` |
| Link statuses / badges | `src/validation.ts` | `rg -n "LinkStatus|getStatusColor|getStatusLabel" src/validation.ts` |
| Extension lifecycle (install/update/uninstall) | `src/background.ts` | `rg -n "onInstalled|setUninstallURL" src/background.ts` |
| Permissions | `public/manifest.json` | `rg -n "permissions|host_permissions" public/manifest.json` |
| User-triggered analytics events (cross-check for "what can the user actually do") | `src/analytics.ts` call sites | `rg -n "Analytics.fireEvent" src/popup src/components` |
| Existing Help/FAQ coverage | `doc/non-technical.md` | Read the file directly — it is short enough to read in full |
| Planned-but-unshipped features | `plan/*.md` | Read, then cross-check every claim against `src/` before trusting it |

Deep-dive sources when a specific domain changed:

| Domain | Inspect |
| --- | --- |
| Link extraction & regex | `src/utils.ts` (`inviteLink`, `extractWhatsappLinks`, `isValidURL`); roadmap only — `plan/feature-community-channel-links.md` |
| Google Search bulk scrape | `src/popup/index.tsx` (`fetchAll`, `getWhatsappLink`, `getAllAnchorTags`), `src/utils.ts` (`fetchData`) |
| Link validation & caching | `src/validation.ts` |
| Export (copy/CSV) | `src/utils.ts` (`convertToCsv`, `copyToClipboard`), `src/components/Actions.tsx`, `src/components/Logs.tsx` |
| Extension lifecycle & permissions | `src/background.ts`, `public/manifest.json` |
| Product framing (cross-check only, not the Help source of truth) | `doc/overview.md`, `doc/technical.md` |

Then **diff**: list every popup state, button, badge, and permission, mark which are already covered in `doc/non-technical.md`, and flag the gaps. The gaps are the work.

## Phase 2 — Coverage matrix (per surface)

| Required dimension | Where it lives in this doc |
| --- | --- |
| What the extension does, in plain terms | `## What does this extension do?` |
| Install steps | `## How to install` |
| Per-mode walkthrough (regular page vs Google Search) | `## How to use it` |
| Every button's effect | A row in `## What the buttons do` |
| Every `LinkStatus` value | A row in `## Link status badges` |
| Empty / loading / error / rate-limited states | FAQ entry whenever the user's next action differs by state ("Why does it say there's no WhatsApp link on this page?", "Why is a link marked Limited?") |
| Permissions (`activeTab`, `scripting`, `storage`, host permissions) | `## Privacy note` or a dedicated FAQ entry — explain *why*, not the manifest keys |
| Install / update / uninstall behaviour (opens an external onboarding/feedback page) | Mention in the guide if it would surprise a user (a new tab opens on install/update); do not fabricate content for the external blogspot pages themselves — they live outside this repo |
| Validation caching (24 hours) | FAQ entry ("Why didn't it re-check a link I just validated?") |
| Copy failures (clipboard permission denied resets the button silently) | FAQ entry — this is a real silent-failure edge case in `Actions.tsx`'s `handleCopy` |
| Tips (e.g. the `site:chat.whatsapp.com` Google search trick already in the doc) | Usage walkthrough or FAQ |
| Related sections | Cross-reference inside the answer text |

The install → detect mode → extract/scan → validate → export workflow must read as an **ordered sequence** in `## How to use it`.

## FAQ generation rules

For every button, state, badge, or behavior, generate FAQs that answer what a user would actually ask, drawn from this set (include what applies, skip what doesn't):

1. What is this?
2. Why would I use it?
3. How do I use it?
4. What happens if nothing is found or it fails?
5. Can I redo it (e.g. "Extract again")?
6. What should I do if a link looks wrong (Expired / Invalid / Limited)?
7. Where can I find related information?
8. Does this affect my privacy or send data anywhere?

Add state and edge-case FAQs wherever the answer changes by state (no links found, extraction in progress, validation rate-limited, copy failed silently). Phrase questions as a user would type them into a search bar; give the action, the result, and any important caveat in 1–3 short sentences.

## Phase 3 — Generate and update content

1. Name each user-visible change in plain terms ("links now show an Expired badge", not "added a `LinkStatus` enum value").
2. Update `## How to install` / `## How to use it` only when the actual ordered steps changed.
3. Update `## What the buttons do` and `## Link status badges` to match every button/status currently in code — add missing rows, remove rows for buttons/statuses that no longer exist.
4. Add or revise FAQ entries per the generation rules for every changed or newly discovered behavior, state, or edge case.
5. Keep `## Privacy note` accurate to what `src/analytics.ts`, `src/utils.ts` (`fetchData`), and `public/manifest.json` actually do — this is the user's only visibility into a broad-host-permission extension, so treat it as trust-sensitive.
6. This project has no localization. Do not add translation steps or an i18n pass.
7. If `doc/overview.md` or `doc/technical.md` go stale (feature tables, module lists, permission tables), update them directly. There is no separate `update-docs` skill installed in this repo — this skill owns the whole `doc/` folder's user- and developer-facing accuracy unless the user says otherwise.

## Quality Gate (blocking)

Do **not** finish until every check passes. For each, either confirm coverage or record an explicit, justified exclusion — silence is failure.

- [ ] Every popup render branch in `src/popup/index.tsx` (loading · Google-not-yet-extracted · Google-with-tabs · non-Google-with-links · non-Google-empty) has a corresponding walkthrough step or an explicit "covered by parent mode" note.
- [ ] Every button in `Actions.tsx`, `Links.tsx`, `Logs.tsx`, and the inline `ExtractButton` in `index.tsx` has a row in `## What the buttons do`.
- [ ] Every `LinkStatus` value (`pending`, `valid`, `expired`, `invalid`, `rate-limited`) has a row in `## Link status badges`.
- [ ] Every permission in `public/manifest.json` is explained somewhere the user will actually read (privacy note or FAQ).
- [ ] The Logs tab's behavior (progress counter, per-URL error display, CSV export) is documented.
- [ ] Validation's 24-hour cache behavior is documented.
- [ ] At least one FAQ entry exists for: the empty-result state, an extraction error, a rate-limited/expired validation result, and privacy/analytics.
- [ ] No `plan/*.md` feature is documented as shipped unless verified present in `src/`.
- [ ] `doc/overview.md`'s feature table and "Further reading" links still match reality.

Finish by emitting a **coverage report** with four lists: surfaces documented this pass · surfaces covered by a parent (name the parent) · surfaces intentionally excluded (with reason) · surfaces named in `plan/*.md` but **not present in code** (do not document these — note them as roadmap only).

## Content Rules

| Content | Rule |
| --- | --- |
| App intro | Explain both modes (regular-page scan vs Google Search bulk extract) and that everything runs from the user's own browser |
| Install steps | Chrome-specific, ordered, assume Developer Mode is unfamiliar |
| Usage walkthrough | One ordered sequence per mode; state the trigger (opening the popup) and the outcome |
| Button reference | Button name, what it does, in one line |
| Badge reference | Badge label, colour, meaning, in one line |
| FAQ question | Phrase as the user would ask it |
| FAQ answer | Action, result, and any important caveat in 1–3 short sentences |
| States & errors | Tell the user what to do next, not what threw internally |
| Privacy | Be explicit and honest about what leaves the browser (page fetches to scraped URLs, anonymous GA4 events) — this doc is the user's only visibility into that |
| Tone | Calm, clear, plain language, never implementation-first |

## Future-Proofing

On every run, treat discovery as the primary job:

1. Scan `src/popup/`, `src/components/`, `src/validation.ts`, `src/background.ts`, and `public/manifest.json` for new states, buttons, statuses, or permissions.
2. Diff against `doc/non-technical.md`'s sections to detect undocumented behavior.
3. Generate the missing walkthrough steps, table rows, and FAQ entries.
4. Update existing entries when behavior changed (e.g. a `LinkStatus` gains a new value, a button's label changes).
5. Prevent stale content: if a row or FAQ entry describes removed or changed behavior, fix or delete it. Confirm any known dead code stays undocumented — it was never user-facing.

## Pressure Checks

Before finalizing, test the draft against these scenarios:

- A new link type ships (community/channel links from `plan/feature-community-channel-links.md` actually land in `src/utils.ts`): it needs a badge/table update, a usage-walkthrough update, and an FAQ entry if it changes what the user sees.
- Group name/icon-after-validation already shipped (`src/validation.ts`'s `name`/`iconUrl` fields, rendered in `Links.tsx`): this is a good candidate for a coverage audit right now — check whether `## Link status badges`, the usage walkthrough, and the privacy note already mention that validation now scrapes and displays the group's name and photo, since that's a new data flow worth calling out if it isn't there yet.
- A `ref.current` flag gating tab visibility is replaced by reactive state (no behavior change intended): the doc shouldn't need edits — but re-run discovery to confirm the render branches still match what's documented.
- A new permission is added to `public/manifest.json` (e.g. `notifications`): explain why in the privacy note before it ships confusion.
- The onboarding tab URL in `src/background.ts` changes: note in the coverage report that the destination itself is out of this repo's scope, but confirm `doc/non-technical.md` doesn't describe a stale install flow.
- A new `LinkStatus` value is added (e.g. `'unreachable'`): it needs a badge-table row and, if the meaning isn't obvious, an FAQ entry.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Documenting only the requested change | Run full discovery; the requested change is the trigger, not the scope. |
| Treating a `plan/*.md` proposal as shipped | Cross-check against `src/` before writing a single word about it. |
| Adding jargon (axios, Bottleneck, cheerio, regex, Manifest V3, service worker) | Rewrite in terms of what the user sees and does. |
| Inventing an i18n/localization pass | This project has no i18n — don't add one. |
| Inventing in-app Help screens | This project has no in-app Help renderer — all content lives in `doc/non-technical.md`. |
| One FAQ per cosmetic detail | Cover trivial details under the parent action/state; reserve FAQs for real user questions. |
| Copying internal `plan/*.md` bug descriptions into the FAQ | Those are internal bug fixes, not user-facing behavior — skip unless the bug is currently user-visible. |
| Leaving the privacy note stale | Re-check it against `src/analytics.ts` and `src/utils.ts`'s `fetchData` every time host behavior changes. |
| Assuming an `update-docs`/i18n/translation skill exists in this repo | It doesn't — this skill owns `doc/` end to end. Check `.claude/skills/` if unsure what else is installed. |

## Verification

This project has no test suite, no `npm run lint`, and no `npm run typecheck` script (`CLAUDE.md` confirms `npm test` fails by design). The only applicable automated check is formatting:

```bash
npm run style   # Prettier formats doc/*.md alongside source files
```

After editing, re-read `doc/non-technical.md` end to end against the actual popup (`npm run watch`, then load the `dist/` folder unpacked at `chrome://extensions/`, per `CLAUDE.md`) to confirm every table row and FAQ answer still matches real behavior before finishing.

## Related skills and agents

None are currently installed in this repository (`.claude/skills/` contains only this skill; `.claude/agents/` does not exist). This skill is responsible for the full `doc/` folder's end-user and FAQ accuracy — do not defer to a skill that isn't there. If a localization skill, a dedicated docs-sync skill, or a language-QA skill are added to this repo later, wire them in here explicitly rather than assuming they exist.
