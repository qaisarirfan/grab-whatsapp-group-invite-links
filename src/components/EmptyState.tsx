import { useState } from 'react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Button } from '@components/ui/button';

import Header from './Header';

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
    <div className="flex flex-1 flex-col h-[calc(100vh-57px)] justify-center space-y-1.5 overflow-y-auto animate-in">
      <Header />
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
                <span className="absolute -top-1 -right-1 flex size-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex size-3 rounded-full bg-yellow-500"></span>
                </span>
                <Button
                  type="button"
                  size={'lg'}
                  variant={'outline'}
                  onClick={onExtractClick}
                  disabled={isLoading}
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
