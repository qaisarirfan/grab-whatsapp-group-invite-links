import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import EmptyState from '@components/EmptyState';
import HelpFaq from '@components/HelpFaq';
import Links from '@components/Links';
import Logs from '@components/Logs';
import Tab from '@components/Tabs';

import Analytics from '@src/analytics';
import { GOOGLE_SEARCH_URL } from '@src/constants';
import { useGoogleSearchScrape } from '@src/hooks/use-google-search-scrape';
import { useLinkValidation } from '@src/hooks/use-link-validation';
import { useSystemTheme } from '@src/hooks/use-system-theme';
import { getAllAnchorTags, inviteLink, isGoogle } from '@src/utils';

interface PropTypes {
  context: 'popup' | 'sidepanel';
}

function App({ context }: PropTypes) {
  const currentWindowIdRef = useRef<number | undefined>(undefined);
  const [currentURL, setCurrentURL] = useState<string | undefined>();
  const [googleSearchLinks, setGoogleSearchLinks] = useState<string[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [otherLinks, setOtherLinks] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState('links');

  const isGoogleSearchPage = isGoogle(currentURL);

  const searchLinks = useMemo(() => googleSearchLinks.filter((val) => !val.includes(GOOGLE_SEARCH_URL)), [googleSearchLinks]);

  const {
    autoValidate,
    autoValidateRef,
    inFlightLinks,
    isValidating,
    loadAutoValidateSetting,
    toggleAutoValidate,
    validateAllLinks,
    validationProgress,
  } = useLinkValidation(links, setLinks);
  const { fetchAll, hasFetchedRef, isLoading, logs } = useGoogleSearchScrape({
    autoValidateRef,
    currentURL,
    searchLinks,
    setCurrentTab,
    setLinks,
    validateAllLinks,
  });

  useSystemTheme();

  useEffect(() => {
    Analytics.fireEvent('extension_loaded', { context });

    const init = async () => {
      await loadAutoValidateSetting();

      chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
        const { url, id, title, windowId } = tabs[0];
        Analytics.firePageViewEvent(title ?? '', url ?? '');

        if (!id) return;
        currentWindowIdRef.current = windowId;
        setCurrentURL(url);
        Analytics.fireEvent('page_type_detected', {
          is_google: isGoogle(url),
          url,
        });
        chrome.scripting.executeScript(
          {
            target: { tabId: id },
            func: getAllAnchorTags,
          },
          (injectionResults) => {
            Analytics.fireEvent('dom_links_extracted', {
              total_links_found: injectionResults?.[0]?.result?.length ?? 0,
            });
            let linksFrom: string[] = [];
            injectionResults?.forEach(({ result }) => {
              linksFrom = [...linksFrom, ...(result ?? [])];
            });
            if (!isGoogle(url)) {
              Analytics.fireEvent('non_google_page_detected');
              const whatsappLink = linksFrom.map((val) => inviteLink(val)).filter((val) => val.length > 0);
              if (whatsappLink.length > 0) {
                const uniqueWhatsappLinks = [...new Set(whatsappLink)];
                setLinks(uniqueWhatsappLinks);
                if (autoValidateRef.current) {
                  validateAllLinks(uniqueWhatsappLinks);
                }
              } else {
                setOtherLinks([...new Set(linksFrom)]);
              }
            } else {
              Analytics.fireEvent('google_search_page_detected');
              setGoogleSearchLinks([...new Set(linksFrom)]);
            }
          }
        );
      });
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // chrome.sidePanel.open() must be called synchronously within the click's call stack — an
  // awaited chrome.tabs.query() beforehand can drop the user-gesture requirement, so the window ID
  // captured at mount (currentWindowIdRef) is used instead of re-querying here.
  const openInSidePanel = () => {
    Analytics.fireEvent('side_panel_opened_from_popup');
    const windowId = currentWindowIdRef.current;
    if (windowId !== undefined) {
      chrome.sidePanel.open({ windowId }).catch(() => {});
    }
    window.close();
  };

  const showLogsTab = isGoogleSearchPage && hasFetchedRef.current;
  const showLinksTab = isGoogleSearchPage ? hasFetchedRef.current : links.length > 0;
  const tabs = [
    ...(showLogsTab ? [{ name: 'Logs', key: 'logs' }] : []),
    ...(showLinksTab ? [{ name: 'Links', key: 'links' }] : []),
    { name: 'Help & FAQs', key: 'help' },
  ];
  const showFallback = currentTab !== 'help' && !(currentTab === 'links' && showLinksTab) && !(currentTab === 'logs' && showLogsTab);
  const showCenteredLayout = !hasFetchedRef.current && (links.length === 0 || logs.length === 0);

  return (
    <div
      className={cn(
        'relative min-h-[calc(100vh-60px)] p-3',
        context === 'sidepanel' ? 'max-w-none min-w-auto' : 'max-w-162.5 min-w-162.5',
        showCenteredLayout && 'flex flex-col justify-center'
      )}
    >
      <div className="flex items-center justify-between">
        <Tab
          tabs={tabs}
          currentSelected={currentTab}
          onTabSelected={(tab) => {
            Analytics.fireEvent('tab_changed', { tab });
            setCurrentTab(tab);
          }}
        />
        {context === 'popup' && (
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={openInSidePanel}>
            Open in side panel
          </Button>
        )}
      </div>
      {currentTab === 'links' && showLinksTab && (
        <Links
          links={links}
          fetchAll={fetchAll}
          isLoading={isLoading}
          isGoogleSearch={isGoogleSearchPage}
          onValidateAll={validateAllLinks}
          isValidating={isValidating}
          validationProgress={validationProgress}
          inFlightLinks={inFlightLinks}
          autoValidate={autoValidate}
          onToggleAutoValidate={toggleAutoValidate}
        />
      )}
      {currentTab === 'logs' && showLogsTab && (
        <Logs logs={logs.reverse()} isLoading={isLoading} progress={`${logs.length}/${searchLinks.length}`} />
      )}
      {currentTab === 'help' && <HelpFaq />}
      {showFallback && (
        <EmptyState
          isGoogleSearchPage={isGoogleSearchPage}
          searchLinksCount={searchLinks.length}
          otherLinksCount={otherLinks.length}
          isLoading={isLoading}
          showExtractAgain={logs.length > 0 && links.length === 0}
          onExtractClick={() => {
            Analytics.fireEvent('extract_clicked', {
              page: currentURL,
              google_links: searchLinks.length,
            });
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

export default App;
