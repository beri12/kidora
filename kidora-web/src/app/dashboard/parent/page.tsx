'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMyChildren } from '@/features/student/hooks';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { EmptyState, LoadingState } from '@/components/ui/states';

export default function ParentDashboard() {
  const user = useRequireAuth(['PARENT']);
  const { data, isLoading } = useMyChildren();
  const accounts = data?.accounts ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">
          Hi {user?.name?.split(' ')[0]} 👪
        </h1>
        <p className="mt-1 font-body font-bold text-brand-600">
          Everything your family is learning, in one calm place.
        </p>
      </header>

      {isLoading ? (
        <LoadingState rows={2} label="Loading your family" />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon="👪"
          title="No children linked yet"
          description="Once your child has a Kidora learning account, their progress appears here."
          action={<Link href="/onboarding"><Button>Set up a child profile</Button></Link>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Children" value={accounts.length} color="#8B5CF6" />
            <StatCard
              label="Total XP"
              value={accounts.reduce((a, c) => a + c.points, 0)}
              color="#F59E0B"
            />
            <StatCard
              label="Best streak"
              value={`${accounts.reduce((a, c) => Math.max(a, c.streak), 0)} days`}
              color="#16A34A"
            />
          </div>

          <section>
            <h2 className="mb-3 font-display text-xl font-extrabold text-brand-900">Your children</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {accounts.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/dashboard/parent/children/${child.id}`}
                    className="flex items-center gap-4 rounded-3xl border-2 border-brand-100 bg-white p-5 shadow-card motion-safe:transition-transform motion-safe:hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                  >
                    <span
                      aria-hidden
                      className="grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-extrabold text-white"
                      style={{ background: child.avatarColor }}
                    >
                      {child.name[0]}
                    </span>
                    <span>
                      <span className="block font-display text-xl font-extrabold text-brand-900">{child.name}</span>
                      <span className="block font-body-x text-[12px] text-brand-400">
                        See progress, scores and certificates →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
