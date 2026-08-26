import type { SelectHTMLAttributes } from "react";

import FormField, { controlClassName, fieldAria } from "@/components/ui/FormField";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "name" | "children"> {
  label: string;
  name: string;
  options: SelectOption[];
  placeholder?: string;
  description?: string;
  error?: string;
}

export default function Select({
  label,
  name,
  options,
  placeholder,
  description,
  error,
  className,
  ...props
}: SelectProps) {
  return (
    <FormField
      label={label}
      name={name}
      description={description}
      error={error}
      required={props.required}
    >
      <select
        {...props}
        {...fieldAria(name, description, error)}
        className={controlClassName(error, className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
