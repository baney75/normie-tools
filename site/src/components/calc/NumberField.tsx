import { Field, type FieldProps } from "./Field";

export type NumberFieldProps = Omit<FieldProps, "prefix"> & { unit?: string };

/** A plain number, such as a count of months. Whole numbers use the number keypad. */
export function NumberField({ unit, inputMode = "numeric", ...rest }: NumberFieldProps) {
  return <Field {...rest} suffix={unit} inputMode={inputMode} />;
}
