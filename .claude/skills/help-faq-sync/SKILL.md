---
name: help-faq-sync
description: Use when the popup UI, its components, link validation logic, background/lifecycle behavior, or manifest permissions change - or to proactively audit Help/FAQ coverage. Builds a full inventory of popup states, buttons, link status badges, tabs, and edge cases, detects undocumented behavior, and keeps both doc/non-technical.md (the end-user guide + FAQ) and src/components/HelpFaq.tsx (the in-app Help & FAQs tab) accurate, complete, and mutually consistent, enforcing a coverage quality gate across both.
---

# Help FAQ Sync

## Mission

Guarantee that **no popup mode, state, button, action, link status, permission, or edge case is missing from either help surface**: the end-user guide (`doc/non-technical.md`) and the in-app Help & FAQs tab (`src/components/HelpFaq.tsx`). This skill is proactive: it discovers the real behavior of the popup and background scripts, diffs it against both surfaces, and writes the missing guidance to whichever one (usually both) needs it — it does not only document what was explicitly requested.

`src/components/HelpFaq.tsx` is a **condensed mirror** of `doc/non-technical.md`, not a byte-for-byte copy: the same coverage (every button, badge, and behavior the doc covers should be reachable in-app too, directly or via an explicit "doc-only by design" note), but shorter wording, and plain text instead of markdown — its `FAQS` answers render as raw JSX text with no markdown parser involved. Whenever one surface changes, check the other; this skill fails its own job if it edits one and leaves the other stale.

Three non-negotiable boundaries keep this honest:

