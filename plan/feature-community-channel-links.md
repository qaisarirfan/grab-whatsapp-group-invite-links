# Feature Plan: WhatsApp Community & Channel Link Extraction

Created: 2026-06-23. Not yet implemented as of 2026-07-04.

> **Architecture note (2026-07-05):** since this plan was written, `src/popup/index.tsx` was reduced to a thin mount wrapper (`createRoot` + `<App />`) — the side panel entry point and `context` prop mentioned in earlier revisions of this note have since been removed entirely. All the state and flow this plan describes as living in `popup/index.tsx` now lives in `src/components/App.tsx` and two extracted hooks, `src/hooks/use-link-validation.ts` and `src/hooks/use-google-search-scrape.ts`. The Links table was also split into `src/components/Links.tsx` (container: filtering, dedupe, virtualization) + `src/components/LinkRow.tsx` (one row) + `src/components/FilterMenu.tsx` (status filter dropdown, previously a `LinkFilterBar.tsx` button row), and the copy/download UI now lives in `src/components/ExportMenu.tsx` rather than directly in `Actions.tsx`. Steps below have been updated to point at the current file, but the underlying design (add a `LinkType` union, an `extractLinkWithType()` function, thread `WhatsAppLink[]` through state) is unchanged.

---

## Goal

Extend the extension to detect and extract three types of WhatsApp links, not just group invites:

| Type | Example URL | Notes |
|---|---|---|
| Group | `https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv` | Existing — 22-char alphanumeric code |
| Community | `https://chat.whatsapp.com/<code>` | Same domain as groups; code length may differ (TBC — see Step 0) |
| Channel | `https://whatsapp.com/channel/<code>` | Different base domain; code ~24 chars |

---

## Step 0 — Verify URL patterns before writing code (MUST DO FIRST)

The community link URL format is not officially documented. Before implementing, manually inspect real invite links:

1. Create a test WhatsApp community and a test group.
2. Copy the invite links for both.
3. Compare the code lengths and character sets.
4. Do the same for a WhatsApp channel.

**Expected findings (to confirm):**
- Group code: exactly 22 alphanumeric characters.
- Community code: possibly longer (e.g. 30+ chars) — if so, a length-based regex split is enough.
- Channel code: `whatsapp.com/channel/<code>` — ~24 chars, confirmed by search results.

**If community and group codes are the same length and format**, there is no way to distinguish them from the URL alone. In that case, the plan for communities becomes: match on the same regex as groups but label them as "Group or Community" — or fetch the page and inspect the HTML title/og tags to determine type.

---

## Step 1 — Update `src/utils.ts` — core extraction logic

### 1a. Add a `LinkType` union type

```ts
// src/types.ts  (new shared types file)
export type LinkType = 'group' | 'community' | 'channel';

export interface WhatsAppLink {
  url: string;
  type: LinkType;
}
```

### 1b. Add per-type regex functions

```ts
// Existing — keep for backwards compatibility
export const GROUP_REGEX = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/;

// Community — adjust code length once Step 0 is complete
export const COMMUNITY_REGEX = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{30,}/;

// Channel — confirmed from research
export const CHANNEL_REGEX = /https:\/\/(?:www\.)?whatsapp\.com\/channel\/[A-Za-z0-9]{10,}/;
```

> If community and group codes are indistinguishable, consider adding a `CHAT_WA_REGEX` that matches all `chat.whatsapp.com` codes and labels them `'group'` (keeping current behaviour for now, community detection deferred).

### 1c. Replace `inviteLink()` with `extractLinkWithType()`

```ts
export const extractLinkWithType = (href: string | undefined): WhatsAppLink | null => {
  if (!href) return null;

  const channelMatch = href.match(CHANNEL_REGEX);
  if (channelMatch) return { url: channelMatch[0], type: 'channel' };

  const communityMatch = href.match(COMMUNITY_REGEX);
  if (communityMatch) return { url: communityMatch[0], type: 'community' };

  const groupMatch = href.match(GROUP_REGEX);
  if (groupMatch) return { url: groupMatch[0], type: 'group' };

  return null;
};
```

Keep the existing `inviteLink()` function until all call sites are migrated, then remove it.

### 1d. Update `extractWhatsappLinks()` to return typed links

```ts
export const extractWhatsappLinks = (htmlContent: string): WhatsAppLink[] => {
  const $ = load(htmlContent);
  const seen = new Set<string>();
  const results: WhatsAppLink[] = [];

  $('a').each((_, el) => {
    const match = extractLinkWithType($(el).attr('href'));
    if (match && !seen.has(match.url)) {
      seen.add(match.url);
      results.push(match);
    }
  });

  return results;
};
```

---

## Step 2 — Update `src/components/App.tsx` and its hooks — state and data flow

### 2a. Change `links` state from `string[]` to `WhatsAppLink[]`

