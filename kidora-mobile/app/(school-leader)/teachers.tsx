import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, Badge, ListRow, SearchBar } from '@/components/ui';
import { PagedList } from '@/features/dashboard';
import { useSchoolTeachers } from '@/hooks/school';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';

export default function SchoolTeachers() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useSchoolTeachers(useDebounced(search));
  return (
    <Screen scroll={false} testID="school-teachers">
      <ScreenHeader title={t('nav.teachers')} />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      <PagedList
        query={q}
        keyOf={(x) => x.id}
        renderItem={(x) => (
          <ListRow
            title={x.name}
            subtitle={[x.subject, t('school.teachers.classes', { count: x.classCount }), t('school.teachers.students', { count: x.studentCount })].filter(Boolean).join(' · ')}
            left={<Avatar name={x.name} uri={x.avatarUrl} size={40} />}
            right={x.verified ? <Badge label={t('school.teachers.verified')} tone="success" icon="checkmark" /> : undefined}
          />
        )}
      />
    </Screen>
  );
}
