"use client";
import { StudentShell } from "@/features/student/StudentShell";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { ParentShell } from "@/features/parent/ParentShell";
import { SchoolShell } from "@/features/school/SchoolShell";
import { TopHeader } from "@/components/dashboard";
import { SettingsPage } from "./SettingsPage";

/**
 * One SettingsPage per role, each inside that role's own shell.
 *
 * These live in a client component because the shells take a `header` render
 * prop — a function, which a server component cannot pass across the boundary.
 * The route files under app/ stay one-liners, matching the other pages.
 */
const header = ({ onMenu }: { onMenu: () => void }) => (
  <TopHeader onMenu={onMenu} title="Settings" sub="Your profile and preferences" />
);

export function StudentSettingsPage() {
  return <StudentShell header={header}><SettingsPage /></StudentShell>;
}
export function TeacherSettingsPage() {
  return <TeacherShell header={header}><SettingsPage /></TeacherShell>;
}
export function ParentSettingsPage() {
  return <ParentShell header={header}><SettingsPage /></ParentShell>;
}
export function SchoolSettingsPage() {
  return <SchoolShell header={header}><SettingsPage /></SchoolShell>;
}
