import { RoleGate, RoleTabs } from '@/components/layout';
import { useT } from '@/hooks/useT';

export default function TeacherLayout() {
  const { t } = useT();
  return (
    <RoleGate role="TEACHER">
      <RoleTabs
        tabs={[
          { name: 'dashboard', title: t('nav.dashboard'), icon: 'grid' },
          { name: 'classes', title: t('nav.classes'), icon: 'people' },
          { name: 'assignments', title: t('nav.assignments'), icon: 'document-text' },
          { name: 'analytics', title: t('nav.analytics'), icon: 'analytics' },
          { name: 'profile', title: t('common.profile'), icon: 'person-circle' },
        ]}
        hidden={['class/[id]', 'students', 'student/[id]', 'quizzes', 'notifications']}
      />
    </RoleGate>
  );
}
