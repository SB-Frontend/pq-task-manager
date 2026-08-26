"use client";

import Link from "next/link";
import { useActionState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { loginAction, type AuthFormState } from "@/lib/auth/actions";

const initialState: AuthFormState = {};

export default function LoginForm({
  registrationOpen = false,
}: {
  /** Decided on the server; the link is pointless when registration is closed. */
  registrationOpen?: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

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
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password?.[0]}
      />

      <Button type="submit" loading={pending} fullWidth>
        {pending ? "Signing in..." : "Login"}
      </Button>

      {registrationOpen && (
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Register
          </Link>
        </p>
      )}
    </form>
  );
}
