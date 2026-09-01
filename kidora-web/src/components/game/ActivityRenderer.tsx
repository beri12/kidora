'use client';
import { useState, type ReactElement } from 'react';
import type { ActivityType, LmsActivity } from '@/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import type { ActivityProps } from './activities/types';
import { MultipleChoiceActivity, TrueFalseActivity } from './activities/ChoiceActivities';
import { MatchingActivity } from './activities/MatchingActivity';
import { OrderingActivity } from './activities/OrderingActivity';
import { DragDropActivity } from './activities/DragDropActivity';
import { MemoryActivity } from './activities/MemoryActivity';
import { PuzzleActivity } from './activities/PuzzleActivity';
import { DialogueActivity } from './activities/DialogueActivity';
import { SimulationActivity } from './activities/SimulationActivity';
import { BossChallengeActivity } from './activities/BossChallengeActivity';

/**
 * One renderer, one registry. Adding an activity type means adding a component
 * here and a grader on the server — never a bespoke component per question.
 */
const REGISTRY: Record<ActivityType, (props: ActivityProps) => ReactElement | null> = {
  MULTIPLE_CHOICE: MultipleChoiceActivity,
  TRUE_FALSE: TrueFalseActivity,
  MATCHING: MatchingActivity,
  ORDERING: OrderingActivity,
  DRAG_DROP: DragDropActivity,
  MEMORY: MemoryActivity,
  PUZZLE: PuzzleActivity,
  DIALOGUE: DialogueActivity,
  SIMULATION: SimulationActivity,
  BOSS_CHALLENGE: BossChallengeActivity,
};

export interface ActivityOutcome {
  correct: boolean;
  score: number;
  maxScore: number;
}

export function ActivityRenderer({
  activity,
  onSubmit,
  isSubmitting,
  outcome,
  onNext,
}: {
  activity: LmsActivity;
  /** Sends the learner's response. The score comes back from the server. */
  onSubmit: (response: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  outcome?: ActivityOutcome | null;
  onNext?: () => void;
}) {
  const [response, setResponse] = useState<Record<string, unknown> | null>(null);
  const Component = REGISTRY[activity.type];

  if (!Component) {
    return (
      <EmptyState
        icon="🧩"
        title="This activity needs an update"
        description="We do not know how to show this activity type yet. Your teacher has been able to save it — please try another one for now."
      />
    );
  }

  const answered = response !== null;

  return (
    <section className="rounded-[28px] border-2 border-brand-100 bg-white p-6 shadow-card">
      <h2 className="font-display text-2xl font-extrabold text-brand-900">{activity.title}</h2>
      {activity.instructions && (
        <p className="mt-1 font-body font-bold text-brand-500">{activity.instructions}</p>
      )}

      <div className="mt-5">
        <Component
          activity={activity}
          value={response}
          onChange={setResponse}
          disabled={isSubmitting || !!outcome}
        />
      </div>

      {outcome ? (
        <div
          role="status"
          className={`mt-6 rounded-2xl p-4 font-display font-extrabold ${
            outcome.correct ? 'bg-grass-100 text-grass-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          {outcome.correct
            ? `🎉 Correct! ${outcome.score} of ${outcome.maxScore} points.`
            : 'Not quite — have another look and try the next one.'}
          {onNext && (
            <Button className="mt-4 w-full sm:w-auto" onClick={onNext}>
              Continue →
            </Button>
          )}
        </div>
      ) : (
        <Button
          className="mt-6 w-full sm:w-auto"
          onClick={() => response && onSubmit(response)}
          disabled={!answered || isSubmitting}
        >
          {isSubmitting ? 'Checking…' : 'Check my answer'}
        </Button>
      )}
    </section>
  );
}
