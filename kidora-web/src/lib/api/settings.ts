import { api } from "./client";
import type { Role } from "@/types";

/** UsersController (@Controller('users')) — the signed-in user's own record. */
export interface NotificationPrefs {
  assignments: boolean; exams: boolean; messages: boolean; achievements: boolean; email: boolean;
}

export interface UserSettings {
  language: string;
  appearance: "light" | "dark" | "system";
  difficulty: "low" | "normal" | "high";
  leaderboardVisible: boolean;
  notifications: NotificationPrefs;
}

export interface MyProfile {
  id: string; name: string; displayName?: string | null; email: string;
  phone?: string | null; phoneVerified?: boolean;
  role: Role; points: number; streak: number;
  avatarColor?: string; avatarUrl?: string | null;
  schoolId?: string | null; gradeId?: string | null;
  school?: { id: string; name: string } | null;
  grade?: { id: string; name: string; level: number } | null;
  subscription?: { plan: string; status: string } | null;
  settings: UserSettings;
}

/** Only the fields the backend lets a user change about themselves. */
export interface ProfilePatch {
  displayName?: string;
  avatarColor?: string;
  avatarUrl?: string;
}

export const settingsApi = {
  me: () => api.get<MyProfile>("/users/me"),
  updateProfile: (patch: ProfilePatch) => api.patch<MyProfile>("/users/me", patch),
  settings: () => api.get<UserSettings>("/users/me/settings"),
  updateSettings: (patch: Partial<UserSettings>) => api.patch<UserSettings>("/users/me/settings", patch),
};
