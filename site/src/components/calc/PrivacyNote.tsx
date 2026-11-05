import "./calc.css";

/** The privacy promise, in plain words. Same words on every calculator. */
export function PrivacyNote({ what = "Your numbers" }: { what?: string }) {
  return <p className="nt-privacy">{what} stay on this phone.</p>;
}
