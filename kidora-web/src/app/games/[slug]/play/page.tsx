'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameShell } from '@/components/games/GameShell';

function Play({ slug }: { slug: string }) {
  const level = Math.max(1, Number(useSearchParams().get('level')) || 1);
  return <GameShell slug={slug} level={level} />;
}

/** Full-screen play: /games/<slug>/play?level=N */
export default function PlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={null}>
      <Play slug={slug} />
    </Suspense>
  );
}
