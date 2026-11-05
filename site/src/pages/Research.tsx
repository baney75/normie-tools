import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";

export function Research() {
  const c = PAGES.research;
  return (
    <>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      <ul className="nt-list">
        {c.topics.map((t) => (
          <li key={t.file}><code>{t.file}</code> {t.line}</li>
        ))}
      </ul>
      <p><a href={href("/")}>{c.back}</a></p>
    </>
  );
}
