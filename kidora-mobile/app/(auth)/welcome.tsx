import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FloatingCharacter, IslandArt } from '@/components/game';
import { Screen } from '@/components/layout';
import { Button, Card, Text } from '@/components/ui';
import { useReducedMotionPref } from '@/hooks/useReducedMotionPref';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';

export default function Welcome() {
  const { t } = useT();
  const reduced = useReducedMotionPref();
  const { unsupported } = useLocalSearchParams<{ unsupported?: string }>();
  return (
    <Screen tone="playful" contentStyle={styles.content} testID="welcome-screen">
      <View style={styles.hero}>
        <IslandArt accent={colors.primary} emoji="🏝️" size={150} />
        <View style={styles.kai}>
          <FloatingCharacter emoji="🦊" size={56} label="Kai" />
        </View>
      </View>
      <Animated.View entering={reduced ? undefined : FadeInDown.springify()} style={styles.copy}>
        <Text variant="display" align="center" color="primary">
          {t('common.appName')}
        </Text>
        <Text variant="h2" align="center">
          {t('auth.welcome.title')}
        </Text>
        <Text align="center" color="textMuted">
          {t('auth.welcome.subtitle')}
        </Text>
      </Animated.View>
      {unsupported ? (
        <Card tone="tinted" tint={colors.warningSoft}>
          <Text variant="bodyStrong">{t('auth.unsupported.title')}</Text>
          <Text color="textMuted">{t('auth.unsupported.body')}</Text>
        </Card>
      ) : null}
      <View style={styles.actions}>
        <Button label={t('auth.welcome.getStarted')} variant="game" size="lg" fullWidth onPress={() => go('/(auth)/register')} testID="get-started" />
        <Button label={t('auth.welcome.haveAccount')} variant="outline" fullWidth onPress={() => go('/(auth)/login')} testID="go-login" />
        <Button label={t('languages.title')} variant="ghost" icon="language" onPress={() => go('/modal/language')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', flexGrow: 1 },
  hero: { alignItems: 'center', marginTop: spacing['2xl'] },
  kai: { position: 'absolute', right: '18%', bottom: 0 },
  copy: { gap: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
