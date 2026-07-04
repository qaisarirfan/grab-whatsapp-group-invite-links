import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { convertToCsv } from '@src/utils';

type Log = {
  origin: string;
  href: string;
  count: number;
  errorMessage: string | null;
  hasError: boolean;
};

interface Props {
  progress: string;
  isLoading: boolean;
  logs: Log[];
}

function Logs({ logs, progress, isLoading }: Props) {
  return (
    <>
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <p>{progress}</p>
          {isLoading && <Spinner className="text-muted-foreground" />}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={isLoading}
          onClick={() =>
            convertToCsv(
              logs.map((log) => ({
                Total: log.count,
                Error: log.errorMessage,
                Link: log.href,
              })),
              'logs'
            )
          }
        >
          Download csv
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log, index) => (
            <TableRow key={log.href} className="font-mono text-xs">
              <TableCell>
                {(logs.length - index).toLocaleString(undefined, {
                  useGrouping: false,
                  minimumIntegerDigits: 3,
                })}
              </TableCell>
              <TableCell>
                <a target="_blank" href={log?.href} rel="noreferrer">
                  {log?.origin}
                </a>
              </TableCell>
              <TableCell className={log?.hasError ? 'text-destructive' : undefined}>
                {log?.count > 0 && <p>{`finds ${log?.count} links`}</p>}
                {log?.errorMessage && <span>{log?.errorMessage}</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

export default Logs;
