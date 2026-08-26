import type { ReactNode } from "react";

/** Ids derived from the field name, so label/description/error wire up consistently. */
export function fieldIds(name: string) {
  return {
    id: name,
    descriptionId: `${name}-description`,
    errorId: `${name}-error`,
  };
}

/** Accessibility props every control shares. Spread onto the input element. */
export function fieldAria(name: string, description?: string, error?: string) {
  const { id, descriptionId, errorId } = fieldIds(name);
  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

/** Shared control styling, so every input looks identical. */
export function controlClassName(error?: string, extra = ""): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors",
    "placeholder:text-muted focus-visible:ring-2 focus-visible:ring-foreground/20",
    "disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-red-500" : "border-border",
    extra,
  ].join(" ");
}

interface FormFieldProps {
  label: string;
  name: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * Label, optional description, control and error message.
 * Every form control wraps itself in this rather than repeating the markup.
 */
export default function FormField({
  label,
  name,
  description,
  error,
  required,
  children,
}: FormFieldProps) {
  const { id, descriptionId, errorId } = fieldIds(name);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <span className="ml-0.5 text-muted" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {description && (
        <p id={descriptionId} className="text-xs text-muted">
          {description}
        </p>
      )}

      {children}

      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
