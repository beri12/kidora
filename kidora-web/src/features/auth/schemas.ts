// Barrel for the auth/form schemas.
//
// The pages import from '@/features/auth/schemas' (plural) while the
// definitions live in ./schema — re-exporting keeps both spellings valid
// rather than churning every import site.
export * from './schema';

import { z } from 'zod';
import { SUBJECTS } from '@/constants';

/**
 * Course creation form (dashboard/teacher/upload).
 *
 * subjectSlug is validated against the SUBJECTS constant the form's <select>
 * is built from, so the two cannot drift apart.
 */
export const courseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title is too long'),
  subjectSlug: z
    .string()
    .refine((s) => SUBJECTS.some((subject) => subject.slug === s), 'Pick a subject'),
  ageBand: z.enum(['3-5', '6-8', '9-12']),
  description: z
    .string()
    .trim()
    .max(2000, 'Description is too long')
    .optional()
    .or(z.literal('')),
  isPremium: z.boolean(),
});

export type CourseInput = z.infer<typeof courseSchema>;
