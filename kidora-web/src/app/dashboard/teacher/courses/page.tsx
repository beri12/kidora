'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCourseLibrary, useCreateLmsCourse } from '@/features/lms/hooks';
import { useGrades } from '@/features/school/hooks';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/ui/modal';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function TeacherCoursesPage() {
  const user = useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', gradeId: '' });

  const library = useCourseLibrary({ status: status || undefined, q: q || undefined });
  const grades = useGrades();
  const create = useCreateLmsCourse();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">My courses</h1>
          <p className="font-body font-bold text-brand-600">Build, publish and track your curriculum.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/teacher/create-course/basic-info">
            <Button variant="outline">Use the 3-step wizard</Button>
          </Link>
          <Button onClick={() => setOpen(true)}>+ New course</Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 rounded-3xl border-2 border-brand-100 bg-white p-4 shadow-card">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="course-search" className="sr-only">Search courses</label>
          <Input
            id="course-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title…"
          />
        </div>
        <div>
          <label htmlFor="course-status" className="sr-only">Filter by status</label>
          <Select id="course-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </Select>
        </div>
      </div>

      {library.isLoading ? (
        <LoadingState rows={3} label="Loading courses" />
      ) : library.isError ? (
        <ErrorState onRetry={() => library.refetch()} />
      ) : (library.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="📚"
          title="No courses yet"
          description="Create your first course, add sections and lessons, then publish it to your school."
          action={<Button onClick={() => setOpen(true)}>+ New course</Button>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {library.data!.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              tone="staff"
              href={`/dashboard/teacher/courses/${course.id}/builder`}
              footer={
                <p className="font-body-x text-[12px] text-brand-400">
                  {course._count?.enrollments ?? 0} enrolled · {course.teacher?.name}
                </p>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a course"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={create.isPending || !draft.title.trim()}
              onClick={async () => {
                const course = await create.mutateAsync({
                  title: draft.title.trim(),
                  description: draft.description,
                  gradeId: draft.gradeId || undefined,
                } as any);
                setOpen(false);
                router.push(`/dashboard/teacher/courses/${course.id}/builder`);
              }}
            >
              {create.isPending ? 'Creating…' : 'Create and open builder'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="new-course-title" className="font-display font-extrabold text-brand-900">Title</label>
            <Input
              id="new-course-title" className="mt-1" value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Fractions Quest"
            />
          </div>
          <div>
            <label htmlFor="new-course-desc" className="font-display font-extrabold text-brand-900">Description</label>
            <Textarea
              id="new-course-desc" rows={3} className="mt-1" value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="What this course covers"
            />
          </div>
          <div>
            <label htmlFor="new-course-grade" className="font-display font-extrabold text-brand-900">Grade</label>
            <Select
              id="new-course-grade" className="mt-1" value={draft.gradeId}
              onChange={(e) => setDraft((d) => ({ ...d, gradeId: e.target.value }))}
            >
              <option value="">Any grade</option>
              {(grades.data ?? []).map((grade) => (
                <option key={grade.id} value={grade.id}>{grade.name}</option>
              ))}
            </Select>
          </div>
          <p className="font-body-x text-[12px] text-brand-400">
            The course is created in your own school as a draft. Nothing is visible to students until you publish it.
          </p>
        </div>
      </Modal>
    </div>
  );
}
