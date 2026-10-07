/**
 * The five experiences the mobile app offers. The backend's Prisma `Role`
 * enum is finer-grained (CHILD, SCHOOL_ADMIN, DISTRICT_ADMIN, ...); see
 * `lib/roles.ts` for the mapping.
 */
export type UserRole = 'STUDENT' | 'PARENT' | 'TEACHER' | 'SCHOOL_LEADER' | 'DISTRICT_LEADER';

/** Raw role values from kidora-api/prisma/schema.prisma `enum Role`. */
export type BackendRole =
  | 'CHILD'
  | 'PARENT'
  | 'TEACHER'
  | 'SCHOOL_ADMIN'
  | 'SCHOOL_LEADER'
  | 'DISTRICT_ADMIN'
  | 'SUPER_ADMIN'
  | 'ADMIN';

export interface OrgRef {
  id: string;
  name: string;
  slug?: string;
  joinCode?: string;
}

export interface OrgRequest {
  id: string;
  requestedRole: BackendRole;
  status: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';
  organizationName: string | null;
  decisionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Shape returned by GET /auth/me (sanitized: no password/MFA secrets). */
export interface BackendUser {
  id: string;
  name: string;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  role: BackendRole;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  schoolId?: string | null;
  districtId?: string | null;
  gradeId?: string | null;
  streak?: number;
  points?: number;
  subscriptionPlan?: string | null;
  school?: OrgRef | null;
  district?: OrgRef | null;
  orgRequest?: OrgRequest | null;
}

/** App-level user, normalised from BackendUser. */
export interface User {
  id: string;
  name: string;
  displayName?: string;
  email?: string;
  role: UserRole;
  backendRole: BackendRole;
  avatarUrl?: string;
  avatarColor?: string;
  schoolId?: string;
  districtId?: string;
  school?: OrgRef;
  district?: OrgRef;
  pendingApproval: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSessionResponse extends AuthTokens {
  user: BackendUser;
}

export interface SessionMeta {
  userId: string;
  role: UserRole;
  /** epoch ms when the session was created on this device */
  createdAt: number;
}

export type Student = User & { role: 'STUDENT'; grade?: string };
export type Parent = User & { role: 'PARENT' };
export type Teacher = User & { role: 'TEACHER'; subject?: string };

export interface UserSettings {
  language?: string;
  appearance?: 'light' | 'dark' | 'system';
  difficulty?: 'low' | 'normal' | 'high';
  leaderboardVisible?: boolean;
  notifications?: {
    assignments?: boolean;
    exams?: boolean;
    messages?: boolean;
    achievements?: boolean;
    email?: boolean;
  };
}
