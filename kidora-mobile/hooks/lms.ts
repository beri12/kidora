import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { analytics } from '@/features/analytics/track';
import { runOrQueue } from '@/features/offline/sync';
import { haptics } from '@/lib/haptics';
import { qk } from '@/lib/query-keys';
import { courseService } from '@/services/course.service';
import { lessonService } from '@/services/lesson.service';
import { useGameStore } from '@/store/gameStore';
import { useOfflineStore } from '@/store/offlineStore';
import type { LessonCompleteResponse, QuizAnswer, WorldNode, WorldResponse } from '@/types';

import { useStudentDashboard } from './student';

/** Enrolled courses, from the (cached) dashboard. */
export function useCourses() {
  const q = useStudentDashboard();
  return { ...q, data: q.data?.courses };
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: qk.course(courseId ?? ''),
    queryFn: () => courseService.detail(courseId as string),
    enabled: !!courseId,
  });
}

/** Lessons of a course, flattened in curriculum order. */
export function useLessons(courseId: string | undefined) {
  const q = useCourse(courseId);
  return { ...q, data: q.data?.sections.flatMap((s) => s.lessons) };
}

export function useLesson(courseId: string | undefined, lessonId: string) {
  return useQuery({
    queryKey: qk.lesson(courseId ?? '', lessonId),
    queryFn: () => lessonService.player(courseId as string, lessonId),
    enabled: !!courseId && !!lessonId,
    staleTime: 5 * 60_000,
  });
}

/**
 * Tracks time on a lesson and autosaves progress every 30s and when the app
 * backgrounds. Saves go through the offline queue, so nothing is lost on a
 * flaky connection. Returns a getter for elapsed active seconds.
 */
export function useLessonTimer(lessonId: string, percent: number): () => number {
  const startedAt = useRef(0);
  const unsaved = useRef(0);
  const total = useRef(0);
  const percentRef = useRef(percent);
  useEffect(() => {
    percentRef.current = percent;
  }, [percent]);

  useEffect(() => {
    startedAt.current = Date.now();
    analytics.track('lesson_started', { lessonId });
    const tick = () => {
      const now = Date.now();
      const delta = Math.round((now - startedAt.current) / 1000);
      startedAt.current = now;
      unsaved.current += delta;
      total.current += delta;
    };
    const save = () => {
      tick();
      if (unsaved.current <= 0) return;
      const timeSpentSec = unsaved.current;
      unsaved.current = 0;
      void runOrQueue({ type: 'lesson.progress', lessonId, percent: percentRef.current, timeSpentSec }).catch(() => undefined);
    };
    const interval = setInterval(save, 30_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') startedAt.current = Date.now();
      else save();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
      save();
    };
  }, [lessonId]);

  return () => total.current + Math.round((Date.now() - startedAt.current) / 1000);
}

function markNodeCompleted(nodes: WorldNode[], lessonId: string): WorldNode[] {
  return nodes.map((n) => ({
    ...n,
    status: n.id === lessonId ? 'COMPLETED' : n.status,
    children: n.children ? markNodeCompleted(n.children, lessonId) : n.children,
  }));
}

export type CompleteLessonResult = { queued: true } | { queued: false; result: LessonCompleteResponse };

/**
 * Complete a lesson. Online: the server awards XP and we celebrate.
 * Offline / transient failure: the completion is queued, the map shows the
 * node done immediately (optimistic, replay-safe), and rewards play when the
 * sync lands (see OfflineProvider).
 */
export function useCompleteLesson() {
  const qc = useQueryClient();
  const celebrate = useGameStore((s) => s.celebrate);
  return useMutation<CompleteLessonResult, Error, { lessonId: string; courseId: string; timeSpentSec: number }>({
    mutationFn: (v) => runOrQueue<LessonCompleteResponse>({ type: 'lesson.complete', ...v }),
    onMutate: async ({ lessonId }) => {
      await qc.cancelQueries({ queryKey: qk.world });
      const prev = qc.getQueryData<WorldResponse>(qk.world);
      if (prev) {
        qc.setQueryData<WorldResponse>(qk.world, {
          worlds: prev.worlds.map((w) => ({ ...w, nodes: markNodeCompleted(w.nodes, lessonId) })),
        });
      }
      return { prev };
    },
    onSuccess: (res, v) => {
      haptics.success();
      analytics.track('lesson_completed', { lessonId: v.lessonId, courseId: v.courseId, durationSec: v.timeSpentSec, queued: res.queued });
      if (!res.queued) {
        celebrate(res.result.rewards);
        void qc.invalidateQueries({ queryKey: qk.student.all });
        void qc.invalidateQueries({ queryKey: qk.world });
        void qc.invalidateQueries({ queryKey: qk.course(v.courseId) });
        void qc.invalidateQueries({ queryKey: qk.lesson(v.courseId, v.lessonId) });
      }
    },
    onError: () => {
      haptics.error();
      void qc.invalidateQueries({ queryKey: qk.world });
    },
  });
}

export function useHasQueuedCompletion(lessonId: string): boolean {
  return useOfflineStore((s) => s.queue.some((q) => q.action.type === 'lesson.complete' && q.action.lessonId === lessonId));
}

export function useQuiz(quizId: string) {
  return useQuery({ queryKey: qk.quiz(quizId), queryFn: () => lessonService.quiz(quizId), enabled: !!quizId });
}

export function useStartQuiz() {
  return useMutation({
    mutationFn: ({ quizId, examId }: { quizId?: string; examId?: string }) => {
      if (examId) return lessonService.startExam(examId);
      return lessonService.startQuiz(quizId as string);
    },
    onSuccess: (_r, v) => analytics.track('quiz_started', { quizId: v.quizId ?? null, examId: v.examId ?? null }),
  });
}

export function useSubmitQuiz() {
  const qc = useQueryClient();
  const celebrate = useGameStore((s) => s.celebrate);
  return useMutation({
    // Quiz submissions are NOT queued offline: attempts are timed and graded server-side.
    mutationFn: ({ attemptId, answers }: { attemptId: string; answers: QuizAnswer[]; quizId: string }) =>
      lessonService.submitAttempt(attemptId, answers),
    onSuccess: (res, v) => {
      if (res.outcome) celebrate(res.outcome);
      if (res.passed) haptics.success();
      analytics.track('quiz_completed', { quizId: v.quizId, percent: res.percent, passed: res.passed });
      void qc.invalidateQueries({ queryKey: qk.quiz(v.quizId) });
      void qc.invalidateQueries({ queryKey: qk.student.all });
    },
  });
}
