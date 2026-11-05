import { PAGES } from "../copy/pages";
import { href } from "../lib/hashRouter";

export function Footer() {
  const c = PAGES.footer;
  return (
    <nav aria-label={c.label}>
      <ul>
        <li><a href={href("/research")}>{c.research}</a></li>
        <li><a href={href("/agents")}>{PAGES.home.agentsLink}</a></li>
        <li><a href={href("/install")}>{c.install}</a></li>
      </ul>
      <p className="nt-muted">{c.license}</p>
    </nav>
  );
}
