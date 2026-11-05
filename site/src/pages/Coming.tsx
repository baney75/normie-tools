import { PAGES } from "../copy/pages";
import { TOOLS, isUsable, type Tool } from "../data/tools";
import { href } from "../lib/hashRouter";

/** Tools that are not ready, as plain lists by group. Nothing here is a link to a tool. */
export function Coming() {
  const c = PAGES.coming;
  const groups: { name: string; items: Tool[] }[] = [];
  for (const t of TOOLS.filter((x) => !isUsable(x))) {
    const name = t.group ?? "";
    let g = groups.find((x) => x.name === name);
    if (!g) groups.push((g = { name, items: [] }));
    g.items.push(t);
  }
  return (
    <>
      <h1>{c.title}</h1>
      <p>{c.intro}</p>
      {groups.map((g) => (
        <section key={g.name} aria-label={g.name || c.title}>
          {g.name ? <h2>{g.name}</h2> : null}
          <ul className="nt-list">
            {g.items.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </section>
      ))}
      <p>
        <a className="nt-back" href={href("/")}>{c.back}</a>
      </p>
    </>
  );
}
