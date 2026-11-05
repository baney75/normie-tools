import type { ReactNode } from "react";
import "./calc.css";

export type ResultCardProps = {
  /** What the big number is, like "Monthly payment". */
  label: string;
  /** The big plain answer, like "$304.22". Leave out before the person has typed enough. */
  answer?: string;
  /** Shown in the big spot until there is an answer, like "Your answer shows here". */
  waiting?: string;
  /** Like "Step 2 of 2". Shown small above the label. */
  step?: string;
  /** Set false when the page shows more than one card, so "That is your answer" shows once. */
  closing?: boolean;
  /** Short lines under the answer. */
  children?: ReactNode;
};

/** The main card with the big answer in Fraunces. It is a polite live region, so a screen reader hears updates. */
export function ResultCard({ label, answer, waiting = "Your answer shows here", step, closing = true, children }: ResultCardProps) {
  const has = answer !== undefined && answer !== "";
  return (
    <section className={`nt-result${has ? "" : " nt-result-waiting"}`} aria-live="polite" aria-label={label}>
      {step ? <p className="nt-step">{has ? `${step}. You are here.` : step}</p> : null}
      <p className="nt-result-label">{label}</p>
      {has ? <p className="nt-result-answer">{answer}</p> : <p className="nt-result-waiting-text">{waiting}</p>}
      {has && children ? <div className="nt-result-body">{children}</div> : null}
      {has && closing ? <p className="nt-result-done">That is your answer. You can stop here, or keep a copy below.</p> : null}
    </section>
  );
}
