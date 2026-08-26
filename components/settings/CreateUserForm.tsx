"use client";

import { useActionState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  createUserAction,
  type CreateUserFormState,
} from "@/lib/settings/user-actions";

const initialState: CreateUserFormState = {};

/** Owner-only. The server re-checks ownership before writing anything. */
export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

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
        label="Name"
        name="name"
        type="text"
        autoComplete="off"
        required
        error={state.fieldErrors?.name?.[0]}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        required
        error={state.fieldErrors?.email?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        description="At least 8 characters. Share it with them securely."
        error={state.fieldErrors?.password?.[0]}
      />

      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword?.[0]}
      />

      <Button type="submit" loading={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
