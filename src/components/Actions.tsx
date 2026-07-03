import { useState } from 'react';

import { styled } from 'styled-components';

import Analytics from '@src/analytics';
import { convertToCsv, copyToClipboard } from '@src/utils';
import type { LinkValidation } from '@src/validation';
import { getStatusLabel } from '@src/validation';

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 12px;
  padding-top: 12px;
`;

const ScopeGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  border-left: 2px solid #ddd;
`;

const ScopeCaption = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #888;
`;

const Toggle = styled.label`
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
`;

const ProgressSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0 8px;
`;

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #eee;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${(props) => props.$percent}%;
  background: #f68a46;
  transition: width 0.3s ease;
`;

const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #666;
`;

const CurrentlyValidating = styled.span`
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
`;

interface PropTypes {
  isGoogleSearchPage: boolean;
  isLoading: boolean;
  links: string[];
  visibleLinks: string[];
  onFetch: VoidFunction;
  onValidateAll?: VoidFunction;
  isValidating?: boolean;
  validationProgress?: { done: number; total: number };
  inFlightLinks?: string[];
  validations?: Record<string, LinkValidation>;
  autoValidate?: boolean;
  onToggleAutoValidate?: (value: boolean) => void;
}

function Actions({
  isGoogleSearchPage,
  isLoading,
  links,
  visibleLinks,
  onFetch,
  onValidateAll,
  isValidating,
  validationProgress,
  inFlightLinks,
  validations,
  autoValidate,
  onToggleAutoValidate,
}: PropTypes) {
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);
  const [hasCopyValid, setHasCopyValid] = useState(false);
  const [isCopyValid, setIsCopyValid] = useState(false);

  // "Copy/Download" actions operate on whatever the status filter + dedupe toggle currently show,
  // not the full extracted set — so exports always match what's on screen.
  const isScoped = visibleLinks.length !== links.length;
  const scopeWord = isScoped ? `shown (${visibleLinks.length})` : 'all';
  const validLinks = visibleLinks.filter((link) => validations?.[link]?.status === 'valid');

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
    Analytics.fireEvent(`${format}_link_copied`, { total: visibleLinks.length });
    const isTextFormat = format === 'text';

    setHasCopyAsJSON(false);
    setHasCopyAsText(false);

    if (isTextFormat) {
      setIsCopyAsText(true);
    } else {
      setIsCopyAsJSON(true);
    }

    try {
      const content = isTextFormat ? visibleLinks.join('\r\n') : JSON.stringify(visibleLinks);
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

  const handleCopyValid = async () => {
    Analytics.fireEvent('valid_links_copied', { total: validLinks.length });
    setHasCopyValid(false);
    setIsCopyValid(true);

    try {
      await copyToClipboard(validLinks.join('\r\n'));
      setIsCopyValid(false);
      setHasCopyValid(true);
    } catch {
      setIsCopyValid(false);
      setHasCopyValid(false);
    }
  };

  const buttonClasses = ['size-small', 'shadow-hard', 'bg-blue', 'text-white', 'with-loader'];
  let copyAsTextButton = [...buttonClasses];
  if (!isCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== 'with-loader');
  }
  if (hasCopyAsText) {
    copyAsTextButton = copyAsTextButton.filter((val) => val !== 'bg-blue');
    copyAsTextButton.push('bg-green');
  }

  let copyAsJSONButton = [...buttonClasses];
  if (!isCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== 'with-loader');
  }
  if (hasCopyAsJSON) {
    copyAsJSONButton = copyAsJSONButton.filter((val) => val !== 'bg-blue');
    copyAsJSONButton.push('bg-green');
  }

  let copyValidButton = [...buttonClasses];
  if (!isCopyValid) {
    copyValidButton = copyValidButton.filter((val) => val !== 'with-loader');
  }
  if (hasCopyValid) {
    copyValidButton = copyValidButton.filter((val) => val !== 'bg-blue');
    copyValidButton.push('bg-green');
  }

  const hasAnyValidation = !!validations && Object.keys(validations).length > 0;

  const toCsvRow = (link: string) => {
    const validation = validations?.[link];
    return {
      Name: validation?.name ?? '',
      Status: validation ? getStatusLabel(validation.status) : 'Not checked',
      LastValidated: validation?.lastValidated ? new Date(validation.lastValidated).toLocaleDateString() : '',
      URL: link,
    };
  };

  const progressDone = validationProgress?.done ?? 0;
  const progressTotal = validationProgress?.total ?? links.length;
  const remaining = progressTotal - progressDone;
  // Bottleneck's validationLimiter (src/validation.ts) launches roughly 2 validations/sec
  // (minTime: 500ms) regardless of concurrency
  const VALIDATIONS_PER_MINUTE = 120;
  const etaMinutes = Math.ceil(remaining / VALIDATIONS_PER_MINUTE);
  const etaHint = remaining > VALIDATIONS_PER_MINUTE ? ` · ~${etaMinutes}m remaining` : '';
  const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
    <ActionsContainer>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        {links.length > 0 && <p>{isScoped ? `Showing ${visibleLinks.length} of ${links.length}` : `Total: ${links.length}`}</p>}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {isGoogleSearchPage && links.length > 0 && (
          <button
            className={`size-small bg-yellow shadow-hard ${isLoading && 'with-loader'}`}
            type="button"
            onClick={onFetchHandler}
            disabled={isLoading}
          >
            Extract again
          </button>
        )}
        {links.length > 0 && (
          <button
            className={`size-small bg-orange shadow-hard ${isValidating && 'with-loader'}`}
            type="button"
            onClick={onValidateHandler}
            disabled={isValidating}
          >
            {isValidating ? 'Validating...' : hasAnyValidation ? 'Re-validate links' : 'Validate links'}
          </button>
        )}
        {onToggleAutoValidate && (
          <Toggle title="Automatically validate links as soon as they're extracted">
            <input type="checkbox" checked={!!autoValidate} onChange={(e) => onToggleAutoValidate(e.target.checked)} />
            Auto-validate
          </Toggle>
        )}
        <button
          className={copyAsTextButton.join(' ')}
          type="button"
          onClick={() => handleCopy('text')}
          title="Copies exactly what's currently visible in the table"
        >
          {`${hasCopyAsText ? 'Copied' : 'Copy'} ${scopeWord} as Text`}
        </button>
        <button
          className={copyAsJSONButton.join(' ')}
          type="button"
          onClick={() => handleCopy('json')}
          title="Copies exactly what's currently visible in the table"
        >
          {`${hasCopyAsJSON ? 'Copied' : 'Copy'} ${scopeWord} as JSON`}
        </button>
        <button
          type="button"
          className="size-small shadow-hard bg-cyan"
          title="Downloads exactly what's currently visible in the table"
          onClick={() => {
            Analytics.fireEvent('links_downloaded', { total: visibleLinks.length });
            convertToCsv(visibleLinks.map(toCsvRow), 'links');
          }}
        >
          {`Download ${scopeWord} CSV`}
        </button>
        {validLinks.length > 0 && (
          <ScopeGroup title="These actions only include active links from what's currently shown">
            <ScopeCaption>Valid only</ScopeCaption>
            <button className={copyValidButton.join(' ')} type="button" onClick={handleCopyValid}>
              {`${hasCopyValid ? 'Copied' : 'Copy'} as Text`}
            </button>
            <button
              type="button"
              className="size-small shadow-hard bg-cyan"
              onClick={() => {
                Analytics.fireEvent('valid_links_downloaded', { total: validLinks.length });
                convertToCsv(validLinks.map(toCsvRow), 'valid-links');
              }}
            >
              Download CSV
            </button>
          </ScopeGroup>
        )}
      </div>
      {isValidating && (
        <ProgressSection>
          <ProgressTrack>
            <ProgressFill $percent={progressPercent} />
          </ProgressTrack>
          <ProgressMeta>
            <CurrentlyValidating title={inFlightLinks?.join('\n')}>
              {inFlightLinks && inFlightLinks.length > 0
                ? `Validating ${inFlightLinks[0]}${inFlightLinks.length > 1 ? ` (+${inFlightLinks.length - 1} more in flight)` : ''}`
                : 'Validating...'}
            </CurrentlyValidating>
            <span>{`${progressDone}/${progressTotal} (${progressPercent}%)${etaHint}`}</span>
          </ProgressMeta>
        </ProgressSection>
      )}
    </ActionsContainer>
  );
}

export default Actions;
