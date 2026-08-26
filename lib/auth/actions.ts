"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loginUser, logoutUser, registerUser } from "@/lib/auth/auth";
import { loginSchema, registerSchema } from "@/lib/auth/schemas";

export interface AuthFormState {
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Server-side validation is authoritative: the browser is never trusted. */
export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const result = await loginUser(parsed.data);

  if (!result.ok) {
    return { message: result.message };
  }

  // redirect() throws, so it must sit outside any try/catch.
  redirect("/app");
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return { fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const result = await registerUser({ name, email, password });

  if (!result.ok) {
    return result.field
      ? { fieldErrors: { [result.field]: [result.message] } }
      : { message: result.message };
  }

  redirect("/app");
}

export async function logoutAction(): Promise<void> {
  await logoutUser();
  redirect("/login");
}
