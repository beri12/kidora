import { memo } from 'react';
import { View } from 'react-native';

import { CourseCard } from '@/components/lms';
import { SectionHeader } from '@/components/ui';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';
import { spacing } from '@/theme';
import type { StudentCourse } from '@/types';

/** Most recently active courses that have completed lessons. */
function RecentlyCompletedBase({ courses }: { courses: StudentCourse[] }) {
  const { t } = useT();
  const recent = courses
    .filter((c) => c.lessonsCompleted > 0)
    .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
    .slice(0, 3);
  if (!recent.length) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t('student.dashboard.recentlyCompleted')} />
      {recent.map((c) => (
        <CourseCard key={c.id} course={c} onPress={() => (c.currentLesson ? go(`/(student)/lesson/${c.currentLesson.id}?courseId=${c.id}`) : undefined)} />
      ))}
    </View>
  );
}

export const RecentlyCompleted = memo(RecentlyCompletedBase);
