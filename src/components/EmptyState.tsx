import { useEffect, useState } from 'react';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Button } from '@components/ui/button';

import Header from './Header';

// Only ever needs writing once per install, so a plain storage flag is enough — no reason to
// route this through the more general autoValidate-style settings hooks.
const FIRST_RUN_STORAGE_KEY = 'hasSeenIntro';

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
  const [showIntro, setShowIntro] = useState(false);
  const otherLinksCount = otherLinks.length;
  const nonGoogleMessage = [
    'There is no WhatsApp group link on this page',
    otherLinksCount > 0 ? ` but you found ${otherLinksCount} other links. ` : '. ',
  ]
    .join('')
    .trim();

  useEffect(() => {
    chrome.storage.local
      .get(FIRST_RUN_STORAGE_KEY)
      .then((stored) => {
        if (!stored[FIRST_RUN_STORAGE_KEY]) setShowIntro(true);
      })
      .catch(() => {});
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
    chrome.storage.local.set({ [FIRST_RUN_STORAGE_KEY]: true }).catch(() => {});
  };

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-var(--header-height))] justify-center space-y-1.5 overflow-y-auto animate-in">
      <Header />
      {showIntro && (
        <Alert className="mx-auto max-w-sm">
          <AlertTitle>Two ways to use this</AlertTitle>
          <AlertDescription>
            On any regular page, WhatsApp group invite links already on it show up here automatically. On a Google Search results page,
            click Extract to scan every result for invite links instead.
          </AlertDescription>
          <AlertAction>
            <Button type="button" size="xs" variant="ghost" onClick={dismissIntro}>
              Got it
            </Button>
          </AlertAction>
        </Alert>
      )}
      {!isGoogleSearchPage && (
        <>
          <p className="text-center">{nonGoogleMessage}</p>
          {otherLinksCount > 0 && (
            <Dialog open={isOtherLinksOpen} onOpenChange={setIsOtherLinksOpen}>
              <div className="flex justify-center">
                <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>Show other links</DialogTrigger>
              </div>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{`Other links (${otherLinksCount})`}</DialogTitle>
                  <DialogDescription>Links found on this page that aren&apos;t WhatsApp group invites.</DialogDescription>
                </DialogHeader>
                <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
                  {otherLinks.map((link: string) =>
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
                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
      {isGoogleSearchPage && (
        <>
          <p className="text-center">Extract WhatsApp group links from Google search result ({searchLinksCount})</p>
          <div className="text-center">
            <div className="flex items-center justify-center mt-3">
              <span className="relative inline-flex">
                <span aria-hidden="true" className="absolute -top-1 -right-1 flex size-3">
                  <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex size-3 rounded-full bg-yellow-500"></span>
                </span>
                <Button
                  type="button"
                  size={'lg'}
                  variant={'outline'}
                  onClick={onExtractClick}
                  disabled={isLoading || searchLinksCount === 0}
                  title={searchLinksCount === 0 ? 'No Google search results detected on this page' : undefined}
                  className="rounded-sm px-5"
                >
                  {isLoading && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-loader-circle-icon lucide-loader-circle animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  Extract {showExtractAgain ? 'again' : null}
                </Button>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default EmptyState;
