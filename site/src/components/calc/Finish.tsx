import { useState, type ReactNode } from "react";
import { href } from "../../lib/hashRouter";
import { SavePrintSheet } from "../SavePrintSheet";
import "./calc.css";

export type FinishProps = {
  /** Saves the answer as a file. */
  onSave: () => void;
  /** What goes on paper or in the file, in plain words. */
  children: ReactNode;
};

/**
 * Under an answer: a line that says the person is done, a calm "Done" as the one main button,
 * and "Print or save" as a plain button that opens Print and Save a copy in place.
 */
export function Finish({ onSave, children }: FinishProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="nt-finish">
      <p className="nt-finish-line">That is your answer. You can stop here, or change a number to try again. Your numbers stay.</p>
      <a className="primary nt-finish-done" href={href("/")}>
        Done. Back to home.
      </a>
      <button type="button" className="nt-finish-save" aria-expanded={open} onClick={() => setOpen(!open)}>
        Print or save
      </button>
      {open ? (
        <SavePrintSheet quiet title="Print or save" onSave={onSave}>
          {children}
        </SavePrintSheet>
      ) : null}
    </div>
  );
}
