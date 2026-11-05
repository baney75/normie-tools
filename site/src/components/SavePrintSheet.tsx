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
};

export function SavePrintSheet({
  title,
  children,
  onSave,
  blob,
  onPrint = () => window.print(),
  canUndo = false,
  onUndo,
}: SavePrintSheetProps) {
  const [saved, setSaved] = useState(false);
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
        <button type="button" className="nt-sheet-primary" disabled={!hasPreview} onClick={() => onPrint()}>
          Print
        </button>
        <button
          type="button"
          className="nt-sheet-secondary"
          disabled={!hasPreview}
          onClick={() => {
            onSave(blob);
            setSaved(true);
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
      <p role="status" className="nt-sheet-status">
        {saved ? "Saved" : ""}
      </p>
    </section>
  );
}
