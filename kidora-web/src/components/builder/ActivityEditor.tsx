'use client';
import { useState } from 'react';
import type { ActivityType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const TYPES: ActivityType[] = [
  'MULTIPLE_CHOICE', 'TRUE_FALSE', 'MATCHING', 'ORDERING', 'DRAG_DROP',
  'MEMORY', 'PUZZLE', 'DIALOGUE', 'SIMULATION', 'BOSS_CHALLENGE',
];

export interface ActivityDraft {
  title: string;
  instructions?: string;
  type: ActivityType;
  points: number;
  config: Record<string, unknown>;
  solution: Record<string, unknown>;
}

/**
 * Authoring form for the three activity types a teacher writes by hand. The
 * remaining types (memory, puzzle, dialogue, simulation, boss) are authored by
 * pasting their JSON config, which keeps one editor rather than ten bespoke
 * ones and matches how the renderer consumes them.
 */
export function ActivityEditor({
  onSave,
  onCancel,
  isSaving,
}: {
  onSave: (draft: ActivityDraft) => void;
  onCancel: () => void;
  isSaving?: boolean;
}) {
  const [type, setType] = useState<ActivityType>('MULTIPLE_CHOICE');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [points, setPoints] = useState(10);
  const [choices, setChoices] = useState('');
  const [correct, setCorrect] = useState(0);
  const [orderItems, setOrderItems] = useState('');
  const [rawConfig, setRawConfig] = useState('{}');
  const [rawSolution, setRawSolution] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  const simple = type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE';
  const ordering = type === 'ORDERING';

  const build = (): ActivityDraft | null => {
    if (simple) {
      const list = type === 'TRUE_FALSE' ? ['True', 'False'] : choices.split('\n').filter(Boolean);
      if (list.length < 2) {
        setError('Add at least two options, one per line.');
        return null;
      }
      if (correct < 0 || correct >= list.length) {
        setError('The correct answer number is outside the list.');
        return null;
      }
      return { title, instructions, type, points, config: { choices: list }, solution: { correct } };
    }

    if (ordering) {
      const items = orderItems.split('\n').filter(Boolean);
      if (items.length < 2) {
        setError('Add at least two items, one per line, in the correct order.');
        return null;
      }
      // The learner sees them shuffled; the order typed here is the answer.
      return {
        title, instructions, type, points,
        config: { items: [...items].reverse() },
        solution: { sequence: items },
      };
    }

    try {
      return {
        title, instructions, type, points,
        config: JSON.parse(rawConfig || '{}'),
        solution: JSON.parse(rawSolution || '{}'),
      };
    } catch {
      setError('The configuration is not valid JSON.');
      return null;
    }
  };

  return (
    <form
      className="space-y-4 rounded-2xl border-2 border-brand-200 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const draft = build();
        if (draft) onSave(draft);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="act-title" className="font-display font-extrabold text-brand-900">Activity title</label>
          <Input id="act-title" required className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label htmlFor="act-type" className="font-display font-extrabold text-brand-900">Type</label>
          <Select id="act-type" className="mt-1" value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ').toLowerCase()}</option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="act-points" className="font-display font-extrabold text-brand-900">Points</label>
          <Input
            id="act-points" type="number" min={0} className="mt-1" value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 0)}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="act-instructions" className="font-display font-extrabold text-brand-900">Instructions</label>
          <Textarea
            id="act-instructions" rows={2} className="mt-1" value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>

        {simple && type === 'MULTIPLE_CHOICE' && (
          <div className="sm:col-span-2">
            <label htmlFor="act-choices" className="font-display font-extrabold text-brand-900">
              Options (one per line)
            </label>
            <Textarea
              id="act-choices" rows={4} className="mt-1" value={choices}
              onChange={(e) => setChoices(e.target.value)} placeholder={'1/4\n3/4\n4/3'}
            />
          </div>
        )}

        {simple && (
          <div>
            <label htmlFor="act-correct" className="font-display font-extrabold text-brand-900">
              Correct option number (starting at 0)
            </label>
            <Input
              id="act-correct" type="number" min={0} className="mt-1" value={correct}
              onChange={(e) => setCorrect(Number(e.target.value) || 0)}
            />
          </div>
        )}

        {ordering && (
          <div className="sm:col-span-2">
            <label htmlFor="act-order" className="font-display font-extrabold text-brand-900">
              Items in the correct order (one per line)
            </label>
            <Textarea
              id="act-order" rows={4} className="mt-1" value={orderItems}
              onChange={(e) => setOrderItems(e.target.value)} placeholder={'1/8\n3/8\n5/8'}
            />
          </div>
        )}

        {!simple && !ordering && (
          <>
            <div className="sm:col-span-2">
              <label htmlFor="act-config" className="font-display font-extrabold text-brand-900">
                Config JSON (what the learner sees)
              </label>
              <Textarea
                id="act-config" rows={5} className="mt-1 font-mono text-sm" value={rawConfig}
                onChange={(e) => setRawConfig(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="act-solution" className="font-display font-extrabold text-brand-900">
                Answer key JSON (never sent to a learner)
              </label>
              <Textarea
                id="act-solution" rows={4} className="mt-1 font-mono text-sm" value={rawSolution}
                onChange={(e) => setRawSolution(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {error && <p role="alert" className="font-body font-bold text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving || !title.trim()}>
          {isSaving ? 'Saving…' : 'Add activity'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
