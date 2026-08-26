"use client";

import Link from "next/link";
import { useActionState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { registerAction, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

export default function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.message}
        </p>
      )}

      <Input
        label="Name"
        name="name"
        type="text"
        autoComplete="name"
        required
        error={state.fieldErrors?.name?.[0]}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        error={state.fieldErrors?.email?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        description="At least 8 characters."
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

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
