import "server-only";

import { createCollection } from "@/lib/storage/collection";
import type { Task } from "@/types";

export const tasks = createCollection<Task>("tasks", "task");
