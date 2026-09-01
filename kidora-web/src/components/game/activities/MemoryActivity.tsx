'use client';
import { useEffect, useMemo, useState } from 'react';
import { ActivityProps, cfg } from './types';

/**
 * MEMORY — response: { solved: number }
 *
 * A pairs game. The board is shuffled per mount; the server only ever sees how
 * many pairs were matched, and decides on its own whether that is enough.
 */
export function MemoryActivity({ activity, onChange, disabled }: ActivityProps) {
  const symbols: string[] = cfg(activity).cards ?? ['🍎', '🌟', '🐝', '🎈'];
  const deck = useMemo(() => {
    const doubled = [...symbols, ...symbols].map((s, i) => ({ key: `${s}-${i}`, symbol: s }));
    for (let i = doubled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
    }
    return doubled;
  }, [symbols]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);

  useEffect(() => {
    onChange({ solved: matched.length / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched.length]);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [a, b] = flipped.map((k) => deck.find((c) => c.key === k)!);
    const timer = setTimeout(() => {
      if (a.symbol === b.symbol) setMatched((m) => [...m, a.key, b.key]);
      setFlipped([]);
    }, a.symbol === b.symbol ? 250 : 700);
    return () => clearTimeout(timer);
  }, [flipped, deck]);

  const flip = (key: string) => {
    if (disabled || flipped.length === 2 || flipped.includes(key) || matched.includes(key)) return;
    setFlipped((f) => [...f, key]);
  };

  return (
    <div>
      <p className="mb-3 font-body font-bold text-brand-500" aria-live="polite">
        Pairs found: {matched.length / 2} of {symbols.length}
      </p>
      <ul className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {deck.map((card) => {
          const shown = flipped.includes(card.key) || matched.includes(card.key);
          return (
            <li key={card.key}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => flip(card.key)}
                aria-label={shown ? `Card showing ${card.symbol}` : 'Face-down card'}
                className={`grid aspect-square w-full place-items-center rounded-2xl border-2 text-3xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
                  shown ? 'border-grass-400 bg-grass-100' : 'border-brand-100 bg-brand-50'
                }`}
              >
                <span aria-hidden>{shown ? card.symbol : '❓'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
