import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { qk } from '@/lib/query-keys';
import { parentService } from '@/services/parent.service';
import type { DateRange } from '@/types';

export function useParentChildren() {
  return useQuery({ queryKey: qk.parent.children, queryFn: parentService.children });
}

export function useParentDashboard(childId: string | undefined, range: DateRange = 'week') {
  return useQuery({
    queryKey: qk.parent.dashboard(childId, range),
    queryFn: () => parentService.dashboard(childId, range),
    placeholderData: (prev) => prev,
  });
}

export function useChildProgress(childId: string) {
  return useQuery({ queryKey: qk.parent.progress(childId), queryFn: () => parentService.progress(childId), enabled: !!childId });
}

export function useChildAssessments(childId: string) {
  return useQuery({ queryKey: qk.parent.assessments(childId), queryFn: () => parentService.assessments(childId), enabled: !!childId });
}

export function useChildAchievements(childId: string) {
  return useQuery({ queryKey: qk.parent.achievements(childId), queryFn: () => parentService.achievements(childId), enabled: !!childId });
}

export function useChildActivity(childId: string) {
  return useInfiniteQuery({
    queryKey: qk.parent.activity(childId),
    queryFn: ({ pageParam }) => parentService.activity(childId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    enabled: !!childId,
  });
}
