import { z } from "zod";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The form asks for decimal hours, the store keeps minutes - the same
 * convention the task form already uses for estimated and actual time.
 */
const duration = z
  .string()
  .min(1, "Enter how long you worked.")
  .transform((value) => Number(value))
  .refine(
    (value) => Number.isFinite(value),
    "Duration must be a number.",
  )
  .refine((value) => value > 0, "Duration must be greater than zero.")
  .refine((value) => value <= 24, "A single entry cannot exceed 24 hours.")
  .transform((value) => Math.round(value * 60))
  .refine((minutes) => minutes >= 1, "Duration must be at least one minute.");

export const workLogSchema = z.object({
  taskId: z.string().trim().min(1, "Select a task."),
  date: z.string().regex(CALENDAR_DATE, "Enter a valid date."),
  minutes: duration,
  description: z
    .string()
    .trim()
    .min(1, "Describe what you worked on.")
    .max(2000, "Description must be 2000 characters or fewer."),
});

export type WorkLogInput = z.infer<typeof workLogSchema>;
