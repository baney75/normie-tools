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
  /** The short line beside the button that says the person can get their numbers back. */
  note?: string;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A quiet "Start over". It asks first, then clears, and offers a way back. The old numbers live in memory only. */
export function StartOver<T>({ flowId, value, empty, onChange, note = "You can put your numbers back." }: StartOverProps<T>) {
  const [kept, setKept] = useState<{ value: T } | null>(null);
  const [asking, setAsking] = useState(false);
  const isEmpty = same(value, empty);
  // Once the person types again, the old numbers are no longer on offer.
  const offering = kept !== null && isEmpty;

  function clear() {
    setKept({ value });
    setAsking(false);
    onChange(empty);
    // Autosave writes on every change, so remove the saved copy after it.
    clearSaved(flowId);
  }

  function putBack() {
    if (!kept) return;
    onChange(kept.value);
    setKept(null);
  }

  if (offering) {
    return (
      <div className="nt-startover">
        <p className="nt-startover-done" role="status">
          Your numbers are cleared.{" "}
          <button type="button" className="nt-startover-btn" onClick={putBack}>
            Put it back
          </button>
        </p>
      </div>
    );
  }

  // Nothing typed, nothing to clear: show nothing, so no greyed button asks a question.
  if (isEmpty) return null;

  // Start over is rarely needed, so it waits behind "More options" with the other extras.
  return (
    <details className="nt-more">
      <summary>More options</summary>
      <div className="nt-startover">
        {asking ? (
          <>
            <p className="nt-startover-ask" role="status">
              This clears every box. You can put your numbers back right after.
            </p>
            <div className="nt-startover-row">
              <button type="button" className="nt-startover-btn" onClick={clear}>
                Clear the boxes
              </button>
              <button type="button" className="nt-startover-btn" onClick={() => setAsking(false)}>
                Keep my numbers
              </button>
            </div>
          </>
        ) : (
          <>
            <button type="button" className="nt-startover-btn" onClick={() => setAsking(true)}>
              Start over
            </button>{" "}
            <span className="nt-startover-note">{note}</span>
          </>
        )}
      </div>
    </details>
  );
}
