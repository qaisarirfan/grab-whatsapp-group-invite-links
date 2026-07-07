import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { LinkValidation } from '@src/validation';
import { getStatusBadgeClassName, getStatusLabel, getStatusTooltip } from '@src/validation';

interface PropTypes {
  index: number;
  link: string;
  validation?: LinkValidation;
}

function LinkRow({ index, link, validation }: PropTypes) {
  const hasValidation = !!validation;
  const status = validation?.status || 'pending';
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
          {/* Always mounted (not just once iconUrl resolves) so the row's left edge is stable from
              first paint — validations stream in asynchronously, and an avatar that only appears
              on success used to shift every row's text as results arrived. */}
          <Avatar>
            {validation?.iconUrl && <AvatarImage src={validation.iconUrl} alt="" />}
            <AvatarFallback>{validation?.name?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
          </Avatar>
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
                  <Tooltip>
                    <TooltipTrigger render={<Badge className={cn('border-transparent', getStatusBadgeClassName(status))} />}>
                      {label}
                    </TooltipTrigger>
                    <TooltipContent>{getStatusTooltip(status)}</TooltipContent>
                  </Tooltip>
                  {timestamp && <div className="text-[11px] text-muted-foreground">Last checked: {timestamp}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      </TableCell>
    </>
  );
}

export default LinkRow;
