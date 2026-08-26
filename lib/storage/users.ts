import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { User } from "@/types";

/** Accounts. Query functions for registration and login land here in Step 3. */
export const users = createCollection<User>("users.json", "user");
