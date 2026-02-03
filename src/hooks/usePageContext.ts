import { useEffect, useState } from 'react';

import Analytics from '@src/analytics';
import { isGoogle } from '@src/utils';

export function usePageContext() {
  const [currentURL, setCurrentURL] = useState<string>();
  const [isGoogleSearchPage, setIsGoogleSearchPage] = useState(false);

  useEffect(() => {
    Analytics.fireEvent('extension_loaded');

    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, ([tab]) => {
      if (!tab?.url) return;

      setCurrentURL(tab.url);
      const google = isGoogle(tab.url);
      setIsGoogleSearchPage(google);

      Analytics.firePageViewEvent(tab.title ?? '', tab.url);
      Analytics.fireEvent('page_type_detected', { is_google: google, url: tab.url });
    });
  }, []);

  return { currentURL, isGoogleSearchPage };
}
