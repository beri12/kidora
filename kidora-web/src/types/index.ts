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

export interface User {
  id: string;
  name: string;
  email: string;
  /** E.164, set when the account uses SMS sign-in. */
  phone?: string | null;
  phoneVerified?: boolean;
  role: Role;
  points: number;
  streak: number;
  avatarColor: string;
  schoolId?: string | null;
  districtId?: string | null;
  subscriptionPlan?: 'free' | 'family' | 'school';
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
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
