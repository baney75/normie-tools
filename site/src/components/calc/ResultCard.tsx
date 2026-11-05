import type { ReactNode } from "react";
import "./calc.css";

export type ResultCardProps = {
  /** What the big number is, like "Monthly payment". */
  label: string;
  /** The big plain answer, like "$304.22". */
  answer: string;
  /** Short lines under the answer. */
  children?: ReactNode;
};

/** The mint card with the big answer in Fraunces. It is a polite live region, so a screen reader hears updates. */
export function ResultCard({ label, answer, children }: ResultCardProps) {
  return (
    <section className="nt-result" aria-live="polite" aria-label={label}>
      <p className="nt-result-label">{label}</p>
      <p className="nt-result-answer">{answer}</p>
      {children ? <div className="nt-result-body">{children}</div> : null}
    </section>
  );
}
