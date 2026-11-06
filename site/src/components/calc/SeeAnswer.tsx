import "./calc.css";

export type SeeAnswerProps = {
  /** Like "See my payment". */
  label: string;
  /** True while there is no answer yet. Once there is one, the button goes away. */
  main: boolean;
};

/**
 * The one main button while there is no answer. It goes to the first thing still needed: a box with a red note, a needed box
 * that is empty (optional boxes are skipped), or a row of choices with nothing picked,
 * or takes the person to the answer card when every box is filled. On a wide screen the
 * answer is already beside the boxes, so the button hides there.
 */
export function SeeAnswer({ label, main }: SeeAnswerProps) {
  function go() {
    const card = document.getElementById("nt-answer");
    // In page order: a needed box that is empty or has a red note, or a row of choices with nothing picked.
    const spots = Array.from(document.querySelectorAll<HTMLElement>(".nt-tool-inputs input.nt-field-input, .nt-tool-inputs .nt-chips"));
    const needs = (el: HTMLElement) =>
      el instanceof HTMLInputElement
        ? el.getAttribute("aria-invalid") === "true" || (!el.hasAttribute("data-optional") && !el.value.trim())
        : !el.querySelector("input:checked");
    const spot = spots.find(needs);
    const target = spot instanceof HTMLInputElement ? spot : spot?.querySelector<HTMLElement>("input") ?? card;
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
