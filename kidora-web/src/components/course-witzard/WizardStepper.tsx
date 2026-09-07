// components/course-wizard/WizardStepper.tsx
'use client';
import type { StepStatus } from '@/stores/courseWizard.store';

const STEPS = [
  { key: 'basicInfo', label: 'Basic Information', href: '/dashboard/teacher/create-course/basic-info' },
  { key: 'curriculum', label: 'Curriculum', href: '/dashboard/teacher/create-course/curriculum' },
  { key: 'advanceInfo', label: 'Advance Information', href: '/dashboard/teacher/create-course/advance-info' },
] as const;

export function WizardStepper({
  current,
  stepStatus,
}: {
  current: 'basicInfo' | 'curriculum' | 'advanceInfo';
  // The concrete type rather than Record<string, boolean>: an interface has no
  // index signature, so the closed StepStatus the store exposes was not
  // assignable to the loose form and every caller errored.
  stepStatus: StepStatus;
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const done = stepStatus[step.key];
        const active = step.key === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={
                  'w-8 h-8 rounded-full grid place-items-center text-sm font-bold shrink-0 ' +
                  (done
                    ? 'bg-emerald-500 text-white'
                    : active
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-400')
                }
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={
                  'text-sm font-semibold whitespace-nowrap ' +
                  (active ? 'text-purple-700' : done ? 'text-emerald-600' : 'text-gray-400')
                }
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={'h-0.5 flex-1 mx-3 ' + (done ? 'bg-emerald-400' : 'bg-purple-100')} />
            )}
          </div>
        );
      })}
    </div>
  );
}