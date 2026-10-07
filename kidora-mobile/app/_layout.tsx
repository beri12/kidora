import '../global.css';
import '@/components/game/renderers';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/providers/AppProviders';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors } from '@/theme';

export { ErrorBoundary } from '@/components/layout/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const hydrated = useSettingsStore((s) => s.hydrated);

  useEffect(() => {
    if (status !== 'restoring' && hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [status, hydrated]);

  const authed = status === 'authenticated';

  // Each role group is only *registered* for its own role: a student can't
  // navigate into (teacher) even by URL. Backend authorization still applies.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!authed}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={authed && role === 'STUDENT'}>
        <Stack.Screen name="(student)" />
      </Stack.Protected>
      <Stack.Protected guard={authed && role === 'PARENT'}>
        <Stack.Screen name="(parent)" />
      </Stack.Protected>
      <Stack.Protected guard={authed && role === 'TEACHER'}>
        <Stack.Screen name="(teacher)" />
      </Stack.Protected>
      <Stack.Protected guard={authed && role === 'SCHOOL_LEADER'}>
        <Stack.Screen name="(school-leader)" />
      </Stack.Protected>
      <Stack.Protected guard={authed && role === 'DISTRICT_LEADER'}>
        <Stack.Screen name="(district-leader)" />
      </Stack.Protected>
      <Stack.Protected guard={authed}>
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProviders>
  );
}
