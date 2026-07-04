import { useEffect, useState } from 'react';

// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import ChevronUpIcon from 'lucide-react/dist/esm/icons/chevron-up.mjs';
import Loader2Icon from 'lucide-react/dist/esm/icons/loader-2.mjs';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

import Analytics from '@src/analytics';
import { convertToCsv, copyToClipboard } from '@src/utils';
import type { LinkValidation } from '@src/validation';
import { getStatusLabel } from '@src/validation';

type ExportScope = 'shown' | 'valid';

interface PropTypes {
  isGoogleSearchPage: boolean;
  isLoading: boolean;
  links: string[];
  visibleLinks: string[];
  onFetch: VoidFunction;
  onValidateAll?: VoidFunction;
  isValidating?: boolean;
  validationProgress?: { done: number; total: number };
  inFlightLinks?: string[];
  validations?: Record<string, LinkValidation>;
  autoValidate?: boolean;
  onToggleAutoValidate?: (value: boolean) => void;
}

function Actions({
  isGoogleSearchPage,
  isLoading,
  links,
  visibleLinks,
  onFetch,
  onValidateAll,
  isValidating,
  validationProgress,
  inFlightLinks,
  validations,
  autoValidate,
  onToggleAutoValidate,
}: PropTypes) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('shown');
  const [hasCopyAsJSON, setHasCopyAsJSON] = useState(false);
  const [isCopyAsJSON, setIsCopyAsJSON] = useState(false);
  const [hasCopyAsText, setHasCopyAsText] = useState(false);
  const [isCopyAsText, setIsCopyAsText] = useState(false);

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
      Analytics.fireEvent('validate_all_clicked', { total_links: links.length });
      onValidateAll();
    }
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

  const progressDone = validationProgress?.done ?? 0;
  const progressTotal = validationProgress?.total ?? links.length;
  const remaining = progressTotal - progressDone;
  // Bottleneck's validationLimiter (src/validation.ts) launches roughly 2 validations/sec
  // (minTime: 500ms) regardless of concurrency
  const VALIDATIONS_PER_MINUTE = 120;
  const etaMinutes = Math.ceil(remaining / VALIDATIONS_PER_MINUTE);
  const etaHint = remaining > VALIDATIONS_PER_MINUTE ? ` · ~${etaMinutes}m remaining` : '';
  const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

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
            disabled={isValidating}
            title="Check each link's status (active / expired / invalid)"
          >
            {isValidating && <Loader2Icon className="animate-spin" />}
            {isValidating ? 'Validating...' : hasAnyValidation ? 'Re-validate links' : 'Validate links'}
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
          <DropdownMenu open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" title="Copy or download the extracted links" />}>
              Export
              {isExportOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Scope</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={exportScope} onValueChange={setExportScope}>
                  <DropdownMenuRadioItem value="shown">{`Shown (${visibleLinks.length})`}</DropdownMenuRadioItem>
                  {validLinks.length > 0 && (
                    <DropdownMenuRadioItem value="valid" title="Only active links from what's currently shown">
                      {`Valid only (${validLinks.length})`}
                    </DropdownMenuRadioItem>
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Export</DropdownMenuLabel>
                <DropdownMenuItem
                  closeOnClick={false}
                  onClick={() => handleCopy('text')}
                  title="Copies the selected links to your clipboard, one per line"
                >
                  {isCopyAsText && <Loader2Icon className="animate-spin" />}
                  {`${hasCopyAsText ? 'Copied' : 'Copy'} as Text`}
                </DropdownMenuItem>
                {exportScope === 'shown' && (
                  <DropdownMenuItem
                    closeOnClick={false}
                    onClick={() => handleCopy('json')}
                    title="Copies the selected links to your clipboard as a JSON array"
                  >
                    {isCopyAsJSON && <Loader2Icon className="animate-spin" />}
                    {`${hasCopyAsJSON ? 'Copied' : 'Copy'} as JSON`}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem title="Downloads the selected links as a CSV file" onClick={handleDownload}>
                  Download CSV
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isValidating && (
        <div className="flex w-full flex-col gap-1 py-2">
          <Progress value={progressPercent} className="gap-0" />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="min-w-0 flex-1 truncate font-mono" title={inFlightLinks?.join('\n')}>
              {inFlightLinks && inFlightLinks.length > 0
                ? `Validating ${inFlightLinks[0]}${inFlightLinks.length > 1 ? ` (+${inFlightLinks.length - 1} more in flight)` : ''}`
                : 'Validating...'}
            </span>
            <span>{`${progressDone}/${progressTotal} (${progressPercent}%)${etaHint}`}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Actions;
