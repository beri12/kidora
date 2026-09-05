import { z } from "zod";

/**
 * Validation for every auth form. Written to compile on zod 3 and 4.
 * Field names match the form state in the login/register pages.
 */

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(72, "Password is too long")
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

/**
 * Mobile numbers are sent to Twilio, which requires E.164. The server
 * normalises local numbers against SMS_DEFAULT_COUNTRY_CODE, so this only has
 * to reject what is obviously not a phone number.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid mobile number")
  .max(20, "That number looks too long")
  .regex(/^\+?[0-9\s()\-.]+$/, "Digits only, with an optional leading +");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * These are the keys SIGNUP_ROLES actually uses, which are the backend Role
 * enum values. The old list used the short "SCHOOL"/"DISTRICT" spellings, so
 * picking School Leader or District Leader failed validation on a `role` field
 * the form never renders an error for — the submit button simply did nothing.
 */
export const signupRoleKeySchema = z.enum([
  "CHILD",
  "PARENT",
  "TEACHER",
  "SCHOOL_ADMIN",
  "DISTRICT_ADMIN",
]);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name is too long"),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm your password"),
    phone: phoneSchema.optional().or(z.literal("")),
    role: signupRoleKeySchema,
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export type RegisterInput = z.infer<typeof registerSchema>;

/** Role-specific fields, validated only for the role being submitted. */
export const roleFieldSchemas = {
  CHILD: z.object({
    gradeLevel: z.string().trim().min(1, "Required"),
    schoolCode: z.string().trim().max(24, "That code looks too long").optional().or(z.literal("")),
  }),
  PARENT: z.object({}),
  TEACHER: z.object({
    subject: z.string().trim().min(1, "Required"),
    schoolCode: z.string().trim().max(24, "That code looks too long").optional().or(z.literal("")),
  }),
  SCHOOL_ADMIN: z.object({
    schoolName: z.string().trim().min(2, "Required").max(160, "Name is too long"),
    country: z.string().trim().min(2, "Required"),
  }),
  DISTRICT_ADMIN: z.object({
    districtName: z.string().trim().min(2, "Required").max(160, "Name is too long"),
    region: z.string().trim().min(2, "Required"),
  }),
} as const;

/** Step 1 of SMS sign-in. */
export const otpRequestSchema = z.object({ phone: phoneSchema });

/** Step 2 of SMS sign-in. */
export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string().min(1, "Confirm your password") })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match" });
export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") });

/** Zod issues → { field: message } for <FieldError>. */
export function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const key = String(i.path[0] ?? "form");
    if (!out[key]) out[key] = i.message;
  }
  return out;
}

/** Validates the base form plus the current role's extra fields in one pass. */
export function validateRegister(form: Record<string, string>, roleKey: keyof typeof roleFieldSchemas) {
  const base = registerSchema.safeParse({ ...form, role: roleKey });
  const extra = roleFieldSchemas[roleKey].safeParse(form);
  const errors = {
    ...(base.success ? {} : zodErrors(base.error)),
    ...(extra.success ? {} : zodErrors(extra.error)),
  };
  return { ok: Object.keys(errors).length === 0, errors, data: base.success ? base.data : null };
}
