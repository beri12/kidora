import type { PropsWithChildren } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';

import { AuthProvider } from './AuthProvider';
import { I18nProvider } from './I18nProvider';
import { NetworkProvider } from './NetworkProvider';
import { NotificationsProvider } from './NotificationsProvider';
import { QueryProvider } from './QueryProvider';

/** Provider order matters: query cache → auth (needs cache) → network/sync (needs auth) → push. */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <I18nProvider>
            <ToastProvider>
              <AuthProvider>
                <NetworkProvider>
                  <NotificationsProvider>{children}</NotificationsProvider>
                </NetworkProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
