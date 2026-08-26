import "server-only";

import { createCollection } from "@/lib/storage/collection";
import type { Project } from "@/types";

export const projects = createCollection<Project>("projects", "project");
