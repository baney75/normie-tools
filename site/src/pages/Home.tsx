import { PromptSearch } from "../components/PromptSearch";
import { ToolGrid } from "../components/ToolGrid";
import { PAGES } from "../copy/pages";
import { TOOLS, isUsable } from "../data/tools";
import { href } from "../lib/hashRouter";
import "./Home.css";

export function Home() {
  const c = PAGES.home;
  const ready = TOOLS.filter(isUsable);
  return (
    <div className="nt-home">
      <h1 className="nt-home-title">{c.tagline}</h1>
      <p className="nt-home-sub">{c.subline}</p>
      <p className="nt-home-promise">{c.promise}</p>
      <PromptSearch tools={TOOLS} />
      <h2 className="nt-home-heading">{c.readyHeading}</h2>
      {ready.length > 0 ? <ToolGrid tools={ready} /> : <p>{c.noneReady}</p>}
      <p className="nt-home-more">
        {c.more} <a href={href("/coming")}>{c.moreLink}</a>
      </p>
    </div>
  );
}
