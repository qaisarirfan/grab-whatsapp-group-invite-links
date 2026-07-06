import { useEffect, useState } from 'react';

// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import Loader2Icon from 'lucide-react/dist/esm/icons/loader-2.mjs';
import Trash2Icon from 'lucide-react/dist/esm/icons/trash-2.mjs';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import Analytics from '@src/analytics';
import { convertToCsv, copyToClipboard } from '@src/utils';
import type { LinkValidation, StatusFilter } from '@src/validation';
import { getStatusLabel } from '@src/validation';

import ExportMenu, { type ExportScope } from './ExportMenu';
import FilterMenu from './FilterMenu';
import ValidationProgress from './ValidationProgress';

interface PropTypes {
  isGoogleSearchPage: boolean;
  isLoading: boolean;
  links: string[];
  visibleLinks: string[];
  onFetch: VoidFunction;
  onValidateAll?: (targetLinks?: string[]) => void;
  onCancelValidation?: VoidFunction;
  onRetryValidation?: VoidFunction;
  isValidating?: boolean;
  validationProgress?: { done: number; total: number };
  inFlightLinks?: string[];
  queuedLinks?: string[];
  validations?: Record<string, LinkValidation>;
  autoValidate?: boolean;
  onToggleAutoValidate?: (value: boolean) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (key: StatusFilter) => void;
  statusCounts: Record<StatusFilter, number>;
  hideDuplicates: boolean;
  onToggleHideDuplicates: VoidFunction;
  onClearCache: VoidFunction;
}

