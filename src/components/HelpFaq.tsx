import { useState } from 'react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

import Analytics from '@src/analytics';
import type { LinkStatus } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

const BADGE_STATUSES: LinkStatus[] = ['valid', 'expired', 'invalid', 'rate-limited'];

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'Why does it say there is no WhatsApp group link on this page?',
    answer:
      'The page you are on does not contain any chat.whatsapp.com links. If other links were found, the message tells you how many, but they are not listed since they are not WhatsApp links.',
  },
  {
    question: 'I clicked Extract but got an empty list. What do I do?',
    answer:
      'None of the Google search results contained a WhatsApp link. Close the popup and reopen it to start over, or try a more specific search.',
  },
  {
    question: 'What should I search for on Google to find more WhatsApp groups?',
    answer:
      'Try adding "site:chat.whatsapp.com" plus a topic keyword to your Google search, such as "site:chat.whatsapp.com yoga". Since Extract only reads the current results page, page through Google\'s results and click Extract again on each page for more links.',
  },
  {
    question: 'Why does a search result show an error in red in the Logs tab?',
    answer: 'That page could not be reached or scraped. Extraction automatically skips it and continues with the rest.',
  },
  {
    question: 'Can I fully trust the Active/Expired badges?',
    answer:
      'Not completely. The check can only tell whether the server responds at all, it cannot confirm whether that specific invite has been used up or revoked. Click a link to confirm before relying on the badge.',
  },
  {
    question: 'Why is a link marked Rate-limited?',
    answer: 'The check took too long without a response and was stopped. Try validating again later.',
  },
  {
    question: 'Why did Validate links not re-check a link I just validated?',
    answer:
      'Results are cached for 24 hours per link. Validating again within that window reuses the earlier result. The "Last checked" date under each link shows when it was last actually verified.',
  },
  {
    question: 'I clicked Copy as Text (or JSON) but nothing was copied. What happened?',
    answer:
      'If your browser blocks clipboard access, the button quietly returns to normal. Try again, check clipboard permissions, or use Download CSV instead.',
  },
  {
    question: 'What is the difference between the Shown and Valid only export scopes?',
    answer:
      'Shown exports whatever the current status filter and Hide duplicates toggle are currently displaying. Valid only narrows that further to just the links marked Active.',
  },
  {
    question: 'Should I turn on Auto-validate?',
    answer:
      'It is handy if you always want to know link status without an extra click, but every found link gets checked immediately, which takes longer for large result sets. It is off by default, turn it on if you would rather not remember to click Validate links yourself.',
  },
  {
    question: 'Can I redo an extraction or re-check links?',
    answer:
      'Yes. Extract again re-runs the scrape from scratch, and Validate links can be clicked any time, though results within 24 hours reuse the cached result.',
  },
  {
    question: 'A new tab opened when I installed or updated the extension. Is that normal?',
    answer: 'Yes. It opens automatically on install and update to show more information about the extension. You can close it anytime.',
  },
  {
    question: 'What happens when I remove the extension?',
    answer: 'Chrome opens a short feedback page. This is optional, you can close it without filling anything in.',
  },
  {
    question: 'Does this extension track what websites I visit?',
    answer:
      'It sends the address and title of the page you have open to Google Analytics each time you open the popup, plus anonymous click/usage counts. It never reads passwords or anything you type, and the links you find are never sent anywhere except your clipboard or a downloaded file.',
  },
];

function HelpFaq() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const handleValueChange = (value: string[]) => {
    const opened = value[0] ?? null;
    Analytics.fireEvent('faq_item_toggled', { question: opened ?? openQuestion, opened: !!opened });
    setOpenQuestion(opened);
  };

  return (
    <div className="flex flex-col gap-5 px-1 py-3">
      <section>
        <h3 className="mb-2 text-sm font-semibold">How to use</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm">
          <li>
            <strong>Regular webpage:</strong> open the popup and any WhatsApp group invite links already on the page show up immediately.
          </li>
          <li>
            <strong>Google Search results:</strong> click Extract to scrape each search result for WhatsApp links, then watch progress on
            the Logs tab.
          </li>
          <li>
            <strong>Validate links:</strong> click Validate links to check whether each found link is still active.
          </li>
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Link status badges</h3>
        <ul className="flex flex-col gap-2">
          {BADGE_STATUSES.map((status) => (
            <li key={status} className="flex items-start gap-2">
              <Badge style={{ backgroundColor: getStatusColor(status), color: '#fff' }} className="mt-0.5 border-transparent">
                {getStatusLabel(status)}
              </Badge>
              <span className="text-sm text-muted-foreground">{getStatusTooltip(status)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Frequently asked questions</h3>
        <Accordion value={openQuestion ? [openQuestion] : []} onValueChange={handleValueChange}>
          {FAQS.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}

export default HelpFaq;
