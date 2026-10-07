import { Redirect } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { Screen } from '@/components/layout';
import { ROLE_HOME } from '@/lib/roles';
import { useAuthStore } from '@/store/authStore';

/** Entry: route to the right experience once the session is known. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);
  if (status === 'restoring') {
    return (
      <Screen scroll={false}>
        <LoadingState cards={2} />
      </Screen>
    );
  }
  if (status === 'authenticated' && role) return <Redirect href={ROLE_HOME[role] as never} />;
  if (status === 'unsupported') return <Redirect href="/(auth)/welcome?unsupported=1" />;
  return <Redirect href="/(auth)/welcome" />;
}
