import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AvatarPicker, DEFAULT_AVATAR_OPTIONS } from '@/components/game';
import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, Badge, BottomSheet, Button, Card, ErrorState, IconButton, ListRow, LoadingState, SectionHeader, StatCard, Text, useToast, XPBar } from '@/components/ui';
import { ControlledField } from '@/features/auth/ControlledField';
import { profileSchema } from '@/features/auth/schemas';
import { useAvatar, useAvatarItems, useSaveAvatar } from '@/hooks/game';
import { useAchievements, useCertificates, useStudentDashboard, useUpdateProfile } from '@/hooks/student';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing } from '@/theme';
import type { AvatarCategory, AvatarConfig } from '@/types';
import { firstName, formatDate } from '@/utils/format';

export default function Profile() {
  const { t, locale } = useT();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const dash = useStudentDashboard();
  const achievements = useAchievements();
  const certificates = useCertificates();
  const avatar = useAvatar();
  const saveAvatar = useSaveAvatar();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<AvatarCategory>('skin');
  const [draft, setDraft] = useState<AvatarConfig>({});
  const remoteItems = useAvatarItems(editing ? category : undefined);

  const form = useForm<{ displayName: string }>({ resolver: zodResolver(profileSchema), values: { displayName: dash.data?.profile.displayName ?? firstName(dash.data?.profile.name) } });

  if (dash.isLoading) {
    return (
      <Screen tone="playful">
        <LoadingState />
      </Screen>
    );
  }
  if (!dash.data) {
    return (
      <Screen tone="playful">
        <ErrorState error={dash.error} onRetry={() => void dash.refetch()} />
      </Screen>
    );
  }
  const p = dash.data.profile;
  const completedCourses = dash.data.courses.filter((c) => c.status === 'COMPLETED');
  const unlocked = (achievements.data ?? []).filter((a) => a.unlockedAt).length;
  const items = remoteItems.data?.length ? remoteItems.data : DEFAULT_AVATAR_OPTIONS[category];

  const saveName = form.handleSubmit(async ({ displayName }) => {
    await updateProfile.mutateAsync({ displayName });
    toast.show(t('common.saved'), 'success');
  });

  return (
    <Screen tone="playful" onRefresh={() => void dash.refetch()} refreshing={dash.isRefetching} testID="profile-screen">
      <ScreenHeader title={t('student.profile.title')} right={<IconButton icon="settings" label={t('common.settings')} onPress={() => go('/(student)/settings')} />} />
      <Card tone="playful" style={styles.hero}>
        <Avatar name={p.displayName ?? p.name} uri={p.avatarUrl} color={avatar.data?.color ?? p.avatarColor} size={96} ring={colors.accent} />
        <Text variant="h2">{p.displayName || firstName(p.name)}</Text>
        <View style={styles.badges}>
          {dash.data.courses[0]?.grade ? <Badge label={`${t('student.profile.grade')}: ${dash.data.courses[0].grade}`} tone="info" /> : null}
          {user?.school?.name ? <Badge label={user.school.name} tone="neutral" icon="school" /> : null}
        </View>
        <Button label={t('student.profile.editAvatar')} icon="color-palette" variant="secondary" onPress={() => { setDraft(avatar.data ?? {}); setEditing(true); }} />
      </Card>
      <Card tone="playful">
        <XPBar xp={p.xp} />
      </Card>
      <View style={styles.stats}>
        <StatCard label={t('parent.dashboard.coins')} value={`🪙 ${p.coins}`} />
        <StatCard label={t('parent.dashboard.streak')} value={`🔥 ${p.streak}`} />
        <StatCard label={t('student.achievements.title')} value={`🏅 ${unlocked}`} onPress={() => go('/(student)/achievements')} />
      </View>

      <Card>
        <ControlledField control={form.control} name="displayName" label={t('student.profile.displayName')} maxLength={60} />
        <Button label={t('common.save')} size="sm" loading={updateProfile.isPending} onPress={() => void saveName()} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
      </Card>

      <SectionHeader title={t('student.profile.completedCourses')} />
      {completedCourses.length ? (
        completedCourses.map((c) => <ListRow key={c.id} title={c.title} subtitle={c.subject} left={<Text>✅</Text>} />)
      ) : (
        <Text color="textMuted">{t('student.dashboard.noCourses')}</Text>
      )}

      <SectionHeader title={t('student.profile.certificates')} />
      {(certificates.data ?? []).length ? (
        (certificates.data ?? []).map((c) => <ListRow key={c.id} title={c.courseName ?? c.code} subtitle={formatDate(c.issuedAt, locale)} left={<Text>📜</Text>} />)
      ) : (
        <Text color="textMuted">{t('student.achievements.lockedHint')}</Text>
      )}

      <Button label={t('student.leaderboard.title')} icon="podium" variant="outline" onPress={() => go('/(student)/leaderboard')} />

      <BottomSheet visible={editing} onClose={() => setEditing(false)} title={t('student.avatar.title')}>
        <View style={{ alignItems: 'center' }}>
          <Avatar name={p.displayName ?? p.name} color={draft.color ?? p.avatarColor} size={88} emoji={items.find((i) => i.id === draft.expressions)?.emoji} />
        </View>
        <AvatarPicker category={category} onCategoryChange={setCategory} items={items} value={draft} onChange={setDraft} />
        <Button
          label={t('student.avatar.save')}
          variant="game"
          fullWidth
          loading={saveAvatar.isPending}
          onPress={() =>
            saveAvatar.mutate(draft, {
              onSuccess: () => {
                updateProfile.mutate({ avatarColor: draft.color });
                setEditing(false);
                toast.show(t('common.saved'), 'success');
              },
              onError: () => toast.show(t('errors.unknown'), 'error'),
            })
          }
        />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
