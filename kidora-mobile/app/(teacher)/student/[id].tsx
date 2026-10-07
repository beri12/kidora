import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ProgressRing } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, Badge, Card, EmptyState, ErrorState, LoadingState, Text } from '@/components/ui';
import { KpiGrid } from '@/features/dashboard';
import { isEndpointMissing } from '@/hooks/district';
import { useTeacherStudent } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';
import { formatMinutes } from '@/utils/format';

export default function TeacherStudent() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t, locale } = useT();
  const { roster, analytics } = useTeacherStudent(id);
  const s = roster.data;
  const a = analytics.data;

  if (roster.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!s) {
    return (
      <Screen>
        <ScreenHeader title="" back />
        {roster.error ? <ErrorState error={roster.error} onRetry={() => void roster.refetch()} /> : <EmptyState emoji="🔒" title={t('errors.notFound')} />}
      </Screen>
    );
  }

  return (
    <Screen testID="teacher-student">
      <ScreenHeader title={s.name} subtitle={[s.grade, s.className].filter(Boolean).join(' · ')} back />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Avatar name={s.name} uri={s.avatarUrl} size={64} />
        <ProgressRing value={s.progressPercent} label={t('teacher.student.completionRate')} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="label" color="textMuted">
            {t('teacher.student.averageScore')}
          </Text>
          <Text variant="h2">{`${Math.round(s.averageScore)}%`}</Text>
          <Badge label={t(`teacher.health.${s.health}`)} tone={s.health === 'ON_TRACK' ? 'success' : s.health === 'AT_RISK' ? 'danger' : 'warning'} />
        </View>
      </Card>
      {analytics.isLoading ? (
        <LoadingState cards={1} />
      ) : a ? (
        <>
          <KpiGrid
            locale={locale}
            items={[
              { label: t('teacher.student.completionRate'), kpi: { value: a.completionRate, unit: 'percent' }, icon: 'checkmark-done' },
              { label: t('teacher.student.averageScore'), kpi: { value: a.averageScore, unit: 'percent' }, icon: 'ribbon' },
              { label: t('teacher.student.engagement'), kpi: { value: a.engagement, unit: 'percent' }, icon: 'pulse' },
            ]}
          />
          <Card style={{ gap: spacing.sm }}>
            <Text variant="bodyStrong">{`${t('teacher.student.timeSpent')}: ${formatMinutes(a.timeSpentMin)}`}</Text>
            <Text variant="h3">{t('teacher.student.strongTopics')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {a.strongTopics.map((x) => (
                <Badge key={x} label={x} tone="success" />
              ))}
            </View>
            <Text variant="h3">{t('teacher.student.weakTopics')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {a.weakTopics.map((x) => (
                <Badge key={x} label={x} tone="warning" />
              ))}
            </View>
          </Card>
        </>
      ) : isEndpointMissing(analytics.error) ? (
        <Card tone="tinted" tint={colors.infoSoft}>
          <Text>{t('teacher.student.analyticsUnavailable')}</Text>
        </Card>
      ) : analytics.error ? (
        <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
      ) : null}
    </Screen>
  );
}
