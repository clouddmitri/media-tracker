import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be at most 128 characters");

export const registerSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
  password: passwordSchema,
  displayName: z.string().min(1).max(100).trim(),
});

export const loginSchema = z.object({
  email: z.email().max(255).toLowerCase().trim(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
