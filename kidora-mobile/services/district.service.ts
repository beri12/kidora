import type {
  ClassStudent,
  DistrictDashboard,
  DistrictFilters,
  DistrictSchoolSummary,
  PaginatedResponse,
  SchoolDashboard,
  SchoolTeacher,
} from '@/types';

import { api } from './api';

/**
 * District endpoints do not exist in kidora-api yet (API GAP #3). This
 * service is written against the proposed contract in docs/API-GAPS.md so
 * the screens light up as soon as the backend ships them; until then the
 * screens render their friendly "coming soon" state on 404.
 */
export const districtService = {
  dashboard: (filters: DistrictFilters) => api.get<DistrictDashboard>('/district/dashboard', filters),
  schools: (params: { page?: number; search?: string } & DistrictFilters) =>
    api.get<PaginatedResponse<DistrictSchoolSummary>>('/district/schools', params),
  school: (id: string) => api.get<SchoolDashboard>(`/district/schools/${id}`),
  students: (params: { page?: number; search?: string } & DistrictFilters) =>
    api.get<PaginatedResponse<ClassStudent>>('/district/students', params),
  teachers: (params: { page?: number; search?: string } & DistrictFilters) =>
    api.get<PaginatedResponse<SchoolTeacher>>('/district/teachers', params),
  analytics: (filters: DistrictFilters) => api.get<DistrictDashboard>('/district/analytics', filters),
};
