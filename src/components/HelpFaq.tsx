import { useState } from 'react';

import { styled } from 'styled-components';

import Analytics from '@src/analytics';
import type { LinkStatus } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 12px 4px;
`;

const Section = styled.section`
  h3 {
    margin: 0 0 8px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 6px;
  }
`;

const BadgeLegend = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const BadgeRow = styled.li`
  align-items: flex-start;
  display: flex;
  gap: 8px;
`;

const BadgeDot = styled.span<{ $color: string }>`
  background-color: ${({ $color }) => $color};
  border-radius: 50%;
  flex-shrink: 0;
  height: 10px;
  margin-top: 5px;
  width: 10px;
`;

const FaqList = styled.div`
  display: flex;
  flex-direction: column;
`;

const FaqItem = styled.div`
  border-bottom: 1px solid #e0e0e0;

  &:last-child {
    border-bottom: none;
  }
`;

const FaqQuestion = styled.button`
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  padding: 10px 0;
  text-align: left;
  width: 100%;
`;

const FaqAnswer = styled.p`
  color: #555;
  margin: 0 0 12px;
`;

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
    question: 'Can I redo an extraction or re-check links?',
    answer:
      'Yes. Extract again re-runs the scrape from scratch, and Validate links can be clicked any time, though results within 24 hours reuse the cached result.',
  },
  {
    question: 'A new tab opened when I installed or updated the extension. Is that normal?',
    answer: 'Yes. It opens automatically on install and update to show more information about the extension. You can close it anytime.',
  },
  {
    question: 'Does this extension track what websites I visit?',
    answer:
      'It sends the address and title of the page you have open to Google Analytics each time you open the popup, plus anonymous click/usage counts. It never reads passwords or anything you type, and the links you find are never sent anywhere except your clipboard or a downloaded file.',
  },
];

function HelpFaq() {
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const toggleQuestion = (question: string) => {
    const opened = openQuestion !== question;
    Analytics.fireEvent('faq_item_toggled', { question, opened });
    setOpenQuestion(opened ? question : null);
  };

  return (
    <Container>
      <Section>
        <h3>How to use</h3>
        <ul>
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
      </Section>

      <Section>
        <h3>Link status badges</h3>
        <BadgeLegend>
          {BADGE_STATUSES.map((status) => (
            <BadgeRow key={status}>
              <BadgeDot $color={getStatusColor(status)} />
              <span>
                <strong>{getStatusLabel(status)}</strong> &mdash; {getStatusTooltip(status)}
              </span>
            </BadgeRow>
          ))}
        </BadgeLegend>
      </Section>

      <Section>
        <h3>Frequently asked questions</h3>
        <FaqList>
          {FAQS.map(({ question, answer }) => {
            const isOpen = openQuestion === question;
            return (
              <FaqItem key={question}>
                <FaqQuestion type="button" onClick={() => toggleQuestion(question)} aria-expanded={isOpen}>
                  <span>{isOpen ? '−' : '+'}</span>
                  <span>{question}</span>
                </FaqQuestion>
                {isOpen && <FaqAnswer>{answer}</FaqAnswer>}
              </FaqItem>
            );
          })}
        </FaqList>
      </Section>
    </Container>
  );
}

export default HelpFaq;
