import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TableCell } from '@/components/ui/table';

import type { LinkValidation } from '@src/validation';
import { getStatusColor, getStatusLabel, getStatusTooltip } from '@src/validation';

interface PropTypes {
  index: number;
  link: string;
  validation?: LinkValidation;
}

function LinkRow({ index, link, validation }: PropTypes) {
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
                  <Badge style={{ backgroundColor: color, color: '#fff' }} title={getStatusTooltip(status)} className="border-transparent">
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
}

export default LinkRow;
