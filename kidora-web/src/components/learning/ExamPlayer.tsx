'use client';
import { useEffect, useMemo, useState } from 'react';
import type { ExamAttemptView, ExamResult } from '@/types';
import { Button } from '@/components/ui/button';
import { QuestionInput } from './QuestionInput';

function formatLeft(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Exam runner. The countdown is a courtesy for the learner — the deadline is
 * enforced on the server from the attempt's own expiresAt, so a paused tab or
 * a tampered clock cannot buy extra time.
 */
export function ExamPlayer({
  attempt,
  onSubmit,
  isSubmitting,
  result,
  onDone,
}: {
  attempt: ExamAttemptView;
  onSubmit: (answers: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  result?: ExamResult | null;
  onDone?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [index, setIndex] = useState(0);
  const deadline = useMemo(
    () => (attempt.expiresAt ? new Date(attempt.expiresAt).getTime() : null),
    [attempt.expiresAt],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!deadline || result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadline, result]);

  const expired = !!deadline && now >= deadline;

  useEffect(() => {
    if (expired && !result && !isSubmitting) onSubmit(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  if (result) {
    return (
      <section className="rounded-[28px] border-2 border-brand-100 bg-white p-8 text-center shadow-card">
        <div className="text-6xl" aria-hidden>{result.passed ? '🏆' : result.expired ? '⏰' : '📘'}</div>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-brand-900">{result.percent}%</h2>
        <p className="mt-1 font-body font-bold text-brand-500">
          {result.correctCount} of {result.total} correct ·{' '}
          {result.expired ? 'Time ran out' : result.passed ? 'Passed' : `Pass mark is ${result.passingScore}%`}
        </p>
        {result.certificate && (
          <p className="mt-3 font-display font-extrabold text-amber-600">
            🎓 Certificate issued — {result.certificate.serial}
          </p>
        )}
        {onDone && <Button className="mt-6" onClick={onDone}>Back to the course →</Button>}
      </section>
    );
  }

  const question = attempt.questions[index];
  const answered = attempt.questions.filter((q) => answers[q.id] !== undefined).length;

  return (
    <section className="rounded-[28px] border-2 border-brand-100 bg-white p-6 shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 pb-4">
        <div>
          <h1 className="font-display text-xl font-extrabold text-brand-900">{attempt.title}</h1>
          <p className="font-body-x text-[12px] text-brand-400">
            Attempt {attempt.attemptNo} · {answered} of {attempt.questions.length} answered
          </p>
        </div>
        {deadline && (
          <p
            aria-live="off"
            className={`rounded-2xl px-4 py-2 font-display text-lg font-extrabold ${
              deadline - now < 60_000 ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'
            }`}
          >
            ⏱ {formatLeft(deadline - now)}
          </p>
        )}
      </header>

      {question && (
        <>
          <h2 className="mt-5 font-display text-xl font-extrabold text-brand-900">
            <span className="text-brand-400">{index + 1}.</span> {question.prompt}
          </h2>
          <div className="mt-4">
            <QuestionInput
              question={question}
              value={answers[question.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [question.id]: v }))}
              disabled={isSubmitting}
            />
          </div>
        </>
      )}

      <nav aria-label="Questions" className="mt-6 flex flex-wrap gap-1.5">
        {attempt.questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to question ${i + 1}${answers[q.id] !== undefined ? ', answered' : ''}`}
            aria-current={i === index}
            className={`h-9 w-9 rounded-xl font-display text-sm font-extrabold focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400 ${
              i === index
                ? 'bg-brand-700 text-white'
                : answers[q.id] !== undefined
                  ? 'bg-grass-100 text-grass-700'
                  : 'bg-brand-50 text-brand-500'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          ← Back
        </Button>
        <Button
          onClick={() => setIndex((i) => Math.min(attempt.questions.length - 1, i + 1))}
          disabled={index === attempt.questions.length - 1}
        >
          Next →
        </Button>
        <Button variant="grass" className="ml-auto" onClick={() => onSubmit(answers)} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit exam'}
        </Button>
      </div>
    </section>
  );
}
