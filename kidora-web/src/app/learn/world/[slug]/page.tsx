'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStartQuest, useWorld } from '@/features/quests/hooks';
import { QuestCard } from '@/components/game/QuestCard';
import { CourseCard } from '@/components/shared/CourseCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { QuestSummary } from '@/types';

export default function WorldPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: world, isLoading, isError, refetch } = useWorld(slug);
  const startQuest = useStartQuest();

  const openQuest = async (quest: QuestSummary) => {
    await startQuest.mutateAsync(quest.id).catch(() => {});
    if (quest.courseId) router.push(`/learn/course/${quest.courseId}`);
  };

  if (isLoading) return <LoadingState rows={4} label="Loading world" />;
  if (isError || !world) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      <Link href="/learn" className="font-display font-extrabold text-brand-600 focus:outline-none focus-visible:underline">
        ← Back to the map
      </Link>

      <header
        className="rounded-[28px] p-7 text-white shadow-card"
        style={{ background: `linear-gradient(135deg, ${world.accent}, ${world.accent}BB)` }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden className="text-[72px] leading-none motion-safe:animate-bob">{world.emoji}</span>
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-none">{world.name}</h1>
            <p className="mt-2 font-body font-bold text-white/90">
              {world.npc.emoji} {world.npc.name}: &ldquo;{world.npc.greeting}&rdquo;
            </p>
          </div>
        </div>

        <ul className="mt-5 flex flex-wrap gap-2">
          {world.zones.map((zone) => (
            <li key={zone.slug} className="rounded-2xl bg-white/20 px-3 py-2 font-display text-sm font-extrabold">
              <span aria-hidden>{zone.emoji}</span> {zone.name}
            </li>
          ))}
        </ul>
      </header>

      <section aria-labelledby="quests-heading">
        <h2 id="quests-heading" className="mb-3 font-display text-2xl font-extrabold">Quests</h2>
        {world.quests.length === 0 ? (
          <EmptyState icon="📜" title="No quests here yet" description="Start an adventure below instead." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {world.quests.map((quest) => (
              <QuestCard key={quest.id} quest={quest} onStart={openQuest} isStarting={startQuest.isPending} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="mb-3 font-display text-2xl font-extrabold">Adventures</h2>
        {world.courses.length === 0 ? (
          <EmptyState
            icon="🧭"
            title="Nothing here yet"
            description="When your teacher publishes a course for this subject, it will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {world.courses.map((course) => (
              <CourseCard key={course.id} course={{ ...course, progress: course.percent }} href={`/learn/course/${course.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