function Actions({
  isGoogleSearchPage,
  isLoading,
  links,
  visibleLinks,
  onFetch,
  onValidateAll,
  onCancelValidation,
  onRetryValidation,
  isValidating,
  validationProgress,
  inFlightLinks,
  queuedLinks,
  validations,
  autoValidate,
  onToggleAutoValidate,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  hideDuplicates,
  onToggleHideDuplicates,
  onClearCache,
}: PropTypes) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isClearCacheOpen, setIsClearCacheOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('shown');
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);
  const [isProgressMinimized, setIsProgressMinimized] = useState(false);

  // Each new validation run re-opens the detailed dialog, even if the previous run had been
  // minimized — only fires on the false->true edge, so it won't fight a minimize click mid-run.
  useEffect(() => {
    if (isValidating) {
      setIsProgressMinimized(false);
    }
  }, [isValidating]);

  const minimizeProgress = () => {
    Analytics.fireEvent('validation_progress_minimized');
    setIsProgressMinimized(true);
  };

  const restoreProgress = () => {
    Analytics.fireEvent('validation_progress_restored');
    setIsProgressMinimized(false);
  };

  // Mirrors ValidationProgress's fallback so the floating pill's count matches the dialog's.
  const progressDone = validationProgress?.done ?? 0;
  const progressTotal = validationProgress?.total ?? links.length;

  // "Copy/Download" actions operate on whatever the status filter + dedupe toggle currently show,
  // not the full extracted set — so exports always match what's on screen.
  const isScoped = visibleLinks.length !== links.length;
  const validLinks = visibleLinks.filter((link) => validations?.[link]?.status === 'valid');
  const activeLinks = exportScope === 'valid' ? validLinks : visibleLinks;

  // Valid-only scope disappears if the underlying data changes (e.g. re-validating) — fall back to "shown".
  useEffect(() => {
    if (exportScope === 'valid' && validLinks.length === 0) {
      setExportScope('shown');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validLinks.length]);

  const onFetchHandler = () => {
    setHasCopyAsJSON(false);
    setHasCopyAsText(false);
    onFetch();
  };

  const onValidateHandler = () => {
    if (onValidateAll) {
      const targetLinks = isScoped ? visibleLinks : undefined;
      Analytics.fireEvent('validate_all_clicked', { total_links: (targetLinks ?? links).length, scoped: isScoped });
      onValidateAll(targetLinks);
    }
  };

  const onClearCacheConfirm = () => {
    Analytics.fireEvent('clear_cache_confirmed', { total_links: links.length });
    setIsClearCacheOpen(false);
    onClearCache();
  };

  const handleCopy = async (format: string) => {
    const eventPrefix = exportScope === 'valid' ? 'valid_links' : `${format}_link`;
    Analytics.fireEvent(`${eventPrefix}_copied`, { total: activeLinks.length });
    const isTextFormat = format === 'text';

    setHasCopyAsJSON(false);
    setHasCopyAsText(false);

    if (isTextFormat) {
      setIsCopyAsText(true);
    } else {
      setIsCopyAsJSON(true);
    }

    try {
      const content = isTextFormat ? activeLinks.join('\r\n') : JSON.stringify(activeLinks);
      await copyToClipboard(content);

      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(true);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(true);
      }
    } catch {
      if (isTextFormat) {
        setIsCopyAsText(false);
        setHasCopyAsText(false);
      } else {
        setIsCopyAsJSON(false);
        setHasCopyAsJSON(false);
      }
    }
  };

  const hasAnyValidation = !!validations && Object.keys(validations).length > 0;

  const toCsvRow = (link: string) => {
    const validation = validations?.[link];
    return {
      Name: validation?.name ?? '',
      Status: validation ? getStatusLabel(validation.status) : 'Not checked',
      LastValidated: validation?.lastValidated ? new Date(validation.lastValidated).toLocaleDateString() : '',
      URL: link,
    };
  };

  const handleDownload = () => {
    const eventName = exportScope === 'valid' ? 'valid_links_downloaded' : 'links_downloaded';
    const fileName = exportScope === 'valid' ? 'valid-links' : 'links';
    Analytics.fireEvent(eventName, { total: activeLinks.length });
    convertToCsv(activeLinks.map(toCsvRow), fileName);
  };

  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-2 py-3">
      <div className="flex items-center gap-3">
        {links.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {isScoped ? `Showing ${visibleLinks.length} of ${links.length}` : `Total: ${links.length}`}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {isGoogleSearchPage && links.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onFetchHandler}
            disabled={isLoading}
            title="Re-scan this page's search results for WhatsApp invite links"
          >
            {isLoading && <Loader2Icon className="animate-spin" />}
            Extract again
          </Button>
        )}
        {links.length > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={onValidateHandler}
            disabled={isValidating || (isScoped && visibleLinks.length === 0)}
            title={
              isScoped
                ? `Check the status of just the ${visibleLinks.length} link(s) shown`
                : "Check each link's status (active / expired / invalid)"
            }
          >
            {isValidating && <Loader2Icon className="animate-spin" />}
            {isValidating
              ? 'Validating...'
              : isScoped
                ? `Validate ${visibleLinks.length} shown`
                : hasAnyValidation
                  ? 'Re-validate links'
                  : 'Validate links'}
          </Button>
        )}
        {onToggleAutoValidate && (
          <Label
            title="Automatically validate links as soon as they're extracted"
            className="cursor-pointer text-xs font-normal text-muted-foreground"
          >
            <Switch size="sm" checked={!!autoValidate} onCheckedChange={onToggleAutoValidate} />
            Auto-validate
          </Label>
        )}
        {links.length > 0 && (
          <FilterMenu
            hideDuplicates={hideDuplicates}
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            onStatusFilterChange={onStatusFilterChange}
            onToggleHideDuplicates={onToggleHideDuplicates}
            statusCounts={statusCounts}
            statusFilter={statusFilter}
          />
        )}
        {links.length > 0 && (
          <ExportMenu
            exportScope={exportScope}
            hasCopyAsJSON={hasCopyAsJSON}
            hasCopyAsText={hasCopyAsText}
            isCopyAsJSON={isCopyAsJSON}
            isCopyAsText={isCopyAsText}
            isOpen={isExportOpen}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onOpenChange={setIsExportOpen}
            onScopeChange={setExportScope}
            validLinksCount={validLinks.length}
            visibleLinksCount={visibleLinks.length}
          />
        )}
        {links.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => setIsClearCacheOpen(true)}
            title="Delete cached validation results so every link is re-checked from scratch"
          >
            <Trash2Icon />
            Clear cache
          </Button>
        )}
      </div>
      {/* Validation keeps running in the background regardless of this dialog's visibility —
          `open` only controls whether the detailed view is shown. Escape/outside-press and the
          chevron button both minimize rather than close, so progress is never hidden for good
          until validation actually finishes. */}
      <Dialog open={!!isValidating && !isProgressMinimized} onOpenChange={(open) => !open && minimizeProgress()}>
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <DialogHeader className="flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-2">
              <DialogTitle>Validating links</DialogTitle>
              <DialogDescription>
                Keep working while this runs in the background — minimize it and reopen anytime from the floating indicator.
              </DialogDescription>
            </div>
            <Button type="button" size="icon-sm" variant="ghost" onClick={minimizeProgress} title="Minimize">
              <ChevronDownIcon />
            </Button>
          </DialogHeader>
          <ValidationProgress
            fallbackTotal={links.length}
            inFlightLinks={inFlightLinks}
            queuedLinks={queuedLinks}
            validationProgress={validationProgress}
            onCancel={onCancelValidation}
            onRetry={onRetryValidation}
          />
        </DialogContent>
      </Dialog>
      {isValidating && isProgressMinimized && (
        <Button
          type="button"
          size="sm"
          onClick={restoreProgress}
          title="Show validation progress"
          className="fixed right-3 bottom-3 z-50 shadow-lg"
        >
          <Loader2Icon className="animate-spin" />
          {`Validating... ${progressDone}/${progressTotal}`}
        </Button>
      )}
      <AlertDialog open={isClearCacheOpen} onOpenChange={setIsClearCacheOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear validation cache?</AlertDialogTitle>
            <AlertDialogDescription>
              Every cached status, name, and icon for links you&apos;ve checked will be deleted — not just the ones shown here. The next
              validation will re-check everything from scratch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClearCacheConfirm}>
              Clear cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Actions;
