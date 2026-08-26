import "server-only";

import { cookies } from "next/headers";

import { THEMES, type Theme } from "@/types";

/**
 * Appearance preference.
 *
 * Deliberately independent of authentication: the theme is a device
 * preference, not account data, so it is stored in a cookie and never touches
 * the user record or the session.
 */
export const THEME_COOKIE = "theme";
export const DEFAULT_THEME: Theme = "system";

/** One year: a preference, not a session. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

function isTheme(value: string | undefined): value is Theme {
  return THEMES.includes((value ?? "") as Theme);
}

/** The stored preference, falling back to "system" for anything unrecognised. */
export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;

  return isTheme(value) ? value : DEFAULT_THEME;
}
