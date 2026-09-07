"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type ProfilePatch, type UserSettings } from "@/lib/api/settings";

export const meKeys = {
  profile: ["me", "profile"] as const,
  settings: ["me", "settings"] as const,
};

/** The signed-in user's own record, whatever their role. */
export function useCurrentUser() {
  return useQuery({ queryKey: meKeys.profile, queryFn: settingsApi.me, staleTime: 60_000 });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => settingsApi.updateProfile(patch),
    onSuccess: (profile) => {
      qc.setQueryData(meKeys.profile, profile);
      qc.setQueryData(meKeys.settings, profile.settings);
    },
  });
}

/**
 * Preferences persisted server-side, so they follow the user between devices
 * rather than living in this browser only.
 */
export function useSettings() {
  return useQuery({ queryKey: meKeys.settings, queryFn: settingsApi.settings, staleTime: 60_000 });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => settingsApi.updateSettings(patch),
    // The server merges partial saves, and returns the merged result — write
    // that back so the form shows exactly what was stored.
    onSuccess: (saved) => {
      qc.setQueryData(meKeys.settings, saved);
      qc.invalidateQueries({ queryKey: meKeys.profile });
    },
  });
}
