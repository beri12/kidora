'use client';
import type { QuestSummary } from '@/types';
import { Button } from '@/components/ui/button';

const STATUS_LABEL: Record<QuestSummary['status'], string> = {
  LOCKED: 'Locked',
  AVAILABLE: 'Ready',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Complete',
};

/**
 * A quest is always a wrapper around real curriculum — the card names the
 * course it teaches so the game layer never floats free of learning goals.
 */
export function QuestCard({
  quest,
  onStart,
  isStarting,
  featured = false,
}: {
  quest: QuestSummary;
  onStart?: (quest: QuestSummary) => void;
  isStarting?: boolean;
  featured?: boolean;
}) {
  const done = quest.status === 'COMPLETED';

  return (
    <article
      className={`rounded-[28px] border-2 p-6 shadow-card ${
        featured
          ? 'border-transparent bg-gradient-to-br from-brand-600 to-brand-800 text-white'
          : 'border-brand-100 bg-white'
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-4xl ${
            featured ? 'bg-white/20' : 'bg-brand-50'
          }`}
        >
          {quest.npcEmoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {quest.isBoss && (
              <span className="rounded-full bg-rose-500 px-2.5 py-0.5 font-display text-[11px] font-extrabold text-white">
                BOSS
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 font-body-x text-[11px] ${
                featured ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-600'
              }`}
            >
              {STATUS_LABEL[quest.status]}
            </span>
          </div>

          <h3 className={`mt-1.5 font-display text-xl font-extrabold ${featured ? '' : 'text-brand-900'}`}>
            {quest.title}
          </h3>
          <p className={`mt-1 font-body text-sm font-bold ${featured ? 'text-white/90' : 'text-brand-500'}`}>
            {quest.story}
          </p>
          {quest.course && (
            <p className={`mt-2 font-body-x text-[12px] ${featured ? 'text-white/75' : 'text-brand-400'}`}>
              Teaches: {quest.course.title}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`font-display text-sm font-extrabold ${featured ? 'text-amber-200' : 'text-amber-600'}`}>
          +{quest.xpReward} XP
        </span>
        <span className={`font-display text-sm font-extrabold ${featured ? 'text-white/90' : 'text-brand-600'}`}>
          +{quest.coinReward} 🪙
        </span>
        {onStart && !done && (
          <Button
            className="ml-auto"
            variant={featured ? 'grass' : 'primary'}
            onClick={() => onStart(quest)}
            disabled={isStarting || quest.status === 'LOCKED'}
          >
            {isStarting ? 'Starting…' : quest.status === 'IN_PROGRESS' ? 'Continue quest →' : 'Start quest →'}
          </Button>
        )}
        {done && <span className="ml-auto font-display font-extrabold text-grass-500">✓ Completed</span>}
      </div>
    </article>
  );
}
