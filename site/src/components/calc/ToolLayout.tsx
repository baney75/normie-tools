import type { ReactNode } from "react";
import { PAGES } from "../../copy/pages";
import { href } from "../../lib/hashRouter";
import "./calc.css";

export type ToolLayoutProps = {
  /** The tool's name, shown small above the question. */
  name: string;
  /** The question the tool answers. It is the page heading. */
  question: string;
  /** The answer card. First on a phone, pinned on the right on a wide screen. */
  answer: ReactNode;
  /** The one main button, under the answer. */
  actions?: ReactNode;
  /** The boxes the person types in. */
  children: ReactNode;
  /** Details the person opens if they want them. */
  below?: ReactNode;
};

/** Answer first: the answer leads, the boxes follow, extra detail waits below. */
export function ToolLayout({ name, question, answer, actions, children, below }: ToolLayoutProps) {
  return (
    <div className="nt-tool">
      <p className="nt-tool-name">{name}</p>
      <h1 className="nt-tool-question">{question}</h1>
      <p className="nt-tool-trust">
        {PAGES.tool.trust} <a href={href("/private")}>{PAGES.tool.how}</a>
      </p>
      <div className="nt-tool-grid">
        <div className="nt-tool-side">
          <div className="nt-tool-answer">{answer}</div>
          {actions ? <div className="nt-tool-actions">{actions}</div> : null}
        </div>
        <div className="nt-tool-inputs">{children}</div>
        {below ? <div className="nt-tool-below">{below}</div> : null}
      </div>
    </div>
  );
}
