import type { ReactNode } from "react";
import "./Stepper.css";

export type StepInfo = { id: string; title: string };

export type StepperProps = {
  steps: StepInfo[];
  current: number;
  flowTitle: string;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  children?: ReactNode;
};

export function clampStep(current: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(current)) return 0;
  return Math.min(Math.max(Math.trunc(current), 0), count - 1);
}

export function Stepper({
  steps,
  current,
  flowTitle,
  onBack,
  onNext,
  nextLabel = "Next",
  backLabel = "Back",
  children,
}: StepperProps) {
  const total = steps.length;
  const index = clampStep(current, total);
  const number = index + 1;
  const label = `Step ${number} of ${total}`;
  const title = steps[index]?.title ?? "";
  return (
    <section className="nt-stepper" aria-label={flowTitle}>
      <p className="nt-stepper-flow">{flowTitle}</p>
      <h2 className="nt-stepper-count">{label}</h2>
      <progress
        className="nt-stepper-bar"
        aria-label={`${label} progress`}
        value={number}
        max={total}
      />
      {index === 0 ? <p className="nt-stepper-intro">This has {total} steps.</p> : null}
      <h3 className="nt-stepper-title">{title}</h3>
      <div className="nt-stepper-body">{children}</div>
      <div className="nt-stepper-actions">
        <button type="button" className="nt-secondary" onClick={onBack} disabled={index === 0}>
          {backLabel}
        </button>
        <button type="button" className="nt-primary" onClick={onNext}>
          {nextLabel}
        </button>
      </div>
    </section>
  );
}
