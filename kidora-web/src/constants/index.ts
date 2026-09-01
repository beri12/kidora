import type { Role, Plan } from '@/types';
export * from './roles';

// Where each role lands after login.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/dashboard/admin',
  TEACHER: '/dashboard/teacher',
  PARENT: '/dashboard/parent',
  CHILD: '/dashboard/child',
  SCHOOL_ADMIN: '/dashboard/school/overview',
  SCHOOL_LEADER: '/dashboard/school/overview',
  DISTRICT_ADMIN: '/dashboard/district',
};

// Coarse feature permissions per role. These mirror kidora-api's
// src/common/constants/rbac.ts and are for showing/hiding UI only — the API
// enforces the real thing on every request.
const SCHOOL_ADMIN_PERMISSIONS = [
  'school.read', 'school.manage', 'students.read', 'students.manage',
  'teachers.read', 'teachers.manage', 'classes.read', 'classes.manage',
  'courses.read', 'courses.publish', 'assignments.grade', 'certificates.issue',
  'analytics.read',
];

export const PERMISSIONS: Record<Role, string[]> = {
  ADMIN: ['*'],
  TEACHER: [
    'course:create', 'course:update', 'lesson:upload', 'student:view', 'grade:manage',
    'courses.create', 'courses.update', 'courses.publish', 'lessons.create', 'lessons.update',
    'activities.create', 'quizzes.create', 'assignments.create', 'assignments.grade',
    'exams.create', 'exams.grade', 'certificates.issue', 'analytics.read',
  ],
  PARENT: ['child:view', 'subscription:manage', 'report:view'],
  CHILD: ['lesson:learn', 'game:play', 'quiz:take', 'badge:earn', 'courses.read'],
  SCHOOL_ADMIN: SCHOOL_ADMIN_PERMISSIONS,
  SCHOOL_LEADER: SCHOOL_ADMIN_PERMISSIONS,
  DISTRICT_ADMIN: ['district:manage', 'school:view', 'report:view', ...SCHOOL_ADMIN_PERMISSIONS],
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