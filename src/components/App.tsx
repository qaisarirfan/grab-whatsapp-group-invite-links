import { useEffect, useMemo, useRef, useState } from 'react';

import { isAxiosError } from 'axios';
import { styled } from 'styled-components';

import Header from '@components/Header';
import HelpFaq from '@components/HelpFaq';
import Links from '@components/Links';
import Logs from '@components/Logs';
import Tab from '@components/Tabs';

import Analytics from '@src/analytics';
import { GOOGLE_SEARCH_URL } from '@src/constants';
import { extractWhatsappLinks, fetchData, handleError, inviteLink, isGoogle, parseUrl } from '@src/utils';
import { validateLinkWithStorage, validateMultipleLinksWithProgress } from '@src/validation';

const Container = styled.div<{ $isSidePanel: boolean }>`
  max-width: ${({ $isSidePanel }) => ($isSidePanel ? 'none' : '650px')};
  min-height: calc(100vh - 60px);
  min-width: ${({ $isSidePanel }) => ($isSidePanel ? 'auto' : '650px')};
  padding: 12px;
  position: relative;
`;

const TopBar = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
`;

const ExtractButton = styled.button`
  margin-top: 12px;
  &::after {
    border-color: #000;
    border-top-color: transparent;
    border-right-color: transparent;
  }
`;

const OpenSidePanelButton = styled.button`
  flex-shrink: 0;
`;

type Log = {
  origin: string;
  href: string;
  count: number;
  errorMessage: string | null;
  hasError: boolean;
};

interface PropTypes {
  context: 'popup' | 'sidepanel';
}

function App({ context }: PropTypes) {
  const ref = useRef(false);
  const currentWindowIdRef = useRef<number | undefined>(undefined);
  const [currentURL, setCurrentURL] = useState<string | undefined>();
  const [googleSearchLinks, setGoogleSearchLinks] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState({ done: 0, total: 0 });
  const [links, setLinks] = useState<string[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [otherLinks, setOtherLinks] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState('links');
  const [autoValidate, setAutoValidate] = useState(false);
  const autoValidateRef = useRef(false);
  const [inFlightLinks, setInFlightLinks] = useState<string[]>([]);

  const isGoogleSearchPage = isGoogle(currentURL);

  const searchLinks = useMemo(() => googleSearchLinks.filter((val) => !val.includes(GOOGLE_SEARCH_URL)), [googleSearchLinks]);

  // Injected via chrome.scripting.executeScript, so this runs in the page's context and
  // cannot close over popup-module imports (e.g. isValidURL from @src/utils) — the URL
  // regex below is intentionally duplicated rather than shared.
  const getAllAnchorTags = () => {
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

  // globals.css gates dark-mode tokens behind a `.dark` class (`@custom-variant dark (&:is(.dark *))`)
  // rather than a `prefers-color-scheme` media query, so it has to be toggled manually here.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = (isDark: boolean) => document.documentElement.classList.toggle('dark', isDark);

    applySystemTheme(media.matches);
    const onChange = (event: MediaQueryListEvent) => applySystemTheme(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    Analytics.fireEvent('extension_loaded', { context });

    const init = async () => {
      const stored = (await chrome.storage.local.get('autoValidate')) as { autoValidate?: boolean };
      autoValidateRef.current = stored.autoValidate ?? false;
      setAutoValidate(autoValidateRef.current);

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
    ref.current = true;
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

  const validateAllLinks = async (targetLinks: string[] = links) => {
    Analytics.fireEvent('validate_links_started', { total_links: targetLinks.length });
    setValidationProgress({ done: 0, total: targetLinks.length });
    setInFlightLinks([]);
    setIsValidating(true);
    try {
      await validateMultipleLinksWithProgress(
        targetLinks,
        (done, link) => {
          setValidationProgress((prev) => ({ ...prev, done }));
          setInFlightLinks((prev) => prev.filter((l) => l !== link));
          // Trigger a re-render of the links component to show each result as it arrives
          setLinks((prev) => [...prev]);
        },
        (link) => setInFlightLinks((prev) => (prev.includes(link) ? prev : [...prev, link]))
      );
      Analytics.fireEvent('validate_links_completed', { total_links: targetLinks.length });
    } catch (error) {
      Analytics.fireErrorEvent({
        context: 'validate_links_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsValidating(false);
      setInFlightLinks([]);
    }
  };

  const toggleAutoValidate = (value: boolean) => {
    autoValidateRef.current = value;
    setAutoValidate(value);
    chrome.storage.local.set({ autoValidate: value });
  };

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

  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    otherLinks.length > 0 ? ` but you found ${otherLinks.length} other links. ` : '. ',
  ]
    .join('')
    .trim();

  const showLogsTab = isGoogleSearchPage && ref.current;
  const showLinksTab = isGoogleSearchPage ? ref.current : links.length > 0;
  const tabs = [
    ...(showLogsTab ? [{ name: 'Logs', key: 'logs' }] : []),
    ...(showLinksTab ? [{ name: 'Links', key: 'links' }] : []),
    { name: 'Help & FAQs', key: 'help' },
  ];
  const showFallback = currentTab !== 'help' && !(currentTab === 'links' && showLinksTab) && !(currentTab === 'logs' && showLogsTab);

  return (
    <Container
      $isSidePanel={context === 'sidepanel'}
      style={{
        ...(!ref.current &&
          (links.length === 0 || logs.length === 0) && {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }),
      }}
    >
      <TopBar>
        <Tab
          tabs={tabs}
          currentSelected={currentTab}
          onTabSelected={(tab) => {
            Analytics.fireEvent('tab_changed', { tab });
            setCurrentTab(tab);
          }}
        />
        {context === 'popup' && (
          <OpenSidePanelButton className="shape-rounded" type="button" onClick={openInSidePanel}>
            Open in side panel
          </OpenSidePanelButton>
        )}
      </TopBar>
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
        <>
          <Header />
          {!isGoogleSearchPage && <p className="text-centre">{nonGoogleMessage}</p>}
          {isGoogleSearchPage && (
            <>
              <p className="text-centre">Extract WhatsApp group links from Google search result ({searchLinks.length})</p>
              <div className="text-center">
                <ExtractButton
                  className={`shape-rounded bg-yellow shadow-hard ${isLoading && 'with-loader'}`}
                  type="button"
                  onClick={() => {
                    Analytics.fireEvent('extract_clicked', {
                      page: currentURL,
                      google_links: searchLinks.length,
                    });
                    fetchAll();
                  }}
                  disabled={isLoading}
                >
                  Extract {logs.length > 0 && links.length === 0 ? 'again' : null}
                </ExtractButton>
              </div>
            </>
          )}
        </>
      )}
    </Container>
  );
}

export default App;
