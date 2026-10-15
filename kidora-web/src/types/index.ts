
// Mirrors the Prisma Role enum in kidora-api/prisma/schema.prisma exactly.
export type Role =
  | 'CHILD'
  | 'PARENT'
  | 'TEACHER'
  | 'SCHOOL_ADMIN'
  | 'SCHOOL_LEADER'
  | 'DISTRICT_ADMIN'
  | 'SUPER_ADMIN'
  | 'ADMIN';

/** The roles a visitor may pick for themselves in the "How will you use Kidora?" step. */
export type SignupRoleKey = Extract<
  Role,
  'CHILD' | 'PARENT' | 'TEACHER' | 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN'
>;

export interface User {
  id: string;
  name: string;
  /** Null only on older accounts that signed up by phone before email-only sign-in. */
  email: string | null;
  /** False until the account has answered "How will you use Kidora?". */
  roleConfirmed?: boolean;
  /** The newest school / district access request, when there is one. */
  orgRequest?: OrgRequest | null;
  role: Role;
  points: number;
  streak: number;
  avatarColor: string;
  schoolId?: string | null;
  districtId?: string | null;
  /** A school picked at sign-up without its code, waiting for approval. */
  requestedSchoolId?: string | null;
  gradeLevel?: string | null;
  dateOfBirth?: string | null;
  subscriptionPlan?: 'free' | 'family' | 'school';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * POST /auth/register, POST /auth/email/resend, and the body of the 403 an
 * unverified account gets from POST /auth/login. The code itself only ever
 * arrives by email.
 */
export interface EmailPending {
  needsEmailVerification: true;
  email: string;
  /** e.g. "ab***@example.com" */
  maskedEmail: string;
  expiresIn: number;
  resendIn: number;
}

/** POST /auth/email/verify */
export interface EmailVerifyResponse extends AuthResponse {
  needsRole: boolean;
}

export type OrgRequestStatus = 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';

/** A claim to a school or district role, waiting on a human to check it. */
export interface OrgRequest {
  id: string;
  requestedRole: 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN';
  status: OrgRequestStatus;
  organizationName: string;
  /** Why it was refused, or what is still missing. */
  decisionNote?: string | null;
  /** True when an organisation code let it through with no review. */
  autoApproved?: boolean;
  createdAt: string;
  reviewedAt?: string | null;
}

/** POST /org/requests */
export interface SubmitOrgRequestResponse {
  status: 'PENDING' | 'APPROVED';
  request: OrgRequest;
  roleGranted: boolean;
}

export interface Subject {
  id: string;
  slug: string;
  name: string;
  accent: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  /** Optional on drafts — the wizard fills it in later. */
  ageBand?: string;
  gradient: string;
  accent: string;
  subject?: Subject;
  lessons?: Lesson[];
  sections?: Section[];
  teacherId?: string;
  isPremium?: boolean;
  /** Drafts are unpublished; the teacher list badges off this. */
  published?: boolean;
  status?: 'DRAFT' | 'PUBLISHED' | 'REVIEW' | 'ARCHIVED';
  thumbnailUrl?: string | null;
  trailerUrl?: string | null;
  createdAt?: string;
  _count?: { lessons: number };
}

export interface Section {
  id: string;
  title: string;
  order: number;
  description?: string;
  lectures?: Lecture[];
}

export interface Lecture {
  id: string;
  title: string;
  order: number;
  content?: string | null;
  videoUrl?: string | null;
  videoFileName?: string | null;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'VIDEO' | 'INTERACTIVE' | 'QUIZ' | 'GAME';
  order: number;
  videoUrl?: string;
  resources?: Resource[];
}

export interface Resource {
  id: string;
  name: string;
  kind: 'video' | 'document' | 'image' | 'other';
  url: string;
  sizeBytes?: number;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  desc: string;
  glyph: string;
  gradient: string;
  earned?: boolean;
}

export interface Plan {
  key: 'free' | 'family' | 'school';
  name: string;
  priceCents: number;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
}
