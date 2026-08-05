import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useGames() {
  return useQuery({ queryKey: ['games'], queryFn: async () => (await api.get('/games')).data });
}

// Submit a game result (score) — server credits coins/XP.
export function useSubmitGameResult(gameId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (result: { score: number; won: boolean }) => (await api.post(`/games/${gameId}/result`, result)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rewards'] }); qc.invalidateQueries({ queryKey: ['leaderboard'] }); },
  });
}
