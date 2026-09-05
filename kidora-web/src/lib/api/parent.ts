import { api } from "./client";
import type {
  ParentDashboard, ChildSummary, AssignmentItem, AchievementItem, ActivityItem, Paginated,
  ConversationSummary, MessageItem, QuizItem, ExamItem,
} from "@/types/lms";

export const parentApi = {
  dashboard: (childId?: string, range?: string) => api.get<ParentDashboard>("/parent/dashboard", { childId, range }),
  children: () => api.get<ChildSummary[]>("/parent/children"),
  progress: (childId: string) => api.get<ParentDashboard["subjectProgress"]>(`/parent/children/${childId}/progress`),
  activity: (childId: string, page = 1) => api.get<Paginated<ActivityItem>>(`/parent/children/${childId}/activity`, { page }),
  assignments: (childId: string, status?: string) => api.get<AssignmentItem[]>(`/parent/children/${childId}/assignments`, { status }),
  assessments: (childId: string) => api.get<{ quizzes: QuizItem[]; exams: ExamItem[] }>(`/parent/children/${childId}/assessments`),
  achievements: (childId: string) => api.get<AchievementItem[]>(`/parent/children/${childId}/achievements`),
  conversations: () => api.get<ConversationSummary[]>("/lms/messages/conversations"),
  messages: (conversationId: string) => api.get<MessageItem[]>(`/lms/messages/conversations/${conversationId}`),
  send: (conversationId: string, body: string) => api.post<MessageItem>(`/lms/messages/conversations/${conversationId}`, { body }),
};
