import { useId } from "react";
import "./calc.css";

export type ChipOption = { value: string; label: string };

export type ChipsProps = {
  legend: string;
  options: ChipOption[];
  /** The picked value, or "" when none is picked. */
  value: string;
  onChange: (value: string) => void;
};

/** A row of big tap choices. Under the hood it is a radio group, so keyboards and screen readers work. */
export function Chips({ legend, options, value, onChange }: ChipsProps) {
  const name = useId();
  return (
    <fieldset className="nt-chips">
      <legend className="nt-field-label">{legend}</legend>
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
