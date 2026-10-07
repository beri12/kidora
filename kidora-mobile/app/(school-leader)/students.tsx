import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { SearchBar } from '@/components/ui';
import { PagedList, StudentRow } from '@/features/dashboard';
import { useSchoolStudents } from '@/hooks/school';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';

export default function SchoolStudents() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useSchoolStudents(useDebounced(search));
  return (
    <Screen scroll={false} testID="school-students">
      <ScreenHeader title={t('nav.students')} />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      <PagedList query={q} keyOf={(s) => s.id} renderItem={(s) => <StudentRow student={s} />} />
    </Screen>
  );
}
