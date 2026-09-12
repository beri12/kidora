"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studentApi } from "@/lib/api/student";
import { teacherApi, type AnalyticsFilters } from "@/lib/api/teacher";
import { schoolApi, type ListQuery } from "@/lib/api/school";
import { parentApi } from "@/lib/api/parent";
import { authoringApi, teacherLibraryApi } from "@/lib/api/authoring";
import { learningApi, type BrowseQuery } from "@/lib/api/learning";
import { teachingAiApi } from "@/lib/api/ai";

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
    lessons: (q: object) => ["teacher", "lessons", q] as const,
    quizzes: (q: object) => ["teacher", "quizzes", q] as const,
    exams: (q: object) => ["teacher", "exams", q] as const,
    resources: (q: object) => ["teacher", "resources", q] as const,
  },
  authoring: {
    tree: (id: string) => ["authoring", "course", id] as const,
    checklist: (id: string) => ["authoring", "checklist", id] as const,
    preview: (id: string) => ["authoring", "preview", id] as const,
    quiz: (id: string) => ["authoring", "quiz", id] as const,
    lesson: (id: string) => ["authoring", "lesson", id] as const,
    exam: (id: string) => ["authoring", "exam", id] as const,
  },
  learning: {
    browse: (q: object) => ["learning", "browse", q] as const,
    filters: ["learning", "filters"] as const,
    myCourses: (s?: string) => ["learning", "my-courses", s ?? "all"] as const,
    course: (id: string) => ["learning", "course", id] as const,
    progress: (id: string) => ["learning", "progress", id] as const,
    player: (c: string, l: string) => ["learning", "player", c, l] as const,
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

/* ------------------------------------------------ teacher library (sidebar) */

export const useTeacherLessons = (q: Parameters<typeof teacherLibraryApi.lessons>[0]) =>
  useQuery({ queryKey: keys.teacher.lessons(q), queryFn: () => teacherLibraryApi.lessons(q), staleTime: SHORT });
export const useTeacherQuizzes = (q: Parameters<typeof teacherLibraryApi.quizzes>[0]) =>
  useQuery({ queryKey: keys.teacher.quizzes(q), queryFn: () => teacherLibraryApi.quizzes(q), staleTime: SHORT });
export const useTeacherExams = (q: Parameters<typeof teacherLibraryApi.exams>[0]) =>
  useQuery({ queryKey: keys.teacher.exams(q), queryFn: () => teacherLibraryApi.exams(q), staleTime: SHORT });
export const useTeacherResources = (q: Parameters<typeof teacherLibraryApi.resources>[0]) =>
  useQuery({ queryKey: keys.teacher.resources(q), queryFn: () => teacherLibraryApi.resources(q), staleTime: SHORT });

export const useAddResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherLibraryApi.addResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "resources"] }),
  });
};
export const useAttachResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lessonId }: { id: string; lessonId: string | null }) => teacherLibraryApi.attachResource(id, lessonId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "resources"] }),
  });
};
export const useDeleteResource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherLibraryApi.deleteResource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "resources"] }),
  });
};

/* ----------------------------------------------------------- authoring */

// The whole wizard reads one tree, so every mutation invalidates it (and the
// checklist, which is derived from it) rather than each step patching locally.
const invalidateCourse = (qc: ReturnType<typeof useQueryClient>, courseId: string) => {
  qc.invalidateQueries({ queryKey: keys.authoring.tree(courseId) });
  qc.invalidateQueries({ queryKey: keys.authoring.checklist(courseId) });
  qc.invalidateQueries({ queryKey: keys.authoring.preview(courseId) });
  qc.invalidateQueries({ queryKey: ["teacher", "courses"] });
};

export const useCourseTree = (courseId: string) =>
  useQuery({ queryKey: keys.authoring.tree(courseId), queryFn: () => authoringApi.courseTree(courseId), enabled: !!courseId });
export const usePublishChecklist = (courseId: string) =>
  useQuery({ queryKey: keys.authoring.checklist(courseId), queryFn: () => authoringApi.checklist(courseId), enabled: !!courseId });
