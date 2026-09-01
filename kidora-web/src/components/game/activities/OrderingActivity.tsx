'use client';
import { useEffect, useState } from 'react';
import { ActivityProps, cfg } from './types';

/**
 * ORDERING — response: { sequence: string[] }
 *
 * Move-up / move-down buttons rather than drag-only, so the whole activity is
 * operable from the keyboard. Each move announces the new position.
 */
export function OrderingActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const items: string[] = cfg(activity).items ?? [];
  const [order, setOrder] = useState<string[]>((value?.sequence as string[]) ?? items);

  useEffect(() => {
    if (!value?.sequence) onChange({ sequence: order });
    // Report the starting order once so a learner who is happy with it can submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
    onChange({ sequence: next });
  };

  return (
    <ol className="space-y-2.5">
      {order.map((item, i) => (
        <li
          key={item}
          className="flex items-center gap-3 rounded-2xl border-2 border-brand-100 bg-white p-3"
        >
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 font-display font-extrabold text-brand-700"
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 font-display font-extrabold text-brand-900">{item}</span>
          <span className="flex gap-1">
            <button
              type="button"
              disabled={disabled || i === 0}
              onClick={() => move(i, i - 1)}
              aria-label={`Move ${item} up to position ${i}`}
              className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={disabled || i === order.length - 1}
              onClick={() => move(i, i + 1)}
              aria-label={`Move ${item} down to position ${i + 2}`}
              className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
            >
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
