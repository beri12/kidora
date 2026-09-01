import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type {
  Grade,
  LmsCourse,
  Paged,
  School,
  SchoolClass,
  SchoolDashboard,
  SchoolPerformance,
  SchoolPerson,
} from '@/types';

// Everything here hits /schools/me — the API resolves the school from the
// session, so the client never sends (or could forge) a schoolId.
const KEY = ['school'] as const;

export function useMySchool() {
  return useQuery({
    queryKey: [...KEY, 'me'],
    queryFn: async () => (await api.get<School>('/schools/me')).data,
  });
}

export function useSchoolDashboard() {
  return useQuery({
    queryKey: [...KEY, 'dashboard'],
    queryFn: async () => (await api.get<SchoolDashboard>('/schools/me/dashboard')).data,
  });
}

export interface RosterQuery {
  q?: string;
  gradeId?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}

export function useSchoolStudents(params: RosterQuery = {}) {
  return useQuery({
    queryKey: [...KEY, 'students', params],
    queryFn: async () => (await api.get<Paged<SchoolPerson>>('/schools/me/students', { params })).data,
  });
}

export function useSchoolTeachers(params: RosterQuery = {}) {
  return useQuery({
    queryKey: [...KEY, 'teachers', params],
    queryFn: async () => (await api.get<Paged<SchoolPerson>>('/schools/me/teachers', { params })).data,
  });
}

export function useGrades() {
  return useQuery({
    queryKey: [...KEY, 'grades'],
    queryFn: async () => (await api.get<Grade[]>('/schools/me/grades')).data,
  });
}

export function useCreateGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; level?: number }) =>
      (await api.post<Grade>('/schools/me/grades', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'grades'] }),
  });
}

export function useDeleteGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/schools/me/grades/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'grades'] }),
  });
}

export function useClasses(params: RosterQuery = {}) {
  return useQuery({
    queryKey: [...KEY, 'classes', params],
    queryFn: async () => (await api.get<SchoolClass[]>('/schools/me/classes', { params })).data,
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; gradeId?: string; homeroomTeacherId?: string; academicYear?: string }) =>
      (await api.post<SchoolClass>('/schools/me/classes', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'classes'] }),
  });
}

export function useClassRoster(classId?: string) {
  return useQuery({
    queryKey: [...KEY, 'roster', classId],
    enabled: !!classId,
    queryFn: async () =>
      (await api.get<{ id: string; student: SchoolPerson }[]>(`/schools/me/classes/${classId}/students`)).data,
  });
}

export function useAddClassStudents(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (studentIds: string[]) =>
      (await api.post(`/schools/me/classes/${classId}/students`, { studentIds })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'roster', classId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'classes'] });
    },
  });
}

export function useSetStudentGrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, gradeId }: { studentId: string; gradeId?: string }) =>
      (await api.patch(`/schools/me/students/${studentId}/grade`, { gradeId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'students'] }),
  });
}

export function useSchoolCourses(params: RosterQuery & { status?: string; teacherId?: string } = {}) {
  return useQuery({
    queryKey: [...KEY, 'courses', params],
    queryFn: async () => (await api.get<LmsCourse[]>('/schools/me/courses', { params })).data,
  });
}

export function useSchoolPerformance() {
  return useQuery({
    queryKey: [...KEY, 'performance'],
    queryFn: async () => (await api.get<SchoolPerformance>('/analytics/school')).data,
  });
}
