import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { SubjectCard } from '@/components/lms';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, ListRow, LoadingState, SegmentedControl, Text } from '@/components/ui';
import { ActivityFeed } from '@/features/dashboard';
import { useOwnChild } from '@/features/parent/useOwnChild';
import { useChildAchievements, useChildActivity, useChildAssessments, useChildProgress } from '@/hooks/parent';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

type Tab = 'progress' | 'performance' | 'activity' | 'achievements';

export default function ChildProfile() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const own = useOwnChild(id);
  const [tab, setTab] = useState<Tab>('progress');
  const progress = useChildProgress(own.child ? id : '');
  const assessments = useChildAssessments(own.child && tab === 'performance' ? id : '');
  const activity = useChildActivity(own.child && tab === 'activity' ? id : '');
  const achievements = useChildAchievements(own.child && tab === 'achievements' ? id : '');

  if (own.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (own.forbidden || !own.child) {
    return (
      <Screen>
        <ScreenHeader title="" back />
        {own.error ? <ErrorState error={own.error} /> : <EmptyState emoji="🔒" title={t('errors.forbidden')} />}
      </Screen>
    );
  }
  const c = own.child;

  return (
    <Screen testID="child-profile">
      <ScreenHeader title={c.displayName ?? c.name} subtitle={[c.grade, c.className, c.schoolName].filter(Boolean).join(' · ')} back />
      <Card style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Avatar name={c.name} uri={c.avatarUrl} color={c.avatarColor} size={64} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Button label={t('parent.child.viewProgress')} size="sm" variant="secondary" icon="trending-up" onPress={() => go(`/(parent)/progress/${id}`)} />
          <Button label={t('parent.child.viewReport')} size="sm" variant="outline" icon="document-text" onPress={() => go(`/(parent)/reports/${id}`)} />
        </View>
      </Card>
      <SegmentedControl
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'progress', label: t('parent.child.progress') },
          { value: 'performance', label: t('parent.child.performance') },
          { value: 'activity', label: t('parent.child.activity') },
          { value: 'achievements', label: t('parent.child.achievements') },
        ]}
      />
      {tab === 'progress' ? (
        progress.isLoading ? <LoadingState cards={2} /> : (progress.data ?? []).map((s) => <SubjectCard key={s.subject} subject={s.subject} percent={s.percent} accent={s.accent} />)
      ) : null}
      {tab === 'performance' ? (
        assessments.isLoading ? (
          <LoadingState cards={2} />
        ) : (
          <>
            <Text variant="h3">{t('parent.child.quizzes')}</Text>
            {(assessments.data?.quizzes ?? []).map((q) => (
              <ListRow key={q.id} title={q.title} subtitle={q.course ?? undefined} right={q.bestPercent !== null ? <Badge label={`${q.bestPercent}%`} tone={q.bestPercent >= 80 ? 'success' : q.bestPercent >= 60 ? 'info' : 'warning'} /> : undefined} />
            ))}
            <Text variant="h3">{t('parent.child.exams')}</Text>
            {(assessments.data?.exams ?? []).map((e) => (
              <ListRow key={e.id} title={e.title} subtitle={e.course} right={e.result ? <Badge label={`${e.result.percent}%`} tone={e.result.passed ? 'success' : 'warning'} /> : undefined} />
            ))}
          </>
        )
      ) : null}
      {tab === 'activity' ? (
        activity.isLoading ? (
          <LoadingState cards={2} />
        ) : (
          <>
            <ActivityFeed items={activity.data?.pages.flatMap((p) => p.items) ?? []} />
            {activity.hasNextPage ? <Button label={t('common.seeAll')} variant="ghost" onPress={() => void activity.fetchNextPage()} loading={activity.isFetchingNextPage} /> : null}
          </>
        )
      ) : null}
      {tab === 'achievements' ? (
        achievements.isLoading ? (
          <LoadingState cards={2} />
        ) : (
          (achievements.data ?? []).filter((a) => a.unlockedAt).map((a) => <ListRow key={a.id} title={a.title} subtitle={a.description} left={<Text>🏅</Text>} />)
        )
      ) : null}
    </Screen>
  );
}
