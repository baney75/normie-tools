import { PromptSearch } from "../components/PromptSearch";
import { ToolGrid } from "../components/ToolGrid";
import { PAGES } from "../copy/pages";
import { TOOLS } from "../data/tools";
import { href } from "../lib/hashRouter";

export function Home() {
  const c = PAGES.home;
  return (
    <>
      <h1>{c.tagline}</h1>
      <p>{c.subline}</p>
      <PromptSearch tools={TOOLS} />
      <p className="nt-muted">{TOOLS.length} {c.countAfter}</p>
      <h2>{c.gridHeading}</h2>
      <ToolGrid tools={TOOLS} />
      <p><a href={href("/agents")}>{c.agentsLink}</a></p>
    </>
  );
}
