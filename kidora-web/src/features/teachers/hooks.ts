'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

// Shape returned by GET /api/teachers/students, which already derives
// `initial`, `progress` and `status` server-side.
export interface RosterStudent {
  id: string;
  name: string;
  initial: string;
  progress: number;
  status: string;
}

export function useStudents() {
  return useQuery({
    queryKey: ['teachers', 'students'],
    queryFn: async () => (await api.get<RosterStudent[]>('/teachers/students')).data,
  });
}
