import { cn } from '@/lib/utils';

/**
 * Progress bar with a real ARIA meter, so a screen reader announces the value
 * rather than just seeing a coloured div.
 */
export function ProgressBar({
  value,
  label,
  showValue = true,
  tone = 'brand',
  className,
}: {
  value: number;
  label: string;
  showValue?: boolean;
  tone?: 'brand' | 'grass' | 'sun';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fill = {
    brand: 'from-brand-500 to-brand-700',
    grass: 'from-grass-400 to-grass-600',
    sun: 'from-amber-300 to-amber-500',
  }[tone];

  return (
    <div className={className}>
      {showValue && (
        <div className="mb-1 flex justify-between font-body-x text-[12px] text-brand-500">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-3 overflow-hidden rounded-full bg-brand-100"
      >
        <div
          className={cn('h-full rounded-full bg-gradient-to-r motion-safe:transition-all motion-safe:duration-700', fill)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
