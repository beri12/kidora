import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type {
  CourseLearnerView,
  LmsActivity,
  LmsCourse,
  LmsLesson,
  LmsSection,
  Paged,
  QuizResult,
  QuizView,
  RewardResult,
  TeacherOverview,
} from '@/types';

export interface CatalogQuery {
  q?: string;
  subject?: string;
  gradeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------- catalog

/** Student catalog. The API only returns courses this learner may open. */
export function useCourseCatalog(params: CatalogQuery = {}) {
  return useQuery({
    queryKey: ['catalog', params],
    queryFn: async () => (await api.get<Paged<LmsCourse>>('/courses/catalog', { params })).data,
  });
}

/** Staff library for the caller's own school. */
export function useCourseLibrary(params: CatalogQuery = {}) {
  return useQuery({
    queryKey: ['course-library', params],
    queryFn: async () => (await api.get<LmsCourse[]>('/courses/library', { params })).data,
  });
}

export function useCourseLearnerView(courseId?: string) {
  return useQuery({
    queryKey: ['course-learn', courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<CourseLearnerView>(`/courses/${courseId}/learn`)).data,
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => (await api.post(`/courses/${courseId}/enroll`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['catalog'] }),
  });
}

// ---------------------------------------------------------------- builder

export function useCourseBuilder(courseId?: string) {
  return useQuery({
    queryKey: ['course-builder', courseId],
    enabled: !!courseId,
    queryFn: async () => (await api.get<LmsCourse>(`/courses/${courseId}/builder`)).data,
  });
}

export function useCreateLmsCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Partial<LmsCourse> & { title: string }) =>
      (await api.post<LmsCourse>('/courses', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['course-library'] }),
  });
}

/** Every builder mutation refreshes the one course tree the screen renders. */
function useBuilderMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, courseId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-builder', courseId] });
      qc.invalidateQueries({ queryKey: ['course-library'] });
    },
  });
}

export function useUpdateCourse(courseId: string) {
  return useBuilderMutation(
    async (body: Partial<LmsCourse>) => (await api.patch(`/courses/${courseId}`, body)).data,
    courseId,
  );
}

export function usePublishCourse(courseId: string) {
  return useBuilderMutation(
    // The wizard's publish route also accepts an empty body, which just flips
    // the flag on curriculum the builder has already saved.
    async (publish: boolean) =>
      (await api.post(`/courses/${courseId}/${publish ? 'publish' : 'unpublish'}`, {})).data,
    courseId,
  );
}

export function useAddSection(courseId: string) {
  return useBuilderMutation(
    async (body: { title: string; description?: string }) =>
      (await api.post<LmsSection>(`/courses/${courseId}/sections`, body)).data,
    courseId,
  );
}

export function useUpdateSection(courseId: string) {
  return useBuilderMutation(
    async ({ id, ...body }: { id: string; title?: string; description?: string }) =>
      (await api.patch(`/sections/${id}`, body)).data,
    courseId,
  );
}

export function useDeleteSection(courseId: string) {
  return useBuilderMutation(async (id: string) => (await api.delete(`/sections/${id}`)).data, courseId);
}

export function useReorderSections(courseId: string) {
  return useBuilderMutation(
    async (ids: string[]) => (await api.patch(`/courses/${courseId}/sections/order`, { ids })).data,
    courseId,
  );
}

export function useAddLesson(courseId: string) {
  return useBuilderMutation(
    async ({ sectionId, ...body }: { sectionId: string } & Partial<LmsLesson>) =>
      (await api.post<LmsLesson>(`/sections/${sectionId}/lessons`, body)).data,
    courseId,
  );
}

export function useUpdateLesson(courseId: string) {
  return useBuilderMutation(
    async ({ id, ...body }: { id: string } & Partial<LmsLesson>) =>
      (await api.patch(`/lessons/${id}`, body)).data,
    courseId,
  );
}

export function useDeleteLesson(courseId: string) {
  return useBuilderMutation(async (id: string) => (await api.delete(`/lessons/${id}`)).data, courseId);
}

export function useReorderLessons(courseId: string) {
  return useBuilderMutation(
    async ({ sectionId, ids }: { sectionId: string; ids: string[] }) =>
      (await api.patch(`/sections/${sectionId}/lessons/order`, { ids })).data,
    courseId,
  );
}

export function useAddActivity(courseId: string) {
  return useBuilderMutation(
    async ({ lessonId, ...body }: { lessonId: string } & Partial<LmsActivity> & { solution?: unknown }) =>
      (await api.post<LmsActivity>(`/lessons/${lessonId}/activities`, body)).data,
    courseId,
  );
}

export function useDeleteActivity(courseId: string) {
  return useBuilderMutation(async (id: string) => (await api.delete(`/activities/${id}`)).data, courseId);
}

// -------------------------------------------------------------- activities

export function useActivity(id?: string) {
  return useQuery({
    queryKey: ['activity', id],
    enabled: !!id,
    queryFn: async () => (await api.get<LmsActivity>(`/activities/${id}`)).data,
  });
}

export interface ActivitySubmitResult {
  correct: boolean;
  score: number;
  maxScore: number;
  attemptNo: number;
  reward: RewardResult | null;
}

/** Sends only the learner's response — the score comes back from the server. */
export function useSubmitActivity(activityId: string) {
  return useMutation({
    mutationFn: async (response: Record<string, unknown>) =>
      (await api.post<ActivitySubmitResult>(`/activities/${activityId}/submit`, { response })).data,
  });
}

// ------------------------------------------------------------------ quiz

export function useQuiz(id?: string) {
  return useQuery({
    queryKey: ['quiz', id],
    enabled: !!id,
    queryFn: async () => (await api.get<QuizView>(`/quizzes/${id}`)).data,
  });
}

export function useSubmitQuiz(quizId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (responses: Record<string, unknown>) =>
      (await api.post<QuizResult>(`/quizzes/${quizId}/submit`, { responses })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-home'] });
      qc.invalidateQueries({ queryKey: ['rewards'] });
    },
  });
}

// -------------------------------------------------------------- progress

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) =>
      (await api.post('/progress', { lessonId, completed: true })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-learn'] });
      qc.invalidateQueries({ queryKey: ['student-home'] });
      qc.invalidateQueries({ queryKey: ['worlds'] });
    },
  });
}

// -------------------------------------------------------------- analytics

export function useTeacherOverview() {
  return useQuery({
    queryKey: ['teacher-overview'],
    queryFn: async () => (await api.get<TeacherOverview>('/analytics/teacher')).data,
  });
}

/** Fire-and-forget educational telemetry. Never blocks the UI. */
export function trackEvent(name: string, props?: Record<string, unknown>, courseId?: string) {
  api.post('/analytics/events', { name, props, courseId }).catch(() => {});
}

// ---------------------------------------------------------------- lessons

export interface LessonView {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  type: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrls: string[];
  documentUrls: string[];
  objectives: string[];
  estimatedMinutes: number;
  courseId: string;
  completed: boolean;
  course: { id: string; title: string };
  section?: { id: string; title: string } | null;
  activities: import('@/types').LmsActivity[];
  quiz?: { id: string; title: string; passingScore: number; questionCount: number } | null;
  resources: { id: string; name: string; url: string; kind: string }[];
}

export function useLesson(id?: string) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: !!id,
    queryFn: async () => (await api.get<LessonView>(`/lessons/${id}`)).data,
  });
}
