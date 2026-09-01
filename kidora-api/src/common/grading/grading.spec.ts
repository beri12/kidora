import { ActivityType, QuestionType } from '@prisma/client';
import { gradeQuestions, publicQuestion, stripAnswerKey } from './question.grader';
import { gradeActivity } from './activity.grader';
import { seededShuffle } from './grading.util';

const q = (over: any = {}) => ({
  id: 'q1',
  type: QuestionType.MULTIPLE_CHOICE,
  correct: 1,
  points: 1,
  options: ['a', 'b', 'c'],
  ...over,
});

describe('question grading', () => {
  it('grades the legacy positional array contract', () => {
    const res = gradeQuestions(
      [q({ id: 'a', correct: 1 }), q({ id: 'b', correct: 2 }), q({ id: 'c', correct: 0 })],
      [1, 2, 0],
    );
    expect(res.correctCount).toBe(3);
    expect(res.percent).toBe(100);
  });

  it('grades responses keyed by question id', () => {
    const res = gradeQuestions([q({ id: 'a', correct: 1 })], { a: 1 });
    expect(res.correctCount).toBe(1);
  });

  it('weights questions by their points', () => {
    const res = gradeQuestions(
      [q({ id: 'a', correct: 0, points: 1 }), q({ id: 'b', correct: 0, points: 4 })],
      { a: 1, b: 0 },
    );
    expect(res.score).toBe(4);
    expect(res.maxScore).toBe(5);
    expect(res.percent).toBe(80);
  });

  it('treats a missing answer as wrong rather than crashing', () => {
    expect(gradeQuestions([q()], {}).correctCount).toBe(0);
    expect(gradeQuestions([q()], [] as any).correctCount).toBe(0);
  });

  it('grades ordering questions on the full sequence', () => {
    const question = q({
      type: QuestionType.ORDERING,
      data: { items: ['b', 'a', 'c'], sequence: ['a', 'b', 'c'] },
    });
    expect(gradeQuestions([question], { q1: ['a', 'b', 'c'] }).correctCount).toBe(1);
    expect(gradeQuestions([question], { q1: ['b', 'a', 'c'] }).correctCount).toBe(0);
    expect(gradeQuestions([question], { q1: ['a', 'b'] }).correctCount).toBe(0);
  });

  it('grades matching questions on every pair', () => {
    const question = q({ type: QuestionType.MATCHING, data: { pairs: { cat: 'meow', dog: 'woof' } } });
    expect(gradeQuestions([question], { q1: { cat: 'meow', dog: 'woof' } }).correctCount).toBe(1);
    expect(gradeQuestions([question], { q1: { cat: 'meow' } }).correctCount).toBe(0);
  });

  it('accepts short answers case- and spacing-insensitively', () => {
    const question = q({ type: QuestionType.SHORT_ANSWER, data: { accepted: ['3/4', 'three quarters'] } });
    expect(gradeQuestions([question], { q1: '  Three   Quarters ' }).correctCount).toBe(1);
    expect(gradeQuestions([question], { q1: 'four thirds' }).correctCount).toBe(0);
  });

  it('never lets a client-supplied score influence the result', () => {
    // gradeQuestions only ever reads responses; there is no score input at all.
    const res = gradeQuestions([q({ correct: 0 })], { q1: 2, score: 100 } as any);
    expect(res.score).toBe(0);
  });
});

describe('answer-key stripping', () => {
  it('removes correct/correctText and keeps renderable fields', () => {
    const safe: any = publicQuestion(
      q({ correctText: 'b', data: { items: ['x', 'y'], sequence: ['y', 'x'] } }) as any,
    );
    expect(safe.correct).toBeUndefined();
    expect(safe.correctText).toBeUndefined();
    expect(safe.data).toEqual({ items: ['x', 'y'] });
    expect(safe.options).toEqual(['a', 'b', 'c']);
  });

  it('strips every known answer-key field from a data payload', () => {
    expect(
      stripAnswerKey({
        items: [1], correct: 1, answer: 'x', answers: [], accepted: [],
        solution: {}, pairs: {}, sequence: [], required: 3,
      }),
    ).toEqual({ items: [1] });
  });

  it('returns null for a non-object payload', () => {
    expect(stripAnswerKey(null)).toBeNull();
    expect(stripAnswerKey([1, 2])).toBeNull();
  });
});

describe('activity grading', () => {
  const act = (type: ActivityType, solution: any) => ({ id: 'a1', type, points: 10, solution });

  it('grades a multiple-choice activity', () => {
    expect(gradeActivity(act(ActivityType.MULTIPLE_CHOICE, { correct: 1 }), { choice: 1 }).correct).toBe(true);
    expect(gradeActivity(act(ActivityType.MULTIPLE_CHOICE, { correct: 1 }), { choice: 0 }).score).toBe(0);
  });

  it('grades drag-and-drop on every target', () => {
    const a = act(ActivityType.DRAG_DROP, { pairs: { t1: 'i1', t2: 'i2' } });
    expect(gradeActivity(a, { pairs: { t1: 'i1', t2: 'i2' } }).correct).toBe(true);
    expect(gradeActivity(a, { pairs: { t1: 'i2', t2: 'i1' } }).correct).toBe(false);
  });

  it('grades memory/puzzle on the required completion count', () => {
    const a = act(ActivityType.MEMORY, { required: 6 });
    expect(gradeActivity(a, { solved: 6 }).correct).toBe(true);
    expect(gradeActivity(a, { solved: 5 }).correct).toBe(false);
  });

  it('grades a dialogue on the required path steps', () => {
    const a = act(ActivityType.DIALOGUE, { required: ['greet', 'ask', 'thank'] });
    expect(gradeActivity(a, { path: ['greet', 'ask', 'thank', 'wave'] }).correct).toBe(true);
    expect(gradeActivity(a, { path: ['greet', 'ask'] }).correct).toBe(false);
  });

  it('requires every step of a boss challenge', () => {
    const a = act(ActivityType.BOSS_CHALLENGE, { steps: [1, 0, 0] });
    expect(gradeActivity(a, { steps: [1, 0, 0] }).correct).toBe(true);
    expect(gradeActivity(a, { steps: [1, 0, 1] }).correct).toBe(false);
    expect(gradeActivity(a, { steps: [1, 0] }).correct).toBe(false);
  });

  it('marks an empty answer key wrong rather than correct-by-default', () => {
    expect(gradeActivity(act(ActivityType.MATCHING, {}), { pairs: {} }).correct).toBe(false);
    expect(gradeActivity(act(ActivityType.ORDERING, {}), { sequence: [] }).correct).toBe(false);
  });
});

describe('seededShuffle', () => {
  it('is deterministic for the same seed, so a resumed attempt is identical', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(seededShuffle(items, 'attempt-1')).toEqual(seededShuffle(items, 'attempt-1'));
  });

  it('keeps every item', () => {
    const items = [1, 2, 3, 4, 5];
    expect(seededShuffle(items, 'x').sort()).toEqual(items);
  });
});
