'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTeacherOverview } from '@/features/lms/hooks';
import { useCourseWizard } from '@/stores/courseWizard.store';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function TeacherDashboard() {
  const user = useRequireAuth(['TEACHER']);
  const router = useRouter();
  const resetWizard = useCourseWizard((s) => s.reset);
  const { data, isLoading, isError, refetch } = useTeacherOverview();

  function startNewCourse() {
    // Clear any leftover draft from a previous session so Basic Info starts blank.
    resetWizard();
    router.push('/dashboard/teacher/create-course/basic-info');
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            Hi {user?.name?.split(' ')[0]} 🍎
          </h1>
          <p className="mt-1 font-body font-bold text-brand-600">
            {data ? `${data.courseCount} courses · ${data.activeStudents} active students` : 'Your classroom at a glance'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/teacher/courses"><Button variant="outline">My courses</Button></Link>
          <Button onClick={startNewCourse}>+ New course</Button>
        </div>
      </header>

      {isLoading ? (
        <LoadingState rows={2} label="Loading your dashboard" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active students" value={data.activeStudents} color="#8B5CF6" />
            <StatCard label="Avg. progress" value={`${data.avgProgress}%`} color="#16A34A" />
            <StatCard label="Pending marking" value={data.pendingSubmissions} color="#F59E0B" />
            <StatCard label="Published courses" value={`${data.publishedCount}/${data.courseCount}`} color="#0284C7" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
              <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Your courses</h2>
              {data.courses.length === 0 ? (
                <EmptyState
                  icon="📚"
                  title="No courses yet"
                  description="Create a course to start building lessons for your class."
                  action={<Button onClick={startNewCourse}>+ New course</Button>}
                />
              ) : (
                <ul className="space-y-2.5">
                  {data.courses.map((course) => (
                    <li key={course.id}>
                      <Link
                        href={`/dashboard/teacher/courses/${course.id}/builder`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 p-3.5 hover:border-brand-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                      >
                        <span className="font-display font-extrabold text-brand-900">{course.title}</span>
                        <span className="font-body-x text-[12px] text-brand-400">
                          {course._count.lessons} lessons · {course._count.enrollments} enrolled ·{' '}
                          {course.published ? 'published' : 'draft'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
              <h2 className="font-display text-xl font-extrabold text-brand-900">Students needing support</h2>
              <p className="mt-1 font-body-x text-[12px] text-brand-400">
                Shown to staff only — learners never see a ranking.
              </p>
              {data.needsSupport.length === 0 ? (
                <p className="mt-4 font-body font-bold text-grass-600">Everyone is on track 🎉</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.needsSupport.map((student) => (
                    <li key={student.id} className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid h-9 w-9 place-items-center rounded-full font-display font-extrabold text-white"
                        style={{ background: student.avatarColor }}
                      >
                        {student.name[0]}
                      </span>
                      <span className="font-display font-extrabold text-brand-800">{student.name}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6">
                <ProgressBar value={data.completionRate} label="Course completion rate" tone="grass" />
                <ProgressBar className="mt-3" value={data.averageScore} label="Average quiz score" tone="sun" />
              </div>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
