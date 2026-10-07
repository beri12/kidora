import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { Avatar, ListRow, SearchBar } from '@/components/ui';
import { PagedList } from '@/features/dashboard';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { useDistrictTeachers } from '@/hooks/district';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';

export default function DistrictTeachers() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useDistrictTeachers(useDebounced(search));
  return (
    <Screen scroll={false} testID="district-teachers">
      <ScreenHeader title={t('nav.teachers')} back />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      {q.isError && !q.data ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <PagedList
          query={q}
          keyOf={(x) => x.id}
          renderItem={(x) => (
            <ListRow
              title={x.name}
              subtitle={[x.subject, t('school.teachers.classes', { count: x.classCount }), t('school.teachers.students', { count: x.studentCount })].filter(Boolean).join(' · ')}
              left={<Avatar name={x.name} uri={x.avatarUrl} size={40} />}
            />
          )}
        />
      )}
    </Screen>
  );
}
