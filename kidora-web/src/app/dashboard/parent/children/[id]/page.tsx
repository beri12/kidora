'use client';
import { use } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useChildReport } from '@/features/student/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { CertificateCard } from '@/components/shared/CertificateCard';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

/**
 * Parent view of one child: educational progress first, the game layer only as
 * light context. A parent may only reach a child linked to their account — the
 * API checks that, this page does not assume it.
 */
export default function ChildReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useRequireAuth(['PARENT', 'ADMIN']);
  const { data, isLoading, isError, refetch } = useChildReport(id);

  if (isLoading) return <LoadingState rows={4} label="Loading report" />;
  if (isError || !data) {
    return (
      <ErrorState
        title="We could not open this report"
        description="This child may not be linked to your account. If that looks wrong, ask your school."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/parent/children"
        className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline"
      >
        ← My children
      </Link>

      <header className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-brand-100 bg-white p-6 shadow-card">
        <span
          aria-hidden
          className="grid h-16 w-16 place-items-center rounded-3xl font-display text-3xl font-extrabold text-white"
          style={{ background: data.child.avatarColor }}
        >
          {data.child.name[0]}
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-brand-900">{data.child.name}</h1>
          <p className="font-body font-bold text-brand-500">
            {[data.child.grade?.name, data.child.school?.name].filter(Boolean).join(' · ') || 'Learning at home'}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Courses in progress" value={data.courses.filter((c) => !c.completed).length} color="#8B5CF6" />
        <StatCard label="Courses completed" value={data.courses.filter((c) => c.completed).length} color="#16A34A" />
        <StatCard label="Average score" value={`${data.averageScore}%`} color="#F59E0B" />
        <StatCard label="Learning streak" value={`${data.streak} days`} color="#0284C7" />
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Courses</h2>
        {data.courses.length === 0 ? (
          <EmptyState icon="📚" title="No courses started yet" />
        ) : (
          <ul className="space-y-3">
            {data.courses.map((row) => (
              <li key={row.courseId} className="rounded-3xl border-2 border-brand-100 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display font-extrabold text-brand-900">{row.course.title}</h3>
                  <span className="font-body-x text-[12px] text-brand-400">
                    {row.course.subject?.name ?? 'General'}
                  </span>
                </div>
                <ProgressBar
                  className="mt-3"
                  value={row.percent}
                  label={`${row.course.title} progress`}
                  tone={row.completed ? 'grass' : 'brand'}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Quiz results</h2>
        <DataTable
          caption="Recent quiz results"
          rows={data.quizzes.map((q, i) => ({ id: `quiz-${i}`, ...q }))}
          emptyTitle="No quizzes taken yet"
          columns={[
            { key: 'title', header: 'Quiz', cell: (r: any) => r.quiz.title },
            { key: 'score', header: 'Score', cell: (r: any) => `${r.percent}%` },
            { key: 'passed', header: 'Result', cell: (r: any) => (r.passed ? 'Passed' : 'Keep practising') },
            {
              key: 'when', header: 'Date', secondary: true,
              cell: (r: any) => new Date(r.submittedAt).toLocaleDateString(),
            },
          ]}
        />
      </section>

      {data.exams.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Exam results</h2>
          <DataTable
            caption="Exam results"
            rows={data.exams.map((e, i) => ({ id: `exam-${i}`, ...e }))}
            columns={[
              { key: 'title', header: 'Exam', cell: (r: any) => r.exam.title },
              { key: 'score', header: 'Score', cell: (r: any) => `${r.percent}%` },
              { key: 'passed', header: 'Result', cell: (r: any) => (r.passed ? 'Passed' : 'Not yet') },
            ]}
          />
        </section>
      )}

      {data.assignments.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Assignments</h2>
          <DataTable
            caption="Assignments"
            rows={data.assignments}
            columns={[
              { key: 'title', header: 'Assignment', cell: (r: any) => r.assignment.title },
              { key: 'status', header: 'Status', cell: (r: any) => r.status.toLowerCase() },
              {
                key: 'score', header: 'Mark',
                cell: (r: any) => (r.score != null ? `${r.score}/${r.assignment.points}` : '—'),
              },
            ]}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Achievements</h2>
        {data.badges.length === 0 ? (
          <EmptyState icon="🏅" title="No badges yet" description="Badges arrive as your child finishes lessons." />
        ) : (
          <ul className="flex flex-wrap gap-3">
            {data.badges.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center gap-2 rounded-2xl border-2 border-brand-100 bg-white px-4 py-2.5 shadow-card"
              >
                <span aria-hidden className="text-2xl">{badge.glyph}</span>
                <span className="font-display font-extrabold text-brand-800">{badge.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.certificates.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Certificates</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
