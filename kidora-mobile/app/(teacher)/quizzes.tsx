import { Screen, ScreenHeader } from '@/components/layout';
import { Badge, ListRow } from '@/components/ui';
import { PagedList } from '@/features/dashboard';
import { useTeacherQuizzes } from '@/hooks/teacher';
import { useT } from '@/hooks/useT';

export default function TeacherQuizzes() {
  const { t } = useT();
  const q = useTeacherQuizzes();
  return (
    <Screen scroll={false} testID="teacher-quizzes">
      <ScreenHeader title={t('teacher.quizzes.title')} back />
      <PagedList
        query={q}
        keyOf={(x) => x.id}
        emptyTitle={t('teacher.quizzes.empty')}
        renderItem={(x) => (
          <ListRow
            title={x.title}
            subtitle={[x.course, x.questionCount !== undefined ? t('teacher.quizzes.questions', { count: x.questionCount }) : null].filter(Boolean).join(' · ')}
            right={x.averagePercent !== undefined && x.averagePercent !== null ? <Badge label={`${Math.round(x.averagePercent)}%`} tone="info" /> : undefined}
          />
        )}
      />
    </Screen>
  );
}
