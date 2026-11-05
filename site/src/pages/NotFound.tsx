import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";

export function NotFound() {
  return (
    <>
      <h1>{PAGES.notFound.title}</h1>
      <p><a href={href("/")}>{PAGES.notFound.back}</a></p>
    </>
  );
}
