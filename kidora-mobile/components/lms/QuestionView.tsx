import { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import { ScalePressable, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { colors, KID_TOUCH, MAX_FONT_SCALE, radius, spacing, typography } from '@/theme';
import type { QuizAnswer, QuizQuestion } from '@/types';

export interface QuestionViewProps {
  question: QuizQuestion;
  answer: QuizAnswer | undefined;
  onAnswer: (answer: QuizAnswer) => void;
}

/** Big, tappable answers for small fingers. Supports MCQ, true/false, multi-select, short answer, matching. */
function QuestionViewBase({ question, answer, onAnswer }: QuestionViewProps) {
  const { t } = useT();
  const selected = answer?.selected ?? [];
  const multi = question.type === 'MULTIPLE_SELECT';
  const options = question.type === 'TRUE_FALSE' && question.options.length === 0 ? [t('student.quiz.trueLabel'), t('student.quiz.falseLabel')] : question.options;

  const toggle = (i: number) => {
    const next = multi ? (selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]) : [i];
    onAnswer({ questionId: question.id, selected: next });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="h2" accessibilityRole="header">
        {question.prompt}
      </Text>
      {question.imageUrl ? <Image source={{ uri: question.imageUrl }} style={styles.image} contentFit="contain" cachePolicy="disk" /> : null}

      {question.type === 'SHORT_ANSWER' ? (
        <TextInput
          value={answer?.answerText ?? ''}
          onChangeText={(text) => onAnswer({ questionId: question.id, answerText: text.slice(0, 2000) })}
          placeholder={t('student.quiz.typeAnswer')}
          placeholderTextColor={colors.textSubtle}
          accessibilityLabel={t('student.quiz.typeAnswer')}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          multiline
          style={styles.input}
        />
      ) : question.type === 'MATCHING' ? (
        <MatchingView question={question} answer={answer} onAnswer={onAnswer} />
      ) : (
        <View style={{ gap: spacing.md }} accessibilityRole={multi ? undefined : 'radiogroup'}>
          {options.map((opt, i) => {
            const isOn = selected.includes(i);
            return (
              <ScalePressable
                key={`${question.id}-${i}`}
                onPress={() => toggle(i)}
                accessibilityRole={multi ? 'checkbox' : 'radio'}
                accessibilityState={multi ? { checked: isOn } : { selected: isOn }}
                accessibilityLabel={opt}
                style={[styles.option, isOn && styles.optionOn]}
                testID={`option-${i}`}
              >
                <View style={[styles.bullet, isOn && styles.bulletOn]}>
                  <Text variant="label" color={isOn ? 'onPrimary' : 'textMuted'}>
                    {String.fromCharCode(65 + i)}
                  </Text>
                </View>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {opt}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Matching: tap a right-hand item for each left-hand prompt (answers sent as text in left order). */
function MatchingView({ question, answer, onAnswer }: QuestionViewProps) {
  const lefts = question.matchLefts ?? [];
  const rights = question.matchRights ?? [];
  const chosen = (answer?.answerText ?? '').split('\n');
  return (
    <View style={{ gap: spacing.md }}>
      {lefts.map((left, li) => (
        <View key={li} style={{ gap: spacing.sm }}>
          <Text variant="bodyStrong">{left}</Text>
          <View style={styles.wrapRow}>
            {rights.map((right, ri) => {
              const on = chosen[li] === right;
              return (
                <ScalePressable
                  key={ri}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${left}: ${right}`}
                  onPress={() => {
                    const next = lefts.map((_, i) => (i === li ? right : (chosen[i] ?? '')));
                    onAnswer({ questionId: question.id, answerText: next.join('\n') });
                  }}
                  style={[styles.chip, on && styles.optionOn]}
                >
                  <Text variant="label">{right}</Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export const QuestionView = memo(QuestionViewBase);

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: KID_TOUCH + 8,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  bullet: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  bulletOn: { backgroundColor: colors.primary },
  input: {
    ...typography.body,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
});
