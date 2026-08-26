"use client";

import { useTransition } from "react";

import { setThemeAction } from "@/lib/settings/theme-actions";
import type { Theme } from "@/types";

const OPTIONS: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Appearance only. This component knows nothing about accounts, sessions or
 * passwords - it posts a single preference and nothing else.
 */
export default function AppearanceForm({ theme }: { theme: Theme }) {
  const [pending, startTransition] = useTransition();

  function choose(value: Theme) {
    const data = new FormData();
    data.set("theme", value);
    startTransition(() => setThemeAction(data));
  }

  return (
    <fieldset disabled={pending} aria-busy={pending || undefined}>
      <legend className="sr-only">Theme</legend>

      <div className="flex w-full max-w-xs rounded-md border border-border p-0.5">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex flex-1 cursor-pointer items-center justify-center rounded px-3 py-1.5 text-sm transition-colors has-[:checked]:bg-foreground/8 has-[:checked]:font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-foreground/30"
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={theme === option.value}
              onChange={() => choose(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
