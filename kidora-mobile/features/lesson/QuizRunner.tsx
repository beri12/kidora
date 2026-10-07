import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/charts';
import { Screen, ScreenHeader } from '@/components/layout';
import { QuestionView } from '@/components/lms';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar, Text } from '@/components/ui';
import { useQuiz, useStartQuiz, useSubmitQuiz } from '@/hooks/lms';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { colors, spacing } from '@/theme';
import type { QuizAnswer, QuizAttempt, QuizResult } from '@/types';

export interface QuizRunnerProps {
  quizId: string;
  lessonId?: string;
  courseId?: string;
  /** pre-started attempt (exams) */
  attempt?: QuizAttempt;
  isExam?: boolean;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** One-question-at-a-time quiz with timer, hints and a celebratory result screen. */
export function QuizRunner({ quizId, lessonId, courseId, attempt: preStarted, isExam }: QuizRunnerProps) {
  const { t } = useT();
  const quiz = useQuiz(quizId);
  const start = useStartQuiz();
  const submit = useSubmitQuiz();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(preStarted ?? null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const questions = useMemo(() => quiz.data?.questions ?? [], [quiz.data]);
  const question = questions[index];
  const used = quiz.data?.attempts.filter((a) => a.status !== 'IN_PROGRESS').length ?? 0;
  const max = quiz.data?.maxAttempts ?? null;
  const outOfAttempts = max !== null && used >= max && !quiz.data?.attempts.some((a) => a.status === 'IN_PROGRESS');

  const doSubmit = () => {
    if (!attempt || submit.isPending) return;
    submit.mutate({ attemptId: attempt.id, answers: Object.values(answers), quizId }, { onSuccess: setResult });
  };

  // Countdown for timed quizzes; auto-submit at zero.
  useEffect(() => {
    if (!attempt || !quiz.data?.timeLimitSec || result) return;
    const started = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Date.now();
    const tick = () => setRemaining(Math.max(0, Math.round((started + (quiz.data?.timeLimitSec ?? 0) * 1000 - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [attempt, quiz.data?.timeLimitSec, result]);

  useEffect(() => {
    if (remaining === 0 && !result) doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  if (quiz.isLoading) {
    return (
      <Screen tone="playful">
        <LoadingState />
      </Screen>
    );
  }
  if (quiz.isError || !quiz.data) {
    return (
      <Screen tone="playful">
        <ScreenHeader title="" back />
        <ErrorState error={quiz.error} onRetry={() => void quiz.refetch()} />
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen tone="playful" testID="quiz-result">
        <ScreenHeader title={quiz.data.title} />
        <Card tone="playful" style={styles.result}>
          <ProgressRing value={result.percent} size={140} thickness={14} color={result.passed ? colors.success : colors.secondary} label={t('student.quiz.score', { percent: result.percent })} />
          <Text variant="h2" align="center">
            {result.needsManual ? t('student.quiz.review') : result.passed ? t('student.quiz.passed') : t('student.quiz.failed')}
          </Text>
          <Text color="textMuted">{t('student.quiz.score', { percent: result.percent })}</Text>
          {isExam && result.certificate ? <Badge label={t('student.exam.certificate')} tone="accent" icon="ribbon" /> : null}
        </Card>
        <Button
          label={t('common.continue')}
          variant="game"
          size="lg"
          fullWidth
          onPress={() => (lessonId && courseId ? go(`/(student)/lesson/${lessonId}?courseId=${courseId}`) : router.back())}
        />
      </Screen>
    );
  }

  if (!attempt) {
    return (
      <Screen tone="playful" testID="quiz-intro">
        <ScreenHeader title={quiz.data.title} back />
        {quiz.data.description ? <Text color="textMuted">{quiz.data.description}</Text> : null}
        <View style={styles.badges}>
          <Badge label={t('teacher.quizzes.questions', { count: questions.length })} tone="brand" />
          {quiz.data.timeLimitSec ? <Badge label={formatTime(quiz.data.timeLimitSec)} tone="warning" icon="timer" /> : null}
          {max !== null ? <Badge label={t('student.quiz.attemptsLeft', { count: Math.max(0, max - used) })} tone="neutral" /> : null}
        </View>
        {outOfAttempts ? <EmptyState emoji="🔁" title={t('student.quiz.noAttempts')} /> : null}
        {start.isError ? <ErrorState error={start.error} /> : null}
        <Button
          label={t('student.quiz.start')}
          variant="game"
          size="lg"
          fullWidth
          disabled={outOfAttempts || questions.length === 0}
          loading={start.isPending}
          onPress={() => start.mutate({ quizId }, { onSuccess: setAttempt })}
          testID="start-quiz"
        />
      </Screen>
    );
  }

  if (!question) return null;
  const isLast = index === questions.length - 1;
  const answered = !!answers[question.id];

  return (
    <Screen tone="playful" testID="quiz-question">
      <ScreenHeader
        title={t('student.quiz.question', { current: index + 1, total: questions.length })}
        back
        right={remaining !== null ? <Badge label={t('student.quiz.timeLeft', { time: formatTime(remaining) })} tone={remaining < 30 ? 'danger' : 'warning'} icon="timer" /> : undefined}
      />
      <ProgressBar value={(index + 1) / questions.length} color={colors.secondary} />
      <QuestionView question={question} answer={answers[question.id]} onAnswer={(a) => setAnswers((prev) => ({ ...prev, [a.questionId]: a }))} />
      {question.hint ? (
        showHint ? (
          <Card tone="tinted" tint={colors.accentSoft}>
            <Text>{`💡 ${question.hint}`}</Text>
          </Card>
        ) : (
          <Button label={t('student.quiz.hint')} variant="ghost" icon="bulb" onPress={() => setShowHint(true)} />
        )
      ) : null}
      {submit.isError ? <ErrorState error={submit.error} /> : null}
      <View style={styles.nav}>
        {index > 0 ? <Button label={t('common.back')} variant="outline" onPress={() => { setIndex(index - 1); setShowHint(false); }} style={{ flex: 1 }} /> : null}
        {isLast ? (
          <Button label={t('student.quiz.submit')} variant="game" disabled={!answered} loading={submit.isPending} onPress={doSubmit} style={{ flex: 1 }} testID="submit-quiz" />
        ) : (
          <Button label={t('common.next')} disabled={!answered} onPress={() => { setIndex(index + 1); setShowHint(false); }} style={{ flex: 1 }} testID="next-question" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: { alignItems: 'center', gap: spacing.md },
  badges: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  nav: { flexDirection: 'row', gap: spacing.md },
});
