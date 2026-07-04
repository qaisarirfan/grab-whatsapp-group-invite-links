import { type Dispatch, type MutableRefObject, type SetStateAction, useRef, useState } from 'react';

import { isAxiosError } from 'axios';

import Analytics from '@src/analytics';
import { extractWhatsappLinks, fetchData, handleError, parseUrl } from '@src/utils';
import { validateLinkWithStorage } from '@src/validation';

type Log = {
  origin: string;
  href: string;
  count: number;
  errorMessage: string | null;
  hasError: boolean;
};

interface UseGoogleSearchScrapeArgs {
  autoValidateRef: MutableRefObject<boolean>;
  currentURL: string | undefined;
  searchLinks: string[];
  setCurrentTab: Dispatch<SetStateAction<string>>;
  setLinks: Dispatch<SetStateAction<string[]>>;
  validateAllLinks: (targetLinks?: string[]) => Promise<void>;
}

export function useGoogleSearchScrape({
  autoValidateRef,
  currentURL,
  searchLinks,
  setCurrentTab,
  setLinks,
  validateAllLinks,
}: UseGoogleSearchScrapeArgs) {
  const hasFetchedRef = useRef(false);
  const [isLoading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);

  const logResults = (log: Log, waLinks: string[]) => {
    Analytics.fireEvent('log_recorded', {
      origin: log.origin,
      has_error: log.hasError,
      count: waLinks.length,
    });
    setLogs((prevState) => [
      ...prevState,
      {
        ...log,
        count: waLinks.length,
      },
    ]);
  };

  const getWhatsappLink = async (val: string) => {
    Analytics.fireEvent('page_fetch_initiated', { target_url: val });

    const waLinks = [];
    const tmpLog = {
      count: 0,
      errorMessage: null,
      hasError: false,
      ...parseUrl(val),
    };

    try {
      const { data } = await fetchData(val);
      const extractedLinks = extractWhatsappLinks(data);
      waLinks.push(...extractedLinks);
      // Kick off validation as each link is found, rather than waiting for extraction to finish
      extractedLinks.forEach((link) => {
        validateLinkWithStorage(link).catch(() => {});
      });
      Analytics.fireEvent('page_fetch_success', {
        target_url: val,
        extracted_links: extractedLinks.length,
      });
    } catch (error) {
      if (isAxiosError(error)) {
        Analytics.fireErrorEvent({
          target_url: val,
          error: error.message,
        });
        Object.assign(tmpLog, handleError(error.message));
      }
    }
    logResults(tmpLog, waLinks);
    return waLinks;
  };

  const fetchAll = async () => {
    Analytics.fireEvent('fetch_started', { total_targets: searchLinks.length });
    hasFetchedRef.current = true;
    setCurrentTab('logs');
    const { default: pLimit } = await import('p-limit');
    const limit = pLimit(100); // Allow up to 100 concurrent requests
    setLinks([]);
    setLoading(true);
    Analytics.fireEvent('loading_started');
    setLogs([]);
    let store: string[] = [];

    const promises = searchLinks.map((link) => limit(() => getWhatsappLink(link)));

    try {
      const res = await Promise.allSettled(promises);

      res.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          store = [...store, ...r.value];
        }
      });
      const uniqueLinks = [...new Set(store)];
      setLinks(uniqueLinks);
      Analytics.fireEvent('fetch_completed', {
        total_results: uniqueLinks.length,
      });
      Analytics.fireEvent('loading_finished');
      if (uniqueLinks.length === 0) {
        Analytics.fireEvent('no_links_found', { page: currentURL });
      } else if (autoValidateRef.current) {
        validateAllLinks(uniqueLinks);
      }
    } finally {
      setLoading(false);
      setCurrentTab('links');
    }
  };

  return { fetchAll, hasFetchedRef, isLoading, logs };
}
