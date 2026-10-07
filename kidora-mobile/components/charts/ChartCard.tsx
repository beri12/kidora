import type { ReactNode } from 'react';

import { Card, EmptyState, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';

/** Titled card wrapper with a built-in empty state. */
export function ChartCard({ title, children, empty }: { title: string; children: ReactNode; empty?: boolean }) {
  const { t } = useT();
  return (
    <Card style={{ gap: spacing.md }}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {empty ? <EmptyState emoji="📊" title={t('analytics.noData')} /> : children}
    </Card>
  );
}
