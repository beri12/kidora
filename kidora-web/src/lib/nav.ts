import type { LucideIcon } from "lucide-react";
import {
  Home, BookOpen, Target, ClipboardList, FileCheck2, Award, Trophy, Medal, Map, Bot, User, Settings,
  Users, Layers, GraduationCap, BarChart3, CalendarCheck, MessageSquare, FolderOpen, Calendar,
  Table2, LayoutGrid, Library, ListChecks, CreditCard, Activity, LifeBuoy, Sparkles, Gamepad2,
} from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon; badgeKey?: "notifications" | "messages"; }
export interface NavConfig { role: "student" | "teacher" | "school" | "parent"; tagline: string; items: NavItem[]; footer: NavItem[]; }

// Every href below resolves to a real page — a check in the browser test
// suite walks each one and fails on a 404.
//
// Still absent, because they need backend endpoints that do not exist yet:
// teacher lessons/quizzes/exams/attendance/resources, school grades/learning/
// exams/assignments/attendance/certificates, parent ai-tutor. They return
// alongside their pages rather than standing here as dead links.

export const studentNav: NavConfig = {
  role: "student", tagline: "Learn • Play • Grow",
  items: [
    { label: "Dashboard", href: "/student/dashboard", icon: Home },
    { label: "My Courses", href: "/student/courses", icon: BookOpen },
    { label: "Browse Courses", href: "/courses", icon: Library },
    { label: "Games", href: "/games", icon: Gamepad2 },
    { label: "Quests", href: "/student/quests", icon: Target },
    { label: "Assignments", href: "/student/assignments", icon: ClipboardList },
    { label: "Exams", href: "/student/exams", icon: FileCheck2 },
    { label: "Certificates", href: "/student/certificates", icon: Award },
    { label: "Leaderboard", href: "/student/leaderboard", icon: Trophy },
    { label: "Badges", href: "/student/badges", icon: Medal },
    { label: "World Map", href: "/student/world", icon: Map },
    { label: "AI Tutor", href: "/student/ai-tutor", icon: Bot },
    { label: "Calendar", href: "/student/calendar", icon: Calendar },
    { label: "Profile", href: "/student/profile", icon: User },
  ],
  footer: [
    { label: "Support", href: "/student/support", icon: LifeBuoy },
    { label: "Settings", href: "/student/settings", icon: Settings },
  ],
};

export const teacherNav: NavConfig = {
  role: "teacher", tagline: "Teacher",
  items: [
    { label: "Dashboard", href: "/teacher/dashboard", icon: Home },
    { label: "My Classes", href: "/teacher/classes", icon: Users },
    { label: "Courses", href: "/teacher/courses", icon: BookOpen },
    { label: "Assignments", href: "/teacher/assignments", icon: ClipboardList },
    { label: "Students", href: "/teacher/students", icon: GraduationCap },
    { label: "Gradebook", href: "/teacher/gradebook", icon: Table2 },
    { label: "Analytics", href: "/teacher/analytics", icon: BarChart3 },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare, badgeKey: "messages" },
    { label: "Calendar", href: "/teacher/calendar", icon: Calendar },
  ],
  footer: [
    { label: "Support", href: "/teacher/support", icon: LifeBuoy },
    { label: "Settings", href: "/teacher/settings", icon: Settings },
  ],
};

export const schoolNav: NavConfig = {
  role: "school", tagline: "School",
  items: [
    { label: "Dashboard", href: "/school/dashboard", icon: Home },
    { label: "Students", href: "/school/students", icon: GraduationCap },
    { label: "Teachers", href: "/school/teachers", icon: Users },
    { label: "Classes", href: "/school/classes", icon: LayoutGrid },
    { label: "Courses", href: "/school/courses", icon: BookOpen },
    { label: "Reports & Analytics", href: "/school/analytics", icon: BarChart3 },
    { label: "Messages", href: "/school/messages", icon: MessageSquare, badgeKey: "messages" },
    { label: "Calendar", href: "/school/calendar", icon: Calendar },
    { label: "Billing & Subscription", href: "/school/billing", icon: CreditCard },
  ],
  footer: [
    { label: "Support", href: "/school/support", icon: LifeBuoy },
    { label: "Settings", href: "/school/settings", icon: Settings },
  ],
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
  ],
  footer: [
    { label: "Support", href: "/parent/support", icon: LifeBuoy },
    { label: "Settings", href: "/parent/settings", icon: Settings },
  ],
};
