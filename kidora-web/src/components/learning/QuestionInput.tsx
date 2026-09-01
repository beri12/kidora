'use client';
import type { QuizQuestionView } from '@/types';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

/**
 * One question, one input. Shared by QuizPlayer and ExamPlayer so a question
 * type behaves identically in both. The response shape matches the server's
 * grader for that type exactly.
 */
export function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuizQuestionView;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const data = question.data ?? {};

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    case 'IMAGE_SELECT':
      return (
        <fieldset className="space-y-2" disabled={disabled}>
          <legend className="sr-only">{question.prompt}</legend>
          {question.options.map((option, i) => (
            <label
              key={i}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 font-display font-extrabold motion-safe:transition-colors ${
                value === i ? 'border-brand-600 bg-brand-100 text-brand-800' : 'border-brand-100 bg-white text-brand-800 hover:border-brand-300'
              }`}
            >
              <input
                type="radio"
                name={`q-${question.id}`}
                className="h-4 w-4 accent-brand-600"
                checked={value === i}
                onChange={() => onChange(i)}
              />
              {option}
            </label>
          ))}
        </fieldset>
      );

    case 'ORDERING': {
      const items: string[] = data.items ?? [];
      const order: string[] = Array.isArray(value) ? (value as string[]) : items;
      const move = (from: number, to: number) => {
        if (to < 0 || to >= order.length) return;
        const next = [...order];
        [next[from], next[to]] = [next[to], next[from]];
        onChange(next);
      };
      return (
        <ol className="space-y-2">
          {order.map((item, i) => (
            <li key={item} className="flex items-center gap-3 rounded-2xl border-2 border-brand-100 bg-white p-3">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 font-display font-extrabold text-brand-700">
                {i + 1}
              </span>
              <span className="flex-1 font-display font-extrabold text-brand-900">{item}</span>
              <button
                type="button" disabled={disabled || i === 0} onClick={() => move(i, i - 1)}
                aria-label={`Move ${item} up`}
                className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40"
              >↑</button>
              <button
                type="button" disabled={disabled || i === order.length - 1} onClick={() => move(i, i + 1)}
                aria-label={`Move ${item} down`}
                className="rounded-xl bg-brand-50 px-3 py-2 font-display font-extrabold text-brand-700 disabled:opacity-40"
              >↓</button>
            </li>
          ))}
        </ol>
      );
    }

    case 'MATCHING':
    case 'DRAG_DROP': {
      const left: string[] = data.left ?? data.items ?? [];
      const right: string[] = data.right ?? data.choices ?? [];
      const pairs = (value as Record<string, string>) ?? {};
      return (
        <ul className="space-y-2">
          {left.map((item) => (
            <li key={item} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand-100 bg-white p-3">
              <span className="flex-1 font-display font-extrabold text-brand-900">{item}</span>
              <label className="sr-only" htmlFor={`m-${question.id}-${item}`}>Match for {item}</label>
              <Select
                id={`m-${question.id}-${item}`}
                disabled={disabled}
                className="w-auto"
                value={pairs[item] ?? ''}
                onChange={(e) => onChange({ ...pairs, [item]: e.target.value })}
              >
                <option value="">Choose…</option>
                {right.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
            </li>
          ))}
        </ul>
      );
    }

    case 'FILL_BLANK':
    case 'SHORT_ANSWER':
      return (
        <>
          <label className="sr-only" htmlFor={`a-${question.id}`}>Your answer</label>
          <Textarea
            id={`a-${question.id}`}
            rows={3}
            disabled={disabled}
            placeholder="Type your answer…"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      );

    default:
      return <p className="font-body font-bold text-brand-400">This question type is not supported yet.</p>;
  }
}
