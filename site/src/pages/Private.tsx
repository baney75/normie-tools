import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";

/** The plain answer to "is my information sent anywhere?", with the code as the source. */
export function Private() {
  const c = PAGES.private;
  return (
    <>
      <h1>{c.title}</h1>
      <ul className="nt-list">
        {c.lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p>
        {c.checkBefore}{" "}
        <a href="https://github.com/baney75/normie-tools" rel="noopener noreferrer">{c.checkLink}</a>.
      </p>
      <p>
        <a className="nt-back" href={href("/")}>{c.back}</a>
      </p>
    </>
  );
}
