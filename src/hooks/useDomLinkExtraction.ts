import { useEffect, useState } from 'react';

import Analytics from '@src/analytics';
import { inviteLink } from '@src/utils';

const getAllAnchorTags = () => {
  const isOnGoogleSearchPage = (): boolean => location.origin.includes('google') && location.pathname === '/search';

  const normalizeUrl = (href: string): string | null => {
    try {
      const url = new URL(href);

      // Strip hash for consistency
      return url.hash ? `${url.origin}${url.pathname}${url.search}` : url.href;
    } catch {
      return null;
    }
  };

  const extractLinks = (anchors: NodeListOf<HTMLAnchorElement>): string[] => {
    const uniqueLinks = new Set<string>();

    for (const anchor of anchors) {
      const normalized = normalizeUrl(anchor.href);
      if (normalized) uniqueLinks.add(normalized);
    }

    return Array.from(uniqueLinks);
  };

  const extractLinksFromText = (text: string) => {
    const regex = /https:\/\/chat\.whatsapp\.com(?:\/invite)?\/([A-Za-z0-9]{22})/gm;
    const waLinks: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const link = m[0];
      if (link) {
        waLinks.push(link);
      }
    }
    return waLinks;
  };

  const getPeopleAlsoSearchFor = (): string[] =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>('#bres a'), a => a.innerText.trim()).filter(Boolean);

  const filterGoogleNoise = (links: string[]): string[] =>
    links.filter(link => !link.includes('youtube.com') && !link.includes('whatsapp.com') && !link.includes('google'));

  const isGoogleSearch = isOnGoogleSearchPage();

  const anchors = isGoogleSearch
    ? document.querySelectorAll<HTMLAnchorElement>('#search a')
    : document.querySelectorAll<HTMLAnchorElement>('a');

  const whatsappLinks = extractLinksFromText(document.body.innerText.replace(/\n|\s+/gm, ''));
  const links = extractLinks(anchors).concat(whatsappLinks);

  const result = {
    links: isGoogleSearch ? filterGoogleNoise(links) : links,
    peopleAlsoSearchFor: isGoogleSearch ? getPeopleAlsoSearchFor() : [],
  };

  return result;
};

export function useDomLinkExtraction(currentURL?: string, isGoogleSearchPage?: boolean) {
  const [googleLinks, setGoogleLinks] = useState<string[]>([]);
  const [directLinks, setDirectLinks] = useState<string[]>([]);
  const [otherLinks, setOtherLinks] = useState<string[]>([]);

  useEffect(() => {
    if (!currentURL) return;

    chrome.tabs.query({ active: true, windowId: chrome.windows.WINDOW_ID_CURRENT }, ([tab]) => {
      if (!tab?.id) return;

      chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getAllAnchorTags }, results => {
        const extracted = results?.[0]?.result?.links ?? [];
        const peopleAlsoSearchFor = results[0].result?.peopleAlsoSearchFor ?? [];

        if (!isGoogleSearchPage) {
          const waLinks = extracted.map(inviteLink).filter(Boolean);
          if (waLinks.length) {
            setDirectLinks([...new Set(waLinks)]);
          } else {
            setOtherLinks(extracted);
          }
          Analytics.fireEvent('non_google_page_detected');
        } else {
          setGoogleLinks([...new Set(extracted)]);
          Analytics.fireEvent('google_search_page_detected');
          peopleAlsoSearchFor.forEach(v => {
            Analytics.fireEvent('people_also_search_for', {
              title: v,
            });
          });
        }

        Analytics.fireEvent('dom_links_extracted', { total_links_found: extracted.length });
      });
    });
  }, [currentURL, isGoogleSearchPage]);

  return { googleLinks, directLinks, otherLinks };
}
