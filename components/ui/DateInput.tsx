import type { InputProps } from "@/components/ui/Input";
import Input from "@/components/ui/Input";

/**
 * A date field. Values are the native "YYYY-MM-DD" strings, which is exactly
 * how calendar-only dates are stored, so no conversion is needed.
 */
export default function DateInput(props: Omit<InputProps, "type">) {
  return <Input {...props} type="date" />;
}
