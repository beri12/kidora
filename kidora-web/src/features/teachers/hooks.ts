import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

// Teacher: roster of students + their progress for the class.
export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => (await api.get('/teachers/students')).data as {
      id: string; name: string; initial: string; progress: number; status: string;
    }[],
  });
}
