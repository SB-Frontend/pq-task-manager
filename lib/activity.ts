import "server-only";

import { activities } from "@/lib/storage/activities";
import type { ActivityType } from "@/types";

/**
 * Appends one entry to the activity history.
 *
 * Deliberately lightweight: a type, a human-readable message and the ids it
 * relates to. It answers "what did I work on recently?", not "what changed".
 */
export async function recordActivity(input: {
  type: ActivityType;
  message: string;
  projectId?: string;
  taskId?: string;
}): Promise<void> {
  await activities.insert({ ...input, createdAt: new Date().toISOString() });
}
