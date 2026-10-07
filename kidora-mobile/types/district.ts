/**
 * District contracts. The backend has no district endpoints yet — see
 * docs/API-GAPS.md. These types are the proposed contract the mobile app is
 * built against.
 */
export interface DistrictSchoolSummary {
  id: string;
  name: string;
  students: number;
  teachers: number;
  activeStudents: number;
  averageScore: number;
  completion: number;
  engagement: number;
  learningGrowth: number;
}

export interface DistrictMetricPoint {
  label: string;
  value: number;
}

export interface DistrictDashboard {
  district: { id: string; name: string };
  totals: {
    schools: number;
    students: number;
    teachers: number;
    activeUsers: number;
    courseCompletion: number;
    averageScore: number;
    engagement: number;
  };
  activity: { dau: number; wau: number; mau: number };
  outcomes: DistrictMetricPoint[];
  schools: DistrictSchoolSummary[];
}

export interface DistrictFilters {
  schoolId?: string;
  gradeId?: string;
  subjectId?: string;
  from?: string;
  to?: string;
}
