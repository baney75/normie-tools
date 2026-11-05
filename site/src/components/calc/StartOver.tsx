import { useState } from "react";
import { clearSaved } from "../../lib/useAutosave";

export type StartOverProps<T> = {
  /** The autosave id the page uses, so the saved copy goes too. */
  flowId: string;
  /** What is typed now. */
  value: T;
  /** What the page looks like with nothing typed. */
  empty: T;
  /** Sets the page value. It should be the page's autosave setValue. */
  onChange: (next: T) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A quiet "Start over" with a way back. The old numbers live in memory only. */
export function StartOver<T>({ flowId, value, empty, onChange }: StartOverProps<T>) {
  const [kept, setKept] = useState<{ value: T } | null>(null);
  const isEmpty = same(value, empty);
  // Once the person types again, the old numbers are no longer on offer.
  const offering = kept !== null && isEmpty;

  function clear() {
    setKept({ value });
    onChange(empty);
    // Autosave writes on every change, so remove the saved copy after it.
    clearSaved(flowId);
  }

  function putBack() {
    if (!kept) return;
    onChange(kept.value);
    setKept(null);
  }

  return (
    <div className="nt-startover">
      {offering ? (
        <p className="nt-startover-done" role="status">
          Your numbers are cleared.{" "}
          <button type="button" className="nt-startover-btn" onClick={putBack}>
            Put it back
          </button>
        </p>
      ) : (
        <>
          <button type="button" className="nt-startover-btn" onClick={clear} disabled={isEmpty}>
            Start over
          </button>
          <p className="nt-startover-hint">Start over clears the boxes. You can put them back.</p>
        </>
      )}
    </div>
  );
}
