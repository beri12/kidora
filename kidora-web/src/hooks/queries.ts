"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { teacherApi, type AnalyticsFilters } from "@/lib/api/teacher";
import { schoolApi, type ListQuery } from "@/lib/api/school";
import { parentApi } from "@/lib/api/parent";

// Query keys are namespaced by role so invalidation stays targeted.
export const keys = {
  student: {
    dashboard: ["student", "dashboard"] as const,
    courses: (s?: string) => ["student", "courses", s ?? "all"] as const,
    quests: ["student", "quests"] as const,
    assignments: (s?: string) => ["student", "assignments", s ?? "all"] as const,
    quizzes: (s?: string) => ["student", "quizzes", s ?? "all"] as const,
    exams: ["student", "exams"] as const,
    certificates: ["student", "certificates"] as const,
    badges: ["student", "badges"] as const,
    leaderboard: (scope: string, period: string) => ["student", "leaderboard", scope, period] as const,
    world: ["student", "world"] as const,
    ai: ["student", "ai"] as const,
  },
  teacher: {
    dashboard: (r?: string) => ["teacher", "dashboard", r ?? "week"] as const,
    classes: ["teacher", "classes"] as const,
    classDetail: (id: string) => ["teacher", "class", id] as const,
    students: (q: object) => ["teacher", "students", q] as const,
    courses: (s?: string) => ["teacher", "courses", s ?? "all"] as const,
    tasks: (b?: string) => ["teacher", "tasks", b ?? "all"] as const,
    activity: (p: number) => ["teacher", "activity", p] as const,
    gradebook: (q: object) => ["teacher", "gradebook", q] as const,
    analytics: (f: object) => ["teacher", "analytics", f] as const,
    assignments: (q: object) => ["teacher", "assignments", q] as const,
  },
  school: {
    dashboard: (r?: string) => ["school", "dashboard", r ?? "week"] as const,
    students: (q: object) => ["school", "students", q] as const,
    teachers: (q: object) => ["school", "teachers", q] as const,
    classes: (q: object) => ["school", "classes", q] as const,
    courses: (q: object) => ["school", "courses", q] as const,
    analytics: (q: object) => ["school", "analytics", q] as const,
    billing: ["school", "billing"] as const,
  },
  parent: {
    dashboard: (c?: string, r?: string) => ["parent", "dashboard", c ?? "default", r ?? "week"] as const,
    children: ["parent", "children"] as const,
    assignments: (c: string, s?: string) => ["parent", "assignments", c, s ?? "all"] as const,
    activity: (c: string, p: number) => ["parent", "activity", c, p] as const,
    achievements: (c: string) => ["parent", "achievements", c] as const,
    assessments: (c: string) => ["parent", "assessments", c] as const,
    conversations: ["messages", "conversations"] as const,
    messages: (id: string) => ["messages", id] as const,
  },
};

const SHORT = 30_000; // dashboard summaries refresh often
const LONG = 5 * 60_000;

// ----------------------------- Student -------------------------------------
export const useStudentDashboard = () =>
  useQuery({ queryKey: keys.student.dashboard, queryFn: studentApi.dashboard, staleTime: SHORT, refetchInterval: 60_000 });
export const useStudentCourses = (status?: string) =>
  useQuery({ queryKey: keys.student.courses(status), queryFn: () => studentApi.courses(status), staleTime: SHORT });
export const useStudentQuests = () =>
  useQuery({ queryKey: keys.student.quests, queryFn: studentApi.quests, staleTime: SHORT });
export const useClaimQuest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: studentApi.claimQuest,
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.student.quests }); qc.invalidateQueries({ queryKey: keys.student.dashboard }); },
  });
};
export const useStudentAssignments = (status?: string) =>
  useQuery({ queryKey: keys.student.assignments(status), queryFn: () => studentApi.assignments(status), staleTime: SHORT });
export const useSubmitAssignment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: FormData }) => studentApi.submitAssignment(id, form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student", "assignments"] }),
  });
};
export const useStudentQuizzes = (status?: string) =>
  useQuery({ queryKey: keys.student.quizzes(status), queryFn: () => studentApi.quizzes(status), staleTime: SHORT });
export const useStudentExams = () => useQuery({ queryKey: keys.student.exams, queryFn: studentApi.exams, staleTime: SHORT });
export const useStudentCertificates = () => useQuery({ queryKey: keys.student.certificates, queryFn: studentApi.certificates, staleTime: LONG });
export const useStudentBadges = () => useQuery({ queryKey: keys.student.badges, queryFn: studentApi.badges, staleTime: LONG });
export const useLeaderboard = (scope: "school" | "class", period: "week" | "month") =>
  useQuery({ queryKey: keys.student.leaderboard(scope, period), queryFn: () => studentApi.leaderboard(scope, period), staleTime: SHORT });
export const useWorldMap = () => useQuery({ queryKey: keys.student.world, queryFn: studentApi.world, staleTime: LONG });
export const useAiHistory = () => useQuery({ queryKey: keys.student.ai, queryFn: studentApi.aiHistory, staleTime: LONG });
export const useAiAsk = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: studentApi.aiAsk, onSuccess: () => qc.invalidateQueries({ queryKey: keys.student.ai }) });
};

