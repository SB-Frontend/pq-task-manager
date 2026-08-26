import "server-only";

import { createCollection } from "@/lib/storage/json";
import type { Project } from "@/types";

export const projects = createCollection<Project>("projects.json", "project");
