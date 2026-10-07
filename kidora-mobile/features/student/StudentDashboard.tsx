import { View } from 'react-native';

import { StreakWeek } from '@/components/game';
import { Screen } from '@/components/layout';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { useRecommendations, useStudentDashboard } from '@/hooks/student';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';

import { AchievementPreview } from './AchievementPreview';
import { AiTutorCard } from './AiTutorCard';
import { ContinueLearningCard } from './ContinueLearningCard';
import { DailyChallenge } from './DailyChallenge';
import { IslandPreview } from './IslandPreview';
import { LeaderboardPreview } from './LeaderboardPreview';
import { RecentlyCompleted } from './RecentlyCompleted';
import { RecommendedList } from './RecommendedList';
import { RewardsPreview } from './RewardsPreview';
import { StudentHeader } from './StudentHeader';
import { XPProgress } from './XPProgress';

/** Composition only — each section is its own small, memoised component. */
export function StudentDashboard() {
  const { t } = useT();
  const q = useStudentDashboard();
  const recs = useRecommendations();

  if (q.isLoading) {
    return (
      <Screen tone="playful">
        <LoadingState cards={4} />
      </Screen>
    );
  }
  if (q.isError && !q.data) {
    return (
      <Screen tone="playful">
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </Screen>
    );
  }
  const d = q.data;
  if (!d) return null;

  return (
    <Screen tone="playful" refreshing={q.isRefetching} onRefresh={() => void q.refetch()} testID="student-dashboard">
      <StudentHeader profile={d.profile} unread={d.unreadNotifications} />
      <XPProgress xp={d.profile.xp} />
      {d.adventure ? (
        <ContinueLearningCard adventure={d.adventure} />
      ) : (
        <EmptyState emoji="🧭" title={t('student.dashboard.noCourses')} body={t('student.dashboard.noCoursesBody')} actionLabel={t('nav.islands')} onAction={() => go('/(student)/islands')} />
      )}
      <Card tone="playful">
        <StreakWeek days={d.streakWeek} streak={d.profile.streak} />
      </Card>
      <RecommendedList items={recs.data} />
      <DailyChallenge quest={d.dailyQuest} />
      <IslandPreview worldKey={d.adventure?.world} />
      <AiTutorCard />
      <RecentlyCompleted courses={d.courses} />
      <AchievementPreview achievements={d.achievements} />
      <View style={{ gap: spacing.lg }}>
        <RewardsPreview coins={d.profile.coins} />
        <LeaderboardPreview entries={d.leaderboard.entries} />
      </View>
    </Screen>
  );
}
