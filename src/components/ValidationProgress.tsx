import { Progress } from '@/components/ui/progress';

interface PropTypes {
  fallbackTotal: number;
  inFlightLinks?: string[];
  validationProgress?: { done: number; total: number };
}

function ValidationProgress({ fallbackTotal, inFlightLinks, validationProgress }: PropTypes) {
  const progressDone = validationProgress?.done ?? 0;
  const progressTotal = validationProgress?.total ?? fallbackTotal;
  const remaining = progressTotal - progressDone;
  // Bottleneck's validationLimiter (src/validation.ts) launches roughly 2 validations/sec
  // (minTime: 500ms) regardless of concurrency
  const VALIDATIONS_PER_MINUTE = 120;
  const etaMinutes = Math.ceil(remaining / VALIDATIONS_PER_MINUTE);
  const etaHint = remaining > VALIDATIONS_PER_MINUTE ? ` · ~${etaMinutes}m remaining` : '';
  const progressPercent = progressTotal > 0 ? Math.min(100, Math.round((progressDone / progressTotal) * 100)) : 0;

  return (
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
  );
}

export default ValidationProgress;
