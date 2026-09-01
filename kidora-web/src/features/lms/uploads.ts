import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface StoredFile {
  url: string;
  name: string;
  sizeBytes: number;
  kind: 'video' | 'document' | 'image' | 'other';
}

/**
 * Routes an upload to the endpoint that matches its type, so the server-side
 * MIME allow-list and size cap for that kind apply. The server generates the
 * stored filename — the browser never chooses a path.
 */
function endpointFor(file: File) {
  if (file.type.startsWith('image/')) return '/uploads/image';
  if (file.type.startsWith('video/')) return '/uploads/video';
  if (file.type.startsWith('audio/')) return '/uploads/audio';
  return '/uploads/file';
}

export function useUploadFile(onProgress?: (pct: number) => void) {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post<StoredFile>(endpointFor(file), form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total ?? 1))),
      });
      return data;
    },
  });
}
