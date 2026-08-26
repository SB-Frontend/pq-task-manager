import "server-only";

import { createCollection } from "@/lib/storage/collection";
import type { User } from "@/types";

export const users = createCollection<User>("users", "user");
