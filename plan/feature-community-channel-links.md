# Feature Plan: WhatsApp Community & Channel Link Extraction

Created: 2026-06-23

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

## Step 2 — Update `src/popup/index.tsx` — state and data flow

### 2a. Change `links` state from `string[]` to `WhatsAppLink[]`

```ts
// Before
const [links, setLinks] = useState<string[]>([]);

// After
const [links, setLinks] = useState<WhatsAppLink[]>([]);
```

### 2b. Update `getAllAnchorTags` (the injected DOM function)

No changes needed — it returns raw hrefs. Type detection happens in the extension context after injection.

### 2c. Update direct-page mode link filtering

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

`extractWhatsappLinks` now returns `WhatsAppLink[]`, so the accumulator array type changes accordingly. Deduplication uses `url` as the key.

### 2e. Add a type filter to state

```ts
const [typeFilter, setTypeFilter] = useState<LinkType | 'all'>('all');

const filteredLinks = typeFilter === 'all'
  ? links
  : links.filter(l => l.type === typeFilter);
```

Pass `filteredLinks` to `<Links>` instead of `links`.

---

## Step 3 — Update `src/validation.ts`

No structural changes needed. `validateLink` and `validateLinkWithStorage` already operate on the URL string. Pass `link.url` instead of the raw string at each call site.

---

## Step 4 — Update `src/components/Links.tsx` — display

### 4a. Add a type badge column

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

Add a `<TypeBadge>` styled component (similar to existing `<StatusBadge>`) and render it next to each link in the table.

### 4b. Add type filter buttons above the table

```tsx
<div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
  {(['all', 'group', 'community', 'channel'] as const).map(t => (
    <button
      key={t}
      className={`size-small ${typeFilter === t ? 'bg-green' : 'bg-grey'}`}
      onClick={() => setTypeFilter(t)}
    >
      {t === 'all' ? `All (${links.length})` : `${TYPE_LABEL[t]} (${links.filter(l => l.type === t).length})`}
    </button>
  ))}
</div>
```

---

## Step 5 — Update `src/components/Actions.tsx` — export

### 5a. Update CSV export to include type column

```ts
convertToCsv(
  links.map(link => ({ Type: link.type, URL: link.url })),
  'links'
);
```

### 5b. Update clipboard copy

```ts
// Copy as Text — one URL per line (type prefix optional)
links.map(l => l.url).join('\r\n')

// Copy as JSON — include type
JSON.stringify(links)
```

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
4. Update `popup/index.tsx` state and all consumers.
5. Update `Links.tsx` and `Actions.tsx`.
6. Remove old `inviteLink()` once no call site uses it.
7. Update `validation.ts` call sites to pass `.url`.

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
| `src/popup/index.tsx` | State type change, filter state, updated flow |
| `src/components/Links.tsx` | Type badges, filter buttons |
| `src/components/Actions.tsx` | CSV/copy format update |
| `src/validation.ts` | Call site update (`.url` instead of raw string) |
| `src/analytics.ts` | Add type breakdown to events |
