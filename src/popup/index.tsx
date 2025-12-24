import React, { useEffect, useMemo, useRef, useState } from 'react';

import { isAxiosError } from 'axios';
import pLimit from 'p-limit';
import { createRoot } from 'react-dom/client';
import { styled } from 'styled-components';

import Header from '@components/Header';
import Links from '@components/Links';
import Logs from '@components/Logs';
import Tab from '@components/Tabs';

import Analytics from '@src/analytics';
import { GOOGLE_SEARCH_URL } from '@src/constants';
import { extractWhatsappLinks, fetchData, handleError, inviteLink, isGoogle, parseUrl } from '@src/utils';

const Container = styled.div`
  max-width: 650px;
  min-height: calc(100vh - 60px);
  min-width: 650px;
  padding: 12px;
  position: relative;
`;

const ExtractButton = styled.button`
  margin-top: 12px;
  &::after {
    border-color: #000;
    border-top-color: transparent;
    border-right-color: transparent;
  }
`;

type Log = {
  origin: string;
  href: string;
  count: number;
  errorMessage: string | null;
  hasError: boolean;
};

function Popup() {
  const ref = useRef(false);
  const [currentURL, setCurrentURL] = useState<string | undefined>();
  const [googleSearchLinks, setGoogleSearchLinks] = useState<string[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [links, setLinks] = useState<string[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [otherLinks, setOtherLinks] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState('links');

  const isGoogleSearchPage = isGoogle(currentURL);

  const searchLinks = useMemo(() => googleSearchLinks.filter(val => !val.includes(GOOGLE_SEARCH_URL)), [googleSearchLinks]);

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

  useEffect(() => {
    Analytics.fireEvent('extension_loaded');

    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, tabs => {
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
        injectionResults => {
          Analytics.fireEvent('dom_links_extracted', {
            total_links_found: injectionResults?.[0]?.result?.length ?? 0,
          });
          let linksFrom: string[] = [];
          injectionResults?.forEach(({ result }) => {
            linksFrom = [...linksFrom, ...(result ?? [])];
          });
          if (!isGoogle(url)) {
            Analytics.fireEvent('non_google_page_detected');
            const whatsappLink = linksFrom.map(val => inviteLink(val)).filter(val => val.length > 0);
            if (whatsappLink.length > 0) {
              setLinks([...new Set(whatsappLink)]);
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
  }, []);

  const logResults = (log: Log, waLinks: string[]) => {
    Analytics.fireEvent('log_recorded', {
      origin: log.origin,
      has_error: log.hasError,
      count: waLinks.length,
    });
    setLogs(prevState => [
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
    const limit = pLimit(50); // Allow up to 50 concurrent requests
    setLinks([]);
    setLoading(true);
    Analytics.fireEvent('loading_started');
    setLogs([]);
    let store: string[] = [];

    const promises = searchLinks.map(link => limit(() => getWhatsappLink(link)));

    try {
      const res = await Promise.allSettled(promises);

      res.forEach(r => {
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
      }
    } finally {
      setLoading(false);
      setCurrentTab('links');
    }
  };

  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    otherLinks.length > 0 ? ` but you found ${otherLinks.length} other links. ` : '. ',
  ]
    .join('')
    .trim();

  return (
    <Container
      style={{
        ...(!ref.current &&
          (links.length === 0 || logs.length === 0) && {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }),
      }}>
      {isGoogleSearchPage && ref.current && (
        <>
          <Tab
            tabs={[
              { name: 'Logs', key: 'logs' },
              { name: 'Links', key: 'links' },
            ]}
            currentSelected={currentTab}
            onTabSelected={tab => {
              Analytics.fireEvent('tab_changed', { tab });
              setCurrentTab(tab);
            }}
          />
          {currentTab === 'links' && <Links links={links} fetchAll={fetchAll} isLoading={isLoading} isGoogleSearch={isGoogleSearchPage} />}
          {currentTab === 'logs' && <Logs logs={logs.reverse()} isLoading={isLoading} progress={`${logs.length}/${searchLinks.length}`} />}
        </>
      )}
      {!isGoogleSearchPage && links.length > 0 && (
        <Links links={links} fetchAll={fetchAll} isLoading={isLoading} isGoogleSearch={isGoogleSearchPage} />
      )}
      {!isGoogleSearchPage && links.length < 1 && (
        <>
          <Header />
          <p className="text-centre">{nonGoogleMessage}</p>
        </>
      )}
      {isGoogleSearchPage && links.length < 1 && logs.length < 1 && (
        <>
          <Header />
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
              disabled={isLoading}>
              Extract {logs.length > 0 && links.length === 0 ? 'again' : null}
            </ExtractButton>
          </div>
        </>
      )}
    </Container>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
