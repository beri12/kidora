import type { LucideIcon } from "lucide-react";
import {
  Home, BookOpen, Target, ClipboardList, FileCheck2, Award, Trophy, Medal, Map, Bot, User, Settings,
  Users, Layers, GraduationCap, BarChart3, CalendarCheck, MessageSquare, FolderOpen, Calendar,
  Table2, LayoutGrid, Library, ListChecks, CreditCard, Activity, LifeBuoy, Sparkles,
} from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; badgeKey?: "notifications" | "messages"; }
export interface NavConfig { role: "student" | "teacher" | "school" | "parent"; tagline: string; items: NavItem[]; footer: NavItem[]; }

export const studentNav: NavConfig = {
  role: "student", tagline: "Learn • Play • Grow",
  items: [
    { label: "Dashboard", href: "/student/dashboard", icon: Home },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "Quests", href: "/student/quests", icon: Target },
    { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
    { label: "Exams", href: "/student/exams", icon: FileCheck2 },
    { label: "Certificates", href: "/student/certificates", icon: Award },
    { label: "Leaderboard", href: "/student/leaderboard", icon: Trophy },
    { label: "Badges", href: "/student/badges", icon: Medal },
    { label: "World Map", href: "/student/world", icon: Map },
    { label: "AI Tutor", href: "/student/ai-tutor", icon: Bot },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  footer: [{ label: "Settings", href: "/student/settings", icon: Settings }],
};

export const teacherNav: NavConfig = {
  role: "teacher", tagline: "Teacher",
  items: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: Home },
    { label: "My Classes", href: "/teacher/classes", icon: Users },
    { label: "Courses", href: "/teacher/courses", icon: BookOpen },
    { label: "Lessons", href: "/teacher/lessons", icon: Layers },
    { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
    { label: "Quizzes", href: "/teacher/quizzes", icon: ListChecks },
    { label: "Exams", href: "/teacher/exams", icon: FileCheck2 },
    { label: "Students", href: "/teacher/students", icon: GraduationCap },
    { label: "Gradebook", href: "/teacher/gradebook", icon: Table2 },
    { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
    { label: "Attendance", href: "/teacher/attendance", icon: CalendarCheck },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare, badgeKey: "messages" },
    { label: "Resources", href: "/teacher/resources", icon: FolderOpen },
    { label: "Calendar", href: "/teacher/calendar", icon: Calendar },
  ],
  footer: [{ label: "Settings", href: "/teacher/settings", icon: Settings }],
};

export const schoolNav: NavConfig = {
  role: "school", tagline: "School",
  items: [
    { label: "Dashboard", href: "/school/dashboard", icon: Home },
    { label: "Students", href: "/school/students", icon: GraduationCap },
    { label: "Teachers", href: "/school/teachers", icon: Users },
    { label: "Classes", href: "/school/classes", icon: LayoutGrid },
    { label: "Grades & Subjects", href: "/school/grades", icon: Library },
    { label: "Courses", href: "/school/courses", icon: BookOpen },
    { label: "Learning", href: "/school/learning", icon: Sparkles },
    { label: "Exams & Assessments", href: "/school/exams", icon: FileCheck2 },
    { label: "Assignments", href: "/school/assignments", icon: ClipboardList },
    { label: "Reports & Analytics", href: "/school/analytics", icon: BarChart3 },
    { label: "Attendance", href: "/school/attendance", icon: CalendarCheck },
    { label: "Certificates", href: "/school/certificates", icon: Award },
    { label: "Messages", href: "/school/messages", icon: MessageSquare, badgeKey: "messages" },
    { label: "Billing & Subscription", href: "/school/billing", icon: CreditCard },
  ],
  footer: [{ label: "Settings", href: "/school/settings", icon: Settings }],
};

export const parentNav: NavConfig = {
  role: "parent", tagline: "Learn • Play • Grow",
  items: [
    { label: "Home", href: "/parent/dashboard", icon: Home },
    { label: "Overview", href: "/parent/overview", icon: LayoutGrid },
    { label: "Courses & Progress", href: "/parent/progress", icon: BookOpen },
    { label: "Activity", href: "/parent/activity", icon: Activity },
    { label: "Assignments", href: "/parent/assignments", icon: ClipboardList },
    { label: "Quizzes & Exams", href: "/parent/assessments", icon: FileCheck2 },
    { label: "Achievements", href: "/parent/achievements", icon: Award },
    { label: "Calendar", href: "/parent/calendar", icon: Calendar },
    { label: "Messages", href: "/parent/messages", icon: MessageSquare, badgeKey: "messages" },
    { label: "AI Tutor", href: "/parent/ai-tutor", icon: Bot },
    { label: "Support", href: "/parent/support", icon: LifeBuoy },
  ],
  footer: [{ label: "Settings", href: "/parent/settings", icon: Settings }],
};
