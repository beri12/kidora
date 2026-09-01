import type { LmsActivity } from '@/types';

/**
 * Every activity component takes the same props and produces the response
 * shape the backend grader for its type expects. Components never compute a
 * score — they only report what the learner did.
 */
export interface ActivityProps {
  activity: LmsActivity;
  value: Record<string, unknown> | null;
  onChange: (response: Record<string, unknown>) => void;
  disabled?: boolean;
}

export const cfg = (activity: LmsActivity): Record<string, any> => activity.config ?? {};

/** Shared option-button styling for the choice-shaped activities. */
export function optionClass(selected: boolean, disabled?: boolean) {
  return [
    'w-full rounded-2xl border-2 px-4 py-3 text-left font-display font-extrabold',
    'focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400',
    'motion-safe:transition-colors',
    selected ? 'border-brand-600 bg-brand-100 text-brand-800' : 'border-brand-100 bg-white text-brand-800',
    disabled ? 'opacity-70' : 'hover:border-brand-400',
  ].join(' ');
}
