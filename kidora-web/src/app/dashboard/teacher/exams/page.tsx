'use client';
import { useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useCourseLibrary } from '@/features/lms/hooks';
import { useTeachingExams } from '@/features/exams/hooks';
import { api } from '@/lib/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState, LoadingState } from '@/components/ui/states';

interface DraftQuestion {
  prompt: string;
  options: string;
  correct: number;
  points: number;
}

const EMPTY_QUESTION: DraftQuestion = { prompt: '', options: '', correct: 0, points: 1 };

export default function TeacherExamsPage() {
  useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);
  const exams = useTeachingExams();
  const courses = useCourseLibrary();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({
    courseId: '', title: '', description: '',
    timeLimitMin: 60, passingScore: 70, maxAttempts: 2, questionCount: '',
  });
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...EMPTY_QUESTION }]);

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/exams', {
          ...draft,
          questionCount: draft.questionCount ? Number(draft.questionCount) : undefined,
          published: true,
          questions: questions
            .filter((q) => q.prompt.trim())
            .map((q, i) => ({
              prompt: q.prompt.trim(),
              options: q.options.split('\n').filter(Boolean),
              correct: q.correct,
              points: q.points,
              order: i,
            })),
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setOpen(false);
      setQuestions([{ ...EMPTY_QUESTION }]);
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">Exams</h1>
          <p className="font-body font-bold text-brand-600">
            Timed, server-graded assessments. Passing the final exam unlocks the course certificate.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ New exam</Button>
      </header>

      {exams.isLoading ? (
        <LoadingState rows={3} label="Loading exams" />
      ) : exams.isError ? (
        <ErrorState onRetry={() => exams.refetch()} />
      ) : (
        <DataTable
          caption="Exams you have set"
          rows={exams.data ?? []}
          emptyTitle="No exams yet"
          emptyDescription="Create a final exam so learners can earn a certificate."
          columns={[
            { key: 'title', header: 'Exam', cell: (r: any) => <span className="font-display font-extrabold">{r.title}</span> },
            { key: 'course', header: 'Course', secondary: true, cell: (r: any) => r.course?.title ?? '—' },
            { key: 'questions', header: 'Questions', cell: (r: any) => r._count?.questions ?? 0 },
            { key: 'time', header: 'Time', secondary: true, cell: (r: any) => `${r.timeLimitMin} min` },
            { key: 'pass', header: 'Pass mark', secondary: true, cell: (r: any) => `${r.passingScore}%` },
            { key: 'attempts', header: 'Sat', cell: (r: any) => <Badge tone="sun">{r._count?.attempts ?? 0}</Badge> },
          ]}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New exam"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={create.isPending || !draft.courseId || !draft.title.trim()}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Creating…' : 'Create exam'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="ex-course" className="font-display font-extrabold text-brand-900">Course</label>
              <Select
                id="ex-course" className="mt-1" value={draft.courseId}
                onChange={(e) => setDraft((d) => ({ ...d, courseId: e.target.value }))}
              >
                <option value="">Choose a course…</option>
                {(courses.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ex-title" className="font-display font-extrabold text-brand-900">Title</label>
              <Input id="ex-title" className="mt-1" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="ex-desc" className="font-display font-extrabold text-brand-900">Description</label>
              <Textarea id="ex-desc" rows={2} className="mt-1" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
            {([
              ['timeLimitMin', 'Time limit (minutes)'],
              ['passingScore', 'Pass mark (%)'],
              ['maxAttempts', 'Max attempts'],
              ['questionCount', 'Questions to draw (blank = all)'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`ex-${key}`} className="font-display font-extrabold text-brand-900">{label}</label>
                <Input
                  id={`ex-${key}`} type="number" min={0} className="mt-1"
                  value={(draft as any)[key]}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [key]: key === 'questionCount' ? e.target.value : Number(e.target.value) || 0 }))
                  }
                />
              </div>
            ))}
          </div>

          <fieldset className="space-y-3">
            <legend className="font-display font-extrabold text-brand-900">Questions</legend>
            {questions.map((question, i) => (
              <div key={i} className="rounded-2xl border-2 border-brand-100 p-4">
                <label htmlFor={`q-prompt-${i}`} className="font-body-x text-[12px] uppercase text-brand-400">
                  Question {i + 1}
                </label>
                <Input
                  id={`q-prompt-${i}`} className="mt-1" value={question.prompt} placeholder="What is 1/4 + 1/4?"
                  onChange={(e) =>
                    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, prompt: e.target.value } : q)))
                  }
                />
                <label htmlFor={`q-options-${i}`} className="mt-2 block font-body-x text-[12px] uppercase text-brand-400">
                  Options (one per line)
                </label>
                <Textarea
                  id={`q-options-${i}`} rows={3} className="mt-1" value={question.options}
                  onChange={(e) =>
                    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, options: e.target.value } : q)))
                  }
                />
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`q-correct-${i}`} className="font-body-x text-[12px] uppercase text-brand-400">
                      Correct option number (from 0)
                    </label>
                    <Input
                      id={`q-correct-${i}`} type="number" min={0} className="mt-1" value={question.correct}
                      onChange={(e) =>
                        setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, correct: Number(e.target.value) || 0 } : q)))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`q-points-${i}`} className="font-body-x text-[12px] uppercase text-brand-400">Points</label>
                    <Input
                      id={`q-points-${i}`} type="number" min={1} className="mt-1" value={question.points}
                      onChange={(e) =>
                        setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, points: Number(e.target.value) || 1 } : q)))
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={() => setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }])}>
              + Add question
            </Button>
          </fieldset>

          {create.isError && (
            <p role="alert" className="font-body font-bold text-rose-600">
              The exam could not be created. Check every question has a prompt and options.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
