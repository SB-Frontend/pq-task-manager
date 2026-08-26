import { z } from "zod";

/** Calendar-only dates, matching the storage convention. */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

const optionalDate = z
  .string()
  .regex(CALENDAR_DATE, "Enter a valid date.")
  .optional();

function optionalText(max: number, label: string) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional();
}

export const projectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name is required.")
      .max(120, "Project name must be 120 characters or fewer."),
    client: optionalText(120, "Client"),
    description: optionalText(2000, "Description"),
    status: z.enum(["active", "completed", "archived"]),
    startDate: optionalDate,
    targetDate: optionalDate,
  })
  // Comparing "YYYY-MM-DD" strings works lexicographically, so no Date needed.
  .refine(
    (values) =>
      !values.startDate ||
      !values.targetDate ||
      values.targetDate >= values.startDate,
    {
      message: "Target date cannot be before the start date.",
      path: ["targetDate"],
    },
  );

export type ProjectInput = z.infer<typeof projectSchema>;
