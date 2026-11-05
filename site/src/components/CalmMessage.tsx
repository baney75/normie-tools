import type { ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import "./CalmMessage.css";

export type CalmAction = { label: string; onClick: () => void };

export type CalmMessageProps = {
  tone: "info" | "problem" | "done";
  title?: string;
  children?: ReactNode;
  actions?: CalmAction[];
};

const WORD = { info: "Note", problem: "Problem", done: "Done" } as const;
const ICON = { info: Info, problem: TriangleAlert, done: CheckCircle2 } as const;

export function CalmMessage({ tone, title, children, actions = [] }: CalmMessageProps) {
  const Icon = ICON[tone];
  return (
    <div className={`nt-calm nt-calm-${tone}`} role="status">
      <Icon className="nt-calm-icon" aria-hidden="true" />
      <div className="nt-calm-text">
        <p className="nt-calm-title">
          <span className="nt-calm-word">{WORD[tone]}</span>
          {title ? `: ${title}` : ""}
        </p>
        {children ? <div className="nt-calm-body">{children}</div> : null}
        {actions.length > 0 ? (
          <div className="nt-calm-actions">
            {actions.slice(0, 2).map((a) => (
              <button key={a.label} type="button" onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
