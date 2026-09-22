import type { Role, Plan } from '@/types';
export * from './roles';

// Where each role lands after login. Every member of the Role union needs an
// entry: a missing one made router.replace(ROLE_HOME[user.role]) navigate to
// `undefined` for accounts the backend can legitimately issue.
//
// These point at the LMS route tree (/student, /teacher, /parent, /school),
// which is the one wired to the backend through features/* -> lib/hooks/queries
// -> lib/api. The older /dashboard/* pages are left in place and still work,
// but they are not where a login lands.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/dashboard/admin',
  SUPER_ADMIN: '/dashboard/admin',
  TEACHER: '/teacher/dashboard',
  PARENT: '/parent/dashboard',
  CHILD: '/student/dashboard',
  SCHOOL_ADMIN: '/school/dashboard',
  SCHOOL_LEADER: '/school/dashboard',
  DISTRICT_ADMIN: '/school/dashboard',
};

/**
 * Which roles may enter each protected area. The backend guards are the real
 * authorization boundary; this drives navigation and the client-side guard so
 * a user is not shown a page that will only 403.
 */
export const AREA_ROLES: Record<string, Role[]> = {
  '/student': ['CHILD'],
  '/teacher': ['TEACHER'],
  '/parent': ['PARENT'],
  '/school': ['SCHOOL_ADMIN', 'SCHOOL_LEADER', 'DISTRICT_ADMIN', 'SUPER_ADMIN', 'ADMIN'],
  '/dashboard/admin': ['ADMIN', 'SUPER_ADMIN'],
};

/** The protected area a path belongs to, or null if it is public. */
export function areaFor(pathname: string): string | null {
  return Object.keys(AREA_ROLES).find((a) => pathname === a || pathname.startsWith(a + '/')) ?? null;
}

// Coarse feature permissions per role (mirror the backend RBAC).
export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['*'],
  SUPER_ADMIN: ['*'],
  TEACHER: ['course:create', 'course:update', 'lesson:upload', 'student:view', 'grade:manage'],
  PARENT: ['child:view', 'subscription:manage', 'report:view'],
  CHILD: ['lesson:learn', 'game:play', 'quiz:take', 'badge:earn'],
  SCHOOL_ADMIN: ['school:manage', 'teacher:view', 'student:view', 'report:view'],
  SCHOOL_LEADER: ['school:manage', 'teacher:view', 'student:view', 'report:view'],
  DISTRICT_ADMIN: ['district:manage', 'school:view', 'report:view'],
};

export const PLANS: Plan[] = [
  { key: 'free', name: 'Free', priceCents: 0, interval: 'month', features: ['20 starter lessons', 'Daily challenge', 'Basic games', '1 child profile'] },
  { key: 'family', name: 'Family Premium', priceCents: 1299, interval: 'month', popular: true, features: ['Full 500+ library', 'All games & quizzes', 'Certificates', 'Up to 4 kids', 'Parent reports'] },
  { key: 'school', name: 'School', priceCents: 9900, interval: 'month', features: ['Everything in Family', 'Teacher dashboard', 'Up to 40 students', 'Class assignments', 'Priority support'] },
];

export const SUBJECTS = [
  { slug: 'math', name: 'Mathematics', emoji: '🔢', accent: '#7C3AED' },
  { slug: 'english', name: 'Reading & English', emoji: '📖', accent: '#16A34A' },
  { slug: 'science', name: 'Science', emoji: '🔬', accent: '#0284C7' },
  { slug: 'coding', name: 'Programming', emoji: '💻', accent: '#E11D48' },
];

// Live multiplayer game rooms (socket.io) per subject.
export const LIVE_GAMES = [
  { slug: 'math-balloon', title: 'Balloon Pop Math', subject: 'math', minPlayers: 1 },
  { slug: 'code-maze', title: 'Code Maze Race', subject: 'coding', minPlayers: 2 },
  { slug: 'science-lab', title: 'Science Lab Match', subject: 'science', minPlayers: 2 },
  { slug: 'word-duel', title: 'Word Duel', subject: 'english', minPlayers: 2 },
];