import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";

/** The entry point: straight into the application, or to the login page. */
export default async function Home() {
  redirect((await getCurrentUser()) ? "/app" : "/login");
}
