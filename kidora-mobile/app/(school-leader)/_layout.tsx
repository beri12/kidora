import { RoleGate, RoleTabs } from '@/components/layout';
import { useT } from '@/hooks/useT';

export default function SchoolLeaderLayout() {
  const { t } = useT();
  return (
    <RoleGate role="SCHOOL_LEADER">
      <RoleTabs
        tabs={[
          { name: 'dashboard', title: t('nav.dashboard'), icon: 'business' },
          { name: 'students', title: t('nav.students'), icon: 'people' },
          { name: 'teachers', title: t('nav.teachers'), icon: 'person' },
          { name: 'analytics', title: t('nav.analytics'), icon: 'analytics' },
          { name: 'reports', title: t('nav.reports'), icon: 'document-text' },
        ]}
        hidden={['classes', 'courses', 'settings']}
      />
    </RoleGate>
  );
}
