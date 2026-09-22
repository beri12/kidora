import { api } from "./client";

/** CalendarController (@Controller('calendar')). */
export type CalendarSource = "event" | "assignment" | "exam" | "lesson";

export interface CalendarItem {
  id: string;
  source: CalendarSource;
  type: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  location?: string | null;
  color?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  classId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  /** Derived rows (deadlines) are never editable. */
  editable: boolean;
  href?: string;
}

export interface CalendarEventInput {
  title: string;
  description?: string;
  type?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  location?: string;
  color?: string;
  classId?: string;
  courseId?: string;
  studentId?: string;
  schoolWide?: boolean;
}

export const calendarApi = {
  range: (from: string, to: string, opts: { childId?: string; kinds?: string } = {}) =>
    api.get<CalendarItem[]>("/calendar", { from, to, ...opts }),
  upcoming: (days = 14, childId?: string) =>
    api.get<CalendarItem[]>("/calendar/upcoming", { days, childId }),
  create: (input: CalendarEventInput) => api.post<CalendarItem>("/calendar", input),
  update: (id: string, input: Partial<CalendarEventInput>) => api.patch<CalendarItem>(`/calendar/${id}`, input),
  remove: (id: string) => api.delete<{ ok: boolean }>(`/calendar/${id}`),
};