`links` is declared in `src/components/App.tsx` and passed down into `useLinkValidation` (`src/hooks/use-link-validation.ts`) and `useGoogleSearchScrape` (`src/hooks/use-google-search-scrape.ts`), so the type change ripples through all three files, not just one.

```ts
// Before (src/components/App.tsx)
const [links, setLinks] = useState<string[]>([]);

// After
const [links, setLinks] = useState<WhatsAppLink[]>([]);
```

`useLinkValidation(links, setLinks)` and `useGoogleSearchScrape({ ..., setLinks, ... })` both currently type their `links`/`setLinks` parameters as `string[]` / `Dispatch<SetStateAction<string[]>>` — those signatures need updating too (or genericizing over `WhatsAppLink[]`). `validateAllLinks`/`validateMultipleLinksWithProgress` still operate on plain URL strings (see Step 3), so both hooks need to map `link.url` in and merge validation results back onto the matching `WhatsAppLink` in state.

### 2b. Update `getAllAnchorTags` (the injected DOM function)

No changes needed — it returns raw hrefs (still in `src/utils.ts`, module-scope, injected via `chrome.scripting.executeScript`). Type detection happens in the extension context after injection.

### 2c. Update direct-page mode link filtering

This logic is now in the mount effect inside `src/components/App.tsx` (not `popup/index.tsx`):

```ts
// Before
const whatsappLink = linksFrom.map(val => inviteLink(val)).filter(val => val.length > 0);

// After
const whatsappLinks = linksFrom
  .map(val => extractLinkWithType(val))
  .filter((val): val is WhatsAppLink => val !== null);
const unique = [...new Map(whatsappLinks.map(l => [l.url, l])).values()];
setLinks(unique);
```

### 2d. Update `getWhatsappLink()` — Google Search scrape mode

`getWhatsappLink` now lives in `src/hooks/use-google-search-scrape.ts`. `extractWhatsappLinks` (`src/utils.ts`) would return `WhatsAppLink[]`, so the accumulator array type in `getWhatsappLink`/`fetchAll` changes accordingly. Deduplication uses `url` as the key. Note this hook also fires `validateLinkWithStorage(link)` per extracted link as it's found (for auto-validate) — that call site needs `link.url` too.

### 2e. Add a type filter to state

Filter/dedupe state (`statusFilter`, `hideDuplicates`) already lives in `src/components/Links.tsx`, not `App.tsx` — a `typeFilter` would naturally join them there rather than in `App.tsx`:

```ts
const [typeFilter, setTypeFilter] = useState<LinkType | 'all'>('all');

const typeFilteredLinks = typeFilter === 'all'
  ? links
  : links.filter(l => l.type === typeFilter);
```

Apply this alongside the existing `filterLinksByStatus`/`dedupeLinksByGroupName` pipeline (see Step 4).

---

## Step 3 — Update `src/validation.ts`

No structural changes needed. `validateLink`, `validateLinkWithStorage`, and the newer `getStatusCounts`/`filterLinksByStatus`/`dedupeLinksByGroupName` helpers all key off the plain URL string. Every call site (`src/hooks/use-link-validation.ts`, `src/hooks/use-google-search-scrape.ts`, `src/hooks/use-cached-validations.ts`, `src/components/Actions.tsx`) needs to pass `link.url` instead of a raw string, and `Record<string, LinkValidation>` maps stay keyed by URL — components look up `validations[link.url]` rather than `validations[link]`.

---

## Step 4 — Update the Links table — display

The table is now split across three files; each needs a piece of this:

### 4a. Add a type badge, rendered per-row in `src/components/LinkRow.tsx`

```tsx
const TYPE_LABEL: Record<LinkType, string> = {
  group: 'Group',
  community: 'Community',
  channel: 'Channel',
};

const TYPE_COLOR: Record<LinkType, string> = {
  group: '#25D366',    // WhatsApp green
  community: '#128C7E', // darker green
  channel: '#075E54',   // darkest teal
};
```

Render a `<Badge>` (shadcn, `@/components/ui/badge` — the same component `LinkRow` already uses for the status badge) next to each link's status badge.

### 4b. Add type filter options in `src/components/FilterMenu.tsx`

`FilterMenu` already renders one radio item per `StatusFilter` value with live counts (see `FILTER_KEYS`/`statusCounts`). A parallel `typeFilter` radio group would follow the same pattern — a `TYPE_FILTER_KEYS` array reusing the existing `DropdownMenuRadioGroup` markup, driven by counts computed alongside `getStatusCounts` in `src/components/Links.tsx`.

### 4c. Thread `typeFilter` through `src/components/Links.tsx`

`Links.tsx` already composes `statusFilter` + `hideDuplicates` into `displayedLinks` before handing rows to `TableVirtuoso`/`LinkRow`; add `typeFilter` as one more stage in that pipeline (`filterLinksByStatus` → type filter → `dedupeLinksByGroupName`).

