"use client";
import { ParentShell } from "@/features/parent/ParentShell";
import { TeacherShell } from "@/features/teacher/TeacherShell";
import { SchoolShell } from "@/features/school/SchoolShell";
import { StudentShell } from "@/features/student/StudentShell";
import { TopHeader } from "@/components/dashboard";
import { SupportPage } from "./SupportPage";

const header = ({ onMenu }: { onMenu: () => void }) => (
  <TopHeader onMenu={onMenu} title="Support" sub="Help centre and your tickets" />
);

export const ParentSupportPage = () => <ParentShell header={header}><SupportPage /></ParentShell>;
export const TeacherSupportPage = () => <TeacherShell header={header}><SupportPage /></TeacherShell>;
export const SchoolSupportPage = () => <SchoolShell header={header}><SupportPage /></SchoolShell>;
export const StudentSupportPage = () => <StudentShell header={header}><SupportPage /></StudentShell>;
