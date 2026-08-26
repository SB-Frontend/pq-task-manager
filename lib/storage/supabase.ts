import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase client used by the storage layer.
 *
 * Uses the **service role** key, which bypasses Row Level Security. That is the
 * correct posture here: the application authenticates users itself (see
 * lib/auth), every request already passes through requireUser(), and this
 * module is server-only so the key can never reach the browser.
 *
 * RLS is enabled on every table with no policies, so the publishable key -
 * which does ship to the browser - can read nothing.
 *
 * Read lazily so `next build` succeeds without the environment configured.
 */
let client: SupabaseClient | undefined;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local locally, and in the project's environment ` +
        `variables on your host. See .env.example.`,
    );
  }

  return value;
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      // This client never represents an end user, so it needs no session
      // handling of its own.
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  return client;
}
