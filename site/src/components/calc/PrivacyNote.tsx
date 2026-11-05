import "./calc.css";

export const REPO_URL = "https://github.com/baney75/normie-tools";

/** The privacy promise with a place to check it. Same words on every calculator. */
export function PrivacyNote({ what = "Numbers" }: { what?: string }) {
  return (
    <p className="nt-privacy">
      Nothing is sent. {what} stay on this phone or computer.{" "}
      Source: <a href={`${REPO_URL}/tree/main/site`} rel="noreferrer">how this page is made</a>.
    </p>
  );
}
