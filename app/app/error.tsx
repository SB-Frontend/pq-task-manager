"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";

/**
 * Catches unhandled errors inside the application area.
 *
 * The most likely cause here is the JSON store being unreadable.
 *
 * Retrying needs both halves: router.refresh() asks the server for a fresh
 * render, and reset() clears the boundary. reset() on its own re-renders the
 * cached failure and the error simply reappears.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Detail stays in the server logs; the user sees a safe message.
    console.error("[app]", error.message);
  }, [error]);

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <ErrorState
      title="Something went wrong"
      description="This page could not be loaded. Your data has not been changed."
      action={
        <Button onClick={retry} loading={pending}>
          {pending ? "Retrying..." : "Try again"}
        </Button>
      }
    />
  );
}
