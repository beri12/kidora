// Shared School-LMS types. These mirror the API's Prisma models so web (and a
// future mobile client) read one definition instead of re-declaring shapes.

export type CourseVisibility = 'SCHOOL' | 'PUBLIC' | 'PRIVATE';
export type CourseAccessType = 'FREE' | 'SPONSORED' | 'PREMIUM';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'GRADED';
export type SubmissionType = 'TEXT' | 'IMAGE' | 'PDF' | 'FILE';
export type QuestStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export type LessonKind = 'VIDEO' | 'INTERACTIVE' | 'QUIZ' | 'GAME' | 'ARTICLE' | 'AUDIO' | 'RESOURCE';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'ORDERING'
  | 'DRAG_DROP'
  | 'FILL_BLANK'
  | 'IMAGE_SELECT'
  | 'SHORT_ANSWER';

export type ActivityType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'MATCHING'
  | 'DRAG_DROP'
  | 'ORDERING'
  | 'MEMORY'
  | 'PUZZLE'
  | 'SIMULATION'
  | 'DIALOGUE'
  | 'BOSS_CHALLENGE';

export type XpReason =
  | 'LESSON_COMPLETED'
  | 'ACTIVITY_COMPLETED'
  | 'QUIZ_COMPLETED'
  | 'QUIZ_PERFECT'
  | 'ASSIGNMENT_SUBMITTED'
  | 'ASSIGNMENT_GRADED'
  | 'EXAM_PASSED'
  | 'QUEST_COMPLETED'
  | 'BOSS_DEFEATED'
  | 'COURSE_COMPLETED'
  | 'DAILY_STREAK';

// ---------------------------------------------------------------- school

export interface School {
  id: string;
  name: string;
  slug?: string | null;
  code?: string | null;
  city?: string | null;
  country?: string | null;
  timezone: string;
  isActive: boolean;
  district?: { id: string; name: string; region: string } | null;
  _count?: { members: number; grades: number; classes: number; courses: number };
}

export interface Grade {
  id: string;
  name: string;
  level: number;
  schoolId?: string | null;
  _count?: { classes: number; courses: number; students: number };
}

export interface SchoolClass {
  id: string;
  name: string;
  academicYear?: string | null;
  isActive: boolean;
  grade?: { id: string; name: string } | null;
  homeroomTeacher?: { id: string; name: string } | null;
  _count?: { students: number };
}

