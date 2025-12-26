import Bottleneck from 'bottleneck';

export type LinkStatus = 'pending' | 'valid' | 'expired' | 'invalid' | 'rate-limited';

export interface LinkValidation {
  link: string;
  status: LinkStatus;
  lastValidated: number; // timestamp
  errorDetails?: string;
}

export interface StorageData {
  validations: Record<string, LinkValidation>;
}

// Configure rate limiter for validation (2 requests per second)
const validationLimiter = new Bottleneck({
  maxConcurrent: 10,
  minTime: 500, // 500ms between requests
});

const VALIDATION_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const validateLink = async (link: string): Promise<LinkStatus> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(link, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // For no-cors requests, we can't check the status directly
    // But successful fetch with no-cors means the server is reachable
    if (response.ok || response.type === 'opaque') {
      return 'valid';
    }

    if (response.status === 410 || response.status === 404) {
      return 'expired';
    }

    if (response.status === 429) {
      return 'rate-limited';
    }

    return 'invalid';
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return 'rate-limited';
      }
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        return 'expired';
      }
    }
    return 'invalid';
  }
};

export const validateLinkWithStorage = async (link: string): Promise<LinkValidation> => {
  return validationLimiter.schedule(async () => {
    // Check cache first
    const storage = (await chrome.storage.local.get('validations')) as StorageData;
    const cached = storage.validations?.[link];

    if (cached && Date.now() - cached.lastValidated < VALIDATION_CACHE_DURATION) {
      return cached;
    }

    // Validate
    const status = await validateLink(link);
    const validation: LinkValidation = {
      link,
      status,
      lastValidated: Date.now(),
    };

    // Store result
    const allValidations = storage.validations || {};
    allValidations[link] = validation;
    await chrome.storage.local.set({ validations: allValidations });

    return validation;
  });
};

export const validateMultipleLinks = async (links: string[]): Promise<LinkValidation[]> => {
  const promises = links.map(link => validateLinkWithStorage(link));
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
      return 'Limited';
    case 'pending':
    default:
      return 'Checking...';
  }
};
