import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { qk } from '@/lib/query-keys';
import { schoolService } from '@/services/school.service';
import type { ClassSummary, DateRange, PaginatedResponse } from '@/types';

export function useSchoolDashboard(range: DateRange = 'week') {
  return useQuery({ queryKey: qk.school.dashboard(range), queryFn: () => schoolService.dashboard(range), placeholderData: (p) => p });
}

export function useSchoolAnalytics(range: DateRange = 'month') {
  return useQuery({
    queryKey: qk.school.analytics(range),
    queryFn: () => {
      const from = new Date();
      from.setDate(from.getDate() - (range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 90 : 365));
      return schoolService.analytics({ from: from.toISOString() });
    },
  });
}

function pager<T>(last: PaginatedResponse<T>): number | undefined {
  return last.page * last.pageSize < last.total ? last.page + 1 : undefined;
}

export function useSchoolStudents(search: string) {
  return useInfiniteQuery({
    queryKey: qk.school.students(search),
    queryFn: ({ pageParam }) => schoolService.students({ page: pageParam, pageSize: 30, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: pager,
  });
}

export function useSchoolTeachers(search: string) {
  return useInfiniteQuery({
    queryKey: qk.school.teachers(search),
    queryFn: ({ pageParam }) => schoolService.teachers({ page: pageParam, pageSize: 30, search: search || undefined }),
    initialPageParam: 1,
    getNextPageParam: pager,
  });
}

export function useSchoolClasses() {
  return useQuery({
    queryKey: qk.school.classes,
    queryFn: async (): Promise<ClassSummary[]> => {
      const res = await schoolService.classes({ page: 1, pageSize: 100 });
      return Array.isArray(res) ? res : res.items;
    },
  });
}

export function useSchoolCourses(status?: string) {
  return useInfiniteQuery({
    queryKey: qk.school.courses(status),
    queryFn: ({ pageParam }) => schoolService.courses({ page: pageParam, pageSize: 30, status }),
    initialPageParam: 1,
    getNextPageParam: pager,
  });
}

export function useReviewCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) => schoolService.reviewCourse(id, approve, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school', 'courses'] }),
  });
}
