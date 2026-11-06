import { useId, useState, type ReactNode } from "react";
import "./SavePrintSheet.css";

export type SavePrintSheetProps = {
  title: string;
  /** The preview of what will be saved or printed. */
  children: ReactNode;
  onSave: (blob?: Blob) => void;
  /** Passed to onSave as the copy to keep, when there is one. */
  blob?: Blob;
  onPrint?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  /** Set when another button on the page is the main one: Print then looks like Save a copy. */
  quiet?: boolean;
  /** Makes "Save a copy" the one filled button and Print an outline. For phones, where Print is rarely what the person wants. */
  savePrimary?: boolean;
};

export function SavePrintSheet({
  title,
  children,
  onSave,
  blob,
  onPrint = () => window.print(),
  canUndo = false,
  onUndo,
  quiet = false,
  savePrimary = false,
}: SavePrintSheetProps) {
  const [saved, setSaved] = useState(false);
  const [asking, setAsking] = useState(false);
  const titleId = useId();
  const hasPreview = children !== null && children !== undefined && children !== false;

  return (
    <section className="nt-sheet" aria-labelledby={titleId}>
      <h2 id={titleId} className="nt-sheet-title">
        {title}
      </h2>
      <div className="nt-sheet-preview" role="group" aria-label="Preview">
        {children}
      </div>
      <div className="nt-sheet-actions">
        <button type="button" className={quiet || savePrimary ? "nt-sheet-secondary" : "nt-sheet-primary"} disabled={!hasPreview} onClick={() => onPrint()}>
          Print
        </button>
        <button
          type="button"
          className={savePrimary ? "nt-sheet-primary" : "nt-sheet-secondary"}
          disabled={!hasPreview}
          onClick={() => {
            setAsking(true);
            setSaved(false);
          }}
        >
          Save a copy
        </button>
        {canUndo && (
          <button
            type="button"
            className="nt-sheet-undo"
            onClick={() => {
              onUndo?.();
              setSaved(false);
            }}
          >
            Undo
          </button>
        )}
      </div>
      {hasPreview ? null : <p className="nt-sheet-note">They work after you type your numbers.</p>}
      {asking ? (
        <div className="nt-sheet-ask" role="group" aria-label="Before you save">
          <p>Saves a file on this phone. Nothing leaves it. You can delete the file any time. It will hold:</p>
          <div className="nt-sheet-ask-preview">{children}</div>
          <div className="nt-sheet-actions">
            <button
              type="button"
              className="nt-sheet-secondary"
              onClick={() => {
                onSave(blob);
                setSaved(true);
                setAsking(false);
              }}
            >
              Save the file
            </button>
            <button type="button" className="nt-sheet-undo" onClick={() => setAsking(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      <p role="status" className="nt-sheet-status">
        {saved ? "Saved" : ""}
      </p>
    </section>
  );
}
