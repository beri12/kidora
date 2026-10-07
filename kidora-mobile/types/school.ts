import type { Kpi } from './api';
import type { ActivityItem } from './parent';
import type { ClassSummary, ProgressSeries } from './teacher';

export interface HealthBreakdown {
  onTrack: number;
  needsSupport: number;
  atRisk: number;
  total: number;
}

/** GET /school/dashboard */
export interface SchoolDashboard {
  school: { id: string; name: string; logoUrl: string | null; plan: string };
  kpis: {
    students: Kpi;
    teachers: Kpi;
    courses: Kpi;
    classes: Kpi;
    averageCompletion: Kpi;
  };
  learningProgress: ProgressSeries;
  studentHealth: HealthBreakdown;
  academicOverview: {
    courseCompletion: number;
    assignmentCompletion: number;
    quizAverage: number;
    examPassRate: number;
  };
  topSubjects: SubjectPerformance[];
  topClasses: ClassSummary[];
  recentActivity: ActivityItem[];
  unreadNotifications: number;
}

/** GET /school/teachers items. */
export interface SchoolTeacher {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  subject: string | null;
  classCount: number;
  studentCount: number;
  verified: boolean;
}

/** GET /school/courses items. */
export interface SchoolCourse {
  id: string;
  slug: string;
  title: string;
  status: string;
  subject: string;
  subjectAccent?: string | null;
  grade: string | null;
  teacher: string | null;
  thumbnailUrl: string | null;
  totalLessons: number;
}

/** GET /school/analytics */
export interface SchoolAnalytics {
  progress: ProgressSeries;
  subjects: SubjectPerformance[];
  health: HealthBreakdown;
}

/** analytics.subjectPerformance() rows. */
export interface SubjectPerformance {
  subject: string;
  accent?: string | null;
  averageScore: number;
  completion: number;
  mastery: number;
}
