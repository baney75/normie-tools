import { Shell } from "./components/Shell";
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

export function App() {
  const route = useHashRoute();
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
