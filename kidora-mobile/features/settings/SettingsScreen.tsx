import Constants from 'expo-constants';
import { StyleSheet, Switch, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Button, Card, ListRow, SectionHeader, Text } from '@/components/ui';
import { audio } from '@/features/audio/audio';
import { useUpdateUserSettings, useUserSettings } from '@/hooks/student';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthStore } from '@/store/authStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useSettingsStore, type SettingsState } from '@/store/settingsStore';
import { colors, MIN_TOUCH, spacing } from '@/theme';
import type { NotificationCategory } from '@/types';

type BoolKey = 'music' | 'soundEffects' | 'voice' | 'reduceMotion' | 'haptics' | 'dataSaver' | 'largeText';

function Toggle({ label, hint, value, onChange, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID?: string }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" color="textMuted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        accessibilityHint={hint}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor={colors.surface}
        testID={testID}
      />
    </View>
  );
}

const CATEGORIES_BY_ROLE: Record<string, NotificationCategory[]> = {
  STUDENT: ['lesson_reminder', 'assignment', 'achievement', 'level_up', 'new_course', 'teacher_announcement', 'school_announcement'],
  PARENT: ['parent_report', 'assignment', 'achievement', 'teacher_announcement', 'school_announcement'],
  TEACHER: ['assignment', 'new_course', 'school_announcement'],
  SCHOOL_LEADER: ['new_course', 'school_announcement'],
  DISTRICT_LEADER: ['school_announcement'],
};

/** Shared settings screen; sections adapt to the role. */
export function SettingsScreen() {
  const { t } = useT();
  const { logout } = useAuth();
  const role = useAuthStore((s) => s.user?.role ?? 'STUDENT');
  const settings = useSettingsStore();
  const prefs = useNotificationStore((s) => s.preferences);
  const setPref = useNotificationStore((s) => s.setPreference);
  const remote = useUserSettings();
  const updateRemote = useUpdateUserSettings();
  const isStudent = role === 'STUDENT';

  const set = (key: BoolKey) => (v: boolean) => {
    settings.set({ [key]: v } as Partial<SettingsState>);
    if (key === 'music' || key === 'voice' || key === 'soundEffects') audio.applySettings();
  };

  return (
    <Screen tone={isStudent ? 'playful' : 'professional'} testID="settings-screen">
      <ScreenHeader title={t('settings.title')} back />

      <SectionHeader title={t('settings.sound')} />
      <Card>
        <Toggle label={t('settings.music')} value={settings.music} onChange={set('music')} />
        <Toggle label={t('settings.soundEffects')} value={settings.soundEffects} onChange={set('soundEffects')} />
        <Toggle label={t('settings.voice')} value={settings.voice} onChange={set('voice')} />
      </Card>

      <SectionHeader title={t('settings.accessibility')} />
      <Card>
        <Toggle label={t('settings.reduceMotion')} hint={t('settings.reduceMotionHint')} value={settings.reduceMotion} onChange={set('reduceMotion')} testID="toggle-reduce-motion" />
        <Toggle label={t('settings.haptics')} value={settings.haptics} onChange={set('haptics')} />
        <Toggle label={t('settings.largeText')} value={settings.largeText} onChange={set('largeText')} />
        <Toggle label={t('settings.dataSaver')} hint={t('settings.dataSaverHint')} value={settings.dataSaver} onChange={set('dataSaver')} />
      </Card>

      <SectionHeader title={t('notifications.preferences')} />
      <Card>
        {(CATEGORIES_BY_ROLE[role] ?? []).map((c) => (
          <Toggle key={c} label={t(`notifications.categories.${c}`)} value={prefs[c]} onChange={(v) => setPref(c, v)} />
        ))}
        <Text variant="caption" color="textMuted">
          {t('notifications.critical')}
        </Text>
      </Card>

      {isStudent ? (
        <>
          <SectionHeader title={t('settings.privacy')} />
          <Card>
            <Toggle
              label={t('settings.leaderboardVisible')}
              value={remote.data?.leaderboardVisible ?? true}
              onChange={(v) => updateRemote.mutate({ leaderboardVisible: v })}
            />
          </Card>
        </>
      ) : null}

      <Card style={{ gap: spacing.xs, padding: spacing.sm }}>
        <ListRow title={t('settings.language')} left={<Text>🌍</Text>} onPress={() => go('/modal/language')} />
        <ListRow title={t('common.notifications')} left={<Text>🔔</Text>} onPress={() => go('/modal/notifications')} />
        <ListRow title={t('common.help')} left={<Text>❓</Text>} onPress={() => go('/modal/help')} />
      </Card>

      <Button label={t('common.signOut')} variant="danger" icon="log-out" fullWidth onPress={() => void logout()} testID="sign-out" />
      <Text variant="tiny" color="textSubtle" align="center">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH, paddingVertical: spacing.xs },
});
