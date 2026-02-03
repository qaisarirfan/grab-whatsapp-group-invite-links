import { useCallback, useRef, useState } from 'react';

import pLimit from 'p-limit';

import Analytics from '@src/analytics';
import { extractWhatsappLinks, handleError, parseUrl } from '@src/utils';
import { fetchData } from '@src/utils/fetchData';
import { ProgressTracker } from '@src/utils/progressTracker';

interface Log {
  origin: string;
  href: string;
  count: number;
  errorMessage: string | null;
  hasError: boolean;
}

export function useWhatsappExtraction() {
  const [links, setLinks] = useState<string[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0, elapsedMs: 0 });
  const hasRunRef = useRef(false);

  const fetchAll = useCallback(async (targets: string[]) => {
    const tracker = new ProgressTracker(targets.length);
    tracker.subscribe(setProgress);
    Analytics.fireEvent('fetch_started', { total_targets: targets.length });
    hasRunRef.current = true;
    const limit = pLimit(50);
    const results: string[] = [];
    setLinks([]);
    setLogs([]);

    setIsLoading(true);
    Analytics.fireEvent('loading_started');

    const tasks = targets.map(url =>
      limit(async () => {
        Analytics.fireEvent('page_fetch_initiated', { target_url: url });
        const tmpLog = {
          count: 0,
          errorMessage: null,
          hasError: false,
          ...parseUrl(url),
        };
        try {
          const data = await fetchData(url);
          const extracted = extractWhatsappLinks(data);
          results.push(...extracted);
          Analytics.fireEvent('page_fetch_success', {
            target_url: url,
            extracted_links: extracted.length,
          });
          if (extracted.length === 0) {
            Analytics.fireEvent('no_links_found', { page: url });
          }
          Object.assign(tmpLog, { count: extracted.length });
          tracker.success();
        } catch (e) {
          Analytics.fireErrorEvent({
            target_url: url,
            error: (e as Error).message,
          });
          Object.assign(tmpLog, handleError((e as Error).message));
          tracker.failure();
        }
        Analytics.fireEvent('log_recorded', tmpLog);
        setLogs(prevState => [...prevState, ...[tmpLog]]);
      })
    );

    await Promise.allSettled(tasks);
    const uniqueLinks = [...new Set(results)];
    setLinks(uniqueLinks);
    setIsLoading(false);
    Analytics.fireEvent('fetch_completed', {
      total_results: uniqueLinks.length,
    });
    Analytics.fireEvent('loading_finished');
  }, []);

  return {
    fetchAll,
    hasRunRef,
    isLoading,
    links,
    logs,
    progress,
  };
}
