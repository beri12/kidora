import { z } from "zod";

/**
 * Validation for the course builder. The same rules run on the server; these
 * exist so the teacher is told before a request round-trips, not instead of
 * the server check.
 */

export const basicInfoSchema = z.object({
  title: z.string().trim().min(2, "Give the course a title.").max(160, "That title is too long."),
  shortDescription: z.string().trim().max(500, "Keep the short description under 500 characters.").optional(),
  description: z.string().trim().max(20000).optional(),
  subjectSlug: z.string().min(1, "Choose a subject."),
  gradeId: z.string().optional(),
  ageBand: z.string().trim().max(40).optional(),
  language: z.string().trim().max(40).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});
export type BasicInfoValues = z.infer<typeof basicInfoSchema>;

export const detailsSchema = z.object({
  learningPoints: z.array(z.string().trim().min(1)).max(20, "Twenty objectives is plenty."),
  requirements: z.array(z.string().trim().min(1)).max(20),
  tags: z.array(z.string().trim().min(1)).max(20),
  topic: z.string().trim().max(120).optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  thumbnailUrl: z.string().url("That does not look like a link.").optional().or(z.literal("")),
  bannerUrl: z.string().url("That does not look like a link.").optional().or(z.literal("")),
  trailerUrl: z.string().url("That does not look like a link.").optional().or(z.literal("")),
});
export type DetailsValues = z.infer<typeof detailsSchema>;

export const sectionSchema = z.object({
  title: z.string().trim().min(2, "Give the module a title.").max(160),
  description: z.string().trim().max(2000).optional(),
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2, "Give the lesson a title.").max(160),
  description: z.string().trim().max(4000).optional(),
  estimatedMin: z.number().int().min(1, "At least one minute.").max(600),
  isRequired: z.boolean(),
  objectives: z.array(z.string().trim().min(1)).max(20),
});

export const questionSchema = z
  .object({
    prompt: z.string().trim().min(2, "Write the question."),
    type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT", "SHORT_ANSWER", "MATCHING", "ORDERING"]),
    options: z.array(z.string()).default([]),
    correct: z.number().int().optional(),
    correctOptions: z.array(z.number().int()).default([]),
    correctOrder: z.array(z.number().int()).default([]),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).default([]),
    answerText: z.string().optional(),
    explanation: z.string().optional(),
    hint: z.string().optional(),
    points: z.number().int().min(0).max(100).default(1),
  })
  // Mirrors the server's normaliseQuestion: a question that cannot be graded
  // is not a question.
  .superRefine((q, ctx) => {
    const filled = q.options.filter((o) => o.trim().length > 0);
    const err = (message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, message });

    switch (q.type) {
      case "MULTIPLE_CHOICE":
        if (filled.length < 2) err("Add at least two options.");
        else if (q.correct === undefined || q.correct < 0 || q.correct >= q.options.length) err("Mark the correct option.");
        break;
      case "TRUE_FALSE":
        if (q.correct !== 0 && q.correct !== 1) err("Mark whether the statement is true or false.");
        break;
      case "MULTIPLE_SELECT":
        if (filled.length < 2) err("Add at least two options.");
        else if (q.correctOptions.length === 0) err("Mark at least one correct option.");
        break;
      case "SHORT_ANSWER":
        if (!q.answerText?.trim()) err("Give the answer to mark against.");
        break;
      case "ORDERING":
        if (filled.length < 2) err("Add at least two items to put in order.");
        else if (q.correctOrder.length !== q.options.length || new Set(q.correctOrder).size !== q.options.length) {
          err("Give every item a position.");
        }
        break;
      case "MATCHING":
        if (q.pairs.length < 2) err("Add at least two pairs.");
        else if (q.pairs.some((p) => !p.left.trim() || !p.right.trim())) err("Every pair needs both sides filled in.");
        break;
    }
  });
export type QuestionValues = z.infer<typeof questionSchema>;

export const assignmentSchema = z.object({
  title: z.string().trim().min(2, "Give the assignment a title."),
  instructions: z.string().trim().min(1, "Tell the student what to do."),
  maxScore: z.number().int().min(1, "The score must be above zero.").max(1000),
  dueAt: z.string().optional(),
  allowLate: z.boolean(),
  allowResubmit: z.boolean(),
  isRequired: z.boolean(),
  submissionType: z.enum(["TEXT", "FILE", "BOTH"]),
  rubric: z.array(z.object({ criterion: z.string().trim().min(1), points: z.number().int().min(0) })),
});

/** First error message for a field, or undefined. */
export function fieldError(result: z.SafeParseReturnType<unknown, unknown> | null, path: string): string | undefined {
  if (!result || result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

/** Every message, for a form-level summary. */
export function allErrors(result: z.SafeParseReturnType<unknown, unknown> | null): string[] {
  if (!result || result.success) return [];
  return result.error.issues.map((i) => i.message);
}
