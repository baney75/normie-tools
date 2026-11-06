import { useEffect } from "react";
import { Shell } from "./components/Shell";
import { SHARE_TOOLS, SITE } from "./copy/share";
import { useHashRoute } from "./lib/hashRouter";
import { Agents } from "./pages/Agents";
import { Coming } from "./pages/Coming";
import { Private } from "./pages/Private";
import { Harness } from "./pages/Harness";
import { Home } from "./pages/Home";
import { Install } from "./pages/Install";
import { NotFound } from "./pages/NotFound";
import { Research } from "./pages/Research";
import { ToolPage } from "./pages/ToolPage";

/** The tab title: the tool's name and question on a tool page, the site title everywhere else. Bookmarks and history use it. */
export function titleFor(route: ReturnType<typeof useHashRoute>): string {
  const t = route.name === "tool" ? SHARE_TOOLS.find((x) => x.id === route.id) : undefined;
  return t ? `${t.name}: ${t.question} | ${SITE.name}` : SITE.title;
}

export function App() {
  const route = useHashRoute();
  const title = titleFor(route);
  useEffect(() => {
    document.title = title;
  }, [title]);
  let page;
  switch (route.name) {
    case "home": page = <Home />; break;
    case "agents": page = <Agents />; break;
    case "install": page = <Install />; break;
    case "harness": page = <Harness />; break;
    case "research": page = <Research />; break;
    case "coming": page = <Coming />; break;
    case "private": page = <Private />; break;
    case "tool": page = <ToolPage id={route.id} />; break;
    default: page = <NotFound />;
  }
  return <Shell wide={route.name === "tool"}>{page}</Shell>;
}
