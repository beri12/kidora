import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, spacing } from '@/theme';

export interface LessonFooterProps {
  completed: boolean;
  completing: boolean;
  hasQuiz: boolean;
  hasNext: boolean;
  onComplete: () => void;
  onQuiz: () => void;
  onNext: () => void;
}

export function LessonFooter({ completed, completing, hasQuiz, hasNext, onComplete, onQuiz, onNext }: LessonFooterProps) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
      {!completed ? (
        <Button label={completing ? t('student.lesson.completing') : t('student.lesson.complete')} variant="game" size="lg" fullWidth loading={completing} icon="checkmark-circle" onPress={onComplete} testID="complete-lesson" />
      ) : (
        <View style={styles.row}>
          {hasQuiz ? <Button label={t('student.lesson.takeQuiz')} variant="secondary" icon="help-circle" onPress={onQuiz} style={{ flex: 1 }} /> : null}
          {hasNext ? <Button label={t('student.lesson.next')} variant="game" iconRight="arrow-forward" onPress={onNext} style={{ flex: 1 }} testID="next-lesson" /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', gap: spacing.md },
});
