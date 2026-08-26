import type { InputHTMLAttributes } from "react";

import { SearchIcon } from "@/components/ui/icons";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visually hidden label. Search fields rarely show a visible one. */
  label?: string;
}

export default function SearchInput({
  label = "Search",
  className,
  name = "search",
  ...props
}: SearchInputProps) {
  return (
    <div className="relative">
      <label htmlFor={name} className="sr-only">
        {label}
      </label>

      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />

      <input
        {...props}
        type="search"
        id={name}
        name={name}
        className={`w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus-visible:ring-2 focus-visible:ring-foreground/20 ${className ?? ""}`}
      />
    </div>
  );
}
