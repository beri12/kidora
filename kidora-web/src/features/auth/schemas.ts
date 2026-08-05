import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Tell us your name'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters'),
    confirm: z.string(),
    role: z.enum(['CHILD', 'PARENT', 'TEACHER', 'SCHOOL', 'DISTRICT']).default('PARENT'),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
export type RegisterInput = z.infer<typeof registerSchema>;

export const courseSchema = z.object({
  title: z.string().min(3, 'Give the course a title'),
  subjectSlug: z.string().min(1, 'Pick a subject'),
  ageBand: z.enum(['3-5', '6-8', '9-12']),
  description: z.string().max(600).optional().default(''),
  isPremium: z.boolean().default(false),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const lessonSchema = z.object({
  title: z.string().min(2),
  type: z.enum(['VIDEO', 'INTERACTIVE', 'QUIZ', 'GAME']),
  duration: z.string().default('5 min'),
});
export type LessonInput = z.infer<typeof lessonSchema>;