export const useCoursePreview = (courseId: string) =>
  useQuery({ queryKey: keys.authoring.preview(courseId), queryFn: () => authoringApi.preview(courseId), enabled: !!courseId });
export const useCourseExam = (courseId: string) =>
  useQuery({ queryKey: keys.authoring.exam(courseId), queryFn: () => authoringApi.getExam(courseId), enabled: !!courseId });
export const useAuthoredQuiz = (quizId: string) =>
  useQuery({ queryKey: keys.authoring.quiz(quizId), queryFn: () => authoringApi.getQuiz(quizId), enabled: !!quizId });

export const useCreateAuthoredCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authoringApi.createCourse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teacher", "courses"] }),
  });
};
export const useUpdateAuthoredCourse = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof authoringApi.updateCourse>[1]) => authoringApi.updateCourse(courseId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useSetCompletionRules = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof authoringApi.setCompletionRules>[1]) => authoringApi.setCompletionRules(courseId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const usePublishAuthoredCourse = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => authoringApi.publish(courseId), onSuccess: () => invalidateCourse(qc, courseId) });
};
export const useArchiveCourse = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => authoringApi.archive(courseId), onSuccess: () => invalidateCourse(qc, courseId) });
};

export const useCreateSection = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { title: string; description?: string }) => authoringApi.createSection(courseId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useUpdateSection = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; title?: string; description?: string }) => authoringApi.updateSection(id, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useDeleteSection = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.deleteSection, onSuccess: () => invalidateCourse(qc, courseId) });
};
export const useDuplicateSection = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.duplicateSection, onSuccess: () => invalidateCourse(qc, courseId) });
};
export const useReorderSections = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => authoringApi.reorderSections(courseId, ids),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};

export const useCreateLesson = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, ...dto }: { sectionId: string; title: string; estimatedMin?: number }) =>
      authoringApi.createLesson(sectionId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useUpdateLesson = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof authoringApi.updateLesson>[1]) =>
      authoringApi.updateLesson(id, dto),
    onSuccess: (_d, v) => { invalidateCourse(qc, courseId); qc.invalidateQueries({ queryKey: keys.authoring.lesson(v.id) }); },
  });
};
export const useDeleteLesson = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.deleteLesson, onSuccess: () => invalidateCourse(qc, courseId) });
};
export const useDuplicateLesson = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.duplicateLesson, onSuccess: () => invalidateCourse(qc, courseId) });
};
export const useReorderLessons = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, ids }: { sectionId: string; ids: string[] }) => authoringApi.reorderLessons(sectionId, ids),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};

export const useAuthoredLesson = (lessonId: string) =>
  useQuery({ queryKey: keys.authoring.lesson(lessonId), queryFn: () => authoringApi.getLesson(lessonId), enabled: !!lessonId });

export const useSaveLessonContent = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, blocks }: { lessonId: string; blocks: Parameters<typeof authoringApi.saveContent>[1] }) =>
      authoringApi.saveContent(lessonId, blocks),
    onSuccess: (_d, v) => { invalidateCourse(qc, courseId); qc.invalidateQueries({ queryKey: keys.authoring.lesson(v.lessonId) }); },
  });
};

export const useCreateQuiz = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof authoringApi.createQuiz>[1]) => authoringApi.createQuiz(courseId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useUpdateQuiz = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof authoringApi.updateQuiz>[1]) =>
      authoringApi.updateQuiz(id, dto),
    onSuccess: (_d, v) => { invalidateCourse(qc, courseId); qc.invalidateQueries({ queryKey: keys.authoring.quiz(v.id) }); },
  });
};
export const useDeleteQuiz = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.deleteQuiz, onSuccess: () => invalidateCourse(qc, courseId) });
};

export const useCreateAssignment = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof authoringApi.createAssignment>[1]) => authoringApi.createAssignment(courseId, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useUpdateAssignment = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & Parameters<typeof authoringApi.updateAssignment>[1]) =>
      authoringApi.updateAssignment(id, dto),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useSetAssignmentStatus = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "DRAFT" | "PUBLISHED" | "CLOSED" }) =>
      authoringApi.setAssignmentStatus(id, status),
    onSuccess: () => invalidateCourse(qc, courseId),
  });
};
export const useDeleteAssignment = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authoringApi.deleteAssignment, onSuccess: () => invalidateCourse(qc, courseId) });
};

