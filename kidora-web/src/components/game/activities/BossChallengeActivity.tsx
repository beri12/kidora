'use client';
import { useState } from 'react';
import { ActivityProps, cfg } from './types';

interface BossStep {
  prompt: string;
  choices: string[];
}

/**
 * BOSS_CHALLENGE — response: { steps: number[] }
 *
 * The end-of-section showdown: a short run of questions that must all land.
 * Grading happens on the server; this only collects the chosen indexes.
 */
export function BossChallengeActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const steps: BossStep[] = cfg(activity).steps ?? [];
  const answers = ((value?.steps as number[]) ?? steps.map(() => -1)).slice();
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const answer = (choice: number) => {
    const next = [...answers];
    next[index] = choice;
    onChange({ steps: next });
    if (index < steps.length - 1) setIndex(index + 1);
  };

  if (!step) return null;

  return (
    <div className="rounded-[28px] border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-extrabold text-rose-600">
          ⚔️ Round {index + 1} of {steps.length}
        </p>
        <ul className="flex gap-1" aria-label="Rounds answered">
          {steps.map((_, i) => (
            <li
              key={i}
              aria-label={answers[i] >= 0 ? `Round ${i + 1} answered` : `Round ${i + 1} not answered`}
              className={`h-2.5 w-6 rounded-full ${answers[i] >= 0 ? 'bg-rose-500' : 'bg-rose-200'}`}
            />
          ))}
        </ul>
      </div>

      <p className="mt-3 font-display text-xl font-extrabold text-brand-900">{step.prompt}</p>

      <ul className="mt-4 space-y-2">
        {step.choices.map((choice, i) => (
          <li key={choice}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => answer(i)}
              className={`w-full rounded-2xl border-2 px-4 py-3 text-left font-display font-extrabold focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-400 ${
                answers[index] === i ? 'border-rose-500 bg-rose-100 text-rose-800' : 'border-brand-100 bg-white text-brand-800'
              }`}
            >
              {choice}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="rounded-xl bg-white px-3 py-2 font-display font-extrabold text-brand-600 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setIndex(Math.min(steps.length - 1, index + 1))}
          disabled={index === steps.length - 1}
          className="rounded-xl bg-white px-3 py-2 font-display font-extrabold text-brand-600 disabled:opacity-40 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
