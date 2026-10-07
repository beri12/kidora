import type { BackendNotificationType, NotificationCategory, PushPayload, UserRole } from '@/types';

/** Backend notification type → user-facing preference category. */
export function categoryFor(type: string | undefined): NotificationCategory | null {
  switch (type as BackendNotificationType | NotificationCategory | undefined) {
    case 'lesson_reminder':
      return 'lesson_reminder';
    case 'ASSIGNMENT_DUE':
    case 'ASSIGNMENT_GRADED':
    case 'SUBMISSION_RECEIVED':
    case 'assignment':
      return 'assignment';
    case 'ACHIEVEMENT':
    case 'BADGE':
    case 'CERTIFICATE':
    case 'achievement':
      return 'achievement';
    case 'LEVEL_UP':
    case 'level_up':
      return 'level_up';
    case 'NEW_COURSE':
    case 'new_course':
      return 'new_course';
    case 'parent_report':
    case 'QUIZ_RESULT':
      return 'parent_report';
    case 'ANNOUNCEMENT':
    case 'teacher_announcement':
      return 'teacher_announcement';
    case 'school_announcement':
    case 'EXAM_SCHEDULED':
      return 'school_announcement';
    default:
      return null;
  }
}

const NOTIFICATIONS_HREF: Record<UserRole, string> = {
  STUDENT: '/(student)/notifications',
  PARENT: '/modal/notifications',
  TEACHER: '/(teacher)/notifications',
  SCHOOL_LEADER: '/modal/notifications',
  DISTRICT_LEADER: '/modal/notifications',
};

/**
 * Where tapping a notification should land, for the signed-in role.
 *
 *   lesson      → lesson screen
 *   achievement → achievements
 *   assignment  → assignments
 *   parent report → child progress
 *   announcement → notifications
 *
 * Every target is still authorized by the route guard and the backend.
 */
export function routeForPayload(payload: PushPayload, role: UserRole): string {
  const category = categoryFor(payload.type);

  if (role === 'STUDENT') {
    if (payload.lessonId) {
      const q = payload.courseId ? `?courseId=${encodeURIComponent(payload.courseId)}` : '';
      return `/(student)/lesson/${encodeURIComponent(payload.lessonId)}${q}`;
    }
    if (category === 'lesson_reminder') return '/(student)';
    if (category === 'achievement' || category === 'level_up') {
      return payload.achievementId
        ? `/(student)/achievements?highlight=${encodeURIComponent(payload.achievementId)}`
        : '/(student)/achievements';
    }
    if (category === 'assignment') return '/(student)/notifications';
  }

  if (role === 'PARENT' && payload.childId) {
    if (category === 'parent_report') return `/(parent)/progress/${encodeURIComponent(payload.childId)}`;
    return `/(parent)/child/${encodeURIComponent(payload.childId)}`;
  }

  if (role === 'TEACHER' && category === 'assignment') return '/(teacher)/assignments';

  return NOTIFICATIONS_HREF[role];
}
