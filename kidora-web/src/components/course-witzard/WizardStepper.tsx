// components/course-wizard/WizardStepper.tsx
'use client';

const STEPS = [
  { key: 'basicInfo', label: 'Basic Information', href: '/dashboard/teacher/create-course/basic-info' },
  { key: 'curriculum', label: 'Curriculum', href: '/dashboard/teacher/create-course/curriculum' },
  { key: 'advanceInfo', label: 'Advance Information', href: '/dashboard/teacher/create-course/advance-info' },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

export function WizardStepper({
  current,
  stepStatus,
}: {
  current: StepKey;
  // Keyed by the three known steps rather than Record<string, boolean>: the
  // store's StepStatus is an interface with fixed keys, and an interface has
  // no index signature, so it is not assignable to Record<string, boolean>.
  stepStatus: Record<StepKey, boolean>;
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