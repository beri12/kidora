import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ChildReport, StudentHome, StudentProgressReport } from '@/types';

export function useStudentHome() {
  return useQuery({
    queryKey: ['student-home'],
    queryFn: async () => (await api.get<StudentHome>('/students/me/home')).data,
  });
}

export function useMyProgress() {
  return useQuery({
    queryKey: ['student-progress-report'],
    queryFn: async () => (await api.get<StudentProgressReport>('/students/me/progress')).data,
  });
}

export interface MyChildren {
  profiles: { id: string; name: string; age: number; avatar: string }[];
  accounts: { id: string; name: string; avatarColor: string; points: number; streak: number }[];
}

export function useMyChildren() {
  return useQuery({
    queryKey: ['my-children'],
    queryFn: async () => (await api.get<MyChildren>('/students/me/children')).data,
  });
}

export function useChildReport(childId?: string) {
  return useQuery({
    queryKey: ['child-report', childId],
    enabled: !!childId,
    queryFn: async () => (await api.get<ChildReport>(`/students/${childId}/report`)).data,
  });
}
