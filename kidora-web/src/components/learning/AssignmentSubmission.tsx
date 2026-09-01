'use client';
import { useState } from 'react';
import type { Assignment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useUploadFile } from '@/features/lms/uploads';

const STATUS_TONE: Record<string, 'brand' | 'grass' | 'sun' | 'coral'> = {
  DRAFT: 'brand',
  SUBMITTED: 'sun',
  RETURNED: 'coral',
  GRADED: 'grass',
};

/** Student-side assignment view: instructions, attachments, and the submission form. */
export function AssignmentSubmission({
  assignment,
  onSubmit,
  isSubmitting,
}: {
  assignment: Assignment;
  onSubmit: (body: { text?: string; attachmentUrls?: string[] }) => void;
  isSubmitting?: boolean;
}) {
  const mine = assignment.mySubmission;
  const [text, setText] = useState(mine?.text ?? '');
  const [urls, setUrls] = useState<string[]>(mine?.attachmentUrls ?? []);
  const upload = useUploadFile();
  const locked = mine?.status === 'GRADED';

  const due = assignment.dueAt ? new Date(assignment.dueAt) : null;
  const overdue = due ? due.getTime() < Date.now() && !mine : false;

  return (
    <section className="rounded-[28px] border-2 border-brand-100 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-brand-900">{assignment.title}</h1>
          <p className="mt-1 font-body-x text-[12px] text-brand-400">
            {assignment.points} points
            {due && ` · Due ${due.toLocaleDateString()}`}
            {overdue && ' · Late'}
          </p>
        </div>
        {mine && <Badge tone={STATUS_TONE[mine.status]}>{mine.status.toLowerCase()}</Badge>}
      </div>

      <p className="mt-4 whitespace-pre-line font-body font-bold text-brand-600">{assignment.instructions}</p>

      {assignment.attachmentUrls?.length > 0 && (
        <ul className="mt-4 space-y-1">
          {assignment.attachmentUrls.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="font-display font-extrabold text-brand-700 underline"
              >
                📎 Attachment
              </a>
            </li>
          ))}
        </ul>
      )}

      {mine?.status === 'GRADED' && (
        <div className="mt-5 rounded-2xl bg-grass-100 p-4">
          <p className="font-display text-lg font-extrabold text-grass-700">
            Marked: {mine.score} / {assignment.points}
          </p>
          {mine.feedback && <p className="mt-1 font-body font-bold text-grass-700">{mine.feedback}</p>}
        </div>
      )}

      {mine?.status === 'RETURNED' && mine.feedback && (
        <div className="mt-5 rounded-2xl bg-amber-100 p-4">
          <p className="font-display font-extrabold text-amber-700">Your teacher asked for changes</p>
          <p className="mt-1 font-body font-bold text-amber-700">{mine.feedback}</p>
        </div>
      )}

      {!locked && (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ text: text.trim() || undefined, attachmentUrls: urls });
          }}
        >
          {assignment.submissionTypes?.includes('TEXT') && (
            <div>
              <label htmlFor="submission-text" className="font-display font-extrabold text-brand-900">
                Your answer
              </label>
              <Textarea
                id="submission-text"
                rows={6}
                className="mt-2"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write your answer here…"
              />
            </div>
          )}

          {assignment.submissionTypes?.some((t) => t !== 'TEXT') && (
            <div>
              <label htmlFor="submission-file" className="font-display font-extrabold text-brand-900">
                Attach a file
              </label>
              <input
                id="submission-file"
                type="file"
                className="mt-2 block w-full font-body text-sm text-brand-600 file:mr-3 file:rounded-2xl file:border-0 file:bg-brand-100 file:px-4 file:py-2 file:font-display file:font-extrabold file:text-brand-700"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const stored = await upload.mutateAsync(file);
                  setUrls((u) => [...u, stored.url]);
                }}
              />
              {upload.isPending && <p className="mt-1 font-body-x text-[12px] text-brand-400">Uploading…</p>}
              {upload.isError && (
                <p className="mt-1 font-body-x text-[12px] text-rose-500">
                  That file could not be uploaded. Check the type and size, then try again.
                </p>
              )}
              {urls.length > 0 && (
                <ul className="mt-2 space-y-1 font-body-x text-[12px] text-brand-500">
                  {urls.map((u) => (
                    <li key={u}>📎 attached</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Button type="submit" variant="grass" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : mine ? 'Resubmit' : 'Submit work'}
          </Button>
        </form>
      )}
    </section>
  );
}
