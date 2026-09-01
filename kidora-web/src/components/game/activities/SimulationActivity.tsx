'use client';
import { useState } from 'react';
import { ActivityProps, cfg } from './types';

interface Step {
  id: string;
  label: string;
  description?: string;
}

/**
 * SIMULATION — response: { path: string[] }
 *
 * The learner performs a procedure by choosing actions in order (a science
 * experiment, a safety routine). The server checks every required step is
 * present in the path they took.
 */
export function SimulationActivity({ activity, onChange, disabled }: ActivityProps) {
  const config = cfg(activity);
  const steps: Step[] = config.steps ?? [];
  const [path, setPath] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (disabled) return;
    const next = path.includes(id) ? path.filter((s) => s !== id) : [...path, id];
    setPath(next);
    onChange({ path: next });
  };

  return (
    <div className="space-y-4">
      <p className="font-body font-bold text-brand-500">
        Tap the actions in the order you would do them.
      </p>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {steps.map((step) => {
          const position = path.indexOf(step.id);
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => toggle(step.id)}
                aria-pressed={position >= 0}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
                  position >= 0 ? 'border-grass-400 bg-grass-100' : 'border-brand-100 bg-white'
                }`}
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white font-display font-extrabold text-brand-700"
                >
                  {position >= 0 ? position + 1 : '+'}
                </span>
                <span>
                  <span className="block font-display font-extrabold text-brand-900">{step.label}</span>
                  {step.description && (
                    <span className="block font-body text-sm font-bold text-brand-500">{step.description}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="font-body-x text-[12px] text-brand-400">
        {path.length} {path.length === 1 ? 'action' : 'actions'} chosen
      </p>
    </div>
  );
}
