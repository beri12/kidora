'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMySchool, useSchoolDashboard, useSchoolPerformance } from '@/features/school/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DataTable } from '@/components/ui/data-table';
import { ErrorState, LoadingState } from '@/components/ui/states';

/**
 * District overview.
 *
 * NOTE: this file existed but was empty, which broke `next build` (an empty
 * page.tsx is not a module). It now renders the district administrator's home.
 *
 * Kidora's tenancy is school-shaped: a DISTRICT_ADMIN is attached to a school
 * that belongs to a district, and the API scopes them to it. Cross-school
 * roll-ups across a whole district are not implemented server-side yet, so this
 * page reports the district context and the administrator's own school rather
 * than inventing numbers it cannot source.
 */
export default function DistrictDashboard() {
  const user = useRequireAuth(['DISTRICT_ADMIN', 'ADMIN']);
  const school = useMySchool();
  const dashboard = useSchoolDashboard();
  const performance = useSchoolPerformance();

  if (!user) return null;
  if (school.isLoading || dashboard.isLoading) return <LoadingState rows={4} label="Loading district dashboard" />;
  if (school.isError || dashboard.isError) {
    return (
      <ErrorState
        title="We could not load your district"
        description="Your account may not be attached to a school inside a district yet. Ask a Kidora administrator to link it."
        onRetry={() => { school.refetch(); dashboard.refetch(); }}
      />
    );
  }

  const d = dashboard.data!;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body-x text-[12px] uppercase text-brand-400">District dashboard</p>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">
            {school.data?.district?.name ?? 'Your district'}
          </h1>
          <p className="font-body font-bold text-brand-600">
            Reporting on {school.data?.name}
            {school.data?.district?.region ? ` · ${school.data.district.region}` : ''}
          </p>
        </div>
        <Link
          href="/dashboard/school/overview"
          className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
        >
          Open the school dashboard →
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={d.students} color="#8B5CF6" />
        <StatCard label="Teachers" value={d.teachers} color="#0284C7" />
        <StatCard label="Courses live" value={d.publishedCourses} color="#16A34A" />
        <StatCard label="Certificates" value={d.certificates} color="#F59E0B" />
      </div>

      <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 font-display text-xl font-extrabold text-brand-900">Attainment</h2>
        <ProgressBar value={d.avgProgress} label="Average course progress" />
        <ProgressBar className="mt-4" value={d.completionRate} label="Course completion rate" tone="grass" />
        <ProgressBar className="mt-4" value={d.averageScore} label="Average assessment score" tone="sun" />
      </section>

      {performance.data && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">By grade</h2>
          <DataTable
            caption="Performance by grade"
            rows={performance.data.byGrade.map((row, i) => ({ id: row.id ?? `grade-${i}`, ...row }))}
            emptyTitle="No grade data yet"
            columns={[
              { key: 'name', header: 'Grade', cell: (r: any) => <span className="font-display font-extrabold">{r.name}</span> },
              { key: 'learners', header: 'Learners', cell: (r: any) => r.learners },
              { key: 'avg', header: 'Avg. progress', cell: (r: any) => `${r.avgProgress}%` },
              { key: 'completion', header: 'Completed', cell: (r: any) => `${r.completionRate}%` },
            ]}
          />
        </section>
      )}
    </div>
  );
}
