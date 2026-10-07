import { RoleGate, RoleTabs } from '@/components/layout';
import { useT } from '@/hooks/useT';

export default function DistrictLeaderLayout() {
  const { t } = useT();
  return (
    <RoleGate role="DISTRICT_LEADER">
      <RoleTabs
        tabs={[
          { name: 'dashboard', title: t('nav.dashboard'), icon: 'map' },
          { name: 'schools', title: t('nav.schools'), icon: 'business' },
          { name: 'analytics', title: t('nav.analytics'), icon: 'analytics' },
          { name: 'reports', title: t('nav.reports'), icon: 'document-text' },
          { name: 'settings', title: t('common.settings'), icon: 'settings' },
        ]}
        hidden={['school/[id]', 'students', 'teachers']}
      />
    </RoleGate>
  );
}
