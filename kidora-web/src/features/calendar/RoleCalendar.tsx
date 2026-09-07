"use client";
import { ParentShell } from "@/features/parent/ParentShell";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { SchoolShell } from "@/features/school/SchoolShell";
import { StudentShell } from "@/features/student/StudentShell";
import { TopHeader } from "@/components/dashboard";
import { useSelectedChild } from "@/features/parent/useSelectedChild";
import { CalendarView } from "./CalendarView";

const header = (title: string, sub: string) => ({ onMenu }: { onMenu: () => void }) => (
  <TopHeader onMenu={onMenu} title={title} sub={sub} />
);

/** Parents see the calendar for whichever child the shell selector has chosen. */
export function ParentCalendarPage() {
  const sel = useSelectedChild();
  return (
    <ParentShell header={header("Calendar", "Classes, deadlines and events")}>
      <CalendarView childId={sel.childId || undefined} />
    </ParentShell>
  );
}

export function TeacherCalendarPage() {
  return (
    <TeacherShell header={header("Calendar", "Your classes, assignments and exams")}>
      <CalendarView />
    </TeacherShell>
  );
}

export function SchoolCalendarPage() {
  return (
    <SchoolShell header={header("Calendar", "School-wide schedule")}>
      <CalendarView />
    </SchoolShell>
  );
}

/** Students may add personal reminders but cannot create anything school-wide. */
export function StudentCalendarPage() {
  return (
    <StudentShell header={header("Calendar", "What's coming up")}>
      <CalendarView />
    </StudentShell>
  );
}
