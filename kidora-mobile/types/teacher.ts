import type { Kpi } from './api';
import type { ActivityItem } from './parent';

export interface ClassSummary {
  id: string;
  name: string;
  grade: string;
  subject: string | null;
  subjectAccent?: string | null;
  studentCount: number;
  averageScore: number;
  completionPercent: number;
  atRiskCount: number;
  lastActivityAt: string | null;
}

/** analytics.classProgressSeries(): cumulative completion % per class per day. */
export interface ProgressSeries {
  labels: string[];
  series: { key: string; label: string; color: string; values: number[] }[];
  summary?: string;
}

export type StudentHealth = 'ON_TRACK' | 'NEEDS_SUPPORT' | 'AT_RISK';

/** Roster row shared by /teacher/students, /teacher/classes/:id and /school/students. */
export interface ClassStudent {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  className?: string | null;
  grade?: string | null;
  progressPercent: number;
  averageScore: number;
  health: StudentHealth;
  lastActiveAt?: string | null;
}

export interface ClassDetail extends ClassSummary {
  students: ClassStudent[];
  progress: ProgressSeries;
}

export interface TeacherTask {
  id: string;
  type: 'ASSIGNMENT' | 'EXAM';
  title: string;
  className: string;
  dueAt: string;
  bucket: 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'UPCOMING';
}

export interface TopicMastery {
  topic: string;
  mastered: number;
  total: number;
  averageScore: number;
  masteryPercent: number;
}

/** GET /teacher/dashboard */
export interface TeacherDashboard {
  profile: { id: string; name: string; avatarUrl: string | null; subject: string | null };
  kpis: {
    students: Kpi;
    coursesTeaching: Kpi;
    pendingAssignments: Kpi;
    averageClassProgress: Kpi;
    badgesAwarded: Kpi;
  };
  classes: ClassSummary[];
  classProgress: ProgressSeries;
  tasks: TeacherTask[];
  activity: ActivityItem[];
  topics: TopicMastery[];
  schedule: { id: string; className: string; title: string; startsAt: string; endsAt: string }[];
  unreadNotifications: number;
  unreadMessages: number;
}

/** GET /teacher/assignments items. */
export interface TeacherAssignment {
  id: string;
  title: string;
  course: string | null;
  subject: string | null;
  dueAt: string | null;
  maxScore: number;
  status: 'PENDING' | 'UPCOMING';
  submitted: number;
  total: number;
}

export interface TeacherQuiz {
  id: string;
  title: string;
  kind?: string;
  course?: string | null;
  questionCount?: number;
  published?: boolean;
  averagePercent?: number | null;
}

/** GET /teacher/analytics */
export interface TeacherAnalytics {
  classPerformance: ProgressSeries;
  topics: TopicMastery[];
  assignmentCompletion: number;
  quizAverage: number;
  examAverage: number;
  atRisk: ClassStudent[];
}

/** Student analytics card (teacher drill-down). */
export interface StudentAnalytics {
  completionRate: number;
  averageScore: number;
  timeSpentMin: number;
  weakTopics: string[];
  strongTopics: string[];
  engagement: number;
}
