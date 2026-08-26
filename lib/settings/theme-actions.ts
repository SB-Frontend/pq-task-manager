"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { THEME_COOKIE, THEME_MAX_AGE } from "@/lib/settings/theme";
import { THEMES } from "@/types";

const themeSchema = z.enum(THEMES);

/**
 * Stores the appearance preference.
 *
 * No authentication is involved on purpose - this is a device preference, and
 * keeping it separate means the theme cannot be coupled to account state.
 */
export async function setThemeAction(formData: FormData): Promise<void> {
  const parsed = themeSchema.safeParse(formData.get("theme"));
  if (!parsed.success) return;

  const store = await cookies();
  store.set(THEME_COOKIE, parsed.data, {
    path: "/",
    maxAge: THEME_MAX_AGE,
    sameSite: "lax",
    // Readable by the server on every request; it holds no secret.
    httpOnly: false,
  });

  // The <html> element carries the theme, so the whole layout re-renders.
  revalidatePath("/", "layout");
}
