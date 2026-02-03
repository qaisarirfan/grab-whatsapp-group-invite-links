import React, { useState } from 'react';

import { createRoot } from 'react-dom/client';
import { styled } from 'styled-components';

import Links from '@components/Links';
import Logs from '@components/Logs';
import Tab from '@components/Tabs';
import ValidLinks from '@components/ValidLinks';

import Analytics from '@src/analytics';
import GoogleSearchEmptyState from '@src/features/GoogleSearchEmptyState';
import NonGoogleEmptyState from '@src/features/NonGoogleEmptyState';
import { useDomLinkExtraction } from '@src/hooks/useDomLinkExtraction';
import { usePageContext } from '@src/hooks/usePageContext';
import { useWhatsappExtraction } from '@src/hooks/useWhatsappExtraction';

const Container = styled.div`
  max-width: 650px;
  min-height: calc(100vh - 60px);
  min-width: 650px;
  padding: 12px;
  position: relative;
`;

function Popup() {
  const [currentTab, setCurrentTab] = useState('links');

  const { currentURL, isGoogleSearchPage } = usePageContext();
  const { googleLinks, otherLinks, directLinks } = useDomLinkExtraction(currentURL, isGoogleSearchPage);
  const { fetchAll, isLoading, links, logs, hasRunRef, progress } = useWhatsappExtraction();

  const handleFetchAll = async () => {
    setCurrentTab('logs');
    await fetchAll(googleLinks);
    setCurrentTab('links');
  };

  return (
    <Container
      style={{
        ...(!hasRunRef.current &&
          directLinks.length === 0 &&
          links.length === 0 &&
          logs.length === 0 && {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }),
      }}>
      {isGoogleSearchPage && hasRunRef.current && (
        <>
          <Tab
            tabs={[
              { name: 'Logs', key: 'logs' },
              { name: 'Links', key: 'links' },
              { name: 'Validation', key: 'validation' },
            ]}
            currentSelected={currentTab}
            onTabSelected={tab => {
              Analytics.fireEvent('tab_changed', { tab });
              setCurrentTab(tab);
            }}
          />
          {currentTab === 'links' && (
            <Links links={links} fetchAll={handleFetchAll} isLoading={isLoading} isGoogleSearch={isGoogleSearchPage} />
          )}
          {currentTab === 'logs' && (
            <Logs
              logs={logs.reverse()}
              isLoading={isLoading}
              progress={
                <div className="progress row" style={{ gap: 12 }}>
                  <div className="text-blue">
                    Processed: {progress.completed + progress.failed} / {progress.total}
                  </div>
                  <div className="text-green">Success: {progress.completed}</div>
                  <div className="text-red">Failed: {progress.failed}</div>
                  <div className="text-violet">Time: {(progress.elapsedMs / 1000).toFixed(1)}s</div>
                </div>
              }
            />
          )}
        </>
      )}
      {!isGoogleSearchPage && directLinks.length > 0 && (
        <>
          <Tab
            tabs={[
              { name: 'Links', key: 'links' },
              { name: 'Validation', key: 'validation' },
            ]}
            currentSelected={currentTab}
            onTabSelected={tab => {
              Analytics.fireEvent('tab_changed', { tab });
              setCurrentTab(tab);
            }}
          />
          {currentTab === 'links' && (
            <Links links={directLinks} fetchAll={handleFetchAll} isLoading={isLoading} isGoogleSearch={isGoogleSearchPage} />
          )}
          {currentTab === 'validation' && <ValidLinks links={directLinks} isLoading={isLoading} onValidate={() => null} />}
        </>
      )}
      {!isGoogleSearchPage && directLinks.length < 1 && <NonGoogleEmptyState extractedLinkCount={otherLinks.length} />}
      {isGoogleSearchPage && links.length < 1 && logs.length < 1 && (
        <GoogleSearchEmptyState
          extractedLinkCount={googleLinks.length}
          isExtractionInProgress={isLoading}
          onExtractRequest={() => {
            Analytics.fireEvent('extract_clicked', {
              page: currentURL,
              search_links: googleLinks.length,
            });
            handleFetchAll();
          }}
        />
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
