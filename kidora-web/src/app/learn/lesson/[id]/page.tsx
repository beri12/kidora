'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCompleteLesson,
  useLesson,
  useSubmitActivity,
  trackEvent,
  type ActivitySubmitResult,
} from '@/features/lms/hooks';
import { ActivityRenderer } from '@/components/game/ActivityRenderer';
import { RewardPopup } from '@/components/shared/RewardPopup';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/states';
import type { RewardResult } from '@/types';

/**
 * One lesson: story/content first, then its interactive activities one at a
 * time, then the reward. This is the middle of the game loop, and every score
 * on the screen came back from the server.
 */
export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lesson, isLoading, isError, refetch } = useLesson(id);

  const [step, setStep] = useState(0);
  const [outcome, setOutcome] = useState<ActivitySubmitResult | null>(null);
  const [reward, setReward] = useState<RewardResult | null>(null);

  const activities = lesson?.activities ?? [];
  const current = activities[step];
  const submitActivity = useSubmitActivity(current?.id ?? '');
  const complete = useCompleteLesson();

  useEffect(() => {
    if (lesson) trackEvent('lesson_started', { lessonId: lesson.id }, lesson.courseId);
  }, [lesson?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState rows={4} label="Loading lesson" />;
  if (isError || !lesson) return <ErrorState onRetry={() => refetch()} />;

  const onSubmitActivity = async (response: Record<string, unknown>) => {
    const result = await submitActivity.mutateAsync(response);
    setOutcome(result);
    trackEvent('activity_completed', { activityId: current!.id, correct: result.correct }, lesson.courseId);
    if (result.reward) setReward(result.reward);
  };

  const nextActivity = () => {
    setOutcome(null);
    setStep((s) => s + 1);
  };

  const finish = async () => {
    await complete.mutateAsync(lesson.id);
    trackEvent('lesson_completed', { lessonId: lesson.id }, lesson.courseId);
    if (lesson.quiz) router.push(`/learn/quiz/${lesson.quiz.id}`);
    else router.push(`/learn/course/${lesson.courseId}`);
  };

  const allDone = step >= activities.length;

  return (
    <div className="space-y-6">
      <Link
        href={`/learn/course/${lesson.courseId}`}
        className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
      >
        ← {lesson.course.title}
      </Link>

      <article className="rounded-[28px] border-2 border-brand-100 bg-white p-6 shadow-card">
        <p className="font-body-x text-[12px] uppercase text-brand-400">
          {lesson.section?.title ?? 'Lesson'} · {lesson.estimatedMinutes} min
        </p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-brand-900">{lesson.title}</h1>
        {lesson.description && <p className="mt-2 font-body font-bold text-brand-500">{lesson.description}</p>}

        {lesson.objectives?.length > 0 && (
          <ul className="mt-4 space-y-1">
            {lesson.objectives.map((objective) => (
              <li key={objective} className="flex gap-2 font-body font-bold text-brand-600">
                <span aria-hidden className="text-grass-500">🎯</span>
                {objective}
              </li>
            ))}
          </ul>
        )}

        {lesson.videoUrl && (
          <video
            controls
            preload="metadata"
            className="mt-5 w-full rounded-2xl bg-black"
            src={lesson.videoUrl}
          >
            <track kind="captions" />
          </video>
        )}

        {lesson.audioUrl && <audio controls className="mt-5 w-full" src={lesson.audioUrl} />}

        {lesson.content && (
          <div className="mt-5 whitespace-pre-line font-body text-lg font-bold leading-relaxed text-brand-700">
            {lesson.content}
          </div>
        )}

        {lesson.imageUrls?.length > 0 && (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {lesson.imageUrls.map((url) => (
              <li key={url}>
                {/* Decorative lesson imagery; the teaching content is the text above. */}
                <img src={url} alt="" loading="lazy" className="w-full rounded-2xl" />
              </li>
            ))}
          </ul>
        )}

        {lesson.resources?.length > 0 && (
          <ul className="mt-5 space-y-1">
            {lesson.resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display font-extrabold text-brand-700 underline"
                >
                  📎 {resource.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>

      {activities.length > 0 && !allDone && (
        <>
          <ProgressBar
            value={((step + 1) / activities.length) * 100}
            label={`Activity ${step + 1} of ${activities.length}`}
          />
          <ActivityRenderer
            key={current!.id}
            activity={current!}
            onSubmit={onSubmitActivity}
            isSubmitting={submitActivity.isPending}
            outcome={outcome}
            onNext={nextActivity}
          />
        </>
      )}

      {(activities.length === 0 || allDone) && (
        <div className="rounded-[28px] border-2 border-grass-200 bg-grass-50 p-6 text-center">
          <p className="font-display text-xl font-extrabold text-grass-700">
            {activities.length === 0 ? 'Ready to move on?' : '🎉 All activities done!'}
          </p>
          <Button variant="grass" className="mt-4" onClick={finish} disabled={complete.isPending}>
            {complete.isPending
              ? 'Saving…'
              : lesson.quiz
                ? 'Finish and take the quiz →'
                : 'Mark lesson complete →'}
          </Button>
        </div>
      )}

      <RewardPopup reward={reward} message="Activity complete" onClose={() => setReward(null)} />
    </div>
  );
}
