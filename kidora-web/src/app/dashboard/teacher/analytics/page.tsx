'use client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTeacherOverview } from '@/features/lms/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState, LoadingState } from '@/components/ui/states';

export default function TeacherAnalyticsPage() {
  useRequireAuth(['TEACHER', 'ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_LEADER']);
  const { data, isLoading, isError, refetch } = useTeacherOverview();

  if (isLoading) return <LoadingState rows={3} label="Loading analytics" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Analytics</h1>
        <p className="font-body font-bold text-brand-600">How your courses are landing.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses" value={data.courseCount} color="#8B5CF6" />
        <StatCard label="Active students" value={data.activeStudents} color="#0284C7" />
        <StatCard label="Completion rate" value={`${data.completionRate}%`} color="#16A34A" />
        <StatCard label="Average score" value={`${data.averageScore}%`} color="#F59E0B" />
      </div>

      <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-extrabold text-brand-900">Overall</h2>
        <ProgressBar value={data.avgProgress} label="Average progress across your courses" />
        <ProgressBar className="mt-4" value={data.completionRate} label="Courses completed" tone="grass" />
        <ProgressBar className="mt-4" value={data.averageScore} label="Average quiz score" tone="sun" />
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Per course</h2>
        <DataTable
          caption="Your courses"
          rows={data.courses as any}
          emptyTitle="No courses yet"
          columns={[
            { key: 'title', header: 'Course', cell: (r: any) => <span className="font-display font-extrabold">{r.title}</span> },
            { key: 'lessons', header: 'Lessons', cell: (r: any) => r._count.lessons },
            { key: 'enrolled', header: 'Enrolled', cell: (r: any) => r._count.enrollments },
            { key: 'state', header: 'State', cell: (r: any) => (r.published ? 'Published' : 'Draft') },
          ]}
        />
      </section>
    </div>
  );
}
