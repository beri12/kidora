import { z } from 'zod';

import type { TranslationKey } from '@/i18n';

/**
 * Client-side validation mirrors kidora-api/src/auth/dto/auth.dto.ts so most
 * mistakes are caught before a round trip. The backend remains the
 * authority. Messages are i18n keys, translated at render time.
 */
const msg = (key: TranslationKey) => ({ message: key });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

export const emailSchema = z.string().trim().min(1, msg('validation.required')).regex(EMAIL_RE, msg('validation.email'));
export const phoneSchema = z.string().trim().regex(PHONE_RE, msg('validation.phone'));
export const passwordSchema = z.string().min(8, msg('validation.passwordMin')).max(72, msg('validation.passwordMax'));

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, msg('validation.emailOrPhone'))
    .refine((v) => EMAIL_RE.test(v) || PHONE_RE.test(v), msg('validation.emailOrPhone')),
  password: z.string().min(1, msg('validation.required')),
  mfaCode: z.string().regex(/^\d{6}$/, msg('validation.otp')).optional().or(z.literal('')),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const ROLE_VALUES = ['STUDENT', 'PARENT', 'TEACHER', 'SCHOOL_LEADER', 'DISTRICT_LEADER'] as const;

export const registerSchema = z
  .object({
    role: z.enum(ROLE_VALUES),
    name: z.string().trim().min(2, msg('validation.nameMin')).max(120),
    email: emailSchema,
    phone: z.union([phoneSchema, z.literal('')]).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    schoolCode: z.string().trim().max(24).optional(),
    schoolName: z.string().trim().max(160).optional(),
    districtName: z.string().trim().max(160).optional(),
    gradeLevel: z.string().trim().max(40).optional(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], ...msg('validation.passwordMatch') })
  .refine((v) => v.role !== 'SCHOOL_LEADER' || !!v.schoolName, { path: ['schoolName'], ...msg('validation.required') })
  .refine((v) => v.role !== 'DISTRICT_LEADER' || !!v.districtName, { path: ['districtName'], ...msg('validation.required') });
export type RegisterForm = z.infer<typeof registerSchema>;

export const otpPhoneSchema = z.object({ phone: phoneSchema });
export const otpCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/, msg('validation.otp')) });

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ token: z.string().trim().min(1, msg('validation.required')), password: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], ...msg('validation.passwordMatch') });

export const profileSchema = z.object({ displayName: z.string().trim().min(1, msg('validation.displayName')).max(60, msg('validation.displayName')) });

export const assignmentSchema = z.object({
  title: z.string().trim().min(2, msg('validation.nameMin')).max(160),
  instructions: z.string().trim().max(4000).optional(),
  maxScore: z.string().trim().regex(/^[1-9]\d{0,3}$/, msg('validation.required')),
});
export type AssignmentForm = z.infer<typeof assignmentSchema>;
