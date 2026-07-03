# Feature Plan: Deep Link Validation with Group Metadata

Created: 2026-06-23

---

## What `Untitled-1.ts` does (and why it matters)

The scratch code fetches the full HTML of each WhatsApp invite link and parses it with cheerio:

```ts
const response = await limiter.schedule(() => axios.get(link));
const $ = load(response.data);
const name = $('#main_block h3').text() || null;
return { name: name || null, isValid: !!name, link };
```

The key insight: **if `#main_block h3` has content, the group is active and joinable. If it is empty or missing, the link is expired or invalid.**

This is fundamentally different from the current `validation.ts` approach:

| | Current approach | `Untitled-1.ts` approach |
|---|---|---|
| Method | `fetch()` HEAD, `mode: 'no-cors'` | `axios.get()` full HTML |
| Can read status code? | No — always `0` (opaque) | Yes — real HTTP status |
| Can read response body? | No | Yes — full HTML |
| Can confirm group is active? | No — always returns `'valid'` | Yes — checks `#main_block h3` |
| Gets group name? | No | Yes — as a bonus |
| CORS issue? | Works around it with no-cors | No issue — extension `host_permissions` bypass CORS |

The extension already has `host_permissions: ["https://*/*"]` in `manifest.json`, which means `axios.get('https://chat.whatsapp.com/...')` works from the popup — the same way `fetchData()` already fetches arbitrary Google Search result pages. The no-cors workaround in `validation.ts` is unnecessary.

Also: `axios-retry` is already in `package.json` as a dependency but is never used. It was clearly intended for this approach.

---

## What we can extract from the WhatsApp invite page

When `axios.get()` returns the invite page HTML, cheerio can extract:

| Data | CSS Selector | Notes |
|---|---|---|
| Group name | `#main_block h3` | Present only on active links |
| Group description | `#main_block p` | May be empty if no description set |
| Member count | inspect manually — may vary | Check actual page HTML to confirm selector |
| Group icon URL | `#main_block img` or `og:image` meta | Can be used as a thumbnail |
| Page title | `title` or `og:title` | Fallback for group name |

> **Action before coding:** Open a real WhatsApp group invite link in a browser, view source, and confirm all selectors. The `#main_block h3` is confirmed from the scratch code. The others need verification.

---

## Integration plan

### Step 1 — Extend `LinkValidation` type in `src/validation.ts`

Add metadata fields to the existing type:

```ts
export interface LinkValidation {
  link: string;
  status: LinkStatus;
  lastValidated: number;
  errorDetails?: string;
  // New fields
  name?: string;           // Group/community name from the invite page
  description?: string;    // Group description (if available)
  memberCount?: number;    // Member count (if extractable)
  iconUrl?: string;        // Group icon URL (if extractable)
}
```

---

### Step 2 — Replace `validateLink()` with HTML-based validation in `src/validation.ts`

Remove the HEAD no-cors approach entirely. Use `axios.get()` + cheerio instead:

```ts
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { load } from 'cheerio';

// Configure retry once — 3 retries, exponential backoff, only on 429 and network errors
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    error.response?.status === 429 ||
    axiosRetry.isNetworkOrIdempotentRequestError(error),
});

export const validateLink = async (link: string): Promise<Omit<LinkValidation, 'link' | 'lastValidated'>> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await axios.get(link, { signal: controller.signal });
    clearTimeout(timeoutId);

    const $ = load(response.data);
    const name = $('#main_block h3').text().trim() || undefined;
    const description = $('#main_block p').first().text().trim() || undefined;
    // const iconUrl = ... (confirm selector first)

    if (name) {
      return { status: 'valid', name, description };
    }

    // Page loaded but no group name — link is expired or revoked
    return { status: 'expired' };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return { status: 'rate-limited' };
      }
    }
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404 || error.response?.status === 410) {
        return { status: 'expired' };
      }
      if (error.response?.status === 429) {
        return { status: 'rate-limited' };
      }
    }
    return { status: 'invalid' };
  }
};
```

