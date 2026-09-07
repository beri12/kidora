"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportApi, type NewTicket } from "@/lib/api/support";

export const supportKeys = {
  all: ["support"] as const,
  list: (status?: string) => ["support", "tickets", status ?? "all"] as const,
  detail: (id: string) => ["support", "ticket", id] as const,
};

export function useTickets(status?: string) {
  return useQuery({ queryKey: supportKeys.list(status), queryFn: () => supportApi.list(status), staleTime: 30_000 });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: supportKeys.detail(id),
    queryFn: () => supportApi.get(id),
    enabled: Boolean(id),
    // A ticket is a live conversation with support, so poll while it is open.
    refetchInterval: 30_000,
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewTicket) => supportApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}

export function useReplyToTicket(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => supportApi.reply(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportKeys.detail(id) });
      qc.invalidateQueries({ queryKey: supportKeys.list() });
    },
  });
}

export function useCloseTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => supportApi.close(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: supportKeys.all }),
  });
}
