import { StreamParser } from '@json2csv/plainjs';
import { load } from 'cheerio';

import { http } from './utils/httpClient';
import { limiter } from './utils/rateLimiter';

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

export const extractLinks = (text: string) => {
  const regex = /https:\/\/chat\.whatsapp\.com(?:\/invite)?\/([A-Za-z0-9]{22})/gm;
  const waLinks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const link = m[0];
    if (link) {
      waLinks.push(link);
    }
  }
  return waLinks;
};

export const isValidURL = (string: string) => {
  const res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/g);
  return res !== null;
};

export const isGoogle = (location: string | undefined) => {
  if (!location) return false;
  const url = new URL(location);
  return url.origin.includes('google') && url.pathname === '/search';
};

export const copyToClipboard = async (text: string) => {
  await navigator.clipboard.writeText(text);
};

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const parseUrl = (val: string) => {
  const parsedUrl = new URL(val);
  return {
    origin: parsedUrl.origin,
    href: parsedUrl.href,
  };
};

export const fetchData = async (url: string) => limiter.schedule(() => http.get(url));

export const extractWhatsappLinks = (htmlContent: string) => {
  const waLinks: string[] = [];
  const $ = load(htmlContent);
  $('a').each((_, ele) => {
    const link = inviteLink($(ele).attr('href'));
    if (link) {
      waLinks.push(link);
    }
  });
  const whatsappLinks = extractLinks(htmlContent).map(inviteLink);
  return [...new Set(waLinks.concat(whatsappLinks))];
};

export const handleError = (error: string) => ({
  hasError: true,
  errorMessage: error.replace('AxiosError: ', ''),
});

export const convertToCsv = (data: Record<string, unknown>[], filename: string) => {
  const opts = {};
  const parser = new StreamParser(opts, { objectMode: true });

  let csv = '';
  parser.onData = chunk => {
    csv += chunk.toString();
    return csv;
  };
  parser.onEnd = () => console.log(csv);
  parser.onError = err => console.error(err);
  data.forEach(record => parser.write(record));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${filename}-${timestamp}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const pom = document.createElement('a');
  pom.style.visibility = 'hidden';
  pom.setAttribute('href', url);
  pom.setAttribute('download', fileName);
  pom.click();
  document.body.removeChild(pom);
};

export default {
  copyToClipboard,
  extractLinks,
  inviteLink,
  isGoogle,
  isValidURL,
  sleep,
};
