import { api } from "./client";

/** SupportController (@Controller('support')). */
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketCategory = "GENERAL" | "ACCOUNT" | "BILLING" | "TECHNICAL" | "COURSE" | "SAFETY";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface TicketSummary {
  id: string; reference: string; subject: string;
  category: TicketCategory; status: TicketStatus; priority: TicketPriority;
  createdAt: string; updatedAt: string; resolvedAt?: string | null;
  requester: { id: string; name: string; email: string };
  assignee?: { id: string; name: string } | null;
  _count: { messages: number };
}

export interface TicketMessage {
  id: string; body: string; internal: boolean; createdAt: string;
  author: { id: string; name: string; role: string };
}

export interface TicketDetail extends Omit<TicketSummary, "_count"> {
  messages: TicketMessage[];
}

export interface NewTicket {
  subject: string;
  message: string;
  category?: TicketCategory;
}

export const supportApi = {
  list: (status?: string) => api.get<TicketSummary[]>("/support/tickets", { status }),
  get: (id: string) => api.get<TicketDetail>(`/support/tickets/${id}`),
  create: (body: NewTicket) => api.post<TicketDetail>("/support/tickets", body),
  reply: (id: string, body: string) => api.post<TicketMessage>(`/support/tickets/${id}/reply`, { body }),
  close: (id: string) => api.patch<TicketSummary>(`/support/tickets/${id}/close`, {}),
};
