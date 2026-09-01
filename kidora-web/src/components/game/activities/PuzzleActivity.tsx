'use client';
import { useEffect, useMemo, useState } from 'react';
import { ActivityProps, cfg } from './types';

/**
 * PUZZLE — response: { solved: number }
 *
 * Slot the shuffled pieces back into their numbered places. Keyboard-operable
 * (select a piece, then a slot); the server decides what counts as solved.
 */
export function PuzzleActivity({ activity, onChange, disabled }: ActivityProps) {
  const pieces: string[] = cfg(activity).pieces ?? [];
  const shuffled = useMemo(() => {
    const copy = [...pieces];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [pieces]);

  const [slots, setSlots] = useState<(string | null)[]>(() => pieces.map(() => null));
  const [picked, setPicked] = useState<string | null>(null);

  const correct = slots.filter((s, i) => s !== null && s === pieces[i]).length;

  useEffect(() => {
    onChange({ solved: correct });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correct]);

  const place = (index: number) => {
    if (disabled || !picked) return;
    setSlots((prev) => prev.map((s, i) => (i === index ? picked : s === picked ? null : s)));
    setPicked(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 font-body-x text-[12px] uppercase text-brand-400">Pieces</h4>
        <ul className="flex flex-wrap gap-2">
          {shuffled
            .filter((p) => !slots.includes(p))
            .map((piece) => (
              <li key={piece}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setPicked(picked === piece ? null : piece)}
                  aria-pressed={picked === piece}
                  className={`rounded-2xl border-2 px-4 py-2.5 font-display font-extrabold focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
                    picked === piece ? 'border-brand-600 bg-brand-100' : 'border-brand-100 bg-white'
                  }`}
                >
                  {piece}
                </button>
              </li>
            ))}
        </ul>
      </div>

      <ol className="grid gap-2.5 sm:grid-cols-2">
        {slots.map((slot, i) => (
          <li key={i}>
            <button
              type="button"
              disabled={disabled || (!picked && !slot)}
              onClick={() => place(i)}
              aria-label={slot ? `Slot ${i + 1}, holding ${slot}` : `Empty slot ${i + 1}`}
              className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 p-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
            >
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-white font-display font-extrabold text-brand-600">
                {i + 1}
              </span>
              <span className="font-display font-extrabold text-brand-800">
                {slot ?? (picked ? `Place “${picked}”` : 'Empty')}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="font-body font-bold text-brand-500">
        {correct} of {pieces.length} in place
      </p>
    </div>
  );
}
