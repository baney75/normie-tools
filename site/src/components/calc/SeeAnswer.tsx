import "./calc.css";

export type SeeAnswerProps = {
  /** Like "See my payment". */
  label: string;
  /** True while there is no answer yet. Once there is one, the button goes away. */
  main: boolean;
};

/**
 * The one main button while there is no answer. It puts the cursor in the first empty box that is needed (optional boxes are skipped),
 * or takes the person to the answer card when every box is filled. On a wide screen the
 * answer is already beside the boxes, so the button hides there.
 */
export function SeeAnswer({ label, main }: SeeAnswerProps) {
  function go() {
    const card = document.getElementById("nt-answer");
    const empty = Array.from(document.querySelectorAll<HTMLInputElement>(".nt-tool-inputs input.nt-field-input:not([data-optional])")).find((el) => !el.value.trim());
    const target = empty ?? card;
    target?.scrollIntoView?.({ block: "center" });
    target?.focus();
  }
  if (!main) return null;
  return (
    <div className="nt-see">
      <button type="button" className="primary nt-see-btn" onClick={go}>
        {label}
      </button>
    </div>
  );
}
