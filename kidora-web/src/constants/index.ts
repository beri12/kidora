import type { Role, Plan } from '@/types';
export * from './roles';

// Where each role lands after login. Every member of the Role union needs an
// entry: a missing one made router.replace(ROLE_HOME[user.role]) navigate to
// `undefined` for accounts the backend can legitimately issue.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/dashboard/admin',
  SUPER_ADMIN: '/dashboard/admin',
  TEACHER: '/dashboard/teacher',
  PARENT: '/dashboard/parent',
  CHILD: '/dashboard/child',
  SCHOOL_ADMIN: '/dashboard/school',
  SCHOOL_LEADER: '/dashboard/school',
  DISTRICT_ADMIN: '/dashboard/district',
};

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