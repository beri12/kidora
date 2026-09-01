'use client';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSchoolDashboard, useSchoolPerformance } from '@/features/school/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { DataTable } from '@/components/ui/data-table';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

export default function SchoolAnalyticsPage() {
  useRequireAuth([...STAFF]);
  const dashboard = useSchoolDashboard();
  const performance = useSchoolPerformance();

  if (dashboard.isLoading || performance.isLoading) return <LoadingState rows={4} label="Loading analytics" />;
  if (dashboard.isError || performance.isError) {
    return <ErrorState onRetry={() => { dashboard.refetch(); performance.refetch(); }} />;
  }

  const d = dashboard.data!;
  const p = performance.data!;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">Analytics</h1>
        <p className="font-body font-bold text-brand-600">
          Engagement and attainment across your school. Aggregate only — no child is singled out.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active today" value={d.activeToday} color="#8B5CF6" />
        <StatCard label="Avg. progress" value={`${d.avgProgress}%`} color="#0284C7" />
        <StatCard label="Completion rate" value={`${d.completionRate}%`} color="#16A34A" />
        <StatCard label="Avg. score" value={`${d.averageScore}%`} color="#F59E0B" />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">By grade</h2>
        <DataTable
          caption="Performance by grade"
          rows={p.byGrade.map((row, i) => ({ id: row.id ?? `grade-${i}`, ...row }))}
          emptyTitle="No grade data yet"
          emptyDescription="Numbers appear once students start courses attached to a grade."
          columns={[
            { key: 'name', header: 'Grade', cell: (r: any) => <span className="font-display font-extrabold">{r.name}</span> },
            { key: 'learners', header: 'Learners', cell: (r: any) => r.learners },
            {
              key: 'avg', header: 'Avg. progress', className: 'w-[220px]',
              cell: (r: any) => <ProgressBar value={r.avgProgress} label={`${r.name} average progress`} />,
            },
            { key: 'completion', header: 'Completed', cell: (r: any) => `${r.completionRate}%` },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">By subject</h2>
        <DataTable
          caption="Performance by subject"
          rows={p.bySubject.map((row, i) => ({ id: `subject-${i}`, ...row }))}
          emptyTitle="No subject data yet"
          columns={[
            { key: 'name', header: 'Subject', cell: (r: any) => <span className="font-display font-extrabold">{r.name}</span> },
            { key: 'learners', header: 'Learners', cell: (r: any) => r.learners },
            {
              key: 'avg', header: 'Avg. progress', className: 'w-[220px]',
              cell: (r: any) => <ProgressBar value={r.avgProgress} label={`${r.name} average progress`} />,
            },
            { key: 'completion', header: 'Completed', cell: (r: any) => `${r.completionRate}%` },
          ]}
        />
      </section>
    </div>
  );
}
