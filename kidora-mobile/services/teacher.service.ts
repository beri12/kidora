import type {
  ActivityItem,
  ClassDetail,
  ClassStudent,
  ClassSummary,
  DateRange,
  PaginatedResponse,
  TeacherAnalytics,
  TeacherAssignment,
  TeacherDashboard,
  TeacherQuiz,
  TeacherTask,
} from '@/types';

import { api } from './api';

export const teacherService = {
  dashboard: (range: DateRange = 'week') => api.get<TeacherDashboard>('/teacher/dashboard', { range }),
  classes: () => api.get<ClassSummary[]>('/teacher/classes'),
  classDetail: (id: string) => api.get<ClassDetail>(`/teacher/classes/${id}`),
  students: (params: { page?: number; pageSize?: number; search?: string; classId?: string }) =>
    api.get<PaginatedResponse<ClassStudent>>('/teacher/students', params),
  tasks: () => api.get<TeacherTask[]>('/teacher/tasks'),
  activity: (page = 1) => api.get<PaginatedResponse<ActivityItem>>('/teacher/activity', { page }),
  assignments: (params: { page?: number; classId?: string; status?: string }) =>
    api.get<PaginatedResponse<TeacherAssignment>>('/teacher/assignments', params),
  quizzes: (params: { page?: number; courseId?: string }) =>
    api.get<PaginatedResponse<TeacherQuiz>>('/teacher/quizzes', params),
  analytics: (params: { classId?: string; courseId?: string; from?: string; to?: string }) =>
    api.get<TeacherAnalytics>('/teacher/analytics', params),
  publishAssignment: (id: string) => api.patch<unknown>(`/teacher/assignments/${id}/publish`),
  createAssignment: (body: { title: string; instructions?: string; dueAt?: string; maxScore?: number; classId?: string; courseId?: string }) =>
    api.post<unknown>('/teacher/assignments', body),
  gradeSubmission: (submissionId: string, body: { score: number; feedback?: string }) =>
    api.patch<unknown>(`/teacher/submissions/${submissionId}/grade`, body),
  /** API GAP #8: per-student analytics for the teacher drill-down. */
  studentAnalytics: (studentId: string) =>
    api.get<import('@/types').StudentAnalytics>(`/teacher/students/${studentId}/analytics`),
};
