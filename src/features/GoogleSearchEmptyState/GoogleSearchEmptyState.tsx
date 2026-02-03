import type { FC } from 'react';

import { styled } from 'styled-components';

import Header from '@components/Header';

const ExtractButton = styled.button`
  margin-top: 12px;
  &::after {
    border-color: #000;
    border-top-color: transparent;
    border-right-color: transparent;
  }
`;

interface GoogleSearchEmptyState {
  isExtractionInProgress: boolean;
  onExtractRequest: VoidFunction;
  extractedLinkCount?: number;
}

const GoogleSearchEmptyState: FC<GoogleSearchEmptyState> = ({ isExtractionInProgress, onExtractRequest, extractedLinkCount = 0 }) => {
  return (
    <>
      <Header />
      <p className="text-centre">Extract WhatsApp group links from Google search result ({extractedLinkCount})</p>
      <div className="text-center">
        <ExtractButton
          className={`shape-rounded bg-yellow shadow-hard ${isExtractionInProgress && 'with-loader'}`}
          type="button"
          onClick={onExtractRequest}
          disabled={isExtractionInProgress}>
          Extract
        </ExtractButton>
      </div>
    </>
  );
};

export default GoogleSearchEmptyState;
