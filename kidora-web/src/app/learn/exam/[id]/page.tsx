'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExam, useStartExam, useSubmitExam } from '@/features/exams/hooks';
import { trackEvent } from '@/features/lms/hooks';
import { ExamPlayer } from '@/components/learning/ExamPlayer';
import { RewardPopup } from '@/components/shared/RewardPopup';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { ExamAttemptView, ExamResult, RewardResult } from '@/types';

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: exam, isLoading, isError, refetch } = useExam(id);
  const start = useStartExam(id);
  const submit = useSubmitExam(id);

  const [attempt, setAttempt] = useState<ExamAttemptView | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [reward, setReward] = useState<RewardResult | null>(null);

  useEffect(() => {
    if (attempt) trackEvent('exam_started', { examId: id });
  }, [attempt?.attemptId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <LoadingState rows={3} label="Loading exam" />;
  if (isError || !exam) return <ErrorState onRetry={() => refetch()} />;

  if (attempt || result) {
    return (
      <>
        <ExamPlayer
          attempt={attempt!}
          isSubmitting={submit.isPending}
          result={result}
          onSubmit={async (answers) => {
            const res = await submit.mutateAsync(answers);
            setResult(res);
            trackEvent('exam_completed', { examId: id, passed: res.passed });
            if (res.reward) setReward(res.reward);
          }}
          onDone={() => router.push(`/learn/course/${exam.course.id}`)}
        />
        <RewardPopup reward={reward} message="Exam passed!" onClose={() => setReward(null)} />
      </>
    );
  }

  const noAttemptsLeft = exam.attemptsLeft <= 0;
  const best = exam.attempts.reduce<number>((a, r) => Math.max(a, r.percent), 0);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white p-7 shadow-card">
        <p className="font-body-x text-[12px] uppercase text-rose-500">Final challenge</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold text-brand-900">{exam.title}</h1>
        {exam.description && <p className="mt-2 font-body font-bold text-brand-500">{exam.description}</p>}

        <dl className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ['Questions', exam.questionCount],
            ['Time', `${exam.timeLimitMin} min`],
            ['Pass mark', `${exam.passingScore}%`],
            ['Attempts left', exam.attemptsLeft],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white p-4 text-center">
              <dt className="font-body-x text-[11px] uppercase text-brand-400">{label}</dt>
              <dd className="font-display text-2xl font-extrabold text-brand-900">{value}</dd>
            </div>
          ))}
        </dl>

        {exam.attempts.length > 0 && (
          <p className="mt-4 font-body font-bold text-brand-500">
            Your best so far: <strong className="text-brand-800">{best}%</strong>
          </p>
        )}

        {noAttemptsLeft ? (
          <EmptyState
            icon="🔒"
            title="No attempts left"
            description="Ask your teacher if you need another try at this exam."
          />
        ) : (
          <Button
            variant="grass"
            size="lg"
            className="mt-6"
            disabled={start.isPending}
            onClick={async () => setAttempt(await start.mutateAsync())}
          >
            {start.isPending ? 'Getting ready…' : 'Start the challenge →'}
          </Button>
        )}
      </section>
    </div>
  );
}
