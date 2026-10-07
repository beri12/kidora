import type {
  LessonCompleteResponse,
  LessonPlayerResponse,
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizResult,
} from '@/types';

import { api } from './api';

export const lessonService = {
  player: (courseId: string, lessonId: string) =>
    api.get<LessonPlayerResponse>(`/learning/courses/${courseId}/lessons/${lessonId}`),

  /** Autosave. Server keeps the max percent and accumulates time. Idempotent-safe. */
  saveProgress: (lessonId: string, body: { percent?: number; timeSpentSec?: number }) =>
    api.post<unknown>(`/learning/lessons/${lessonId}/progress`, body),

  completeContent: (contentItemId: string) => api.post<unknown>(`/learning/content/${contentItemId}/complete`),

  /** Idempotent on the server (rewards are keyed by lesson+student). Safe to replay from the offline queue. */
  complete: (lessonId: string, timeSpentSec: number) =>
    api.post<LessonCompleteResponse>(`/learning/lessons/${lessonId}/complete`, undefined, {
      params: { timeSpentSec: Math.max(0, Math.round(timeSpentSec)) },
    }),

  quiz: (quizId: string) => api.get<Quiz>(`/lms/quizzes/${quizId}`),
  startQuiz: (quizId: string) => api.post<QuizAttempt>(`/lms/quizzes/${quizId}/attempts`),
  startExam: (examId: string) => api.post<QuizAttempt>(`/lms/exams/${examId}/attempts`),
  submitAttempt: (attemptId: string, answers: QuizAnswer[]) =>
    api.post<QuizResult>(`/lms/attempts/${attemptId}/submit`, { answers }),

  submitAssignment: (assignmentId: string, body: { content?: string; attachments?: { name: string; url: string; sizeBytes: number }[] }) =>
    api.post<unknown>(`/student/assignments/${assignmentId}/submit`, body),
};
