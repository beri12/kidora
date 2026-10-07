import { useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner, ScreenHeader } from '@/components/layout';
import { ContentBlock, lessonState, VideoBlock } from '@/components/lms';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, Text, useToast } from '@/components/ui';
import { LessonFooter } from '@/features/lesson/LessonFooter';
import { useResolvedCourseId } from '@/features/lesson/useResolvedCourseId';
import { useCompleteLesson, useHasQueuedCompletion, useLesson, useLessonTimer } from '@/hooks/lms';
import { useResponsive } from '@/hooks/useResponsive';
import { useT } from '@/hooks/useT';
import { go, lessonHref } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import type { LessonContentItem } from '@/types';

export default function LessonScreen() {
  const { id = '', courseId: courseParam } = useLocalSearchParams<{ id: string; courseId?: string }>();
  const { courseId, resolving } = useResolvedCourseId(id, courseParam);
  const { t } = useT();
  const toast = useToast();
  const { contentWidth } = useResponsive();
  const q = useLesson(courseId, id);
  const complete = useCompleteLesson();
  const queued = useHasQueuedCompletion(id);
  const [percent, setPercent] = useState(0);
  const maxPercent = useRef(0);
  const elapsed = useLessonTimer(id, percent);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = Math.max(1, contentSize.height - layoutMeasurement.height);
    const p = Math.min(100, Math.round((contentOffset.y / scrollable) * 100));
    if (p > maxPercent.current + 4) {
      maxPercent.current = p;
      setPercent(p);
    }
  }, []);

  if (resolving || q.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.pad}>
          <LoadingState cards={3} />
        </View>
      </SafeAreaView>
    );
  }
  if (!courseId || (q.isError && !q.data)) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.pad}>
          <ScreenHeader title="" back />
          {q.error ? <ErrorState error={q.error} onRetry={() => void q.refetch()} /> : <EmptyState emoji="📚" title={t('errors.notFound')} />}
        </View>
      </SafeAreaView>
    );
  }
  const data = q.data;
  if (!data) return null;
  const { lesson, nav } = data;
  const completed = !!lesson.progress?.completed || queued || complete.data !== undefined;
  const state = lessonState({ completed, percent: lesson.progress?.percent ?? percent });

  const onComplete = () =>
    complete.mutate(
      { lessonId: lesson.id, courseId, timeSpentSec: elapsed() },
      {
        onSuccess: (res) => {
          if (res.queued) toast.show(t('student.lesson.queued'), 'info');
        },
        onError: () => toast.show(t('errors.unknown'), 'error'),
      },
    );

  const askKai = (item?: LessonContentItem) =>
    go(`/(student)/ai-tutor?lessonId=${encodeURIComponent(lesson.id)}&courseId=${encodeURIComponent(courseId)}${item ? `&topic=${encodeURIComponent(item.title ?? '')}` : ''}`);

  return (
    <SafeAreaView style={styles.root} edges={['top']} testID="lesson-screen">
      <OfflineBanner />
      <ScrollView onScroll={onScroll} scrollEventThrottle={250} contentContainerStyle={styles.scroll}>
        <View style={[styles.pad, { maxWidth: contentWidth, gap: spacing.xl }]}>
          <ScreenHeader title={lesson.title} subtitle={t('student.dashboard.lessonOf', { current: nav.index + 1, total: nav.total })} back />
          <View style={styles.badges}>
            <Badge label={t(`student.lesson.state.${state}`)} tone={state === 'COMPLETED' ? 'success' : 'info'} />
            {lesson.estimatedMin ? <Badge label={t('common.minutes', { count: lesson.estimatedMin })} tone="neutral" icon="time" /> : null}
          </View>
          {lesson.objectives?.length ? (
            <Card tone="tinted" tint={colors.accentSoft}>
              <Text variant="bodyStrong">{t('student.lesson.objectives')}</Text>
              {lesson.objectives.map((o) => (
                <Text key={o}>{`• ${o}`}</Text>
              ))}
            </Card>
          ) : null}
          {lesson.description ? <Text style={styles.reading}>{lesson.description}</Text> : null}
          {lesson.videoUrl && !lesson.contents.some((c) => c.type === 'VIDEO') ? <VideoBlock url={lesson.videoUrl} title={lesson.title} /> : null}
          {lesson.contents.map((item) =>
            item.type === 'INTERACTIVE' || item.type === 'QUESTION' ? (
              <Card key={item.id} tone="tinted" tint={colors.primarySoft} onPress={() => go(`/(student)/activity/${item.id}?lessonId=${lesson.id}&courseId=${courseId}`)} accessibilityLabel={item.title ?? t('student.activity.title')}>
                <Text variant="bodyStrong">{`🧩 ${item.title ?? t('student.activity.title')}`}</Text>
                <Text variant="caption" color="textMuted">
                  {t('common.start')}
                </Text>
              </Card>
            ) : (
              <ContentBlock key={item.id} item={item} onAskKai={askKai} />
            ),
          )}
          <Button label={t('student.lesson.askKai')} icon="sparkles" variant="secondary" onPress={() => askKai()} testID="ask-kai-lesson" />
        </View>
      </ScrollView>
      <LessonFooter
        completed={completed}
        completing={complete.isPending}
        hasQuiz={!!lesson.quiz}
        hasNext={!!nav.next}
        onComplete={onComplete}
        onQuiz={() => lesson.quiz && go(`/(student)/quiz/${lesson.quiz.id}?courseId=${courseId}&lessonId=${lesson.id}`)}
        onNext={() => nav.next && go(lessonHref(nav.next.id, courseId))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundPlayful },
  scroll: { alignItems: 'center', paddingBottom: spacing['3xl'] },
  pad: { width: '100%', alignSelf: 'center', padding: spacing.lg },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  reading: { fontSize: 18, lineHeight: 28 },
});
