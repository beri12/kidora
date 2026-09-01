'use client';
import { useState } from 'react';
import { ActivityProps, cfg } from './types';

interface Line {
  id: string;
  text: string;
  options?: { id: string; label: string; next?: string }[];
}

/**
 * DIALOGUE — response: { path: string[] }
 *
 * A branching conversation with an NPC. The chosen option ids are collected as
 * a path; the server checks the path contains every required step.
 */
export function DialogueActivity({ activity, onChange, disabled }: ActivityProps) {
  const config = cfg(activity);
  const lines: Line[] = config.lines ?? [];
  const npc = config.npc ?? { name: 'Guide', emoji: '🧙' };

  const [current, setCurrent] = useState(0);
  const [path, setPath] = useState<string[]>([]);
  const line = lines[current];

  const choose = (optionId: string, next?: string) => {
    const nextPath = [...path, optionId];
    setPath(nextPath);
    onChange({ path: nextPath });
    const target = next ? lines.findIndex((l) => l.id === next) : current + 1;
    setCurrent(target >= 0 && target < lines.length ? target : lines.length);
  };

  if (!line) {
    return (
      <p className="rounded-2xl bg-grass-100 p-4 font-display font-extrabold text-grass-700">
        {npc.emoji} Conversation complete — submit your answer.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-3xl border-2 border-brand-100 bg-white p-4">
        <span aria-hidden className="text-4xl">{npc.emoji}</span>
        <div>
          <p className="font-display font-extrabold text-brand-900">{npc.name}</p>
          <p aria-live="polite" className="mt-0.5 font-body font-bold text-brand-600">{line.text}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {(line.options ?? []).map((option) => (
          <li key={option.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => choose(option.id, option.next)}
              className="w-full rounded-2xl border-2 border-brand-100 bg-white px-4 py-3 text-left font-display font-extrabold text-brand-800 hover:border-brand-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
