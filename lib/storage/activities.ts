import "server-only";

import { createCollection } from "@/lib/storage/collection";
import type { Activity } from "@/types";

export const activities = createCollection<Activity>("activities", "activity");
