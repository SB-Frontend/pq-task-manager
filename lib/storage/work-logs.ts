import "server-only";

import { createCollection } from "@/lib/storage/collection";
import type { WorkLog } from "@/types";

export const workLogs = createCollection<WorkLog>("work_logs", "worklog");
