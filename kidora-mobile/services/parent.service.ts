import type {
  Achievement,
  ActivityItem,
  Assignment,
  ChildAssessments,
  ChildSummary,
  DateRange,
  PaginatedResponse,
  ParentDashboard,
  SubjectProgress,
} from '@/types';

import { api } from './api';

/** Every per-child route is guarded server-side by tenancy.assertParentOf. */
export const parentService = {
  dashboard: (childId?: string, range: DateRange = 'week') =>
    api.get<ParentDashboard>('/parent/dashboard', { childId, range }),
  children: () => api.get<ChildSummary[]>('/parent/children'),
  progress: (childId: string) => api.get<SubjectProgress[]>(`/parent/children/${childId}/progress`),
  activity: (childId: string, page = 1) =>
    api.get<PaginatedResponse<ActivityItem>>(`/parent/children/${childId}/activity`, { page, pageSize: 20 }),
  assignments: (childId: string) => api.get<Assignment[]>(`/parent/children/${childId}/assignments`),
  assessments: (childId: string) => api.get<ChildAssessments>(`/parent/children/${childId}/assessments`),
  achievements: (childId: string) => api.get<Achievement[]>(`/parent/children/${childId}/achievements`),
};
