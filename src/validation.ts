import axios from 'axios';
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry';
import Bottleneck from 'bottleneck';
import { load } from 'cheerio';

axiosRetry(axios, {
  retries: 3,
  retryDelay: exponentialDelay,
  retryCondition: (error) => error.response?.status === 429 || isNetworkOrIdempotentRequestError(error),
});

export type LinkStatus = 'pending' | 'valid' | 'expired' | 'invalid' | 'rate-limited';

export interface LinkValidation {
  link: string;
  status: LinkStatus;
  lastValidated: number; // timestamp
  errorDetails?: string;
  name?: string; // Group/community name from the invite page
  iconUrl?: string; // Group icon URL from the invite page
  cacheVersion?: number; // Bumped whenever this shape changes, to invalidate stale cache entries
}

export interface StorageData {
  validations: Record<string, LinkValidation>;
}

export type StatusFilter = 'all' | LinkStatus;

// Configure rate limiter for validation (2 requests per second)
const validationLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 500, // 500ms between requests
});

const VALIDATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 2; // Bump when LinkValidation shape changes so stale cache entries are re-fetched

export const validateLink = async (link: string): Promise<Omit<LinkValidation, 'link' | 'lastValidated'>> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await axios.get(link, { signal: controller.signal });
    clearTimeout(timeoutId);

    const $ = load(response.data);
    const name = $('#main_block h3').text().trim() || undefined;
    const iconUrl = $('#main_block img').first().attr('src') || undefined;

    if (name) {
      return { status: 'valid', name, iconUrl };
    }

    // Page loaded but no group name — link is expired or revoked
    return { status: 'expired' };
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
      return { status: 'rate-limited' };
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

// Tracks links currently being validated so an overlapping call (e.g. Retry re-targeting a link
// that's still in flight from the run it's retrying) reuses the same request instead of doubling
// traffic to WhatsApp's servers.
const inFlightValidations = new Map<string, Promise<LinkValidation>>();

export const validateLinkWithStorage = async (link: string, onStart?: () => void): Promise<LinkValidation> => {
  // Check cache first, outside the rate limiter — a cache hit needs no network call and
  // shouldn't wait behind the validationLimiter's queue.
  const storage = (await chrome.storage.local.get('validations')) as StorageData;
  const cached = storage.validations?.[link];

  // Rate-limited results are never served from cache — getStatusTooltip() promises they'll
  // retry automatically, so every validation pass must give them a fresh attempt.
  if (
    cached &&
    cached.cacheVersion === CACHE_VERSION &&
    cached.status !== 'rate-limited' &&
    Date.now() - cached.lastValidated < VALIDATION_CACHE_DURATION
  ) {
    return cached;
  }

  const inFlight = inFlightValidations.get(link);
  if (inFlight) {
    return inFlight;
  }

  const validation = validationLimiter
    .schedule(async () => {
      // Only fires once the rate limiter actually admits this job, not when it's merely queued
      onStart?.();

      // Validate
      const result = await validateLink(link);
      const newValidation: LinkValidation = {
        link,
        lastValidated: Date.now(),
        cacheVersion: CACHE_VERSION,
        ...result,
      };

      // Store result — re-read storage here since it may have changed while this job was queued
      const latestStorage = (await chrome.storage.local.get('validations')) as StorageData;
      const allValidations = latestStorage.validations || {};
      allValidations[link] = newValidation;
      await chrome.storage.local.set({ validations: allValidations });

      return newValidation;
    })
    .finally(() => {
      inFlightValidations.delete(link);
    });

  inFlightValidations.set(link, validation);
  return validation;
};

export const validateMultipleLinks = async (links: string[]): Promise<LinkValidation[]> => {
  const promises = links.map((link) => validateLinkWithStorage(link));
  return Promise.all(promises);
};

export const validateMultipleLinksWithProgress = async (
  links: string[],
  onProgress: (done: number, link: string) => void,
  onStart?: (link: string) => void
): Promise<LinkValidation[]> => {
  let done = 0;
  const promises = links.map((link) =>
    validateLinkWithStorage(link, () => onStart?.(link)).then((result) => {
      done += 1;
      onProgress(done, link);
      return result;
    })
  );
  return Promise.all(promises);
};

export const getValidationStatus = async (link: string): Promise<LinkValidation | null> => {
  const storage = (await chrome.storage.local.get('validations')) as StorageData;
  return storage.validations?.[link] || null;
};

export const clearValidationCache = async (): Promise<void> => {
  await chrome.storage.local.remove('validations');
};

// Tailwind utility classes rather than inline hex — these track the app's light/dark theme tokens
// (globals.css) instead of hardcoding colors that would look wrong or low-contrast in dark mode.
// 'expired' and 'rate-limited'/'pending' reuse the existing destructive/secondary design tokens;
// 'valid'/'invalid' don't have a matching semantic token yet, so they use Tailwind's color scale.
// Light-mode text uses the 700 shade rather than 600 — 600 measures 3.77:1 (emerald) / 3.19:1
// (amber) against a white background, both below the 4.5:1 WCAG AA requires at this badge's font
// size; 700 clears AA (5.48:1 / 5.02:1) while dark mode's 400 shade already passed at 10:1+.
export const getStatusBadgeClassName = (status: LinkStatus): string => {
  switch (status) {
    case 'valid':
      return 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
    case 'expired':
      return 'bg-destructive/10 text-destructive dark:bg-destructive/20';
    case 'invalid':
      return 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
    case 'rate-limited':
    case 'pending':
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

export const getStatusLabel = (status: LinkStatus): string => {
  switch (status) {
    case 'valid':
      return 'Active';
    case 'expired':
      return 'Expired';
    case 'invalid':
      return 'Invalid';
    case 'rate-limited':
      return 'Rate-limited';
    case 'pending':
    default:
      return 'Pending';
  }
};

export const getStatusCounts = (links: string[], validations: Record<string, LinkValidation>): Record<StatusFilter, number> =>
  links.reduce<Record<StatusFilter, number>>(
    (acc, link) => {
      const status = validations[link]?.status || 'pending';
      acc[status] += 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, pending: 0, valid: 0, expired: 0, invalid: 0, 'rate-limited': 0 }
  );

export const filterLinksByStatus = (links: string[], validations: Record<string, LinkValidation>, statusFilter: StatusFilter): string[] =>
  links.filter((link) => {
    if (statusFilter === 'all') return true;
    return (validations[link]?.status || 'pending') === statusFilter;
  });

// Collapses invite links that resolve to the same group name — links without a resolved name are kept as-is.
export const dedupeLinksByGroupName = (links: string[], validations: Record<string, LinkValidation>): string[] =>
  Object.values(
    links.reduce<Record<string, string>>((acc, link) => {
      const name = validations[link]?.name;
      if (name && !acc[name]) {
        acc[name] = link;
      } else if (!name) {
        acc[link] = link;
      }
      return acc;
    }, {})
  );

export const getStatusTooltip = (status: LinkStatus): string => {
  switch (status) {
    case 'valid':
      return 'This link is active and joinable';
    case 'expired':
      return 'This link has expired or been revoked';
    case 'invalid':
      return 'Could not verify this link (network or parsing error)';
    case 'rate-limited':
      return 'Temporarily rate-limited by WhatsApp — will retry automatically';
    case 'pending':
    default:
      return 'Not yet checked';
  }
};
