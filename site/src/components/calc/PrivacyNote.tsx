import "./calc.css";

/** What the person can see on the page: there is no Send button. Same words on every calculator. */
export function PrivacyNote({ what = "Your numbers" }: { what?: string }) {
  return <p className="nt-privacy">There is no Send button on this page. {what} are worked out here.</p>;
}
