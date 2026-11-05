import { useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { detectFileType, type Detected } from "../lib/detectFileType";
import { messageFor, type NeededKind, type UploadMessage } from "../copy/upload-messages";
import "./UploadField.css";

export type UploadFieldProps = {
  needed: NeededKind;
  label: string;
  onAccepted: (file: File, detected: Detected) => void;
  onUseAlternative?: (file: File, detected: Detected, actionId: string) => void;
  onPassword?: (file: File, password: string) => void;
  howToHref?: string;
  maxBytes?: number;
  syncOn?: boolean;
};

type Problem = { file: File; detected: Detected; message: UploadMessage };

export function UploadField({
  needed,
  label,
  onAccepted,
  onUseAlternative,
  onPassword,
  howToHref,
  maxBytes,
  syncOn,
}: UploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [password, setPassword] = useState("");

  async function handle(file: File | undefined) {
    if (!file) return;
    setPassword("");
    const detected = await detectFileType(file);
    const message = messageFor({
      detected: detected.kind,
      needed,
      name: file.name,
      sizeBytes: file.size,
      maxBytes,
      flags: { encrypted: detected.encrypted, damaged: detected.damaged, mismatch: detected.mismatch, syncOn },
    });
    if (message.accepted) {
      setProblem(null);
      onAccepted(file, detected);
      return;
    }
    setProblem({ file, detected, message });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    void handle(e.dataTransfer?.files?.[0]);
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (!problem) return;
    const typed = password;
    onPassword?.(problem.file, typed);
    setPassword("");
  }

  function tryAgain() {
    setProblem(null);
    setPassword("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }

  const m = problem?.message;
  const alt = m?.alternative;
  const href = howToHref ?? m?.howTo.href;

  return (
    <div className="nt-upload">
      <div
        className="nt-upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <label className="nt-upload-label" htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="nt-upload-input"
          type="file"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
        <p className="nt-upload-hint">Or drop a file here.</p>
      </div>
      {problem && m && (
        <div role="status" className="nt-upload-message">
          <p className="nt-upload-gave">{m.gave}</p>
          <p>{m.needs}</p>
          <p>{m.explainer}</p>
          {m.askPassword && (
            <form className="nt-upload-password" onSubmit={submitPassword}>
              <label htmlFor={`${inputId}-pw`}>Password</label>
              <input
                id={`${inputId}-pw`}
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit">Use password</button>
            </form>
          )}
          {alt && (
            <div className="nt-upload-alt">
              <button
                type="button"
                onClick={() => onUseAlternative?.(problem.file, problem.detected, alt.action)}
              >
                {alt.label}
              </button>
              {alt.note && <p>{alt.note}</p>}
            </div>
          )}
          {m.tryAgain && (
            <button type="button" className="nt-upload-again" onClick={tryAgain}>
              Try again
            </button>
          )}
          {href && (
            <p>
              <a href={href}>{m.howTo.text}</a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
