"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, Globe, Palette, ShieldCheck, User as UserIcon, LogOut } from "lucide-react";
import { Card, CardBody, CardHeader, ErrorState, Skeleton } from "@/components/dashboard";
import { useCurrentUser, useSettings, useUpdateProfile, useUpdateSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/stores/auth.store";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import type { NotificationPrefs } from "@/lib/api/settings";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={"relative h-6 w-11 shrink-0 rounded-full transition " + (checked ? "bg-brand-600" : "bg-brand-200")}
    >
      <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

/**
 * Settings for every role. Preferences are saved through PATCH
 * /users/me/settings, so they follow the account to another device instead of
 * living in this browser. Role, school and grade are shown read-only — the
 * backend DTO does not accept them from the user.
 */
export function SettingsPage() {
  const profileQ = useCurrentUser();
  const settingsQ = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const logout = useAuthStore((s) => s.logout);
  const { setLang } = useI18n();

  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  // Seed the input once the profile arrives, without clobbering typing.
  useEffect(() => {
    if (profileQ.data && !displayName) setDisplayName(profileQ.data.displayName ?? profileQ.data.name);
  }, [profileQ.data, displayName]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(null), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  if (profileQ.isPending || settingsQ.isPending) {
    return <div className="grid gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>;
  }
  if (profileQ.isError) return <ErrorState error={profileQ.error} retry={() => profileQ.refetch()} />;
  if (settingsQ.isError) return <ErrorState error={settingsQ.error} retry={() => settingsQ.refetch()} />;

  const profile = profileQ.data!;
  const s = settingsQ.data!;
  const save = (patch: Parameters<typeof updateSettings.mutate>[0]) =>
    updateSettings.mutate(patch, { onSuccess: () => setSaved("Saved") });

  const notif: [keyof NotificationPrefs, string, string][] = [
    ["assignments", "Assignments", "New and due assignments"],
    ["exams", "Exams", "Scheduled and upcoming exams"],
    ["messages", "Messages", "New messages from teachers or school"],
    ["achievements", "Achievements", "Badges, levels and certificates"],
    ["email", "Email copies", "Also send these to your inbox"],
  ];

  return (
    <div className="grid gap-4">
      {saved && <p className="rounded-2xl bg-success-50 px-4 py-2 text-sm font-semibold text-success-700" role="status">{saved}</p>}

      <Card>
        <CardHeader title="Profile" sub={<span className="inline-flex items-center gap-1"><UserIcon className="h-3 w-3" /> How you appear across Kidora</span>} />
        <CardBody>
          <Row label="Display name" hint="Shown on your dashboard and leaderboards">
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-48 rounded-xl border border-line px-3 py-2 text-sm"
                maxLength={60}
                aria-label="Display name"
              />
              <button
                type="button"
                className="btn-primary"
                disabled={updateProfile.isPending || !displayName.trim()}
                onClick={() => updateProfile.mutate({ displayName: displayName.trim() }, { onSuccess: () => setSaved("Profile updated") })}
              >
                {updateProfile.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </Row>
          <Row label="Email">
            <span className="text-sm text-muted">{profile.email}</span>
          </Row>
          {profile.phone && (
            <Row label="Mobile" hint={profile.phoneVerified ? "Verified" : "Not verified"}>
              <span className="text-sm text-muted">{profile.phone}</span>
            </Row>
          )}
          {/* Read-only: the school sets these, and the API rejects them from a user. */}
          <Row label="Role" hint="Set when your account was created">
            <span className="text-sm text-muted">{profile.role}</span>
          </Row>
          {profile.school && <Row label="School"><span className="text-sm text-muted">{profile.school.name}</span></Row>}
          {profile.grade && <Row label="Grade"><span className="text-sm text-muted">{profile.grade.name}</span></Row>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Notifications" sub={<span className="inline-flex items-center gap-1"><Bell className="h-3 w-3" /> Choose what Kidora tells you about</span>} />
        <CardBody>
          {notif.map(([key, label, hint]) => (
            <Row key={key} label={label} hint={hint}>
              <Toggle
                label={label}
                checked={s.notifications[key]}
                onChange={(v) => save({ notifications: { ...s.notifications, [key]: v } })}
              />
            </Row>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Language & appearance" sub={<span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> How Kidora looks and reads</span>} />
        <CardBody>
          <Row label="Language">
            <select
              aria-label="Language"
              value={s.language}
              onChange={(e) => {
                // Apply immediately so the change is visible, and persist it.
                setLang(e.target.value as (typeof LANGUAGES)[number]["code"]);
                save({ language: e.target.value });
              }}
              className="rounded-xl border border-line px-3 py-2 text-sm"
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
            </select>
          </Row>
          <Row label="Appearance" hint="System follows your device setting">
            <select
              aria-label="Appearance"
              value={s.appearance}
              onChange={(e) => save({ appearance: e.target.value as typeof s.appearance })}
              className="rounded-xl border border-line px-3 py-2 text-sm"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </Row>
          <Row label="Practice difficulty" hint="How hard the AI tutor makes practice questions">
            <select
              aria-label="Practice difficulty"
              value={s.difficulty}
              onChange={(e) => save({ difficulty: e.target.value as typeof s.difficulty })}
              className="rounded-xl border border-line px-3 py-2 text-sm"
            >
              <option value="low">Gentle</option>
              <option value="normal">Normal</option>
              <option value="high">Challenging</option>
            </select>
          </Row>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Privacy" sub={<span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> What other people can see</span>} />
        <CardBody>
          <Row label="Show me on leaderboards" hint="Turn off to be hidden from class and school rankings">
            <Toggle label="Show me on leaderboards" checked={s.leaderboardVisible} onChange={(v) => save({ leaderboardVisible: v })} />
          </Row>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Account" sub={<span className="inline-flex items-center gap-1"><Palette className="h-3 w-3" /> Session</span>} />
        <CardBody>
          <Row label="Sign out" hint="Ends this session on this device">
            <button type="button" onClick={() => logout()} className="btn-secondary inline-flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </Row>
        </CardBody>
      </Card>
    </div>
  );
}
