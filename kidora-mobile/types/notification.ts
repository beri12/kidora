/** Matches Prisma `enum NotificationType`. */
export type BackendNotificationType =
  | 'SYSTEM'
  | 'ASSIGNMENT_DUE'
  | 'ASSIGNMENT_GRADED'
  | 'SUBMISSION_RECEIVED'
  | 'QUIZ_RESULT'
  | 'EXAM_SCHEDULED'
  | 'ACHIEVEMENT'
  | 'BADGE'
  | 'LEVEL_UP'
  | 'NEW_COURSE'
  | 'COURSE_APPROVAL'
  | 'MESSAGE'
  | 'ANNOUNCEMENT'
  | 'RISK_ALERT'
  | 'REGISTRATION'
  | 'CERTIFICATE';

/** Product-level notification categories (user preferences are per category). */
export type NotificationCategory =
  | 'lesson_reminder'
  | 'assignment'
  | 'achievement'
  | 'level_up'
  | 'new_course'
  | 'parent_report'
  | 'teacher_announcement'
  | 'school_announcement';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: BackendNotificationType;
  link: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  page: number;
  pageSize: number;
  unread: number;
}

/** Data payload carried by a push notification, used for routing on tap. */
export interface PushPayload {
  type?: NotificationCategory | BackendNotificationType;
  lessonId?: string;
  courseId?: string;
  achievementId?: string;
  assignmentId?: string;
  childId?: string;
  notificationId?: string;
  url?: string;
}

export type NotificationPreferences = Record<NotificationCategory, boolean>;
