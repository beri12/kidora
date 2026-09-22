/**
 * Some pages import "@/features/auth/schemas" (plural) and others
 * "@/features/auth/schema". Re-exporting keeps both paths working off one
 * source of truth rather than letting two copies of the rules drift apart.
 */
export * from "./schema";

import { z } from "zod";

/** Teacher course-creation form (dashboard/teacher/upload). */
export const courseSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title is too long"),
  subjectSlug: z.string().min(1, "Pick a subject"),
  ageBand: z.enum(["3-5", "6-8", "9-12"]),
  description: z.string().trim().min(10, "Add a short description (10+ characters)").max(2000, "Description is too long"),
  isPremium: z.boolean().default(false),
});
export type CourseInput = z.infer<typeof courseSchema>;
