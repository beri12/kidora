// services/courseWizard.ts
import { api } from '@/lib/axios';
import type { BasicInfo, Section, AdvanceInfo } from '@/stores/courseWizard.store';

export interface DraftCourseResponse {
  id: string;
  slug: string;
  [key: string]: unknown;
}

// Step 1: creates the draft course, backend returns the new courseId.
export async function createDraftCourse(data: BasicInfo): Promise<DraftCourseResponse> {
  const res = await api.post<DraftCourseResponse>('/courses/draft', data);
  return res.data;
}

// Step 1 (re-save): once a draft exists, edits patch it instead of creating a new one.
export async function updateDraftCourse(courseId: string, data: BasicInfo): Promise<DraftCourseResponse> {
  const res = await api.patch<DraftCourseResponse>(`/courses/${courseId}/draft`, data);
  return res.data;
}

// Step 2: curriculum saves onto the same draft, still not published.
export async function saveCurriculumDraft(courseId: string, sections: Section[]): Promise<DraftCourseResponse> {
  const res = await api.patch<DraftCourseResponse>(`/courses/${courseId}/curriculum`, { sections });
  return res.data;
}

// Step 3: the one combined request, sends basic info + curriculum + advance info
// together and marks the course published.
export async function publishCourse(
  courseId: string,
  payload: { basicInfo: BasicInfo; sections: Section[]; advanceInfo: AdvanceInfo },
): Promise<DraftCourseResponse> {
  const res = await api.post<DraftCourseResponse>(`/courses/${courseId}/publish`, payload);
  return res.data;
}


export async function uploadVideo(file: File): Promise<{ url: string; fileName: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/courses/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}