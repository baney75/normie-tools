import "./calc.css";

/** The privacy promise and its reason, in plain words. Same words on every calculator. The offline line is what e2e/offline.spec.ts proves. */
export function PrivacyNote({ what = "Your numbers" }: { what?: string }) {
  return <p className="nt-privacy">{what} stay on this phone. Nothing is sent. After this page loads once, it works with no internet.</p>;
}
