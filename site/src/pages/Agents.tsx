import { useState } from "react";
import { PAGES } from "../copy/pages";
import { TOOLS, isUsable } from "../data/tools";

export function Agents() {
  const c = PAGES.agents;
  const [copied, setCopied] = useState(false);
  const here = typeof window === "undefined" ? "" : window.location.href.split("#")[0] + "#/agents";
  const sentence = `${c.instructionBefore}${here}${c.instructionAfter}`;
  const canCopy = typeof navigator !== "undefined" && !!navigator.clipboard;

  async function copy() {
    try {
      await navigator.clipboard.writeText(sentence);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <p>{TOOLS.some(isUsable) ? c.someReady : c.noToolsYet}</p>
      <h2>{c.stepsHeading}</h2>
      <ol className="nt-list">
        {c.steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <h2>{c.instructionLabel}</h2>
      <p className="nt-instruction" id="nt-instruction">{sentence}</p>
      {canCopy ? (
        <p>
          <button type="button" className="primary" onClick={copy}>{c.copy}</button>
          <span role="status" className="nt-muted"> {copied ? c.copied : ""}</span>
        </p>
      ) : (
        <p className="nt-muted">{c.copyHint}</p>
      )}
      <h2>{c.rulesHeading}</h2>
      <ol className="nt-list">
        {c.rules.map((r) => <li key={r}>{r}</li>)}
      </ol>
      <p><a href="./llms.txt">{c.shortPage}</a></p>
      <h2>{c.builders.heading}</h2>
      <p>{c.builders.intro}</p>
      <ul className="nt-list">
        <li><a href="./llms.txt">llms.txt</a>{c.builders.llms.slice("llms.txt".length)}</li>
        <li><a href="./tools.json">tools.json</a>{c.builders.tools.slice("tools.json".length)}</li>
      </ul>
      <p>{c.builders.planned}</p>
    </>
  );
}
