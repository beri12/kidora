import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Text } from '@/components/ui';
import { spacing } from '@/theme';

export function AuthShell({ title, subtitle, children, back = true }: { title: string; subtitle?: string; children: ReactNode; back?: boolean }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tone="playful">
        <ScreenHeader title={title} back={back} />
        {subtitle ? <Text color="textMuted">{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, body: { gap: spacing.lg } });
