import type { FC } from 'react';

import Header from '@components/Header';

interface NonGoogleEmptyState {
  extractedLinkCount?: number;
}

const NonGoogleEmptyState: FC<NonGoogleEmptyState> = ({ extractedLinkCount = 0 }) => {
  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    extractedLinkCount > 0 ? ` but you found ${extractedLinkCount} other links. ` : '. ',
  ]
    .join('')
    .trim();

  return (
    <>
      <Header />
      <p className="text-centre">{nonGoogleMessage}</p>
    </>
  );
};

export default NonGoogleEmptyState;
