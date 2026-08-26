import type { InputHTMLAttributes } from "react";

import FormField, { controlClassName, fieldAria } from "@/components/ui/FormField";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> {
  label: string;
  name: string;
  description?: string;
  error?: string;
}

export default function Input({
  label,
  name,
  description,
  error,
  className,
  ...props
}: InputProps) {
  return (
    <FormField
      label={label}
      name={name}
      description={description}
      error={error}
      required={props.required}
    >
      <input
        {...props}
        {...fieldAria(name, description, error)}
        className={controlClassName(error, className)}
      />
    </FormField>
  );
}
