'use client';
import Link from 'next/link';
import type { WorldSummary } from '@/types';

/**
 * The Kidora world map: a vertical trail of themed worlds, each one a real
 * subject with real course progress behind it.
 *
 * Rendered as an ordered list so it reads as a sequence to a screen reader, and
 * every world is a normal link — the trail decoration is purely visual.
 */
export function WorldMap({ worlds }: { worlds: WorldSummary[] }) {
  return (
    <ol className="relative mx-auto max-w-[760px] space-y-5">
      {worlds.map((world, i) => (
        <li key={world.slug} className="relative">
          {i < worlds.length - 1 && (
            <span
              aria-hidden
              className="absolute left-9 top-[92px] h-[calc(100%-72px)] w-1 rounded-full bg-brand-200/70"
            />
          )}

          <WorldTile world={world} index={i} />
        </li>
      ))}
    </ol>
  );
}

function WorldTile({ world, index }: { world: WorldSummary; index: number }) {
  const locked = world.locked;

  const inner = (
    <div
      className={`relative flex items-center gap-4 rounded-[28px] border-2 p-5 shadow-card ${
        locked ? 'border-brand-100 bg-white/70' : 'border-transparent text-white'
      }`}
      style={
        locked
          ? undefined
          : { background: `linear-gradient(135deg, ${world.accent}, ${world.accent}CC)` }
      }
    >
      <span
        aria-hidden
        className={`grid h-[72px] w-[72px] shrink-0 place-items-center rounded-3xl text-[40px] ${
          locked ? 'bg-brand-100' : 'bg-white/20 motion-safe:animate-bob'
        }`}
        style={{ animationDelay: `${index * 0.25}s` }}
      >
        {locked ? '🔒' : world.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className={`font-display text-2xl font-extrabold ${locked ? 'text-brand-400' : ''}`}>
          {world.name}
        </h3>
        <p className={`font-body text-sm font-bold ${locked ? 'text-brand-400' : 'text-white/90'}`}>
          {locked
            ? 'Finish the world above to unlock this one'
            : `${world.npc.emoji} ${world.npc.name} · ${world.courseCount} ${
                world.courseCount === 1 ? 'adventure' : 'adventures'
              }`}
        </p>

        {!locked && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between font-display text-[12px] font-extrabold text-white/90">
              <span>Progress</span>
              <span>{world.percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={world.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${world.name} progress`}
              className="h-3 overflow-hidden rounded-full bg-white/25"
            >
              <div
                className="h-full rounded-full bg-white motion-safe:transition-all motion-safe:duration-700"
                style={{ width: `${world.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (locked) {
    return (
      <div aria-disabled className="cursor-not-allowed">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/learn/world/${world.slug}`}
      className="block rounded-[28px] outline-none motion-safe:transition-transform motion-safe:hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-brand-400"
    >
      {inner}
    </Link>
  );
}
