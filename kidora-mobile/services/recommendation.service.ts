import type { Recommendation, StudentDashboard } from '@/types';

import { api } from './api';

/**
 * "Recommended for you".
 *
 * Prefers the backend (API GAP #7: GET /student/recommendations, which can
 * use the AI RECOMMEND pipeline). Until it exists, a transparent rule-based
 * fallback builds suggestions from the dashboard the app already loaded —
 * no model, no extra data collection.
 */
export function deriveRecommendations(d: StudentDashboard): Recommendation[] {
  const out: Recommendation[] = [];
  if (d.adventure?.lesson) {
    out.push({
      id: `continue-${d.adventure.lesson.id}`,
      kind: 'CONTINUE',
      title: d.adventure.lesson.title,
      subtitle: d.adventure.course.title,
      lessonId: d.adventure.lesson.id,
      courseId: d.adventure.course.id,
      worldKey: d.adventure.world,
    });
  }
  if (d.dailyQuest && !d.dailyQuest.completed) {
    out.push({ id: `quest-${d.dailyQuest.id}`, kind: 'QUEST', title: d.dailyQuest.title, subtitle: d.dailyQuest.description, questId: d.dailyQuest.id });
  }
  const weakest = [...d.courses]
    .filter((c) => c.status !== 'COMPLETED' && c.currentLesson)
    .sort((a, b) => a.progressPercent - b.progressPercent)[0];
  if (weakest?.currentLesson && weakest.currentLesson.id !== d.adventure?.lesson?.id) {
    out.push({
      id: `practice-${weakest.id}`,
      kind: 'PRACTICE',
      title: weakest.currentLesson.title,
      subtitle: weakest.title,
      lessonId: weakest.currentLesson.id,
      courseId: weakest.id,
    });
  }
  const nearlyDone = d.courses.find((c) => c.progressPercent >= 80 && c.status !== 'COMPLETED');
  if (nearlyDone) {
    out.push({ id: `next-${nearlyDone.id}`, kind: 'NEXT_LEVEL', title: nearlyDone.title, courseId: nearlyDone.id });
  }
  return out.slice(0, 4);
}

export const recommendationService = {
  forStudent: () => api.get<Recommendation[]>('/student/recommendations'),
};
