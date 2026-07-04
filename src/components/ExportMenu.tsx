import type { Dispatch, SetStateAction } from 'react';

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

export type ExportScope = 'shown' | 'valid';

interface PropTypes {
  exportScope: ExportScope;
  hasCopyAsJSON: boolean;
  hasCopyAsText: boolean;
  isCopyAsJSON: boolean;
  isCopyAsText: boolean;
  isOpen: boolean;
  onCopy: (format: string) => void;
  onDownload: VoidFunction;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onScopeChange: Dispatch<SetStateAction<ExportScope>>;
  validLinksCount: number;
  visibleLinksCount: number;
}

function ExportMenu({
  exportScope,
  hasCopyAsJSON,
  hasCopyAsText,
  isCopyAsJSON,
  isCopyAsText,
  isOpen,
  onCopy,
  onDownload,
  onOpenChange,
  onScopeChange,
  validLinksCount,
  visibleLinksCount,
}: PropTypes) {
  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" title="Copy or download the extracted links" />}>
        Export
        {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Scope</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={exportScope} onValueChange={onScopeChange}>
            <DropdownMenuRadioItem value="shown">{`Shown (${visibleLinksCount})`}</DropdownMenuRadioItem>
            {validLinksCount > 0 && (
              <DropdownMenuRadioItem value="valid" title="Only active links from what's currently shown">
                {`Valid only (${validLinksCount})`}
              </DropdownMenuRadioItem>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Export</DropdownMenuLabel>
          <DropdownMenuItem
            closeOnClick={false}
            onClick={() => onCopy('text')}
            title="Copies the selected links to your clipboard, one per line"
          >
            {isCopyAsText && <Loader2Icon className="animate-spin" />}
            {`${hasCopyAsText ? 'Copied' : 'Copy'} as Text`}
          </DropdownMenuItem>
          {exportScope === 'shown' && (
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => onCopy('json')}
              title="Copies the selected links to your clipboard as a JSON array"
            >
              {isCopyAsJSON && <Loader2Icon className="animate-spin" />}
              {`${hasCopyAsJSON ? 'Copied' : 'Copy'} as JSON`}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem title="Downloads the selected links as a CSV file" onClick={onDownload}>
            Download CSV
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportMenu;
