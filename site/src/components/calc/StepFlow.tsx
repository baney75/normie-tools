import { useEffect, useRef, useState, type ReactNode } from "react";
import { PAGES } from "../../copy/pages";
import { href } from "../../lib/hashRouter";
import "./calc.css";

export type FlowStep = {
  /** The one question this screen asks. It is the page heading. */
  question: string;
  /** The box or choices for that question. */
  content: ReactNode;
  /** True when the step has what it needs, so Continue may move on. */
  ready: boolean;
  /** Plain words shown when Continue is tapped too soon, like "Type the amount first." */
  missing?: string;
};

export type StepFlowProps = {
  /** The tool's name, shown small above every heading. */
  name: string;
  /** The question the tool answers. It heads the answer screen. */
  question: string;
  steps: FlowStep[];
  /** 0 to steps.length - 1 for a question, steps.length for the answer. */
  step: number;
  onStep: (next: number) => void;
  /** Shown under the first question only, after the line about where numbers stay. */
  intro?: ReactNode;
  /**
   * When a saved copy is waiting and nothing is typed, the person first sees one screen that asks whether to use it.
   * "Use them" is the main button, "No thanks" is quiet.
   */
  resume?: { title: string; body: string; yes: string; no: string; onYes: () => void; onNo: () => void } | null;
  /** The words on the last Continue, like "See my answer". */
  finishLabel: string;
  /** The answer screen: the card, then its buttons, then extras and detail. */
  answer: ReactNode;
  actions?: ReactNode;
  extras?: ReactNode;
  below?: ReactNode;
};

/**
 * One question per phone screen, a Continue button at the bottom, and "Step 1 of 3" so the person
 * always knows where they are. The last screen is the answer.
 */
