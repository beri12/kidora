import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, Badge, Card, ListRow, Text } from '@/components/ui';
import { useTeacherDashboard } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/theme';

export default function TeacherProfile() {
  const { t } = useT();
  const user = useAuthStore((s) => s.user);
  const dash = useTeacherDashboard();
  return (
    <Screen testID="teacher-profile">
      <ScreenHeader title={t('common.profile')} />
      <Card style={{ alignItems: 'center', gap: spacing.md }}>
        <Avatar name={user?.name} uri={user?.avatarUrl} color={user?.avatarColor} size={88} />
        <Text variant="h2">{user?.name}</Text>
        {user?.email ? <Text color="textMuted">{user.email}</Text> : null}
        {dash.data?.profile.subject ? <Badge label={dash.data.profile.subject} tone="info" /> : null}
        {user?.school?.name ? <Badge label={user.school.name} tone="neutral" icon="school" /> : null}
      </Card>
      <Card style={{ padding: spacing.sm }}>
        <ListRow title={t('nav.students')} left={<Text>🧑‍🎓</Text>} onPress={() => go('/(teacher)/students')} />
        <ListRow title={t('nav.quizzes')} left={<Text>❓</Text>} onPress={() => go('/(teacher)/quizzes')} />
        <ListRow title={t('common.notifications')} left={<Text>🔔</Text>} onPress={() => go('/(teacher)/notifications')} />
      </Card>
      <ListRow title={t('common.settings')} left={<Text>⚙️</Text>} onPress={() => go('/modal/settings')} />
    </Screen>
  );
}
