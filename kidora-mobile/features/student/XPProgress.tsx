import { memo } from 'react';

import { Card, XPBar } from '@/components/ui';
import { useGameStore } from '@/store/gameStore';

/** XP + level, including XP earned offline that hasn't synced yet. */
function XPProgressBase({ xp }: { xp: number }) {
  const pending = useGameStore((s) => s.pendingXp);
  return (
    <Card tone="playful">
      <XPBar xp={xp + pending} />
    </Card>
  );
}

export const XPProgress = memo(XPProgressBase);
