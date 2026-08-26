"use server";

import { z } from "zod";

import { createUserAccount, requireUser } from "@/lib/auth/auth";
import { isOwner } from "@/lib/auth/ownership";
import { registerSchema } from "@/lib/auth/schemas";

export interface CreateUserFormState {
  message?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}

const NOT_ALLOWED = "Only the owner of this instance can add accounts.";

/**
 * Adds an account from Settings.
 *
 * Reuses the registration schema, so the password rules cannot diverge from
 * self-registration. The new account is **not** signed in - the owner keeps
 * their own session.
 */
export async function createUserAction(
  _prevState: CreateUserFormState,
  formData: FormData,
): Promise<CreateUserFormState> {
  const currentUser = await requireUser();

  // Authorisation is checked here, on the server, before anything is written.
  if (!(await isOwner(currentUser.id))) {
    return { message: NOT_ALLOWED };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const result = await createUserAccount({ name, email, password });

  if (!result.ok) {
    return result.field
      ? { fieldErrors: { [result.field]: [result.message] } }
      : { message: result.message };
  }

  return {
    success: `Account created for ${result.user.name}. They can sign in with the password you set.`,
  };
}
