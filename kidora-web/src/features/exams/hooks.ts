import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ExamAttemptView, ExamOverview, ExamResult } from '@/types';

export function useExam(id?: string) {
  return useQuery({
    queryKey: ['exam', id],
    enabled: !!id,
    queryFn: async () => (await api.get<ExamOverview>(`/exams/${id}`)).data,
  });
}

export function useTeachingExams(courseId?: string) {
  return useQuery({
    queryKey: ['exams', 'teaching', courseId],
    queryFn: async () => (await api.get<any[]>('/exams/teaching', { params: { courseId } })).data,
  });
}

/** Starts (or resumes) an attempt. The question set is frozen server-side. */
export function useStartExam(examId: string) {
  return useMutation({
    mutationFn: async () => (await api.post<ExamAttemptView>(`/exams/${examId}/start`)).data,
  });
}

export function useSubmitExam(examId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (answers: Record<string, unknown>) =>
      (await api.post<ExamResult>(`/exams/${examId}/submit`, { answers })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', examId] });
      qc.invalidateQueries({ queryKey: ['certificates'] });
      qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });
}

export function useExamResult(examId?: string) {
  return useQuery({
    queryKey: ['exam-result', examId],
    enabled: !!examId,
    queryFn: async () => (await api.get(`/exams/${examId}/result`)).data,
  });
}
