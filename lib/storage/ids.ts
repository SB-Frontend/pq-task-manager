import { randomBytes } from "node:crypto";

/**
 * Generates a prefixed, unique, sortable id, e.g. "task_m0k3x1a94f2b7c81".
 *
 * The timestamp component makes ids sort by creation order; the random suffix
 * makes collisions impractical. The result is an opaque string, which is what a
 * future MongoDB migration would store in place of an ObjectId.
 */
export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(5).toString("hex")}`;
}
