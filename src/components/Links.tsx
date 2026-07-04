import { useState } from 'react';
import type { TableComponents } from 'react-virtuoso';
import { TableVirtuoso } from 'react-virtuoso';

import { Spinner } from '@/components/ui/spinner';
import { TableBody, TableHeader, TableRow } from '@/components/ui/table';

import { useCachedValidations } from '@src/hooks/use-cached-validations';
import type { StatusFilter } from '@src/validation';
import { dedupeLinksByGroupName, filterLinksByStatus, getStatusCounts } from '@src/validation';

import Actions from './Actions';
import LinkRow from './LinkRow';
import LinksSkeleton from './LinksSkeleton';

// TableVirtuoso itself windows the rows so extraction results in the thousands don't
// bloat the DOM or slow down scrolling.
const tableComponents: TableComponents<string> = {
  Table: (props) => <table {...props} className="w-full" />,
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
  onCancelValidation?: VoidFunction;
  onRetryValidation?: VoidFunction;
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
  onCancelValidation,
  onRetryValidation,
  isValidating,
  validationProgress,
  inFlightLinks,
  autoValidate,
  onToggleAutoValidate,
}: PropTypes) {
  const { isLoading: isLoadingValidations, validations } = useCachedValidations(links);
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
          onCancelValidation={onCancelValidation}
          onRetryValidation={onRetryValidation}
          isValidating={isValidating}
          validationProgress={validationProgress}
          inFlightLinks={inFlightLinks}
          validations={validations}
          autoValidate={autoValidate}
          onToggleAutoValidate={onToggleAutoValidate}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusCounts={statusCounts}
          hideDuplicates={hideDuplicates}
          onToggleHideDuplicates={() => setHideDuplicates((v) => !v)}
        />
      </div>
      {isLoadingValidations ? (
        <LinksSkeleton />
      ) : (
        <TableVirtuoso
          data={displayedLinks}
          components={tableComponents}
          computeItemKey={(_index, link) => link}
          itemContent={(index, link) => <LinkRow index={index} link={link} validation={validations[link]} />}
          useWindowScroll
        />
      )}
    </>
  );
}

export default Links;
