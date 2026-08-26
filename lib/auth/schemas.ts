import { z } from "zod";

/** Trimmed and lowercased before the format is checked, so " A@B.com " is valid. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

/**
 * bcrypt only considers the first 72 bytes of a password, so anything longer is
 * rejected rather than silently truncated.
 */
export const newPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password is too long.",
  );

export const loginSchema = z.object({
  email,
  // Login never applies strength rules - it only checks the field is present.
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
