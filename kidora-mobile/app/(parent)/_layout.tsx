import { RoleGate, RoleTabs } from '@/components/layout';
import { useT } from '@/hooks/useT';

export default function ParentLayout() {
  const { t } = useT();
  return (
    <RoleGate role="PARENT">
      <RoleTabs
        tabs={[
          { name: 'dashboard', title: t('nav.dashboard'), icon: 'stats-chart' },
          { name: 'children', title: t('nav.children'), icon: 'people' },
          { name: 'settings', title: t('common.settings'), icon: 'settings' },
        ]}
        hidden={['child/[id]', 'progress/[id]', 'reports/[id]']}
      />
    </RoleGate>
  );
}
