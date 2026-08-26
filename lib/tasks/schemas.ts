import { z } from "zod";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z
  .string()
  .regex(CALENDAR_DATE, "Enter a valid date.")
  .optional();

/**
 * Hours are what the form asks for; minutes are what is stored. Accepts a
 * decimal such as 2.5 and rounds to the nearest minute.
 */
function optionalHours(label: string) {
  return z
    .string()
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .refine(
      (value) => value === undefined || (Number.isFinite(value) && value >= 0),
      `${label} must be a positive number.`,
    )
    .refine(
      (value) => value === undefined || value <= 10_000,
      `${label} is unrealistically large.`,
    )
    .transform((value) => (value === undefined ? undefined : Math.round(value * 60)));
}

/** "api, ui , api" -> ["api", "ui"]. Trimmed, de-duplicated, empties dropped. */
const tags = z
  .string()
  .optional()
  .transform((value) =>
    value === undefined
      ? []
      : [
          ...new Set(
            value
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          ),
        ],
  )
  .refine((list) => list.length <= 10, "Use 10 tags or fewer.")
  .refine(
    (list) => list.every((tag) => tag.length <= 30),
    "Each tag must be 30 characters or fewer.",
  );

export const taskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Task title is required.")
      .max(200, "Task title must be 200 characters or fewer."),
    projectId: z.string().trim().min(1, "Select a project."),
    // "" means unassigned, which is always valid.
    assigneeId: z.string().trim().optional(),
    description: z
      .string()
      .trim()
      .max(2000, "Description must be 2000 characters or fewer.")
      .optional(),
    status: z.enum(["pending", "in_progress", "completed", "blocked"]),
    priority: z.enum(["low", "medium", "high"]),
    estimatedMinutes: optionalHours("Estimated hours"),
    actualMinutes: optionalHours("Actual hours"),
    tags,
    notes: z
      .string()
      .trim()
      .max(2000, "Notes must be 2000 characters or fewer.")
      .optional(),
    dueDate: optionalDate,
    startedAt: optionalDate,
    completedAt: optionalDate,
  })
  // "YYYY-MM-DD" sorts lexicographically, so no Date object is needed.
  .refine(
    (values) =>
      !values.startedAt ||
      !values.completedAt ||
      values.completedAt >= values.startedAt,
    {
      message: "Completion date cannot be before the start date.",
      path: ["completedAt"],
    },
  );

export type TaskInput = z.infer<typeof taskSchema>;
