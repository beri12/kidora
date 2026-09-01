import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { QuestSummary, RewardResult, WorldDetail, WorldSummary } from '@/types';

export function useWorlds() {
  return useQuery({
    queryKey: ['worlds'],
    queryFn: async () => (await api.get<WorldSummary[]>('/learn/worlds')).data,
  });
}

export function useWorld(slug?: string) {
  return useQuery({
    queryKey: ['world', slug],
    enabled: !!slug,
    queryFn: async () => (await api.get<WorldDetail>(`/learn/worlds/${slug}`)).data,
  });
}

export function useMyQuests() {
  return useQuery({
    queryKey: ['quests', 'mine'],
    queryFn: async () => (await api.get<QuestSummary[]>('/quests/me')).data,
  });
}

export function useTodayQuest() {
  return useQuery({
    queryKey: ['quests', 'today'],
    queryFn: async () => (await api.get<QuestSummary | null>('/quests/today')).data,
  });
}

export function useStartQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/quests/${id}/start`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['world'] });
    },
  });
}

export function useCompleteQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ questId: string; reward: RewardResult | null; alreadyCompleted: boolean }>(
        `/quests/${id}/complete`,
      )).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] });
      qc.invalidateQueries({ queryKey: ['worlds'] });
      qc.invalidateQueries({ queryKey: ['student-home'] });
    },
  });
}
