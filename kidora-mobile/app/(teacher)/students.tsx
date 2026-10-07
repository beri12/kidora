import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { SearchBar } from '@/components/ui';
import { PagedList, StudentRow } from '@/features/dashboard';
import { useTeacherStudents } from '@/hooks/teacher';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';

export default function TeacherStudents() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useTeacherStudents(useDebounced(search));
  return (
    <Screen scroll={false} testID="teacher-students">
      <ScreenHeader title={t('nav.students')} back />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      <PagedList query={q} keyOf={(s) => s.id} renderItem={(s) => <StudentRow student={s} onPress={() => go(`/(teacher)/student/${s.id}`)} />} />
    </Screen>
  );
}
