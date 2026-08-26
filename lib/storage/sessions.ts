import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { Session } from "@/types";

/**
 * Server-side sessions. Ids are supplied by the auth layer rather than
 * generated here, because a session id must be unguessable.
 */
export const sessions = createCollection<Session>("sessions.json", "session");
