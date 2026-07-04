import { useState } from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso } from 'react-virtuoso';

import { Spinner } from '@/components/ui/spinner';
import { TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useCachedValidations } from '@src/hooks/use-cached-validations';
import type { StatusFilter } from '@src/validation';
import { dedupeLinksByGroupName, filterLinksByStatus, getStatusCounts } from '@src/validation';

import Actions from './Actions';
import LinkFilterBar from './LinkFilterBar';
import LinkRow from './LinkRow';

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
  const validations = useCachedValidations(links);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [hideDuplicates, setHideDuplicates] = useState(false);

  const statusCounts = getStatusCounts(links, validations);
  const filteredLinks = filterLinksByStatus(links, validations, statusFilter);
  const displayedLinks = hideDuplicates ? dedupeLinksByGroupName(filteredLinks, validations) : filteredLinks;

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
          <LinkFilterBar
            hideDuplicates={hideDuplicates}
            onStatusFilterChange={setStatusFilter}
            onToggleHideDuplicates={() => setHideDuplicates((v) => !v)}
            statusCounts={statusCounts}
            statusFilter={statusFilter}
          />
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
        itemContent={(index, link) => <LinkRow index={index} link={link} validation={validations[link]} />}
      />
    </>
  );
}

export default Links;
