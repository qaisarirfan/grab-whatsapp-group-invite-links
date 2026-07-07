import { useEffect, useState } from 'react';

// Deep imports (instead of `from 'lucide-react'`) avoid pulling the whole icon set into the
// bundle — lucide-react's barrel file isn't tree-shaken by this webpack config and previously
// added ~1.5MB to vendors.js for 3 icons.
import TriangleAlertIcon from 'lucide-react/dist/esm/icons/triangle-alert.mjs';

import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Bottleneck's validationLimiter (src/validation.ts) launches roughly 2 validations/sec
// (minTime: 500ms) regardless of concurrency
const VALIDATIONS_PER_MINUTE = 120;

// If the done count hasn't moved in this long, every in-flight link is almost certainly stuck
// retrying a 429 (see axiosRetry config in src/validation.ts) rather than the batch being frozen.
const STUCK_THRESHOLD_MS = 12000;

interface PropTypes {
  fallbackTotal: number;
  inFlightLinks?: string[];
  queuedLinks?: string[];
  validationProgress?: { done: number; total: number };
  onCancel?: VoidFunction;
  onRetry?: VoidFunction;
}

function ValidationProgress({ fallbackTotal, inFlightLinks, queuedLinks, validationProgress, onCancel, onRetry }: PropTypes) {
  const progressDone = validationProgress?.done ?? 0;
  const progressTotal = validationProgress?.total ?? fallbackTotal;
  const remaining = progressTotal - progressDone;
  const etaMinutes = Math.ceil(remaining / VALIDATIONS_PER_MINUTE);
  const etaHint = remaining > VALIDATIONS_PER_MINUTE ? ` · ~${etaMinutes}m remaining` : '';
  const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  const [isStuck, setIsStuck] = useState(false);

  // Resets on every completed link — only fires when `progressDone` stalls for a while.
  useEffect(() => {
    setIsStuck(false);
    const timer = setTimeout(() => setIsStuck(true), STUCK_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [progressDone]);

  // Cache-hit links resolve without ever touching the rate limiter, so inFlightLinks can be
  // empty even mid-run — fall back to the next queued link so this line never goes blank.
  const displayLink = inFlightLinks && inFlightLinks.length > 0 ? inFlightLinks[inFlightLinks.length - 1] : queuedLinks?.[0];

  return (
    <div className="flex w-full flex-col gap-2 py-2">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground max-w-full">
        <span>{`${progressDone}/${progressTotal} (${progressPercent}%)${etaHint}`}</span>
        <span>{`${inFlightLinks && inFlightLinks.length > 1 ? ` (+${inFlightLinks.length - 1} more in flight)` : ''}`}</span>
      </div>
      <Progress aria-label="Validating links" value={progressPercent} className="gap-0" />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground max-w-full">
        <span className="min-w-0 flex-1 truncate font-mono" title={inFlightLinks?.join('\n')}>
          {displayLink ? `Validating ${displayLink}` : 'Validating...'}
        </span>
      </div>
      {isStuck && (
        <Alert>
          <TriangleAlertIcon className="text-amber-600 dark:text-amber-500" />
          <AlertTitle>No progress for a bit</AlertTitle>
          <AlertDescription>
            WhatsApp is likely rate-limiting these requests — each queued link retries automatically and should resolve on its own. If it
            stays stuck, cancel and try validating again in a few minutes.
          </AlertDescription>
          {(onCancel || onRetry) && (
            <AlertAction className="flex gap-1.5">
              {onRetry && (
                <Button type="button" size="xs" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              )}
              {onCancel && (
                <Button type="button" size="xs" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </AlertAction>
          )}
        </Alert>
      )}
    </div>
  );
}

export default ValidationProgress;
