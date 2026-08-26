import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { Activity } from "@/types";

export const activities = createCollection<Activity>("activities.json", "activity");
