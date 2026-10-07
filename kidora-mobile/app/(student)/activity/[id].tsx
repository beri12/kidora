import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { ContentBlock, plainText } from '@/components/lms';
import { Button, Card, EmptyState, LoadingState, ScalePressable, Text } from '@/components/ui';
import { analytics } from '@/features/analytics/track';
import { runOrQueue } from '@/features/offline/sync';
import { useLesson } from '@/hooks/lms';
import { useT } from '@/hooks/useT';
import { haptics } from '@/lib/haptics';
import { colors, KID_TOUCH, radius, spacing } from '@/theme';

interface ActivityMeta {
  options?: string[];
  answer?: number;
}

/**
 * Interactive activity step inside a lesson. Choice activities (options +
 * answer in the content's `meta`) are checked locally for instant feedback;
 * completion is recorded server-side (offline-queued).
 */
export default function ActivityScreen() {
  const { id = '', lessonId = '', courseId } = useLocalSearchParams<{ id: string; lessonId?: string; courseId?: string }>();
  const { t } = useT();
  const q = useLesson(courseId, lessonId);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);

  const item = q.data?.lesson.contents.find((c) => c.id === id);
  const meta = ((item as unknown as { meta?: ActivityMeta } | undefined)?.meta ?? {}) as ActivityMeta;
  const options = meta.options ?? [];

  const finish = () => {
    if (item) {
      void runOrQueue({ type: 'content.complete', contentItemId: item.id }).catch(() => undefined);
      analytics.track('activity_completed', { activityId: item.id, lessonId });
    }
    router.back();
  };

  const check = () => {
    if (choice === null) return;
    const ok = meta.answer === undefined || meta.answer === choice;
    setResult(ok ? 'correct' : 'incorrect');
    if (ok) haptics.success();
    else haptics.error();
  };

  if (q.isLoading) {
    return (
      <Screen tone="playful">
        <LoadingState />
      </Screen>
    );
  }
  if (!item) {
    return (
      <Screen tone="playful">
        <ScreenHeader title={t('student.activity.title')} back />
        <EmptyState emoji="🧩" title={t('errors.notFound')} />
      </Screen>
    );
  }

  return (
    <Screen tone="playful" testID="activity-screen">
      <ScreenHeader title={item.title ?? t('student.activity.title')} back />
      {options.length ? (
        <>
          <Text variant="h2">{plainText(item.body)}</Text>
          <View style={{ gap: spacing.md }} accessibilityRole="radiogroup">
            {options.map((o, i) => (
              <ScalePressable
                key={o}
                onPress={() => {
                  setChoice(i);
                  setResult(null);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: choice === i }}
                accessibilityLabel={o}
                style={{
                  minHeight: KID_TOUCH + 8,
                  justifyContent: 'center',
                  padding: spacing.md,
                  borderRadius: radius.xl,
                  borderWidth: 2,
                  borderColor: choice === i ? colors.primary : colors.border,
                  backgroundColor: choice === i ? colors.primarySoft : colors.surface,
                }}
              >
                <Text variant="bodyStrong">{o}</Text>
              </ScalePressable>
            ))}
          </View>
          {result ? (
            <Card tone="tinted" tint={result === 'correct' ? colors.successSoft : colors.warningSoft}>
              <Text variant="h3" accessibilityLiveRegion="assertive">
                {result === 'correct' ? t('student.activity.correct') : t('student.activity.incorrect')}
              </Text>
            </Card>
          ) : null}
          {result === 'correct' ? (
            <Button label={t('common.continue')} variant="game" size="lg" fullWidth onPress={finish} />
          ) : (
            <Button label={t('student.activity.check')} size="lg" fullWidth disabled={choice === null} onPress={check} />
          )}
        </>
      ) : (
        <>
          <ContentBlock item={{ ...item, type: 'TEXT' }} />
          <Button label={t('common.done')} variant="game" size="lg" fullWidth onPress={finish} />
        </>
      )}
    </Screen>
  );
}
