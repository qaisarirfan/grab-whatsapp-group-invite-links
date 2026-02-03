import { fetchWithRetry } from './fetchClient';
import { limiter } from './rateLimiter';

export const fetchData = (url: string) => limiter.schedule(() => fetchWithRetry(url));
