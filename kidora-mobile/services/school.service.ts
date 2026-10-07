import type {
  ClassStudent,
  ClassSummary,
  DateRange,
  PaginatedResponse,
  SchoolAnalytics,
  SchoolCourse,
  SchoolDashboard,
  SchoolTeacher,
} from '@/types';

import { api } from './api';

interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const schoolService = {
  dashboard: (range: DateRange = 'week') => api.get<SchoolDashboard>('/school/dashboard', { range }),
  students: (params: ListParams & { gradeId?: string; classId?: string; status?: string }) =>
    api.get<PaginatedResponse<ClassStudent>>('/school/students', params),
  teachers: (params: ListParams) => api.get<PaginatedResponse<SchoolTeacher>>('/school/teachers', params),
  classes: (params: ListParams & { gradeId?: string }) =>
    api.get<PaginatedResponse<ClassSummary> | ClassSummary[]>('/school/classes', params),
  courses: (params: ListParams & { status?: string; subjectId?: string; gradeId?: string }) =>
    api.get<PaginatedResponse<SchoolCourse>>('/school/courses', params),
  reviewCourse: (id: string, approve: boolean, note?: string) =>
    api.patch<unknown>(`/school/courses/${id}/review`, { approve, note }),
  analytics: (params: { from?: string; to?: string }) => api.get<SchoolAnalytics>('/school/analytics', params),
};