export const useUpsertExam = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof authoringApi.upsertExam>[1]) => authoringApi.upsertExam(courseId, dto),
    onSuccess: () => { invalidateCourse(qc, courseId); qc.invalidateQueries({ queryKey: keys.authoring.exam(courseId) }); },
  });
};
export const useSetExamStatus = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED") => authoringApi.setExamStatus(courseId, status),
    onSuccess: () => { invalidateCourse(qc, courseId); qc.invalidateQueries({ queryKey: keys.authoring.exam(courseId) }); },
  });
};

/* ------------------------------------------------------------- learning */

export const useBrowseCourses = (q: BrowseQuery) =>
  useQuery({ queryKey: keys.learning.browse(q), queryFn: () => learningApi.browse(q), staleTime: SHORT });
export const useBrowseFilters = () =>
  useQuery({ queryKey: keys.learning.filters, queryFn: learningApi.filters, staleTime: LONG });
export const useMyLearningCourses = (status?: string) =>
  useQuery({ queryKey: keys.learning.myCourses(status), queryFn: () => learningApi.myCourses(status), staleTime: SHORT });
export const useStudentCourse = (courseId: string) =>
  useQuery({ queryKey: keys.learning.course(courseId), queryFn: () => learningApi.courseDetail(courseId), enabled: !!courseId });
export const useCourseProgress = (courseId: string) =>
  useQuery({ queryKey: keys.learning.progress(courseId), queryFn: () => learningApi.progress(courseId), enabled: !!courseId });
export const useLessonPlayer = (courseId: string, lessonId: string) =>
  useQuery({
    queryKey: keys.learning.player(courseId, lessonId),
    queryFn: () => learningApi.player(courseId, lessonId),
    enabled: !!courseId && !!lessonId,
  });

export const useEnrollInCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: learningApi.enroll,
    onSuccess: (_d, courseId) => {
      qc.invalidateQueries({ queryKey: keys.learning.course(courseId) });
      qc.invalidateQueries({ queryKey: ["learning", "browse"] });
      qc.invalidateQueries({ queryKey: ["learning", "my-courses"] });
      qc.invalidateQueries({ queryKey: keys.student.dashboard });
    },
  });
};
export const useUnenrollFromCourse = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: learningApi.unenroll,
    onSuccess: (_d, courseId) => {
      qc.invalidateQueries({ queryKey: keys.learning.course(courseId) });
      qc.invalidateQueries({ queryKey: ["learning", "browse"] });
      qc.invalidateQueries({ queryKey: ["learning", "my-courses"] });
    },
  });
};

export const useSaveLessonProgress = () =>
  useMutation({
    mutationFn: ({ lessonId, ...dto }: { lessonId: string; percent?: number; timeSpentSec?: number }) =>
      learningApi.saveProgress(lessonId, dto),
  });

export const useCompleteLesson = (courseId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, timeSpentSec }: { lessonId: string; timeSpentSec?: number }) =>
      learningApi.complete(lessonId, timeSpentSec ?? 0),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.learning.course(courseId) });
      qc.invalidateQueries({ queryKey: keys.learning.progress(courseId) });
      qc.invalidateQueries({ queryKey: ["learning", "player", courseId] });
      qc.invalidateQueries({ queryKey: ["learning", "my-courses"] });
      qc.invalidateQueries({ queryKey: keys.student.dashboard });
      qc.invalidateQueries({ queryKey: keys.student.certificates });
    },
  });
};

/* --------------------------------------- AI teaching assistant (teachers) */

// These are mutations, not queries: each run is an explicit action a teacher
// takes, and the result is a draft they review — never cached and re-shown as
// if it were saved content.
export const useGenerateLessonPlan = () => useMutation({ mutationFn: teachingAiApi.lessonPlan });
export const useGenerateQuizDraft = () => useMutation({ mutationFn: teachingAiApi.quizDraft });
export const useAnalyseClass = () => useMutation({ mutationFn: teachingAiApi.analyseClass });
