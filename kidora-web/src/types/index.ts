export type Role = 'CHILD' | 'PARENT' | 'TEACHER' | 'ADMIN' | 'SCHOOL_ADMIN' | 'DISTRICT_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  points: number;
  streak: number;
  avatarColor: string;
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
  ageBand: string;
  gradient: string;
  accent: string;
  subject?: Subject;
  lessons?: Lesson[];
  teacherId?: string;
  isPremium?: boolean;
  _count?: { lessons: number };
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
