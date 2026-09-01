import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Assignment, AssignmentSubmissionRow } from '@/types';

export function useMyAssignments(courseId?: string) {
  return useQuery({
    queryKey: ['assignments', 'mine', courseId],
    queryFn: async () => (await api.get<Assignment[]>('/assignments/mine', { params: { courseId } })).data,
  });
}

export function useTeachingAssignments(courseId?: string) {
  return useQuery({
    queryKey: ['assignments', 'teaching', courseId],
    queryFn: async () => (await api.get<Assignment[]>('/assignments/teaching', { params: { courseId } })).data,
  });
}

export function useAssignment(id?: string) {
  return useQuery({
    queryKey: ['assignment', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Assignment>(`/assignments/${id}`)).data,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<Assignment> & { courseId: string; title: string }) =>
      (await api.post<Assignment>('/assignments', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text?: string; attachmentUrls?: string[] }) =>
      (await api.post(`/assignments/${assignmentId}/submit`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignment', assignmentId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

export function useSubmissions(assignmentId?: string) {
  return useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    enabled: !!assignmentId,
    queryFn: async () =>
      (await api.get<AssignmentSubmissionRow[]>(`/assignments/${assignmentId}/submissions`)).data,
  });
}

/** Grading targets one submission; the API clamps the score to the max points. */
export function useGradeSubmission(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      ...body
    }: { submissionId: string; score: number; feedback?: string; returnForRevision?: boolean }) =>
      (await api.post(`/assignments/submissions/${submissionId}/grade`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignment-submissions', assignmentId] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}
