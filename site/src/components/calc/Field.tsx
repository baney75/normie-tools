import { useId, type ReactNode } from "react";
import { ErrorNote } from "./ErrorNote";
import "./calc.css";

export type FieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Short help under the label, in plain words. */
  hint?: string;
  /** A plain-words problem with this field. Shown under it. */
  error?: string;
  /** Shows "(optional)" after the label. */
  optional?: boolean;
  /** Placeholder example, like "12,000". */
  placeholder?: string;
  /** Text shown before the box, like "$". Decoration only. */
  prefix?: string;
  /** Text shown after the box, like "%". Decoration only. */
  suffix?: string;
  inputMode?: "decimal" | "numeric" | "text";
  id?: string;
  extra?: ReactNode;
  /** Puts the cursor here when the page opens. Use on the first box only. */
  autoFocus?: boolean;
};

/** The base field the others wrap: label above, one text box, hint and error below. */
export function Field({
  label, value, onChange, hint, error, optional, placeholder, prefix, suffix, inputMode = "decimal", id, extra, autoFocus,
}: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  const hintId = `${inputId}-hint`;
  const errId = `${inputId}-err`;
  const described = [hint ? hintId : "", error ? errId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="nt-field">
      <label className="nt-field-label" htmlFor={inputId}>
        {label}
        {optional ? <span className="nt-field-optional"> (optional)</span> : null}
      </label>
      {hint ? <span className="nt-field-hint" id={hintId}>{hint}</span> : null}
      <div className="nt-field-box">
        {prefix ? <span className="nt-field-mark" aria-hidden="true">{prefix}</span> : null}
        <input
          id={inputId}
          className="nt-field-input"
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          autoFocus={autoFocus}
          autoCorrect="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix ? <span className="nt-field-mark" aria-hidden="true">{suffix}</span> : null}
        {extra}
      </div>
      {error ? <ErrorNote id={errId}>{error}</ErrorNote> : null}
    </div>
  );
}
