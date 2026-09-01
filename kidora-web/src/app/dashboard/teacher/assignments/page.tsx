'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseLibrary } from '@/features/lms/hooks';
import {
  useCreateAssignment,
  useGradeSubmission,
  useSubmissions,
  useTeachingAssignments,
} from '@/features/assignments/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { Assignment, AssignmentSubmissionRow } from '@/types';

export default function TeacherAssignmentsPage() {
  useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);
  const assignments = useTeachingAssignments();
  const courses = useCourseLibrary();
  const create = useCreateAssignment();

  const [creating, setCreating] = useState(false);
  const [marking, setMarking] = useState<Assignment | null>(null);
  const [draft, setDraft] = useState({ courseId: '', title: '', instructions: '', points: 100, dueAt: '' });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Assignments</h1>
          <p className="font-body font-bold text-brand-600">Set work, review submissions and give feedback.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ New assignment</Button>
      </header>

      {assignments.isLoading ? (
        <LoadingState rows={3} label="Loading assignments" />
      ) : assignments.isError ? (
        <ErrorState onRetry={() => assignments.refetch()} />
      ) : (
        <DataTable
          caption="Assignments you have set"
          rows={assignments.data ?? []}
          emptyTitle="No assignments yet"
          emptyDescription="Create one to give your class something to hand in."
          onRowClick={(row) => setMarking(row)}
          columns={[
            { key: 'title', header: 'Assignment', cell: (r) => <span className="font-display font-extrabold">{r.title}</span> },
            { key: 'course', header: 'Course', secondary: true, cell: (r) => r.course?.title ?? '—' },
            {
              key: 'due', header: 'Due', secondary: true,
              cell: (r) => (r.dueAt ? new Date(r.dueAt).toLocaleDateString() : 'No date'),
            },
            { key: 'points', header: 'Points', cell: (r) => `${r.points}` },
            {
              key: 'submissions', header: 'Handed in',
              cell: (r) => <Badge tone="sun">{r._count?.submissions ?? 0}</Badge>,
            },
            {
              key: 'state', header: 'State',
              cell: (r) => <Badge tone={r.published ? 'grass' : 'brand'}>{r.published ? 'published' : 'draft'}</Badge>,
            },
          ]}
        />
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New assignment"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button
              disabled={create.isPending || !draft.courseId || !draft.title.trim()}
              onClick={async () => {
                await create.mutateAsync({
                  courseId: draft.courseId,
                  title: draft.title.trim(),
                  instructions: draft.instructions,
                  points: draft.points,
                  dueAt: draft.dueAt || undefined,
                  submissionTypes: ['TEXT', 'IMAGE', 'PDF'],
                  published: true,
                } as any);
                setCreating(false);
                setDraft({ courseId: '', title: '', instructions: '', points: 100, dueAt: '' });
              }}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="as-course" className="font-display font-extrabold text-brand-900">Course</label>
            <Select
              id="as-course" className="mt-1" value={draft.courseId}
              onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
            >
              <option value="">Choose a course…</option>
              {(courses.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="as-title" className="font-display font-extrabold text-brand-900">Title</label>
            <Input
              id="as-title" className="mt-1" value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="as-instructions" className="font-display font-extrabold text-brand-900">Instructions</label>
            <Textarea
              id="as-instructions" rows={4} className="mt-1" value={draft.instructions}
              onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="as-points" className="font-display font-extrabold text-brand-900">Points</label>
              <Input
                id="as-points" type="number" min={0} className="mt-1" value={draft.points}
                onChange={(e) => setDraft((d) => ({ ...d, points: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label htmlFor="as-due" className="font-display font-extrabold text-brand-900">Due date</label>
              <Input
                id="as-due" type="date" className="mt-1" value={draft.dueAt}
                onChange={(e) => setDraft((d) => ({ ...d, dueAt: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {marking && <GradingPanel assignment={marking} onClose={() => setMarking(null)} />}
    </div>
  );
}

/** Submission list with inline marking. The API clamps the score to the max. */
function GradingPanel({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const submissions = useSubmissions(assignment.id);
  const grade = useGradeSubmission(assignment.id);
  const [open, setOpen] = useState<AssignmentSubmissionRow | null>(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  return (
    <Modal open onClose={onClose} title={`Submissions — ${assignment.title}`} className="max-w-3xl">
      {submissions.isLoading ? (
        <LoadingState rows={2} label="Loading submissions" />
      ) : (submissions.data?.length ?? 0) === 0 ? (
        <EmptyState icon="📥" title="Nothing handed in yet" />
      ) : (
        <ul className="space-y-3">
          {submissions.data!.map((row) => (
            <li key={row.id} className="rounded-2xl border-2 border-brand-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-display font-extrabold text-brand-900">
                  {row.student?.name ?? 'Student'}
                </span>
                <Badge tone={row.status === 'GRADED' ? 'grass' : row.status === 'RETURNED' ? 'coral' : 'sun'}>
                  {row.status.toLowerCase()}
                  {row.score != null && ` · ${row.score}/${assignment.points}`}
                </Badge>
              </div>

              {row.text && (
                <p className="mt-2 whitespace-pre-line rounded-xl bg-brand-50 p-3 font-body font-bold text-brand-700">
                  {row.text}
                </p>
              )}
              {row.attachmentUrls?.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {row.attachmentUrls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer" className="font-display font-extrabold text-brand-700 underline">
                        📎 Attachment
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {open?.id === row.id ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label htmlFor={`score-${row.id}`} className="font-display font-extrabold text-brand-900">
                      Score (out of {assignment.points})
                    </label>
                    <Input
                      id={`score-${row.id}`} type="number" min={0} max={assignment.points} className="mt-1"
                      value={score} onChange={(e) => setScore(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label htmlFor={`fb-${row.id}`} className="font-display font-extrabold text-brand-900">Feedback</label>
                    <Textarea
                      id={`fb-${row.id}`} rows={3} className="mt-1" value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm" variant="grass" disabled={grade.isPending}
                      onClick={async () => {
                        await grade.mutateAsync({ submissionId: row.id, score, feedback });
                        setOpen(null);
                      }}
                    >
                      Save mark
                    </Button>
                    <Button
                      size="sm" variant="outline" disabled={grade.isPending}
                      onClick={async () => {
                        await grade.mutateAsync({ submissionId: row.id, score, feedback, returnForRevision: true });
                        setOpen(null);
                      }}
                    >
                      Return for revision
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setOpen(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm" className="mt-3"
                  onClick={() => {
                    setOpen(row);
                    setScore(row.score ?? 0);
                    setFeedback(row.feedback ?? '');
                  }}
                >
                  {row.status === 'GRADED' ? 'Change mark' : 'Mark work'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
