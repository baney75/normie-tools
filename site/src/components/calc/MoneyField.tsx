import { Field, type FieldProps } from "./Field";

export type MoneyFieldProps = Omit<FieldProps, "prefix" | "suffix" | "inputMode">;

/** Dollars. The person types text like 1,250.50. The page turns it into cents with parseMoney. */
export function MoneyField(props: MoneyFieldProps) {
  return <Field {...props} prefix="$" inputMode="decimal" />;
}
