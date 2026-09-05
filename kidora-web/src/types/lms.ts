// ---------------------------------------------------------------------------
// Kidora LMS — shared API contracts (frontend copy).
// Keep in sync with backend DTOs. Every dashboard reads ONE aggregated
// endpoint (spec §57); values are never hardcoded in the UI.
// ---------------------------------------------------------------------------

export type Role =
  | "CHILD" | "PARENT" | "TEACHER" | "SCHOOL_ADMIN" | "SCHOOL_LEADER"
  | "DISTRICT_ADMIN" | "SUPER_ADMIN" | "ADMIN";

export interface Paginated<T> { items: T[]; page: number; pageSize: number; total: number; }

export interface Trend { delta: number; label: string; series?: number[]; }

export interface Kpi {
  value: number;
  unit?: "percent" | "count" | "days" | "coins" | "xp";
  trend?: Trend;
  caption?: string;
}

export interface UserSummary {
  id: string; name: string; displayName?: string | null; avatarUrl?: string | null;
  avatarColor?: string; role: Role; schoolId?: string | null; schoolName?: string | null;
}

export interface NotificationItem {
  id: string; title: string; body: string; read: boolean; type: string; link?: string | null; createdAt: string;
}

// ------------------------------- Student -----------------------------------

export interface CourseCard {
  id: string; slug: string; title: string; subject: string; subjectAccent: string;
  grade?: string | null; teacher?: string | null; thumbnailUrl?: string | null;
  progressPercent: number; lessonsCompleted: number; totalLessons: number;
  currentLesson?: { id: string; title: string; order: number } | null;
  lastActivityAt?: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

export interface Quest {
  id: string; kind: "DAILY" | "WEEKLY" | "MISSION" | "STREAK"; title: string; description: string;
  progress: number; target: number; rewardXP: number; rewardCoins: number;
  completed: boolean; claimed: boolean; endsAt?: string | null;
}

export interface AchievementItem {
  id: string; title: string; description: string; xpReward: number;
  unlockedAt?: string | null; progress: number; requirement: number; badgeUrl?: string;
}

export interface LeaderboardEntry {
  rank: number; userId: string; displayName: string; avatarUrl?: string | null;
  avatarColor?: string; xp: number; isMe: boolean;
}

export interface StudentDashboard {
  profile: UserSummary & { level: number; xp: number; xpForNextLevel: number; coins: number; streak: number };
  stats: { coursesEnrolled: number; lessonsCompleted: number; quizzesCompleted: number; averageScore: number };
  adventure: {
    world: string; level: number; nextLevel: number; xp: number; xpForNextLevel: number;
    course?: { id: string; slug: string; title: string; subject: string } | null;
    lesson?: { id: string; title: string; order: number; total: number; xpReward: number } | null;
    progressPercent: number;
  } | null;
  courses: CourseCard[];
  dailyQuest: Quest | null;
  streakWeek: { day: string; date: string; done: boolean; isToday: boolean }[];
  achievements: AchievementItem[];
  leaderboard: { period: "week" | "month"; entries: LeaderboardEntry[] };
  unreadNotifications: number;
}

export interface AssignmentItem {
  id: string; title: string; description?: string; course?: string | null; subject?: string | null;
  subjectAccent?: string; teacher?: string | null; dueAt?: string | null; maxScore: number;
  status: "UPCOMING" | "PENDING" | "SUBMITTED" | "GRADED" | "OVERDUE";
  score?: number | null; feedback?: string | null;
}

export interface QuizItem {
  id: string; title: string; course?: string | null; questionCount: number; timeLimitSec?: number | null;
  attemptsUsed: number; maxAttempts: number; bestPercent?: number | null;
  status: "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
}

export interface ExamItem {
  id: string; title: string; course: string; scheduledAt?: string | null; availableFrom?: string | null;
  availableUntil?: string | null; durationMin?: number | null;
  status: "SCHEDULED" | "OPEN" | "COMPLETED" | "CLOSED";
  result?: { percent: number; passed: boolean; certificateId?: string | null } | null;
}

export interface CertificateItem {
  id: string; code: string; courseName: string; studentName: string; schoolName: string;
  gradeName?: string | null; issuedAt: string; pdfUrl?: string | null;
}

export interface BadgeItem {
  id: string; slug: string; name: string; desc: string; glyph: string; gradient: string;
  earnedAt?: string | null; requirementText?: string;
}

export interface WorldNode {
  id: string; type: "AREA" | "COURSE" | "SECTION" | "LESSON" | "CHALLENGE" | "BOSS";
  title: string; status: "LOCKED" | "AVAILABLE" | "COMPLETED"; href?: string; children?: WorldNode[];
}

export interface WorldMap {
  worlds: { key: string; name: string; progress: number; accent: string; nodes: WorldNode[] }[];
}

export interface AiTutorMessage { id: string; role: "user" | "assistant"; content: string; createdAt: string; }

// ------------------------------- Teacher -----------------------------------

export interface ClassSummary {
  id: string; name: string; grade: string; subject?: string | null; subjectAccent?: string;
  studentCount: number; averageScore: number; completionPercent: number; atRiskCount: number;
  lastActivityAt?: string | null;
}

export interface ProgressSeries {
  labels: string[];
  series: { key: string; label: string; color?: string; values: number[] }[];
  summary?: string;
}

export interface TaskItem {
  id: string; type: "ASSIGNMENT" | "QUIZ" | "EXAM" | "LESSON"; title: string; className: string;
  dueAt: string; bucket: "TODAY" | "TOMORROW" | "UPCOMING" | "OVERDUE"; href?: string;
}

export interface ActivityItem {
  id: string; type: string;
  actor: { id: string; name: string; avatarUrl?: string | null; avatarColor?: string; grade?: string | null };
  title: string; xpDelta?: number; createdAt: string;
}

export interface TopicPerformance { topic: string; mastered: number; total: number; averageScore: number; masteryPercent: number; }

export interface ScheduleItem { id: string; date: string; className: string; title: string; startsAt: string; endsAt: string; }

export interface TeacherDashboard {
  profile: UserSummary & { subject?: string | null; verified: boolean };
  kpis: { students: Kpi; coursesTeaching: Kpi; pendingAssignments: Kpi; averageClassProgress: Kpi; badgesAwarded: Kpi };
  classes: ClassSummary[];
  classProgress: ProgressSeries;
  tasks: TaskItem[];
  activity: ActivityItem[];
  topics: TopicPerformance[];
  schedule: ScheduleItem[];
  unreadNotifications: number;
  unreadMessages: number;
}

export interface GradebookRow {
  student: { id: string; name: string; avatarUrl?: string | null };
  cells: { assessmentId: string; score: number | null; max: number; status: "MISSING" | "SUBMITTED" | "GRADED" }[];
  average: number | null;
}

export interface Gradebook {
  assessments: { id: string; title: string; type: "ASSIGNMENT" | "QUIZ" | "EXAM"; max: number }[];
  rows: Paginated<GradebookRow>;
}

// ------------------------------- School ------------------------------------

export interface SchoolDashboard {
  school: { id: string; name: string; logoUrl?: string | null; plan: string };
  admin: UserSummary;
  kpis: { students: Kpi; teachers: Kpi; courses: Kpi; classes: Kpi; averageCompletion: Kpi };
  learningProgress: ProgressSeries;
  studentHealth: { onTrack: number; needsSupport: number; atRisk: number; total: number };
  alerts: NotificationItem[];
  academicOverview: { courseCompletion: number; assignmentCompletion: number; quizAverage: number; examPassRate: number };
  topSubjects: { subject: string; accent: string; averageScore: number; completion: number; mastery: number }[];
  topClasses: ClassSummary[];
  recentActivity: ActivityItem[];
  unreadNotifications: number;
}

export interface SchoolStudentRow {
  id: string; name: string; avatarUrl?: string | null; grade?: string | null; className?: string | null;
  progressPercent: number; averageScore: number; health: "ON_TRACK" | "NEEDS_SUPPORT" | "AT_RISK";
  lastActiveAt?: string | null;
}

export interface SchoolTeacherRow {
  id: string; name: string; email: string; avatarUrl?: string | null; subject?: string | null;
  classCount: number; studentCount: number; verified: boolean;
}

export interface Billing {
  plan: string; status: string; studentLimit: number; studentsUsed: number;
  storageUsedBytes: number; storageLimitBytes: number; renewsAt?: string | null; provider?: string | null;
}

// ------------------------------- Parent ------------------------------------

export interface ChildSummary {
  id: string; name: string; displayName?: string | null; avatarUrl?: string | null; avatarColor?: string;
  grade?: string | null; className?: string | null; schoolName?: string | null;
}

export interface ParentDashboard {
  parent: UserSummary;
  children: ChildSummary[];
  selectedChildId: string;
  range: { from: string; to: string };
  kpis: { overallProgress: Kpi; lessonsCompleted: Kpi; quizAverage: Kpi; streak: Kpi; coins: Kpi };
  subjectProgress: { subject: string; accent: string; percent: number }[];
  weeklyActivity: { labels: string[]; minutes: number[]; totalMinutes: number; lessons: number; quizzes: number; assignments: number };
  achievements: AchievementItem[];
  upcomingAssignments: AssignmentItem[];
  insights: { strengths: string[]; needsPractice: string[]; tip?: string | null };
  messages: { id: string; conversationId: string; teacher: { name: string; avatarUrl?: string | null }; preview: string; unread: boolean; createdAt: string }[];
  tips: { id: string; title: string; body: string; icon: string }[];
  unreadNotifications: number;
}

export interface ConversationSummary {
  id: string; title: string;
  participant: { id: string; name: string; avatarUrl?: string | null; role: Role };
  lastMessage?: { body: string; createdAt: string } | null; unread: number; studentName?: string | null;
}

export interface MessageItem { id: string; senderId: string; body: string; createdAt: string; mine: boolean; }