Update `validateLinkWithStorage()` to merge and store the full metadata, not just status.

---

### Step 3 — Tune the validation rate limiter in `src/validation.ts`

The Untitled-1.ts code used `limiter.schedule()` (Bottleneck, 50 concurrent, 200ms). For validation of WhatsApp's own servers this is too aggressive. WhatsApp may rate-limit rapidly.

Suggested conservative limiter for validation:

```ts
const validationLimiter = new Bottleneck({
  maxConcurrent: 5,   // 5 parallel validation requests
  minTime: 1000,      // 1 second between each request
});
```

Combine with `axios-retry` (Step 2) so transient 429s are automatically retried with backoff rather than immediately marked as `'rate-limited'`.

---

### Step 4 — Show group names in `src/components/Links.tsx`

Once validation returns `name`, display it in the table alongside the URL:

```tsx
<tr key={link}>
  <td>{index + 1}</td>
  <td>
    {/* Group name — shown after validation */}
    {validation?.name && (
      <div style={{ fontWeight: 600, marginBottom: '2px' }}>
        {validation.name}
      </div>
    )}
    {/* Group description */}
    {validation?.description && (
      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
        {validation.description}
      </div>
    )}
    <a className="font-mono text-small" target="_blank" href={link} rel="noreferrer">
      {link}
    </a>
    {/* Status badge + timestamp (existing) */}
  </td>
</tr>
```

This turns a plain URL list into a human-readable directory of WhatsApp groups.

---

### Step 5 — Show validation progress in `src/components/Actions.tsx`

Currently, validation runs silently and the button just says "Validating…". Add a counter:

```tsx
// In Popup state
const [validationProgress, setValidationProgress] = useState({ done: 0, total: 0 });

// Pass to validateMultipleLinks as a progress callback
const validateAllLinks = async () => {
  setValidationProgress({ done: 0, total: links.length });
  setIsValidating(true);
  await validateMultipleLinksWithProgress(links, (done) => {
    setValidationProgress(prev => ({ ...prev, done }));
    setLinks(prev => [...prev]); // trigger re-render to show each result as it arrives
  });
  setIsValidating(false);
};
```

```tsx
// In Actions.tsx button label
{isValidating ? `Validating ${validationProgress.done}/${validationProgress.total}...` : 'Validate links'}
```

This gives live feedback — the user sees names and statuses appearing one by one as validation progresses.

---

### Step 6 — Filter links by status in `src/components/Links.tsx`

After validation, allow the user to filter the table:

```tsx
type StatusFilter = 'all' | 'valid' | 'expired' | 'invalid' | 'pending';

const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

const displayedLinks = links.filter(link => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'pending') return !validations[link];
  return validations[link]?.status === statusFilter;
});
```

Filter buttons above the table (shows counts per bucket):

```
[ All (42) ]  [ Active (18) ]  [ Expired (20) ]  [ Invalid (4) ]
```

---

### Step 7 — Update CSV export to include group metadata

```ts
convertToCsv(
  links.map(link => ({
    Name: validations[link]?.name ?? '',
    Description: validations[link]?.description ?? '',
    Status: validations[link] ? getStatusLabel(validations[link].status) : 'Not checked',
    LastValidated: validations[link]?.lastValidated
      ? new Date(validations[link].lastValidated).toLocaleDateString()
      : '',
    URL: link,
  })),
  'links'
);
```

The exported CSV becomes genuinely useful — a named, status-tagged directory of groups.

---

## New ideas to consider

### IDEA-1 — Auto-validate immediately after extraction

Add a toggle in the UI: **"Auto-validate after extract"**. When on, `validateAllLinks()` fires automatically as soon as `fetchAll()` completes. Saves the user a manual click.

Store the preference in `chrome.storage.local` so it persists across sessions.

---

### IDEA-2 — Copy only valid links

Add a second set of copy/download buttons that filter to `status === 'valid'` only:

