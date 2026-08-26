import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { Task } from "@/types";

export const tasks = createCollection<Task>("tasks.json", "task");
