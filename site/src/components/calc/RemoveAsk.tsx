export type RemoveAskProps = {
  /** Which line will go: its name or "Debt 2", then its number. */
  what: string;
  onRemove: () => void;
  onKeep: () => void;
};

/** Asks before a line is removed and shows which one. The page offers Put it back after. */
export function RemoveAsk({ what, onRemove, onKeep }: RemoveAskProps) {
  return (
    <div className="nt-startover" role="group" aria-label="Before you remove">
      <p className="nt-startover-ask">This one will go: {what}</p>
      <div className="nt-startover-row">
        <button type="button" className="nt-startover-btn" onClick={onRemove}>
          Yes, remove it
        </button>
        <button type="button" className="nt-startover-btn" onClick={onKeep}>
          Keep it
        </button>
      </div>
    </div>
  );
}

/** A typed amount for display: adds the dollar sign if it is missing. */
export const amountText = (typed: string) => {
  const t = typed.trim();
  if (!t) return "no amount typed";
  return t.startsWith("$") ? t : `$${t}`;
};
