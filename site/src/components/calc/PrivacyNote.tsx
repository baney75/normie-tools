import "./calc.css";

export const REPO_URL = "https://github.com/baney75/normie-tools";

/** The privacy promise with a place to check it. Same words on every calculator. */
export function PrivacyNote() {
  return (
    <p className="nt-privacy">
      Free to use. Nothing is sent. Numbers stay on this phone or computer.{" "}
      You can check this on <a href={`${REPO_URL}/tree/main/site`} rel="noreferrer">our public page</a>.
    </p>
  );
}
