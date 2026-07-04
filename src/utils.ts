import { StreamParser } from '@json2csv/plainjs';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { load } from 'cheerio';

export const inviteLink = (link: string | undefined) => {
  if (!link) return '';
  if (link.includes('chat.whatsapp.com')) {
    const regex = /https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}/gm;
    const result = link.replace('/invite', '');
    const group = result.match(regex);
    if (group) return group[0];
    return '';
  }
  return '';
};

export const isValidURL = (string: string) => {
  const res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
  return res !== null;
};

export const isGoogle = (location: string | undefined) => {
  if (!location) return false;
  const url = new URL(location);
  return `${url?.origin}${url?.pathname}` === 'https://www.google.com/search';
};

export const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const parseUrl = (val: string) => {
  const parsedUrl = new URL(val);
  return {
    origin: parsedUrl.origin,
    href: parsedUrl.href,
  };
};

// Configure rate limiter (e.g., 5 requests per second)
export const limiter = new Bottleneck({
  maxConcurrent: 50, // Maximum concurrent requests
  minTime: 200, // Wait 200ms between each request
});

// A hard timeout is required here: fetchAll() waits on Promise.allSettled() for every
// scraped page, so one unresponsive site would otherwise hang the entire extraction.
export const fetchData = async (url: string) => limiter.schedule(() => axios.get(url, { timeout: 10000 }));

export const extractWhatsappLinks = (htmlContent: string) => {
  const waLinks: string[] = [];
  const $ = load(htmlContent);
  $('a').each((_, ele) => {
    const link = inviteLink($(ele).attr('href'));
    if (link) {
      waLinks.push(link);
    }
  });
  return [...new Set(waLinks)];
};

export const handleError = (error: string) => ({
  hasError: true,
  errorMessage: error.replace('AxiosError: ', ''),
});

// Injected via chrome.scripting.executeScript, so this runs in the page's context and
// cannot close over other module imports (e.g. isValidURL above) — the URL regex below
// is intentionally duplicated rather than shared.
export const getAllAnchorTags = () => {
  const isGoogleSearch = `${window?.location?.origin}${window?.location?.pathname}` === 'https://www.google.com/search';

  let tags = document.querySelectorAll('a');
  if (isGoogleSearch) {
    tags = document.querySelectorAll('#search a');
  }
  const ls = [];
  for (let idx = 0; idx < tags.length; idx += 1) {
    const value = tags[idx];
    const res = value.href.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
    if (res !== null) {
      ls.push(value.href);
    }
  }
  return Array.from(new Set(ls));
};

export const convertToCsv = (data: Record<string, unknown>[], filename: string) => {
  const opts = {};
  const parser = new StreamParser(opts, { objectMode: true });

  let csv = '';
  parser.onData = (chunk) => {
    csv += chunk.toString();
    return csv;
  };
  parser.onError = (err) => console.error(err);
  parser.onEnd = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${filename}-${timestamp}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const pom = document.createElement('a');
    pom.style.visibility = 'hidden';
    pom.setAttribute('href', url);
    pom.setAttribute('download', fileName);
    document.body.appendChild(pom);
    pom.click();
    document.body.removeChild(pom);
    URL.revokeObjectURL(url);
  };
  data.forEach((record) => parser.write(record));
  parser.end();
};

export default {
  inviteLink,
  isValidURL,
  isGoogle,
  copyToClipboard,
  sleep,
};
