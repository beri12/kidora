'use client';
import { ActivityProps, cfg } from './types';

/**
 * MATCHING — response: { pairs: { [left]: right } }
 *
 * Uses a labelled <select> per row rather than a drag interaction, so it works
 * with a keyboard, a screen reader and a small touchscreen without a fallback.
 */
export function MatchingActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const config = cfg(activity);
  const left: string[] = config.left ?? [];
  const right: string[] = config.right ?? [];
  const pairs = (value?.pairs as Record<string, string>) ?? {};

  const set = (key: string, val: string) => {
    const next = { ...pairs };
    if (val) next[key] = val;
    else delete next[key];
    onChange({ pairs: next });
  };

  return (
    <ul className="space-y-3">
      {left.map((item) => (
        <li key={item} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand-100 bg-white p-3">
          <span className="min-w-0 flex-1 font-display font-extrabold text-brand-900">{item}</span>
          <label className="sr-only" htmlFor={`match-${activity.id}-${item}`}>
            Match for {item}
          </label>
          <select
            id={`match-${activity.id}-${item}`}
            disabled={disabled}
            value={pairs[item] ?? ''}
            onChange={(e) => set(item, e.target.value)}
            className="rounded-2xl border-2 border-brand-100 bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
          >
            <option value="">Choose…</option>
            {right.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
