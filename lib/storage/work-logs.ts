import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { WorkLog } from "@/types";

export const workLogs = createCollection<WorkLog>("work-logs.json", "worklog");
