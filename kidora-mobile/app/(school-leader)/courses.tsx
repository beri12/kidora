import { useState } from 'react';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, Button, ListRow, SegmentedControl, useToast } from '@/components/ui';
import { PagedList } from '@/features/dashboard';
import { useReviewCourse, useSchoolCourses } from '@/hooks/school';
import { useT } from '@/hooks/useT';
import { spacing } from '@/theme';

export default function SchoolCourses() {
  const { t } = useT();
  const toast = useToast();
  const [status, setStatus] = useState<string>('all');
  const q = useSchoolCourses(status === 'all' ? undefined : status);
  const review = useReviewCourse();
  return (
    <Screen scroll={false} testID="school-courses">
      <ScreenHeader title={t('nav.courses')} back />
      <SegmentedControl
        value={status}
        onChange={setStatus}
        segments={[
          { value: 'all', label: t('common.all') },
          { value: 'PUBLISHED', label: t('school.courses.published') },
          { value: 'REVIEW', label: t('school.courses.review') },
          { value: 'DRAFT', label: t('school.courses.draft') },
        ]}
      />
      <PagedList
        query={q}
        keyOf={(c) => c.id}
        renderItem={(c) => (
          <View style={{ gap: spacing.xs }}>
            <ListRow
              title={c.title}
              subtitle={[c.subject, c.grade, c.teacher, t('school.courses.lessons', { count: c.totalLessons })].filter(Boolean).join(' · ')}
              right={<Badge label={c.status} tone={c.status === 'PUBLISHED' ? 'success' : c.status === 'REVIEW' ? 'warning' : 'neutral'} />}
            />
            {c.status === 'REVIEW' ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button label={t('school.courses.approve')} size="sm" icon="checkmark" onPress={() => review.mutate({ id: c.id, approve: true }, { onSuccess: () => toast.show(t('common.saved'), 'success') })} />
                <Button label={t('school.courses.reject')} size="sm" variant="outline" onPress={() => review.mutate({ id: c.id, approve: false }, { onSuccess: () => toast.show(t('common.saved'), 'success') })} />
              </View>
            ) : null}
          </View>
        )}
      />
    </Screen>
  );
}
