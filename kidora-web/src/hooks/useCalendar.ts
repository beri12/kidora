"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calendarApi, type CalendarEventInput } from "@/lib/api/calendar";

export const calendarKeys = {
  all: ["calendar"] as const,
  range: (from: string, to: string, childId?: string, kinds?: string) =>
    ["calendar", "range", from, to, childId ?? "all", kinds ?? "all"] as const,
  upcoming: (days: number, childId?: string) => ["calendar", "upcoming", days, childId ?? "all"] as const,
};

/** Everything between two dates. Both ends are required by the API. */
export function useCalendarRange(from: string, to: string, opts: { childId?: string; kinds?: string } = {}) {
  return useQuery({
    queryKey: calendarKeys.range(from, to, opts.childId, opts.kinds),
    queryFn: () => calendarApi.range(from, to, opts),
    staleTime: 60_000,
  });
}

export function useUpcoming(days = 14, childId?: string) {
  return useQuery({
    queryKey: calendarKeys.upcoming(days, childId),
    queryFn: () => calendarApi.upcoming(days, childId),
    staleTime: 60_000,
  });
}

/** Any write invalidates every calendar window, since one event can fall in several. */
function useCalendarMutation<TArgs>(fn: (a: TArgs) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.all }),
  });
}

export const useCreateEvent = () => useCalendarMutation((input: CalendarEventInput) => calendarApi.create(input));
export const useUpdateEvent = () =>
  useCalendarMutation(({ id, ...input }: { id: string } & Partial<CalendarEventInput>) => calendarApi.update(id, input));
export const useDeleteEvent = () => useCalendarMutation((id: string) => calendarApi.remove(id));
