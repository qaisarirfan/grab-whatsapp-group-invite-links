import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

const SKELETON_ROW_COUNT = 6;

function LinksSkeleton() {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
          <TableRow key={index}>
            <TableCell className="w-12">
              <Skeleton className="h-4 w-6" />
            </TableCell>
            <TableCell>
              <div className="flex items-start gap-2">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5 py-0.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default LinksSkeleton;