---

## Step 5 — Update `src/components/ExportMenu.tsx` and `src/components/Actions.tsx` — export

Copy/download logic (`handleCopy`, `handleDownload`, `toCsvRow`) currently lives in `src/components/Actions.tsx` and operates on `activeLinks: string[]`; `src/components/ExportMenu.tsx` only renders the menu UI and calls back into `Actions`. With typed links, `Actions.tsx` is still the place to update:

### 5a. Update CSV export to include a type column

```ts
const toCsvRow = (link: WhatsAppLink) => ({
  Type: link.type,
  Name: validations?.[link.url]?.name ?? '',
  Status: validations?.[link.url] ? getStatusLabel(validations[link.url].status) : 'Not checked',
  LastValidated: validations?.[link.url]?.lastValidated ? new Date(validations[link.url].lastValidated).toLocaleDateString() : '',
  URL: link.url,
});
```

### 5b. Update clipboard copy

```ts
// Copy as Text — one URL per line (type prefix optional)
activeLinks.map(l => l.url).join('\r\n')

// Copy as JSON — include type
JSON.stringify(activeLinks)
```

`ExportMenu.tsx` itself needs no changes — it's agnostic to what `activeLinks` contains.

---

## Step 6 — Update analytics events

Add `type_breakdown` param to key events so the GA4 data shows how many of each type were found:

```ts
Analytics.fireEvent('fetch_completed', {
  total_results: uniqueLinks.length,
  group_count: uniqueLinks.filter(l => l.type === 'group').length,
  community_count: uniqueLinks.filter(l => l.type === 'community').length,
  channel_count: uniqueLinks.filter(l => l.type === 'channel').length,
});
```

---

## Step 7 — Update `src/constants.ts`

Add the new host for channel links so it is not accidentally filtered out in Google Search mode:

```ts
export const WHATSAPP_CHANNEL_HOST = 'whatsapp.com';
export const WHATSAPP_GROUP_HOST = 'chat.whatsapp.com';
```

Also update `searchLinks` filtering in `popup/index.tsx` to allow both hosts through.

---

## Migration path

This is a breaking change to the `links` state shape (`string[]` → `WhatsAppLink[]`). A safe rollout order:

1. Add `src/types.ts` with `LinkType` and `WhatsAppLink`.
2. Add new regex constants and `extractLinkWithType()` to `utils.ts` without removing old functions.
3. Update `extractWhatsappLinks()`.
4. Update `App.tsx` state and its two hooks (`use-link-validation.ts`, `use-google-search-scrape.ts`) and all their consumers.
5. Update `Links.tsx`, `LinkRow.tsx`, `FilterMenu.tsx`, and `Actions.tsx`.
6. Remove old `inviteLink()` once no call site uses it.
7. Update `validation.ts` call sites (and `use-cached-validations.ts`) to pass/key on `.url`.

---

## Open questions (decide before starting)

| Question | Options |
|---|---|
| Can community URLs be distinguished from group URLs by regex alone? | Confirm in Step 0 — if no, label as 'group' for now or defer community support |
| Should `www.whatsapp.com/channel` and `whatsapp.com/channel` both be matched? | Yes — use `(?:www\.)?whatsapp\.com` in the regex |
| Should channel links be validated differently? | No — the `HEAD no-cors` approach is domain-agnostic; no change needed |
| What should "Copy as Text" include — URLs only, or `type: URL` format? | Decide based on user feedback; JSON copy already includes type |
| Should the type filter state persist across popup opens? | Low priority; start with no persistence |

---

## Affected files summary

| File | Change type |
|---|---|
| `src/types.ts` | New file |
| `src/utils.ts` | Add new regex, `extractLinkWithType()`, update `extractWhatsappLinks()` |
| `src/constants.ts` | Add channel host constant |
| `src/components/App.tsx` | `links` state type change, mount-effect filtering update |
| `src/hooks/use-link-validation.ts` | `links`/`setLinks` typing, pass `.url` to validation calls |
| `src/hooks/use-google-search-scrape.ts` | `getWhatsappLink`/`fetchAll` accumulator typing, `.url` in auto-validate call |
| `src/hooks/use-cached-validations.ts` | Key `validations` lookups by `.url` |
| `src/components/Links.tsx` | Add `typeFilter` state, thread through the existing filter/dedupe pipeline |
| `src/components/LinkRow.tsx` | Render type badge per row |
| `src/components/FilterMenu.tsx` | Add type filter options alongside the status filter radio group |
| `src/components/Actions.tsx` | CSV/copy format update (`toCsvRow`, `handleCopy`) |
| `src/validation.ts` | Call site update (`.url` instead of raw string); no structural change |
| `src/analytics.ts` | Add type breakdown to events |
