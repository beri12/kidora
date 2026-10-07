import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FloatingCharacter } from '@/components/game';
import { OfflineBanner } from '@/components/layout';
import { Badge, Button, ErrorState, IconButton, ScalePressable, SkeletonList, Text, useToast } from '@/components/ui';
import { ChatBubble } from '@/features/ai/ChatBubble';
import { ReportSheet } from '@/features/ai/ReportSheet';
import { VOICE_ENABLED } from '@/features/ai/voice';
import { analytics } from '@/features/analytics/track';
import { useAiTutor } from '@/hooks/ai';
import { useT } from '@/hooks/useT';
import type { TranslationKey } from '@/i18n';
import { useOfflineStore } from '@/store/offlineStore';
import { colors, MAX_FONT_SCALE, MIN_TOUCH, radius, spacing, typography } from '@/theme';
import type { AIMessage, AiKind } from '@/types';

const QUICK: { key: TranslationKey; kind: AiKind }[] = [
  { key: 'ai.quick.simple', kind: 'EXPLAIN' },
  { key: 'ai.quick.hint', kind: 'HINT' },
  { key: 'ai.quick.example', kind: 'PRACTICE' },
  { key: 'ai.quick.wrong', kind: 'MISTAKE' },
];

export default function AiTutor() {
  const { lessonId, courseId, topic } = useLocalSearchParams<{ lessonId?: string; courseId?: string; topic?: string }>();
  const { t } = useT();
  const toast = useToast();
  const online = useOfflineStore((s) => s.isOnline);
  const tutor = useAiTutor({ lessonId, courseId });
  const [text, setText] = useState(topic ? `${topic}: ` : '');
  const [reporting, setReporting] = useState<AIMessage | null>(null);
  const list = useRef<FlatList<AIMessage>>(null);

  useEffect(() => {
    analytics.track('ai_tutor_opened', { source: lessonId ? 'lesson' : 'tab' });
  }, [lessonId]);

  const send = (kind: AiKind, message?: string) => {
    const body = (message ?? text).trim();
    if (!body) return;
    tutor.ask(body, { kind });
    setText('');
  };

  const greeting: AIMessage = { id: 'greeting', role: 'assistant', content: t('ai.greeting'), createdAt: '' };
  const messages = [greeting, ...tutor.messages];

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="ai-tutor-screen">
      <OfflineBanner />
      <View style={styles.header}>
        <FloatingCharacter emoji="🦊" size={44} label="Kai" />
        <View style={{ flex: 1 }}>
          <Text variant="h2" accessibilityRole="header">
            {t('ai.title')}
          </Text>
          <Text variant="caption" color="textMuted">
            {t('ai.subtitle')}
          </Text>
        </View>
        {tutor.remainingToday !== null ? <Badge label={t('ai.remaining', { count: tutor.remainingToday })} tone="info" /> : null}
      </View>
      <Text variant="tiny" color="textMuted" style={styles.safety}>
        {`🛡️ ${t('ai.safety')}`}
      </Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        {tutor.isLoadingHistory ? (
          <View style={{ padding: spacing.lg }}>
            <SkeletonList rows={3} />
          </View>
        ) : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <ChatBubble message={item} onReport={item.id === 'greeting' ? undefined : setReporting} onRetry={item.failed ? tutor.retry : undefined} />
            )}
            ListFooterComponent={
              tutor.isThinking ? (
                <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
                  {`🦊 ${t('ai.thinking')}`}
                </Text>
              ) : tutor.error ? (
                <ErrorState error={tutor.error} onRetry={tutor.retry} />
              ) : null
            }
          />
        )}

        <View style={styles.composer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {QUICK.map((p) => (
              <ScalePressable key={p.key} onPress={() => send(p.kind, t(p.key))} accessibilityLabel={t(p.key)} style={styles.quick} disabled={!online}>
                <Text variant="label" color="primary">
                  {t(p.key)}
                </Text>
              </ScalePressable>
            ))}
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={(v) => setText(v.slice(0, 2000))}
              placeholder={online ? t('ai.placeholder') : t('ai.offline')}
              placeholderTextColor={colors.textSubtle}
              accessibilityLabel={t('ai.placeholder')}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              editable={online}
              multiline
              style={styles.input}
              testID="ai-input"
            />
            <IconButton
              icon="mic"
              label={t('ai.voiceSoon')}
              onPress={() => toast.show(t('ai.voiceSoon'), 'info')}
              background={colors.surfaceMuted}
              color={VOICE_ENABLED ? 'primary' : 'textSubtle'}
            />
          </View>
          <View style={styles.actions}>
            <Button label={t('ai.ask')} size="sm" icon="send" onPress={() => send('TUTOR')} disabled={!online || !text.trim()} loading={tutor.isThinking} style={{ flex: 1 }} testID="ai-ask" />
            <Button label={t('ai.hint')} size="sm" variant="secondary" onPress={() => send('HINT', text || t('ai.quick.hint'))} disabled={!online} style={{ flex: 1 }} />
            <Button label={t('ai.explain')} size="sm" variant="secondary" onPress={() => send('EXPLAIN', text || t('ai.quick.simple'))} disabled={!online} style={{ flex: 1 }} />
            <Button label={t('ai.example')} size="sm" variant="secondary" onPress={() => send('PRACTICE', text || t('ai.quick.example'))} disabled={!online} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <ReportSheet
        visible={!!reporting}
        onClose={() => setReporting(null)}
        onSubmit={(reason) => {
          if (reporting) {
            tutor.report.mutate({ messageId: reporting.id.replace(/:a$/, ''), reason });
            toast.show(t('ai.reported'), 'success');
          }
          setReporting(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundPlayful },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  safety: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  list: { padding: spacing.lg, gap: spacing.md },
  composer: { padding: spacing.md, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  quick: { paddingHorizontal: spacing.md, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    minHeight: MIN_TOUCH,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
