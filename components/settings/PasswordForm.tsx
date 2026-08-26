"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  changePasswordAction,
  type PasswordFormState,
} from "@/lib/settings/password-actions";

const initialState: PasswordFormState = {};

/** Account security only: no theme or preference concerns live here. */
export default function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="max-w-sm space-y-4" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.message}
        </p>
      )}

      {state.success && (
        <p
          role="status"
          className="rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm text-green-700 dark:text-green-400"
        >
          {state.success}
        </p>
      )}

      <Input
        label="Current password"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.currentPassword?.[0]}
      />

      <Input
        label="New password"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        required
        description="At least 8 characters."
        error={state.fieldErrors?.newPassword?.[0]}
      />

      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />

      <Button type="submit" loading={pending}>
        {pending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
