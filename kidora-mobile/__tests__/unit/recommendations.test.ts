import { deriveRecommendations } from '@/services/recommendation.service';
import type { StudentDashboard } from '@/types';

const base: StudentDashboard = {
  profile: { id: 'u', name: 'C A', displayName: 'C', avatarUrl: null, avatarColor: null, role: 'CHILD', schoolId: null, level: 2, xp: 150, xpForNextLevel: 400, coins: 0, streak: 1 },
  stats: { coursesEnrolled: 2, lessonsCompleted: 3, quizzesCompleted: 0, averageScore: 0 },
  adventure: { world: 'MATH_ISLAND', level: 2, nextLevel: 3, xp: 150, xpForNextLevel: 400, course: { id: 'c1', slug: 'f', title: 'Fractions', subject: 'Mathematics' }, lesson: { id: 'l4', title: 'Quarters', order: 4, total: 6, xpReward: 20 }, progressPercent: 50 },
  courses: [
    { id: 'c2', slug: 'r', title: 'Reading', subject: 'English', grade: null, teacher: null, thumbnailUrl: null, progressPercent: 10, lessonsCompleted: 1, totalLessons: 10, currentLesson: { id: 'r2', title: 'Stories', order: 2 }, lastActivityAt: null, status: 'IN_PROGRESS' },
    { id: 'c3', slug: 'k', title: 'Coding', subject: 'Coding', grade: null, teacher: null, thumbnailUrl: null, progressPercent: 85, lessonsCompleted: 8, totalLessons: 10, currentLesson: null, lastActivityAt: null, status: 'IN_PROGRESS' },
  ],
  dailyQuest: { id: 'q', kind: 'DAILY', title: 'Do 2 lessons', description: '', progress: 0, target: 2, rewardXP: 50, rewardCoins: 0, completed: false, claimed: false, endsAt: null },
  streakWeek: [],
  achievements: [],
  leaderboard: { period: 'week', entries: [] },
  unreadNotifications: 0,
};

describe('recommendation fallback', () => {
  it('suggests continue, quest, practice and next level', () => {
    const r = deriveRecommendations(base);
    expect(r.map((x) => x.kind)).toEqual(['CONTINUE', 'QUEST', 'PRACTICE', 'NEXT_LEVEL']);
    expect(r[0]?.lessonId).toBe('l4');
    expect(r[2]?.courseId).toBe('c2');
  });

  it('returns nothing for a brand new student', () => {
    expect(deriveRecommendations({ ...base, adventure: null, courses: [], dailyQuest: null })).toEqual([]);
  });
});
