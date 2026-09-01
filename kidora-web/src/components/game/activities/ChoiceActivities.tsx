'use client';
import { ActivityProps, cfg, optionClass } from './types';

/** MULTIPLE_CHOICE — response: { choice: index } */
export function MultipleChoiceActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const choices: string[] = cfg(activity).choices ?? cfg(activity).options ?? [];
  const selected = typeof value?.choice === 'number' ? (value.choice as number) : -1;

  return (
    <fieldset className="space-y-2.5" disabled={disabled}>
      <legend className="sr-only">{activity.title}</legend>
      {choices.map((choice, i) => (
        <label key={i} className={optionClass(selected === i, disabled)}>
          <input
            type="radio"
            name={`activity-${activity.id}`}
            className="sr-only"
            checked={selected === i}
            onChange={() => onChange({ choice: i })}
          />
          <span aria-hidden className="mr-2 text-brand-400">
            {String.fromCharCode(65 + i)}.
          </span>
          {choice}
        </label>
      ))}
    </fieldset>
  );
}

/** TRUE_FALSE — response: { choice: 0 | 1 } */
export function TrueFalseActivity({ activity, value, onChange, disabled }: ActivityProps) {
  const labels: string[] = cfg(activity).labels ?? ['True', 'False'];
  const selected = typeof value?.choice === 'number' ? (value.choice as number) : -1;

  return (
    <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled}>
      <legend className="sr-only">{activity.title}</legend>
      {labels.map((label, i) => (
        <label key={label} className={`${optionClass(selected === i, disabled)} text-center text-lg`}>
          <input
            type="radio"
            name={`activity-${activity.id}`}
            className="sr-only"
            checked={selected === i}
            onChange={() => onChange({ choice: i })}
          />
          <span aria-hidden className="mr-1">{i === 0 ? '✅' : '❌'}</span>
          {label}
        </label>
      ))}
    </fieldset>
  );
}
