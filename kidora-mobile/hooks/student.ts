import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { analytics } from '@/features/analytics/track';
import { haptics } from '@/lib/haptics';
import { qk } from '@/lib/query-keys';
import { deriveRecommendations, recommendationService } from '@/services/recommendation.service';
import { studentService } from '@/services/student.service';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import type { LeaderboardPeriod, LeaderboardScope, Recommendation, UserSettings } from '@/types';

export function useStudentDashboard() {
  return useQuery({ queryKey: qk.student.dashboard, queryFn: studentService.dashboard, staleTime: 30_000 });
}

/** Aggregate learning stats for the signed-in student (subset of the dashboard). */
export function useStudentProgress() {
  return useQuery({
    queryKey: qk.student.dashboard,
    queryFn: studentService.dashboard,
    select: (d) => ({ ...d.stats, level: d.profile.level, xp: d.profile.xp, streak: d.profile.streak, coins: d.profile.coins }),
  });
}

export function useQuests() {
  return useQuery({ queryKey: qk.student.quests, queryFn: studentService.quests });
}

export function useClaimQuest() {
  const qc = useQueryClient();
  const celebrate = useGameStore((s) => s.celebrate);
  return useMutation({
    mutationFn: (id: string) => studentService.claimQuest(id),
    onSuccess: (res, id) => {
      if (res.outcome) celebrate(res.outcome);
      haptics.reward();
      analytics.track('reward_claimed', { rewardId: id, kind: 'quest' });
      void qc.invalidateQueries({ queryKey: qk.student.all });
      void qc.invalidateQueries({ queryKey: qk.wallet });
    },
  });
}

export function useAchievements() {
  return useQuery({ queryKey: qk.student.achievements, queryFn: studentService.achievements });
}

export function useBadges() {
  return useQuery({ queryKey: qk.student.badges, queryFn: studentService.badges });
}

export function useCertificates() {
  return useQuery({ queryKey: qk.student.certificates, queryFn: studentService.certificates });
}

export function useStudentAssignments() {
  return useQuery({ queryKey: qk.student.assignments, queryFn: () => studentService.assignments() });
}

export function useLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod) {
  const myId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: qk.student.leaderboard(scope, period),
    queryFn: () => studentService.leaderboard(scope, period, myId),
    staleTime: 60_000,
  });
}

/** Backend recommendations when available; otherwise a local rule-based fallback. */
export function useRecommendations() {
  const dashboard = useStudentDashboard();
  const remote = useQuery({
    queryKey: qk.student.recommendations,
    queryFn: recommendationService.forStudent,
    retry: false,
    staleTime: 10 * 60_000,
  });
  const fallback: Recommendation[] = dashboard.data ? deriveRecommendations(dashboard.data) : [];
  const useRemote = remote.isSuccess && remote.data.length > 0;
  return {
    data: useRemote ? remote.data : fallback,
    isLoading: dashboard.isLoading,
    source: useRemote ? ('backend' as const) : ('fallback' as const),
  };
}

export function useUserSettings() {
  return useQuery({ queryKey: qk.student.settings, queryFn: studentService.settings });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UserSettings) => studentService.updateSettings(body),
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: qk.student.settings });
      const prev = qc.getQueryData<UserSettings>(qk.student.settings);
      qc.setQueryData<UserSettings>(qk.student.settings, { ...prev, ...body });
      return { prev };
    },
    onError: (_e, _b, ctx) => qc.setQueryData(qk.student.settings, ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.student.settings }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentService.updateProfile,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.student.dashboard });
      void qc.invalidateQueries({ queryKey: qk.me });
    },
  });
}
