import type { Dispatch, SetStateAction } from 'react';

// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import ChevronDownIcon from 'lucide-react/dist/esm/icons/chevron-down.mjs';
import ChevronUpIcon from 'lucide-react/dist/esm/icons/chevron-up.mjs';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { StatusFilter } from '@src/validation';
import { getStatusLabel, getStatusTooltip } from '@src/validation';

const FILTER_KEYS: StatusFilter[] = ['all', 'valid', 'expired', 'invalid', 'rate-limited', 'pending'];

interface PropTypes {
  hideDuplicates: boolean;
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  onStatusFilterChange: (key: StatusFilter) => void;
  onToggleHideDuplicates: VoidFunction;
  statusCounts: Record<StatusFilter, number>;
  statusFilter: StatusFilter;
}

function FilterMenu({
  hideDuplicates,
  isOpen,
  onOpenChange,
  onStatusFilterChange,
  onToggleHideDuplicates,
  statusCounts,
  statusFilter,
}: PropTypes) {
  const activeLabel = statusFilter === 'all' ? 'All' : getStatusLabel(statusFilter);

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger render={<DropdownMenuTrigger render={<Button type="button" size="sm" variant="outline" />} />}>
          {`Filter: ${activeLabel}`}
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </TooltipTrigger>
        <TooltipContent>Filter links by status</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={statusFilter} onValueChange={onStatusFilterChange}>
            {FILTER_KEYS.filter((key) => key === 'all' || key === statusFilter || statusCounts[key] > 0).map((key) => (
              <DropdownMenuRadioItem key={key} value={key} title={key === 'all' ? 'Show every extracted link' : getStatusTooltip(key)}>
                {`${key === 'all' ? 'All' : getStatusLabel(key)} (${statusCounts[key]})`}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={hideDuplicates}
            onCheckedChange={onToggleHideDuplicates}
            closeOnClick={false}
            title="Collapse invite links that resolve to the same group name"
          >
            Hide duplicates
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FilterMenu;
