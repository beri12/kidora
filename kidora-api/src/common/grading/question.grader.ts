import { QuestionType } from '@prisma/client';
import {
  gradeChoice,
  gradeDragDrop,
  gradeMatching,
  gradeOrdering,
  gradeText,
} from './grading.util';

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  correct: number;
  correctText?: string | null;
  points: number;
  data?: unknown;
  options?: string[];
}

/** The student-safe view of a question: no `correct`, no answer key in `data`. */
export function publicQuestion<T extends GradableQuestion & Record<string, any>>(q: T) {
  const { correct, correctText, data, ...rest } = q;
  return { ...rest, data: stripAnswerKey(data) };
}

/**
 * Keeps the fields the renderer needs (items to order, tiles to drag, prompts to
 * match) and drops every field that would reveal the answer.
 */
export function stripAnswerKey(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const {
    correct: _c,
    answer: _a,
    answers: _an,
    accepted: _ac,
    solution: _s,
    pairs: _p,
    sequence: _seq,
    required: _r,
    ...safe
  } = data as Record<string, unknown>;
  return safe;
}

/** True when the learner's response to this question is correct. */
export function isQuestionCorrect(q: GradableQuestion, response: unknown): boolean {
  const data = (q.data ?? {}) as Record<string, unknown>;
  switch (q.type) {
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.IMAGE_SELECT:
    case QuestionType.TRUE_FALSE:
      return gradeChoice(q.correct, response);
    case QuestionType.MATCHING:
      return gradeMatching(data.pairs, response);
    case QuestionType.ORDERING:
      return gradeOrdering(data.sequence, response);
    case QuestionType.DRAG_DROP:
      return gradeDragDrop(data.pairs, response);
    case QuestionType.FILL_BLANK:
    case QuestionType.SHORT_ANSWER:
      return gradeText(data.accepted ?? (q.correctText ? [q.correctText] : []), response);
    default:
      return false;
  }
}

export interface GradedResult {
  score: number;
  maxScore: number;
  percent: number;
  correctCount: number;
  total: number;
  perQuestion: { id: string; correct: boolean; points: number }[];
}

/**
 * Grades a whole submission. `responses` is keyed by question id; a legacy
 * positional array (the original `answers: number[]` contract) is accepted too.
 */
export function gradeQuestions(
  questions: GradableQuestion[],
  responses: Record<string, unknown> | unknown[],
): GradedResult {
  const byIndex = Array.isArray(responses);
  const perQuestion = questions.map((q, i) => {
    const response = byIndex ? (responses as unknown[])[i] : (responses as Record<string, unknown>)[q.id];
    const correct = isQuestionCorrect(q, response);
    return { id: q.id, correct, points: correct ? q.points : 0 };
  });

  const score = perQuestion.reduce((a, r) => a + r.points, 0);
  const maxScore = questions.reduce((a, q) => a + q.points, 0);
  return {
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
    correctCount: perQuestion.filter((r) => r.correct).length,
    total: questions.length,
    perQuestion,
  };
}
