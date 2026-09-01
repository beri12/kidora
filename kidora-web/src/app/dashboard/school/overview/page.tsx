'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMySchool, useSchoolDashboard } from '@/features/school/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/states';

const STAFF = ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'ADMIN'] as const;

/**
 * School admin overview. Deliberately a professional EdTech surface — clean
 * numbers and tables, none of the student game language.
 */
export default function SchoolOverviewPage() {
  useRequireAuth([...STAFF]);
  const school = useMySchool();
  const dashboard = useSchoolDashboard();

  if (school.isLoading || dashboard.isLoading) return <LoadingState rows={4} label="Loading school dashboard" />;
  if (school.isError || dashboard.isError) {
    return (
      <ErrorState
        title="We could not load your school"
        description="Your account may not be linked to a school yet. Ask a Kidora administrator to attach it."
        onRetry={() => { school.refetch(); dashboard.refetch(); }}
      />
    );
  }

  const d = dashboard.data!;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-body-x text-[12px] uppercase text-brand-400">School dashboard</p>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">{school.data?.name}</h1>
          <p className="font-body font-bold text-brand-600">
            {[school.data?.city, school.data?.country].filter(Boolean).join(', ')}
            {school.data?.code && ` · Join code ${school.data.code}`}
          </p>
        </div>
        <Link
          href="/dashboard/school/settings"
          className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
        >
          School settings →
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={d.students} color="#8B5CF6" />
        <StatCard label="Teachers" value={d.teachers} color="#0284C7" />
        <StatCard label="Classes" value={d.classes} color="#16A34A" />
        <StatCard label="Courses" value={`${d.publishedCourses}/${d.courses}`} sub="published" color="#F59E0B" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
          <h2 className="mb-4 font-display text-xl font-extrabold text-brand-900">Learning health</h2>
          <ProgressBar value={d.avgProgress} label="Average course progress" />
          <ProgressBar className="mt-4" value={d.completionRate} label="Course completion rate" tone="grass" />
          <ProgressBar className="mt-4" value={d.averageScore} label="Average assessment score" tone="sun" />

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-body-x text-[11px] uppercase text-brand-400">Active today</dt>
              <dd className="font-display text-2xl font-extrabold text-brand-900">{d.activeToday}</dd>
            </div>
            <div>
              <dt className="font-body-x text-[11px] uppercase text-brand-400">Certificates issued</dt>
              <dd className="font-display text-2xl font-extrabold text-brand-900">{d.certificates}</dd>
            </div>
            <div>
              <dt className="font-body-x text-[11px] uppercase text-brand-400">Needing support</dt>
              <dd className="font-display text-2xl font-extrabold text-rose-600">{d.atRisk}</dd>
            </div>
          </dl>
          <p className="mt-3 font-body-x text-[12px] text-brand-400">
            &ldquo;Needing support&rdquo; is a staff-only signal. Learners never see a ranking.
          </p>
        </section>

        <section className="rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
          <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Recent activity</h2>
          {d.recentActivity.length === 0 ? (
            <EmptyState icon="🕓" title="Nothing yet this week" />
          ) : (
            <ul className="space-y-2">
              {d.recentActivity.slice(0, 10).map((event) => (
                <li key={event.id} className="flex justify-between gap-3 border-b border-brand-50 pb-2 last:border-0">
                  <span className="font-body font-bold text-brand-700">{event.name.replace(/_/g, ' ')}</span>
                  <span className="font-body-x text-[12px] text-brand-400">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
