import type {
  Achievement,
  Assignment,
  Badge,
  Certificate,
  Exam,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
  Quest,
  RewardOutcome,
  StudentDashboard,
  UserSettings,
} from '@/types';
import { firstName } from '@/utils/format';

import { api } from './api';

interface GlobalLeaderboardRow {
  rank: number;
  id: string;
  name: string;
  points: number;
}

export const studentService = {
  dashboard: () => api.get<StudentDashboard>('/student/dashboard'),
  quests: () => api.get<Quest[]>('/student/quests'),
  claimQuest: (id: string) => api.post<{ outcome?: RewardOutcome }>(`/student/quests/${id}/claim`),
  assignments: (status?: string) => api.get<Assignment[]>('/student/assignments', { status }),
  exams: () => api.get<Exam[]>('/student/exams'),
  certificates: () => api.get<Certificate[]>('/student/certificates'),
  achievements: () => api.get<Achievement[]>('/student/achievements'),
  badges: () => api.get<Badge[]>('/student/badges'),

  async leaderboard(scope: LeaderboardScope, period: LeaderboardPeriod, myId?: string): Promise<LeaderboardEntry[]> {
    if (scope !== 'global') {
      return api.get<LeaderboardEntry[]>('/student/leaderboard', { scope, period });
    }
    // The public global board returns full names; reduce to first name on the
    // way in so a child's surname is never rendered (privacy).
    const rows = await api.get<GlobalLeaderboardRow[]>('/leaderboard');
    return rows.map((r) => ({
      rank: r.rank,
      userId: r.id,
      displayName: firstName(r.name) || 'Learner',
      xp: r.points,
      isMe: r.id === myId,
    }));
  },

  updateProfile: (body: { displayName?: string; avatarColor?: string; avatarUrl?: string }) =>
    api.patch<unknown>('/users/me', body),
  settings: () => api.get<UserSettings>('/users/me/settings'),
  updateSettings: (body: UserSettings) => api.patch<UserSettings>('/users/me/settings', body),
};
