'use client';
import { useState } from 'react';
import type { QuizResult, QuizView } from '@/types';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { QuestionInput } from './QuestionInput';

/**
 * One question at a time, with a progress bar and a review screen.
 *
 * The player never computes a score: it posts the responses and renders
 * whatever the server sends back.
 */
export function QuizPlayer({
  quiz,
  onSubmit,
  isSubmitting,
  result,
  onDone,
}: {
  quiz: QuizView;
  onSubmit: (responses: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  result?: QuizResult | null;
  onDone?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const question = quiz.questions[index];
  const last = index === quiz.questions.length - 1;

  if (result) {
    return (
      <section className="rounded-[28px] border-2 border-brand-100 bg-white p-8 text-center shadow-card">
        <div className="text-6xl" aria-hidden>{result.passed ? '🎉' : '💪'}</div>
        <h2 className="mt-3 font-display text-3xl font-extrabold text-brand-900">
          {result.score} / {result.total}
        </h2>
        <p className="mt-1 font-body font-bold text-brand-500">
          {result.percent}% · {result.passed ? 'Passed' : `You need ${result.passingScore}% to pass`}
        </p>
        {result.perfect && <p className="mt-2 font-display font-extrabold text-amber-600">⭐ Perfect score!</p>}
        {result.attemptsLeft !== null && (
          <p className="mt-2 font-body-x text-[12px] text-brand-400">
            {result.attemptsLeft} {result.attemptsLeft === 1 ? 'attempt' : 'attempts'} left
          </p>
        )}
        {onDone && <Button className="mt-6" onClick={onDone}>Continue →</Button>}
      </section>
    );
  }

  if (!question) return null;

  return (
    <section className="rounded-[28px] border-2 border-brand-100 bg-white p-6 shadow-card">
      <ProgressBar
        value={((index + 1) / quiz.questions.length) * 100}
        label={`Question ${index + 1} of ${quiz.questions.length}`}
      />

      <h2 className="mt-5 font-display text-2xl font-extrabold text-brand-900">{question.prompt}</h2>
      {question.imageUrl && (
        <img src={question.imageUrl} alt="" className="mt-3 max-h-56 rounded-2xl object-contain" />
      )}

      <div className="mt-5">
        <QuestionInput
          question={question}
          value={responses[question.id]}
          onChange={(v) => setResponses((r) => ({ ...r, [question.id]: v }))}
          disabled={isSubmitting}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          ← Back
        </Button>
        {last ? (
          <Button
            variant="grass"
            className="ml-auto"
            onClick={() => onSubmit(responses)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Marking…' : 'Finish quiz'}
          </Button>
        ) : (
          <Button className="ml-auto" onClick={() => setIndex((i) => i + 1)}>
            Next →
          </Button>
        )}
      </div>
    </section>
  );
}
