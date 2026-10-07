import type { Kpi } from './api';
import type { Achievement } from './game';
import type { Assignment, Exam } from './lms';

/** GET /parent/children */
export interface ChildSummary {
  id: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  grade: string | null;
  className: string | null;
  schoolName: string | null;
}

export interface SubjectProgress {
  subject: string;
  accent?: string | null;
  percent: number;
}

/** GET /parent/dashboard?childId&range */
export interface ParentDashboard {
  parent: { id: string; name: string; avatarUrl: string | null };
  children: ChildSummary[];
  selectedChildId: string;
  kpis: {
    overallProgress: Kpi;
    lessonsCompleted: Kpi;
    quizAverage: Kpi;
    streak: Kpi;
    coins: Kpi;
  } | null;
  subjectProgress: SubjectProgress[];
  weeklyActivity: {
    labels: string[];
    minutes: number[];
    totalMinutes: number;
    lessons: number;
    quizzes: number;
    assignments: number;
  };
  achievements: Achievement[];
  upcomingAssignments: Assignment[];
  insights: { strengths: string[]; needsPractice: string[]; tip?: string | null };
  tips: { id: string; title: string; body: string; icon: string }[];
  unreadNotifications: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  xpDelta: number | null;
  createdAt: string;
  actor?: { id: string; name: string; avatarUrl?: string | null; grade?: string | null };
}

export interface ChildAssessments {
  quizzes: {
    id: string;
    title: string;
    course: string | null;
    bestPercent: number | null;
    status: string;
    questionCount: number;
  }[];
  exams: Exam[];
}
