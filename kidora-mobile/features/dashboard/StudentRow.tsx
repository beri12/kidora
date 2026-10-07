import { memo } from 'react';
import { View } from 'react-native';

import { Avatar, Badge, ListRow, type BadgeTone } from '@/components/ui';
import { useT } from '@/hooks/useT';
import type { ClassStudent, StudentHealth } from '@/types';

const TONE: Record<StudentHealth, BadgeTone> = { ON_TRACK: 'success', NEEDS_SUPPORT: 'warning', AT_RISK: 'danger' };

function StudentRowBase({ student, onPress }: { student: ClassStudent; onPress?: () => void }) {
  const { t } = useT();
  const subtitle = [student.className, `${t('teacher.class.completion')} ${Math.round(student.progressPercent)}%`, `${t('teacher.class.averageScore')} ${Math.round(student.averageScore)}%`]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      title={student.name}
      subtitle={subtitle}
      onPress={onPress}
      left={<Avatar name={student.name} uri={student.avatarUrl} color={student.avatarColor} size={40} />}
      right={
        <View>
          <Badge label={t(`teacher.health.${student.health}`)} tone={TONE[student.health]} />
        </View>
      }
    />
  );
}

export const StudentRow = memo(StudentRowBase);
