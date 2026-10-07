import { FlatList, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Button, Card, EmptyState, ErrorState, Icon, SkeletonList, Text, type IconName } from '@/components/ui';
import { useMarkAllRead, useMarkNotificationRead, useNotifications } from '@/hooks/notifications';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing } from '@/theme';
import type { AppNotification, PushPayload } from '@/types';
import { formatDate } from '@/utils/format';

import { routeForPayload } from './routing';

const ICONS: Partial<Record<AppNotification['type'], IconName>> = {
  ACHIEVEMENT: 'trophy',
  BADGE: 'ribbon',
  LEVEL_UP: 'star',
  ASSIGNMENT_DUE: 'document-text',
  ASSIGNMENT_GRADED: 'checkmark-done',
  QUIZ_RESULT: 'help-circle',
  EXAM_SCHEDULED: 'calendar',
  NEW_COURSE: 'book',
  ANNOUNCEMENT: 'megaphone',
  MESSAGE: 'chatbubble',
  RISK_ALERT: 'warning',
  CERTIFICATE: 'ribbon',
};

export function NotificationsScreen({ back = true }: { back?: boolean }) {
  const { t, locale } = useT();
  const role = useAuthStore((s) => s.user?.role ?? 'STUDENT');
  const q = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = q.data?.pages[0]?.unread ?? 0;

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    const payload: PushPayload = { type: n.type, ...((n.meta ?? {}) as PushPayload) };
    const target = routeForPayload(payload, role);
    if (!target.endsWith('/notifications')) go(target);
  };

  return (
    <Screen tone={role === 'STUDENT' ? 'playful' : 'professional'} scroll={false} testID="notifications-screen">
      <ScreenHeader
        title={t('notifications.title')}
        back={back}
        right={unread > 0 ? <Button label={t('notifications.markAll')} size="sm" variant="ghost" onPress={() => markAll.mutate()} /> : undefined}
      />
      {q.isLoading ? (
        <SkeletonList rows={6} />
      ) : q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && void q.fetchNextPage()}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing['4xl'] }}
          ListEmptyComponent={<EmptyState emoji="🎉" title={t('notifications.empty')} />}
          renderItem={({ item }) => (
            <Card tone="dense" onPress={() => open(item)} accessibilityLabel={`${item.read ? '' : '• '}${item.title}. ${item.body}`} style={[styles.row, !item.read && styles.unread]}>
              <Icon name={ICONS[item.type] ?? 'notifications'} color={item.read ? 'textSubtle' : 'primary'} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" color="textMuted" numberOfLines={3}>
                  {item.body}
                </Text>
                <Text variant="tiny" color="textSubtle">
                  {formatDate(item.createdAt, locale)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  unread: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
