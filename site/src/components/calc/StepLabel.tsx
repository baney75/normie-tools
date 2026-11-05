import "./calc.css";

/** A small "Step 1 of 2: Type your numbers" line. It tells the person where they are. */
export function StepLabel({ n, of, children }: { n: number; of: number; children: string }) {
  return <p className="nt-step">{`Step ${n} of ${of}: ${children}`}</p>;
}
