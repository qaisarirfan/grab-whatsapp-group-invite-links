import { useEffect, useMemo, useState } from 'react';

import EmptyState from '@components/EmptyState';
import HelpFaq from '@components/HelpFaq';
import Links from '@components/Links';
import Logs from '@components/Logs';
import Tab from '@components/Tabs';
import ThemeToggle from '@components/ThemeToggle';

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
  const [currentTab, setCurrentTab] = useState('x');

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

  const { mode: themeMode, setMode: setThemeMode } = useSystemTheme();

  const handleExtractClick = () => {
    Analytics.fireEvent('extract_clicked', {
      page: currentURL,
      google_links: searchLinks.length,
    });
    fetchAll();
  };

  useEffect(() => {
    Analytics.fireEvent('extension_loaded');

    const init = async () => {
      await loadAutoValidateSetting();

      chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, (tabs) => {
        const [tab] = tabs;
        if (!tab) return;
        const { url, id, title } = tab;
        Analytics.firePageViewEvent(title ?? '', url ?? '');

        if (!id) return;
        setCurrentURL(url);
        if (!isGoogle(url)) setCurrentTab('links');
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
  // Home only applies to the Google Search extract flow — on any other page, links are already
  // shown automatically, so Links is the permanent landing tab instead.
  const showLinksTab = isGoogleSearchPage ? hasFetched : true;
  // Tab membership stays fixed per page type — Logs and Home only ever apply in Google Search
  // mode, so their presence there is a structural difference, not state churn. Links/Help never
  // disappear mid-session; a tab that isn't ready yet is disabled instead, so the bar never
  // reflows under the user while they're mid-task.
  const tabs = [
    ...(isGoogleSearchPage ? [{ name: 'Home', key: 'x' }] : []),
    ...(isGoogleSearchPage ? [{ name: 'Logs', key: 'logs', disabled: !showLogsTab }] : []),
    { name: 'Links', key: 'links', disabled: !showLinksTab },
    { name: 'Help & FAQs', key: 'help' },
  ];
  const showFallback = currentTab !== 'help' && !(currentTab === 'links' && showLinksTab) && !(currentTab === 'logs' && showLogsTab);

  return (
    <div className="relative h-full w-200 p-3">
      <div className="flex items-center justify-between gap-2 border-b">
        <nav aria-label="Sections" className="min-w-0 overflow-x-auto">
          <Tab
            tabs={tabs}
            currentSelected={currentTab}
            onTabSelected={(tab) => {
              Analytics.fireEvent('tab_changed', { tab });
              setCurrentTab(tab);
            }}
          />
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          <p>Support me on</p>
          <a href="https://www.buymeacoffee.com/qaisarirfan" target="_blank" rel="noreferrer">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" className="h-7.5" />
          </a>
        </div>
      </div>
      <main>
        {currentTab === 'links' && showLinksTab && (
          <Links
            links={links}
            fetchAll={fetchAll}
            isLoading={isLoading}
            isGoogleSearch={isGoogleSearchPage}
            searchLinksCount={searchLinks.length}
            otherLinks={otherLinks}
            showExtractAgain={logs.length > 0 && links.length === 0}
            onExtractClick={handleExtractClick}
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
            onExtractClick={handleExtractClick}
          />
        )}
      </main>
    </div>
  );
}

export default App;
