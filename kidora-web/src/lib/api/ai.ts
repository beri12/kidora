import { api } from "./client";

/** AiTutorController (@Controller('ai')). */
export interface AiMessage { id: string; message: string; response: string; createdAt: string }

export const aiApi = {
  history: () => api.get<AiMessage[]>("/ai/chat/history"),
  ask: (message: string, studentId?: string) => api.post<TutorReply>("/ai/chat", { message, studentId }),
};

/** Shape returned by AiTutorService.chat(). */
export interface TutorReply {
  answer: string;
  suggestions: string[];
  recommendedLessons?: { id: string; title: string }[];
}
