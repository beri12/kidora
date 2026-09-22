"use client";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { SchoolShell } from "@/features/school/SchoolShell";
import { TopHeader } from "@/components/dashboard";
import { MessagesView } from "./MessagesView";

export function TeacherMessagesPage() {
  return (
    <TeacherShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Messages" sub="Talk with parents and your school" />}>
      <MessagesView emptyHint="Conversations started by a parent or your school appear here." />
    </TeacherShell>
  );
}

export function SchoolMessagesPage() {
  return (
    <SchoolShell header={({ onMenu }) => <TopHeader onMenu={onMenu} title="Messages" sub="Talk with teachers and parents" />}>
      <MessagesView emptyHint="Conversations with your teachers and parents appear here." />
    </SchoolShell>
  );
}
