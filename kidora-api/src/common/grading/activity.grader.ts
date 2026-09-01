import { ActivityType } from '@prisma/client';
import {
  gradeChoice,
  gradeCompletionCount,
  gradeDragDrop,
  gradeMatching,
  gradeOrdering,
  gradePath,
  gradeText,
} from './grading.util';

export interface GradableActivity {
  id: string;
  type: ActivityType;
  points: number;
  solution: unknown;
}

/** Grades one interactive activity server-side. */
export function gradeActivity(
  activity: GradableActivity,
  response: unknown,
): { correct: boolean; score: number; maxScore: number } {
  const key = (activity.solution ?? {}) as Record<string, unknown>;
  let correct = false;

  switch (activity.type) {
    case ActivityType.MULTIPLE_CHOICE:
    case ActivityType.TRUE_FALSE:
      correct = gradeChoice(Number(key.correct ?? -1), (response as any)?.choice ?? response);
      break;
    case ActivityType.MATCHING:
      correct = gradeMatching(key.pairs, (response as any)?.pairs ?? response);
      break;
    case ActivityType.DRAG_DROP:
      correct = gradeDragDrop(key.pairs, (response as any)?.pairs ?? response);
      break;
    case ActivityType.ORDERING:
      correct = gradeOrdering(key.sequence, (response as any)?.sequence ?? response);
      break;
    case ActivityType.MEMORY:
    case ActivityType.PUZZLE:
      correct = gradeCompletionCount(key, response);
      break;
    case ActivityType.DIALOGUE:
    case ActivityType.SIMULATION:
      correct = gradePath(key, response);
      break;
    case ActivityType.BOSS_CHALLENGE: {
      // A boss challenge is a short set of sub-questions; every one must land.
      const steps = Array.isArray(key.steps) ? (key.steps as unknown[]) : [];
      const given = Array.isArray((response as any)?.steps) ? ((response as any).steps as unknown[]) : [];
      correct =
        steps.length > 0 &&
        steps.length === given.length &&
        steps.every((s, i) =>
          typeof s === 'number' ? gradeChoice(s, given[i]) : gradeText([s], given[i]),
        );
      break;
    }
    default:
      correct = false;
  }

  return { correct, score: correct ? activity.points : 0, maxScore: activity.points };
}
