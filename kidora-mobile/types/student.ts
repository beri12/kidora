import type { Achievement, LeaderboardEntry, Quest, StreakDay } from './game';
import type { StudentCourse } from './lms';

/** GET /student/dashboard */
export interface StudentDashboard {
  profile: {
    id: string;
    name: string;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
    role: string;
    schoolId: string | null;
    level: number;
    xp: number;
    xpForNextLevel: number;
    coins: number;
    streak: number;
  };
  stats: {
    coursesEnrolled: number;
    lessonsCompleted: number;
    quizzesCompleted: number;
    averageScore: number;
  };
  adventure: {
    world: string;
    level: number;
    nextLevel: number;
    xp: number;
    xpForNextLevel: number;
    course: { id: string; slug: string; title: string; subject: string };
    lesson: { id: string; title: string; order: number; total: number; xpReward: number } | null;
    progressPercent: number;
  } | null;
  courses: StudentCourse[];
  dailyQuest: Quest | null;
  streakWeek: StreakDay[];
  achievements: Achievement[];
  leaderboard: { period: string; entries: LeaderboardEntry[] };
  unreadNotifications: number;
}
