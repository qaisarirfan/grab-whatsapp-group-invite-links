import { useEffect, useMemo, useState } from 'react';

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

function App() {
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
    cancelValidation,
    inFlightLinks,
    isValidating,
    loadAutoValidateSetting,
    queuedLinks,
    retryValidation,
    toggleAutoValidate,
    validateAllLinks,
    validationProgress,
  } = useLinkValidation(links, setLinks);

  const { fetchAll, hasFetched, isLoading, logs } = useGoogleSearchScrape({
    autoValidateRef,
    currentURL,
    searchLinks,
    setCurrentTab,
    setLinks,
    validateAllLinks,
  });

  useSystemTheme();

  useEffect(() => {
    Analytics.fireEvent('extension_loaded');

    const init = async () => {
      await loadAutoValidateSetting();

      chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
        const { url, id, title } = tabs[0];
        Analytics.firePageViewEvent(title ?? '', url ?? '');

        if (!id) return;
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

  const showLogsTab = isGoogleSearchPage && hasFetched;
  const showLinksTab = isGoogleSearchPage ? hasFetched : links.length > 0;
  const tabs = [
    ...(isGoogleSearchPage || currentTab === 'help' ? [{ name: 'Home', key: 'x' }] : []),
    ...(showLogsTab ? [{ name: 'Logs', key: 'logs' }] : []),
    ...(showLinksTab ? [{ name: 'Links', key: 'links' }] : []),
    { name: 'Help & FAQs', key: 'help' },
  ];
  const showFallback = currentTab !== 'help' && !(currentTab === 'links' && showLinksTab) && !(currentTab === 'logs' && showLogsTab);

  return (
    <div className="relative h-full max-w-162.5 min-w-162.5 p-3">
      <div className="flex items-center justify-between border-b">
        <Tab
          tabs={tabs}
          currentSelected={currentTab}
          onTabSelected={(tab) => {
            Analytics.fireEvent('tab_changed', { tab });
            setCurrentTab(tab);
          }}
        />
        <div className="flex items-center gap-3 fixed top-2 right-3">
          <p>Support me on</p>
          <a href="https://www.buymeacoffee.com/qaisarirfan" target="_blank" rel="noreferrer">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" className="h-7.5" />
          </a>
        </div>
      </div>
      {currentTab === 'links' && showLinksTab && (
        <Links
          links={links}
          fetchAll={fetchAll}
          isLoading={isLoading}
          isGoogleSearch={isGoogleSearchPage}
          onValidateAll={validateAllLinks}
          onCancelValidation={cancelValidation}
          onRetryValidation={retryValidation}
          isValidating={isValidating}
          validationProgress={validationProgress}
          inFlightLinks={inFlightLinks}
          queuedLinks={queuedLinks}
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
          otherLinks={otherLinks}
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
