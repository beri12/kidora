import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '@/lib/errors';
import { qk } from '@/lib/query-keys';
import { teacherService } from '@/services/teacher.service';
import type { DateRange } from '@/types';

export function useTeacherDashboard(range: DateRange = 'week') {
  return useQuery({ queryKey: qk.teacher.dashboard(range), queryFn: () => teacherService.dashboard(range), placeholderData: (p) => p });
}

export function useTeacherClasses() {
  return useQuery({ queryKey: qk.teacher.classes, queryFn: teacherService.classes });
}

export function useTeacherClass(id: string) {
  return useQuery({ queryKey: qk.teacher.class(id), queryFn: () => teacherService.classDetail(id), enabled: !!id });
}

export function useTeacherStudents(search: string, classId?: string) {
  return useInfiniteQuery({
    queryKey: qk.teacher.students(search, classId),
    queryFn: ({ pageParam }) => teacherService.students({ page: pageParam, pageSize: 30, search: search || undefined, classId }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

/**
 * Teacher → student drill-down. Roster facts come from /teacher/students
 * (authorised server-side); the analytics block uses API GAP #8 and degrades
 * gracefully when it is missing.
 */
export function useTeacherStudent(id: string) {
  const roster = useQuery({
    queryKey: qk.teacher.student(id),
    queryFn: async () => {
      const page = await teacherService.students({ page: 1, pageSize: 100 });
      return page.items.find((s) => s.id === id) ?? null;
    },
    enabled: !!id,
  });
  const analyticsQ = useQuery({
    queryKey: [...qk.teacher.student(id), 'analytics'],
    queryFn: () => teacherService.studentAnalytics(id),
    enabled: !!id,
    retry: (n, e) => !(isApiError(e) && e.kind === 'not_found') && n < 1,
  });
  return { roster, analytics: analyticsQ };
}

export function useTeacherAssignments() {
  return useInfiniteQuery({
    queryKey: qk.teacher.assignments,
    queryFn: ({ pageParam }) => teacherService.assignments({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherService.createAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.teacher.assignments }),
  });
}

export function useTeacherQuizzes() {
  return useInfiniteQuery({
    queryKey: qk.teacher.quizzes,
    queryFn: ({ pageParam }) => teacherService.quizzes({ page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
  });
}

export function useTeacherAnalytics(classId?: string) {
  return useQuery({ queryKey: qk.teacher.analytics(classId), queryFn: () => teacherService.analytics({ classId }) });
}
