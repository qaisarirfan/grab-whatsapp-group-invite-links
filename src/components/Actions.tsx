import { useState } from 'react';

import { styled } from 'styled-components';

import Analytics from '@src/analytics';
import { convertToCsv, copyToClipboard } from '@src/utils';

const ActionsContainer = styled.div`
  align-items: center;
  background: #fff;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  left: 12px;
  padding-bottom: 12px;
  padding-top: 12px;
  position: sticky;
  right: 12px;
  top: 0;
`;

interface PropTypes {
  isGoogleSearchPage: boolean;
  isLoading: boolean;
  links: string[];
  onFetch: VoidFunction;
  onValidateAll?: VoidFunction;
  isValidating?: boolean;
}

function Actions({ isGoogleSearchPage, isLoading, links, onFetch, onValidateAll, isValidating }: PropTypes) {
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);

  const onFetchHandler = () => {
    setHasCopyAsJSON(false);
    setHasCopyAsText(false);
    onFetch();
  };

  const onValidateHandler = () => {
    if (onValidateAll) {
      Analytics.fireEvent('validate_all_clicked', { total_links: links.length });
      onValidateAll();
    }
  };

  const handleCopy = async (format: string) => {
    Analytics.fireEvent(`${format}_link_copied`, { total: links.length });
    const isTextFormat = format === 'text';

    setHasCopyAsJSON(false);
    setHasCopyAsText(false);

    if (isTextFormat) {
      setIsCopyAsText(true);
    } else {
      setIsCopyAsJSON(true);
    }

    try {
      const content = isTextFormat ? links.join('\r\n') : JSON.stringify(links);
      await copyToClipboard(content);

      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(true);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(true);
      }
    } catch {
      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(false);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(false);
      }
    }
  };

  const buttonClasses = ['size-small', 'shadow-hard', 'bg-blue', 'text-white', 'with-loader'];
  let copyAsTextButton = [...buttonClasses];
  if (!isCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter(val => val !== 'with-loader');
  }
  if (hasCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter(val => val !== 'bg-blue');
    copyAsTextButton.push('bg-green');
  }

  let copyAsJSONButton = [...buttonClasses];
  if (!isCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter(val => val !== 'with-loader');
  }
  if (hasCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter(val => val !== 'bg-blue');
    copyAsJSONButton.push('bg-green');
  }
  return (
    <ActionsContainer>
      <div>{links.length > 0 && <p>{`Total: ${links.length}`}</p>}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {isGoogleSearchPage && links.length > 0 && (
          <button
            className={`size-small bg-yellow shadow-hard ${isLoading && 'with-loader'}`}
            type="button"
            onClick={onFetchHandler}
            disabled={isLoading}>
            Extract again
          </button>
        )}
        {links.length > 0 && (
          <button
            className={`size-small bg-orange shadow-hard ${isValidating && 'with-loader'}`}
            type="button"
            onClick={onValidateHandler}
            disabled={isValidating}>
            {isValidating ? 'Validating...' : 'Validate links'}
          </button>
        )}
        <button className={copyAsTextButton.join(' ')} type="button" onClick={() => handleCopy('text')}>
          {`${hasCopyAsText ? 'Copied' : 'Copy'} as Text`}
        </button>
        <button className={copyAsJSONButton.join(' ')} type="button" onClick={() => handleCopy('json')}>
          {`${hasCopyAsJSON ? 'Copied' : 'Copy'} as JSON`}
        </button>
        <button
          type="button"
          className="size-small shadow-hard bg-cyan"
          onClick={() => {
            Analytics.fireEvent('links_downloaded', { total: links.length });
            convertToCsv(
              links.map(link => ({ Links: link })),
              'links'
            );
          }}>
          Download csv
        </button>
      </div>
    </ActionsContainer>
  );
}

export default Actions;
