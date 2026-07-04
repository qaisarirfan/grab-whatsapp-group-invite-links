import { useEffect, useState } from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso } from 'react-virtuoso';

import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { LinkStatus, LinkValidation, StorageData } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

import Actions from './Actions';

const NEUTRAL_FILTER_COLOR = '#333';

type StatusFilter = 'all' | LinkStatus;

const getFilterColor = (key: StatusFilter): string => (key === 'all' ? NEUTRAL_FILTER_COLOR : getStatusColor(key));

// Row height used for cell sizing; TableVirtuoso itself windows the rows so extraction
// results in the thousands don't bloat the DOM or slow down scrolling.
const VIEWPORT_HEIGHT = 420;

const tableComponents: TableComponents<string> = {
  Table: (props) => <table {...props} />,
  TableHead: (props) => <TableHeader {...props} />,
  TableBody,
  TableRow: (props) => (
    <TableRow data-index={props['data-index']} data-item-index={props['data-item-index']} data-known-size={props['data-known-size']}>
      {props.children}
    </TableRow>
  ),
};

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

  const filterKeys: StatusFilter[] = ['all', 'valid', 'expired', 'invalid', 'rate-limited', 'pending'];

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-background">
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
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <span className="mr-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">Filter:</span>
            {filterKeys
              .filter((key) => key === 'all' || key === statusFilter || statusCounts[key] > 0)
              .map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="xs"
                  variant="secondary"
                  title={key === 'all' ? 'Show every extracted link' : getStatusTooltip(key)}
                  style={{
                    backgroundColor: statusFilter === key ? getFilterColor(key) : `color-mix(in srgb, ${getFilterColor(key)} 14%, white)`,
                    color: statusFilter === key ? '#fff' : getFilterColor(key),
                  }}
                  onClick={() => setStatusFilter(key)}
                >
                  {`${key === 'all' ? 'All' : getStatusLabel(key)} (${statusCounts[key]})`}
                </Button>
              ))}
            <Button
              type="button"
              size="xs"
              variant="secondary"
              title="Collapse invite links that resolve to the same group name"
              style={{
                backgroundColor: hideDuplicates ? NEUTRAL_FILTER_COLOR : `color-mix(in srgb, ${NEUTRAL_FILTER_COLOR} 14%, white)`,
                color: hideDuplicates ? '#fff' : NEUTRAL_FILTER_COLOR,
              }}
              onClick={() => setHideDuplicates((v) => !v)}
            >
              Hide duplicates
            </Button>
          </div>
        )}
      </div>
      <TableVirtuoso
        style={{ height: VIEWPORT_HEIGHT }}
        data={displayedLinks}
        components={tableComponents}
        computeItemKey={(_index, link) => link}
        fixedHeaderContent={() => (
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Group</TableHead>
          </TableRow>
        )}
        itemContent={(index, link) => {
          const validation = validations[link];
          const hasValidation = !!validation;
          const status = validation?.status || 'pending';
          const color = getStatusColor(status);
          const label = getStatusLabel(status);
          const timestamp = validation?.lastValidated ? new Date(validation.lastValidated).toLocaleDateString() : '';

          return (
            <>
              <TableCell>
                {(index + 1).toLocaleString(undefined, {
                  useGrouping: false,
                  minimumIntegerDigits: 3,
                })}
              </TableCell>
              <TableCell>
                <div className="flex h-full items-start gap-2">
                  {validation?.iconUrl && (
                    <Avatar>
                      <AvatarImage src={validation.iconUrl} alt="" />
                    </Avatar>
                  )}
                  <div>
                    {validation?.name && <div className="mb-0.5 font-semibold">{validation.name}</div>}
                    <div className="mb-1">
                      <a className="font-mono text-xs break-all" target="_blank" href={link} rel="noreferrer">
                        {link}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasValidation && (
                        <>
                          <Badge
                            style={{ backgroundColor: color, color: '#fff' }}
                            title={getStatusTooltip(status)}
                            className="border-transparent"
                          >
                            {label}
                          </Badge>
                          {timestamp && <div className="text-[11px] text-muted-foreground">Last checked: {timestamp}</div>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
            </>
          );
        }}
      />
    </>
  );
}

export default Links;
