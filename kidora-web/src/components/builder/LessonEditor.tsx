'use client';
import { useState } from 'react';
import type { LessonKind, LmsLesson } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUploadFile } from '@/features/lms/uploads';

const TYPES: LessonKind[] = ['ARTICLE', 'VIDEO', 'INTERACTIVE', 'AUDIO', 'GAME', 'RESOURCE'];

export interface LessonDraft {
  title: string;
  description?: string;
  content?: string;
  type: LessonKind;
  estimatedMinutes: number;
  videoUrl?: string;
  audioUrl?: string;
  objectives?: string[];
  isRequired: boolean;
}

/** Create/edit form for a single lesson. Media goes through the upload API. */
export function LessonEditor({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: Partial<LmsLesson>;
  onSave: (draft: LessonDraft) => void;
  onCancel: () => void;
  isSaving?: boolean;
}) {
  const [draft, setDraft] = useState<LessonDraft>({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    content: initial?.content ?? '',
    type: (initial?.type as LessonKind) ?? 'ARTICLE',
    estimatedMinutes: initial?.estimatedMinutes ?? 5,
    videoUrl: initial?.videoUrl ?? '',
    audioUrl: initial?.audioUrl ?? '',
    objectives: initial?.objectives ?? [],
    isRequired: initial?.isRequired ?? true,
  });
  const upload = useUploadFile();
  const set = <K extends keyof LessonDraft>(key: K, value: LessonDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <form
      className="space-y-4 rounded-2xl border-2 border-brand-200 bg-brand-50/50 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="lesson-title" className="font-display font-extrabold text-brand-900">Title</label>
          <Input
            id="lesson-title" required className="mt-1" value={draft.title}
            onChange={(e) => set('title', e.target.value)} placeholder="What is a fraction?"
          />
        </div>

        <div>
          <label htmlFor="lesson-type" className="font-display font-extrabold text-brand-900">Type</label>
          <Select id="lesson-type" className="mt-1" value={draft.type} onChange={(e) => set('type', e.target.value as LessonKind)}>
            {TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
          </Select>
        </div>

        <div>
          <label htmlFor="lesson-mins" className="font-display font-extrabold text-brand-900">Minutes</label>
          <Input
            id="lesson-mins" type="number" min={1} className="mt-1" value={draft.estimatedMinutes}
            onChange={(e) => set('estimatedMinutes', Number(e.target.value) || 1)}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="lesson-desc" className="font-display font-extrabold text-brand-900">Short description</label>
          <Textarea
            id="lesson-desc" rows={2} className="mt-1" value={draft.description}
            onChange={(e) => set('description', e.target.value)} placeholder="One line the learner sees first"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="lesson-content" className="font-display font-extrabold text-brand-900">Lesson content</label>
          <Textarea
            id="lesson-content" rows={6} className="mt-1" value={draft.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="The story or explanation the learner reads."
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="lesson-objectives" className="font-display font-extrabold text-brand-900">
            Learning objectives (one per line)
          </label>
          <Textarea
            id="lesson-objectives" rows={3} className="mt-1"
            value={(draft.objectives ?? []).join('\n')}
            onChange={(e) => set('objectives', e.target.value.split('\n').filter(Boolean))}
            placeholder={'Read a fraction out loud\nName the numerator'}
          />
        </div>

        {(draft.type === 'VIDEO' || draft.type === 'AUDIO') && (
          <div className="sm:col-span-2">
            <label htmlFor="lesson-media" className="font-display font-extrabold text-brand-900">
              {draft.type === 'VIDEO' ? 'Video file' : 'Audio file'}
            </label>
            <input
              id="lesson-media"
              type="file"
              accept={draft.type === 'VIDEO' ? 'video/*' : 'audio/*'}
              className="mt-1 block w-full font-body text-sm text-brand-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:font-display file:font-extrabold file:text-brand-700"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const stored = await upload.mutateAsync(file);
                set(draft.type === 'VIDEO' ? 'videoUrl' : 'audioUrl', stored.url);
              }}
            />
            {upload.isPending && <p className="mt-1 font-body-x text-[12px] text-brand-400">Uploading…</p>}
            {upload.isError && (
              <p className="mt-1 font-body-x text-[12px] text-rose-500">
                Upload failed. Check the file type and size, then try again.
              </p>
            )}
            {(draft.videoUrl || draft.audioUrl) && (
              <p className="mt-1 font-body-x text-[12px] text-grass-600">✓ Media attached</p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 font-display font-extrabold text-brand-800 sm:col-span-2">
          <input
            type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.isRequired}
            onChange={(e) => set('isRequired', e.target.checked)}
          />
          Required for the course certificate
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving || !draft.title.trim()}>
          {isSaving ? 'Saving…' : 'Save lesson'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
