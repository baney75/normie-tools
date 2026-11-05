import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";

export function Install() {
  const c = PAGES.install;
  return (
    <>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <ul className="nt-list">
        <li>{c.iphone}</li>
        <li>{c.android}</li>
        <li>{c.computer}</li>
      </ul>
      <p>{c.offline}</p>
      <p><a href={href("/")}>{c.back}</a></p>
    </>
  );
}
