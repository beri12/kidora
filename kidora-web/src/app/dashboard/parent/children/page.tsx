'use client';
import Link from 'next/link';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useMyChildren } from '@/features/student/hooks';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

export default function ParentChildrenPage() {
  useRequireAuth(['PARENT', 'ADMIN']);
  const { data, isLoading, isError, refetch } = useMyChildren();

  if (isLoading) return <LoadingState rows={2} label="Loading your children" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const accounts = data?.accounts ?? [];
  const profiles = data?.profiles ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-extrabold text-brand-900">My children</h1>
        <p className="font-body font-bold text-brand-600">
          A calm view of how each child is doing — progress and achievements, not scoreboards.
        </p>
      </header>

      {accounts.length === 0 && profiles.length === 0 ? (
        <EmptyState
          icon="👪"
          title="No children linked yet"
          description="Add a child profile during onboarding, or ask your school to link your child's learning account."
        />
      ) : (
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
                    ⭐ {child.points} XP · 🔥 {child.streak} day streak
                  </span>
                </span>
                <span aria-hidden className="ml-auto font-display font-extrabold text-brand-400">→</span>
              </Link>
            </li>
          ))}

          {profiles
            .filter((p) => !accounts.some((a) => a.name === p.name))
            .map((profile) => (
              <li
                key={profile.id}
                className="rounded-3xl border-2 border-dashed border-brand-200 bg-white/60 p-5"
              >
                <p className="font-display text-xl font-extrabold text-brand-900">{profile.name}</p>
                <p className="mt-1 font-body font-bold text-brand-400">
                  Age {profile.age} · no learning account linked yet
                </p>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