```
[ Copy valid links as Text ]  [ Download valid links CSV ]
```

This is the most common use case — the user wants actionable, working links only.

---

### IDEA-3 — Validate links one by one as they are found (streaming validation)

Currently: extract all → user clicks validate → all validated in batch.

Proposed: as each link is found during `fetchAll()`, immediately kick off validation in the background. By the time extraction finishes, many links are already validated.

Implementation: in `getWhatsappLink()`, after pushing to `store`, call `validateLinkWithStorage(link)` in a fire-and-forget manner. The React state polling in `Links.tsx` (the `useEffect` that calls `getValidationStatus`) will pick up results as they arrive.

---

### IDEA-4 — Deduplicate by group name

Two different invite links can point to the same WhatsApp group (admins can generate multiple links). Once group names are available, deduplicate by name:

```ts
const uniqueByName = Object.values(
  links.reduce((acc, link) => {
    const name = validations[link]?.name;
    if (name && !acc[name]) acc[name] = link;
    else if (!name) acc[link] = link; // unvalidated — keep all
    return acc;
  }, {} as Record<string, string>)
);
```

---

### IDEA-5 — Group icon thumbnails

The WhatsApp invite page may expose the group icon via an `<img>` tag or `og:image` meta. If extractable, show a small thumbnail next to the group name in the table. This makes the list much easier to scan visually.

---

### IDEA-6 — Validation cache versioning

The current cache stores `validations` keyed by URL with a 24-hour TTL. Once names and descriptions are added, old cached entries won't have these fields. Add a `cacheVersion` field so stale entries are re-fetched automatically:

```ts
const CACHE_VERSION = 2; // bump when LinkValidation shape changes

if (cached && cached.cacheVersion === CACHE_VERSION && Date.now() - cached.lastValidated < TTL) {
  return cached; // still fresh and same shape
}
// otherwise re-fetch
```

---

## Migration path

Safe order of changes — each step is independently shippable:

| Step | Change | Independently shippable? |
|---|---|---|
| 1 | Add metadata fields to `LinkValidation` (optional, backward compatible) | Yes |
| 2 | Replace `validateLink()` with axios+cheerio | Yes — drop-in replacement |
| 3 | Tune rate limiter + add axios-retry | Yes |
| 4 | Show group names in Links table | Yes — graceful when name is undefined |
| 5 | Validation progress counter | Yes |
| 6 | Status filter buttons | Yes |
| 7 | Update CSV export | Yes |
| IDEA-1 | Auto-validate toggle | After steps 1–3 |
| IDEA-2 | Copy valid links only | After step 6 |
| IDEA-3 | Streaming validation | After steps 1–3 |
| IDEA-4 | Deduplicate by name | After step 4 |

---

## Affected files summary

| File | Change |
|---|---|
| `src/Untitled-1.ts` | Delete — logic absorbed into validation.ts |
| `src/validation.ts` | Replace HEAD fetch with axios+cheerio; extend `LinkValidation`; add retry; tune limiter |
| `src/popup/index.tsx` | Add progress state; pass progress callback; optional auto-validate toggle |
| `src/components/Links.tsx` | Show group name, description; status filter buttons |
| `src/components/Actions.tsx` | Live progress label; "copy valid only" buttons |
| `src/utils.ts` | No changes (axios, cheerio, Bottleneck already exported here for reuse) |

---

## Risk / considerations

| Risk | Mitigation |
|---|---|
| WhatsApp rate-limiting validation requests | Conservative limiter (5 concurrent, 1s gap) + axios-retry with exponential backoff |
| `#main_block h3` selector breaks if WhatsApp changes their page HTML | Confirm selector before implementing; add fallback to `og:title` meta tag |
| Validation is slow (full HTML fetch vs HEAD) | IDEA-3 (streaming) masks the latency; progress counter manages expectation |
| Large link sets (100+) cause long validation runs | The limiter naturally queues them; auto-validate (IDEA-1) can start it earlier |
