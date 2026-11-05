import type { ReactNode } from "react";
import "./calc.css";

/** A calm note about one field. The word "Check" is there so color is never the only clue. */
export function ErrorNote({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className="nt-errnote" id={id}>
      <span className="nt-errnote-word">Check this. </span>
      {children}
    </p>
  );
}
