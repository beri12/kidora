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


export interface UploadResult {
  url: string;
  fileName: string;
  kind?: 'video' | 'document' | 'image' | 'other';
  sizeBytes?: number;
}

export type UploadProgressFn = (percent: number) => void;

// Posts a file to one of the API's multipart endpoints.
//
// Two things here are load-bearing and easy to get wrong:
//
// 1. Content-Type is deliberately NOT set. A multipart request needs a
//    boundary parameter ("multipart/form-data; boundary=----WebKitForm...")
//    and only the browser can generate it, when it is handed a FormData
//    body with no Content-Type of its own. Hard-coding the bare
//    "multipart/form-data" string sends a body the server cannot split
//    into parts, so multer finds no "file" field and the request fails.
//    The shared axios instance defaults to application/json, so the header
//    is explicitly cleared here rather than merely left alone.
//
// 2. timeout: 0 disables the axios client's global 15s timeout. A course
//    video is hundreds of megabytes; on any normal connection the upload
//    is still in flight long after 15s, and the default would abort it
//    mid-transfer and surface as a generic network error.
async function postFile(
  path: string,
  file: File,
  onProgress?: UploadProgressFn,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post<UploadResult>(path, formData, {
    headers: { 'Content-Type': undefined },
    timeout: 0,
    onUploadProgress: (event) => {
      if (!onProgress) return;
      const total = event.total ?? file.size;
      if (!total) return;
      onProgress(Math.min(100, Math.round((event.loaded * 100) / total)));
    },
  });

  return res.data;
}

export function uploadVideo(file: File, onProgress?: UploadProgressFn): Promise<UploadResult> {
  return postFile('/uploads/video', file, onProgress);
}

// Course thumbnails and banners.
export function uploadImage(file: File, onProgress?: UploadProgressFn): Promise<UploadResult> {
  return postFile('/uploads/image', file, onProgress);
}

// Any supported asset when the kind is not known up front.
export function uploadFile(file: File, onProgress?: UploadProgressFn): Promise<UploadResult> {
  return postFile('/uploads', file, onProgress);
}
