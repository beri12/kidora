import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, ProgressBar, Text } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, radius, spacing, subjectAccents } from '@/theme';
import type { StudentCourse } from '@/types';

function CourseCardBase({ course, onPress }: { course: StudentCourse; onPress?: () => void }) {
  const { t } = useT();
  const dataSaver = useSettingsStore((s) => s.dataSaver);
  const accent = course.subjectAccent ?? subjectAccents[course.subject] ?? colors.primary;
  return (
    <Card onPress={onPress} accessibilityLabel={`${course.title}, ${course.subject}, ${course.progressPercent}%`} style={styles.card}>
      <View style={[styles.thumb, { backgroundColor: `${accent}22` }]}>
        {course.thumbnailUrl && !dataSaver ? (
          <Image source={{ uri: course.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="disk" transition={150} />
        ) : (
          <Text style={styles.letter} color="text">
            {course.subject.slice(0, 1)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="tiny" color="textMuted">
          {course.subject}
        </Text>
        <Text variant="bodyStrong" numberOfLines={2}>
          {course.title}
        </Text>
        <ProgressBar value={course.progressPercent / 100} color={accent} height={6} />
        <Text variant="tiny" color="textMuted">
          {t('common.of', { current: course.lessonsCompleted, total: course.totalLessons })}
        </Text>
      </View>
    </Card>
  );
}

export const CourseCard = memo(CourseCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
});
