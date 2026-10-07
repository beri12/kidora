import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { Button, Card, ErrorState, Text } from '@/components/ui';
import { QuizRunner } from '@/features/lesson/QuizRunner';
import { useStartQuiz } from '@/hooks/lms';
import { useT } from '@/hooks/useT';
import { colors } from '@/theme';
import type { QuizAttempt } from '@/types';

/** Final exam (the island "boss"): start an exam attempt, then run its quiz. */
export default function ExamScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const start = useStartQuiz();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  if (attempt) return <QuizRunner quizId={attempt.quizId} attempt={attempt} isExam />;

  return (
    <Screen tone="playful" testID="exam-screen">
      <ScreenHeader title={t('student.exam.title')} back />
      <Card tone="tinted" tint={colors.accentSoft}>
        <Text style={{ fontSize: 56, lineHeight: 68 }} align="center">
          🏆
        </Text>
        <Text align="center">{t('student.exam.rules')}</Text>
      </Card>
      {start.isError ? <ErrorState error={start.error} /> : null}
      <Button
        label={t('student.exam.start')}
        variant="game"
        size="lg"
        fullWidth
        loading={start.isPending}
        onPress={() => start.mutate({ examId: id }, { onSuccess: setAttempt })}
      />
    </Screen>
  );
}
