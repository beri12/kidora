import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { isApiError } from '@/lib/errors';
import { qk } from '@/lib/query-keys';
import { districtService } from '@/services/district.service';
import type { DistrictFilters, PaginatedResponse } from '@/types';

/** District endpoints are API GAP #3: don't hammer a 404. */
const noRetryOn404 = (n: number, e: Error) => !(isApiError(e) && (e.kind === 'not_found' || e.kind === 'forbidden')) && n < 2;

function pager<T>(last: PaginatedResponse<T>): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

export function useDistrictAnalytics(filters: DistrictFilters = {}) {
  return useQuery({ queryKey: qk.district.dashboard(filters), queryFn: () => districtService.dashboard(filters), retry: noRetryOn404, placeholderData: (p) => p });
}

export function useDistrictSchools(search: string) {
  return useInfiniteQuery({
    queryKey: qk.district.schools(search),
    queryFn: ({ pageParam }) => districtService.schools({ page: pageParam, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: pager,
    retry: noRetryOn404,
  });
}

export function useDistrictSchool(id: string) {
  return useQuery({ queryKey: qk.district.school(id), queryFn: () => districtService.school(id), enabled: !!id, retry: noRetryOn404 });
}

export function useDistrictStudents(search: string) {
  return useInfiniteQuery({
    queryKey: qk.district.students(search),
    queryFn: ({ pageParam }) => districtService.students({ page: pageParam, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: pager,
    retry: noRetryOn404,
  });
}

export function useDistrictTeachers(search: string) {
  return useInfiniteQuery({
    queryKey: qk.district.teachers(search),
    queryFn: ({ pageParam }) => districtService.teachers({ page: pageParam, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: pager,
    retry: noRetryOn404,
  });
}

export function isEndpointMissing(error: unknown): boolean {
  return isApiError(error) && error.kind === 'not_found';
}