export interface SchoolPerson {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  avatarUrl?: string | null;
  points: number;
  streak: number;
  createdAt: string;
  gradeId?: string | null;
  grade?: { id: string; name: string } | null;
  _count?: Record<string, number>;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SchoolDashboard {
  students: number;
  teachers: number;
  classes: number;
  courses: number;
  publishedCourses: number;
  activeToday: number;
  certificates: number;
  completionRate: number;
  avgProgress: number;
  averageScore: number;
  atRisk: number;
  recentActivity: { id: string; name: string; createdAt: string; props: Record<string, unknown> }[];
}

export interface PerformanceRow {
  id?: string;
  name: string;
  learners: number;
  avgProgress: number;
  completionRate: number;
}

export interface SchoolPerformance {
  byGrade: PerformanceRow[];
  bySubject: PerformanceRow[];
}

export interface TeacherOverview {
  courses: { id: string; title: string; published: boolean; _count: { lessons: number; enrollments: number } }[];
  courseCount: number;
  publishedCount: number;
  activeStudents: number;
  pendingSubmissions: number;
  upcomingExams: number;
  avgProgress: number;
  completionRate: number;
  averageScore: number;
  needsSupport: { id: string; name: string; avatarColor: string }[];
}

// ---------------------------------------------------------------- course

export interface LmsSubject {
  id: string;
  slug: string;
  name: string;
  accent?: string;
}

export interface LmsActivity {
  id: string;
  title: string;
  instructions?: string | null;
  type: ActivityType;
  order: number;
  points: number;
  xpReward?: number;
  coinReward?: number;
  /** Renderer payload. The answer key is stripped server-side. */
  config?: Record<string, any> | null;
  lesson?: { id: string; title: string; courseId: string };
}

export interface LmsLesson {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  type: LessonKind;
  order: number;
  duration: string;
  estimatedMinutes: number;
  videoUrl?: string | null;
  audioUrl?: string | null;
  imageUrls?: string[];
  documentUrls?: string[];
  objectives?: string[];
  isRequired: boolean;
  xpReward?: number;
  sectionId?: string | null;
  activities?: LmsActivity[];
  quiz?: { id: string; title: string; passingScore: number } | null;
}

export interface LmsSection {
  id: string;
  title: string;
  description?: string | null;
  objectives?: string[];
  order: number;
  lessons: LmsLesson[];
  quizzes?: { id: string; title: string; passingScore: number }[];
  assignments?: { id: string; title: string; dueAt?: string | null; points: number }[];
}

export interface LmsCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  gradient: string;
  accent: string;
  published: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  visibility: CourseVisibility;
  accessType: CourseAccessType;
  objectives?: string[];
  learningPoints?: string[];
  requirements?: string[];
  tags?: string[];
  ageBand?: string | null;
  subject?: LmsSubject | null;
  grade?: { id: string; name: string } | null;
  school?: { id: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
  sections?: LmsSection[];
  lessons?: LmsLesson[];
  exams?: LmsExamSummary[];
  _count?: { lessons?: number; sections?: number; enrollments?: number };
  /** Present on catalog rows. */
  progress?: number;
  completed?: boolean;
}

export interface CourseLearnerView extends LmsCourse {
  sections: LmsSection[];
  completedLessonIds: string[];
  progressPercent: number;
}

// ------------------------------------------------------------ assessment

export interface QuizQuestionView {
  id: string;
  prompt: string;
  type: QuestionType;
  options: string[];
  order: number;
  points: number;
  imageUrl?: string | null;
  explanation?: string | null;
  /** Answer-key fields are removed by the API before this is sent. */
  data?: Record<string, any> | null;
}

export interface QuizView {
  id: string;
  title: string;
  description?: string | null;
  passingScore: number;
  timeLimitSec?: number | null;
  maxAttempts: number;
  questions: QuizQuestionView[];
}

export interface QuizResult {
  score: number;
  total: number;
  pointsEarned: number;
  perfect: boolean;
  percent: number;
  passed: boolean;
  passingScore: number;
  attemptNo: number;
  attemptsLeft: number | null;
  perQuestion: { id: string; correct: boolean; points: number }[];
  reward?: RewardResult | null;
}

export interface LmsExamSummary {
  id: string;
  title: string;
  passingScore: number;
  timeLimitMin?: number;
  maxAttempts?: number;
}

export interface ExamOverview {
  id: string;
  title: string;
  description?: string | null;
  course: { id: string; title: string };
  timeLimitMin: number;
  passingScore: number;
  maxAttempts: number;
  questionCount: number;
  attempts: { attemptNo: number; status: AttemptStatus; percent: number; passed: boolean; submittedAt: string | null }[];
  attemptsLeft: number;
}

export interface ExamAttemptView {
  attemptId: string;
  attemptNo: number;
  expiresAt: string | null;
  timeLimitMin: number;
  title: string;
  questions: QuizQuestionView[];
}

export interface ExamResult {
  attemptNo: number;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  expired: boolean;
  passingScore: number;
  correctCount: number;
  total: number;
  reward?: RewardResult | null;
  certificate?: LmsCertificate | null;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  dueAt?: string | null;
  points: number;
  submissionTypes: SubmissionType[];
  attachmentUrls: string[];
  published: boolean;
  courseId: string;
  course?: { id: string; title: string };
  mySubmission?: AssignmentSubmissionRow | null;
  submissions?: AssignmentSubmissionRow[];
  _count?: { submissions: number };
}

export interface AssignmentSubmissionRow {
  id: string;
  studentId: string;
  text?: string | null;
  attachmentUrls: string[];
  status: SubmissionStatus;
  score?: number | null;
  feedback?: string | null;
  submittedAt: string;
  student?: { id: string; name: string; avatarColor: string };
}

export interface LmsCertificate {
  id: string;
  courseName: string;
  serial?: string | null;
  studentName?: string | null;
  schoolName?: string | null;
  gradeName?: string | null;
  score?: number | null;
  issuedAt: string;
  course?: { id: string; title: string; thumbnailUrl?: string | null } | null;
}

export interface CertificateEligibility {
  courseId: string;
  courseTitle: string;
  eligible: boolean;
  lessonsComplete: boolean;
  lessonsDone: number;
  lessonsRequired: number;
  quizzesPassed: boolean;
  quizzesRequired: number;
  examPassed: boolean;
  examRequired: boolean;
  averageScore: number;
}

// ------------------------------------------------------------------ game

export interface RewardResult {
  xp: number;
  coins: number;
  totalXp: number;
  level: number;
  levelUp: boolean;
  badge?: { slug: string; name: string } | null;
}

export interface WorldZone {
  slug: string;
  name: string;
  emoji: string;
}

export interface WorldSummary {
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  accent: string;
  npc: { name: string; emoji: string; greeting: string };
  zones: WorldZone[];
  courseCount: number;
  completedCourses: number;
  percent: number;
  locked: boolean;
}

export interface QuestSummary {
  id: string;
  slug?: string;
  title: string;
  story: string;
  npcName?: string | null;
  npcEmoji: string;
  zone?: string | null;
  isBoss: boolean;
  courseId?: string | null;
  course?: { id: string; title: string; thumbnailUrl?: string | null } | null;
  xpReward: number;
  coinReward: number;
  status: QuestStatus;
  progress: number;
}

export interface WorldDetail extends Omit<WorldSummary, 'courseCount' | 'completedCourses' | 'percent' | 'locked'> {
  key: string;
  subjects: string[];
  courses: (LmsCourse & { percent: number; completed: boolean })[];
  quests: QuestSummary[];
}

export interface StudentWallet {
  coins: number;
  gems: number;
  xp: number;
  level: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
}

export interface StudentHome {
  profile: {
    id: string;
    name: string;
    avatarColor: string;
    avatarUrl?: string | null;
    avatar?: Record<string, unknown> | null;
    grade?: { id: string; name: string } | null;
    school?: { id: string; name: string } | null;
    streak: number;
  };
  wallet: StudentWallet;
  inProgress: { courseId: string; percent: number; course: LmsCourse }[];
  recommended: LmsCourse[];
  badges: { id: string; slug: string; name: string; desc: string; glyph: string; gradient: string }[];
  certificates: number;
  recentXp: { id: string; reason: XpReason; amount: number; coins: number; createdAt: string }[];
}

export interface StudentProgressReport {
  courses: { courseId: string; percent: number; completed: boolean; course: LmsCourse }[];
  quizzes: { attemptNo: number; percent: number; passed: boolean; submittedAt: string; quiz: { id: string; title: string } }[];
  exams: { attemptNo: number; percent: number; passed: boolean; submittedAt: string; exam: { id: string; title: string } }[];
  assignments: AssignmentSubmissionRow[];
}

export interface ChildReport {
  child: {
    id: string; name: string; avatarColor: string; streak: number; points: number;
    grade?: { name: string } | null; school?: { name: string } | null;
  };
  xp: number;
  level: number;
  streak: number;
  courses: { courseId: string; percent: number; completed: boolean; course: { id: string; title: string; subject?: { name: string } | null } }[];
  certificates: LmsCertificate[];
  badges: { id: string; name: string; glyph: string; gradient: string }[];
  quizzes: { percent: number; passed: boolean; submittedAt: string; quiz: { title: string } }[];
  exams: { percent: number; passed: boolean; submittedAt: string; exam: { title: string } }[];
  assignments: (AssignmentSubmissionRow & { assignment: { title: string; points: number; dueAt?: string | null } })[];
  averageScore: number;
}
