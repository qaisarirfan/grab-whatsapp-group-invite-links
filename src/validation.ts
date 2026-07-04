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

  return validationLimiter.schedule(async () => {
    // Only fires once the rate limiter actually admits this job, not when it's merely queued
    onStart?.();

    // Validate
    const result = await validateLink(link);
    const validation: LinkValidation = {
      link,
      lastValidated: Date.now(),
      cacheVersion: CACHE_VERSION,
      ...result,
    };

    // Store result — re-read storage here since it may have changed while this job was queued
    const latestStorage = (await chrome.storage.local.get('validations')) as StorageData;
    const allValidations = latestStorage.validations || {};
    allValidations[link] = validation;
    await chrome.storage.local.set({ validations: allValidations });

    return validation;
  });
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

export const getStatusColor = (status: LinkStatus): string => {
  switch (status) {
    case 'valid':
      return '#28a745'; // green
    case 'expired':
      return '#dc3545'; // red
    case 'invalid':
      return '#ffc107'; // yellow
    case 'rate-limited':
      return '#6c757d'; // gray
    case 'pending':
    default:
      return '#6c757d'; // gray
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
