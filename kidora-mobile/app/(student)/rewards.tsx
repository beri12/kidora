import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuestCard, RewardCard } from '@/components/game';
import { Screen, ScreenHeader } from '@/components/layout';
import { Card, EmptyState, ErrorState, LoadingState, SectionHeader, SegmentedControl, Text, useToast } from '@/components/ui';
import { usePurchase, useShop, useWallet } from '@/hooks/game';
import { useClaimQuest, useQuests } from '@/hooks/student';
import { useResponsive } from '@/hooks/useResponsive';
import { useT } from '@/hooks/useT';
import { analytics } from '@/features/analytics/track';
import { colors, spacing } from '@/theme';
import { formatNumber } from '@/utils/format';

export default function Rewards() {
  const { t, locale } = useT();
  const toast = useToast();
  const { columns } = useResponsive();
  const wallet = useWallet();
  const quests = useQuests();
  const shop = useShop();
  const claim = useClaimQuest();
  const purchase = usePurchase();
  const [kind, setKind] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const coins = wallet.data?.coins ?? 0;

  const refresh = () => {
    void wallet.refetch();
    void quests.refetch();
    void shop.refetch();
  };

  return (
    <Screen tone="playful" onRefresh={refresh} refreshing={wallet.isRefetching} testID="rewards-screen">
      <ScreenHeader title={t('student.rewards.title')} />
      <Card tone="tinted" tint={colors.accentSoft} style={styles.wallet}>
        <Text style={styles.chest}>💰</Text>
        <View style={{ flex: 1 }}>
          <Text variant="label" color="textMuted">
            {t('student.rewards.wallet')}
          </Text>
          {wallet.isLoading ? (
            <Text>{t('common.loading')}</Text>
          ) : (
            <Text variant="h1">{`🪙 ${formatNumber(coins, locale)}`}</Text>
          )}
          {wallet.data ? <Text color="textMuted">{`⭐ ${formatNumber(wallet.data.xp, locale)} XP · ${t('common.level', { level: wallet.data.level })}`}</Text> : null}
        </View>
      </Card>

      <SectionHeader title={t('student.rewards.quests')} />
      <SegmentedControl
        value={kind}
        onChange={setKind}
        segments={[
          { value: 'DAILY', label: t('student.rewards.daily') },
          { value: 'WEEKLY', label: t('student.rewards.weekly') },
        ]}
      />
      {quests.isLoading ? (
        <LoadingState cards={2} />
      ) : quests.isError && !quests.data ? (
        <ErrorState error={quests.error} onRetry={() => void quests.refetch()} />
      ) : (
        (quests.data ?? [])
          .filter((q) => q.kind === kind)
          .map((q) => <QuestCard key={q.id} quest={q} onClaim={(x) => claim.mutate(x.id)} claiming={claim.isPending && claim.variables === q.id} />)
      )}

      <SectionHeader title={t('student.rewards.shop')} />
      {shop.isLoading ? (
        <LoadingState cards={1} />
      ) : !shop.data?.length ? (
        <EmptyState emoji="🛍️" title={t('common.comingSoon')} />
      ) : (
        <View style={styles.grid}>
          {shop.data.map((r) => (
            <View key={r.id} style={{ width: `${100 / columns - 3}%` }}>
              <RewardCard
                reward={r}
                coins={coins}
                buying={purchase.isPending && purchase.variables === r.id}
                onBuy={(item) =>
                  purchase.mutate(item.id, {
                    onSuccess: () => {
                      toast.show(t('student.rewards.purchased'), 'success');
                      analytics.track('reward_claimed', { rewardId: item.id, kind: 'shop' });
                    },
                    onError: () => toast.show(t('errors.unknown'), 'error'),
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  chest: { fontSize: 52, lineHeight: 62 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
