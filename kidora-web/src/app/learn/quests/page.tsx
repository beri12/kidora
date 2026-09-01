'use client';
import { useRouter } from 'next/navigation';
import { useMyQuests, useStartQuest } from '@/features/quests/hooks';
import { QuestCard } from '@/components/game/QuestCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import type { QuestSummary } from '@/types';

export default function QuestLogPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyQuests();
  const startQuest = useStartQuest();

  const openQuest = async (quest: QuestSummary) => {
    await startQuest.mutateAsync(quest.id).catch(() => {});
    if (quest.courseId) router.push(`/learn/course/${quest.courseId}`);
  };

  if (isLoading) return <LoadingState rows={3} label="Loading your quests" />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Your quest log 📜</h1>
      {(data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No quests started"
          description="Head to the map and pick a world to begin your first adventure."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data!.map((quest) => (
            <QuestCard key={quest.id} quest={quest} onStart={openQuest} isStarting={startQuest.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}
