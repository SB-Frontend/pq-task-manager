import type { TextareaHTMLAttributes } from "react";

import FormField, { controlClassName, fieldAria } from "@/components/ui/FormField";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "name"> {
  label: string;
  name: string;
  description?: string;
  error?: string;
}

export default function Textarea({
  label,
  name,
  description,
  error,
  className,
  rows = 4,
  ...props
}: TextareaProps) {
  return (
    <FormField
      label={label}
      name={name}
      description={description}
      error={error}
      required={props.required}
    >
      <textarea
        {...props}
        {...fieldAria(name, description, error)}
        rows={rows}
        className={controlClassName(error, `resize-y ${className ?? ""}`)}
      />
    </FormField>
  );
}
