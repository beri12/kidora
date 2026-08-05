import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface LearningWorld { world: string; progress: number; locked: boolean; }

// Student profile + progress across learning worlds.
export function useStudentProgress() {
  return useQuery({ queryKey: ['student-progress'], queryFn: async () => (await api.get<LearningWorld[]>('/learning-path')).data });
}

export function useStudentProfile() {
  return useQuery({ queryKey: ['student-profile'], queryFn: async () => (await api.get('/users/me')).data });
}
