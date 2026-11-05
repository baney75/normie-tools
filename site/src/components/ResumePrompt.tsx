import { useState } from "react";
import "./ResumePrompt.css";

export type ResumePromptProps = {
  step: number; // zero-based index of the saved step
  total: number;
  stepTitle: string;
  onPickUp: () => void;
  onStartOver: () => void;
};

export const RESUME_COPY = {
  heading: "Pick up where you left off?",
  pickUp: "Pick up",
  startOver: "Start over",
  confirm: "Start over? Your saved answers will be cleared.",
  yes: "Yes, start over",
  keep: "Keep my answers",
} as const;

export function ResumePrompt({ step, total, stepTitle, onPickUp, onStartOver }: ResumePromptProps) {
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="nt-resume" aria-labelledby="nt-resume-h">
      <h2 id="nt-resume-h">{RESUME_COPY.heading}</h2>
      <p>{`You were on Step ${step + 1} of ${total}: ${stepTitle}.`}</p>
      {confirming ? (
        <div className="nt-resume-confirm" role="group" aria-label={RESUME_COPY.confirm}>
          <p>{RESUME_COPY.confirm}</p>
          <div className="nt-resume-actions">
            <button type="button" className="nt-primary" onClick={onStartOver}>
              {RESUME_COPY.yes}
            </button>
            <button type="button" className="nt-secondary" onClick={() => setConfirming(false)}>
              {RESUME_COPY.keep}
            </button>
          </div>
        </div>
      ) : (
        <div className="nt-resume-actions">
          <button type="button" className="nt-primary" onClick={onPickUp}>
            {RESUME_COPY.pickUp}
          </button>
          <button type="button" className="nt-secondary" onClick={() => setConfirming(true)}>
            {RESUME_COPY.startOver}
          </button>
        </div>
      )}
    </section>
  );
}
