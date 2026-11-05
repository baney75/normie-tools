import "./WhereYouAre.css";

export type WhereStep = { id: string; title: string };

export type WhereYouAreProps = {
  steps: WhereStep[];
  current: number;
  answers?: Record<string, string>;
  onJump?: (index: number) => void;
};

export const WHERE_COPY = {
  summary: "Where you are",
  done: "Done",
  now: "Now",
  next: "Next",
} as const;

export function WhereYouAre({ steps, current, answers = {}, onJump }: WhereYouAreProps) {
  return (
    <div className="nt-where">
      <details className="nt-where-details">
        <summary>{WHERE_COPY.summary}</summary>
        <ol className="nt-where-list">
          {steps.map((step, i) => {
            const state = i < current ? "done" : i === current ? "now" : "next";
            const label = WHERE_COPY[state];
            const answer = answers[step.id];
            return (
              <li key={step.id} className={`nt-where-item nt-where-${state}`} aria-current={state === "now" ? "step" : undefined}>
                <span className="nt-where-label">{label}</span>
                {state === "done" && onJump ? (
                  <button type="button" onClick={() => onJump(i)}>
                    {step.title}
                  </button>
                ) : (
                  <span className="nt-where-title">{step.title}</span>
                )}
                {state === "done" && answer ? <span className="nt-where-answer">{answer}</span> : null}
              </li>
            );
          })}
        </ol>
      </details>
    </div>
  );
}
