'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStudentHome } from '@/features/student/hooks';
import { useTodayQuest, useStartQuest, useWorlds } from '@/features/quests/hooks';
import { WorldMap } from '@/components/game/WorldMap';
import { QuestCard } from '@/components/game/QuestCard';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { QuestSummary } from '@/types';

export default function LearnHomePage() {
  const router = useRouter();
  const home = useStudentHome();
  const worlds = useWorlds();
  const today = useTodayQuest();
  const startQuest = useStartQuest();

  const openQuest = async (quest: QuestSummary) => {
    await startQuest.mutateAsync(quest.id).catch(() => {});
    router.push(quest.courseId ? `/learn/course/${quest.courseId}` : '/learn/quests');
  };

  if (home.isError || worlds.isError) {
    return <ErrorState onRetry={() => { home.refetch(); worlds.refetch(); }} />;
  }

  return (
    <div className="space-y-8">
      {/* Today's quest — the single clear call to action */}
      <section aria-labelledby="today-heading">
        <h1 id="today-heading" className="mb-3 font-display text-3xl font-extrabold">
          Today&rsquo;s quest
        </h1>
        {today.isLoading ? (
          <LoadingState rows={1} label="Loading today's quest" />
        ) : today.data ? (
          <QuestCard quest={today.data} featured onStart={openQuest} isStarting={startQuest.isPending} />
        ) : (
          <EmptyState
            icon="🌱"
            title="No quest waiting"
            description="Pick a world below and start an adventure — your teacher may add more soon."
          />
        )}
      </section>

      {/* Keep going */}
      {(home.data?.inProgress?.length ?? 0) > 0 && (
        <section aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="mb-3 font-display text-2xl font-extrabold">
            Keep going
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.data!.inProgress.map((row) => (
              <CourseCard
                key={row.courseId}
                course={{ ...row.course, progress: row.percent }}
                href={`/learn/course/${row.courseId}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* World map */}
      <section aria-labelledby="map-heading">
        <h2 id="map-heading" className="mb-1 font-display text-2xl font-extrabold">
          Kidora World
        </h2>
        <p className="mb-4 font-body font-bold text-brand-500">
          Travel through the worlds. Every adventure is a real lesson from your school.
        </p>
        {worlds.isLoading ? (
          <LoadingState rows={4} label="Loading the world map" />
        ) : (
          <WorldMap worlds={worlds.data ?? []} />
        )}
      </section>

      {/* Recommended */}
      {(home.data?.recommended?.length ?? 0) > 0 && (
        <section aria-labelledby="rec-heading">
          <h2 id="rec-heading" className="mb-3 font-display text-2xl font-extrabold">
            New adventures for you
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {home.data!.recommended.map((course) => (
              <CourseCard key={course.id} course={course} href={`/learn/course/${course.id}`} />
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      <section aria-labelledby="badges-heading">
        <h2 id="badges-heading" className="mb-3 font-display text-2xl font-extrabold">
          Your achievements
        </h2>
        {home.isLoading ? (
          <LoadingState rows={1} label="Loading achievements" />
        ) : (home.data?.badges.length ?? 0) === 0 ? (
          <EmptyState
            icon="🏅"
            title="No badges yet"
            description="Finish a lesson or ace a quiz to earn your first badge."
          />
        ) : (
          <ul className="flex flex-wrap gap-3">
            {home.data!.badges.map((badge) => (
              <li
                key={badge.id}
                className="flex items-center gap-2 rounded-2xl border-2 border-brand-100 bg-white px-4 py-2.5 shadow-card"
              >
                <span aria-hidden className="text-2xl">{badge.glyph}</span>
                <span className="font-display font-extrabold text-brand-800">{badge.name}</span>
              </li>
            ))}
            <li>
              <Link
                href="/learn/certificates"
                className="flex h-full items-center rounded-2xl bg-amber-100 px-4 py-2.5 font-display font-extrabold text-amber-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
              >
                🎓 {home.data!.certificates} certificates →
              </Link>
            </li>
          </ul>
        )}
      </section>
    </div>
  );
}
