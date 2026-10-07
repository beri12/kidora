import { View } from 'react-native';

import { CelebrationOverlay } from '@/components/game';
import { RoleGate, RoleTabs } from '@/components/layout';
import { useT } from '@/hooks/useT';

export default function StudentLayout() {
  const { t } = useT();
  return (
    <RoleGate role="STUDENT">
      <View style={{ flex: 1 }}>
        <RoleTabs
          playful
          tabs={[
            { name: 'index', title: t('nav.home'), icon: 'home' },
            { name: 'islands', title: t('nav.islands'), icon: 'map' },
            { name: 'ai-tutor', title: t('nav.kai'), icon: 'sparkles' },
            { name: 'rewards', title: t('nav.rewards'), icon: 'gift' },
            { name: 'profile', title: t('nav.me'), icon: 'person-circle' },
          ]}
          hidden={['dashboard', 'island/[id]', 'lesson/[id]', 'activity/[id]', 'quiz/[id]', 'exam/[id]', 'achievements', 'leaderboard', 'settings', 'notifications']}
          fullscreen={['lesson/[id]', 'activity/[id]', 'quiz/[id]', 'exam/[id]']}
        />
        <CelebrationOverlay />
      </View>
    </RoleGate>
  );
}
