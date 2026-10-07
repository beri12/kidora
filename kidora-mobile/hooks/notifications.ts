import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { runOrQueue } from '@/features/offline/sync';
import { qk } from '@/lib/query-keys';
import { notificationService } from '@/services/notification.service';
import type { NotificationPage } from '@/types';

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: qk.notifications,
    queryFn: ({ pageParam }) => notificationService.list(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

function patchRead(data: InfiniteData<NotificationPage> | undefined, id: string | 'all') {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((p) => ({
      ...p,
      unread: id === 'all' ? 0 : Math.max(0, p.unread - (p.items.some((n) => n.id === id && !n.read) ? 1 : 0)),
      items: p.items.map((n) => (id === 'all' || n.id === id ? { ...n, read: true } : n)),
    })),
  };
}

/** Optimistic and offline-safe. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => runOrQueue({ type: 'notification.read', notificationId: id }),
    onMutate: (id) => {
      qc.setQueryData<InfiniteData<NotificationPage>>(qk.notifications, (d) => patchRead(d, id));
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationService.markAllRead,
    onMutate: () => qc.setQueryData<InfiniteData<NotificationPage>>(qk.notifications, (d) => patchRead(d, 'all')),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}
