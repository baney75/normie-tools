import { useState, type ReactNode } from "react";
import { href } from "../../lib/hashRouter";
import { SavePrintSheet } from "../SavePrintSheet";
import "./calc.css";

export type FinishProps = {
  /** Saves the answer as a file. */
  onSave: () => void;
  /** What goes on paper or in the file, in plain words. */
  children: ReactNode;
  /** Exact answers (a budget, a unit) say "answer"; loan math says "estimate". */
  exact?: boolean;
};

/**
 * Under an answer: a line that says the person is done, a calm "I'm done" (back to home) as the one main button,
 * and "Print or save" as a plain button that opens Print and Save a copy in place.
 */
export function Finish({ onSave, children, exact = false }: FinishProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="nt-finish">
      <p className="nt-finish-line">That is your {exact ? "answer" : "estimate"}. You can stop here.</p>
      <a className="primary nt-finish-done" href={href("/")}>
        I&apos;m done
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
