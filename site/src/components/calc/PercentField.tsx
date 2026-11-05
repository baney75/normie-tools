import { Field, type FieldProps } from "./Field";

export type PercentFieldProps = Omit<FieldProps, "prefix" | "suffix" | "inputMode">;

/** A percent. The person types text like 6.5. The page turns it into basis points with parseRate. */
export function PercentField(props: PercentFieldProps) {
  return <Field {...props} suffix="%" inputMode="decimal" />;
}
