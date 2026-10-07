/** LMS contracts (kidora-api/src/lms/learning, assessments, student). */

export type Subject =
  | 'Mathematics'
  | 'English'
  | 'Biology'
  | 'Physics'
  | 'Coding'
  | 'History'
  | 'Art'
  | 'Science'
  | (string & {});

export type LessonState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'LOCKED';
export type LessonType = 'VIDEO' | 'INTERACTIVE' | 'QUIZ' | 'GAME' | 'TEXT' | 'AUDIO' | 'MIXED';

export type ContentType =
  | 'VIDEO'
  | 'TEXT'
  | 'AUDIO'
  | 'IMAGE'
  | 'INTERACTIVE'
  | 'RESOURCE'
  | 'HEADING'
  | 'PARAGRAPH'
  | 'DOCUMENT'
  | 'CODE'
  | 'CALLOUT'
  | 'EXAMPLE'
  | 'QUESTION'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'PEER_REVIEW'
  | 'EXTERNAL_RESOURCE';

export interface School {
  id: string;
  name: string;
  logoUrl?: string | null;
  plan?: string;
}

export interface District {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  name: string;
}

/** Course card as returned by GET /student/dashboard → courses[]. */
export interface StudentCourse {
  id: string;
  slug: string;
  title: string;
  subject: Subject;
  subjectAccent?: string | null;
  grade: string | null;
  teacher: string | null;
  thumbnailUrl: string | null;
  progressPercent: number;
  lessonsCompleted: number;
  totalLessons: number;
  currentLesson: { id: string; title: string; order: number } | null;
  lastActivityAt: string | null;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
}

/** Catalogue course (GET /learning/browse). */
export interface Course {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  subject?: { id?: string; name: string; accent?: string | null } | null;
  grade?: { id?: string; name: string } | null;
  world?: string | null;
  difficulty?: string | null;
  enrolled?: boolean;
  progressPercent?: number;
}

export interface CourseLessonSummary {
  id: string;
  title: string;
  description?: string | null;
  type: LessonType;
  order: number;
  estimatedMin: number;
  completed: boolean;
  percent: number;
  locked: boolean;
  quiz: { id: string; title: string; passingScore: number } | null;
}

export interface Section {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  lessons: CourseLessonSummary[];
}

export interface CourseDetail extends Course {
  sections: Section[];
  exam: {
    id: string;
    title: string;
    durationMin: number | null;
    passingScore: number;
    quizId: string;
    questionCount: number;
    result: { percent: number; passed: boolean } | null;
  } | null;
  totals: { modules: number; lessons: number; estimatedMinutes: number };
  enrolled: boolean;
  certificate: Certificate | null;
}

export interface VideoAsset {
  id: string;
  url: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  captionsUrl?: string | null;
  processingStatus?: string;
}

export interface LessonContentItem {
  id: string;
  type: ContentType;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  order: number;
  durationSeconds?: number | null;
  video?: VideoAsset | null;
  progress?: { completed: boolean; lastPositionSec?: number }[];
}

/** A lesson activity — an interactive step (drag-drop, match, choose...). */
export interface Activity {
  id: string;
  type: 'DRAG_DROP' | 'MATCHING' | 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'SORTING' | (string & {});
  title: string;
  prompt: string;
  options?: string[];
  answer?: number;
  xpReward?: number;
}

export interface LessonProgress {
  completed: boolean;
  percent: number;
  timeSpentSec: number;
  completedAt: string | null;
}

export interface Lesson {
  id: string;
  courseId: string;
  sectionId: string | null;
  title: string;
  description: string | null;
  type: LessonType;
  order: number;
  estimatedMin: number;
  objectives?: string[] | null;
  videoUrl?: string | null;
  contents: LessonContentItem[];
  resources: { id: string; name: string; url: string; kind: string }[];
  quiz: {
    id: string;
    title: string;
    passingScore: number;
    maxAttempts: number | null;
    timeLimitSec: number | null;
    attempts: { id: string; status: string; percent: number; passed: boolean | null }[];
  } | null;
  assignments: Assignment[];
  progress: LessonProgress | null;
}

export interface LessonNavRef {
  id: string;
  title: string;
  completed?: boolean;
}

/** GET /learning/courses/:courseId/lessons/:lessonId */
export interface LessonPlayerResponse {
  lesson: Lesson;
  curriculum: LessonNavRef[];
  nav: { index: number; total: number; previous: LessonNavRef | null; next: LessonNavRef | null };
  completion: CompletionState;
}

export interface CompletionState {
  complete: boolean;
  percent?: number;
  [key: string]: unknown;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'MATCHING';

export interface QuizQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options: string[];
  points: number;
  imageUrl?: string | null;
  hint?: string | null;
  matchLefts?: string[];
  matchRights?: string[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  timeLimitSec: number | null;
  maxAttempts: number | null;
  kind?: string;
  questions: QuizQuestion[];
  attempts: { id: string; status: string; attemptNo: number; percent: number }[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  examId?: string | null;
  startedAt?: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | (string & {});
  attemptNo: number;
}

export interface QuizAnswer {
  questionId: string;
  selected?: number[];
  answerText?: string;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  needsManual: boolean;
  outcome?: import('./game').RewardOutcome | null;
  certificate?: Certificate | null;
}

/** Student assignment list item (GET /student/assignments). */
export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  course?: string | null;
  subject?: string | null;
  dueAt: string | null;
  maxScore: number;
  status?: 'UPCOMING' | 'PENDING' | 'OVERDUE' | 'SUBMITTED' | 'GRADED' | 'PUBLISHED' | 'DRAFT' | (string & {});
  score?: number | null;
  feedback?: string | null;
}

export interface Exam {
  id: string;
  title: string;
  course: string;
  scheduledAt: string | null;
  durationMin: number | null;
  status: string;
  result: { percent: number; passed: boolean; certificateId: string | null } | null;
}

export interface Certificate {
  id: string;
  code: string;
  courseName?: string;
  issuedAt: string;
  pdfUrl?: string | null;
}

export interface LessonCompleteResponse {
  rewards: import('./game').RewardOutcome;
  completion: CompletionState;
  certificate: Certificate | null;
}

/** Recommendation shown under "Recommended for you". */
export interface Recommendation {
  id: string;
  kind: 'CONTINUE' | 'PRACTICE' | 'CHALLENGE' | 'NEXT_LEVEL' | 'QUEST';
  title: string;
  subtitle?: string;
  lessonId?: string;
  courseId?: string;
  worldKey?: string;
  questId?: string;
}
