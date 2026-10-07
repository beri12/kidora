/** Matches Prisma `enum AIKind` minus TEACHER_ASSIST (never sent by students). */
export type AiKind = 'TUTOR' | 'EXPLAIN' | 'PRACTICE' | 'HINT' | 'MISTAKE' | 'RECOMMEND';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** client-only: message is waiting on the network */
  pending?: boolean;
  /** client-only: the reply failed */
  failed?: boolean;
}

export interface AiAskRequest {
  message: string;
  kind?: AiKind;
  lessonId?: string;
  courseId?: string;
}

/** POST /lms/ai/tutor */
export interface AiAskResponse {
  reply: AIMessage;
  remainingToday: number;
}

export interface AiHistoryResponse {
  items: AIMessage[];
  page: number;
  pageSize: number;
  total: number;
}

export type AiReportReason = 'inappropriate' | 'wrong' | 'confusing' | 'other';
