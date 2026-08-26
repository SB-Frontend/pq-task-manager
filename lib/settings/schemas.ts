import { z } from "zod";

import { newPassword } from "@/lib/auth/schemas";

/** Reuses the registration password rule so the two can never diverge. */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "The new password must be different from the current one.",
    path: ["newPassword"],
  });
