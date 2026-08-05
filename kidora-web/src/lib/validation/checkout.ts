// lib/validation/checkout.ts
import { z } from "zod";

export const accountDetailsSchema = z.object({
  parentName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(80, "That name looks too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  childName: z
    .string()
    .trim()
    .min(1, "Enter your child's name")
    .max(60, "That name looks too long"),
  agreeToTerms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms to continue" }),
  }),
});

export type AccountDetails = z.infer<typeof accountDetailsSchema>;