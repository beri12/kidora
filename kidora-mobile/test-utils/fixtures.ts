import type { ParentDashboard, StudentDashboard, TeacherDashboard, WorldResponse } from '@/types';

export const studentDashboard: StudentDashboard = {
  profile: { id: 'u1', name: 'Charles Abebe', displayName: 'Charles', avatarUrl: null, avatarColor: null, role: 'CHILD', schoolId: 's1', level: 7, xp: 4280, xpForNextLevel: 4900, coins: 345, streak: 6 },
  stats: { coursesEnrolled: 1, lessonsCompleted: 3, quizzesCompleted: 1, averageScore: 80 },
  adventure: {
    world: 'MATH_ISLAND',
    level: 7,
    nextLevel: 8,
    xp: 4280,
    xpForNextLevel: 4900,
    course: { id: 'c1', slug: 'f', title: 'Fractions Adventure', subject: 'Mathematics' },
    lesson: { id: 'l4', title: 'Quarters all around', order: 4, total: 6, xpReward: 20 },
    progressPercent: 50,
  },
  courses: [],
  dailyQuest: { id: 'q1', kind: 'DAILY', title: 'Complete 2 lessons', description: 'Any two', progress: 1, target: 2, rewardXP: 50, rewardCoins: 10, completed: false, claimed: false, endsAt: null },
  streakWeek: [{ day: 'Mon', date: '2026-10-05', done: true, isToday: false }],
  achievements: [{ id: 'a1', title: 'First Steps', description: 'First lesson', xpReward: 20, unlockedAt: '2026-10-01', progress: 1, requirement: 1, badgeUrl: null }],
  leaderboard: { period: 'week', entries: [{ rank: 1, userId: 'u1', displayName: 'Charles', xp: 610, isMe: true }] },
  unreadNotifications: 1,
};

export const world: WorldResponse = { worlds: [{ key: 'MATH_ISLAND', name: 'Math Island', accent: '#7C3AED', progress: 40, nodes: [] }] };

export const parentDashboard: ParentDashboard = {
  parent: { id: 'p', name: 'Hana', avatarUrl: null },
  children: [
    { id: 'k1', name: 'Charles Abebe', displayName: 'Charles', avatarUrl: null, avatarColor: null, grade: 'Grade 5', className: '5A', schoolName: 'Sunrise' },
    { id: 'k2', name: 'Mahlet Abebe', displayName: 'Mahlet', avatarUrl: null, avatarColor: null, grade: 'Grade 2', className: '2B', schoolName: 'Sunrise' },
  ],
  selectedChildId: 'k1',
  kpis: {
    overallProgress: { value: 62, unit: 'percent' },
    lessonsCompleted: { value: 9, unit: 'count' },
    quizAverage: { value: 84, unit: 'percent' },
    streak: { value: 6, unit: 'days' },
    coins: { value: 345, unit: 'coins' },
  },
  subjectProgress: [{ subject: 'Mathematics', percent: 50 }],
  weeklyActivity: { labels: ['Mon'], minutes: [20], totalMinutes: 20, lessons: 1, quizzes: 0, assignments: 0 },
  achievements: [],
  upcomingAssignments: [],
  insights: { strengths: ['Halves'], needsPractice: ['Comparing fractions'], tip: null },
  tips: [],
  unreadNotifications: 0,
};

export const teacherDashboard: TeacherDashboard = {
  profile: { id: 't', name: 'Mr. Dawit', avatarUrl: null, subject: 'Mathematics' },
  kpis: {
    students: { value: 84, unit: 'count' },
    coursesTeaching: { value: 3, unit: 'count' },
    pendingAssignments: { value: 12, unit: 'count' },
    averageClassProgress: { value: 58, unit: 'percent' },
    badgesAwarded: { value: 4, unit: 'count' },
  },
  classes: [{ id: 'k1', name: '5A Maths', grade: 'Grade 5', subject: 'Mathematics', studentCount: 28, averageScore: 81, completionPercent: 66, atRiskCount: 2, lastActivityAt: null }],
  classProgress: { labels: [], series: [] },
  tasks: [],
  activity: [],
  topics: [],
  schedule: [],
  unreadNotifications: 0,
  unreadMessages: 0,
};
