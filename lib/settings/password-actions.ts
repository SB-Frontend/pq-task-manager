"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { passwordChangeSchema } from "@/lib/settings/schemas";
import { deleteOtherSessions } from "@/lib/storage/sessions";
import { users } from "@/lib/storage/users";

export interface PasswordFormState {
  message?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Changes the signed-in user's password.
 *
 * Requires the current password even though the caller is already
 * authenticated, so a borrowed session cannot silently take over the account.
 * On success every other session is revoked and this one is kept, which the
 * server-side session store makes straightforward.
 */
export async function changePasswordAction(
  _prevState: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const currentUser = await requireUser();

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Read the stored record directly: the public user deliberately has no hash.
  const stored = await users.find(currentUser.id);
  if (!stored) {
    return { message: "Your account could not be found." };
  }

  const correct = await verifyPassword(parsed.data.currentPassword, stored.passwordHash);
  if (!correct) {
    return { fieldErrors: { currentPassword: ["That password is not correct."] } };
  }

  await users.update(stored.id, {
    passwordHash: await hashPassword(parsed.data.newPassword),
    updatedAt: new Date().toISOString(),
  });

  // Sign out everywhere else, keeping the session that made the change.
  const current = await getSession();
  const revoked = await deleteOtherSessions(stored.id, current?.id);

  return {
    success:
      revoked > 0
        ? `Password updated. ${revoked} other ${revoked === 1 ? "session was" : "sessions were"} signed out.`
        : "Password updated.",
  };
}
