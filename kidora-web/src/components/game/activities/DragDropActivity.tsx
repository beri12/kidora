'use client';
import { useState } from 'react';
import { ActivityProps, cfg } from './types';

interface Target {
  id: string;
  label: string;
}

/**
 * DRAG_DROP — response: { pairs: { [targetId]: item } }
 *
 * Uses the native HTML5 drag-and-drop API (no new dependency) *and* a full
 * click/keyboard path: pick an item, then choose a target. Pointer dragging is
 * an enhancement, never the only way through.
 */
export function DragDropActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const config = cfg(activity);
  const items: string[] = config.items ?? [];
  const targets: Target[] = config.targets ?? [];
  const pairs = (value?.pairs as Record<string, string>) ?? {};
  const [picked, setPicked] = useState<string | null>(null);

  const placed = new Set(Object.values(pairs));

  const drop = (targetId: string, item: string) => {
    if (disabled || !item) return;
    const next: Record<string, string> = {};
    // One item per target, and an item can only sit in one place.
    for (const [t, v] of Object.entries(pairs)) {
      if (t !== targetId && v !== item) next[t] = v;
    }
    next[targetId] = item;
    onChange({ pairs: next });
    setPicked(null);
  };

  const clear = (targetId: string) => {
    const next = { ...pairs };
    delete next[targetId];
    onChange({ pairs: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 font-body-x text-[12px] uppercase text-brand-400">
          Pick a card{picked ? ` — “${picked}” selected` : ''}
        </h4>
        <ul className="flex flex-wrap gap-2">
          {items.filter((i) => !placed.has(i)).map((item) => (
            <li key={item}>
              <button
                type="button"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', item)}
                onClick={() => setPicked(picked === item ? null : item)}
                aria-pressed={picked === item}
                className={`rounded-2xl border-2 px-4 py-2.5 font-display font-extrabold focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
                  picked === item
                    ? 'border-brand-600 bg-brand-100 text-brand-800'
                    : 'border-brand-100 bg-white text-brand-800 hover:border-brand-400'
                }`}
              >
                {item}
              </button>
            </li>
          ))}
          {items.length > 0 && items.every((i) => placed.has(i)) && (
            <li className="font-body font-bold text-brand-400">All cards placed 🎉</li>
          )}
        </ul>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {targets.map((target) => {
          const holding = pairs[target.id];
          return (
            <li key={target.id}>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  drop(target.id, e.dataTransfer.getData('text/plain'));
                }}
                className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/60 p-4"
              >
                <p className="font-display font-extrabold text-brand-900">{target.label}</p>
                {holding ? (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-xl bg-white px-3 py-1.5 font-display font-extrabold text-brand-700">
                      {holding}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => clear(target.id)}
                      className="font-body-x text-[12px] text-brand-500 underline focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
                    >
                      remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={disabled || !picked}
                    onClick={() => picked && drop(target.id, picked)}
                    className="mt-2 w-full rounded-xl bg-white px-3 py-2 font-body font-bold text-brand-500 disabled:opacity-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
                  >
                    {picked ? `Place “${picked}” here` : 'Drop a card here'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
