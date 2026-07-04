// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import Loader2Icon from 'lucide-react/dist/esm/icons/loader-2.mjs';

import { Button } from '@/components/ui/button';

import Header from '@components/Header';

interface PropTypes {
  isGoogleSearchPage: boolean;
  searchLinksCount: number;
  otherLinksCount: number;
  isLoading: boolean;
  showExtractAgain: boolean;
  onExtractClick: () => void;
}

function EmptyState({ isGoogleSearchPage, searchLinksCount, otherLinksCount, isLoading, showExtractAgain, onExtractClick }: PropTypes) {
  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    otherLinksCount > 0 ? ` but you found ${otherLinksCount} other links. ` : '. ',
  ]
    .join('')
    .trim();

  return (
    <>
      <Header />
      {!isGoogleSearchPage && <p className="text-center">{nonGoogleMessage}</p>}
      {isGoogleSearchPage && (
        <>
          <p className="text-center">Extract WhatsApp group links from Google search result ({searchLinksCount})</p>
          <div className="text-center">
            <Button type="button" className="mt-3" onClick={onExtractClick} disabled={isLoading}>
              {isLoading && <Loader2Icon className="animate-spin" />}
              Extract {showExtractAgain ? 'again' : null}
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export default EmptyState;
