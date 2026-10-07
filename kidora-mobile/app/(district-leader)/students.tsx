import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { SearchBar } from '@/components/ui';
import { PagedList, StudentRow } from '@/features/dashboard';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { useDistrictStudents } from '@/hooks/district';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';

export default function DistrictStudents() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useDistrictStudents(useDebounced(search));
  return (
    <Screen scroll={false} testID="district-students">
      <ScreenHeader title={t('nav.students')} back />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      {q.isError && !q.data ? <DistrictError error={q.error} onRetry={() => void q.refetch()} /> : <PagedList query={q} keyOf={(s) => s.id} renderItem={(s) => <StudentRow student={s} />} />}
    </Screen>
  );
}
