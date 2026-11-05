import type { ReactNode } from "react";
import "./calc.css";

export type ResultCardProps = {
  /** What the big number is, like "Each month". */
  label: string;
  /** The big plain answer, like "$304.22". Leave out before the person has typed enough. */
  answer?: string;
  /** Short words after the big number, like "a month". */
  unit?: string;
  /** Shown in the big spot until there is an answer. */
  waiting?: string;
  /** Like "Step 2 of 2". Only for tools with real steps. */
  step?: string;
  /** One plain sentence and at most two key numbers. */
  children?: ReactNode;
};

/** A money or number answer, like "$304.22" or "12.5%". Anything with words in it is text. */
function isNumber(answer: string): boolean {
  return /^[-+$\d.,%\s]+$/.test(answer);
}

/** The answer card. It is a polite live region, so a screen reader hears updates. */
export function ResultCard({ label, answer, unit, waiting = "Type your numbers to see your answer.", step, children }: ResultCardProps) {
  const has = answer !== undefined && answer !== "";
  return (
    <section className={`nt-result${has ? "" : " nt-result-waiting"}`} aria-live="polite" aria-label={label} id="nt-answer" tabIndex={-1}>
      {step ? <p className="nt-step">{step}</p> : null}
      {/* While waiting, the label would title an empty box, so only the waiting words show. */}
      {has ? <p className="nt-result-label">{label}</p> : null}
      {has ? (
        <p className={isNumber(answer) ? "nt-result-answer" : "nt-result-answer nt-result-answer-text"}>
          {answer}
          {unit ? <span className="nt-result-unit"> {unit}</span> : null}
        </p>
      ) : (
        <p className="nt-result-waiting-text">{waiting}</p>
      )}
      {has && children ? <div className="nt-result-body">{children}</div> : null}
    </section>
  );
}
