import { useEffect, useMemo, useState } from 'react';

import { styled } from 'styled-components';

import type { LinkStatus, LinkValidation, StorageData } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

import Actions from './Actions';

const Loader = styled.div`
  border-radius: 50%;
  height: 20px;
  position: relative;
  width: 20px;
`;

const StatusBadge = styled.span<{ color: string }>`
  background-color: ${(props) => props.color};
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
`;

const TimestampText = styled.div`
  font-size: 11px;
  color: #666;
  margin-top: 2px;
`;

const GroupName = styled.div`
  font-weight: 600;
  margin-bottom: 2px;
`;

const GroupIcon = styled.img`
  border-radius: 50%;
  height: 32px;
  object-fit: cover;
  width: 32px;
`;

const StickyToolbar = styled.div`
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 1;
`;

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
`;

const FilterButton = styled.button<{ $active: boolean; $color: string; $muted: boolean }>`
  background: ${(props) => (props.$active ? props.$color : `color-mix(in srgb, ${props.$color} 14%, white)`)};
  color: ${(props) => (props.$active ? '#fff' : props.$color)};
  opacity: ${(props) => (props.$muted ? 0.5 : 1)};
`;

const NEUTRAL_FILTER_COLOR = '#333';
const STRIPE_COLOR = '#e2e6e9'; // matches fictoan's .striped tbody tr:nth-child(even)

type StatusFilter = 'all' | LinkStatus;

const getFilterColor = (key: StatusFilter): string => (key === 'all' ? NEUTRAL_FILTER_COLOR : getStatusColor(key));

// Fixed row height enables windowing: only rows in view (plus overscan) are ever mounted,
// so extraction results in the thousands don't bloat the DOM or slow down scrolling.
const ROW_HEIGHT = 76;
const OVERSCAN = 6;
const VIEWPORT_HEIGHT = 420;

const TableScrollContainer = styled.div`
  max-height: ${VIEWPORT_HEIGHT}px;
  overflow-y: auto;
