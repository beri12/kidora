import { useQuery } from '@tanstack/react-query';

import { qk } from '@/lib/query-keys';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';

/** Fresh /auth/me (e.g. after role approval). The session principal lives in authStore. */
export function useCurrentUser() {
  const status = useAuthStore((s) => s.status);
  return useQuery({
    queryKey: qk.me,
    queryFn: () => authService.getCurrentUser(),
    enabled: status === 'authenticated',
    staleTime: 5 * 60_000,
  });
}
