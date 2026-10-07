import { View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';
import type { ParentDashboard } from '@/types';

export function InsightsCard({ insights }: { insights: ParentDashboard['insights'] }) {
  const { t } = useT();
  return (
    <Card style={{ gap: spacing.md }}>
      <Text variant="h3">{t('parent.dashboard.strengths')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {insights.strengths.length ? insights.strengths.map((s) => <Badge key={s} label={s} tone="success" icon="trending-up" />) : <Text color="textMuted">—</Text>}
      </View>
      <Text variant="h3">{t('parent.dashboard.needsPractice')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {insights.needsPractice.length ? insights.needsPractice.map((s) => <Badge key={s} label={s} tone="warning" icon="fitness" />) : <Text color="textMuted">—</Text>}
      </View>
      {insights.tip ? <Text color="textMuted">{`💡 ${insights.tip}`}</Text> : null}
    </Card>
  );
}