1. **Discover, never invent.** Document only behavior that exists in `src/`. This project keeps its roadmap in `plan/*.md` (e.g. community/channel link types in `plan/feature-community-channel-links.md`). Those are proposals, not shipped behavior. Before documenting anything a `plan/` file describes, confirm it is actually implemented in `src/`; if it isn't, leave it out of both surfaces and record it in the coverage report as "planned, not shipped." Once a plan ships, its file is deleted rather than left to rot — e.g. `plan/feature-deep-link-validation.md` (group name/icon validation) shipped and was removed; don't expect every shipped feature to still have a corresponding plan doc.
2. **Comprehensive does not mean noisy.** Every popup state and action must be _accounted for_, but a cosmetic detail (sticky action-bar positioning, a spinner's shape, hover colour) can be "covered by its parent action" rather than getting its own FAQ entry. Nothing is silently skipped; each surface is either documented directly or explicitly mapped to where it is covered.
3. **Two files, two formats, one set of facts.** `doc/non-technical.md` is markdown for GitHub readers — use bold/backticks/tables freely. `src/components/HelpFaq.tsx`'s `FAQS` array and its "How to use" list render as plain JSX text with no markdown parsing — write plain sentences there, no `**bold**`, backticks, or markdown links. Never let markdown syntax leak into a `.tsx` string literal, and never let the in-app version silently drift out of sync just because it's "only" code.

## Critical Guidelines

To keep both surfaces trustworthy, inspect `src/popup/`, `src/components/` (including `HelpFaq.tsx` itself), `src/background.ts`, `src/validation.ts`, and `public/manifest.json` before editing content. Do not update either surface from memory, commit messages, or `plan/*.md` alone — plans describe intent, not what shipped.

This project has **no localization** — no i18n library, no translation pass, nothing to build there. It does have an **in-app Help UI**: `src/components/HelpFaq.tsx` renders an always-available "Help & FAQs" tab (in the popup) with a short "How to use" recap, the same status-badge legend as the doc (minus the no-badge `pending` case), and an FAQ accordion driven by its `FAQS` array. Treat it as a second, condensed rendering of the same facts as `doc/non-technical.md` — not a stub, and not something to leave behind when the doc changes. Do not invent an i18n key structure or a translation pass — neither exists in this codebase — but do keep `HelpFaq.tsx` current; it is real, shipped, user-facing code, not an implementation detail.

To keep the target audience clear, write for someone who just installed a Chrome extension to find WhatsApp group invite links — not a developer. Use short sentences and concrete steps. Avoid implementation terms such as axios, Bottleneck, cheerio, p-limit, Manifest V3, service worker, React state, or regex unless the user truly needs that word. This applies equally to `HelpFaq.tsx`'s strings — they are user-facing prose that happens to live in a `.tsx` file, not code comments.

## When to Use

Use this skill:

- after changes to `src/popup/index.tsx` (new state, new mode, new render branch)
- after changes to any `src/components/*.tsx` (new button, new badge, new table column, new tab)
- after changes to `src/validation.ts` (a new `LinkStatus` value, new caching/timeout behavior)
- after changes to `src/background.ts` (install/update/uninstall behavior) or `public/manifest.json` (a new permission)
- after a direct edit to `src/components/HelpFaq.tsx` itself (someone tweaked an in-app FAQ answer, badge legend, or how-to bullet without touching the doc) — re-run discovery on `doc/non-technical.md` too, in the opposite direction
- as a **periodic coverage audit**, even with no specific change in mind, to catch behavior that shipped without a doc update on either surface

Skip only for internal-only refactors with no user-visible effect (e.g. concurrency/rate-limiting internals in `src/utils.ts`/`src/hooks/use-google-search-scrape.ts`, or a ref-to-state swap that doesn't change rendered behavior), webpack/build config changes, `src/analytics.ts` internals that add no new user-visible behavior, dead/unused files, formatting-only changes, or tests (this project has none — `npm test` fails by design per `CLAUDE.md`).

## How Help Renders (two surfaces, one set of facts)

Two renderers carry the same facts in different formats. Map coverage onto **both** — comprehensive means both, not just the doc.

### Surface 1 — `doc/non-technical.md` (markdown, read on GitHub or any editor)

| Primitive | Location in `doc/non-technical.md` | Purpose |
| --- | --- | --- |
| App intro | `## What does this extension do?` | Explains the two operating modes in plain terms |
| Install steps | `## How to install` | Ordered, Chrome-specific steps |
| Usage walkthrough | `## How to use it` (per mode: regular webpage / Google Search) plus tips subsections (Auto-validate, filtering, searching Google) | Ordered steps per mode, plus technique tips |
| Action reference | `## What the buttons do` | One row per button that exists in `src/components/Actions.tsx`, `Links.tsx`, `Logs.tsx`, or the inline extract button in `index.tsx`/`EmptyState.tsx` |
| Status reference | `## Link status badges` | One row per `LinkStatus` value in `src/validation.ts` — including the no-badge `pending` state |
| Logs behavior | `## Logs tab` | Progress counter, per-URL error display, CSV export — Google Search mode only |
| Privacy | `## Privacy note` | What leaves the browser (page fetches, GA4 analytics) and what doesn't |
| FAQ | `## Frequently Asked Questions` | Troubleshooting and edge-case questions, phrased as a user would ask them |

If `doc/non-technical.md` ever grows unwieldy, splitting the FAQ into its own `doc/faq.md` (linked from `doc/overview.md`'s "Further reading" table) is a reasonable future step — but do not fragment it preemptively while the file is still short.

### Surface 2 — `src/components/HelpFaq.tsx` (plain JSX text, rendered inside the popup)

| Primitive | Location in `HelpFaq.tsx` | Purpose | Relationship to the doc |
| --- | --- | --- | --- |
| Usage recap | The `<ul>` under "How to use" (top of the component) | 3–5 bullets: regular webpage, Google Search, Validate links | Condensed version of `## How to use it` — no install steps, no Google-search-operator tips (those stay doc-only; too long for an in-app recap) |
| Badge legend | `BADGE_STATUSES` array + the `<ul>` mapped over it | One entry per status **actually rendered as a badge** | Mirrors `## Link status badges`, minus the no-badge `pending` row — `BADGE_STATUSES` intentionally excludes `'pending'` because `LinkRow.tsx` never renders a badge for it; keep this array in sync with what `LinkRow.tsx` actually renders, not the full `LinkStatus` union |
| FAQ | `FAQS` array (`{ question, answer }[]`), rendered via an `Accordion` | Condensed answers (1–2 plain sentences, no markdown) | Same question set as the doc's FAQ, same relative order where practical, shorter answers, no bold/backticks/links |

Content that belongs in the doc but has **no in-app equivalent by design** (not an oversight): `## How to install`, the full detail of `## Privacy note` (the in-app FAQ has one condensed tracking question instead), and the Google-search-operator tips subsection. Record these as "doc-only, by design" in the coverage report rather than treating them as a `HelpFaq.tsx` gap.

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
| Existing Help/FAQ coverage — **both surfaces** | `doc/non-technical.md` and `src/components/HelpFaq.tsx` | Read both directly — both are short enough to read in full |
| In-app Help tab's current arrays | `src/components/HelpFaq.tsx` | `rg -n "FAQS|BADGE_STATUSES" src/components/HelpFaq.tsx` |
| Planned-but-unshipped features | `plan/*.md` | Read, then cross-check every claim against `src/` before trusting it |

Deep-dive sources when a specific domain changed:

| Domain | Inspect |
| --- | --- |
| Link extraction & regex | `src/utils.ts` (`inviteLink`, `extractWhatsappLinks`, `isValidURL`); roadmap only — `plan/feature-community-channel-links.md` |
| Google Search bulk scrape | `src/popup/index.tsx` (`fetchAll`, `getWhatsappLink`, `getAllAnchorTags`), `src/utils.ts` (`fetchData`) |
| Link validation & caching | `src/validation.ts`; which statuses `src/components/LinkRow.tsx` actually renders as a badge (drives `HelpFaq.tsx`'s `BADGE_STATUSES`) |
| Export (copy/CSV) | `src/utils.ts` (`convertToCsv`, `copyToClipboard`), `src/components/Actions.tsx`, `src/components/Logs.tsx` |
| Extension lifecycle & permissions | `src/background.ts`, `public/manifest.json` |
| Product framing (cross-check only, not the Help source of truth) | `doc/overview.md`, `doc/technical.md` |

Every deep-dive above ends at two files, not one: after locating the current code behavior, check both `doc/non-technical.md` and `src/components/HelpFaq.tsx` for whether they already reflect it.

Then **diff**: list every popup state, button, badge, and permission, mark which are already covered in `doc/non-technical.md` **and** in `src/components/HelpFaq.tsx`, and flag the gaps in either. The gaps are the work.

## Phase 2 — Coverage matrix (both surfaces)

| Required dimension | `doc/non-technical.md` | `src/components/HelpFaq.tsx` |
| --- | --- | --- |
| What the extension does, in plain terms | `## What does this extension do?` | Doc-only by design — the user is already inside the extension |
| Install steps | `## How to install` | Doc-only by design — not relevant once the extension is running |
| Per-mode walkthrough (regular page vs Google Search) | `## How to use it` | Condensed into the "How to use" `<ul>` (regular webpage / Google Search / Validate links) |
| Every button's effect | A row in `## What the buttons do` | Covered contextually by the "How to use" bullets, or by an FAQ entry if the behavior is non-obvious — not a full one-row-per-button table (too long for an accordion) |
| Every `LinkStatus` value | A row in `## Link status badges`, including the no-badge `pending` case | An entry in `BADGE_STATUSES` — `pending` intentionally excluded, matching `LinkRow.tsx`'s actual render behavior |
| Empty / loading / error / rate-limited states | FAQ entry whenever the user's next action differs by state ("Why does it say there's no WhatsApp link on this page?", "Why is a link marked Limited?") | Same question, shorter answer, for any state a first-time user will realistically hit |
| Permissions (`activeTab`, `scripting`, `storage`, host permissions) | `## Privacy note` or a dedicated FAQ entry — explain *why*, not the manifest keys | The "Does this extension track what websites I visit?" FAQ entry (condensed privacy summary) — don't re-list manifest permissions in-app |
| Install / update / uninstall behaviour (opens an external onboarding/feedback page) | Mention in the guide if it would surprise a user; do not fabricate content for the external blogspot pages themselves — they live outside this repo | FAQ entry already covers this ("A new tab opened when I installed or updated...") |
| Validation caching (24 hours) | FAQ entry ("Why didn't it re-check a link I just validated?") | Same question, shorter answer |
| Copy failures (clipboard permission denied resets the button silently) | FAQ entry — this is a real silent-failure edge case in `Actions.tsx`'s `handleCopy` | Same question, shorter answer |
| Tips (e.g. Google search operators) | Usage walkthrough or FAQ | Doc-only by design — too long for the in-app accordion |
| Related sections | Cross-reference inside the answer text | Not applicable — `HelpFaq.tsx` has no cross-linking convention; keep each answer self-contained |

The install → detect mode → extract/scan → validate → export workflow must read as an **ordered sequence** in `## How to use it`. `HelpFaq.tsx`'s FAQ order should loosely track the doc's FAQ order — a new question added to one should land in roughly the same relative position in the other, so the two don't drift into unrelated structures over time.

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

Generate the `doc/non-technical.md` version first (full detail, markdown), then derive the `HelpFaq.tsx` version by compressing to 1–2 plain sentences and stripping all markdown syntax. Don't do it in the other order — writing the terse version first tends to lose the caveat that actually matters.

## Phase 3 — Generate and update content

1. Name each user-visible change in plain terms ("links now show an Expired badge", not "added a `LinkStatus` enum value").
2. Update `## How to install` / `## How to use it` only when the actual ordered steps changed.
3. Update `## What the buttons do` and `## Link status badges` to match every button/status currently in code — add missing rows, remove rows for buttons/statuses that no longer exist.
4. Add or revise FAQ entries per the generation rules for every changed or newly discovered behavior, state, or edge case.
5. Keep `## Privacy note` accurate to what `src/analytics.ts`, `src/utils.ts` (`fetchData`), and `public/manifest.json` actually do — this is the user's only visibility into a broad-host-permission extension, so treat it as trust-sensitive.
6. This project has no localization. Do not add translation steps or an i18n pass.
7. If `doc/overview.md` or `doc/technical.md` go stale (feature tables, module lists, permission tables), update them directly. There is no separate `update-docs` skill installed in this repo — this skill owns the whole `doc/` folder's user- and developer-facing accuracy unless the user says otherwise.
8. Update `src/components/HelpFaq.tsx`'s `FAQS` array to match every FAQ entry added or revised in step 4 — condensed, plain text, same question phrasing where practical.
9. Update `HelpFaq.tsx`'s "How to use" `<ul>` whenever the ordered walkthrough steps changed (step 2).
10. Update `HelpFaq.tsx`'s `BADGE_STATUSES` array only when the set of statuses that actually render a badge in `LinkRow.tsx` changes — not just because `LinkStatus` itself changed (see the no-badge `pending` case).
11. `HelpFaq.tsx` is a real `.tsx` file, not markdown — after editing it, run `npm run typecheck` and `npm run lint` (see Verification below).

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
- [ ] Every FAQ entry in `doc/non-technical.md` has a corresponding condensed entry in `HelpFaq.tsx`'s `FAQS`, or an explicit "doc-only by design" note in the coverage report.
- [ ] `HelpFaq.tsx`'s `BADGE_STATUSES` matches exactly the statuses `LinkRow.tsx` actually renders as a badge (currently `valid`, `expired`, `invalid`, `rate-limited` — not `pending`).
- [ ] `HelpFaq.tsx`'s "How to use" bullets reflect the current ordered walkthrough (regular webpage, Google Search, Validate links).
- [ ] `npm run typecheck` and `npm run lint` both pass if `HelpFaq.tsx` was edited.

Finish by emitting a **coverage report** with four lists: surfaces documented this pass (note which surface(s): doc, `HelpFaq.tsx`, or both) · surfaces covered by a parent (name the parent) · surfaces intentionally excluded (with reason, including any "doc-only by design" `HelpFaq.tsx` exclusions) · surfaces named in `plan/*.md` but **not present in code** (do not document these — note them as roadmap only).

## Content Rules

| Content | Rule |
| --- | --- |
| App intro | Explain both modes (regular-page scan vs Google Search bulk extract) and that everything runs from the user's own browser |
| Install steps | Chrome-specific, ordered, assume Developer Mode is unfamiliar |
| Usage walkthrough | One ordered sequence per mode; state the trigger (opening the popup) and the outcome |
| Button reference | Button name, what it does, in one line |
| Badge reference | Badge label, colour, meaning, in one line |
| FAQ question | Phrase as the user would ask it |
| FAQ answer (doc) | Action, result, and any important caveat in 1–3 short sentences, markdown allowed |
| FAQ answer (`HelpFaq.tsx`) | Same facts, 1–2 plain sentences, **no** markdown syntax (`**`, backticks, links) — it renders as raw JSX text |
| States & errors | Tell the user what to do next, not what threw internally |
| Privacy | Be explicit and honest about what leaves the browser (page fetches to scraped URLs, anonymous GA4 events) — this doc is the user's only visibility into that |
| Tone | Calm, clear, plain language, never implementation-first |

## Future-Proofing

On every run, treat discovery as the primary job:

1. Scan `src/popup/`, `src/components/` (including `HelpFaq.tsx`'s own current content), `src/validation.ts`, `src/background.ts`, and `public/manifest.json` for new states, buttons, statuses, or permissions.
2. Diff against both `doc/non-technical.md`'s sections and `HelpFaq.tsx`'s `FAQS`/`BADGE_STATUSES`/how-to-use list to detect undocumented behavior on either surface.
3. Generate the missing walkthrough steps, table rows, and FAQ entries — doc first, then the condensed `HelpFaq.tsx` version.
4. Update existing entries when behavior changed (e.g. a `LinkStatus` gains a new value, a button's label changes) — on both surfaces.
5. Prevent stale content: if a row or FAQ entry describes removed or changed behavior, fix or delete it, in both files. Confirm any known dead code stays undocumented — it was never user-facing.
6. Check `HelpFaq.tsx` against `doc/non-technical.md` in both directions — a direct edit to either file (not just to the underlying feature code) can leave the other stale.

## Pressure Checks

Before finalizing, test the draft against these scenarios:

- A new link type ships (community/channel links from `plan/feature-community-channel-links.md` actually land in `src/utils.ts`): it needs a badge/table update, a usage-walkthrough update, and an FAQ entry on both surfaces if it changes what the user sees.
- Group name/icon-after-validation already shipped (`src/validation.ts`'s `name`/`iconUrl` fields, rendered in `Links.tsx`): this is a good candidate for a coverage audit right now — check whether `## Link status badges`, the usage walkthrough, the privacy note, and `HelpFaq.tsx` already mention that validation now scrapes and displays the group's name and photo, since that's a new data flow worth calling out if it isn't there yet.
- A `ref.current` flag gating tab visibility is replaced by reactive state (no behavior change intended): neither surface should need edits — but re-run discovery to confirm the render branches still match what's documented in both.
- A new permission is added to `public/manifest.json` (e.g. `notifications`): explain why in the privacy note before it ships confusion; add or extend the in-app tracking FAQ entry only if the new permission changes what leaves the browser.
- The onboarding tab URL in `src/background.ts` changes: note in the coverage report that the destination itself is out of this repo's scope, but confirm `doc/non-technical.md` and `HelpFaq.tsx`'s matching FAQ entry don't describe a stale install flow.
- A new `LinkStatus` value is added (e.g. `'unreachable'`): it needs a badge-table row in the doc, and — only if `LinkRow.tsx` actually renders it as a badge — an addition to `HelpFaq.tsx`'s `BADGE_STATUSES` too.
- `HelpFaq.tsx` is edited directly (e.g. someone tweaks an FAQ answer in-app without touching the doc): re-run discovery on `doc/non-technical.md` too — the same fix likely applies there, and vice versa.

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Documenting only the requested change | Run full discovery; the requested change is the trigger, not the scope. |
| Treating a `plan/*.md` proposal as shipped | Cross-check against `src/` before writing a single word about it. |
| Adding jargon (axios, Bottleneck, cheerio, regex, Manifest V3, service worker) | Rewrite in terms of what the user sees and does — in both `doc/non-technical.md` and `HelpFaq.tsx`. |
| Inventing an i18n/localization pass | This project has no i18n — don't add one. |
| Assuming there's no in-app Help UI | There is — `src/components/HelpFaq.tsx`. Update it alongside the doc; don't edit `doc/non-technical.md` and stop there. |
| Letting markdown syntax leak into `HelpFaq.tsx` strings | Its `FAQS` answers render as raw JSX text — `**bold**` and backticks show up literally to the user. Write plain sentences. |
| Copying every doc FAQ into `HelpFaq.tsx` verbatim | It's a condensed mirror, not a full copy — compress to 1–2 sentences and drop caveats that only matter to power users. |
| Adding `pending` to `HelpFaq.tsx`'s `BADGE_STATUSES` because it's in `LinkStatus` | `LinkRow.tsx` never renders a `pending` badge — mirror what's actually rendered, not the full type union. |
| One FAQ per cosmetic detail | Cover trivial details under the parent action/state; reserve FAQs for real user questions. |
| Copying internal `plan/*.md` bug descriptions into the FAQ | Those are internal bug fixes, not user-facing behavior — skip unless the bug is currently user-visible. |
| Leaving the privacy note stale | Re-check it against `src/analytics.ts` and `src/utils.ts`'s `fetchData` every time host behavior changes. |
| Assuming an `update-docs`/i18n/translation skill exists in this repo | It doesn't. `code-refactor`, `code-reviewer`, and `staged-commit-pr` are also installed in `.claude/skills/`, but none of them own Help/FAQ content — this skill owns both surfaces end to end. |

## Verification

This project has no test suite (`npm test` fails by design per `CLAUDE.md`). Which checks apply depends on what you touched:

```bash
npm run style      # Prettier — formats doc/*.md and HelpFaq.tsx alike; always run this
npm run typecheck  # tsc --noEmit — required if HelpFaq.tsx was edited (it's a real .tsx file)
npm run lint       # ESLint — required if HelpFaq.tsx was edited
```

`doc/*.md`-only changes just need `npm run style`. Any `HelpFaq.tsx` change needs all three.

After editing, re-read `doc/non-technical.md` end to end, and open the Help & FAQs tab in a running popup (`npm run watch`, then load the `dist/` folder unpacked at `chrome://extensions/`, per `CLAUDE.md`) to confirm `HelpFaq.tsx` actually renders what you wrote — a typo in the accordion or a stray markdown character is easy to miss by reading the source alone.

## Related skills and agents

`.claude/skills/` also contains `code-refactor`, `code-reviewer`, and `staged-commit-pr`; `.claude/agents/` has none. None of those own Help/FAQ content, so this skill is still responsible for the full `doc/` folder plus `src/components/HelpFaq.tsx` end to end — do not defer to another skill for either. If `HelpFaq.tsx`'s `FAQS` array grows large enough to push the file toward `code-refactor`'s size threshold, that skill can extract the data into its own module; this skill's job is content accuracy, not component structure. If a localization skill or a dedicated docs-sync skill is added to this repo later, wire it in here explicitly rather than assuming it exists.
