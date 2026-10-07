import { memo } from 'react';

import { IslandCard } from '@/components/game';
import { SectionHeader } from '@/components/ui';
import { useIslands } from '@/hooks/game';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';

function IslandPreviewBase({ worldKey }: { worldKey?: string }) {
  const { t } = useT();
  const { data } = useIslands();
  const island = data?.find((i) => i.key === worldKey) ?? data?.find((i) => i.unlocked);
  if (!island) return null;
  return (
    <>
      <SectionHeader title={t('student.dashboard.currentIsland')} onSeeAll={() => go('/(student)/islands')} />
      <IslandCard island={island} onPress={(i) => go(`/(student)/island/${i.key}`)} />
    </>
  );
}

export const IslandPreview = memo(IslandPreviewBase);
