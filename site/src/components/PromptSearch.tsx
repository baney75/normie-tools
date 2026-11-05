import { useId, useMemo, useState, type FormEvent } from "react";
import type { Tool } from "../data/tools";
import { searchTools } from "../lib/searchTools";
import { ToolGrid } from "./ToolGrid";
import "./PromptSearch.css";

export type PromptSearchProps = {
  tools: Tool[];
  initialQuery?: string;
};

export function PromptSearch({ tools, initialQuery = "" }: PromptSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const id = useId();
  const results = useMemo(() => searchTools(query, tools), [query, tools]);
  const hasQuery = query.trim() !== "";

  // The page never leaves. Results already show as the person types.
  const onSubmit = (e: FormEvent) => e.preventDefault();

  return (
    <div className="nt-prompt">
      <form className="nt-prompt-form" onSubmit={onSubmit} role="search">
        <label className="nt-prompt-label" htmlFor={id}>
          What do you want to get done?
        </label>
        <input
          id={id}
          className="nt-prompt-input"
          type="search"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="nt-prompt-button">
          Find a tool
        </button>
      </form>
      <div className="nt-prompt-results">
        {hasQuery && results.length > 0 && <ToolGrid tools={results} />}
        {hasQuery && results.length === 0 && (
          <p role="status" className="nt-prompt-none">
            Nothing matches yet. Try other words.
          </p>
        )}
      </div>
    </div>
  );
}