export function StepFlow({ name, question, steps, step, onStep, intro, resume, finishLabel, answer, actions, extras, below }: StepFlowProps) {
  const total = steps.length;
  const index = Math.min(Math.max(Math.trunc(Number.isFinite(step) ? step : 0), 0), total);
  const [tried, setTried] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // The screen on show: a step number, or "answer". Adding a third offer can turn the answer's index into a step.
  const screen = index >= total ? "answer" : index;
  const shown = useRef<number | string>(screen);

  // When the step changes (Continue, Back, a restore, or a page button), put the person at the top of the
  // new screen with the cursor in its first box. Nothing moves on first load.
  useEffect(() => {
    if (shown.current === screen) return;
    shown.current = screen;
    window.scrollTo?.({ top: 0 });
    const b = body.current;
    const first =
      b?.querySelector<HTMLElement>("input:not([type=radio])") ??
      b?.querySelector<HTMLElement>("input[type=radio]:checked") ??
      b?.querySelector<HTMLElement>("input[type=radio]");
    (first ?? heading.current)?.focus();
  }, [screen]);

  const go = (next: number) => {
    setTried(false);
    onStep(next);
  };

  if (resume) {
    return (
      <div className="nt-flow nt-flow-ask">
        <p className="nt-tool-name">{name}</p>
        <h1 className="nt-flow-question" ref={heading} tabIndex={-1}>{resume.title}</h1>
        <p className="nt-flow-resume">{resume.body}</p>
        <div className="nt-flow-nav">
          <button type="button" className="primary nt-flow-next" onClick={resume.onYes}>
            {resume.yes}
          </button>
          <button type="button" className="nt-more-btn nt-flow-back" onClick={resume.onNo}>
            {resume.no}
          </button>
        </div>
      </div>
    );
  }

  if (index >= total) {
    // A change made here (an optional box, or a saved copy) can leave an earlier step needing a fix. "Change my numbers"
    // goes straight to it, so the red note is on the screen the person lands on.
    const fix = steps.findIndex((st) => !st.ready);
    return (
      <div className="nt-flow nt-flow-answer">
        <div className="nt-flow-top">
          <p className="nt-tool-name">{name}</p>
          <p className="nt-flow-count">{`Step ${total + 1} of ${total + 1}: your answer`}</p>
        </div>
        <Progress now={total + 1} of={total + 1} label={`Step ${total + 1} of ${total + 1} progress`} />
        <h1 className="nt-flow-question" ref={heading} tabIndex={-1}>{question}</h1>
        {answer}
        {actions ? <div className="nt-flow-actions">{actions}</div> : null}
        <button type="button" className="nt-more-btn" onClick={() => go(Math.max(fix, 0))}>
          Change my numbers
        </button>
        {extras ? <div className="nt-flow-extras">{extras}</div> : null}
        {below ? <div className="nt-tool-below">{below}</div> : null}
      </div>
    );
  }

  const s = steps[index];
  // The answer is the last step, so "Step 1 of 4" on a three-question tool.
  const label = `Step ${index + 1} of ${total + 1}`;
  const next = () => {
    if (!s.ready) {
      setTried(true);
      // The box with a red note first, then the first needed box that is still empty, then the first needed box.
      const b = body.current;
      const empty = Array.from(b?.querySelectorAll<HTMLInputElement>("input:not([data-optional]):not([type=radio]):not([type=checkbox])") ?? []).find((i) => i.value.trim() === "");
      const box = b?.querySelector<HTMLElement>("[aria-invalid=true]") ?? empty ?? b?.querySelector<HTMLElement>("input:not([data-optional])");
      box?.focus();
      return;
    }
    go(index + 1);
  };

  return (
    <div className="nt-flow nt-flow-ask">
      <div className="nt-flow-top">
        <p className="nt-tool-name">{name}</p>
        <p className="nt-flow-count">{label}</p>
      </div>
      <Progress now={index + 1} of={total + 1} label={`${label} progress`} />
      <h1 className="nt-flow-question" ref={heading} tabIndex={-1}>{s.question}</h1>
      {/* Under the question on step 1 only: a lock and one link to the page that explains it. A sentence here ("Your numbers stay on this phone or computer.") failed Haiku's rule 8 as an unsourced claim; the link alone passed. */}
      {index === 0 ? (
            <p className="nt-tool-trust">
              <Lock />
              <span>
                <a href={href("/private")}>{PAGES.tool.private}</a>
              </span>
            </p>
      ) : null}
      {index === 0 && intro ? <div className="nt-flow-intro">{intro}</div> : null}
      <form
        className="nt-flow-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div className="nt-flow-body" ref={body}>
          {s.content}
        </div>
        {tried && !s.ready && s.missing ? (
          <p className="nt-flow-missing" role="status">
            {s.missing}
          </p>
        ) : null}
        <div className="nt-flow-nav">
          {/* Said once, on step 1, right where the person decides to go on: readers asked whether Continue locks a number in. */}
          {index === 0 ? <p className="nt-flow-change">{PAGES.tool.change}</p> : null}
          <button type="submit" className="primary nt-flow-next">
            {index === total - 1 ? finishLabel : "Continue"}
          </button>
          {index > 0 ? (
            <button type="button" className="nt-more-btn nt-flow-back" onClick={() => go(index - 1)}>
              Back
            </button>
          ) : (
            <a className="nt-flow-back nt-back" href={href("/")}>
              Back to tools
            </a>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * One bar per screen, so the person can count what is left. The bars are a picture; the progress element under them
 * carries the same count for screen readers.
 */
function Progress({ now, of, label }: { now: number; of: number; label: string }) {
  return (
    <div className="nt-flow-bar">
      <progress className="nt-sr-only" aria-label={label} value={now} max={of} />
      <div className="nt-flow-segs" aria-hidden="true">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={i + 1 < now ? "nt-flow-seg is-done" : i + 1 === now ? "nt-flow-seg is-now" : "nt-flow-seg"} />
        ))}
      </div>
    </div>
  );
}

function Lock() {
  return (
    <svg className="nt-lock" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor" />
      <path d="M5.25 7V5a2.75 2.75 0 0 1 5.5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
