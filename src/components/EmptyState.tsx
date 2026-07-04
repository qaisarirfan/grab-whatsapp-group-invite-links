import { useState } from 'react';

// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import ChevronUpIcon from 'lucide-react/dist/esm/icons/chevron-up.mjs';
import Loader2Icon from 'lucide-react/dist/esm/icons/loader-2.mjs';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import Header from '@components/Header';

interface PropTypes {
  isGoogleSearchPage: boolean;
  searchLinksCount: number;
  otherLinks: string[];
  isLoading: boolean;
  showExtractAgain: boolean;
  onExtractClick: () => void;
}

function EmptyState({ isGoogleSearchPage, searchLinksCount, otherLinks, isLoading, showExtractAgain, onExtractClick }: PropTypes) {
  const [isOtherLinksOpen, setIsOtherLinksOpen] = useState(false);
  const otherLinksCount = otherLinks.length;
  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    otherLinksCount > 0 ? ` but you found ${otherLinksCount} other links. ` : '. ',
  ]
    .join('')
    .trim();

  return (
    <>
      <Header />
      {!isGoogleSearchPage && (
        <>
          <p className="text-center">{nonGoogleMessage}</p>
          {otherLinksCount > 0 && (
            <Collapsible open={isOtherLinksOpen} onOpenChange={setIsOtherLinksOpen} className="mx-auto mt-2 w-full max-w-100">
              <div className="flex justify-center">
                <CollapsibleTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                  {isOtherLinksOpen ? 'Hide' : 'Show'} other links
                  {isOtherLinksOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto px-3 text-xs">
                  {otherLinks.map((link) =>
                    /^https?:\/\//i.test(link) ? (
                      <li key={link} className="truncate">
                        <a
                          target="_blank"
                          href={link}
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground hover:underline"
                        >
                          {link}
                        </a>
                      </li>
                    ) : (
                      <li key={link} className="truncate text-muted-foreground">
                        {link}
                      </li>
                    )
                  )}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
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
