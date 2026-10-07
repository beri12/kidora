import type { Course, CourseDetail, PaginatedResponse, PaginationParams } from '@/types';

import { api } from './api';

export interface BrowseParams extends PaginationParams {
  subjectId?: string;
  gradeId?: string;
  sort?: 'newest' | 'popular' | 'progress' | 'title';
}

export const courseService = {
  browse: (params: BrowseParams) => api.get<PaginatedResponse<Course>>('/learning/browse', params),
  filters: () =>
    api.get<{ subjects: { id: string; name: string }[]; grades: { id: string; name: string }[] }>(
      '/learning/browse/filters',
    ),
  myCourses: () => api.get<Course[]>('/learning/my-courses'),
  detail: (courseId: string) => api.get<CourseDetail>(`/learning/courses/${courseId}`),
  enroll: (courseId: string) => api.post<unknown>(`/learning/courses/${courseId}/enroll`),
};