// ----------------------------- Teacher -------------------------------------
export const useTeacherDashboard = (range?: string) =>
  useQuery({ queryKey: keys.teacher.dashboard(range), queryFn: () => teacherApi.dashboard(range), staleTime: SHORT, refetchInterval: 60_000 });
export const useTeacherClasses = () => useQuery({ queryKey: keys.teacher.classes, queryFn: teacherApi.classes, staleTime: SHORT });
export const useTeacherClass = (id: string) => useQuery({ queryKey: keys.teacher.classDetail(id), queryFn: () => teacherApi.classDetail(id), enabled: !!id });
export const useTeacherStudents = (q: Parameters<typeof teacherApi.students>[0]) =>
  useQuery({ queryKey: keys.teacher.students(q), queryFn: () => teacherApi.students(q), placeholderData: (p) => p });
export const useTeacherCourses = (status?: string) =>
  useQuery({ queryKey: keys.teacher.courses(status), queryFn: () => teacherApi.courses(status) });
export const useTeacherTasks = (bucket?: string) =>
  useQuery({ queryKey: keys.teacher.tasks(bucket), queryFn: () => teacherApi.tasks(bucket), staleTime: SHORT });
export const useTeacherActivity = (page: number) =>
  useQuery({ queryKey: keys.teacher.activity(page), queryFn: () => teacherApi.activity(page), placeholderData: (p) => p });
export const useGradebook = (q: Parameters<typeof teacherApi.gradebook>[0]) =>
  useQuery({ queryKey: keys.teacher.gradebook(q), queryFn: () => teacherApi.gradebook(q), placeholderData: (p) => p });
export const useTeacherAnalytics = (f: AnalyticsFilters) =>
  useQuery({ queryKey: keys.teacher.analytics(f), queryFn: () => teacherApi.analytics(f), placeholderData: (p) => p });
export const useTeacherAssignments = (q: Parameters<typeof teacherApi.assignments>[0]) =>
  useQuery({ queryKey: keys.teacher.assignments(q), queryFn: () => teacherApi.assignments(q), placeholderData: (p) => p });

// ----------------------------- School --------------------------------------
export const useSchoolDashboard = (range?: string) =>
  useQuery({ queryKey: keys.school.dashboard(range), queryFn: () => schoolApi.dashboard(range), staleTime: SHORT, refetchInterval: 120_000 });
export const useSchoolStudents = (q: ListQuery) =>
  useQuery({ queryKey: keys.school.students(q), queryFn: () => schoolApi.students(q), placeholderData: (p) => p });
export const useSchoolTeachers = (q: ListQuery) =>
  useQuery({ queryKey: keys.school.teachers(q), queryFn: () => schoolApi.teachers(q), placeholderData: (p) => p });
export const useSchoolClasses = (q: ListQuery) =>
  useQuery({ queryKey: keys.school.classes(q), queryFn: () => schoolApi.classes(q), placeholderData: (p) => p });
export const useSchoolCourses = (q: ListQuery) =>
  useQuery({ queryKey: keys.school.courses(q), queryFn: () => schoolApi.courses(q), placeholderData: (p) => p });
export const useSchoolAnalytics = (q: { from?: string; to?: string }) =>
  useQuery({ queryKey: keys.school.analytics(q), queryFn: () => schoolApi.analytics(q), placeholderData: (p) => p });
export const useSchoolBilling = () => useQuery({ queryKey: keys.school.billing, queryFn: schoolApi.billing, staleTime: LONG });

// ----------------------------- Parent --------------------------------------
export const useParentDashboard = (childId?: string, range?: string) =>
  useQuery({ queryKey: keys.parent.dashboard(childId, range), queryFn: () => parentApi.dashboard(childId, range), staleTime: SHORT, placeholderData: (p) => p });
export const useParentChildren = () => useQuery({ queryKey: keys.parent.children, queryFn: parentApi.children, staleTime: LONG });
export const useChildAssignments = (childId: string, status?: string) =>
  useQuery({ queryKey: keys.parent.assignments(childId, status), queryFn: () => parentApi.assignments(childId, status), enabled: !!childId });
export const useChildActivity = (childId: string, page: number) =>
  useQuery({ queryKey: keys.parent.activity(childId, page), queryFn: () => parentApi.activity(childId, page), enabled: !!childId, placeholderData: (p) => p });
export const useChildAchievements = (childId: string) =>
  useQuery({ queryKey: keys.parent.achievements(childId), queryFn: () => parentApi.achievements(childId), enabled: !!childId });
export const useChildAssessments = (childId: string) =>
  useQuery({ queryKey: keys.parent.assessments(childId), queryFn: () => parentApi.assessments(childId), enabled: !!childId });
export const useConversations = () => useQuery({ queryKey: keys.parent.conversations, queryFn: parentApi.conversations, refetchInterval: 30_000 });
export const useMessages = (id: string) =>
  useQuery({ queryKey: keys.parent.messages(id), queryFn: () => parentApi.messages(id), enabled: !!id, refetchInterval: 15_000 });
export const useSendMessage = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => parentApi.send(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.parent.messages(id) }); qc.invalidateQueries({ queryKey: keys.parent.conversations }); },
  });
};
