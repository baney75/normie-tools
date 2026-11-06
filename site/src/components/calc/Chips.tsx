import { useId } from "react";
import "./calc.css";

export type ChipOption = { value: string; label: string };

export type ChipsProps = {
  legend: string;
  options: ChipOption[];
  /** The picked value, or "" when none is picked. */
  value: string;
  onChange: (value: string) => void;
  /** Keeps the question for screen readers only, when the page heading already asks it. */
  hideLegend?: boolean;
  /** Short help under the question, like where to find the number. */
  hint?: string;
};

/** A row of big tap choices. Under the hood it is a radio group, so keyboards and screen readers work. */
export function Chips({ legend, options, value, onChange, hideLegend = false, hint }: ChipsProps) {
  const name = useId();
  const hintId = `${name}-hint`;
  return (
    <fieldset className="nt-chips" aria-describedby={hint ? hintId : undefined}>
      <legend className={hideLegend ? "nt-field-label nt-sr-only" : "nt-field-label"}>{legend}</legend>
      {hint ? <p className="nt-field-hint" id={hintId}>{hint}</p> : null}
      <div className="nt-chips-row">
        {options.map((o) => (
          <label key={o.value} className="nt-chip">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
