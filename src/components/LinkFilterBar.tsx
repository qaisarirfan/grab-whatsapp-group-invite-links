import { Button } from '@/components/ui/button';

import type { StatusFilter } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

const NEUTRAL_FILTER_COLOR = '#333';

const getFilterColor = (key: StatusFilter): string => (key === 'all' ? NEUTRAL_FILTER_COLOR : getStatusColor(key));

const FILTER_KEYS: StatusFilter[] = ['all', 'valid', 'expired', 'invalid', 'rate-limited', 'pending'];

interface PropTypes {
  hideDuplicates: boolean;
  onStatusFilterChange: (key: StatusFilter) => void;
  onToggleHideDuplicates: () => void;
  statusCounts: Record<StatusFilter, number>;
  statusFilter: StatusFilter;
}

function LinkFilterBar({ hideDuplicates, onStatusFilterChange, onToggleHideDuplicates, statusCounts, statusFilter }: PropTypes) {
  return (
    <div className="flex flex-wrap items-center gap-2 pb-3">
      <span className="mr-0.5 text-[11px] tracking-wide text-muted-foreground uppercase">Filter:</span>
      {FILTER_KEYS.filter((key) => key === 'all' || key === statusFilter || statusCounts[key] > 0).map((key) => (
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
          onClick={() => onStatusFilterChange(key)}
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
        onClick={onToggleHideDuplicates}
      >
        Hide duplicates
      </Button>
    </div>
  );
}

export default LinkFilterBar;
