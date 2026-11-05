import type { ReactNode } from "react";
import "./ReviewStop.css";

export type ReviewStopProps = {
  summary: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onBack: () => void;
};

export const REVIEW_COPY = {
  heading: "Review and stop",
  intro: "Check everything. Nothing is sent or paid until you press the button.",
  back: "Go back",
} as const;

export function ReviewStop({ summary, confirmLabel, onConfirm, onBack }: ReviewStopProps) {
  return (
    <section className="nt-review" aria-labelledby="nt-review-h">
      <h2 id="nt-review-h">{REVIEW_COPY.heading}</h2>
      <p>{REVIEW_COPY.intro}</p>
      <div className="nt-review-preview">{summary}</div>
      <div className="nt-review-actions">
        <button type="button" className="nt-secondary" onClick={onBack}>
          {REVIEW_COPY.back}
        </button>
        <button type="button" className="nt-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
