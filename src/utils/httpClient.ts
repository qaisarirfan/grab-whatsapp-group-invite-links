import axios from 'axios';
import axiosRetry, { exponentialDelay, isNetworkOrIdempotentRequestError } from 'axios-retry';

export const http = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (ScraperBot/1.0)',
    Accept: 'text/html',
  },
});

axiosRetry(http, {
  retries: 3,
  retryDelay: exponentialDelay,
  retryCondition: error => error.response?.status === 429 || isNetworkOrIdempotentRequestError(error),
});