`;

interface PropTypes {
  fetchAll: VoidFunction;
  isGoogleSearch: boolean;
  isLoading: boolean;
  links: string[];
  onValidateAll?: VoidFunction;
  isValidating?: boolean;
  validationProgress?: { done: number; total: number };
  inFlightLinks?: string[];
  autoValidate?: boolean;
  onToggleAutoValidate?: (value: boolean) => void;
}

function Links({
  links,
  isLoading,
  fetchAll,
  isGoogleSearch,
  onValidateAll,
  isValidating,
  validationProgress,
  inFlightLinks,
  autoValidate,
  onToggleAutoValidate,
}: PropTypes) {
  const [validations, setValidations] = useState<Record<string, LinkValidation>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const loadValidations = async () => {
      const storage = (await chrome.storage.local.get('validations')) as StorageData;
      const stored = storage.validations ?? {};
      const newValidations: Record<string, LinkValidation> = {};
      links.forEach((link) => {
        if (stored[link]) {
          newValidations[link] = stored[link];
        }
      });
      setValidations(newValidations);
    };
    loadValidations();
  }, [links]);

  const statusCounts = links.reduce<Record<StatusFilter, number>>(
    (acc, link) => {
      const status = validations[link]?.status || 'pending';
      acc[status] += 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, pending: 0, valid: 0, expired: 0, invalid: 0, 'rate-limited': 0 }
  );

  const filteredLinks = links.filter((link) => {
    if (statusFilter === 'all') return true;
    return (validations[link]?.status || 'pending') === statusFilter;
  });

  const displayedLinks = hideDuplicates
    ? Object.values(
        filteredLinks.reduce<Record<string, string>>((acc, link) => {
          const name = validations[link]?.name;
          if (name && !acc[name]) {
            acc[name] = link;
          } else if (!name) {
            acc[link] = link;
          }
          return acc;
        }, {})
      )
    : filteredLinks;

  const { startIndex, windowedLinks, topSpacerHeight, bottomSpacerHeight } = useMemo(() => {
    const visibleRowCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const end = Math.min(displayedLinks.length, start + visibleRowCount);
    return {
      startIndex: start,
      windowedLinks: displayedLinks.slice(start, end),
      topSpacerHeight: start * ROW_HEIGHT,
      bottomSpacerHeight: (displayedLinks.length - end) * ROW_HEIGHT,
    };
  }, [displayedLinks, scrollTop]);

  const filterKeys: StatusFilter[] = ['all', 'valid', 'expired', 'invalid', 'rate-limited', 'pending'];

  if (isLoading) {
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
          width: '100vw',
        }}
      >
        <Loader className="with-loader bg-grey" />
      </div>
    );
  }

  return (
    <>
      <StickyToolbar>
        <Actions
          isGoogleSearchPage={isGoogleSearch}
          isLoading={isLoading}
          links={links}
          visibleLinks={displayedLinks}
          onFetch={fetchAll}
          onValidateAll={onValidateAll}
          isValidating={isValidating}
          validationProgress={validationProgress}
          inFlightLinks={inFlightLinks}
          validations={validations}
          autoValidate={autoValidate}
          onToggleAutoValidate={onToggleAutoValidate}
        />
        {links.length > 0 && (
          <FilterBar>
            {filterKeys.map((key) => (
              <FilterButton
                key={key}
                type="button"
                className="size-small shadow-hard"
                title={key === 'all' ? 'Show every extracted link' : getStatusTooltip(key)}
                $active={statusFilter === key}
                $color={getFilterColor(key)}
                $muted={key !== 'all' && key !== statusFilter && statusCounts[key] === 0}
                onClick={() => setStatusFilter(key)}
              >
                {`${key === 'all' ? 'All' : getStatusLabel(key)} (${statusCounts[key]})`}
              </FilterButton>
            ))}
            <FilterButton
              type="button"
              className="size-small shadow-hard"
              title="Collapse invite links that resolve to the same group name"
              $active={hideDuplicates}
              $color={NEUTRAL_FILTER_COLOR}
              $muted={false}
              onClick={() => setHideDuplicates((v) => !v)}
            >
              Hide duplicates
            </FilterButton>
          </FilterBar>
        )}
      </StickyToolbar>
      <TableScrollContainer onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <table className="ff-table bordered-rows full-width padding-tiny">
          <tbody>
            {topSpacerHeight > 0 && (
              <tr>
                <td colSpan={2} style={{ height: topSpacerHeight, padding: 0, border: 'none' }} />
              </tr>
            )}
            {windowedLinks.map((link, i) => {
              const absoluteIndex = startIndex + i;
              const validation = validations[link];
              const hasValidation = !!validation;
              const status = validation?.status || 'pending';
              const color = getStatusColor(status);
              const label = getStatusLabel(status);
              const timestamp = validation?.lastValidated ? new Date(validation.lastValidated).toLocaleDateString() : '';
              const rowBackground = absoluteIndex % 2 === 1 ? STRIPE_COLOR : undefined;

              return (
                <tr key={link} style={{ backgroundColor: rowBackground }}>
                  <td style={{ height: ROW_HEIGHT }}>
                    {(absoluteIndex + 1).toLocaleString(undefined, {
                      useGrouping: false,
                      minimumIntegerDigits: 3,
                    })}
                  </td>
                  <td style={{ height: ROW_HEIGHT, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', height: '100%' }}>
                      {validation?.iconUrl && <GroupIcon src={validation.iconUrl} alt="" />}
                      <div>
                        {validation?.name && <GroupName>{validation.name}</GroupName>}
                        <div style={{ marginBottom: '4px' }}>
                          <a className="font-mono text-small" target="_blank" href={link} rel="noreferrer">
                            {link}
                          </a>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {hasValidation && (
                            <>
                              <StatusBadge color={color} title={getStatusTooltip(status)}>
                                {label}
                              </StatusBadge>
                              {timestamp && <TimestampText>Last checked: {timestamp}</TimestampText>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {bottomSpacerHeight > 0 && (
              <tr>
                <td colSpan={2} style={{ height: bottomSpacerHeight, padding: 0, border: 'none' }} />
              </tr>
            )}
          </tbody>
        </table>
      </TableScrollContainer>
    </>
  );
}

export default Links;
