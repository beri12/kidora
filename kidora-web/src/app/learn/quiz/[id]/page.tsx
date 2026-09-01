'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent, useQuiz, useSubmitQuiz } from '@/features/lms/hooks';
import { QuizPlayer } from '@/components/learning/QuizPlayer';
import { RewardPopup } from '@/components/shared/RewardPopup';
import { ErrorState, LoadingState } from '@/components/ui/states';
import type { QuizResult, RewardResult } from '@/types';

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: quiz, isLoading, isError, refetch } = useQuiz(id);
  const submit = useSubmitQuiz(id);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [reward, setReward] = useState<RewardResult | null>(null);

  useEffect(() => {
    if (quiz) trackEvent('quiz_started', { quizId: quiz.id });
  }, [quiz?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState rows={4} label="Loading quiz" />;
  if (isError || !quiz) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">{quiz.title} ❓</h1>
      <QuizPlayer
        quiz={quiz}
        isSubmitting={submit.isPending}
        result={result}
        onSubmit={async (responses) => {
          const res = await submit.mutateAsync(responses);
          setResult(res);
          trackEvent('quiz_completed', { quizId: quiz.id, passed: res.passed });
          if (res.reward) setReward(res.reward);
        }}
        onDone={() => router.back()}
      />
      <RewardPopup reward={reward} message="Quiz complete" onClose={() => setReward(null)} />
    </div>
  );
}
