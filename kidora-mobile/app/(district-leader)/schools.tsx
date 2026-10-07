import { useState } from 'react';

import { Screen, ScreenHeader } from '@/components/layout';
import { SearchBar } from '@/components/ui';
import { PagedList } from '@/features/dashboard';
import { DistrictError } from '@/features/district/DistrictUnavailable';
import { SchoolCompareCard } from '@/features/district/SchoolCompareCard';
import { useDistrictSchools } from '@/hooks/district';
import { useDebounced } from '@/hooks/useDebounced';
import { useT } from '@/hooks/useT';
import { go } from '@/lib/navigation';

export default function DistrictSchools() {
  const { t } = useT();
  const [search, setSearch] = useState('');
  const q = useDistrictSchools(useDebounced(search));
  return (
    <Screen scroll={false} testID="district-schools">
      <ScreenHeader title={t('nav.schools')} />
      <SearchBar value={search} onChangeText={setSearch} placeholder={t('common.search')} />
      {q.isError && !q.data ? (
        <DistrictError error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <PagedList query={q} keyOf={(s) => s.id} renderItem={(s) => <SchoolCompareCard school={s} onPress={() => go(`/(district-leader)/school/${s.id}`)} />} />
      )}
    </Screen>
  );
}
