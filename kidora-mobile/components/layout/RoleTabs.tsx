import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/tabs';
import type { ComponentProps } from 'react';

import { colors } from '@/theme';

export interface TabSpec {
  name: string;
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

/**
 * Tab navigator shared by every role. `tabs` are visible; every other route
 * in the group stays reachable but hidden from the bar. `fullscreen` routes
 * (lesson player, quiz…) hide the bar entirely.
 */
export function RoleTabs({ tabs, hidden, fullscreen = [], playful = false }: { tabs: TabSpec[]; hidden: string[]; fullscreen?: string[]; playful?: boolean }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: playful ? colors.secondary : colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarAllowFontScaling: true,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: playful ? 64 : 56 },
        lazy: true,
      }}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color} size={playful ? size + 4 : size} />,
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null, tabBarStyle: fullscreen.includes(name) ? { display: 'none' } : undefined }} />
      ))}
    </Tabs>
  );
}

